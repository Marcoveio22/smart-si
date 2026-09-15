import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import * as XLSX from "xlsx-js-style";

const PIX_TOKEN = "PIX";

function fmtDataHora(d: Date): string {
  const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(brt.getUTCDate())}/${pad(brt.getUTCMonth() + 1)}/${brt.getUTCFullYear()} ${pad(brt.getUTCHours())}:${pad(brt.getUTCMinutes())}:${pad(brt.getUTCSeconds())}`;
}

// Calcula início/fim (em UTC) de um dia no horário de Brasília (UTC-3, sem horário de verão).
// offsetDias: 0 = hoje, -1 = dia anterior.
function rangeDiaBRT(offsetDias: number) {
  const agora = new Date();
  const agoraBRT = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  const ano = agoraBRT.getUTCFullYear();
  const mes = agoraBRT.getUTCMonth();
  const dia = agoraBRT.getUTCDate() + offsetDias;
  const inicioUTC = new Date(Date.UTC(ano, mes, dia, 3, 0, 0));
  const fimUTC = new Date(Date.UTC(ano, mes, dia + 1, 3, 0, 0));
  const labelData = new Date(Date.UTC(ano, mes, dia, 12, 0, 0));
  const label = `${String(labelData.getUTCDate()).padStart(2, "0")}/${String(labelData.getUTCMonth() + 1).padStart(2, "0")}/${labelData.getUTCFullYear()}`;
  return { inicioUTC, fimUTC, label };
}

const BRL_FMT = `"R$" #,##0.00;[Red]-"R$" #,##0.00`;
function applyBRL(ws: XLSX.WorkSheet, headerNames: string[]) {
  const ref = ws["!ref"]; if (!ref) return;
  const range = XLSX.utils.decode_range(ref);
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
}

export const gerarRelatorioDiario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    loja_id: z.string().uuid(),
    dia: z.enum(["hoje", "ontem"]),
  }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const offsetDias = data.dia === "hoje" ? 0 : -1;
    const { inicioUTC, fimUTC, label } = rangeDiaBRT(offsetDias);

    const transacoes: any[] = [];
    {
      const TAMANHO_PAGINA = 1000;
      let desde = 0;
      while (true) {
        const { data: pagina, error: txErr } = await supabaseAdmin
          .from("transacoes")
          .select("numero_cartao, produto, tipo_pagamento, valor, data_transacao")
          .eq("loja_id", data.loja_id)
          .gte("data_transacao", inicioUTC.toISOString())
          .lt("data_transacao", fimUTC.toISOString())
          .order("data_transacao", { ascending: false })
          .range(desde, desde + TAMANHO_PAGINA - 1);
        if (txErr) throw txErr;
        if (!pagina || pagina.length === 0) break;
        transacoes.push(...pagina);
        if (pagina.length < TAMANHO_PAGINA) break;
        desde += TAMANHO_PAGINA;
      }
    }


    const cartoes = Array.from(new Set(
      (transacoes ?? []).map((t) => t.numero_cartao).filter((c): c is string => !!c)
    ));

    const clientesMap = new Map<string, any>();
    if (cartoes.length) {
      const { data: clientes, error: clErr } = await supabaseAdmin
        .from("clientes")
        .select("numero_cartao, rating_final, score_confianca, status_manual, is_trusted, ocorrencias, total_gasto, total_compras, ultima_compra, created_at")
        .eq("loja_id", data.loja_id)
        .in("numero_cartao", cartoes);
      if (clErr) throw clErr;
      for (const c of clientes ?? []) clientesMap.set(c.numero_cartao, c);
    }

    const clientePadrao = {
      rating_final: "SILVER", score_confianca: 0, status_manual: "NEUTRO",
      is_trusted: false, ocorrencias: 0, total_gasto: 0, total_compras: 0,
      ultima_compra: null, created_at: null,
    };

    const baseDiariaEnriq = (transacoes ?? []).map((t) => {
      const cartao = t.numero_cartao ?? PIX_TOKEN;
      const c = clientesMap.get(cartao) ?? clientePadrao;
      const jaExistiaAntes = c.created_at ? new Date(c.created_at) < inicioUTC : false;
      return {
        "Data/Hora": fmtDataHora(new Date(t.data_transacao)),
        "Produto": t.produto ?? "",
        "Número do Cartão": cartao,
        "Tipo Pagamento": t.tipo_pagamento ?? "",
        "Valor": Number(t.valor ?? 0),
        "Rating Sugerido": c.rating_final ?? "SILVER",
        "Rating Final": c.rating_final ?? "SILVER",
        "Status Manual": c.status_manual ?? "NEUTRO",
        "TRUSTED": c.is_trusted ? "SIM" : "NÃO",
        "Score de Confiança": Number(c.score_confianca ?? 0),
        "Alertas": c.rating_final === "RED" ? "RED" : (c.ocorrencias >= 3 ? "OCORRENCIAS" : ""),
        "Histórico": jaExistiaAntes ? "SIM" : "NÃO",
      };
    });

    const { data: alertasDia, error: alErr } = await supabaseAdmin
      .from("alertas")
      .select("cliente_id, tipo, gravidade, descricao, status, created_at, clientes(numero_cartao, status_manual)")
      .eq("loja_id", data.loja_id)
      .gte("created_at", inicioUTC.toISOString())
      .lt("created_at", fimUTC.toISOString());
    if (alErr) throw alErr;

    const alertasSheet = (alertasDia ?? []).map((a: any) => ({
      "Número do Cartão": a.clientes?.numero_cartao ?? "",
      "Tipo": a.tipo,
      "Gravidade": a.gravidade,
      "Status Manual": a.clientes?.status_manual ?? "NEUTRO",
      "Descrição": a.descricao,
    }));

    const monitoramentoAOA: any[][] = [
      ["Data/Hora", "Produto", "Tipo", "Rating Final", "Status Manual", "TRUSTED"],
    ];
    const linhasConfiaveis: number[] = [];
    let lastKey: string | null = null;
    for (const t of (transacoes ?? [])) {
      const cartao = t.numero_cartao ?? PIX_TOKEN;
      const c = clientesMap.get(cartao) ?? clientePadrao;
      const dh = fmtDataHora(new Date(t.data_transacao));
      const key = `${dh}|${cartao}`;
      if (lastKey !== null && key !== lastKey) {
        monitoramentoAOA.push(["", "", "", "", "", ""], ["", "", "", "", "", ""], ["", "", "", "", "", ""]);
      }
      const isTrustedRow = c.is_trusted || c.status_manual === "TRUSTED";
      if (isTrustedRow) linhasConfiaveis.push(monitoramentoAOA.length);
      monitoramentoAOA.push([dh, t.produto ?? "", t.tipo_pagamento ?? "", c.rating_final ?? "SILVER", c.status_manual ?? "NEUTRO", c.is_trusted ? "SIM" : "NÃO"]);
      lastKey = key;
    }

    const clientesClassif = cartoes
      .filter((c) => c !== PIX_TOKEN)
      .map((cartao) => {
        const c = clientesMap.get(cartao) ?? clientePadrao;
        return {
          numero_cartao: cartao,
          rating: c.rating_final ?? "SILVER",
          "Status Manual": c.status_manual ?? "NEUTRO",
          score_confianca: Number(c.score_confianca ?? 0),
          trusted: c.is_trusted ? "SIM" : "NÃO",
          total_gasto: Number(c.total_gasto ?? 0),
          total_compras: c.total_compras ?? 0,
          ocorrencias: c.ocorrencias ?? 0,
          ultima_compra: c.ultima_compra ? new Date(c.ultima_compra).toISOString().slice(0, 10) : "",
        };
      });

    const wb = XLSX.utils.book_new();
    const wsEnriq = XLSX.utils.json_to_sheet(baseDiariaEnriq.length ? baseDiariaEnriq : [{ info: "Nenhuma transação no período" }]);
    if (baseDiariaEnriq.length) applyBRL(wsEnriq, ["Valor"]);
    XLSX.utils.book_append_sheet(wb, wsEnriq, "BASE_DIARIA_ENRIQUECIDA");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(alertasSheet.length ? alertasSheet : [{ info: "Nenhum alerta" }]), "ALERTAS");

    const wsMonitoramento = XLSX.utils.aoa_to_sheet(monitoramentoAOA);
    const AMARELO_CONFIAVEL = { fill: { patternType: "solid", fgColor: { rgb: "FFFDE68A" } } };
    for (const rowIdx of linhasConfiaveis) {
      for (let col = 0; col < 6; col++) {
        const addr = XLSX.utils.encode_cell({ r: rowIdx, c: col });
        if (wsMonitoramento[addr]) wsMonitoramento[addr].s = AMARELO_CONFIAVEL;
      }
    }
    XLSX.utils.book_append_sheet(wb, wsMonitoramento, "MONITORAMENTO");

    const wsClient = XLSX.utils.json_to_sheet(clientesClassif.length ? clientesClassif : [{ info: "Sem clientes identificados" }]);
    if (clientesClassif.length) applyBRL(wsClient, ["total_gasto"]);
    XLSX.utils.book_append_sheet(wb, wsClient, "CLIENTES_CLASSIFICADOS");

    const buf = XLSX.write(wb, { type: "base64", bookType: "xlsx" }) as string;
    const filename = `RELATORIO_DIARIO_${label.replace(/\//g, "-")}.xlsx`;

    return {
      ok: true,
      filename,
      base64: buf,
      resumo: {
        data: label,
        totalTransacoes: transacoes?.length ?? 0,
        totalClientes: clientesClassif.length,
        alertas: alertasSheet.length,
        faturamento: baseDiariaEnriq.reduce((s, r) => s + (r["Valor"] as number), 0),
      },
    };
  });
