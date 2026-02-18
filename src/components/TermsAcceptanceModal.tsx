// ═══════════════════════════════════════════════════════════════
// VIZZU - Modal de Aceite dos Termos de Uso
// Estilo contrato: texto corrido, seções numeradas, scroll
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
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
}

export const TermsAcceptanceModal: React.FC<Props> = ({ isOpen, onAccept, isLoading }) => {
  const [accepted, setAccepted] = useState(false);

  if (!isOpen) return null;

  const handleAccept = async () => {
    if (!accepted || isLoading) return;
    await onAccept();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: 'min(92vh, 860px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <img src="/Logo2Black.png" alt="Vizzu" className="h-7" />
          </div>
          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Termos de Uso e Política de Privacidade
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Versão {CURRENT_TERMS_VERSION} — Vigência: {TERMS_EFFECTIVE_DATE}
          </p>
        </div>

        {/* ── Corpo scrollável (texto corrido estilo contrato) ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          {/* ── TERMOS DE USO ── */}
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
            Termos de Uso
          </h3>

          {TERMS_SECTIONS.map(section => (
            <div key={section.id} className="mb-5">
              <h4 className="text-sm font-bold text-gray-800 mb-1.5">
                {section.title}
              </h4>
              <div className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-line">
                {section.content}
              </div>
            </div>
          ))}

          {/* ── Divisor ── */}
          <div className="border-t border-gray-200 my-6" />

          {/* ── POLÍTICA DE PRIVACIDADE ── */}
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
            Política de Privacidade
          </h3>

          {PRIVACY_SECTIONS.map(section => (
            <div key={section.id} className="mb-5">
              <h4 className="text-sm font-bold text-gray-800 mb-1.5">
                {section.title}
              </h4>
              <div className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-line">
                {section.content}
              </div>
            </div>
          ))}

          {/* Legal footer */}
          <div className="border-t border-gray-100 mt-6 pt-4">
            <p className="text-[11px] text-gray-400 text-center italic">
              {LEGAL_FOOTER}
            </p>
          </div>
        </div>

        {/* ── Footer (fixo) ── */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50/50 rounded-b-2xl">
          <label className="flex items-start gap-3 cursor-pointer mb-4 select-none">
            <input
              type="checkbox"
              checked={accepted}
              onChange={e => setAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-[#FF6B6B] cursor-pointer flex-shrink-0"
            />
            <span className="text-sm text-gray-700 leading-snug">
              Li e aceito os <strong>Termos de Uso</strong> e a <strong>Política de Privacidade</strong> do Vizzu.
            </span>
          </label>

          <button
            type="button"
            onClick={handleAccept}
            disabled={!accepted || isLoading}
            className={`w-full py-3 rounded-xl text-white font-semibold text-sm transition-all ${
              accepted && !isLoading
                ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]'
                : 'bg-gray-300 cursor-not-allowed'
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
        </div>
      </div>
    </div>
  );
};
