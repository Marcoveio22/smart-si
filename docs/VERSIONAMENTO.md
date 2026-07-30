# Versionamento — SMART SI Monitoramento

Versão de referência: **v0.9.8 — Pré Blindagem SaaS**
Status: plataforma funcional, auditada (ver `PLANO-DIRETOR-SMART-MONITORAMENTO.md`), **antes** da Fase 0 (Blindagem).

## 1. Como o Git funciona neste projeto

O repositório é gerenciado pela plataforma: cada alteração feita no chat gera
automaticamente um commit. Não há necessidade (nem permissão) de rodar
`git add/commit/push` manualmente.

Para publicar no GitHub: menu **+** (canto inferior esquerdo do chat) →
**GitHub → Connect project** → autorizar o app → **Create Repository**.
A partir daí o sync é bidirecional e todo o histórico já existente é enviado.
A tag/release `v0.9.8 - Pré Blindagem SaaS` deve ser criada no GitHub
(Releases → Draft a new release) apontando para o commit imediatamente
anterior ao início da Fase 0.

## 2. O que É versionado

- `src/**` — aplicação (rotas, componentes, server functions, engine HonestGuard, MCP)
- `supabase/migrations/**` — histórico completo do schema (11 migrations, ordem cronológica por timestamp)
- `supabase/config.toml` — configuração do backend (gerado, não editar à mão)
- `docs/**` — Plano Diretor e este documento
- `package.json`, `bun.lock`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `components.json`
- `.env` — **apenas** identificadores públicos do backend (URL, project id e chave *publishable*).
  Essas chaves são projetadas para o navegador e são protegidas por RLS; não são segredo.

## 3. O que NUNCA deve ir para o Git

| Item | Onde fica |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `LOVABLE_API_KEY` | Secrets do backend (nunca em arquivo) |
| Senha do banco | Não acessível pela plataforma |
| `.env.local`, `.env.*.local`, `.dev.vars` | Local, ignorado |
| Chaves/certificados (`*.pem`, `*.key`, `*.p12`) | Fora do repositório |
| Planilhas reais (`BASE_DIARIA.xlsx`, `BASE_CLIENTES_HISTORICO.xlsx`, `*.csv`) | Storage `excel-uploads` — contêm dados de cartão |
| `node_modules`, `dist`, `.output`, `.tanstack`, `.wrangler` | Build/cache |

## 4. Regras de versionamento

1. Toda alteração de banco entra como **migration** em `supabase/migrations/` — nunca SQL solto.
2. Migrations são imutáveis: correção vira nova migration, nunca edição da anterior.
3. Nenhum segredo em código: leitura sempre via `process.env` dentro do handler.
4. Antes de cada fase do roadmap, criar uma release no GitHub (ex.: `v1.0.0 - Blindagem SaaS`).
5. Dados operacionais (planilhas, exportações) jamais entram no repositório.

## 5. Estado do `.gitignore`

O `.gitignore` é um arquivo protegido pela plataforma e já cobre logs, dependências,
build, caches, `.dev.vars`, `.wrangler` e `*.local` (o que inclui `.env.local` e
`.env.production.local`). Não há hoje no projeto nenhum arquivo sensível fora dessa
cobertura: não existem `.pem`, `.key`, planilhas nem exportações no repositório.
Caso no futuro seja necessário adicionar planilhas ou certificados ao workspace,
eles devem ser mantidos fora do projeto (ou o `.gitignore` ajustado antes).
