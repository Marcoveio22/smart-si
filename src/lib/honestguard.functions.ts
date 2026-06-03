import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import * as XLSX from "xlsx";

type Row = Record<string, any>;

function pick(row: Row, keys: string[]): any {
  for (const k of keys) {
    for (const rk of Object.keys(row)) {
      if (rk.toLowerCase().trim() === k.toLowerCase()) return row[rk];
    }
  }
  return undefined;
}

function toNum(v: any): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function toDate(v: any): Date {
  if (!v) return new Date();
  if (v instanceof Date) return v;
  if (typeof v === "number") {
    // Excel serial date
    const utc = (v - 25569) * 86400 * 1000;
    return new Date(utc);
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date() : d;
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export const processarArquivos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    processamentoId: z.string().uuid(),
    arquivoDiaria: z.string(),
    arquivoHistorico: z.string(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.from("processamentos").update({ status: "processando" }).eq("id", data.processamentoId);

    try {
      const [d1, d2] = await Promise.all([
        supabaseAdmin.storage.from("excel-uploads").download(data.arquivoDiaria),
        supabaseAdmin.storage.from("excel-uploads").download(data.arquivoHistorico),
      ]);
      if (d1.error) throw d1.error;
      if (d2.error) throw d2.error;

      const diariaBuf = new Uint8Array(await d1.data.arrayBuffer());
      const histBuf = new Uint8Array(await d2.data.arrayBuffer());

      const wbD = XLSX.read(diariaBuf, { type: "array", cellDates: true });
      const wbH = XLSX.read(histBuf, { type: "array", cellDates: true });

      const diaria: Row[] = XLSX.utils.sheet_to_json(wbD.Sheets[wbD.SheetNames[0]]);
      const historico: Row[] = XLSX.utils.sheet_to_json(wbH.Sheets[wbH.SheetNames[0]]);

      // Get a default loja
      const { data: lojas } = await supabaseAdmin.from("lojas").select("id").limit(1);
      const defaultLoja = lojas?.[0]?.id ?? null;

      // Parse transações
      const transacoes = diaria.map((r) => ({
        numero_cartao: String(pick(r, ["numero_cartao", "cartao", "card"]) ?? "").trim(),
        valor: toNum(pick(r, ["valor", "value", "amount"])),
        data_transacao: toDate(pick(r, ["data_transacao", "data", "date"])).toISOString(),
        status: String(pick(r, ["status"]) ?? "aprovada"),
      })).filter((t) => t.numero_cartao);

      // Aggregate per cartão
      const agg = new Map<string, { total: number; count: number; ultima: Date; valores: number[] }>();
      for (const t of transacoes) {
        const cur = agg.get(t.numero_cartao) ?? { total: 0, count: 0, ultima: new Date(0), valores: [] };
        cur.total += t.valor;
        cur.count += 1;
        const d = new Date(t.data_transacao);
        if (d > cur.ultima) cur.ultima = d;
        cur.valores.push(t.valor);
        agg.set(t.numero_cartao, cur);
      }

      // Merge histórico
      const histMap = new Map<string, Row>();
      for (const h of historico) {
        const k = String(pick(h, ["numero_cartao", "cartao"]) ?? "").trim();
        if (k) histMap.set(k, h);
      }

      // Compute thresholds (P75 / P90 of total_gasto)
      const totals: number[] = [];
      for (const [k, v] of agg) {
        const h = histMap.get(k);
        const histTotal = toNum(pick(h ?? {}, ["total_gasto", "gasto_total"]));
        totals.push(v.total + histTotal);
      }
      totals.sort((a, b) => a - b);
      const p75 = percentile(totals, 75);
      const p90 = percentile(totals, 90);

      // Clear existing transações for this processamento window? We'll just append.
      // Insert new transações (chunked)
      const txRows = transacoes.map((t) => ({ ...t, loja_id: defaultLoja }));
      for (let i = 0; i < txRows.length; i += 500) {
        const chunk = txRows.slice(i, i + 500);
        await supabaseAdmin.from("transacoes").insert(chunk);
      }

      // Build / upsert clientes + ratings + alertas
      let cDia = 0, cGold = 0, cSil = 0, cRed = 0, cTrust = 0;
      const alertas: any[] = [];

      for (const [cartao, v] of agg) {
        const h = histMap.get(cartao);
        const ocorrencias = Math.floor(toNum(pick(h ?? {}, ["ocorrencias", "ocorr"])));
        const histTotal = toNum(pick(h ?? {}, ["total_gasto"]));
        const histCount = Math.floor(toNum(pick(h ?? {}, ["total_compras", "compras"])));
        const totalGasto = v.total + histTotal;
        const totalCompras = v.count + histCount;

        // Classification: RED > DIAMOND > GOLD > SILVER
        let rating = "SILVER";
        if (ocorrencias >= 3) rating = "RED";
        else if (totalGasto >= p90) rating = "DIAMOND";
        else if (totalGasto >= p75) rating = "GOLD";

        // Score de confiança: simple heuristic
        const score = Math.max(0, Math.min(100, 100 - ocorrencias * 20 + Math.log10(totalGasto + 1) * 5));
        const isTrusted = rating !== "RED" && score >= 80 && totalCompras >= 5;
        if (isTrusted) cTrust++;
        if (rating === "DIAMOND") cDia++;
        else if (rating === "GOLD") cGold++;
        else if (rating === "SILVER") cSil++;
        else if (rating === "RED") cRed++;

        // Upsert cliente
        const { data: existing } = await supabaseAdmin
          .from("clientes").select("id, rating_final").eq("numero_cartao", cartao).maybeSingle();

        let clienteId: string;
        if (existing) {
          clienteId = existing.id;
          await supabaseAdmin.from("clientes").update({
            total_gasto: totalGasto,
            total_compras: totalCompras,
            ultima_compra: v.ultima.toISOString(),
            rating_final: rating,
            score_confianca: score,
            is_trusted: isTrusted,
            ocorrencias,
            loja_id: defaultLoja,
          }).eq("id", clienteId);
          if (existing.rating_final !== rating) {
            await supabaseAdmin.from("rating_logs").insert({
              cliente_id: clienteId, rating_anterior: existing.rating_final,
              rating_novo: rating, motivo: "Reprocessamento HonestGuard",
            });
          }
        } else {
          const { data: ins } = await supabaseAdmin.from("clientes").insert({
            numero_cartao: cartao,
            total_gasto: totalGasto,
            total_compras: totalCompras,
            ultima_compra: v.ultima.toISOString(),
            rating_final: rating,
            score_confianca: score,
            is_trusted: isTrusted,
            ocorrencias,
            loja_id: defaultLoja,
          }).select("id").single();
          clienteId = ins!.id;
        }

        // Alertas: alta frequência (>10 transações no dia) ou RED
        if (v.count >= 10) {
          alertas.push({
            cliente_id: clienteId, loja_id: defaultLoja, tipo: "alta_frequencia",
            gravidade: "alta", descricao: `Cliente realizou ${v.count} transações em curto período.`,
          });
        }
        if (rating === "RED") {
          alertas.push({
            cliente_id: clienteId, loja_id: defaultLoja, tipo: "comportamento_suspeito",
            gravidade: "alta", descricao: `Cliente classificado como RED (${ocorrencias} ocorrências).`,
          });
        }
      }

      if (alertas.length) {
        for (let i = 0; i < alertas.length; i += 500) {
          await supabaseAdmin.from("alertas").insert(alertas.slice(i, i + 500));
        }
      }

      const faturamento = transacoes.reduce((s, t) => s + t.valor, 0);

      await supabaseAdmin.from("processamentos").update({
        status: "concluido",
        total_transacoes: transacoes.length,
        faturamento_total: faturamento,
        clientes_red: cRed,
        clientes_trusted: cTrust,
        threshold_diamond: p90,
        threshold_gold: p75,
      }).eq("id", data.processamentoId);

      return {
        ok: true,
        totalTransacoes: transacoes.length,
        totalClientes: agg.size,
        diamond: cDia, gold: cGold, silver: cSil, red: cRed, trusted: cTrust,
        alertas: alertas.length,
        faturamento, p75, p90,
      };
    } catch (e: any) {
      await supabaseAdmin.from("processamentos").update({
        status: "erro", erro_mensagem: String(e?.message ?? e),
      }).eq("id", data.processamentoId);
      throw e;
    }
  });
