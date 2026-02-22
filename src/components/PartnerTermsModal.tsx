// ═══════════════════════════════════════════════════════════════
// Modal de Aceite dos Termos do Programa de Parceiros
// Mesmo layout do TermsAcceptanceModal
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  PARTNER_TERMS_SECTIONS,
  PARTNER_TERMS_EFFECTIVE_DATE,
  PARTNER_TERMS_VERSION,
} from '../content/partnerTermsContent';

interface Props {
  isOpen: boolean;
  onAccept: () => Promise<boolean>;
  isLoading: boolean;
  readOnly?: boolean;
  onClose?: () => void;
}

export const PartnerTermsModal: React.FC<Props> = ({ isOpen, onAccept, isLoading, readOnly, onClose }) => {
  const [accepted, setAccepted] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      if (nearBottom) setShowScrollHint(false);
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setShowScrollHint(true);
      setCopied(false);
      setAccepted(false);
    }
  }, [isOpen]);

  const handleCopy = useCallback(async () => {
    const text = [
      'TERMOS DO PROGRAMA DE PARCEIROS — VIZZU',
      `Versão ${PARTNER_TERMS_VERSION} — ${PARTNER_TERMS_EFFECTIVE_DATE}`,
      '',
      ...PARTNER_TERMS_SECTIONS.map(s => `${s.title}\n${s.content}`),
    ].join('\n\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  if (!isOpen) return null;

  const handleAccept = async () => {
    if (!accepted || isLoading) return;
    await onAccept();
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center"
      style={{ isolation: 'isolate' }}
      onClick={readOnly ? handleClose : undefined}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
      <div
        className="relative w-full sm:max-w-2xl bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: 'min(90vh, 90dvh)', height: 'auto', maxWidth: readOnly ? '42rem' : undefined }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-5 sm:px-8 pt-5 sm:pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]">
                <i className="fas fa-handshake text-white"></i>
              </div>
              <img src="/Logo2Black.png" alt="Vizzu" className="h-5" />
            </div>
            {(readOnly || onClose) && (
              <button
                type="button"
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <i className="fas fa-times text-sm"></i>
              </button>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight mt-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Programa de Parceiros
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Versão {PARTNER_TERMS_VERSION} — {PARTNER_TERMS_EFFECTIVE_DATE}
          </p>
          {!readOnly && (
            <p className="text-sm text-gray-500 mt-3 leading-relaxed">
              Leia os termos do programa de indicação antes de participar.
            </p>
          )}
        </div>

        <div className="mx-5 sm:mx-8 border-t border-gray-200 flex-shrink-0" />

        {/* Corpo scrollável */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-8 py-5"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain', maxHeight: '50vh' }}
        >
          {PARTNER_TERMS_SECTIONS.map(section => (
            <div key={section.id} className="mb-5">
              <h4 className="text-[13px] font-bold text-gray-900 mb-1">
                {section.title}
              </h4>
              <p className="text-[13px] text-gray-500 leading-[1.7] whitespace-pre-line">
                {section.content}
              </p>
            </div>
          ))}
        </div>

        {/* Fade */}
        {showScrollHint && (
          <div className="absolute bottom-[60px] left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        )}

        {/* Footer */}
        <div className="flex-shrink-0 px-5 sm:px-8 py-4 border-t border-gray-200 bg-white sm:rounded-b-2xl">
          {readOnly ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className={`flex-shrink-0 px-4 py-3 rounded-xl font-semibold text-sm tracking-wide transition-all border ${
                  copied
                    ? 'bg-green-50 border-green-200 text-green-600'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                }`}
              >
                <i className={`fas ${copied ? 'fa-check' : 'fa-copy'} mr-1.5`}></i>
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-3 rounded-xl font-semibold text-sm tracking-wide transition-all bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-700 active:scale-[0.995]"
              >
                Fechar
              </button>
            </div>
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
                  Li e concordo com os <strong className="text-gray-800">Termos do Programa de Parceiros</strong>.
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
                  'Participar do Programa'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
