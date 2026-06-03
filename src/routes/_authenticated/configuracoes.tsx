import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, Users, Cpu, UserCog } from "lucide-react";

export const Route = createFileRoute("/_authenticated/configuracoes")({ component: ConfigPage });

function ConfigPage() {
  const { data } = useQuery({
    queryKey: ["config-stats"],
    queryFn: async () => {
      const [loja, clientes, proc, profiles] = await Promise.all([
        supabase.from("lojas").select("*").limit(1).maybeSingle(),
        supabase.from("clientes").select("id", { count: "exact", head: true }),
        supabase.from("processamentos").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      return {
        loja: loja.data,
        clientes: clientes.count ?? 0,
        proc: proc.count ?? 0,
        profiles: profiles.count ?? 0,
      };
    },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Informações da operação e parâmetros da plataforma</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center"><Store className="h-5 w-5" /></div>
            <CardTitle className="text-base">Loja Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{data?.loja?.nome ?? "—"}</div>
            <div className="text-sm text-muted-foreground">{data?.loja?.endereco ?? "Sem endereço cadastrado"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center"><Users className="h-5 w-5" /></div>
            <CardTitle className="text-base">Clientes</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{data?.clientes}</div></CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center"><Cpu className="h-5 w-5" /></div>
            <CardTitle className="text-base">Processamentos</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{data?.proc}</div></CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center"><UserCog className="h-5 w-5" /></div>
            <CardTitle className="text-base">Usuários Cadastrados</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{data?.profiles}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Engine de Classificação</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>A classificação dos clientes (RED, SILVER, GOLD, DIAMOND, TRUSTED) é calculada externamente por uma Engine Python.</p>
          <p>Esta plataforma consome e exibe os resultados armazenados no banco de dados. Configurações avançadas da engine serão disponibilizadas nas próximas versões.</p>
          <div className="mt-4 p-3 rounded-md bg-muted/40 border border-dashed text-xs">
            Espaço reservado para parâmetros futuros: thresholds, janelas de análise, regras de TRUSTED, integração com API FastAPI.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
