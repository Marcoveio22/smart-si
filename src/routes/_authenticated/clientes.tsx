import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RatingBadge } from "@/components/RatingBadge";
import { StatusManualBadge } from "@/components/StatusManualBadge";
import { Eye } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clientes")({ component: ClientesPage });

function ClientesPage() {
  const [search, setSearch] = useState("");
  const [rating, setRating] = useState("all");
  const [statusManual, setStatusManual] = useState("all");
  const [minGasto, setMinGasto] = useState("");

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["clientes", "all"],
    queryFn: async () => {
      // Paginação manual: o Supabase limita SELECT a 1000 linhas por requisição.
      // Sem isso, clientes SILVER de baixo gasto ficavam fora da página inicial
      // ordenada por total_gasto desc e pareciam "não existir".
      const pageSize = 1000;
      let from = 0;
      const all: any[] = [];
      // Loop até esgotar
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase
          .from("clientes")
          .select("*")
          .order("total_gasto", { ascending: false })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      console.log("[Clientes] Total carregado:", all.length);
      return all;
    },
  });

  const { data: counts } = useQuery({
    queryKey: ["clientes", "counts"],
    queryFn: async () => {
      const ratings = ["DIAMOND", "GOLD", "SILVER", "RED", "TRUSTED"] as const;
      const status = ["TRUSTED", "RED_FLAG", "NEUTRO"] as const;
      const out: Record<string, number> = {};
      await Promise.all(
        ratings.map(async (r) => {
          const { count } = await supabase
            .from("clientes")
            .select("*", { count: "exact", head: true })
            .eq("rating_final", r);
          out[`rating_${r}`] = count ?? 0;
        }),
      );
      await Promise.all(
        status.map(async (s) => {
          const { count } = await supabase
            .from("clientes")
            .select("*", { count: "exact", head: true })
            .eq("status_manual", s);
          out[`status_${s}`] = count ?? 0;
        }),
      );
      const { count: total } = await supabase
        .from("clientes")
        .select("*", { count: "exact", head: true });
      out.total = total ?? 0;
      return out;
    },
  });

  // Normaliza removendo espaços, asteriscos, traços e caracteres invisíveis para casar
  // máscaras diferentes (ex: "5502********4016" vs "5502******4016").
  const normalizeSearch = (s: string) =>
    s.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "").replace(/[\s\*\-]/g, "").toLowerCase();
  const onlyDigits = (s: string) => s.replace(/\D/g, "");

  const filtered = clientes.filter((c: any) => {
    if (search) {
      const card = String(c.numero_cartao ?? "");
      const cardNorm = normalizeSearch(card);
      const cardDigits = onlyDigits(card);
      const qRaw = search.trim();
      const qNorm = normalizeSearch(qRaw);
      const qDigits = onlyDigits(qRaw);
      // Match em qualquer uma das estratégias:
      // 1) substring sobre versão normalizada (full ou parcial, ignora máscara)
      // 2) substring no texto original (preserva busca por máscara literal)
      // 3) últimos 4 dígitos
      // 4) primeiros 4-6 dígitos (BIN)
      const matches =
        (qNorm && cardNorm.includes(qNorm)) ||
        card.toLowerCase().includes(qRaw.toLowerCase()) ||
        (qDigits.length === 4 && cardDigits.endsWith(qDigits)) ||
        (qDigits.length >= 4 && qDigits.length <= 6 && cardDigits.startsWith(qDigits));
      if (!matches) return false;
    }
    if (rating !== "all" && c.rating_final !== rating) return false;
    if (statusManual !== "all" && (c.status_manual ?? "NEUTRO") !== statusManual) return false;
    if (minGasto && Number(c.total_gasto) < Number(minGasto)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clientes</h1>
        <p className="text-sm text-muted-foreground">Classificação inteligente e histórico de comportamento</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Diagnóstico — clientes no banco</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
            <Stat label="DIAMOND" value={counts?.rating_DIAMOND} />
            <Stat label="GOLD" value={counts?.rating_GOLD} />
            <Stat label="SILVER" value={counts?.rating_SILVER} />
            <Stat label="RED" value={counts?.rating_RED} />
            <Stat label="TRUSTED (rating)" value={counts?.rating_TRUSTED} />
            <Stat label="🟢 TRUSTED manual" value={counts?.status_TRUSTED} />
            <Stat label="🔴 RED FLAG manual" value={counts?.status_RED_FLAG} />
            <Stat label="⚪ NEUTRO manual" value={counts?.status_NEUTRO} />
            <Stat label="Total no banco" value={counts?.total} />
            <Stat label="Carregados em memória" value={clientes.length} />
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground font-mono">
            query: supabase.from("clientes").select("*").order("total_gasto", desc).range(0, N) — sem filtro de rating
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-4">
          <Input placeholder="Cartão: completo, parcial, BIN ou últimos 4" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={rating} onValueChange={setRating}>
            <SelectTrigger><SelectValue placeholder="Rating" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os ratings</SelectItem>
              <SelectItem value="DIAMOND">DIAMOND</SelectItem>
              <SelectItem value="GOLD">GOLD</SelectItem>
              <SelectItem value="SILVER">SILVER</SelectItem>
              <SelectItem value="RED">RED</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusManual} onValueChange={setStatusManual}>
            <SelectTrigger><SelectValue placeholder="Status Manual" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="TRUSTED">🟢 TRUSTED</SelectItem>
              <SelectItem value="NEUTRO">⚪ NEUTRO</SelectItem>
              <SelectItem value="RED_FLAG">🔴 RED FLAG</SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" placeholder="Gasto mínimo (R$)" value={minGasto} onChange={(e) => setMinGasto(e.target.value)} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground border-b bg-muted/30">
              <tr>
                <th className="px-4 py-3">Cartão</th>
                <th>Rating</th>
                <th>Status Manual</th>
                <th>Score</th>
                <th>Compras</th>
                <th>Gasto Total</th>
                <th>Ocorrências</th>
                <th>Última Compra</th>
                <th className="px-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</td></tr>}
              {!isLoading && !filtered.length && <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum cliente encontrado</td></tr>}
              {filtered.map((c: any) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono">{c.numero_cartao}</td>
                  <td><RatingBadge rating={c.rating_final} /></td>
                  <td><StatusManualBadge status={c.status_manual} /></td>
                  <td>{Number(c.score_confianca).toFixed(1)}</td>
                  <td>{c.total_compras}</td>
                  <td className="font-semibold">{Number(c.total_gasto).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                  <td>{c.ocorrencias}</td>
                  <td className="text-xs text-muted-foreground">{c.ultima_compra ? new Date(c.ultima_compra).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="px-4">
                    <ClienteDetails cliente={c} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function ClienteDetails({ cliente }: { cliente: any }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string>(cliente.status_manual ?? "NEUTRO");
  const [obs, setObs] = useState<string>(cliente.status_manual_observacao ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("clientes")
      .update({
        status_manual: status,
        status_manual_desde: new Date().toISOString(),
        status_manual_por: userRes.user?.id ?? null,
        status_manual_observacao: obs || null,
      } as any)
      .eq("id", cliente.id);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar status: " + error.message); return; }
    toast.success("Status manual atualizado");
    qc.invalidateQueries({ queryKey: ["clientes"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Cliente {cliente.numero_cartao}</DialogTitle></DialogHeader>
        <div className="grid gap-3 text-sm">
          <Row label="Rating Final"><RatingBadge rating={cliente.rating_final} /></Row>
          <Row label="Status Manual Atual"><StatusManualBadge status={cliente.status_manual} /></Row>
          <Row label="Score de Confiança">{Number(cliente.score_confianca).toFixed(2)}</Row>
          <Row label="Total de Compras">{cliente.total_compras}</Row>
          <Row label="Gasto Total">{Number(cliente.total_gasto).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</Row>
          <Row label="Ocorrências">{cliente.ocorrencias}</Row>
          <Row label="Última Compra">{cliente.ultima_compra ? new Date(cliente.ultima_compra).toLocaleString("pt-BR") : "—"}</Row>
          {cliente.status_manual_desde && (
            <Row label="Status Definido em">{new Date(cliente.status_manual_desde).toLocaleString("pt-BR")}</Row>
          )}
        </div>

        <div className="border-t pt-4 space-y-3">
          <div className="text-sm font-semibold">Definir Status Manual</div>
          <RadioGroup value={status} onValueChange={setStatus} className="grid gap-2">
            <Label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="TRUSTED" /> <span>🟢 TRUSTED</span>
            </Label>
            <Label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="NEUTRO" /> <span>⚪ NEUTRO</span>
            </Label>
            <Label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="RED_FLAG" /> <span>🔴 RED FLAG</span>
            </Label>
          </RadioGroup>
          <div>
            <Label className="text-xs text-muted-foreground">Observação (opcional)</Label>
            <Textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Ex.: Cliente recorrente validado por inspeção."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar Status"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex justify-between border-b border-border/50 py-2"><span className="text-muted-foreground">{label}</span><span className="font-medium">{children}</span></div>;
}
