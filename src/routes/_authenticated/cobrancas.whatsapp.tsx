import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/cobrancas/whatsapp")({
  head: () => ({
    meta: [
      { title: "Cobrança por WhatsApp — SMART SI Monitoramento" },
      { name: "description", content: "Envio de cobranças por WhatsApp com registro automático no financeiro." },
      { property: "og:title", content: "Cobrança por WhatsApp — SMART SI Monitoramento" },
      { property: "og:description", content: "Envio de cobranças por WhatsApp com registro no financeiro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title="WhatsApp"
      description="Envio de cobranças pelo WhatsApp"
      icon={MessageCircle}
      items={["Modelos de mensagem", "Envio em lote", "Confirmação de leitura"]}
    />
  ),
});
