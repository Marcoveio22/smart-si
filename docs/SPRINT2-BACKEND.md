# Sprint 2 — Backend, Supabase e Arquitetura

Escopo: **somente banco de dados, APIs, segurança e performance**. Nenhum componente visual,
rota de tela, layout ou design foi alterado nesta Sprint.

---

## 1. Novas tabelas

| Tabela | Função | Campos principais |
| --- | --- | --- |
| `ocorrencia_status_log` | Histórico imutável de mudanças de situação | `ocorrencia_id`, `loja_id`, `status_anterior`, `status_novo`, `usuario`, `data_hora`, `observacao` |
| `produtos` | Catálogo de produtos por loja | `loja_id`, `nome`, `sku`, `categoria`, `valor_referencia`, `ativo` |
| `ocorrencia_produtos` | N:N entre ocorrência e produtos | `ocorrencia_id`, `produto_id`, `descricao`, `quantidade`, `valor` |
| `ocorrencia_imagens` | Referências de arquivos no Storage | `ocorrencia_id`, `storage_path`, `thumbnail`, `ordem`, `tipo` |
| `cobrancas` | Cobranças emitidas | `ocorrencia_id`, `cliente_id`, `valor`, `status`, `forma_envio`, `data_envio`, `data_pagamento`, `pdf_url`, `whatsapp_enviado`, `usuario` |
| `recuperacoes` | Valores efetivamente recuperados | `ocorrencia_id`, `cobranca_id`, `valor`, `forma`, `data`, `usuario`, `observacao` |
| `audit_log` | Trilha de auditoria | `tabela`, `registro_id`, `loja_id`, `acao`, `usuario`, `valor_anterior`, `valor_novo` |

### Enums criados (sem texto livre)

- `ocorrencia_status`: Nova, Em análise, Comunicado ao Síndico, Comunicado ao RH, Negociação,
  Cobrança Enviada, Pagamento Recebido, Finalizada, Arquivada
- `ocorrencia_prioridade`: Baixa, Média, Alta, Crítica
- `ocorrencia_origem`: Manual, Upload, Automática, Integração
- `cobranca_status`: Pendente, Enviada, Negociada, Paga, Cancelada
- `recuperacao_forma`: PIX, Dinheiro, Cartão, Boleto, Desconto em folha, Outro

### Campos adicionados em `ocorrencias`

`status`, `status_data`, `status_usuario`, `valor_perdido`, `valor_recuperado`, `responsavel`,
`data_cobranca`, `data_pagamento`, `data_resolucao`, `observacoes`, `origem`, `prioridade`,
`tipo_ocorrencia`, `produto_principal`, `cliente_recorrente`, `cliente_id`.

`resolvida` (legado) foi **mantida** e é sincronizada por trigger — nenhuma tela atual quebra.
`rating_logs` ganhou `loja_id` próprio (antes o escopo dependia de subquery em `clientes`).

---

## 2. Relacionamentos

```text
lojas 1─N clientes 1─N transacoes
lojas 1─N ocorrencias ──1 clientes (novo: cliente_id)
ocorrencias 1─N ocorrencia_produtos N─1 produtos
ocorrencias 1─N ocorrencia_imagens        (arquivos no Storage)
ocorrencias 1─N ocorrencia_status_log     (automático, via trigger)
ocorrencias 1─N cobrancas 1─N recuperacoes
qualquer tabela ─N audit_log
```

---

## 3. Migrations criadas (uma por alteração lógica)

| # | Conteúdo |
| --- | --- |
| M1 | Enums de status, prioridade, origem, cobrança e forma de recuperação |
| M2 | Expansão de `ocorrencias` + backfill + sincronização de `resolvida` + índices |
| M3 | `ocorrencia_status_log` + triggers de histórico e de carimbo de datas |
| M4 | `produtos`, `ocorrencia_produtos` + recálculo de `valor_perdido`/`produto_principal` |
| M5 | `ocorrencia_imagens` + herança de `loja_id` |
| M6 | `cobrancas`, `recuperacoes` + rollup automático de valores e situação |
| M7 | `audit_log` + triggers de auditoria |
| M8 | Views de dashboard + funções de agregação + índice em `transacoes` |
| M9 | Endurecimento de RLS (`TO authenticated`), `rating_logs.loja_id`, flag de recorrentes |
| M10 | Políticas de Storage dos novos buckets |
| M11/M12 | Ajuste de permissões de execução das funções de agregação |

---

## 4. Views criadas

| View | Uso |
| --- | --- |
| `dashboard_executivo` | Totais por loja e por dia (ocorrências, abertas, finalizadas, perdido, recuperado) |
| `dashboard_financeiro` | Por ocorrência: perdido, cobrado, recuperado, pendente, datas |
| `dashboard_produtos` | Itens por ocorrência, base do ranking de produtos |
| `dashboard_clientes` | Cliente + rating + status manual + agregados de ocorrências |
| `dashboard_ocorrencias` | Ocorrência achatada com cliente/loja/dia/hora/dia da semana |
| `vw_clientes_recorrentes` | Qtd ocorrências, valor perdido/recuperado, primeira/última, dias desde a última |

Todas com `security_invoker = on`: **respeitam a RLS do usuário que consulta**.

Funções de agregação (`SECURITY INVOKER`, `STABLE`):
`faturamento_total(loja, de, até)`, `faturamento_por_mes(loja, de, até)`,
`dashboard_horarios(loja, de, até)`.

---

## 5. Endpoints (server functions TanStack, todos autenticados)

`src/lib/api/dashboard.functions.ts`

| Endpoint | Função |
| --- | --- |
| GET /dashboard/executivo | `getDashboardExecutivo` |
| GET /dashboard/financeiro | `getDashboardFinanceiro` |
| GET /dashboard/produtos | `getDashboardProdutos` |
| GET /dashboard/clientes | `getDashboardClientes` |
| GET /dashboard/recorrentes | `getClientesRecorrentes` |
| GET /dashboard/horarios | `getDashboardHorarios` |

`src/lib/api/ocorrencias.functions.ts`

| Endpoint | Função |
| --- | --- |
| GET /ocorrencias | `getOcorrencias` (paginado) |
| GET /ocorrencias/:id | `getOcorrencia` (produtos + histórico + cobranças + recuperações + imagens) |
| GET /ocorrencias/:id/imagens | `getOcorrenciaImagens` |
| PATCH /ocorrencias/status | `updateOcorrenciaStatus` |
| POST /cobrancas | `createCobranca` |
| POST /recuperacoes | `createRecuperacao` |

Camada de serviço: `dashboard.service.ts` e `ocorrencias.service.ts` (lógica única, sem duplicação).
Contrato de filtros único: `src/lib/api/filters.ts` — loja, período, cliente, produto, status,
operador, tipo de ocorrência, cartão, página, tamanho de página.
Chaves de cache para React Query: `src/lib/api/queryKeys.ts`.

`getDashboardStats` (usado pelo Dashboard atual) foi mantido com o **mesmo formato de retorno**,
mas passou a agregar faturamento via SQL em vez de paginar todas as transações na aplicação.

---

## 6. Alterações de RLS

- Políticas de `clientes`, `transacoes`, `alertas`, `ocorrencias`, `processamentos`,
  `rating_logs`, `user_lojas` recriadas como `TO authenticated` (antes `public`), com a mesma
  regra: `is_admin() OR user_has_loja(auth.uid(), loja_id)`.
- `REVOKE ALL` do papel anônimo nessas tabelas.
- Novas tabelas com política de tenant: direta (`produtos`, `ocorrencia_status_log`, `audit_log`)
  ou herdada da ocorrência (`ocorrencia_produtos`, `ocorrencia_imagens`, `cobrancas`,
  `recuperacoes`).
- `ocorrencia_status_log` e `audit_log`: **somente leitura** para usuários; a escrita ocorre
  exclusivamente por triggers.
- Funções internas de trigger com `EXECUTE` revogado de `anon`/`authenticated`.

---

## 7. Storage

Buckets privados criados: `ocorrencias`, `relatorios`, `pdfs`, `thumbnails`.

Convenção obrigatória de caminho: `<loja_id>/...`. As políticas de `storage.objects` validam a
primeira pasta contra `user_has_loja()`, então nenhum usuário lê ou grava arquivos de outra loja.
Nenhum binário é gravado no banco — apenas `storage_path`/`thumbnail`.

---

## 8. Índices criados

`ocorrencias(loja_id,status)`, `ocorrencias(loja_id,data_ocorrencia desc)`,
`ocorrencias(cliente_id)`, `ocorrencias(loja_id,numero_cartao)`,
`transacoes(loja_id,data_transacao)`, `produtos(loja_id)`, unique `produtos(loja_id,lower(nome))`,
`ocorrencia_produtos(ocorrencia_id | produto_id | loja_id)`,
`ocorrencia_imagens(ocorrencia_id,ordem)`, `cobrancas(ocorrencia_id | loja_id,status | cliente_id)`,
`recuperacoes(ocorrencia_id | loja_id,data desc)`,
`ocorrencia_status_log(ocorrencia_id,data_hora desc)`, `audit_log(tabela,registro_id,created_at desc)`,
`audit_log(loja_id,created_at desc)`, `rating_logs(loja_id,created_at desc)`.

---

## 9. Automações (triggers)

- Mudança de situação → grava histórico, carimba `status_data`/`status_usuario` e datas de
  cobrança/pagamento.
- Itens da ocorrência → recalcula `valor_perdido` e `produto_principal`.
- Recuperação lançada → soma `valor_recuperado`; se cobrir o perdido, avança para
  "Pagamento Recebido".
- Cobrança enviada → preenche `data_cobranca` e avança para "Cobrança Enviada".
- Inclusão/exclusão de ocorrência → recalcula `cliente_recorrente`.
- Ocorrências, cobranças, recuperações e mudança de status manual de cliente → `audit_log`.
- `loja_id` das tabelas filhas é herdado automaticamente da ocorrência.

Validado em produção: uma troca de situação gerou 1 registro de histórico e 1 de auditoria por
alteração, com valores anterior e novo.

---

## 10. Melhorias futuras sugeridas

1. Unicidade composta `clientes(loja_id, numero_cartao)` e remoção do índice único global
   (item pendente da Fase 0 — Blindagem).
2. Migrar arquivos antigos de `excel-uploads` da raiz para o prefixo `<loja_id>/`.
3. Views materializadas + `pg_cron` quando o volume de ocorrências passar de ~1M linhas.
4. Particionamento de `transacoes` por mês.
5. Retenção/arquivamento do `audit_log` (ex.: mover registros com mais de 12 meses).
6. Geração de miniaturas no upload de imagens e PDFs de cobrança gravados em `pdfs/<loja_id>/`.
7. Substituir o `profiles.loja_id` como loja padrão por preferência explícita do usuário.
