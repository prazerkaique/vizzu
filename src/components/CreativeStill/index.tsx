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

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

export interface CreativeStillProps {
  theme: 'dark' | 'light';
  products: Product[];
  userCredits: number;
  userId?: string;
  onDeductCredits: (amount: number, reason: string) => boolean;
  onAddHistoryLog: (action: string, details: string, status: 'success' | 'error' | 'pending', items: Product[], method: 'manual' | 'auto' | 'api' | 'ai' | 'bulk' | 'system', cost: number) => void;
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
  onDeductCredits,
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
}) => {
  const [view, setView] = useState<View>('listing');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentGeneration, setCurrentGeneration] = useState<CreativeStillGeneration | null>(null);
  const [generations, setGenerations] = useState<CreativeStillGeneration[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleStillsCount, setVisibleStillsCount] = useState(6);
  const [selectedStill, setSelectedStill] = useState<CreativeStillGeneration | null>(null);
  const [lastGenerateParams, setLastGenerateParams] = useState<CreativeStillGenerateParams | null>(null);

  const isDark = theme === 'dark';

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
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(50);
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

  // ── Produtos filtrados ──
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

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
    setView('results');

    // Inserir registro no Supabase
    const { data: insertedGen, error: insertError } = await supabase
      .from('creative_still_generations')
      .insert({
        user_id: userId,
        product_id: params.product.id,
        additional_products: [],
        settings_snapshot: {
          mode: 'simple',
          userPrompt: params.userPrompt,
          optimizedPrompt: params.optimizedPrompt,
          frameRatio: params.frameRatio,
          resolution: params.resolution,
          variationsCount: params.variationsCount,
          allProductImageUrls: params.productImageUrls,
          referenceImageUrls: params.referenceImages,
          selectedAngles: params.selectedAngles,
          product_name: params.product.name,
          product_category: params.product.category || '',
          product_color: params.product.color || '',
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

    // Polling
    const POLL_INTERVAL = 3000;
    const POLL_TIMEOUT = params.variationsCount * 120000;
    const pollStart = Date.now();

    try {
      const result = await new Promise<CreativeStillGeneration>((resolve, reject) => {
        let webhookFailed = false;

        const poll = async () => {
          if (Date.now() - pollStart > POLL_TIMEOUT) {
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

            if (data.status === 'completed') {
              resolve(data as CreativeStillGeneration);
            } else if (data.status === 'failed') {
              resolve(data as CreativeStillGeneration);
            } else if (webhookFailed) {
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
    } catch (err) {
      clearInterval(progressInterval);
      console.error('[CS] Erro durante geração:', err);
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
        isMinimized={isMinimized}
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
            <div className={'w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xl bg-gradient-to-br from-[#FF6B6B] to-[#FF9F43]'}>
              <i className="fas fa-camera-retro text-sm text-white"></i>
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
            <div className="flex items-center justify-between mb-3">
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
                        <OptimizedImage src={thumbUrl} alt={productName} className="w-full h-full object-cover" />
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
        <div className="mb-4">
          <div className="relative">
            <i className={'fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs ' + (isDark ? 'text-neutral-600' : 'text-gray-400')}></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar produto..."
              className={'w-full pl-9 pr-4 py-2.5 rounded-xl text-sm transition-all ' +
                (isDark
                  ? 'bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-600 focus:border-neutral-600'
                  : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-400 shadow-sm'
                )
              }
            />
          </div>
        </div>

        {/* ── PRODUTOS ── */}
        <div>
          <h2 className={(isDark ? 'text-neutral-200' : 'text-gray-800') + ' text-sm font-bold mb-3'}>
            <i className="fas fa-box mr-2 text-xs opacity-50"></i>
            Seus Produtos
            <span className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' font-normal ml-2'}>({filteredProducts.length})</span>
          </h2>
          {filteredProducts.length === 0 ? (
            <div className={'rounded-xl p-8 text-center ' + (isDark ? 'bg-neutral-900/50 border border-neutral-800' : 'bg-white border border-gray-200')}>
              <i className={'fas fa-box-open text-3xl mb-3 ' + (isDark ? 'text-neutral-700' : 'text-gray-300')}></i>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-sm'}>
                {searchQuery ? 'Nenhum produto encontrado.' : 'Nenhum produto cadastrado.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredProducts.map(product => {
                const imgUrl = getProductImage(product);
                const stillCount = getStillCount(product, generations);
                return (
                  <button
                    key={product.id}
                    onClick={() => {
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
                      {/* Badge stills */}
                      {stillCount > 0 && (
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-[#FF6B6B]/90 text-white text-[9px] font-bold">
                          {stillCount}
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
        </div>
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
                  <div key={i} className={'rounded-xl overflow-hidden border ' + (isDark ? 'border-neutral-800' : 'border-gray-200')}>
                    <OptimizedImage src={url!} alt={`Variação ${i + 1}`} className="w-full aspect-square object-contain" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
