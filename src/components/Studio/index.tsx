// ═══════════════════════════════════════════════════════════════
// VIZZU - AI Visual Studio Main Component
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo, useEffect } from 'react';
import { Product, VisualStudioGeneration, SavedModelProfile, HistoryLog } from '../../types';
import { EditorModal } from './EditorModal';
import { GenerationHistory } from './GenerationHistory';
import { generateVisualStudioImage } from '../../services/geminiService';

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

export const Studio: React.FC<StudioProps> = ({
  products, userCredits, onUpdateProduct, onDeductCredits, onAddHistoryLog, onOpenSettings, onImport, currentPlan
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [generations, setGenerations] = useState<VisualStudioGeneration[]>([]);
  const [savedModels, setSavedModels] = useState<SavedModelProfile[]>([]);

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

  const productsWithImages = useMemo(() => {
    return products.filter(p => {
      const hasImage = p.images?.length > 0 && (p.images[0]?.base64 || p.images[0]?.url);
      if (!hasImage) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term);
      }
      return true;
    });
  }, [products, searchTerm]);

  const addGeneration = (product: Product, type: 'studio' | 'cenario' | 'lifestyle' | 'refine', prompt: string | undefined, originalImage: string, generatedImage: string, credits: number): string => {
    const newGen: VisualStudioGeneration = {
      id: `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      productId: product.id,
      productSku: product.sku,
      productName: product.name,
      type, prompt, originalImage, generatedImage, credits,
      createdAt: new Date().toISOString(),
      saved: false
    };
    setGenerations(prev => [newGen, ...prev]);
    return newGen.id;
  };

  const markGenerationAsSaved = (id: string) => {
    setGenerations(prev => prev.map(gen => gen.id === id ? { ...gen, saved: true } : gen));
  };

  const deleteGeneration = (id: string) => {
    if (window.confirm('Excluir esta imagem do histórico?')) {
      setGenerations(prev => prev.filter(gen => gen.id !== id));
    }
  };

  const handleViewGeneration = (generation: VisualStudioGeneration) => {
    const product = products.find(p => p.id === generation.productId);
    if (product) setSelectedProduct(product);
  };

  const handleGenerateImage = async (
    product: Product, 
    type: 'studio' | 'cenario' | 'lifestyle' | 'refine',
    prompt?: string,
    options?: {
      referenceImage?: string;
      modelPrompt?: string;
      clothingPrompt?: string;
      posePrompt?: string;
      lookItems?: Array<{ slot: string; image: string; name: string }>;
      productCategory?: string;
      productDescription?: string;
    }
  ): Promise<{ image: string | null; generationId: string | null }> => {
    
    const originalImage = product.images?.[0]?.base64 || product.images?.[0]?.url;
    if (!originalImage) return { image: null, generationId: null };
    
    const credits = type === 'studio' ? 1 : type === 'cenario' ? 2 : type === 'lifestyle' ? 3 : 1;
    
    try {
      const result = await generateVisualStudioImage({
        imageBase64: originalImage,
        action: type,
        prompt: prompt,
        productName: product.name,
        modelReferenceImage: options?.referenceImage,
        modelPrompt: options?.modelPrompt,
        clothingPrompt: options?.clothingPrompt,
        posePrompt: options?.posePrompt,
        lookItems: options?.lookItems,
        productCategory: options?.productCategory,
        productDescription: options?.productDescription
      });
      
      const generationId = addGeneration(product, type, prompt || options?.modelPrompt, originalImage, result, credits);
      
      if (options?.referenceImage) {
        const modelUsed = savedModels.find(m => m.referenceImage === options.referenceImage);
        if (modelUsed) {
          const updated = savedModels.map(m => m.id === modelUsed.id ? { ...m, usageCount: m.usageCount + 1 } : m);
          setSavedModels(updated);
          localStorage.setItem('vizzu_saved_models', JSON.stringify(updated));
        }
      }

      onAddHistoryLog('AI Visual Studio', `Gerou: ${type} (${product.sku})`, 'success', [product], 'system', credits);
      return { image: result, generationId };
      
    } catch (error) {
      onAddHistoryLog('AI Visual Studio', `Falha: ${type} (${product.sku})`, 'error', [product], 'system', 0);
      return { image: null, generationId: null };
    }
  };

  const planName = currentPlan?.name || 'Free';
  const planLimit = currentPlan?.limit || 50;

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
            <p className="text-[10px] text-slate-400">Estúdio com IA</p>
          </div>
        </div>

        {/* Credits Badge - Mobile (mini card style) */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl px-3 py-2 min-w-[100px] shadow-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] font-bold text-slate-400 uppercase">Créditos</span>
            <button className="text-purple-400 hover:text-purple-300 text-[8px] font-bold">
              + Add
            </button>
          </div>
          <p className="text-lg font-black text-white leading-none mb-1.5">{userCredits}</p>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
              style={{ width: `${Math.min(100, (userCredits / planLimit) * 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
            
          {/* TOOLS SHOWCASE - NOVOS NOMES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
            
            {/* STUDIO (antigo Studio Ready) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3 md:p-4 flex items-center gap-3 md:gap-4 hover:border-purple-300 transition-colors shadow-sm hover:shadow-md">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg md:text-xl">
                <i className="fas fa-store"></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-bold text-slate-800">STUDIO</p>
                <p className="text-[10px] md:text-xs text-slate-500">Fundo branco perfeito</p>
              </div>
              <span className="text-[10px] md:text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full whitespace-nowrap">1 créd.</span>
            </div>
            
            {/* LOOK VIRTUAL (antigo Cenário Criativo) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3 md:p-4 flex items-center gap-3 md:gap-4 hover:border-pink-300 transition-colors shadow-sm hover:shadow-md">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center text-lg md:text-xl">
                <i className="fas fa-layer-group"></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-bold text-slate-800">LOOK VIRTUAL</p>
                <p className="text-[10px] md:text-xs text-slate-500">Composição de looks</p>
              </div>
              <span className="text-[10px] md:text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full whitespace-nowrap">2 créd.</span>
            </div>

            {/* VIZZU PROVADOR (antigo Modelo Humano) */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-3 md:p-4 flex items-center gap-3 md:gap-4 shadow-lg hover:shadow-xl transition-all">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/20 text-white flex items-center justify-center text-lg md:text-xl">
                <i className="fas fa-user-tag"></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-bold text-white">VIZZU PROVADOR</p>
                <p className="text-[10px] md:text-xs text-white/80">Vista seus clientes</p>
              </div>
              <span className="text-[10px] md:text-xs font-bold text-white bg-white/20 px-2 py-1 rounded-full whitespace-nowrap">3 créd.</span>
            </div>
          </div>

          {/* SAVED MODELS */}
          {savedModels.length > 0 && (
            <div className="mb-6 md:mb-8">
              <h3 className="text-xs md:text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 md:mb-4 flex items-center gap-2">
                <i className="fas fa-users text-slate-400"></i> Modelos Salvos
              </h3>
              <div className="bg-white rounded-2xl border border-slate-200 p-3 md:p-4 overflow-x-auto shadow-sm">
                <div className="flex gap-3 md:gap-4">
                  {savedModels.map(model => (
                    <div key={model.id} className="flex-shrink-0 w-20 md:w-24 group text-center relative">
                      <div className="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-full overflow-hidden border-2 border-slate-100 group-hover:border-purple-400 shadow-sm relative">
                        <img src={model.referenceImage} alt={model.name} className="w-full h-full object-cover object-top" />
                      </div>
                      <p className="text-[10px] md:text-xs font-bold text-slate-700 mt-2 truncate px-1">{model.name}</p>
                      <p className="text-[9px] md:text-[10px] text-slate-400">Usado {model.usageCount}x</p>
                      <button onClick={() => handleDeleteModelProfile(model.id)} className="absolute -top-1 -right-1 w-5 h-5 md:w-6 md:h-6 bg-white border border-slate-200 text-red-400 hover:text-red-600 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100">
                        <i className="fas fa-times text-[8px] md:text-[10px]"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MAIN WORKSPACE */}
          <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-xl overflow-hidden min-h-[400px] md:min-h-[500px]">
            <div className="p-3 md:p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="text-[10px] md:text-xs font-bold text-slate-500 uppercase mr-1 md:mr-2">Catálogo:</span>
                <span className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs font-bold bg-slate-800 text-white shadow-lg">
                  {productsWithImages.length} produtos
                </span>
                {onImport && (
                  <button onClick={onImport} className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs font-bold bg-purple-100 text-purple-700 hover:bg-purple-200">
                    <i className="fas fa-plus mr-1"></i> Importar
                  </button>
                )}
              </div>

              <div className="relative">
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs md:text-sm"></i>
                <input
                  type="text"
                  placeholder="Buscar produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 md:pl-10 pr-4 py-2 border border-slate-200 bg-white text-slate-800 rounded-xl text-xs md:text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-purple-500/20 shadow-sm"
                />
              </div>
            </div>

            <div className="p-4 md:p-6 bg-slate-50/30">
              {productsWithImages.length === 0 ? (
                <div className="py-16 md:py-24 text-center">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 md:mb-6">
                    <i className="fas fa-camera text-slate-300 text-3xl md:text-4xl"></i>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-slate-700 mb-2">
                    {searchTerm ? 'Nenhum resultado' : 'Galeria Vazia'}
                  </h3>
                  <p className="text-xs md:text-sm text-slate-500 max-w-md mx-auto mb-4 md:mb-6">
                    {searchTerm ? `Não encontramos "${searchTerm}".` : 'Adicione produtos com imagens para começar.'}
                  </p>
                  {!searchTerm && onImport && (
                    <button onClick={onImport} className="px-5 md:px-6 py-2.5 md:py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-lg text-sm">
                      <i className="fas fa-plus mr-2"></i> Adicionar Produtos
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
                  {productsWithImages.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className="bg-white rounded-xl md:rounded-2xl border border-slate-200 overflow-hidden cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group relative"
                    >
                      <div className="aspect-[3/4] bg-slate-100 relative overflow-hidden">
                        <img src={product.images[0]?.base64 || product.images[0]?.url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <div className="bg-white/90 backdrop-blur-md rounded-full px-3 md:px-4 py-1.5 md:py-2 flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            <i className="fas fa-wand-magic-sparkles text-purple-600 text-xs md:text-sm"></i>
                            <span className="text-[10px] md:text-xs font-bold text-purple-900">Abrir</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-2 md:p-3">
                        <p className="text-[8px] md:text-[9px] font-bold text-slate-400 mb-0.5 md:mb-1 uppercase tracking-wider">{product.sku}</p>
                        <h3 className="text-[10px] md:text-xs font-bold text-slate-800 line-clamp-2 leading-relaxed">{product.name}</h3>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* HISTORY */}
          {generations.length > 0 && (
            <div className="mt-8 md:mt-12">
              <GenerationHistory 
                generations={generations} 
                onView={handleViewGeneration} 
                onDelete={deleteGeneration} 
              />
            </div>
          )}

          {/* EDITOR MODAL */}
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
              onMarkSaved={markGenerationAsSaved}
            />
          )}
        </div>
      </div>
    </div>
  );
};
