import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, FileType, Loader2 } from "lucide-react";
import { exportCSV, exportExcel, exportPDF, type Column } from "@/lib/export";
import { toast } from "sonner";

export function ExportMenu<T>({
  rows,
  cols,
  filename,
  title,
  subtitle,
  summary,
  label = "Exportar",
}: {
  rows: T[];
  cols: Column<T>[];
  filename: string;
  title: string;
  subtitle?: string;
  summary?: { label: string; value: string }[];
  label?: string;
}) {
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => void | Promise<void>) => {
    if (!rows.length) {
      toast.info("Nada para exportar com os filtros atuais.");
      return;
    }
    setBusy(true);
    try {
      await fn();
      toast.success("Exportação concluída.");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao exportar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 text-xs" disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="text-xs">Dados filtrados ({rows.length})</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => run(() => exportPDF(title, subtitle ?? "", [{ title, cols, rows }], filename, summary))}>
          <FileType className="mr-2 h-4 w-4" /> PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run(() => exportExcel(rows, cols, filename, title))}>
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run(() => exportCSV(rows, cols, filename))}>
          <FileText className="mr-2 h-4 w-4" /> CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
