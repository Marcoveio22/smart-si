import { createFileRoute } from "@tanstack/react-router";
import { Lightbulb } from "lucide-react";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/dicas")({
  head: () => ({
    meta: [
      { title: "Dicas Operacionais — SMART SI Monitoramento" },
      { name: "description", content: "Dicas práticas para reduzir perdas e aumentar a recuperação de valores." },
      { property: "og:title", content: "Dicas Operacionais — SMART SI Monitoramento" },
      { property: "og:description", content: "Dicas para reduzir perdas e recuperar valores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title="Dicas Operacionais"
      description="Boas práticas do dia a dia da loja"
      icon={Lightbulb}
      items={["Reposição em horários de pico", "Abordagem de clientes recorrentes", "Organização de prateleiras"]}
    />
  ),
});
