import { createFileRoute } from "@tanstack/react-router";
import { DollarSign } from "lucide-react";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/cobrancas/")({
  head: () => ({
    meta: [
      { title: "Gerar Cobrança — SMART SI Monitoramento" },
      { name: "description", content: "Gere cobranças de ocorrências dos minimercados autônomos em poucos cliques." },
      { property: "og:title", content: "Gerar Cobrança — SMART SI Monitoramento" },
      { property: "og:description", content: "Gere cobranças de ocorrências dos minimercados autônomos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title="Gerar Cobrança"
      description="Fluxo dedicado de emissão de cobranças"
      icon={DollarSign}
      items={["Seleção de ocorrência", "Cálculo de valor devido", "Escolha do canal de envio"]}
    />
  ),
});
