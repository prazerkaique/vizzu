import { useState } from 'react';

export const PLANS = [
  { id: 'free', name: 'Free', limit: 10, price: 'Grátis' },
  { id: 'starter', name: 'Starter', limit: 100, price: 'R$ 79,90/mês' },
  { id: 'growth', name: 'Growth', limit: 300, price: 'R$ 179,90/mês' },
  { id: 'enterprise', name: 'Enterprise', limit: 1000, price: 'R$ 399,90/mês' }
];

export const useCredits = () => {
  const [userCredits, setUserCredits] = useState(10);
  const [currentPlanId, setCurrentPlanId] = useState('free');

  const currentPlan = PLANS.find(p => p.id === currentPlanId) || PLANS[0];

  const deductCredits = (amount: number, _reason: string): boolean => {
    if (userCredits < amount) return false;
    setUserCredits(prev => prev - amount);
    return true;
  };

  const upgradePlan = (planId: string) => {
    const plan = PLANS.find(p => p.id === planId);
    if (plan) { setCurrentPlanId(plan.id); setUserCredits(plan.limit); }
  };

  return { userCredits, currentPlan, deductCredits, upgradePlan, setCredits: setUserCredits };
};
