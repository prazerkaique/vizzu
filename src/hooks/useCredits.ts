import { useState, useEffect, useCallback } from 'react';
import { getUserBilling, createCheckoutSession, buyCredits, changePlan, calculateDaysUntilRenewal, UserSubscription, UserCredits } from '../lib/api/billing';
import { supabase } from '../services/supabaseClient';

// ═══════════════════════════════════════════════════════════════
// TIPOS E CONSTANTES
// ═══════════════════════════════════════════════════════════════

export interface Plan {
  id: string;
  name: string;
  limit: number;
  priceMonthly: number;
  priceYearly: number;
  creditPrice: number;
  badge?: string;
  badgeColor?: string;
  features: string[];
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    limit: 400,
    priceMonthly: 149.90,
    priceYearly: 124.92, // R$ 1.499/ano = R$ 124,92/mês (17% desconto)
    creditPrice: 0.45,
    features: [
      'Fundo de Estúdio',
      'Fotos para Reels e Stories',
      'Modelo IA Feito sob medida',
      'Vizzu Provador',
      'Vizzu Studio',
      'Dashboard',
      'Cenário Criativo',
      'Gerador de Legendas para Redes Sociais',
      'Catálogo Virtual com venda para Whatsapp',
      'Atendente Receptivo de Whatsapp'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    limit: 800,
    priceMonthly: 279.90,
    priceYearly: 233.25, // R$ 2.799/ano = R$ 233,25/mês (17% desconto)
    creditPrice: 0.39,
    badge: 'POPULAR',
    badgeColor: 'fuchsia',
    features: [
      'Todas do Starter, mais:',
      'Geração de Vídeos para Instagram com modelos',
      'Agente Receptivo de Whatsapp',
      'Todas as funcionalidades exceto integração com e-commerces'
    ],
    highlight: true
  },
  {
    id: 'premier',
    name: 'Premier',
    limit: 1500,
    priceMonthly: 449.90,
    priceYearly: 374.92, // R$ 4.499/ano = R$ 374,92/mês (17% desconto)
    creditPrice: 0.35,
    badge: 'MELHOR VALOR',
    badgeColor: 'amber',
    features: [
      'Todas as funcionalidades desbloqueadas',
      'Integração com e-commerces',
      'Suporte prioritário'
    ]
  }
];

// Plano padrão para usuários não autenticados ou em fallback
const DEFAULT_PLAN = PLANS[1]; // Pro
const FREE_PLAN: Plan = {
  id: 'free',
  name: 'Free',
  limit: 50, // 50 créditos iniciais para testar
  priceMonthly: 0,
  priceYearly: 0,
  creditPrice: 0.50, // Preço para compras avulsas (usuário free)
  features: ['50 créditos para testar', 'Sem renovação mensal']
};

export const CREDIT_PACKAGES = [50, 100, 200, 500];

// ═══════════════════════════════════════════════════════════════
// LOCAL STORAGE (FALLBACK)
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY = 'vizzu_credits_data';

interface LocalCreditsData {
  credits: number;
  planId: string;
  billingPeriod: 'monthly' | 'yearly';
}

const getStoredData = (): LocalCreditsData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading credits data:', e);
  }
  return { credits: 800, planId: 'pro', billingPeriod: 'monthly' };
};

const saveLocalData = (data: LocalCreditsData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving credits data:', e);
  }
};

// ═══════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════

interface UseCreditsOptions {
  userId?: string;
  enableBackend?: boolean; // Se true, sincroniza com backend
}

export const useCredits = (options: UseCreditsOptions = {}) => {
  const { userId, enableBackend = true } = options;

  // Estados
  const [localData, setLocalData] = useState<LocalCreditsData>(getStoredData);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [creditsData, setCreditsData] = useState<UserCredits | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  // Determinar plano atual
  const currentPlan = subscription
    ? PLANS.find(p => p.id === subscription.plan_id) || DEFAULT_PLAN
    : PLANS.find(p => p.id === localData.planId) || DEFAULT_PLAN;

  // Determinar créditos atuais
  const userCredits = creditsData?.balance ?? localData.credits;

  // Período de cobrança
  const billingPeriod = subscription?.billing_period ?? localData.billingPeriod;

  // Dias até renovação
  const daysUntilRenewal = subscription ? calculateDaysUntilRenewal(subscription) : 30;

  // ═══════════════════════════════════════════════════════════════
  // CARREGAR DADOS DO SUPABASE (direto, sem N8N)
  // ═══════════════════════════════════════════════════════════════

  const loadBillingData = useCallback(async () => {
    if (!userId || !enableBackend) return;

    setIsLoading(true);
    setError(null);

    try {
      // Buscar créditos e plano direto da tabela users no Supabase
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('credits, plan_id')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user credits from Supabase:', userError);
        throw userError;
      }

      if (userData) {
        const credits = userData.credits ?? 0;
        const planId = userData.plan_id ?? 'pro';

        // Atualizar estado de créditos
        setCreditsData({
          user_id: userId,
          balance: credits,
          lifetime_purchased: 0,
          lifetime_used: 0,
          last_renewal_credits: 0,
          updated_at: new Date().toISOString(),
        });

        // Sincronizar com localStorage
        setLocalData(prev => ({
          ...prev,
          credits: credits,
          planId: planId,
        }));
      }
    } catch (e: any) {
      console.error('Error loading billing data:', e);
      setError(e.message);
      // Fallback para dados locais
    } finally {
      setIsLoading(false);
    }
  }, [userId, enableBackend]);

  // Carregar dados ao montar ou quando userId mudar
  useEffect(() => {
    loadBillingData();
  }, [loadBillingData]);

  // Salvar dados locais quando mudarem
  useEffect(() => {
    saveLocalData(localData);
  }, [localData]);

  // ═══════════════════════════════════════════════════════════════
  // COMPRAR CRÉDITOS
  // ═══════════════════════════════════════════════════════════════

  const purchaseCredits = useCallback(async (amount: number): Promise<{ success: boolean; checkoutUrl?: string; error?: string }> => {
    if (!userId) {
      // Modo offline/demo - adiciona localmente
      setLocalData(prev => ({ ...prev, credits: prev.credits + amount }));
      return { success: true };
    }

    setIsCheckoutLoading(true);

    try {
      // Criar sessão de checkout
      const result = await createCheckoutSession({
        userId,
        type: 'credits',
        creditAmount: amount,
      });

      if (result.success && result.checkout?.url) {
        // Redirecionar para checkout ou retornar URL
        return { success: true, checkoutUrl: result.checkout.url };
      } else {
        throw new Error('Não foi possível criar sessão de checkout');
      }
    } catch (e: any) {
      console.error('Error creating checkout:', e);
      return { success: false, error: e.message };
    } finally {
      setIsCheckoutLoading(false);
    }
  }, [userId]);

  // Versão que adiciona créditos diretamente (após confirmação de pagamento ou modo demo)
  const addCredits = useCallback(async (amount: number): Promise<boolean> => {
    if (!userId || !enableBackend) {
      // Modo offline/demo
      setLocalData(prev => ({ ...prev, credits: prev.credits + amount }));
      return true;
    }

    try {
      const result = await buyCredits({ userId, amount });
      if (result.success) {
        setCreditsData(prev => prev ? { ...prev, balance: result.new_balance } : null);
        setLocalData(prev => ({ ...prev, credits: result.new_balance }));
        return true;
      }
      return false;
    } catch (e: any) {
      console.error('Error adding credits:', e);
      // Fallback local em caso de erro
      setLocalData(prev => ({ ...prev, credits: prev.credits + amount }));
      return true;
    }
  }, [userId, enableBackend]);

  // ═══════════════════════════════════════════════════════════════
  // UPGRADE DE PLANO
  // ═══════════════════════════════════════════════════════════════

  const upgradePlan = useCallback(async (planId: string): Promise<{ success: boolean; checkoutUrl?: string; error?: string }> => {
    const newPlan = PLANS.find(p => p.id === planId);
    if (!newPlan) {
      return { success: false, error: 'Plano não encontrado' };
    }

    if (!userId) {
      // Modo offline/demo
      setLocalData(prev => ({
        ...prev,
        planId: newPlan.id,
        credits: newPlan.limit,
      }));
      return { success: true };
    }

    setIsCheckoutLoading(true);

    try {
      // Criar sessão de checkout para assinatura
      const result = await createCheckoutSession({
        userId,
        type: 'subscription',
        planId: newPlan.id,
        billingPeriod: localData.billingPeriod,
      });

      if (result.success && result.checkout?.url) {
        return { success: true, checkoutUrl: result.checkout.url };
      } else {
        throw new Error('Não foi possível criar sessão de checkout');
      }
    } catch (e: any) {
      console.error('Error creating subscription checkout:', e);
      return { success: false, error: e.message };
    } finally {
      setIsCheckoutLoading(false);
    }
  }, [userId, localData.billingPeriod]);

  // Versão que altera plano diretamente (após confirmação de pagamento ou modo demo)
  const applyPlanChange = useCallback(async (planId: string): Promise<boolean> => {
    const newPlan = PLANS.find(p => p.id === planId);
    if (!newPlan) return false;

    if (!userId || !enableBackend) {
      // Modo offline/demo
      setLocalData(prev => ({
        ...prev,
        planId: newPlan.id,
        credits: newPlan.limit,
      }));
      return true;
    }

    try {
      const result = await changePlan({
        userId,
        newPlanId: planId,
        billingPeriod: localData.billingPeriod,
      });

      if (result.success) {
        if (result.subscription) {
          setSubscription(result.subscription);
        }
        if (result.new_balance !== undefined) {
          setCreditsData(prev => prev ? { ...prev, balance: result.new_balance! } : null);
          setLocalData(prev => ({
            ...prev,
            planId: planId,
            credits: result.new_balance!,
          }));
        }
        return true;
      }
      return false;
    } catch (e: any) {
      console.error('Error applying plan change:', e);
      // Fallback local
      setLocalData(prev => ({
        ...prev,
        planId: newPlan.id,
        credits: newPlan.limit,
      }));
      return true;
    }
  }, [userId, enableBackend, localData.billingPeriod]);

  // ═══════════════════════════════════════════════════════════════
  // DEDUZIR CRÉDITOS
  // ═══════════════════════════════════════════════════════════════

  const deductCredits = useCallback((amount: number, _reason: string): boolean => {
    const currentBalance = creditsData?.balance ?? localData.credits;
    if (currentBalance < amount) return false;

    // Atualizar localmente imediatamente
    setLocalData(prev => ({ ...prev, credits: prev.credits - amount }));
    if (creditsData) {
      setCreditsData(prev => prev ? { ...prev, balance: prev.balance - amount } : null);
    }

    // A dedução no backend é feita pela API de geração de imagens
    // que já deduz os créditos automaticamente

    return true;
  }, [creditsData, localData.credits]);

  // ═══════════════════════════════════════════════════════════════
  // ALTERAR PERÍODO DE COBRANÇA
  // ═══════════════════════════════════════════════════════════════

  const setBillingPeriod = useCallback((period: 'monthly' | 'yearly') => {
    setLocalData(prev => ({ ...prev, billingPeriod: period }));
    // O período só é efetivamente alterado na próxima renovação/checkout
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // DEFINIR CRÉDITOS MANUALMENTE (ADMIN/DEBUG)
  // ═══════════════════════════════════════════════════════════════

  const setCredits = useCallback((credits: number) => {
    setLocalData(prev => ({ ...prev, credits }));
    if (creditsData) {
      setCreditsData(prev => prev ? { ...prev, balance: credits } : null);
    }
  }, [creditsData]);

  // ═══════════════════════════════════════════════════════════════
  // REFRESH MANUAL
  // ═══════════════════════════════════════════════════════════════

  const refresh = useCallback(() => {
    loadBillingData();
  }, [loadBillingData]);

  // ═══════════════════════════════════════════════════════════════
  // RETORNO
  // ═══════════════════════════════════════════════════════════════

  return {
    // Dados
    userCredits,
    currentPlan,
    billingPeriod,
    daysUntilRenewal,
    subscription,

    // Estados
    isLoading,
    isCheckoutLoading,
    error,

    // Ações com checkout (retornam URL para pagamento)
    purchaseCredits,
    upgradePlan,

    // Ações diretas (após confirmação de pagamento ou modo demo)
    addCredits,
    applyPlanChange,
    deductCredits,
    setBillingPeriod,
    setCredits,

    // Utilitários
    refresh,
  };
};
