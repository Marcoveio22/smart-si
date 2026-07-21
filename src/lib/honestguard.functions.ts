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

// Normaliza valor monetário pt-BR/US para Number.
// Regras: "1.250,99" -> 1250.99 | "30,45" -> 30.45 | "30.45" -> 30.45 | 30.45 -> 30.45
function toNum(v: any): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return isFinite(v) ? v : 0;
  let s = String(v).trim();
  if (!s) return 0;
  // remove R$, espaços, NBSP e qualquer caractere fora de [0-9 , . -]
  s = s.replace(/[Rr]\$/g, "").replace(/[\s\u00A0]/g, "").replace(/[^\d,.\-]/g, "");
  if (!s) return 0;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // formato pt-BR: ponto = milhar, vírgula = decimal
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    // só vírgula -> decimal pt-BR
    s = s.replace(",", ".");
  }
  // só ponto -> já é decimal (US/ISO), mantém
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

const PIX_TOKEN = "PIX";
function normalizeCartao(v: any): string {
  if (v == null) return PIX_TOKEN;
  // remove zero-width / BOM / NBSP / control chars, colapsa espaços internos
  let s = String(v)
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return PIX_TOKEN;
  const up = s.toUpperCase();
  if (["NAN", "NULL", "N/A", "NONE", "-", "#N/A", "NA"].includes(up)) return PIX_TOKEN;
  return s;
}

function fmtDataHora(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
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

      const linhasLidas = diaria.length;

      // Derive loja_id: prefer the one on the processamento row, fallback to the caller's profile loja.
      const { data: procRow } = await supabaseAdmin
        .from("processamentos").select("loja_id, created_by").eq("id", data.processamentoId).maybeSingle();
      let defaultLoja: string | null = procRow?.loja_id ?? null;
      if (!defaultLoja && procRow?.created_by) {
        const { data: prof } = await supabaseAdmin
          .from("profiles").select("loja_id").eq("id", procRow.created_by).maybeSingle();
        defaultLoja = prof?.loja_id ?? null;
      }
      if (!defaultLoja) defaultLoja = "00000000-0000-0000-0000-000000000001";
      // Persist loja_id on the processamento so downstream reads (RLS) work correctly
      if (procRow && procRow.loja_id !== defaultLoja) {
        await supabaseAdmin.from("processamentos").update({ loja_id: defaultLoja }).eq("id", data.processamentoId);
      }

      type Tx = {
        numero_cartao: string; isPix: boolean; valor: number; data_transacao: Date;
        status: string; produto: string; tipo: string; _orig: Row;
      };
      const transacoes: Tx[] = diaria.map((r) => {
        const rawCartao = pick(r, ["numero_cartao", "número do cartão", "numero do cartao", "cartão", "cartao", "card"]);
        const numero_cartao = normalizeCartao(rawCartao);
        return {
          numero_cartao,
          isPix: numero_cartao === PIX_TOKEN,
          valor: toNum(pick(r, ["valor", "valor (r$)", "valor (r\\$)", "value", "amount"])),
          data_transacao: toDate(pick(r, ["data_transacao", "data/hora", "data", "date"])),
          status: String(pick(r, ["estado", "status"]) ?? "aprovada"),
          produto: String(pick(r, ["produto", "descrição", "descricao", "item", "product"]) ?? ""),
          tipo: String(pick(r, ["tipo", "tipo de pagamento", "forma de pagamento", "tipo pagamento", "payment"]) ?? ""),
          _orig: r,
        };
      });

      const linhasProcessadas = transacoes.length;

      const agg = new Map<string, { total: number; count: number; ultima: Date; valores: number[] }>();
      for (const t of transacoes) {
        if (t.isPix) continue;
        const cur = agg.get(t.numero_cartao) ?? { total: 0, count: 0, ultima: new Date(0), valores: [] };
        cur.total += t.valor;
        cur.count += 1;
        if (t.data_transacao > cur.ultima) cur.ultima = t.data_transacao;
        cur.valores.push(t.valor);
        agg.set(t.numero_cartao, cur);
      }

      const histMap = new Map<string, Row>();
      for (const h of historico) {
        const k = String(pick(h, ["numero_cartao", "cartao", "número do cartão", "numero do cartao"]) ?? "").trim();
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
        numero_cartao: t.numero_cartao, valor: t.valor, data_transacao: t.data_transacao.toISOString(),
        status: t.status, loja_id: defaultLoja,
      }));
      for (let i = 0; i < txRows.length; i += 500) {
        await supabaseAdmin.from("transacoes").insert(txRows.slice(i, i + 500));
      }

      let cDia = 0, cGold = 0, cSil = 0, cRed = 0, cTrust = 0;
      const alertas: any[] = [];
      const clientesClassif: any[] = [];
      const ratingByCartao = new Map<string, { rating: string; score: number; trusted: boolean; ocorrencias: number; totalGasto: number; totalCompras: number; statusManual: string }>();
      ratingByCartao.set(PIX_TOKEN, { rating: "SILVER", score: 0, trusted: false, ocorrencias: 0, totalGasto: 0, totalCompras: 0, statusManual: "NEUTRO" });

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

        const { data: existing } = await supabaseAdmin
          .from("clientes").select("id, rating_final, status_manual").eq("numero_cartao", cartao).maybeSingle();

        const statusManual = ((existing as any)?.status_manual as string | undefined) ?? "NEUTRO";
        ratingByCartao.set(cartao, { rating, score, trusted: isTrusted, ocorrencias, totalGasto, totalCompras, statusManual });

        let clienteId: string;
        if (existing) {
          clienteId = existing.id;
          // IMPORTANTE: NUNCA sobrescrever status_manual / observação / autor
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
          numero_cartao: cartao, rating, "Status Manual": statusManual,
          score_confianca: Number(score.toFixed(2)),
          trusted: isTrusted ? "SIM" : "NÃO", total_gasto: totalGasto, total_compras: totalCompras,
          ocorrencias, ultima_compra: v.ultima.toISOString().slice(0, 10),
        });

        if (v.count >= 10) {
          alertas.push({
            cliente_id: clienteId, loja_id: defaultLoja, tipo: "alta_frequencia", gravidade: "alta",
            descricao: `Cliente realizou ${v.count} transações em curto período.`,
            _cartao: cartao, _status_manual: statusManual,
          });
        }
        if (rating === "RED") {
          alertas.push({
            cliente_id: clienteId, loja_id: defaultLoja, tipo: "comportamento_suspeito", gravidade: "alta",
            descricao: `Cliente classificado como RED (${ocorrencias} ocorrências).`,
            _cartao: cartao, _status_manual: statusManual,
          });
        }
      }

      if (alertas.length) {
        const toInsert = alertas.map(({ _cartao, _status_manual, ...a }) => a);
        for (let i = 0; i < toInsert.length; i += 500) {
          await supabaseAdmin.from("alertas").insert(toInsert.slice(i, i + 500));
        }
      }

      const faturamento = transacoes.reduce((s, t) => s + t.valor, 0);

      // === BASE_DIARIA_ENRIQUECIDA — preserva TODAS as linhas (PIX incluído) ===
      const baseDiariaEnriq = transacoes.map((t) => {
        const r = ratingByCartao.get(t.numero_cartao) ?? { rating: "SILVER", score: 0, trusted: false, ocorrencias: 0, totalGasto: 0, totalCompras: 0, statusManual: "NEUTRO" };
        const h = !t.isPix ? histMap.get(t.numero_cartao) : null;
        return {
          "Data/Hora": fmtDataHora(t.data_transacao),
          "Produto": t.produto,
          "Número do Cartão": t.numero_cartao,
          "Tipo Pagamento": t.tipo,
          "Valor": t.valor,
          "Rating Sugerido": r.rating,
          "Rating Final": r.rating,
          "Status Manual": r.statusManual ?? "NEUTRO",
          "TRUSTED": r.trusted ? "SIM" : "NÃO",
          "Score de Confiança": Number(r.score.toFixed(2)),
          "Alertas": r.rating === "RED" ? "RED" : (r.ocorrencias >= 3 ? "OCORRENCIAS" : ""),
          "Histórico": h ? "SIM" : "NÃO",
        };
      });

      const linhasExportadas = baseDiariaEnriq.length;

      const alertasSheet = alertas.map((a) => ({
        "Número do Cartão": a._cartao, "Tipo": a.tipo, "Gravidade": a.gravidade,
        "Status Manual": a._status_manual ?? "NEUTRO", "Descrição": a.descricao,
      }));

      // === MONITORAMENTO — agrupa compras (mesmo data/hora + cartão), 3 linhas em branco entre grupos ===
      const monitoramentoAOA: any[][] = [
        ["Data/Hora", "Produto", "Tipo", "Rating Final", "Status Manual", "TRUSTED"],
      ];
      let lastKey: string | null = null;
      for (const t of transacoes) {
        const r = ratingByCartao.get(t.numero_cartao) ?? { rating: "SILVER", trusted: false, statusManual: "NEUTRO" } as any;
        const dh = fmtDataHora(t.data_transacao);
        const key = `${dh}|${t.numero_cartao}`;
        if (lastKey !== null && key !== lastKey) {
          monitoramentoAOA.push(["", "", "", "", "", ""], ["", "", "", "", "", ""], ["", "", "", "", "", ""]);
        }
        monitoramentoAOA.push([dh, t.produto, t.tipo, r.rating, r.statusManual ?? "NEUTRO", r.trusted ? "SIM" : "NÃO"]);
        lastKey = key;
      }

      const BRL_FMT = `"R$" #,##0.00;[Red]-"R$" #,##0.00`;
      const applyBRL = (ws: XLSX.WorkSheet, headerNames: string[]) => {
        const ref = ws["!ref"]; if (!ref) return;
        const range = XLSX.utils.decode_range(ref);
        // mapeia headers (linha 0) -> índice de coluna
        const cols: number[] = [];
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cell = ws[XLSX.utils.encode_cell({ r: 0, c: C })];
          if (cell && headerNames.includes(String(cell.v))) cols.push(C);
        }
        for (const C of cols) {
          for (let R = 1; R <= range.e.r; R++) {
            const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
            if (cell && cell.v != null && cell.v !== "") {
              cell.t = "n"; cell.v = Number(cell.v); cell.z = BRL_FMT;
            }
          }
        }
      };

      const wb = XLSX.utils.book_new();
      const wsEnriq = XLSX.utils.json_to_sheet(baseDiariaEnriq);
      applyBRL(wsEnriq, ["Valor"]);
      XLSX.utils.book_append_sheet(wb, wsEnriq, "BASE_DIARIA_ENRIQUECIDA");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(alertasSheet.length ? alertasSheet : [{ info: "Nenhum alerta" }]), "ALERTAS");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(monitoramentoAOA), "MONITORAMENTO");
      const wsClient = XLSX.utils.json_to_sheet(clientesClassif.length ? clientesClassif : [{ info: "Sem clientes identificados" }]);
      applyBRL(wsClient, ["total_gasto"]);
      XLSX.utils.book_append_sheet(wb, wsClient, "CLIENTES_CLASSIFICADOS");

      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const consolidadoNome = `HONESTGUARD_RESULTADO_${stamp}.xlsx`;
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

      // === Diagnóstico de sincronização ===
      const cartoesUnicosPlanilha = new Set(transacoes.filter((t) => !t.isPix).map((t) => t.numero_cartao)).size;
      const { count: clientesNoBanco } = await supabaseAdmin
        .from("clientes").select("*", { count: "exact", head: true });
      const clientesAtualizados = agg.size;
      const sincronizado = cartoesUnicosPlanilha === clientesAtualizados;

      console.log(`[HonestGuard] Linhas lidas: ${linhasLidas} | Processadas: ${linhasProcessadas} | Transações inseridas: ${txRows.length}`);
      console.log(`[HonestGuard] Cartões únicos planilha: ${cartoesUnicosPlanilha} | Clientes atualizados: ${clientesAtualizados} | Clientes no banco: ${clientesNoBanco}`);
      if (!sincronizado) console.warn(`[HonestGuard] ⚠ Divergência: planilha=${cartoesUnicosPlanilha} vs atualizados=${clientesAtualizados}`);

      return {
        ok: true,
        totalTransacoes: transacoes.length,
        totalClientes: agg.size,
        diamond: cDia, gold: cGold, silver: cSil, red: cRed, trusted: cTrust,
        alertas: alertas.length,
        faturamento, p75, p90,
        linhasLidas, linhasProcessadas, linhasExportadas,
        consolidadoNome, consolidadoPath,
        cartoesUnicosPlanilha,
        clientesAtualizados,
        clientesNoBanco: clientesNoBanco ?? 0,
        sincronizado,
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

