import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/cobrancas/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de Cobranças — SMART SI Monitoramento" },
      { name: "description", content: "Acompanhe todas as cobranças enviadas, negociações e pagamentos recebidos." },
      { property: "og:title", content: "Histórico de Cobranças — SMART SI Monitoramento" },
      { property: "og:description", content: "Cobranças enviadas, negociações e pagamentos recebidos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title="Histórico de Cobranças"
      description="Todas as cobranças emitidas e seu status"
      icon={History}
      items={["Filtros por status e período", "Valor cobrado x recuperado", "Exportação"]}
    />
  ),
});
