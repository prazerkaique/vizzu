// ═══════════════════════════════════════════════════════════════
// VIZZU - Creative Still Editor (Novo — simplificado)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Product } from '../../types';
import { Plan, RESOLUTION_COST, canUseResolution } from '../../hooks/useCredits';
import { getProductType, UPLOAD_SLOTS_CONFIG } from '../../lib/productConfig';
import { OptimizedImage } from '../OptimizedImage';
import { ResolutionSelector, Resolution } from '../ResolutionSelector';
import { Resolution4KConfirmModal, has4KConfirmation, savePreferredResolution, getPreferredResolution } from '../Resolution4KConfirmModal';

// ═══════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════

const FRAME_RATIOS = [
  { id: '1:1', label: '1:1', description: 'Feed quadrado', icon: 'fa-square' },
  { id: '4:5', label: '4:5', description: 'Feed vertical', icon: 'fa-rectangle-portrait' },
  { id: '9:16', label: '9:16', description: 'Stories/Reels', icon: 'fa-mobile-screen' },
  { id: '16:9', label: '16:9', description: 'Banner', icon: 'fa-rectangle-wide' },
];

// ═══════════════════════════════════════════════════════════════
// OTIMIZADOR DE PROMPT
// ═══════════════════════════════════════════════════════════════

function optimizePrompt(userPrompt: string, product: Product): string {
  const productName = product.name || 'o produto';
  const productCategory = product.category || 'produto';
  const productColor = product.color || '';
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

// ═══════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface CreativeStillGenerateParams {
  product: Product;
  selectedAngles: string[];
  productImageUrls: string[];
  userPrompt: string;
  optimizedPrompt: string;
  referenceImages: string[];
  frameRatio: string;
  resolution: string;
  variationsCount: number;
}

interface CreativeStillEditorProps {
  product: Product;
  theme: 'dark' | 'light';
  userCredits: number;
  userId?: string;
  currentPlan?: Plan;
  onBack: () => void;
  onGenerate: (params: CreativeStillGenerateParams) => void;
  onOpenPlanModal?: () => void;
  isGenerating?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════

export const CreativeStillEditor: React.FC<CreativeStillEditorProps> = ({
  product,
  theme,
  userCredits,
  currentPlan,
  onBack,
  onGenerate,
  onOpenPlanModal,
  isGenerating,
}) => {
  const isDark = theme === 'dark';

  // ── States ──
  const [selectedAngles, setSelectedAngles] = useState<string[]>(['front']);
  const [prompt, setPrompt] = useState('');
  const [optimizedPromptText, setOptimizedPromptText] = useState('');
  const [showOptimized, setShowOptimized] = useState(false);
  const [referenceImages, setReferenceImages] = useState<Array<{ base64: string; preview: string }>>([]);
  const [frameRatio, setFrameRatio] = useState('4:5');
  const [resolution, setResolution] = useState<Resolution>(() => getPreferredResolution() as Resolution);
  const [variationsCount, setVariationsCount] = useState(2);
  const [show4KModal, setShow4KModal] = useState(false);
  const [previewAngleIndex, setPreviewAngleIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Tipo do produto e ângulos disponíveis ──
  const productType = useMemo(() => getProductType(product.category), [product.category]);
  const uploadSlots = useMemo(() => UPLOAD_SLOTS_CONFIG[productType], [productType]);

  // Para cada ângulo, resolver a melhor imagem (PS otimizada > original)
  const angleImages = useMemo(() => {
    const result: Array<{ angle: string; label: string; url: string; isOptimized: boolean; icon: string }> = [];
    const psImages = product.generatedImages?.productStudio || [];

    for (const slot of uploadSlots) {
      // 1. Tentar PS otimizada (mais recente primeiro)
      let url: string | null = null;
      let isOptimized = false;
      for (let i = psImages.length - 1; i >= 0; i--) {
        const psImg = psImages[i].images.find((img: any) => img.angle === slot.angle);
        if (psImg?.url) {
          url = psImg.url;
          isOptimized = true;
          break;
        }
      }
      // 2. Fallback para original
      if (!url) {
        const origKey = slot.angle as keyof typeof product.originalImages;
        const origImg = product.originalImages?.[origKey];
        if (origImg && typeof origImg === 'object' && 'url' in origImg) {
          url = (origImg as any).url;
        }
      }
      // 3. Fallback para array legado
      if (!url && slot.angle === 'front' && product.images?.[0]?.url) {
        url = product.images[0].url;
      }
      if (!url && slot.angle === 'back' && product.images?.[1]?.url) {
        url = product.images[1].url;
      }

      if (url) {
        result.push({ angle: slot.angle, label: slot.label, url, isOptimized, icon: slot.icon });
      }
    }
    return result;
  }, [product, uploadSlots]);

  // Imagens dos ângulos selecionados (para enviar ao N8N)
  const selectedImageUrls = useMemo(() =>
    angleImages.filter(a => selectedAngles.includes(a.angle)).map(a => a.url),
  [angleImages, selectedAngles]);

  // Imagem atual no preview (coluna esquerda)
  const currentPreviewImage = useMemo(() => {
    const selectedWithImages = angleImages.filter(a => selectedAngles.includes(a.angle));
    if (selectedWithImages.length === 0) return angleImages[0] || null;
    return selectedWithImages[previewAngleIndex % selectedWithImages.length] || selectedWithImages[0];
  }, [angleImages, selectedAngles, previewAngleIndex]);

  // ── Créditos ──
  const creditCost = resolution === '4k' ? 2 : 1;
  const totalCredits = variationsCount * creditCost;
  const hasEnoughCredits = userCredits >= totalCredits;
  const can4K = currentPlan ? canUseResolution(currentPlan, '4k') : false;

  // ── Handlers ──
  const toggleAngle = useCallback((angle: string) => {
    setSelectedAngles(prev => {
      if (prev.includes(angle)) {
        if (prev.length <= 1) return prev; // Mínimo 1 selecionado
        return prev.filter(a => a !== angle);
      }
      return [...prev, angle];
    });
  }, []);

  const selectAllAngles = useCallback(() => {
    setSelectedAngles(angleImages.map(a => a.angle));
  }, [angleImages]);

  const handleOptimize = useCallback(() => {
    if (!prompt.trim()) return;
    const opt = optimizePrompt(prompt.trim(), product);
    setOptimizedPromptText(opt);
    setShowOptimized(true);
  }, [prompt, product]);

  const handleResolutionChange = useCallback((newRes: Resolution) => {
    if (newRes === '4k' && !can4K) {
      onOpenPlanModal?.();
      return;
    }
    if (newRes === '4k' && !has4KConfirmation()) {
      setShow4KModal(true);
      return;
    }
    setResolution(newRes);
    savePreferredResolution(newRes);
  }, [can4K, onOpenPlanModal]);

  const handleConfirm4K = useCallback(() => {
    setResolution('4k');
    savePreferredResolution('4k');
    setShow4KModal(false);
  }, []);

  // Referências visuais
  const handleReferenceUpload = useCallback((files: FileList | null) => {
    if (!files) return;
    const remaining = 4 - referenceImages.length;
    const toProcess = Array.from(files).slice(0, remaining);
    toProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setReferenceImages(prev => [...prev.slice(0, 3), { base64, preview: base64 }]);
      };
      reader.readAsDataURL(file);
    });
  }, [referenceImages.length]);

  const handleReferenceDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleReferenceUpload(e.dataTransfer.files);
  }, [handleReferenceUpload]);

  const removeReference = useCallback((index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleGenerate = useCallback(() => {
    if (!prompt.trim() || isGenerating) return;
    const finalPrompt = optimizedPromptText || optimizePrompt(prompt.trim(), product);
    onGenerate({
      product,
      selectedAngles,
      productImageUrls: selectedImageUrls,
      userPrompt: prompt.trim(),
      optimizedPrompt: finalPrompt,
      referenceImages: referenceImages.map(r => r.base64),
      frameRatio,
      resolution,
      variationsCount,
    });
  }, [prompt, isGenerating, optimizedPromptText, product, selectedAngles, selectedImageUrls, referenceImages, frameRatio, resolution, variationsCount, onGenerate]);

  const canGenerate = prompt.trim().length > 5 && hasEnoughCredits && !isGenerating && selectedAngles.length > 0;

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className={'flex-1 overflow-y-auto p-4 md:p-6 ' + (isDark ? '' : 'bg-[#f7f5f2]')}>
      <div className="max-w-7xl mx-auto pb-24">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className={'w-10 h-10 rounded-xl flex items-center justify-center transition-all ' + (isDark ? 'bg-white/10 backdrop-blur-xl border border-white/20 text-neutral-300 hover:text-white hover:bg-white/15' : 'bg-white/60 backdrop-blur-xl border border-gray-200/60 text-gray-500 hover:text-gray-700 hover:bg-white/80 shadow-sm')}
            >
              <i className="fas fa-arrow-left text-sm"></i>
            </button>
            <div className={'w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xl bg-gradient-to-br from-[#FF6B6B] to-[#FF9F43]'}>
              <i className="fas fa-camera-retro text-sm text-white"></i>
            </div>
            <div>
              <h1 className={(isDark ? 'text-white' : 'text-[#1A1A1A]') + ' text-lg font-extrabold'}>Vizzu Criativo</h1>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs font-serif italic'}>{product.name}</p>
            </div>
          </div>
          <div className={'flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold ' + (isDark ? 'bg-white/10 text-neutral-300' : 'bg-white/60 border border-gray-200/60 text-gray-600')}>
            <i className="fas fa-coins text-xs text-amber-500"></i>
            {userCredits}
          </div>
        </div>

        {/* ── LAYOUT 2 COLUNAS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ═══ COLUNA ESQUERDA — Produto ═══ */}
          <div className="space-y-4">
            {/* Imagem principal */}
            <div className={'rounded-2xl overflow-hidden border ' + (isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm')}>
              <div className="relative aspect-square">
                {currentPreviewImage ? (
                  <OptimizedImage
                    src={currentPreviewImage.url}
                    alt={currentPreviewImage.label}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <i className={'fas fa-image text-4xl ' + (isDark ? 'text-neutral-700' : 'text-gray-300')}></i>
                  </div>
                )}
                {/* Badge otimizada */}
                {currentPreviewImage?.isOptimized && (
                  <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-emerald-500/90 text-white text-[10px] font-bold flex items-center gap-1">
                    <i className="fas fa-sparkles text-[8px]"></i> PS Otimizada
                  </div>
                )}
                {/* Badge ângulo */}
                {currentPreviewImage && (
                  <div className={'absolute bottom-3 left-3 px-2 py-1 rounded-lg text-[10px] font-bold ' + (isDark ? 'bg-black/60 text-white' : 'bg-white/80 text-gray-700')}>
                    {currentPreviewImage.label}
                  </div>
                )}
                {/* Nav ângulos */}
                {angleImages.filter(a => selectedAngles.includes(a.angle)).length > 1 && (
                  <>
                    <button
                      onClick={() => setPreviewAngleIndex(p => Math.max(0, p - 1))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-all"
                    >
                      <i className="fas fa-chevron-left text-xs"></i>
                    </button>
                    <button
                      onClick={() => setPreviewAngleIndex(p => p + 1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-all"
                    >
                      <i className="fas fa-chevron-right text-xs"></i>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Info do produto */}
            <div className={'rounded-2xl p-4 border ' + (isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm')}>
              <div className="flex items-center gap-3">
                <div className={'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ' + (isDark ? 'bg-white/10' : 'bg-gray-100')}>
                  <i className={'fas fa-box text-sm ' + (isDark ? 'text-neutral-400' : 'text-gray-400')}></i>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-bold truncate'}>{product.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {product.sku && <span className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>{product.sku}</span>}
                    {product.category && (
                      <span className={'text-[10px] px-1.5 py-0.5 rounded-md font-medium ' + (isDark ? 'bg-white/10 text-neutral-400' : 'bg-gray-100 text-gray-500')}>
                        {product.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ COLUNA DIREITA — Configurações ═══ */}
          <div className="space-y-5">

            {/* 1. Seletor de ângulos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-sm font-semibold'}>
                  <i className="fas fa-images mr-2 text-xs opacity-50"></i>
                  Fotos de referência
                </label>
                {angleImages.length > 1 && (
                  <button
                    onClick={selectAllAngles}
                    className={'text-[10px] font-medium px-2 py-0.5 rounded-md transition-all ' + (isDark ? 'text-amber-400 hover:bg-amber-500/20' : 'text-amber-600 hover:bg-amber-50')}
                  >
                    Selecionar todas
                  </button>
                )}
              </div>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mb-3'}>
                Quais fotos do produto enviar como referência para a IA
              </p>
              <div className="flex flex-wrap gap-2">
                {angleImages.map((ai) => {
                  const isSelected = selectedAngles.includes(ai.angle);
                  return (
                    <button
                      key={ai.angle}
                      onClick={() => toggleAngle(ai.angle)}
                      className={'relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border ' +
                        (isSelected
                          ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white border-transparent shadow-md'
                          : isDark
                            ? 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-500'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 shadow-sm'
                        )
                      }
                    >
                      <i className={'fas ' + ai.icon + ' text-[10px]'}></i>
                      {ai.label}
                      {ai.isOptimized && (
                        <span className={'w-1.5 h-1.5 rounded-full flex-shrink-0 ' + (isSelected ? 'bg-white/60' : 'bg-emerald-400')}></span>
                      )}
                    </button>
                  );
                })}
              </div>
              {angleImages.some(a => a.isOptimized) && (
                <p className={'text-[10px] mt-2 flex items-center gap-1 ' + (isDark ? 'text-emerald-400/70' : 'text-emerald-600/70')}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                  = Imagem otimizada pelo Product Studio
                </p>
              )}
            </div>

            {/* 2. Prompt */}
            <div>
              <label className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-sm font-semibold mb-2 block'}>
                <i className="fas fa-pen-fancy mr-2 text-xs opacity-50"></i>
                Descreva a cena
              </label>
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    setOptimizedPromptText('');
                    setShowOptimized(false);
                  }}
                  placeholder="Ex: Meu produto sobre uma mesa de mármore branco com flores ao redor, luz natural suave, estilo editorial minimalista..."
                  rows={4}
                  className={'w-full rounded-xl p-4 pr-12 text-sm resize-none transition-all ' +
                    (isDark
                      ? 'bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-600 focus:border-[#FF6B6B]/50 focus:ring-1 focus:ring-[#FF6B6B]/30'
                      : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#FF6B6B]/50 focus:ring-1 focus:ring-[#FF6B6B]/30'
                    )}
                />
                {prompt.trim().length > 5 && (
                  <button
                    onClick={handleOptimize}
                    title="Otimizar prompt"
                    className={'absolute right-3 top-3 w-8 h-8 rounded-lg flex items-center justify-center transition-all ' +
                      (optimizedPromptText
                        ? 'bg-green-500/20 text-green-400'
                        : isDark
                          ? 'bg-white/10 text-neutral-400 hover:text-amber-400 hover:bg-amber-500/20'
                          : 'bg-gray-100 text-gray-400 hover:text-amber-500 hover:bg-amber-50'
                      )}
                  >
                    <i className={'fas ' + (optimizedPromptText ? 'fa-check' : 'fa-wand-magic-sparkles') + ' text-xs'}></i>
                  </button>
                )}
              </div>
              {optimizedPromptText && (
                <div className="mt-2">
                  <button
                    onClick={() => setShowOptimized(!showOptimized)}
                    className={'flex items-center gap-2 text-xs font-medium transition-all ' + (isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700')}
                  >
                    <i className={'fas fa-chevron-' + (showOptimized ? 'up' : 'down') + ' text-[9px]'}></i>
                    {showOptimized ? 'Ocultar' : 'Ver'} prompt otimizado
                  </button>
                  {showOptimized && (
                    <div className={'mt-2 rounded-xl p-3 text-xs leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto ' + (isDark ? 'bg-neutral-900/80 border border-neutral-700 text-neutral-400' : 'bg-gray-50 border border-gray-200 text-gray-600')}>
                      {optimizedPromptText}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Referências visuais (opcional) */}
            <div>
              <label className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-sm font-semibold mb-2 block'}>
                <i className="fas fa-image mr-2 text-xs opacity-50"></i>
                Referências visuais
                <span className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' font-normal ml-1'}>(opcional)</span>
              </label>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mb-3'}>
                Envie fotos de inspiração: iluminação, cenário, estilo, composição...
              </p>
              <div className="flex flex-wrap gap-2">
                {referenceImages.map((ref, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden group">
                    <img src={ref.preview} alt={`Ref ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeReference(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
                {referenceImages.length < 4 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleReferenceDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className={'w-20 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ' +
                      (isDark
                        ? 'border-neutral-700 text-neutral-600 hover:border-neutral-500 hover:text-neutral-400'
                        : 'border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-500'
                      )
                    }
                  >
                    <i className="fas fa-plus text-sm"></i>
                    <span className="text-[9px] font-medium">{referenceImages.length}/4</span>
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleReferenceUpload(e.target.files)}
              />
            </div>

            {/* 4. Ratio + Resolução + Variações */}
            <div className="space-y-4">
              {/* Ratio */}
              <div>
                <label className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-sm font-semibold mb-2 block'}>
                  <i className="fas fa-crop-simple mr-2 text-xs opacity-50"></i>
                  Proporção
                </label>
                <div className="flex gap-2">
                  {FRAME_RATIOS.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setFrameRatio(r.id)}
                      className={'flex-1 py-2 rounded-xl text-xs font-medium transition-all border ' +
                        (frameRatio === r.id
                          ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white border-transparent shadow-md'
                          : isDark
                            ? 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-500'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 shadow-sm'
                        )
                      }
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolução */}
              <div>
                <label className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-sm font-semibold mb-2 block'}>
                  <i className="fas fa-expand mr-2 text-xs opacity-50"></i>
                  Resolução
                </label>
                <ResolutionSelector
                  resolution={resolution}
                  onChange={handleResolutionChange}
                  canUse4K={can4K}
                  onUpgradeClick={() => onOpenPlanModal?.()}
                  theme={theme}
                />
              </div>

              {/* Variações */}
              <div>
                <label className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-sm font-semibold mb-2 block'}>
                  <i className="fas fa-layer-group mr-2 text-xs opacity-50"></i>
                  Variações: {variationsCount}
                </label>
                <input
                  type="range"
                  min={1}
                  max={4}
                  value={variationsCount}
                  onChange={(e) => setVariationsCount(parseInt(e.target.value))}
                  className="w-full accent-[#FF6B6B]"
                />
                <div className="flex justify-between mt-1">
                  {[1, 2, 3, 4].map(n => (
                    <span key={n} className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[10px]'}>{n}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* 5. Créditos + Botão Gerar */}
            <div className="space-y-3 pt-2">
              {/* Cálculo de créditos */}
              <div className={'rounded-xl p-3 flex items-center justify-between ' + (isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-gray-50 border border-gray-200')}>
                <div className="flex items-center gap-2">
                  <i className={'fas fa-coins text-sm ' + (hasEnoughCredits ? 'text-amber-500' : 'text-red-500')}></i>
                  <span className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-sm font-medium'}>
                    {variationsCount} {variationsCount === 1 ? 'variação' : 'variações'} × {creditCost} {creditCost === 1 ? 'crédito' : 'créditos'}
                  </span>
                </div>
                <span className={' text-sm font-bold ' + (hasEnoughCredits ? (isDark ? 'text-white' : 'text-gray-900') : 'text-red-500')}>
                  = {totalCredits} {totalCredits === 1 ? 'crédito' : 'créditos'}
                </span>
              </div>
              {!hasEnoughCredits && (
                <p className="text-red-500 text-xs flex items-center gap-1">
                  <i className="fas fa-exclamation-triangle text-[10px]"></i>
                  Créditos insuficientes. Você tem {userCredits}.
                  {onOpenPlanModal && (
                    <button onClick={onOpenPlanModal} className="underline ml-1 font-medium">Fazer upgrade</button>
                  )}
                </p>
              )}

              {/* Botão Gerar */}
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className={'w-full py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 ' +
                  (canGenerate
                    ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]'
                    : isDark
                      ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  )
                }
              >
                <i className="fas fa-sparkles text-xs"></i>
                Gerar {variationsCount} {variationsCount === 1 ? 'variação' : 'variações'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal 4K */}
      {show4KModal && (
        <Resolution4KConfirmModal
          isOpen={show4KModal}
          theme={theme}
          onConfirm={handleConfirm4K}
          onCancel={() => setShow4KModal(false)}
        />
      )}
    </div>
  );
};
