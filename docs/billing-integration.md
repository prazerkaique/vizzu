# Vizzu - Integração de Billing e Pagamentos

## Visão Geral

Este documento descreve a integração do sistema de billing do Vizzu com:
- Supabase (banco de dados)
- n8n (webhooks/backend)
- Stripe/Mercado Pago (gateway de pagamento)

---

## 1. Schema do Supabase

Execute o seguinte SQL no Supabase para criar as tabelas necessárias:

```sql
-- ═══════════════════════════════════════════════════════════════
-- TABELA: user_subscriptions
-- Armazena informações de assinatura do usuário
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'starter',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'unpaid')),
  billing_period TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  mercadopago_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Índices
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_stripe_id ON user_subscriptions(stripe_subscription_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);

-- RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- TABELA: user_credits
-- Armazena saldo de créditos do usuário
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_purchased INTEGER NOT NULL DEFAULT 0,
  lifetime_used INTEGER NOT NULL DEFAULT 0,
  last_renewal_credits INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits"
  ON user_credits FOR SELECT
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- TABELA: credit_transactions
-- Histórico de transações de créditos
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'renewal', 'refund', 'bonus', 'adjustment')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT NOT NULL,
  reference_id TEXT, -- ID da geração, por exemplo
  stripe_payment_intent_id TEXT,
  mercadopago_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(type);

-- RLS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- TABELA: checkout_sessions
-- Sessões de checkout pendentes
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('credits', 'subscription')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'complete', 'expired', 'failed')),
  amount INTEGER, -- Para compra de créditos
  plan_id TEXT, -- Para assinatura
  billing_period TEXT,
  stripe_session_id TEXT,
  mercadopago_preference_id TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice
CREATE INDEX idx_checkout_sessions_stripe_id ON checkout_sessions(stripe_session_id);
CREATE INDEX idx_checkout_sessions_user_id ON checkout_sessions(user_id);

-- RLS
ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkout sessions"
  ON checkout_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- FUNÇÕES AUXILIARES
-- ═══════════════════════════════════════════════════════════════

-- Função para criar usuário com créditos iniciais
CREATE OR REPLACE FUNCTION create_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_credits (user_id, balance, last_renewal_credits)
  VALUES (NEW.id, 0, 0);

  INSERT INTO user_subscriptions (user_id, plan_id, status)
  VALUES (NEW.id, 'free', 'active');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar créditos quando usuário é criado
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_credits();

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers de updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON user_credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 2. Webhooks n8n Necessários

### 2.1. `GET /vizzu/get-user-billing`
Busca informações de assinatura e créditos do usuário.

**Request:**
```json
{
  "user_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "subscription": {
    "id": "uuid",
    "user_id": "uuid",
    "plan_id": "pro",
    "status": "active",
    "billing_period": "monthly",
    "current_period_start": "2025-01-01T00:00:00Z",
    "current_period_end": "2025-02-01T00:00:00Z",
    "cancel_at_period_end": false
  },
  "credits": {
    "user_id": "uuid",
    "balance": 150,
    "lifetime_purchased": 500,
    "lifetime_used": 350,
    "last_renewal_credits": 200
  }
}
```

---

### 2.2. `POST /vizzu/create-checkout`
Cria sessão de checkout para pagamento (Stripe/Mercado Pago).

**Request:**
```json
{
  "user_id": "uuid",
  "type": "credits", // ou "subscription"
  "credit_amount": 100, // se type = credits
  "plan_id": "pro", // se type = subscription
  "billing_period": "monthly",
  "success_url": "https://app.vizzu.com/checkout/success",
  "cancel_url": "https://app.vizzu.com/checkout/cancel"
}
```

**Response:**
```json
{
  "success": true,
  "checkout": {
    "id": "cs_xxxx",
    "url": "https://checkout.stripe.com/...",
    "expires_at": "2025-01-15T12:30:00Z"
  }
}
```

**Implementação n8n:**
1. Buscar dados do usuário (email, etc)
2. Calcular preço baseado no plano atual
3. Criar sessão no Stripe:
   - Para créditos: `stripe.checkout.sessions.create` com `mode: 'payment'`
   - Para assinatura: `stripe.checkout.sessions.create` com `mode: 'subscription'`
4. Salvar sessão na tabela `checkout_sessions`
5. Retornar URL do checkout

---

### 2.3. `POST /vizzu/buy-credits`
Adiciona créditos após confirmação de pagamento (chamado pelo webhook do Stripe ou manualmente).

**Request:**
```json
{
  "user_id": "uuid",
  "amount": 100,
  "payment_intent_id": "pi_xxxx" // opcional
}
```

**Response:**
```json
{
  "success": true,
  "credits_added": 100,
  "new_balance": 250,
  "transaction_id": "uuid"
}
```

**Implementação n8n:**
1. Validar payment_intent_id no Stripe (se fornecido)
2. Atualizar `user_credits.balance += amount`
3. Atualizar `user_credits.lifetime_purchased += amount`
4. Criar registro em `credit_transactions`
5. Retornar novo saldo

---

### 2.4. `POST /vizzu/change-plan`
Altera o plano do usuário.

**Request:**
```json
{
  "user_id": "uuid",
  "new_plan_id": "pro",
  "billing_period": "monthly",
  "payment_intent_id": "pi_xxxx"
}
```

**Response:**
```json
{
  "success": true,
  "subscription": { ... },
  "credits_added": 200,
  "new_balance": 200
}
```

**Implementação n8n:**
1. Atualizar `user_subscriptions` com novo plano
2. Adicionar créditos do novo plano
3. Se for upgrade de assinatura Stripe existente, chamar `stripe.subscriptions.update`
4. Criar transação de créditos tipo 'renewal' ou 'bonus'

---

### 2.5. `POST /vizzu/use-credits`
Deduz créditos (chamado pelas APIs de geração).

**Request:**
```json
{
  "user_id": "uuid",
  "amount": 2,
  "description": "Geração: Modelo IA",
  "reference_id": "gen_xxxx"
}
```

**Response:**
```json
{
  "success": true,
  "credits_used": 2,
  "new_balance": 148,
  "transaction_id": "uuid"
}
```

---

### 2.6. `POST /vizzu/webhook-stripe`
Recebe webhooks do Stripe para eventos de pagamento.

**Eventos a tratar:**
- `checkout.session.completed` - Pagamento confirmado
- `invoice.paid` - Assinatura renovada
- `customer.subscription.updated` - Assinatura alterada
- `customer.subscription.deleted` - Assinatura cancelada

**Implementação:**
1. Validar assinatura do webhook
2. Identificar tipo de evento
3. Buscar checkout_session/subscription relacionada
4. Atualizar tabelas conforme o evento
5. Para `checkout.session.completed`:
   - Se type = 'credits': adicionar créditos
   - Se type = 'subscription': criar/atualizar assinatura

---

### 2.7. `POST /vizzu/cancel-subscription`
Cancela assinatura do usuário.

**Request:**
```json
{
  "user_id": "uuid",
  "cancel_immediately": false
}
```

**Response:**
```json
{
  "success": true,
  "cancel_at": "2025-02-01T00:00:00Z"
}
```

---

### 2.8. `POST /vizzu/get-transactions`
Busca histórico de transações.

**Request:**
```json
{
  "user_id": "uuid",
  "limit": 50,
  "offset": 0
}
```

**Response:**
```json
{
  "success": true,
  "transactions": [...],
  "total": 150
}
```

---

## 3. Integração com Stripe

### 3.1. Produtos e Preços no Stripe

Criar os seguintes produtos no Stripe Dashboard:

| Produto | Preço Mensal | Preço Anual | Tipo |
|---------|--------------|-------------|------|
| Vizzu Starter | R$ 129,90 | R$ 1.198,80 | Assinatura |
| Vizzu Pro | R$ 189,90 | R$ 1.918,80 | Assinatura |
| Vizzu Premier | R$ 299,00 | R$ 3.108,00 | Assinatura |
| Créditos Avulsos | Dinâmico | - | Pagamento único |

### 3.2. Variáveis de Ambiente

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_PREMIER_MONTHLY=price_...
STRIPE_PRICE_PREMIER_YEARLY=price_...
```

### 3.3. Fluxo de Checkout

```
[Usuário clica "Comprar"]
        ↓
[Frontend chama /create-checkout]
        ↓
[n8n cria Stripe Checkout Session]
        ↓
[Retorna URL do checkout]
        ↓
[Usuário é redirecionado ao Stripe]
        ↓
[Pagamento processado]
        ↓
[Stripe envia webhook]
        ↓
[n8n recebe /webhook-stripe]
        ↓
[n8n atualiza banco de dados]
        ↓
[Frontend atualiza via refresh]
```

---

## 4. Fallback e Modo Demo

O sistema foi projetado para funcionar em modo offline/demo quando:
- `userId` não está disponível (usuário não autenticado)
- Backend não responde (fallback para localStorage)

Nestes casos:
- Créditos são gerenciados localmente
- Compras/upgrades funcionam instantaneamente (simulado)
- Dados são persistidos no localStorage

---

## 5. Próximos Passos

1. [ ] Executar SQL no Supabase
2. [ ] Criar workflows n8n para cada endpoint
3. [ ] Configurar conta Stripe e criar produtos/preços
4. [ ] Configurar webhook do Stripe para `/vizzu/webhook-stripe`
5. [ ] Testar fluxo completo em ambiente de staging
6. [ ] Migrar para produção
