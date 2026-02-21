-- ============================================================
-- RPC: master_get_metrics (v2)
-- Retorna: métricas básicas do Painel Master
-- v2: generations_today inclui creative_still_generations
-- Rodar no Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION master_get_metrics(p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
BEGIN
  SELECT master_verify_password(p_password) INTO v_ok;
  IF NOT v_ok THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  RETURN jsonb_build_object(
    'total_users', (SELECT COUNT(*)::int FROM auth.users),

    -- Gerações hoje — UNION: generations + creative_still_generations
    'generations_today', (
      SELECT SUM(cnt)::int FROM (
        SELECT COUNT(*)::int as cnt FROM generations WHERE created_at >= CURRENT_DATE
        UNION ALL
        SELECT COUNT(*)::int as cnt FROM creative_still_generations WHERE created_at >= CURRENT_DATE
      ) combined
    ),

    'total_credits', (SELECT COALESCE(SUM(balance), 0)::int FROM user_credits),

    'plans', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT COALESCE(plan_id, 'free') as plan, COUNT(*)::int as count
        FROM user_subscriptions
        GROUP BY plan_id
        ORDER BY count DESC
      ) t
    )
  );
END;
$$;
