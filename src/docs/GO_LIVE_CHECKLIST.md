# FinanceOS Go-Live Checklist & Smoke Tests (P30)

Este checklist cobre as verificações e passos de validação finais para o deploy de produção do FinanceOS.

## 1. Checklist Pré-Deploy

### Banco de dados:
- [ ] **Backup manual do banco de staging**
  - **Ação:** Acesse o painel do Supabase -> Database -> Backups e acione um backup de segurança.
- [ ] **Migrations aplicadas no banco de produção Supabase**
  - **Comando:** `npx prisma migrate deploy` contra a URL do banco em produção. E também aplicar as categorias base caso necessário: `npx prisma db seed`.
- [ ] **RLS (Row Level Security) habilitado em todas as tabelas**
  - **Ação:** Execute o script `docs/supabase_rls.sql` no SQL Editor do Supabase apontado para Produção. Se não usou o CLI, faça pelo painel.
- [ ] **Políticas RLS criadas**
  - **Ação:** Validar que as policies estão do tipo: `USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`.
- [ ] **Índices verificados**
  - **Ação:** Use `EXPLAIN ANALYZE` nas queries mais pesadas do `transactions` ou dashboard.

### Autenticação (Supabase Auth):
- [ ] **OAuth Google configurado com URL de produção no Supabase**
  - **Ação:** No menu Authentication -> Providers -> Google, certifique-se de configurar a URL de callback para `https://<seu-dominio>/auth/v1/callback`.
- [ ] **Email templates do Supabase customizados**
  - **Ação:** Replicar as customizações de template de e-mail do ambiente staging para produção via "Email Templates" (Confirmation, Magic Link).
- [ ] **Rate limit de auth habilitado no Supabase Dashboard**
  - **Ação:** Confirmar a configuração limite de e-mails em Auth -> Rate Limits.

### Stripe:
- [ ] **Modo live ativado**
  - **Ação:** Alternar a aba do Stripe para o "Live" e obter chaves `sk_live_...` e `pk_live_...`.
- [ ] **Webhook de produção criado**
  - **Ação:** Criar webhook no Stripe apontando para `https://<seu-dominio>/api/stripe/webhook` com os eventos habilitados.
- [ ] **Produtos e preços criados no modo live**
  - **Ação:** Criar os planos (mensal, anual) na versão live do catálogo de produto.
- [ ] **Price IDs de produção atualizados nas env vars**
  - **Ação:** Configurar `STRIPE_MONTHLY_PRICE_ID` no admin do Vercel com o novo ID `price_xxx...`.

### Vercel:
- [ ] **Todas as variáveis de ambiente de produção configuradas**
  - **Ação:** Confirmar banco de produção, Supabase Keys, OpenAI Key e Stripe.
- [ ] **Domínio personalizado adicionado e SSL ativo**
  - **Ação:** Vercel -> Settings -> Domains e adicionar o domínio real e aguardar gerar TSL/SSL.
- [ ] **Vercel Analytics habilitado**
  - **Ação:** Vercel -> Analytics -> Enable.
- [ ] **Crons verificados (recorrencias e trial-expiring)**
  - **Ação:** Confirmar no painel Vercel se a aba "Cron Jobs" está listando conforme `vercel.json`.

### Sentry:
- [ ] **Source maps enviados para Sentry**
  - **Ação:** Confirmar as credenciais em `SENTRY_AUTH_TOKEN`. Modifique o ci/cd se for requerido nas GitHub Actions para mapear build source maps.
- [ ] **Alertas de erro configurados**
  - **Ação:** Painel Sentry -> Alerts. Definir e-mail de alerta para erros >= %X de volume.

### Performance:
- [ ] **`next build` passa sem warnings**
  - **Ação:** Acompanhar compilação nos Deployments do Vercel.
- [ ] **Lighthouse / Core Web Vitals**
  - **Ação:** Rodar lighthouse local dev via Dev Tools e usar insight do painel Vercel Analytics. Score > 85 esperado no Dashboard.

---

## 2. Smoke Tests Pós-Deploy

Realize as verificações manuais na base final de produção:

1. [ ] **Cadastro de novo usuário** com e-mail real -> verificar se o e-mail transacional de boas-vindas foi recebido.
2. [ ] **Login** e validação inicial na rota `/dashboard` indicando estado vazio ou onboarding.
3. [ ] **Criar transação** de despesa e receita e validar renderização imediata nos Widgets e tabelas.
4. [ ] **Assinar plano** (ir para página `/upgrade`), efetuar com cartão de testes do Stripe/real e checar retorno ao Dashboard se está liberando restrições do guard/middleware.
5. [ ] Acesso à página `/configuracoes` e clique no **botão "Gerenciar Assinatura"** que deve abrir o Portal do Cliente Stripe.
6. [ ] Acessar página de **IA / Dashboard IA**, rodar request e garantir recebimento contínuo de insights (Streaming de texto rodando, limites/cotas de OpenAI ok).
7. [ ] Fazer **Logout**, depois **Login** -> Validar cookie de sessão armazenado corretamente persistindo estado.
8. [ ] Mudar modo Mobile pelo devtools no browser simulador e garantir menus acessíveis (drawer/hamburger).
