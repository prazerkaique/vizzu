// ═══════════════════════════════════════════════════════════════
// VIZZU - Product Studio Editor (Página 2)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo, useEffect } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Product, HistoryLog, ProductAttributes, CATEGORY_ATTRIBUTES, ProductStudioSession, ProductStudioImage, ProductStudioAngle } from '../../types';
import { generateProductStudioV2 } from '../../lib/api/studio';

interface ProductStudioEditorProps {
  product: Product;
  userCredits: number;
  onUpdateProduct: (productId: string, updates: Partial<Product>) => void;
  onDeductCredits: (amount: number, reason: string) => boolean;
  onAddHistoryLog: (action: string, details: string, status: HistoryLog['status'], items: Product[], method: HistoryLog['method'], cost: number) => void;
  onBack: () => void;
  onCheckCredits?: (creditsNeeded: number, actionContext: 'studio' | 'cenario' | 'lifestyle' | 'video' | 'provador' | 'generic') => boolean;
  theme?: 'dark' | 'light';
  userId?: string;
  // Props para geração global
  isGenerating?: boolean;
  isMinimized?: boolean;
  generationProgress?: number;
  generationText?: string;
  onSetGenerating?: (value: boolean) => void;
  onSetMinimized?: (value: boolean) => void;
  onSetProgress?: (value: number) => void;
  onSetLoadingText?: (value: string) => void;
  isAnyGenerationRunning?: boolean;
}

// Frases de loading para Product Studio
const LOADING_PHRASES = [
  "Preparando o estúdio fotográfico...",
  "Ajustando a iluminação perfeita...",
  "Posicionando o produto...",
  "Renderizando em alta qualidade...",
  "Aplicando acabamentos profissionais...",
  "Criando fundo neutro de estúdio...",
  "Processando texturas e detalhes...",
  "Otimizando sombras e reflexos...",
  "Finalizando a composição...",
  "Quase pronto! Últimos ajustes..."
];

// Categorias de roupas
const CLOTHING_CATEGORIES = [
  'Camisetas', 'Blusas', 'Regatas', 'Tops', 'Camisas', 'Bodies',
  'Jaquetas', 'Casacos', 'Blazers', 'Moletons', 'Calças', 'Shorts',
  'Bermudas', 'Saias', 'Leggings', 'Vestidos', 'Macacões', 'Jardineiras',
  'Biquínis', 'Maiôs', 'Shorts Fitness'
];

// Categorias de calçados
const FOOTWEAR_CATEGORIES = ['Calçados', 'Tênis', 'Sandálias', 'Botas'];

// Categorias de acessórios
const ACCESSORY_CATEGORIES = ['Óculos', 'Bijuterias', 'Relógios', 'Cintos', 'Bolsas', 'Acessórios', 'Bonés', 'Chapéus', 'Tiaras', 'Lenços'];

// Ângulos por tipo de produto
const ANGLES_CONFIG = {
  clothing: [
    { id: 'front' as ProductStudioAngle, label: 'Frente', icon: 'fa-shirt' },
    { id: 'back' as ProductStudioAngle, label: 'Costas', icon: 'fa-shirt' },
    { id: 'detail' as ProductStudioAngle, label: 'Detalhe', icon: 'fa-magnifying-glass-plus' },
  ],
  footwear: [
    { id: 'front' as ProductStudioAngle, label: 'Frente', icon: 'fa-shoe-prints' },
    { id: 'back' as ProductStudioAngle, label: 'Trás', icon: 'fa-shoe-prints' },
    { id: 'top' as ProductStudioAngle, label: 'Cima', icon: 'fa-arrow-up' },
    { id: 'side-left' as ProductStudioAngle, label: 'Lateral', icon: 'fa-arrows-left-right' },
    { id: 'detail' as ProductStudioAngle, label: 'Baixo', icon: 'fa-arrow-down' },
  ],
  accessory: [
    { id: 'front' as ProductStudioAngle, label: 'Frente', icon: 'fa-glasses' },
    { id: 'back' as ProductStudioAngle, label: 'Trás', icon: 'fa-glasses' },
    { id: 'side-left' as ProductStudioAngle, label: 'Lateral Esq.', icon: 'fa-caret-left' },
    { id: 'side-right' as ProductStudioAngle, label: 'Lateral Dir.', icon: 'fa-caret-right' },
    { id: 'detail' as ProductStudioAngle, label: 'Detalhe', icon: 'fa-magnifying-glass-plus' },
  ],
};

const CATEGORIES = ['Camisetas', 'Calças', 'Calçados', 'Acessórios', 'Vestidos', 'Shorts', 'Jaquetas', 'Blusas', 'Regatas', 'Tops', 'Tênis', 'Sandálias', 'Botas', 'Óculos', 'Bijuterias', 'Bolsas'];
const COLORS = ['Preto', 'Branco', 'Azul', 'Vermelho', 'Verde', 'Amarelo', 'Rosa', 'Cinza', 'Marrom', 'Bege', 'Laranja', 'Roxo', 'Nude', 'Estampado', 'Multicolor'];

export const ProductStudioEditor: React.FC<ProductStudioEditorProps> = ({
  product,
  userCredits,
  onUpdateProduct,
  onDeductCredits,
  onAddHistoryLog,
  onBack,
  onCheckCredits,
  theme = 'dark',
  userId,
  // Props de geração global
  isGenerating: globalIsGenerating = false,
  isMinimized = false,
  generationProgress = 0,
  generationText = '',
  onSetGenerating,
  onSetMinimized,
  onSetProgress,
  onSetLoadingText,
  isAnyGenerationRunning = false
}) => {
  // Estados de edição do produto
  const [editMode, setEditMode] = useState(false);
  const [editedProduct, setEditedProduct] = useState({
    name: product.name,
    sku: product.sku,
    category: product.category || '',
    color: product.color || '',
    description: product.description || '',
  });
  const [editedAttributes, setEditedAttributes] = useState<ProductAttributes>(product.attributes || {});

  // Estado do carrossel
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Estados de seleção de ângulos
  const [selectedAngles, setSelectedAngles] = useState<ProductStudioAngle[]>([]);

  // Estado de geração local (fallback se não tiver props globais)
  const [localIsGenerating, setLocalIsGenerating] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const [localLoadingText, setLocalLoadingText] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);

  // Usar estado global se disponível, senão local
  const isGenerating = onSetGenerating ? globalIsGenerating : localIsGenerating;
  const currentProgress = onSetProgress ? generationProgress : localProgress;
  const currentLoadingText = onSetLoadingText ? generationText : localLoadingText;

  // Rotacionar frases de loading
  useEffect(() => {
    if (!isGenerating) return;

    const interval = setInterval(() => {
      setPhraseIndex(prev => (prev + 1) % LOADING_PHRASES.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isGenerating]);

  // Atualizar texto de loading baseado na frase atual
  useEffect(() => {
    if (isGenerating) {
      const setText = onSetLoadingText || setLocalLoadingText;
      setText(LOADING_PHRASES[phraseIndex]);
    }
  }, [phraseIndex, isGenerating, onSetLoadingText]);

  // Determinar tipo de produto baseado na categoria
  const getProductType = (): 'clothing' | 'footwear' | 'accessory' => {
    const category = editedProduct.category || product.category || '';
    if (FOOTWEAR_CATEGORIES.includes(category)) return 'footwear';
    if (ACCESSORY_CATEGORIES.includes(category)) return 'accessory';
    return 'clothing';
  };

  const productType = getProductType();
  const availableAngles = ANGLES_CONFIG[productType];

  // Obter todas as imagens do produto
  const productImages = useMemo(() => {
    const images: { url: string; type: string }[] = [];

    if (product.originalImages?.front?.url) {
      images.push({ url: product.originalImages.front.url, type: 'Frente' });
    }
    if (product.originalImages?.back?.url) {
      images.push({ url: product.originalImages.back.url, type: 'Costas' });
    }

    // Fallback para array de imagens legado
    if (images.length === 0 && product.images) {
      product.images.forEach((img, idx) => {
        const url = img.url || img.base64;
        if (url) {
          images.push({ url, type: `Foto ${idx + 1}` });
        }
      });
    }

    return images;
  }, [product]);

  // Calcular créditos: 2 fotos = 1 crédito, cada adicional +1
  const calculateCredits = (numAngles: number): number => {
    if (numAngles === 0) return 0;
    if (numAngles <= 2) return 1;
    return 1 + (numAngles - 2);
  };

  const creditsNeeded = calculateCredits(selectedAngles.length);

  // Toggle ângulo
  const toggleAngle = (angle: ProductStudioAngle) => {
    setSelectedAngles(prev =>
      prev.includes(angle)
        ? prev.filter(a => a !== angle)
        : [...prev, angle]
    );
  };

  // Selecionar todos os ângulos
  const selectAllAngles = () => {
    setSelectedAngles(availableAngles.map(a => a.id));
  };

  // Limpar seleção
  const clearAngles = () => {
    setSelectedAngles([]);
  };

  // Obter atributos disponíveis para a categoria
  const categoryAttributes = CATEGORY_ATTRIBUTES[editedProduct.category] || [];

  // Salvar edições do produto
  const handleSaveEdit = () => {
    onUpdateProduct(product.id, {
      name: editedProduct.name,
      sku: editedProduct.sku,
      category: editedProduct.category,
      color: editedProduct.color,
      description: editedProduct.description,
      attributes: editedAttributes,
    });
    setEditMode(false);
  };

  // Cancelar edição
  const handleCancelEdit = () => {
    setEditedProduct({
      name: product.name,
      sku: product.sku,
      category: product.category || '',
      color: product.color || '',
      description: product.description || '',
    });
    setEditedAttributes(product.attributes || {});
    setEditMode(false);
  };

  // Minimizar modal
  const handleMinimize = () => {
    if (onSetMinimized) {
      onSetMinimized(true);
    }
  };

  // Maximizar modal (voltar do minimizado)
  const handleMaximize = () => {
    if (onSetMinimized) {
      onSetMinimized(false);
    }
  };

  // Gerar imagens
  const handleGenerate = async () => {
    if (selectedAngles.length === 0) return;

    // Verificar se há alguma geração rodando
    if (isAnyGenerationRunning) {
      alert('Aguarde a geração atual terminar antes de iniciar uma nova.');
      return;
    }

    // Verificar créditos
    if (onCheckCredits && !onCheckCredits(creditsNeeded, 'studio')) {
      return;
    }

    // Obter o ID da imagem original
    const originalImage = product.images?.[0];
    const imageId = originalImage?.id;

    if (!imageId || !userId) {
      alert('Erro: Imagem ou usuário não encontrado.');
      return;
    }

    // Iniciar geração (global ou local)
    const setGenerating = onSetGenerating || setLocalIsGenerating;
    const setProgress = onSetProgress || setLocalProgress;

    setGenerating(true);
    setProgress(10);
    setPhraseIndex(0);

    try {
      // Simular progresso enquanto a API processa
      let currentProg = 10;
      const progressInterval = setInterval(() => {
        currentProg = Math.min(currentProg + Math.random() * 8, 90);
        setProgress(Math.round(currentProg));
      }, 2500);

      // Chamar a API real
      const response = await generateProductStudioV2({
        productId: product.id,
        userId: userId,
        imageId: imageId,
        angles: selectedAngles,
      });

      clearInterval(progressInterval);
      setProgress(95);

      if (!response.success || !response.generations) {
        throw new Error(response.message || 'Erro ao gerar imagens');
      }

      // Converter resposta da API para ProductStudioImage[]
      const newImages: ProductStudioImage[] = response.generations.map((gen) => ({
        id: gen.image_id,
        url: gen.image_url,
        angle: gen.angle as ProductStudioAngle,
        createdAt: new Date().toISOString()
      }));

      setProgress(100);

      // Log de histórico
      if (onAddHistoryLog) {
        onAddHistoryLog(
          'Product Studio',
          `Gerado ${selectedAngles.length} fotos profissionais de "${product.name}"`,
          'success',
          [product],
          'ai',
          response.credits_used || creditsNeeded
        );
      }

      // Atualizar produto com as imagens geradas
      const sessionId = response.generation_id || `session-${Date.now()}`;
      const newSession: ProductStudioSession = {
        id: sessionId,
        productId: product.id,
        images: newImages,
        status: 'ready',
        createdAt: new Date().toISOString()
      };

      const currentGenerated = product.generatedImages || {
        studioReady: [],
        cenarioCriativo: [],
        modeloIA: [],
        productStudio: []
      };

      onUpdateProduct(product.id, {
        generatedImages: {
          ...currentGenerated,
          productStudio: [...(currentGenerated.productStudio || []), newSession]
        }
      });

      // Limpar seleção após sucesso
      setSelectedAngles([]);

    } catch (error) {
      console.error('Erro ao gerar imagens:', error);
      alert(`Erro ao gerar imagens: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      if (onAddHistoryLog) {
        onAddHistoryLog(
          'Product Studio',
          `Erro ao gerar fotos de "${product.name}": ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          'error',
          [product],
          'ai',
          0
        );
      }
    } finally {
      const setGenerating = onSetGenerating || setLocalIsGenerating;
      const setProgress = onSetProgress || setLocalProgress;
      setGenerating(false);
      setProgress(0);
      if (onSetMinimized) onSetMinimized(false);
    }
  };

  return (
    <div className={'flex-1 overflow-y-auto p-4 md:p-6 ' + (theme === 'dark' ? 'bg-black' : 'bg-gray-50')}>
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700' : 'bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-100 shadow-sm') + ' w-10 h-10 rounded-xl flex items-center justify-center transition-all'}
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <div>
              <h1 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold'}>Product Studio</h1>
              <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>{product.name}</p>
            </div>
          </div>
          <div className={'flex items-center gap-1.5 px-3 py-1.5 rounded-lg ' + (theme === 'dark' ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-200 shadow-sm')}>
            <i className="fas fa-coins text-pink-400 text-xs"></i>
            <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-sm'}>{userCredits}</span>
          </div>
        </div>

        {/* LAYOUT 2 COLUNAS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* COLUNA ESQUERDA - Produto */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className="space-y-4">

            {/* Container de Imagem - Adaptável à proporção */}
            <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border overflow-hidden'}>
              {/* Área principal da imagem - altura flexível */}
              <div className={'relative flex items-center justify-center p-4 min-h-[300px] max-h-[500px] ' + (theme === 'dark' ? 'bg-neutral-800/50' : 'bg-gray-100')}>
                {productImages.length > 0 ? (
                  <>
                    <img
                      src={productImages[currentImageIndex]?.url}
                      alt={product.name}
                      className="max-w-full max-h-[450px] object-contain rounded-lg"
                    />
                    {/* Badge do tipo da foto */}
                    <div className="absolute top-3 left-3 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-lg">
                      <span className="text-white text-xs font-medium">{productImages[currentImageIndex]?.type}</span>
                    </div>
                    {/* Navegação do carrossel */}
                    {productImages.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentImageIndex(prev => prev === 0 ? productImages.length - 1 : prev - 1)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                        >
                          <i className="fas fa-chevron-left"></i>
                        </button>
                        <button
                          onClick={() => setCurrentImageIndex(prev => prev === productImages.length - 1 ? 0 : prev + 1)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                        >
                          <i className="fas fa-chevron-right"></i>
                        </button>
                        {/* Indicadores */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {productImages.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setCurrentImageIndex(idx)}
                              className={`w-2 h-2 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white w-4' : 'bg-white/50'}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-64 flex items-center justify-center">
                    <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-image text-4xl'}></i>
                  </div>
                )}
              </div>

              {/* Miniaturas */}
              {productImages.length > 1 && (
                <div className={'flex gap-2 p-3 border-t ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-100')}>
                  {productImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${idx === currentImageIndex ? 'border-pink-500' : (theme === 'dark' ? 'border-neutral-700' : 'border-gray-200')}`}
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Informações do Produto */}
            <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-4'}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold'}>
                  <i className="fas fa-info-circle mr-2 text-pink-400"></i>Informações do Produto
                </h3>
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="text-pink-400 text-xs font-medium hover:underline"
                  >
                    <i className="fas fa-pen mr-1"></i>Editar
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className={(theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' text-xs font-medium'}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="text-pink-400 text-xs font-medium hover:underline"
                    >
                      Salvar
                    </button>
                  </div>
                )}
              </div>

              {!editMode ? (
                // Modo visualização
                <div className="space-y-3">
                  <div>
                    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide'}>Nome</p>
                    <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>{product.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide'}>SKU</p>
                      <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm'}>{product.sku}</p>
                    </div>
                    <div>
                      <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide'}>Categoria</p>
                      <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm'}>{product.category || '-'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide'}>Cor</p>
                      <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm'}>{product.color || '-'}</p>
                    </div>
                    {product.attributes && Object.keys(product.attributes).length > 0 && (
                      <div>
                        <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide'}>Caimento</p>
                        <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm'}>{product.attributes.caimento || '-'}</p>
                      </div>
                    )}
                  </div>
                  {product.description && (
                    <div>
                      <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide'}>Descrição</p>
                      <p className={(theme === 'dark' ? 'text-neutral-300' : 'text-gray-700') + ' text-xs'}>{product.description}</p>
                    </div>
                  )}
                </div>
              ) : (
                // Modo edição
                <div className="space-y-3">
                  <div>
                    <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide block mb-1'}>Nome</label>
                    <input
                      type="text"
                      value={editedProduct.name}
                      onChange={(e) => setEditedProduct(prev => ({ ...prev, name: e.target.value }))}
                      className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide block mb-1'}>SKU</label>
                      <input
                        type="text"
                        value={editedProduct.sku}
                        onChange={(e) => setEditedProduct(prev => ({ ...prev, sku: e.target.value }))}
                        className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}
                      />
                    </div>
                    <div>
                      <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide block mb-1'}>Categoria</label>
                      <select
                        value={editedProduct.category}
                        onChange={(e) => setEditedProduct(prev => ({ ...prev, category: e.target.value }))}
                        className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}
                      >
                        <option value="">Selecione</option>
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide block mb-1'}>Cor</label>
                      <select
                        value={editedProduct.color}
                        onChange={(e) => setEditedProduct(prev => ({ ...prev, color: e.target.value }))}
                        className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}
                      >
                        <option value="">Selecione</option>
                        {COLORS.map(color => (
                          <option key={color} value={color}>{color}</option>
                        ))}
                      </select>
                    </div>
                    {categoryAttributes.length > 0 && (
                      <div>
                        <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide block mb-1'}>{categoryAttributes[0].label}</label>
                        <select
                          value={editedAttributes[categoryAttributes[0].id] || ''}
                          onChange={(e) => setEditedAttributes(prev => ({ ...prev, [categoryAttributes[0].id]: e.target.value }))}
                          className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}
                        >
                          <option value="">Selecione</option>
                          {categoryAttributes[0].options.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide block mb-1'}>Descrição</label>
                    <textarea
                      value={editedProduct.description}
                      onChange={(e) => setEditedProduct(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm resize-none'}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* COLUNA DIREITA - Configurações */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className="space-y-4">

            {/* Info do tipo de produto detectado */}
            <div className={(theme === 'dark' ? 'bg-gradient-to-r from-pink-500/10 to-orange-500/10 border-pink-500/20' : 'bg-gradient-to-r from-pink-100 to-orange-100 border-pink-200') + ' rounded-xl p-4 border'}>
              <div className="flex items-center gap-3">
                <div className={(theme === 'dark' ? 'bg-pink-500/20' : 'bg-pink-200') + ' w-10 h-10 rounded-lg flex items-center justify-center'}>
                  <i className={(theme === 'dark' ? 'text-pink-400' : 'text-pink-600') + ' fas ' + (productType === 'footwear' ? 'fa-shoe-prints' : productType === 'accessory' ? 'fa-glasses' : 'fa-shirt')}></i>
                </div>
                <div>
                  <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>
                    {productType === 'footwear' ? 'Calçado' : productType === 'accessory' ? 'Acessório' : 'Roupa'}
                  </p>
                  <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs'}>
                    {availableAngles.length} ângulos disponíveis
                  </p>
                </div>
              </div>
            </div>

            {/* Seleção de Ângulos */}
            <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-4'}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold'}>
                  <i className="fas fa-camera mr-2 text-pink-400"></i>Selecione os Ângulos
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllAngles}
                    className={(theme === 'dark' ? 'text-pink-400 hover:text-pink-300' : 'text-pink-500 hover:text-pink-600') + ' text-[10px] font-medium'}
                  >
                    Todos
                  </button>
                  <span className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-300')}>|</span>
                  <button
                    onClick={clearAngles}
                    className={(theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' text-[10px] font-medium'}
                  >
                    Limpar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {availableAngles.map(angle => {
                  const isSelected = selectedAngles.includes(angle.id);
                  return (
                    <button
                      key={angle.id}
                      onClick={() => toggleAngle(angle.id)}
                      className={'p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ' +
                        (isSelected
                          ? 'bg-gradient-to-r from-pink-500/20 to-orange-500/20 border-pink-500 text-pink-400'
                          : (theme === 'dark'
                            ? 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600'
                            : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300')
                        )
                      }
                    >
                      <i className={`fas ${angle.icon} text-xl`}></i>
                      <span className="text-xs font-medium">{angle.label}</span>
                      {isSelected && (
                        <i className="fas fa-check-circle text-pink-400 text-sm"></i>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Resumo de Créditos */}
            <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-4'}>
              <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>
                <i className="fas fa-receipt mr-2 text-pink-400"></i>Resumo
              </h3>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-sm'}>Fotos selecionadas</span>
                  <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>{selectedAngles.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-sm'}>Créditos necessários</span>
                  <span className="text-pink-400 text-sm font-bold">{creditsNeeded}</span>
                </div>
                <div className={'h-px my-2 ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-200')}></div>
                <div className="flex items-center justify-between">
                  <span className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-sm'}>Seus créditos</span>
                  <span className={(userCredits >= creditsNeeded ? 'text-green-400' : 'text-red-400') + ' text-sm font-bold'}>{userCredits}</span>
                </div>
              </div>

              {/* Explicação de créditos */}
              <div className={(theme === 'dark' ? 'bg-neutral-800/50' : 'bg-gray-50') + ' rounded-lg p-3 mt-3'}>
                <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>
                  <i className="fas fa-info-circle mr-1"></i>
                  2 fotos = 1 crédito. Cada foto adicional = +1 crédito.
                </p>
              </div>
            </div>

            {/* Botão Criar */}
            <button
              onClick={handleGenerate}
              disabled={selectedAngles.length === 0 || isGenerating || userCredits < creditsNeeded || isAnyGenerationRunning}
              className={'w-full py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ' +
                (isGenerating
                  ? 'bg-pink-600 cursor-wait'
                  : (selectedAngles.length === 0 || userCredits < creditsNeeded || isAnyGenerationRunning)
                    ? (theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-300') + ' cursor-not-allowed opacity-50'
                    : 'bg-gradient-to-r from-pink-500 to-orange-400 hover:opacity-90 shadow-lg shadow-pink-500/25'
                )
              }
            >
              {isGenerating ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>Gerando... {currentProgress}%</span>
                </>
              ) : isAnyGenerationRunning ? (
                <>
                  <i className="fas fa-clock"></i>
                  <span>Aguardando outra geração...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-wand-magic-sparkles"></i>
                  <span>Criar {selectedAngles.length > 0 ? `${selectedAngles.length} Foto${selectedAngles.length > 1 ? 's' : ''}` : 'Fotos'}</span>
                </>
              )}
            </button>

            {/* Aviso de créditos insuficientes */}
            {userCredits < creditsNeeded && selectedAngles.length > 0 && (
              <p className="text-center text-red-400 text-xs">
                <i className="fas fa-exclamation-triangle mr-1"></i>
                Créditos insuficientes
              </p>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* FOTOS GERADAS */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {product.generatedImages?.productStudio && product.generatedImages.productStudio.length > 0 && (
              <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-4 mt-4'}>
                <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>
                  <i className="fas fa-images mr-2 text-green-400"></i>Fotos Geradas
                </h3>

                {product.generatedImages.productStudio.map((session, sessionIdx) => (
                  <div key={session.id || sessionIdx} className="mb-4 last:mb-0">
                    {product.generatedImages!.productStudio!.length > 1 && (
                      <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide mb-2'}>
                        Sessão {sessionIdx + 1}
                      </p>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                      {session.images.map((img, imgIdx) => (
                        <div
                          key={img.id || imgIdx}
                          className={'relative rounded-lg overflow-hidden border ' + (theme === 'dark' ? 'border-neutral-700' : 'border-gray-200')}
                        >
                          <img
                            src={img.url}
                            alt={`${img.angle} view`}
                            className="w-full aspect-square object-cover"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                            <span className="text-white text-[10px] font-medium capitalize">{img.angle}</span>
                          </div>
                          {/* Botão de download */}
                          <a
                            href={img.url}
                            download={`${product.sku}-${img.angle}.png`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute top-2 right-2 w-6 h-6 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                          >
                            <i className="fas fa-download text-[10px]"></i>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL DE LOADING - Full Screen com Blur */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {isGenerating && !isMinimized && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop com blur */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl"></div>

          {/* Container do conteúdo */}
          <div className="relative z-10 flex flex-col items-center justify-center max-w-md mx-auto p-6">
            {/* Animação Lottie */}
            <div className="w-64 h-64 mb-6">
              <DotLottieReact
                src="https://lottie.host/d29d70f3-bf03-4212-b53f-932dbefb9077/kIkLDFupvi.lottie"
                loop
                autoplay
                style={{ width: '100%', height: '100%' }}
              />
            </div>

            {/* Título */}
            <h2 className="text-white text-2xl font-bold mb-2 text-center">
              Criando suas fotos...
            </h2>

            {/* Frase de loading */}
            <p className="text-neutral-400 text-sm mb-6 text-center min-h-[20px] transition-all duration-300">
              {currentLoadingText}
            </p>

            {/* Barra de progresso */}
            <div className="w-full max-w-xs mb-4">
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-orange-400 rounded-full transition-all duration-500"
                  style={{ width: `${currentProgress}%` }}
                ></div>
              </div>
              <p className="text-white text-sm font-medium text-center mt-2">
                {currentProgress}%
              </p>
            </div>

            {/* Info do produto sendo gerado */}
            <div className="bg-neutral-900/80 rounded-xl p-4 border border-neutral-800 mb-6 w-full max-w-xs">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={productImages[0]?.url || ''}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{product.name}</p>
                  <p className="text-neutral-500 text-xs">
                    {selectedAngles.length} foto{selectedAngles.length > 1 ? 's' : ''} • {creditsNeeded} crédito{creditsNeeded > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Botão Minimizar */}
            <button
              onClick={handleMinimize}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium transition-all"
            >
              <i className="fas fa-minus"></i>
              <span>Minimizar e continuar navegando</span>
            </button>

            <p className="text-neutral-600 text-xs mt-3 text-center">
              A geração continuará em segundo plano
            </p>
          </div>
        </div>
      )}

      {/* BARRA MINIMIZADA - Renderizada no App.tsx para aparecer em todas as páginas */}
    </div>
  );
};
