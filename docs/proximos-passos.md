# Vizzu - Proximos Passos

## O que ja foi feito

- [x] Migration SQL: tabelas `user_subscriptions`, `user_credits`, `credit_transactions`, `checkout_sessions`
- [x] Migration SQL: tabelas `plans` e `app_config` (planos dinamicos)
- [x] `src/hooks/planDefaults.ts` criado (fallback local)
- [x] 9 workflows N8N criados e colados no N8N:
  - 01-get-user-billing
  - 02-use-credits
  - 03-get-transactions
  - 04-checkout-status
  - 05-buy-credits
  - 06-cancel-subscription
  - 07-create-checkout
  - 08-change-plan
  - 09-stripe-webhook
- [x] **Fase 2 completa** — Frontend com planos dinamicos:
  - [x] `src/contexts/PlansContext.tsx` criado (busca planos do Supabase + fallback)
  - [x] `src/hooks/useCredits.ts` usando `usePlans()` dinamico
  - [x] `src/pages/SettingsPage.tsx` sem valores hardcoded
  - [x] `src/App.tsx` e `CreditExhaustedModal.tsx` usando planos dinamicos
  - [x] `src/main.tsx` com `<PlansProvider>` conectado

---

## ~~Fase 2: Frontend - Planos Dinamicos~~ ✅ CONCLUIDA

> Todos os itens desta fase ja foram implementados. Ver "O que ja foi feito" acima.

---

## Fase 1: Configurar N8N (backend)

### 1.1 Variaveis de ambiente no N8N
No painel do N8N, ir em Settings > Variables e criar:
- `SUPABASE_URL` = URL do projeto Supabase (ex: https://xxxx.supabase.co)
- `SUPABASE_SERVICE_KEY` = service_role key do Supabase (NAO a anon key)
- `STRIPE_SECRET_KEY` = sk_live_xxx ou sk_test_xxx do Stripe

### 1.2 Credencial Header Auth no N8N
Os workflows usam `genericCredentialType: httpHeaderAuth`. Criar uma credencial:
- Tipo: Header Auth
- Nome: qualquer (ex: "Supabase Header" / "Stripe Header")
- Cada workflow que usa Stripe precisa da credencial configurada com o header Authorization

**Alternativa**: Se der problema com credenciais, os headers ja estao hardcoded nos workflows via `$env.STRIPE_SECRET_KEY` — basta garantir que a variavel existe.

### 1.3 Ativar os workflows
- Abrir cada workflow no N8N
- Clicar no toggle para ativar (ficar verde)
- Anotar a URL do webhook de cada um (aparece no no Webhook)

### 1.4 Configurar Stripe Webhook
- No Stripe Dashboard > Developers > Webhooks
- Add endpoint: URL do workflow 09 (stripe-webhook)
- Eventos para escutar:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

### 1.5 Testar workflows
- Testar 01 (get-user-billing) com um user_id real
- Testar 07 (create-checkout) para criar uma sessao de pagamento
- Completar o checkout no Stripe e verificar se 09 (webhook) processa

---

## Fase 2: Frontend - Planos Dinamicos

### 2.1 Criar `src/contexts/PlansContext.tsx`
- Busca tabela `plans` (ORDER BY sort_order) e `app_config` do Supabase
- Mapeia snake_case para camelCase
- Separa freePlan dos paid plans
- Constroi planPersona, planCta, planIncluded a partir das colunas
- Fallback para planDefaults.ts se fetch falhar
- Expoe via `usePlans()` hook

### 2.2 Atualizar `src/hooks/useCredits.ts`
- Remove Plan interface, PLANS, FREE_PLAN, CREDIT_PACKAGES locais
- Re-exporta de planDefaults
- Internamente usa `usePlans()` para resolver currentPlan

### 2.3 Atualizar `src/pages/SettingsPage.tsx`
- Remove MASTER_FEATURES, PLAN_INCLUDED, PLAN_PERSONA, PLAN_CTA hardcoded
- Usa `const { allPlans, masterFeatures, planIncluded, planPersona, planCta } = usePlans()`

### 2.4 Atualizar `src/App.tsx` + `src/components/CreditExhaustedModal.tsx`
- App.tsx: troca `PLANS.find(p => p.id === planId)` por `plans.find(...)`
- CreditExhaustedModal: troca PLANS por usePlans()

### 2.5 Conectar provider em `src/main.tsx`
- Adiciona `<PlansProvider>` entre AuthProvider e HistoryProvider

---

## Fase 3: Conectar Frontend ao Billing

### 3.1 Variavel de ambiente no frontend
- `VITE_N8N_WEBHOOK_URL` = URL base do N8N (ex: https://n8n.vizzu.com.br/webhook)
- Ja existe em `src/lib/api/billing.ts`

### 3.2 Testar fluxo completo
- Login na app
- Ir em Settings > Planos
- Clicar em assinar um plano
- Verificar checkout Stripe abre
- Completar pagamento (modo test)
- Verificar creditos atualizaram
- Verificar mudanca de plano funciona
- Verificar cancelamento funciona

---

## Checklist final
- [ ] N8N variaveis configuradas
- [ ] N8N credenciais configuradas
- [ ] 9 workflows ativos no N8N
- [ ] Stripe webhook configurado
- [x] PlansContext.tsx criado
- [x] useCredits.ts atualizado
- [x] SettingsPage.tsx atualizado
- [x] App.tsx + CreditExhaustedModal.tsx atualizados
- [x] main.tsx com PlansProvider
- [ ] VITE_N8N_WEBHOOK_URL configurado
- [ ] Fluxo completo testado (checkout, creditos, mudanca, cancelamento)
