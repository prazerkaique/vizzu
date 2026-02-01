// ═══════════════════════════════════════════════════════════════
// VIZZU - Look Composer (Monte looks completos com IA)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo, useEffect } from 'react';
import { Product, HistoryLog, SavedModel, LookComposition } from '../../types';
import { LookComposerEditor } from './LookComposerEditor';
import { smartDownload } from '../../utils/downloadHelper';
import { Plan } from '../../hooks/useCredits';

interface LookComposerProps {
 products: Product[];
 userCredits: number;
 onUpdateProduct: (productId: string, updates: Partial<Product>) => void;
 onDeductCredits: (amount: number, reason: string) => boolean;
 onAddHistoryLog: (action: string, details: string, status: HistoryLog['status'], items: Product[], method: HistoryLog['method'], cost: number) => void;
 onImport?: () => void;
 currentPlan?: Plan;
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
 // Produto pré-selecionado (vindo do modal de detalhes)
 initialProduct?: Product | null;
 onClearInitialProduct?: () => void;
 // Navegação de volta
 onBack?: () => void;
 // Callback para abrir modal de planos (quando tentar usar 4K sem permissão)
 onOpenPlanModal?: () => void;
}

interface GeneratedLook {
 id: string;
 productId: string;
 productName: string;
 productSku: string;
 productCategory?: string;
 imageUrl: string;
 backImageUrl?: string; // Imagem de costas (opcional)
 imageCount: number; // Quantidade de imagens (1 ou 2)
 createdAt: string;
 metadata?: {
 lookItems?: Array<{
 slot: string;
 productId?: string;
 name?: string;
 sku?: string;
 image?: string;
 }>;
 prompt?: string;
 viewsMode?: 'front' | 'front-back';
 modelId?: string;
 modelName?: string;
 modelThumbnail?: string;
 };
}

interface ProductWithLooks {
 product: Product;
 lookCount: number;
 looks: GeneratedLook[];
 totalImageCount: number; // Total de imagens (frente + costas)
 participations?: number; // Quantas vezes participou como item (não principal)
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
 isAnyGenerationRunning = false,
 initialProduct,
 onClearInitialProduct,
 onBack,
 onOpenPlanModal
}) => {
 const isDark = theme === 'dark';

 // Estados principais
 const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
 const [showProductModal, setShowProductModal] = useState(false);
 const [selectedLook, setSelectedLook] = useState<GeneratedLook | null>(null);
 const [selectedLookView, setSelectedLookView] = useState<'front' | 'back'>('front');
 const [visibleLooksCount, setVisibleLooksCount] = useState(6); // Paginação de looks
 const [visibleModalProductsCount, setVisibleModalProductsCount] = useState(20); // Paginação do modal
 const [selectedProductForModal, setSelectedProductForModal] = useState<ProductWithLooks | null>(null);
 const [modalSelectedLook, setModalSelectedLook] = useState<GeneratedLook | null>(null);
 const [modalSelectedView, setModalSelectedView] = useState<'front' | 'back'>('front');

 // Estado para controlar qual imagem cada card está mostrando (carrossel)
 const [cardViewStates, setCardViewStates] = useState<Record<string, 'front' | 'back'>>({});

 // Verificar se há geração pendente (F5 durante geração)
 useEffect(() => {
 const PENDING_GENERATION_KEY = 'vizzu_pending_generation';
 try {
 const stored = localStorage.getItem(PENDING_GENERATION_KEY);
 if (stored) {
 const pending = JSON.parse(stored);
 // Verificar se não expirou (5 minutos)
 const elapsedMinutes = (Date.now() - pending.startTime) / 1000 / 60;
 if (elapsedMinutes <= 5 && pending.productId) {
 // Encontrar o produto e selecionar
 const product = products.find(p => p.id === pending.productId);
 if (product) {
 setSelectedProduct(product);
 }
 }
 }
 } catch (e) {
 console.error('Erro ao verificar geração pendente:', e);
 }
 }, [products]); // Roda quando products carregar

 // Pré-selecionar produto quando vier do modal de detalhes
 useEffect(() => {
 if (initialProduct) {
 setSelectedProduct(initialProduct);
 setShowProductModal(true);
 onClearInitialProduct?.();
 }
 }, [initialProduct, onClearInitialProduct]);

 // Função para alternar a view de um card específico
 const toggleCardView = (lookId: string, e: React.MouseEvent) => {
 e.stopPropagation(); // Evita abrir o modal
 setCardViewStates(prev => ({
 ...prev,
 [lookId]: prev[lookId] === 'back' ? 'front' : 'back'
 }));
 };

 // Função para definir a view de um card
 const setCardView = (lookId: string, view: 'front' | 'back', e: React.MouseEvent) => {
 e.stopPropagation();
 setCardViewStates(prev => ({
 ...prev,
 [lookId]: view
 }));
 };

 // Obter a view atual de um card
 const getCardView = (lookId: string): 'front' | 'back' => {
 return cardViewStates[lookId] || 'front';
 };

 // Filtros para modal de produtos
 const [productSearchTerm, setProductSearchTerm] = useState('');
 const [productFilterCategoryGroup, setProductFilterCategoryGroup] = useState('');
 const [productFilterCategory, setProductFilterCategory] = useState('');

 // Coletar todos os looks gerados
 const allGeneratedLooks = useMemo(() => {
 const looks: GeneratedLook[] = [];

 products.forEach(product => {
 if (product.generatedImages?.modeloIA) {
 product.generatedImages.modeloIA.forEach((look: any, index: number) => {
 const imageUrl = look.images?.front || look.imageUrl || look.url;
 const backImageUrl = look.images?.back || undefined;
 const imageCount = backImageUrl ? 2 : 1;

 if (imageUrl) {
 looks.push({
 id: look.id || `${product.id}-${index}`,
 productId: product.id,
 productName: product.name,
 productSku: product.sku,
 productCategory: product.category,
 imageUrl,
 backImageUrl,
 imageCount,
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

 // Calcular total de imagens (frente + costas)
 const totalImageCount = data.asMain.reduce((sum, look) => sum + look.imageCount, 0);

 result.push({
 product,
 lookCount: allLooks.length,
 looks: data.asMain, // Looks onde é o produto principal
 totalImageCount,
 participations: data.asItem.length // Quantas vezes participou como item
 });
 }
 });

 return result.sort((a, b) => b.lookCount - a.lookCount);
 }, [products, allGeneratedLooks]);

 // Reset paginação quando filtros do modal mudam
 useEffect(() => {
 setVisibleModalProductsCount(20);
 }, [productSearchTerm, productFilterCategoryGroup, productFilterCategory]);

 // Filtrar produtos no modal (ordenados por mais recente primeiro)
 const filteredProducts = useMemo(() => {
 return products
 .filter(product => {
 const matchesSearch = !productSearchTerm ||
 product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
 product.sku.toLowerCase().includes(productSearchTerm.toLowerCase());
 // Filtro de categoria principal (grupo)
 const categoryGroup = getCategoryGroupBySubcategory(product.category);
 const matchesCategoryGroup = !productFilterCategoryGroup || categoryGroup?.id === productFilterCategoryGroup;
 // Filtro de subcategoria
 const matchesCategory = !productFilterCategory || product.category === productFilterCategory;
 return matchesSearch && matchesCategoryGroup && matchesCategory;
 })
 .sort((a, b) => {
 // Ordenar por data de criação (mais recente primeiro)
 const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
 const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
 return dateB - dateA;
 });
 }, [products, productSearchTerm, productFilterCategoryGroup, productFilterCategory]);

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
 setProductFilterCategoryGroup('');
 setProductFilterCategory('');
 setVisibleModalProductsCount(20); // Reset paginação
 };

 const handleSelectProductForNewLook = (product: Product) => {
 setSelectedProduct(product);
 setShowProductModal(false);
 };

 const handleBackToList = () => {
 setSelectedProduct(null);
 };

 const handleDownloadLook = async (imageUrl: string, productName: string, format: 'png' | 'svg' = 'png') => {
 await smartDownload(imageUrl, {
 filename: `look-${productName.replace(/\s+/g, '-').toLowerCase()}.${format}`,
 shareTitle: 'Vizzu Look Composer',
 shareText: `Look: ${productName}`
 });
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
 currentPlan={currentPlan}
 onOpenPlanModal={onOpenPlanModal}
 />
 );
 }

 // Página principal
 return (
 <div
 className={'flex-1 overflow-y-auto p-4 md:p-6 ' + (isDark ? 'bg-black' : 'bg-gray-50')}
 style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 1rem))' }}
 >
 <div className="max-w-7xl mx-auto">

 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* HEADER */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-3">
 {onBack && (
 <button
 onClick={onBack}
 className={'w-10 h-10 rounded-xl flex items-center justify-center transition-all ' + (isDark ? 'bg-white/10 backdrop-blur-xl border border-white/20 text-neutral-300 hover:text-white hover:bg-white/15 shadow-lg' : 'bg-white/60 backdrop-blur-xl border border-gray-200/60 text-gray-500 hover:text-gray-700 hover:bg-white/80 shadow-sm')}
 >
 <i className="fas fa-arrow-left text-sm"></i>
 </button>
 )}
 <div className={'w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xl ' + (isDark ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
 <i className={'fas fa-layer-group text-sm ' + (isDark ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
 </div>
 <div>
 <div className="flex items-center gap-2">
 <h1 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-lg font-extrabold'}>Vizzu Look Composer®</h1>
 {currentPlan && (
 <span className={(isDark ? 'bg-[#E91E8C]/20 text-[#E91E8C]' : 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white') + ' px-2 py-0.5 text-[9px] font-medium rounded-full uppercase tracking-wide'}>
 {currentPlan.name}
 </span>
 )}
 </div>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs font-serif italic'}>Seus looks criados com modelo IA</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <div className={'hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg ' + (isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-200 ')}>
 <i className="fas fa-coins text-[#E91E8C] text-xs"></i>
 <span className={(isDark ? 'text-white' : 'text-gray-900') + ' font-medium text-sm'}>{userCredits}</span>
 </div>
 <button
 onClick={handleNewLook}
 className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity "
 >
 <i className="fas fa-plus"></i>
 <span>Novo Look</span>
 </button>
 </div>
 </div>

 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* ÚLTIMOS LOOKS */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 <div className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-2xl border mb-6 overflow-hidden'}>
 <div className="p-4 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className={'w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-xl ' + (isDark ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
 <i className={(isDark ? 'text-neutral-200' : 'text-[#1A1A1A]') + ' fas fa-clock text-sm'}></i>
 </div>
 <div>
 <h2 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold'}>Últimos Looks</h2>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>
 {allGeneratedLooks.length > visibleLooksCount
 ? `Mostrando ${Math.min(visibleLooksCount, allGeneratedLooks.length)} de ${allGeneratedLooks.length} looks`
 : `${allGeneratedLooks.length} looks criados`}
 </p>
 </div>
 </div>
 </div>

 {allGeneratedLooks.length > 0 ? (
 <div className={(isDark ? 'border-neutral-800' : 'border-gray-200') + ' border-t p-4'}>
 <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
 {allGeneratedLooks.slice(0, visibleLooksCount).map((look) => {
 const currentView = getCardView(look.id);
 const displayImage = currentView === 'back' && look.backImageUrl ? look.backImageUrl : look.imageUrl;

 return (
 <div
 key={look.id}
 onClick={() => { setSelectedLook(look); setSelectedLookView('front'); }}
 className={(isDark ? 'bg-neutral-800 border-neutral-700 hover:border-[#E91E8C]/50' : 'bg-gray-50 border-gray-200 hover:border-[#E91E8C]/40') + ' rounded-xl border overflow-hidden cursor-pointer transition-all group'}
 >
 <div className="aspect-[3/4] relative overflow-hidden bg-neutral-900">
 <img
 src={displayImage}
 alt={look.productName}
 className="w-full h-full object-contain group-hover:scale-105 transition-transform"
 />

 {/* Badge de quantidade de imagens */}
 {look.imageCount > 1 && (
 <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-purple-500 text-white text-[9px] font-bold rounded-full flex items-center gap-0.5">
 <i className="fas fa-images text-[7px]"></i>
 {look.imageCount}
 </div>
 )}

 {/* Setas de navegação do carrossel (só aparece se tem mais de 1 imagem) */}
 {look.imageCount > 1 && look.backImageUrl && (
 <>
 {/* Seta esquerda */}
 <button
 onClick={(e) => setCardView(look.id, 'front', e)}
 className={'absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-all ' +
 (currentView === 'front'
 ? 'bg-[#E91E8C]/100 text-white'
 : 'bg-black/50 text-white/70 hover:bg-black/70 hover:text-white')
 }
 >
 <i className="fas fa-chevron-left text-[8px]"></i>
 </button>
 {/* Seta direita */}
 <button
 onClick={(e) => setCardView(look.id, 'back', e)}
 className={'absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-all ' +
 (currentView === 'back'
 ? 'bg-[#E91E8C]/100 text-white'
 : 'bg-black/50 text-white/70 hover:bg-black/70 hover:text-white')
 }
 >
 <i className="fas fa-chevron-right text-[8px]"></i>
 </button>
 </>
 )}

 {/* Indicadores de navegação (dots) */}
 {look.imageCount > 1 && look.backImageUrl && (
 <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
 <button
 onClick={(e) => setCardView(look.id, 'front', e)}
 className={'w-1.5 h-1.5 rounded-full transition-all ' +
 (currentView === 'front' ? 'bg-[#E91E8C]/100 scale-125' : 'bg-white/50 hover:bg-white/80')
 }
 />
 <button
 onClick={(e) => setCardView(look.id, 'back', e)}
 className={'w-1.5 h-1.5 rounded-full transition-all ' +
 (currentView === 'back' ? 'bg-[#E91E8C]/100 scale-125' : 'bg-white/50 hover:bg-white/80')
 }
 />
 </div>
 )}

 {/* Indicador de view atual */}
 {look.imageCount > 1 && (
 <div className={'absolute top-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-medium ' + (isDark ? 'bg-black/60 text-white' : 'bg-white/80 text-gray-700')}>
 {currentView === 'front' ? 'Frente' : 'Costas'}
 </div>
 )}

 <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
 <div className="absolute bottom-6 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
 <p className="text-white text-[9px] font-medium truncate">{look.productName}</p>
 </div>
 </div>
 </div>
 );
 })}
 </div>

 {/* Botão Carregar Mais - Looks */}
 {visibleLooksCount < allGeneratedLooks.length && (
 <div className="flex justify-center mt-4">
 <button
 onClick={() => setVisibleLooksCount(prev => prev + 6)}
 className={(isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200') + ' px-6 py-2.5 border rounded-xl font-medium text-sm flex items-center gap-2 transition-colors'}
 >
 <i className="fas fa-chevron-down text-xs"></i>
 Carregar mais ({allGeneratedLooks.length - visibleLooksCount} restantes)
 </button>
 </div>
 )}
 </div>
 ) : (
 <div className={(isDark ? 'border-neutral-800' : 'border-gray-200') + ' border-t p-8 text-center'}>
 <div className={'w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ' + (isDark ? 'bg-neutral-800' : 'bg-gray-100')}>
 <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-layer-group text-xl'}></i>
 </div>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-sm mb-4'}>Nenhum look criado ainda</p>
 <button
 onClick={handleNewLook}
 className="px-4 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg font-medium text-xs hover:opacity-90 transition-opacity"
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
 <div className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-2xl border overflow-hidden'}>
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
 className={(isDark ? 'bg-neutral-800 border-neutral-700 hover:border-[#A855F7]/50' : 'bg-gray-50 border-gray-200 hover:border-[#A855F7]/30') + ' rounded-xl border overflow-hidden cursor-pointer transition-all group'}
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
 {/* Badges */}
 <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
 {/* Badge de quantidade de looks */}
 {pwl.looks.length > 0 && (
 <div className="px-2 py-1 bg-[#E91E8C]/100 text-white text-[10px] font-bold rounded-full flex items-center gap-1" title={`${pwl.looks.length} look${pwl.looks.length > 1 ? 's' : ''} criado${pwl.looks.length > 1 ? 's' : ''}`}>
 <i className="fas fa-layer-group text-[8px]"></i>
 {pwl.looks.length}
 </div>
 )}
 {/* Badge de total de imagens (se diferente do número de looks = tem costas) */}
 {pwl.totalImageCount > pwl.looks.length && (
 <div className="px-2 py-1 bg-purple-500 text-white text-[10px] font-bold rounded-full flex items-center gap-1" title={`${pwl.totalImageCount} imagens (frente + costas)`}>
 <i className="fas fa-images text-[8px]"></i>
 {pwl.totalImageCount}
 </div>
 )}
 {/* Badge de participações */}
 {pwl.participations && pwl.participations > 0 && (
 <div className="px-2 py-1 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center gap-1" title="Participou em looks">
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
 <h2 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold font-serif'}>Selecione o produto principal</h2>
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
 id="lc-modal-search"
 name="lookComposerSearch"
 placeholder="Buscar produto..."
 value={productSearchTerm}
 onChange={(e) => setProductSearchTerm(e.target.value)}
 className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400') + ' w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-[#E91E8C]/50'}
 autoFocus
 />
 </div>
 <select
 id="lc-modal-category"
 name="lookComposerCategory"
 value={productFilterCategoryGroup}
 onChange={(e) => { setProductFilterCategoryGroup(e.target.value); setProductFilterCategory(''); }}
 className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' px-4 py-2.5 border rounded-xl text-sm sm:w-40'}
 >
 <option value="">Categoria</option>
 {CATEGORY_GROUPS.map(group => (
 <option key={group.id} value={group.id}>{group.label}</option>
 ))}
 </select>
 {productFilterCategoryGroup && (
 <select
 id="lc-modal-subcategory"
 name="lookComposerSubcategory"
 value={productFilterCategory}
 onChange={(e) => setProductFilterCategory(e.target.value)}
 className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' px-4 py-2.5 border rounded-xl text-sm sm:w-40'}
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
 {filteredProducts.length > 0 ? (
 <>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] mb-3'}>
 {filteredProducts.length > visibleModalProductsCount
 ? `Mostrando ${Math.min(visibleModalProductsCount, filteredProducts.length)} de ${filteredProducts.length} produtos`
 : `${filteredProducts.length} produtos`}
 </p>
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
 {filteredProducts.slice(0, visibleModalProductsCount).map(product => {
 const productImage = getProductImage(product);
 const isOptimized = hasOptimizedImage(product);
 return (
 <div
 key={product.id}
 onClick={() => handleSelectProductForNewLook(product)}
 className={(isDark ? 'bg-neutral-800 border-neutral-700 hover:border-[#E91E8C]/50' : 'bg-gray-50 border-gray-200 hover:border-[#E91E8C]/40') + ' rounded-xl border overflow-hidden cursor-pointer transition-all group'}
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
 <button className="w-full py-1.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg font-medium text-[10px]">
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

 {/* Botão Carregar Mais - Modal de Produtos */}
 {visibleModalProductsCount < filteredProducts.length && (
 <div className="flex justify-center mt-4">
 <button
 onClick={() => setVisibleModalProductsCount(prev => prev + 20)}
 className={(isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200') + ' px-6 py-2.5 border rounded-xl font-medium text-sm flex items-center gap-2 transition-colors'}
 >
 <i className="fas fa-chevron-down text-xs"></i>
 Carregar mais ({filteredProducts.length - visibleModalProductsCount} restantes)
 </button>
 </div>
 )}
 </>
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
 <div className="flex items-center gap-3">
 <div>
 <h2 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold font-serif'}>{selectedLook.productName}</h2>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>{selectedLook.productSku} • {new Date(selectedLook.createdAt).toLocaleDateString('pt-BR')}</p>
 </div>
 {/* Badge de quantidade de imagens */}
 {selectedLook.imageCount > 1 && (
 <div className="px-2.5 py-1 bg-purple-500 text-white text-xs font-bold rounded-full flex items-center gap-1.5">
 <i className="fas fa-images text-[10px]"></i>
 {selectedLook.imageCount} fotos
 </div>
 )}
 </div>
 <button
 onClick={() => { setSelectedLook(null); setSelectedLookView('front'); }}
 className={(isDark ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-600') + ' w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-800/50 transition-colors'}
 >
 <i className="fas fa-times"></i>
 </button>
 </div>

 <div className="p-4 flex flex-col md:flex-row gap-4 overflow-y-auto max-h-[calc(90vh-80px)]">
 {/* Imagem */}
 <div className="md:w-2/3">
 <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-100') + ' rounded-xl overflow-hidden relative'}>
 <img
 src={selectedLookView === 'back' && selectedLook.backImageUrl ? selectedLook.backImageUrl : selectedLook.imageUrl}
 alt={selectedLook.productName}
 className="w-full h-auto max-h-[60vh] object-contain"
 />
 {/* Badge de view atual */}
 {selectedLook.imageCount > 1 && (
 <div className={'absolute top-3 left-3 px-2 py-1 rounded-lg text-[10px] font-medium ' + (isDark ? 'bg-black/60 text-white' : 'bg-white/80 text-gray-700')}>
 <i className="fas fa-eye mr-1 text-[8px]"></i>
 {selectedLookView === 'front' ? 'Frente' : 'Costas'}
 </div>
 )}
 </div>

 {/* Toggle Frente/Costas */}
 {selectedLook.imageCount > 1 && selectedLook.backImageUrl && (
 <div className="flex items-center justify-center gap-2 mt-3">
 <div className={'flex items-center gap-1 p-1 rounded-lg ' + (isDark ? 'bg-neutral-800' : 'bg-gray-100')}>
 <button
 onClick={() => setSelectedLookView('front')}
 className={'px-3 py-1.5 rounded-md text-xs font-medium transition-all ' +
 (selectedLookView === 'front'
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white '
 : isDark ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700')
 }
 >
 <i className="fas fa-eye mr-1.5"></i>Frente
 </button>
 <button
 onClick={() => setSelectedLookView('back')}
 className={'px-3 py-1.5 rounded-md text-xs font-medium transition-all ' +
 (selectedLookView === 'back'
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white '
 : isDark ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700')
 }
 >
 <i className="fas fa-eye mr-1.5"></i>Costas
 </button>
 </div>
 </div>
 )}
 </div>

 {/* Ações */}
 <div className="md:w-1/3 flex flex-col gap-3">
 {/* Modelo usado */}
 {selectedLook.metadata?.modelName && (
 <div className={(isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-gray-50 border-gray-200') + ' rounded-xl border p-4'}>
 <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>
 <i className="fas fa-user mr-2 text-[#E91E8C]"></i>Modelo
 </h3>
 <div className="flex items-center gap-3">
 {selectedLook.metadata?.modelThumbnail ? (
 <div className={(isDark ? 'bg-neutral-700' : 'bg-gray-100') + ' w-12 h-12 rounded-lg overflow-hidden flex-shrink-0'}>
 <img
 src={selectedLook.metadata.modelThumbnail}
 alt={selectedLook.metadata.modelName}
 className="w-full h-full object-cover"
 />
 </div>
 ) : (
 <div className={(isDark ? 'bg-neutral-700' : 'bg-gray-100') + ' w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0'}>
 <i className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' fas fa-user'}></i>
 </div>
 )}
 <div>
 <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>{selectedLook.metadata.modelName}</p>
 </div>
 </div>
 </div>
 )}

 {/* Peças utilizadas no look */}
 {selectedLook.metadata?.lookItems && selectedLook.metadata.lookItems.length > 0 && (
 <div className={(isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-gray-50 border-gray-200') + ' rounded-xl border p-4'}>
 <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>
 <i className="fas fa-shirt mr-2 text-purple-400"></i>Peças Utilizadas
 </h3>
 <div className="space-y-2">
 {selectedLook.metadata.lookItems.map((item, idx) => {
 const itemProduct = item.productId ? products.find(p => p.id === item.productId) : null;
 const itemImage = item.image || (itemProduct ? getProductImage(itemProduct) : undefined);
 return (
 <div key={idx} className={(isDark ? 'bg-neutral-700/50' : 'bg-gray-100') + ' rounded-lg p-2 flex items-center gap-3'}>
 {itemImage ? (
 <div className={(isDark ? 'bg-neutral-600' : 'bg-gray-200') + ' w-10 h-10 rounded-lg overflow-hidden flex-shrink-0'}>
 <img src={itemImage} alt={item.name || item.slot} className="w-full h-full object-contain" />
 </div>
 ) : (
 <div className={(isDark ? 'bg-neutral-600' : 'bg-gray-200') + ' w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0'}>
 <i className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' fas fa-image text-xs'}></i>
 </div>
 )}
 <div className="flex-1 min-w-0">
 <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium truncate'}>{item.name || item.slot}</p>
 {item.sku && item.sku !== 'external' && (
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{item.sku}</p>
 )}
 </div>
 <span className={(isDark ? 'bg-neutral-600 text-neutral-400' : 'bg-gray-200 text-gray-500') + ' px-2 py-0.5 rounded text-[9px] uppercase'}>
 {item.slot}
 </span>
 </div>
 );
 })}
 </div>
 </div>
 )}

 <div className={(isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-gray-50 border-gray-200') + ' rounded-xl border p-4'}>
 <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>Download</h3>
 <div className="flex flex-col gap-2">
 <div className="flex gap-2">
 <button
 onClick={() => handleDownloadLook(
 selectedLookView === 'back' && selectedLook.backImageUrl ? selectedLook.backImageUrl : selectedLook.imageUrl,
 `${selectedLook.productName}${selectedLook.imageCount > 1 ? `-${selectedLookView}` : ''}`,
 'png'
 )}
 className={(isDark ? 'bg-neutral-700 hover:bg-neutral-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900') + ' flex-1 py-2.5 rounded-lg font-medium text-xs transition-colors'}
 >
 PNG {selectedLook.imageCount > 1 && (selectedLookView === 'front' ? '(Frente)' : '(Costas)')}
 </button>
 </div>
 {/* Botão para baixar todas */}
 {selectedLook.imageCount > 1 && selectedLook.backImageUrl && (
 <button
 onClick={async () => {
 await handleDownloadLook(selectedLook.imageUrl, `${selectedLook.productName}-frente`, 'png');
 await new Promise(resolve => setTimeout(resolve, 500));
 if (selectedLook.backImageUrl) {
 await handleDownloadLook(selectedLook.backImageUrl, `${selectedLook.productName}-costas`, 'png');
 }
 }}
 className="w-full py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-2"
 >
 <i className="fas fa-images"></i>
 Baixar Todas ({selectedLook.imageCount})
 </button>
 )}
 </div>
 </div>

 <button
 onClick={() => {
 const product = products.find(p => p.id === selectedLook.productId);
 if (product) {
 setSelectedLook(null);
 setSelectedLookView('front');
 setSelectedProduct(product);
 }
 }}
 className="w-full py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
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
 <h2 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold font-serif'}>{selectedProductForModal.product.name}</h2>
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
 <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-100') + ' rounded-xl overflow-hidden aspect-[3/4] relative'}>
 <img
 src={
 modalSelectedLook
 ? (modalSelectedView === 'back' && modalSelectedLook.backImageUrl
 ? modalSelectedLook.backImageUrl
 : modalSelectedLook.imageUrl)
 : getProductImage(selectedProductForModal.product)
 }
 alt={selectedProductForModal.product.name}
 className="w-full h-full object-contain"
 />
 {/* Badge de view atual */}
 {modalSelectedLook && modalSelectedLook.imageCount > 1 && (
 <div className={'absolute top-3 left-3 px-2 py-1 rounded-lg text-[10px] font-medium ' + (isDark ? 'bg-black/60 text-white' : 'bg-white/80 text-gray-700')}>
 <i className="fas fa-eye mr-1 text-[8px]"></i>
 {modalSelectedView === 'front' ? 'Frente' : 'Costas'}
 </div>
 )}
 {/* Badge de quantidade */}
 {modalSelectedLook && modalSelectedLook.imageCount > 1 && (
 <div className="absolute top-3 right-3 px-2 py-1 bg-purple-500 text-white text-[10px] font-bold rounded-lg flex items-center gap-1">
 <i className="fas fa-images text-[8px]"></i>
 {modalSelectedLook.imageCount} fotos
 </div>
 )}
 </div>

 {modalSelectedLook && (
 <div className="mt-3 flex flex-col gap-2">
 <div className="flex gap-2">
 <button
 onClick={() => handleDownloadLook(
 modalSelectedView === 'back' && modalSelectedLook.backImageUrl
 ? modalSelectedLook.backImageUrl
 : modalSelectedLook.imageUrl,
 `${modalSelectedLook.productName}${modalSelectedLook.imageCount > 1 ? `-${modalSelectedView}` : ''}`,
 'png'
 )}
 className="flex-1 py-2.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg font-medium text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
 >
 <i className="fas fa-download"></i>
 Download {modalSelectedLook.imageCount > 1 && (modalSelectedView === 'front' ? '(Frente)' : '(Costas)')}
 </button>
 </div>
 {/* Botão para baixar todas */}
 {modalSelectedLook.imageCount > 1 && modalSelectedLook.backImageUrl && (
 <button
 onClick={async () => {
 await handleDownloadLook(modalSelectedLook.imageUrl, `${modalSelectedLook.productName}-frente`, 'png');
 await new Promise(resolve => setTimeout(resolve, 500));
 if (modalSelectedLook.backImageUrl) {
 await handleDownloadLook(modalSelectedLook.backImageUrl, `${modalSelectedLook.productName}-costas`, 'png');
 }
 }}
 className="w-full py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-2"
 >
 <i className="fas fa-images"></i>
 Baixar Todas ({modalSelectedLook.imageCount})
 </button>
 )}
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
 className="w-full py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
 >
 <i className="fas fa-wand-magic-sparkles"></i>
 Gerar novo look com este produto
 </button>

 {/* Looks deste produto */}
 <div className={(isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-gray-50 border-gray-200') + ' rounded-xl border p-4'}>
 <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>Looks criados ({selectedProductForModal.lookCount})</h3>
 <div className="grid grid-cols-4 gap-2">
 {selectedProductForModal.looks.map((look) => {
 const thumbView = getCardView(`modal-${look.id}`);
 const thumbImage = thumbView === 'back' && look.backImageUrl ? look.backImageUrl : look.imageUrl;

 return (
 <div
 key={look.id}
 onClick={() => { setModalSelectedLook(look); setModalSelectedView('front'); }}
 className={(modalSelectedLook?.id === look.id ? 'ring-2 ring-[#E91E8C] ' : '') + (isDark ? 'bg-neutral-700 hover:bg-neutral-600' : 'bg-gray-100 hover:bg-gray-200') + ' rounded-lg overflow-hidden cursor-pointer transition-all aspect-[3/4] relative group/thumb'}
 >
 <img
 src={thumbImage}
 alt={look.productName}
 className="w-full h-full object-contain"
 />
 {/* Badge de quantidade de imagens */}
 {look.imageCount > 1 && (
 <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-purple-500 text-white text-[8px] font-bold rounded-full flex items-center gap-0.5">
 <i className="fas fa-images text-[6px]"></i>
 {look.imageCount}
 </div>
 )}
 {/* Indicador de view */}
 {look.imageCount > 1 && (
 <div className={'absolute top-1 left-1 px-1 py-0.5 rounded text-[7px] font-medium ' + (isDark ? 'bg-black/60 text-white' : 'bg-white/80 text-gray-700')}>
 {thumbView === 'front' ? 'F' : 'C'}
 </div>
 )}
 {/* Dots de navegação */}
 {look.imageCount > 1 && look.backImageUrl && (
 <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
 <button
 onClick={(e) => setCardView(`modal-${look.id}`, 'front', e)}
 className={'w-1.5 h-1.5 rounded-full transition-all ' +
 (thumbView === 'front' ? 'bg-[#E91E8C]/100' : 'bg-white/50 hover:bg-white/80')
 }
 />
 <button
 onClick={(e) => setCardView(`modal-${look.id}`, 'back', e)}
 className={'w-1.5 h-1.5 rounded-full transition-all ' +
 (thumbView === 'back' ? 'bg-[#E91E8C]/100' : 'bg-white/50 hover:bg-white/80')
 }
 />
 </div>
 )}
 </div>
 );
 })}
 </div>
 </div>

 {/* Toggle Frente/Costas do look selecionado */}
 {modalSelectedLook && modalSelectedLook.imageCount > 1 && modalSelectedLook.backImageUrl && (
 <div className={(isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-gray-50 border-gray-200') + ' rounded-xl border p-4'}>
 <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>Visualização</h3>
 <div className="flex items-center justify-center gap-2">
 <div className={'flex items-center gap-1 p-1 rounded-lg ' + (isDark ? 'bg-neutral-700' : 'bg-gray-200')}>
 <button
 onClick={() => setModalSelectedView('front')}
 className={'px-3 py-1.5 rounded-md text-xs font-medium transition-all ' +
 (modalSelectedView === 'front'
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white '
 : isDark ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700')
 }
 >
 <i className="fas fa-eye mr-1.5"></i>Frente
 </button>
 <button
 onClick={() => setModalSelectedView('back')}
 className={'px-3 py-1.5 rounded-md text-xs font-medium transition-all ' +
 (modalSelectedView === 'back'
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white '
 : isDark ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700')
 }
 >
 <i className="fas fa-eye mr-1.5"></i>Costas
 </button>
 </div>
 </div>
 </div>
 )}

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
