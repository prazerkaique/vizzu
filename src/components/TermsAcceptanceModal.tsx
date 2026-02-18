// ═══════════════════════════════════════════════════════════════
// VIZZU - Modal de Aceite dos Termos de Uso
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  TERMS_SECTIONS,
  PRIVACY_SECTIONS,
  TERMS_SUMMARY,
  TERMS_EFFECTIVE_DATE,
  CURRENT_TERMS_VERSION,
  LEGAL_FOOTER,
  type TermsSection,
} from '../content/termsContent';

interface Props {
  isOpen: boolean;
  onAccept: () => Promise<boolean>;
  isLoading: boolean;
}

type Tab = 'terms' | 'privacy';

// ─── Accordion Section ──────────────────────────────────────
function AccordionItem({ section }: { section: TermsSection }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 px-1 text-left hover:bg-gray-50/50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-800">{section.title}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ml-2 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="pb-4 px-1 text-sm text-gray-600 leading-relaxed whitespace-pre-line animate-[fadeIn_0.2s_ease-out]">
          {section.content}
        </div>
      )}
    </div>
  );
}

// ─── Main Modal ─────────────────────────────────────────────
export const TermsAcceptanceModal: React.FC<Props> = ({ isOpen, onAccept, isLoading }) => {
  const [accepted, setAccepted] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('terms');

  if (!isOpen) return null;

  const handleAccept = async () => {
    if (!accepted || isLoading) return;
    await onAccept();
  };

  const sections = activeTab === 'terms' ? TERMS_SECTIONS : PRIVACY_SECTIONS;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: 'min(90vh, 800px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <img src="/Logo2Black.png" alt="Vizzu" className="h-7" />
          </div>
          <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Termos de Uso e Privacidade
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Versão {CURRENT_TERMS_VERSION} — {TERMS_EFFECTIVE_DATE}
          </p>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {/* Resumo */}
          <div className="bg-gradient-to-br from-orange-50 to-rose-50 rounded-xl p-4 mb-5 border border-orange-100/60">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Resumo</p>
            <ul className="space-y-1.5">
              {TERMS_SUMMARY.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-[#FF6B6B] mt-0.5 flex-shrink-0">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setActiveTab('terms')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
                activeTab === 'terms'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Termos de Uso
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
                activeTab === 'privacy'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Política de Privacidade
            </button>
          </div>

          {/* Accordion Sections */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            {sections.map(section => (
              <AccordionItem key={section.id} section={section} />
            ))}
          </div>

          {/* Legal footer */}
          <p className="text-[11px] text-gray-400 mt-4 text-center italic">
            {LEGAL_FOOTER}
          </p>
        </div>

        {/* ── Footer (fixo) ── */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
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
