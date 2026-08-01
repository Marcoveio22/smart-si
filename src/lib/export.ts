/**
 * Exportação de dados filtrados (CSV / Excel / PDF) — 100% client-side.
 * As bibliotecas são carregadas sob demanda para não pesar no bundle inicial.
 */

export type Column<T> = { key: keyof T & string; header: string; format?: (v: any, row: T) => string | number };

const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const cell = <T,>(row: T, col: Column<T>) => {
  const raw = (row as any)[col.key];
  return col.format ? col.format(raw, row) : (raw ?? "");
};

export function exportCSV<T>(rows: T[], cols: Column<T>[], name: string) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    cols.map((c) => esc(c.header)).join(";"),
    ...rows.map((r) => cols.map((c) => esc(cell(r, c))).join(";")),
  ].join("\r\n");
  download(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), `${name}-${stamp()}.csv`);
}

export async function exportExcel<T>(rows: T[], cols: Column<T>[], name: string, sheet = "Dados") {
  const XLSX = await import("xlsx");
  const data = rows.map((r) => Object.fromEntries(cols.map((c) => [c.header, cell(r, c)])));
  const ws = XLSX.utils.json_to_sheet(data, { header: cols.map((c) => c.header) });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet.slice(0, 30));
  XLSX.writeFile(wb, `${name}-${stamp()}.xlsx`);
}

export type PdfSection<T = any> = { title: string; cols: Column<T>[]; rows: T[] };

export async function exportPDF(
  title: string,
  subtitle: string,
  sections: PdfSection[],
  name: string,
  summary?: { label: string; value: string }[],
) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.setFontSize(16);
  doc.text(title, 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(subtitle, 40, 58);
  doc.setTextColor(0);

  let y = 76;
  if (summary?.length) {
    autoTable(doc, {
      startY: y,
      head: [["Indicador", "Valor"]],
      body: summary.map((s) => [s.label, s.value]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [24, 74, 150] },
      margin: { left: 40, right: 40 },
    });
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  for (const s of sections) {
    doc.setFontSize(12);
    doc.text(s.title, 40, y);
    autoTable(doc, {
      startY: y + 8,
      head: [s.cols.map((c) => c.header)],
      body: s.rows.map((r) => s.cols.map((c) => String(cell(r, c)))),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [24, 74, 150] },
      margin: { left: 40, right: 40 },
    });
    y = (doc as any).lastAutoTable.finalY + 26;
    if (y > 500) {
      doc.addPage();
      y = 50;
    }
  }
  doc.save(`${name}-${stamp()}.pdf`);
}

/** PDF simples de cobrança para envio ao cliente/síndico. */
export async function cobrancaPDF(input: {
  loja: string;
  cartao: string;
  descricao: string;
  valor: number;
  data: string;
  observacao?: string;
}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  doc.setFontSize(18);
  doc.text("Aviso de Cobrança", 40, 50);
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text("SMART SI Monitoramento", 40, 68);
  doc.setTextColor(0);
  doc.setFontSize(11);
  const lines = [
    `Loja: ${input.loja}`,
    `Cliente (cartão): ${input.cartao}`,
    `Data da ocorrência: ${input.data}`,
    `Valor devido: ${brl(input.valor)}`,
    "",
    "Descrição da ocorrência:",
    ...doc.splitTextToSize(input.descricao || "—", 500),
  ];
  if (input.observacao) lines.push("", "Observações:", ...doc.splitTextToSize(input.observacao, 500));
  lines.push("", "Solicitamos a regularização do valor acima junto à administração da loja.");
  doc.text(lines, 40, 110);
  const filename = `cobranca-${input.cartao}-${stamp()}.pdf`;
  doc.save(filename);
  return filename;
}
