import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { CURRENT_TERMS_VERSION } from '../content/termsContent';

const LS_KEY = `vizzu_terms_accepted_${CURRENT_TERMS_VERSION}`;

interface UseTermsAcceptanceReturn {
  /** null = carregando, false = não aceitou, true = aceitou */
  hasAccepted: boolean | null;
  isLoading: boolean;
  acceptTerms: () => Promise<boolean>;
}

export function useTermsAcceptance(userId: string | undefined): UseTermsAcceptanceReturn {
  const [hasAccepted, setHasAccepted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setHasAccepted(null);
      return;
    }

    // 1. localStorage como cache rapido (UX instantanea)
    const cachedLocally = localStorage.getItem(LS_KEY) === userId;
    if (cachedLocally) {
      setHasAccepted(true);
      // Verificar em background — se Supabase discorda, resetar
    }

    // 2. Checar Supabase (cross-device, source of truth)
    const check = async () => {
      try {
        const { data, error } = await supabase
          .from('terms_acceptance')
          .select('id')
          .eq('user_id', userId)
          .eq('terms_version', CURRENT_TERMS_VERSION)
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          localStorage.setItem(LS_KEY, userId);
          setHasAccepted(true);
        } else {
          // Supabase diz "nao aceitou" — resetar cache se existia
          if (cachedLocally) {
            localStorage.removeItem(LS_KEY);
          }
          setHasAccepted(false);
        }
      } catch (err) {
        console.error('[useTermsAcceptance] Erro ao verificar:', err);
        // Em caso de erro de rede, nao bloquear se cache existia
        if (!cachedLocally) setHasAccepted(false);
      }
    };

    check();
  }, [userId]);

  const acceptTerms = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    setIsLoading(true);

    try {
      // Capturar IP (best-effort)
      let ipAddress: string | null = null;
      try {
        const resp = await fetch('https://api.ipify.org?format=json');
        const data = await resp.json();
        ipAddress = data.ip;
      } catch {
        // IP não é obrigatório
      }

      const { error } = await supabase
        .from('terms_acceptance')
        .insert({
          user_id: userId,
          terms_version: CURRENT_TERMS_VERSION,
          ip_address: ipAddress,
          user_agent: navigator.userAgent,
        });

      if (error) {
        // Ignorar duplicate key (23505) — usuário já aceitou
        if (error.code === '23505') {
          localStorage.setItem(LS_KEY, userId);
          setHasAccepted(true);
          return true;
        }
        throw error;
      }

      localStorage.setItem(LS_KEY, userId);
      setHasAccepted(true);
      return true;
    } catch (err) {
      console.error('[useTermsAcceptance] Erro ao salvar aceite:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  return { hasAccepted, isLoading, acceptTerms };
}
