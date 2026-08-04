import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/cobrancas/pdf")({
  head: () => ({
    meta: [
      { title: "PDF e Relatórios — SMART SI Monitoramento" },
      { name: "description", content: "Geração de cobranças e relatórios em PDF para síndicos e RH." },
      { property: "og:title", content: "PDF e Relatórios — SMART SI Monitoramento" },
      { property: "og:description", content: "Cobranças e relatórios em PDF para síndicos e RH." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title="PDF / Relatórios"
      description="Documentos gerados para síndico e RH"
      icon={FileText}
      items={["Cobrança individual em PDF", "Relatório consolidado do período", "Envio por e-mail"]}
    />
  ),
});
