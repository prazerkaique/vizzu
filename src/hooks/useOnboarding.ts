import { useMemo, useCallback, useState } from 'react';
import { useProducts } from '../contexts/ProductsContext';
import { useClients } from '../contexts/ClientsContext';
import { useGeneration } from '../contexts/GenerationContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import type { Page } from '../contexts/UIContext';

// ═══════════════════════════════════════════════════════════════
// useOnboarding — Hook central do Copiloto de Primeiro Uso
// Gerencia: stepper do Dashboard + tour guiado por feature
// Toggle global: Supabase user_metadata.tour_enabled
// Tours individuais: localStorage vizzu_tour_seen_{feature}
// ═══════════════════════════════════════════════════════════════

export interface OnboardingStep {
  id: string;
  number: number;
  title: string;
  description: string;
  icon: string;
  targetPage: Page;
  isCompleted: boolean;
}

export interface UseOnboardingReturn {
  steps: OnboardingStep[];
  currentStep: OnboardingStep | null;
  completedCount: number;
  totalSteps: number;
  isOnboardingActive: boolean;
  isDismissed: boolean;
  dismissOnboarding: () => void;
  resetOnboarding: () => void;
  shouldShowTour: (featureId: string) => boolean;
  markTourComplete: (featureId: string) => void;
  dismissAllTours: () => void;
  isTourEnabled: boolean;
  isSavingTourToggle: boolean;
  setTourEnabled: (enabled: boolean) => Promise<boolean>;
}

// ── Definição estática das 5 etapas ──
const STEP_DEFINITIONS = [
  {
    id: 'products',
    number: 1,
    title: 'Cadastre seu primeiro produto',
    description: 'O produto é a base de todas as ferramentas. Comece adicionando uma foto frontal de boa qualidade.',
    icon: 'fa-box',
    targetPage: 'products' as Page,
  },
  {
    id: 'product-studio',
    number: 2,
    title: 'Gere fotos profissionais',
    description: 'Escolha um produto e gere fotos em múltiplos ângulos automaticamente com o Vizzu Product Studio®.',
    icon: 'fa-cube',
    targetPage: 'product-studio' as Page,
  },
  {
    id: 'look-composer',
    number: 3,
    title: 'Crie um look com modelo IA',
    description: 'Monte um look combinando suas peças e veja em um modelo virtual. Ideal para lookbooks.',
    icon: 'fa-vest-patches',
    targetPage: 'look-composer' as Page,
  },
  {
    id: 'creative-still',
    number: 4,
    title: 'Monte uma composição criativa',
    description: 'Crie composições artísticas estilo flat lay ou lifestyle para Instagram e campanhas.',
    icon: 'fa-palette',
    targetPage: 'creative-still' as Page,
  },
  {
    id: 'provador',
    number: 5,
    title: 'Use o Provador Virtual',
    description: 'Cadastre um cliente com foto, vista-o com suas roupas e envie pelo WhatsApp.',
    icon: 'fa-play',
    targetPage: 'provador' as Page,
  },
];

// ── Feature IDs usados nos tours ──
const TOUR_FEATURE_IDS = ['products', 'product-studio', 'look-composer', 'creative-still', 'provador'];

// ── localStorage keys ──
const LS_DISMISSED = 'vizzu_onboarding_dismissed';
const LS_COMPLETED_PREFIX = 'vizzu_onboarding_completed_';
const LS_TOUR_PREFIX = 'vizzu_tour_seen_';

function isStepCompleted(stepId: string, products: any[], clientLooks: any[], completedFeatures: string[]): boolean {
  // 1. Checar flag persistente no localStorage
  if (localStorage.getItem(`${LS_COMPLETED_PREFIX}${stepId}`) === 'true') return true;

  // 2. Checar completedFeatures da sessão
  if (completedFeatures.includes(stepId)) return true;

  // 3. Checar dados reais dos contextos
  switch (stepId) {
    case 'products':
      return products.length > 0;

    case 'product-studio':
      return products.some(p => {
        const gen = (p as any).generatedImages;
        return gen?.productStudio?.some((s: any) => s.images?.length > 0);
      });

    case 'look-composer':
      return products.some(p => {
        const gen = (p as any).generatedImages;
        return gen?.modeloIA?.length > 0;
      });

    case 'creative-still':
      // CS não tem contexto dedicado — depende de completedFeatures ou localStorage
      return false;

    case 'provador':
      return clientLooks.length > 0;

    default:
      return false;
  }
}

export function useOnboarding(): UseOnboardingReturn {
  const { products } = useProducts();
  const { clientLooks } = useClients();
  const { completedFeatures } = useGeneration();
  const { user } = useAuth();

  const [isSavingTourToggle, setIsSavingTourToggle] = useState(false);

  // isTourEnabled: true se há algum tour ainda não visto no localStorage
  const isTourEnabled = TOUR_FEATURE_IDS.some(
    id => localStorage.getItem(`${LS_TOUR_PREFIX}${id}`) !== 'true'
  );
  const isDismissed = localStorage.getItem(LS_DISMISSED) === 'true';

  const steps: OnboardingStep[] = useMemo(() => {
    return STEP_DEFINITIONS.map(def => {
      const completed = isStepCompleted(def.id, products, clientLooks, completedFeatures);
      // Persistir conclusão quando detectada
      if (completed) {
        localStorage.setItem(`${LS_COMPLETED_PREFIX}${def.id}`, 'true');
      }
      return { ...def, isCompleted: completed };
    });
  }, [products, clientLooks, completedFeatures]);

  const completedCount = useMemo(() => steps.filter(s => s.isCompleted).length, [steps]);
  const totalSteps = STEP_DEFINITIONS.length;

  const currentStep = useMemo(() => steps.find(s => !s.isCompleted) || null, [steps]);

  const isOnboardingActive = !isDismissed && completedCount < totalSteps;

  const dismissOnboarding = useCallback(() => {
    localStorage.setItem(LS_DISMISSED, 'true');
    // Desligar toggle global no Supabase (fire-and-forget)
    supabase.auth.updateUser({ data: { tour_enabled: false } });
    window.dispatchEvent(new Event('storage'));
  }, []);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(LS_DISMISSED);
    STEP_DEFINITIONS.forEach(def => {
      localStorage.removeItem(`${LS_COMPLETED_PREFIX}${def.id}`);
      localStorage.removeItem(`${LS_TOUR_PREFIX}${def.id}`);
    });
    window.dispatchEvent(new Event('storage'));
  }, []);

  // localStorage é a fonte de verdade imediata (síncrono)
  // Supabase é só persistência entre sessões (async)
  const shouldShowTour = useCallback((featureId: string): boolean => {
    return localStorage.getItem(`${LS_TOUR_PREFIX}${featureId}`) !== 'true';
  }, []);

  const markTourComplete = useCallback((featureId: string) => {
    localStorage.setItem(`${LS_TOUR_PREFIX}${featureId}`, 'true');
    // Se TODAS as features já foram vistas, desligar toggle global
    const allSeen = TOUR_FEATURE_IDS.every(id =>
      localStorage.getItem(`${LS_TOUR_PREFIX}${id}`) === 'true'
    );
    if (allSeen) {
      supabase.auth.updateUser({ data: { tour_enabled: false } });
    }
  }, []);

  // Cancelar tours de TODAS as features de uma vez (usado quando o usuário sai do tour)
  const dismissAllTours = useCallback(() => {
    TOUR_FEATURE_IDS.forEach(id => {
      localStorage.setItem(`${LS_TOUR_PREFIX}${id}`, 'true');
    });
    localStorage.setItem(LS_DISMISSED, 'true');
    supabase.auth.updateUser({ data: { tour_enabled: false } });
    window.dispatchEvent(new Event('storage'));
  }, []);

  // Toggle global do tour — localStorage primeiro (síncrono), Supabase depois (persistência)
  const setTourEnabled = useCallback(async (enabled: boolean): Promise<boolean> => {
    setIsSavingTourToggle(true);

    // 1. Atualizar localStorage IMEDIATAMENTE (nunca falha)
    if (enabled) {
      localStorage.removeItem(LS_DISMISSED);
      TOUR_FEATURE_IDS.forEach(id => {
        localStorage.removeItem(`${LS_TOUR_PREFIX}${id}`);
        localStorage.removeItem(`${LS_COMPLETED_PREFIX}${id}`);
      });
    } else {
      TOUR_FEATURE_IDS.forEach(id => {
        localStorage.setItem(`${LS_TOUR_PREFIX}${id}`, 'true');
      });
      localStorage.setItem(LS_DISMISSED, 'true');
    }

    // 2. Persistir no Supabase (fire-and-forget, não bloqueia UX)
    try {
      await supabase.auth.updateUser({ data: { tour_enabled: enabled } });
    } catch {
      // Supabase falhou — tudo bem, localStorage já está correto
    }

    setIsSavingTourToggle(false);
    return true;
  }, []);

  return {
    steps,
    currentStep,
    completedCount,
    totalSteps,
    isOnboardingActive,
    isDismissed,
    dismissOnboarding,
    resetOnboarding,
    shouldShowTour,
    markTourComplete,
    dismissAllTours,
    isTourEnabled,
    isSavingTourToggle,
    setTourEnabled,
  };
}
