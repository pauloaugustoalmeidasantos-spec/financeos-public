# FinanceOS

SaaS de finanças pessoais com IA, em português (pt-BR). Controle financeiro, metas, patrimônio, projeção de aposentadoria e insights gerados por IA.

> Este repositório é uma versão pública do projeto, sem dados de produção, chaves ou credenciais. Para rodar, use o seu próprio projeto Supabase e as suas próprias chaves.

## O que o sistema faz

- **Finanças / livro caixa:** receitas, despesas, categorias, recorrências e extrato com importação assistida por IA.
- **Orçamentos e contas a pagar:** limites por categoria, alertas de estouro e de atraso.
- **Metas:** metas financeiras com aportes e acompanhamento de progresso.
- **Patrimônio e investimentos:** ativos, financiamentos, carteira e rentabilidade.
- **Meu Futuro:** projeção de independência financeira e aposentadoria.
- **Proteção:** reserva de emergência, despesas essenciais e seguros.
- **Dash.IA:** insights persistidos e chat com streaming sobre os dados do usuário.
- **Assinatura:** checkout, portal de cobrança e webhook com Stripe, com período de trial.
- **Onboarding, perfil e autenticação (com 2FA).**

## Stack

| Camada | Tecnologias |
| --- | --- |
| Front-end | Next.js (App Router), React, Tailwind CSS, shadcn/ui, Recharts, TanStack Query, Zustand |
| Back-end | tRPC, Prisma, PostgreSQL, Supabase Auth |
| Integrações | OpenAI e Vercel AI SDK, Stripe, Resend, Upstash Redis, Sentry |
| Qualidade | Jest (unitários), Playwright (E2E), ESLint |

## Como foi pensado

- **Camadas separadas:** rotas em `src/app`, UI por domínio em `src/components`, regras e serviços em `src/server`, utilitários e fórmulas financeiras em `src/lib`, modelo de dados em `prisma/schema.prisma`.
- **Segurança por padrão:** autenticação no Supabase, proteção de rotas no `middleware.ts`, políticas RLS em `docs/supabase_rls.sql` e variáveis validadas em `src/lib/env.ts`.
- **API tipada de ponta a ponta:** o front autenticado conversa com o back via tRPC, com Prisma sobre PostgreSQL.
- **Rotinas agendadas:** recorrências, aviso de fim de trial e atualização de cotações, protegidas por `CRON_SECRET`.

A documentação técnica completa está em:

- [`docs/base-do-sistema/README.md`](docs/base-do-sistema/README.md): arquitetura, módulos, modelo de dados, API, integrações e lacunas conhecidas.
- [`src/docs/RUNBOOK.md`](src/docs/RUNBOOK.md): operação em produção.
- [`src/docs/GO_LIVE_CHECKLIST.md`](src/docs/GO_LIVE_CHECKLIST.md): checklist de publicação.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha com os seus valores
npx prisma migrate deploy
npx prisma db seed           # categorias padrão
npm run dev
```

## Segurança

Nenhuma credencial deste projeto é versionada. O arquivo `.env.example` contém apenas valores de exemplo. Se encontrar algo sensível, abra uma issue sem expor o valor.
