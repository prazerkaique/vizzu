// ═══════════════════════════════════════════════════════════════
// VIZZU - Product Studio (Fotos profissionais de produto)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo, useEffect } from 'react';
import { OptimizedImage } from '../OptimizedImage';
import { Product, HistoryLog } from '../../types';
import { ProductStudioEditor } from './ProductStudioEditor';
import { Plan } from '../../hooks/useCredits';

interface ProductStudioProps {
 products: Product[];
 userCredits: number;
 onUpdateProduct: (productId: string, updates: Partial<Product>) => void;
 onDeductCredits: (amount: number, reason: string) => boolean;
 onAddHistoryLog: (action: string, details: string, status: HistoryLog['status'], items: Product[], method: HistoryLog['method'], cost: number) => void;
 onImport?: () => void;
 currentPlan?: Plan;
 onCheckCredits?: (creditsNeeded: number, actionContext: 'studio' | 'cenario' | 'lifestyle' | 'video' | 'provador' | 'generic') => boolean;
 onOpenPlanModal?: () => void;
 theme?: 'dark' | 'light';
 userId?: string;
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
 // Navegação para outras ferramentas
 onNavigate?: (page: 'look-composer' | 'lifestyle' | 'provador', productId?: string, imageUrl?: string) => void;
 // Produto pré-selecionado (vindo do modal de detalhes)
 initialProduct?: Product | null;
 onClearInitialProduct?: () => void;
 // Navegação de volta
 onBack?: () => void;
}

const CATEGORY_GROUPS = [
 { id: 'cabeca', label: '👒 Cabeça', items: ['Bonés', 'Chapéus', 'Tiaras', 'Lenços'] },
 { id: 'parte-de-cima', label: '👕 Parte de Cima', items: ['Camisetas', 'Blusas', 'Regatas', 'Tops', 'Camisas', 'Bodies', 'Jaquetas', 'Casacos', 'Blazers', 'Moletons'] },
 { id: 'parte-de-baixo', label: '👖 Parte de Baixo', items: ['Calças', 'Shorts', 'Bermudas', 'Saias', 'Leggings', 'Shorts Fitness'] },
 { id: 'pecas-inteiras', label: '👗 Peças Inteiras', items: ['Vestidos', 'Macacões', 'Jardineiras', 'Biquínis', 'Maiôs'] },
 { id: 'calcados', label: '👟 Calçados', items: ['Tênis', 'Sandálias', 'Botas', 'Sapatos', 'Chinelos'] },
 { id: 'acessorios', label: '💍 Acessórios', items: ['Bolsas', 'Cintos', 'Relógios', 'Óculos', 'Bijuterias', 'Mochilas', 'Outros Acessórios'] },
];
const CATEGORIES = CATEGORY_GROUPS.flatMap(g => g.items);
const getCategoryGroupBySubcategory = (subcategory: string) => CATEGORY_GROUPS.find(g => g.items.includes(subcategory));
const COLLECTIONS = ['Verão 2025', 'Inverno 2025', 'Básicos', 'Premium', 'Promoção'];
const COLORS = ['Preto', 'Branco', 'Azul', 'Vermelho', 'Verde', 'Amarelo', 'Rosa', 'Cinza', 'Marrom', 'Bege'];
const GENDERS = ['Masculino', 'Feminino', 'Unissex'];

export const ProductStudio: React.FC<ProductStudioProps> = ({
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
 isGenerating = false,
 isMinimized = false,
 generationProgress = 0,
 generationText = '',
 onSetGenerating,
 onSetMinimized,
 onSetProgress,
 onSetLoadingText,
 isAnyGenerationRunning = false,
 onNavigate,
 initialProduct,
 onClearInitialProduct,
 onBack,
 onOpenPlanModal
}) => {
 const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
 const [showProductModal, setShowProductModal] = useState(false);
 const [productSearchTerm, setProductSearchTerm] = useState('');
 const [productFilterCategoryGroup, setProductFilterCategoryGroup] = useState('');
 const [productFilterCategory, setProductFilterCategory] = useState('');

 // Pré-selecionar produto quando vier do modal de detalhes
 useEffect(() => {
 if (initialProduct) {
 setSelectedProduct(initialProduct);
 onClearInitialProduct?.();
 }
 }, [initialProduct, onClearInitialProduct]);

 // Manter selectedProduct atualizado quando products mudar
 useEffect(() => {
 if (selectedProduct) {
 const updatedProduct = products.find(p => p.id === selectedProduct.id);
 if (updatedProduct && updatedProduct !== selectedProduct) {
 setSelectedProduct(updatedProduct);
 }
 }
 }, [products, selectedProduct]);

 // Filtros
 const [showFilters, setShowFilters] = useState(false);
 const [searchTerm, setSearchTerm] = useState('');
 const [filterCategoryGroup, setFilterCategoryGroup] = useState(''); // Categoria principal
 const [filterCategory, setFilterCategory] = useState(''); // Subcategoria
 const [filterCollection, setFilterCollection] = useState('');
 const [filterColor, setFilterColor] = useState('');
 const [filterGender, setFilterGender] = useState('');
 const [sortBy, setSortBy] = useState<'recent' | 'a-z' | 'z-a'>('recent');

 // Estados de colapso das seções
 const [optimizedCollapsed, setOptimizedCollapsed] = useState(false);
 const [pendingCollapsed, setPendingCollapsed] = useState(false);

 // Estados de paginação (20 produtos por página)
 const PRODUCTS_PER_PAGE = 20;
 const [visibleOptimized, setVisibleOptimized] = useState(PRODUCTS_PER_PAGE);
 const [visiblePending, setVisiblePending] = useState(PRODUCTS_PER_PAGE);

 // Reset paginação quando filtros mudam
 useEffect(() => {
 setVisibleOptimized(PRODUCTS_PER_PAGE);
 setVisiblePending(PRODUCTS_PER_PAGE);
 }, [searchTerm, filterCategoryGroup, filterCategory, filterCollection, filterColor, filterGender, sortBy]);

 // Filtrar e ordenar produtos
 const filteredProducts = useMemo(() => {
 let result = products.filter(product => {
 const matchesSearch = !searchTerm ||
 product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
 product.sku.toLowerCase().includes(searchTerm.toLowerCase());
 // Filtro de categoria principal (grupo)
 const categoryGroup = getCategoryGroupBySubcategory(product.category);
 const matchesCategoryGroup = !filterCategoryGroup || categoryGroup?.id === filterCategoryGroup;
 // Filtro de subcategoria
 const matchesCategory = !filterCategory || product.category === filterCategory;
 const matchesCollection = !filterCollection || product.collection === filterCollection;
 const matchesColor = !filterColor || product.color === filterColor;
 const matchesGender = !filterGender || (product as any).gender === filterGender;
 return matchesSearch && matchesCategoryGroup && matchesCategory && matchesCollection && matchesColor && matchesGender;
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
 }, [products, searchTerm, filterCategoryGroup, filterCategory, filterCollection, filterColor, filterGender, sortBy]);

 const clearFilters = () => {
 setSearchTerm('');
 setFilterCategoryGroup('');
 setFilterCategory('');
 setFilterCollection('');
 setFilterColor('');
 setFilterGender('');
 setSortBy('recent');
 };

 const hasActiveFilters = searchTerm || filterCategoryGroup || filterCategory || filterCollection || filterColor || filterGender || sortBy !== 'recent';

 // Verificar se o produto está otimizado (tem imagens do Product Studio)
 const isProductOptimized = (product: Product): boolean => {
 const sessions = product.generatedImages?.productStudio || [];
 return sessions.some(session => session.images.length > 0);
 };

 // Obter a melhor imagem do produto (prioriza: frente gerada > qualquer gerada > original)
 const getProductImage = (product: Product): string | undefined => {
 const sessions = product.generatedImages?.productStudio || [];

 // Se tem imagens geradas, priorizar
 if (sessions.length > 0) {
 // Primeiro, procurar imagem de frente gerada
 for (const session of sessions) {
 const frontImage = session.images.find(img => img.angle === 'front');
 if (frontImage?.url) return frontImage.url;
 }

 // Se não tem frente, pegar a primeira imagem gerada disponível
 for (const session of sessions) {
 if (session.images[0]?.url) return session.images[0].url;
 }
 }

 // Fallback para imagem original
 if (product.originalImages?.front?.url) return product.originalImages.front.url;
 if (product.images?.[0]?.url) return product.images[0].url;
 if (product.images?.[0]?.base64) return product.images[0].base64;
 return undefined;
 };

 // Contar fotos geradas no Product Studio
 const getProductStudioCount = (product: Product): number => {
 const sessions = product.generatedImages?.productStudio || [];
 return sessions.reduce((acc, session) => acc + session.images.length, 0);
 };

 // Separar produtos otimizados dos não otimizados
 const { optimizedProducts, pendingProducts } = useMemo(() => {
 const optimized: Product[] = [];
 const pending: Product[] = [];

 filteredProducts.forEach(product => {
 if (isProductOptimized(product)) {
 optimized.push(product);
 } else {
 pending.push(product);
 }
 });

 return { optimizedProducts: optimized, pendingProducts: pending };
 }, [filteredProducts]);

 const handleSelectProduct = (product: Product) => {
 setSelectedProduct(product);
 };

 const handleBackToList = () => {
 setSelectedProduct(null);
 };

 // Abrir modal para selecionar produto não otimizado
 const handleNewProduct = () => {
 setShowProductModal(true);
 setProductSearchTerm('');
 setProductFilterCategoryGroup('');
 setProductFilterCategory('');
 };

 // Selecionar produto do modal
 const handleSelectProductFromModal = (product: Product) => {
 setSelectedProduct(product);
 setShowProductModal(false);
 };

 // Filtrar produtos pendentes para o modal
 const filteredPendingProducts = useMemo(() => {
 return pendingProducts.filter(product => {
 const matchesSearch = !productSearchTerm ||
 product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
 product.sku.toLowerCase().includes(productSearchTerm.toLowerCase());
 // Filtro de categoria principal (grupo)
 const categoryGroup = getCategoryGroupBySubcategory(product.category);
 const matchesCategoryGroup = !productFilterCategoryGroup || categoryGroup?.id === productFilterCategoryGroup;
 // Filtro de subcategoria
 const matchesCategory = !productFilterCategory || product.category === productFilterCategory;
 return matchesSearch && matchesCategoryGroup && matchesCategory;
 });
 }, [pendingProducts, productSearchTerm, productFilterCategoryGroup, productFilterCategory]);

 // Se tem produto selecionado, mostra o editor (página 2)
 if (selectedProduct) {
 return (
 <ProductStudioEditor
 product={selectedProduct}
 userCredits={userCredits}
 onUpdateProduct={onUpdateProduct}
 onDeductCredits={onDeductCredits}
 onAddHistoryLog={onAddHistoryLog}
 onBack={handleBackToList}
 onCheckCredits={onCheckCredits}
 theme={theme}
 userId={userId}
 isGenerating={isGenerating}
 isMinimized={isMinimized}
 generationProgress={generationProgress}
 generationText={generationText}
 onSetGenerating={onSetGenerating}
 onSetMinimized={onSetMinimized}
 onSetProgress={onSetProgress}
 onSetLoadingText={onSetLoadingText}
 isAnyGenerationRunning={isAnyGenerationRunning}
 onNavigate={onNavigate}
 currentPlan={currentPlan}
 onOpenPlanModal={onOpenPlanModal}
 />
 );
 }

 // Página 1 - Lista de produtos
 return (
 <div
 className={'flex-1 overflow-y-auto p-4 md:p-6 ' + (theme === 'dark' ? 'bg-black' : 'bg-gray-50')}
 style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 1rem))' }}
 >
 <div className="max-w-7xl mx-auto">

 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* HEADER */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 {onBack && (
 <button
 onClick={onBack}
 className={'w-10 h-10 rounded-xl flex items-center justify-center transition-all ' + (theme === 'dark' ? 'bg-white/10 backdrop-blur-xl border border-white/20 text-neutral-300 hover:text-white hover:bg-white/15 shadow-lg' : 'bg-white/60 backdrop-blur-xl border border-gray-200/60 text-gray-500 hover:text-gray-700 hover:bg-white/80 shadow-sm')}
 >
 <i className="fas fa-arrow-left text-sm"></i>
 </button>
 )}
 <div className={'w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xl ' + (theme === 'dark' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
 <i className={'fas fa-cube text-sm ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
 </div>
 <div>
 <div className="flex items-center gap-2">
 <h1 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-extrabold'}>Vizzu Product Studio®</h1>
 {currentPlan && (
 <span className={(theme === 'dark' ? 'bg-gradient-to-r from-[#FF6B6B]/20 to-[#FF9F43]/20 text-[#FF9F43]' : 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white') + ' px-2 py-0.5 text-[9px] font-medium rounded-full uppercase tracking-wide'}>
 {currentPlan.name}
 </span>
 )}
 </div>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs font-serif italic'}>Fotos profissionais em fundo studio</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <div className={'hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg ' + (theme === 'dark' ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-200 ')}>
 <i className="fas fa-coins text-[#FF9F43] text-xs"></i>
 <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-sm'}>{userCredits}</span>
 </div>
 {pendingProducts.length > 0 && (
 <button
 onClick={handleNewProduct}
 className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg font-medium text-xs hover:opacity-90 transition-opacity"
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
 <div className={(theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white/60 border-gray-200/60 shadow-sm') + ' rounded-xl p-4 border mb-4 backdrop-blur-xl'}>
 <div className="flex items-start gap-4">
 <div className={'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ' + (theme === 'dark' ? 'bg-white/10' : 'bg-gray-100')}>
 <i className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' fas fa-camera text-lg'}></i>
 </div>
 <div className="flex-1">
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm mb-1'}>Fotos profissionais de produto</h3>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs leading-relaxed'}>
 Gere fotos do seu produto em múltiplos ângulos com fundo cinza neutro de estúdio. Ideal para e-commerce, catálogos e marketplaces.
 </p>
 <div className="flex items-center gap-3 mt-2">
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>
 <i className="fas fa-coins text-[#FF9F43] mr-1"></i>1 crédito por foto
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
 id="product-studio-search"
 name="productSearch"
 placeholder="Buscar produtos..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500 focus:border-gray-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-400 ') + ' w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none'}
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
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border mb-4'}>
 <button
 onClick={() => setShowFilters(!showFilters)}
 className="w-full p-3 flex items-center justify-between"
 >
 <div className="flex items-center gap-2">
 <i className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' fas fa-filter text-xs'}></i>
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] font-medium uppercase tracking-wide'}>Filtrar e ordenar</span>
 {hasActiveFilters && (
 <span className="px-1.5 py-0.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white text-[8px] rounded-full">{
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
 className="text-[10px] text-[#FF9F43] hover:text-[#FF9F43] font-medium"
 >
 Limpar filtros
 </button>
 </div>
 )}
 <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
 {/* Categoria Principal */}
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>Categoria</label>
 <select
 id="ps-filter-category-group"
 name="filterCategoryGroup"
 value={filterCategoryGroup}
 onChange={(e) => { setFilterCategoryGroup(e.target.value); setFilterCategory(''); }}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-2.5 py-2 border rounded-lg text-xs'}
 >
 <option value="">Todas</option>
 {CATEGORY_GROUPS.map(group => (
 <option key={group.id} value={group.id}>{group.label}</option>
 ))}
 </select>
 </div>

 {/* Subcategoria (condicional) */}
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>Subcategoria</label>
 <select
 id="ps-filter-subcategory"
 name="filterSubcategory"
 value={filterCategory}
 onChange={(e) => setFilterCategory(e.target.value)}
 disabled={!filterCategoryGroup}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white disabled:opacity-50' : 'bg-gray-50 border-gray-200 text-gray-900 disabled:opacity-50') + ' w-full px-2.5 py-2 border rounded-lg text-xs'}
 >
 <option value="">Todas</option>
 {filterCategoryGroup && CATEGORY_GROUPS.find(g => g.id === filterCategoryGroup)?.items.map(cat => (
 <option key={cat} value={cat}>{cat}</option>
 ))}
 </select>
 </div>

 {/* Coleção */}
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>Coleção</label>
 <select
 id="ps-filter-collection"
 name="filterCollection"
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
 id="ps-filter-color"
 name="filterColor"
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
 id="ps-filter-gender"
 name="filterGender"
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
 id="ps-sort"
 name="sortBy"
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
 {/* BANNER - Seus Produtos + Status de Otimização */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-4 mb-4'}>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-6">
 {/* Total */}
 <div>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide'}>Total</p>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-2xl font-bold'}>{filteredProducts.length}</p>
 </div>
 {/* Divider */}
 <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-200') + ' w-px h-10'}></div>
 {/* Otimizados */}
 <div>
 <p className={(theme === 'dark' ? 'text-green-400' : 'text-green-600') + ' text-[10px] uppercase tracking-wide flex items-center gap-1'}>
 <i className="fas fa-check text-[8px]"></i> Otimizados
 </p>
 <p className={(theme === 'dark' ? 'text-green-400' : 'text-green-600') + ' text-2xl font-bold'}>{optimizedProducts.length}</p>
 </div>
 {/* Pendentes */}
 <div>
 <p className={(theme === 'dark' ? 'text-[#FF9F43]' : 'text-orange-600') + ' text-[10px] uppercase tracking-wide flex items-center gap-1'}>
 <i className="fas fa-clock text-[8px]"></i> Pendentes
 </p>
 <p className={(theme === 'dark' ? 'text-[#FF9F43]' : 'text-orange-600') + ' text-2xl font-bold'}>{pendingProducts.length}</p>
 </div>
 </div>
 {currentPlan && (
 <div className="text-right">
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide'}>Plano</p>
 <span className={(theme === 'dark' ? 'bg-gradient-to-r from-[#FF6B6B]/20 to-[#FF9F43]/20 text-[#FF9F43]' : 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white') + ' px-3 py-1 text-sm font-medium rounded-full'}>
 {currentPlan.name}
 </span>
 </div>
 )}
 </div>
 </div>

 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* PRODUCTS GRID - Separado por status de otimização */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 {filteredProducts.length > 0 ? (
 <>
 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* SEÇÃO: Produtos Otimizados (PRIMEIRO) */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 {optimizedProducts.length > 0 && (
 <div className="mb-6">
 <button
 onClick={() => setOptimizedCollapsed(!optimizedCollapsed)}
 className="w-full flex items-center justify-between mb-3 group"
 >
 <div className="flex items-center gap-2">
 <div className={(theme === 'dark' ? 'bg-green-500/20' : 'bg-green-100') + ' w-6 h-6 rounded-lg flex items-center justify-center'}>
 <i className={(theme === 'dark' ? 'text-green-400' : 'text-green-500') + ' fas fa-check text-[10px]'}></i>
 </div>
 <h2 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>
 Produtos Otimizados
 </h2>
 <span className={(theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600') + ' px-2 py-0.5 text-[10px] font-medium rounded-full'}>
 {optimizedProducts.length > visibleOptimized
 ? `${Math.min(visibleOptimized, optimizedProducts.length)} de ${optimizedProducts.length}`
 : optimizedProducts.length}
 </span>
 </div>
 <div className={(theme === 'dark' ? 'text-neutral-500 group-hover:text-white' : 'text-gray-400 group-hover:text-gray-600') + ' transition-colors'}>
 <i className={'fas fa-chevron-' + (optimizedCollapsed ? 'down' : 'up') + ' text-xs'}></i>
 </div>
 </button>

 {!optimizedCollapsed && (
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
 {optimizedProducts.slice(0, visibleOptimized).map(product => {
 const productImage = getProductImage(product);
 const studioCount = getProductStudioCount(product);
 return (
 <div
 key={product.id}
 data-product-id={product.id}
 onClick={() => handleSelectProduct(product)}
 className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800 hover:border-green-500/50' : 'bg-white border-gray-200 hover:border-green-300 ') + ' rounded-xl border overflow-hidden cursor-pointer transition-all group'}
 >
 <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' aspect-square relative overflow-hidden'}>
 <OptimizedImage src={productImage} size="preview" alt={product.name} className="w-full h-full group-hover:scale-105 transition-transform" />
 {/* Tag Otimizado */}
 <div className="absolute top-2 left-2 px-2 py-0.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[8px] font-bold rounded-full flex items-center gap-1 ">
 <i className="fas fa-sparkles text-[6px]"></i>
 Otimizado
 </div>
 {/* Contador de fotos */}
 <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm text-white text-[8px] font-medium rounded-full flex items-center gap-1">
 <i className="fas fa-images text-[6px]"></i>
 {studioCount}
 </div>
 <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <button className="w-full py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium text-[10px]">
 <i className="fas fa-eye mr-1"></i>Ver fotos
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
 )}

 {/* Botão Carregar Mais - Otimizados */}
 {!optimizedCollapsed && visibleOptimized < optimizedProducts.length && (
 <div className="flex justify-center mt-4">
 <button
 onClick={() => setVisibleOptimized(prev => prev + PRODUCTS_PER_PAGE)}
 className={(theme === 'dark' ? 'bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200 ') + ' px-6 py-2.5 border rounded-xl font-medium text-sm flex items-center gap-2 transition-colors'}
 >
 <i className="fas fa-chevron-down text-xs"></i>
 Carregar mais ({optimizedProducts.length - visibleOptimized} restantes)
 </button>
 </div>
 )}
 </div>
 )}

 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* SEÇÃO: Pendentes de Otimização (SEGUNDO) */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 {pendingProducts.length > 0 && (
 <div className="mb-6">
 <button
 onClick={() => setPendingCollapsed(!pendingCollapsed)}
 className="w-full flex items-center justify-between mb-3 group"
 >
 <div className="flex items-center gap-2">
 <div className={(theme === 'dark' ? 'bg-[#FF9F43]/20' : 'bg-orange-100') + ' w-6 h-6 rounded-lg flex items-center justify-center'}>
 <i className={(theme === 'dark' ? 'text-[#FF9F43]' : 'text-[#FF9F43]') + ' fas fa-clock text-[10px]'}></i>
 </div>
 <h2 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>
 Pendentes de otimização
 </h2>
 <span className={(theme === 'dark' ? 'bg-[#FF9F43]/20 text-[#FF9F43]' : 'bg-orange-100 text-orange-600') + ' px-2 py-0.5 text-[10px] font-medium rounded-full'}>
 {pendingProducts.length > visiblePending
 ? `${Math.min(visiblePending, pendingProducts.length)} de ${pendingProducts.length}`
 : pendingProducts.length}
 </span>
 </div>
 <div className={(theme === 'dark' ? 'text-neutral-500 group-hover:text-white' : 'text-gray-400 group-hover:text-gray-600') + ' transition-colors'}>
 <i className={'fas fa-chevron-' + (pendingCollapsed ? 'down' : 'up') + ' text-xs'}></i>
 </div>
 </button>

 {!pendingCollapsed && (
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
 {pendingProducts.slice(0, visiblePending).map(product => {
 const productImage = getProductImage(product);
 return (
 <div
 key={product.id}
 data-product-id={product.id}
 onClick={() => handleSelectProduct(product)}
 className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800 hover:border-gray-400' : 'bg-white border-gray-200 hover:border-gray-400 ') + ' rounded-xl border overflow-hidden cursor-pointer transition-all group'}
 >
 <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' aspect-square relative overflow-hidden'}>
 <OptimizedImage src={productImage} size="preview" alt={product.name} className="w-full h-full group-hover:scale-105 transition-transform" />
 <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <button className="w-full py-1.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg font-medium text-[10px]">
 <i className="fas fa-wand-magic-sparkles mr-1"></i>Otimizar
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
 )}

 {/* Botão Carregar Mais - Pendentes */}
 {!pendingCollapsed && visiblePending < pendingProducts.length && (
 <div className="flex justify-center mt-4">
 <button
 onClick={() => setVisiblePending(prev => prev + PRODUCTS_PER_PAGE)}
 className={(theme === 'dark' ? 'bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200 ') + ' px-6 py-2.5 border rounded-xl font-medium text-sm flex items-center gap-2 transition-colors'}
 >
 <i className="fas fa-chevron-down text-xs"></i>
 Carregar mais ({pendingProducts.length - visiblePending} restantes)
 </button>
 </div>
 )}
 </div>
 )}
 </>
 ) : (
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-8 text-center'}>
 <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3'}>
 <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-[#FF9F43]') + ' fas fa-search text-xl'}></i>
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
 className="px-4 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg font-medium text-xs hover:opacity-90 transition-opacity"
 >
 <i className="fas fa-plus mr-1.5"></i>Importar produto
 </button>
 )}
 </div>
 )}

 </div>

 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* MODAL - Selecionar Produto para Otimizar */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 {showProductModal && (
 <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-2xl border w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col'}>
 {/* Header */}
 <div className={(theme === 'dark' ? 'border-neutral-800' : 'border-gray-200') + ' border-b p-4 flex items-center justify-between'}>
 <div>
 <h2 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold font-serif'}>Selecione o produto para otimizar</h2>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Produtos ainda não otimizados ({filteredPendingProducts.length})</p>
 </div>
 <button
 onClick={() => setShowProductModal(false)}
 className={(theme === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-600') + ' w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-800/50 transition-colors'}
 >
 <i className="fas fa-times"></i>
 </button>
 </div>

 {/* Filtros */}
 <div className="p-4 flex flex-col sm:flex-row gap-3">
 <div className="flex-1 relative">
 <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm'}></i>
 <input
 type="text"
 id="ps-modal-search"
 name="productModalSearch"
 placeholder="Buscar produto..."
 value={productSearchTerm}
 onChange={(e) => setProductSearchTerm(e.target.value)}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400') + ' w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-gray-400'}
 autoFocus
 />
 </div>
 <select
 id="ps-modal-category"
 name="productModalCategory"
 value={productFilterCategoryGroup}
 onChange={(e) => { setProductFilterCategoryGroup(e.target.value); setProductFilterCategory(''); }}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' px-4 py-2.5 border rounded-xl text-sm sm:w-40'}
 >
 <option value="">Categoria</option>
 {CATEGORY_GROUPS.map(group => (
 <option key={group.id} value={group.id}>{group.label}</option>
 ))}
 </select>
 {productFilterCategoryGroup && (
 <select
 id="ps-modal-subcategory"
 name="productModalSubcategory"
 value={productFilterCategory}
 onChange={(e) => setProductFilterCategory(e.target.value)}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' px-4 py-2.5 border rounded-xl text-sm sm:w-40'}
 >
 <option value="">Subcategoria</option>
 {CATEGORY_GROUPS.find(g => g.id === productFilterCategoryGroup)?.items.map(cat => (
 <option key={cat} value={cat}>{cat}</option>
 ))}
 </select>
 )}
 </div>

 {/* Grid de Produtos */}
 <div className="flex-1 overflow-y-auto p-4 pt-0">
 {filteredPendingProducts.length > 0 ? (
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
 {filteredPendingProducts.map(product => {
 const productImage = getProductImage(product);
 return (
 <div
 key={product.id}
 onClick={() => handleSelectProductFromModal(product)}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 hover:border-gray-400' : 'bg-gray-50 border-gray-200 hover:border-gray-400') + ' rounded-xl border overflow-hidden cursor-pointer transition-all group'}
 >
 <div className={(theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-100') + ' aspect-square relative overflow-hidden'}>
 <OptimizedImage src={productImage} size="preview" alt={product.name} className="w-full h-full group-hover:scale-105 transition-transform" />
 <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <button className="w-full py-1.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg font-medium text-[10px]">
 <i className="fas fa-wand-magic-sparkles mr-1"></i>Otimizar
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
 <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-check-circle text-xl'}></i>
 </div>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-sm mb-1'}>
 {productSearchTerm || productFilterCategoryGroup || productFilterCategory ? 'Nenhum produto encontrado' : 'Todos os produtos estão otimizados!'}
 </p>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>
 {productSearchTerm || productFilterCategoryGroup || productFilterCategory ? 'Tente ajustar os filtros' : 'Importe novos produtos para continuar'}
 </p>
 </div>
 )}
 </div>
 </div>
 </div>
 )}
 </div>
 );
};
