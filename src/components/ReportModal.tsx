import React, { useState, useEffect } from 'react';
import type { ReportGenerationType } from '../lib/api/reports';
import type { VizzuTheme } from '../contexts/UIContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (observation: string) => Promise<void>;
  generationType: ReportGenerationType;
  productName?: string;
  theme?: VizzuTheme;
}

const TYPE_LABELS: Record<ReportGenerationType, string> = {
  'product-studio': 'Product Studio',
  'look-composer': 'Look Composer',
  'creative-still': 'Still Criativo',
  'provador': 'Provador Virtual',
};

export const ReportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmit,
  generationType,
  productName,
  theme = 'dark',
}) => {
  const [observation, setObservation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isDark = theme !== 'light';

  useEffect(() => {
    if (isOpen) {
      setObservation('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const canSubmit = observation.trim().length >= 10 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await onSubmit(observation.trim());
      onClose();
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative z-10 w-full max-w-[420px] mx-4 rounded-2xl overflow-hidden ${isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-200'}`}>
        {/* Close */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isDark ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-gray-100 text-gray-400'}`}
        >
          <i className="fas fa-times"></i>
        </button>

        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center">
              <i className="fas fa-flag text-2xl text-amber-400"></i>
            </div>
          </div>

          {/* Title */}
          <h2 className={`text-lg font-bold text-center mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Reportar Problema
          </h2>

          {/* Subtitle */}
          <p className={`text-xs text-center mb-5 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
            Descreva o que deu errado com esta imagem.
            {' '}Se confirmado, você receberá <span className="text-amber-400 font-semibold">1 crédito</span> em até 24h.
          </p>

          {/* Context badge */}
          <div className="flex justify-center mb-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-medium ${isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-gray-100 text-gray-600'}`}>
              <i className="fas fa-image text-[8px]"></i>
              {TYPE_LABELS[generationType]}{productName ? ` · ${productName}` : ''}
            </span>
          </div>

          {/* Textarea */}
          <div className="relative mb-4">
            <textarea
              value={observation}
              onChange={e => setObservation(e.target.value.slice(0, 500))}
              placeholder="Ex: A imagem ficou com defeito no braço, produto com cores erradas, fundo diferente do esperado..."
              rows={3}
              className={`w-full px-3 py-2.5 rounded-xl text-sm resize-none transition-colors ${isDark
                ? 'bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:border-amber-500/50'
                : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-amber-400'
              } outline-none`}
              autoFocus
            />
            <span className={`absolute bottom-2 right-3 text-[10px] ${isDark ? 'text-neutral-600' : 'text-gray-300'}`}>
              {observation.length}/500
            </span>
          </div>

          {/* Min chars hint */}
          {observation.length > 0 && observation.length < 10 && (
            <p className={`text-[10px] mb-3 ${isDark ? 'text-amber-400/70' : 'text-amber-600'}`}>
              <i className="fas fa-info-circle mr-1"></i>
              Mínimo de 10 caracteres para enviar
            </p>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark
                ? 'border border-neutral-700 text-neutral-300 hover:bg-neutral-800'
                : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <><i className="fas fa-spinner fa-spin mr-1.5"></i>Enviando...</>
              ) : (
                <><i className="fas fa-paper-plane mr-1.5"></i>Enviar Report</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
