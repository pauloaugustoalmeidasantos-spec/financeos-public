# RUNBOOK.md - Operações FinanceOS

Este documento serve como o braço direito operacional (DevOps) para gerenciar o FinanceOS em produção. Siga os processos abaixo estritamente para manter o uptime e a integridade dos dados dos usuários.

---

## 1. Deploy Manual

O sistema já está interligado nativamente com a integração GitHub -> Vercel. Qualquer commit na `main` inicializa o processo de CI/CD automaticamente. Contudo, para acionar um deploy manual ou rollback:

1. Acesse seu painel **Vercel** > **FinanceOS**.
2. Na aba `Deployments`, localize o commit anterior estável.
3. Clique nos três pontinhos (`...`) e selecione **"Redeploy"**.
4. Não desabilite a opção "Use Build Cache" a menos que existam corrupções severas de UI sendo investigadas.

**Checagem pós-deploy manual:** Sempre garanta que o painel exibe o novo ID do build e rode os *Smoke Tests*.

---

## 2. Monitoramento de Logs (Erros em Produção)

Os logs do ambiente de produção estão estritamente divididos entre execução do servidor corporativo (Servialess) e falhas reativas de front-end.

1. **Vercel Logs (Rotas de API / Funcionalidade Server-Side):**
   - Acesse **Vercel** > **FinanceOS** > aba **Logs**.
   - Filtre por `Error` ou `Warning`. Problemas com Supabase Data Fetch, Pagamentos via Stripe Webhook ou chamadas de OpenAI estarão aqui.

2. **Sentry (Falhas no Browser do Usuário):**
   - Acesse seu painel **Sentry**.
   - Qualquer problema de falha de renderização, *hydration mismatches* graves (que quebram a interface) ou falhas críticas ao carregar a página serão logadas aqui junto ao rastreamento do stack trace exato. **Alertas estão programados para chegar ao seu e-mail administrativo quando a taxa de falha é >= 1%.**

---

## 3. Banco de Dados e Migrations (Zero Downtime)

O banco é gerido pelo Supabase (PostgreSQL) usando a ORM do Prisma. Sempre teste localmente antes de rodar contra o banco em produção:

1. Suba uma migration nova:
   ```bash
   npx prisma migrate deploy
   ```
   **Critério ZERO Downtime:** O comando `deploy` roda apenas as migrations ausentes na tabela rastreadora. Nunca use `prisma db push` contra o banco de produção principal (sobrescreve restrições).

2. Gerar cliente atualizado local (após fetch de novidades da nuvem):
   ```bash
   npx prisma generate
   ```

---

## 4. Disaster Recovery: Backup Supabase

O Supabase gerencia Point-in-Time Recovery (PITR) nas contas do plano PRO.
Caso aconteça falha catastrófica:

1. Acesse a dashboard do **Supabase**.
2. Vá em **Database** > **Backups**.
3. Selecione o cronograma ou `Point in Time` se disponível, e confirme a restauração.
4. *Aviso RLS*: O RLS mantém o acesso restrito baseado nos UIDs do Auth. Não modifique registros de UIDs pelo terminal ou a proteção cruazada pode invalidar sessões.

---

## 5. Gerenciamento de Planos (Stripe)

Quando desejar aumentar o preço de um plano (Ex: PRO passa de R$19 para R$29):

1. **Stripe Dashboard:** Crie um *Novo Preço* (Novo Produto) sob o produto pai `FinanceOS PRO`.
2. Pegue o novo ID (Ex: `price_1abcxyz...`).
3. **Vercel Settings:** Acesse `Settings > Environment Variables`.
4. Atualize a variável `STRIPE_MONTHLY_PRICE_ID` com a nova chave live.
5. Inicie um *Redeploy Sem Alteração de Código* no Vercel (Rebuild), para aplicar a chave ao App Router em cache! 

---

## 6. Troubleshooting: Cenários de Erros Comuns

- **`500 - Webhook Failed` (Stripe):** Geralmente ocorre se o segredo na `.env` não é pareado com o Live Endpoint do Webhook. Confira `STRIPE_WEBHOOK_SECRET` no Vercel.
- **`Usuário loga mas Dashboard é vermelho (Network Error)`:** Política de banco (RLS) bloqueou ou token expirou em fallback de edge caching. Solicite que o usuário limpe os cookies ou aguarde auto-refresh (5 minutos).
- **`Erro de Tráfego Massivo / 429 Too Many Requests`:** A camada base no `middleware.ts` do *Upstash Redis* está contendo um DDoS ou bot de brute-force. Verifique no painel do **Upstash** o IP responsável. 

---

## 7. Contatos Oficiais de Suporte

Para escalações Críticas P0 envolvendo inatividade ou faturas indevidas:
- **Vercel Support (Hospedagem):** Clicar em "Help" logado no Vercel.
- **Stripe Compliance:** support@stripe.com (Anexar logs do Painel de Desenvolvedores "Eventos").
- **Supabase Support:** Via ticket no Painel de Admin / "Contact Support" na aba SOC2.
- **OpenAI (Cota Esgotada de Dash.IA):** Validar limites na placa Billing no dashboard API.
