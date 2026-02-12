import React, { useEffect, useRef } from 'react';
import type { BulkProduct } from './types';
import { analyzeProductImage } from '../../lib/api/studio';
import { AI_TYPE_TO_CATEGORY, assignAngles, delay } from './utils';
import { getProductType } from '../../lib/productConfig';

interface StepAnalyzingProps {
  theme: 'light' | 'dark';
  products: BulkProduct[];
  setProducts: React.Dispatch<React.SetStateAction<BulkProduct[]>>;
  userId?: string;
  onComplete: () => void;
}

const AI_DELAY_MS = 2000;

export function StepAnalyzing({ theme, products, setProducts, userId, onComplete }: StepAnalyzingProps) {
  const isDark = theme === 'dark';
  const abortRef = useRef(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    abortRef.current = false;

    const analyze = async () => {
      for (let i = 0; i < products.length; i++) {
        if (abortRef.current) break;

        const product = products[i];
        if (product.aiAnalyzed) continue;

        try {
          const result = await analyzeProductImage({
            imageBase64: product.rawImages[0].base64,
            userId,
          });

          if (result.success && result.products.length > 0) {
            const detected = result.products[0];
            const category = AI_TYPE_TO_CATEGORY[detected.type] || undefined;
            const productType = getProductType(category);
            const newAngles = assignAngles(product.rawImages, productType);

            setProducts(prev => prev.map((p, idx) =>
              idx === i ? {
                ...p,
                aiDetected: detected,
                aiAnalyzed: true,
                name: detected.suggestedName || p.name,
                category,
                color: detected.color || p.color,
                brand: detected.brand || p.brand,
                material: detected.material || p.material,
                fit: detected.fit || p.fit,
                // CSV tem prioridade: se já tinha preço/sku, manter
                price: p.price,
                sku: p.sku,
                angleAssignment: newAngles,
              } : p
            ));
          } else {
            setProducts(prev => prev.map((p, idx) =>
              idx === i ? { ...p, aiAnalyzed: true } : p
            ));
          }
        } catch {
          setProducts(prev => prev.map((p, idx) =>
            idx === i ? { ...p, aiAnalyzed: true } : p
          ));
        }

        // Throttle entre análises
        if (i < products.length - 1 && !abortRef.current) {
          await delay(AI_DELAY_MS);
        }
      }

      if (!abortRef.current) {
        onComplete();
      }
    };

    analyze();

    return () => { abortRef.current = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const analyzed = products.filter(p => p.aiAnalyzed).length;
  const progress = products.length > 0 ? Math.round((analyzed / products.length) * 100) : 0;
  const remaining = (products.length - analyzed) * (AI_DELAY_MS / 1000 + 3); // ~3s por análise + delay

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="text-center space-y-3">
        <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
          <i className={`fas fa-wand-magic-sparkles text-2xl text-[#FF6B6B] ${analyzed < products.length ? 'animate-pulse' : ''}`}></i>
        </div>
        <div>
          <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Analisando com IA...
          </h4>
          <p className={`text-sm mt-1 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
            {analyzed} de {products.length} produtos analisados
            {remaining > 0 && analyzed < products.length && (
              <span> — ~{Math.ceil(remaining / 60)} min restantes</span>
            )}
          </p>
        </div>
        <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Lista de produtos */}
      <div className="space-y-2 max-h-[350px] overflow-y-auto">
        {products.map((product, i) => (
          <div key={product.id} className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
            {/* Thumbnail */}
            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-gray-200">
              <img src={product.rawImages[0]?.base64} alt="" className="w-full h-full object-cover" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {product.aiAnalyzed ? product.name : product.folderName}
              </p>
              {product.aiAnalyzed && product.category && (
                <p className={`text-xs truncate ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                  {product.category} {product.color ? `· ${product.color}` : ''}
                </p>
              )}
            </div>

            {/* Status */}
            <div className="shrink-0">
              {product.aiAnalyzed ? (
                <div className="w-6 h-6 rounded-full bg-[#FF6B6B]/15 flex items-center justify-center">
                  <i className="fas fa-check text-[#FF6B6B] text-xs"></i>
                </div>
              ) : i === analyzed ? (
                <div className="w-6 h-6 rounded-full border-2 border-[#FF6B6B] border-t-transparent animate-spin" />
              ) : (
                <div className={`w-6 h-6 rounded-full ${isDark ? 'bg-white/5' : 'bg-gray-200'}`} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
