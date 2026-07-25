import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { adminListUsers, adminSetUserLojas } from "@/lib/tenant.functions";
import { useTenant } from "@/hooks/useTenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracoes/usuarios")({ component: UsuariosPage });

function UsuariosPage() {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const listar = useServerFn(adminListUsers);
  const salvar = useServerFn(adminSetUserLojas);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listar(),
    enabled: !!tenant?.isAdmin,
  });

  if (!tenant) return null;
  if (!tenant.isAdmin) {
    return <div className="text-sm text-muted-foreground">Acesso restrito a administradores.</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Usuários & Lojas</h1>
        <p className="text-sm text-muted-foreground">
          Vincule cada operador às lojas que ele deve enxergar. Um usuário pode ter várias lojas.
        </p>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Carregando...</div>}

      <div className="grid gap-3">
        {users.map((u: any) => (
          <UserRow
            key={u.id}
            user={u}
            lojas={tenant.lojas}
            onSave={async (lojaIds, defaultLojaId) => {
              try {
                await salvar({ data: { userId: u.id, lojaIds, defaultLojaId } });
                toast.success("Vínculos atualizados");
                qc.invalidateQueries({ queryKey: ["admin-users"] });
                qc.invalidateQueries({ queryKey: ["tenant-context"] });
              } catch (e: any) {
                toast.error(e.message ?? "Erro ao salvar");
              }
            }}
          />
        ))}
        {!isLoading && !users.length && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhum usuário cadastrado</CardContent></Card>
        )}
      </div>

      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
          <p><b>Como criar um novo login:</b> peça ao usuário para se cadastrar em <code>/auth</code>. Depois volte aqui e vincule às lojas dele.</p>
          <p>A <b>loja padrão</b> é a que abre por primeiro no login. Se o usuário tem mais de uma loja, um seletor aparece no topo.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function UserRow({
  user, lojas, onSave,
}: {
  user: { id: string; email: string | null; nome: string | null; defaultLojaId: string | null; lojaIds: string[]; roles: string[] };
  lojas: { id: string; nome: string }[];
  onSave: (lojaIds: string[], defaultLojaId: string | null) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(user.lojaIds));
  const [defaultId, setDefaultId] = useState<string | null>(user.defaultLojaId);
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
    if (defaultId && !next.has(defaultId)) setDefaultId(next.size ? [...next][0] : null);
  };

  const save = async () => {
    setSaving(true);
    await onSave([...selected], defaultId);
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate">{user.nome || user.email || user.id}</div>
            <div className="text-xs font-normal text-muted-foreground truncate">
              {user.email} · {user.roles.length ? user.roles.join(", ") : "user"}
            </div>
          </div>
          <Button size="sm" onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 md:grid-cols-2">
          {lojas.map((l) => (
            <label key={l.id} className="flex items-center gap-2 text-sm">
              <Checkbox checked={selected.has(l.id)} onCheckedChange={() => toggle(l.id)} />
              <span>{l.nome}</span>
            </label>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Loja padrão:</span>
          <Select
            value={defaultId ?? ""}
            onValueChange={(v) => setDefaultId(v || null)}
          >
            <SelectTrigger className="h-8 w-64 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {[...selected].map((id) => {
                const l = lojas.find((x) => x.id === id);
                if (!l) return null;
                return <SelectItem key={id} value={id}>{l.nome}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
