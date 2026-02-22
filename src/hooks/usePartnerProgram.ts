import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { PARTNER_TERMS_VERSION } from '../content/partnerTermsContent';

const LS_PARTNER_KEY = 'vizzu_partner_data';
const LS_TERMS_KEY = `vizzu_partner_terms_${PARTNER_TERMS_VERSION}`;

interface PartnerStats {
  totalReferrals: number;
  convertedReferrals: number;
  creditsEarned: number;
  creditsAvailable: number;
}

interface Referral {
  id: string;
  referred_email: string;
  status: 'pending' | 'converted' | 'cancelled';
  plan_id: string | null;
  credits_amount: number;
  created_at: string;
  holdback_until: string | null;
}

interface Payout {
  id: string;
  credits: number;
  status: 'pending' | 'available' | 'claimed' | 'cancelled';
  available_at: string;
  claimed_at: string | null;
}

interface CachedPartnerData {
  referralCode: string | null;
  hasAcceptedTerms: boolean;
}

const getCached = (): CachedPartnerData | null => {
  try {
    const stored = localStorage.getItem(LS_PARTNER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
};

const saveCache = (data: CachedPartnerData) => {
  try { localStorage.setItem(LS_PARTNER_KEY, JSON.stringify(data)); } catch {}
};

export function usePartnerProgram(userId: string | undefined) {
  const [referralCode, setReferralCode] = useState<string | null>(() => getCached()?.referralCode ?? null);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState<boolean | null>(null);
  const [stats, setStats] = useState<PartnerStats>({ totalReferrals: 0, convertedReferrals: 0, creditsEarned: 0, creditsAvailable: 0 });
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClaimLoading, setIsClaimLoading] = useState(false);

  // Verificar aceite de termos
  useEffect(() => {
    if (!userId) { setHasAcceptedTerms(null); return; }

    const cachedAccepted = localStorage.getItem(LS_TERMS_KEY) === userId;
    if (cachedAccepted) setHasAcceptedTerms(true);

    const check = async () => {
      try {
        const { data, error } = await supabase
          .from('referral_terms_acceptance')
          .select('id')
          .eq('user_id', userId)
          .eq('terms_version', PARTNER_TERMS_VERSION)
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          localStorage.setItem(LS_TERMS_KEY, userId);
          setHasAcceptedTerms(true);
        } else {
          if (cachedAccepted) localStorage.removeItem(LS_TERMS_KEY);
          setHasAcceptedTerms(false);
        }
      } catch (err) {
        console.error('[usePartnerProgram] Erro ao verificar termos:', err);
        if (!cachedAccepted) setHasAcceptedTerms(false);
      }
    };
    check();
  }, [userId]);

  // Carregar dados do programa
  const loadPartnerData = useCallback(async () => {
    if (!userId || !hasAcceptedTerms) return;
    setIsLoading(true);

    try {
      // Gerar/buscar código de referência
      const { data: codeData } = await supabase.rpc('generate_referral_code', { p_user_id: userId });
      const code = (codeData as any)?.code ?? null;
      setReferralCode(code);
      saveCache({ referralCode: code, hasAcceptedTerms: true });

      // Buscar indicações
      const { data: refData } = await supabase
        .from('referrals')
        .select('id, status, plan_id, credits_amount, created_at, holdback_until, referred_id')
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false });

      if (refData) {
        // Buscar emails mascarados dos indicados
        const referralsList: Referral[] = refData.map((r: any) => ({
          id: r.id,
          referred_email: '****@****',
          status: r.status,
          plan_id: r.plan_id,
          credits_amount: r.credits_amount,
          created_at: r.created_at,
          holdback_until: r.holdback_until,
        }));
        setReferrals(referralsList);
      }

      // Buscar payouts
      const { data: payoutData } = await supabase
        .from('referral_payouts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (payoutData) {
        setPayouts(payoutData as Payout[]);
      }

      // Calcular stats
      const total = refData?.length ?? 0;
      const converted = refData?.filter((r: any) => r.status === 'converted').length ?? 0;
      const earned = refData?.reduce((sum: number, r: any) => sum + (r.status === 'converted' ? r.credits_amount : 0), 0) ?? 0;
      const available = payoutData?.reduce((sum: number, p: any) => {
        if (p.status === 'available' || (p.status === 'pending' && new Date(p.available_at) <= new Date())) return sum + p.credits;
        return sum;
      }, 0) ?? 0;

      setStats({ totalReferrals: total, convertedReferrals: converted, creditsEarned: earned, creditsAvailable: available });
    } catch (err) {
      console.error('[usePartnerProgram] Erro ao carregar dados:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, hasAcceptedTerms]);

  useEffect(() => {
    loadPartnerData();
  }, [loadPartnerData]);

  // Aceitar termos
  const acceptTerms = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    setIsLoading(true);

    try {
      let ipAddress: string | null = null;
      try {
        const resp = await fetch('https://api.ipify.org?format=json');
        const data = await resp.json();
        ipAddress = data.ip;
      } catch {}

      const { error } = await supabase
        .from('referral_terms_acceptance')
        .insert({
          user_id: userId,
          terms_version: PARTNER_TERMS_VERSION,
          ip_address: ipAddress,
          user_agent: navigator.userAgent,
        });

      if (error) {
        if (error.code === '23505') {
          localStorage.setItem(LS_TERMS_KEY, userId);
          setHasAcceptedTerms(true);
          return true;
        }
        throw error;
      }

      localStorage.setItem(LS_TERMS_KEY, userId);
      setHasAcceptedTerms(true);
      return true;
    } catch (err) {
      console.error('[usePartnerProgram] Erro ao aceitar termos:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Resgatar créditos
  const claimCredits = useCallback(async (): Promise<{ success: boolean; creditsClaimed?: number; error?: string }> => {
    if (!userId) return { success: false, error: 'Não autenticado' };
    setIsClaimLoading(true);

    try {
      const { data, error } = await supabase.rpc('claim_referral_credits', { p_user_id: userId });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        await loadPartnerData();
        return { success: true, creditsClaimed: result.credits_claimed };
      }
      return { success: false, error: result?.error || 'Erro ao resgatar' };
    } catch (err: any) {
      console.error('[usePartnerProgram] Erro ao resgatar créditos:', err);
      return { success: false, error: err.message };
    } finally {
      setIsClaimLoading(false);
    }
  }, [userId, loadPartnerData]);

  return {
    referralCode,
    hasAcceptedTerms,
    stats,
    referrals,
    payouts,
    isLoading,
    isClaimLoading,
    acceptTerms,
    claimCredits,
    refresh: loadPartnerData,
  };
}
