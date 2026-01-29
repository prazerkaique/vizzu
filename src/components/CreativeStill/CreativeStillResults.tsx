import React, { useState } from 'react';
import { CreativeStillGeneration, CreativeStillWizardState } from '../../types';

interface Props {
  theme: 'dark' | 'light';
  generation: CreativeStillGeneration | null;
  wizardState: CreativeStillWizardState;
  isGenerating: boolean;
  progress: number;
  loadingText: string;
  onBackToHome: () => void;
  onGenerateAgain: () => void;
  onSaveTemplate: (name: string) => Promise<void>;
}

export const CreativeStillResults: React.FC<Props> = ({
  theme,
  generation,
  wizardState,
  isGenerating,
  progress,
  loadingText,
  onBackToHome,
  onGenerateAgain,
  onSaveTemplate,
}) => {
  const [selectedVariation, setSelectedVariation] = useState<1 | 2 | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  const isDark = theme === 'dark';

  const handleSave = async () => {
    if (!templateName.trim()) return;
    setSavingTemplate(true);
    try {
      await onSaveTemplate(templateName);
      setShowSaveModal(false);
      setTemplateName('');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDownload = (url: string, variation: number) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `still-criativo-${wizardState.mainProduct?.name || 'produto'}-v${variation}.png`;
    link.click();
  };

  // ============================================================
  // LOADING STATE
  // ============================================================
  if (isGenerating) {
    return (
      <div className={'flex-1 overflow-y-auto flex items-center justify-center p-4 ' + (isDark ? '' : 'bg-[#F5F5F7]')}>
        <div className="max-w-md w-full text-center">
          <div className={'w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-6 ' + (isDark ? 'bg-amber-500/20' : 'bg-amber-100')}>
            <i className={'fas fa-palette text-3xl animate-pulse ' + (isDark ? 'text-amber-400' : 'text-amber-500')}></i>
          </div>
          <h2 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xl font-bold mb-2'}>Criando seu Still...</h2>
          <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-sm mb-6'}>{loadingText}</p>

          {/* Progress bar */}
          <div className={'w-full h-2 rounded-full overflow-hidden mb-2 ' + (isDark ? 'bg-neutral-800' : 'bg-gray-200')}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-xs'}>{progress}%</p>

          {/* Product info */}
          {wizardState.mainProduct && (
            <div className={'mt-8 rounded-xl p-4 ' + (isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-200 shadow-sm')}>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide mb-1'}>Gerando para</p>
              <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>{wizardState.mainProduct.name}</p>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mt-0.5'}>
                2 variações · {wizardState.mode === 'simple' ? 'Modo Simples' : 'Modo Avançado'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // ERROR STATE
  // ============================================================
  if (generation?.status === 'failed') {
    return (
      <div className={'flex-1 overflow-y-auto flex items-center justify-center p-4 ' + (isDark ? '' : 'bg-[#F5F5F7]')}>
        <div className="max-w-md w-full text-center">
          <div className={'w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-6 ' + (isDark ? 'bg-red-500/20' : 'bg-red-100')}>
            <i className={'fas fa-exclamation-triangle text-3xl ' + (isDark ? 'text-red-400' : 'text-red-500')}></i>
          </div>
          <h2 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xl font-bold mb-2'}>Erro na geração</h2>
          <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-sm mb-6'}>
            {generation.error_message || 'Ocorreu um erro ao gerar suas imagens. Tente novamente.'}
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={onBackToHome} className={(isDark ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' px-4 py-2.5 rounded-xl text-sm font-medium transition-colors'}>
              Voltar
            </button>
            <button onClick={onGenerateAgain} className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-semibold">
              <i className="fas fa-redo mr-2 text-xs"></i>Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // SUCCESS STATE
  // ============================================================
  return (
    <div className={'flex-1 overflow-y-auto p-4 md:p-6 ' + (isDark ? '' : 'bg-[#F5F5F7]')} style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 1rem))' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onBackToHome} className={(isDark ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-900') + ' p-2 -ml-2 rounded-lg transition-colors'}>
              <i className="fas fa-arrow-left"></i>
            </button>
            <div>
              <h1 className={(isDark ? 'text-white' : 'text-[#1A1A1A]') + ' text-lg font-semibold'}>Resultado</h1>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>
                {wizardState.mainProduct?.name || 'Still Criativo'}
              </p>
            </div>
          </div>
        </div>

        {/* Variações */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {[1, 2].map(v => {
            const url = v === 1 ? generation?.variation_1_url : generation?.variation_2_url;
            const isSelected = selectedVariation === v;
            return (
              <div key={v} className="space-y-2">
                <button
                  onClick={() => setSelectedVariation(v as 1 | 2)}
                  className={'w-full rounded-xl overflow-hidden border-2 transition-all ' +
                    (isSelected
                      ? (isDark ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-amber-400 ring-2 ring-amber-300')
                      : (isDark ? 'border-neutral-800 hover:border-neutral-700' : 'border-gray-200 hover:border-gray-300')
                    )}
                >
                  <div className={'aspect-[4/5] flex items-center justify-center ' + (isDark ? 'bg-neutral-900' : 'bg-gray-100')}>
                    {url ? (
                      <img src={url} alt={`Variação ${v}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <i className={'fas fa-image text-4xl mb-2 ' + (isDark ? 'text-neutral-700' : 'text-gray-300')}></i>
                        <p className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-sm'}>Variação {v}</p>
                        <p className={(isDark ? 'text-neutral-700' : 'text-gray-300') + ' text-xs mt-1'}>Preview disponível após integração com n8n</p>
                      </div>
                    )}
                  </div>
                </button>
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className={'w-4 h-4 rounded-full border-2 flex items-center justify-center ' + (isSelected ? 'border-amber-500 bg-amber-500' : (isDark ? 'border-neutral-700' : 'border-gray-300'))}>
                      {isSelected && <i className="fas fa-check text-[8px] text-white"></i>}
                    </div>
                    <span className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-xs'}>Variação {v}</span>
                  </div>
                  {url && (
                    <button
                      onClick={() => handleDownload(url, v)}
                      className={(isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-500') + ' text-xs font-medium'}
                    >
                      <i className="fas fa-download mr-1"></i>Download
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Ações */}
        <div className={'rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3 ' + (isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-200 shadow-sm')}>
          <button
            onClick={onGenerateAgain}
            className={'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ' + (isDark ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200')}
          >
            <i className="fas fa-redo text-xs"></i>Gerar Novas Variações
          </button>
          <button
            onClick={() => setShowSaveModal(true)}
            className={'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ' + (isDark ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200')}
          >
            <i className="fas fa-bookmark text-xs"></i>Salvar Template
          </button>
          <button
            onClick={onBackToHome}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-semibold"
          >
            <i className="fas fa-check text-xs"></i>Finalizar
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL: Salvar Template */}
      {/* ============================================================ */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowSaveModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
          <div
            onClick={(e) => e.stopPropagation()}
            className={'relative w-full max-w-sm mx-4 rounded-2xl overflow-hidden ' + (isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-white shadow-xl')}
          >
            <div className="p-5">
              <div className={'w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-4 ' + (isDark ? 'bg-amber-500/20' : 'bg-amber-100')}>
                <i className={'fas fa-bookmark text-xl ' + (isDark ? 'text-amber-400' : 'text-amber-500')}></i>
              </div>
              <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-base font-semibold text-center mb-1'}>Salvar como Template</h3>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs text-center mb-4'}>
                Este template poderá ser usado para criar stills com outros produtos mantendo o mesmo estilo.
              </p>
              <input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Nome do template..."
                className={'w-full rounded-lg px-3 py-2.5 text-sm mb-4 ' + (isDark ? 'bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-600' : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400')}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className={'flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ' + (isDark ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700')}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={!templateName.trim() || savingTemplate}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingTemplate ? <i className="fas fa-spinner fa-spin"></i> : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
