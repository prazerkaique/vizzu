// ═══════════════════════════════════════════════════════════════
// VIZZU - Creative Still Editor (Novo — simplificado)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Product } from '../../types';
import { Plan, RESOLUTION_COST, canUseResolution } from '../../hooks/useCredits';
import { getProductType } from '../../lib/productConfig';
import { OptimizedImage } from '../OptimizedImage';
import { ResolutionSelector, Resolution } from '../ResolutionSelector';
import { Resolution4KConfirmModal, has4KConfirmation, savePreferredResolution, getPreferredResolution } from '../Resolution4KConfirmModal';
import { MentionDropdown } from './MentionDropdown';
import { ProductCompositionPicker } from './ProductCompositionPicker';
import { usePromptMentions } from './usePromptMentions';
import { parsePromptMentions, buildMentionMap } from './promptParser';
import type { CompositionProduct, ParsedPrompt } from './promptParser';

// ═══════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════

const FRAME_RATIOS = [
  { id: '1:1', label: '1:1', description: 'Feed quadrado', icon: 'fa-square' },
  { id: '4:5', label: '4:5', description: 'Feed vertical', icon: 'fa-rectangle-portrait' },
  { id: '9:16', label: '9:16', description: 'Stories/Reels', icon: 'fa-mobile-screen' },
  { id: '16:9', label: '16:9', description: 'Banner', icon: 'fa-rectangle-wide' },
];

const ANGLES_CONFIG: Record<string, Array<{ id: string; label: string; icon: string }>> = {
  clothing: [
    { id: 'front', label: 'Frente', icon: 'fa-shirt' },
    { id: 'back', label: 'Costas', icon: 'fa-shirt' },
    { id: 'front_detail', label: 'Detalhe Frente', icon: 'fa-magnifying-glass-plus' },
    { id: 'back_detail', label: 'Detalhe Costas', icon: 'fa-magnifying-glass-plus' },
    { id: 'folded', label: 'Dobrada', icon: 'fa-layer-group' },
  ],
  footwear: [
    { id: 'front', label: 'Frente', icon: 'fa-shoe-prints' },
    { id: 'back', label: 'Par Traseira', icon: 'fa-shoe-prints' },
    { id: 'side-left', label: 'Lateral', icon: 'fa-arrows-left-right' },
    { id: 'top', label: 'Par Superior', icon: 'fa-arrow-up' },
    { id: 'detail', label: 'Sola', icon: 'fa-arrow-down' },
  ],
  headwear: [
    { id: 'front', label: 'Frente', icon: 'fa-hat-cowboy' },
    { id: 'back', label: 'Traseira', icon: 'fa-hat-cowboy' },
    { id: 'side-left', label: 'Lateral', icon: 'fa-arrows-left-right' },
    { id: 'top', label: 'Vista Superior', icon: 'fa-arrow-up' },
    { id: 'front_detail', label: 'Detalhe', icon: 'fa-magnifying-glass-plus' },
  ],
  bag: [
    { id: 'front', label: 'Frente', icon: 'fa-bag-shopping' },
    { id: 'back', label: 'Traseira', icon: 'fa-bag-shopping' },
    { id: 'side-left', label: 'Lateral', icon: 'fa-arrows-left-right' },
    { id: 'top', label: 'Vista Superior', icon: 'fa-arrow-up' },
    { id: 'detail', label: 'Interior', icon: 'fa-magnifying-glass-plus' },
    { id: 'front_detail', label: 'Detalhe', icon: 'fa-magnifying-glass-plus' },
  ],
  accessory: [
    { id: 'front', label: 'Frente', icon: 'fa-glasses' },
    { id: 'back', label: 'Trás', icon: 'fa-glasses' },
    { id: 'side-left', label: 'Lateral Esq.', icon: 'fa-caret-left' },
    { id: 'side-right', label: 'Lateral Dir.', icon: 'fa-caret-right' },
    { id: 'detail', label: 'Detalhe', icon: 'fa-magnifying-glass-plus' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// OTIMIZADOR DE PROMPT
// ═══════════════════════════════════════════════════════════════

function optimizePrompt(userPrompt: string, product: Product, refCount: number, compositionProducts: CompositionProduct[] = []): string {
  const productName = product.name || 'o produto';
  const productCategory = product.category || 'produto';
  const productColor = product.color || '';
  const colorInfo = productColor ? ` in ${productColor} color` : '';

  const refSection = refCount > 0
    ? `\n### Inspiration Reference Images\nThe user uploaded ${refCount} inspiration image(s) labeled ${Array.from({ length: refCount }, (_, i) => `@ref${i + 1}`).join(', ')}.\nThe user's prompt may reference specific images using these @ref tags (e.g., "use the lighting from @ref1").\nFollow the user's instructions for each referenced image.\n`
    : '';

  const compSection = compositionProducts.length > 0
    ? `\n### Composition Products\nThe scene includes ${compositionProducts.length} additional product(s) alongside the main product:\n${compositionProducts.map((cp, i) => `- @produto${i + 1}: ${cp.product.name} (${cp.product.category || 'product'})`).join('\n')}\nThe user's prompt may reference these using @produto1, @produto2, etc. to give placement/styling instructions.\nThe MAIN product must remain the clear hero and focal point.\n`
    : '';

  return `## Creative Still Life Photography Brief

### Scene Description
${userPrompt}

### Main Product
- Product: ${productName} (${productCategory})${colorInfo}
- The product is the HERO and absolute focal point of the composition

### Product Reference Images
You are receiving ALL available angles of this product. Use them to:
- Understand the complete 3D form, shape, and construction of the product
- Reproduce EXACT colors, patterns, logos, prints, and textures
- Show the product from the angle specified for this generation
${refSection}${compSection}
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
4. The final image must be commercially viable for social media and e-commerce`;
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
  parsedPrompt: ParsedPrompt;
  compositionProducts: Array<{
    product_id: string;
    product_name: string;
    product_image_url: string;
    label: string;
  }>;
}

interface CreativeStillEditorProps {
  product: Product;
  products: Product[];
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
  products,
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
  const [show4KModal, setShow4KModal] = useState(false);
  const [previewAngleIndex, setPreviewAngleIndex] = useState(0);
  const [showNoRefModal, setShowNoRefModal] = useState(false);
  const [angleWithoutRef, setAngleWithoutRef] = useState<string | null>(null);
  const [noRefModalMode, setNoRefModalMode] = useState<'warning' | 'detail-tip'>('warning');
  const [compositionProducts, setCompositionProducts] = useState<CompositionProduct[]>([]);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Tipo do produto e ângulos disponíveis (condicionais por categoria) ──
  const productType = useMemo(() => getProductType(product.category), [product.category]);
  const anglesConfig = useMemo(() => ANGLES_CONFIG[productType] || ANGLES_CONFIG.clothing, [productType]);

  // Para cada ângulo do config, resolver a melhor imagem (PS otimizada > original)
  // Ângulos SEM imagem ainda aparecem (mas desabilitados)
  const angleImages = useMemo(() => {
    const result: Array<{ angle: string; label: string; url: string | null; isOptimized: boolean; icon: string; hasImage: boolean }> = [];
    const psImages = product.generatedImages?.productStudio || [];

    for (const cfg of anglesConfig) {
      let url: string | null = null;
      let isOptimized = false;
      // 1. Tentar PS otimizada (mais recente primeiro)
      for (let i = psImages.length - 1; i >= 0; i--) {
        const psImg = psImages[i].images.find((img: any) => img.angle === cfg.id);
        if (psImg?.url) {
          url = psImg.url;
          isOptimized = true;
          break;
        }
      }
      // 2. Fallback para original
      if (!url) {
        const origKey = cfg.id as keyof typeof product.originalImages;
        const origImg = product.originalImages?.[origKey];
        if (origImg && typeof origImg === 'object' && 'url' in origImg) {
          url = (origImg as any).url;
        }
      }
      // 3. Fallback para array legado
      if (!url && cfg.id === 'front' && product.images?.[0]?.url) {
        url = product.images[0].url;
      }
      if (!url && cfg.id === 'back' && product.images?.[1]?.url) {
        url = product.images[1].url;
      }

      result.push({ angle: cfg.id, label: cfg.label, url, isOptimized, icon: cfg.icon, hasImage: !!url });
    }
    return result;
  }, [product, anglesConfig]);

  // Mapa de referências disponíveis (quais ângulos têm foto)
  const availableReferences = useMemo(() => {
    const refs: Record<string, boolean> = {};
    for (const ai of angleImages) {
      refs[ai.angle] = ai.hasImage;
    }
    // front e folded sempre considerados "com referência" (front obrigatório, folded usa original)
    refs['front'] = true;
    refs['folded'] = true;
    return refs;
  }, [angleImages]);

  // Labels amigáveis para os ângulos (para o modal)
  const angleLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ai of angleImages) map[ai.angle] = ai.label;
    return map;
  }, [angleImages]);

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

  // ── Mentions ──
  const mention = usePromptMentions({
    selectedAngles,
    anglesConfig,
    referenceCount: referenceImages.length,
    compositionProducts,
    prompt,
    setPrompt,
    onPromptChange: () => { setOptimizedPromptText(''); setShowOptimized(false); },
  });

  // Helper: pega imagem frontal de um produto (para composição)
  const getProductFrontUrl = useCallback((p: Product): string => {
    const psImages = p.generatedImages?.productStudio || [];
    for (let i = psImages.length - 1; i >= 0; i--) {
      const front = psImages[i].images.find((img: any) => img.angle === 'front');
      if (front?.url) return front.url;
    }
    if (p.originalImages?.front && typeof p.originalImages.front === 'object' && 'url' in p.originalImages.front) {
      return (p.originalImages.front as any).url || '';
    }
    return p.images?.[0]?.url || '';
  }, []);

  // ── Créditos (1 imagem por ângulo selecionado) ──
  const creditCost = resolution === '4k' ? 2 : 1;
  const totalCredits = selectedAngles.length * creditCost;
  const hasEnoughCredits = userCredits >= totalCredits;
  const can4K = currentPlan ? canUseResolution(currentPlan, '4k') : false;

  // ── Handlers ──
  const toggleAngle = useCallback((angle: string) => {
    // Front é obrigatório — não pode desmarcar
    if (angle === 'front') return;

    // Se já está selecionado, remove
    if (selectedAngles.includes(angle)) {
      setSelectedAngles(prev => prev.filter(a => a !== angle));
      return;
    }

    // DICA DE DETALHE: detalhe frente sem foto de detalhe frente
    if (angle === 'front_detail' && !availableReferences['front_detail']) {
      setAngleWithoutRef(angle);
      setNoRefModalMode('detail-tip');
      setShowNoRefModal(true);
      return;
    }

    // DICA DE DETALHE: detalhe costas sem foto de detalhe costas
    if (angle === 'back_detail' && !availableReferences['back_detail']) {
      setAngleWithoutRef(angle);
      setNoRefModalMode('detail-tip');
      setShowNoRefModal(true);
      return;
    }

    // AVISO: ângulos sem referência (permite continuar)
    if (angle !== 'folded' && !availableReferences[angle]) {
      setAngleWithoutRef(angle);
      setNoRefModalMode('warning');
      setShowNoRefModal(true);
      return;
    }

    // Tem referência — adiciona normalmente
    setSelectedAngles(prev => [...prev, angle]);
  }, [selectedAngles, availableReferences]);

  const selectAllAngles = useCallback(() => {
    setSelectedAngles(angleImages.map(a => a.angle));
  }, [angleImages]);

  const handleOptimize = useCallback(async () => {
    if (!prompt.trim() || isOptimizing) return;
    setIsOptimizing(true);
    try {
      const resp = await fetch('https://n8nwebhook.brainia.store/webhook/vizzu/still/optimize-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: prompt.trim(),
          product_name: product.name || '',
          product_category: product.category || '',
          product_color: product.color || '',
          selectedAngles,
          refCount: referenceImages.length,
          compositionProducts: compositionProducts.map((cp, i) => ({
            product_name: cp.product.name || `Produto ${i + 1}`,
          })),
        }),
      });
      const data = await resp.json();
      if (data.success && data.improvedPrompt) {
        setPrompt(data.improvedPrompt);
        setOptimizedPromptText('');
        setShowOptimized(false);
      } else {
        // Fallback: otimização local
        const opt = optimizePrompt(prompt.trim(), product, referenceImages.length, compositionProducts);
        setOptimizedPromptText(opt);
        setShowOptimized(true);
      }
    } catch {
      // Fallback: otimização local
      const opt = optimizePrompt(prompt.trim(), product, referenceImages.length, compositionProducts);
      setOptimizedPromptText(opt);
      setShowOptimized(true);
    } finally {
      setIsOptimizing(false);
    }
  }, [prompt, isOptimizing, product, selectedAngles, referenceImages.length, compositionProducts]);

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
    const finalPrompt = optimizedPromptText || optimizePrompt(prompt.trim(), product, referenceImages.length, compositionProducts);
    const parsed = parsePromptMentions(prompt.trim(), mention.mentionItems);
    onGenerate({
      product,
      selectedAngles,
      productImageUrls: selectedImageUrls,
      userPrompt: prompt.trim(),
      optimizedPrompt: finalPrompt,
      referenceImages: referenceImages.map(r => r.base64),
      frameRatio,
      resolution,
      variationsCount: selectedAngles.length,
      parsedPrompt: parsed,
      compositionProducts: compositionProducts.map((cp, i) => ({
        product_id: cp.product.id,
        product_name: cp.product.name || `Produto ${i + 1}`,
        product_image_url: getProductFrontUrl(cp.product),
        label: `@produto${i + 1}`,
      })),
    });
  }, [prompt, isGenerating, optimizedPromptText, product, selectedAngles, selectedImageUrls, referenceImages, frameRatio, resolution, onGenerate, compositionProducts, mention.mentionItems, getProductFrontUrl]);

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
            <div className={'w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xl ' + (isDark ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
              <i className={'fas fa-camera-retro text-sm ' + (isDark ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
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
                    size="full"
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

            {/* 1. Seletor de ângulos (condicional por categoria, estilo PS) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-sm font-semibold'}>
                  <i className="fas fa-cube mr-2 text-xs opacity-50"></i>
                  Ângulos para gerar
                </label>
                <div className="flex items-center gap-2">
                  {selectedAngles.length > 1 && (
                    <button
                      onClick={() => setSelectedAngles(['front'])}
                      className={(isDark ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' text-[10px] font-medium'}
                    >
                      Limpar
                    </button>
                  )}
                  {angleImages.length > 1 && (
                    <button
                      onClick={selectAllAngles}
                      className={'text-[10px] font-medium px-2 py-0.5 rounded-md transition-all ' + (isDark ? 'text-amber-400 hover:bg-amber-500/20' : 'text-amber-600 hover:bg-amber-50')}
                    >
                      Selecionar todos
                    </button>
                  )}
                </div>
              </div>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mb-3'}>
                Cada ângulo selecionado gera 1 imagem criativa
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {angleImages.map((ai) => {
                  const isSelected = selectedAngles.includes(ai.angle);
                  const isFront = ai.angle === 'front';
                  const hasRef = isFront || ai.angle === 'folded' || availableReferences[ai.angle];
                  const hasDetailTip = (
                    (ai.angle === 'front_detail' && !availableReferences['front_detail']) ||
                    (ai.angle === 'back_detail' && availableReferences['back'] && !availableReferences['back_detail'])
                  );
                  return (
                    <button
                      key={ai.angle}
                      onClick={() => toggleAngle(ai.angle)}
                      className={'rounded-xl border-2 transition-all flex flex-col items-center gap-1.5 relative overflow-hidden ' +
                        ((isFront || isSelected)
                          ? (isDark ? 'bg-white/10 border-white/30 text-white' : 'bg-gray-100 border-gray-900 text-gray-900')
                          : (isDark
                            ? 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600'
                            : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300')
                        )
                      }
                    >
                      {/* Thumbnail do produto */}
                      <div className={'w-full aspect-square flex items-center justify-center overflow-hidden ' + (isDark ? 'bg-neutral-900' : 'bg-gray-50')}>
                        {ai.url ? (
                          <OptimizedImage
                            src={ai.url}
                            alt={ai.label}
                            className="w-full h-full object-contain"
                            size="thumb"
                          />
                        ) : (
                          <i className={'fas ' + ai.icon + ' text-2xl ' + (isDark ? 'text-neutral-700' : 'text-gray-300')}></i>
                        )}
                      </div>

                      {/* Indicadores no canto superior direito */}
                      {/* PS Otimizada */}
                      {ai.isOptimized && ai.hasImage && !hasDetailTip && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <i className="fas fa-sparkles text-emerald-400 text-[8px]"></i>
                        </div>
                      )}
                      {/* Dica de detalhe (info azul) */}
                      {hasDetailTip && !isSelected && (
                        <div className={'absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ' + (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-500')}>
                          <i className="fas fa-info"></i>
                        </div>
                      )}
                      {/* Sem referência (aviso âmbar) */}
                      {!isFront && !hasDetailTip && !hasRef && !isSelected && (
                        <div className={'absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ' + (isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-500')}>
                          <i className="fas fa-exclamation"></i>
                        </div>
                      )}

                      {/* Label + check */}
                      <div className="px-2 pb-2 pt-0.5 flex flex-col items-center gap-1">
                        <span className="text-xs font-medium">{ai.label}</span>
                        {(isFront || isSelected) && (
                          <i className="fas fa-check-circle text-green-400 text-sm"></i>
                        )}
                        {!isFront && !isSelected && hasDetailTip && (
                          <span className={(isDark ? 'text-blue-400/60' : 'text-blue-400') + ' text-[10px]'}>Sem detalhe</span>
                        )}
                        {!isFront && !isSelected && !hasDetailTip && !hasRef && (
                          <span className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px]'}>Sem ref.</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {/* Legenda */}
              <div className={'flex flex-wrap items-center gap-3 mt-3 pt-3 border-t ' + (isDark ? 'border-neutral-800/50' : 'border-gray-200')}>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
                    <i className="fas fa-check text-green-400 text-[8px]"></i>
                  </div>
                  <span className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Com referência</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={'w-4 h-4 rounded-full flex items-center justify-center ' + (isDark ? 'bg-blue-500/20' : 'bg-blue-100')}>
                    <i className={'fas fa-info text-[8px] ' + (isDark ? 'text-blue-400' : 'text-blue-500')}></i>
                  </div>
                  <span className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Sem detalhe</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={'w-4 h-4 rounded-full flex items-center justify-center ' + (isDark ? 'bg-amber-500/20' : 'bg-amber-100')}>
                    <i className={'fas fa-exclamation text-[8px] ' + (isDark ? 'text-amber-400' : 'text-amber-500')}></i>
                  </div>
                  <span className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Sem referência</span>
                </div>
                {angleImages.some(a => a.isOptimized) && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <i className="fas fa-sparkles text-emerald-400 text-[8px]"></i>
                    </div>
                    <span className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>PS Otimizada</span>
                  </div>
                )}
              </div>
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
                  onChange={mention.handleChange}
                  onKeyDown={mention.handleKeyDown}
                  placeholder={referenceImages.length > 0
                    ? 'Ex: Meu produto sobre mármore branco, com a iluminação da @ref1 e o cenário da @ref2. Estilo editorial, luz natural suave...'
                    : 'Ex: Meu produto sobre uma mesa de mármore branco com flores ao redor, luz natural suave, estilo editorial. Digite @ para mencionar ângulos, referências ou produtos!'
                  }
                  rows={4}
                  className={'w-full rounded-xl p-4 pr-12 text-sm resize-none transition-all ' +
                    (isDark
                      ? 'bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-600 focus:border-[#FF6B6B]/50 focus:ring-1 focus:ring-[#FF6B6B]/30'
                      : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#FF6B6B]/50 focus:ring-1 focus:ring-[#FF6B6B]/30'
                    )}
                />
                <MentionDropdown
                  items={mention.filteredItems}
                  selectedIndex={mention.selectedIndex}
                  onSelect={mention.handleSelect}
                  visible={mention.showDropdown}
                  theme={theme}
                />
                {prompt.trim().length > 5 && (
                  <button
                    onClick={handleOptimize}
                    disabled={isOptimizing}
                    title="Melhorar prompt com IA"
                    className={'absolute right-3 top-3 w-8 h-8 rounded-lg flex items-center justify-center transition-all ' +
                      (isOptimizing
                        ? 'bg-amber-500/20 text-amber-400 animate-pulse cursor-wait'
                        : isDark
                          ? 'bg-white/10 text-neutral-400 hover:text-amber-400 hover:bg-amber-500/20'
                          : 'bg-gray-100 text-gray-400 hover:text-amber-500 hover:bg-amber-50'
                      )}
                  >
                    <i className={'fas ' + (isOptimizing ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles') + ' text-xs'}></i>
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
              {/* Hint de @ mentions */}
              {prompt.trim().length > 0 && !prompt.includes('@') && (
                <div className={'mt-2 rounded-lg px-3 py-2 flex items-start gap-2 ' + (isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200')}>
                  <i className={'fas fa-at text-xs mt-0.5 ' + (isDark ? 'text-blue-400' : 'text-blue-500')}></i>
                  <span className={(isDark ? 'text-blue-300/80' : 'text-blue-700') + ' text-[11px] leading-relaxed'}>
                    Digite <span className="font-bold">@</span> para personalizar cada ângulo (<span className="font-semibold">@frente</span>, <span className="font-semibold">@costas</span>),
                    {referenceImages.length > 0 && <> referenciar inspirações (<span className="font-semibold">@ref1</span>),</>}
                    {compositionProducts.length > 0 && <> posicionar produtos (<span className="font-semibold">@produto1</span>),</>}
                    {' '}ou deixe sem @ para instruções gerais.
                  </span>
                </div>
              )}
              {referenceImages.length > 0 && prompt.includes('@') && (
                <div className={'mt-2 rounded-lg px-3 py-2 flex items-start gap-2 ' + (isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200')}>
                  <i className={'fas fa-lightbulb text-xs mt-0.5 ' + (isDark ? 'text-amber-400' : 'text-amber-500')}></i>
                  <span className={(isDark ? 'text-amber-300/80' : 'text-amber-700') + ' text-[11px] leading-relaxed'}>
                    Use <span className="font-bold">@ref1</span>{referenceImages.length > 1 && <>, <span className="font-bold">@ref2</span></>}{referenceImages.length > 2 && '...'} no prompt para referenciar suas imagens de inspiração.
                    Ex: "quero a iluminação da @ref1 com o cenário da @ref2"
                  </span>
                </div>
              )}
            </div>

            {/* 3. Referências visuais (opcional) */}
            <div>
              <label className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-sm font-semibold mb-2 block'}>
                <i className="fas fa-palette mr-2 text-xs opacity-50"></i>
                Imagens de inspiração
                <span className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' font-normal ml-1'}>(opcional)</span>
              </label>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mb-3'}>
                Envie fotos de referência — cenários, iluminação, composição, texturas — e use <span className={(isDark ? 'text-amber-400' : 'text-amber-600') + ' font-semibold'}>@ref1</span>, <span className={(isDark ? 'text-amber-400' : 'text-amber-600') + ' font-semibold'}>@ref2</span> no prompt acima para dizer o que quer de cada uma
              </p>
              <div className="flex flex-wrap gap-3">
                {referenceImages.map((ref, i) => (
                  <div key={i} className="relative group">
                    <div className={'w-24 h-24 rounded-xl overflow-hidden border-2 ' + (isDark ? 'border-neutral-700' : 'border-gray-200')}>
                      <img src={ref.preview} alt={`Ref ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                    {/* Label @ref */}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white text-[10px] font-bold whitespace-nowrap shadow-md">
                      @ref{i + 1}
                    </div>
                    {/* Botão remover */}
                    <button
                      onClick={() => removeReference(i)}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
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
                    className={'w-24 h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ' +
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

            {/* 3.5. Produtos na cena (composição) */}
            <div>
              <label className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-sm font-semibold mb-2 block'}>
                <i className="fas fa-object-group mr-2 text-xs opacity-50"></i>
                Produtos na cena
                <span className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' font-normal ml-1'}>(opcional)</span>
              </label>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mb-3'}>
                Adicione outros produtos do catálogo para compor a cena. Use <span className={(isDark ? 'text-emerald-400' : 'text-emerald-600') + ' font-semibold'}>@produto1</span>, <span className={(isDark ? 'text-emerald-400' : 'text-emerald-600') + ' font-semibold'}>@produto2</span> no prompt para dar coordenadas
              </p>
              <div className="flex flex-wrap gap-3">
                {compositionProducts.map((cp, i) => {
                  const thumb = getProductFrontUrl(cp.product);
                  return (
                    <div key={cp.product.id} className="relative group">
                      <div className={'w-24 h-24 rounded-xl overflow-hidden border-2 ' + (isDark ? 'border-neutral-700' : 'border-gray-200')}>
                        {thumb ? (
                          <OptimizedImage src={thumb} alt={cp.product.name} className="w-full h-full object-cover" size="thumb" />
                        ) : (
                          <div className={'w-full h-full flex items-center justify-center ' + (isDark ? 'bg-neutral-800' : 'bg-gray-100')}>
                            <i className={'fas fa-box text-lg ' + (isDark ? 'text-neutral-600' : 'text-gray-300')}></i>
                          </div>
                        )}
                      </div>
                      {/* Label @produto */}
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-gradient-to-r from-emerald-500 to-emerald-400 text-white text-[10px] font-bold whitespace-nowrap shadow-md">
                        @produto{i + 1}
                      </div>
                      {/* Nome */}
                      <p className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px] text-center mt-2 truncate w-24'}>
                        {cp.product.name}
                      </p>
                      {/* Botão remover */}
                      <button
                        onClick={() => setCompositionProducts(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  );
                })}
                {compositionProducts.length < 4 && (
                  <button
                    onClick={() => setShowProductPicker(true)}
                    className={'w-24 h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ' +
                      (isDark
                        ? 'border-neutral-700 text-neutral-600 hover:border-emerald-500/50 hover:text-emerald-400'
                        : 'border-gray-300 text-gray-400 hover:border-emerald-400 hover:text-emerald-500'
                      )
                    }
                  >
                    <i className="fas fa-plus text-sm"></i>
                    <span className="text-[9px] font-medium">{compositionProducts.length}/4</span>
                  </button>
                )}
              </div>
            </div>

            {/* 4. Ratio + Resolução */}
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
            </div>

            {/* 5. Créditos + Botão Gerar */}
            <div className="space-y-3 pt-2">
              {/* Cálculo de créditos */}
              <div className={'rounded-xl p-3 flex items-center justify-between ' + (isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-gray-50 border border-gray-200')}>
                <div className="flex items-center gap-2">
                  <i className={'fas fa-coins text-sm ' + (hasEnoughCredits ? 'text-amber-500' : 'text-red-500')}></i>
                  <span className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-sm font-medium'}>
                    {selectedAngles.length} {selectedAngles.length === 1 ? 'ângulo' : 'ângulos'} × {creditCost} {creditCost === 1 ? 'crédito' : 'créditos'}
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
                Gerar {selectedAngles.length} {selectedAngles.length === 1 ? 'ângulo' : 'ângulos'}
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

      {/* Modal: Sem referência / Dica de detalhe */}
      {showNoRefModal && angleWithoutRef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => { setShowNoRefModal(false); setAngleWithoutRef(null); }}
          ></div>
          <div className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' relative z-10 w-full max-w-md rounded-2xl border overflow-hidden'}>
            <div className="p-6 pb-4 text-center">
              {noRefModalMode === 'detail-tip' ? (
                <>
                  <div className={'w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ' + (isDark ? 'bg-blue-500/20' : 'bg-blue-100')}>
                    <i className={'fas fa-info-circle text-2xl ' + (isDark ? 'text-blue-400' : 'text-blue-500')}></i>
                  </div>
                  <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold font-serif mb-2'}>
                    Dica para melhores resultados
                  </h3>
                  <p className={(isDark ? 'text-neutral-400' : 'text-gray-600') + ' text-sm'}>
                    A imagem de <span className={(isDark ? 'text-white' : 'text-gray-900') + ' font-semibold'}>{angleLabels[angleWithoutRef] || angleWithoutRef}</span> pode
                    ser gerada, mas para melhores resultados é importante enviar uma foto de referência desse ângulo no cadastro do produto.
                  </p>
                </>
              ) : (
                <>
                  <div className={'w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ' + (isDark ? 'bg-amber-500/20' : 'bg-amber-100')}>
                    <i className={'fas fa-image text-2xl ' + (isDark ? 'text-amber-400' : 'text-amber-500')}></i>
                  </div>
                  <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold font-serif mb-2'}>
                    Sem imagem de referência
                  </h3>
                  <p className={(isDark ? 'text-neutral-400' : 'text-gray-600') + ' text-sm'}>
                    O ângulo <span className={(isDark ? 'text-white' : 'text-gray-900') + ' font-semibold'}>{angleLabels[angleWithoutRef] || angleWithoutRef}</span> não
                    possui foto de referência. A IA vai gerar normalmente, mas o resultado pode não ser tão fiel ao produto real.
                  </p>
                </>
              )}
            </div>
            <div className="px-6 pb-4 space-y-3">
              <button
                onClick={() => {
                  setShowNoRefModal(false);
                  if (angleWithoutRef) {
                    setSelectedAngles(prev => [...prev, angleWithoutRef]);
                  }
                  setAngleWithoutRef(null);
                }}
                className="w-full px-4 py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] hover:from-[#FF5555] hover:to-[#FF9F43] text-white rounded-xl font-medium transition-all text-center flex items-center justify-center gap-2"
              >
                <i className="fas fa-check"></i>
                <span>{noRefModalMode === 'detail-tip' ? 'Entendi, gerar assim mesmo' : 'Continuar mesmo assim'}</span>
              </button>
              <button
                onClick={() => { setShowNoRefModal(false); setAngleWithoutRef(null); }}
                className={(isDark ? 'text-neutral-500 hover:text-neutral-300' : 'text-gray-400 hover:text-gray-600') + ' w-full px-4 py-2 text-sm transition-all text-center'}
              >
                Cancelar
              </button>
            </div>
            <div className="px-6 pb-6">
              <div className={(isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200') + ' flex items-start gap-3 rounded-xl p-3 border'}>
                <i className={'fas fa-lightbulb mt-0.5 ' + (isDark ? 'text-amber-400' : 'text-amber-500')}></i>
                <p className={(isDark ? 'text-amber-300/80' : 'text-amber-700') + ' text-xs'}>
                  Para melhores resultados, envie fotos de todos os ângulos do produto no cadastro. Quanto mais referências, mais fiel será o resultado.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Product Composition Picker */}
      <ProductCompositionPicker
        isOpen={showProductPicker}
        onClose={() => setShowProductPicker(false)}
        onSelect={(selectedProduct) => {
          setCompositionProducts(prev => [
            ...prev,
            { product: selectedProduct, label: `@produto${prev.length + 1}`, index: prev.length },
          ]);
          setShowProductPicker(false);
        }}
        products={products}
        excludeProductId={product.id}
        alreadyAddedIds={compositionProducts.map(cp => cp.product.id)}
        theme={theme}
      />
    </div>
  );
};
