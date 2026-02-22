import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

const LS_KEY = 'vizzu_onboarding_completed';

interface UseOnboardingProfileReturn {
  /** null = carregando, false = incompleto, true = completo */
  hasCompletedOnboarding: boolean | null;
  isLoading: boolean;
  saveProfile: (name: string, whatsapp: string, segment: string) => Promise<boolean>;
  completeOnboarding: () => void;
}

export function useOnboardingProfile(userId: string | undefined): UseOnboardingProfileReturn {
  const [hasCompleted, setHasCompleted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setHasCompleted(null);
      return;
    }

    // 1. localStorage como cache rapido (UX instantanea)
    const cachedLocally = localStorage.getItem(LS_KEY) === userId;
    if (cachedLocally) {
      setHasCompleted(true);
      // Verificar em background — se Supabase discorda, resetar
    }

    // 2. Checar Supabase
    const check = async () => {
      try {
        // Checar se já tem company_settings preenchido
        const { data: settings } = await supabase
          .from('company_settings')
          .select('name, whatsapp')
          .eq('user_id', userId)
          .maybeSingle();

        if (settings && settings.name && settings.name.trim() !== '' && settings.whatsapp) {
          localStorage.setItem(LS_KEY, userId);
          setHasCompleted(true);
          return;
        }

        // Checar se é usuário existente (já tem produtos → pular onboarding)
        const { data: products } = await supabase
          .from('products')
          .select('id')
          .eq('user_id', userId)
          .limit(1);

        if (products && products.length > 0) {
          localStorage.setItem(LS_KEY, userId);
          setHasCompleted(true);
          return;
        }

        // Supabase diz "nao completo" — resetar cache se existia
        if (cachedLocally) {
          localStorage.removeItem(LS_KEY);
        }
        setHasCompleted(false);
      } catch (err) {
        console.error('[useOnboardingProfile] Erro ao verificar:', err);
        // Em caso de erro de rede, nao bloquear o usuario (manter cache se existia)
        if (!cachedLocally) setHasCompleted(false);
      }
    };

    check();
  }, [userId]);

  const saveProfile = useCallback(async (name: string, whatsapp: string, segment: string): Promise<boolean> => {
    if (!userId) return false;
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('company_settings')
        .upsert({
          user_id: userId,
          name: name.trim(),
          whatsapp: whatsapp.trim(),
          segment,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      // Atualizar localStorage company_settings
      try {
        const existing = JSON.parse(localStorage.getItem('vizzu_company_settings') || '{}');
        localStorage.setItem('vizzu_company_settings', JSON.stringify({
          ...existing,
          name: name.trim(),
          whatsapp: whatsapp.trim(),
          segment,
        }));
      } catch { /* ignore */ }

      return true;
    } catch (err) {
      console.error('[useOnboardingProfile] Erro ao salvar perfil:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const completeOnboarding = useCallback(() => {
    if (userId) {
      localStorage.setItem(LS_KEY, userId);
    }
    setHasCompleted(true);
  }, [userId]);

  return { hasCompletedOnboarding: hasCompleted, isLoading, saveProfile, completeOnboarding };
}
