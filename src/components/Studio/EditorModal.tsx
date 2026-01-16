// ═══════════════════════════════════════════════════════════════
// VIZZU - Editor Modal (Complete Design)
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Product, SavedModelProfile } from '../../types';

interface EditorModalProps {
  product: Product;
  products: Product[];
  userCredits: number;
  savedModels: SavedModelProfile[];
  onSaveModel: (model: SavedModelProfile) => void;
  onDeleteModel: (modelId: string) => void;
  onClose: () => void;
  onUpdateProduct: (productId: string, updates: Partial<Product>) => void;
  onDeductCredits: (amount: number, reason: string) => boolean;
  onGenerateImage: (product: Product, toolType: string, prompt?: string, options?: any) => Promise<{ image: string; generationId: string }>;
  theme?: 'dark' | 'light';
}

const TOOLS = [
  { id: 'studioReady', label: 'Studio Ready', description: 'Fundo branco', icon: 'fa-expand', cost: 1 },
  { id: 'scenario', label: 'Cenário Criativo', description: 'Ambiente personalizado', icon: 'fa-image', cost: 2 },
  { id: 'model', label: 'Modelo IA', description: 'Humano com produto', icon: 'fa-user', cost: 3 },
];

export const EditorModal: React.FC<EditorModalProps> = ({
  product,
  products,
  userCredits,
  savedModels,
  onSaveModel,
  onDeleteModel,
  onClose,
  onUpdateProduct,
  onDeductCredits,
  onGenerateImage,
  theme = 'dark'
}) => {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [scenarioPrompt, setScenarioPrompt] = useState('');

  const currentImage = product.images[selectedImageIndex]?.base64 || product.images[selectedImageIndex]?.url;

  const handleGenerate = async () => {
    if (!selectedTool) return;
    const tool = TOOLS.find(t => t.id === selectedTool);
    if (!tool) return;

    if (userCredits < tool.cost) {
      alert('Créditos insuficientes');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await onGenerateImage(product, selectedTool, scenarioPrompt, {});
      if (result.image) {
        onDeductCredits(tool.cost, `${tool.label} - ${product.name}`);
        setGeneratedImage(result.image);
      }
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveGenerated = () => {
    if (!generatedImage) return;
    const generatedImages = (product as any).generatedImages || [];
    onUpdateProduct(product.id, {
      generatedImages: [...generatedImages, { url: generatedImage, tool: selectedTool, createdAt: new Date().toISOString() }]
    } as any);
    setGeneratedImage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Modal */}
      <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' relative w-full max-w-5xl rounded-2xl border overflow-hidden shadow-2xl max-h-[90vh] flex flex-col'}>
        
        {/* Header com Gradiente */}
        <div className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
              <i className="fas fa-arrow-left text-sm"></i>
            </button>
            <div>
              <h2 className="text-white font-semibold text-base">{product.name}</h2>
              <p className="text-white/70 text-xs">{product.sku}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
              <i className="fas fa-bolt text-yellow-300 text-sm"></i>
              <span className="text-white font-bold">{userCredits}</span>
              <span className="text-white/70 text-sm">créditos</span>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main Area */}
          <div className="flex-1 p-5 overflow-y-auto">
            {/* Image Areas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              {/* Imagem de Referência */}
              <div className={(theme === 'dark' ? 'bg-neutral-800/50 border-neutral-700' : 'bg-gray-50 border-gray-200') + ' rounded-xl border p-4'}>
                <div className="flex items-center gap-2 mb-3">
                  <i className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' fas fa-crosshairs text-xs'}></i>
                  <span className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px] font-medium uppercase tracking-wide'}>Imagem de Referência</span>
                </div>
                <div className="aspect-square rounded-lg overflow-hidden bg-white flex items-center justify-center">
                  {currentImage ? (
                    <img src={currentImage} alt={product.name} className="max-w-full max-h-full object-contain" />
                  ) : (
                    <div className="text-gray-300 text-center">
                      <i className="fas fa-image text-4xl mb-2"></i>
                      <p className="text-sm">Sem imagem</p>
                    </div>
                  )}
                </div>
                <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-center text-xs mt-3'}>{product.sku}</p>
              </div>

              {/* Resultado */}
              <div className={(theme === 'dark' ? 'bg-neutral-800/50 border-neutral-700' : 'bg-gray-50 border-gray-200') + ' rounded-xl border p-4'}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px] font-medium uppercase tracking-wide'}>Resultado</span>
                </div>
                <div className={'aspect-square rounded-lg overflow-hidden flex items-center justify-center ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100')}>
                  {isGenerating ? (
                    <div className="text-center">
                      <i className="fas fa-spinner fa-spin text-3xl text-pink-500 mb-3"></i>
                      <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-sm'}>Gerando imagem...</p>
                    </div>
                  ) : generatedImage ? (
                    <img src={generatedImage} alt="Resultado" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <div className="text-center p-6">
                      <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-300') + ' fas fa-wand-magic-sparkles text-4xl mb-3'}></i>
                      <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-sm'}>Configure ao lado e clique em Gerar</p>
                    </div>
                  )}
                </div>
                {generatedImage && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={handleSaveGenerated} className="flex-1 py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg text-xs font-medium hover:opacity-90">
                      <i className="fas fa-save mr-1.5"></i>Salvar
                    </button>
                    <button onClick={() => setGeneratedImage(null)} className={(theme === 'dark' ? 'bg-neutral-700 text-white hover:bg-neutral-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300') + ' flex-1 py-2 rounded-lg text-xs font-medium'}>
                      <i className="fas fa-redo mr-1.5"></i>Nova
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Galeria do Produto */}
            {product.images.length > 0 && (
              <div className={(theme === 'dark' ? 'bg-neutral-800/50 border-neutral-700' : 'bg-gray-50 border-gray-200') + ' rounded-xl border p-4'}>
                <div className="flex items-center gap-2 mb-3">
                  <i className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' fas fa-th text-xs'}></i>
                  <span className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px] font-medium uppercase tracking-wide'}>Galeria do Produto</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={'relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ' + 
                        (selectedImageIndex === idx 
                          ? 'border-pink-500 ring-2 ring-pink-500/30' 
                          : (theme === 'dark' ? 'border-neutral-700 hover:border-neutral-600' : 'border-gray-200 hover:border-gray-300')
                        )
                      }
                    >
                      <img src={img.base64 || img.url} alt="" className="w-full h-full object-cover" />
                      {selectedImageIndex === idx && (
                        <div className="absolute inset-0 flex items-center justify-center bg-pink-500/20">
                          <i className="fas fa-check text-pink-500 text-xs"></i>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Ferramentas */}
          <div className={(theme === 'dark' ? 'bg-neutral-800/30 border-neutral-800' : 'bg-gray-50 border-gray-200') + ' w-80 border-l p-5 overflow-y-auto'}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🎨</span>
              <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-semibold'}>Ferramentas</h3>
            </div>

            <div className="space-y-2 mb-5">
              {TOOLS.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => setSelectedTool(selectedTool === tool.id ? null : tool.id)}
                  className={'w-full p-4 rounded-xl border transition-all text-left flex items-center gap-3 ' + 
                    (selectedTool === tool.id 
                      ? 'border-pink-500 bg-pink-500/10' 
                      : (theme === 'dark' ? 'border-neutral-700 hover:border-neutral-600 bg-neutral-800/50' : 'border-gray-200 hover:border-gray-300 bg-white')
                    )
                  }
                >
                  <div className={(theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-100') + ' w-10 h-10 rounded-xl flex items-center justify-center'}>
                    <i className={(selectedTool === tool.id ? 'text-pink-500' : (theme === 'dark' ? 'text-neutral-400' : 'text-gray-500')) + ' fas ' + tool.icon + ' text-sm'}></i>
                  </div>
                  <div className="flex-1">
                    <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>{tool.label}</p>
                    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>{tool.description}</p>
                  </div>
                  <span className="text-pink-500 text-xs font-medium">{tool.cost} créd.</span>
                </button>
              ))}
            </div>

            {/* Cenário Prompt */}
            {selectedTool === 'scenario' && (
              <div className="mb-5">
                <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-2'}>
                  Descreva o cenário
                </label>
                <textarea
                  value={scenarioPrompt}
                  onChange={(e) => setScenarioPrompt(e.target.value)}
                  placeholder="Ex: Mesa de madeira rústica, luz natural, plantas ao fundo..."
                  rows={3}
                  className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-600' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400') + ' w-full px-3 py-2 border rounded-lg text-sm resize-none'}
                />
              </div>
            )}

            {/* Generate Button */}
            {selectedTool && (
              <button
                onClick={handleGenerate}
                disabled={isGenerating || (selectedTool === 'scenario' && !scenarioPrompt)}
                className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25"
              >
                {isGenerating ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Gerando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-wand-magic-sparkles"></i>
                    Gerar Imagem
                  </>
                )}
              </button>
            )}

            {/* Dica */}
            <div className={(theme === 'dark' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200') + ' mt-5 p-4 rounded-xl border'}>
              <div className="flex items-start gap-2">
                <span className="text-lg">💡</span>
                <div>
                  <p className={(theme === 'dark' ? 'text-amber-400' : 'text-amber-700') + ' text-xs font-medium mb-1'}>Dica de Consistência</p>
                  <p className={(theme === 'dark' ? 'text-amber-400/70' : 'text-amber-600') + ' text-[11px] leading-relaxed'}>
                    Ao <strong>Salvar um Modelo</strong>, a imagem gerada será usada como <strong>referência facial</strong>. Nas próximas gerações com esse modelo, a IA tentará manter os mesmos traços.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
