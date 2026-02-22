// ═══════════════════════════════════════════════════════════════
// VIZZU - CreditExchangeModal (Conversor de Créditos)
// Troca créditos regulares por créditos de edição (taxa 1:2)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import type { VizzuTheme } from '../../contexts/UIContext';

interface CreditExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  regularBalance: number;
  editBalance: number;
  onExchange: (amount: number) => Promise<{ success: boolean; error?: string; editCredited?: number }>;
  theme?: VizzuTheme;
}

export const CreditExchangeModal: React.FC<CreditExchangeModalProps> = ({
  isOpen,
  onClose,
  regularBalance,
  editBalance,
  onExchange,
  theme = 'dark',
}) => {
  const [amount, setAmount] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<{ success: boolean; editCredited?: number } | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const isDark = theme !== 'light';
  const maxAmount = Math.min(regularBalance, 50);
  const editOutput = amount * 2;

  useEffect(() => {
    if (isOpen) {
      setAmount(1);
      setResult(null);
      setShowConfirm(false);
      setIsLoading(false);
      cancelRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, isLoading, onClose]);

  const handleExchange = async () => {
    if (amount < 1 || amount > maxAmount || isLoading) return;
    setIsLoading(true);
    try {
      const res = await onExchange(amount);
      if (res.success) {
        setResult({ success: true, editCredited: res.editCredited });
      } else {
        setResult({ success: false });
      }
    } catch {
      setResult({ success: false });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={isLoading ? undefined : onClose}
      />

      <div className={
        'relative w-full max-w-sm rounded-2xl border p-6 shadow-2xl ' +
        (isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200')
      }>
        {/* Icon */}
        <div className={'w-12 h-12 rounded-xl flex items-center justify-center mb-4 ' + (isDark ? 'bg-emerald-500/10' : 'bg-emerald-50')}>
          <i className="fas fa-arrow-right-arrow-left text-lg text-emerald-500"></i>
        </div>

        {/* Title */}
        <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-base font-bold mb-1'}>
          Converter Créditos
        </h3>
        <p className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-sm mb-4'}>
          Transforme créditos de geração em créditos de edição
        </p>

        {/* Explicação dos tipos de crédito */}
        <div className={'rounded-xl p-3 mb-4 space-y-2 ' + (isDark ? 'bg-neutral-800/50' : 'bg-gray-50')}>
          <div className="flex items-start gap-2.5">
            <div className={'w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ' + (isDark ? 'bg-neutral-700' : 'bg-gray-200')}>
              <i className={'fas fa-wand-magic-sparkles text-[10px] ' + (isDark ? 'text-neutral-300' : 'text-gray-600')}></i>
            </div>
            <div>
              <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-semibold'}>Crédito de Geração</p>
              <p className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px] leading-relaxed'}>
                Cria imagens novas do zero (Product Studio, Look Composer, Creative Still, Modelos)
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 bg-emerald-500/10">
              <i className="fas fa-pen-to-square text-[10px] text-emerald-500"></i>
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-400">Crédito de Edição</p>
              <p className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px] leading-relaxed'}>
                Corrige e ajusta imagens já geradas (varinha de edição)
              </p>
            </div>
          </div>
        </div>

        {result ? (
          /* Resultado */
          <div className="text-center py-4">
            {result.success ? (
              <>
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-check text-2xl text-emerald-400"></i>
                </div>
                <p className={(isDark ? 'text-white' : 'text-gray-900') + ' font-semibold mb-1'}>Conversão realizada!</p>
                <p className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-sm'}>
                  +{result.editCredited} créditos de edição adicionados
                </p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-xmark text-2xl text-red-400"></i>
                </div>
                <p className={(isDark ? 'text-white' : 'text-gray-900') + ' font-semibold mb-1'}>Erro na conversão</p>
                <p className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-sm'}>Tente novamente</p>
              </>
            )}
            <button
              onClick={onClose}
              className={
                'mt-4 w-full py-2.5 rounded-xl text-sm font-medium transition-colors ' +
                (isDark ? 'bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200')
              }
            >
              Fechar
            </button>
          </div>
        ) : showConfirm ? (
          /* Tela de confirmação */
          <div>
            <div className={
              'rounded-xl p-4 mb-4 border ' +
              (isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200')
            }>
              <p className={(isDark ? 'text-amber-300' : 'text-amber-700') + ' text-xs font-semibold mb-2'}>
                <i className="fas fa-triangle-exclamation mr-1.5"></i>
                Tem certeza que deseja converter seus créditos?
              </p>
              <p className={(isDark ? 'text-amber-300/70' : 'text-amber-600') + ' text-[10px] leading-relaxed'}>
                Essa ação vai retirar <strong>{amount}</strong> crédito{amount > 1 ? 's' : ''} de geração da sua conta
                e adicionar <strong>{editOutput}</strong> crédito{editOutput > 1 ? 's' : ''} de edição.
                Créditos de edição servem apenas para corrigir imagens já geradas.
                Essa conversão não pode ser desfeita.
              </p>
            </div>

            <div className={'rounded-xl p-3 mb-4 border ' + (isDark ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100')}>
              <div className="flex items-center justify-center gap-3 text-sm">
                <span className={(isDark ? 'text-white' : 'text-gray-900') + ' font-bold'}>
                  {amount} <span className="font-normal text-xs">geração</span>
                </span>
                <i className="fas fa-arrow-right text-[#FF6B6B] text-xs"></i>
                <span className="text-emerald-400 font-bold">
                  {editOutput} <span className="font-normal text-xs">edição</span>
                </span>
              </div>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] text-center mt-1'}>
                Saldo final: {regularBalance - amount} geração + {editBalance + editOutput} edição
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isLoading}
                className={
                  'flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ' +
                  (isDark
                    ? 'bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200')
                }
              >
                Voltar
              </button>
              <button
                onClick={handleExchange}
                disabled={isLoading}
                className={
                  'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ' +
                  'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] hover:opacity-90 text-white' +
                  (isLoading ? ' opacity-70 cursor-not-allowed' : '')
                }
              >
                {isLoading ? (
                  <>
                    <i className="fas fa-circle-notch fa-spin text-xs"></i>
                    Convertendo...
                  </>
                ) : (
                  'Confirmar Conversão'
                )}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Saldos */}
            <div className={'grid grid-cols-2 gap-3 mb-4 p-3 rounded-xl ' + (isDark ? 'bg-neutral-800/50' : 'bg-gray-50')}>
              <div>
                <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[9px] uppercase tracking-wider font-medium mb-0.5'}>Geração</p>
                <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-lg font-bold'}>{regularBalance}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider font-medium mb-0.5 text-emerald-500">Edição</p>
                <p className="text-lg font-bold text-emerald-400">{editBalance}</p>
              </div>
            </div>

            {/* Quantidade */}
            <div className="mb-4">
              <label className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-xs font-semibold mb-2 block'}>
                Quantos créditos de geração deseja converter?
              </label>

              {/* Botões rápidos */}
              <div className="flex gap-2 mb-3">
                {[1, 2, 5, 10].filter(n => n <= maxAmount).map(n => (
                  <button
                    key={n}
                    onClick={() => setAmount(n)}
                    className={
                      'flex-1 py-2 rounded-lg text-xs font-semibold transition-all border ' +
                      (amount === n
                        ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white border-transparent'
                        : isDark
                          ? 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:border-neutral-600'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300')
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>

              {/* Input slider */}
              {maxAmount > 1 && (
                <input
                  type="range"
                  min={1}
                  max={maxAmount}
                  value={amount}
                  onChange={(e) => setAmount(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#FF6B6B]"
                  style={{
                    background: `linear-gradient(to right, #FF6B6B 0%, #FF9F43 ${(amount / maxAmount) * 100}%, ${isDark ? '#262626' : '#e5e7eb'} ${(amount / maxAmount) * 100}%)`,
                  }}
                />
              )}
            </div>

            {/* Preview */}
            <div className={
              'rounded-xl p-3 mb-4 border ' +
              (isDark ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100')
            }>
              <div className="flex items-center justify-center gap-3 text-sm">
                <span className={(isDark ? 'text-white' : 'text-gray-900') + ' font-bold'}>
                  {amount} <span className="font-normal text-xs">geração</span>
                </span>
                <i className="fas fa-arrow-right text-[#FF6B6B] text-xs"></i>
                <span className="text-emerald-400 font-bold">
                  {editOutput} <span className="font-normal text-xs">edição</span>
                </span>
              </div>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] text-center mt-1'}>
                Saldo final: {regularBalance - amount} geração + {editBalance + editOutput} edição
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                ref={cancelRef}
                onClick={isLoading ? undefined : onClose}
                disabled={isLoading}
                className={
                  'flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ' +
                  (isDark
                    ? 'bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200')
                }
              >
                Cancelar
              </button>
              <button
                onClick={() => setShowConfirm(true)}
                disabled={amount < 1 || amount > maxAmount}
                className={
                  'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ' +
                  'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] hover:opacity-90 text-white'
                }
              >
                <i className="fas fa-arrow-right-arrow-left text-xs"></i>
                Converter
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
