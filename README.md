# Smart Store Insights

SMART SI Monitoramento

Crie uma aplicação SaaS completa chamada SMART SI Monitoramento.

Objetivo da plataforma:

Monitorar minimercados autônomos através da análise de transações, classificação inteligente de clientes, identificação de comportamentos suspeitos e geração de alertas operacionais.

A aplicação deve ser conectada ao Supabase já existente.

Utilizar as seguintes tabelas:

lojas

clientes

transacoes

alertas

ocorrencias

processamentos

profiles

rating_logs

Layout

Layout moderno e corporativo.

Menu lateral:

Dashboard

Clientes

Alertas

Ocorrências

Processamentos

Upload de Arquivos

Configurações

Tema profissional focado em operação, monitoramento e inteligência.

Responsivo para desktop e mobile.

DASHBOARD

Criar página Dashboard.

Exibir cards:

Total de Clientes

Clientes TRUSTED

Clientes DIAMOND

Clientes GOLD

Clientes SILVER

Clientes RED

Alertas Ativos

Faturamento Total

Criar gráficos:

Distribuição dos ratings

Evolução de faturamento

Alertas por período

Clientes por classificação

Criar ranking:

Top 10 clientes por compras.

CLIENTES

Criar página Clientes.

Fonte de dados: tabela clientes.

Exibir:

numero_cartao

rating_final

score_confianca

total_compras

total_gasto

ocorrencias

is_trusted

ultima_compra

Filtros:

Rating

TRUSTED

Faixa de gasto

Busca por cartão

Criar badges:

DIAMOND = azul
GOLD = dourado
SILVER = cinza
RED = vermelho
TRUSTED = verde

Permitir visualizar detalhes completos do cliente.

ALERTAS

Criar página Alertas.

Fonte: tabela alertas.

Exibir:

cliente_id

tipo

gravidade

descricao

status

created_at

Filtros:

gravidade

status

período

Alertas de gravidade alta devem aparecer destacados.

Ordenar pelos mais recentes.

OCORRÊNCIAS

Criar página Ocorrências.

Fonte: tabela ocorrencias.

Permitir:

criar ocorrência

editar ocorrência

marcar como resolvida

Campos:

numero_cartao

tipo

descricao

data_ocorrencia

Tipos:

furto

suspeita

chargeback

outro

PROCESSAMENTOS

Criar página Processamentos.

Fonte: tabela processamentos.

Exibir:

data_referencia

total_transacoes

faturamento_total

clientes_red

clientes_trusted

threshold_diamond

threshold_gold

status

Permitir abrir detalhes do processamento.

UPLOAD DE ARQUIVOS

Criar página Upload de Arquivos.

Objetivo:

Receber os arquivos Excel da operação.

Campos:

BASE_DIARIA.xlsx

BASE_CLIENTES_HISTORICO.xlsx

Botão:

PROCESSAR ARQUIVOS

Fluxo esperado:

Upload
→ Supabase Storage bucket excel-uploads
→ Registro em processamentos
→ Atualização do status do processamento

Mostrar status:

aguardando

processando

concluído

erro

Exibir histórico dos uploads realizados.

CONFIGURAÇÕES

Criar página Configurações.

Permitir visualizar:

loja atual

quantidade de clientes

quantidade de processamentos

usuários cadastrados

Preparar espaço para futuras configurações da engine.

REGRAS DE NEGÓCIO

O sistema trabalha com classificações:

RED

SILVER

GOLD

DIAMOND

TRUSTED

Essas classificações já são calculadas externamente por uma Engine Python.

A aplicação deve apenas consumir e exibir os dados armazenados no Supabase.

Não implementar lógica de classificação no frontend.

INTEGRAÇÃO SUPABASE

Utilizar Supabase como backend principal.

Implementar:

leitura das tabelas

filtros

paginação

ordenação

CRUD de ocorrências

CRUD de alertas

histórico de processamentos

Preparar a estrutura para futura integração com API FastAPI responsável pelo processamento dos arquivos Excel.

Objetivo final:

Transformar a aplicação em uma plataforma SaaS de monitoramento inteligente para minimercados autônomos.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://smart-si.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fb564829-eecc-46c9-9ece-3f960b5a2fd4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
