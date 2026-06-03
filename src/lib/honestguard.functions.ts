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
    const utc = (v - 25569) * 86400 * 1000;
    return new Date(utc);
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const [, dd, mm, yy, h = "0", mi = "0", ss = "0"] = m;
    const year = yy.length === 2 ? 2000 + parseInt(yy) : parseInt(yy);
    return new Date(year, parseInt(mm) - 1, parseInt(dd), parseInt(h), parseInt(mi), parseInt(ss));
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
}

// VMmarket/Linx exports have ~14 lines of metadata before the real headers.
// Auto-detect the header row by scanning for a known column name.
function readSheetSmart(sheet: XLSX.WorkSheet): Row[] {
  const matrix: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null }) as any;
  const needles = ["data/hora", "número do cartão", "numero do cartao", "valor (r$)", "valor", "numero_cartao", "cartao", "cartão"];
  let headerIdx = 0;
  for (let i = 0; i < Math.min(matrix.length, 30); i++) {
    const row = matrix[i] ?? [];
    const norm = row.map((c) => String(c ?? "").toLowerCase().trim());
    if (needles.some((n) => norm.includes(n))) { headerIdx = i; break; }
  }
  const headers = (matrix[headerIdx] ?? []).map((h: any) => String(h ?? "").trim());
  const out: Row[] = [];
  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const r = matrix[i] ?? [];
    if (r.every((c) => c == null || c === "")) continue;
    const obj: Row = {};
    headers.forEach((h, j) => { if (h) obj[h] = r[j]; });
    out.push(obj);
  }
  return out;
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
  .handler(async ({ data }) => {
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

      const diaria: Row[] = readSheetSmart(wbD.Sheets[wbD.SheetNames[0]]);
      const historico: Row[] = readSheetSmart(wbH.Sheets[wbH.SheetNames[0]]);

      const { data: lojas } = await supabaseAdmin.from("lojas").select("id").limit(1);
      const defaultLoja = lojas?.[0]?.id ?? null;

      const transacoes = diaria.map((r) => ({
        numero_cartao: String(pick(r, ["numero_cartao", "número do cartão", "numero do cartao", "cartão", "cartao", "card"]) ?? "").trim(),
        valor: toNum(pick(r, ["valor", "valor (r$)", "valor (r\\$)", "value", "amount"])),
        data_transacao: toDate(pick(r, ["data_transacao", "data/hora", "data", "date"])).toISOString(),
        status: String(pick(r, ["estado", "status"]) ?? "aprovada"),
        _orig: r,
      })).filter((t) => t.numero_cartao && t.valor > 0);

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

      const histMap = new Map<string, Row>();
      for (const h of historico) {
        const k = String(pick(h, ["numero_cartao", "cartao"]) ?? "").trim();
        if (k) histMap.set(k, h);
      }

      const totals: number[] = [];
      for (const [k, v] of agg) {
        const h = histMap.get(k);
        const histTotal = toNum(pick(h ?? {}, ["total_gasto", "gasto_total"]));
        totals.push(v.total + histTotal);
      }
      totals.sort((a, b) => a - b);
      const p75 = percentile(totals, 75);
      const p90 = percentile(totals, 90);

      const txRows = transacoes.map((t) => ({
        numero_cartao: t.numero_cartao, valor: t.valor, data_transacao: t.data_transacao,
        status: t.status, loja_id: defaultLoja,
      }));
      for (let i = 0; i < txRows.length; i += 500) {
        await supabaseAdmin.from("transacoes").insert(txRows.slice(i, i + 500));
      }

      let cDia = 0, cGold = 0, cSil = 0, cRed = 0, cTrust = 0;
      const alertas: any[] = [];
      const clientesClassif: any[] = [];
      const ratingByCartao = new Map<string, { rating: string; score: number; trusted: boolean; ocorrencias: number; totalGasto: number; totalCompras: number }>();

      for (const [cartao, v] of agg) {
        const h = histMap.get(cartao);
        const ocorrencias = Math.floor(toNum(pick(h ?? {}, ["ocorrencias", "ocorr"])));
        const histTotal = toNum(pick(h ?? {}, ["total_gasto"]));
        const histCount = Math.floor(toNum(pick(h ?? {}, ["total_compras", "compras"])));
        const totalGasto = v.total + histTotal;
        const totalCompras = v.count + histCount;

        let rating = "SILVER";
        if (ocorrencias >= 3) rating = "RED";
        else if (totalGasto >= p90) rating = "DIAMOND";
        else if (totalGasto >= p75) rating = "GOLD";

        const score = Math.max(0, Math.min(100, 100 - ocorrencias * 20 + Math.log10(totalGasto + 1) * 5));
        const isTrusted = rating !== "RED" && score >= 80 && totalCompras >= 5;
        if (isTrusted) cTrust++;
        if (rating === "DIAMOND") cDia++;
        else if (rating === "GOLD") cGold++;
        else if (rating === "SILVER") cSil++;
        else if (rating === "RED") cRed++;

        ratingByCartao.set(cartao, { rating, score, trusted: isTrusted, ocorrencias, totalGasto, totalCompras });

        const { data: existing } = await supabaseAdmin
          .from("clientes").select("id, rating_final").eq("numero_cartao", cartao).maybeSingle();

        let clienteId: string;
        if (existing) {
          clienteId = existing.id;
          await supabaseAdmin.from("clientes").update({
            total_gasto: totalGasto, total_compras: totalCompras, ultima_compra: v.ultima.toISOString(),
            rating_final: rating, score_confianca: score, is_trusted: isTrusted, ocorrencias, loja_id: defaultLoja,
          }).eq("id", clienteId);
          if (existing.rating_final !== rating) {
            await supabaseAdmin.from("rating_logs").insert({
              cliente_id: clienteId, rating_anterior: existing.rating_final,
              rating_novo: rating, motivo: "Reprocessamento HonestGuard",
            });
          }
        } else {
          const { data: ins } = await supabaseAdmin.from("clientes").insert({
            numero_cartao: cartao, total_gasto: totalGasto, total_compras: totalCompras,
            ultima_compra: v.ultima.toISOString(), rating_final: rating, score_confianca: score,
            is_trusted: isTrusted, ocorrencias, loja_id: defaultLoja,
          }).select("id").single();
          clienteId = ins!.id;
        }

        clientesClassif.push({
          numero_cartao: cartao, rating, score_confianca: Number(score.toFixed(2)),
          trusted: isTrusted ? "SIM" : "NÃO", total_gasto: totalGasto, total_compras: totalCompras,
          ocorrencias, ultima_compra: v.ultima.toISOString().slice(0, 10),
        });

        if (v.count >= 10) {
          alertas.push({
            cliente_id: clienteId, loja_id: defaultLoja, tipo: "alta_frequencia", gravidade: "alta",
            descricao: `Cliente realizou ${v.count} transações em curto período.`,
            _cartao: cartao,
          });
        }
        if (rating === "RED") {
          alertas.push({
            cliente_id: clienteId, loja_id: defaultLoja, tipo: "comportamento_suspeito", gravidade: "alta",
            descricao: `Cliente classificado como RED (${ocorrencias} ocorrências).`,
            _cartao: cartao,
          });
        }
      }

      if (alertas.length) {
        const toInsert = alertas.map(({ _cartao, ...a }) => a);
        for (let i = 0; i < toInsert.length; i += 500) {
          await supabaseAdmin.from("alertas").insert(toInsert.slice(i, i + 500));
        }
      }

      const faturamento = transacoes.reduce((s, t) => s + t.valor, 0);

      // === GERAR EXCEL CONSOLIDADO ===
      const baseDiariaEnriq = transacoes.map((t) => {
        const r = ratingByCartao.get(t.numero_cartao);
        return {
          ...t._orig,
          numero_cartao: t.numero_cartao,
          valor: t.valor,
          data_transacao: t.data_transacao,
          rating: r?.rating ?? "SILVER",
          score_confianca: r ? Number(r.score.toFixed(2)) : 0,
          trusted: r?.trusted ? "SIM" : "NÃO",
        };
      });

      const alertasSheet = alertas.map((a) => ({
        numero_cartao: a._cartao, tipo: a.tipo, gravidade: a.gravidade, descricao: a.descricao,
      }));

      const monitoramento = [
        { metrica: "Total de Transações", valor: transacoes.length },
        { metrica: "Total de Clientes", valor: agg.size },
        { metrica: "Faturamento Total", valor: faturamento },
        { metrica: "Threshold GOLD (P75)", valor: Number(p75.toFixed(2)) },
        { metrica: "Threshold DIAMOND (P90)", valor: Number(p90.toFixed(2)) },
        { metrica: "Clientes DIAMOND", valor: cDia },
        { metrica: "Clientes GOLD", valor: cGold },
        { metrica: "Clientes SILVER", valor: cSil },
        { metrica: "Clientes RED", valor: cRed },
        { metrica: "Clientes TRUSTED", valor: cTrust },
        { metrica: "Total de Alertas", valor: alertas.length },
        { metrica: "Gerado em", valor: new Date().toISOString() },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(baseDiariaEnriq), "Base Diaria Enriquecida");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(alertasSheet.length ? alertasSheet : [{ info: "Nenhum alerta" }]), "Alertas");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monitoramento), "Monitoramento");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clientesClassif), "Clientes Classificados");

      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const consolidadoNome = `CONSOLIDADO_${stamp}.xlsx`;
      const consolidadoPath = `${data.processamentoId}/${consolidadoNome}`;
      const up = await supabaseAdmin.storage.from("excel-uploads").upload(consolidadoPath, buf, {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });
      if (up.error) throw up.error;

      await supabaseAdmin.from("processamentos").update({
        status: "concluido",
        total_transacoes: transacoes.length,
        faturamento_total: faturamento,
        clientes_red: cRed,
        clientes_trusted: cTrust,
        threshold_diamond: p90,
        threshold_gold: p75,
        arquivo_consolidado_nome: consolidadoNome,
        arquivo_consolidado_path: consolidadoPath,
        arquivo_consolidado_gerado_em: new Date().toISOString(),
      }).eq("id", data.processamentoId);

      return {
        ok: true,
        totalTransacoes: transacoes.length,
        totalClientes: agg.size,
        diamond: cDia, gold: cGold, silver: cSil, red: cRed, trusted: cTrust,
        alertas: alertas.length,
        faturamento, p75, p90,
        consolidadoNome, consolidadoPath,
      };
    } catch (e: any) {
      await supabaseAdmin.from("processamentos").update({
        status: "erro", erro_mensagem: String(e?.message ?? e),
      }).eq("id", data.processamentoId);
      throw e;
    }
  });

export const getConsolidadoUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ path: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("excel-uploads").createSignedUrl(data.path, 60 * 10);
    if (error) throw error;
    return { url: signed.signedUrl };
  });
