## Situação atual

- `src/routes/_authenticated/dashboard.tsx` — página única, com 10 StatCards em grade, 4 gráficos Recharts e tabela Top 10. Consome `getDashboardStats` (server fn) via `useQuery` + `useTenant`.
- Componentes próprios existentes: `RatingBadge`, `StatusManualBadge`, `AppSidebar`.
- shadcn/ui disponível: card, button, avatar, badge, separator, scroll-area, progress, tooltip, skeleton, table, tabs, chart.
- Tokens do Design System em `src/styles.css` (primary, accent, muted, chart-1..5, rating-*). Nada de cor hardcoded.

## O que será feito (apenas UI)

Nenhuma alteração em queries, server functions, hooks de dados, RLS, migrations ou backend. `getDashboardStats` permanece intocado e continua sendo a única fonte dos números reais.

### Estrutura nova da página

1. **Topo**: cabeçalho com título, subtítulo e área de filtros (placeholder visual de período), melhor espaçamento. Seletor de loja permanece no header global (`_authenticated.tsx`), sem mudanças.
2. **Linha 1** — 5 `MetricCard` com ícone, título, valor, variação % e sparkline:
   - Faturamento do Dia, Compras do Dia, Ocorrências do Dia, Valores Recuperados, Taxa de Recuperação.
   - Onde o dado existe (faturamento, alertas/ocorrências, séries `fatPorMes`/`alertasPorDia`) usa dado real; onde não existe, placeholder visual marcado como "—" com estrutura pronta para receber lógica.
3. **Linha 2** — 3 colunas: `RecurringClientCard` (lista com avatar, nome, nº ocorrências, última ocorrência, horário — alimentada por `top10` como base visual + botão "Ver Todos" navegando para `/clientes`), card destaque **Valores Recuperados** (troféu, valor, texto), painel **Ações Rápidas** com 4 botões (WhatsApp, PDF, Enviar relatório, Nova ocorrência) — os dois primeiros/terceiro desabilitados com tooltip "em breve", "Nova ocorrência" navega para `/ocorrencias`.
4. **Linha 3** — **Produtos Mais Furtados** (barras horizontais Recharts) e **Horários com Maior Incidência** (grade heatmap em CSS com tokens) — ambos estruturais.
5. **Linha 4** — **IA Recomenda Hoje**: lista de 5 `RecommendationCard` com conteúdo de demonstração. Sem IA.
6. **Linha 5** — **Ocorrências Recentes**: `RecentOccurrenceCard` horizontais (miniatura, status, descrição, loja, horário), estrutura visual.
7. **Preservação**: os gráficos atuais (distribuição de ratings, evolução de faturamento, alertas por período, clientes por classificação) e a tabela Top 10 continuam na página, reorganizados em seção "Análise detalhada" — nada é removido.

### Arquivos

Novos em `src/components/dashboard/`:
- `SectionHeader.tsx`
- `DashboardCard.tsx` (wrapper base de card com hover/sombra)
- `MetricCard.tsx` (com sparkline embutido; cobre o papel de SparklineCard)
- `QuickActionCard.tsx`
- `RecurringClientCard.tsx`
- `RecommendationCard.tsx`
- `RecentOccurrenceCard.tsx`

Modificados:
- `src/routes/_authenticated/dashboard.tsx` (composição da nova página + `head()` de SEO se ausente)
- `src/styles.css` — apenas se for necessário adicionar tokens de sombra/gradiente suaves (sem trocar cores existentes)

### Responsividade

Grades: 1 col (mobile) → 2 (tablet) → 3/5 (notebook/desktop). Hover suave, transições leves, sombras discretas via tokens.

### Preparado para próximas sprints

Compras do Dia, Valores Recuperados, Taxa de Recuperação, Produtos Mais Furtados, Heatmap de horários, IA Recomenda, Ocorrências Recentes e as ações de cobrança/relatório ficam com props tipadas e placeholders — só faltará ligar os dados.
