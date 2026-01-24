// ═══════════════════════════════════════════════════════════════
// VIZZU - Look Composer (Monte looks completos com IA)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import { Product, HistoryLog, SavedModel, LookComposition } from '../../types';
import { LookComposerEditor } from './LookComposerEditor';

interface LookComposerProps {
  products: Product[];
  userCredits: number;
  onUpdateProduct: (productId: string, updates: Partial<Product>) => void;
  onDeductCredits: (amount: number, reason: string) => boolean;
  onAddHistoryLog: (action: string, details: string, status: HistoryLog['status'], items: Product[], method: HistoryLog['method'], cost: number) => void;
  onImport?: () => void;
  currentPlan?: { name: string; limit: number };
  onCheckCredits?: (creditsNeeded: number, actionContext: 'studio' | 'cenario' | 'lifestyle' | 'video' | 'provador' | 'generic') => boolean;
  theme?: 'dark' | 'light';
  userId?: string;
  savedModels: SavedModel[];
  onSaveModel?: (model: SavedModel) => void;
  onOpenCreateModel?: () => void;
  modelLimit?: number;
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

interface GeneratedLook {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  productCategory?: string;
  imageUrl: string;
  createdAt: string;
  metadata?: {
    lookItems?: Array<{
      slot: string;
      productId?: string;
      name?: string;
      sku?: string;
    }>;
    prompt?: string;
  };
}

interface ProductWithLooks {
  product: Product;
  lookCount: number;
  looks: GeneratedLook[];
  participations?: number; // Quantas vezes participou como item (não principal)
}

const CATEGORIES = ['Camisetas', 'Calças', 'Calçados', 'Acessórios', 'Vestidos', 'Shorts', 'Jaquetas', 'Blusas', 'Regatas', 'Tops'];

export const LookComposer: React.FC<LookComposerProps> = ({
  products,
  userCredits,
  onUpdateProduct,
  onDeductCredits,
  onAddHistoryLog,
  onImport,
  currentPlan,
  onCheckCredits,
  theme = 'dark',
  userId,
  savedModels,
  onSaveModel,
  onOpenCreateModel,
  modelLimit = 10,
  isGenerating = false,
  isMinimized = false,
  generationProgress = 0,
  generationText = '',
  onSetGenerating,
  onSetMinimized,
  onSetProgress,
  onSetLoadingText,
  isAnyGenerationRunning = false
}) => {
  const isDark = theme === 'dark';

  // Estados principais
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedLook, setSelectedLook] = useState<GeneratedLook | null>(null);
  const [showAllLooks, setShowAllLooks] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<ProductWithLooks | null>(null);
  const [modalSelectedLook, setModalSelectedLook] = useState<GeneratedLook | null>(null);

  // Filtros para modal de produtos
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productFilterCategory, setProductFilterCategory] = useState('');

  // Coletar todos os looks gerados
  const allGeneratedLooks = useMemo(() => {
    const looks: GeneratedLook[] = [];

    products.forEach(product => {
      if (product.generatedImages?.modeloIA) {
        product.generatedImages.modeloIA.forEach((look: any, index: number) => {
          const imageUrl = look.images?.front || look.imageUrl || look.url;
          if (imageUrl) {
            looks.push({
              id: look.id || `${product.id}-${index}`,
              productId: product.id,
              productName: product.name,
              productSku: product.sku,
              productCategory: product.category,
              imageUrl,
              createdAt: look.createdAt || new Date().toISOString(),
              metadata: look.metadata
            });
          }
        });
      }
    });

    return looks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [products]);

  // Produtos com looks (inclui produtos que participaram como principal OU como item do look)
  const productsWithLooks = useMemo(() => {
    const productLookMap: Record<string, {
      asMain: GeneratedLook[];
      asItem: GeneratedLook[];
    }> = {};

    // Primeiro, mapeia todos os looks por produto principal
    allGeneratedLooks.forEach(look => {
      if (!productLookMap[look.productId]) {
        productLookMap[look.productId] = { asMain: [], asItem: [] };
      }
      productLookMap[look.productId].asMain.push(look);

      // Também mapeia produtos que participaram como item do look
      if (look.metadata?.lookItems) {
        look.metadata.lookItems.forEach(item => {
          if (item.productId && item.productId !== look.productId) {
            if (!productLookMap[item.productId]) {
              productLookMap[item.productId] = { asMain: [], asItem: [] };
            }
            productLookMap[item.productId].asItem.push(look);
          }
        });
      }
    });

    // Agora cria a lista de produtos com looks
    const result: ProductWithLooks[] = [];
    products.forEach(product => {
      const data = productLookMap[product.id];
      if (data && (data.asMain.length > 0 || data.asItem.length > 0)) {
        // Combina looks únicos (como principal ou como item)
        const allLooksSet = new Set([...data.asMain, ...data.asItem]);
        const allLooks = Array.from(allLooksSet);

        result.push({
          product,
          lookCount: allLooks.length,
          looks: data.asMain, // Looks onde é o produto principal
          participations: data.asItem.length // Quantas vezes participou como item
        });
      }
    });

    return result.sort((a, b) => b.lookCount - a.lookCount);
  }, [products, allGeneratedLooks]);

  // Últimos 6 looks
  const recentLooks = useMemo(() => {
    return allGeneratedLooks.slice(0, 6);
  }, [allGeneratedLooks]);

  // Filtrar produtos no modal
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = !productSearchTerm ||
        product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(productSearchTerm.toLowerCase());
      const matchesCategory = !productFilterCategory || product.category === productFilterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, productSearchTerm, productFilterCategory]);

  // Obter imagem do produto (prioriza otimizada)
  const getProductImage = (product: Product): string | undefined => {
    // Primeiro tenta imagem otimizada do Product Studio
    if (product.generatedImages?.productStudio?.length) {
      const lastSession = product.generatedImages.productStudio[product.generatedImages.productStudio.length - 1];
      if (lastSession.images?.length) {
        const frontImage = lastSession.images.find(img => img.angle === 'front');
        if (frontImage?.url) return frontImage.url;
        if (lastSession.images[0]?.url) return lastSession.images[0].url;
      }
    }
    // Fallback para imagem original
    if (product.originalImages?.front?.url) return product.originalImages.front.url;
    if (product.images?.[0]?.url) return product.images[0].url;
    if (product.images?.[0]?.base64) return product.images[0].base64;
    return undefined;
  };

  // Verificar se produto tem imagem otimizada
  const hasOptimizedImage = (product: Product): boolean => {
    return !!(product.generatedImages?.productStudio?.length &&
      product.generatedImages.productStudio.some(s => s.images?.length > 0));
  };

  // Calcular produtos frequentemente combinados (com contagem)
  const getFrequentlyPaired = (productId: string): Array<{ product: Product; count: number }> => {
    const pairedCounts: Record<string, number> = {};

    // Verifica looks onde este produto é o principal
    allGeneratedLooks
      .filter(look => look.productId === productId && look.metadata?.lookItems)
      .forEach(look => {
        look.metadata?.lookItems?.forEach(item => {
          if (item.productId && item.productId !== productId) {
            pairedCounts[item.productId] = (pairedCounts[item.productId] || 0) + 1;
          }
        });
      });

    // Também verifica looks onde este produto participou como item
    allGeneratedLooks
      .filter(look => look.metadata?.lookItems?.some(item => item.productId === productId))
      .forEach(look => {
        // Conta o produto principal
        if (look.productId !== productId) {
          pairedCounts[look.productId] = (pairedCounts[look.productId] || 0) + 1;
        }
        // Conta outros itens
        look.metadata?.lookItems?.forEach(item => {
          if (item.productId && item.productId !== productId) {
            pairedCounts[item.productId] = (pairedCounts[item.productId] || 0) + 1;
          }
        });
      });

    return Object.entries(pairedCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id, count]) => {
        const product = products.find(p => p.id === id);
        return product ? { product, count } : null;
      })
      .filter(Boolean) as Array<{ product: Product; count: number }>;
  };

  // Calcular cores frequentemente usadas (com contagem)
  const getFrequentColors = (productId: string): Array<{ color: string; count: number }> => {
    const colorCounts: Record<string, number> = {};

    // Verifica looks onde este produto é o principal
    allGeneratedLooks
      .filter(look => look.productId === productId && look.metadata?.lookItems)
      .forEach(look => {
        look.metadata?.lookItems?.forEach(item => {
          if (item.productId) {
            const pairedProduct = products.find(p => p.id === item.productId);
            if (pairedProduct?.color) {
              colorCounts[pairedProduct.color] = (colorCounts[pairedProduct.color] || 0) + 1;
            }
          }
        });
      });

    // Também verifica looks onde este produto participou como item
    allGeneratedLooks
      .filter(look => look.metadata?.lookItems?.some(item => item.productId === productId))
      .forEach(look => {
        // Conta a cor do produto principal
        const mainProduct = products.find(p => p.id === look.productId);
        if (mainProduct?.color) {
          colorCounts[mainProduct.color] = (colorCounts[mainProduct.color] || 0) + 1;
        }
        // Conta cores de outros itens
        look.metadata?.lookItems?.forEach(item => {
          if (item.productId && item.productId !== productId) {
            const pairedProduct = products.find(p => p.id === item.productId);
            if (pairedProduct?.color) {
              colorCounts[pairedProduct.color] = (colorCounts[pairedProduct.color] || 0) + 1;
            }
          }
        });
      });

    return Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([color, count]) => ({ color, count }));
  };

  const handleNewLook = () => {
    setShowProductModal(true);
    setProductSearchTerm('');
    setProductFilterCategory('');
  };

  const handleSelectProductForNewLook = (product: Product) => {
    setSelectedProduct(product);
    setShowProductModal(false);
  };

  const handleBackToList = () => {
    setSelectedProduct(null);
  };

  const handleDownloadLook = async (imageUrl: string, productName: string, format: 'png' | 'svg' = 'png') => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `look-${productName.replace(/\s+/g, '-').toLowerCase()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar:', error);
    }
  };

  const handleDeleteLook = (look: GeneratedLook) => {
    const product = products.find(p => p.id === look.productId);
    if (product && product.generatedImages?.modeloIA) {
      const updatedModeloIA = product.generatedImages.modeloIA.filter(
        (l: any, idx: number) => (l.id || `${product.id}-${idx}`) !== look.id
      );
      onUpdateProduct(product.id, {
        generatedImages: {
          ...product.generatedImages,
          modeloIA: updatedModeloIA
        }
      });
      setSelectedLook(null);
      setModalSelectedLook(null);
    }
  };

  const handleOpenProductModal = (pwl: ProductWithLooks) => {
    setSelectedProductForModal(pwl);
    setModalSelectedLook(null);
  };

  // Se tem produto selecionado, mostra o editor
  if (selectedProduct) {
    return (
      <LookComposerEditor
        product={selectedProduct}
        products={products}
        userCredits={userCredits}
        onUpdateProduct={onUpdateProduct}
        onDeductCredits={onDeductCredits}
        onAddHistoryLog={onAddHistoryLog}
        onBack={handleBackToList}
        onCheckCredits={onCheckCredits}
        theme={theme}
        userId={userId}
        savedModels={savedModels}
        onSaveModel={onSaveModel}
        onOpenCreateModel={onOpenCreateModel}
        modelLimit={modelLimit}
        isGenerating={isGenerating}
        isMinimized={isMinimized}
        generationProgress={generationProgress}
        generationText={generationText}
        onSetGenerating={onSetGenerating}
        onSetMinimized={onSetMinimized}
        onSetProgress={onSetProgress}
        onSetLoadingText={onSetLoadingText}
        isAnyGenerationRunning={isAnyGenerationRunning}
      />
    );
  }

  // Página principal
  return (
    <div className={'flex-1 overflow-y-auto p-4 md:p-6 ' + (isDark ? 'bg-black' : 'bg-gray-50')}>
      <div className="max-w-7xl mx-auto">

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* HEADER */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={'w-10 h-10 rounded-xl flex items-center justify-center ' + (isDark ? 'bg-gradient-to-r from-pink-500/20 to-orange-400/20 border border-pink-500/30' : 'bg-gradient-to-r from-pink-500 to-orange-400 shadow-lg shadow-pink-500/25')}>
              <i className={'fas fa-layer-group text-sm ' + (isDark ? 'text-pink-400' : 'text-white')}></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold'}>Vizzu Look Composer®</h1>
                {currentPlan && (
                  <span className={(isDark ? 'bg-pink-500/20 text-pink-400' : 'bg-gradient-to-r from-pink-500 to-orange-400 text-white') + ' px-2 py-0.5 text-[9px] font-medium rounded-full uppercase tracking-wide'}>
                    {currentPlan.name}
                  </span>
                )}
              </div>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Seus looks criados com modelo IA</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={'hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg ' + (isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-200 shadow-sm')}>
              <i className="fas fa-coins text-pink-400 text-xs"></i>
              <span className={(isDark ? 'text-white' : 'text-gray-900') + ' font-medium text-sm'}>{userCredits}</span>
            </div>
            <button
              onClick={handleNewLook}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-pink-500/25"
            >
              <i className="fas fa-plus"></i>
              <span>Novo Look</span>
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ÚLTIMOS LOOKS */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-2xl border mb-6 overflow-hidden'}>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={'w-8 h-8 rounded-lg flex items-center justify-center ' + (isDark ? 'bg-pink-500/20' : 'bg-pink-100')}>
                <i className={(isDark ? 'text-pink-400' : 'text-pink-500') + ' fas fa-clock text-sm'}></i>
              </div>
              <div>
                <h2 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold'}>Últimos Looks</h2>
                <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{allGeneratedLooks.length} looks criados</p>
              </div>
            </div>
            {allGeneratedLooks.length > 6 && (
              <button
                onClick={() => setShowAllLooks(!showAllLooks)}
                className={(isDark ? 'text-pink-400 hover:text-pink-300' : 'text-pink-500 hover:text-pink-600') + ' text-xs font-medium flex items-center gap-1'}
              >
                {showAllLooks ? 'Mostrar menos' : 'Ver todos'}
                <i className={'fas fa-chevron-' + (showAllLooks ? 'up' : 'down') + ' text-[10px]'}></i>
              </button>
            )}
          </div>

          {allGeneratedLooks.length > 0 ? (
            <div className={(isDark ? 'border-neutral-800' : 'border-gray-200') + ' border-t p-4'}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {(showAllLooks ? allGeneratedLooks : recentLooks).map((look) => (
                  <div
                    key={look.id}
                    onClick={() => setSelectedLook(look)}
                    className={(isDark ? 'bg-neutral-800 border-neutral-700 hover:border-pink-500/50' : 'bg-gray-50 border-gray-200 hover:border-pink-300') + ' rounded-xl border overflow-hidden cursor-pointer transition-all group'}
                  >
                    <div className="aspect-[3/4] relative overflow-hidden bg-neutral-900">
                      <img
                        src={look.imageUrl}
                        alt={look.productName}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-[9px] font-medium truncate">{look.productName}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={(isDark ? 'border-neutral-800' : 'border-gray-200') + ' border-t p-8 text-center'}>
              <div className={'w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ' + (isDark ? 'bg-neutral-800' : 'bg-gray-100')}>
                <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-layer-group text-xl'}></i>
              </div>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-sm mb-4'}>Nenhum look criado ainda</p>
              <button
                onClick={handleNewLook}
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-xs hover:opacity-90 transition-opacity"
              >
                <i className="fas fa-plus mr-1.5"></i>Criar primeiro look
              </button>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* EXPLORAR POR PRODUTO */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {productsWithLooks.length > 0 && (
          <div className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-2xl border overflow-hidden'}>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className={'w-8 h-8 rounded-lg flex items-center justify-center ' + (isDark ? 'bg-purple-500/20' : 'bg-purple-100')}>
                  <i className={(isDark ? 'text-purple-400' : 'text-purple-500') + ' fas fa-shirt text-sm'}></i>
                </div>
                <div>
                  <h2 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold'}>Explorar por Produto</h2>
                  <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{productsWithLooks.length} produtos com looks</p>
                </div>
              </div>
            </div>

            <div className={(isDark ? 'border-neutral-800' : 'border-gray-200') + ' border-t p-4'}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {productsWithLooks.map((pwl) => {
                  const productImage = getProductImage(pwl.product);
                  const isOptimized = hasOptimizedImage(pwl.product);
                  return (
                    <div
                      key={pwl.product.id}
                      onClick={() => handleOpenProductModal(pwl)}
                      className={(isDark ? 'bg-neutral-800 border-neutral-700 hover:border-purple-500/50' : 'bg-gray-50 border-gray-200 hover:border-purple-300') + ' rounded-xl border overflow-hidden cursor-pointer transition-all group'}
                    >
                      <div className={(isDark ? 'bg-neutral-700' : 'bg-gray-100') + ' aspect-square relative overflow-hidden'}>
                        {productImage ? (
                          <img
                            src={productImage}
                            alt={pwl.product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-image text-2xl'}></i>
                          </div>
                        )}
                        {/* Badge de quantidade de looks */}
                        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                          {pwl.looks.length > 0 && (
                            <div className="px-2 py-1 bg-pink-500 text-white text-[10px] font-bold rounded-full flex items-center gap-1">
                              <i className="fas fa-layer-group text-[8px]"></i>
                              {pwl.looks.length}
                            </div>
                          )}
                          {pwl.participations && pwl.participations > 0 && (
                            <div className="px-2 py-1 bg-purple-500 text-white text-[10px] font-bold rounded-full flex items-center gap-1" title="Participou em looks">
                              <i className="fas fa-plus text-[8px]"></i>
                              {pwl.participations}
                            </div>
                          )}
                        </div>
                        {/* Badge de otimizado (Product Studio) */}
                        {isOptimized && (
                          <div className="absolute top-2 left-2 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center" title="Otimizado no Product Studio">
                            <i className="fas fa-cube text-[10px]"></i>
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[8px] font-medium uppercase tracking-wide'}>{pwl.product.sku}</p>
                        <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium truncate mt-0.5'}>{pwl.product.name}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL - Selecionar Produto para Novo Look */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-2xl border w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col'}>
            {/* Header */}
            <div className={(isDark ? 'border-neutral-800' : 'border-gray-200') + ' border-b p-4 flex items-center justify-between'}>
              <div>
                <h2 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold'}>Selecione o produto principal</h2>
                <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Escolha a peça base para criar o look</p>
              </div>
              <button
                onClick={() => setShowProductModal(false)}
                className={(isDark ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-600') + ' w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-800/50 transition-colors'}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Filtros */}
            <div className="p-4 flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm'}></i>
                <input
                  type="text"
                  placeholder="Buscar produto..."
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400') + ' w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-pink-500/50'}
                  autoFocus
                />
              </div>
              <select
                value={productFilterCategory}
                onChange={(e) => setProductFilterCategory(e.target.value)}
                className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' px-4 py-2.5 border rounded-xl text-sm sm:w-48'}
              >
                <option value="">Todas categorias</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Grid de Produtos */}
            <div className="flex-1 overflow-y-auto p-4 pt-0">
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredProducts.map(product => {
                    const productImage = getProductImage(product);
                    const isOptimized = hasOptimizedImage(product);
                    return (
                      <div
                        key={product.id}
                        onClick={() => handleSelectProductForNewLook(product)}
                        className={(isDark ? 'bg-neutral-800 border-neutral-700 hover:border-pink-500/50' : 'bg-gray-50 border-gray-200 hover:border-pink-300') + ' rounded-xl border overflow-hidden cursor-pointer transition-all group'}
                      >
                        <div className={(isDark ? 'bg-neutral-700' : 'bg-gray-100') + ' aspect-square relative overflow-hidden'}>
                          {productImage ? (
                            <img
                              src={productImage}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-image text-2xl'}></i>
                            </div>
                          )}
                          {isOptimized && (
                            <div className="absolute top-2 left-2 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center" title="Otimizado no Product Studio">
                              <i className="fas fa-cube text-[10px]"></i>
                            </div>
                          )}
                          <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="w-full py-1.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-[10px]">
                              <i className="fas fa-check mr-1"></i>Selecionar
                            </button>
                          </div>
                        </div>
                        <div className="p-2.5">
                          <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[8px] font-medium uppercase tracking-wide'}>{product.sku}</p>
                          <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium truncate mt-0.5'}>{product.name}</p>
                          {product.category && (
                            <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] mt-1'}>{product.category}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-100') + ' w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3'}>
                    <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-search text-xl'}></i>
                  </div>
                  <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-sm'}>Nenhum produto encontrado</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL - Detalhes do Look (clique na galeria) */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {selectedLook && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-2xl border w-full max-w-3xl max-h-[90vh] overflow-hidden'}>
            {/* Header */}
            <div className={(isDark ? 'border-neutral-800' : 'border-gray-200') + ' border-b p-4 flex items-center justify-between'}>
              <div>
                <h2 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold'}>{selectedLook.productName}</h2>
                <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>{selectedLook.productSku} • {new Date(selectedLook.createdAt).toLocaleDateString('pt-BR')}</p>
              </div>
              <button
                onClick={() => setSelectedLook(null)}
                className={(isDark ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-600') + ' w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-800/50 transition-colors'}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="p-4 flex flex-col md:flex-row gap-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* Imagem */}
              <div className="md:w-2/3">
                <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-100') + ' rounded-xl overflow-hidden'}>
                  <img
                    src={selectedLook.imageUrl}
                    alt={selectedLook.productName}
                    className="w-full h-auto max-h-[60vh] object-contain"
                  />
                </div>
              </div>

              {/* Ações */}
              <div className="md:w-1/3 flex flex-col gap-3">
                <div className={(isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-gray-50 border-gray-200') + ' rounded-xl border p-4'}>
                  <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>Download</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownloadLook(selectedLook.imageUrl, selectedLook.productName, 'png')}
                      className={(isDark ? 'bg-neutral-700 hover:bg-neutral-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900') + ' flex-1 py-2.5 rounded-lg font-medium text-xs transition-colors'}
                    >
                      PNG
                    </button>
                    <button
                      onClick={() => handleDownloadLook(selectedLook.imageUrl, selectedLook.productName, 'svg')}
                      className={(isDark ? 'bg-neutral-700 hover:bg-neutral-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900') + ' flex-1 py-2.5 rounded-lg font-medium text-xs transition-colors'}
                    >
                      SVG
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const product = products.find(p => p.id === selectedLook.productId);
                    if (product) {
                      setSelectedLook(null);
                      setSelectedProduct(product);
                    }
                  }}
                  className="w-full py-3 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <i className="fas fa-wand-magic-sparkles"></i>
                  Criar novo look
                </button>

                <button
                  onClick={() => {
                    if (confirm('Tem certeza que deseja excluir este look?')) {
                      handleDeleteLook(selectedLook);
                    }
                  }}
                  className={(isDark ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' : 'bg-red-50 hover:bg-red-100 text-red-600') + ' w-full py-2.5 rounded-xl font-medium text-xs transition-colors flex items-center justify-center gap-2'}
                >
                  <i className="fas fa-trash"></i>
                  Excluir look
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL - Detalhes do Produto (Explorar por Produto) */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {selectedProductForModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-2xl border w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col'}>
            {/* Header */}
            <div className={(isDark ? 'border-neutral-800' : 'border-gray-200') + ' border-b p-4 flex items-center justify-between'}>
              <div className="flex items-center gap-3">
                <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-100') + ' w-12 h-12 rounded-lg overflow-hidden'}>
                  {getProductImage(selectedProductForModal.product) ? (
                    <img src={getProductImage(selectedProductForModal.product)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-image'}></i>
                    </div>
                  )}
                </div>
                <div>
                  <h2 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold'}>{selectedProductForModal.product.name}</h2>
                  <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>{selectedProductForModal.product.sku} • {selectedProductForModal.lookCount} looks</p>
                </div>
              </div>
              <button
                onClick={() => { setSelectedProductForModal(null); setModalSelectedLook(null); }}
                className={(isDark ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-600') + ' w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-800/50 transition-colors'}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Imagem principal */}
                <div className="lg:w-1/2">
                  <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-100') + ' rounded-xl overflow-hidden aspect-[3/4]'}>
                    <img
                      src={modalSelectedLook?.imageUrl || getProductImage(selectedProductForModal.product)}
                      alt={selectedProductForModal.product.name}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {modalSelectedLook && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleDownloadLook(modalSelectedLook.imageUrl, modalSelectedLook.productName, 'png')}
                        className="flex-1 py-2.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                      >
                        <i className="fas fa-download"></i>
                        Download PNG
                      </button>
                      <button
                        onClick={() => handleDownloadLook(modalSelectedLook.imageUrl, modalSelectedLook.productName, 'svg')}
                        className={(isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900') + ' flex-1 py-2.5 rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-2'}
                      >
                        <i className="fas fa-download"></i>
                        Download SVG
                      </button>
                    </div>
                  )}
                </div>

                {/* Conteúdo direito */}
                <div className="lg:w-1/2 space-y-4">
                  {/* Botão criar novo look */}
                  <button
                    onClick={() => {
                      setSelectedProductForModal(null);
                      setModalSelectedLook(null);
                      setSelectedProduct(selectedProductForModal.product);
                    }}
                    className="w-full py-3 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-wand-magic-sparkles"></i>
                    Gerar novo look com este produto
                  </button>

                  {/* Looks deste produto */}
                  <div className={(isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-gray-50 border-gray-200') + ' rounded-xl border p-4'}>
                    <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>Looks criados ({selectedProductForModal.lookCount})</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {selectedProductForModal.looks.map((look) => (
                        <div
                          key={look.id}
                          onClick={() => setModalSelectedLook(look)}
                          className={(modalSelectedLook?.id === look.id ? 'ring-2 ring-pink-500 ' : '') + (isDark ? 'bg-neutral-700 hover:bg-neutral-600' : 'bg-gray-100 hover:bg-gray-200') + ' rounded-lg overflow-hidden cursor-pointer transition-all aspect-[3/4]'}
                        >
                          <img
                            src={look.imageUrl}
                            alt={look.productName}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Produtos frequentemente combinados */}
                  {(() => {
                    const frequentlyPaired = getFrequentlyPaired(selectedProductForModal.product.id);
                    if (frequentlyPaired.length === 0) return null;
                    return (
                      <div className={(isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-gray-50 border-gray-200') + ' rounded-xl border p-4'}>
                        <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>Muito usado com</h3>
                        <div className="space-y-2">
                          {frequentlyPaired.map(({ product: p, count }) => (
                            <div key={p.id} className={(isDark ? 'bg-neutral-700/50' : 'bg-gray-100') + ' rounded-lg p-2 flex items-center gap-3'}>
                              <div className={(isDark ? 'bg-neutral-600' : 'bg-gray-200') + ' w-10 h-10 rounded-lg overflow-hidden flex-shrink-0'}>
                                {getProductImage(p) ? (
                                  <img src={getProductImage(p)} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <i className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' fas fa-image text-xs'}></i>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium truncate'}>{p.name}</p>
                                <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>
                                  Usado {count}x juntos
                                </p>
                              </div>
                              <div className="px-2 py-1 bg-purple-500/20 text-purple-400 text-[10px] font-bold rounded-full">
                                {count}x
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Cores frequentemente usadas */}
                  {(() => {
                    const frequentColors = getFrequentColors(selectedProductForModal.product.id);
                    if (frequentColors.length === 0) return null;
                    return (
                      <div className={(isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-gray-50 border-gray-200') + ' rounded-xl border p-4'}>
                        <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>Cores mais usadas com este produto</h3>
                        <div className="flex gap-2 flex-wrap">
                          {frequentColors.map(({ color, count }) => (
                            <span
                              key={color}
                              className={(isDark ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-200 text-gray-700') + ' px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5'}
                            >
                              {color}
                              <span className={(isDark ? 'bg-neutral-600 text-neutral-400' : 'bg-gray-300 text-gray-600') + ' px-1.5 py-0.5 rounded-full text-[9px]'}>
                                {count}x
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
