// ═══════════════════════════════════════════════════════════════
// VIZZU - AI Visual Studio Main Component
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo, useEffect } from 'react';
import { Product, VisualStudioGeneration, SavedModelProfile, HistoryLog } from '../../types';
import { EditorModal } from './EditorModal';
import { GenerationHistory } from './GenerationHistory';
// import { generateVisualStudioImage } from '../../services/geminiService';

interface StudioProps {
  products: Product[];
  userCredits: number;
  onUpdateProduct: (productId: string, updates: Partial<Product>) => void;
  onDeductCredits: (amount: number, reason: string) => boolean;
  onAddHistoryLog: (action: string, details: string, status: HistoryLog['status'], items: Product[], method: HistoryLog['method'], cost: number) => void;
  onOpenSettings?: () => void;
  onImport?: () => void;
  currentPlan?: { name: string; limit: number };
}

const CATEGORIES = ['Camisetas', 'Calças', 'Calçados', 'Acessórios', 'Vestidos', 'Shorts', 'Jaquetas'];
const COLLECTIONS = ['Verão 2025', 'Inverno 2025', 'Básicos', 'Premium', 'Promoção'];
const COLORS = ['Preto', 'Branco', 'Azul', 'Vermelho', 'Verde', 'Amarelo', 'Rosa', 'Cinza', 'Marrom', 'Bege'];

export const Studio: React.FC<StudioProps> = ({
  products,
  userCredits,
  onUpdateProduct,
  onDeductCredits,
  onAddHistoryLog,
  onOpenSettings,
  onImport,
  currentPlan
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterCollection, setFilterCollection] = useState('');
  const [filterColor, setFilterColor] = useState('');
  
  const [generations, setGenerations] = useState<VisualStudioGeneration[]>([]);
  const [savedModels, setSavedModels] = useState<SavedModelProfile[]>([]);

  // Load saved models from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('vizzu_saved_models');
    if (saved) {
      try {
        setSavedModels(JSON.parse(saved));
      } catch(e) { console.error('Erro ao carregar modelos salvos', e); }
    }
  }, []);

  const handleSaveModelProfile = (profile: SavedModelProfile) => {
    const updated = [...savedModels, profile];
    setSavedModels(updated);
    localStorage.setItem('vizzu_saved_models', JSON.stringify(updated));
  };

  const handleDeleteModelProfile = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este modelo?')) {
      const updated = savedModels.filter(m => m.id !== id);
      setSavedModels(updated);
      localStorage.setItem('vizzu_saved_models', JSON.stringify(updated));
    }
  };

  const handleGenerateImage = async (
    product: Product,
    toolType: 'studio' | 'cenario' | 'lifestyle' | 'provador' | 'refine',
    prompt?: string,
    options?: any
  ): Promise<{ image: string | null; generationId: string | null }> => {
    try {
      const result = await generateVisualStudioImage(product, toolType, prompt, options);
      
      if (result.image) {
        const newGeneration: VisualStudioGeneration = {
          id: result.generationId || `gen-${Date.now()}`,
          productId: product.id,
          productName: product.name,
          originalImage: product.images[0]?.base64 || product.images[0]?.url || '',
          generatedImage: result.image,
          toolType,
          prompt: prompt || '',
          timestamp: new Date().toISOString(),
          saved: false
        };
        setGenerations(prev => [newGeneration, ...prev]);
        
        onAddHistoryLog(
          `Imagem gerada: ${toolType}`,
          `Produto: ${product.name}`,
          'success',
          [product],
          'ai',
          toolType === 'studio' ? 1 : toolType === 'cenario' ? 2 : 3
        );
      }
      
      return result;
    } catch (error: any) {
      onAddHistoryLog(
        `Erro na geração: ${toolType}`,
        error.message || 'Erro desconhecido',
        'error',
        [product],
        'ai',
        0
      );
      throw error;
    }
  };

  const handleMarkSaved = (generationId: string) => {
    setGenerations(prev => prev.map(g => 
      g.id === generationId ? { ...g, saved: true } : g
    ));
  };

  const productsWithImages = useMemo(() => {
    return products.filter(p => {
      const hasImage = p.images?.length > 0 && (p.images[0]?.base64 || p.images[0]?.url);
      if (!hasImage) return false;
      
      const matchesSearch = !searchTerm || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !filterCategory || p.category === filterCategory;
      const matchesCollection = !filterCollection || p.collection === filterCollection;
      const matchesColor = !filterColor || p.color === filterColor;
      
      return matchesSearch && matchesCategory && matchesCollection && matchesColor;
    });
  }, [products, searchTerm, filterCategory, filterCollection, filterColor]);

  const planName = currentPlan?.name || 'Free';

  // ═══════════════════════════════════════════════════════════════
  // GALLERY VIEW (lista de produtos)
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 relative h-full flex flex-col">
      
      {/* HEADER - DESKTOP */}
      <div className="hidden md:flex bg-white border-b border-slate-200 px-8 py-4 items-center justify-between shadow-sm z-10 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <i className="fas fa-magic text-white text-2xl"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Vizzu Studio®</h1>
              <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold uppercase">{planName}</span>
            </div>
            <p className="text-xs text-slate-500">Estúdio com IA para lojistas</p>
          </div>
        </div>
        
        {/* Credits Badge - Desktop */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl px-5 py-3 min-w-[120px] shadow-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Créditos</span>
            {onOpenSettings && (
              <button onClick={onOpenSettings} className="text-amber-400 hover:text-amber-300 text-xs">
                <i className="fas fa-plus"></i>
              </button>
            )}
          </div>
          <p className="text-2xl font-black text-white leading-none">{userCredits}</p>
          <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (userCredits / 500) * 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* HEADER - MOBILE */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 flex items-center justify-center shadow-lg">
            <i className="fas fa-magic text-white text-lg"></i>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-black text-slate-800">Studio®</h1>
              <span className="text-[8px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold uppercase">{planName}</span>
            </div>
          </div>
        </div>

        {/* Credits Badge - Mobile */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl px-3 py-2 min-w-[80px] shadow-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] font-bold text-slate-400 uppercase">Créditos</span>
            {onOpenSettings && (
              <button onClick={onOpenSettings} className="text-amber-400 hover:text-amber-300 text-[10px]">
                <i className="fas fa-plus"></i>
              </button>
            )}
          </div>
          <p className="text-lg font-black text-white leading-none">{userCredits}</p>
          <div className="mt-1.5 h-1 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
              style={{ width: `${Math.min(100, (userCredits / 500) * 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20">
        <div className="max-w-7xl mx-auto">

          {/* FILTROS DE BUSCA */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 md:p-4 mb-4 shadow-sm">
            {/* Busca */}
            <div className="relative mb-3">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
              <input
                type="text"
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm"
              />
            </div>
            
            {/* Filtros em linha */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              <select 
                value={filterCategory} 
                onChange={(e) => setFilterCategory(e.target.value)}
                className="flex-shrink-0 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white min-w-[100px]"
              >
                <option value="">Categoria</option>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              
              <select 
                value={filterCollection} 
                onChange={(e) => setFilterCollection(e.target.value)}
                className="flex-shrink-0 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white min-w-[100px]"
              >
                <option value="">Coleção</option>
                {COLLECTIONS.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
              
              <select 
                value={filterColor} 
                onChange={(e) => setFilterColor(e.target.value)}
                className="flex-shrink-0 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white min-w-[90px]"
              >
                <option value="">Cor</option>
                {COLORS.map(color => <option key={color} value={color}>{color}</option>)}
              </select>
              
              {(filterCategory || filterCollection || filterColor) && (
                <button 
                  onClick={() => { setFilterCategory(''); setFilterCollection(''); setFilterColor(''); }}
                  className="flex-shrink-0 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold"
                >
                  <i className="fas fa-times mr-1"></i>Limpar
                </button>
              )}
            </div>
            
            <p className="text-[10px] text-slate-400 mt-2">{productsWithImages.length} de {products.length} produtos com imagem</p>
          </div>

          {/* GRID DE PRODUTOS */}
          {productsWithImages.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-camera text-slate-300 text-3xl"></i>
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-2">
                {searchTerm || filterCategory || filterCollection || filterColor ? 'Nenhum resultado' : 'Galeria Vazia'}
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
                {searchTerm ? 'Tente outros filtros.' : 'Adicione produtos com imagens para começar a usar o Vizzu Studio.'}
              </p>
              {!searchTerm && onImport && (
                <button onClick={onImport} className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-lg text-sm">
                  <i className="fas fa-plus mr-2"></i> Adicionar Produtos
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {productsWithImages.map((product) => (
                <div
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                >
                  <div className="aspect-[3/4] bg-slate-100 relative overflow-hidden">
                    <img 
                      src={product.images[0]?.base64 || product.images[0]?.url} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                      <span className="text-white text-xs font-bold bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                        <i className="fas fa-wand-magic-sparkles mr-1"></i> Editar
                      </span>
                    </div>
                    
                    {/* Badge de imagens geradas */}
                    {generations.filter(g => g.productId === product.id).length > 0 && (
                      <div className="absolute top-2 right-2 bg-purple-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        {generations.filter(g => g.productId === product.id).length}
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">{product.sku}</p>
                    <h3 className="text-[10px] font-bold text-slate-800 line-clamp-2 leading-snug">{product.name}</h3>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Botão Importar Flutuante Mobile */}
          {onImport && (
            <button 
              onClick={onImport}
              className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full shadow-xl flex items-center justify-center text-white z-30"
            >
              <i className="fas fa-plus text-xl"></i>
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* EDITOR MODAL - Abre quando produto é selecionado */}
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
          onGenerateImage={handleGenerateImage}
          onMarkSaved={handleMarkSaved}
        />
      )}
    </div>
  );
};
