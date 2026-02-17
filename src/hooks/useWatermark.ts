import { useCredits } from './useCredits';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook simples que retorna se o plano do usuário exige marca d'água.
 */
export function useWatermark(): boolean {
  const { user } = useAuth();
  const { currentPlan } = useCredits({ userId: user?.id });
  return currentPlan?.hasWatermark ?? true;
}
