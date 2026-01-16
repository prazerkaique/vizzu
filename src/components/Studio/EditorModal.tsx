// ═══════════════════════════════════════════════════════════════
// VIZZU - Editor Modal (with Theme Support)
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
  { id: 'background', label: 'Fundo Pro', description: 'Fundo branco profissional', icon: 'fa-expand', cost: 1 },
  { id: 'scenario', label: 'Cenário', description: 'Ambiente personalizado', icon: 'fa-image', cost: 2 },
  { id: 'model', label: 'Modelo IA', description: 'Modelo vestindo o produto', icon: 'fa-user', cost: 3 },
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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const currentImage = product.images[currentImageIndex]?.base64 || product.images[currentImageIndex]?.url;

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
      const result = await onGenerateImage(product, selectedTool, '', {});
      if (result.image) {
        onDeductCredits(tool.cost, `${tool.label} - ${product.name}`);
        // Update product with generated image
        const generatedImages = (product as any).generatedImages || [];
        onUpdateProduct(product.id, {
          generatedImages: [...generatedImages, { url: result.image, tool: selectedTool, createdAt: new Date().toISOString() }]
        } as any);
      }
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className={'flex items-center justify-between px-4 py-3 border-b ' + (theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200')}>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700') + ' w-8 h-8 rounded-full flex items-center justify-center'}>
              <i className="fas fa-arrow-left text-sm"></i>
            </button>
            <div>
              <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] uppercase tracking-wide'}>{product.sku}</p>
              <h2 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>{product.name}</h2>
            </div>
          </div>
          <div className={'flex items-center gap-1.5 px-3 py-1.5 rounded-full ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-pink-100')}>
            <i className="fas fa-coins text-pink-500 text-xs"></i>
            <span className={(theme === 'dark' ? 'text-white' : 'text-pink-600') + ' font-medium text-sm'}>{userCredits}</span>
          </div>
        </div>

        {/* Canvas Area */}
        <div className={'flex-1 flex items-center justify-center p-8 ' + (theme === 'dark' ? 'bg-neutral-950' : 'bg-gray-100')}>
          <div className={'relative rounded-2xl overflow-hidden shadow-2xl ' + (theme === 'dark' ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-200')}>
            <div className="aspect-square w-[400px] flex items-center justify-center bg-white">
              {currentImage ? (
                <img src={currentImage} alt={product.name} className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="text-gray-300 text-center">
                  <i className="fas fa-image text-4xl mb-2"></i>
                  <p className="text-sm">Sem imagem</p>
                </div>
              )}
            </div>
            <div className={(theme === 'dark' ? 'bg-neutral-900 text-neutral-500' : 'bg-gray-50 text-gray-500') + ' text-center py-2 text-xs'}>
              {product.sku}
            </div>
            {isGenerating && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <div className="text-center text-white">
                  <i className="fas fa-spinner fa-spin text-3xl mb-2"></i>
                  <p className="text-sm">Gerando...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Thumbnails */}
        {product.images.length > 1 && (
          <div className={'flex items-center gap-2 px-4 py-3 border-t ' + (theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200')}>
            {product.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentImageIndex(idx)}
                className={'w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ' + 
                  (currentImageIndex === idx 
                    ? 'border-pink-500' 
                    : (theme === 'dark' ? 'border-neutral-700 hover:border-neutral-600' : 'border-gray-200 hover:border-gray-300')
                  )
                }
              >
                <img src={img.base64 || img.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Sidebar - Tools */}
      <div className={'w-72 border-l flex flex-col ' + (theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200')}>
        <div className={'p-4 border-b ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-200')}>
          <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-sm'}>Ferramentas</h3>
        </div>
        <div className="flex-1 p-3 space-y-2">
          {TOOLS.map(tool => (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(selectedTool === tool.id ? null : tool.id)}
              className={'w-full p-3 rounded-xl border transition-all text-left ' + 
                (selectedTool === tool.id 
                  ? 'border-pink-500 bg-pink-500/10' 
                  : (theme === 'dark' ? 'border-neutral-800 hover:border-neutral-700 bg-neutral-800/50' : 'border-gray-200 hover:border-gray-300 bg-gray-50')
                )
              }
            >
              <div className="flex items-center gap-3">
                <div className={(theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200') + ' w-9 h-9 rounded-lg flex items-center justify-center'}>
                  <i className={(theme === 'dark' ? 'text-neutral-300' : 'text-gray-600') + ' fas ' + tool.icon + ' text-sm'}></i>
                </div>
                <div className="flex-1">
                  <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>{tool.label}</p>
                  <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{tool.description}</p>
                </div>
                <span className={'text-[10px] font-medium px-2 py-0.5 rounded-full ' + (theme === 'dark' ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-200 text-gray-600')}>
                  {tool.cost}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Generate Button */}
        {selectedTool && (
          <div className={'p-4 border-t ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-200')}>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>Gerando...
                </>
              ) : (
                <>
                  <i className="fas fa-wand-magic-sparkles mr-2"></i>Gerar
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
