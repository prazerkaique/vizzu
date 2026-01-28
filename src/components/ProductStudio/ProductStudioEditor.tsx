// ═══════════════════════════════════════════════════════════════
// VIZZU - Product Studio Editor (Página 2)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo, useEffect } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Product, HistoryLog, ProductAttributes, CATEGORY_ATTRIBUTES, ProductStudioSession, ProductStudioImage, ProductStudioAngle } from '../../types';
import { generateProductStudioV2, ProductPresentationStyle } from '../../lib/api/studio';
import { ProductStudioResult } from './ProductStudioResult';
import { smartDownload } from '../../utils/downloadHelper';

// Estilos CSS para animação de cor no Lottie (lilás → rosa → laranja)
// Usa steps discretos para evitar passar pelo verde
const lottieColorStyles = `
  @keyframes colorCycle {
    0%, 100% { filter: sepia(1) saturate(3) hue-rotate(260deg) brightness(1.1); }   /* Lilás */
    33% { filter: sepia(1) saturate(3) hue-rotate(300deg) brightness(1.1); }        /* Rosa */
    66% { filter: sepia(1) saturate(2.5) hue-rotate(330deg) brightness(1.2); }      /* Laranja */
  }

  .vizzu-lottie-gradient {
    animation: colorCycle 3s ease-in-out infinite;
  }
`;

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
  // Navegação para outras ferramentas
  onNavigate?: (page: 'look-composer' | 'lifestyle' | 'provador', productId?: string, imageUrl?: string) => void;
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
const ACCESSORY_CATEGORIES = ['Óculos', 'Bijuterias', 'Relógios', 'Cintos', 'Bolsas', 'Acessórios', 'Bonés', 'Chapéus', 'Tiaras', 'Lenços', 'Outros Acessórios'];

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
  isAnyGenerationRunning = false,
  onNavigate
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

  // Estado do carrossel e toggle de visualização
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'original' | 'otimizada'>('original'); // Começa em 'original' por padrão

  // Estados de seleção de ângulos
  const [selectedAngles, setSelectedAngles] = useState<ProductStudioAngle[]>([]);

  // Estado do estilo de apresentação (Ghost Mannequin ou Flat Lay)
  const [presentationStyle, setPresentationStyle] = useState<ProductPresentationStyle>('ghost-mannequin');
  const [showPresentationTooltip, setShowPresentationTooltip] = useState(false);
  const [expandedStyleImage, setExpandedStyleImage] = useState<{ url: string; label: string } | null>(null);

  // Estado de geração local (fallback se não tiver props globais)
  const [localIsGenerating, setLocalIsGenerating] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const [localLoadingText, setLocalLoadingText] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);

  // Estado para mostrar página de resultado após geração
  const [showResult, setShowResult] = useState(false);
  const [currentSession, setCurrentSession] = useState<ProductStudioSession | null>(null);

  // Estado para modal de ângulo sem referência
  const [showNoRefModal, setShowNoRefModal] = useState(false);
  const [angleWithoutRef, setAngleWithoutRef] = useState<ProductStudioAngle | null>(null);
  const [uploadingRef, setUploadingRef] = useState(false);

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
    if (product.originalImages?.['side-left']?.url) {
      images.push({ url: product.originalImages['side-left'].url, type: 'Lateral Esq.' });
    }
    if (product.originalImages?.['side-right']?.url) {
      images.push({ url: product.originalImages['side-right'].url, type: 'Lateral Dir.' });
    }
    if (product.originalImages?.top?.url) {
      images.push({ url: product.originalImages.top.url, type: 'Cima' });
    }
    if (product.originalImages?.detail?.url) {
      images.push({ url: product.originalImages.detail.url, type: 'Detalhe' });
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

  // Obter imagens geradas do Product Studio
  const generatedImages = useMemo(() => {
    const images: { url: string; angle: string; sessionId: string }[] = [];
    const sessions = product.generatedImages?.productStudio || [];

    sessions.forEach(session => {
      session.images.forEach(img => {
        images.push({
          url: img.url,
          angle: img.angle,
          sessionId: session.id
        });
      });
    });

    return images;
  }, [product]);

  // Imagem principal: prioriza gerada (frente) > gerada (qualquer) > original
  const mainImage = useMemo(() => {
    // Primeiro, procurar imagem de frente gerada
    const frontGenerated = generatedImages.find(img => img.angle === 'front');
    if (frontGenerated) return { url: frontGenerated.url, type: 'Gerada - Frente', isGenerated: true };

    // Se não tem frente gerada, pegar primeira gerada
    if (generatedImages.length > 0) {
      const angleLabels: Record<string, string> = {
        'front': 'Frente', 'back': 'Costas', 'side-left': 'Lateral Esq.',
        'side-right': 'Lateral Dir.', '45-left': '45° Esq.', '45-right': '45° Dir.',
        'top': 'Cima', 'detail': 'Detalhe'
      };
      return {
        url: generatedImages[0].url,
        type: `Gerada - ${angleLabels[generatedImages[0].angle] || generatedImages[0].angle}`,
        isGenerated: true
      };
    }

    // Fallback para imagem original
    if (productImages.length > 0) {
      return { url: productImages[0].url, type: productImages[0].type, isGenerated: false };
    }

    return null;
  }, [generatedImages, productImages]);

  // Verificar se produto está otimizado
  const isOptimized = generatedImages.length > 0;

  // Ajustar viewMode automaticamente quando o estado de otimização muda
  useEffect(() => {
    if (isOptimized) {
      // Se produto está otimizado, mostrar imagens otimizadas por padrão
      setViewMode('otimizada');
    } else {
      // Se não está otimizado, forçar viewMode para original
      setViewMode('original');
    }
    setCurrentImageIndex(0);
  }, [isOptimized]);

  // Mapear quais imagens de referência estão disponíveis
  // IMPORTANTE: Só considera disponível se tiver o ID (necessário para a API)
  const availableReferences = useMemo(() => {
    const refs: Record<ProductStudioAngle, boolean> = {
      'front': false,
      'back': false,
      'side-left': false,
      'side-right': false,
      '45-left': false,
      '45-right': false,
      'top': false,
      'detail': false,
    };

    // Verificar originalImages - PRECISA ter ID para funcionar
    if (product.originalImages?.front?.id) refs.front = true;
    if (product.originalImages?.back?.id) refs.back = true;
    if (product.originalImages?.['side-left']?.id) refs['side-left'] = true;
    if (product.originalImages?.['side-right']?.id) refs['side-right'] = true;
    if (product.originalImages?.top?.id) refs.top = true;
    if (product.originalImages?.detail?.id) refs.detail = true;
    if (product.originalImages?.['45-left']?.id) refs['45-left'] = true;
    if (product.originalImages?.['45-right']?.id) refs['45-right'] = true;

    // Fallback: se não tem originalImages mas tem images legado (com ID)
    if (!refs.front && product.images?.[0]?.id) refs.front = true;
    if (!refs.back && product.images?.[1]?.id) refs.back = true;

    return refs;
  }, [product]);

  // Labels amigáveis para os ângulos
  const angleLabels: Record<ProductStudioAngle, string> = {
    'front': 'Frente',
    'back': 'Costas',
    'side-left': 'Lateral Esquerda',
    'side-right': 'Lateral Direita',
    '45-left': '45° Esquerda',
    '45-right': '45° Direita',
    'top': 'Vista de Cima',
    'detail': 'Detalhe',
  };

  // Calcular créditos: 10 créditos por foto
  const calculateCredits = (numAngles: number): number => {
    return numAngles * 10;
  };

  const creditsNeeded = calculateCredits(selectedAngles.length);

  // Toggle ângulo - verifica se tem referência antes de selecionar
  const toggleAngle = (angle: ProductStudioAngle) => {
    // Se já está selecionado, apenas remove
    if (selectedAngles.includes(angle)) {
      setSelectedAngles(prev => prev.filter(a => a !== angle));
      return;
    }

    // Se é front, sempre permite (é obrigatório ter)
    if (angle === 'front') {
      setSelectedAngles(prev => [...prev, angle]);
      return;
    }

    // Verifica se tem referência
    if (!availableReferences[angle]) {
      // Não tem referência - mostra modal de aviso
      setAngleWithoutRef(angle);
      setShowNoRefModal(true);
      return;
    }

    // Tem referência - adiciona normalmente
    setSelectedAngles(prev => [...prev, angle]);
  };

  // Selecionar todos os ângulos (apenas os que têm referência)
  const selectAllAngles = () => {
    const anglesWithRef = availableAngles
      .filter(a => a.id === 'front' || availableReferences[a.id])
      .map(a => a.id);
    setSelectedAngles(anglesWithRef);
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

  // ═══════════════════════════════════════════════════════════════
  // Callbacks para página de resultado
  // ═══════════════════════════════════════════════════════════════

  // Salvar sessão (já está salva no produto, só marca como "confirmada")
  const handleResultSave = () => {
    // Session was already saved in product during generation
    // This callback confirms user wants to keep the images

    // After saving, stay on product page (don't return to list)
    setShowResult(false);
    setCurrentSession(null);
    // Produto já está atualizado com as imagens geradas
  };

  // Gerar novamente (volta para seleção de ângulos)
  const handleResultRegenerate = () => {
    if (currentSession) {
      // Restaurar os ângulos que foram gerados para facilitar regeneração
      setSelectedAngles(currentSession.images.map(img => img.angle));
    }
    setShowResult(false);
    setCurrentSession(null);
  };

  // Excluir sessão
  const handleResultDelete = () => {
    if (!currentSession) return;

    // Remover a sessão do produto
    const currentGenerated = product.generatedImages || {
      studioReady: [],
      cenarioCriativo: [],
      modeloIA: [],
      productStudio: []
    };

    const updatedSessions = (currentGenerated.productStudio || []).filter(
      s => s.id !== currentSession.id
    );

    onUpdateProduct(product.id, {
      generatedImages: {
        ...currentGenerated,
        productStudio: updatedSessions
      }
    });

    // Log de histórico
    if (onAddHistoryLog) {
      onAddHistoryLog(
        'Product Studio',
        `Excluído ${currentSession.images.length} fotos de "${product.name}"`,
        'success',
        [product],
        'manual',
        0
      );
    }

    setShowResult(false);
    setCurrentSession(null);
  };

  // Voltar da página de resultado
  const handleResultBack = () => {
    setShowResult(false);
    setCurrentSession(null);
  };

  // Obter imagem atual do carrossel (para download e navegação)
  const getCurrentCarouselImage = () => {
    if (viewMode === 'otimizada' && generatedImages.length > 0) {
      const safeIndex = Math.min(currentImageIndex, generatedImages.length - 1);
      return generatedImages[safeIndex];
    }
    return null;
  };

  // Download da imagem gerada atual
  const handleDownloadMainImage = async (format: 'png' | 'jpeg') => {
    const currentImg = getCurrentCarouselImage();
    if (!currentImg) return;

    try {
      if (format === 'jpeg') {
        // Converte para JPEG via canvas antes de fazer download
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = 'anonymous';

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = currentImg.url;
        });

        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        await smartDownload(dataUrl, {
          filename: `${product.sku}_${currentImg.angle}.jpg`,
          shareTitle: 'Vizzu Product Studio',
          shareText: `${product.name}`
        });
      } else {
        await smartDownload(currentImg.url, {
          filename: `${product.sku}_${currentImg.angle}.png`,
          shareTitle: 'Vizzu Product Studio',
          shareText: `${product.name}`
        });
      }
    } catch {
      window.open(currentImg.url, '_blank');
    }
  };

  // Navegar para outras ferramentas com o produto
  const handleNavigateToFeature = (destination: 'look-composer' | 'lifestyle' | 'provador') => {
    if (onNavigate) {
      const currentImg = getCurrentCarouselImage();
      onNavigate(destination, product.id, currentImg?.url || generatedImages[0]?.url);
    }
  };

  // Maximizar modal (voltar do minimizado)
  const handleMaximize = () => {
    if (onSetMinimized) {
      onSetMinimized(false);
    }
  };

  // Função para adicionar referência a um ângulo (chamada pelo modal)
  const handleAddReference = async (file: File) => {
    if (!angleWithoutRef || !userId) return;

    setUploadingRef(true);
    try {
      // Criar FormData para upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('product_id', product.id);
      formData.append('user_id', userId);
      formData.append('angle', angleWithoutRef);

      // Fazer upload via API (supondo que existe um endpoint para isso)
      // Por enquanto, vamos usar o supabase client diretamente
      const fileName = `${userId}/${product.id}/original_${angleWithoutRef}_${Date.now()}.${file.name.split('.').pop()}`;

      // Upload para o storage
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        'https://dbdqiqehuapcicejnzyd.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiZHFpcWVodWFwY2ljZWpuenlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NjkwNTAsImV4cCI6MjA1MjU0NTA1MH0.gHFzWFLKHrNsRNB-8P8R1WKp_c__-Ft5NfvkwHPF_Ns'
      );

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const publicUrl = `https://dbdqiqehuapcicejnzyd.supabase.co/storage/v1/object/public/products/${fileName}`;

      // Inserir registro na tabela product_images
      const { data: imageData, error: insertError } = await supabase
        .from('product_images')
        .insert({
          product_id: product.id,
          user_id: userId,
          type: 'original',
          angle: angleWithoutRef,
          storage_path: fileName,
          url: publicUrl,
          file_name: file.name,
          mime_type: file.type,
          is_primary: false
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Atualizar o produto com a nova referência
      const newOriginalImages = {
        ...product.originalImages,
        [angleWithoutRef]: {
          id: imageData.id,
          url: publicUrl,
          storagePath: fileName
        }
      };

      onUpdateProduct(product.id, {
        originalImages: newOriginalImages
      });

      // Fechar modal e selecionar o ângulo
      setShowNoRefModal(false);
      setSelectedAngles(prev => [...prev, angleWithoutRef]);
      setAngleWithoutRef(null);

    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao adicionar imagem de referência. Tente novamente.');
    } finally {
      setUploadingRef(false);
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

    // Obter os IDs das imagens originais para TODOS os ângulos disponíveis
    const imageIds: Record<string, string | undefined> = {};

    // Função auxiliar para obter ID de uma imagem
    const getImageId = (img: { id?: string; url?: string } | undefined): string | undefined => {
      if (!img) return undefined;
      // Prioriza o ID, mas se não tiver, tenta extrair do URL ou usa a URL como fallback
      if (img.id) return img.id;
      return undefined;
    };

    // Front (obrigatório)
    imageIds.front = getImageId(product.originalImages?.front) || getImageId(product.images?.[0]);

    // Back
    imageIds.back = getImageId(product.originalImages?.back) || getImageId(product.images?.[1]);

    // Outros ângulos
    imageIds['side-left'] = getImageId(product.originalImages?.['side-left']);
    imageIds['side-right'] = getImageId(product.originalImages?.['side-right']);
    imageIds.top = getImageId(product.originalImages?.top);
    imageIds.detail = getImageId(product.originalImages?.detail);
    imageIds['45-left'] = getImageId(product.originalImages?.['45-left']);
    imageIds['45-right'] = getImageId(product.originalImages?.['45-right']);

    if (!imageIds.front || !userId) {
      alert('Erro: Imagem frontal ou usuário não encontrado.');
      return;
    }

    // Iniciar geração (global ou local)
    const setGenerating = onSetGenerating || setLocalIsGenerating;
    const setProgress = onSetProgress || setLocalProgress;

    setGenerating(true);
    setProgress(10);
    setPhraseIndex(0);

    try {
      // Simular progresso enquanto a API processa (progressivo e suave)
      let currentProg = 10;
      const progressInterval = setInterval(() => {
        // Incremento fixo que desacelera conforme se aproxima de 90%
        const remaining = 90 - currentProg;
        const increment = Math.max(remaining * 0.08, 0.5);
        currentProg = Math.min(currentProg + increment, 90);
        setProgress(Math.round(currentProg));
      }, 1000);

      // Montar objeto de referências (excluindo front que já vai no imageId)
      const referenceImages: Record<string, string> = {};
      if (imageIds.back) referenceImages.back = imageIds.back;
      if (imageIds['side-left']) referenceImages['side-left'] = imageIds['side-left'];
      if (imageIds['side-right']) referenceImages['side-right'] = imageIds['side-right'];
      if (imageIds['45-left']) referenceImages['45-left'] = imageIds['45-left'];
      if (imageIds['45-right']) referenceImages['45-right'] = imageIds['45-right'];
      if (imageIds.top) referenceImages.top = imageIds.top;
      if (imageIds.detail) referenceImages.detail = imageIds.detail;

      // Chamar a API real
      const response = await generateProductStudioV2({
        productId: product.id,
        userId: userId,
        imageId: imageIds.front!,
        referenceImages: Object.keys(referenceImages).length > 0 ? referenceImages : undefined,
        angles: selectedAngles,
        // Estilo de apresentação (Ghost Mannequin ou Flat Lay)
        presentationStyle,
        // Informações do produto para instruções do prompt
        productInfo: {
          name: product.name,
          category: product.category || editedProduct.category,
          description: product.description || editedProduct.description,
        },
      });

      clearInterval(progressInterval);
      setProgress(95);

      if (!response.success || !response.results) {
        throw new Error(response.message || 'Erro ao gerar imagens');
      }

      // Converter resposta da API para ProductStudioImage[]
      const newImages: ProductStudioImage[] = response.results.map((result) => ({
        id: result.id,
        url: result.url,
        angle: result.angle as ProductStudioAngle,
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

      // Mostrar página de resultado
      setCurrentSession(newSession);
      setShowResult(true);

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

  // ═══════════════════════════════════════════════════════════════
  // Se tem resultado para mostrar, renderiza página de resultado
  // ═══════════════════════════════════════════════════════════════
  if (showResult && currentSession) {
    return (
      <ProductStudioResult
        product={product}
        session={currentSession}
        creditsUsed={calculateCredits(currentSession.images.length)}
        userCredits={userCredits}
        onSave={handleResultSave}
        onRegenerate={handleResultRegenerate}
        onDelete={handleResultDelete}
        onBack={handleResultBack}
        theme={theme}
      />
    );
  }

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

            {/* Container de Imagem Principal com Toggle e Carrossel */}
            <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border overflow-hidden'}>
              {/* Toggle Original / Otimizada - só aparece se tiver fotos otimizadas */}
              {isOptimized && (
                <div className={'flex items-center justify-center gap-1 p-3 border-b ' + (theme === 'dark' ? 'border-neutral-800 bg-neutral-900' : 'border-gray-100 bg-gray-50')}>
                  <button
                    onClick={() => { setViewMode('original'); setCurrentImageIndex(0); }}
                    className={'px-4 py-2 rounded-lg text-xs font-medium transition-all ' +
                      (viewMode === 'original'
                        ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-md'
                        : (theme === 'dark' ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100')
                      )
                    }
                  >
                    <i className="fas fa-image mr-1.5"></i>
                    Original
                    {productImages.length > 0 && (
                      <span className="ml-1.5 opacity-70">({productImages.length})</span>
                    )}
                  </button>
                  <button
                    onClick={() => { setViewMode('otimizada'); setCurrentImageIndex(0); }}
                    className={'px-4 py-2 rounded-lg text-xs font-medium transition-all ' +
                      (viewMode === 'otimizada'
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md'
                        : (theme === 'dark' ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100')
                      )
                    }
                  >
                    <i className="fas fa-sparkles mr-1.5"></i>
                    Otimizada
                    <span className="ml-1.5 opacity-70">({generatedImages.length})</span>
                  </button>
                </div>
              )}

              {/* Área do Carrossel */}
              {(() => {
                const currentImages = viewMode === 'otimizada' ? generatedImages : productImages;
                const safeIndex = Math.min(currentImageIndex, Math.max(0, currentImages.length - 1));
                const currentImg = currentImages[safeIndex];

                return (
                  <div className={'relative flex items-center justify-center p-4 min-h-[300px] max-h-[500px] ' + (theme === 'dark' ? 'bg-neutral-800/50' : 'bg-gray-100')}>
                    {currentImg ? (
                      <>
                        <img
                          src={viewMode === 'otimizada' ? (currentImg as any).url : (currentImg as any).url}
                          alt={product.name}
                          className="max-w-full max-h-[450px] object-contain rounded-lg"
                        />
                        {/* Badge do ângulo/tipo */}
                        <div className="absolute top-3 left-3 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-lg">
                          <span className="text-white text-xs font-medium capitalize">
                            {viewMode === 'otimizada' ? (currentImg as any).angle : (currentImg as any).type}
                          </span>
                        </div>
                        {/* Navegação do carrossel */}
                        {currentImages.length > 1 && (
                          <>
                            <button
                              onClick={() => setCurrentImageIndex(prev => prev === 0 ? currentImages.length - 1 : prev - 1)}
                              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                            >
                              <i className="fas fa-chevron-left"></i>
                            </button>
                            <button
                              onClick={() => setCurrentImageIndex(prev => prev === currentImages.length - 1 ? 0 : prev + 1)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                            >
                              <i className="fas fa-chevron-right"></i>
                            </button>
                            {/* Indicadores */}
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                              {currentImages.map((_, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setCurrentImageIndex(idx)}
                                  className={`w-2 h-2 rounded-full transition-all ${idx === safeIndex ? (viewMode === 'otimizada' ? 'bg-green-400 w-4' : 'bg-pink-400 w-4') : 'bg-white/50'}`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-64 flex flex-col items-center justify-center gap-2">
                        <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-image text-4xl'}></i>
                        <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-sm'}>
                          {viewMode === 'otimizada' ? 'Nenhuma foto otimizada ainda' : 'Nenhuma foto original'}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Miniaturas */}
              {(() => {
                const currentImages = viewMode === 'otimizada' ? generatedImages : productImages;
                const safeIndex = Math.min(currentImageIndex, Math.max(0, currentImages.length - 1));

                if (currentImages.length <= 1) return null;

                return (
                  <div className={'flex gap-2 p-3 border-t overflow-x-auto ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-100')}>
                    {currentImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                          idx === safeIndex
                            ? (viewMode === 'otimizada' ? 'border-green-500' : 'border-pink-500')
                            : (theme === 'dark' ? 'border-neutral-700' : 'border-gray-200')
                        }`}
                      >
                        <img
                          src={(img as any).url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                );
              })()}
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

            {/* Botões de Ação (só aparecem se o produto foi otimizado) */}
            {isOptimized && (
              <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-4'}>
                <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>
                  <i className="fas fa-magic mr-2 text-pink-400"></i>Usar Imagem Otimizada
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {/* Montar Look */}
                  <button
                    onClick={() => handleNavigateToFeature('look-composer')}
                    disabled={!onNavigate}
                    className={(theme === 'dark' ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30 hover:border-purple-500/50' : 'bg-gradient-to-r from-purple-100 to-pink-100 border-purple-200 hover:border-purple-300') + ' p-3 rounded-xl border transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-layer-group text-white text-xs"></i>
                    </div>
                    <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Montar Look</span>
                  </button>

                  {/* Cenário Criativo */}
                  <button
                    onClick={() => handleNavigateToFeature('lifestyle')}
                    disabled={!onNavigate}
                    className={(theme === 'dark' ? 'bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border-orange-500/30 hover:border-orange-500/50' : 'bg-gradient-to-r from-orange-100 to-yellow-100 border-orange-200 hover:border-orange-300') + ' p-3 rounded-xl border transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-orange-500 to-yellow-500 flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-mountain-sun text-white text-xs"></i>
                    </div>
                    <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Cenário Criativo</span>
                  </button>

                  {/* Vestir Cliente */}
                  <button
                    onClick={() => handleNavigateToFeature('provador')}
                    disabled={!onNavigate}
                    className={(theme === 'dark' ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/30 hover:border-blue-500/50' : 'bg-gradient-to-r from-blue-100 to-cyan-100 border-blue-200 hover:border-blue-300') + ' p-3 rounded-xl border transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-user-check text-white text-xs"></i>
                    </div>
                    <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Vestir Cliente</span>
                  </button>

                  {/* Download */}
                  <div className="relative group">
                    <button
                      className={(theme === 'dark' ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30 hover:border-green-500/50' : 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-200 hover:border-green-300') + ' w-full p-3 rounded-xl border transition-all flex items-center gap-2'}
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-download text-white text-xs"></i>
                      </div>
                      <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Download</span>
                      <i className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' fas fa-chevron-down text-[8px] ml-auto'}></i>
                    </button>
                    {/* Dropdown de formatos */}
                    <div className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200 shadow-lg') + ' absolute bottom-full left-0 right-0 mb-1 rounded-lg border overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10'}>
                      <button
                        onClick={() => handleDownloadMainImage('png')}
                        className={(theme === 'dark' ? 'hover:bg-neutral-700 text-white' : 'hover:bg-gray-50 text-gray-900') + ' w-full px-3 py-2 text-xs text-left flex items-center gap-2'}
                      >
                        <i className="fas fa-file-image text-pink-400"></i>
                        PNG (Alta qualidade)
                      </button>
                      <button
                        onClick={() => handleDownloadMainImage('jpeg')}
                        className={(theme === 'dark' ? 'hover:bg-neutral-700 text-white border-t border-neutral-700' : 'hover:bg-gray-50 text-gray-900 border-t border-gray-100') + ' w-full px-3 py-2 text-xs text-left flex items-center gap-2'}
                      >
                        <i className="fas fa-file-image text-orange-400"></i>
                        JPEG (Arquivo menor)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                  const hasRef = angle.id === 'front' || availableReferences[angle.id];
                  return (
                    <button
                      key={angle.id}
                      onClick={() => toggleAngle(angle.id)}
                      className={'p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 relative ' +
                        (isSelected
                          ? 'bg-gradient-to-r from-pink-500/20 to-orange-500/20 border-pink-500 text-pink-400'
                          : (theme === 'dark'
                            ? 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600'
                            : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300')
                        )
                      }
                    >
                      {/* Indicador de referência */}
                      <div className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                        hasRef
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        <i className={`fas ${hasRef ? 'fa-check' : 'fa-exclamation'}`}></i>
                      </div>
                      <i className={`fas ${angle.icon} text-xl`}></i>
                      <span className="text-xs font-medium">{angle.label}</span>
                      {isSelected && (
                        <i className="fas fa-check-circle text-pink-400 text-sm"></i>
                      )}
                      {!hasRef && !isSelected && (
                        <span className={(theme === 'dark' ? 'text-orange-400/70' : 'text-orange-500') + " text-[10px]"}>Sem ref.</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legenda */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-neutral-800/50">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
                    <i className="fas fa-check text-green-400 text-[8px]"></i>
                  </div>
                  <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + " text-[10px]"}>Com referência</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <i className="fas fa-exclamation text-orange-400 text-[8px]"></i>
                  </div>
                  <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + " text-[10px]"}>Sem referência</span>
                </div>
              </div>
            </div>

            {/* Estilo de Apresentação - Apenas para roupas */}
            {productType === 'clothing' && (
              <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-4'}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold'}>
                    <i className="fas fa-tshirt mr-2 text-pink-400"></i>Estilo de Apresentação
                  </h3>
                  {/* Tooltip com exemplos visuais */}
                  <div className="relative">
                    <button
                      onClick={() => setShowPresentationTooltip(!showPresentationTooltip)}
                      onBlur={() => setTimeout(() => setShowPresentationTooltip(false), 200)}
                      className={(theme === 'dark' ? 'text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700' : 'text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200') + ' w-6 h-6 rounded-full flex items-center justify-center transition-all'}
                    >
                      <i className="fas fa-question text-[10px]"></i>
                    </button>
                    {/* Dropdown com exemplos visuais */}
                    {showPresentationTooltip && (
                      <div className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200 shadow-xl') + ' absolute right-0 top-8 w-80 rounded-xl border p-4 z-20'}>
                        <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs text-center mb-3'}>
                          Exemplos de cada estilo:
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {/* Ghost Mannequin Example */}
                          <div className="text-center">
                            <div
                              className={'relative rounded-lg overflow-hidden border-2 mb-2 cursor-pointer transition-all hover:scale-105 ' + (theme === 'dark' ? 'border-purple-500/50' : 'border-purple-300')}
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedStyleImage({
                                  url: 'https://dbdqiqehuapcicejnzyd.supabase.co/storage/v1/object/public/products/314df8ec-687f-44d6-bc11-f00f0bab2bde/e587218a-950f-43f6-8de4-ff65e6c4608d/studio_front_ghost_2K_27315fcf-1e7c-481f-a9e6-c9ff9db9bfd4.png',
                                  label: 'Ghost Mannequin'
                                });
                              }}
                            >
                              <img
                                src="https://dbdqiqehuapcicejnzyd.supabase.co/storage/v1/object/public/products/314df8ec-687f-44d6-bc11-f00f0bab2bde/e587218a-950f-43f6-8de4-ff65e6c4608d/studio_front_ghost_2K_27315fcf-1e7c-481f-a9e6-c9ff9db9bfd4.png"
                                alt="Ghost Mannequin"
                                className="w-full h-32 object-cover"
                              />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
                                <i className="fas fa-search-plus text-white text-lg"></i>
                              </div>
                            </div>
                            <span className="text-purple-400 text-xs font-semibold">Ghost Mannequin</span>
                            <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] mt-1'}>
                              Vestido em corpo invisível
                            </p>
                          </div>
                          {/* Flat Lay Example */}
                          <div className="text-center">
                            <div
                              className={'relative rounded-lg overflow-hidden border-2 mb-2 cursor-pointer transition-all hover:scale-105 ' + (theme === 'dark' ? 'border-blue-500/50' : 'border-blue-300')}
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedStyleImage({
                                  url: 'https://dbdqiqehuapcicejnzyd.supabase.co/storage/v1/object/public/products/314df8ec-687f-44d6-bc11-f00f0bab2bde/e587218a-950f-43f6-8de4-ff65e6c4608d/studio_front_flatlay_2K_38960141-980e-47f2-b84b-848d21da7430.png',
                                  label: 'Flat Lay'
                                });
                              }}
                            >
                              <img
                                src="https://dbdqiqehuapcicejnzyd.supabase.co/storage/v1/object/public/products/314df8ec-687f-44d6-bc11-f00f0bab2bde/e587218a-950f-43f6-8de4-ff65e6c4608d/studio_front_flatlay_2K_38960141-980e-47f2-b84b-848d21da7430.png"
                                alt="Flat Lay"
                                className="w-full h-32 object-cover"
                              />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
                                <i className="fas fa-search-plus text-white text-lg"></i>
                              </div>
                            </div>
                            <span className="text-blue-400 text-xs font-semibold">Flat Lay</span>
                            <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] mt-1'}>
                              Deitado, vista de cima
                            </p>
                          </div>
                        </div>
                        <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] text-center mt-3'}>
                          <i className="fas fa-search-plus mr-1"></i>
                          Clique nas imagens para ampliar
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Ghost Mannequin */}
                  <button
                    onClick={() => setPresentationStyle('ghost-mannequin')}
                    className={'p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ' +
                      (presentationStyle === 'ghost-mannequin'
                        ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500'
                        : (theme === 'dark'
                          ? 'bg-neutral-800 border-neutral-700 hover:border-neutral-600'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300')
                      )
                    }
                  >
                    <div className={'w-12 h-12 rounded-xl flex items-center justify-center ' +
                      (presentationStyle === 'ghost-mannequin'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                        : (theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200'))
                    }>
                      <i className={'fas fa-person text-xl ' + (presentationStyle === 'ghost-mannequin' ? 'text-white' : (theme === 'dark' ? 'text-neutral-400' : 'text-gray-500'))}></i>
                    </div>
                    <span className={(presentationStyle === 'ghost-mannequin' ? 'text-purple-400' : (theme === 'dark' ? 'text-neutral-400' : 'text-gray-600')) + ' text-xs font-medium'}>
                      Ghost Mannequin
                    </span>
                    {presentationStyle === 'ghost-mannequin' && (
                      <i className="fas fa-check-circle text-purple-400 text-sm"></i>
                    )}
                  </button>

                  {/* Flat Lay */}
                  <button
                    onClick={() => setPresentationStyle('flat-lay')}
                    className={'p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ' +
                      (presentationStyle === 'flat-lay'
                        ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500'
                        : (theme === 'dark'
                          ? 'bg-neutral-800 border-neutral-700 hover:border-neutral-600'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300')
                      )
                    }
                  >
                    <div className={'w-12 h-12 rounded-xl flex items-center justify-center ' +
                      (presentationStyle === 'flat-lay'
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                        : (theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200'))
                    }>
                      <i className={'fas fa-shirt text-xl ' + (presentationStyle === 'flat-lay' ? 'text-white' : (theme === 'dark' ? 'text-neutral-400' : 'text-gray-500'))}></i>
                    </div>
                    <span className={(presentationStyle === 'flat-lay' ? 'text-blue-400' : (theme === 'dark' ? 'text-neutral-400' : 'text-gray-600')) + ' text-xs font-medium'}>
                      Flat Lay
                    </span>
                    {presentationStyle === 'flat-lay' && (
                      <i className="fas fa-check-circle text-blue-400 text-sm"></i>
                    )}
                  </button>
                </div>
              </div>
            )}

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
                  10 créditos por foto gerada.
                </p>
              </div>
            </div>

            {/* Botão Criar */}
            <button
              onClick={() => handleGenerate()}
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
            {generatedImages.length > 0 && (
              <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-4 mt-4'}>
                <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>
                  <i className="fas fa-sparkles mr-2 text-green-400"></i>Fotos Geradas
                  <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs font-normal ml-2'}>({generatedImages.length})</span>
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {generatedImages.map((img, idx) => (
                    <div
                      key={`gen-${idx}`}
                      className={'relative rounded-lg overflow-hidden border ' + (theme === 'dark' ? 'border-neutral-700 hover:border-green-500/50' : 'border-gray-200 hover:border-green-300') + ' transition-all'}
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
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* FOTOS ORIGINAIS */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {productImages.length > 0 && (
              <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-4 mt-4'}>
                <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>
                  <i className="fas fa-image mr-2 text-neutral-400"></i>Fotos Originais
                  <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs font-normal ml-2'}>({productImages.length})</span>
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {productImages.map((img, idx) => (
                    <div
                      key={`orig-${idx}`}
                      className={'relative rounded-lg overflow-hidden border ' + (theme === 'dark' ? 'border-neutral-700 hover:border-pink-500/50' : 'border-gray-200 hover:border-pink-300') + ' transition-all'}
                    >
                      <img
                        src={img.url}
                        alt={img.type}
                        className="w-full aspect-square object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                        <span className="text-white text-[10px] font-medium">{img.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL - Ângulo sem imagem de referência */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showNoRefModal && angleWithoutRef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 safe-area-all">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowNoRefModal(false);
              setAngleWithoutRef(null);
            }}
          ></div>

          {/* Modal */}
          <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + " relative z-10 w-full max-w-md rounded-2xl border overflow-hidden"}>
            {/* Header com ícone de aviso */}
            <div className="p-6 pb-4 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/20 flex items-center justify-center">
                <i className="fas fa-image text-orange-400 text-2xl"></i>
              </div>
              <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + " text-lg font-semibold mb-2"}>
                Imagem de referência necessária
              </h3>
              <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + " text-sm"}>
                O ângulo <span className="text-orange-400 font-semibold">{angleLabels[angleWithoutRef]}</span> não
                possui imagem de referência cadastrada. Isso pode comprometer o resultado da criação.
              </p>
            </div>

            {/* Pergunta */}
            <div className="px-6 pb-4">
              <div className={(theme === 'dark' ? 'bg-neutral-800/50 border-neutral-700' : 'bg-gray-50 border-gray-200') + " rounded-xl p-4 border"}>
                <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + " text-sm font-medium text-center"}>
                  Deseja adicionar a imagem de referência agora?
                </p>
              </div>
            </div>

            {/* Botões */}
            <div className="px-6 pb-6 space-y-3">
              {/* Botão de adicionar referência com input de arquivo */}
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleAddReference(file);
                    }
                  }}
                  disabled={uploadingRef}
                />
                <div className={`w-full px-4 py-3 bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 text-white rounded-xl font-medium transition-all text-center cursor-pointer flex items-center justify-center gap-2 ${uploadingRef ? 'opacity-50 cursor-wait' : ''}`}>
                  {uploadingRef ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-upload"></i>
                      <span>Sim, adicionar imagem</span>
                    </>
                  )}
                </div>
              </label>

              {/* Botão de não/desmarcar */}
              <button
                onClick={() => {
                  setShowNoRefModal(false);
                  setAngleWithoutRef(null);
                  // Não adiciona o ângulo à seleção (já não foi adicionado)
                }}
                disabled={uploadingRef}
                className={(theme === 'dark' ? 'bg-neutral-800 hover:bg-neutral-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700') + " w-full px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2"}
              >
                <i className="fas fa-times"></i>
                <span>Não, desmarcar este ângulo</span>
              </button>
            </div>

            {/* Dica */}
            <div className="px-6 pb-6">
              <div className={(theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200') + " flex items-start gap-3 rounded-xl p-3 border"}>
                <i className="fas fa-lightbulb text-blue-400 mt-0.5"></i>
                <p className={(theme === 'dark' ? 'text-blue-400/80' : 'text-blue-600') + " text-xs"}>
                  <span className="font-medium">Dica:</span> Para melhores resultados, use uma foto do produto
                  neste ângulo específico. A IA usará essa imagem como referência.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL DE LOADING - Full Screen com Blur */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {isGenerating && !isMinimized && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop com blur */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl"></div>

          {/* Container do conteúdo */}
          <div className="relative z-10 flex flex-col items-center justify-center max-w-md mx-auto p-6">
            {/* Animação Lottie com degradê de cores (lilás → laranja → rosa) */}
            <style>{lottieColorStyles}</style>
            <div className="w-64 h-64 mb-6 vizzu-lottie-gradient">
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

      {/* Lightbox Modal para visualizar imagens de estilo ampliadas */}
      {expandedStyleImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setExpandedStyleImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] mx-4">
            {/* Botão fechar */}
            <button
              onClick={() => setExpandedStyleImage(null)}
              className="absolute -top-12 right-0 text-white/80 hover:text-white transition-colors"
            >
              <i className="fas fa-times text-2xl"></i>
            </button>
            {/* Imagem ampliada */}
            <img
              src={expandedStyleImage.url}
              alt={expandedStyleImage.label}
              className="max-w-full max-h-[80vh] rounded-xl shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            {/* Label */}
            <p className="text-center text-white text-lg font-semibold mt-4">
              {expandedStyleImage.label}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
