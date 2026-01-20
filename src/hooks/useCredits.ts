import { useState, useEffect } from 'react';

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
    limit: 100,
    priceMonthly: 129.90,
    priceYearly: 99.90,
    creditPrice: 2.99,
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
    limit: 200,
    priceMonthly: 189.90,
    priceYearly: 159.90,
    creditPrice: 1.99,
    badge: 'PLANO ATUAL',
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
    limit: 300,
    priceMonthly: 299.00,
    priceYearly: 259.00,
    creditPrice: 1.59,
    badge: 'MELHOR VALOR',
    badgeColor: 'amber',
    features: [
      'Todas as funcionalidades desbloqueadas',
      'Integração com e-commerces',
      'Suporte prioritário'
    ]
  }
];

export const CREDIT_PACKAGES = [50, 100, 200, 500];

const STORAGE_KEY = 'vizzu_credits_data';

interface CreditsData {
  credits: number;
  planId: string;
  billingPeriod: 'monthly' | 'yearly';
}

const getStoredData = (): CreditsData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading credits data:', e);
  }
  // Default: Pro plan with 200 credits
  return { credits: 200, planId: 'pro', billingPeriod: 'monthly' };
};

const saveData = (data: CreditsData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving credits data:', e);
  }
};

export const useCredits = () => {
  const [data, setData] = useState<CreditsData>(getStoredData);

  useEffect(() => {
    saveData(data);
  }, [data]);

  const currentPlan = PLANS.find(p => p.id === data.planId) || PLANS[1]; // Default to Pro

  const deductCredits = (amount: number, _reason: string): boolean => {
    if (data.credits < amount) return false;
    setData(prev => ({ ...prev, credits: prev.credits - amount }));
    return true;
  };

  const addCredits = (amount: number) => {
    setData(prev => ({ ...prev, credits: prev.credits + amount }));
  };

  const upgradePlan = (planId: string) => {
    const plan = PLANS.find(p => p.id === planId);
    if (plan) {
      setData(prev => ({
        ...prev,
        planId: plan.id,
        credits: plan.limit
      }));
    }
  };

  const setBillingPeriod = (period: 'monthly' | 'yearly') => {
    setData(prev => ({ ...prev, billingPeriod: period }));
  };

  const setCredits = (credits: number) => {
    setData(prev => ({ ...prev, credits }));
  };

  return {
    userCredits: data.credits,
    currentPlan,
    billingPeriod: data.billingPeriod,
    deductCredits,
    addCredits,
    upgradePlan,
    setBillingPeriod,
    setCredits
  };
};
