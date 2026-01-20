// ═══════════════════════════════════════════════════════════════
// VIZZU - EditorModal (VERSÃO CORRIGIDA - TYPESCRIPT ERRORS FIXED)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Product, ProductImage, SavedModelProfile, LookComposition, Client, GeneratedImageSet, CompanySettings, CATEGORY_ATTRIBUTES } from '../../types';
import { optimizeImage } from '../../utils/imageOptimizer';
import { LookComposer } from './LookComposer';
import { deleteGeneration, generateCaption } from '../../lib/api/studio';

interface Props {
  product: Product;
  products: Product[];
  userCredits: number;
  savedModels: SavedModelProfile[];
  clients?: Client[];
  selectedClient?: Client | null;
  companyLogo?: string;
  onSaveModel: (p: SavedModelProfile) => void;
  onDeleteModel: (id: string) => void;
  onClose: () => void;
  onUpdateProduct: (id: string, u: Partial<Product>) => void;
  onDeleteProduct?: (id: string) => void;
  onDeductCredits: (n: number, r: string) => boolean;
  // FIXED: Removed 'provador' and 'refine' from type union to match App.tsx
  onGenerateImage: (p: Product, t: 'studio'|'cenario'|'lifestyle', prompt?: string, opts?: any) => Promise<{image: string|null; generationId: string|null}>;
  onCheckCredits?: (creditsNeeded: number, actionContext: 'studio' | 'cenario' | 'lifestyle' | 'video' | 'provador' | 'generic') => boolean;
  onMarkSaved?: (id: string) => void;
  onSendWhatsApp?: (client: Client, message: string, imageUrl?: string) => void;
  theme?: 'dark' | 'light';
  userId?: string;
  companySettings?: CompanySettings;
}

type ToolType = 'studio' | 'cenario' | 'lifestyle' | null;
type LifestyleStep = 'item' | 'model' | 'look' | 'orientation' | 'export';
type LookMode = 'describe' | 'composer';
type OrientationType = 'vertical' | 'horizontal';
type ExportType = 'social' | 'ecommerce';
type GalleryFilter = 'all' | 'studio' | 'cenario' | 'lifestyle';
type ImageViewType = 'front' | 'back';

const TOOL_CFG = {
  studio: { name: 'Studio Ready', icon: 'fa-store', credits: 1, desc: 'Fundo branco', fullDesc: 'Fundo branco profissional com sombra suave. Ideal para e-commerce.' },
  cenario: { name: 'Cenário Criativo', icon: 'fa-film', credits: 1, desc: 'Ambiente personalizado', fullDesc: 'Crie um ambiente promocional personalizado para seu produto.' },
  lifestyle: { name: 'Modelo IA', icon: 'fa-user-friends', credits: 1, desc: 'Humano com produto', fullDesc: 'Gere um modelo humano usando seu produto. Salve para reutilizar!' }
};

const MODEL_OPTS = {
  gender: [{ id: 'woman', label: 'Mulher' }, { id: 'man', label: 'Homem' }],
  ethnicity: [{ id: 'caucasian', label: 'Branca/Caucasiana' }, { id: 'black', label: 'Negra/Afrodescendente' }, { id: 'asian', label: 'Asiática' }, { id: 'latino', label: 'Latina/Hispânica' }, { id: 'middleeastern', label: 'Oriente Médio' }, { id: 'mixed', label: 'Mista/Parda' }],
  bodyType: [{ id: 'slim', label: 'Magro(a)' }, { id: 'athletic', label: 'Atlético(a)' }, { id: 'average', label: 'Médio' }, { id: 'curvy', label: 'Curvilíneo(a)' }, { id: 'plussize', label: 'Plus Size' }],
  ageRange: [{ id: 'young', label: '18-25 anos' }, { id: 'adult', label: '26-35 anos' }, { id: 'mature', label: '36-50 anos' }, { id: 'senior', label: '50+ anos' }]
};


const ORIENTATION_OPTIONS = [
  { id: 'vertical' as OrientationType, label: 'Vertical (9:16)', dimensions: '1080 x 1920', icon: 'fa-mobile-screen', usedFor: 'Stories, Reels, TikTok' },
  { id: 'horizontal' as OrientationType, label: 'Horizontal (16:9)', dimensions: '1920 x 1080', icon: 'fa-desktop', usedFor: 'Banners, YouTube' },
];

const EXPORT_OPTIONS = [
  { id: 'social' as ExportType, label: 'Alta Qualidade', format: 'PNG', icon: 'fa-gem', desc: 'Máxima qualidade, arquivo maior' },
  { id: 'ecommerce' as ExportType, label: 'Otimizado', format: 'JPEG', icon: 'fa-bolt', desc: 'Arquivo menor, carrega mais rápido' },
];

// Helper: Organizar imagens do produto
const getOrganizedImages = (product: Product) => {
  const frontImage = product.originalImages?.front || product.images.find(img => img.type === 'front') || product.images[0];
  const backImage = product.originalImages?.back || product.images.find(img => img.type === 'back');
  const generated = product.generatedImages || { studioReady: [], cenarioCriativo: [], modeloIA: [] };
  return { originals: { front: frontImage, back: backImage }, generated, hasBack: !!backImage };
};

// Helper: Converter imagem para JPEG (otimizado)
const convertToJpeg = (imageUrl: string, quality: number = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Não foi possível criar contexto do canvas'));
        return;
      }
      // Fundo branco para JPEG (não tem transparência)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(jpegDataUrl);
    };
    img.onerror = () => reject(new Error('Erro ao carregar imagem para conversão'));
    img.src = imageUrl;
  });
};

export const EditorModal: React.FC<Props> = ({
  product, products, userCredits, savedModels, clients = [],
  selectedClient: initialSelectedClient, companyLogo,
  onSaveModel, onDeleteModel, onClose, onUpdateProduct, onDeleteProduct,
  onDeductCredits, onGenerateImage, onCheckCredits, onMarkSaved, onSendWhatsApp,
  theme = 'dark', userId, companySettings
}) => {
  // Tool & Generation State
  const [tool, setTool] = useState<ToolType>(null);
  const [isGen, setIsGen] = useState(false);
  const [genImg, setGenImg] = useState<{ front: string | null; back: string | null }>({ front: null, back: null });
  const [genId, setGenId] = useState<string | null>(null);
  const [isFromHistory, setIsFromHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [cenPrompt, setCenPrompt] = useState('');
  
  // Image View State
  const [currentView, setCurrentView] = useState<ImageViewType>('front');
  const [viewMode, setViewMode] = useState<'original' | 'result'>('original');
  
  // Gallery State
  const [galleryFilter, setGalleryFilter] = useState<GalleryFilter>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Lifestyle Steps
  const [lifestyleStep, setLifestyleStep] = useState<LifestyleStep>('item');
  const [modelTab, setModelTab] = useState<'new'|'saved'>('new');
  const [selModelId, setSelModelId] = useState<string|null>(null);
  const [productNotes, setProductNotes] = useState(''); // Observações adicionais do produto
  const [modelSettings, setModelSettings] = useState({ gender: 'woman' as 'woman'|'man', ethnicity: 'caucasian', bodyType: 'average', ageRange: 'adult' });
  const [modelDetail, setModelDetail] = useState(''); // Detalhes do modelo (fisionomia, cabelo, altura)
  const [lookMode, setLookMode] = useState<LookMode>('describe');
  const [look, setLook] = useState<LookComposition>({});
  const [describedLook, setDescribedLook] = useState({ top: '', bottom: '', shoes: '', accessories: '' }); // Campos de texto livre
  const [orientation, setOrientation] = useState<OrientationType>('vertical');
  const [exportType, setExportType] = useState<ExportType>('social');
  
  // Modals
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [showRefine, setShowRefine] = useState(false);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [zoom, setZoom] = useState<string|null>(null);

  // Delete Generation Modal
  const [showDeleteGenModal, setShowDeleteGenModal] = useState(false);
  const [deleteGenTarget, setDeleteGenTarget] = useState<GeneratedImageSet | null>(null);
  const [isDeletingGen, setIsDeletingGen] = useState(false);

  // Caption Generation Modal
  const [showCaptionModal, setShowCaptionModal] = useState(false);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [generatedCaption, setGeneratedCaption] = useState<string | null>(null);
  const [captionCopied, setCaptionCopied] = useState(false);

  // Loading phrases
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const LOADING_PHRASES = [
    { text: 'Analisando produto...', icon: '🔍' },
    { text: 'Removendo fundo...', icon: '✂️' },
    { text: 'Ajustando iluminação...', icon: '💡' },
    { text: 'Aplicando sombras...', icon: '🌑' },
    { text: 'Refinando bordas...', icon: '✨' },
    { text: 'Otimizando cores...', icon: '🎨' },
    { text: 'Processando texturas...', icon: '🧵' },
    { text: 'Criando composição...', icon: '🖼️' },
    { text: 'Quase lá...', icon: '🚀' },
    { text: 'Finalizando...', icon: '🎯' },
  ];

  // Rotate loading phrases
  useEffect(() => {
    if (!isGen) {
      setLoadingPhraseIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingPhraseIndex(prev => (prev + 1) % LOADING_PHRASES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isGen]);

  const { originals, generated, hasBack } = getOrganizedImages(product);
  const isDark = theme === 'dark';
  const selModel = savedModels.find(m => m.id === selModelId);
  const lifestyleCredits = lookMode === 'composer' ? 2 : 1;
  
  const getCurrentOriginalImage = () => currentView === 'back' && originals.back ? (originals.back.base64 || originals.back.url) : (originals.front?.base64 || originals.front?.url);
  const getCurrentGeneratedImage = () => currentView === 'back' && genImg.back ? genImg.back : genImg.front;
  const displayImage = viewMode === 'result' && (genImg.front || genImg.back) ? getCurrentGeneratedImage() : getCurrentOriginalImage();

  // Count generated images
  const totalGenerated = generated.studioReady.length + generated.cenarioCriativo.length + generated.modeloIA.length;

  const buildModelPrompt = () => {
    const g = modelSettings.gender === 'woman' ? 'Female' : 'Male';
    const e = MODEL_OPTS.ethnicity.find(x => x.id === modelSettings.ethnicity)?.label || '';
    const b = MODEL_OPTS.bodyType.find(x => x.id === modelSettings.bodyType)?.label || '';
    const a = MODEL_OPTS.ageRange.find(x => x.id === modelSettings.ageRange)?.label || '';
    return `${g} model, ${e}, ${b}, ${a}.${modelDetail ? ' Details: ' + modelDetail : ''}`;
  };

  const buildLookItems = () => Object.entries(look).map(([slot, item]) => item ? { slot, image: item.image, name: item.name } : null).filter(Boolean) as any[];

  // Constrói descrição do look a partir dos campos de texto
  const buildDescribedLookPrompt = () => {
    const parts: string[] = [];
    if (describedLook.top.trim()) parts.push(describedLook.top.trim());
    if (describedLook.bottom.trim()) parts.push(describedLook.bottom.trim());
    if (describedLook.shoes.trim()) parts.push(describedLook.shoes.trim());
    if (describedLook.accessories.trim()) parts.push(describedLook.accessories.trim());
    return parts.length > 0 ? `Wearing: ${parts.join(', ')}` : '';
  };

  // Gera descrição automática do produto a partir da categoria e atributos
  const getProductDescription = () => {
    const category = product.category;
    const attributes = product.attributes || {};
    const parts: string[] = [category];

    // Adiciona atributos se existirem
    Object.entries(attributes).forEach(([key, value]) => {
      if (value) parts.push(value);
    });

    // Adiciona cor se existir
    if (product.color) parts.push(product.color);

    // Adiciona observações do usuário
    if (productNotes.trim()) parts.push(productNotes.trim());

    return parts.join(', ');
  };

  const getOrientationDimensions = () => ({ width: orientation === 'vertical' ? 1080 : 1920, height: orientation === 'vertical' ? 1920 : 1080, aspectRatio: orientation === 'vertical' ? '9:16' : '16:9' });

  const isStepComplete = (step: LifestyleStep): boolean => {
    switch (step) {
      case 'item': return !!product.category; // Categoria vem do produto
      case 'model': return modelTab === 'saved' ? !!selModelId : true;
      default: return true;
    }
  };

  const handleSelectTool = (t: ToolType) => {
  if ((genImg.front || genImg.back) && !isFromHistory && tool !== t && !confirm('Descartar imagem gerada?')) return;
   setGenImg({ front: null, back: null }); setGenId(null); setIsFromHistory(false); setShowRefine(false); setError(null); setTool(t === tool ? null : t); setViewMode('original');
    if (t === 'lifestyle') setLifestyleStep('item');
  };

  const handleGen = async () => {
    if (!tool || !originals.front) return;
    let cost = tool === 'lifestyle' ? lifestyleCredits : TOOL_CFG[tool].credits;

    // Verificar créditos usando o modal global (se disponível)
    if (onCheckCredits) {
      const actionContext = tool as 'studio' | 'cenario' | 'lifestyle';
      if (!onCheckCredits(cost, actionContext)) {
        // Modal foi exibido, não prosseguir
        return;
      }
    } else if (userCredits < cost) {
      // Fallback para erro simples se onCheckCredits não estiver disponível
      setError('Créditos insuficientes');
      return;
    }

    if (tool === 'cenario' && !cenPrompt.trim()) { setError('Descreva o cenário'); return; }
    if (tool === 'lifestyle' && modelTab === 'saved' && !selModelId) { setError('Selecione um modelo'); return; }
    if (tool === 'lifestyle' && !product.category) { setError('Produto sem categoria definida'); return; }
    
    setIsGen(true); setError(null);
    
    try {
      const productCategory = product.category;
      const productDescription = getProductDescription();
      const orientationData = getOrientationDimensions();

      // Gerar FRENTE
      let frontResult: { image: string | null; generationId: string | null } = { image: null, generationId: null };

      if (tool === 'studio') {
        frontResult = await onGenerateImage(product, 'studio', undefined, { selectedImage: originals.front, imageType: 'front' });
      } else if (tool === 'cenario') {
        frontResult = await onGenerateImage(product, 'cenario', cenPrompt, { selectedImage: originals.front, imageType: 'front' });
      } else if (tool === 'lifestyle') {
        const lookItems = lookMode === 'composer' ? buildLookItems() : [];
        const clothingPrompt = lookMode === 'describe' ? buildDescribedLookPrompt() : undefined;
        const opts = modelTab === 'saved' && selModel
          ? { selectedImage: originals.front, imageType: 'front', referenceImage: selModel.referenceImage, modelPrompt: selModel.modelPrompt, clothingPrompt, lookItems: lookItems.length ? lookItems : undefined, productCategory, productDescription, orientation: orientationData, exportFormat: exportType === 'social' ? 'png' : 'svg' }
          : { selectedImage: originals.front, imageType: 'front', modelPrompt: buildModelPrompt(), clothingPrompt, lookItems: lookItems.length ? lookItems : undefined, productCategory, productDescription, orientation: orientationData, exportFormat: exportType === 'social' ? 'png' : 'svg' };
        frontResult = await onGenerateImage(product, 'lifestyle', undefined, opts);
      }

      // Gerar COSTAS (se existir)
      let backResult: { image: string | null; generationId: string | null } = { image: null, generationId: null };

      if (hasBack && originals.back) {
        if (tool === 'studio') {
          backResult = await onGenerateImage(product, 'studio', undefined, { selectedImage: originals.back, imageType: 'back' });
        } else if (tool === 'cenario') {
          backResult = await onGenerateImage(product, 'cenario', cenPrompt, { selectedImage: originals.back, imageType: 'back' });
        } else if (tool === 'lifestyle') {
          const lookItems = lookMode === 'composer' ? buildLookItems() : [];
          const clothingPrompt = lookMode === 'describe' ? buildDescribedLookPrompt() : undefined;
          const opts = modelTab === 'saved' && selModel
            ? { selectedImage: originals.back, imageType: 'back', referenceImage: selModel.referenceImage, modelPrompt: selModel.modelPrompt, clothingPrompt, lookItems: lookItems.length ? lookItems : undefined, productCategory, productDescription, orientation: orientationData, exportFormat: exportType === 'social' ? 'png' : 'svg' }
            : { selectedImage: originals.back, imageType: 'back', modelPrompt: buildModelPrompt(), clothingPrompt, lookItems: lookItems.length ? lookItems : undefined, productCategory, productDescription, orientation: orientationData, exportFormat: exportType === 'social' ? 'png' : 'svg' };
          backResult = await onGenerateImage(product, 'lifestyle', undefined, opts);
        }
      }
      
      if (frontResult?.image) { 
        setGenImg({ front: frontResult.image, back: backResult?.image || null }); 
        setGenImg({ front: frontResult.image, back: backResult?.image || null }); 
setIsFromHistory(false);
        setGenId(frontResult.generationId); 
        setViewMode('result'); 
        setCurrentView('front');
      } else {
        setError('A IA não retornou uma imagem válida.');
      }
    } catch (e: any) { setError(e.message || 'Erro na geração'); }
    finally { setIsGen(false); }
  };

const handleSave = async () => {
  if (!genImg.front) return;
  setIsSaving(true);
  try {
    // Processar imagens conforme formato de exportação
    let finalFrontImage = genImg.front;
    let finalBackImage = genImg.back || undefined;

    // Se formato otimizado (JPEG), converter as imagens
    if (exportType === 'ecommerce') {
      try {
        finalFrontImage = await convertToJpeg(genImg.front, 0.85);
        if (genImg.back) {
          finalBackImage = await convertToJpeg(genImg.back, 0.85);
        }
      } catch (conversionError) {
        console.warn('Erro na conversão para JPEG, usando imagem original:', conversionError);
        // Se falhar a conversão, usa as imagens originais
      }
    }

    const newGeneratedSet: GeneratedImageSet = {
      id: genId || `gen-${Date.now()}`,
      createdAt: new Date().toISOString(),
      tool: tool as 'studio' | 'cenario' | 'lifestyle',
      images: { front: finalFrontImage, back: finalBackImage },
      metadata: { prompt: tool === 'cenario' ? cenPrompt : undefined, orientation, exportFormat: exportType === 'ecommerce' ? 'jpeg' : 'png' }
    };

    const currentGenerated = product.generatedImages || { studioReady: [], cenarioCriativo: [], modeloIA: [] };

    if (tool === 'studio') {
      currentGenerated.studioReady = [...currentGenerated.studioReady, newGeneratedSet];
    } else if (tool === 'cenario') {
      currentGenerated.cenarioCriativo = [...currentGenerated.cenarioCriativo, newGeneratedSet];
    } else if (tool === 'lifestyle') {
      currentGenerated.modeloIA = [...currentGenerated.modeloIA, newGeneratedSet];
    }

    onUpdateProduct(product.id, {
      generatedImages: currentGenerated,
      updatedAt: new Date().toISOString()
    });

    if (genId && onMarkSaved) onMarkSaved(genId);

    // Mostrar modal de legenda se tiver configurações da empresa
    if (companySettings && companySettings.name) {
      setShowCaptionModal(true);
    } else {
      setGenImg({ front: null, back: null });
      setGenId(null);
      setViewMode('original');
    }
  } catch {
    setError('Erro ao salvar');
  } finally {
    setIsSaving(false);
  }
};

  const handleSaveModel = () => {
    if (!newModelName.trim() || !genImg.front) return;
    const profile: SavedModelProfile = { id: `model-${Date.now()}`, name: newModelName.trim(), referenceImage: genImg.front, settings: { ...modelSettings }, modelPrompt: buildModelPrompt(), createdAt: new Date().toISOString(), usageCount: 0 };
    onSaveModel(profile);
    setNewModelName(''); setShowSaveModal(false); setModelTab('saved'); setSelModelId(profile.id);
  };

  const handleDeleteProduct = () => {
    if (onDeleteProduct) { onDeleteProduct(product.id); onClose(); }
  };

  const getFilteredGeneratedImages = (): GeneratedImageSet[] => {
    const all: GeneratedImageSet[] = [];
    if (galleryFilter === 'all' || galleryFilter === 'studio') all.push(...generated.studioReady);
    if (galleryFilter === 'all' || galleryFilter === 'cenario') all.push(...generated.cenarioCriativo);
    if (galleryFilter === 'all' || galleryFilter === 'lifestyle') all.push(...generated.modeloIA);
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const handleDeleteGeneration = async () => {
    if (!deleteGenTarget || !userId) return;

    setIsDeletingGen(true);
    try {
      // Chama API para deletar do Supabase
      await deleteGeneration({
        generationId: deleteGenTarget.id,
        userId: userId
      });

      // Atualiza estado local removendo a imagem
      const currentGenerated = product.generatedImages || { studioReady: [], cenarioCriativo: [], modeloIA: [] };

      if (deleteGenTarget.tool === 'studio') {
        currentGenerated.studioReady = currentGenerated.studioReady.filter(g => g.id !== deleteGenTarget.id);
      } else if (deleteGenTarget.tool === 'cenario') {
        currentGenerated.cenarioCriativo = currentGenerated.cenarioCriativo.filter(g => g.id !== deleteGenTarget.id);
      } else if (deleteGenTarget.tool === 'lifestyle') {
        currentGenerated.modeloIA = currentGenerated.modeloIA.filter(g => g.id !== deleteGenTarget.id);
      }

      onUpdateProduct(product.id, {
        generatedImages: currentGenerated,
        updatedAt: new Date().toISOString()
      });

      // Limpa visualização se era a imagem sendo exibida
      if (genImg.front === deleteGenTarget.images.front) {
        setGenImg({ front: null, back: null });
        setViewMode('original');
      }

      setShowDeleteGenModal(false);
      setDeleteGenTarget(null);
    } catch (e: any) {
      setError(e.message || 'Erro ao deletar imagem');
    } finally {
      setIsDeletingGen(false);
    }
  };

  const handleGenerateCaption = async () => {
    if (!companySettings || !userId) return;

    setIsGeneratingCaption(true);
    setGeneratedCaption(null);

    try {
      const result = await generateCaption({
        userId,
        productName: product.name,
        productCategory: product.category,
        productColor: product.color,
        generationType: tool as 'studio' | 'cenario' | 'lifestyle',
        scenePrompt: tool === 'cenario' ? cenPrompt : undefined,
        companySettings: {
          name: companySettings.name,
          targetAudience: companySettings.targetAudience,
          voiceTone: companySettings.voiceTone,
          voiceExamples: companySettings.voiceExamples,
          hashtags: companySettings.hashtags,
          emojisEnabled: companySettings.emojisEnabled,
          captionStyle: companySettings.captionStyle,
          callToAction: companySettings.callToAction,
        },
      });

      if (result.caption) {
        setGeneratedCaption(result.caption);
      }
    } catch (e: any) {
      setError(e.message || 'Erro ao gerar legenda');
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  const handleCopyCaption = () => {
    if (generatedCaption) {
      navigator.clipboard.writeText(generatedCaption);
      setCaptionCopied(true);
      setTimeout(() => setCaptionCopied(false), 2000);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
      <div className={`relative w-full max-w-5xl h-[95vh] md:h-[90vh] rounded-2xl overflow-hidden flex flex-col md:flex-row ${isDark ? 'bg-neutral-900' : 'bg-white'}`}>
        
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* LEFT: Image Preview */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className={`relative w-full md:w-1/2 h-[40vh] md:h-full flex-shrink-0 ${isDark ? 'bg-neutral-950' : 'bg-gray-100'}`}>
          {/* Close Button */}
          <button onClick={onClose} className="absolute top-3 left-3 z-10 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center">
            <i className="fas fa-arrow-left text-xs"></i>
          </button>
          
          {/* Product Info */}
          <div className="absolute top-3 left-14 right-20 z-10">
            <div className={`inline-flex flex-col px-3 py-1.5 rounded-lg ${isDark ? 'bg-black/50 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm shadow-sm'}`}>
              <p className={`text-[9px] font-medium uppercase tracking-wide ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>{product.sku}</p>
              <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{product.name}</p>
            </div>
          </div>
          
          {/* Credits Badge */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 bg-black/50 rounded-full">
            <i className="fas fa-coins text-pink-400 text-[10px]"></i>
            <span className="text-white font-medium text-xs">{userCredits}</span>
          </div>
          
          {/* Main Image */}
          <div className="absolute inset-0 flex items-center justify-center p-8">
            {displayImage ? (
              <img src={displayImage} alt={product.name} className="max-w-full max-h-full object-contain rounded-lg cursor-zoom-in" onClick={() => setZoom(displayImage)} />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-neutral-800' : 'bg-gray-200'}`}>
                <i className={`fas fa-image text-4xl ${isDark ? 'text-neutral-700' : 'text-gray-400'}`}></i>
              </div>
            )}
          </div>
          
          {/* Front/Back Toggle (se tem costas) */}
          {hasBack && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 p-1 bg-black/60 rounded-lg">
              <button onClick={() => setCurrentView('front')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${currentView === 'front' ? 'bg-white text-black' : 'text-white/70 hover:text-white'}`}>
                <i className="fas fa-shirt mr-1.5"></i>Frente
              </button>
              <button onClick={() => setCurrentView('back')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${currentView === 'back' ? 'bg-white text-black' : 'text-white/70 hover:text-white'}`}>
                <i className="fas fa-shirt mr-1.5"></i>Costas
              </button>
            </div>
          )}
          
          {/* Original/Result Toggle (se tem imagem gerada) */}
          {(genImg.front || genImg.back) && (
            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 p-1 bg-black/60 rounded-lg">
              <button onClick={() => setViewMode('original')} className={`px-2.5 py-1 rounded text-[10px] font-medium ${viewMode === 'original' ? 'bg-white text-black' : 'text-white/70'}`}>
                Original
              </button>
              <button onClick={() => setViewMode('result')} className={`px-2.5 py-1 rounded text-[10px] font-medium ${viewMode === 'result' ? 'bg-pink-500 text-white' : 'text-white/70'}`}>
                Resultado
              </button>
            </div>
          )}
          
          {/* Generation Progress */}
          {isGen && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="text-center px-6">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 border-4 border-pink-500/30 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-2xl">
                    {LOADING_PHRASES[loadingPhraseIndex].icon}
                  </div>
                </div>
                <p className="text-white font-medium text-sm mb-1 transition-all duration-300">
                  {LOADING_PHRASES[loadingPhraseIndex].text}
                </p>
                <p className="text-white/50 text-xs">
                  {hasBack ? '📷 Processando 2 imagens' : 'Isso pode levar alguns segundos'}
                </p>
                {/* Progress dots */}
                <div className="flex items-center justify-center gap-1 mt-3">
                  {LOADING_PHRASES.slice(0, 5).map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                        idx <= loadingPhraseIndex % 5 ? 'bg-pink-500' : 'bg-white/20'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* RIGHT: Controls Panel */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className={`flex-1 flex flex-col overflow-hidden ${isDark ? 'bg-neutral-900' : 'bg-white'}`}>
          
          {/* Header */}
          <div className={`flex-shrink-0 px-4 py-3 border-b ${isDark ? 'border-neutral-800' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <i className="fas fa-wand-magic-sparkles text-pink-500 mr-2"></i>
                Vizzu Studio
              </h2>
              <button onClick={onClose} className="md:hidden w-7 h-7 bg-neutral-800 text-neutral-400 hover:text-white rounded-full flex items-center justify-center">
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
          </div>
          
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* ═══════════════════════════════════════════════════════ */}
            {/* GALERIA ORGANIZADA */}
            {/* ═══════════════════════════════════════════════════════ */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                  <i className="fas fa-images mr-1.5 text-pink-500"></i>Galeria
                </h3>
              </div>
              
              {/* Originais */}
              <div className="mb-3">
                <p className={`text-[10px] font-medium uppercase tracking-wide mb-2 ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>Originais</p>
                <div className="flex gap-2">
                  {/* Frente */}
                  <div className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 cursor-pointer ${currentView === 'front' && viewMode === 'original' ? 'border-pink-500' : isDark ? 'border-neutral-700' : 'border-gray-200'}`} onClick={() => { setCurrentView('front'); setViewMode('original'); }}>
                    {originals.front ? (
                      <img src={originals.front.base64 || originals.front.url} alt="Frente" className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-neutral-800' : 'bg-gray-100'}`}>
                        <i className={`fas fa-image text-xs ${isDark ? 'text-neutral-600' : 'text-gray-400'}`}></i>
                      </div>
                    )}
                    <span className={`absolute bottom-0.5 left-0.5 px-1 py-0.5 text-[7px] font-bold rounded ${isDark ? 'bg-neutral-900/80 text-white' : 'bg-white/80 text-gray-700'}`}>F</span>
                  </div>
                  
                  {/* Costas */}
                  <div className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 cursor-pointer ${currentView === 'back' && viewMode === 'original' ? 'border-pink-500' : isDark ? 'border-neutral-700' : 'border-gray-200'} ${!originals.back ? 'opacity-40' : ''}`} onClick={() => { if (originals.back) { setCurrentView('back'); setViewMode('original'); } }}>
                    {originals.back ? (
                      <img src={originals.back.base64 || originals.back.url} alt="Costas" className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center border-2 border-dashed ${isDark ? 'border-neutral-700 bg-neutral-800' : 'border-gray-300 bg-gray-100'}`}>
                        <i className={`fas fa-plus text-xs ${isDark ? 'text-neutral-600' : 'text-gray-400'}`}></i>
                      </div>
                    )}
                    <span className={`absolute bottom-0.5 left-0.5 px-1 py-0.5 text-[7px] font-bold rounded ${isDark ? 'bg-neutral-900/80 text-white' : 'bg-white/80 text-gray-700'}`}>C</span>
                  </div>
                </div>
              </div>
              
              {/* Geradas */}
              {totalGenerated > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className={`text-[10px] font-medium uppercase tracking-wide ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>Geradas ({totalGenerated})</p>
                    <div className="flex gap-1">
                      {['all', 'studio', 'cenario', 'lifestyle'].map(f => (
                        <button key={f} onClick={() => setGalleryFilter(f as GalleryFilter)} className={`px-2 py-0.5 rounded text-[9px] font-medium ${galleryFilter === f ? 'bg-pink-500 text-white' : isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-500'}`}>
                          {f === 'all' ? 'Todas' : f === 'studio' ? 'Studio' : f === 'cenario' ? 'Cenário' : 'IA'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {getFilteredGeneratedImages().map(gen => (
                      <div key={gen.id} className={`group/thumb relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 cursor-pointer ${isDark ? 'border-neutral-700 hover:border-pink-500/50' : 'border-gray-200 hover:border-pink-300'}`} onClick={() => { setGenImg({ front: gen.images.front, back: gen.images.back || null }); setIsFromHistory(true); setViewMode('result'); setCurrentView('front'); }}>
                        <img src={gen.images.front} alt="Gerada" className="w-full h-full object-cover" />
                        <span className={`absolute bottom-0.5 left-0.5 px-1 py-0.5 text-[7px] font-bold rounded ${gen.tool === 'studio' ? 'bg-blue-500 text-white' : gen.tool === 'cenario' ? 'bg-purple-500 text-white' : 'bg-pink-500 text-white'}`}>
                          {gen.tool === 'studio' ? 'S' : gen.tool === 'cenario' ? 'C' : 'IA'}
                        </span>
                        {gen.images.back && <span className="absolute top-0.5 right-0.5 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center"><i className="fas fa-check text-white text-[6px]"></i></span>}
                        {/* Botão Delete */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteGenTarget(gen); setShowDeleteGenModal(true); }}
                          className="absolute top-0.5 left-0.5 w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                          title="Excluir imagem"
                        >
                          <i className="fas fa-trash text-white text-[6px]"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* FERRAMENTAS */}
            {/* ═══════════════════════════════════════════════════════ */}
            <div>
              <h3 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                <i className="fas fa-magic mr-1.5 text-pink-500"></i>Ferramentas
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(TOOL_CFG) as [ToolType, typeof TOOL_CFG.studio][]).map(([key, cfg]) => (
                  <button key={key} onClick={() => handleSelectTool(key)} className={`p-3 rounded-xl border-2 text-left transition-all ${tool === key ? 'border-pink-500 bg-pink-500/10' : isDark ? 'border-neutral-700 hover:border-neutral-600' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <i className={`fas ${cfg.icon} text-sm ${tool === key ? 'text-pink-500' : isDark ? 'text-neutral-400' : 'text-gray-400'}`}></i>
                      <span className={`text-[10px] font-medium ${tool === key ? 'text-pink-500' : isDark ? 'text-white' : 'text-gray-900'}`}>{cfg.name}</span>
                    </div>
                    <p className={`text-[9px] ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>{cfg.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* TOOL-SPECIFIC CONTENT */}
            {/* ═══════════════════════════════════════════════════════ */}
            
            {/* CENÁRIO INPUT */}
            {tool === 'cenario' && (
              <div className={`p-3 rounded-xl ${isDark ? 'bg-neutral-800' : 'bg-gray-50'}`}>
                <label className={`block text-[10px] font-medium uppercase tracking-wide mb-2 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                  <i className="fas fa-film mr-1 text-purple-400"></i>Descreva o cenário
                </label>
                <textarea value={cenPrompt} onChange={e => setCenPrompt(e.target.value)} rows={3} className={`w-full px-3 py-2 border rounded-lg text-sm resize-none ${isDark ? 'bg-neutral-900 border-neutral-700 text-white placeholder-neutral-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`} placeholder="Ex: Vitrine de loja de luxo com iluminação dourada e plantas tropicais" />
              </div>
            )}

            {/* LIFESTYLE STEPS */}
            {tool === 'lifestyle' && (
              <div className={`rounded-xl overflow-hidden ${isDark ? 'bg-neutral-800' : 'bg-gray-50'}`}>
                {/* Steps Accordion */}
                {(['item', 'model', 'look', 'orientation', 'export'] as LifestyleStep[]).map((step, idx) => {
                  const isActive = lifestyleStep === step;
                  const isComplete = isStepComplete(step);
                  const stepNumber = idx + 1;
                  const stepLabels: Record<LifestyleStep, string> = { item: 'Item Principal', model: 'Modelo', look: 'Look', orientation: 'Orientação', export: 'Exportar' };
                  
                  return (
                    <div key={step} className={`border-b last:border-b-0 ${isDark ? 'border-neutral-700' : 'border-gray-200'}`}>
                      {/* Step Header */}
                      <button onClick={() => setLifestyleStep(step)} className={`w-full flex items-center gap-3 p-3 ${isActive ? isDark ? 'bg-neutral-700/50' : 'bg-gray-100' : ''}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isComplete ? 'bg-green-500 text-white' : isActive ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white' : isDark ? 'bg-neutral-700 text-neutral-400' : 'bg-gray-200 text-gray-500'}`}>
                          {isComplete && step !== lifestyleStep ? <i className="fas fa-check text-[8px]"></i> : stepNumber}
                        </div>
                        <span className={`flex-1 text-left text-xs font-medium ${isActive ? isDark ? 'text-white' : 'text-gray-900' : isDark ? 'text-neutral-400' : 'text-gray-500'}`}>{stepLabels[step]}</span>
                        <i className={`fas fa-chevron-${isActive ? 'up' : 'down'} text-[10px] ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}></i>
                      </button>
                      
                      {/* Step Content */}
                      {isActive && (
                        <div className="p-3 pt-0">
                          {step === 'item' && (
                            <div className="space-y-3">
                              {/* Categoria do Produto (importada) */}
                              <div>
                                <label className={`block text-[9px] font-medium uppercase mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Categoria</label>
                                <div className={`px-3 py-2 rounded-lg text-xs font-medium ${isDark ? 'bg-neutral-900 text-pink-400' : 'bg-pink-50 text-pink-600'}`}>
                                  <i className="fas fa-tag mr-1.5"></i>{product.category || 'Não definida'}
                                </div>
                              </div>

                              {/* Atributos do Produto (importados) */}
                              {product.attributes && Object.keys(product.attributes).length > 0 && (
                                <div>
                                  <label className={`block text-[9px] font-medium uppercase mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Atributos</label>
                                  <div className="flex flex-wrap gap-1.5">
                                    {Object.entries(product.attributes).map(([key, value]) => (
                                      <span key={key} className={`px-2 py-1 rounded-full text-[10px] font-medium ${isDark ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-100 text-gray-600'}`}>
                                        {key}: {value}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Cor (se existir) */}
                              {product.color && (
                                <div>
                                  <label className={`block text-[9px] font-medium uppercase mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Cor</label>
                                  <div className={`px-3 py-2 rounded-lg text-xs ${isDark ? 'bg-neutral-900 text-neutral-300' : 'bg-gray-50 text-gray-700'}`}>
                                    {product.color}
                                  </div>
                                </div>
                              )}

                              {/* Observações adicionais */}
                              <div>
                                <label className={`block text-[9px] font-medium uppercase mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
                                  Observações adicionais <span className="opacity-60">(opcional)</span>
                                </label>
                                <textarea
                                  value={productNotes}
                                  onChange={e => setProductNotes(e.target.value)}
                                  rows={2}
                                  className={`w-full px-3 py-2 border rounded-lg text-xs resize-none ${isDark ? 'bg-neutral-900 border-neutral-700 text-white placeholder-neutral-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
                                  placeholder="Detalhes extras sobre o produto que a IA deve considerar..."
                                />
                              </div>
                            </div>
                          )}
                          
                          {step === 'model' && (
                            <div className="space-y-3">
                              <div className="flex gap-1 mb-2">
                                <button onClick={() => setModelTab('new')} className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${modelTab === 'new' ? 'bg-pink-500 text-white' : isDark ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-200 text-gray-600'}`}>Criar Novo</button>
                                <button onClick={() => setModelTab('saved')} className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${modelTab === 'saved' ? 'bg-pink-500 text-white' : isDark ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-200 text-gray-600'}`}>Salvos ({savedModels.length})</button>
                              </div>
                              
                              {modelTab === 'new' ? (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className={`block text-[9px] font-medium uppercase mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Gênero</label>
                                      <select value={modelSettings.gender} onChange={e => setModelSettings({...modelSettings, gender: e.target.value as 'woman'|'man'})} className={`w-full px-2 py-1.5 border rounded-lg text-xs ${isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                                        {MODEL_OPTS.gender.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                                      </select>
                                    </div>
                                    <div>
                                      <label className={`block text-[9px] font-medium uppercase mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Etnia</label>
                                      <select value={modelSettings.ethnicity} onChange={e => setModelSettings({...modelSettings, ethnicity: e.target.value})} className={`w-full px-2 py-1.5 border rounded-lg text-xs ${isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                                        {MODEL_OPTS.ethnicity.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                                      </select>
                                    </div>
                                    <div>
                                      <label className={`block text-[9px] font-medium uppercase mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Corpo</label>
                                      <select value={modelSettings.bodyType} onChange={e => setModelSettings({...modelSettings, bodyType: e.target.value})} className={`w-full px-2 py-1.5 border rounded-lg text-xs ${isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                                        {MODEL_OPTS.bodyType.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                                      </select>
                                    </div>
                                    <div>
                                      <label className={`block text-[9px] font-medium uppercase mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Idade</label>
                                      <select value={modelSettings.ageRange} onChange={e => setModelSettings({...modelSettings, ageRange: e.target.value})} className={`w-full px-2 py-1.5 border rounded-lg text-xs ${isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                                        {MODEL_OPTS.ageRange.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                                      </select>
                                    </div>
                                  </div>

                                  {/* Detalhes do Modelo */}
                                  <div>
                                    <label className={`block text-[9px] font-medium uppercase mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
                                      Detalhes do modelo <span className="opacity-60">(opcional)</span>
                                    </label>
                                    <textarea
                                      value={modelDetail}
                                      onChange={e => setModelDetail(e.target.value)}
                                      rows={2}
                                      className={`w-full px-2 py-1.5 border rounded-lg text-xs resize-none ${isDark ? 'bg-neutral-900 border-neutral-700 text-white placeholder-neutral-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
                                      placeholder="Ex: cabelo cacheado, alto, tatuagem no braço..."
                                    />
                                    <p className={`text-[9px] mt-1 ${isDark ? 'text-neutral-600' : 'text-gray-400'}`}>
                                      <i className="fas fa-info-circle mr-1"></i>
                                      Descreva apenas fisionomia, cabelo, altura, etc. Não inclua roupas aqui.
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                                  {savedModels.map(m => (
                                    <div key={m.id} onClick={() => setSelModelId(m.id)} className={`relative rounded-lg overflow-hidden cursor-pointer border-2 ${selModelId === m.id ? 'border-pink-500' : isDark ? 'border-neutral-700' : 'border-gray-200'}`}>
                                      <img src={m.referenceImage} alt={m.name} className="w-full aspect-square object-cover" />
                                      <div className={`absolute inset-x-0 bottom-0 p-1 ${isDark ? 'bg-black/70' : 'bg-white/90'}`}>
                                        <p className={`text-[8px] font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{m.name}</p>
                                      </div>
                                    </div>
                                  ))}
                                  {savedModels.length === 0 && <p className={`col-span-3 text-center py-4 text-xs ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>Nenhum modelo salvo</p>}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {step === 'look' && (
                            <div className="space-y-3">
                              <div className="flex gap-1 mb-2">
                                <button onClick={() => setLookMode('describe')} className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${lookMode === 'describe' ? 'bg-pink-500 text-white' : isDark ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-200 text-gray-600'}`}>Descrever <span className="opacity-60">(1 crédito)</span></button>
                                <button onClick={() => setLookMode('composer')} className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${lookMode === 'composer' ? 'bg-pink-500 text-white' : isDark ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-200 text-gray-600'}`}>Composer <span className="opacity-60">(2 créditos)</span></button>
                              </div>

                              {lookMode === 'describe' ? (
                                <div className="space-y-2">
                                  {/* Aviso de opcional */}
                                  <div className={`p-2 rounded-lg text-[10px] ${isDark ? 'bg-pink-500/10 text-pink-300' : 'bg-pink-50 text-pink-600'}`}>
                                    <i className="fas fa-lightbulb mr-1.5"></i>
                                    Opcional: deixe em branco e a IA escolherá automaticamente
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className={`block text-[9px] font-medium uppercase mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Parte de cima</label>
                                      <input
                                        type="text"
                                        value={describedLook.top}
                                        onChange={e => setDescribedLook({...describedLook, top: e.target.value})}
                                        className={`w-full px-2 py-1.5 border rounded-lg text-[10px] ${isDark ? 'bg-neutral-900 border-neutral-700 text-white placeholder-neutral-600' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
                                        placeholder="Ex: camiseta branca, blusa..."
                                      />
                                    </div>
                                    <div>
                                      <label className={`block text-[9px] font-medium uppercase mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Parte de baixo</label>
                                      <input
                                        type="text"
                                        value={describedLook.bottom}
                                        onChange={e => setDescribedLook({...describedLook, bottom: e.target.value})}
                                        className={`w-full px-2 py-1.5 border rounded-lg text-[10px] ${isDark ? 'bg-neutral-900 border-neutral-700 text-white placeholder-neutral-600' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
                                        placeholder="Ex: jeans azul, saia..."
                                      />
                                    </div>
                                    <div>
                                      <label className={`block text-[9px] font-medium uppercase mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Calçado</label>
                                      <input
                                        type="text"
                                        value={describedLook.shoes}
                                        onChange={e => setDescribedLook({...describedLook, shoes: e.target.value})}
                                        className={`w-full px-2 py-1.5 border rounded-lg text-[10px] ${isDark ? 'bg-neutral-900 border-neutral-700 text-white placeholder-neutral-600' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
                                        placeholder="Ex: tênis branco, sandália..."
                                      />
                                    </div>
                                    <div>
                                      <label className={`block text-[9px] font-medium uppercase mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Acessórios</label>
                                      <input
                                        type="text"
                                        value={describedLook.accessories}
                                        onChange={e => setDescribedLook({...describedLook, accessories: e.target.value})}
                                        className={`w-full px-2 py-1.5 border rounded-lg text-[10px] ${isDark ? 'bg-neutral-900 border-neutral-700 text-white placeholder-neutral-600' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
                                        placeholder="Ex: relógio, óculos de sol..."
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                /* FIXED: Pass correct props to LookComposer - composition and onChange */
                                <LookComposer 
                                  products={products} 
                                  composition={look} 
                                  onChange={setLook} 
                                  theme={theme} 
                                />
                              )}
                            </div>
                          )}
                          
                          {step === 'orientation' && (
                            <div className="grid grid-cols-2 gap-2">
                              {ORIENTATION_OPTIONS.map(o => (
                                <button key={o.id} onClick={() => setOrientation(o.id)} className={`p-3 rounded-lg border-2 text-left ${orientation === o.id ? 'border-pink-500 bg-pink-500/10' : isDark ? 'border-neutral-700' : 'border-gray-200'}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <i className={`fas ${o.icon} text-sm ${orientation === o.id ? 'text-pink-500' : isDark ? 'text-neutral-400' : 'text-gray-400'}`}></i>
                                    <span className={`text-xs font-medium ${orientation === o.id ? 'text-pink-500' : isDark ? 'text-white' : 'text-gray-900'}`}>{o.label}</span>
                                  </div>
                                  <p className={`text-[9px] ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>{o.usedFor}</p>
                                </button>
                              ))}
                            </div>
                          )}
                          
                          {step === 'export' && (
                            <div className="grid grid-cols-2 gap-2">
                              {EXPORT_OPTIONS.map(o => (
                                <button key={o.id} onClick={() => setExportType(o.id)} className={`p-3 rounded-lg border-2 text-left ${exportType === o.id ? 'border-pink-500 bg-pink-500/10' : isDark ? 'border-neutral-700' : 'border-gray-200'}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <i className={`fas ${o.icon} text-sm ${exportType === o.id ? 'text-pink-500' : isDark ? 'text-neutral-400' : 'text-gray-400'}`}></i>
                                    <span className={`text-xs font-medium ${exportType === o.id ? 'text-pink-500' : isDark ? 'text-white' : 'text-gray-900'}`}>{o.label}</span>
                                  </div>
                                  <p className={`text-[9px] ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>{o.format} • {o.desc}</p>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-red-500 text-xs flex items-center gap-2">
                  <i className="fas fa-exclamation-circle"></i>{error}
                </p>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* FOOTER: Action Buttons */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className={`flex-shrink-0 p-4 border-t ${isDark ? 'border-neutral-800' : 'border-gray-200'}`}>
            {/* Result Actions - só mostra salvar para novas gerações, não para histórico */}
            {(genImg.front || genImg.back) && !isFromHistory ? (
              <div className="flex items-center gap-2">
                <button onClick={() => { setGenImg({ front: null, back: null }); setViewMode('original'); }} className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-neutral-800 text-red-400 hover:bg-red-500/20' : 'bg-gray-100 text-red-500 hover:bg-red-50'}`}>
                  <i className="fas fa-trash text-sm"></i>
                </button>
                <button onClick={handleSave} disabled={isSaving} className="flex-1 py-2.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
                  Salvar{hasBack && genImg.back ? ' Todas (2)' : ''}
                </button>
                {tool === 'lifestyle' && (
                  <button onClick={() => setShowSaveModal(true)} className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-neutral-800 text-pink-400 hover:bg-pink-500/20' : 'bg-gray-100 text-pink-500 hover:bg-pink-50'}`} title="Salvar Modelo">
                    <i className="fas fa-user-plus text-sm"></i>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {/* Generate Button */}
                <button onClick={handleGen} disabled={!tool || isGen} className="w-full py-3 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {isGen ? (
                    <><i className="fas fa-spinner fa-spin"></i>Gerando...</>
                  ) : (
                    <>
                      <i className="fas fa-wand-magic-sparkles"></i>
                      Gerar {hasBack ? '(2 imagens)' : ''} • {tool === 'lifestyle' ? lifestyleCredits : tool ? TOOL_CFG[tool].credits : 1} crédito{(tool === 'lifestyle' ? lifestyleCredits : tool ? TOOL_CFG[tool].credits : 1) > 1 ? 's' : ''}
                    </>
                  )}
                </button>
                
                {/* Delete Product Button */}
                {onDeleteProduct && (
                  <button onClick={() => setShowDeleteConfirm(true)} className={`w-full py-2 rounded-lg text-xs font-medium ${isDark ? 'bg-neutral-800 text-red-400 hover:bg-red-500/20' : 'bg-gray-100 text-red-500 hover:bg-red-50'}`}>
                    <i className="fas fa-trash mr-1.5"></i>Excluir Produto
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODALS */}
      {/* ═══════════════════════════════════════════════════════════ */}
      
      {/* Zoom Modal */}
      {zoom && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4" onClick={() => setZoom(null)}>
          <img src={zoom} alt="Zoom" className="max-w-full max-h-full object-contain" />
          <button className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center">
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* Save Model Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className={`rounded-2xl w-full max-w-sm p-5 ${isDark ? 'bg-neutral-900' : 'bg-white'}`}>
            <h4 className={`font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Salvar Modelo</h4>
            <input type="text" value={newModelName} onChange={e => setNewModelName(e.target.value)} placeholder="Nome do modelo" className={`w-full px-3 py-2 border rounded-lg text-sm mb-4 ${isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
            <div className="flex gap-2">
              <button onClick={() => setShowSaveModal(false)} className={`flex-1 py-2 rounded-lg text-sm ${isDark ? 'bg-neutral-800 text-white' : 'bg-gray-100 text-gray-700'}`}>Cancelar</button>
              <button onClick={handleSaveModel} disabled={!newModelName.trim()} className="flex-1 py-2 bg-pink-500 text-white rounded-lg text-sm disabled:opacity-50">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className={`rounded-2xl w-full max-w-sm p-5 ${isDark ? 'bg-neutral-900' : 'bg-white'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <i className="fas fa-trash text-red-500"></i>
              </div>
              <div>
                <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Excluir Produto</h4>
                <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <p className={`text-sm mb-4 ${isDark ? 'text-neutral-300' : 'text-gray-600'}`}>
              Tem certeza que deseja excluir <strong>{product.name}</strong>? Todas as imagens geradas também serão removidas.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className={`flex-1 py-2.5 rounded-lg text-sm font-medium ${isDark ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Cancelar</button>
              <button onClick={handleDeleteProduct} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Generated Image Modal */}
      {showDeleteGenModal && deleteGenTarget && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className={`rounded-2xl w-full max-w-sm p-5 ${isDark ? 'bg-neutral-900' : 'bg-white'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <i className="fas fa-image text-red-500"></i>
              </div>
              <div>
                <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Excluir Imagem Gerada</h4>
                <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Esta ação não pode ser desfeita</p>
              </div>
            </div>

            {/* Preview da imagem */}
            <div className="mb-4">
              <img
                src={deleteGenTarget.images.front}
                alt="Imagem a ser excluída"
                className="w-full h-32 object-contain rounded-lg bg-neutral-800"
              />
            </div>

            <p className={`text-sm mb-4 ${isDark ? 'text-neutral-300' : 'text-gray-600'}`}>
              Tem certeza que deseja excluir esta imagem gerada? Ela será removida permanentemente do seu histórico.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => { setShowDeleteGenModal(false); setDeleteGenTarget(null); }}
                disabled={isDeletingGen}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium ${isDark ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} disabled:opacity-50`}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteGeneration}
                disabled={isDeletingGen}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeletingGen ? (
                  <><i className="fas fa-spinner fa-spin"></i> Excluindo...</>
                ) : (
                  <><i className="fas fa-trash"></i> Excluir</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Caption Generation Modal */}
      {showCaptionModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className={`rounded-2xl w-full max-w-md p-5 ${isDark ? 'bg-neutral-900' : 'bg-white'}`}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 flex items-center justify-center">
                <i className="fab fa-instagram text-white text-lg"></i>
              </div>
              <div>
                <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Legenda para Instagram</h4>
                <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Gere uma legenda otimizada com IA</p>
              </div>
            </div>

            {/* Conteúdo */}
            {!generatedCaption && !isGeneratingCaption && (
              <>
                <p className={`text-sm mb-4 ${isDark ? 'text-neutral-300' : 'text-gray-600'}`}>
                  Sua imagem foi salva com sucesso! Deseja gerar uma legenda personalizada para o Instagram?
                </p>

                <div className={`p-3 rounded-lg mb-4 ${isDark ? 'bg-neutral-800' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 text-xs">
                    <i className={`fas fa-info-circle ${isDark ? 'text-pink-400' : 'text-pink-500'}`}></i>
                    <span className={isDark ? 'text-neutral-400' : 'text-gray-500'}>
                      A legenda será baseada nas configurações da sua empresa
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowCaptionModal(false);
                      setGenImg({ front: null, back: null });
                      setGenId(null);
                      setViewMode('original');
                    }}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium ${isDark ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    Pular
                  </button>
                  <button
                    onClick={handleGenerateCaption}
                    className="flex-1 py-2.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-wand-magic-sparkles"></i>
                    Gerar Legenda
                  </button>
                </div>
              </>
            )}

            {/* Loading State */}
            {isGeneratingCaption && (
              <div className="py-8 text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 border-4 border-pink-500/30 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-2xl">
                    <i className="fab fa-instagram text-pink-500"></i>
                  </div>
                </div>
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Criando sua legenda...
                </p>
                <p className={`text-xs mt-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
                  Analisando produto e tom de voz
                </p>
              </div>
            )}

            {/* Result */}
            {generatedCaption && !isGeneratingCaption && (
              <>
                <div className={`p-4 rounded-lg mb-4 ${isDark ? 'bg-neutral-800' : 'bg-gray-50'}`}>
                  <p className={`text-sm whitespace-pre-wrap ${isDark ? 'text-neutral-200' : 'text-gray-700'}`}>
                    {generatedCaption}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowCaptionModal(false);
                      setGeneratedCaption(null);
                      setGenImg({ front: null, back: null });
                      setGenId(null);
                      setViewMode('original');
                    }}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium ${isDark ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    Fechar
                  </button>
                  <button
                    onClick={handleCopyCaption}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                      captionCopied
                        ? 'bg-green-500 text-white'
                        : 'bg-gradient-to-r from-pink-500 to-orange-400 text-white hover:opacity-90'
                    }`}
                  >
                    {captionCopied ? (
                      <><i className="fas fa-check"></i> Copiado!</>
                    ) : (
                      <><i className="fas fa-copy"></i> Copiar</>
                    )}
                  </button>
                </div>

                {/* Gerar novamente */}
                <button
                  onClick={handleGenerateCaption}
                  className={`w-full mt-2 py-2 rounded-lg text-xs font-medium ${isDark ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                >
                  <i className="fas fa-refresh mr-1.5"></i>
                  Gerar outra versão
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorModal;
