-- ============================================================
-- RPC: master_get_extras (v5)
-- Retorna: métricas completas do Painel Master
-- v5: TODAS as queries incluem creative_still_generations
--     + labels de feature normalizados
-- Rodar no Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION master_get_extras(p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
BEGIN
  -- Verificar senha usando a função existente
  SELECT master_verify_password(p_password) INTO v_ok;
  IF NOT v_ok THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  RETURN jsonb_build_object(
    -- Últimos 3 usuários cadastrados (com whatsapp se tiver)
    'recent_users', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT u.email, u.created_at, COALESCE(us.plan_id, 'free') as plan_id,
               cs.whatsapp
        FROM auth.users u
        LEFT JOIN user_subscriptions us ON us.user_id = u.id
        LEFT JOIN company_settings cs ON cs.user_id = u.id
        ORDER BY u.created_at DESC
        LIMIT 3
      ) t
    ),

    -- Provider stats (30 dias) — UNION: generations + creative_still_generations
    'provider_stats', (
      SELECT COALESCE(jsonb_object_agg(provider, total), '{}'::jsonb)
      FROM (
        SELECT provider, SUM(cnt)::int as total
        FROM (
          -- Product Studio, Look Composer, Model, Provador (tabela generations)
          SELECT COALESCE(model_config->>'aiProvider', 'gemini-oficial') as provider, COUNT(*)::int as cnt
          FROM generations
          WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' AND model_config IS NOT NULL
          GROUP BY provider
          UNION ALL
          -- Creative Still (tabela creative_still_generations)
          SELECT key as provider, value::text::int as cnt
          FROM creative_still_generations,
               jsonb_each_text(settings_snapshot->'providerTracking'->'providers')
          WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
            AND settings_snapshot->'providerTracking'->'providers' IS NOT NULL
        ) all_providers
        GROUP BY provider ORDER BY total DESC
      ) t
    ),

    -- Usuários ativos — UNION: generations + creative_still_generations
    'active_users_7d', (
      SELECT COUNT(DISTINCT user_id)::int FROM (
        SELECT g.user_id FROM generations g
        LEFT JOIN user_subscriptions us ON us.user_id = g.user_id
        WHERE g.created_at >= CURRENT_DATE - INTERVAL '7 days'
          AND COALESCE(us.plan_id, 'free') NOT IN ('master', 'test')
        UNION
        SELECT cs.user_id FROM creative_still_generations cs
        LEFT JOIN user_subscriptions us ON us.user_id = cs.user_id
        WHERE cs.created_at >= CURRENT_DATE - INTERVAL '7 days'
          AND COALESCE(us.plan_id, 'free') NOT IN ('master', 'test')
      ) active
    ),
    'active_users_30d', (
      SELECT COUNT(DISTINCT user_id)::int FROM (
        SELECT g.user_id FROM generations g
        LEFT JOIN user_subscriptions us ON us.user_id = g.user_id
        WHERE g.created_at >= CURRENT_DATE - INTERVAL '30 days'
          AND COALESCE(us.plan_id, 'free') NOT IN ('master', 'test')
        UNION
        SELECT cs.user_id FROM creative_still_generations cs
        LEFT JOIN user_subscriptions us ON us.user_id = cs.user_id
        WHERE cs.created_at >= CURRENT_DATE - INTERVAL '30 days'
          AND COALESCE(us.plan_id, 'free') NOT IN ('master', 'test')
      ) active
    ),

    -- Top 5 usuários (30 dias) — UNION: generations + creative_still_generations
    'top_users', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT u.email, total_count as generation_count,
               COALESCE(us.plan_id, 'free') as plan_id, cset.whatsapp
        FROM (
          SELECT user_id, SUM(cnt)::int as total_count
          FROM (
            SELECT user_id, COUNT(*)::int as cnt FROM generations
            WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY user_id
            UNION ALL
            SELECT user_id::uuid, COUNT(*)::int as cnt FROM creative_still_generations
            WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY user_id
          ) all_gens
          GROUP BY user_id
        ) ranked
        JOIN auth.users u ON u.id = ranked.user_id
        LEFT JOIN user_subscriptions us ON us.user_id = ranked.user_id
        LEFT JOIN company_settings cset ON cset.user_id = ranked.user_id
        WHERE COALESCE(us.plan_id, 'free') NOT IN ('master', 'test')
        ORDER BY total_count DESC
        LIMIT 5
      ) t
    ),

    -- Gerações por feature (30 dias) — UNION + labels normalizados
    'generations_by_feature', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT feature, SUM(cnt)::int as count
        FROM (
          -- Tabela generations com labels normalizados
          SELECT
            CASE
              WHEN type IN ('product_studio', 'studio', 'studio_ready') THEN 'product_studio'
              WHEN type IN ('modelo_ia', 'lifestyle', 'modelo-ia') THEN 'look_composer'
              WHEN type IN ('cenario', 'cenario-criativo') THEN 'cenario'
              WHEN type = 'provador' THEN 'provador'
              WHEN type = 'refine' THEN 'refine'
              ELSE type
            END as feature,
            COUNT(*)::int as cnt
          FROM generations
          WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY feature
          UNION ALL
          -- Creative Still (tabela separada)
          SELECT 'creative_still' as feature, COUNT(*)::int as cnt
          FROM creative_still_generations
          WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        ) all_features
        GROUP BY feature
        ORDER BY count DESC
      ) t
    ),

    -- Taxa de falha (7 dias) — UNION: generations + creative_still_generations
    'failure_rate', (
      SELECT jsonb_build_object(
        'total_7d', SUM(total)::int,
        'failed_7d', SUM(failed)::int
      )
      FROM (
        SELECT
          COUNT(*)::int as total,
          COUNT(*) FILTER (
            WHERE status IN ('failed', 'error')
            AND (error_message IS NULL OR (
              error_message NOT ILIKE '%Bloqueado%'
              AND error_message NOT ILIKE '%SAFETY%'
              AND error_message NOT ILIKE '%BLOCKED%'
              AND error_message NOT ILIKE '%segurança%'
              AND error_message NOT ILIKE '%blockReason%'
            ))
          )::int as failed
        FROM generations
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
        UNION ALL
        SELECT
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE status = 'failed')::int as failed
        FROM creative_still_generations
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      ) combined
    ),

    -- Tendência de gerações — UNION
    'generation_trend', (
      SELECT jsonb_build_object(
        'today', SUM(d_today)::int,
        'yesterday', SUM(d_yesterday)::int,
        'days_7d', SUM(d_7d)::int,
        'days_30d', SUM(d_30d)::int
      )
      FROM (
        SELECT
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::int as d_today,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - 1 AND created_at < CURRENT_DATE)::int as d_yesterday,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::int as d_7d,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')::int as d_30d
        FROM generations
        UNION ALL
        SELECT
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::int,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - 1 AND created_at < CURRENT_DATE)::int,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::int,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')::int
        FROM creative_still_generations
      ) combined
    ),

    -- Usuários com créditos baixos (< 5, exclui master/test/free)
    'low_credit_users', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT u.email, uc.balance::int, COALESCE(us.plan_id, 'free') as plan_id,
               cs.whatsapp
        FROM user_credits uc
        JOIN auth.users u ON u.id = uc.user_id
        LEFT JOIN user_subscriptions us ON us.user_id = uc.user_id
        LEFT JOIN company_settings cs ON cs.user_id = uc.user_id
        WHERE uc.balance < 5
          AND COALESCE(us.plan_id, 'free') NOT IN ('master', 'test', 'free')
        ORDER BY uc.balance ASC
        LIMIT 10
      ) t
    ),

    -- Erros recentes (últimos 10) — UNION: generations + creative_still_generations
    'recent_errors', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        (
          SELECT g.type as generation_type, g.error_message, g.created_at, u.email
          FROM generations g
          JOIN auth.users u ON u.id = g.user_id
          WHERE g.status IN ('failed', 'error')
            AND (g.error_message IS NULL OR (
              g.error_message NOT ILIKE '%Bloqueado%'
              AND g.error_message NOT ILIKE '%SAFETY%'
              AND g.error_message NOT ILIKE '%BLOCKED%'
              AND g.error_message NOT ILIKE '%segurança%'
              AND g.error_message NOT ILIKE '%blockReason%'
            ))
          ORDER BY g.created_at DESC
          LIMIT 10
        )
        UNION ALL
        (
          SELECT 'creative_still' as generation_type, cs.error_message, cs.created_at, u.email
          FROM creative_still_generations cs
          JOIN auth.users u ON u.id = cs.user_id::uuid
          WHERE cs.status = 'failed'
            AND cs.error_message IS NOT NULL
          ORDER BY cs.created_at DESC
          LIMIT 10
        )
        ORDER BY created_at DESC
        LIMIT 10
      ) t
    ),

    -- Distribuição horária (últimos 7 dias) — UNION: generations + creative_still_generations
    'hourly_distribution', (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.hour), '[]'::jsonb)
      FROM (
        SELECT
          hour,
          SUM(success)::int as success,
          SUM(errors)::int as errors
        FROM (
          -- generations
          SELECT
            EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Sao_Paulo')::int as hour,
            COUNT(*) FILTER (WHERE status IN ('completed', 'partial'))::int as success,
            COUNT(*) FILTER (
              WHERE status IN ('failed', 'error')
              AND (error_message IS NULL OR (
                error_message NOT ILIKE '%Bloqueado%'
                AND error_message NOT ILIKE '%SAFETY%'
                AND error_message NOT ILIKE '%BLOCKED%'
                AND error_message NOT ILIKE '%segurança%'
                AND error_message NOT ILIKE '%blockReason%'
              ))
            )::int as errors
          FROM generations
          WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
          GROUP BY hour
          UNION ALL
          -- creative_still_generations
          SELECT
            EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Sao_Paulo')::int as hour,
            COUNT(*) FILTER (WHERE status = 'completed')::int as success,
            COUNT(*) FILTER (WHERE status = 'failed')::int as errors
          FROM creative_still_generations
          WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
          GROUP BY hour
        ) combined
        GROUP BY hour
        ORDER BY hour
      ) t
    ),

    -- Shopify stats
    'shopify_stats', (
      SELECT jsonb_build_object(
        'connections', (SELECT COUNT(*)::int FROM ecommerce_connections WHERE status = 'active'),
        'exports', (SELECT COUNT(*)::int FROM ecommerce_image_exports WHERE status = 'done')
      )
    ),

    -- Pagantes (excluindo free, test, master)
    'paid_users', (
      SELECT COUNT(*)::int FROM user_subscriptions
      WHERE plan_id NOT IN ('free', 'test', 'master')
    )
  );
END;
$$;
