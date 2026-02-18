// ═══════════════════════════════════════════════════════════════
// VIZZU - Banner de Créditos Baixos (Paywall Layer 1)
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
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

  const isDark = theme !== 'light';
  const isTrialExhausted = currentPlanId === 'free' && userCredits === 0;
  const isLowCredits = userCredits > 0 && userCredits <= 3;
  const isZero = userCredits === 0 && currentPlanId !== 'free';

  // Não mostra se não se aplica ou foi dispensado
  if (dismissed || (!isTrialExhausted && !isLowCredits && !isZero)) return null;

  // Reset dismiss ao trocar de estado
  const bannerKey = `${userCredits}-${currentPlanId}`;

  const getMessage = () => {
    if (isTrialExhausted) {
      return {
        icon: 'fa-rocket',
        emoji: '🚀',
        text: 'Seu teste gratuito acabou!',
        sub: 'Escolha um plano para continuar criando imagens profissionais.',
        cta: 'Ver planos',
      };
    }
    if (isZero) {
      return {
        icon: 'fa-bolt',
        emoji: '⚡',
        text: 'Seus créditos acabaram!',
        sub: 'Recarregue agora para continuar gerando.',
        cta: 'Recarregar agora',
      };
    }
    return {
      icon: 'fa-fire-alt',
      emoji: '🔥',
      text: `Apenas ${userCredits} crédito${userCredits !== 1 ? 's' : ''} restante${userCredits !== 1 ? 's' : ''}!`,
      sub: 'Garanta mais créditos antes que acabem.',
      cta: 'Comprar mais',
    };
  };

  const msg = getMessage();

  return (
    <div
      key={bannerKey}
      className="relative bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white overflow-hidden"
    >
      {/* Faixa principal */}
      <div className="relative z-10 flex items-center justify-center gap-4 px-4 py-3 md:py-3.5">
        {/* Ícone animado */}
        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 animate-pulse">
          <i className={`fas ${msg.icon} text-sm text-white`}></i>
        </div>

        {/* Texto */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <span className="text-sm md:text-base font-bold tracking-tight font-serif">{msg.text}</span>
          <span className="text-xs md:text-sm font-medium text-white/80">{msg.sub}</span>
        </div>

        {/* CTA */}
        <button
          onClick={onBuyCredits}
          className="flex-shrink-0 px-5 py-2 rounded-xl text-xs md:text-sm font-extrabold bg-white text-[#FF6B6B] hover:bg-white/90 shadow-lg shadow-black/10 hover:shadow-xl hover:scale-105 transition-all active:scale-95"
        >
          {msg.cta}
        </button>

        {/* Dismiss (só para créditos baixos) */}
        {isLowCredits && (
          <button
            onClick={() => setDismissed(true)}
            className="ml-1 w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/20 text-white/70 hover:text-white flex-shrink-0"
          >
            <i className="fas fa-times text-xs"></i>
          </button>
        )}
      </div>
    </div>
  );
};
