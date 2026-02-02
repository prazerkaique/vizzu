import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import {
  Plan,
  PLANS as DEFAULT_PLANS,
  FREE_PLAN as DEFAULT_FREE_PLAN,
  DEFAULT_MASTER_FEATURES,
  DEFAULT_PLAN_PERSONA,
  DEFAULT_PLAN_CTA,
  DEFAULT_PLAN_INCLUDED,
} from '../hooks/planDefaults';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface PlansContextType {
  plans: Plan[];                              // Planos pagos (basic, pro, premier, enterprise)
  freePlan: Plan;                             // Plano free/trial
  allPlans: Plan[];                           // [freePlan, ...plans]
  masterFeatures: string[];                   // Lista mestre para grid de comparação
  planPersona: Record<string, string>;        // Taglines de marketing
  planCta: Record<string, string>;            // Labels dos botões CTA
  planIncluded: Record<string, Set<string>>;  // Features incluídas por plano
  isLoading: boolean;
}

const PlansContext = createContext<PlansContextType | null>(null);

// ═══════════════════════════════════════════════════════════════
// MAPPER: snake_case do banco → Plan interface
// ═══════════════════════════════════════════════════════════════

interface DbPlanRow {
  id: string;
  name: string;
  generation_limit: number;
  product_limit: number;
  price_monthly: number;
  price_yearly: number;
  credit_price: number;
  max_resolution: string;
  has_watermark: boolean;
  badge: string | null;
  badge_color: string | null;
  features: string[];
  highlight: boolean;
  persona: string | null;
  cta_label: string | null;
  included_features: string[];
  sort_order: number;
  active: boolean;
}

const mapDbRowToPlan = (row: DbPlanRow): Plan => ({
  id: row.id,
  name: row.name,
  limit: row.generation_limit,
  productLimit: row.product_limit,
  priceMonthly: Number(row.price_monthly),
  priceYearly: Number(row.price_yearly),
  creditPrice: Number(row.credit_price),
  maxResolution: row.max_resolution as '2k' | '4k',
  hasWatermark: row.has_watermark,
  badge: row.badge ?? undefined,
  badgeColor: row.badge_color ?? undefined,
  features: row.features ?? [],
  highlight: row.highlight,
});

// ═══════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════

export const PlansProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [freePlan, setFreePlan] = useState<Plan>(DEFAULT_FREE_PLAN);
  const [masterFeatures, setMasterFeatures] = useState<string[]>(DEFAULT_MASTER_FEATURES);
  const [planPersona, setPlanPersona] = useState<Record<string, string>>(DEFAULT_PLAN_PERSONA);
  const [planCta, setPlanCta] = useState<Record<string, string>>(DEFAULT_PLAN_CTA);
  const [planIncluded, setPlanIncluded] = useState<Record<string, Set<string>>>(() => {
    const sets: Record<string, Set<string>> = {};
    for (const [key, arr] of Object.entries(DEFAULT_PLAN_INCLUDED)) {
      sets[key] = new Set(arr);
    }
    return sets;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        // Buscar planos e master_features em paralelo
        const [plansRes, configRes] = await Promise.all([
          supabase
            .from('plans')
            .select('*')
            .eq('active', true)
            .order('sort_order'),
          supabase
            .from('app_config')
            .select('value')
            .eq('key', 'master_features')
            .single(),
        ]);

        if (plansRes.error) {
          console.error('Error fetching plans:', plansRes.error);
          return; // Usa defaults
        }

        const rows = plansRes.data as DbPlanRow[];
        if (!rows || rows.length === 0) return;

        // Separar free dos pagos
        const freeRow = rows.find(r => r.id === 'free');
        const paidRows = rows.filter(r => r.id !== 'free');

        if (freeRow) {
          setFreePlan(mapDbRowToPlan(freeRow));
        }

        setPlans(paidRows.map(mapDbRowToPlan));

        // Construir persona, cta e included a partir dos dados do banco
        const persona: Record<string, string> = {};
        const cta: Record<string, string> = {};
        const included: Record<string, Set<string>> = {};

        for (const row of rows) {
          if (row.persona) persona[row.id] = row.persona;
          if (row.cta_label) cta[row.id] = row.cta_label;
          if (row.included_features) {
            included[row.id] = new Set(row.included_features);
          }
        }

        setPlanPersona(persona);
        setPlanCta(cta);
        setPlanIncluded(included);

        // Master features
        if (!configRes.error && configRes.data?.value) {
          setMasterFeatures(configRes.data.value as string[]);
        }

        console.log(`[PlansContext] ${rows.length} planos carregados do Supabase`);
      } catch (e) {
        console.error('[PlansContext] Erro ao buscar planos, usando defaults:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const allPlans = [freePlan, ...plans];

  return (
    <PlansContext.Provider value={{
      plans,
      freePlan,
      allPlans,
      masterFeatures,
      planPersona,
      planCta,
      planIncluded,
      isLoading,
    }}>
      {children}
    </PlansContext.Provider>
  );
};

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

export const usePlans = (): PlansContextType => {
  const context = useContext(PlansContext);
  if (!context) {
    throw new Error('usePlans must be used within a PlansProvider');
  }
  return context;
};
