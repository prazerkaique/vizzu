import React, { useState, useMemo } from 'react';
import { Product, CreativeStillSimpleState } from '../../types';
import { Plan } from '../../hooks/useCredits';
import { OptimizedImage } from '../OptimizedImage';
import { FRAME_RATIOS, RESOLUTIONS } from './index';

// ============================================================
// PRESETS DE PROMPT
// ============================================================

const PROMPT_PRESETS = [
  { id: 'praia', label: 'Praia tropical', icon: 'fa-umbrella-beach', prompt: 'Cenário de praia tropical com areia branca, mar azul turquesa ao fundo, luz dourada de pôr do sol, ambiente relaxante e sofisticado' },
  { id: 'madeira', label: 'Mesa rústica', icon: 'fa-tree', prompt: 'Sobre uma mesa de madeira rústica escura, iluminação natural suave vindo de janela lateral, ambiente aconchegante e minimalista' },
  { id: 'estudio', label: 'Estúdio minimalista', icon: 'fa-lightbulb', prompt: 'Estúdio fotográfico profissional minimalista, fundo clean cinza claro, iluminação softbox perfeita, composição editorial' },
  { id: 'jardim', label: 'Jardim com flores', icon: 'fa-seedling', prompt: 'Jardim florido com luz natural filtrada por folhas, flores coloridas ao redor, atmosfera primaveril e fresca' },
  { id: 'marmore', label: 'Mármore luxuoso', icon: 'fa-gem', prompt: 'Superfície de mármore branco com veios dourados, iluminação elegante, ambiente premium e sofisticado, estética de alto padrão' },
  { id: 'urbano', label: 'Urbano / Concreto', icon: 'fa-city', prompt: 'Cenário urbano com superfície de concreto texturizado, iluminação dramática, estética streetwear moderna e edgy' },
  { id: 'natal', label: 'Natal / Festivo', icon: 'fa-gift', prompt: 'Atmosfera natalina aconchegante com luzes quentes, decoração festiva sutil, tons dourados e vermelhos, ambiente premium' },
  { id: 'verao', label: 'Alto verão', icon: 'fa-sun', prompt: 'Ambiente vibrante de verão com cores vivas, luz solar intensa, céu azul, energia positiva e jovial' },
];

// ============================================================
// OTIMIZADOR DE PROMPT (local, sem API)
// ============================================================

function optimizePrompt(userPrompt: string, product: Product | null): string {
  const productName = product?.name || 'o produto';
  const productCategory = product?.category || 'produto';
  const productColor = product?.color || '';

  const colorInfo = productColor ? ` in ${productColor} color` : '';

  return `## Creative Still Life Photography Brief

### Scene Description
${userPrompt}

### Main Product
- Product: ${productName} (${productCategory})${colorInfo}
- The product is the HERO and absolute focal point of the composition

### Reference Images
You are receiving ALL available angles of this product as reference images. Use them to:
- Understand the complete 3D form, shape, and construction of the product
- Reproduce EXACT colors, patterns, logos, prints, and textures
- Choose the most compelling angle for the creative composition

### Photography Requirements
- PHOTOREALISTIC still life photograph — must look like a real professional photo
- Professional lighting that complements the scene described above
- Shallow to moderate depth of field for visual interest
- The product must be the clear focal point with the scene supporting it
- Preserve 100% color accuracy from the reference images
- Reproduce all logos, text, embroidery, and details with maximum fidelity

### Critical Rules
1. NO watermarks, text overlays, or signatures
2. Do NOT alter product colors — exact match with reference images
3. All props and elements must complement, never compete with the product
4. The final image must be commercially viable for social media and e-commerce
5. Generate a DIFFERENT composition angle/arrangement for each variation`;
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

interface Props {
  theme: 'dark' | 'light';
  products: Product[];
  userCredits: number;
  currentPlan?: Plan;
  onGenerate: (state: CreativeStillSimpleState) => void;
  onBack: () => void;
  onOpenPlanModal?: () => void;
}

/** Extrai todas as URLs de imagens originais de um produto */
function getAllProductImageUrls(product: Product): string[] {
  const urls: string[] = [];
  if (product.originalImages) {
    const oi = product.originalImages;
    const keys: (keyof typeof oi)[] = ['front', 'back', 'side-left', 'side-right', 'top', 'detail', 'frontDetail', 'backDetail', '45-left', '45-right', 'folded'];
    for (const key of keys) {
      const img = oi[key];
      if (img?.url) urls.push(img.url);
    }
  }
  // Fallback: usar array legado de imagens
  if (urls.length === 0 && product.images?.length) {
    for (const img of product.images) {
      if (img.url) urls.push(img.url);
    }
  }
  return urls;
}

/** Pegar imagem principal do produto (para thumbnail) */
function getProductThumb(product: Product): string | undefined {
  if (product.originalImages?.front?.url) return product.originalImages.front.url;
  if (product.images?.[0]?.url) return product.images[0].url;
  return undefined;
}

export const CreativeStillSimple: React.FC<Props> = ({
  theme,
  products,
  userCredits,
  currentPlan,
  onGenerate,
  onBack,
  onOpenPlanModal,
}) => {
  const isDark = theme === 'dark';

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [userPrompt, setUserPrompt] = useState('');
  const [optimizedPrompt, setOptimizedPrompt] = useState('');
  const [showOptimized, setShowOptimized] = useState(false);
  const [frameRatio, setFrameRatio] = useState<'1:1' | '4:5' | '9:16' | '16:9'>('4:5');
  const [resolution, setResolution] = useState<'2k' | '4k'>('2k');
  const [variationsCount, setVariationsCount] = useState(2);

  // Verificar se pode usar 4K
  const canUse4k = currentPlan && ['pro', 'premier', 'enterprise'].includes(currentPlan.id);

  // Calcular custo
  const creditCost = resolution === '4k' ? 2 : 1;
  const totalCredits = variationsCount * creditCost;
  const hasEnoughCredits = userCredits >= totalCredits;

  // URLs de imagens do produto selecionado
  const allProductImageUrls = useMemo(() => {
    if (!selectedProduct) return [];
    return getAllProductImageUrls(selectedProduct);
  }, [selectedProduct]);

  // Aplicar preset
  const handlePreset = (prompt: string) => {
    setUserPrompt(prompt);
    setOptimizedPrompt('');
    setShowOptimized(false);
  };

  // Otimizar prompt
  const handleOptimize = () => {
    if (!userPrompt.trim()) return;
    const opt = optimizePrompt(userPrompt.trim(), selectedProduct);
    setOptimizedPrompt(opt);
    setShowOptimized(true);
  };

  // Gerar
  const handleGenerate = () => {
    if (!selectedProduct || !userPrompt.trim()) return;
    if (!hasEnoughCredits) return;

    const finalPrompt = optimizedPrompt || optimizePrompt(userPrompt.trim(), selectedProduct);

    onGenerate({
      mainProduct: selectedProduct,
      userPrompt: userPrompt.trim(),
      optimizedPrompt: finalPrompt,
      frameRatio,
      resolution,
      variationsCount,
      allProductImageUrls,
    });
  };

  const canGenerate = selectedProduct && userPrompt.trim().length > 5 && hasEnoughCredits;

  return (
    <div className={'flex-1 overflow-y-auto p-4 md:p-6 ' + (isDark ? '' : 'bg-cream')} style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 1rem))' }}>
      <div className="max-w-2xl mx-auto pb-32">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className={'w-10 h-10 rounded-xl flex items-center justify-center transition-all ' + (isDark ? 'bg-white/10 backdrop-blur-xl border border-white/20 text-neutral-300 hover:text-white hover:bg-white/15' : 'bg-white/60 backdrop-blur-xl border border-gray-200/60 text-gray-500 hover:text-gray-700 hover:bg-white/80 shadow-sm')}
          >
            <i className="fas fa-arrow-left text-sm"></i>
          </button>
          <div className={'w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xl ' + (isDark ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-amber-50 border border-amber-200')}>
            <i className={'fas fa-bolt text-sm ' + (isDark ? 'text-amber-400' : 'text-amber-500')}></i>
          </div>
          <div>
            <h1 className={(isDark ? 'text-white' : 'text-[#1A1A1A]') + ' text-lg font-extrabold'}>Modo Rápido</h1>
            <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs font-serif italic'}>Descreva e a IA cria</p>
          </div>
        </div>

        {/* 1. Seletor de Produto */}
        <div className="mb-6">
          <label className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-sm font-semibold mb-2 block'}>
            <i className="fas fa-box mr-2 text-xs opacity-50"></i>
            Selecione o produto
          </label>
          {products.length === 0 ? (
            <div className={'rounded-xl p-6 text-center ' + (isDark ? 'bg-neutral-900/50 border border-neutral-800' : 'bg-gray-50 border border-gray-200')}>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-sm'}>Nenhum produto cadastrado.</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'thin' }}>
              {products.map(p => {
                const isSelected = selectedProduct?.id === p.id;
                const thumb = getProductThumb(p);
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProduct(p);
                      setOptimizedPrompt('');
                      setShowOptimized(false);
                    }}
                    className={'flex-shrink-0 w-24 rounded-xl overflow-hidden transition-all ' +
                      (isSelected
                        ? 'ring-2 ring-[#FF6B6B] scale-[1.02] ' + (isDark ? 'bg-neutral-800 border border-[#FF6B6B]/50' : 'bg-white border-2 border-[#FF6B6B]')
                        : (isDark ? 'bg-neutral-900 border border-neutral-800 hover:border-neutral-600' : 'bg-white border border-gray-200 hover:border-gray-300')
                      )}
                  >
                    <div className={'aspect-square flex items-center justify-center ' + (isDark ? 'bg-neutral-800' : 'bg-gray-100')}>
                      {thumb ? (
                        <OptimizedImage src={thumb} alt={p.name} className="w-full h-full" size="thumb" />
                      ) : (
                        <i className={'fas fa-image text-lg ' + (isDark ? 'text-neutral-700' : 'text-gray-300')}></i>
                      )}
                    </div>
                    <div className="p-2">
                      <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-[10px] font-medium truncate'}>{p.name}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {selectedProduct && (
            <div className={'mt-2 flex items-center gap-2 text-xs ' + (isDark ? 'text-neutral-500' : 'text-gray-500')}>
              <i className="fas fa-images text-[10px]"></i>
              <span>{allProductImageUrls.length} foto{allProductImageUrls.length !== 1 ? 's' : ''} do produto ser{allProductImageUrls.length !== 1 ? 'ão' : 'á'} enviada{allProductImageUrls.length !== 1 ? 's' : ''} como referência</span>
            </div>
          )}
        </div>

        {/* 2. Prompt */}
        <div className="mb-6">
          <label className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-sm font-semibold mb-2 block'}>
            <i className="fas fa-pen-fancy mr-2 text-xs opacity-50"></i>
            Descreva a cena
          </label>

          {/* Presets */}
          <div className="flex flex-wrap gap-2 mb-3">
            {PROMPT_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => handlePreset(preset.prompt)}
                className={'px-3 py-1.5 rounded-full text-xs font-medium transition-all ' +
                  (userPrompt === preset.prompt
                    ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white'
                    : isDark
                      ? 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:border-[#FF6B6B]/50 hover:text-neutral-200'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-[#FF6B6B]/50 hover:text-gray-800'
                  )}
              >
                <i className={'fas ' + preset.icon + ' mr-1.5 text-[10px]'}></i>
                {preset.label}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <div className="relative">
            <textarea
              value={userPrompt}
              onChange={(e) => {
                setUserPrompt(e.target.value);
                setOptimizedPrompt('');
                setShowOptimized(false);
              }}
              placeholder="Ex: Meu produto sobre uma mesa de mármore branco com flores ao redor, luz natural suave..."
              rows={4}
              className={'w-full rounded-xl p-4 pr-12 text-sm resize-none transition-all ' +
                (isDark
                  ? 'bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-600 focus:border-[#FF6B6B]/50 focus:ring-1 focus:ring-[#FF6B6B]/30'
                  : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#FF6B6B]/50 focus:ring-1 focus:ring-[#FF6B6B]/30'
                )}
            />
            {/* Botão Otimizar */}
            {userPrompt.trim().length > 5 && (
              <button
                onClick={handleOptimize}
                title="Otimizar prompt"
                className={'absolute right-3 top-3 w-8 h-8 rounded-lg flex items-center justify-center transition-all ' +
                  (optimizedPrompt
                    ? 'bg-green-500/20 text-green-400'
                    : isDark
                      ? 'bg-white/10 text-neutral-400 hover:text-amber-400 hover:bg-amber-500/20'
                      : 'bg-gray-100 text-gray-400 hover:text-amber-500 hover:bg-amber-50'
                  )}
              >
                <i className={'fas ' + (optimizedPrompt ? 'fa-check' : 'fa-wand-magic-sparkles') + ' text-xs'}></i>
              </button>
            )}
          </div>

          {/* Prompt Otimizado (accordion) */}
          {optimizedPrompt && (
            <div className="mt-2">
              <button
                onClick={() => setShowOptimized(!showOptimized)}
                className={'flex items-center gap-2 text-xs font-medium transition-all ' + (isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700')}
              >
                <i className={'fas fa-chevron-' + (showOptimized ? 'up' : 'down') + ' text-[9px]'}></i>
                {showOptimized ? 'Ocultar' : 'Ver'} prompt otimizado
              </button>
              {showOptimized && (
                <div className={'mt-2 rounded-xl p-3 text-xs leading-relaxed whitespace-pre-wrap ' + (isDark ? 'bg-neutral-900/80 border border-neutral-700 text-neutral-400' : 'bg-gray-50 border border-gray-200 text-gray-600')}>
                  {optimizedPrompt}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Configurações Rápidas */}
        <div className="mb-6 space-y-4">
          {/* Ratio */}
          <div>
            <label className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-sm font-semibold mb-2 block'}>
              <i className="fas fa-crop-simple mr-2 text-xs opacity-50"></i>
              Formato
            </label>
            <div className="flex gap-2">
              {FRAME_RATIOS.map(r => (
                <button
                  key={r.id}
                  onClick={() => setFrameRatio(r.id as typeof frameRatio)}
                  className={'flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ' +
                    (frameRatio === r.id
                      ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white shadow-lg shadow-[#FF6B6B]/20'
                      : isDark
                        ? 'bg-neutral-900 border border-neutral-700 text-neutral-400 hover:border-neutral-500'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                >
                  <div>{r.label}</div>
                  <div className={'text-[10px] mt-0.5 font-normal ' + (frameRatio === r.id ? 'text-white/70' : isDark ? 'text-neutral-600' : 'text-gray-400')}>{r.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Resolução + Variações — lado a lado */}
          <div className="grid grid-cols-2 gap-4">
            {/* Resolução */}
            <div>
              <label className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-sm font-semibold mb-2 block'}>
                <i className="fas fa-expand mr-2 text-xs opacity-50"></i>
                Resolução
              </label>
              <div className="flex gap-2">
                {RESOLUTIONS.map(r => (
                  <button
                    key={r.id}
                    onClick={() => {
                      if (r.id === '4k' && !canUse4k) {
                        onOpenPlanModal?.();
                        return;
                      }
                      setResolution(r.id as '2k' | '4k');
                    }}
                    className={'flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ' +
                      (resolution === r.id
                        ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white'
                        : r.id === '4k' && !canUse4k
                          ? (isDark ? 'bg-neutral-900/50 border border-neutral-800 text-neutral-600 cursor-not-allowed' : 'bg-gray-50 border border-gray-200 text-gray-300 cursor-not-allowed')
                          : isDark
                            ? 'bg-neutral-900 border border-neutral-700 text-neutral-400 hover:border-neutral-500'
                            : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                      )}
                  >
                    {r.label}
                    {r.id === '4k' && !canUse4k && (
                      <span className="ml-1"><i className="fas fa-lock text-[8px]"></i></span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Variações */}
            <div>
              <label className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-sm font-semibold mb-2 block'}>
                <i className="fas fa-layer-group mr-2 text-xs opacity-50"></i>
                Variações
              </label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setVariationsCount(n)}
                    className={'flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ' +
                      (variationsCount === n
                        ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white'
                        : isDark
                          ? 'bg-neutral-900 border border-neutral-700 text-neutral-400 hover:border-neutral-500'
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                      )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Resumo + Botão Gerar (fixo no bottom) */}
        <div className={'fixed bottom-0 left-0 right-0 p-4 border-t backdrop-blur-xl z-50 ' + (isDark ? 'bg-black/90 border-neutral-800' : 'bg-white/90 border-gray-200')}>
          <div className="max-w-2xl mx-auto">
            {/* Info de créditos */}
            <div className={'flex items-center justify-between mb-3 text-xs ' + (isDark ? 'text-neutral-400' : 'text-gray-500')}>
              <div className="flex items-center gap-2">
                <i className="fas fa-coins text-[10px]"></i>
                <span>
                  {totalCredits} crédito{totalCredits !== 1 ? 's' : ''}
                  <span className="opacity-60 ml-1">
                    ({variationsCount} {variationsCount === 1 ? 'variação' : 'variações'} × {creditCost} crédito{creditCost !== 1 ? 's' : ''})
                  </span>
                </span>
              </div>
              <div>
                <span className={hasEnoughCredits ? (isDark ? 'text-green-400' : 'text-green-600') : (isDark ? 'text-red-400' : 'text-red-500')}>
                  Saldo: {userCredits}
                </span>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className={'w-full py-3.5 rounded-xl font-bold text-sm transition-all ' +
                (canGenerate
                  ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:shadow-lg hover:shadow-[#FF6B6B]/30 hover:scale-[1.02] active:scale-[0.98]'
                  : isDark
                    ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                )}
            >
              {!selectedProduct
                ? 'Selecione um produto'
                : !userPrompt.trim() || userPrompt.trim().length <= 5
                  ? 'Descreva a cena desejada'
                  : !hasEnoughCredits
                    ? 'Créditos insuficientes'
                    : `Gerar ${variationsCount} ${variationsCount === 1 ? 'imagem' : 'imagens'}`
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
