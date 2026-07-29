# PLANO DIRETOR DO SMART MONITORAMENTO

> Documento de referência técnica da plataforma. **Toda implementação futura deve respeitar integralmente este documento.**
> Versão 1.0 — auditoria de arquitetura, banco, segurança, performance, UX/UI e escalabilidade.
> Escopo desta fase: **diagnóstico**. Nenhuma alteração de código, banco, RLS ou autenticação foi feita.

Legenda de severidade: **CRÍTICO** · **ALTO** · **MÉDIO** · **BAIXO**

---

## 1. Resumo Executivo

O Smart Monitoramento é hoje um SaaS funcional de monitoramento e prevenção de perdas para minimercados autônomos, construído em **TanStack Start (React 19 + Vite 7)** com **Lovable Cloud/Supabase** como backend único (fonte de verdade). A base atual tem **12 lojas, 9.373 clientes, 87.406 transações, 241 alertas e 3 usuários**.

A plataforma já entrega: autenticação, multi-tenant por loja (N:N via `user_lojas`), engine de classificação HonestGuard, upload/processamento de Excel, exportação consolidada, dashboard analítico, gestão de ocorrências e um servidor MCP para agentes de IA.

**Veredito:** a fundação é sólida para o estágio atual (dezenas de lojas, dezenas de milhares de registros), porém **não sustenta a meta declarada de 10.000 lojas / 100.000 usuários / centenas de milhões de registros** sem reengenharia em três frentes: (1) modelagem e indexação do banco, (2) agregações computadas no cliente/serverless em vez do banco, (3) isolamento de arquivos no Storage.

Foram identificados **4 problemas CRÍTICOS**, sendo dois deles de vazamento de dados entre empresas distintas. São de correção rápida e devem preceder qualquer nova funcionalidade ou onboarding comercial de clientes.

---

## 2. Pontos Fortes

| # | Ponto | Comentário |
|---|---|---|
| 1 | Fonte de verdade única | Zero dependência de estado local/memória; todo dado persiste no banco. |
| 2 | RLS habilitado em todas as tabelas de negócio | Políticas `is_admin() OR user_has_loja(...)` consistentes. |
| 3 | Papéis em tabela separada (`user_roles` + `has_role` SECURITY DEFINER) | Evita escalada de privilégio via perfil — padrão correto. |
| 4 | Multi-tenant N:N já modelado | `user_lojas` permite 1 usuário → várias lojas, com loja padrão. |
| 5 | Server Functions tipadas com validação Zod | Fronteira cliente/servidor bem definida; segredos nunca no bundle. |
| 6 | Engine HonestGuard isolada e determinística | Percentis P75/P90, score, preservação de `status_manual`. |
| 7 | Design system com tokens semânticos + shadcn/ui | 45 componentes base padronizados, dark mode viável. |
| 8 | Paginação recursiva já aplicada | Contorna o limite de 1.000 linhas do PostgREST. |
| 9 | MCP nativo com OAuth | Diferencial competitivo real para integração com agentes de IA. |
| 10 | Tratamento de dados sujos do Excel | Detecção de cabeçalho, aliases pt-BR, normalização monetária e de cartão. |

---

## 3. Pontos Fracos

| # | Ponto | Severidade |
|---|---|---|
| 1 | Agregações (faturamento, séries mensais) calculadas em JavaScript varrendo todas as transações | CRÍTICO |
| 2 | `clientes.numero_cartao` com UNIQUE **global**, não por loja | CRÍTICO |
| 3 | Bucket `excel-uploads` sem isolamento por loja nas policies | CRÍTICO |
| 4 | Todo novo cadastro recebe `loja_id` fixo da "Loja Principal" via trigger | CRÍTICO |
| 5 | Ausência de índices em colunas de filtro/ordenação (`rating_final`, `data_transacao`, `cliente_id`, `status`) | ALTO |
| 6 | Sem camada de serviços/repositórios: queries Supabase espalhadas dentro das páginas | ALTO |
| 7 | Processamento de Excel síncrono dentro de uma server function | ALTO |
| 8 | Sem paginação server-side nas tabelas de UI (carrega tudo e filtra no cliente) | ALTO |
| 9 | Sem camada de auditoria de ações do usuário | ALTO |
| 10 | Sem testes automatizados de nenhum tipo | ALTO |
| 11 | Sem conceito de **Empresa/Organização** acima de Loja | ALTO |
| 12 | Sem estados de loading/empty/error padronizados | MÉDIO |
| 13 | Troca de loja força `window.location.reload()` | MÉDIO |
| 14 | `bootstrapAdminSelf` chamado em todo render do header | MÉDIO |
| 15 | Sem histórico/soft delete — dados são sobrescritos a cada processamento | MÉDIO |

---

## 4. Problemas Críticos

### C1 — Vazamento de arquivos entre empresas no Storage · **CRÍTICO**
As policies do bucket `excel-uploads` exigem apenas `bucket_id = 'excel-uploads'` para o papel `authenticated`. Qualquer usuário logado — de qualquer loja — pode **listar, baixar, sobrescrever e apagar** as planilhas de qualquer outro cliente. Planilhas contêm dados transacionais completos (cartões, valores, datas).
**Remediação:** prefixar objetos por `loja_id/` e condicionar as policies a `user_has_loja(auth.uid(), (storage.foldername(name))[1]::uuid)`; separar policies de INSERT/SELECT/UPDATE/DELETE; impor `file_size_limit` e `allowed_mime_types`.

### C2 — Todo novo usuário nasce vinculado à Loja Principal · **CRÍTICO**
`handle_new_user()` insere `loja_id = '00000000-...-0001'` em `profiles`, e `user_has_loja()` aceita o vínculo via `profiles.loja_id`. Como o cadastro em `/auth` é aberto, **qualquer pessoa que se cadastre passa a enxergar todos os dados da Loja Principal**.
**Remediação:** `loja_id` nulo no cadastro; acesso concedido exclusivamente por `user_lojas`; tela de "aguardando liberação" para usuários sem vínculo; remover o fallback por `profiles.loja_id` de `user_has_loja`.

### C3 — `numero_cartao` UNIQUE global impede multi-loja real · **CRÍTICO**
`clientes_numero_cartao_key` é único na tabela inteira. O mesmo cartão usado em duas lojas gera colisão: o upsert da segunda loja **sobrescreve o registro da primeira**, transferindo o cliente (e seu rating/status manual) entre empresas. É corrupção silenciosa de dados entre tenants.
**Remediação:** trocar por `UNIQUE (loja_id, numero_cartao)` e ajustar o `onConflict` da engine.

### C4 — Agregações varrendo a tabela inteira em JavaScript · **CRÍTICO (escala)**
`getDashboardStats` pagina 1.000 em 1.000 **todas** as transações para somar faturamento e montar a série mensal. Com 87 mil linhas já são ~88 round-trips por carga de dashboard; com 10 milhões seriam 10.000. Custo O(n) por visualização, memória crescente e timeout garantido.
**Remediação:** mover a agregação para o banco (RPC com `SUM/GROUP BY date_trunc`) e, na sequência, tabelas de agregado diário (`metricas_diarias`) atualizadas no processamento.

---

## 5. Problemas Importantes

| ID | Problema | Sev. |
|---|---|---|
| I1 | **Índices ausentes.** Só existem PKs e `loja_id`. Faltam: `transacoes(loja_id, data_transacao DESC)`, `transacoes(cliente_id)`, `clientes(loja_id, rating_final)`, `clientes(loja_id, total_gasto DESC)`, `alertas(loja_id, status, created_at)`, `ocorrencias(loja_id, status)`, `rating_logs(cliente_id)`. Sem eles, todo filtro vira seq scan. | ALTO |
| I2 | **Processamento síncrono.** O parse + upsert do Excel roda inteiro dentro de uma server function; arquivos grandes esbarram no limite de CPU/tempo do runtime edge e não há retomada em caso de falha. | ALTO |
| I3 | **Sem fila nem idempotência.** Reenviar o mesmo arquivo reprocessa e sobrescreve, sem hash de arquivo nem trava de concorrência. | ALTO |
| I4 | **Ausência de camada de domínio.** `clientes.tsx` (302 linhas) mistura query, filtro, formatação e UI. Regra de negócio duplicada entre páginas e engine. | ALTO |
| I5 | **Sem paginação server-side na UI.** Clientes carrega o conjunto completo e filtra em memória do navegador. | ALTO |
| I6 | **Sem trilha de auditoria.** Alterações de `status_manual`, vínculos de loja e exclusões não são registradas — problema de compliance para prevenção de perdas. | ALTO |
| I7 | **Sem cobertura de testes.** Engine HonestGuard (439 linhas de regra crítica) sem um único teste unitário. | ALTO |
| I8 | **Falta o nível "Empresa".** Tatiana com 2 lojas é modelada como 2 vínculos soltos; não há entidade agrupadora para billing, plano, limites e relatórios consolidados. | ALTO |
| I9 | **Sem FK `rating_logs.loja_id`** — RLS depende de subconsulta em `clientes`, custosa e frágil. | MÉDIO |
| I10 | **Sem `ON DELETE` definido** na maioria das FKs de negócio: apagar uma loja falha ou deixa órfãos. | MÉDIO |
| I11 | **Políticas RLS com role `public`** (em vez de `authenticated`) nas tabelas de negócio: funcionam, mas avaliam a cada request anônimo. | MÉDIO |
| I12 | **`bootstrap_admin_self` permanece ativo** após existir admin — retorna false, mas é chamada desnecessária a cada login. | BAIXO |

---

## 6. Melhorias Recomendadas (por área)

### 6.1 Arquitetura
- **A1 · ALTO** — Adotar organização por *feature* (`src/features/clientes/{api,components,hooks,types}`), mantendo `src/components/ui` como design system compartilhado.
- **A2 · ALTO** — Criar camada `services/` (repositórios) com todas as queries; páginas nunca chamam `supabase.from()` diretamente.
- **A3 · ALTO** — Centralizar chaves de cache do React Query (`queryKeys.ts`) e padronizar invalidação por escopo de loja.
- **A4 · MÉDIO** — Extrair `<DataTable>` genérica (colunas, ordenação, paginação server-side, busca, exportação) e substituir as tabelas artesanais.
- **A5 · MÉDIO** — Padronizar `<PageHeader>`, `<StatCard>`, `<EmptyState>`, `<ErrorState>`, `<LoadingState>`.
- **A6 · MÉDIO** — Isolar a engine HonestGuard como módulo puro (entrada: linhas normalizadas; saída: entidades), separando parsing, cálculo e persistência.
- **A7 · BAIXO** — Feature flags por plano/loja para liberar IA, vídeo e relatórios de forma gradual.

### 6.2 Banco de Dados
- **B1 · CRÍTICO** — `UNIQUE (loja_id, numero_cartao)` no lugar do único global.
- **B2 · ALTO** — Criar o conjunto de índices compostos do item I1.
- **B3 · ALTO** — Particionar `transacoes` por intervalo de data (mensal) ao ultrapassar ~10M linhas.
- **B4 · ALTO** — Tabela `metricas_diarias (loja_id, dia, faturamento, tickets, ticket_medio, clientes_ativos, alertas)` alimentada no processamento; dashboard lê apenas dela.
- **B5 · ALTO** — Introduzir `empresas` (organização) com `lojas.empresa_id`, e RLS derivando de empresa → lojas.
- **B6 · MÉDIO** — Enums nativos para `rating_final`, `status_manual`, `gravidade`, `status` (hoje texto livre com CHECK parcial).
- **B7 · MÉDIO** — `numeric(14,2)` para todos os campos monetários; jamais float.
- **B8 · MÉDIO** — Tabela `audit_log` (ator, entidade, ação, antes/depois, loja, timestamp) preenchida por trigger.
- **B9 · MÉDIO** — `ON DELETE RESTRICT/CASCADE` explícito em todas as FKs; soft delete (`deleted_at`) em lojas e clientes.
- **B10 · BAIXO** — Política de retenção/arquivamento de transações antigas (cold storage após 24 meses).

### 6.3 Segurança
- **S1 · CRÍTICO** — Isolar Storage por `loja_id/` (item C1) + limites de tamanho e MIME.
- **S2 · CRÍTICO** — Remover o `loja_id` fixo do trigger de cadastro (item C2).
- **S3 · ALTO** — Fechar auto-cadastro público: convite por e-mail emitido pelo admin, ou lista de domínios permitidos.
- **S4 · ALTO** — Papéis granulares além de admin/user: `owner`, `gestor`, `operador`, `auditor` (somente leitura).
- **S5 · ALTO** — Rate limiting e verificação de assinatura nos endpoints públicos/MCP.
- **S6 · MÉDIO** — Trocar role `public` por `authenticated` nas policies de negócio.
- **S7 · MÉDIO** — Prazo curto de expiração nas URLs assinadas de download e log de cada download.
- **S8 · MÉDIO** — Mascarar `numero_cartao` na UI (BIN + 4 últimos), com revelação registrada em auditoria.
- **S9 · MÉDIO** — Revisão dos usos de `supabaseAdmin`: permitido apenas no job de processamento, nunca em leitura de tela.
- **S10 · BAIXO** — MFA opcional para papéis administrativos; política de sessão e expiração.

### 6.4 Performance
- **P1 · CRÍTICO** — Agregações no banco via RPC (item C4).
- **P2 · ALTO** — Paginação e ordenação server-side em Clientes, Transações, Alertas e Ocorrências (`range()` + `count: 'estimated'`).
- **P3 · ALTO** — Busca de cartão via índice (`pg_trgm` ou coluna normalizada `numero_cartao_norm` indexada) em vez de varredura no cliente.
- **P4 · ALTO** — `staleTime` e `gcTime` calibrados por tipo de dado; prefetch de rota no hover.
- **P5 · MÉDIO** — Virtualização de listas longas (`@tanstack/react-virtual`).
- **P6 · MÉDIO** — Code splitting: Recharts e `xlsx` carregados sob demanda (hoje pesam no bundle principal).
- **P7 · MÉDIO** — Geração do Excel consolidado em job assíncrono com notificação, não no fluxo de request.
- **P8 · BAIXO** — Realtime seletivo (só contadores e alertas), nunca stream de tabelas grandes.

### 6.5 UX
- **U1 · ALTO** — Onboarding guiado: criar loja → convidar usuário → primeiro upload, com checklist de progresso.
- **U2 · ALTO** — Tela de criação/edição de loja pela UI (hoje exige SQL) — bloqueio operacional real.
- **U3 · ALTO** — Feedback de progresso do processamento por etapas (upload → leitura → classificação → gravação → consolidado) com contagens.
- **U4 · MÉDIO** — Substituir o reload da troca de loja por invalidação de cache, preservando a rota atual.
- **U5 · MÉDIO** — Filtros persistentes na URL (compartilháveis) e salvos por usuário.
- **U6 · MÉDIO** — Estados vazios com ação sugerida em toda tabela; skeletons no lugar de "Carregando...".
- **U7 · MÉDIO** — Mensagens de erro em linguagem de negócio (hoje vaza texto de erro do banco, como o caso de RLS em `processamentos`).
- **U8 · MÉDIO** — Responsividade real em tabelas (cards no mobile); a operação em loja é frequentemente feita no celular.
- **U9 · BAIXO** — Acessibilidade: foco visível, labels em todos os inputs, contraste AA, navegação por teclado nas tabelas.
- **U10 · BAIXO** — Central de notificações e resumo diário por e-mail.

### 6.6 UI / Design System
Comparando com Linear, Stripe, Datadog e CrowdStrike, o sistema atual é limpo mas genérico e pouco denso para um produto de monitoramento.
- **D1 · MÉDIO** — Escala tipográfica explícita (12/14/16/20/24/32) e **fonte tabular** em toda coluna numérica.
- **D2 · MÉDIO** — Paleta semântica de severidade única (crítico/alto/médio/ok) reutilizada por rating, gravidade e status — hoje há três vocabulários visuais concorrentes.
- **D3 · MÉDIO** — Aumentar densidade de informação: linhas mais compactas, cabeçalho fixo, zebra sutil, ações em hover (padrão Datadog/Linear).
- **D4 · MÉDIO** — Padronizar hierarquia de botões (1 primário por tela), espaçamento em grade de 4px e raio/sombra em dois níveis apenas.
- **D5 · MÉDIO** — Cards de KPI com valor, variação vs. período anterior e sparkline — hoje mostram apenas o número absoluto.
- **D6 · BAIXO** — Modo escuro completo (operação noturna) e identidade própria de marca (logo, cor de destaque) em vez do azul padrão.

---

## 7. Melhorias Prioritárias (fazer primeiro)

1. **C1** Isolamento do Storage por loja — **CRÍTICO**
2. **C2** Remover vínculo automático à Loja Principal + fechar auto-cadastro — **CRÍTICO**
3. **C3** `UNIQUE (loja_id, numero_cartao)` — **CRÍTICO**
4. **C4/P1** Agregações no banco — **CRÍTICO**
5. **I1/B2** Índices compostos — **ALTO**
6. **U2** Tela de gestão de lojas — **ALTO**
7. **I6/B8** Auditoria de ações — **ALTO**

## 8. Melhorias Futuras

- Entidade **Empresa** + billing, planos e limites de uso (**ALTO**)
- Fila de jobs assíncronos com retomada e idempotência (**ALTO**)
- Data warehouse / agregados materializados e particionamento (**ALTO**)
- Módulo de IA: detecção de anomalias, explicação de risco em linguagem natural, sugestão de ocorrência (**MÉDIO**)
- Armazenamento de imagens e vídeos com CDN, thumbnails e retenção por plano (**MÉDIO**)
- Relatórios agendados em PDF/Excel por e-mail (**MÉDIO**)
- App mobile / PWA para o operador de loja (**MÉDIO**)
- API pública versionada + webhooks para ERPs (**MÉDIO**)
- Observabilidade: logs estruturados, métricas, alertas de erro (**ALTO**)

---

## 9. Riscos Técnicos

| Risco | Sev. | Impacto |
|---|---|---|
| Timeout/OOM do dashboard ao crescer o volume | CRÍTICO | Produto inutilizável para clientes grandes |
| Processamento síncrono falhando em arquivos grandes | ALTO | Perda de dia operacional, estado inconsistente |
| Regra de negócio sem testes | ALTO | Regressão silenciosa na classificação de risco |
| Sobrescrita destrutiva a cada upload (sem versionamento) | ALTO | Perda de histórico irreversível |
| Acoplamento página↔banco | MÉDIO | Custo de manutenção cresce por página |
| Dependência de `xlsx` no runtime edge | MÉDIO | Limites de CPU/memória do Worker |

## 10. Riscos de Segurança

| Risco | Sev. |
|---|---|
| Download de planilhas de outras empresas (C1) | CRÍTICO |
| Cadastro público concedendo acesso à Loja Principal (C2) | CRÍTICO |
| Migração de cliente entre lojas por colisão de cartão (C3) | CRÍTICO |
| Dados de cartão exibidos em texto integral, sem mascaramento nem log de acesso | ALTO |
| Ausência de auditoria — incidente não é investigável | ALTO |
| Papéis binários (admin vê tudo) sem perfil somente-leitura | ALTO |
| Endpoints MCP/públicos sem rate limiting | MÉDIO |
| URLs assinadas sem expiração curta e sem log | MÉDIO |

## 11. Riscos de Escalabilidade

| Cenário-alvo | Situação atual | Sev. |
|---|---|---|
| 10.000 lojas | Seletor de loja carrega **todas** as lojas no contexto do admin | ALTO |
| 100.000 usuários | Tela Usuários & Lojas lista todos sem paginação/busca | ALTO |
| Centenas de milhões de transações | Agregação em JS + ausência de índices e particionamento | CRÍTICO |
| Upload diário massivo | Sem fila, sem paralelismo, sem retomada | ALTO |
| Dashboards em tempo real | Nenhum agregado pré-computado; realtime inexistente | ALTO |
| IA contínua | Sem pipeline, sem tabela de features, sem histórico versionado | MÉDIO |
| Vídeos e imagens | Bucket único sem política de tamanho, CDN ou retenção | MÉDIO |

---

## 12. Sugestões para Banco de Dados
Ver §6.2 (B1–B10). Ordem recomendada: **B1 → B2 → B4 → B8 → B5 → B3**.

## 13. Sugestões para Performance
Ver §6.4 (P1–P8). Ordem recomendada: **P1 → P2 → P3 → P6 → P4**.

## 14. Sugestões para UX
Ver §6.5 (U1–U10). Ordem recomendada: **U2 → U3 → U7 → U1 → U4**.

## 15. Sugestões para UI
Ver §6.6 (D1–D6). Ordem recomendada: **D2 → D1 → D3 → D5**.

## 16. Sugestões para Arquitetura
Ver §6.1 (A1–A7). Ordem recomendada: **A2 → A3 → A1 → A4 → A6**.

---

## 17. Roadmap Técnico Recomendado

### Fase 0 — Blindagem (imediata, antes de vender novas contas)
C1 Storage por loja · C2 cadastro sem loja automática · C3 unicidade por loja · S3 convite por admin.
*Resultado: isolamento entre empresas garantido.*

### Fase 1 — Fundação de Performance
C4/P1 agregações no banco · B2 índices · P2 paginação server-side · P3 busca indexada de cartão · B4 métricas diárias.
*Resultado: dashboards e listas com tempo constante independente do volume.*

### Fase 2 — Fundação de Arquitetura
A2 camada de serviços · A3 chaves de cache · A1 estrutura por feature · A4/A5 componentes compartilhados · testes da engine HonestGuard.
*Resultado: novas features passam a custar dias, não semanas.*

### Fase 3 — Operação e Confiança
I2/I3 processamento assíncrono com fila e idempotência · B8 auditoria · S4 papéis granulares · observabilidade · U2 gestão de lojas na UI · U3 progresso de processamento.
*Resultado: operação auditável e resiliente.*

### Fase 4 — SaaS Multiempresa
B5 entidade Empresa · planos, limites e billing · relatórios consolidados por empresa · onboarding self-service.
*Resultado: escala comercial.*

### Fase 5 — Volume e Inteligência
B3 particionamento · arquivamento · pipeline de IA e detecção de anomalias · mídia (imagens/vídeos) com CDN · realtime seletivo · API pública e webhooks.
*Resultado: 10.000 lojas e centenas de milhões de registros.*

---

## 18. Regras Permanentes para Implementações Futuras

Toda nova funcionalidade **deve obrigatoriamente**:

1. **Escopo de tenant** — receber `loja_id` (e futuramente `empresa_id`) desde a primeira linha; nenhuma query sem escopo.
2. **RLS primeiro** — tabela nova nasce com GRANTs + RLS + policies por loja, testada com usuário não-admin.
3. **Agregação no banco** — nunca somar, contar ou agrupar em JavaScript sobre conjuntos ilimitados.
4. **Paginação obrigatória** — nenhuma listagem sem `range()` e ordenação estável.
5. **Índice antes do filtro** — toda coluna usada em `WHERE`/`ORDER BY` recebe índice composto com `loja_id`.
6. **Componentes do design system** — sem cores hardcoded, sem tabela artesanal, sem botão avulso.
7. **Camada de serviço** — página não conversa com o banco diretamente.
8. **Estados completos** — loading, vazio, erro e sucesso previstos em toda tela.
9. **Auditoria** — toda ação que altera classificação, permissão ou dado financeiro é registrada.
10. **Assíncrono para trabalho pesado** — processamento acima de poucos segundos vira job com status.
11. **Sem `supabaseAdmin` em leitura de tela** — apenas em jobs, após validar o chamador.
12. **Dados sensíveis mascarados** por padrão; revelação registrada.

---

*Documento vivo — revisar ao fim de cada fase do roadmap.*
