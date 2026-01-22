// ═══════════════════════════════════════════════════════════════
// VIZZU - Look Composer Editor (Página 2 - Faseada)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo, useEffect } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Product, HistoryLog, SavedModel, LookComposition, MODEL_OPTIONS } from '../../types';

interface LookComposerEditorProps {
  product: Product;
  products: Product[];
  userCredits: number;
  onUpdateProduct: (productId: string, updates: Partial<Product>) => void;
  onDeductCredits: (amount: number, reason: string) => boolean;
  onAddHistoryLog: (action: string, details: string, status: HistoryLog['status'], items: Product[], method: HistoryLog['method'], cost: number) => void;
  onBack: () => void;
  onCheckCredits?: (creditsNeeded: number, actionContext: 'studio' | 'cenario' | 'lifestyle' | 'video' | 'provador' | 'generic') => boolean;
  theme?: 'dark' | 'light';
  userId?: string;
  savedModels: SavedModel[];
  onSaveModel?: (model: SavedModel) => void;
  onOpenCreateModel?: () => void;
  // Props para geração global
  isGenerating?: boolean;
  isMinimized?: boolean;
  generationProgress?: number;
  generationText?: string;
  onSetGenerating?: (value: boolean) => void;
  onSetMinimized?: (value: boolean) => void;
  onSetProgress?: (value: number) => void;
  onSetLoadingText?: (value: string) => void;
  isAnyGenerationRunning?: boolean;
}

// Frases de loading
const LOADING_PHRASES = [
  "Preparando o modelo...",
  "Vestindo o look selecionado...",
  "Ajustando a composição...",
  "Aplicando o fundo escolhido...",
  "Processando texturas...",
  "Harmonizando cores e estilos...",
  "Finalizando detalhes...",
  "Otimizando a imagem...",
  "Quase pronto! Últimos ajustes..."
];

// Fundos pré-setados
const PRESET_BACKGROUNDS = [
  { id: 'urban', name: 'Urbano', url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800', category: 'cidade' },
  { id: 'nature', name: 'Natureza', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800', category: 'natureza' },
  { id: 'beach', name: 'Praia', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', category: 'praia' },
  { id: 'studio-white', name: 'Estúdio Branco', url: 'https://images.unsplash.com/photo-1604014237800-1c9102c219da?w=800', category: 'estudio' },
  { id: 'cafe', name: 'Café', url: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800', category: 'lifestyle' },
  { id: 'minimal', name: 'Minimalista', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', category: 'minimalista' },
];

type Step = 'product' | 'model' | 'look' | 'background' | 'export';
type ModelTab = 'create' | 'saved';
type LookMode = 'composer' | 'describe';
type BackgroundType = 'studio' | 'custom';
type ExportQuality = 'high' | 'performance';

const STEPS: { id: Step; label: string; icon: string }[] = [
  { id: 'product', label: 'Produto', icon: 'fa-shirt' },
  { id: 'model', label: 'Modelo', icon: 'fa-user' },
  { id: 'look', label: 'Look', icon: 'fa-layer-group' },
  { id: 'background', label: 'Fundo', icon: 'fa-image' },
  { id: 'export', label: 'Exportar', icon: 'fa-download' },
];

export const LookComposerEditor: React.FC<LookComposerEditorProps> = ({
  product,
  products,
  userCredits,
  onUpdateProduct,
  onDeductCredits,
  onAddHistoryLog,
  onBack,
  onCheckCredits,
  theme = 'dark',
  userId,
  savedModels,
  onSaveModel,
  onOpenCreateModel,
  isGenerating: globalIsGenerating = false,
  isMinimized = false,
  generationProgress = 0,
  generationText = '',
  onSetGenerating,
  onSetMinimized,
  onSetProgress,
  onSetLoadingText,
  isAnyGenerationRunning = false
}) => {
  // Estado da fase atual
  const [currentStep, setCurrentStep] = useState<Step>('product');

  // Estado do modelo
  const [modelTab, setModelTab] = useState<ModelTab>('saved');
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  // Estado do look
  const [lookMode, setLookMode] = useState<LookMode>('describe');
  const [lookComposition, setLookComposition] = useState<LookComposition>({});
  const [describedLook, setDescribedLook] = useState({
    top: '',
    bottom: '',
    shoes: '',
    accessories: ''
  });

  // Estado do fundo
  const [backgroundType, setBackgroundType] = useState<BackgroundType>('studio');
  const [customBackground, setCustomBackground] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  // Estado do export
  const [exportQuality, setExportQuality] = useState<ExportQuality>('high');

  // Estado de geração
  const [localIsGenerating, setLocalIsGenerating] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const [localLoadingText, setLocalLoadingText] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);

  // Usar estado global se disponível
  const isGenerating = onSetGenerating ? globalIsGenerating : localIsGenerating;
  const currentProgress = onSetProgress ? generationProgress : localProgress;
  const currentLoadingText = onSetLoadingText ? generationText : localLoadingText;

  const isDark = theme === 'dark';

  // Rotacionar frases de loading
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setPhraseIndex(prev => (prev + 1) % LOADING_PHRASES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  useEffect(() => {
    if (isGenerating) {
      const setText = onSetLoadingText || setLocalLoadingText;
      setText(LOADING_PHRASES[phraseIndex]);
    }
  }, [phraseIndex, isGenerating, onSetLoadingText]);

  // Obter imagens do produto
  const productImages = useMemo(() => {
    const images: { url: string; type: string }[] = [];
    if (product.originalImages?.front?.url) {
      images.push({ url: product.originalImages.front.url, type: 'Frente' });
    }
    if (product.originalImages?.back?.url) {
      images.push({ url: product.originalImages.back.url, type: 'Costas' });
    }
    if (images.length === 0 && product.images) {
      product.images.forEach((img, idx) => {
        const url = img.url || img.base64;
        if (url) {
          images.push({ url, type: `Foto ${idx + 1}` });
        }
      });
    }
    return images;
  }, [product]);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Modelo selecionado
  const selectedModel = savedModels.find(m => m.id === selectedModelId);

  // Calcular créditos
  const calculateCredits = (): number => {
    return lookMode === 'composer' ? 2 : 1;
  };

  const creditsNeeded = calculateCredits();

  // Verificar se pode avançar para próxima fase
  const canProceed = (step: Step): boolean => {
    switch (step) {
      case 'product':
        return productImages.length > 0;
      case 'model':
        return !!selectedModelId || modelTab === 'create';
      case 'look':
        if (lookMode === 'describe') {
          return describedLook.top !== '' || describedLook.bottom !== '' || describedLook.shoes !== '';
        }
        return Object.keys(lookComposition).length > 0;
      case 'background':
        if (backgroundType === 'studio') return true;
        return !!customBackground || !!selectedPreset;
      case 'export':
        return true;
      default:
        return false;
    }
  };

  // Navegação entre fases
  const goToStep = (step: Step) => {
    setCurrentStep(step);
  };

  const nextStep = () => {
    const currentIndex = STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1].id);
    }
  };

  const prevStep = () => {
    const currentIndex = STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].id);
    }
  };

  // Upload de fundo personalizado
  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCustomBackground(ev.target?.result as string);
        setSelectedPreset(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Minimizar/Maximizar
  const handleMinimize = () => {
    if (onSetMinimized) onSetMinimized(true);
  };

  const handleMaximize = () => {
    if (onSetMinimized) onSetMinimized(false);
  };

  // Gerar look
  const handleGenerate = async () => {
    if (isAnyGenerationRunning) {
      alert('Aguarde a geração atual terminar.');
      return;
    }

    if (onCheckCredits && !onCheckCredits(creditsNeeded, 'lifestyle')) {
      return;
    }

    const setGenerating = onSetGenerating || setLocalIsGenerating;
    const setProgress = onSetProgress || setLocalProgress;

    setGenerating(true);
    setProgress(0);
    setPhraseIndex(0);

    try {
      // Simular geração
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Deduzir créditos
      if (onDeductCredits) {
        onDeductCredits(creditsNeeded, `Look Composer - ${lookMode === 'composer' ? 'Com peças' : 'Descrito'}`);
      }

      // Log
      if (onAddHistoryLog) {
        onAddHistoryLog(
          'Look Composer',
          `Look gerado para "${product.name}"`,
          'success',
          [product],
          'ai',
          creditsNeeded
        );
      }

    } catch (error) {
      console.error('Erro ao gerar:', error);
      if (onAddHistoryLog) {
        onAddHistoryLog(
          'Look Composer',
          `Erro ao gerar look para "${product.name}"`,
          'error',
          [product],
          'ai',
          0
        );
      }
    } finally {
      const setGenerating = onSetGenerating || setLocalIsGenerating;
      const setProgress = onSetProgress || setLocalProgress;
      setGenerating(false);
      setProgress(0);
      if (onSetMinimized) onSetMinimized(false);
    }
  };

  // Renderizar conteúdo da fase atual
  const renderStepContent = () => {
    switch (currentStep) {
      case 'product':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className={(isDark ? 'bg-pink-500/20' : 'bg-pink-100') + ' w-8 h-8 rounded-lg flex items-center justify-center'}>
                <i className={(isDark ? 'text-pink-400' : 'text-pink-600') + ' fas fa-shirt text-sm'}></i>
              </div>
              <div>
                <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm'}>Peça Principal</h3>
                <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Confirme o produto selecionado</p>
              </div>
            </div>

            {/* Info do produto */}
            <div className={(isDark ? 'bg-neutral-800/50' : 'bg-gray-50') + ' rounded-xl p-4'}>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                  {productImages[0] && (
                    <img src={productImages[0].url} alt={product.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={(isDark ? 'text-white' : 'text-gray-900') + ' font-medium text-sm truncate'}>{product.name}</p>
                  <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>{product.sku}</p>
                  {product.category && (
                    <span className={(isDark ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-200 text-gray-600') + ' px-2 py-0.5 rounded text-[10px] mt-1 inline-block'}>{product.category}</span>
                  )}
                </div>
              </div>
            </div>

            <div className={(isDark ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200') + ' rounded-xl p-3 border'}>
              <p className={(isDark ? 'text-green-400' : 'text-green-600') + ' text-xs'}>
                <i className="fas fa-check-circle mr-2"></i>
                Produto confirmado! Avance para selecionar o modelo.
              </p>
            </div>
          </div>
        );

      case 'model':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className={(isDark ? 'bg-pink-500/20' : 'bg-pink-100') + ' w-8 h-8 rounded-lg flex items-center justify-center'}>
                <i className={(isDark ? 'text-pink-400' : 'text-pink-600') + ' fas fa-user text-sm'}></i>
              </div>
              <div>
                <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm'}>Modelo IA</h3>
                <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Escolha um modelo salvo ou crie um novo</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1">
              <button
                onClick={() => setModelTab('saved')}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${modelTab === 'saved' ? 'bg-pink-500 text-white' : isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-gray-200 text-gray-600'}`}
              >
                <i className="fas fa-bookmark mr-1"></i>Salvos ({savedModels.length})
              </button>
              <button
                onClick={() => setModelTab('create')}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${modelTab === 'create' ? 'bg-pink-500 text-white' : isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-gray-200 text-gray-600'}`}
              >
                <i className="fas fa-plus mr-1"></i>Criar Novo
              </button>
            </div>

            {modelTab === 'saved' ? (
              <div className="space-y-3">
                {savedModels.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {savedModels.map(model => (
                      <div
                        key={model.id}
                        onClick={() => setSelectedModelId(model.id)}
                        className={`relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${selectedModelId === model.id ? 'border-pink-500 ring-2 ring-pink-500/30' : isDark ? 'border-neutral-700 hover:border-neutral-600' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        {(model.images?.front || model.referenceImageUrl) ? (
                          <img src={model.images?.front || model.referenceImageUrl} alt={model.name} className="w-full aspect-square object-cover" />
                        ) : (
                          <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-100') + ' w-full aspect-square flex items-center justify-center'}>
                            <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-user text-2xl'}></i>
                          </div>
                        )}
                        <div className={(isDark ? 'bg-black/70' : 'bg-white/90') + ' absolute inset-x-0 bottom-0 p-2'}>
                          <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-[10px] font-medium truncate'}>{model.name}</p>
                        </div>
                        {selectedModelId === model.id && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center">
                            <i className="fas fa-check text-white text-[8px]"></i>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-100') + ' rounded-xl p-6 text-center'}>
                    <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-user-slash text-3xl mb-3'}></i>
                    <p className={(isDark ? 'text-neutral-400' : 'text-gray-600') + ' text-sm mb-2'}>Nenhum modelo salvo</p>
                    <button
                      onClick={() => setModelTab('create')}
                      className="text-pink-400 text-xs font-medium hover:underline"
                    >
                      Criar primeiro modelo
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className={(isDark ? 'text-neutral-400' : 'text-gray-600') + ' text-xs'}>
                  Clique no botão abaixo para criar um novo modelo personalizado com a IA.
                </p>
                <button
                  onClick={onOpenCreateModel}
                  disabled={!onOpenCreateModel}
                  className={'w-full py-3 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-xl font-medium text-sm transition-opacity ' + (onOpenCreateModel ? 'hover:opacity-90' : 'opacity-50 cursor-not-allowed')}
                >
                  <i className="fas fa-wand-magic-sparkles mr-2"></i>Criar Novo Modelo
                </button>
                <p className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[10px] text-center'}>
                  O modelo será salvo e ficará disponível para reutilizar
                </p>
              </div>
            )}
          </div>
        );

      case 'look':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className={(isDark ? 'bg-pink-500/20' : 'bg-pink-100') + ' w-8 h-8 rounded-lg flex items-center justify-center'}>
                <i className={(isDark ? 'text-pink-400' : 'text-pink-600') + ' fas fa-layer-group text-sm'}></i>
              </div>
              <div>
                <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm'}>Monte o Look</h3>
                <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Escolha as peças ou descreva o look</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1">
              <button
                onClick={() => setLookMode('describe')}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${lookMode === 'describe' ? 'bg-pink-500 text-white' : isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-gray-200 text-gray-600'}`}
              >
                Descrever <span className="opacity-60">(1 crédito)</span>
              </button>
              <button
                onClick={() => setLookMode('composer')}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${lookMode === 'composer' ? 'bg-pink-500 text-white' : isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-gray-200 text-gray-600'}`}
              >
                Suas Peças <span className="opacity-60">(2 créditos)</span>
              </button>
            </div>

            {lookMode === 'describe' ? (
              <div className="space-y-3">
                <div>
                  <label className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1'}>Parte de cima</label>
                  <input
                    type="text"
                    value={describedLook.top}
                    onChange={(e) => setDescribedLook(prev => ({ ...prev, top: e.target.value }))}
                    placeholder="Ex: camiseta branca básica"
                    className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400') + ' w-full px-3 py-2 border rounded-lg text-sm'}
                  />
                </div>
                <div>
                  <label className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1'}>Parte de baixo</label>
                  <input
                    type="text"
                    value={describedLook.bottom}
                    onChange={(e) => setDescribedLook(prev => ({ ...prev, bottom: e.target.value }))}
                    placeholder="Ex: calça jeans skinny azul"
                    className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400') + ' w-full px-3 py-2 border rounded-lg text-sm'}
                  />
                </div>
                <div>
                  <label className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1'}>Calçados</label>
                  <input
                    type="text"
                    value={describedLook.shoes}
                    onChange={(e) => setDescribedLook(prev => ({ ...prev, shoes: e.target.value }))}
                    placeholder="Ex: tênis branco"
                    className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400') + ' w-full px-3 py-2 border rounded-lg text-sm'}
                  />
                </div>
                <div>
                  <label className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1'}>Acessórios (opcional)</label>
                  <input
                    type="text"
                    value={describedLook.accessories}
                    onChange={(e) => setDescribedLook(prev => ({ ...prev, accessories: e.target.value }))}
                    placeholder="Ex: relógio prata, óculos escuros"
                    className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400') + ' w-full px-3 py-2 border rounded-lg text-sm'}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className={(isDark ? 'text-neutral-400' : 'text-gray-600') + ' text-xs'}>
                  Selecione peças do seu catálogo para compor o look.
                </p>
                {/* Aqui seria o componente LookComposer que já existe */}
                <div className={(isDark ? 'bg-neutral-800/50 border-neutral-700' : 'bg-gray-50 border-gray-200') + ' rounded-xl border p-4 text-center'}>
                  <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-layer-group text-2xl mb-2'}></i>
                  <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>
                    Compositor de peças disponível em breve
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case 'background':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className={(isDark ? 'bg-pink-500/20' : 'bg-pink-100') + ' w-8 h-8 rounded-lg flex items-center justify-center'}>
                <i className={(isDark ? 'text-pink-400' : 'text-pink-600') + ' fas fa-image text-sm'}></i>
              </div>
              <div>
                <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm'}>Escolha o Fundo</h3>
                <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Fundo estúdio ou personalizado</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1">
              <button
                onClick={() => setBackgroundType('studio')}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${backgroundType === 'studio' ? 'bg-pink-500 text-white' : isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-gray-200 text-gray-600'}`}
              >
                <i className="fas fa-store mr-1"></i>Fundo Estúdio
              </button>
              <button
                onClick={() => setBackgroundType('custom')}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${backgroundType === 'custom' ? 'bg-pink-500 text-white' : isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-gray-200 text-gray-600'}`}
              >
                <i className="fas fa-image mr-1"></i>Fundo Próprio
              </button>
            </div>

            {backgroundType === 'studio' ? (
              <div className={(isDark ? 'bg-neutral-800/50' : 'bg-gray-50') + ' rounded-xl p-4'}>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                    <i className="fas fa-camera text-gray-500 text-xl"></i>
                  </div>
                  <div>
                    <p className={(isDark ? 'text-white' : 'text-gray-900') + ' font-medium text-sm'}>Fundo Estúdio Cinza</p>
                    <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Fundo neutro profissional, ideal para e-commerce e catálogos</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Upload */}
                <div>
                  <label className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-2'}>Enviar imagem</label>
                  <label className={`block w-full py-4 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors ${isDark ? 'border-neutral-700 hover:border-pink-500/50' : 'border-gray-300 hover:border-pink-400'}`}>
                    <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-cloud-upload-alt text-2xl mb-1'}></i>
                    <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Clique para enviar</p>
                    <p className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[10px]'}>Imagem sem pessoas</p>
                    <input type="file" accept="image/*" className="hidden" onChange={handleBackgroundUpload} />
                  </label>
                </div>

                {customBackground && (
                  <div className="relative rounded-xl overflow-hidden border-2 border-pink-500">
                    <img src={customBackground} alt="Fundo personalizado" className="w-full h-32 object-cover" />
                    <button
                      onClick={() => setCustomBackground(null)}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70"
                    >
                      <i className="fas fa-times text-xs"></i>
                    </button>
                  </div>
                )}

                {/* Fundos pré-setados */}
                <div>
                  <label className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-2'}>Ou escolha um fundo</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_BACKGROUNDS.map(bg => (
                      <div
                        key={bg.id}
                        onClick={() => { setSelectedPreset(bg.id); setCustomBackground(null); }}
                        className={`relative rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${selectedPreset === bg.id ? 'border-pink-500 ring-2 ring-pink-500/30' : isDark ? 'border-neutral-700' : 'border-gray-200'}`}
                      >
                        <img src={bg.url} alt={bg.name} className="w-full h-16 object-cover" />
                        <div className={(isDark ? 'bg-black/60' : 'bg-white/80') + ' absolute inset-x-0 bottom-0 py-1 px-2'}>
                          <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-[9px] font-medium'}>{bg.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'export':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className={(isDark ? 'bg-pink-500/20' : 'bg-pink-100') + ' w-8 h-8 rounded-lg flex items-center justify-center'}>
                <i className={(isDark ? 'text-pink-400' : 'text-pink-600') + ' fas fa-download text-sm'}></i>
              </div>
              <div>
                <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm'}>Qualidade de Exportação</h3>
                <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Escolha o formato ideal</p>
              </div>
            </div>

            <div className="space-y-2">
              {/* Alta Qualidade */}
              <div
                onClick={() => setExportQuality('high')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${exportQuality === 'high' ? 'border-pink-500 ' + (isDark ? 'bg-pink-500/10' : 'bg-pink-50') : isDark ? 'border-neutral-700 bg-neutral-800/50' : 'border-gray-200 bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={(exportQuality === 'high' ? 'bg-pink-500 text-white' : isDark ? 'bg-neutral-700 text-neutral-400' : 'bg-gray-200 text-gray-500') + ' w-10 h-10 rounded-lg flex items-center justify-center transition-colors'}>
                    <i className="fas fa-gem"></i>
                  </div>
                  <div className="flex-1">
                    <p className={(isDark ? 'text-white' : 'text-gray-900') + ' font-medium text-sm'}>Alta Qualidade</p>
                    <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>PNG 2048px - Redes sociais, prints, materiais impressos</p>
                  </div>
                  {exportQuality === 'high' && (
                    <i className="fas fa-check-circle text-pink-500"></i>
                  )}
                </div>
              </div>

              {/* Performance */}
              <div
                onClick={() => setExportQuality('performance')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${exportQuality === 'performance' ? 'border-pink-500 ' + (isDark ? 'bg-pink-500/10' : 'bg-pink-50') : isDark ? 'border-neutral-700 bg-neutral-800/50' : 'border-gray-200 bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={(exportQuality === 'performance' ? 'bg-pink-500 text-white' : isDark ? 'bg-neutral-700 text-neutral-400' : 'bg-gray-200 text-gray-500') + ' w-10 h-10 rounded-lg flex items-center justify-center transition-colors'}>
                    <i className="fas fa-bolt"></i>
                  </div>
                  <div className="flex-1">
                    <p className={(isDark ? 'text-white' : 'text-gray-900') + ' font-medium text-sm'}>Performance</p>
                    <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>JPEG 1024px - E-commerces, marketplaces, carregamento rápido</p>
                  </div>
                  {exportQuality === 'performance' && (
                    <i className="fas fa-check-circle text-pink-500"></i>
                  )}
                </div>
              </div>
            </div>

            {/* Resumo */}
            <div className={(isDark ? 'bg-neutral-800/50 border-neutral-700' : 'bg-gray-50 border-gray-200') + ' rounded-xl p-4 border mt-4'}>
              <h4 className={(isDark ? 'text-white' : 'text-gray-900') + ' font-medium text-sm mb-3'}>Resumo</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className={(isDark ? 'text-neutral-400' : 'text-gray-500')}>Produto</span>
                  <span className={(isDark ? 'text-white' : 'text-gray-900')}>{product.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className={(isDark ? 'text-neutral-400' : 'text-gray-500')}>Modelo</span>
                  <span className={(isDark ? 'text-white' : 'text-gray-900')}>{selectedModel?.name || 'Novo modelo'}</span>
                </div>
                <div className="flex justify-between">
                  <span className={(isDark ? 'text-neutral-400' : 'text-gray-500')}>Look</span>
                  <span className={(isDark ? 'text-white' : 'text-gray-900')}>{lookMode === 'describe' ? 'Descrito' : 'Com suas peças'}</span>
                </div>
                <div className="flex justify-between">
                  <span className={(isDark ? 'text-neutral-400' : 'text-gray-500')}>Fundo</span>
                  <span className={(isDark ? 'text-white' : 'text-gray-900')}>{backgroundType === 'studio' ? 'Estúdio Cinza' : selectedPreset ? PRESET_BACKGROUNDS.find(b => b.id === selectedPreset)?.name : 'Personalizado'}</span>
                </div>
                <div className="flex justify-between">
                  <span className={(isDark ? 'text-neutral-400' : 'text-gray-500')}>Qualidade</span>
                  <span className={(isDark ? 'text-white' : 'text-gray-900')}>{exportQuality === 'high' ? 'Alta' : 'Performance'}</span>
                </div>
                <div className={'h-px my-2 ' + (isDark ? 'bg-neutral-700' : 'bg-gray-200')}></div>
                <div className="flex justify-between font-medium">
                  <span className={(isDark ? 'text-neutral-400' : 'text-gray-500')}>Créditos</span>
                  <span className="text-pink-400">{creditsNeeded}</span>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={'flex-1 overflow-y-auto p-4 md:p-6 ' + (isDark ? 'bg-black' : 'bg-gray-50')}>
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className={(isDark ? 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700' : 'bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-100 shadow-sm') + ' w-10 h-10 rounded-xl flex items-center justify-center transition-all'}
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <div>
              <h1 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold'}>Look Composer</h1>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>{product.name}</p>
            </div>
          </div>
          <div className={'flex items-center gap-1.5 px-3 py-1.5 rounded-lg ' + (isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-200 shadow-sm')}>
            <i className="fas fa-coins text-pink-400 text-xs"></i>
            <span className={(isDark ? 'text-white' : 'text-gray-900') + ' font-medium text-sm'}>{userCredits}</span>
          </div>
        </div>

        {/* STEPPER */}
        <div className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-4 mb-6'}>
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => {
              const isActive = currentStep === step.id;
              const isPast = STEPS.findIndex(s => s.id === currentStep) > idx;
              const canClick = isPast || (idx === 0) || canProceed(STEPS[idx - 1].id);

              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => canClick && goToStep(step.id)}
                    disabled={!canClick}
                    className={`flex flex-col items-center gap-1.5 transition-all ${canClick ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-lg shadow-pink-500/25' : isPast ? 'bg-green-500 text-white' : isDark ? 'bg-neutral-800 text-neutral-500' : 'bg-gray-100 text-gray-400'}`}>
                      {isPast ? <i className="fas fa-check"></i> : <i className={`fas ${step.icon}`}></i>}
                    </div>
                    <span className={`text-[10px] font-medium ${isActive ? 'text-pink-400' : isPast ? (isDark ? 'text-green-400' : 'text-green-600') : isDark ? 'text-neutral-500' : 'text-gray-400'}`}>
                      {step.label}
                    </span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 rounded-full ${isPast ? 'bg-green-500' : isDark ? 'bg-neutral-800' : 'bg-gray-200'}`}></div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* LAYOUT 2 COLUNAS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* COLUNA ESQUERDA - Imagem */}
          <div className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border overflow-hidden'}>
            <div className={'relative flex items-center justify-center p-4 min-h-[350px] ' + (isDark ? 'bg-neutral-800/50' : 'bg-gray-100')}>
              {productImages.length > 0 ? (
                <>
                  <img
                    src={productImages[currentImageIndex]?.url}
                    alt={product.name}
                    className="max-w-full max-h-[400px] object-contain rounded-lg"
                  />
                  {productImages.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentImageIndex(prev => prev === 0 ? productImages.length - 1 : prev - 1)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                      >
                        <i className="fas fa-chevron-left"></i>
                      </button>
                      <button
                        onClick={() => setCurrentImageIndex(prev => prev === productImages.length - 1 ? 0 : prev + 1)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                      >
                        <i className="fas fa-chevron-right"></i>
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-64 flex items-center justify-center">
                  <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-image text-4xl'}></i>
                </div>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA - Conteúdo da fase */}
          <div className="space-y-4">
            <div className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-5'}>
              {renderStepContent()}
            </div>

            {/* Navegação */}
            <div className="flex gap-3">
              {currentStep !== 'product' && (
                <button
                  onClick={prevStep}
                  className={(isDark ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200') + ' flex-1 py-3 rounded-xl font-medium text-sm transition-colors'}
                >
                  <i className="fas fa-arrow-left mr-2"></i>Voltar
                </button>
              )}

              {currentStep !== 'export' ? (
                <button
                  onClick={nextStep}
                  disabled={!canProceed(currentStep)}
                  className={'flex-1 py-3 rounded-xl font-medium text-sm transition-all ' + (canProceed(currentStep) ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white hover:opacity-90' : (isDark ? 'bg-neutral-700' : 'bg-gray-300') + ' text-white cursor-not-allowed opacity-50')}
                >
                  Próximo<i className="fas fa-arrow-right ml-2"></i>
                </button>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || isAnyGenerationRunning || userCredits < creditsNeeded}
                  className={'flex-1 py-3 rounded-xl font-semibold text-sm transition-all ' + (isGenerating || isAnyGenerationRunning ? 'bg-pink-600 cursor-wait' : userCredits < creditsNeeded ? (isDark ? 'bg-neutral-700' : 'bg-gray-300') + ' cursor-not-allowed opacity-50' : 'bg-gradient-to-r from-pink-500 to-orange-400 hover:opacity-90 shadow-lg shadow-pink-500/25') + ' text-white'}
                >
                  {isGenerating ? (
                    <><i className="fas fa-spinner fa-spin mr-2"></i>Gerando...</>
                  ) : isAnyGenerationRunning ? (
                    <><i className="fas fa-clock mr-2"></i>Aguardando...</>
                  ) : (
                    <><i className="fas fa-wand-magic-sparkles mr-2"></i>Gerar Look ({creditsNeeded} crédito{creditsNeeded > 1 ? 's' : ''})</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* MODAL DE LOADING */}
      {isGenerating && !isMinimized && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl"></div>
          <div className="relative z-10 flex flex-col items-center justify-center max-w-md mx-auto p-6">
            <div className="w-64 h-64 mb-6">
              <DotLottieReact
                src="https://lottie.host/d29d70f3-bf03-4212-b53f-932dbefb9077/kIkLDFupvi.lottie"
                loop
                autoplay
                style={{ width: '100%', height: '100%' }}
              />
            </div>
            <h2 className="text-white text-2xl font-bold mb-2 text-center">Criando seu look...</h2>
            <p className="text-neutral-400 text-sm mb-6 text-center min-h-[20px] transition-all duration-300">{currentLoadingText}</p>
            <div className="w-full max-w-xs mb-4">
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-pink-500 to-orange-400 rounded-full transition-all duration-500" style={{ width: `${currentProgress}%` }}></div>
              </div>
              <p className="text-white text-sm font-medium text-center mt-2">{currentProgress}%</p>
            </div>
            <button onClick={handleMinimize} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium transition-all">
              <i className="fas fa-minus"></i>
              <span>Minimizar e continuar navegando</span>
            </button>
          </div>
        </div>
      )}

      {/* BARRA MINIMIZADA */}
      {isGenerating && isMinimized && (
        <div className="fixed bottom-6 right-6 z-50 cursor-pointer" onClick={handleMaximize}>
          <div className="bg-gradient-to-r from-pink-500 to-orange-400 rounded-2xl p-4 shadow-2xl shadow-pink-500/20 flex items-center gap-4 min-w-[280px]">
            <div className="w-10 h-10 flex-shrink-0">
              <DotLottieReact src="https://lottie.host/d29d70f3-bf03-4212-b53f-932dbefb9077/kIkLDFupvi.lottie" loop autoplay style={{ width: '100%', height: '100%' }} />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-medium">Gerando Look</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${currentProgress}%` }}></div>
                </div>
                <span className="text-white text-xs font-medium">{currentProgress}%</span>
              </div>
            </div>
            <button className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
              <i className="fas fa-expand"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
