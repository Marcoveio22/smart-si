import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { FileSpreadsheet, Download, Loader2 } from "lucide-react";
import { gerarRelatorioDiario } from "@/lib/relatorioDiario.functions";

function base64ToBlob(base64: string, mime: string) {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mime });
}

export function DailyReportPanel({ lojaId, lojaLabel }: { lojaId: string | null; lojaLabel: string }) {
  const fetchRelatorio = useServerFn(gerarRelatorioDiario);
  const [dia, setDia] = useState<"hoje" | "ontem">("hoje");
  const [loading, setLoading] = useState(false);
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState(null);

  const gerar = async () => {
    if (!lojaId) {
      setErro("Selecione uma loja específica no topo do dashboard para gerar o relatório.");
      return;
    }
    setLoading(true);
    setErro(null);
    setResumo(null);
    try {
      const res = await fetchRelatorio({ data: { loja_id: lojaId, dia } });
      const blob = base64ToBlob(
        res.base64,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setResumo(res.resumo);
    } catch (e: any) {
      setErro(e?.message ?? "Erro ao gerar relatório");
    } finally {
      setLoading(false);
    }
  };

  return (
    
      


        


          Gera a planilha de conferência (base diária, alertas, monitoramento e clientes classificados) para {lojaLabel}.
        


        


           setDia(v as "hoje" | "ontem")}>
            
              
            
            
              Hoje
              Dia anterior
            
          
          
            {loading ?  : }
            Gerar e baixar
          
        


        {erro && (
          


            {erro}
          


        )}
        {resumo && (
          


            

{resumo.data} — {resumo.totalTransacoes} transações · {resumo.totalClientes} clientes · {resumo.alertas} alertas


            


              Faturamento do dia: {Number(resumo.faturamento).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            


          


        )}
      


    
  );
}
