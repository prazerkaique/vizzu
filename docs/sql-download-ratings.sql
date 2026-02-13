-- ═══════════════════════════════════════════════════════════════
-- VIZZU — Tabela download_ratings
-- Rodar no Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE download_ratings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  user_email text,
  user_name text,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  product_name text,
  feature_source text,  -- 'product-studio', 'look-composer', 'creative-still', 'provador', etc.
  image_count smallint,
  created_at timestamptz DEFAULT now()
);

-- RLS: cada usuário só vê/cria seus próprios ratings
ALTER TABLE download_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own ratings"
  ON download_ratings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own ratings"
  ON download_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Índice para queries por usuário (dashboard futuro)
CREATE INDEX idx_download_ratings_user_id ON download_ratings(user_id);
CREATE INDEX idx_download_ratings_created_at ON download_ratings(created_at DESC);
