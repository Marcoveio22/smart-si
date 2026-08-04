import { createFileRoute } from "@tanstack/react-router";
import { Bot } from "lucide-react";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/suporte-ia")({
  head: () => ({
    meta: [
      { title: "Suporte da IA — SMART SI Monitoramento" },
      { name: "description", content: "Assistente inteligente para análise de ocorrências e recomendações." },
      { property: "og:title", content: "Suporte da IA — SMART SI Monitoramento" },
      { property: "og:description", content: "Assistente inteligente para análise de ocorrências." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title="Suporte da IA"
      description="Assistente para análise da operação"
      icon={Bot}
      items={["Perguntas sobre a operação", "Sugestões de tratativa", "Resumos automáticos"]}
    />
  ),
});
