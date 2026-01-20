-- ═══════════════════════════════════════════════════════════════
-- VIZZU - Migrações para sincronização de dados do usuário
-- Execute este SQL no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- TABELA: CLIENTS (Clientes)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT,
  photo TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  has_provador_ia BOOLEAN DEFAULT false,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  total_orders INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'vip'))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_whatsapp ON clients(whatsapp);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

-- Habilitar RLS (Row Level Security)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
DROP POLICY IF EXISTS "Users can view their own clients" ON clients;
CREATE POLICY "Users can view their own clients"
  ON clients FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own clients" ON clients;
CREATE POLICY "Users can insert their own clients"
  ON clients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own clients" ON clients;
CREATE POLICY "Users can update their own clients"
  ON clients FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own clients" ON clients;
CREATE POLICY "Users can delete their own clients"
  ON clients FOR DELETE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- TABELA: HISTORY_LOGS (Histórico de ações)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS history_logs (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TIMESTAMPTZ DEFAULT NOW(),
  action TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'error', 'pending')),
  method TEXT DEFAULT 'manual' CHECK (method IN ('manual', 'auto', 'api', 'ai', 'bulk', 'system')),
  cost INTEGER DEFAULT 0,
  items_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_history_logs_user_id ON history_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_history_logs_created_at ON history_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_logs_action ON history_logs(action);

-- Habilitar RLS
ALTER TABLE history_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
DROP POLICY IF EXISTS "Users can view their own history" ON history_logs;
CREATE POLICY "Users can view their own history"
  ON history_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own history" ON history_logs;
CREATE POLICY "Users can insert their own history"
  ON history_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own history" ON history_logs;
CREATE POLICY "Users can delete their own history"
  ON history_logs FOR DELETE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- TABELA: COMPANY_SETTINGS (Configurações da empresa)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS company_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  cnpj TEXT,
  instagram TEXT,
  target_audience TEXT DEFAULT '',
  voice_tone TEXT DEFAULT 'casual' CHECK (voice_tone IN ('formal', 'casual', 'divertido', 'luxo', 'jovem')),
  voice_examples TEXT,
  hashtags TEXT[] DEFAULT '{}',
  emojis_enabled BOOLEAN DEFAULT true,
  caption_style TEXT DEFAULT 'media' CHECK (caption_style IN ('curta', 'media', 'longa')),
  call_to_action TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
DROP POLICY IF EXISTS "Users can view their own company settings" ON company_settings;
CREATE POLICY "Users can view their own company settings"
  ON company_settings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own company settings" ON company_settings;
CREATE POLICY "Users can insert their own company settings"
  ON company_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own company settings" ON company_settings;
CREATE POLICY "Users can update their own company settings"
  ON company_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- RESUMO DAS TABELAS CRIADAS
-- ═══════════════════════════════════════════════════════════════
--
-- 1. clients - Clientes do usuário
--    - Vinculado ao user_id
--    - RLS habilitado
--
-- 2. history_logs - Histórico de ações
--    - Vinculado ao user_id
--    - RLS habilitado
--    - Limitado aos últimos 100 registros no frontend
--
-- 3. company_settings - Configurações da empresa
--    - Uma configuração por usuário (user_id é PK)
--    - RLS habilitado
--
-- ═══════════════════════════════════════════════════════════════
