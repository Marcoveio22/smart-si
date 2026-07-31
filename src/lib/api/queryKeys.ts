import type { DashboardFilters } from "./filters";

/** Chaves estáveis para React Query — evita refetch duplicado entre telas. */
export const queryKeys = {
  dashboard: {
    executivo: (f: Partial<DashboardFilters>) => ["dashboard", "executivo", f] as const,
    financeiro: (f: Partial<DashboardFilters>) => ["dashboard", "financeiro", f] as const,
    produtos: (f: Partial<DashboardFilters>) => ["dashboard", "produtos", f] as const,
    clientes: (f: Partial<DashboardFilters>) => ["dashboard", "clientes", f] as const,
    horarios: (f: Partial<DashboardFilters>) => ["dashboard", "horarios", f] as const,
    recorrentes: (f: Partial<DashboardFilters>) => ["dashboard", "recorrentes", f] as const,
    stats: (lojaId: string | null) => ["dashboard", "stats", lojaId] as const,
  },
  ocorrencias: {
    lista: (f: Partial<DashboardFilters>) => ["ocorrencias", "lista", f] as const,
    detalhe: (id: string) => ["ocorrencias", "detalhe", id] as const,
    imagens: (id: string) => ["ocorrencias", "imagens", id] as const,
    statusLog: (id: string) => ["ocorrencias", "status-log", id] as const,
  },
  financeiro: {
    cobrancas: (ocorrenciaId: string) => ["cobrancas", ocorrenciaId] as const,
    recuperacoes: (ocorrenciaId: string) => ["recuperacoes", ocorrenciaId] as const,
  },
} as const;
