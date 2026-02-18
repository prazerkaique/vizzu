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
      className="relative bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white overflow-hidden animate-[softBlink_3s_ease-in-out_infinite]"
    >
      {/* Faixa compacta */}
      <div className="relative z-10 flex items-center justify-center gap-3 px-4 py-1.5">
        <i className={`fas ${msg.icon} text-[10px] text-white/90`}></i>

        <span className="text-xs font-bold tracking-tight">{msg.text}</span>
        <span className="text-[10px] font-medium text-white/70 hidden sm:inline">{msg.sub}</span>

        <button
          onClick={onBuyCredits}
          className="flex-shrink-0 px-3.5 py-1 rounded-lg text-[10px] font-extrabold bg-white text-[#FF6B6B] hover:bg-white/90 shadow-sm hover:scale-105 transition-all active:scale-95"
        >
          {msg.cta}
        </button>

        {isLowCredits && (
          <button
            onClick={() => setDismissed(true)}
            className="w-5 h-5 rounded-full flex items-center justify-center transition-colors hover:bg-white/20 text-white/60 hover:text-white flex-shrink-0"
          >
            <i className="fas fa-times text-[8px]"></i>
          </button>
        )}
      </div>

      <style>{`
        @keyframes softBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.82; }
        }
      `}</style>
    </div>
  );
};
