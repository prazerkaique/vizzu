import { useState, useEffect, useCallback } from 'react';
import { createCheckoutSession, buyCredits, changePlan, calculateDaysUntilRenewal, useCredits as useCreditsApi, UserSubscription, UserCredits } from '../lib/api/billing';
import { supabase } from '../services/supabaseClient';
import { usePlans } from '../contexts/PlansContext';

// Re-exportar tipos e constantes de planDefaults para compatibilidade
export type { Plan } from './planDefaults';
export { PLANS, FREE_PLAN, CREDIT_PACKAGES } from './planDefaults';

// ═══════════════════════════════════════════════════════════════
// CONSTANTES DE LÓGICA (permanecem no frontend)
// ═══════════════════════════════════════════════════════════════

// Custo em gerações por resolução
export const RESOLUTION_COST: Record<string, number> = {
  '2k': 1,
  '4k': 2,
};

// Helper para verificar se plano permite resolução
export const canUseResolution = (plan: { maxResolution: '2k' | '4k' }, resolution: '2k' | '4k'): boolean => {
  if (resolution === '2k') return true;
  return plan.maxResolution === '4k';
};

// Helper para obter custo de geração por resolução
export const getGenerationCost = (resolution: '2k' | '4k'): number => {
  return RESOLUTION_COST[resolution] || 1;
};

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
  return { credits: 5, planId: 'free', billingPeriod: 'monthly' };
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
  enableBackend?: boolean;
}

export const useCredits = (options: UseCreditsOptions = {}) => {
  const { userId, enableBackend = true } = options;
  const { allPlans, freePlan } = usePlans();

  // Estados
  const [localData, setLocalData] = useState<LocalCreditsData>(getStoredData);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [creditsData, setCreditsData] = useState<UserCredits | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  // Determinar plano atual (usa planos do Supabase via PlansContext)
  const currentPlan = subscription
    ? allPlans.find(p => p.id === subscription.plan_id) || freePlan
    : allPlans.find(p => p.id === localData.planId) || freePlan;

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
      // Buscar créditos da tabela user_credits
      const { data: creditsRow, error: creditsError } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Buscar assinatura da tabela user_subscriptions
      const { data: subRow, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (creditsError && creditsError.code !== 'PGRST116') {
        console.error('Error fetching user credits:', creditsError);
        throw creditsError;
      }

      if (subError && subError.code !== 'PGRST116') {
        console.error('Error fetching user subscription:', subError);
        throw subError;
      }

      if (creditsRow) {
        setCreditsData({
          user_id: userId,
          balance: creditsRow.balance ?? 0,
          lifetime_purchased: creditsRow.lifetime_purchased ?? 0,
          lifetime_used: creditsRow.lifetime_used ?? 0,
          last_renewal_credits: creditsRow.last_renewal_credits ?? 0,
          updated_at: creditsRow.updated_at ?? new Date().toISOString(),
        });

        setLocalData(prev => ({
          ...prev,
          credits: creditsRow.balance ?? 0,
        }));
      }

      if (subRow) {
        setSubscription(subRow as UserSubscription);
        setLocalData(prev => ({
          ...prev,
          planId: subRow.plan_id ?? 'free',
        }));
      }
    } catch (e: any) {
      console.error('Error loading billing data:', e);
      setError(e.message);
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
      setLocalData(prev => ({ ...prev, credits: prev.credits + amount }));
      return { success: true };
    }

    setIsCheckoutLoading(true);

    try {
      const result = await createCheckoutSession({
        userId,
        type: 'credits',
        creditAmount: amount,
      });

      if (result.success && result.checkout?.url) {
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

  const addCredits = useCallback(async (amount: number): Promise<boolean> => {
    if (!userId || !enableBackend) {
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
      setLocalData(prev => ({ ...prev, credits: prev.credits + amount }));
      return true;
    }
  }, [userId, enableBackend]);

  // ═══════════════════════════════════════════════════════════════
  // UPGRADE DE PLANO
  // ═══════════════════════════════════════════════════════════════

  const upgradePlan = useCallback(async (planId: string): Promise<{ success: boolean; checkoutUrl?: string; error?: string }> => {
    const newPlan = allPlans.find(p => p.id === planId);
    if (!newPlan) {
      return { success: false, error: 'Plano não encontrado' };
    }

    if (!userId) {
      setLocalData(prev => ({
        ...prev,
        planId: newPlan.id,
        credits: newPlan.limit,
      }));
      return { success: true };
    }

    setIsCheckoutLoading(true);

    try {
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
  }, [userId, localData.billingPeriod, allPlans]);

  const applyPlanChange = useCallback(async (planId: string): Promise<boolean> => {
    const newPlan = allPlans.find(p => p.id === planId);
    if (!newPlan) return false;

    if (!userId || !enableBackend) {
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
      setLocalData(prev => ({
        ...prev,
        planId: newPlan.id,
        credits: newPlan.limit,
      }));
      return true;
    }
  }, [userId, enableBackend, localData.billingPeriod, allPlans]);

  // ═══════════════════════════════════════════════════════════════
  // DEDUZIR CRÉDITOS
  // ═══════════════════════════════════════════════════════════════

  const deductCredits = useCallback((amount: number, reason: string): boolean => {
    const currentBalance = creditsData?.balance ?? localData.credits;
    if (currentBalance < amount) return false;

    // Atualização otimista (UI imediata)
    setLocalData(prev => ({ ...prev, credits: prev.credits - amount }));
    if (creditsData) {
      setCreditsData(prev => prev ? { ...prev, balance: prev.balance - amount } : null);
    }

    // Chamar backend N8N para registrar dedução (fire-and-forget)
    if (userId && enableBackend) {
      useCreditsApi({
        userId,
        amount,
        description: reason,
      }).then(result => {
        if (result.success) {
          // Sincronizar saldo real do backend
          setCreditsData(prev => prev ? { ...prev, balance: result.new_balance } : null);
          setLocalData(prev => ({ ...prev, credits: result.new_balance }));
        }
      }).catch(err => {
        console.error('Error deducting credits on backend:', err);
      });
    }

    return true;
  }, [creditsData, localData.credits, userId, enableBackend]);

  // ═══════════════════════════════════════════════════════════════
  // ALTERAR PERÍODO DE COBRANÇA
  // ═══════════════════════════════════════════════════════════════

  const setBillingPeriod = useCallback((period: 'monthly' | 'yearly') => {
    setLocalData(prev => ({ ...prev, billingPeriod: period }));
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
    userCredits,
    currentPlan,
    billingPeriod,
    daysUntilRenewal,
    subscription,
    isLoading,
    isCheckoutLoading,
    error,
    purchaseCredits,
    upgradePlan,
    addCredits,
    applyPlanChange,
    deductCredits,
    setBillingPeriod,
    setCredits,
    refresh,
  };
};
