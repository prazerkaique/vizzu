// ═══════════════════════════════════════════════════════════════
// VIZZU - Studio (Suno Style)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import { Product, SavedModelProfile, HistoryLog } from '../../types';
import { EditorModal } from './EditorModal';

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
  userId
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [savedModels, setSavedModels] = useState<SavedModelProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'todos' | 'recentes' | 'editados' | 'modelos'>('todos');
  const [fabExpanded, setFabExpanded] = useState(false);
  
  // Filtros
  const [showFilters, setShowFilters] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterCollection, setFilterCollection] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [filterGender, setFilterGender] = useState('');

  // Filtrar produtos
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = !searchTerm || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !filterCategory || product.category === filterCategory;
      const matchesCollection = !filterCollection || product.collection === filterCollection;
      const matchesColor = !filterColor || product.color === filterColor;
      const matchesGender = !filterGender || (product as any).gender === filterGender;
      return matchesSearch && matchesCategory && matchesCollection && matchesColor && matchesGender;
    });
  }, [products, searchTerm, filterCategory, filterCollection, filterColor, filterGender]);

  // Produtos recentes (últimos 10 atualizados)
  const recentProducts = useMemo(() => {
    return [...products]
      .filter(p => p.updatedAt)
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
      .slice(0, 10);
  }, [products]);

  // Produtos editados (que têm imagens geradas)
  const editedProducts = useMemo(() => {
    return products.filter(p => (p as any).generatedImages && (p as any).generatedImages.length > 0);
  }, [products]);

  const handleSaveModelProfile = (model: SavedModelProfile) => {
    setSavedModels(prev => {
      const exists = prev.find(m => m.id === model.id);
      if (exists) {
        return prev.map(m => m.id === model.id ? model : m);
      }
      return [...prev, model];
    });
  };

  const handleDeleteModelProfile = (modelId: string) => {
    setSavedModels(prev => prev.filter(m => m.id !== modelId));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCategory('');
    setFilterCollection('');
    setFilterColor('');
    setFilterGender('');
  };

  const hasActiveFilters = searchTerm || filterCategory || filterCollection || filterColor || filterGender;

  const displayProducts = activeTab === 'todos' ? filteredProducts : 
                          activeTab === 'recentes' ? recentProducts : 
                          activeTab === 'editados' ? editedProducts : [];

  return (
    <div className={'flex-1 overflow-y-auto p-4 md:p-6 ' + (theme === 'dark' ? 'bg-black' : 'bg-gray-50')}>
      <div className="max-w-7xl mx-auto">
        
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* HEADER - Padronizado */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={'w-10 h-10 rounded-xl flex items-center justify-center ' + (theme === 'dark' ? 'bg-gradient-to-r from-pink-500/20 to-orange-400/20 border border-pink-500/30' : 'bg-gradient-to-r from-pink-500 to-orange-400 shadow-lg shadow-pink-500/25')}>
              <i className={'fas fa-wand-magic-sparkles text-sm ' + (theme === 'dark' ? 'text-pink-400' : 'text-white')}></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold'}>Vizzu Studio®</h1>
                {currentPlan && (
                  <span className={(theme === 'dark' ? 'bg-pink-500/20 text-pink-400' : 'bg-gradient-to-r from-pink-500 to-orange-400 text-white') + ' px-2 py-0.5 text-[9px] font-medium rounded-full uppercase tracking-wide'}>
                    {currentPlan.name}
                  </span>
                )}
              </div>
              <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Gere imagens profissionais com IA</p>
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
        {/* TABS */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between mb-4">
          <div className={'flex items-center gap-1 p-1 rounded-lg ' + (theme === 'dark' ? 'bg-neutral-900' : 'bg-white border border-gray-200 shadow-sm')}>
            {[
              { id: 'todos' as const, label: 'Todos' },
              { id: 'recentes' as const, label: 'Recentes' },
              { id: 'editados' as const, label: 'Editados' },
              { id: 'modelos' as const, label: 'Meus Modelos' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={'px-3 py-1.5 rounded-md text-xs font-medium transition-all ' + 
                  (activeTab === tab.id 
                    ? (theme === 'dark' ? 'bg-white text-neutral-900' : 'bg-gradient-to-r from-pink-500 to-orange-400 text-white')
                    : (theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700')
                  )
                }
              >
                {tab.label}
                {tab.id === 'modelos' && savedModels.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-pink-500 text-white text-[9px] rounded-full">
                    {savedModels.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ' +
              (showFilters || hasActiveFilters
                ? 'bg-pink-500/20 text-pink-500 border border-pink-500/30'
                : (theme === 'dark' ? 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white' : 'bg-white text-gray-500 border border-gray-200 hover:text-gray-700 shadow-sm')
              )
            }
          >
            <i className="fas fa-sliders text-[10px]"></i>
            Filtros
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 bg-pink-500 rounded-full"></span>
            )}
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* FILTERS - Sempre visíveis quando showFilters = true */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {showFilters && activeTab !== 'modelos' && (
          <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-3 mb-4'}>
            <div className="flex items-center justify-between mb-3">
              <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] font-medium uppercase tracking-wide'}>Filtrar por</span>
              {hasActiveFilters && (
                <button 
                  onClick={clearFilters}
                  className="text-[10px] text-pink-500 hover:text-pink-400 font-medium"
                >
                  Limpar filtros
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* BANNER - Seus Produtos + Plano */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab !== 'modelos' && (
          <div className={(theme === 'dark' ? 'bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-orange-500/10 border-pink-500/20' : 'bg-gradient-to-r from-pink-100 via-purple-100 to-orange-100 border-pink-200') + ' rounded-xl p-4 border mb-4'}>
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
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB: MEUS MODELOS */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'modelos' && (
          <div>
            {savedModels.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-xs'}>{savedModels.length} modelo(s) salvo(s)</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {savedModels.map(model => (
                    <div 
                      key={model.id}
                      className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800 hover:border-pink-500/50' : 'bg-white border-gray-200 hover:border-pink-300 shadow-sm') + ' rounded-xl border overflow-hidden transition-all group'}
                    >
                      <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' aspect-[3/4] relative overflow-hidden'}>
                        {model.referenceImage ? (
                          <img 
                            src={model.referenceImage} 
                            alt={model.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <i className={(theme === 'dark' ? 'text-neutral-700' : 'text-gray-300') + ' fas fa-user text-3xl'}></i>
                          </div>
                        )}
                        <button
                          onClick={() => handleDeleteModelProfile(model.id)}
                          className="absolute top-2 right-2 w-6 h-6 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <i className="fas fa-trash text-[9px]"></i>
                        </button>
                      </div>
                      <div className="p-3">
                        <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-sm truncate'}>{model.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {(model as any).gender && (
                            <span className={(theme === 'dark' ? 'text-neutral-500 bg-neutral-800' : 'text-gray-500 bg-gray-100') + ' text-[9px] px-1.5 py-0.5 rounded'}>
                              {(model as any).gender}
                            </span>
                          )}
                          {(model as any).bodyType && (
                            <span className={(theme === 'dark' ? 'text-neutral-500 bg-neutral-800' : 'text-gray-500 bg-gray-100') + ' text-[9px] px-1.5 py-0.5 rounded'}>
                              {(model as any).bodyType}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-8 text-center'}>
                <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-purple-100') + ' w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3'}>
                  <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-purple-400') + ' fas fa-user-plus text-xl'}></i>
                </div>
                <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium mb-1'}>Nenhum modelo salvo</h3>
                <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mb-4'}>Crie modelos personalizados ao editar seus produtos</p>
                <button 
                  onClick={() => setActiveTab('todos')}
                  className={(theme === 'dark' ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-pink-500 text-white hover:bg-pink-600') + ' px-4 py-2 rounded-lg font-medium text-xs transition-colors'}
                >
                  Ver produtos
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* PRODUCTS GRID */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab !== 'modelos' && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>
                {activeTab === 'todos' && 'Meus produtos'}
                {activeTab === 'recentes' && 'Recentes'}
                {activeTab === 'editados' && 'Editados'}
              </h2>
            </div>

            {displayProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {displayProducts.map(product => (
                  <div
                    key={product.id}
                    data-product-id={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800 hover:border-pink-500/50' : 'bg-white border-gray-200 hover:border-pink-300 shadow-sm hover:shadow-md') + ' rounded-xl border overflow-hidden cursor-pointer transition-all group'}
                  >
                    <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' aspect-square relative overflow-hidden'}>
                      <img
                        src={product.images[0]?.base64 || product.images[0]?.url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      {(product as any).generatedImages && (product as any).generatedImages.length > 0 && (
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-green-500 text-white text-[8px] font-bold rounded-full flex items-center gap-1">
                          <i className="fas fa-check text-[6px]"></i>
                          {(product as any).generatedImages.length}
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="w-full py-1.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-[10px]">
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
              <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-8 text-center'}>
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
                    className="px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-xs hover:opacity-90 transition-opacity"
                  >
                    <i className="fas fa-plus mr-1.5"></i>Importar produto
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* FAB - Floating Action Button (Mobile) */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {onImport && (
          <button
            onClick={() => {
              setFabExpanded(true);
              setTimeout(() => {
                setFabExpanded(false);
                onImport();
              }, 300);
            }}
            className={`md:hidden fixed bottom-20 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-full shadow-lg flex items-center justify-center z-30 transition-all duration-300 ease-out ${
              fabExpanded
                ? 'w-14 h-14 scale-110'
                : 'w-10 h-10 scale-100'
            }`}
          >
            <i className={`fas fa-plus transition-transform duration-300 ${fabExpanded ? 'rotate-90 text-lg' : 'text-sm'}`}></i>
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* EDITOR MODAL */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {selectedProduct && (
        <EditorModal
          product={selectedProduct}
          products={products}
          userCredits={userCredits}
          savedModels={savedModels}
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
