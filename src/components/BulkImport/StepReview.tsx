import React, { useState, useCallback } from 'react';
import type { BulkProduct } from './types';
import { ALL_CATEGORIES, assignAngles } from './utils';
import { getProductType, UPLOAD_SLOTS_CONFIG } from '../../lib/productConfig';

interface StepReviewProps {
  theme: 'light' | 'dark';
  products: BulkProduct[];
  setProducts: React.Dispatch<React.SetStateAction<BulkProduct[]>>;
  warnings: string[];
  onStartImport: () => void;
  onBack: () => void;
}

export function StepReview({ theme, products, setProducts, warnings, onStartImport, onBack }: StepReviewProps) {
  const isDark = theme === 'dark';
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const selectedCount = products.filter(p => p.selected).length;

  const toggleSelect = useCallback((id: string) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p));
  }, [setProducts]);

  const toggleAll = useCallback((selected: boolean) => {
    setProducts(prev => prev.map(p => ({ ...p, selected })));
  }, [setProducts]);

  const updateField = useCallback((id: string, field: string, value: any) => {
    setProducts(prev => prev.map(p => {
      if (p.id !== id) return p;

      const updated = { ...p, [field]: value };

      // Se mudou a categoria, reatribuir ângulos
      if (field === 'category') {
        const productType = getProductType(value);
        updated.angleAssignment = assignAngles(p.rawImages, productType);
      }

      return updated;
    }));
  }, [setProducts]);

  const updateAngle = useCallback((productId: string, angle: string, imageIndex: number) => {
    setProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;
      const newAssignment = { ...p.angleAssignment };

      // Remover qualquer ângulo que já apontava para esse index
      for (const [key, idx] of Object.entries(newAssignment)) {
        if (idx === imageIndex && key !== angle) delete newAssignment[key];
      }

      // Remover qualquer index que já estava nesse ângulo
      if (angle === '__none__') {
        // Desvincular
        for (const [key, idx] of Object.entries(newAssignment)) {
          if (idx === imageIndex) delete newAssignment[key];
        }
      } else {
        newAssignment[angle] = imageIndex;
      }

      return { ...p, angleAssignment: newAssignment };
    }));
  }, [setProducts]);

  return (
    <div className="space-y-4">
      {/* Warnings */}
      {warnings.length > 0 && (
        <div className={`p-3 rounded-xl text-xs space-y-1 ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700'}`}>
          {warnings.map((w, i) => (
            <p key={i}><i className="fas fa-triangle-exclamation mr-1.5"></i>{w}</p>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isDark ? 'bg-white/10 hover:bg-white/15 text-neutral-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
          >
            <i className="fas fa-arrow-left mr-1.5"></i>Voltar
          </button>
          <span className={`text-xs ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>
            {products.length} produto{products.length !== 1 ? 's' : ''} encontrado{products.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleAll(selectedCount < products.length)}
            className={`text-xs ${isDark ? 'text-neutral-400 hover:text-neutral-200' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {selectedCount === products.length ? 'Deselecionar' : 'Selecionar'} todos
          </button>
        </div>
      </div>

      {/* Product cards */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {products.map(product => {
          const productType = getProductType(product.category);
          const slots = UPLOAD_SLOTS_CONFIG[productType];
          const isExpanded = expandedId === product.id;
          const assignedCount = Object.keys(product.angleAssignment).length;

          return (
            <div key={product.id} className={`rounded-xl border transition-all ${
              product.selected
                ? isDark ? 'border-[#FF6B6B]/40 bg-white/5' : 'border-[#FF6B6B]/30 bg-[#FF6B6B]/[0.02]'
                : isDark ? 'border-white/10 bg-white/[0.02] opacity-60' : 'border-gray-200 bg-gray-50/50 opacity-60'
            }`}>
              {/* Card header */}
              <div className="flex items-start gap-3 p-3">
                {/* Checkbox + thumbnail */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <button onClick={() => toggleSelect(product.id)} className="mt-1">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                      product.selected ? 'bg-[#FF6B6B] border-[#FF6B6B]' : isDark ? 'border-white/20' : 'border-gray-300'
                    }`}>
                      {product.selected && <i className="fas fa-check text-white text-[8px]"></i>}
                    </div>
                  </button>
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-200 shrink-0">
                    <img src={product.rawImages[0]?.base64} alt="" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 right-0 bg-black/70 text-white text-[9px] font-medium px-1 py-0.5 rounded-tl">
                      {product.rawImages.length}
                    </div>
                  </div>
                </div>

                {/* Fields */}
                <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
                  {/* Nome */}
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={product.name}
                      onChange={e => updateField(product.id, 'name', e.target.value)}
                      placeholder="Nome do produto"
                      className={`w-full text-sm font-medium px-2 py-1 rounded-lg border ${
                        isDark ? 'bg-white/5 border-white/10 text-white placeholder-neutral-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                      }`}
                    />
                  </div>

                  {/* Categoria */}
                  <select
                    value={product.category || ''}
                    onChange={e => updateField(product.id, 'category', e.target.value || undefined)}
                    className={`text-xs px-2 py-1.5 rounded-lg border ${
                      isDark ? 'bg-white/5 border-white/10 text-neutral-300' : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    <option value="">Categoria</option>
                    {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  {/* Cor */}
                  <input
                    type="text"
                    value={product.color || ''}
                    onChange={e => updateField(product.id, 'color', e.target.value || undefined)}
                    placeholder="Cor"
                    className={`text-xs px-2 py-1.5 rounded-lg border ${
                      isDark ? 'bg-white/5 border-white/10 text-neutral-300 placeholder-neutral-500' : 'bg-white border-gray-200 text-gray-700 placeholder-gray-400'
                    }`}
                  />

                  {/* Marca */}
                  <input
                    type="text"
                    value={product.brand || ''}
                    onChange={e => updateField(product.id, 'brand', e.target.value || undefined)}
                    placeholder="Marca"
                    className={`text-xs px-2 py-1.5 rounded-lg border ${
                      isDark ? 'bg-white/5 border-white/10 text-neutral-300 placeholder-neutral-500' : 'bg-white border-gray-200 text-gray-700 placeholder-gray-400'
                    }`}
                  />

                  {/* Preço */}
                  <div className={`flex items-center text-xs rounded-lg border ${
                    isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'
                  }`}>
                    <span className={`pl-2 shrink-0 ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={product.price ?? ''}
                      onChange={e => updateField(product.id, 'price', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="0,00"
                      className={`w-full text-xs px-1.5 py-1.5 bg-transparent border-0 outline-none ${
                        isDark ? 'text-neutral-300 placeholder-neutral-500' : 'text-gray-700 placeholder-gray-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Expand button */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : product.id)}
                  className={`shrink-0 mt-1 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                    isDark ? 'hover:bg-white/10 text-neutral-400' : 'hover:bg-gray-100 text-gray-400'
                  }`}
                  title="Ver ângulos"
                >
                  <i className={`fas fa-angles-${isExpanded ? 'up' : 'down'} text-xs`}></i>
                </button>
              </div>

              {/* Angle pills (collapsed) */}
              {!isExpanded && (
                <div className={`flex items-center gap-1.5 px-3 pb-3 flex-wrap`}>
                  {slots.map(slot => {
                    const hasImage = product.angleAssignment[slot.angle] !== undefined;
                    return (
                      <span key={slot.angle} className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        hasImage
                          ? 'bg-[#FF6B6B]/15 text-[#FF6B6B]'
                          : isDark ? 'bg-white/5 text-neutral-500' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {slot.label}
                      </span>
                    );
                  })}
                  <span className={`text-[10px] ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>
                    {assignedCount}/{Math.min(product.rawImages.length, slots.length)}
                  </span>
                </div>
              )}

              {/* Expanded: angle mapping */}
              {isExpanded && (
                <div className={`px-3 pb-3 border-t ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                  <p className={`text-[10px] uppercase font-medium tracking-wide mt-2 mb-2 ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>
                    Mapeamento de ângulos
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {product.rawImages.map((img, imgIdx) => {
                      // Achar qual ângulo aponta para esse index
                      const currentAngle = Object.entries(product.angleAssignment).find(([, idx]) => idx === imgIdx)?.[0] || '';

                      return (
                        <div key={imgIdx} className={`rounded-lg overflow-hidden border ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                          <div className="aspect-square bg-gray-100 relative">
                            <img src={img.base64} alt="" className="w-full h-full object-cover" />
                            <div className={`absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${isDark ? 'bg-black/70 text-white' : 'bg-white/90 text-gray-700 shadow-sm'}`}>
                              {imgIdx + 1}
                            </div>
                          </div>
                          <select
                            value={currentAngle}
                            onChange={e => updateAngle(product.id, e.target.value || '__none__', imgIdx)}
                            className={`w-full text-[11px] px-1.5 py-1 border-0 ${
                              isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-white text-gray-700'
                            }`}
                          >
                            <option value="">Sem ângulo</option>
                            {slots.map(s => (
                              <option key={s.angle} value={s.angle}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer CTA */}
      <div className="flex items-center justify-between pt-2">
        <span className={`text-xs ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
          {selectedCount} produto{selectedCount !== 1 ? 's' : ''} selecionado{selectedCount !== 1 ? 's' : ''}
        </span>
        <button
          onClick={onStartImport}
          disabled={selectedCount === 0}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            selectedCount > 0
              ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:opacity-90'
              : isDark ? 'bg-white/5 text-neutral-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          Importar {selectedCount} produto{selectedCount !== 1 ? 's' : ''}
          <i className="fas fa-arrow-right ml-2"></i>
        </button>
      </div>
    </div>
  );
}
