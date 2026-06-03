import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RatingBadge } from "@/components/RatingBadge";
import { Eye } from "lucide-react";

export const Route = createFileRoute("/_authenticated/clientes")({ component: ClientesPage });

function ClientesPage() {
  const [search, setSearch] = useState("");
  const [rating, setRating] = useState("all");
  const [trustedOnly, setTrustedOnly] = useState("all");
  const [minGasto, setMinGasto] = useState("");

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => (await supabase.from("clientes").select("*").order("total_gasto", { ascending: false })).data ?? [],
  });

  const filtered = clientes.filter((c) => {
    if (search && !c.numero_cartao.toLowerCase().includes(search.toLowerCase())) return false;
    if (rating !== "all" && c.rating_final !== rating) return false;
    if (trustedOnly === "yes" && !c.is_trusted) return false;
    if (trustedOnly === "no" && c.is_trusted) return false;
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
        <CardContent className="p-4 grid gap-3 md:grid-cols-4">
          <Input placeholder="Buscar por cartão..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={rating} onValueChange={setRating}>
            <SelectTrigger><SelectValue placeholder="Rating" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os ratings</SelectItem>
              <SelectItem value="DIAMOND">DIAMOND</SelectItem>
              <SelectItem value="GOLD">GOLD</SelectItem>
              <SelectItem value="SILVER">SILVER</SelectItem>
              <SelectItem value="RED">RED</SelectItem>
              <SelectItem value="TRUSTED">TRUSTED</SelectItem>
            </SelectContent>
          </Select>
          <Select value={trustedOnly} onValueChange={setTrustedOnly}>
            <SelectTrigger><SelectValue placeholder="Trusted" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="yes">Apenas TRUSTED</SelectItem>
              <SelectItem value="no">Não TRUSTED</SelectItem>
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
                <th>Score</th>
                <th>Compras</th>
                <th>Gasto Total</th>
                <th>Ocorrências</th>
                <th>Trusted</th>
                <th>Última Compra</th>
                <th className="px-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</td></tr>}
              {!isLoading && !filtered.length && <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum cliente encontrado</td></tr>}
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono">{c.numero_cartao}</td>
                  <td><RatingBadge rating={c.rating_final} /></td>
                  <td>{Number(c.score_confianca).toFixed(1)}</td>
                  <td>{c.total_compras}</td>
                  <td className="font-semibold">{Number(c.total_gasto).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                  <td>{c.ocorrencias}</td>
                  <td>{c.is_trusted ? <RatingBadge rating="TRUSTED" /> : <span className="text-muted-foreground text-xs">—</span>}</td>
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
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Cliente {cliente.numero_cartao}</DialogTitle></DialogHeader>
        <div className="grid gap-3 text-sm">
          <Row label="Rating Final"><RatingBadge rating={cliente.rating_final} /></Row>
          <Row label="Score de Confiança">{Number(cliente.score_confianca).toFixed(2)}</Row>
          <Row label="Total de Compras">{cliente.total_compras}</Row>
          <Row label="Gasto Total">{Number(cliente.total_gasto).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</Row>
          <Row label="Ocorrências">{cliente.ocorrencias}</Row>
          <Row label="Trusted">{cliente.is_trusted ? "Sim" : "Não"}</Row>
          <Row label="Última Compra">{cliente.ultima_compra ? new Date(cliente.ultima_compra).toLocaleString("pt-BR") : "—"}</Row>
          <Row label="Criado em">{new Date(cliente.created_at).toLocaleString("pt-BR")}</Row>
        </div>
      </DialogContent>
    </Dialog>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex justify-between border-b border-border/50 py-2"><span className="text-muted-foreground">{label}</span><span className="font-medium">{children}</span></div>;
}
