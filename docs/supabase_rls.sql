-- ==============================================================================
-- P30 - Supabase Row Level Security (RLS) Policies para FinanceOS
-- Script gerado para proteção direta do banco PostgreSQL em Produção.
-- Todas as tabelas são restritas para que os usuários só leiam/escrevam os próprios dados.
-- ==============================================================================

-- Tabela: users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own data" ON users
  FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Tabela: user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles can only access their own data" ON user_profiles
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Tabela: categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
-- Categorias do sistema (onde user_id é null) podem ser acessadas em read-only por qualquer user autenticado
CREATE POLICY "Users can read global template categories" ON categories
  FOR SELECT
  USING (user_id IS NULL AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can fully manage their own categories" ON categories
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Tabela: transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Transactions can only access their own data" ON transactions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Tabela: goals
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Goals can only access their own data" ON goals
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Tabela: goal_contributions
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Goal contributions can only access their own data" ON goal_contributions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Tabela: assets
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Assets can only access their own data" ON assets
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Tabela: subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Subscriptions can only access their own data" ON subscriptions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Tabela: ai_insights
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AiInsights can only access their own data" ON ai_insights
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Tabela: auth_audit_logs
ALTER TABLE auth_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Logs can only access their own data" ON auth_audit_logs
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
