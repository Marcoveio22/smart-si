## Diagnóstico do estado atual

**Tabelas existentes:** `lojas`, `profiles`, `user_roles`, `user_lojas`, `clientes`, `transacoes`, `alertas`, `ocorrencias`, `processamentos`, `rating_logs`.

**Pontos verificados**
- RLS está ativo em todas as tabelas de negócio, com escopo por loja via `is_admin() OR user_has_loja(auth.uid(), loja_id)`. Porém as políticas estão concedidas ao papel `public` (deveriam ser `TO authenticated`) e `rating_logs` não possui `loja_id` próprio (depende de subquery em `clientes`).
- `ocorrencias` hoje só tem: `tipo`, `descricao`, `data_ocorrencia`, `resolvida`, `numero_cartao`, `created_by`. Falta praticamente todo o ciclo operacional/financeiro pedido.
- **Não existe** tabela de produtos, nem imagens, nem cobranças, nem recuperações, nem log de status, nem views de dashboard.
- `ocorrencias` referencia cliente apenas por `numero_cartao` (texto), sem FK para `clientes` — origem de inconsistência e de queries lentas.
- Dashboard (`src/lib/dashboard.functions.ts`) pagina **todas** as transações no servidor e soma em JavaScript: não escala. Deve virar agregação em SQL.
- Storage: existe apenas o bucket privado `excel-uploads`.
- Nada de mockado no banco; o mock atual está apenas na camada visual do Dashboard (produtos furtados, heatmap, IA recomenda) — esta Sprint cria a fonte de dados real para eles, sem tocar no layout.

## Plano de execução (migrations pequenas e sequenciais)

**M1 — Enums e domínios**
- `ocorrencia_status`: Nova, Em análise, Comunicado ao Síndico, Comunicado ao RH, Negociação, Cobrança Enviada, Pagamento Recebido, Finalizada, Arquivada.
- `ocorrencia_prioridade` (Baixa/Média/Alta/Crítica), `ocorrencia_origem` (Manual, Upload, Automática, Integração), `cobranca_status`, `recuperacao_forma`.

**M2 — Expansão de `ocorrencias`**
- Novos campos: `status` (enum, default Nova), `status_data`, `status_usuario`, `valor_perdido`, `valor_recuperado`, `responsavel`, `data_cobranca`, `data_pagamento`, `data_resolucao`, `observacoes`, `origem`, `prioridade`, `tipo_ocorrencia`, `produto_principal`, `cliente_recorrente`, e `cliente_id` (FK para `clientes`).
- Backfill: `status` derivado de `resolvida`; `cliente_id` resolvido por `(loja_id, numero_cartao)`. `resolvida` é mantida para não quebrar as telas atuais, sincronizada por trigger.
- Índices: `(loja_id, status)`, `(loja_id, data_ocorrencia desc)`, `(cliente_id)`.

**M3 — `ocorrencia_status_log`** + trigger que grava automaticamente toda mudança de status (anterior, novo, usuário, data/hora, observação) e atualiza `status_data`/`status_usuario`.

**M4 — `produtos` e `ocorrencia_produtos`**
- `produtos` (por loja: nome, sku, categoria, valor_referencia).
- `ocorrencia_produtos` (ocorrencia_id, produto_id, quantidade, valor) — relação N:N, base do gráfico "produtos mais furtados".

**M5 — `ocorrencia_imagens`** (storage_path, thumbnail, ordem, tipo). Apenas caminhos; binário sempre no Storage.

**M6 — `cobrancas` e `recuperacoes`** com os campos solicitados; trigger que soma recuperações em `ocorrencias.valor_recuperado` e ajusta status/datas.

**M7 — Auditoria**
- `audit_log` (tabela, registro_id, loja_id, acao, usuario, valor_anterior jsonb, valor_novo jsonb, created_at) + trigger genérico aplicado a `ocorrencias`, `cobrancas`, `recuperacoes`, `clientes`. Leitura restrita a admin/loja.

**M8 — Views de leitura** (todas com `security_invoker`, respeitando RLS e aceitando filtros de loja/período/cliente/produto/status/operador/tipo):
- `vw_clientes_recorrentes` — qtd de ocorrências, valor perdido, recuperado, primeira/última ocorrência, dias desde a última.
- `dashboard_executivo`, `dashboard_financeiro`, `dashboard_produtos`, `dashboard_clientes`, `dashboard_ocorrencias`.
- Funções SQL agregadoras para faturamento por mês e heatmap de horários (substituem a paginação em JS).

**M9 — RLS e GRANTs**
- Recriar as políticas de negócio como `TO authenticated`, mantendo exatamente a mesma regra de tenant.
- Políticas de tenant para todas as tabelas novas (via `loja_id` próprio ou via `ocorrencia_id` → loja).
- GRANTs explícitos para `authenticated`/`service_role` em toda tabela nova.

**M10 — Storage:** criar buckets privados `ocorrencias`, `relatorios`, `pdfs`, `thumbnails`, com políticas exigindo prefixo `<loja_id>/` no caminho.

## Camada de API (server functions, sem tocar no front)

Novo `src/lib/dashboard/*.functions.ts` e `src/lib/ocorrencias/*.functions.ts`, todos autenticados e com filtros tipados por Zod:

| Endpoint solicitado | Server function |
| --- | --- |
| GET /dashboard/executivo | `getDashboardExecutivo` |
| GET /dashboard/clientes | `getDashboardClientes` |
| GET /dashboard/produtos | `getDashboardProdutos` |
| GET /dashboard/financeiro | `getDashboardFinanceiro` |
| GET /dashboard/horarios | `getDashboardHorarios` |
| GET /dashboard/recorrentes | `getClientesRecorrentes` |
| GET /ocorrencias/:id | `getOcorrencia` |
| GET /ocorrencias/:id/imagens | `getOcorrenciaImagens` |
| PATCH /ocorrencias/status | `updateOcorrenciaStatus` |
| POST /cobrancas | `createCobranca` |
| POST /recuperacoes | `createRecuperacao` |

`getDashboardStats` atual é mantido (para não quebrar o Dashboard) mas reescrito internamente sobre as views agregadas. Um `filters.ts` compartilhado padroniza loja/período/cliente/produto/status/operador/tipo, e um `queryKeys.ts` prepara o consumo com React Query e paginação — sem alterar componentes nesta Sprint.

## Garantias

- Zero alteração em layout, componentes, rotas visuais ou design.
- `resolvida`, `rating_final`, `status_manual` e a engine HonestGuard continuam funcionando; o status manual permanece intocado pela engine.
- Documentação final em `docs/SPRINT2-BACKEND.md` com tabelas, relacionamentos, migrations, endpoints, RLS, índices, views e melhorias futuras.

Confirma para eu começar pela M1?