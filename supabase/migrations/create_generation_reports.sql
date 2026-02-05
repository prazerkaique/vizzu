-- ===============================================================
-- VIZZU - GENERATION REPORTS TABLE
-- Reports de geracao com problemas para analise do admin
-- ===============================================================

CREATE TABLE IF NOT EXISTS generation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Dados do usuario (denormalizado para facilitar admin)
  user_email TEXT,
  user_name TEXT,

  -- Dados da geracao
  generation_type TEXT NOT NULL CHECK (generation_type IN ('product-studio', 'look-composer', 'creative-still', 'provador')),
  generation_id TEXT,
  product_name TEXT,

  -- Imagens
  generated_image_url TEXT NOT NULL,
  original_image_url TEXT,

  -- Report do usuario
  observation TEXT NOT NULL,

  -- Status e revisao
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  admin_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,

  -- Controle de notificacao
  user_notified BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_generation_reports_user_id ON generation_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_reports_status ON generation_reports(status);
CREATE INDEX IF NOT EXISTS idx_generation_reports_created_at ON generation_reports(created_at DESC);

-- RLS
ALTER TABLE generation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports"
  ON generation_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports"
  ON generation_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own report notification"
  ON generation_reports FOR UPDATE
  USING (auth.uid() = user_id);
