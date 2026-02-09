-- ═══════════════════════════════════════════════════════════════
-- VIZZU - CRÉDITOS DE EDIÇÃO (Product Studio)
-- Adiciona coluna edit_balance e RPC deduct_edit_credits
-- ═══════════════════════════════════════════════════════════════

-- 1. Nova coluna: edit_balance (créditos de edição separados)
ALTER TABLE user_credits ADD COLUMN IF NOT EXISTS edit_balance INTEGER NOT NULL DEFAULT 0;

-- 2. RPC: deduct_edit_credits
-- Tenta debitar de edit_balance primeiro.
-- Se insuficiente, debita de balance (créditos normais) com source='regular'.
CREATE OR REPLACE FUNCTION deduct_edit_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_generation_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_edit_bal INTEGER;
  v_bal INTEGER;
  v_source TEXT;
BEGIN
  -- Lock a row para evitar race condition
  SELECT edit_balance, balance INTO v_edit_bal, v_bal
  FROM user_credits WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  IF v_edit_bal >= p_amount THEN
    -- Debita dos créditos de edição
    UPDATE user_credits SET edit_balance = edit_balance - p_amount WHERE user_id = p_user_id;
    v_source := 'edit';
  ELSIF v_bal >= p_amount THEN
    -- Fallback: debita dos créditos normais
    UPDATE user_credits
    SET balance = balance - p_amount,
        lifetime_used = lifetime_used + p_amount
    WHERE user_id = p_user_id;
    v_source := 'regular';
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Créditos insuficientes');
  END IF;

  -- Registra transação
  INSERT INTO credit_transactions (user_id, type, amount, balance_after, description, reference_id)
  VALUES (
    p_user_id,
    'usage',
    -p_amount,
    (SELECT balance FROM user_credits WHERE user_id = p_user_id),
    CASE WHEN v_source = 'edit'
      THEN 'Edição de imagem (créditos de edição)'
      ELSE 'Edição de imagem (créditos regulares)'
    END,
    p_generation_id::TEXT
  );

  -- Retorna saldos atualizados
  SELECT edit_balance, balance INTO v_edit_bal, v_bal FROM user_credits WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'source', v_source,
    'new_edit_balance', v_edit_bal,
    'new_balance', v_bal
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
