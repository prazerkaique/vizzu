// ═══════════════════════════════════════════════════════════════
// VIZZU - Studio (Redesign Suno Style)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo, useEffect } from 'react';
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
}

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
  const [searchTerm, setSearchTerm] = useState('');
  const [savedModels, setSavedModels] = useState<SavedModelProfile[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'recent' | 'edited'>('all');

  useEffect(() => {
    const saved = localStorage.getItem('vizzu_saved_models');
    if (saved) {
      try { setSavedModels(JSON.parse(saved)); } catch(e) { console.error(e); }
    }
  }, []);

  const handleSaveModelProfile = (profile: SavedModelProfile) => {
    const updated = [...savedModels, profile];
    setSavedModels(updated);
    localStorage.setItem('vizzu_saved_models', JSON.stringify(updated));
  };

  const handleDeleteModelProfile = (id: string) => {
    if (window.confirm('Excluir este modelo?')) {
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
    if (onGenerateImage) {
      const result = await onGenerateImage(product, toolType, prompt, options);
      if (result.image) {
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
    }
    return { image: null, generationId: null };
  };

  const productsWithImages = useMemo(() => {
    return products.filter(p => {
      const hasImage = p.images?.length > 0 && (p.images[0]?.base64 || p.images[0]?.url);
      if (!hasImage) return false;
      
      const matchesSearch = !searchTerm || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
  }, [products, searchTerm]);

  const planName = currentPlan?.name || 'Free';

  return (
    <div className="min-h-screen bg-black">
      
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-neutral-800/50">
        <div className="px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo/Title */}
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">Studio</h1>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              {/* Credits - Estilo Suno */}
              <button 
                onClick={onOpenSettings}
                className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 rounded-full px-3 py-1.5 transition-colors"
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center">
                  <i className="fas fa-bolt text-[8px] text-white"></i>
                </div>
                <span className="text-sm font-semibold text-white">{userCredits}</span>
              </button>

              {/* Search */}
              <button className="w-9 h-9 rounded-full bg-neutral-900 hover:bg-neutral-800 flex items-center justify-center transition-colors">
                <i className="fas fa-search text-neutral-400 text-sm"></i>
              </button>
            </div>
          </div>

          {/* Search Bar - Expandida */}
          <div className="mt-4">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-xs"></i>
              <input
                type="text"
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700 transition-colors"
              />
            </div>
          </div>

          {/* Filter Tabs - Estilo Suno */}
          <div className="flex gap-1 mt-4">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'recent', label: 'Recentes' },
              { id: 'edited', label: 'Editados' }
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id as any)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeFilter === filter.id
                    ? 'bg-white text-black'
                    : 'bg-transparent text-neutral-400 hover:text-white'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CONTENT */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="px-4 md:px-6 py-4 pb-24">
        
        {/* Stats Card - Opcional, estilo Suno */}
        <div className="mb-6 p-4 bg-gradient-to-br from-pink-600/20 via-purple-600/10 to-transparent rounded-2xl border border-pink-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-400 mb-1">Seus produtos</p>
              <p className="text-2xl font-bold text-white">{productsWithImages.length}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-neutral-400 mb-1">Plano</p>
              <span className="text-xs font-medium text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full">
                {planName}
              </span>
            </div>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Meus produtos</h2>
          <button className="text-xs text-neutral-400 hover:text-white transition-colors">
            Filtro <i className="fas fa-sliders-h ml-1 text-[10px]"></i>
          </button>
        </div>

        {/* Grid */}
        {productsWithImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center mb-4">
              <i className="fas fa-image text-neutral-600 text-xl"></i>
            </div>
            <h3 className="text-base font-medium text-white mb-1">
              {searchTerm ? 'Nenhum resultado' : 'Nenhum produto'}
            </h3>
            <p className="text-sm text-neutral-500 text-center max-w-xs mb-6">
              {searchTerm ? 'Tente buscar por outro termo.' : 'Adicione produtos com imagens para começar.'}
            </p>
            {!searchTerm && onImport && (
              <button 
                onClick={onImport}
                className="px-5 py-2.5 bg-white hover:bg-neutral-100 text-black text-sm font-semibold rounded-full transition-colors"
              >
                Adicionar
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {productsWithImages.map((product) => (
              <button
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="group text-left bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800/50 hover:border-neutral-700 transition-all duration-200"
              >
                {/* Image */}
                <div className="aspect-square bg-neutral-800 relative overflow-hidden">
                  <img 
                    src={product.images[0]?.base64 || product.images[0]?.url} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <i className="fas fa-wand-magic-sparkles text-white text-sm"></i>
                    </div>
                  </div>

                  {/* Image Count Badge */}
                  {product.images.length > 1 && (
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md">
                      {product.images.length}
                    </div>
                  )}
                </div>
                
                {/* Info */}
                <div className="p-3">
                  <p className="text-[10px] text-neutral-500 font-medium uppercase tracking-wide mb-0.5">
                    {product.sku}
                  </p>
                  <h3 className="text-xs font-medium text-white line-clamp-2 leading-tight">
                    {product.name}
                  </h3>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FAB - Floating Action Button (Estilo Suno) */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {onImport && productsWithImages.length > 0 && (
        <button 
          onClick={onImport}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-12 h-12 bg-gradient-to-r from-pink-500 to-orange-400 rounded-full shadow-lg shadow-pink-500/25 flex items-center justify-center text-white hover:scale-105 transition-transform z-30"
        >
          <i className="fas fa-plus text-lg"></i>
        </button>
      )}

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
          onGenerateImage={handleGenerateImage}
        />
      )}
    </div>
  );
};
