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
  onGenerateImage?: (product: Product, toolType: string, prompt?: string, options?: any) => Promise<string>;
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
  onGenerateImage
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [savedModels, setSavedModels] = useState<SavedModelProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'todos' | 'recentes' | 'editados' | 'modelos'>('todos');
  
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
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-black">
      <div className="max-w-7xl mx-auto">
        
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* HEADER - Padronizado */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-pink-500/20 to-orange-400/20 border border-pink-500/30 flex items-center justify-center">
              <i className="fas fa-wand-magic-sparkles text-pink-400 text-sm"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-white">Vizzu Studio®</h1>
                {currentPlan && (
                  <span className="px-2 py-0.5 bg-pink-500/20 text-pink-400 text-[9px] font-medium rounded-full uppercase tracking-wide">
                    {currentPlan.name}
                  </span>
                )}
              </div>
              <p className="text-neutral-500 text-xs">Gere imagens profissionais com IA</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg">
              <i className="fas fa-coins text-pink-400 text-xs"></i>
              <span className="text-white font-medium text-sm">{userCredits}</span>
            </div>
            {onImport && (
              <button 
                onClick={onImport}
                className="p-2 md:px-3 md:py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-xs hover:opacity-90 transition-opacity"
              >
                <i className="fas fa-plus md:mr-1.5"></i>
                <span className="hidden md:inline">Importar</span>
              </button>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SEARCH BAR */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="relative mb-4">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 text-sm"></i>
          <input
            type="text"
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500/50"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
            >
              <i className="fas fa-times text-xs"></i>
            </button>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TABS */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg">
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
                    ? 'bg-white text-neutral-900' 
                    : 'text-neutral-400 hover:text-white'
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
                ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
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
          <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-3 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide">Filtrar por</span>
              {hasActiveFilters && (
                <button 
                  onClick={clearFilters}
                  className="text-[10px] text-pink-400 hover:text-pink-300 font-medium"
                >
                  Limpar filtros
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {/* Categoria */}
              <div>
                <label className="block text-[9px] font-medium text-neutral-500 uppercase tracking-wide mb-1">Categoria</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-2.5 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-white"
                >
                  <option value="">Todas</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              {/* Coleção */}
              <div>
                <label className="block text-[9px] font-medium text-neutral-500 uppercase tracking-wide mb-1">Coleção</label>
                <select
                  value={filterCollection}
                  onChange={(e) => setFilterCollection(e.target.value)}
                  className="w-full px-2.5 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-white"
                >
                  <option value="">Todas</option>
                  {COLLECTIONS.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
              
              {/* Cor */}
              <div>
                <label className="block text-[9px] font-medium text-neutral-500 uppercase tracking-wide mb-1">Cor</label>
                <select
                  value={filterColor}
                  onChange={(e) => setFilterColor(e.target.value)}
                  className="w-full px-2.5 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-white"
                >
                  <option value="">Todas</option>
                  {COLORS.map(color => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
              </div>
              
              {/* Gênero */}
              <div>
                <label className="block text-[9px] font-medium text-neutral-500 uppercase tracking-wide mb-1">Gênero</label>
                <select
                  value={filterGender}
                  onChange={(e) => setFilterGender(e.target.value)}
                  className="w-full px-2.5 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-white"
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
          <div className="bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-orange-500/10 rounded-xl p-4 border border-pink-500/20 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-neutral-400 uppercase tracking-wide">Seus produtos</p>
                <p className="text-3xl font-bold text-white">{filteredProducts.length}</p>
                {hasActiveFilters && (
                  <p className="text-[10px] text-neutral-500">de {products.length} no catálogo</p>
                )}
              </div>
              {currentPlan && (
                <div className="text-right">
                  <p className="text-[10px] text-neutral-400 uppercase tracking-wide">Plano</p>
                  <span className="px-3 py-1 bg-pink-500/20 text-pink-400 text-sm font-medium rounded-full">
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
                  <p className="text-xs text-neutral-400">{savedModels.length} modelo(s) salvo(s)</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {savedModels.map(model => (
                    <div 
                      key={model.id}
                      className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden hover:border-pink-500/50 transition-all group"
                    >
                      <div className="aspect-[3/4] bg-neutral-800 relative overflow-hidden">
                        {model.referenceImage ? (
                          <img 
                            src={model.referenceImage} 
                            alt={model.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <i className="fas fa-user text-neutral-700 text-3xl"></i>
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
                        <p className="font-medium text-white text-sm truncate">{model.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {(model as any).gender && (
                            <span className="text-[9px] text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded">
                              {(model as any).gender}
                            </span>
                          )}
                          {(model as any).bodyType && (
                            <span className="text-[9px] text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded">
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
              <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-user-plus text-neutral-600 text-xl"></i>
                </div>
                <h3 className="text-sm font-medium text-white mb-1">Nenhum modelo salvo</h3>
                <p className="text-neutral-500 text-xs mb-4">Crie modelos personalizados ao editar seus produtos</p>
                <button 
                  onClick={() => setActiveTab('todos')}
                  className="px-4 py-2 bg-neutral-800 text-white rounded-lg font-medium text-xs hover:bg-neutral-700 transition-colors"
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
              <h2 className="text-sm font-medium text-white">
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
                    onClick={() => setSelectedProduct(product)}
                    className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden cursor-pointer hover:border-pink-500/50 transition-all group"
                  >
                    <div className="aspect-square bg-neutral-800 relative overflow-hidden">
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
                      <p className="text-[8px] font-medium text-neutral-500 uppercase tracking-wide">{product.sku}</p>
                      <p className="text-xs font-medium text-white truncate mt-0.5">{product.name}</p>
                      {product.category && (
                        <p className="text-[9px] text-neutral-500 mt-1">{product.category}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-search text-neutral-600 text-xl"></i>
                </div>
                <h3 className="text-sm font-medium text-white mb-1">
                  {hasActiveFilters ? 'Nenhum produto encontrado' : 'Nenhum produto'}
                </h3>
                <p className="text-neutral-500 text-xs mb-4">
                  {hasActiveFilters ? 'Tente ajustar os filtros' : 'Importe produtos para começar'}
                </p>
                {hasActiveFilters ? (
                  <button 
                    onClick={clearFilters}
                    className="px-4 py-2 bg-neutral-800 text-white rounded-lg font-medium text-xs hover:bg-neutral-700 transition-colors"
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
            onClick={onImport}
            className="md:hidden fixed bottom-20 right-4 w-12 h-12 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-xl shadow-lg flex items-center justify-center z-30"
          >
            <i className="fas fa-plus text-lg"></i>
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
        />
      )}
    </div>
  );
};
