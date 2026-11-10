# Base do Sistema — FinanceOS

Esta pasta consolida uma leitura técnica do projeto inteiro a partir do código-fonte atual.
A ideia é funcionar como uma base de conhecimento viva sobre arquitetura, módulos, dados, APIs, integrações e lacunas do sistema.

## 1. Resumo Executivo

- Nome do sistema: `FinanceOS`
- Tipo: SaaS de finanças pessoais com IA
- Stack principal: `Next.js 16` + `React 19` + `tRPC` + `Prisma` + `Supabase Auth` + `PostgreSQL` + `Stripe` + `OpenAI` + `Upstash Redis`
- Idioma da aplicação: `pt-BR`
- Foco do produto: controle financeiro pessoal, metas, patrimônio, projeção de aposentadoria/liberdade financeira e insights com IA

## 2. Inventário Rápido

- Páginas App Router: `16`
- Rotas REST/API: `6`
- Routers tRPC: `7`
- Serviços de backend: `6`
- Componentes React: `66`
- Testes unitários/integrados: `5`
- Testes E2E Playwright: `2`

## 3. Arquitetura Atual

### 3.1 Camadas

1. `src/app`
   - Rotas App Router do Next.js
   - layouts de auth, app logado e onboarding
   - endpoints HTTP em `src/app/api`

2. `src/components`
   - UI por domínio: dashboard, finanças, metas, patrimônio, futuro, IA, onboarding, perfil
   - componentes base em `src/components/ui`

3. `src/server`
   - camada de aplicação/backend
   - contexto tRPC, routers por domínio e serviços internos

4. `prisma/schema.prisma`
   - modelo relacional principal do sistema

5. `src/lib`
   - utilitários compartilhados
   - clientes Prisma, Supabase, Redis, formatadores, saneamento e fórmulas financeiras

### 3.2 Fluxo Macro

- Autenticação: `Supabase Auth`
- Sessão e proteção de rota: `middleware.ts` + layouts do App Router
- Backend principal para front autenticado: `tRPC`
- Persistência: `Prisma` sobre `PostgreSQL`
- IA:
  - geração de insights persistidos: `OpenAI` via `src/server/services/ai-insights.ts`
  - chat streaming: `Vercel AI SDK` via `src/app/api/ai/insights/route.ts`
- Billing: `Stripe Checkout`, `Billing Portal` e `webhook`
- Cache/rate limit: `Upstash Redis`
- E-mails: `Resend`

## 4. Domínios Funcionais

### 4.1 Autenticação e Conta

Arquivos centrais:

- `src/app/(auth)/*`
- `src/app/api/auth/callback/route.ts`
- `src/app/(auth)/actions.ts`
- `src/server/services/audit.ts`
- `middleware.ts`

Capacidades implementadas:

- login com e-mail/senha
- login/cadastro com Google OAuth
- recuperação de senha
- MFA/TOTP
- rate limit para login, signup e reset
- log de eventos de autenticação em `AuthAuditLog`
- callback que sincroniza usuário do Supabase com a tabela `users`
- criação automática de assinatura trial ao concluir callback de auth

### 4.2 Onboarding

Arquivos centrais:

- `src/app/(onboarding)/onboarding/page.tsx`
- `src/components/onboarding/*`
- `src/server/routers/user.ts`

Etapas:

1. renda e perfil financeiro básico
2. patrimônio inicial
3. metas
4. aposentadoria e aporte mensal

Efeito no banco:

- atualiza `UserProfile`
- cria `Asset`
- cria `Goal`
- marca `User.onboardingComplete` quando todas as condições são atendidas

### 4.3 Dashboard

Arquivos centrais:

- `src/app/(app)/dashboard/page.tsx`
- `src/components/dashboard/*`
- `src/server/routers/user.ts#getDashboardData`

Entrega:

- resumo do mês atual e mês anterior
- variação de saldo
- top metas
- patrimônio total
- progresso rumo à liberdade financeira
- alertas/insights de IA
- disparo silencioso de geração de insights ao abrir o dashboard

### 4.4 Finanças / Livro Caixa

Arquivos centrais:

- `src/app/(app)/financas/page.tsx`
- `src/components/financas/*`
- `src/server/routers/transaction.ts`
- `src/server/routers/category.ts`

Entrega:

- CRUD de transações
- transações recorrentes com relação pai/filhos
- edição/exclusão em modos `single`, `all_future`, `all`
- filtros por mês, tipo e categoria
- categorias padrão + categorias personalizadas
- resumo mensal, comparação entre meses e ranking de despesas

### 4.5 Metas

Arquivos centrais:

- `src/app/(app)/metas/page.tsx`
- `src/components/metas/*`
- `src/server/routers/goal.ts`
- `src/lib/financial.ts`

Entrega:

- CRUD de metas
- cálculo de `monthlyNeeded`
- cálculo de viabilidade em função da renda mensal
- priorização e prazo
- aportes por meta (`GoalContribution`)
- ranking de metas prioritárias para dashboard

### 4.6 Patrimônio

Arquivos centrais:

- `src/app/(app)/patrimonio/page.tsx`
- `src/components/patrimonio/*`
- `src/server/routers/asset.ts`

Entrega:

- CRUD de ativos
- agrupamento por tipo: financeiro, físico, negócio
- soft delete em ativos
- consolidação patrimonial
- distribuição por categoria
- cálculo de valorização/depreciação quando existe `purchaseValue`

### 4.7 Meu Futuro

Arquivos centrais:

- `src/app/(app)/meu-futuro/page.tsx`
- `src/components/futuro/*`
- `src/server/services/financial-calculator.ts`
- `src/lib/financial.ts`

Entrega:

- projeção patrimonial ano a ano
- patrimônio necessário para aposentadoria usando regra dos 4%
- progresso rumo à independência financeira
- sliders para simular idade de aposentadoria, renda desejada e aporte mensal
- persistência parcial desses parâmetros no perfil

### 4.8 Dash.IA

Arquivos centrais:

- `src/app/(app)/dash-ia/page.tsx`
- `src/components/ai/*`
- `src/server/routers/ai.ts`
- `src/server/services/ai-insights.ts`
- `src/app/api/ai/insights/route.ts`

Entrega:

- lista de insights persistidos por módulo
- geração manual de novos insights
- badge de insights não lidos na navegação
- marcação como lido / dismiss
- chat com streaming contextualizado pelos dados financeiros do usuário

### 4.9 Assinatura e Billing

Arquivos centrais:

- `src/app/(app)/upgrade/page.tsx`
- `src/server/routers/subscription.ts`
- `src/server/services/stripe.ts`
- `src/app/api/stripe/webhook/route.ts`
- `src/app/api/cron/trial-expiring/route.ts`

Entrega:

- consulta do status da assinatura
- criação de checkout session
- criação de portal session
- processamento de webhook do Stripe
- trial de 14 dias
- aviso de trial próximo do fim
- e-mails de confirmação/cancelamento/expiração

### 4.10 Perfil e Configurações

Arquivos centrais:

- `src/app/(app)/perfil/page.tsx`
- `src/components/profile/ProfileForm.tsx`
- `src/app/(app)/configuracoes/page.tsx`
- `src/hooks/useUser.ts`

Entrega:

- edição de dados pessoais
- edição de renda, estabilidade e objetivo financeiro
- troca de senha via Supabase
- ajuste de taxas financeiras, moeda, notificações e alertas de IA
- área visual de plano/faturamento dentro de configurações

## 5. Modelo de Dados

### 5.1 Entidades Principais

- `User`: identidade principal espelhada do Supabase Auth
- `UserProfile`: perfil financeiro e parâmetros de projeção
- `Category`: categorias de receitas/despesas, padrão ou personalizadas
- `Transaction`: livro caixa com suporte a recorrência
- `Goal`: metas financeiras do usuário
- `GoalContribution`: histórico de aportes em metas
- `Asset`: patrimônio do usuário
- `Subscription`: vínculo de plano e Stripe
- `AiInsight`: alertas/recomendações persistidos
- `AuthAuditLog`: auditoria de autenticação

### 5.2 Relações Relevantes

- `User` 1:1 `UserProfile`
- `User` 1:N `Transaction`
- `User` 1:N `Category`
- `User` 1:N `Goal`
- `User` 1:N `Asset`
- `User` 1:1 `Subscription`
- `User` 1:N `AiInsight`
- `Goal` 1:N `GoalContribution`
- `Transaction` auto-relacionada para recorrência (`parent` / `children`)

### 5.3 Enums Importantes

- `TransactionType`: `INCOME`, `EXPENSE`
- `RecurrenceType`: `NONE`, `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`
- `AssetType`: `FINANCIAL`, `PHYSICAL`, `BUSINESS`
- `GoalType`: `TRAVEL`, `CAR`, `HOUSE`, `RETIREMENT`, `EDUCATION`, `EMERGENCY`, `BUSINESS`, `OTHER`
- `SubscriptionPlan`: `FREE`, `MONTHLY`, `YEARLY`
- `SubscriptionStatus`: `TRIALING`, `ACTIVE`, `CANCELED`, `PAST_DUE`, `PAUSED`
- `InsightModule`: `DASHBOARD`, `FINANCES`, `GOALS`, `FUTURE`, `PATRIMONY`
- `InsightType`: `ALERT`, `RECOMMENDATION`, `INFO`, `WARNING`

## 6. API do Sistema

### 6.1 tRPC Routers

- `user`
  - `healthCheck`
  - `getProfile`
  - `updateProfile`
  - `completeOnboarding`
  - `getOnboardingStatus`
  - `getProjectionData`
  - `getDashboardData`

- `transaction`
  - `list`
  - `create`
  - `update`
  - `delete`
  - `getMonthlySummary`
  - `getBiggestExpenses`
  - `getMonthlyComparison`

- `goal`
  - `list`
  - `create`
  - `update`
  - `delete`
  - `addContribution`
  - `getTopGoals`

- `asset`
  - `list`
  - `create`
  - `update`
  - `delete`
  - `getSummary`

- `category`
  - `list`
  - `create`
  - `update`
  - `delete`

- `subscription`
  - `getStatus`
  - `createCheckout`
  - `createPortal`

- `ai`
  - `getInsights`
  - `generateInsights`
  - `markAsRead`
  - `dismiss`
  - `getUnreadCount`

### 6.2 Endpoints REST

- `GET /api/auth/callback`
- `POST /api/ai/insights`
- `GET /api/cron/recorrencias`
- `GET /api/cron/trial-expiring`
- `POST /api/stripe/webhook`
- `GET|POST /api/trpc/[trpc]`

## 7. Integrações Externas

- `Supabase`: autenticação, sessão, MFA e OAuth
- `PostgreSQL`: persistência principal via Prisma
- `OpenAI`: geração de insights estruturados
- `Vercel AI SDK`: chat com streaming
- `Stripe`: checkout, billing portal e webhook de assinatura
- `Resend`: e-mails transacionais
- `Upstash Redis`: cache e rate limit
- `Vercel Analytics` e `Speed Insights`: observabilidade de front

## 8. Variáveis de Ambiente Relevantes

Obrigatórias no código atual:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `CRON_SECRET`
- `NODE_ENV`

Opcionais/condicionais:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_APP_URL`
- `STRIPE_MONTHLY_PRICE_ID`
- `STRIPE_YEARLY_PRICE_ID`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

## 9. Automação e Jobs

### 9.1 Geração de recorrências

- endpoint: `GET /api/cron/recorrencias`
- segurança: bearer token com `CRON_SECRET`
- função: gerar lançamentos futuros ausentes para transações recorrentes raiz

### 9.2 Aviso de trial prestes a expirar

- endpoint: `GET /api/cron/trial-expiring`
- segurança: bearer token com `CRON_SECRET`
- função: localizar trials que vencem em aproximadamente 3 dias e enviar e-mail

## 10. Cobertura de Testes Encontrada

### 10.1 Unitários / lógica

- `src/lib/__tests__/financial.test.ts`
- `src/lib/__tests__/formatters.test.ts`
- `src/server/services/__tests__/financial-calculator.test.ts`
- `src/server/routers/__tests__/asset.test.ts`
- `src/server/routers/__tests__/goal.test.ts`

### 10.2 E2E

- `tests/e2e/auth.spec.ts`
- `tests/e2e/transaction.spec.ts`

## 11. Lacunas e Observações Importantes

Estas observações não são julgamento do produto; são pontos do código atual que vale manter documentados.

1. Página raiz ainda está no template padrão do Next.js
- `src/app/page.tsx` não representa o produto FinanceOS.

2. Redirecionamento de onboarding está desativado
- `src/app/(app)/layout.tsx` comenta a lógica de bloqueio para usuários sem onboarding concluído.

3. Toggle "Com Metas" em `Meu Futuro` ainda não afeta o cálculo
- em `src/components/futuro/MeuFuturoClient.tsx`, o recálculo local usa `goals: includeGoals ? [] : []`.

4. Navegação e header mostram placeholders em vez de dados reais do usuário/plano
- sidebar fixa "Trial: 14 dias restantes"
- header mostra avatar, nome e e-mail fictícios.

5. Configurações de billing na tela de configurações estão em modo mock
- botões disparam `toast` em vez de integração real.

6. Onboarding captura dívidas, mas não existe modelo próprio para passivos
- `Step2Finances` coleta `debts`, porém não persiste esse dado.

7. Inconsistência de nomes de variáveis Stripe
- `.env.example` usa `NEXT_PUBLIC_STRIPE_PRICE_MONTHLY` e `NEXT_PUBLIC_STRIPE_PRICE_YEARLY`
- o backend lê `STRIPE_MONTHLY_PRICE_ID` e `STRIPE_YEARLY_PRICE_ID`

8. `env.ts` valida chaves sensíveis, mas não contempla todos os preços Stripe usados no backend
- isso pode esconder falhas de configuração até o uso das rotas de billing.

## 12. Como Usar Esta Base

- leitura humana: `docs/base-do-sistema/README.md`
- consumo estruturado: `docs/base-do-sistema/sistema.json`

O JSON foi organizado para servir como inventário técnico do sistema, facilitando futuras automações, onboarding de equipe, geração de documentação e auditoria de arquitetura.
