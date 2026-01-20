# Vizzu - Workflows n8n para Billing

Este diretório contém todos os workflows n8n necessários para o sistema de billing do Vizzu.

## Workflows Disponíveis

| # | Arquivo | Endpoint | Descrição |
|---|---------|----------|-----------|
| 01 | `01-get-user-billing.json` | `POST /vizzu/get-user-billing` | Busca assinatura e créditos do usuário |
| 02 | `02-create-checkout.json` | `POST /vizzu/create-checkout` | Cria sessão de checkout Stripe |
| 03 | `03-webhook-stripe.json` | `POST /vizzu/webhook-stripe` | Recebe webhooks do Stripe |
| 04 | `04-buy-credits.json` | `POST /vizzu/buy-credits` | Adiciona créditos (pós-pagamento) |
| 05 | `05-use-credits.json` | `POST /vizzu/use-credits` | Deduz créditos (usado pelas APIs de geração) |
| 06 | `06-change-plan.json` | `POST /vizzu/change-plan` | Altera plano (pós-pagamento) |
| 07 | `07-cancel-subscription.json` | `POST /vizzu/cancel-subscription` | Cancela assinatura |
| 08 | `08-get-transactions.json` | `POST /vizzu/get-transactions` | Histórico de transações |
| 09 | `09-checkout-status.json` | `POST /vizzu/checkout-status` | Verifica status do checkout |

## Como Importar

1. Acesse seu n8n (`https://n8nwebhook.brainia.store`)
2. Clique em **Workflows** → **Add Workflow** → **Import from File**
3. Selecione o arquivo JSON desejado
4. Clique em **Import**
5. **Configure as credenciais** (veja abaixo)
6. **Ative o workflow**

## Credenciais Necessárias

### 1. Supabase DB (PostgreSQL)

Crie uma credencial do tipo **Postgres** com:

```
Host: db.dbdqiqehuapcicejnzyd.supabase.co
Database: postgres
User: postgres
Password: [sua senha do Supabase]
Port: 5432
SSL: true
```

**Nome da credencial:** `Supabase DB`

### 2. Stripe API

Crie uma credencial do tipo **Stripe API** com:

```
Secret Key: sk_live_... (ou sk_test_... para testes)
```

**Nome da credencial:** `Stripe API`

### 3. Variáveis de Ambiente (opcional)

Configure no n8n:

```
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Configuração do Stripe

### 1. Criar Produtos e Preços

No Stripe Dashboard, crie os seguintes produtos:

| Produto | Preço Mensal (BRL) | Preço Anual (BRL) |
|---------|-------------------|-------------------|
| Vizzu Starter | R$ 129,90 | R$ 1.198,80 |
| Vizzu Pro | R$ 189,90 | R$ 1.918,80 |
| Vizzu Premier | R$ 299,00 | R$ 3.108,00 |

### 2. Atualizar IDs dos Preços

No workflow `02-create-checkout.json`, atualize o nó **"Prepare Subscription Data"** com os IDs reais:

```javascript
const PLAN_PRICES = {
  'starter': {
    'monthly': 'price_XXXXXXXX', // Substituir
    'yearly': 'price_XXXXXXXX'   // Substituir
  },
  'pro': {
    'monthly': 'price_XXXXXXXX', // Substituir
    'yearly': 'price_XXXXXXXX'   // Substituir
  },
  'premier': {
    'monthly': 'price_XXXXXXXX', // Substituir
    'yearly': 'price_XXXXXXXX'   // Substituir
  }
};
```

### 3. Configurar Webhook do Stripe

1. Acesse Stripe Dashboard → **Developers** → **Webhooks**
2. Clique em **Add endpoint**
3. URL: `https://n8nwebhook.brainia.store/webhook/vizzu/webhook-stripe`
4. Selecione os eventos:
   - `checkout.session.completed`
   - `invoice.paid`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copie o **Signing secret** e configure no n8n

## Ordem de Importação

Recomendamos importar na seguinte ordem:

1. `01-get-user-billing.json` (base)
2. `05-use-credits.json` (usado pelas APIs de geração)
3. `04-buy-credits.json`
4. `06-change-plan.json`
5. `02-create-checkout.json` (depende do Stripe)
6. `03-webhook-stripe.json` (depende do Stripe)
7. `07-cancel-subscription.json`
8. `08-get-transactions.json`
9. `09-checkout-status.json`

## SQL do Supabase

Antes de usar os workflows, execute o SQL em `docs/billing-integration.md` para criar as tabelas necessárias:

- `user_subscriptions`
- `user_credits`
- `credit_transactions`
- `checkout_sessions`

## Testando

### Testar localmente (sem Stripe)

Os workflows `04-buy-credits.json` e `06-change-plan.json` podem ser chamados diretamente para adicionar créditos/mudar plano sem passar pelo checkout.

```bash
# Adicionar 100 créditos
curl -X POST https://n8nwebhook.brainia.store/webhook/vizzu/buy-credits \
  -H "Content-Type: application/json" \
  -d '{"user_id": "uuid-do-usuario", "amount": 100}'

# Mudar para plano Pro
curl -X POST https://n8nwebhook.brainia.store/webhook/vizzu/change-plan \
  -H "Content-Type: application/json" \
  -d '{"user_id": "uuid-do-usuario", "new_plan_id": "pro", "billing_period": "monthly"}'
```

### Testar com Stripe (modo teste)

1. Use a chave `sk_test_...` nas credenciais
2. Use cartões de teste do Stripe: `4242 4242 4242 4242`
3. Verifique os logs no Stripe Dashboard

## Troubleshooting

### Erro de credencial

Se aparecer erro "Credential not found", verifique se o nome da credencial está exatamente como especificado:
- `Supabase DB` (para Postgres)
- `Stripe API` (para Stripe)

### Webhook não recebe eventos

1. Verifique se o workflow está **ativo**
2. Verifique a URL do webhook no Stripe
3. Verifique o signing secret
4. Teste com `stripe trigger checkout.session.completed`

### Créditos não são adicionados

1. Verifique se o `user_id` existe na tabela `user_credits`
2. Verifique os logs do workflow no n8n
3. Verifique se o webhook do Stripe está configurado corretamente
