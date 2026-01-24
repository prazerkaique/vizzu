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

const CATEGORIES = ['Camisetas', 'Calças', 'Calçados', 'Acessórios', 'Vestidos', 'Shorts', 'Jaquetas', 'Blusas', 'Regatas', 'Tops'];
const COLLECTIONS = ['Verão 2025', 'Inverno 2025', 'Básicos', 'Premium', 'Promoção'];
const COLORS = ['Preto', 'Branco', 'Azul', 'Vermelho', 'Verde', 'Amarelo', 'Rosa', 'Cinza', 'Marrom', 'Bege'];
const GENDERS = ['Masculino', 'Feminino', 'Unissex'];

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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Seção de looks gerados
  const [showGeneratedLooks, setShowGeneratedLooks] = useState(true);

  // Filtros
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterCollection, setFilterCollection] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'a-z' | 'z-a'>('recent');

  // Filtrar e ordenar produtos
  const filteredProducts = useMemo(() => {
    let result = products.filter(product => {
      const matchesSearch = !searchTerm ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !filterCategory || product.category === filterCategory;
      const matchesCollection = !filterCollection || product.collection === filterCollection;
      const matchesColor = !filterColor || product.color === filterColor;
      const matchesGender = !filterGender || (product as any).gender === filterGender;
      return matchesSearch && matchesCategory && matchesCollection && matchesColor && matchesGender;
    });

    // Ordenar
    if (sortBy === 'a-z') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'z-a') {
      result = [...result].sort((a, b) => b.name.localeCompare(a.name));
    } else {
      result = [...result].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    }

    return result;
  }, [products, searchTerm, filterCategory, filterCollection, filterColor, filterGender, sortBy]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCategory('');
    setFilterCollection('');
    setFilterColor('');
    setFilterGender('');
    setSortBy('recent');
  };

  const hasActiveFilters = searchTerm || filterCategory || filterCollection || filterColor || filterGender || sortBy !== 'recent';

  const getProductImage = (product: Product): string | undefined => {
    if (product.originalImages?.front?.url) return product.originalImages.front.url;
    if (product.images?.[0]?.url) return product.images[0].url;
    if (product.images?.[0]?.base64) return product.images[0].base64;
    return undefined;
  };

  // Contar looks gerados
  const getLookCount = (product: Product): number => {
    return product.generatedImages?.modeloIA?.length || 0;
  };

  // Coletar todos os looks gerados de todos os produtos
  const allGeneratedLooks = useMemo(() => {
    const looks: Array<{
      id: string;
      productId: string;
      productName: string;
      productSku: string;
      imageUrl: string;
      createdAt: string;
    }> = [];

    products.forEach(product => {
      if (product.generatedImages?.modeloIA) {
        product.generatedImages.modeloIA.forEach((look: any) => {
          const imageUrl = look.images?.front || look.imageUrl || look.url;
          if (imageUrl) {
            looks.push({
              id: look.id || `${product.id}-${looks.length}`,
              productId: product.id,
              productName: product.name,
              productSku: product.sku,
              imageUrl,
              createdAt: look.createdAt || new Date().toISOString()
            });
          }
        });
      }
    });

    // Ordenar por data de criação (mais recente primeiro)
    return looks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [products]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleBackToList = () => {
    setSelectedProduct(null);
  };

  // Se tem produto selecionado, mostra o editor (página 2)
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

  // Página 1 - Lista de produtos
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
              <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Monte looks completos com modelo IA</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={'hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg ' + (theme === 'dark' ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-200 shadow-sm')}>
              <i className="fas fa-coins text-pink-400 text-xs"></i>
              <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-sm'}>{userCredits}</span>
            </div>
            {onImport && (
              <button
                onClick={onImport}
                className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-xs hover:opacity-90 transition-opacity"
              >
                <i className="fas fa-plus"></i>
                <span>Novo</span>
              </button>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CARD EXPLICATIVO - Logo abaixo do header */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className={(theme === 'dark' ? 'bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-orange-500/10 border-pink-500/20' : 'bg-gradient-to-r from-pink-100 via-purple-100 to-orange-100 border-pink-200') + ' rounded-xl p-4 border mb-4'}>
          <div className="flex items-start gap-4">
            <div className={'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ' + (theme === 'dark' ? 'bg-pink-500/20' : 'bg-pink-200')}>
              <i className={(theme === 'dark' ? 'text-pink-400' : 'text-pink-600') + ' fas fa-shirt text-lg'}></i>
            </div>
            <div className="flex-1">
              <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm mb-1'}>Monte looks completos com modelo IA</h3>
              <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs leading-relaxed'}>
                Selecione uma peça principal, escolha um modelo IA, monte o look com suas peças ou descreva, e escolha o fundo perfeito.
              </p>
              <div className="flex items-center gap-3 mt-2">
                <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>
                  <i className="fas fa-user text-pink-400 mr-1"></i>Modelos salvos ou criar novo
                </span>
                <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>
                  <i className="fas fa-image text-pink-400 mr-1"></i>Fundo estúdio ou próprio
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SEARCH BAR */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="relative mb-4">
          <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm'}></i>
          <input
            type="text"
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500 focus:border-pink-500/50' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-pink-400 shadow-sm') + ' w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none'}
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

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* FILTERS */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border mb-4'}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full p-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <i className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' fas fa-filter text-xs'}></i>
              <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] font-medium uppercase tracking-wide'}>Filtrar e ordenar</span>
              {hasActiveFilters && (
                <span className="px-1.5 py-0.5 bg-pink-500 text-white text-[8px] rounded-full">{
                  [filterCategory, filterCollection, filterColor, filterGender, sortBy !== 'recent' ? sortBy : ''].filter(Boolean).length
                }</span>
              )}
            </div>
            <i className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' fas fa-chevron-' + (showFilters ? 'up' : 'down') + ' text-xs'}></i>
          </button>

          {showFilters && (
            <div className="px-3 pb-3">
              {hasActiveFilters && (
                <div className="flex justify-end mb-2">
                  <button
                    onClick={clearFilters}
                    className="text-[10px] text-pink-500 hover:text-pink-400 font-medium"
                  >
                    Limpar filtros
                  </button>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {/* Categoria */}
                <div>
                  <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>Categoria</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-2.5 py-2 border rounded-lg text-xs'}
                  >
                    <option value="">Todas</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Coleção */}
                <div>
                  <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>Coleção</label>
                  <select
                    value={filterCollection}
                    onChange={(e) => setFilterCollection(e.target.value)}
                    className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-2.5 py-2 border rounded-lg text-xs'}
                  >
                    <option value="">Todas</option>
                    {COLLECTIONS.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                {/* Cor */}
                <div>
                  <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>Cor</label>
                  <select
                    value={filterColor}
                    onChange={(e) => setFilterColor(e.target.value)}
                    className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-2.5 py-2 border rounded-lg text-xs'}
                  >
                    <option value="">Todas</option>
                    {COLORS.map(color => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                </div>

                {/* Gênero */}
                <div>
                  <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>Gênero</label>
                  <select
                    value={filterGender}
                    onChange={(e) => setFilterGender(e.target.value)}
                    className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-2.5 py-2 border rounded-lg text-xs'}
                  >
                    <option value="">Todos</option>
                    {GENDERS.map(gender => (
                      <option key={gender} value={gender}>{gender}</option>
                    ))}
                  </select>
                </div>

                {/* Ordenar */}
                <div>
                  <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>Ordenar</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'recent' | 'a-z' | 'z-a')}
                    className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-2.5 py-2 border rounded-lg text-xs'}
                  >
                    <option value="recent">Recentes</option>
                    <option value="a-z">A → Z</option>
                    <option value="z-a">Z → A</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* BANNER - Seus Produtos + Plano */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-4 mb-4'}>
          <div className="flex items-center justify-between">
            <div>
              <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide'}>Seus produtos</p>
              <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-3xl font-bold'}>{filteredProducts.length}</p>
              {hasActiveFilters && (
                <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>de {products.length} no catálogo</p>
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
        {/* LOOKS GERADOS - Seção Colapsável */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {allGeneratedLooks.length > 0 && (
          <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border mb-4 overflow-hidden'}>
            <button
              onClick={() => setShowGeneratedLooks(!showGeneratedLooks)}
              className="w-full p-4 flex items-center justify-between hover:bg-opacity-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={'w-10 h-10 rounded-xl flex items-center justify-center ' + (theme === 'dark' ? 'bg-gradient-to-r from-green-500/20 to-emerald-400/20 border border-green-500/30' : 'bg-gradient-to-r from-green-500 to-emerald-400')}>
                  <i className={'fas fa-images text-sm ' + (theme === 'dark' ? 'text-green-400' : 'text-white')}></i>
                </div>
                <div className="text-left">
                  <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold flex items-center gap-2'}>
                    Looks Gerados
                    <span className={(theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600') + ' px-2 py-0.5 text-[10px] font-bold rounded-full'}>
                      {allGeneratedLooks.length}
                    </span>
                  </h3>
                  <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>
                    Seus looks criados com IA
                  </p>
                </div>
              </div>
              <i className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' fas fa-chevron-' + (showGeneratedLooks ? 'up' : 'down') + ' text-sm'}></i>
            </button>

            {showGeneratedLooks && (
              <div className={(theme === 'dark' ? 'border-neutral-800' : 'border-gray-200') + ' border-t p-4'}>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                  {allGeneratedLooks.map((look) => (
                    <div
                      key={look.id}
                      className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 hover:border-green-500/50' : 'bg-gray-50 border-gray-200 hover:border-green-400') + ' rounded-lg border overflow-hidden cursor-pointer transition-all group'}
                      onClick={() => {
                        const product = products.find(p => p.id === look.productId);
                        if (product) handleSelectProduct(product);
                      }}
                    >
                      <div className="aspect-[3/4] relative overflow-hidden">
                        <img
                          src={look.imageUrl}
                          alt={look.productName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute bottom-1.5 left-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white text-[8px] font-medium truncate">{look.productName}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* PRODUCTS GRID */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <>
          <div className="flex items-center justify-between mb-3">
            <h2 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>
              Selecione a peça principal
            </h2>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredProducts.map(product => {
                const productImage = getProductImage(product);
                const lookCount = getLookCount(product);
                return (
                  <div
                    key={product.id}
                    data-product-id={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800 hover:border-pink-500/50' : 'bg-white border-gray-200 hover:border-pink-300 shadow-sm hover:shadow-md') + ' rounded-xl border overflow-hidden cursor-pointer transition-all group'}
                  >
                    <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' aspect-square relative overflow-hidden'}>
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
                      {lookCount > 0 && (
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-green-500 text-white text-[8px] font-bold rounded-full flex items-center gap-1">
                          <i className="fas fa-check text-[6px]"></i>
                          {lookCount}
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="w-full py-1.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-[10px]">
                          <i className="fas fa-wand-magic-sparkles mr-1"></i>Criar Look
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
            <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-8 text-center'}>
              <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-pink-100') + ' w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3'}>
                <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-pink-400') + ' fas fa-search text-xl'}></i>
              </div>
              <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium mb-1'}>
                {hasActiveFilters ? 'Nenhum produto encontrado' : 'Nenhum produto'}
              </h3>
              <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mb-4'}>
                {hasActiveFilters ? 'Tente ajustar os filtros' : 'Importe produtos para começar'}
              </p>
              {hasActiveFilters ? (
                <button
                  onClick={clearFilters}
                  className={(theme === 'dark' ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200') + ' px-4 py-2 rounded-lg font-medium text-xs transition-colors'}
                >
                  Limpar filtros
                </button>
              ) : onImport && (
                <button
                  onClick={onImport}
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-xs hover:opacity-90 transition-opacity"
                >
                  <i className="fas fa-plus mr-1.5"></i>Importar produto
                </button>
              )}
            </div>
          )}
        </>

      </div>
    </div>
  );
};
