# Guia Passo a Passo: Integrar Stripe ao Vizzu

## Visao Geral

O Vizzu ja tem todo o frontend preparado para Stripe (tipos, fluxo de checkout, modais).
O que falta e:
1. Criar conta e produtos no Stripe
2. Criar tabelas no Supabase
3. Configurar webhooks no N8N
4. Conectar tudo

---

## PARTE 1 — Criar Conta Stripe

### 1.1 Cadastro
1. Acesse [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Crie a conta com seu email
3. Confirme o email
4. Voce comeca no **modo teste** (perfeito para configurar tudo)

### 1.2 Ativar conta brasileira
1. No Dashboard Stripe, va em **Settings > Business details**
2. Preencha:
   - Pais: Brasil
   - Tipo de empresa: Individual / Empresa (conforme seu caso)
   - CNPJ ou CPF
   - Endereco comercial
   - Conta bancaria para receber (Stripe deposita via TED/Pix)
3. **Nao precisa ativar agora** — pode configurar tudo em modo teste primeiro

### 1.3 Copiar chaves de API
1. Va em **Developers > API keys**
2. Copie:
   - **Publishable key**: `pk_test_...` (usada no frontend, pode ser publica)
   - **Secret key**: `sk_test_...` (usada APENAS no backend/N8N, NUNCA no frontend)
3. Guarde as duas em local seguro

> **IMPORTANTE**: A secret key NUNCA deve aparecer no codigo do frontend.
> Ela sera usada apenas nos workflows do N8N.

---

## PARTE 2 — Criar Produtos e Precos no Stripe

### 2.1 Criar os 4 Produtos

No Stripe Dashboard, va em **Product Catalog > Add product**.
Crie cada produto conforme abaixo:

#### Produto 1: Vizzu Basic
- **Nome**: Vizzu Basic
- **Descricao**: 40 geracoes/mes, resolucao 2K, ate 5.000 produtos
- Adicionar **2 precos**:
  - Preco mensal: R$ 127,00 / mes (Recurring > Monthly)
  - Preco anual: R$ 1.218,96 / ano (Recurring > Yearly) — equivale a R$ 101,58/mes (20% desconto)

#### Produto 2: Vizzu Pro
- **Nome**: Vizzu Pro
- **Descricao**: 100 geracoes/mes, resolucao 2K + 4K, ate 10.000 produtos
- Adicionar **2 precos**:
  - Preco mensal: R$ 187,00 / mes
  - Preco anual: R$ 1.794,96 / ano — equivale a R$ 149,58/mes (20% desconto)

#### Produto 3: Vizzu Premier
- **Nome**: Vizzu Premier
- **Descricao**: 200 geracoes/mes, resolucao 4K, ate 50.000 produtos
- Adicionar **2 precos**:
  - Preco mensal: R$ 327,00 / mes
  - Preco anual: R$ 3.138,96 / ano — equivale a R$ 261,58/mes (20% desconto)

#### Produto 4: Vizzu Enterprise
- **Nome**: Vizzu Enterprise
- **Descricao**: 400 geracoes/mes, resolucao 4K, produtos ilimitados, API dedicada
- Adicionar **2 precos**:
  - Preco mensal: R$ 677,00 / mes
  - Preco anual: R$ 6.498,96 / ano — equivale a R$ 541,58/mes (20% desconto)

#### Produto 5: Creditos Avulsos
- **Nome**: Vizzu Creditos
- **Descricao**: Pacote de creditos avulsos
- Adicionar **4 precos** (one-time, NAO recurring):
  - 10 creditos: preco variavel conforme plano (Basic R$ 35, Pro R$ 30, Premier R$ 25, Enterprise R$ 20)
  - 25 creditos: preco variavel conforme plano
  - 50 creditos: preco variavel conforme plano
  - 100 creditos: preco variavel conforme plano

> **Dica**: Cada preco criado gera um `price_id` (ex: `price_1Abc123...`).
> Anote todos os IDs — voce vai usa-los no N8N.

### 2.2 Anotar os Price IDs

Crie uma tabela assim para referencia:

```
PLANO           | PERIODO  | PRICE ID
----------------|----------|------------------
Basic           | Mensal   | price_xxx...
Basic           | Anual    | price_xxx...
Pro             | Mensal   | price_xxx...
Pro             | Anual    | price_xxx...
Premier         | Mensal   | price_xxx...
Premier         | Anual    | price_xxx...
Enterprise      | Mensal   | price_xxx...
Enterprise      | Anual    | price_xxx...
Creditos 10     | Unico    | price_xxx...
Creditos 25     | Unico    | price_xxx...
Creditos 50     | Unico    | price_xxx...
Creditos 100    | Unico    | price_xxx...
```

---

## PARTE 3 — Criar Tabelas no Supabase

Execute o SQL abaixo no **Supabase Dashboard > SQL Editor**.
Rode cada bloco separadamente.

### 3.1 Tabela de Assinaturas

```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'trial',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'unpaid')),
  billing_period TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_period IN ('monthly', 'yearly')),
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indice para buscar por usuario
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- Indice para buscar por stripe_subscription_id (webhook)
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON subscriptions FOR ALL
  USING (auth.role() = 'service_role');
```

### 3.2 Tabela de Creditos

```sql
CREATE TABLE IF NOT EXISTS user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
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

CREATE POLICY "Service role can manage credits"
  ON user_credits FOR ALL
  USING (auth.role() = 'service_role');
```

### 3.3 Tabela de Transacoes

```sql
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL
    CHECK (type IN ('purchase', 'usage', 'renewal', 'refund', 'bonus', 'adjustment')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  reference_id TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indice para buscar por usuario + ordenar por data
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user
  ON credit_transactions(user_id, created_at DESC);

-- RLS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage transactions"
  ON credit_transactions FOR ALL
  USING (auth.role() = 'service_role');
```

### 3.4 Adicionar campo credits na tabela users (se nao existir)

```sql
-- Verifica se a coluna credits ja existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'credits'
  ) THEN
    ALTER TABLE users ADD COLUMN credits INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'plan_id'
  ) THEN
    ALTER TABLE users ADD COLUMN plan_id TEXT DEFAULT 'trial';
  END IF;
END $$;
```

---

## PARTE 4 — Configurar Webhook do Stripe

### 4.1 Criar endpoint no N8N

No N8N, crie um novo workflow chamado **"Stripe Webhook Handler"**.

1. Adicione um node **Webhook**:
   - Method: POST
   - Path: `/vizzu/stripe-webhook`
   - Copie a URL gerada (ex: `https://seu-n8n.com/webhook/vizzu/stripe-webhook`)

### 4.2 Registrar webhook no Stripe

1. No Stripe Dashboard, va em **Developers > Webhooks**
2. Clique **Add endpoint**
3. Cole a URL do N8N
4. Selecione os eventos para escutar:
   - `checkout.session.completed` — pagamento confirmado
   - `invoice.payment_succeeded` — renovacao mensal paga
   - `invoice.payment_failed` — falha na renovacao
   - `customer.subscription.updated` — plano alterado
   - `customer.subscription.deleted` — assinatura cancelada
5. Clique **Add endpoint**
6. Copie o **Signing secret** (`whsec_...`) — usado para verificar que o webhook veio do Stripe

> **Signing secret** deve ser configurado no N8N para validar as requisicoes.

---

## PARTE 5 — Workflows N8N

Voce precisa de **3 workflows principais** no N8N:

### 5.1 Workflow: Criar Checkout Session

**Trigger**: Webhook POST `/vizzu/create-checkout`

**Fluxo**:
```
Webhook recebe request
  |
  v
Verificar parametros (user_id, type, plan_id ou credit_amount)
  |
  v
Stripe: Create Customer (se nao existir)
  -> Buscar no Supabase se user ja tem stripe_customer_id
  -> Se nao tem, criar customer no Stripe e salvar ID no Supabase
  |
  v
Stripe: Create Checkout Session
  -> mode: 'subscription' (para planos) ou 'payment' (para creditos)
  -> price: price_id correspondente ao plano/pacote
  -> customer: stripe_customer_id
  -> success_url: URL de retorno com {CHECKOUT_SESSION_ID}
  -> cancel_url: URL de cancelamento
  -> metadata: { user_id, plan_id ou credit_amount }
  |
  v
Retornar { success: true, checkout: { id, url, expires_at } }
```

**Nodes N8N necessarios**:
1. Webhook (trigger)
2. Supabase (buscar stripe_customer_id)
3. IF (customer existe?)
4. Stripe (create customer) — se nao existe
5. Supabase (salvar stripe_customer_id)
6. Stripe (create checkout session)
7. Respond to Webhook

### 5.2 Workflow: Stripe Webhook Handler

**Trigger**: Webhook POST `/vizzu/stripe-webhook`

**Fluxo para `checkout.session.completed`**:
```
Webhook recebe evento do Stripe
  |
  v
Verificar signing secret (validar assinatura)
  |
  v
Switch por event.type:
  |
  |-- checkout.session.completed
  |     |
  |     v
  |   Extrair metadata (user_id, plan_id, credit_amount)
  |     |
  |     v
  |   IF type == 'subscription':
  |     -> Criar/atualizar registro em subscriptions
  |     -> Adicionar creditos do plano em user_credits
  |     -> Atualizar plan_id e credits na tabela users
  |     -> Registrar transacao (type: 'purchase')
  |   ELSE (creditos avulsos):
  |     -> Adicionar creditos em user_credits
  |     -> Atualizar credits na tabela users
  |     -> Registrar transacao (type: 'purchase')
  |
  |-- invoice.payment_succeeded (renovacao mensal)
  |     -> Buscar subscription pelo stripe_subscription_id
  |     -> Renovar creditos (adicionar limit do plano)
  |     -> Atualizar current_period_start/end
  |     -> Registrar transacao (type: 'renewal')
  |
  |-- invoice.payment_failed
  |     -> Atualizar subscription status para 'past_due'
  |     -> (Opcional) Enviar email de aviso
  |
  |-- customer.subscription.deleted
  |     -> Atualizar subscription status para 'canceled'
  |     -> Mudar plan_id para 'trial' na tabela users
```

**Nodes N8N necessarios**:
1. Webhook (trigger)
2. Code (verificar signing secret)
3. Switch (por event.type)
4. Supabase (varias operacoes CRUD)
5. Respond to Webhook (retornar 200 OK)

### 5.3 Workflow: Operacoes de Credito

**Endpoints agrupados num so workflow com Switch**:

| Endpoint | O que faz |
|----------|-----------|
| `/vizzu/get-user-billing` | Busca subscription + credits do usuario no Supabase |
| `/vizzu/use-credits` | Debita creditos, registra transacao, retorna novo saldo |
| `/vizzu/buy-credits` | Adiciona creditos (pos-pagamento), registra transacao |
| `/vizzu/change-plan` | Cria checkout para novo plano |
| `/vizzu/cancel-subscription` | Cancela no Stripe + atualiza Supabase |
| `/vizzu/get-transactions` | Lista historico de transacoes |
| `/vizzu/checkout-status` | Verifica status de sessao de checkout |

---

## PARTE 6 — Variavel de Ambiente

### 6.1 No Vercel (frontend)

Va em **Vercel > Project Settings > Environment Variables** e adicione:

```
VITE_N8N_WEBHOOK_URL = https://seu-n8n.com/webhook
```

Essa variavel ja e lida pelo codigo em `src/lib/api/billing.ts`.

> **NAO** adicione a secret key do Stripe no Vercel. Ela fica apenas no N8N.

### 6.2 No N8N (backend)

Configure como credentials ou environment variables:

```
STRIPE_SECRET_KEY = sk_test_...
STRIPE_WEBHOOK_SECRET = whsec_...
SUPABASE_URL = https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJ...
```

> Use a **service_role key** do Supabase no N8N (nao a anon key).
> Ela permite CRUD em todas as tabelas sem RLS.
> Va em Supabase > Settings > API para copiar.

---

## PARTE 7 — Testar Tudo

### 7.1 Modo teste do Stripe

O Stripe tem cartoes de teste:
- **Pagamento aprovado**: `4242 4242 4242 4242` (qualquer data futura, qualquer CVC)
- **Pagamento recusado**: `4000 0000 0000 0002`
- **Requer autenticacao**: `4000 0025 0000 3155`

### 7.2 Checklist de testes

```
[ ] 1. Criar conta Stripe e copiar chaves
[ ] 2. Criar 4 produtos + precos no Stripe
[ ] 3. Rodar SQL das 3 tabelas no Supabase
[ ] 4. Configurar webhook no N8N (create-checkout)
[ ] 5. Configurar webhook handler no N8N (stripe-webhook)
[ ] 6. Registrar webhook endpoint no Stripe
[ ] 7. Adicionar VITE_N8N_WEBHOOK_URL no Vercel
[ ] 8. Testar assinatura Basic com cartao de teste
[ ] 9. Verificar se creditos foram adicionados no Supabase
[ ] 10. Testar compra de creditos avulsos
[ ] 11. Testar renovacao (Stripe CLI: stripe trigger invoice.payment_succeeded)
[ ] 12. Testar cancelamento
```

### 7.3 Stripe CLI (opcional, para testes locais)

```bash
# Instalar Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login
stripe login

# Escutar eventos e encaminhar para N8N local
stripe listen --forward-to https://seu-n8n.com/webhook/vizzu/stripe-webhook

# Simular eventos
stripe trigger checkout.session.completed
stripe trigger invoice.payment_succeeded
```

---

## PARTE 8 — Ir para Producao

Quando tudo estiver funcionando em modo teste:

1. No Stripe Dashboard, ative o modo **Live**
2. Copie as novas chaves (`pk_live_...` e `sk_live_...`)
3. Atualize no N8N as credentials para as chaves live
4. Crie os mesmos produtos/precos em modo live (ou use a opcao de copiar)
5. Atualize o webhook endpoint para o mesmo URL mas com o novo signing secret
6. Atualize `VITE_N8N_WEBHOOK_URL` no Vercel se necessario

> **CUIDADO**: Em producao, cobracas sao REAIS. Teste bem antes.

---

## Resumo da Arquitetura

```
Usuario clica "Assinar Pro"
       |
       v
Frontend (billing.ts)
  POST /vizzu/create-checkout
       |
       v
N8N Workflow
  -> Cria customer no Stripe (se nao existir)
  -> Cria Checkout Session no Stripe
  -> Retorna URL do checkout
       |
       v
Frontend redireciona para Stripe Checkout
  -> Usuario paga
       |
       v
Stripe envia webhook para N8N
  POST /vizzu/stripe-webhook
  evento: checkout.session.completed
       |
       v
N8N Webhook Handler
  -> Cria subscription no Supabase
  -> Adiciona creditos
  -> Atualiza tabela users
       |
       v
Frontend recarrega dados
  -> useCredits busca saldo atualizado do Supabase
  -> Usuario ve creditos novos
```

---

## Mapeamento Codigo Existente <> Stripe

| Arquivo no Vizzu | Funcao | Status |
|---|---|---|
| `src/lib/api/billing.ts` | API client — chama N8N | Pronto, so precisa da URL |
| `src/hooks/useCredits.ts` | Hook de creditos/planos | Pronto, sincroniza com Supabase |
| `src/components/CreditExhaustedModal.tsx` | Modal de creditos esgotados | Pronto |
| `src/pages/SettingsPage.tsx` | Tela de planos e upgrade | Pronto (toast "nao implementado" some quando N8N responder) |
| N8N workflows | Backend de pagamento | **A CRIAR** |
| Supabase tabelas | subscriptions, user_credits, credit_transactions | **A CRIAR** (SQL acima) |
| Stripe products | 4 planos (Basic/Pro/Premier/Enterprise) + creditos avulsos (10/25/50/100) | **A CRIAR** (passo 2) |
