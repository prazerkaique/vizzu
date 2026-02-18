// ═══════════════════════════════════════════════════════════════
// VIZZU - Modal de Aceite dos Termos de Uso
// Padrão Netflix/Airbnb: fullscreen mobile, texto corrido, clean
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import {
  TERMS_SECTIONS,
  PRIVACY_SECTIONS,
  TERMS_EFFECTIVE_DATE,
  CURRENT_TERMS_VERSION,
  LEGAL_FOOTER,
} from '../content/termsContent';

interface Props {
  isOpen: boolean;
  onAccept: () => Promise<boolean>;
  isLoading: boolean;
  /** Modo leitura — mostra "Fechar" em vez de checkbox+aceitar */
  readOnly?: boolean;
  /** Callback para fechar no modo readOnly */
  onClose?: () => void;
}

export const TermsAcceptanceModal: React.FC<Props> = ({ isOpen, onAccept, isLoading, readOnly, onClose }) => {
  const [accepted, setAccepted] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Detectar scroll para esconder o fade de "tem mais conteúdo"
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      if (nearBottom) setShowScrollHint(false);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  if (!isOpen) return null;

  const handleAccept = async () => {
    if (!accepted || isLoading) return;
    await onAccept();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="relative w-full sm:max-w-2xl bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] sm:mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex-shrink-0 px-5 sm:px-8 pt-5 sm:pt-6 pb-4">
          <img src="/Logo2Black.png" alt="Vizzu" className="h-6 mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Termos de Uso e Política de Privacidade
          </h2>
          <p className="text-xs text-gray-400 mt-1.5">
            Versão {CURRENT_TERMS_VERSION} — {TERMS_EFFECTIVE_DATE}
          </p>
          <p className="text-sm text-gray-500 mt-3 leading-relaxed">
            Ao utilizar o Vizzu, você concorda com os termos abaixo. Leia com atenção antes de continuar.
          </p>
        </div>

        {/* ── Divisor ── */}
        <div className="mx-5 sm:mx-8 border-t border-gray-200" />

        {/* ── Corpo scrollável ── */}
        <div className="relative flex-1 min-h-0">
          <div ref={scrollRef} className="overflow-y-auto h-full px-5 sm:px-8 py-5">
            {/* TERMOS DE USO */}
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4">
              Termos de Uso
            </p>

            {TERMS_SECTIONS.map(section => (
              <div key={section.id} className="mb-5">
                <h4 className="text-[13px] font-bold text-gray-900 mb-1">
                  {section.title}
                </h4>
                <p className="text-[13px] text-gray-500 leading-[1.7] whitespace-pre-line">
                  {section.content}
                </p>
              </div>
            ))}

            {/* Divisor entre seções */}
            <div className="border-t border-gray-200 my-8" />

            {/* POLÍTICA DE PRIVACIDADE */}
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4">
              Política de Privacidade
            </p>

            {PRIVACY_SECTIONS.map(section => (
              <div key={section.id} className="mb-5">
                <h4 className="text-[13px] font-bold text-gray-900 mb-1">
                  {section.title}
                </h4>
                <p className="text-[13px] text-gray-500 leading-[1.7] whitespace-pre-line">
                  {section.content}
                </p>
              </div>
            ))}

            {/* Rodapé legal */}
            <div className="border-t border-gray-100 mt-6 pt-4 pb-2">
              <p className="text-[11px] text-gray-400 text-center">
                {LEGAL_FOOTER}
              </p>
            </div>
          </div>

          {/* Fade inferior indicando mais conteúdo */}
          {showScrollHint && (
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          )}
        </div>

        {/* ── Footer fixo ── */}
        <div className="flex-shrink-0 px-5 sm:px-8 py-4 border-t border-gray-200">
          {readOnly ? (
            <button
              type="button"
              onClick={onClose || (() => onAccept())}
              className="w-full py-3.5 rounded-xl font-semibold text-sm tracking-wide transition-all bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.995]"
            >
              Fechar
            </button>
          ) : (
            <>
              <label className="flex items-start gap-3 cursor-pointer mb-3 select-none">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={e => setAccepted(e.target.checked)}
                  className="mt-0.5 w-[18px] h-[18px] rounded border-gray-300 accent-[#FF6B6B] cursor-pointer flex-shrink-0"
                />
                <span className="text-[13px] text-gray-600 leading-snug">
                  Li e concordo com os <strong className="text-gray-800">Termos de Uso</strong> e a <strong className="text-gray-800">Política de Privacidade</strong>.
                </span>
              </label>

              <button
                type="button"
                onClick={handleAccept}
                disabled={!accepted || isLoading}
                className={`w-full py-3.5 rounded-xl text-white font-semibold text-sm tracking-wide transition-all ${
                  accepted && !isLoading
                    ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] hover:shadow-lg hover:scale-[1.005] active:scale-[0.995]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Salvando...
                  </span>
                ) : (
                  'Aceitar e Continuar'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
