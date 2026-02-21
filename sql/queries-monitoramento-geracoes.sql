-- ══════════════════════════════════════════════════════════════
-- VIZZU — Queries de Monitoramento de Gerações
-- Copie e cole no Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════


-- ┌─────────────────────────────────────────────────────────────┐
-- │  1. PRODUCT STUDIO                                         │
-- └─────────────────────────────────────────────────────────────┘

SELECT
  g.id,
  g.created_at::date AS data,
  g.created_at::time(0) AS hora,
  g.status,
  COALESCE(g.resolution, '2k') AS resolucao,
  g.credits_used AS creditos,
  COALESCE(g.model_config->>'aiProvider', 'sem tracking') AS provider,
  g.model_config->'providers' AS providers_detalhe,
  COALESCE(g.model_config->>'hasFallback', 'false') AS usou_fallback,
  g.processing_time_ms / 1000.0 AS tempo_seg,
  jsonb_array_length(CASE
    WHEN g.output_urls IS NOT NULL AND g.output_urls::text != 'null' THEN g.output_urls
    ELSE '[]'::jsonb
  END) AS qtd_imagens,
  pg_size_pretty(octet_length(g.output_urls::text)::bigint) AS peso_json_urls,
  LEFT(g.error_message, 80) AS erro
FROM generations g
WHERE g.type = 'product_studio'
ORDER BY g.created_at DESC
LIMIT 30;


-- ┌─────────────────────────────────────────────────────────────┐
-- │  2. LOOK COMPOSER                                          │
-- └─────────────────────────────────────────────────────────────┘

SELECT
  g.id,
  g.created_at::date AS data,
  g.created_at::time(0) AS hora,
  g.status,
  COALESCE(g.resolution, '2k') AS resolucao,
  g.credits_used AS creditos,
  COALESCE(g.model_config->>'aiProvider', 'sem tracking') AS provider,
  g.model_config->'providers' AS providers_detalhe,
  COALESCE(g.model_config->>'hasFallback', 'false') AS usou_fallback,
  g.processing_time_ms / 1000.0 AS tempo_seg,
  jsonb_array_length(CASE
    WHEN g.output_urls IS NOT NULL AND g.output_urls::text != 'null' THEN g.output_urls
    ELSE '[]'::jsonb
  END) AS qtd_imagens,
  LEFT(g.error_message, 80) AS erro
FROM generations g
WHERE g.type = 'modelo_ia'
ORDER BY g.created_at DESC
LIMIT 30;


-- ┌─────────────────────────────────────────────────────────────┐
-- │  3. CREATIVE STILL (tabela separada)                       │
-- └─────────────────────────────────────────────────────────────┘

SELECT
  cs.id,
  cs.created_at::date AS data,
  cs.created_at::time(0) AS hora,
  cs.status,
  COALESCE(cs.resolution, '2k') AS resolucao,
  cs.credits_used AS creditos,
  COALESCE(cs.settings_snapshot->>'aiProvider', 'sem tracking') AS provider,
  cs.variations_requested AS variacoes_pedidas,
  jsonb_array_length(CASE
    WHEN cs.variation_urls IS NOT NULL AND cs.variation_urls::text != 'null' THEN cs.variation_urls
    ELSE '[]'::jsonb
  END) AS variacoes_geradas,
  cs.is_favorite AS favorito,
  LEFT(cs.error_message, 80) AS erro
FROM creative_still_generations cs
ORDER BY cs.created_at DESC
LIMIT 30;


-- ┌─────────────────────────────────────────────────────────────┐
-- │  4. GENERATE MODEL (IA e Real)                             │
-- └─────────────────────────────────────────────────────────────┘

SELECT
  g.id,
  g.created_at::date AS data,
  g.created_at::time(0) AS hora,
  g.status,
  COALESCE(g.resolution, '2k') AS resolucao,
  g.credits_used AS creditos,
  COALESCE(g.model_config->>'aiProvider', 'sem tracking') AS provider,
  g.model_config->'providers' AS providers_detalhe,
  COALESCE(g.model_config->>'hasFallback', 'false') AS usou_fallback,
  g.processing_time_ms / 1000.0 AS tempo_seg,
  jsonb_array_length(CASE
    WHEN g.output_urls IS NOT NULL AND g.output_urls::text != 'null' THEN g.output_urls
    ELSE '[]'::jsonb
  END) AS qtd_imagens,
  LEFT(g.error_message, 80) AS erro
FROM generations g
WHERE g.type IN ('lifestyle', 'modelo-ia')
ORDER BY g.created_at DESC
LIMIT 30;


-- ┌─────────────────────────────────────────────────────────────┐
-- │  5. PROVADOR VIRTUAL                                       │
-- └─────────────────────────────────────────────────────────────┘

SELECT
  g.id,
  g.created_at::date AS data,
  g.created_at::time(0) AS hora,
  g.status,
  COALESCE(g.resolution, '2k') AS resolucao,
  g.credits_used AS creditos,
  COALESCE(g.model_config->>'aiProvider', 'sem tracking') AS provider,
  COALESCE(g.model_config->>'hasFallback', 'false') AS usou_fallback,
  g.processing_time_ms / 1000.0 AS tempo_seg,
  LEFT(g.error_message, 80) AS erro
FROM generations g
WHERE g.type = 'provador'
ORDER BY g.created_at DESC
LIMIT 30;


-- ┌─────────────────────────────────────────────────────────────┐
-- │  6. STUDIO EDIT (refinamento)                              │
-- └─────────────────────────────────────────────────────────────┘

SELECT
  g.id,
  g.created_at::date AS data,
  g.created_at::time(0) AS hora,
  g.status,
  g.credits_used AS creditos,
  g.processing_time_ms / 1000.0 AS tempo_seg,
  LEFT(g.error_message, 80) AS erro
FROM generations g
WHERE g.type = 'refine'
ORDER BY g.created_at DESC
LIMIT 30;


-- ══════════════════════════════════════════════════════════════
-- VISÃO GERAL — Resumo por tipo + provider (últimas 24h)
-- ══════════════════════════════════════════════════════════════

SELECT
  CASE
    WHEN g.type = 'product_studio' THEN 'Product Studio'
    WHEN g.type = 'modelo_ia' THEN 'Look Composer'
    WHEN g.type IN ('lifestyle', 'modelo-ia') THEN 'Generate Model'
    WHEN g.type = 'provador' THEN 'Provador'
    WHEN g.type = 'refine' THEN 'Studio Edit'
    ELSE g.type
  END AS feature,
  COALESCE(g.model_config->>'aiProvider', 'sem tracking') AS provider,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE g.status = 'completed') AS ok,
  COUNT(*) FILTER (WHERE g.status = 'failed') AS falhas,
  COUNT(*) FILTER (WHERE g.status = 'processing') AS pendentes,
  ROUND(AVG(g.processing_time_ms) / 1000.0, 1) AS tempo_medio_seg,
  SUM(g.credits_used) AS creditos_total,
  ROUND(AVG(g.credits_used), 1) AS creditos_medio
FROM generations g
WHERE g.created_at > NOW() - INTERVAL '24 hours'
GROUP BY feature, provider
ORDER BY feature, total DESC;


-- ══════════════════════════════════════════════════════════════
-- VISÃO GERAL — Creative Still separado (últimas 24h)
-- ══════════════════════════════════════════════════════════════

SELECT
  'Creative Still' AS feature,
  COALESCE(cs.settings_snapshot->>'aiProvider', 'sem tracking') AS provider,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE cs.status = 'completed') AS ok,
  COUNT(*) FILTER (WHERE cs.status = 'failed') AS falhas,
  SUM(cs.credits_used) AS creditos_total
FROM creative_still_generations cs
WHERE cs.created_at > NOW() - INTERVAL '24 hours'
GROUP BY provider
ORDER BY total DESC;


-- ══════════════════════════════════════════════════════════════
-- TAXA DE FALLBACK — por dia (últimos 7 dias)
-- ══════════════════════════════════════════════════════════════

SELECT
  g.created_at::date AS dia,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE model_config->>'hasFallback' = 'true') AS com_fallback,
  COUNT(*) FILTER (WHERE model_config->>'aiProvider' = 'fal-gemini') AS nano_banana,
  COUNT(*) FILTER (WHERE model_config->>'aiProvider' = 'fal-seedream') AS seedream,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE model_config->>'hasFallback' = 'true') / NULLIF(COUNT(*), 0),
  1) AS pct_fallback
FROM generations g
WHERE g.created_at > NOW() - INTERVAL '7 days'
  AND g.model_config IS NOT NULL
GROUP BY dia
ORDER BY dia DESC;


-- ══════════════════════════════════════════════════════════════
-- PESO DAS IMAGENS — estimativa via tamanho das URLs/storage
-- (Supabase não tem tamanho do arquivo direto, mas dá pra
--  estimar pelo storage_path na tabela product_images)
-- ══════════════════════════════════════════════════════════════

SELECT
  pi.type,
  COUNT(*) AS total_imagens,
  pg_size_pretty(AVG(octet_length(pi.url))::bigint) AS tamanho_medio_url,
  pg_size_pretty(SUM(octet_length(pi.url))::bigint) AS tamanho_total_urls
FROM product_images pi
WHERE pi.created_at > NOW() - INTERVAL '7 days'
GROUP BY pi.type
ORDER BY total_imagens DESC;


-- ══════════════════════════════════════════════════════════════
-- TAMANHO REAL DAS IMAGENS NO STORAGE
-- (roda se quiser saber o peso real dos arquivos no bucket)
-- ══════════════════════════════════════════════════════════════

SELECT
  CASE
    WHEN name LIKE '%modelo_ia%' THEN 'Look Composer'
    WHEN name LIKE '%studio_%' THEN 'Product Studio'
    WHEN name LIKE '%still_%' THEN 'Creative Still'
    WHEN name LIKE '%provador%' THEN 'Provador'
    ELSE 'Outro'
  END AS feature,
  COUNT(*) AS qtd_arquivos,
  pg_size_pretty(AVG(metadata->>'size')::bigint) AS peso_medio,
  pg_size_pretty(SUM((metadata->>'size')::bigint)) AS peso_total,
  pg_size_pretty(MIN((metadata->>'size')::bigint)) AS menor,
  pg_size_pretty(MAX((metadata->>'size')::bigint)) AS maior
FROM storage.objects
WHERE bucket_id = 'products'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY feature
ORDER BY qtd_arquivos DESC;
