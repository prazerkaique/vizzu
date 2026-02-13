// ═══════════════════════════════════════════════════════════════
// VIZZU - Banner de Créditos Baixos (Paywall Layer 1)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import type { VizzuTheme } from '../contexts/UIContext';

interface Props {
  userCredits: number;
  currentPlanId: string;
  theme: VizzuTheme;
  onBuyCredits: () => void;
}

export const LowCreditsBanner: React.FC<Props> = ({
  userCredits,
  currentPlanId,
  theme,
  onBuyCredits,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [generationsToday, setGenerationsToday] = useState<number | null>(null);

  const isDark = theme !== 'light';
  const isTrialExhausted = currentPlanId === 'free' && userCredits === 0;
  const isLowCredits = userCredits > 0 && userCredits <= 3;
  const isZero = userCredits === 0 && currentPlanId !== 'free';

  // Buscar contagem de gerações do dia (social proof)
  useEffect(() => {
    supabase.rpc('count_generations_today').then(({ data }) => {
      if (data !== null) setGenerationsToday(data);
    });
  }, []);

  // Não mostra se não se aplica ou foi dispensado
  if (dismissed || (!isTrialExhausted && !isLowCredits && !isZero)) return null;

  // Reset dismiss ao trocar de estado (ex: comprou créditos e gastou de novo)
  const bannerKey = `${userCredits}-${currentPlanId}`;

  const getMessage = () => {
    if (isTrialExhausted) {
      return {
        icon: 'fa-rocket',
        text: 'Seu teste gratuito acabou! Escolha um plano para continuar criando imagens profissionais.',
        cta: 'Ver planos',
      };
    }
    if (isZero) {
      return {
        icon: 'fa-bolt',
        text: 'Seus créditos acabaram. Recarregue para continuar gerando.',
        cta: 'Comprar créditos',
      };
    }
    return {
      icon: 'fa-exclamation-triangle',
      text: `Você tem apenas ${userCredits} crédito${userCredits !== 1 ? 's' : ''} restante${userCredits !== 1 ? 's' : ''}.`,
      cta: 'Comprar mais',
    };
  };

  const msg = getMessage();

  return (
    <div
      key={bannerKey}
      className={`relative flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium transition-all ${
        isTrialExhausted || isZero
          ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white'
          : isDark
            ? 'bg-amber-500/15 text-amber-300 border-b border-amber-500/20'
            : 'bg-amber-50 text-amber-700 border-b border-amber-200'
      }`}
    >
      <i className={`fas ${msg.icon} text-[10px]`}></i>
      <span>{msg.text}</span>

      {generationsToday !== null && generationsToday > 10 && (
        <span className={`hidden sm:inline ${isTrialExhausted || isZero ? 'text-white/70' : isDark ? 'text-amber-400/60' : 'text-amber-500/60'}`}>
          · {generationsToday.toLocaleString('pt-BR')} imagens geradas hoje no Vizzu
        </span>
      )}

      <button
        onClick={onBuyCredits}
        className={`ml-2 px-3 py-1 rounded-full text-[10px] font-bold transition-all hover:scale-105 ${
          isTrialExhausted || isZero
            ? 'bg-white text-[#FF6B6B] hover:bg-white/90'
            : 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white'
        }`}
      >
        {msg.cta}
      </button>

      {/* Dismiss (só para aviso de créditos baixos, não para zero/trial) */}
      {isLowCredits && (
        <button
          onClick={() => setDismissed(true)}
          className={`ml-1 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
            isDark ? 'hover:bg-white/10 text-amber-400/60' : 'hover:bg-amber-200/50 text-amber-400'
          }`}
        >
          <i className="fas fa-times text-[8px]"></i>
        </button>
      )}
    </div>
  );
};
