import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/treinamentos")({
  head: () => ({
    meta: [
      { title: "Treinamentos — SMART SI Monitoramento" },
      { name: "description", content: "Trilhas de treinamento para operação de minimercados autônomos." },
      { property: "og:title", content: "Treinamentos — SMART SI Monitoramento" },
      { property: "og:description", content: "Trilhas de treinamento para a operação da loja autônoma." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title="Treinamentos"
      description="Trilhas de capacitação da operação"
      icon={GraduationCap}
      items={["Onboarding do gestor", "Boas práticas de monitoramento", "Tratativa de ocorrências"]}
    />
  ),
});
