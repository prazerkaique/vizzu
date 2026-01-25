-- ═══════════════════════════════════════════════════════════════
-- VIZZU - Migração para tabela de Looks dos Clientes
-- Execute este SQL no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- TABELA: CLIENT_LOOKS (Looks salvos dos clientes)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS client_looks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  storage_path TEXT,
  look_items JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_client_looks_client_id ON client_looks(client_id);
CREATE INDEX IF NOT EXISTS idx_client_looks_user_id ON client_looks(user_id);
CREATE INDEX IF NOT EXISTS idx_client_looks_created_at ON client_looks(created_at DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE client_looks ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
DROP POLICY IF EXISTS "Users can view their own client looks" ON client_looks;
CREATE POLICY "Users can view their own client looks"
  ON client_looks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own client looks" ON client_looks;
CREATE POLICY "Users can insert their own client looks"
  ON client_looks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own client looks" ON client_looks;
CREATE POLICY "Users can update their own client looks"
  ON client_looks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own client looks" ON client_looks;
CREATE POLICY "Users can delete their own client looks"
  ON client_looks FOR DELETE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- STORAGE BUCKET: client-looks
-- ═══════════════════════════════════════════════════════════════
--
-- IMPORTANTE: Você precisa criar o bucket manualmente no Supabase:
--
-- 1. Vá para Storage no painel do Supabase
-- 2. Clique em "New bucket"
-- 3. Nome: client-looks
-- 4. Marque como "Public bucket" (para URLs públicas funcionarem)
-- 5. Clique em "Create bucket"
--
-- Depois, configure as políticas de Storage:
--
-- Política de SELECT (download):
-- CREATE POLICY "Public access to client looks"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'client-looks');
--
-- Política de INSERT (upload):
-- CREATE POLICY "Users can upload client looks"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'client-looks'
--   AND auth.uid()::text = (storage.foldername(name))[1]
-- );
--
-- Política de DELETE:
-- CREATE POLICY "Users can delete their client looks"
-- ON storage.objects FOR DELETE
-- USING (
--   bucket_id = 'client-looks'
--   AND auth.uid()::text = (storage.foldername(name))[1]
-- );
--
-- ═══════════════════════════════════════════════════════════════

-- Adicionar coluna gender na tabela clients (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'gender'
  ) THEN
    ALTER TABLE clients ADD COLUMN gender TEXT CHECK (gender IN ('male', 'female'));
  END IF;
END $$;
