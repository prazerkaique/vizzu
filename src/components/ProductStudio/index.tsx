// ═══════════════════════════════════════════════════════════════
// VIZZU - Product Studio (Fotos profissionais de produto)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import { Product, HistoryLog, ProductStudioAngle, ProductStudioSession, ProductStudioImage } from '../../types';

interface ProductStudioProps {
  products: Product[];
  userCredits: number;
  onUpdateProduct: (productId: string, updates: Partial<Product>) => void;
  onDeductCredits: (amount: number, reason: string) => boolean;
  onAddHistoryLog: (action: string, details: string, status: HistoryLog['status'], items: Product[], method: HistoryLog['method'], cost: number) => void;
  onImport?: () => void;
  currentPlan?: { name: string; limit: number };
  onCheckCredits?: (creditsNeeded: number, actionContext: 'studio' | 'cenario' | 'lifestyle' | 'video' | 'provador' | 'generic') => boolean;
  theme?: 'dark' | 'light';
  userId?: string;
}

const ANGLE_OPTIONS: { id: ProductStudioAngle; label: string; icon: string; description: string }[] = [
  { id: 'front', label: 'Frontal', icon: 'fa-square', description: 'Vista frontal do produto' },
  { id: 'back', label: 'Traseira', icon: 'fa-square', description: 'Vista traseira' },
  { id: 'side-left', label: 'Lateral Esq.', icon: 'fa-caret-left', description: 'Vista lateral esquerda' },
  { id: 'side-right', label: 'Lateral Dir.', icon: 'fa-caret-right', description: 'Vista lateral direita' },
  { id: '45-left', label: '45° Esq.', icon: 'fa-rotate-left', description: 'Ângulo 45° esquerda' },
  { id: '45-right', label: '45° Dir.', icon: 'fa-rotate-right', description: 'Ângulo 45° direita' },
  { id: 'top', label: 'Superior', icon: 'fa-arrow-up', description: 'Vista de cima' },
  { id: 'detail', label: 'Detalhe', icon: 'fa-magnifying-glass-plus', description: 'Close-up de detalhes' },
];

const CATEGORIES = ['Camisetas', 'Calças', 'Calçados', 'Acessórios', 'Vestidos', 'Shorts', 'Jaquetas'];
const COLLECTIONS = ['Verão 2025', 'Inverno 2025', 'Básicos', 'Premium', 'Promoção'];
const COLORS = ['Preto', 'Branco', 'Azul', 'Vermelho', 'Verde', 'Amarelo', 'Rosa', 'Cinza', 'Marrom', 'Bege'];

export const ProductStudio: React.FC<ProductStudioProps> = ({
  products,
  userCredits,
  onUpdateProduct,
  onDeductCredits,
  onAddHistoryLog,
  onImport,
  currentPlan,
  onCheckCredits,
  theme = 'dark',
  userId
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedAngles, setSelectedAngles] = useState<ProductStudioAngle[]>(['front', 'back', '45-left', '45-right']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [currentAngleGenerating, setCurrentAngleGenerating] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<ProductStudioImage[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Custo por ângulo
  const CREDITS_PER_ANGLE = 1;
  const totalCreditsNeeded = selectedAngles.length * CREDITS_PER_ANGLE;

  // Filtrar produtos
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = !searchTerm ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !filterCategory || product.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, filterCategory]);

  const toggleAngle = (angle: ProductStudioAngle) => {
    setSelectedAngles(prev =>
      prev.includes(angle)
        ? prev.filter(a => a !== angle)
        : [...prev, angle]
    );
  };

  const getProductImage = (product: Product): string | undefined => {
    if (product.originalImages?.front?.url) return product.originalImages.front.url;
    if (product.images?.[0]?.url) return product.images[0].url;
    if (product.images?.[0]?.base64) return product.images[0].base64;
    return undefined;
  };

  const handleGenerate = async () => {
    if (!selectedProduct || selectedAngles.length === 0) return;

    // Verificar créditos
    if (onCheckCredits && !onCheckCredits(totalCreditsNeeded, 'studio')) {
      return;
    }

    setIsGenerating(true);
    setGeneratingProgress(0);
    setGeneratedImages([]);

    try {
      const newImages: ProductStudioImage[] = [];

      for (let i = 0; i < selectedAngles.length; i++) {
        const angle = selectedAngles[i];
        setCurrentAngleGenerating(ANGLE_OPTIONS.find(a => a.id === angle)?.label || angle);
        setGeneratingProgress(Math.round((i / selectedAngles.length) * 100));

        // Simular geração (substituir pela chamada real da API)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Placeholder - na implementação real, chamar a API
        newImages.push({
          id: `${selectedProduct.id}-${angle}-${Date.now()}`,
          url: getProductImage(selectedProduct) || '',
          angle: angle,
          createdAt: new Date().toISOString()
        });
      }

      setGeneratedImages(newImages);
      setGeneratingProgress(100);

      // Deduzir créditos
      if (onDeductCredits) {
        onDeductCredits(totalCreditsNeeded, `Product Studio - ${selectedAngles.length} ângulos`);
      }

      // Log de histórico
      if (onAddHistoryLog) {
        onAddHistoryLog(
          'Product Studio',
          `Gerado ${selectedAngles.length} fotos profissionais de "${selectedProduct.name}"`,
          'success',
          [selectedProduct],
          'ai',
          totalCreditsNeeded
        );
      }

      // Atualizar produto com as imagens geradas
      const sessionId = `session-${Date.now()}`;
      const newSession: ProductStudioSession = {
        id: sessionId,
        productId: selectedProduct.id,
        images: newImages,
        status: 'ready',
        createdAt: new Date().toISOString()
      };

      const currentGenerated = selectedProduct.generatedImages || {
        studioReady: [],
        cenarioCriativo: [],
        modeloIA: [],
        productStudio: []
      };

      onUpdateProduct(selectedProduct.id, {
        generatedImages: {
          ...currentGenerated,
          productStudio: [...(currentGenerated.productStudio || []), newSession]
        }
      });

    } catch (error) {
      console.error('Erro ao gerar imagens:', error);
      if (onAddHistoryLog) {
        onAddHistoryLog(
          'Product Studio',
          `Erro ao gerar fotos de "${selectedProduct?.name}"`,
          'error',
          selectedProduct ? [selectedProduct] : [],
          'ai',
          0
        );
      }
    } finally {
      setIsGenerating(false);
      setCurrentAngleGenerating(null);
    }
  };

  return (
    <div className={'flex-1 overflow-y-auto p-4 md:p-6 ' + (theme === 'dark' ? 'bg-black' : 'bg-[#F5F5F7]')}>
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={'w-10 h-10 rounded-xl flex items-center justify-center ' + (theme === 'dark' ? 'bg-gradient-to-r from-purple-500/20 to-blue-400/20 border border-purple-500/30' : 'bg-gradient-to-r from-purple-500 to-blue-500 shadow-lg shadow-purple-500/25')}>
              <i className={'fas fa-cube text-sm ' + (theme === 'dark' ? 'text-purple-400' : 'text-white')}></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold'}>Vizzu Product Studio®</h1>
                {currentPlan && (
                  <span className={(theme === 'dark' ? 'bg-purple-500/20 text-purple-400' : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white') + ' px-2 py-0.5 text-[9px] font-medium rounded-full uppercase tracking-wide'}>
                    {currentPlan.name}
                  </span>
                )}
              </div>
              <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Fotos profissionais em fundo studio</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={'hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg ' + (theme === 'dark' ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-200 shadow-sm')}>
              <i className="fas fa-coins text-purple-400 text-xs"></i>
              <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-sm'}>{userCredits}</span>
            </div>
            {onImport && (
              <button
                onClick={onImport}
                className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-medium text-xs hover:opacity-90 transition-opacity"
              >
                <i className="fas fa-plus"></i>
                <span>Novo</span>
              </button>
            )}
          </div>
        </div>

        {/* LAYOUT PRINCIPAL - 2 Colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* COLUNA 1 - Seleção de Produto */}
          <div className={'lg:col-span-1 rounded-xl border ' + (theme === 'dark' ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-gray-200 shadow-sm')}>
            <div className={'p-4 border-b ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-100')}>
              <h2 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>
                <i className="fas fa-box mr-2 text-purple-400"></i>Selecione o Produto
              </h2>
              <div className="relative">
                <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs'}></i>
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400') + ' w-full pl-9 pr-3 py-2 border rounded-lg text-xs focus:outline-none focus:border-purple-500'}
                />
              </div>
            </div>

            <div className="p-2 max-h-[400px] overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-8">
                  <i className={(theme === 'dark' ? 'text-neutral-700' : 'text-gray-300') + ' fas fa-box-open text-3xl mb-2'}></i>
                  <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Nenhum produto encontrado</p>
                  {onImport && (
                    <button onClick={onImport} className="mt-2 text-purple-400 text-xs font-medium hover:underline">
                      + Adicionar produto
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredProducts.map(product => {
                    const img = getProductImage(product);
                    const isSelected = selectedProduct?.id === product.id;
                    return (
                      <button
                        key={product.id}
                        onClick={() => {
                          setSelectedProduct(product);
                          setGeneratedImages([]);
                        }}
                        className={'w-full p-2 rounded-lg flex items-center gap-3 transition-all ' +
                          (isSelected
                            ? (theme === 'dark' ? 'bg-purple-500/20 border border-purple-500/50' : 'bg-purple-50 border border-purple-200')
                            : (theme === 'dark' ? 'hover:bg-neutral-800' : 'hover:bg-gray-50')
                          )
                        }
                      >
                        <div className={'w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100')}>
                          {img ? (
                            <img src={img} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-image'}></i>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium truncate'}>{product.name}</p>
                          <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] truncate'}>{product.sku}</p>
                        </div>
                        {isSelected && (
                          <i className="fas fa-check text-purple-400 text-xs"></i>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* COLUNA 2 - Configuração e Preview */}
          <div className="lg:col-span-2 space-y-4">

            {/* Seleção de Ângulos */}
            <div className={'rounded-xl border p-4 ' + (theme === 'dark' ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-gray-200 shadow-sm')}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold'}>
                  <i className="fas fa-camera mr-2 text-purple-400"></i>Ângulos da Foto
                </h2>
                <span className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-xs'}>
                  {selectedAngles.length} selecionado{selectedAngles.length !== 1 ? 's' : ''} • {totalCreditsNeeded} crédito{totalCreditsNeeded !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {ANGLE_OPTIONS.map(angle => {
                  const isSelected = selectedAngles.includes(angle.id);
                  return (
                    <button
                      key={angle.id}
                      onClick={() => toggleAngle(angle.id)}
                      className={'p-3 rounded-lg border transition-all text-center ' +
                        (isSelected
                          ? (theme === 'dark' ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' : 'bg-purple-50 border-purple-300 text-purple-600')
                          : (theme === 'dark' ? 'bg-neutral-800/50 border-neutral-700 text-neutral-400 hover:border-neutral-600' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300')
                        )
                      }
                    >
                      <i className={`fas ${angle.icon} text-lg mb-1`}></i>
                      <p className="text-[10px] font-medium">{angle.label}</p>
                    </button>
                  );
                })}
              </div>

              {/* Quick Select Buttons */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setSelectedAngles(['front', 'back', '45-left', '45-right'])}
                  className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200') + ' px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors'}
                >
                  <i className="fas fa-star mr-1"></i>Pack Essencial (4)
                </button>
                <button
                  onClick={() => setSelectedAngles(ANGLE_OPTIONS.map(a => a.id))}
                  className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200') + ' px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors'}
                >
                  <i className="fas fa-th mr-1"></i>Todos (8)
                </button>
                <button
                  onClick={() => setSelectedAngles([])}
                  className={(theme === 'dark' ? 'text-neutral-500 hover:text-neutral-300' : 'text-gray-400 hover:text-gray-600') + ' px-3 py-1.5 text-[10px] font-medium transition-colors'}
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Preview do Produto */}
            {selectedProduct && (
              <div className={'rounded-xl border p-4 ' + (theme === 'dark' ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-gray-200 shadow-sm')}>
                <h2 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>
                  <i className="fas fa-eye mr-2 text-purple-400"></i>Preview
                </h2>

                <div className="flex gap-4">
                  {/* Imagem Original */}
                  <div className="flex-shrink-0">
                    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] mb-1'}>Original</p>
                    <div className={'w-32 h-32 rounded-lg overflow-hidden ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100')}>
                      {getProductImage(selectedProduct) ? (
                        <img src={getProductImage(selectedProduct)} alt={selectedProduct.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-image text-2xl'}></i>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info do Produto */}
                  <div className="flex-1">
                    <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium'}>{selectedProduct.name}</h3>
                    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mb-2'}>{selectedProduct.sku}</p>

                    <div className="flex flex-wrap gap-1">
                      {selectedProduct.category && (
                        <span className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-600') + ' px-2 py-0.5 rounded text-[10px]'}>
                          {selectedProduct.category}
                        </span>
                      )}
                      {selectedProduct.color && (
                        <span className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-600') + ' px-2 py-0.5 rounded text-[10px]'}>
                          {selectedProduct.color}
                        </span>
                      )}
                    </div>

                    {/* Resultado Preview */}
                    <div className={'mt-3 p-3 rounded-lg ' + (theme === 'dark' ? 'bg-neutral-800/50' : 'bg-gray-50')}>
                      <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-[10px] mb-1'}>
                        <i className="fas fa-info-circle mr-1"></i>Resultado esperado
                      </p>
                      <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>
                        {selectedAngles.length} foto{selectedAngles.length !== 1 ? 's' : ''} profissiona{selectedAngles.length !== 1 ? 'is' : 'l'} com fundo cinza neutro de estúdio
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Botão Gerar */}
            <button
              onClick={handleGenerate}
              disabled={!selectedProduct || selectedAngles.length === 0 || isGenerating || userCredits < totalCreditsNeeded}
              className={'w-full py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ' +
                (isGenerating
                  ? 'bg-purple-600 cursor-wait'
                  : (!selectedProduct || selectedAngles.length === 0 || userCredits < totalCreditsNeeded)
                    ? 'bg-neutral-700 cursor-not-allowed opacity-50'
                    : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:opacity-90 shadow-lg shadow-purple-500/25'
                )
              }
            >
              {isGenerating ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>Gerando {currentAngleGenerating}... {generatingProgress}%</span>
                </>
              ) : (
                <>
                  <i className="fas fa-wand-magic-sparkles"></i>
                  <span>Gerar {selectedAngles.length} Foto{selectedAngles.length !== 1 ? 's' : ''} ({totalCreditsNeeded} crédito{totalCreditsNeeded !== 1 ? 's' : ''})</span>
                </>
              )}
            </button>

            {/* Aviso de créditos insuficientes */}
            {userCredits < totalCreditsNeeded && selectedAngles.length > 0 && (
              <p className="text-center text-red-400 text-xs">
                <i className="fas fa-exclamation-triangle mr-1"></i>
                Créditos insuficientes. Você precisa de {totalCreditsNeeded} créditos.
              </p>
            )}

            {/* Imagens Geradas */}
            {generatedImages.length > 0 && (
              <div className={'rounded-xl border p-4 ' + (theme === 'dark' ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-gray-200 shadow-sm')}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold'}>
                    <i className="fas fa-images mr-2 text-green-400"></i>Fotos Geradas
                  </h2>
                  <button className="text-purple-400 text-xs font-medium hover:underline">
                    <i className="fas fa-download mr-1"></i>Baixar todas
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {generatedImages.map(img => (
                    <div
                      key={img.id}
                      onClick={() => { setPreviewImage(img.url); setShowPreview(true); }}
                      className={'relative rounded-lg overflow-hidden cursor-pointer group ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100')}
                    >
                      <div className="aspect-square">
                        <img src={img.url} alt={img.angle} className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <i className="fas fa-expand text-white text-lg"></i>
                      </div>
                      <div className={'absolute bottom-0 left-0 right-0 py-1 px-2 text-center ' + (theme === 'dark' ? 'bg-black/70' : 'bg-white/90')}>
                        <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-[10px] font-medium'}>
                          {ANGLE_OPTIONS.find(a => a.id === img.angle)?.label || img.angle}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Preview */}
      {showPreview && previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowPreview(false)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
            onClick={() => setShowPreview(false)}
          >
            <i className="fas fa-times"></i>
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-[90vh] rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
