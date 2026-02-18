// ═══════════════════════════════════════════════════════════════
// VIZZU - Creative Still (Refatorado — 3 camadas)
// Camada 1: Listagem (produtos + stills recentes)
// Camada 2: Editor (prompt + referências + configs)
// Camada 3: Resultados (grid de variações)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Product,
  CreativeStillGeneration,
} from '../../types';
import { supabase } from '../../services/supabaseClient';
import { Plan } from '../../hooks/useCredits';
import { CreativeStillResults } from './CreativeStillResults';
import { CreativeStillEditor, CreativeStillGenerateParams } from './CreativeStillEditor';
import { OptimizedImage } from '../OptimizedImage';
import { useImageViewer } from '../ImageViewer';
import { ProductHubModal } from '../shared/ProductHubModal';
import { useUI, type VizzuTheme } from '../../contexts/UIContext';
import { useGeneration } from '../../contexts/GenerationContext';
import { FeatureTour } from '../onboarding/FeatureTour';
import { CREATIVE_STILL_TOUR_STOPS } from '../onboarding/tourStops';
import { useOnboarding } from '../../hooks/useOnboarding';

// ═══════════════════════════════════════════════════════════════
// CONSTANTES (exportadas para o Results)
// ═══════════════════════════════════════════════════════════════

export const FRAME_RATIOS = [
  { id: '1:1', label: '1:1', description: 'Feed quadrado', icon: 'fa-square' },
  { id: '4:5', label: '4:5', description: 'Feed vertical', icon: 'fa-rectangle-portrait' },
  { id: '9:16', label: '9:16', description: 'Stories/Reels', icon: 'fa-mobile-screen' },
  { id: '16:9', label: '16:9', description: 'Banner', icon: 'fa-rectangle-wide' },
];

export const RESOLUTIONS = [
  { id: '2k', label: '2K', description: 'Resolução padrão' },
  { id: '4k', label: '4K', description: 'Alta resolução' },
];

// ── Filtros (mesmos do Product Studio) ──
const CATEGORY_GROUPS = [
  { id: 'cabeca', label: '👒 Cabeça', items: ['Bonés', 'Chapéus', 'Gorros', 'Viseiras', 'Tiaras', 'Lenços'] },
  { id: 'parte-de-cima', label: '👕 Parte de Cima', items: ['Camisetas', 'Blusas', 'Regatas', 'Tops', 'Camisas', 'Bodies', 'Coletes', 'Jaquetas', 'Casacos', 'Blazers', 'Moletons'] },
  { id: 'parte-de-baixo', label: '👖 Parte de Baixo', items: ['Calças', 'Shorts', 'Bermudas', 'Saias', 'Leggings', 'Shorts Fitness'] },
  { id: 'pecas-inteiras', label: '👗 Peças Inteiras', items: ['Vestidos', 'Macacões', 'Jardineiras', 'Conjuntos', 'Pijamas', 'Biquínis', 'Maiôs', 'Sungas'] },
  { id: 'calcados', label: '👟 Calçados', items: ['Tênis', 'Sandálias', 'Botas', 'Sapatos', 'Chinelos'] },
  { id: 'acessorios', label: '💍 Acessórios', items: ['Bolsas', 'Mochilas', 'Pochetes', 'Cintos', 'Relógios', 'Óculos', 'Bijuterias', 'Gravatas', 'Cachecóis', 'Meias', 'Outros Acessórios'] },
];
const getCategoryGroupBySubcategory = (subcategory: string) => CATEGORY_GROUPS.find(g => g.items.includes(subcategory));
const COLLECTIONS = ['Verão 2025', 'Inverno 2025', 'Básicos', 'Premium', 'Promoção'];
const COLORS = ['Preto', 'Branco', 'Azul', 'Vermelho', 'Verde', 'Amarelo', 'Rosa', 'Cinza', 'Marrom', 'Bege'];
const GENDERS = ['Masculino', 'Feminino', 'Unissex'];

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

export interface CreativeStillProps {
  theme: VizzuTheme;
  products: Product[];
  userCredits: number;
  userId?: string;
  onAddHistoryLog: (action: string, details: string, status: 'success' | 'error' | 'pending', items: Product[], method: 'manual' | 'auto' | 'api' | 'ai' | 'bulk' | 'system', cost: number, imageUrl?: string, resolution?: '2k' | '4k') => void;
  onCheckCredits?: (creditsNeeded: number, actionContext: string) => boolean;
  currentPlan?: Plan;
  onBack?: () => void;
  onOpenPlanModal?: () => void;
  initialProduct?: Product | null;
  onClearInitialProduct?: () => void;
  onSetGenerating?: (value: boolean) => void;
  onSetProgress?: (value: number) => void;
  onSetMinimized?: (value: boolean) => void;
  isMinimized?: boolean;
  editBalance?: number;
  onDeductEditCredits?: (amount: number, generationId?: string) => Promise<{ success: boolean; source?: 'edit' | 'regular' }>;
  setProductForCreation?: (p: Product | null) => void;
  onUpdateProduct?: (productId: string, updates: Partial<Product>) => void;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getProductImage(product: Product): string {
  // PS otimizada > original > legado
  const ps = product.generatedImages?.productStudio || [];
  for (let i = ps.length - 1; i >= 0; i--) {
    const front = ps[i].images.find((img: any) => img.angle === 'front');
    if (front?.url) return front.url;
    if (ps[i].images[0]?.url) return ps[i].images[0].url;
  }
  if (product.originalImages?.front && typeof product.originalImages.front === 'object') {
    return (product.originalImages.front as any).url || '';
  }
  return product.images?.[0]?.url || '';
}

function getStillCount(product: Product, generations: CreativeStillGeneration[]): number {
  return generations.filter(g => g.product_id === product.id && g.status === 'completed').length;
}

function getFirstVariationUrl(gen: CreativeStillGeneration): string | null {
  if (gen.variation_urls?.length > 0) return gen.variation_urls[0];
  if (gen.variation_1_url) return gen.variation_1_url;
  return null;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════

type View = 'listing' | 'editor' | 'results';

export const CreativeStill: React.FC<CreativeStillProps> = ({
  theme,
  products,
  userCredits,
  userId,
  onAddHistoryLog,
  onCheckCredits,
  currentPlan,
  onBack,
  onOpenPlanModal,
  initialProduct,
  onClearInitialProduct,
  onSetGenerating,
  onSetProgress,
  onSetMinimized,
  isMinimized,
  editBalance = 0,
  onDeductEditCredits,
  setProductForCreation: setProductForCreationProp,
  onUpdateProduct,
}) => {
  const { shouldShowTour } = useOnboarding();
  const { addCompletedProduct, completedProducts, clearCompletedProduct } = useGeneration();
  const [view, setView] = useState<View>('listing');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentGeneration, setCurrentGeneration] = useState<CreativeStillGeneration | null>(null);
  const [generations, setGenerations] = useState<CreativeStillGeneration[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');
  const [csStartTime, setCsStartTime] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleStillsCount, setVisibleStillsCount] = useState(6);
  const [selectedStill, setSelectedStill] = useState<CreativeStillGeneration | null>(null);
  const [lastGenerateParams, setLastGenerateParams] = useState<CreativeStillGenerateParams | null>(null);

  // ── Filtros (padrão Product Studio) ──
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategoryGroup, setFilterCategoryGroup] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterCollection, setFilterCollection] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'a-z' | 'z-a'>('recent');

  // ── States para duas listas separadas ──
  const [withStillsCollapsed, setWithStillsCollapsed] = useState(false);
  const [withoutStillsCollapsed, setWithoutStillsCollapsed] = useState(false);
  const [visibleWithStills, setVisibleWithStills] = useState(500);
  const [visibleWithoutStills, setVisibleWithoutStills] = useState(500);

  const isDark = theme !== 'light';
  const { openViewer } = useImageViewer();
  const { currentPage, navigateTo, showToast } = useUI();
  const [hubProduct, setHubProduct] = useState<Product | null>(null);

  // ── Produto pré-selecionado (vindo de outra página) ──
  useEffect(() => {
    if (initialProduct) {
      setSelectedProduct(initialProduct);
      setView('editor');
      onClearInitialProduct?.();
    }
  }, [initialProduct, onClearInitialProduct]);

  // ── Carregar gerações do Supabase ──
  const loadGenerations = useCallback(async () => {
    if (!userId) return;
    try {
      const { data } = await supabase
        .from('creative_still_generations')
        .select('id, variation_urls, variation_1_url, variation_2_url, status, created_at, product_id, settings_snapshot, variations_requested')
        .eq('user_id', userId)
        .neq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(500);
      if (data) setGenerations(data as CreativeStillGeneration[]);
    } catch (err) {
      console.error('[CS] Erro ao carregar gerações:', err);
    }
  }, [userId]);

  useEffect(() => {
    loadGenerations();
  }, [loadGenerations]);

  // ── Stills recentes (completados) ──
  const recentStills = useMemo(() =>
    generations.filter(g => g.status === 'completed' && getFirstVariationUrl(g)),
  [generations]);

  // ── Produtos filtrados (mesma lógica do Product Studio) ──
  const hasActiveFilters = searchQuery || filterCategoryGroup || filterCategory || filterCollection || filterColor || filterGender || sortBy !== 'recent';

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setFilterCategoryGroup('');
    setFilterCategory('');
    setFilterCollection('');
    setFilterColor('');
    setFilterGender('');
    setSortBy('recent');
  }, []);

  const filteredProducts = useMemo(() => {
    let result = products.filter(product => {
      const matchesSearch = !searchQuery ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.sku || '').toLowerCase().includes(searchQuery.toLowerCase());
      const categoryGroup = getCategoryGroupBySubcategory(product.category || '');
      const matchesCategoryGroup = !filterCategoryGroup || categoryGroup?.id === filterCategoryGroup;
      const matchesCategory = !filterCategory || product.category === filterCategory;
      const matchesCollection = !filterCollection || (product as any).collection === filterCollection;
      const matchesColor = !filterColor || product.color === filterColor;
      const matchesGender = !filterGender || (product as any).gender === filterGender;
      return matchesSearch && matchesCategoryGroup && matchesCategory && matchesCollection && matchesColor && matchesGender;
    });
    if (sortBy === 'a-z') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'z-a') {
      result = [...result].sort((a, b) => b.name.localeCompare(a.name));
    } else {
      result = [...result].sort((a, b) => new Date((b as any).updatedAt || 0).getTime() - new Date((a as any).updatedAt || 0).getTime());
    }
    return result;
  }, [products, searchQuery, filterCategoryGroup, filterCategory, filterCollection, filterColor, filterGender, sortBy]);

  // ── Separar produtos com/sem stills ──
  const newProductIds = completedProducts['creative-still'] || [];
  const { productsWithStills, productsWithoutStills } = useMemo(() => {
    const withStills: Product[] = [];
    const withoutStills: Product[] = [];
    filteredProducts.forEach(product => {
      if (getStillCount(product, generations) > 0) {
        withStills.push(product);
      } else {
        withoutStills.push(product);
      }
    });
    // Produtos com geração recém-concluída sempre no topo
    const sortNew = (a: Product, b: Product) => {
      const aNew = newProductIds.includes(a.id) ? 1 : 0;
      const bNew = newProductIds.includes(b.id) ? 1 : 0;
      return bNew - aNew;
    };
    withStills.sort(sortNew);
    withoutStills.sort(sortNew);
    return { productsWithStills: withStills, productsWithoutStills: withoutStills };
  }, [filteredProducts, generations, newProductIds]);

  // Auto-scroll até o primeiro produto com badge "Novo!" ao entrar na página
  useEffect(() => {
    if (currentPage === 'creative-still') {
      const timer = setTimeout(() => {
        const el = document.querySelector('[data-new-product="creative-still"]');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset paginação quando filtros mudam
  useEffect(() => {
    setVisibleWithStills(500);
    setVisibleWithoutStills(500);
  }, [searchQuery, filterCategoryGroup, filterCategory, filterCollection, filterColor, filterGender]);

  // ── GERAR ──
  const handleGenerate = useCallback(async (params: CreativeStillGenerateParams) => {
    if (!userId) return;
    setLastGenerateParams(params);

    const creditCost = params.resolution === '4k' ? 2 : 1;
    const creditsNeeded = params.variationsCount * creditCost;
    if (onCheckCredits && !onCheckCredits(creditsNeeded, 'creative-still')) return;

    setIsGenerating(true);
    onSetGenerating?.(true);
    setGenerationProgress(10);
    onSetProgress?.(10);
    setLoadingText('');
    setCsStartTime(Date.now());
    setView('results');

    // Salvar pending no localStorage para sobreviver F5/fechamento
    try {
      localStorage.setItem('vizzu-pending-creative-still', JSON.stringify({
        productId: params.product.id,
        productName: params.product.name,
        userId,
        startTime: Date.now(),
      }));
    } catch (e) {
      console.error('[CS] Erro ao salvar pending:', e);
    }

    // Upload referências para Storage (evita armazenar base64 no banco)
    const referenceUrls: string[] = [];
    if (params.referenceImages && params.referenceImages.length > 0) {
      console.log('[CS] Fazendo upload de', params.referenceImages.length, 'referências para Storage...');
      for (let i = 0; i < params.referenceImages.length; i++) {
        try {
          const dataUrl = params.referenceImages[i];
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const ext = blob.type === 'image/png' ? 'png' : 'jpg';
          const path = `references/${userId}/${crypto.randomUUID()}.${ext}`;
          const { error: uploadErr } = await supabase.storage
            .from('products')
            .upload(path, blob, { upsert: true });
          if (uploadErr) {
            console.warn('[CS] Erro upload ref', i + 1, ':', uploadErr.message);
          } else {
            const { data: urlData } = supabase.storage.from('products').getPublicUrl(path);
            referenceUrls.push(urlData.publicUrl);
            console.log('[CS] Ref', i + 1, 'uploaded:', path);
          }
        } catch (e) {
          console.warn('[CS] Falha upload ref', i + 1);
        }
      }
    }

    // Inserir registro no Supabase
    const { data: insertedGen, error: insertError } = await supabase
      .from('creative_still_generations')
      .insert({
        user_id: userId,
        product_id: params.product.id,
        additional_products: params.compositionProducts?.map(cp => ({
          product_id: cp.product_id,
          product_name: cp.product_name,
        })) || [],
        settings_snapshot: {
          mode: 'simple',
          userPrompt: params.userPrompt,
          optimizedPrompt: params.optimizedPrompt,
          frameRatio: params.frameRatio,
          resolution: params.resolution,
          variationsCount: params.variationsCount,
          allProductImageUrls: params.productImageUrls,
          referenceImageUrls: referenceUrls,
          selectedAngles: params.selectedAngles,
          product_name: params.product.name,
          product_category: params.product.category || '',
          product_color: params.product.color || '',
          parsedPrompt: params.parsedPrompt || null,
          compositionProducts: params.compositionProducts || [],
          compositionProductImageUrls: params.compositionProducts?.map(cp => cp.product_image_url) || [],
        },
        variations_requested: params.variationsCount,
        resolution: params.resolution,
        variation_urls: [],
        variation_1_url: null,
        variation_2_url: null,
        credits_used: creditsNeeded,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError || !insertedGen) {
      console.error('[CS] Erro ao criar geração:', insertError);
      localStorage.removeItem('vizzu-pending-creative-still');
      setIsGenerating(false);
      onSetGenerating?.(false);
      setCurrentGeneration({
        id: crypto.randomUUID(),
        user_id: userId,
        template_id: null,
        product_id: params.product.id,
        additional_products: [],
        settings_snapshot: {},
        variation_urls: [],
        variation_1_url: null,
        variation_2_url: null,
        variations_requested: params.variationsCount,
        selected_variation: null,
        reference_image_url: null,
        resolution: params.resolution,
        credits_used: 0,
        status: 'failed',
        error_message: 'Erro ao iniciar geração. Tente novamente.',
        created_at: new Date().toISOString(),
        completed_at: null,
      });
      return;
    }

    const generationId = insertedGen.id;

    // Progresso suave
    let currentProg = 10;
    const progressInterval = setInterval(() => {
      const remaining = 90 - currentProg;
      const increment = Math.max(remaining * 0.08, 0.5);
      currentProg = Math.min(currentProg + increment, 90);
      setGenerationProgress(Math.round(currentProg));
      onSetProgress?.(Math.round(currentProg));
    }, 1000);

    // Polling — multi-worker: mínimo 12 min, ou 5 min por variação (Gemini pode estar lento)
    const POLL_INTERVAL = 3000;
    const POLL_TIMEOUT = Math.max(params.variationsCount * 300000, 720000);
    const pollStart = Date.now();

    try {
      const result = await new Promise<CreativeStillGeneration>((resolve, reject) => {
        let webhookFailed = false;
        let lastActivityAt = Date.now();

        const poll = async () => {
          const elapsed = Date.now() - pollStart;
          const idleTime = Date.now() - lastActivityAt;
          // Timeout: ou excedeu POLL_TIMEOUT total, ou 4 min sem nenhuma atividade
          if (elapsed > POLL_TIMEOUT && idleTime > 240000) {
            reject(new Error('Tempo limite excedido'));
            return;
          }
          try {
            const { data, error } = await supabase
              .from('creative_still_generations')
              .select('*')
              .eq('id', generationId)
              .single();

            if (error) { reject(error); return; }

            // Detectar atividade: variation_urls crescendo = workers processando
            const currentUrls = data.variation_urls || [];
            if (currentUrls.length > 0) {
              lastActivityAt = Date.now();
            }

            if (data.status === 'completed') {
              resolve(data as CreativeStillGeneration);
            } else if (data.status === 'failed') {
              resolve(data as CreativeStillGeneration);
            } else if (webhookFailed && idleTime > 30000) {
              reject(new Error('Falha na comunicação com o servidor de geração.'));
            } else {
              setTimeout(poll, POLL_INTERVAL);
            }
          } catch (pollErr) {
            reject(pollErr);
          }
        };

        // Chamar webhook N8N
        fetch('https://n8nwebhook.brainia.store/webhook/vizzu/still/generate-simple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            generation_id: generationId,
            user_id: userId,
          }),
        })
        .then(res => {
          if (!res.ok) {
            console.error('[CS] Webhook retornou erro:', res.status);
            webhookFailed = true;
          }
        })
        .catch(err => {
          console.error('[CS] Erro ao chamar webhook:', err);
          webhookFailed = true;
        });

        setTimeout(poll, 2000);
      });

      clearInterval(progressInterval);
      setGenerationProgress(95);
      onSetProgress?.(95);
      await new Promise(resolve => setTimeout(resolve, 500));
      setGenerationProgress(100);
      onSetProgress?.(100);
      setCurrentGeneration(result);
      loadGenerations();

      // Limpar pending e notificar produto como novo
      localStorage.removeItem('vizzu-pending-creative-still');
      if (result.status === 'completed') {
        addCompletedProduct('creative-still', params.product.id);
      }

      // Log de histórico
      if (result.status === 'completed' && onAddHistoryLog) {
        onAddHistoryLog(
          'Creative Still',
          `Still gerado para "${params.product.name}" (${params.variationsCount} ${params.variationsCount === 1 ? 'variação' : 'variações'})`,
          'success',
          [params.product],
          'ai',
          creditsNeeded,
          undefined,
          params.resolution as '2k' | '4k'
        );
      }
    } catch (err) {
      clearInterval(progressInterval);
      console.error('[CS] Erro durante geração:', err);
      // Se foi interrupção de rede (F5/fechamento), manter pending key
      const errMsg = (err as any)?.message || '';
      const isNetworkAbort = errMsg.includes('Failed to fetch') || errMsg.includes('Load failed') || errMsg.includes('NetworkError') || errMsg.includes('AbortError');
      if (!isNetworkAbort) {
        localStorage.removeItem('vizzu-pending-creative-still');
      }
      await supabase
        .from('creative_still_generations')
        .update({ status: 'failed', error_message: 'Erro ao gerar imagem.' })
        .eq('id', generationId);

      const { data: failedGen } = await supabase
        .from('creative_still_generations')
        .select('*')
        .eq('id', generationId)
        .single();

      setCurrentGeneration((failedGen as CreativeStillGeneration) || {
        id: generationId,
        user_id: userId,
        template_id: null,
        product_id: params.product.id,
        additional_products: [],
        settings_snapshot: {},
        variation_urls: [],
        variation_1_url: null,
        variation_2_url: null,
        variations_requested: params.variationsCount,
        selected_variation: null,
        reference_image_url: null,
        resolution: params.resolution,
        credits_used: 0,
        status: 'failed',
        error_message: 'Erro ao gerar imagem. Tente novamente.',
        created_at: new Date().toISOString(),
        completed_at: null,
      });
    } finally {
      setIsGenerating(false);
      onSetGenerating?.(false);
    }
  }, [userId, onCheckCredits, onSetGenerating, onSetProgress, loadGenerations]);

  // ── Navegar de volta ──
  const handleBackToListing = useCallback(() => {
    setView('listing');
    setCurrentGeneration(null);
    setSelectedProduct(null);
    loadGenerations();
  }, [loadGenerations]);

  const handleBackToEditor = useCallback(() => {
    setView('editor');
    setCurrentGeneration(null);
  }, []);

  // ── Deletar geração ──
  const handleDeleteGeneration = useCallback(async (genId: string) => {
    await supabase
      .from('creative_still_generations')
      .delete()
      .eq('id', genId);
    setSelectedStill(null);
    loadGenerations();
  }, [loadGenerations]);

  // ═══════════════════════════════════════════════════════════════
  // CAMADA 3: RESULTADOS
  // ═══════════════════════════════════════════════════════════════

  if (view === 'results') {
    return (
      <CreativeStillResults
        theme={theme}
        generation={currentGeneration}
        product={selectedProduct}
        resolution={(lastGenerateParams?.resolution || '2k') as '2k' | '4k'}
        variationsCount={lastGenerateParams?.variationsCount || 2}
        isGenerating={isGenerating}
        progress={generationProgress}
        loadingText={loadingText}
        onBackToHome={handleBackToEditor}
        onGenerateAgain={() => lastGenerateParams && handleGenerate(lastGenerateParams)}
        onMinimize={() => onSetMinimized?.(true)}
        onCancel={() => {
          setIsGenerating(false);
          setGenerationProgress(0);
          setLoadingText('');
          setCurrentGeneration(null);
          onSetMinimized?.(false);
          setView('editor');
        }}
        isMinimized={isMinimized}
        generationStartTime={csStartTime}
        onContinueInBackground={() => {
          setIsGenerating(false);
          onSetGenerating?.(false);
          setGenerationProgress(0);
          onSetProgress?.(0);
          setCsStartTime(null);
          // NÃO limpar localStorage pending — App.tsx usa para detectar conclusão em background
        }}
        editBalance={editBalance}
        regularBalance={userCredits}
        onDeductEditCredits={onDeductEditCredits}
        onVariationUpdated={(index, newUrl) => {
          setCurrentGeneration(prev => {
            if (!prev) return prev;
            const urls = [...(prev.variation_urls || [])];
            urls[index] = newUrl;
            return { ...prev, variation_urls: urls };
          });
        }}
        onVariationAdded={(newUrl) => {
          setCurrentGeneration(prev => {
            if (!prev) return prev;
            const urls = [...(prev.variation_urls || []), newUrl];
            return { ...prev, variation_urls: urls };
          });
        }}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // CAMADA 2: EDITOR
  // ═══════════════════════════════════════════════════════════════

  if (view === 'editor' && selectedProduct) {
    return (
      <CreativeStillEditor
        product={selectedProduct}
        products={products}
        theme={theme}
        userCredits={userCredits}
        userId={userId}
        currentPlan={currentPlan}
        onBack={() => {
          setView('listing');
          setSelectedProduct(null);
        }}
        onGenerate={handleGenerate}
        onOpenPlanModal={onOpenPlanModal}
        isGenerating={isGenerating}
        onUpdateProduct={onUpdateProduct}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // CAMADA 1: LISTAGEM
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className={'flex-1 overflow-y-auto p-4 md:p-6 ' + (isDark ? '' : 'bg-[#f7f5f2]')} style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 1rem))' }}>
      <div className="max-w-7xl mx-auto pb-24">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className={'w-10 h-10 rounded-xl flex items-center justify-center transition-all ' + (isDark ? 'bg-white/10 backdrop-blur-xl border border-white/20 text-neutral-300 hover:text-white hover:bg-white/15' : 'bg-white/60 backdrop-blur-xl border border-gray-200/60 text-gray-500 hover:text-gray-700 hover:bg-white/80 shadow-sm')}
              >
                <i className="fas fa-arrow-left text-sm"></i>
              </button>
            )}
            <div className={'w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xl ' + (isDark ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
              <i className={'fas fa-camera-retro text-sm ' + (isDark ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
            </div>
            <div>
              <h1 className={(isDark ? 'text-white' : 'text-[#1A1A1A]') + ' text-lg font-extrabold'}>Vizzu Criativo</h1>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs font-serif italic'}>Still life criativo para e-commerce</p>
            </div>
          </div>
          <div className={'flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold ' + (isDark ? 'bg-white/10 text-neutral-300' : 'bg-white/60 border border-gray-200/60 text-gray-600')}>
            <i className="fas fa-coins text-xs text-amber-500"></i>
            {userCredits}
          </div>
        </div>

        {/* ── ÚLTIMOS STILLS ── */}
        {recentStills.length > 0 && (
          <div className="mb-8">
            <div data-tour="still-recent-gallery" className="flex items-center justify-between mb-3">
              <h2 className={(isDark ? 'text-neutral-200' : 'text-gray-800') + ' text-sm font-bold'}>
                <i className="fas fa-clock-rotate-left mr-2 text-xs opacity-50"></i>
                Últimos Stills
              </h2>
              {recentStills.length > visibleStillsCount && (
                <button
                  onClick={() => setVisibleStillsCount(prev => prev + 6)}
                  className={'text-xs font-medium transition-all ' + (isDark ? 'text-[#FF6B6B] hover:text-[#FF9F43]' : 'text-[#FF6B6B] hover:text-[#FF9F43]')}
                >
                  Ver mais +
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {recentStills.slice(0, visibleStillsCount).map(gen => {
                const thumbUrl = getFirstVariationUrl(gen);
                const productName = (gen.settings_snapshot as any)?.product_name || 'Produto';
                const varCount = gen.variation_urls?.length || 1;
                return (
                  <button
                    key={gen.id}
                    onClick={() => setSelectedStill(gen)}
                    className={'group relative rounded-xl overflow-hidden border transition-all hover:scale-[1.03] ' + (isDark ? 'border-neutral-800 hover:border-neutral-600' : 'border-gray-200 hover:border-gray-400 shadow-sm')}
                  >
                    <div className="aspect-[4/5]">
                      {thumbUrl && (
                        <OptimizedImage src={thumbUrl} alt={productName} className="w-full h-full" size="thumb" />
                      )}
                    </div>
                    {/* Badge variações */}
                    {varCount > 1 && (
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-purple-500/90 text-white text-[9px] font-bold">
                        {varCount}
                      </div>
                    )}
                    {/* Footer */}
                    <div className={'absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t ' + (isDark ? 'from-black/80 to-transparent' : 'from-black/60 to-transparent')}>
                      <p className="text-white text-[10px] font-medium truncate">{productName}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── BUSCA ── */}
        <div data-tour="still-search" className="relative mb-4">
          <i className={'fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm ' + (isDark ? 'text-neutral-600' : 'text-gray-400')}></i>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar produtos..."
            className={(isDark ? 'bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500 focus:border-gray-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-400') + ' w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none'}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className={(isDark ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-600') + ' absolute right-3 top-1/2 -translate-y-1/2'}>
              <i className="fas fa-times text-xs"></i>
            </button>
          )}
        </div>

        {/* ── FILTROS ── */}
        <div data-tour="still-filters" className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-xl border mb-4'}>
          <button onClick={() => setShowFilters(!showFilters)} className="w-full p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' fas fa-filter text-xs'}></i>
              <span className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] font-medium uppercase tracking-wide'}>Filtrar e ordenar</span>
              {hasActiveFilters && (
                <span className="px-1.5 py-0.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white text-[8px] rounded-full">
                  {[filterCategory, filterCollection, filterColor, filterGender, sortBy !== 'recent' ? sortBy : ''].filter(Boolean).length}
                </span>
              )}
            </div>
            <i className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' fas fa-chevron-' + (showFilters ? 'up' : 'down') + ' text-xs'}></i>
          </button>
          {showFilters && (
            <div className="px-3 pb-3">
              {hasActiveFilters && (
                <div className="flex justify-end mb-2">
                  <button onClick={clearFilters} className="text-[10px] text-[#FF9F43] hover:text-[#FF9F43] font-medium">Limpar filtros</button>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                {/* Categoria */}
                <div>
                  <label className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>Categoria</label>
                  <select value={filterCategoryGroup} onChange={(e) => { setFilterCategoryGroup(e.target.value); setFilterCategory(''); }} className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-2.5 py-2 border rounded-lg text-xs'}>
                    <option value="">Todas</option>
                    {CATEGORY_GROUPS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                  </select>
                </div>
                {/* Subcategoria */}
                <div>
                  <label className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>Subcategoria</label>
                  <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} disabled={!filterCategoryGroup} className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white disabled:opacity-50' : 'bg-gray-50 border-gray-200 text-gray-900 disabled:opacity-50') + ' w-full px-2.5 py-2 border rounded-lg text-xs'}>
                    <option value="">Todas</option>
                    {filterCategoryGroup && CATEGORY_GROUPS.find(g => g.id === filterCategoryGroup)?.items.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                {/* Coleção */}
                <div>
                  <label className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>Coleção</label>
                  <select value={filterCollection} onChange={(e) => setFilterCollection(e.target.value)} className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-2.5 py-2 border rounded-lg text-xs'}>
                    <option value="">Todas</option>
                    {COLLECTIONS.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>
                {/* Cor */}
                <div>
                  <label className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>Cor</label>
                  <select value={filterColor} onChange={(e) => setFilterColor(e.target.value)} className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-2.5 py-2 border rounded-lg text-xs'}>
                    <option value="">Todas</option>
                    {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {/* Gênero */}
                <div>
                  <label className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>Gênero</label>
                  <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)} className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-2.5 py-2 border rounded-lg text-xs'}>
                    <option value="">Todos</option>
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                {/* Ordenar */}
                <div>
                  <label className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>Ordenar</label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'recent' | 'a-z' | 'z-a')} className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-2.5 py-2 border rounded-lg text-xs'}>
                    <option value="recent">Mais recentes</option>
                    <option value="a-z">A → Z</option>
                    <option value="z-a">Z → A</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── PRODUTOS ── */}
        {filteredProducts.length === 0 ? (
          <div className={'rounded-xl p-8 text-center ' + (isDark ? 'bg-neutral-900/50 border border-neutral-800' : 'bg-white border border-gray-200')}>
            <i className={'fas fa-box-open text-3xl mb-3 ' + (isDark ? 'text-neutral-700' : 'text-gray-300')}></i>
            <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-sm'}>
              {searchQuery ? 'Nenhum produto encontrado.' : 'Nenhum produto cadastrado.'}
            </p>
          </div>
        ) : (
          <>
            {/* ═══ SEÇÃO: Sem Still Criativo ═══ */}
            {productsWithoutStills.length > 0 && (
              <div className="mb-6">
                <button
                  data-tour="still-without-products"
                  onClick={() => setWithoutStillsCollapsed(!withoutStillsCollapsed)}
                  className="w-full flex items-center justify-between mb-3 group"
                >
                  <div className="flex items-center gap-2">
                    <div className={(isDark ? 'bg-[#FF9F43]/20' : 'bg-amber-100') + ' w-6 h-6 rounded-lg flex items-center justify-center'}>
                      <i className={(isDark ? 'text-[#FF9F43]' : 'text-[#FF9F43]') + ' fas fa-clock text-[10px]'}></i>
                    </div>
                    <h2 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>
                      Sem Still Criativo
                    </h2>
                    <span className={(isDark ? 'bg-[#FF9F43]/20 text-[#FF9F43]' : 'bg-amber-100 text-amber-600') + ' px-2 py-0.5 text-[10px] font-medium rounded-full'}>
                      {productsWithoutStills.length > visibleWithoutStills
                        ? `${Math.min(visibleWithoutStills, productsWithoutStills.length)} de ${productsWithoutStills.length}`
                        : productsWithoutStills.length}
                    </span>
                  </div>
                  <div className={(isDark ? 'text-neutral-500 group-hover:text-white' : 'text-gray-400 group-hover:text-gray-600') + ' transition-colors'}>
                    <i className={'fas fa-chevron-' + (withoutStillsCollapsed ? 'down' : 'up') + ' text-xs'}></i>
                  </div>
                </button>

                {!withoutStillsCollapsed && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {productsWithoutStills.slice(0, visibleWithoutStills).map(product => {
                      const imgUrl = getProductImage(product);
                      return (
                        <button
                          key={product.id}
                          onClick={() => {
                            clearCompletedProduct('creative-still', product.id);
                            setSelectedProduct(product);
                            setView('editor');
                          }}
                          className={'group relative rounded-xl overflow-hidden border transition-all hover:scale-[1.03] text-left ' + (isDark ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-600' : 'bg-white border-gray-200 hover:border-gray-400 shadow-sm')}
                        >
                          <div className="aspect-square relative overflow-hidden">
                            {imgUrl ? (
                              <OptimizedImage src={imgUrl} alt={product.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <i className={'fas fa-image text-2xl ' + (isDark ? 'text-neutral-700' : 'text-gray-300')}></i>
                              </div>
                            )}
                            {/* Badge Novo! */}
                            {newProductIds.includes(product.id) && (
                              <div data-new-product="creative-still" className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 bg-white rounded-full shadow-lg animate-bounce">
                                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF6B6B] opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF6B6B]"></span></span>
                                <span className="text-[#FF6B6B] text-[9px] font-bold">Novo!</span>
                              </div>
                            )}
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                              <span className="text-white text-xs font-semibold flex items-center gap-1">
                                <i className="fas fa-camera-retro text-[10px]"></i>
                                Criar still
                              </span>
                            </div>
                          </div>
                          <div className="p-2.5">
                            <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-semibold truncate'}>{product.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {product.sku && <span className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[10px]'}>{product.sku}</span>}
                              {product.category && (
                                <span className={'text-[9px] px-1 py-0.5 rounded ' + (isDark ? 'bg-white/5 text-neutral-500' : 'bg-gray-100 text-gray-500')}>
                                  {product.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Carregar mais - Sem stills */}
                {!withoutStillsCollapsed && visibleWithoutStills < productsWithoutStills.length && (
                  <div className="flex justify-center mt-4">
                    <button
                      onClick={() => setVisibleWithoutStills(prev => prev + 500)}
                      className={(isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200') + ' px-6 py-2.5 border rounded-xl font-medium text-sm flex items-center gap-2 transition-colors'}
                    >
                      <i className="fas fa-chevron-down text-xs"></i>
                      Carregar mais ({productsWithoutStills.length - visibleWithoutStills} restantes)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ═══ SEÇÃO: Produtos com Still Criativo ═══ */}
            {productsWithStills.length > 0 && (
              <div className="mb-6">
                <button
                  data-tour="still-with-products"
                  onClick={() => setWithStillsCollapsed(!withStillsCollapsed)}
                  className="w-full flex items-center justify-between mb-3 group"
                >
                  <div className="flex items-center gap-2">
                    <div className={(isDark ? 'bg-[#FF6B6B]/20' : 'bg-red-100') + ' w-6 h-6 rounded-lg flex items-center justify-center'}>
                      <i className={(isDark ? 'text-[#FF6B6B]' : 'text-[#FF6B6B]') + ' fas fa-gem text-[10px]'}></i>
                    </div>
                    <h2 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>
                      Produtos com Still Criativo
                    </h2>
                    <span className={(isDark ? 'bg-[#FF6B6B]/20 text-[#FF6B6B]' : 'bg-red-100 text-red-600') + ' px-2 py-0.5 text-[10px] font-medium rounded-full'}>
                      {productsWithStills.length > visibleWithStills
                        ? `${Math.min(visibleWithStills, productsWithStills.length)} de ${productsWithStills.length}`
                        : productsWithStills.length}
                    </span>
                  </div>
                  <div className={(isDark ? 'text-neutral-500 group-hover:text-white' : 'text-gray-400 group-hover:text-gray-600') + ' transition-colors'}>
                    <i className={'fas fa-chevron-' + (withStillsCollapsed ? 'down' : 'up') + ' text-xs'}></i>
                  </div>
                </button>

                {!withStillsCollapsed && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {productsWithStills.slice(0, visibleWithStills).map(product => {
                      const imgUrl = getProductImage(product);
                      const stillCount = getStillCount(product, generations);
                      return (
                        <button
                          key={product.id}
                          onClick={() => { clearCompletedProduct('creative-still', product.id); setHubProduct(product); }}
                          className={'group relative rounded-xl overflow-hidden border transition-all hover:scale-[1.03] text-left ' + (isDark ? 'bg-neutral-900 border-neutral-800 hover:border-[#FF6B6B]/50' : 'bg-white border-gray-200 hover:border-[#FF6B6B]/40 shadow-sm')}
                        >
                          <div className="aspect-square relative overflow-hidden">
                            {imgUrl ? (
                              <OptimizedImage src={imgUrl} alt={product.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <i className={'fas fa-image text-2xl ' + (isDark ? 'text-neutral-700' : 'text-gray-300')}></i>
                              </div>
                            )}
                            {/* Badge Novo! */}
                            {newProductIds.includes(product.id) && (
                              <div data-new-product="creative-still" className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 bg-white rounded-full shadow-lg animate-bounce">
                                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF6B6B] opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF6B6B]"></span></span>
                                <span className="text-[#FF6B6B] text-[9px] font-bold">Novo!</span>
                              </div>
                            )}
                            {/* Badge stills */}
                            <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-[#FF6B6B]/90 text-white text-[9px] font-bold">
                              {stillCount}
                            </div>
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                              <div className="flex gap-1.5 items-center">
                                <span className="text-white text-[9px] font-medium bg-[#FF6B6B]/90 px-2.5 py-1 rounded-full">
                                  <i className="fas fa-eye mr-1 text-[7px]"></i>Ver stills
                                </span>
                                <span className="text-white text-[9px] font-medium bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
                                  <i className="fas fa-th-large text-[7px]"></i>
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="p-2.5">
                            <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-semibold truncate'}>{product.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {product.sku && <span className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[10px]'}>{product.sku}</span>}
                              {product.category && (
                                <span className={'text-[9px] px-1 py-0.5 rounded ' + (isDark ? 'bg-white/5 text-neutral-500' : 'bg-gray-100 text-gray-500')}>
                                  {product.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Carregar mais - Com stills */}
                {!withStillsCollapsed && visibleWithStills < productsWithStills.length && (
                  <div className="flex justify-center mt-4">
                    <button
                      onClick={() => setVisibleWithStills(prev => prev + 500)}
                      className={(isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200') + ' px-6 py-2.5 border rounded-xl font-medium text-sm flex items-center gap-2 transition-colors'}
                    >
                      <i className="fas fa-chevron-down text-xs"></i>
                      Carregar mais ({productsWithStills.length - visibleWithStills} restantes)
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── MODAL: Detalhes do Still ── */}
      {selectedStill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedStill(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
          <div
            className={'relative rounded-2xl overflow-hidden max-w-3xl w-full max-h-[90vh] overflow-y-auto ' + (isDark ? 'bg-neutral-900 border border-neutral-700' : 'bg-white border border-gray-200 shadow-2xl')}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className={'flex items-center justify-between p-4 border-b ' + (isDark ? 'border-neutral-800' : 'border-gray-200')}>
              <div>
                <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-bold'}>
                  {(selectedStill.settings_snapshot as any)?.product_name || 'Still Criativo'}
                </h3>
                <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>
                  {new Date(selectedStill.created_at).toLocaleDateString('pt-BR')} &middot; {selectedStill.variation_urls?.length || 1} {(selectedStill.variation_urls?.length || 1) === 1 ? 'variação' : 'variações'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const prod = products.find(p => p.id === selectedStill.product_id);
                    if (prod) { setSelectedStill(null); setHubProduct(prod); }
                  }}
                  className={'px-3 py-1.5 rounded-lg text-xs font-medium transition-all ' + (isDark ? 'bg-white/10 text-neutral-300 hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
                >
                  <i className="fas fa-th-large mr-1.5"></i>
                  Todas
                </button>
                <button
                  onClick={() => {
                    setCurrentGeneration(selectedStill);
                    setSelectedStill(null);
                    // Encontrar o produto correspondente
                    const prod = products.find(p => p.id === selectedStill.product_id);
                    if (prod) setSelectedProduct(prod);
                    setView('results');
                  }}
                  className={'px-3 py-1.5 rounded-lg text-xs font-medium transition-all ' + (isDark ? 'bg-white/10 text-neutral-300 hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
                >
                  <i className="fas fa-expand mr-1.5"></i>
                  Abrir
                </button>
                <button
                  onClick={() => setSelectedStill(null)}
                  className={'w-8 h-8 rounded-lg flex items-center justify-center transition-all ' + (isDark ? 'text-neutral-500 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100')}
                >
                  <i className="fas fa-times text-sm"></i>
                </button>
              </div>
            </div>
            {/* Grid de variações */}
            <div className="p-4">
              <div className={'grid gap-3 ' + ((selectedStill.variation_urls?.length || 1) === 1 ? 'grid-cols-1 max-w-md mx-auto' : 'grid-cols-2')}>
                {(selectedStill.variation_urls || [selectedStill.variation_1_url]).filter(Boolean).map((url, i) => (
                  <div
                    key={i}
                    className={'rounded-xl overflow-hidden border cursor-zoom-in transition-all hover:border-[#FF6B6B]/50 ' + (isDark ? 'border-neutral-800' : 'border-gray-200')}
                    onClick={() => openViewer(url!, { alt: `Variação ${i + 1}` })}
                  >
                    <OptimizedImage src={url!} alt={`Variação ${i + 1}`} className="w-full aspect-[4/5]" size="display" objectFit="contain" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT HUB MODAL */}
      {hubProduct && (
        <ProductHubModal
          isOpen={!!hubProduct}
          onClose={() => setHubProduct(null)}
          product={hubProduct}
          theme={theme}
          userId={userId}
          navigateTo={navigateTo}
          setProductForCreation={setProductForCreationProp || (() => {})}
          defaultTab="cs"
          showToast={showToast}
        />
      )}

      {/* ONBOARDING TOUR */}
      {shouldShowTour('creative-still') && (
        <FeatureTour featureId="creative-still" stops={CREATIVE_STILL_TOUR_STOPS} theme={theme} />
      )}
    </div>
  );
};
