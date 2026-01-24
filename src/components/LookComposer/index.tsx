// ═══════════════════════════════════════════════════════════════
// VIZZU - Look Composer (Monte looks completos com IA)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import { Product, HistoryLog, SavedModel } from '../../types';
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
  // Estados de geração em background
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

// Interface para look gerado
interface GeneratedLook {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  productCategory?: string;
  imageUrl: string;
  createdAt: string;
  metadata?: any;
}

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
  // Estados principais
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedLook, setSelectedLook] = useState<GeneratedLook | null>(null);

  // Filtros para looks
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProductId, setFilterProductId] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'a-z' | 'z-a'>('recent');

  // Filtros para modal de produtos
  const [productSearchTerm, setProductSearchTerm] = useState('');

  // Coletar todos os looks gerados de todos os produtos
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

    return looks;
  }, [products]);

  // Produtos que têm looks (para o filtro)
  const productsWithLooks = useMemo(() => {
    const productIds = new Set(allGeneratedLooks.map(l => l.productId));
    return products.filter(p => productIds.has(p.id));
  }, [products, allGeneratedLooks]);

  // Filtrar e ordenar looks
  const filteredLooks = useMemo(() => {
    let result = allGeneratedLooks.filter(look => {
      const matchesSearch = !searchTerm ||
        look.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        look.productSku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProduct = !filterProductId || look.productId === filterProductId;
      return matchesSearch && matchesProduct;
    });

    // Ordenar
    if (sortBy === 'a-z') {
      result = [...result].sort((a, b) => a.productName.localeCompare(b.productName));
    } else if (sortBy === 'z-a') {
      result = [...result].sort((a, b) => b.productName.localeCompare(a.productName));
    } else {
      result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [allGeneratedLooks, searchTerm, filterProductId, sortBy]);

  // Filtrar produtos no modal
  const filteredProducts = useMemo(() => {
    if (!productSearchTerm) return products;
    return products.filter(product =>
      product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(productSearchTerm.toLowerCase())
    );
  }, [products, productSearchTerm]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterProductId('');
    setSortBy('recent');
  };

  const hasActiveFilters = searchTerm || filterProductId || sortBy !== 'recent';

  const getProductImage = (product: Product): string | undefined => {
    if (product.originalImages?.front?.url) return product.originalImages.front.url;
    if (product.images?.[0]?.url) return product.images[0].url;
    if (product.images?.[0]?.base64) return product.images[0].base64;
    return undefined;
  };

  const handleNewLook = () => {
    setShowProductModal(true);
    setProductSearchTerm('');
  };

  const handleSelectProductForNewLook = (product: Product) => {
    setSelectedProduct(product);
    setShowProductModal(false);
  };

  const handleBackToList = () => {
    setSelectedProduct(null);
  };

  const handleLookClick = (look: GeneratedLook) => {
    setSelectedLook(look);
  };

  const handleCloseLookModal = () => {
    setSelectedLook(null);
  };

  const handleDownloadLook = async (imageUrl: string, productName: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `look-${productName.replace(/\s+/g, '-').toLowerCase()}.png`;
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
        (l: any) => (l.id || `${product.id}-${product.generatedImages!.modeloIA!.indexOf(l)}`) !== look.id
      );
      onUpdateProduct(product.id, {
        generatedImages: {
          ...product.generatedImages,
          modeloIA: updatedModeloIA
        }
      });
      setSelectedLook(null);
    }
  };

  const handleEditLook = (look: GeneratedLook) => {
    const product = products.find(p => p.id === look.productId);
    if (product) {
      setSelectedLook(null);
      setSelectedProduct(product);
    }
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

  // Página principal - Galeria de Looks
  return (
    <div className={'flex-1 overflow-y-auto p-4 md:p-6 ' + (theme === 'dark' ? 'bg-black' : 'bg-gray-50')}>
      <div className="max-w-7xl mx-auto">

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* HEADER */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={'w-10 h-10 rounded-xl flex items-center justify-center ' + (theme === 'dark' ? 'bg-gradient-to-r from-pink-500/20 to-orange-400/20 border border-pink-500/30' : 'bg-gradient-to-r from-pink-500 to-orange-400 shadow-lg shadow-pink-500/25')}>
              <i className={'fas fa-layer-group text-sm ' + (theme === 'dark' ? 'text-pink-400' : 'text-white')}></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold'}>Vizzu Look Composer®</h1>
                {currentPlan && (
                  <span className={(theme === 'dark' ? 'bg-pink-500/20 text-pink-400' : 'bg-gradient-to-r from-pink-500 to-orange-400 text-white') + ' px-2 py-0.5 text-[9px] font-medium rounded-full uppercase tracking-wide'}>
                    {currentPlan.name}
                  </span>
                )}
              </div>
              <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Seus looks criados com modelo IA</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={'hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg ' + (theme === 'dark' ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-200 shadow-sm')}>
              <i className="fas fa-coins text-pink-400 text-xs"></i>
              <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-sm'}>{userCredits}</span>
            </div>
            <button
              onClick={handleNewLook}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-xs hover:opacity-90 transition-opacity"
            >
              <i className="fas fa-plus"></i>
              <span>Novo Look</span>
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* BANNER - Total de Looks */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-4 mb-4'}>
          <div className="flex items-center justify-between">
            <div>
              <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide'}>Looks criados</p>
              <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-3xl font-bold'}>{filteredLooks.length}</p>
              {hasActiveFilters && (
                <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>de {allGeneratedLooks.length} no total</p>
              )}
            </div>
            {currentPlan && (
              <div className="text-right">
                <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide'}>Plano</p>
                <span className={(theme === 'dark' ? 'bg-pink-500/20 text-pink-400' : 'bg-gradient-to-r from-pink-500 to-orange-400 text-white') + ' px-3 py-1 text-sm font-medium rounded-full'}>
                  {currentPlan.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* FILTROS */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-4 mb-4'}>
          <div className="flex flex-col md:flex-row gap-3">
            {/* Busca */}
            <div className="flex-1 relative">
              <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm'}></i>
              <input
                type="text"
                placeholder="Buscar por produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500 focus:border-pink-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-pink-400') + ' w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none'}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className={(theme === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-600') + ' absolute right-3 top-1/2 -translate-y-1/2'}
                >
                  <i className="fas fa-times text-xs"></i>
                </button>
              )}
            </div>

            {/* Filtro por produto */}
            <div className="md:w-48">
              <select
                value={filterProductId}
                onChange={(e) => setFilterProductId(e.target.value)}
                className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}
              >
                <option value="">Todos os produtos</option>
                {productsWithLooks.map(product => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </div>

            {/* Ordenar */}
            <div className="md:w-36">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'a-z' | 'z-a')}
                className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}
              >
                <option value="recent">Recentes</option>
                <option value="a-z">A → Z</option>
                <option value="z-a">Z → A</option>
              </select>
            </div>

            {/* Limpar filtros */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className={(theme === 'dark' ? 'text-pink-400 hover:text-pink-300' : 'text-pink-500 hover:text-pink-600') + ' text-xs font-medium whitespace-nowrap'}
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* GALERIA DE LOOKS */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {filteredLooks.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredLooks.map((look) => (
              <div
                key={look.id}
                onClick={() => handleLookClick(look)}
                className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800 hover:border-pink-500/50' : 'bg-white border-gray-200 hover:border-pink-300 shadow-sm hover:shadow-md') + ' rounded-xl border overflow-hidden cursor-pointer transition-all group'}
              >
                <div className="aspect-[3/4] relative overflow-hidden">
                  <img
                    src={look.imageUrl}
                    alt={look.productName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="w-full py-1.5 bg-white/90 text-gray-900 rounded-lg font-medium text-[10px]">
                      <i className="fas fa-eye mr-1"></i>Ver detalhes
                    </button>
                  </div>
                </div>
                <div className="p-2.5">
                  <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-[8px] font-medium uppercase tracking-wide'}>{look.productSku}</p>
                  <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium truncate mt-0.5'}>{look.productName}</p>
                  {look.productCategory && (
                    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] mt-1'}>{look.productCategory}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-12 text-center'}>
            <div className={'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ' + (theme === 'dark' ? 'bg-gradient-to-r from-pink-500/20 to-orange-400/20' : 'bg-gradient-to-r from-pink-100 to-orange-100')}>
              <i className={(theme === 'dark' ? 'text-pink-400' : 'text-pink-500') + ' fas fa-layer-group text-2xl'}></i>
            </div>
            <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-base font-semibold mb-2'}>
              {hasActiveFilters ? 'Nenhum look encontrado' : 'Nenhum look criado ainda'}
            </h3>
            <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-sm mb-6 max-w-md mx-auto'}>
              {hasActiveFilters
                ? 'Tente ajustar os filtros para encontrar seus looks.'
                : 'Crie looks incríveis com seus produtos usando modelos IA. Clique no botão abaixo para começar!'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className={(theme === 'dark' ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200') + ' px-5 py-2.5 rounded-lg font-medium text-sm transition-colors'}
              >
                Limpar filtros
              </button>
            ) : (
              <button
                onClick={handleNewLook}
                className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
              >
                <i className="fas fa-plus mr-2"></i>Criar primeiro look
              </button>
            )}
          </div>
        )}

      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL - Selecionar Produto para Novo Look */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-2xl border w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col'}>
            {/* Header do Modal */}
            <div className={(theme === 'dark' ? 'border-neutral-800' : 'border-gray-200') + ' border-b p-4 flex items-center justify-between'}>
              <div>
                <h2 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold'}>Selecione o produto principal</h2>
                <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Escolha a peça base para criar o look</p>
              </div>
              <button
                onClick={() => setShowProductModal(false)}
                className={(theme === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-600') + ' w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-800/50 transition-colors'}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Busca */}
            <div className="p-4">
              <div className="relative">
                <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm'}></i>
                <input
                  type="text"
                  placeholder="Buscar produto..."
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500 focus:border-pink-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-pink-400') + ' w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none'}
                  autoFocus
                />
              </div>
            </div>

            {/* Grid de Produtos */}
            <div className="flex-1 overflow-y-auto p-4 pt-0">
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredProducts.map(product => {
                    const productImage = getProductImage(product);
                    return (
                      <div
                        key={product.id}
                        onClick={() => handleSelectProductForNewLook(product)}
                        className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 hover:border-pink-500/50' : 'bg-gray-50 border-gray-200 hover:border-pink-300') + ' rounded-xl border overflow-hidden cursor-pointer transition-all group'}
                      >
                        <div className={(theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-100') + ' aspect-square relative overflow-hidden'}>
                          {productImage ? (
                            <img
                              src={productImage}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-image text-2xl'}></i>
                            </div>
                          )}
                          <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="w-full py-1.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-[10px]">
                              <i className="fas fa-check mr-1"></i>Selecionar
                            </button>
                          </div>
                        </div>
                        <div className="p-2.5">
                          <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-[8px] font-medium uppercase tracking-wide'}>{product.sku}</p>
                          <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium truncate mt-0.5'}>{product.name}</p>
                          {product.category && (
                            <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] mt-1'}>{product.category}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3'}>
                    <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-search text-xl'}></i>
                  </div>
                  <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium mb-1'}>
                    {productSearchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto'}
                  </h3>
                  <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>
                    {productSearchTerm ? 'Tente outro termo de busca' : 'Importe produtos para criar looks'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL - Detalhes do Look */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {selectedLook && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-2xl border w-full max-w-3xl max-h-[90vh] overflow-hidden'}>
            {/* Header do Modal */}
            <div className={(theme === 'dark' ? 'border-neutral-800' : 'border-gray-200') + ' border-b p-4 flex items-center justify-between'}>
              <div>
                <h2 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold'}>{selectedLook.productName}</h2>
                <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>{selectedLook.productSku} • {new Date(selectedLook.createdAt).toLocaleDateString('pt-BR')}</p>
              </div>
              <button
                onClick={handleCloseLookModal}
                className={(theme === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-600') + ' w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-800/50 transition-colors'}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-4 flex flex-col md:flex-row gap-4">
              {/* Imagem */}
              <div className="md:w-2/3">
                <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' rounded-xl overflow-hidden'}>
                  <img
                    src={selectedLook.imageUrl}
                    alt={selectedLook.productName}
                    className="w-full h-auto max-h-[60vh] object-contain"
                  />
                </div>
              </div>

              {/* Ações */}
              <div className="md:w-1/3 flex flex-col gap-3">
                <div className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700' : 'bg-gray-50 border-gray-200') + ' rounded-xl border p-4'}>
                  <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>Ações</h3>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleDownloadLook(selectedLook.imageUrl, selectedLook.productName)}
                      className={(theme === 'dark' ? 'bg-neutral-700 hover:bg-neutral-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900') + ' w-full py-2.5 rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-2'}
                    >
                      <i className="fas fa-download"></i>
                      Baixar imagem
                    </button>
                    <button
                      onClick={() => handleEditLook(selectedLook)}
                      className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
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
                      className={(theme === 'dark' ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' : 'bg-red-50 hover:bg-red-100 text-red-600') + ' w-full py-2.5 rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-2'}
                    >
                      <i className="fas fa-trash"></i>
                      Excluir look
                    </button>
                  </div>
                </div>

                {/* Info do Produto */}
                <div className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700' : 'bg-gray-50 border-gray-200') + ' rounded-xl border p-4'}>
                  <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>Produto base</h3>
                  <div className="flex items-center gap-3">
                    {(() => {
                      const product = products.find(p => p.id === selectedLook.productId);
                      const productImage = product ? getProductImage(product) : undefined;
                      return (
                        <>
                          <div className={(theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-100') + ' w-12 h-12 rounded-lg overflow-hidden flex-shrink-0'}>
                            {productImage ? (
                              <img src={productImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-image text-sm'}></i>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>{selectedLook.productName}</p>
                            <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{selectedLook.productSku}</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
