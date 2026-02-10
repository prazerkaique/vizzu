// ═══════════════════════════════════════════════════════════════
// VIZZU - Product Composition Picker (Creative Still)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import { Product } from '../../types';
import { OptimizedImage } from '../OptimizedImage';

interface ProductCompositionPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
  products: Product[];
  excludeProductId: string;
  alreadyAddedIds: string[];
  theme: 'dark' | 'light';
}

function getProductThumb(product: Product): string | null {
  // PS otimizada > original front > array legado
  const psImages = product.generatedImages?.productStudio || [];
  for (let i = psImages.length - 1; i >= 0; i--) {
    const front = psImages[i].images.find((img: any) => img.angle === 'front');
    if (front?.url) return front.url;
  }
  if (product.originalImages?.front && typeof product.originalImages.front === 'object' && 'url' in product.originalImages.front) {
    return (product.originalImages.front as any).url;
  }
  if (product.images?.[0]?.url) return product.images[0].url;
  return null;
}

export const ProductCompositionPicker: React.FC<ProductCompositionPickerProps> = ({
  isOpen,
  onClose,
  onSelect,
  products,
  excludeProductId,
  alreadyAddedIds,
  theme,
}) => {
  const [search, setSearch] = useState('');
  const isDark = theme === 'dark';

  const filtered = useMemo(() => {
    const available = products.filter(
      p => p.id !== excludeProductId && !alreadyAddedIds.includes(p.id)
    );
    if (!search.trim()) return available;
    const q = search.toLowerCase();
    return available.filter(
      p =>
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
    );
  }, [products, excludeProductId, alreadyAddedIds, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className={
          'relative z-10 w-full sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden ' +
          'rounded-t-2xl sm:rounded-2xl border ' +
          (isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200')
        }
      >
        {/* Header */}
        <div className={'px-5 pt-5 pb-3 border-b ' + (isDark ? 'border-neutral-800' : 'border-gray-100')}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-base font-semibold font-serif'}>
              Adicionar produto na cena
            </h3>
            <button
              onClick={onClose}
              className={(isDark ? 'text-neutral-500 hover:text-neutral-300' : 'text-gray-400 hover:text-gray-600') + ' w-8 h-8 flex items-center justify-center rounded-lg transition-colors'}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <i className={'fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs ' + (isDark ? 'text-neutral-600' : 'text-gray-400')}></i>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto..."
              className={
                'w-full pl-9 pr-4 py-2.5 rounded-xl text-sm ' +
                (isDark
                  ? 'bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-600 focus:border-[#FF6B6B]/50'
                  : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#FF6B6B]/50')
              }
              autoFocus
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className={'text-center py-12 ' + (isDark ? 'text-neutral-600' : 'text-gray-400')}>
              <i className="fas fa-box-open text-3xl mb-3 block"></i>
              <p className="text-sm">
                {products.length <= 1 ? 'Nenhum produto disponível' : 'Nenhum resultado'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map((product) => {
                const thumb = getProductThumb(product);
                return (
                  <button
                    key={product.id}
                    onClick={() => onSelect(product)}
                    className={
                      'group rounded-xl overflow-hidden border text-left transition-all hover:scale-[1.02] active:scale-[0.98] ' +
                      (isDark
                        ? 'bg-neutral-800 border-neutral-700 hover:border-neutral-500'
                        : 'bg-white border-gray-200 hover:border-gray-400 shadow-sm')
                    }
                  >
                    {/* Thumbnail */}
                    <div className={'aspect-square overflow-hidden ' + (isDark ? 'bg-neutral-800' : 'bg-gray-100')}>
                      {thumb ? (
                        <OptimizedImage
                          src={thumb}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          size="thumb"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <i className={'fas fa-image text-2xl ' + (isDark ? 'text-neutral-700' : 'text-gray-300')}></i>
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="p-2.5">
                      <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium truncate'}>
                        {product.name}
                      </p>
                      {product.category && (
                        <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] truncate mt-0.5'}>
                          {product.category}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
