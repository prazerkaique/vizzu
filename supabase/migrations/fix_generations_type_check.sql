-- ═══════════════════════════════════════════════════════════════
-- FIX: Atualizar constraint generations_type_check
--
-- Problema: A constraint atual não aceita 'product_studio'
-- Solução: Adicionar todos os tipos válidos
--
-- Execute este SQL no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Primeiro, vamos ver a constraint atual (para diagnóstico)
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conname = 'generations_type_check';

-- 2. Remover a constraint antiga
ALTER TABLE generations
DROP CONSTRAINT IF EXISTS generations_type_check;

-- 3. Criar nova constraint com todos os tipos válidos
ALTER TABLE generations
ADD CONSTRAINT generations_type_check
CHECK (type IN (
  'product_studio',      -- Product Studio (fotos multi-ângulo)
  'studio_ready',        -- Studio Ready (legacy, para compatibilidade)
  'cenario',             -- Cenário Criativo
  'cenario-criativo',    -- Cenário Criativo (formato alternativo)
  'lifestyle',           -- Modelo IA / Lifestyle
  'modelo-ia',           -- Modelo IA (formato alternativo)
  'provador',            -- Provador Virtual
  'refine'               -- Refinamento de imagem
));

-- 4. Opcional: Atualizar registros antigos com tipos incorretos
-- UPDATE generations SET type = 'product_studio' WHERE type LIKE 'studio_%';

-- ═══════════════════════════════════════════════════════════════
-- VERIFICAÇÃO
-- ═══════════════════════════════════════════════════════════════
-- Após executar, verifique se a constraint foi criada corretamente:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'generations'::regclass;
