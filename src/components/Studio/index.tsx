// ═══════════════════════════════════════════════════════════════
// VIZZU - Studio (Suno Style)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import { Product, SavedModelProfile, SavedModel, HistoryLog } from '../../types';
import { EditorModal } from './EditorModal';
import { OptimizedImage } from '../OptimizedImage';

interface StudioProps {
 products: Product[];
 userCredits: number;
 onUpdateProduct: (productId: string, updates: Partial<Product>) => void;
 onDeductCredits: (amount: number, reason: string) => boolean;
 onAddHistoryLog: (action: string, details: string, status: HistoryLog['status'], items: Product[], method: HistoryLog['method'], cost: number) => void;
 onOpenSettings?: () => void;
 onImport?: () => void;
 currentPlan?: { name: string; limit: number };
 onGenerateImage?: (product: Product, toolType: string, prompt?: string, options?: any) => Promise<{ image: string | null; generationId: string | null }>;
 onCheckCredits?: (creditsNeeded: number, actionContext: 'studio' | 'cenario' | 'lifestyle' | 'video' | 'provador' | 'generic') => boolean;
 theme?: 'dark' | 'light';
 userId?: string;
 savedModels?: SavedModel[];
}

const CATEGORIES = ['Camisetas', 'Calças', 'Calçados', 'Acessórios', 'Vestidos', 'Shorts', 'Jaquetas'];
const COLLECTIONS = ['Verão 2025', 'Inverno 2025', 'Básicos', 'Premium', 'Promoção'];
const COLORS = ['Preto', 'Branco', 'Azul', 'Vermelho', 'Verde', 'Amarelo', 'Rosa', 'Cinza', 'Marrom', 'Bege'];
const GENDERS = ['Masculino', 'Feminino', 'Unissex'];

export const Studio: React.FC<StudioProps> = ({
 products,
 userCredits,
 onUpdateProduct,
 onDeductCredits,
 onAddHistoryLog,
 onOpenSettings,
 onImport,
 currentPlan,
 onGenerateImage,
 onCheckCredits,
 theme = 'dark',
 userId,
 savedModels = []
}) => {
 const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
 const [selectedModel, setSelectedModel] = useState<SavedModel | null>(null);
 const [showModels, setShowModels] = useState(true); // Aberto por padrão agora

 // EditorModal internal model profiles (separate from database savedModels)
 const [editorModelProfiles, setEditorModelProfiles] = useState<SavedModelProfile[]>([]);

 const handleSaveModelProfile = (model: SavedModelProfile) => {
 setEditorModelProfiles(prev => {
 const exists = prev.find(m => m.id === model.id);
 if (exists) {
 return prev.map(m => m.id === model.id ? model : m);
 }
 return [...prev, model];
 });
 };

 const handleDeleteModelProfile = (modelId: string) => {
 setEditorModelProfiles(prev => prev.filter(m => m.id !== modelId));
 };

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

 // Filtrar modelos prontos (status ready)
 const readyModels = savedModels.filter(m => m.status === 'ready');

 const clearFilters = () => {
 setSearchTerm('');
 setFilterCategory('');
 setFilterCollection('');
 setFilterColor('');
 setFilterGender('');
 setSortBy('recent');
 };

 const hasActiveFilters = searchTerm || filterCategory || filterCollection || filterColor || filterGender || sortBy !== 'recent';

 return (
 <div className={'flex-1 overflow-y-auto p-4 md:p-6 ' + (theme === 'dark' ? 'bg-black' : 'bg-gray-50')}>
 <div className="max-w-7xl mx-auto">
 
 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* HEADER - Padronizado */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 <div className="flex items-center justify-between mb-5">
 <div className="flex items-center gap-3">
 <div className={'w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xl ' + (theme === 'dark' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
 <i className={'fas fa-wand-magic-sparkles text-sm ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
 </div>
 <div>
 <div className="flex items-center gap-2">
 <h1 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-extrabold'}>Vizzu Studio®</h1>
 {currentPlan && (
 <span className={(theme === 'dark' ? 'bg-[#E91E8C]/20 text-[#E91E8C]' : 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white') + ' px-2 py-0.5 text-[9px] font-medium rounded-full uppercase tracking-wide'}>
 {currentPlan.name}
 </span>
 )}
 </div>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs font-serif italic'}>Gere imagens profissionais com IA</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <div className={'hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg ' + (theme === 'dark' ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-200 ')}>
 <i className="fas fa-coins text-[#E91E8C] text-xs"></i>
 <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-sm'}>{userCredits}</span>
 </div>
 {onImport && (
 <button
 onClick={onImport}
 className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg font-medium text-xs hover:opacity-90 transition-opacity"
 >
 <i className="fas fa-plus"></i>
 <span>Novo</span>
 </button>
 )}
 </div>
 </div>

 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* SEARCH BAR */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 <div className="relative mb-4">
 <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm'}></i>
 <input
 type="text"
 id="studio-search"
 name="studioSearch"
 placeholder="Buscar produtos..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500 focus:border-[#E91E8C]/50' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#E91E8C]/50 ') + ' w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none'}
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
 {/* FILTERS - Colapsável no mobile */}
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
 <span className="px-1.5 py-0.5 bg-[#E91E8C]/100 text-white text-[8px] rounded-full">{
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
 className="text-[10px] text-[#E91E8C] hover:text-[#E91E8C] font-medium"
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
 id="studio-filter-category"
 name="filterCategory"
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
 id="studio-filter-collection"
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
 id="studio-filter-color"
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
 id="studio-filter-gender"
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
 id="studio-sort"
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
 {/* SEÇÃO MODELOS - Colapsável no mobile */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border mb-4'}>
 <button
 onClick={() => setShowModels(!showModels)}
 className="w-full p-3 flex items-center justify-between"
 >
 <div className="flex items-center gap-2">
 <i className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' fas fa-user text-xs'}></i>
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] font-medium uppercase tracking-wide'}>Meus Modelos</span>
 {readyModels.length > 0 && (
 <span className="px-1.5 py-0.5 bg-[#E91E8C]/100 text-white text-[8px] rounded-full">{readyModels.length}</span>
 )}
 </div>
 <i className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' fas fa-chevron-' + (showModels ? 'up' : 'down') + ' text-xs'}></i>
 </button>

 {showModels && (
 <div className="px-3 pb-3">
 {readyModels.length > 0 ? (
 <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
 {readyModels.map(model => {
 const modelImage = model.images?.face || model.images?.front;
 const isSelected = selectedModel?.id === model.id;
 return (
 <div
 key={model.id}
 onClick={() => setSelectedModel(isSelected ? null : model)}
 className={'flex-shrink-0 group relative cursor-pointer transition-all ' + (isSelected ? 'scale-105' : '')}
 >
 <div className={'w-14 h-14 md:w-18 md:h-18 rounded-full p-[2px] transition-all ' + (isSelected ? 'bg-gradient-to-r from-[#E91E8C]/50 via-[#A855F7] to-[#FF9F43] ring-2 ring-[#E91E8C] ring-offset-2 ring-offset-black' : 'bg-gradient-to-r from-[#E91E8C]/50/50 via-[#A855F7]/50 to-[#FF9F43]/50 hover:from-[#E91E8C]/50 hover:via-[#A855F7] hover:to-[#FF9F43]')}>
 <div className={(theme === 'dark' ? 'bg-neutral-900' : 'bg-white') + ' w-full h-full rounded-full p-[1px]'}>
 {modelImage ? (
 <OptimizedImage
 src={modelImage}
 alt={model.name}
 className="w-full h-full rounded-full"
 imgStyle={{ objectPosition: 'top' }}
 size="thumb"
 objectFit="cover"
 />
 ) : (
 <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' w-full h-full rounded-full flex items-center justify-center'}>
 <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-user text-sm'}></i>
 </div>
 )}
 </div>
 </div>
 {isSelected && (
 <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
 <i className="fas fa-check-circle text-[#E91E8C] text-xs"></i>
 </div>
 )}
 <p className={(isSelected ? 'text-[#E91E8C]' : (theme === 'dark' ? 'text-neutral-400' : 'text-gray-600')) + ' text-[9px] text-center mt-1.5 truncate max-w-[56px] md:max-w-[72px] font-medium'}>{model.name}</p>
 </div>
 );
 })}
 </div>
 ) : (
 <div className="flex items-center justify-center py-3">
 <div className="text-center">
 <div className="flex justify-center gap-2 mb-2">
 {[1, 2, 3].map(i => (
 <div key={i} className="w-10 h-10 rounded-full p-[1px] bg-gradient-to-r from-[#E91E8C]/15 via-[#A855F7]/20 to-[#FF9F43]/20">
 <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' w-full h-full rounded-full flex items-center justify-center'}>
 <i className={(theme === 'dark' ? 'text-neutral-700' : 'text-gray-300') + ' fas fa-user text-xs'}></i>
 </div>
 </div>
 ))}
 </div>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px]'}>Nenhum modelo salvo</p>
 <p className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-300') + ' text-[9px]'}>Crie modelos em "Meus Modelos"</p>
 </div>
 </div>
 )}
 </div>
 )}
 </div>

 {/* Modelo selecionado info */}
 {selectedModel && (
 <div className={(theme === 'dark' ? 'bg-gradient-to-r from-[#E91E8C]/50/10 to-[#A855F7]/50/10 border-[#E91E8C]/30' : 'bg-gradient-to-r from-[#E91E8C]/5 to-[#A855F7]/5 border-[#E91E8C]/20') + ' rounded-xl p-3 border mb-4'}>
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-xl overflow-hidden">
 <OptimizedImage
 src={selectedModel.images?.front || selectedModel.images?.face}
 alt={selectedModel.name}
 className="w-full h-full"
 imgStyle={{ objectPosition: 'top' }}
 size="thumb"
 />
 </div>
 <div className="flex-1">
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>{selectedModel.name}</p>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px]'}>
 {selectedModel.gender === 'woman' ? 'Feminino' : 'Masculino'} • {selectedModel.ethnicity}
 </p>
 </div>
 <button
 onClick={() => setSelectedModel(null)}
 className={(theme === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-600') + ' p-2 transition-colors'}
 >
 <i className="fas fa-times"></i>
 </button>
 </div>
 </div>
 )}

 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* BANNER - Seus Produtos + Plano */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 <div className={(theme === 'dark' ? 'bg-gradient-to-r from-[#E91E8C]/50/10 via-[#A855F7]/10 to-[#FF9F43]/10 border-[#E91E8C]/20' : 'bg-gradient-to-r from-[#E91E8C]/10 via-[#A855F7]/10 to-[#FF9F43]/10 border-[#E91E8C]/20') + ' rounded-xl p-4 border mb-4'}>
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
 <span className={(theme === 'dark' ? 'bg-[#E91E8C]/20 text-[#E91E8C]' : 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white') + ' px-3 py-1 text-sm font-medium rounded-full'}>
 {currentPlan.name}
 </span>
 </div>
 )}
 </div>
 </div>

 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* PRODUCTS GRID */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 <>
 <div className="flex items-center justify-between mb-3">
 <h2 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>
 Meus produtos
 </h2>
 </div>

 {filteredProducts.length > 0 ? (
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
 {filteredProducts.map(product => (
 <div
 key={product.id}
 data-product-id={product.id}
 onClick={() => setSelectedProduct(product)}
 className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800 hover:border-[#E91E8C]/50' : 'bg-white border-gray-200 hover:border-[#E91E8C]/40 ') + ' rounded-xl border overflow-hidden cursor-pointer transition-all group'}
 >
 <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' aspect-square relative overflow-hidden'}>
 <OptimizedImage
 src={product.images[0]?.base64 || product.images[0]?.url}
 alt={product.name}
 className="w-full h-full group-hover:scale-105 transition-transform"
 size="thumb"
 />
 {(product as any).generatedImages && (product as any).generatedImages.length > 0 && (
 <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-green-500 text-white text-[8px] font-bold rounded-full flex items-center gap-1">
 <i className="fas fa-check text-[6px]"></i>
 {(product as any).generatedImages.length}
 </div>
 )}
 <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <button className="w-full py-1.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg font-medium text-[10px]">
 <i className="fas fa-wand-magic-sparkles mr-1"></i>Editar
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
 ))}
 </div>
 ) : (
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-8 text-center'}>
 <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-purple-100') + ' w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3'}>
 <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-purple-400') + ' fas fa-search text-xl'}></i>
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
 </>


 </div>

 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* EDITOR MODAL */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 {selectedProduct && (
 <EditorModal
 product={selectedProduct}
 products={products}
 userCredits={userCredits}
 savedModels={editorModelProfiles}
 onSaveModel={handleSaveModelProfile}
 onDeleteModel={handleDeleteModelProfile}
 onClose={() => setSelectedProduct(null)}
 onUpdateProduct={onUpdateProduct}
 onDeductCredits={onDeductCredits}
 onGenerateImage={onGenerateImage ? async (p, t, prompt, opts) => {
 const result = await onGenerateImage(p, t, prompt, opts);
 return { image: result.image || '', generationId: result.generationId || '' };
 } : async () => ({ image: '', generationId: '' })}
 onCheckCredits={onCheckCredits}
 theme={theme}
 userId={userId}
 />
 )}
 </div>
 );
};
