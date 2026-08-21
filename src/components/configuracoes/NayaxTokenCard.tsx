import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getNayaxStatus, setNayaxToken } from "@/lib/nayax.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";

export function NayaxTokenCard({ lojaId }: { lojaId: string }) {
  const fetchStatus = useServerFn(getNayaxStatus);
  const saveToken = useServerFn(setNayaxToken);
  const queryClient = useQueryClient();
  const [token, setToken] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["nayax-status", lojaId],
    queryFn: () => fetchStatus({ data: { lojaId } }),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: () => saveToken({ data: { lojaId, token } }),
    onSuccess: () => {
      setToken("");
      toast.success("Token atualizado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["nayax-status", lojaId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível salvar o token"),
  });

  // Sem permissão (não é admin com vínculo nesta loja): explica em vez de esconder.
  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <div className="h-9 w-9 rounded-md bg-muted text-muted-foreground flex items-center justify-center">
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Integração Nayax</CardTitle>
            <div className="text-xs text-muted-foreground">
              Sem permissão para gerenciar o token desta loja
            </div>
          </div>
          <Badge variant="secondary">Bloqueado</Badge>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Apenas administradores com vínculo nesta loja podem cadastrar o token Nayax. Peça a um
          administrador para vincular seu usuário a esta loja em Configurações · Usuários &amp; Lojas.
        </CardContent>
      </Card>
    );
  }


  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
          <KeyRound className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <CardTitle className="text-base">Integração Nayax</CardTitle>
          <div className="text-xs text-muted-foreground">
            Token de acesso usado pela sincronização automática de transações
          </div>
        </div>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Badge variant={data?.configurado ? "default" : "secondary"}>
            {data?.configurado ? "Configurado" : "Não configurado"}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (token.trim().length < 10) {
              toast.error("Informe um token válido");
              return;
            }
            mutation.mutate();
          }}
        >
          <Label htmlFor="nayax-token">
            {data?.configurado ? "Substituir token" : "Token de acesso"}
          </Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id="nayax-token"
              type="password"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Cole aqui o novo token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <Button type="submit" disabled={mutation.isPending || !token.trim()}>
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar token
            </Button>
          </div>
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            O token é somente de escrita: após salvo, ele nunca é exibido novamente. Para trocar,
            cole um novo valor por cima.
          </p>
        </form>

        <div className="grid gap-3 sm:grid-cols-3 text-sm border-t pt-4">
          <Meta label="Status" value={data?.status ?? "—"} />
          <Meta
            label="Última sincronização"
            value={
              data?.ultimaSincronizacao
                ? new Date(data.ultimaSincronizacao).toLocaleString("pt-BR")
                : "—"
            }
          />
          <Meta label="Último erro" value={data?.ultimoErro ?? "—"} />
        </div>
      </CardContent>
    </Card>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 break-words">{value}</div>
    </div>
  );
}
