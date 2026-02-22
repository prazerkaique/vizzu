-- ═══════════════════════════════════════════════════════════════
-- VIZZU - CRÉDITOS DE EDIÇÃO: TROCA + BÔNUS 15%
-- Rodar no Supabase SQL Editor (ordem importa)
-- ═══════════════════════════════════════════════════════════════

-- 1. Adicionar tipo 'exchange' na constraint de credit_transactions
ALTER TABLE credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_type_check;
ALTER TABLE credit_transactions ADD CONSTRAINT credit_transactions_type_check
  CHECK (type IN ('purchase', 'usage', 'renewal', 'refund', 'bonus', 'adjustment', 'exchange', 'plan_reset'));

-- ═══════════════════════════════════════════════════════════════
-- 2. RPC: exchange_credits
-- Converte créditos regulares em créditos de edição (taxa 1:2)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION exchange_credits(
  p_user_id UUID,
  p_regular_amount INT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance INT;
  v_edit_amount INT;
  v_new_balance INT;
  v_new_edit_balance INT;
BEGIN
  -- Validar input
  IF p_regular_amount < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantidade mínima: 1 crédito');
  END IF;

  -- Lock row para atomicidade
  SELECT balance INTO v_current_balance
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  IF v_current_balance < p_regular_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Saldo insuficiente');
  END IF;

  -- Taxa: 1 regular → 2 edição
  v_edit_amount := p_regular_amount * 2;

  -- Atualizar atomicamente
  UPDATE user_credits
  SET balance = balance - p_regular_amount,
      edit_balance = edit_balance + v_edit_amount
  WHERE user_id = p_user_id
  RETURNING balance, edit_balance INTO v_new_balance, v_new_edit_balance;

  -- Registrar transação
  INSERT INTO credit_transactions (user_id, type, amount, balance_after, description)
  VALUES (
    p_user_id,
    'exchange',
    -p_regular_amount,
    v_new_balance,
    'Troca: ' || p_regular_amount || ' crédito(s) → ' || v_edit_amount || ' crédito(s) de edição'
  );

  RETURN jsonb_build_object(
    'success', true,
    'regular_debited', p_regular_amount,
    'edit_credited', v_edit_amount,
    'new_balance', v_new_balance,
    'new_edit_balance', v_new_edit_balance
  );
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 3. Modificar add_credits para incluir bônus 15% de edição
-- ═══════════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS add_credits(uuid, integer, text, text, text);

CREATE OR REPLACE FUNCTION add_credits(
  p_user_id UUID,
  p_amount INT,
  p_type TEXT DEFAULT 'purchase',
  p_stripe_payment_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INT;
  v_edit_bonus INT := 0;
  v_desc TEXT;
BEGIN
  v_desc := COALESCE(p_description, 'Adição de ' || p_amount || ' créditos');

  -- Upsert: criar row se não existir
  INSERT INTO user_credits (user_id, balance, lifetime_purchased)
  VALUES (p_user_id, p_amount, p_amount)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = user_credits.balance + p_amount,
      lifetime_purchased = user_credits.lifetime_purchased + p_amount
  RETURNING balance INTO v_new_balance;

  -- Registrar transação de créditos regulares
  INSERT INTO credit_transactions (user_id, type, amount, balance_after, description, stripe_payment_intent_id)
  VALUES (p_user_id, p_type, p_amount, v_new_balance, v_desc, p_stripe_payment_id);

  -- Bônus de edição: 10% para compras e renovações de plano
  IF p_type IN ('purchase', 'plan_reset') THEN
    v_edit_bonus := FLOOR(p_amount * 0.10);
    IF v_edit_bonus > 0 THEN
      UPDATE user_credits
      SET edit_balance = edit_balance + v_edit_bonus
      WHERE user_id = p_user_id;

      INSERT INTO credit_transactions (user_id, type, amount, balance_after, description)
      VALUES (
        p_user_id,
        'bonus',
        v_edit_bonus,
        v_new_balance,
        'Bônus edição: 10% de ' || p_amount || ' créditos (' || v_edit_bonus || ' créditos de edição)'
      );
    END IF;
  END IF;

  -- Retorna integer (manter compatibilidade com N8N)
  RETURN v_new_balance;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 4. Recarregar schema do PostgREST
-- ═══════════════════════════════════════════════════════════════
NOTIFY pgrst, 'reload schema';
