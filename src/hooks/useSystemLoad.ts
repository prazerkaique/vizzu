import { useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

interface SystemLoadResult {
  activeGenerations: number;
  isHighDemand: boolean;
  estimatedExtraWaitSeconds: number;
  message: string | null;
}

/**
 * Hook para verificar a carga atual do sistema de geração.
 * Consulta o Supabase para contar gerações ativas (status='processing').
 * Usar ANTES de iniciar uma geração para avisar o usuário sobre demanda.
 */
export function useSystemLoad() {
  const checkLoad = useCallback(async (): Promise<SystemLoadResult> => {
    try {
      // Contar gerações ativas nas duas tabelas
      const [genResult, stillResult] = await Promise.all([
        supabase
          .from('generations')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'processing'),
        supabase
          .from('creative_still_generations')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'processing'),
      ]);

      const genCount = genResult.count || 0;
      const stillCount = stillResult.count || 0;
      const total = genCount + stillCount;

      // Thresholds: 3+ = alta demanda, 6+ = muito alta
      const isHighDemand = total >= 3;
      const estimatedExtraWaitSeconds = Math.max(0, (total - 2) * 30);

      let message: string | null = null;
      if (total >= 6) {
        message = `Alta demanda no momento. Tempo estimado: ~${Math.ceil(estimatedExtraWaitSeconds / 60)} min a mais que o normal.`;
      } else if (total >= 3) {
        message = `Sistema com demanda elevada. Sua geração pode levar ~${estimatedExtraWaitSeconds}s a mais.`;
      }

      return { activeGenerations: total, isHighDemand, estimatedExtraWaitSeconds, message };
    } catch {
      // Se falhar a consulta, não bloquear o usuário
      return { activeGenerations: 0, isHighDemand: false, estimatedExtraWaitSeconds: 0, message: null };
    }
  }, []);

  return { checkLoad };
}
