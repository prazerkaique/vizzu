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

  // Reset dismiss ao trocar de estado (ex: comprou créditos e gastou de novo)
  const bannerKey = `${userCredits}-${currentPlanId}`;

  const isUrgent = isTrialExhausted || isZero;

  const getMessage = () => {
    if (isTrialExhausted) {
      return {
        icon: 'fa-rocket',
        text: 'Seu teste gratuito acabou! Escolha um plano para continuar criando.',
        cta: 'Ver planos',
      };
    }
    if (isZero) {
      return {
        icon: 'fa-bolt',
        text: 'Seus créditos acabaram. Recarregue para continuar gerando.',
        cta: 'Recarregar',
      };
    }
    return {
      icon: 'fa-coins',
      text: `Restam apenas ${userCredits} crédito${userCredits !== 1 ? 's' : ''} na sua conta.`,
      cta: 'Comprar mais',
    };
  };

  const msg = getMessage();

  return (
    <div
      key={bannerKey}
      className={`relative flex items-center justify-center gap-3 px-4 py-2.5 text-xs font-medium transition-all ${
        isUrgent
          ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white'
          : isDark
            ? 'bg-gradient-to-r from-[#FF6B6B]/10 to-[#FF9F43]/10 text-gray-300 border-b border-[#FF6B6B]/15'
            : 'bg-gradient-to-r from-[#FF6B6B]/5 to-[#FF9F43]/5 text-gray-700 border-b border-[#FF6B6B]/10'
      }`}
    >
      <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
        isUrgent
          ? 'bg-white/20'
          : isDark ? 'bg-[#FF6B6B]/20' : 'bg-[#FF6B6B]/10'
      }`}>
        <i className={`fas ${msg.icon} text-[9px] ${isUrgent ? 'text-white' : 'text-[#FF6B6B]'}`}></i>
      </div>

      <span className="font-medium">{msg.text}</span>

      <button
        onClick={onBuyCredits}
        className={`ml-1 px-3.5 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:scale-105 ${
          isUrgent
            ? 'bg-white text-[#FF6B6B] hover:bg-white/90 shadow-sm'
            : 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white shadow-sm shadow-[#FF6B6B]/20'
        }`}
      >
        {msg.cta}
      </button>

      {/* Dismiss (só para aviso de créditos baixos, não para zero/trial) */}
      {isLowCredits && (
        <button
          onClick={() => setDismissed(true)}
          className={`ml-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
            isDark ? 'hover:bg-white/10 text-gray-500' : 'hover:bg-gray-200/50 text-gray-400'
          }`}
        >
          <i className="fas fa-times text-[8px]"></i>
        </button>
      )}
    </div>
  );
};
