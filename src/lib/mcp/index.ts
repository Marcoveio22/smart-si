import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listarClientes from "./tools/listar-clientes";
import listarAlertas from "./tools/listar-alertas";
import listarOcorrencias from "./tools/listar-ocorrencias";
import resumoDashboard from "./tools/resumo-dashboard";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "smart-si-monitoramento",
  title: "SMART SI Monitoramento",
  version: "0.1.0",
  instructions: "Ferramentas de monitoramento de minimercados autônomos: clientes classificados (DIAMOND/GOLD/SILVER/RED), alertas operacionais, ocorrências e resumo do dashboard.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listarClientes, listarAlertas, listarOcorrencias, resumoDashboard],
});
