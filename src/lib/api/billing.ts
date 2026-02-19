// ═══════════════════════════════════════════════════════════════
// VIZZU - Billing API
// Gerenciamento de assinaturas, créditos e pagamentos
// Preparado para integração com Stripe/Mercado Pago
// ═══════════════════════════════════════════════════════════════

const N8N_BASE_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '';

// ═══════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'unpaid';
  billing_period: 'monthly' | 'yearly';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  created_at: string;
  updated_at: string;
}

export interface UserCredits {
  user_id: string;
  balance: number;
  edit_balance: number;
  lifetime_purchased: number;
  lifetime_used: number;
  last_renewal_credits: number;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  type: 'purchase' | 'usage' | 'plan_reset' | 'refund' | 'bonus';
  amount: number;
  balance_after: number;
  description: string;
  reference_id?: string;
  stripe_payment_intent_id?: string;
  created_at: string;
}

export interface CheckoutSession {
  id: string;
  url: string;
  expires_at: string;
}

// ═══════════════════════════════════════════════════════════════
// BUSCAR DADOS DO USUÁRIO
// ═══════════════════════════════════════════════════════════════

interface GetUserBillingParams {
  userId: string;
}

interface GetUserBillingResponse {
  success: boolean;
  subscription?: UserSubscription;
  credits?: UserCredits;
  error?: string;
}

/**
 * Busca informações de assinatura e créditos do usuário
 */
export async function getUserBilling(params: GetUserBillingParams): Promise<GetUserBillingResponse> {
  const response = await fetch(`${N8N_BASE_URL}/vizzu/get-user-billing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: params.userId,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao buscar dados de billing');
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════
// CRIAR CHECKOUT SESSION (STRIPE/MERCADO PAGO)
// ═══════════════════════════════════════════════════════════════

interface CreateCheckoutParams {
  userId: string;
  type: 'credits' | 'subscription';
  // Para compra de créditos
  creditAmount?: number;
  // Para assinatura
  planId?: string;
  billingPeriod?: 'monthly' | 'yearly';
  // URLs de retorno
  successUrl?: string;
  cancelUrl?: string;
}

interface CreateCheckoutResponse {
  success: boolean;
  checkout?: CheckoutSession;
  error?: string;
}

/**
 * Cria uma sessão de checkout para pagamento
 * Retorna URL para redirecionar o usuário ao gateway de pagamento
 */
export async function createCheckoutSession(params: CreateCheckoutParams): Promise<CreateCheckoutResponse> {
  const response = await fetch(`${N8N_BASE_URL}/vizzu/create-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: params.userId,
      type: params.type,
      credit_amount: params.creditAmount,
      plan_id: params.planId,
      billing_period: params.billingPeriod,
      success_url: params.successUrl || `${window.location.origin}/checkout/success`,
      cancel_url: params.cancelUrl || `${window.location.origin}/checkout/cancel`,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao criar checkout');
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════
// COMPRAR CRÉDITOS (DIRETO - SEM CHECKOUT EXTERNO)
// Para casos onde o pagamento já foi processado ou é simulado
// ═══════════════════════════════════════════════════════════════

interface BuyCreditsParams {
  userId: string;
  amount: number;
  paymentIntentId?: string; // ID do pagamento no Stripe (se aplicável)
}

interface BuyCreditsResponse {
  success: boolean;
  credits_added: number;
  new_balance: number;
  transaction_id: string;
  error?: string;
}

/**
 * Adiciona créditos à conta do usuário
 * Chamado após confirmação de pagamento
 */
export async function buyCredits(params: BuyCreditsParams): Promise<BuyCreditsResponse> {
  const response = await fetch(`${N8N_BASE_URL}/vizzu/buy-credits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: params.userId,
      amount: params.amount,
      payment_intent_id: params.paymentIntentId,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao comprar créditos');
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════
// UPGRADE/DOWNGRADE DE PLANO
// ═══════════════════════════════════════════════════════════════

interface ChangePlanParams {
  userId: string;
  newPlanId: string;
  billingPeriod: 'monthly' | 'yearly';
  paymentIntentId?: string;
}

interface ChangePlanResponse {
  success: boolean;
  subscription?: UserSubscription;
  credits_added?: number;
  new_balance?: number;
  error?: string;
}

/**
 * Altera o plano do usuário
 */
export async function changePlan(params: ChangePlanParams): Promise<ChangePlanResponse> {
  const response = await fetch(`${N8N_BASE_URL}/vizzu/change-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: params.userId,
      new_plan_id: params.newPlanId,
      billing_period: params.billingPeriod,
      payment_intent_id: params.paymentIntentId,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao alterar plano');
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════
// CANCELAR ASSINATURA
// ═══════════════════════════════════════════════════════════════

interface CancelSubscriptionParams {
  userId: string;
  cancelImmediately?: boolean; // Se true, cancela imediatamente. Se false, cancela no fim do período
}

interface CancelSubscriptionResponse {
  success: boolean;
  cancel_at: string;
  error?: string;
}

/**
 * Cancela a assinatura do usuário
 */
export async function cancelSubscription(params: CancelSubscriptionParams): Promise<CancelSubscriptionResponse> {
  const response = await fetch(`${N8N_BASE_URL}/vizzu/cancel-subscription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: params.userId,
      cancel_immediately: params.cancelImmediately || false,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Erro ao cancelar assinatura');
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════
// HISTÓRICO DE TRANSAÇÕES
// ═══════════════════════════════════════════════════════════════

interface GetTransactionsParams {
  userId: string;
  limit?: number;
  offset?: number;
}

interface GetTransactionsResponse {
  success: boolean;
  transactions: CreditTransaction[];
  total: number;
  error?: string;
}

/**
 * Busca histórico de transações de créditos
 */
export async function getCreditTransactions(params: GetTransactionsParams): Promise<GetTransactionsResponse> {
  const response = await fetch(`${N8N_BASE_URL}/vizzu/get-transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: params.userId,
      limit: params.limit || 50,
      offset: params.offset || 0,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao buscar transações');
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════
// VERIFICAR STATUS DO CHECKOUT
// ═══════════════════════════════════════════════════════════════

interface CheckCheckoutStatusParams {
  sessionId: string;
}

interface CheckCheckoutStatusResponse {
  success: boolean;
  status: 'pending' | 'complete' | 'expired' | 'failed';
  error?: string;
}

/**
 * Verifica o status de uma sessão de checkout
 */
export async function checkCheckoutStatus(params: CheckCheckoutStatusParams): Promise<CheckCheckoutStatusResponse> {
  const response = await fetch(`${N8N_BASE_URL}/vizzu/checkout-status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session_id: params.sessionId,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao verificar status do checkout');
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════
// HELPER: CALCULAR DIAS ATÉ RENOVAÇÃO
// ═══════════════════════════════════════════════════════════════

export function calculateDaysUntilRenewal(subscription?: UserSubscription): number {
  if (!subscription?.current_period_end) return 30;

  const endDate = new Date(subscription.current_period_end);
  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

// ═══════════════════════════════════════════════════════════════
// BUSCAR FATURAS (STRIPE INVOICES)
// ═══════════════════════════════════════════════════════════════

export interface StripeInvoice {
  id: string;
  number: string | null;
  created: number;       // Unix timestamp
  amount_paid: number;   // Em centavos
  currency: string;
  status: string;        // paid, open, draft, void, uncollectible
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  description: string | null;
}

/**
 * Busca faturas do Stripe para o usuário
 */
export async function getInvoices(stripeCustomerId: string): Promise<StripeInvoice[]> {
  try {
    const response = await fetch(`${N8N_BASE_URL}/vizzu/get-invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stripe_customer_id: stripeCustomerId }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.warn('Erro ao buscar invoices:', data.error);
      return [];
    }

    return data.invoices || [];
  } catch (err) {
    console.warn('Erro ao buscar invoices:', err);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER: VERIFICAR SE PODE USAR CRÉDITOS
// ═══════════════════════════════════════════════════════════════

export function canUseCredits(credits: UserCredits | undefined, amount: number): boolean {
  if (!credits) return false;
  return credits.balance >= amount;
}
