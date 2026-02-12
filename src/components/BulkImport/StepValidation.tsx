import React, { useMemo, useState } from 'react';
import type { BulkProduct, ImportResults } from './types';

interface StepValidationProps {
  theme: 'light' | 'dark';
  products: BulkProduct[];
  importResults: ImportResults;
  onComplete: () => void;
}

const MAX_SAMPLE = 10;

export function StepValidation({ theme, products, importResults, onComplete }: StepValidationProps) {
  const isDark = theme === 'dark';

  // Selecionar amostra aleatória dos produtos importados com sucesso
  const sample = useMemo(() => {
    const successNames = new Set(importResults.success);
    const successProducts = products.filter(p => successNames.has(p.name));

    if (successProducts.length <= MAX_SAMPLE) return successProducts;

    // Shuffle e pegar os primeiros MAX_SAMPLE
    const shuffled = [...successProducts].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, MAX_SAMPLE);
  }, [products, importResults.success]);

  const [feedback, setFeedback] = useState<Record<string, 'correct' | 'incorrect'>>({});

  const toggleFeedback = (id: string) => {
    setFeedback(prev => {
      const current = prev[id];
      if (current === 'correct') return { ...prev, [id]: 'incorrect' };
      return { ...prev, [id]: 'correct' };
    });
  };

  if (sample.length === 0) {
    // Nenhum produto com sucesso — pular direto
    return (
      <div className="text-center space-y-4 py-6">
        <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-amber-500/10">
          <i className="fas fa-triangle-exclamation text-amber-500 text-2xl"></i>
        </div>
        <p className={`text-sm ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
          Nenhum produto importado com sucesso para validar.
        </p>
        <button
          onClick={onComplete}
          className="px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:opacity-90"
        >
          Ver resumo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
          <i className={`fas fa-clipboard-check text-xl ${isDark ? 'text-neutral-300' : 'text-gray-600'}`}></i>
        </div>
        <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Tudo certo por aqui?</h4>
        <p className={`text-sm ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
          Dê uma olhada rápida se os nomes e categorias estão corretos
        </p>
      </div>

      {/* Sample grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
        {sample.map(product => {
          const status = feedback[product.id];
          return (
            <div
              key={product.id}
              onClick={() => toggleFeedback(product.id)}
              className={`relative rounded-xl overflow-hidden cursor-pointer transition-all border-2 ${
                status === 'correct'
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                  : status === 'incorrect'
                    ? 'border-red-500 ring-2 ring-red-500/20'
                    : isDark ? 'border-white/10 hover:border-white/20' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Image */}
              <div className="aspect-square bg-gray-100">
                <img src={product.rawImages[0]?.base64} alt="" className="w-full h-full object-cover" />
              </div>

              {/* Info */}
              <div className={`p-2.5 ${isDark ? 'bg-neutral-800' : 'bg-white'}`}>
                <p className={`text-xs font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{product.name}</p>
                <p className={`text-[11px] truncate ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                  {product.category || 'Sem categoria'} {product.color ? `· ${product.color}` : ''}
                </p>
              </div>

              {/* Status badge */}
              {status && (
                <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center ${
                  status === 'correct' ? 'bg-emerald-500' : 'bg-red-500'
                }`}>
                  <i className={`fas ${status === 'correct' ? 'fa-check' : 'fa-xmark'} text-white text-xs`}></i>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className={`text-xs text-center ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>
        Toque no produto para aprovar ou reprovar
      </p>

      {/* CTA */}
      <div className="flex justify-center">
        <button
          onClick={onComplete}
          className="px-6 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:opacity-90 transition-opacity"
        >
          Tudo certo, finalizar
          <i className="fas fa-arrow-right ml-2"></i>
        </button>
      </div>
    </div>
  );
}
