import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";

export const Route = createFileRoute("/_authenticated/alertas")({ component: AlertasPage });

const gravidadeStyle: Record<string, string> = {
  alta: "border-l-[var(--destructive)] bg-[var(--destructive)]/5",
  media: "border-l-[var(--rating-gold)] bg-[var(--rating-gold)]/5",
  baixa: "border-l-[var(--rating-silver)]/60",
};
const gravidadeIcon: Record<string, any> = { alta: AlertTriangle, media: AlertCircle, baixa: Info };

function AlertasPage() {
  const [gravidade, setGravidade] = useState("all");
  const [status, setStatus] = useState("all");
  const [periodo, setPeriodo] = useState("30");
  const { selectedLojaId } = useTenant();

  const { data: alertas = [] } = useQuery({
    queryKey: ["alertas", gravidade, status, periodo, selectedLojaId ?? "own"],
    queryFn: async () => {
      let q = supabase.from("alertas").select("*, clientes(numero_cartao, rating_final)").order("created_at", { ascending: false });
      if (selectedLojaId) q = q.eq("loja_id", selectedLojaId);
      if (gravidade !== "all") q = q.eq("gravidade", gravidade);
      if (status !== "all") q = q.eq("status", status);
      if (periodo !== "all") {
        const since = new Date(); since.setDate(since.getDate() - Number(periodo));
        q = q.gte("created_at", since.toISOString());
      }
      return (await q).data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Alertas</h1>
        <p className="text-sm text-muted-foreground">Comportamentos suspeitos detectados pela engine</p>
      </div>

      <Card><CardContent className="p-4 grid gap-3 md:grid-cols-3">
        <Select value={gravidade} onValueChange={setGravidade}>
          <SelectTrigger><SelectValue placeholder="Gravidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas gravidades</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="resolvido">Resolvido</SelectItem>
          </SelectContent>
        </Select>
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="all">Todo período</SelectItem>
          </SelectContent>
        </Select>
      </CardContent></Card>

      <div className="space-y-3">
        {alertas.map((a: any) => {
          const Icon = gravidadeIcon[a.gravidade] ?? Info;
          return (
            <Card key={a.id} className={cn("border-l-4", gravidadeStyle[a.gravidade] ?? "")}>
              <CardContent className="p-4 flex gap-4 items-start">
                <Icon className="h-5 w-5 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{a.tipo}</span>
                    <span className={cn("text-[10px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded", a.gravidade === "alta" ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground")}>{a.gravidade}</span>
                    <span className="text-xs text-muted-foreground">• {a.status}</span>
                    {a.clientes?.numero_cartao && <span className="text-xs font-mono text-muted-foreground">• Cartão {a.clientes.numero_cartao}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{a.descricao}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{new Date(a.created_at).toLocaleString("pt-BR")}</span>
              </CardContent>
            </Card>
          );
        })}
        {!alertas.length && <Card><CardContent className="p-12 text-center text-muted-foreground">Nenhum alerta encontrado</CardContent></Card>}
      </div>
    </div>
  );
}
