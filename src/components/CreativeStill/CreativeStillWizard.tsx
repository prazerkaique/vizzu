import React, { useState, useRef, useMemo } from 'react';
import {
  Product,
  CreativeStillWizardState,
  CreativeStillAdditionalProduct,
} from '../../types';
import {
  AESTHETIC_PRESETS,
  LIGHTING_OPTIONS,
  CAMERA_TYPES,
  LENS_OPTIONS,
  CAMERA_ANGLES,
  COLOR_TONES,
  COLOR_STYLES,
  FRAME_RATIOS,
  PRODUCT_PRESENTATIONS,
  PRODUCT_PLACEMENTS,
  ALL_PRESENTATIONS,
  PRODUCT_TYPES_FOR_UPLOAD,
  getPresentationsForType,
  getProductTypeGroup,
  ProductTypeGroup,
} from './index';
import { compressImage } from '../../utils/imageCompression';

// ============================================================
// CONSTANTES (mesmo padrão do Product Studio)
// ============================================================

const CATEGORY_GROUPS = [
  { id: 'cabeca', label: '👒 Cabeça', items: ['Bonés', 'Chapéus', 'Tiaras', 'Lenços'] },
  { id: 'parte-de-cima', label: '👕 Parte de Cima', items: ['Camisetas', 'Blusas', 'Regatas', 'Tops', 'Camisas', 'Bodies', 'Jaquetas', 'Casacos', 'Blazers', 'Moletons'] },
  { id: 'parte-de-baixo', label: '👖 Parte de Baixo', items: ['Calças', 'Shorts', 'Bermudas', 'Saias', 'Leggings', 'Shorts Fitness'] },
  { id: 'pecas-inteiras', label: '👗 Peças Inteiras', items: ['Vestidos', 'Macacões', 'Jardineiras', 'Biquínis', 'Maiôs'] },
  { id: 'calcados', label: '👟 Calçados', items: ['Tênis', 'Sandálias', 'Botas', 'Sapatos', 'Chinelos'] },
  { id: 'acessorios', label: '💍 Acessórios', items: ['Bolsas', 'Cintos', 'Relógios', 'Óculos', 'Bijuterias', 'Mochilas', 'Outros Acessórios'] },
];
const getCategoryGroupBySubcategory = (subcategory: string) => CATEGORY_GROUPS.find(g => g.items.includes(subcategory));

// ============================================================
// TIPOS
// ============================================================

interface Props {
  theme: 'dark' | 'light';
  products: Product[];
  wizardState: CreativeStillWizardState;
  onUpdateState: (updates: Partial<CreativeStillWizardState>) => void;
  onGenerate: () => void;
  onBack: () => void;
  userCredits: number;
}

// Steps dinâmicos baseados no modo
const SIMPLE_STEPS = [
  { id: 1, title: 'Produto', icon: 'fa-box' },
  { id: 2, title: 'Estilo & Cena', icon: 'fa-palette' },
  { id: 3, title: 'Revisar', icon: 'fa-check-circle' },
];

const ADVANCED_STEPS = [
  { id: 1, title: 'Produto', icon: 'fa-box' },
  { id: 2, title: 'Estilo', icon: 'fa-palette' },
  { id: 3, title: 'Cena', icon: 'fa-mountain-sun' },
  { id: 4, title: 'Câmera', icon: 'fa-camera' },
  { id: 5, title: 'Revisar', icon: 'fa-check-circle' },
];

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export const CreativeStillWizard: React.FC<Props> = ({
  theme,
  products,
  wizardState,
  onUpdateState,
  onGenerate,
  onBack,
  userCredits,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showAddElementModal, setShowAddElementModal] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productFilterCategoryGroup, setProductFilterCategoryGroup] = useState('');
  const [productFilterCategory, setProductFilterCategory] = useState('');
  const [elementTab, setElementTab] = useState<'catalog' | 'upload'>('catalog');
  const [elementPosition, setElementPosition] = useState('');
  const [elementSearchTerm, setElementSearchTerm] = useState('');
  const [elementFilterCategoryGroup, setElementFilterCategoryGroup] = useState('');
  const [elementFilterCategory, setElementFilterCategory] = useState('');
  const [uploadProductType, setUploadProductType] = useState<ProductTypeGroup | null>(null);
  const elementFileRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark';
  const isSimple = wizardState.mode === 'simple';
  const steps = isSimple ? SIMPLE_STEPS : ADVANCED_STEPS;
  const totalSteps = steps.length;

  // Filtra produtos (mesmo padrão do Product Studio)
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = !productSearchTerm ||
        product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        (product.sku || '').toLowerCase().includes(productSearchTerm.toLowerCase());
      const categoryGroup = getCategoryGroupBySubcategory(product.category);
      const matchesCategoryGroup = !productFilterCategoryGroup || categoryGroup?.id === productFilterCategoryGroup;
      const matchesCategory = !productFilterCategory || product.category === productFilterCategory;
      return matchesSearch && matchesCategoryGroup && matchesCategory;
    });
  }, [products, productSearchTerm, productFilterCategoryGroup, productFilterCategory]);

  const filteredElementProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = !elementSearchTerm ||
        product.name.toLowerCase().includes(elementSearchTerm.toLowerCase()) ||
        (product.sku || '').toLowerCase().includes(elementSearchTerm.toLowerCase());
      const categoryGroup = getCategoryGroupBySubcategory(product.category);
      const matchesCategoryGroup = !elementFilterCategoryGroup || categoryGroup?.id === elementFilterCategoryGroup;
      const matchesCategory = !elementFilterCategory || product.category === elementFilterCategory;
      return matchesSearch && matchesCategoryGroup && matchesCategory;
    });
  }, [products, elementSearchTerm, elementFilterCategoryGroup, elementFilterCategory]);

  // Tipo de produto efetivo: do catálogo (pela categoria) ou do upload (selecionado pelo user)
  const isUploadedProduct = wizardState.mainProduct?.id?.startsWith('upload-') ?? false;
  const effectiveProductType: ProductTypeGroup | null = wizardState.mainProduct
    ? (isUploadedProduct ? uploadProductType : getProductTypeGroup(wizardState.mainProduct.category))
    : null;

  // Apresentações filtradas pelo tipo de produto
  const availablePresentations = getPresentationsForType(effectiveProductType);

  // Validação: nenhuma imagem é obrigatória além da principal
  const mainProductHasRequiredImages = (): boolean => {
    if (!wizardState.mainProduct) return false;
    return true;
  };

  // Se selecionou "back" mas não tem foto de costas, bloqueia
  const mainProductViewValid = (): boolean => {
    if (!wizardState.mainProduct) return false;
    if (wizardState.mainProduct.id?.startsWith('upload-')) return true;
    if (wizardState.mainProductView === 'back' && !hasBackImage(wizardState.mainProduct)) return false;
    return true;
  };

  // Navegação
  const canGoNext = () => {
    if (currentStep === 1) {
      if (!wizardState.mainProduct) return false;
      // Upload: precisa selecionar tipo de produto
      if (isUploadedProduct && !uploadProductType) return false;
      // Catálogo: precisa ter detalhe e view válida
      if (!isUploadedProduct) {
        if (!mainProductHasRequiredImages()) return false;
        if (!mainProductViewValid()) return false;
      }
      return true;
    }
    if (isSimple && currentStep === 2) return !!wizardState.surfaceDescription.trim();
    if (!isSimple && currentStep === 2) return !!(wizardState.aestheticPreset || wizardState.aestheticCustom.trim());
    if (!isSimple && currentStep === 3) return !!wizardState.surfaceDescription.trim();
    return true;
  };

  const goNext = () => {
    if (currentStep < totalSteps && canGoNext()) setCurrentStep(prev => prev + 1);
  };

  const goPrev = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
    else onBack();
  };

  // Helper: pegar imagem de um produto (prioriza Product Studio otimizadas)
  const getProductImageUrl = (product: Product): string => {
    // Prioridade 1: Imagens otimizadas do Product Studio
    if (product.generatedImages?.productStudio?.length) {
      const lastSession = product.generatedImages.productStudio[product.generatedImages.productStudio.length - 1];
      if (lastSession.images?.length) {
        const frontImage = lastSession.images.find(img => img.angle === 'front');
        if (frontImage?.url) return frontImage.url;
        if (lastSession.images[0]?.url) return lastSession.images[0].url;
      }
    }
    // Prioridade 2: Imagem original (frente)
    if (product.originalImages?.front?.url) return product.originalImages.front.url;
    // Prioridade 3: Legacy images array
    if (product.images?.[0]?.url) return product.images[0].url;
    if (product.images?.[0]?.base64) return product.images[0].base64;
    return '';
  };

  // Helper: pegar imagem de costas
  const getProductBackImageUrl = (product: Product): string => {
    if (product.generatedImages?.productStudio?.length) {
      const lastSession = product.generatedImages.productStudio[product.generatedImages.productStudio.length - 1];
      const back = lastSession.images?.find(i => i.angle === 'back');
      if (back?.url) return back.url;
    }
    if (product.originalImages?.back?.url) return product.originalImages.back.url;
    return '';
  };

  // Helper: pegar imagem de detalhe
  const getProductDetailImageUrl = (product: Product): string => {
    if (product.generatedImages?.productStudio?.length) {
      const lastSession = product.generatedImages.productStudio[product.generatedImages.productStudio.length - 1];
      const detail = lastSession.images?.find(i => i.angle === 'detail');
      if (detail?.url) return detail.url;
    }
    if (product.originalImages?.detail?.url) return product.originalImages.detail.url;
    return '';
  };

  // Verificar se produto tem foto de costas
  const hasBackImage = (product: Product): boolean => {
    if (product.hasBackImage) return true;
    if (product.generatedImages?.productStudio?.length) {
      const lastSession = product.generatedImages.productStudio[product.generatedImages.productStudio.length - 1];
      if (lastSession.images?.find(i => i.angle === 'back')) return true;
    }
    if (product.originalImages?.back?.url) return true;
    return false;
  };

  // Verificar se produto tem foto de detalhe
  const hasDetailImage = (product: Product): boolean => {
    if (product.hasDetailImage) return true;
    if (product.generatedImages?.productStudio?.length) {
      const lastSession = product.generatedImages.productStudio[product.generatedImages.productStudio.length - 1];
      if (lastSession.images?.find(i => i.angle === 'detail')) return true;
    }
    if (product.originalImages?.detail?.url) return true;
    return false;
  };

  // Adicionar elemento do catálogo
  const handleAddCatalogElement = (product: Product) => {
    const newElement: CreativeStillAdditionalProduct = {
      product_id: product.id || '',
      product_name: product.name,
      product_image_url: getProductImageUrl(product),
      position_description: elementPosition,
      source: 'catalog',
    };
    onUpdateState({
      additionalProducts: [...wizardState.additionalProducts, newElement],
    });
    setShowAddElementModal(false);
    setElementPosition('');
    setElementSearchTerm('');
  };

  // Adicionar elemento por upload
  const handleElementUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      const newElement: CreativeStillAdditionalProduct = {
        product_id: '',
        product_name: file.name.replace(/\.[^/.]+$/, ''),
        product_image_url: reader.result as string,
        position_description: elementPosition,
        source: 'upload',
        upload_base64: base64,
        upload_mime_type: file.type,
      };
      onUpdateState({
        additionalProducts: [...wizardState.additionalProducts, newElement],
      });
      setShowAddElementModal(false);
      setElementPosition('');
    };
    reader.readAsDataURL(file);

    if (elementFileRef.current) elementFileRef.current.value = '';
  };

  // Remover elemento
  const handleRemoveElement = (index: number) => {
    onUpdateState({
      additionalProducts: wizardState.additionalProducts.filter((_, i) => i !== index),
    });
  };

  // Upload de referência visual
  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      onUpdateState({
        referenceImage: { base64, mimeType: file.type },
      });
    };
    reader.readAsDataURL(file);
  };

  // ============================================================
  // STYLES HELPERS
  // ============================================================

  const cardClass = (selected: boolean) =>
    'rounded-xl p-3 text-left transition-all cursor-pointer border ' +
    (selected
      ? (isDark ? 'bg-amber-500/20 border-amber-500/50 ring-1 ring-amber-500/30' : 'bg-amber-50 border-amber-400 ring-1 ring-amber-300')
      : (isDark ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700' : 'bg-white border-gray-200 hover:border-gray-300'));

  const sectionTitle = (text: string, icon: string) => (
    <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>
      <i className={'fas ' + icon + ' mr-2 text-xs opacity-50'}></i>
      {text}
    </h3>
  );

  const separator = () => (
    <div className={'my-5 border-t ' + (isDark ? 'border-neutral-800' : 'border-gray-200')}></div>
  );

  // ============================================================
  // RENDER STEPS
  // ============================================================

  // Upload do produto principal via arquivo/foto
  const mainProductFileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleMainProductUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const uploadedProduct: Product = {
        id: `upload-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        images: [{ name: file.name, url: dataUrl }],
        originalImages: { front: { name: file.name, url: dataUrl } },
        category: '',
        color: '',
      } as Product;
      onUpdateState({ mainProduct: uploadedProduct, productPresentation: 'ai_choose', customPresentationText: '' });
      setUploadProductType(null);
    };
    reader.readAsDataURL(file);
  };

  const handleMainProductFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleMainProductUpload(file);
    if (mainProductFileRef.current) mainProductFileRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleMainProductUpload(file);
    }
  };

  const renderStep1Product = () => (
    <div>
      {sectionTitle('Qual o produto principal?', 'fa-box')}

      {/* Produto selecionado */}
      {wizardState.mainProduct ? (
        <div className={'rounded-xl p-4 flex items-center gap-4 ' + (isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-200 shadow-sm')}>
          <div className={'w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 ' + (isDark ? 'bg-neutral-800' : 'bg-gray-100')}>
            {getProductImageUrl(wizardState.mainProduct) ? (
              <img src={getProductImageUrl(wizardState.mainProduct)} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <i className={'fas fa-image ' + (isDark ? 'text-neutral-700' : 'text-gray-300')}></i>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-medium truncate'}>{wizardState.mainProduct.name}</p>
            <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>
              {wizardState.mainProduct.color && <span>{wizardState.mainProduct.color}</span>}
              {wizardState.mainProduct.category && <span> · {wizardState.mainProduct.category}</span>}
            </p>
          </div>
          <button
            onClick={() => { onUpdateState({ mainProduct: null, productPresentation: 'ai_choose', customPresentationText: '' }); setUploadProductType(null); }}
            className={(isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-500') + ' text-xs font-medium'}
          >
            Trocar
          </button>
        </div>
      ) : (
        <div className="space-y-0">
          {/* Selecionar do catálogo */}
          <button
            onClick={() => setShowProductModal(true)}
            className={'w-full rounded-t-xl p-4 text-left flex items-center gap-4 transition-all border border-b-0 ' + (isDark ? 'bg-neutral-900 border-neutral-800 hover:border-amber-500/50' : 'bg-white border-gray-200 hover:border-amber-400 shadow-sm')}
          >
            <div className={'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ' + (isDark ? 'bg-blue-500/20' : 'bg-blue-100')}>
              <i className={'fas fa-box text-sm ' + (isDark ? 'text-blue-400' : 'text-blue-500')}></i>
            </div>
            <div>
              <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>Selecionar do catálogo</p>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Escolha um produto já cadastrado</p>
            </div>
            <i className={'fas fa-chevron-right ml-auto text-xs ' + (isDark ? 'text-neutral-600' : 'text-gray-400')}></i>
          </button>

          {/* Divisor OU */}
          <div className={'flex items-center border-x ' + (isDark ? 'border-neutral-800 bg-neutral-900' : 'border-gray-200 bg-white')}>
            <div className={'flex-1 h-px ' + (isDark ? 'bg-neutral-800' : 'bg-gray-200')}></div>
            <span className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[10px] font-medium uppercase tracking-wider px-4 py-2'}>ou</span>
            <div className={'flex-1 h-px ' + (isDark ? 'bg-neutral-800' : 'bg-gray-200')}></div>
          </div>

          {/* Upload / Drag and Drop */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={'w-full rounded-b-xl p-6 text-center transition-all cursor-pointer border ' +
              (dragOver
                ? (isDark ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-amber-400 bg-amber-50 text-amber-500')
                : (isDark ? 'bg-neutral-900 border-neutral-800 hover:border-amber-500/50 text-neutral-500 hover:text-amber-400' : 'bg-white border-gray-200 hover:border-amber-400 text-gray-400 hover:text-amber-500')
              )}
            onClick={() => mainProductFileRef.current?.click()}
          >
            <i className={'text-2xl mb-2 block fas ' + (dragOver ? 'fa-arrow-down' : 'fa-cloud-arrow-up')}></i>
            <span className="text-sm font-medium block">
              {dragOver ? 'Solte a imagem aqui' : 'Subir imagem ou tirar foto'}
            </span>
            <span className={'text-[10px] block mt-1 ' + (isDark ? 'text-neutral-600' : 'text-gray-400')}>
              Arraste e solte, ou clique para selecionar · JPG, PNG, WebP
            </span>
            <input
              ref={mainProductFileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleMainProductFileChange}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* Seleção de ângulo (frente ou costas) + detalhe — só para produtos do catálogo */}
      {wizardState.mainProduct && !wizardState.mainProduct.id?.startsWith('upload-') && (
        <>
          {separator()}
          {sectionTitle('Qual foto usar?', 'fa-camera-rotate')}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {/* Frente */}
            <button
              onClick={() => onUpdateState({ mainProductView: 'front' })}
              className={cardClass(wizardState.mainProductView === 'front')}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <i className={'fas fa-shirt text-xs ' + (wizardState.mainProductView === 'front' ? (isDark ? 'text-amber-400' : 'text-amber-500') : (isDark ? 'text-neutral-500' : 'text-gray-400'))}></i>
                <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Foto de Frente</span>
              </div>
              {getProductImageUrl(wizardState.mainProduct!) && (
                <div className={'w-full aspect-square rounded-lg overflow-hidden ' + (isDark ? 'bg-neutral-800' : 'bg-gray-100')}>
                  <img src={getProductImageUrl(wizardState.mainProduct!)} alt="Frente" className="w-full h-full object-cover" />
                </div>
              )}
            </button>

            {/* Costas */}
            <button
              onClick={() => {
                if (hasBackImage(wizardState.mainProduct!)) {
                  onUpdateState({ mainProductView: 'back' });
                }
              }}
              className={
                hasBackImage(wizardState.mainProduct!)
                  ? cardClass(wizardState.mainProductView === 'back')
                  : 'rounded-xl p-3 text-left border opacity-50 cursor-not-allowed ' + (isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-gray-50 border-gray-200')
              }
            >
              <div className="flex items-center gap-2 mb-1.5">
                <i className={'fas fa-shirt text-xs ' + (
                  !hasBackImage(wizardState.mainProduct!) ? (isDark ? 'text-neutral-700' : 'text-gray-300') :
                  wizardState.mainProductView === 'back' ? (isDark ? 'text-amber-400' : 'text-amber-500') : (isDark ? 'text-neutral-500' : 'text-gray-400')
                )}></i>
                <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Foto de Costas</span>
              </div>
              {hasBackImage(wizardState.mainProduct!) ? (
                <div className={'w-full aspect-square rounded-lg overflow-hidden ' + (isDark ? 'bg-neutral-800' : 'bg-gray-100')}>
                  <img src={getProductBackImageUrl(wizardState.mainProduct!)} alt="Costas" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className={'w-full aspect-square rounded-lg flex flex-col items-center justify-center ' + (isDark ? 'bg-neutral-800/50' : 'bg-gray-100')}>
                  <i className={'fas fa-ban text-lg mb-1 ' + (isDark ? 'text-neutral-700' : 'text-gray-300')}></i>
                  <span className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[10px] text-center px-2'}>Sem foto de costas</span>
                </div>
              )}
            </button>
          </div>

          {/* Imagem de detalhe (opcional) */}
          {hasDetailImage(wizardState.mainProduct!) ? (
            <div className={'rounded-lg p-3 flex items-center gap-3 ' + (isDark ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200')}>
              <div className={'w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 ' + (isDark ? 'bg-neutral-800' : 'bg-gray-100')}>
                <img src={getProductDetailImageUrl(wizardState.mainProduct!)} alt="Detalhe" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <p className={(isDark ? 'text-green-400' : 'text-green-700') + ' text-xs font-medium'}>
                  <i className="fas fa-check-circle mr-1.5"></i>Foto de detalhe/logo disponível
                </p>
                <p className={(isDark ? 'text-green-400/60' : 'text-green-600') + ' text-[10px]'}>
                  Será usada para melhorar a fidelidade do logo e detalhes
                </p>
              </div>
            </div>
          ) : (
            <div className={'rounded-lg p-3 flex items-center gap-3 ' + (isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200')}>
              <div className={'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ' + (isDark ? 'bg-amber-500/10' : 'bg-amber-100')}>
                <i className={'fas fa-magnifying-glass-plus text-sm ' + (isDark ? 'text-amber-400' : 'text-amber-500')}></i>
              </div>
              <div className="flex-1">
                <p className={(isDark ? 'text-amber-400' : 'text-amber-700') + ' text-xs font-medium'}>
                  <i className="fas fa-info-circle mr-1.5"></i>Foto de detalhe não encontrada
                </p>
                <p className={(isDark ? 'text-amber-400/60' : 'text-amber-600') + ' text-[10px]'}>
                  Para melhor fidelidade do logo, cadastre a foto de detalhe no Product Studio
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tipo de produto (upload) + Apresentação do produto */}
      {wizardState.mainProduct && (
        <>
          {/* Se é upload, precisa selecionar o tipo de produto */}
          {isUploadedProduct && (
            <>
              {separator()}
              {sectionTitle('Que tipo de produto é?', 'fa-tag')}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {PRODUCT_TYPES_FOR_UPLOAD.map(type => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setUploadProductType(type.id);
                      // Se a apresentação atual não é válida para o novo tipo, reseta
                      const newPresentations = getPresentationsForType(type.id);
                      if (!newPresentations.find(p => p.id === wizardState.productPresentation)) {
                        onUpdateState({ productPresentation: 'ai_choose', customPresentationText: '' });
                      }
                    }}
                    className={cardClass(uploadProductType === type.id)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <i className={'fas ' + type.icon + ' text-xs ' + (uploadProductType === type.id ? (isDark ? 'text-amber-400' : 'text-amber-500') : (isDark ? 'text-neutral-500' : 'text-gray-400'))}></i>
                      <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>{type.label}</span>
                    </div>
                    <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{type.description}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Apresentação — só se temos um tipo definido */}
          {effectiveProductType && (
            <>
              {separator()}
              {sectionTitle('Como quer exibir o produto?', 'fa-shirt')}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {availablePresentations.map(pres => (
                  <button
                    key={pres.id}
                    onClick={() => onUpdateState({ productPresentation: pres.id, ...(pres.id !== 'custom' ? { customPresentationText: '' } : {}) })}
                    className={cardClass(wizardState.productPresentation === pres.id)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <i className={'fas ' + pres.icon + ' text-xs ' + (wizardState.productPresentation === pres.id ? (isDark ? 'text-amber-400' : 'text-amber-500') : (isDark ? 'text-neutral-500' : 'text-gray-400'))}></i>
                      <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>{pres.label}</span>
                    </div>
                    <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{pres.description}</p>
                  </button>
                ))}
              </div>

              {/* Campo de texto livre para apresentação personalizada */}
              {wizardState.productPresentation === 'custom' && (
                <div className="mt-3">
                  <textarea
                    value={wizardState.customPresentationText}
                    onChange={(e) => onUpdateState({ customPresentationText: e.target.value })}
                    placeholder="Ex: Boné apoiado de lado sobre uma superfície de madeira, com a aba levemente inclinada..."
                    rows={3}
                    className={'w-full rounded-lg px-3 py-2 text-sm outline-none border transition-colors resize-none ' +
                      (isDark
                        ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-600 focus:border-amber-500/50'
                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-amber-400'
                      )}
                  />
                  <p className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[10px] mt-1'}>
                    Descreva como o produto deve ser posicionado e exibido na cena
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {separator()}

      {/* Produtos adicionais */}
      {sectionTitle('Produtos adicionais na composição', 'fa-layer-group')}
      <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mb-3 -mt-1'}>
        Adicione outros produtos do catálogo ou tire fotos de novos produtos para compor a cena (opcional)
      </p>

      {/* Lista de elementos adicionados */}
      {wizardState.additionalProducts.length > 0 && (
        <div className="space-y-2 mb-3">
          {wizardState.additionalProducts.map((el, i) => (
            <div key={i} className={'rounded-lg p-3 flex items-center gap-3 ' + (isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-gray-50 border border-gray-200')}>
              {el.product_image_url ? (
                <div className={'w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 ' + (isDark ? 'bg-neutral-800' : 'bg-gray-100')}>
                  <img src={el.product_image_url} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className={'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ' + (isDark ? 'bg-neutral-800' : 'bg-gray-200')}>
                  <i className={'fas fa-font text-xs ' + (isDark ? 'text-neutral-600' : 'text-gray-400')}></i>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium truncate'}>{el.product_name}</p>
                {el.position_description && (
                  <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] truncate'}>{el.position_description}</p>
                )}
                <span className={'text-[9px] px-1.5 py-0.5 rounded-full mt-0.5 inline-block ' + (
                  el.source === 'catalog' ? (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600') :
                  (isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600')
                )}>
                  {el.source === 'catalog' ? 'Catálogo' : 'Foto/Upload'}
                </span>
              </div>
              <button onClick={() => handleRemoveElement(i)} className={(isDark ? 'text-neutral-600 hover:text-red-400' : 'text-gray-400 hover:text-red-500') + ' transition-colors'}>
                <i className="fas fa-times"></i>
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowAddElementModal(true)}
        className={'w-full rounded-lg p-3 border border-dashed text-center text-xs font-medium transition-colors ' + (isDark ? 'border-neutral-700 hover:border-amber-500/50 text-neutral-500 hover:text-amber-400' : 'border-gray-300 hover:border-amber-400 text-gray-400 hover:text-amber-500')}
      >
        <i className="fas fa-plus mr-1.5"></i>Adicionar produto
      </button>
    </div>
  );

  const renderAestheticPicker = () => (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
        {AESTHETIC_PRESETS.map(preset => (
          <button
            key={preset.id}
            onClick={() => onUpdateState({ aestheticPreset: preset.id, aestheticCustom: '' })}
            className={cardClass(wizardState.aestheticPreset === preset.id)}
          >
            <div className="flex items-center gap-2 mb-1">
              <i className={'fas ' + preset.icon + ' text-xs ' + (wizardState.aestheticPreset === preset.id ? (isDark ? 'text-amber-400' : 'text-amber-500') : (isDark ? 'text-neutral-500' : 'text-gray-400'))}></i>
              <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>{preset.label}</span>
            </div>
            <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{preset.description}</p>
          </button>
        ))}
      </div>
      {/* Personalizado — card clicável */}
      <button
        onClick={() => onUpdateState({ aestheticPreset: null })}
        className={cardClass(wizardState.aestheticPreset === null) + ' w-full'}
      >
        <div className="flex items-center gap-2">
          <i className={'fas fa-pen-fancy text-xs ' + (wizardState.aestheticPreset === null ? (isDark ? 'text-amber-400' : 'text-amber-500') : (isDark ? 'text-neutral-500' : 'text-gray-400'))}></i>
          <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Descrever minha própria estética</span>
        </div>
        <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] mt-0.5'}>Escreva uma descrição livre do estilo que você quer</p>
      </button>
      {wizardState.aestheticPreset === null && (
        <textarea
          value={wizardState.aestheticCustom}
          onChange={(e) => onUpdateState({ aestheticCustom: e.target.value })}
          placeholder="Ex: Aesthetic Y2K com elementos metálicos e tons pastel..."
          className={'w-full rounded-lg p-3 text-sm resize-none h-20 mt-2 ' + (isDark ? 'bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-600' : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400')}
          autoFocus
        />
      )}
    </>
  );

  const renderStep2StyleSimple = () => (
    <div>
      {/* Estética */}
      {sectionTitle('Estética', 'fa-palette')}
      {renderAestheticPicker()}

      {separator()}

      {/* Superfície */}
      {sectionTitle('Descreva a superfície', 'fa-table')}
      <textarea
        value={wizardState.surfaceDescription}
        onChange={(e) => onUpdateState({ surfaceDescription: e.target.value })}
        placeholder='Ex: "Mármore branco com veios dourados", "Madeira rústica envelhecida", "Concreto queimado"'
        className={'w-full rounded-lg p-3 text-sm resize-none h-20 ' + (isDark ? 'bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-600' : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400')}
      />

      {separator()}

      {/* Elementos decorativos */}
      {sectionTitle('Elementos na composição (opcional)', 'fa-leaf')}
      <textarea
        value={wizardState.elementsDescription}
        onChange={(e) => onUpdateState({ elementsDescription: e.target.value })}
        placeholder='Ex: "Folhas de eucalipto, pedras brancas, gotas de água, pétalas de rosa secas"'
        className={'w-full rounded-lg p-3 text-sm resize-none h-20 ' + (isDark ? 'bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-600' : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400')}
      />

      {separator()}

      {/* Formato */}
      {sectionTitle('Formato da imagem', 'fa-crop-simple')}
      <div className="grid grid-cols-4 gap-2">
        {FRAME_RATIOS.map(ratio => (
          <button
            key={ratio.id}
            onClick={() => onUpdateState({ frameRatio: ratio.id })}
            className={cardClass(wizardState.frameRatio === ratio.id) + ' text-center'}
          >
            <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold block'}>{ratio.label}</span>
            <span className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] block'}>{ratio.description}</span>
          </button>
        ))}
      </div>

      {/* Info - IA escolhe */}
      <div className={'mt-4 rounded-lg p-3 flex items-start gap-2 ' + (isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200')}>
        <i className={'fas fa-wand-magic-sparkles text-xs mt-0.5 ' + (isDark ? 'text-amber-400' : 'text-amber-500')}></i>
        <p className={(isDark ? 'text-amber-400/80' : 'text-amber-700') + ' text-xs'}>
          A IA vai escolher automaticamente a melhor iluminação, câmera, lente, ângulo e coloração baseado na sua estética.
        </p>
      </div>
    </div>
  );

  const renderStep2StyleAdvanced = () => (
    <div>
      {/* Estética */}
      {sectionTitle('Estética', 'fa-palette')}
      {renderAestheticPicker()}

      {separator()}

      {/* Coloração */}
      {sectionTitle('Coloração', 'fa-droplet')}
      <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mb-2'}>Tonalidade</p>
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-3">
        {COLOR_TONES.map(tone => (
          <button
            key={tone.id}
            onClick={() => onUpdateState({ colorTone: tone.id })}
            className={cardClass(wizardState.colorTone === tone.id) + ' text-center'}
          >
            <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium block'}>{tone.label}</span>
            <span className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] block'}>{tone.description}</span>
          </button>
        ))}
      </div>
      <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mb-2'}>Estilo</p>
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        {COLOR_STYLES.map(style => (
          <button
            key={style.id}
            onClick={() => onUpdateState({ colorStyle: style.id })}
            className={cardClass(wizardState.colorStyle === style.id) + ' text-center'}
          >
            <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium block'}>{style.label}</span>
            <span className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] block'}>{style.description}</span>
          </button>
        ))}
      </div>

      {separator()}

      {/* Referência visual */}
      {sectionTitle('Referência de estilo (opcional)', 'fa-image')}
      {wizardState.referenceImage ? (
        <div className="relative inline-block">
          <img
            src={`data:${wizardState.referenceImage.mimeType};base64,${wizardState.referenceImage.base64}`}
            alt="Referência"
            className="w-32 h-32 object-cover rounded-lg"
          />
          <button
            onClick={() => onUpdateState({ referenceImage: null })}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      ) : (
        <label className={'block rounded-lg p-4 border border-dashed text-center cursor-pointer transition-colors ' + (isDark ? 'border-neutral-700 hover:border-amber-500/50 text-neutral-500' : 'border-gray-300 hover:border-amber-400 text-gray-400')}>
          <i className="fas fa-cloud-arrow-up text-lg mb-1 block"></i>
          <span className="text-xs">Arraste ou clique para upload</span>
          <input type="file" accept="image/*" onChange={handleReferenceUpload} className="hidden" />
        </label>
      )}
    </div>
  );

  const renderStep3Scene = () => (
    <div>
      {/* Superfície */}
      {sectionTitle('Descreva a superfície', 'fa-table')}
      <textarea
        value={wizardState.surfaceDescription}
        onChange={(e) => onUpdateState({ surfaceDescription: e.target.value })}
        placeholder='Ex: "Mármore branco com veios dourados"'
        className={'w-full rounded-lg p-3 text-sm resize-none h-20 ' + (isDark ? 'bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-600' : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400')}
      />

      {separator()}

      {/* Elementos */}
      {sectionTitle('Elementos na composição (opcional)', 'fa-leaf')}
      <textarea
        value={wizardState.elementsDescription}
        onChange={(e) => onUpdateState({ elementsDescription: e.target.value })}
        placeholder='Ex: "Folhas de eucalipto, pedras brancas, gotas de água"'
        className={'w-full rounded-lg p-3 text-sm resize-none h-20 ' + (isDark ? 'bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-600' : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400')}
      />

      {separator()}

      {/* Iluminação */}
      {sectionTitle('Iluminação', 'fa-lightbulb')}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {LIGHTING_OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => onUpdateState({ lighting: opt.id })}
            className={cardClass(wizardState.lighting === opt.id)}
          >
            <div className="flex items-center gap-2 mb-1">
              <i className={'fas ' + opt.icon + ' text-xs ' + (wizardState.lighting === opt.id ? (isDark ? 'text-amber-400' : 'text-amber-500') : (isDark ? 'text-neutral-500' : 'text-gray-400'))}></i>
              <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>{opt.label}</span>
            </div>
            <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{opt.description}</p>
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep4Camera = () => (
    <div>
      {/* Formato */}
      {sectionTitle('Formato da imagem', 'fa-crop-simple')}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {FRAME_RATIOS.map(ratio => (
          <button
            key={ratio.id}
            onClick={() => onUpdateState({ frameRatio: ratio.id })}
            className={cardClass(wizardState.frameRatio === ratio.id) + ' text-center'}
          >
            <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold block'}>{ratio.label}</span>
            <span className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] block'}>{ratio.description}</span>
          </button>
        ))}
      </div>

      {separator()}

      {/* Tipo de câmera */}
      {sectionTitle('Tipo de câmera', 'fa-camera')}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {CAMERA_TYPES.map(cam => (
          <button
            key={cam.id}
            onClick={() => onUpdateState({ cameraType: cam.id })}
            className={cardClass(wizardState.cameraType === cam.id)}
          >
            <div className="flex items-center gap-2 mb-1">
              <i className={'fas ' + cam.icon + ' text-xs ' + (wizardState.cameraType === cam.id ? (isDark ? 'text-amber-400' : 'text-amber-500') : (isDark ? 'text-neutral-500' : 'text-gray-400'))}></i>
              <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>{cam.label}</span>
            </div>
            <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{cam.description}</p>
          </button>
        ))}
      </div>

      {separator()}

      {/* Modelo da Lente */}
      {sectionTitle('Modelo da Lente', 'fa-circle-dot')}
      {['wide', 'standard', 'portrait', 'macro', 'ai'].map(category => {
        const lenses = LENS_OPTIONS.filter(l => l.category === category);
        const categoryLabels: Record<string, string> = {
          wide: 'Wide (Ambiente + Contexto)',
          standard: 'Standard (Versátil)',
          portrait: 'Portrait (Compressão)',
          macro: 'Macro (Detalhes)',
          ai: '',
        };
        return (
          <div key={category} className="mb-3">
            {categoryLabels[category] && (
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] font-medium uppercase tracking-wide mb-1.5'}>{categoryLabels[category]}</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {lenses.map(lens => (
                <button
                  key={lens.id}
                  onClick={() => onUpdateState({ lensModel: lens.id })}
                  className={cardClass(wizardState.lensModel === lens.id)}
                >
                  <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium block'}>{lens.label}</span>
                  <span className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] block'}>{lens.description}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {separator()}

      {/* Ângulo */}
      {sectionTitle('Ângulo de câmera', 'fa-rotate')}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {CAMERA_ANGLES.map(angle => (
          <button
            key={angle.id}
            onClick={() => onUpdateState({ cameraAngle: angle.id })}
            className={cardClass(wizardState.cameraAngle === angle.id)}
          >
            <div className="flex items-center gap-2 mb-1">
              <i className={'fas ' + angle.icon + ' text-xs ' + (wizardState.cameraAngle === angle.id ? (isDark ? 'text-amber-400' : 'text-amber-500') : (isDark ? 'text-neutral-500' : 'text-gray-400'))}></i>
              <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>{angle.label}</span>
            </div>
            <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{angle.description}</p>
          </button>
        ))}
      </div>

      {separator()}

      {/* Profundidade de campo */}
      {sectionTitle('Profundidade de campo', 'fa-bullseye')}
      <div className="flex items-center gap-3">
        <span className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] w-16 text-right'}>Tudo em foco</span>
        <input
          type="range"
          min={0}
          max={100}
          value={wizardState.depthOfField}
          onChange={(e) => onUpdateState({ depthOfField: Number(e.target.value) })}
          className="flex-1 accent-amber-500"
        />
        <span className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] w-16'}>Bokeh intenso</span>
      </div>
    </div>
  );

  const renderReviewStep = () => {
    const aestheticLabel = wizardState.aestheticPreset
      ? AESTHETIC_PRESETS.find(p => p.id === wizardState.aestheticPreset)?.label
      : wizardState.aestheticCustom || 'Não definido';

    const lightingLabel = LIGHTING_OPTIONS.find(l => l.id === wizardState.lighting)?.label || wizardState.lighting;
    const cameraLabel = CAMERA_TYPES.find(c => c.id === wizardState.cameraType)?.label || wizardState.cameraType;
    const lensLabel = LENS_OPTIONS.find(l => l.id === wizardState.lensModel)?.label || wizardState.lensModel;
    const angleLabel = CAMERA_ANGLES.find(a => a.id === wizardState.cameraAngle)?.label || wizardState.cameraAngle;
    const toneLabel = COLOR_TONES.find(t => t.id === wizardState.colorTone)?.label || wizardState.colorTone;
    const styleLabel = COLOR_STYLES.find(s => s.id === wizardState.colorStyle)?.label || wizardState.colorStyle;
    const ratioLabel = FRAME_RATIOS.find(r => r.id === wizardState.frameRatio)?.label || wizardState.frameRatio;
    const presentationLabel = wizardState.productPresentation === 'custom'
      ? (wizardState.customPresentationText ? `Personalizado: ${wizardState.customPresentationText}` : 'Personalizado (sem descrição)')
      : (ALL_PRESENTATIONS.find(p => p.id === wizardState.productPresentation)?.label || wizardState.productPresentation);
    const placementLabel = PRODUCT_PLACEMENTS.find(p => p.id === wizardState.productPlacement)?.label || wizardState.productPlacement;

    const ReviewRow = ({ icon, label, value, onEdit }: { icon: string; label: string; value: string; onEdit: () => void }) => (
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <i className={'fas ' + icon + ' text-xs w-4 text-center ' + (isDark ? 'text-neutral-600' : 'text-gray-400')}></i>
          <span className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs w-20 flex-shrink-0'}>{label}</span>
          <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium truncate'}>{value}</span>
        </div>
        <button onClick={onEdit} className={(isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-500') + ' text-[10px] font-medium flex-shrink-0 ml-2'}>
          Editar
        </button>
      </div>
    );

    return (
      <div>
        {sectionTitle('Resumo do seu Still Criativo', 'fa-clipboard-list')}
        <div className={'rounded-xl overflow-hidden divide-y ' + (isDark ? 'bg-neutral-900 border border-neutral-800 divide-neutral-800' : 'bg-white border border-gray-200 divide-gray-100 shadow-sm')}>
          <div className="px-4">
            <ReviewRow icon="fa-box" label="Produto" value={
              (wizardState.mainProduct?.name || 'Nenhum') +
              (!wizardState.mainProduct?.id?.startsWith('upload-') ? ` (${wizardState.mainProductView === 'back' ? 'Costas' : 'Frente'} + Detalhe)` : '')
            } onEdit={() => setCurrentStep(1)} />
            {wizardState.additionalProducts.length > 0 && (
              <div className="pb-2">
                {wizardState.additionalProducts.map((el, i) => (
                  <p key={i} className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] ml-6 pl-1'}>
                    + {el.product_name} {el.position_description ? `(${el.position_description})` : ''}
                  </p>
                ))}
              </div>
            )}
          </div>
          <div className="px-4">
            <ReviewRow icon="fa-shirt" label="Exibição" value={presentationLabel} onEdit={() => setCurrentStep(1)} />
          </div>
          <div className="px-4">
            <ReviewRow icon="fa-palette" label="Estética" value={aestheticLabel} onEdit={() => setCurrentStep(2)} />
          </div>
          <div className="px-4">
            <ReviewRow icon="fa-table" label="Superfície" value={wizardState.surfaceDescription || 'Não definido'} onEdit={() => setCurrentStep(isSimple ? 2 : 3)} />
          </div>
          {wizardState.elementsDescription && (
            <div className="px-4">
              <ReviewRow icon="fa-leaf" label="Elementos" value={wizardState.elementsDescription} onEdit={() => setCurrentStep(isSimple ? 2 : 3)} />
            </div>
          )}
          <div className="px-4">
            <ReviewRow icon="fa-crop-simple" label="Formato" value={ratioLabel + ' (' + FRAME_RATIOS.find(r => r.id === wizardState.frameRatio)?.description + ')'} onEdit={() => setCurrentStep(isSimple ? 2 : 4)} />
          </div>
          {isSimple ? (
            <div className="px-4 py-2">
              <div className="flex items-center gap-2">
                <i className={'fas fa-wand-magic-sparkles text-xs ' + (isDark ? 'text-amber-400' : 'text-amber-500')}></i>
                <span className={(isDark ? 'text-amber-400/80' : 'text-amber-600') + ' text-xs'}>Iluminação, câmera e cores: IA escolhe</span>
              </div>
            </div>
          ) : (
            <>
              <div className="px-4">
                <ReviewRow icon="fa-lightbulb" label="Iluminação" value={lightingLabel} onEdit={() => setCurrentStep(3)} />
              </div>
              <div className="px-4">
                <ReviewRow icon="fa-camera" label="Câmera" value={cameraLabel} onEdit={() => setCurrentStep(4)} />
              </div>
              <div className="px-4">
                <ReviewRow icon="fa-circle-dot" label="Lente" value={lensLabel} onEdit={() => setCurrentStep(4)} />
              </div>
              <div className="px-4">
                <ReviewRow icon="fa-rotate" label="Ângulo" value={angleLabel} onEdit={() => setCurrentStep(4)} />
              </div>
              <div className="px-4">
                <ReviewRow icon="fa-droplet" label="Cor" value={toneLabel + ' / ' + styleLabel} onEdit={() => setCurrentStep(2)} />
              </div>
            </>
          )}
        </div>

        {/* Posicionamento na composição */}
        {separator()}
        {sectionTitle('Posicionamento na composição', 'fa-crosshairs')}

        {/* Produto principal */}
        <p className={(isDark ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium mb-2'}>
          <i className="fas fa-box mr-1.5 text-[10px] opacity-50"></i>
          Onde posicionar o produto principal?
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {PRODUCT_PLACEMENTS.map(pl => (
            <button
              key={pl.id}
              onClick={() => onUpdateState({ productPlacement: pl.id })}
              className={cardClass(wizardState.productPlacement === pl.id)}
            >
              <div className="flex items-center gap-2 mb-1">
                <i className={'fas ' + pl.icon + ' text-xs ' + (wizardState.productPlacement === pl.id ? (isDark ? 'text-amber-400' : 'text-amber-500') : (isDark ? 'text-neutral-500' : 'text-gray-400'))}></i>
                <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>{pl.label}</span>
              </div>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{pl.description}</p>
            </button>
          ))}
        </div>

        {/* Posição dos produtos adicionais */}
        {wizardState.additionalProducts.length > 0 && (
          <div className="mt-4">
            <p className={(isDark ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium mb-2'}>
              <i className="fas fa-layer-group mr-1.5 text-[10px] opacity-50"></i>
              Posição dos produtos adicionais
            </p>
            <div className="space-y-2">
              {wizardState.additionalProducts.map((el, i) => (
                <div key={i} className={'rounded-lg p-3 flex items-center gap-3 ' + (isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-gray-50 border border-gray-200')}>
                  {el.product_image_url && (
                    <div className={'w-8 h-8 rounded-md overflow-hidden flex-shrink-0 ' + (isDark ? 'bg-neutral-800' : 'bg-gray-100')}>
                      <img src={el.product_image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium flex-shrink-0'}>{el.product_name}</span>
                  <input
                    value={el.position_description}
                    onChange={(e) => {
                      const updated = [...wizardState.additionalProducts];
                      updated[i] = { ...updated[i], position_description: e.target.value };
                      onUpdateState({ additionalProducts: updated });
                    }}
                    placeholder="Ex: ao lado esquerdo, levemente atrás"
                    className={'flex-1 rounded-md px-2 py-1.5 text-xs ' + (isDark ? 'bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-600' : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400')}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Posição dos elementos decorativos */}
        {wizardState.elementsDescription.trim() && (
          <div className="mt-4">
            <p className={(isDark ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium mb-2'}>
              <i className="fas fa-leaf mr-1.5 text-[10px] opacity-50"></i>
              Onde posicionar os elementos decorativos?
            </p>
            <input
              value={wizardState.elementsPlacement}
              onChange={(e) => onUpdateState({ elementsPlacement: e.target.value })}
              placeholder='Ex: "Folhas espalhadas ao redor", "Pedras alinhadas à frente do produto", "Pétalas caindo do canto superior"'
              className={'w-full rounded-lg px-3 py-2.5 text-xs ' + (isDark ? 'bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-600' : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400')}
            />
            <p className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[10px] mt-1'}>
              Elementos: {wizardState.elementsDescription}
            </p>
          </div>
        )}

        {separator()}

        {/* Referência visual (modo simples também pode subir) */}
        {!wizardState.referenceImage && isSimple && (
          <>
            {sectionTitle('Referência de estilo (opcional)', 'fa-image')}
            <label className={'block rounded-lg p-4 border border-dashed text-center cursor-pointer transition-colors mb-4 ' + (isDark ? 'border-neutral-700 hover:border-amber-500/50 text-neutral-500' : 'border-gray-300 hover:border-amber-400 text-gray-400')}>
              <i className="fas fa-cloud-arrow-up text-lg mb-1 block"></i>
              <span className="text-xs">Suba uma foto de inspiração para a IA se basear</span>
              <input type="file" accept="image/*" onChange={handleReferenceUpload} className="hidden" />
            </label>
          </>
        )}
        {wizardState.referenceImage && (
          <>
            {sectionTitle('Referência de estilo', 'fa-image')}
            <div className="relative inline-block mb-4">
              <img
                src={`data:${wizardState.referenceImage.mimeType};base64,${wizardState.referenceImage.base64}`}
                alt="Referência"
                className="w-24 h-24 object-cover rounded-lg"
              />
              <button
                onClick={() => onUpdateState({ referenceImage: null })}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px]"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </>
        )}

        {separator()}

        {/* Salvar como template */}
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={wizardState.saveAsTemplate}
            onChange={(e) => onUpdateState({ saveAsTemplate: e.target.checked })}
            className="mt-1 accent-amber-500"
          />
          <div className="flex-1">
            <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Salvar este estilo como template</p>
            <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Para reutilizar com outros produtos</p>
            {wizardState.saveAsTemplate && (
              <input
                value={wizardState.templateName}
                onChange={(e) => onUpdateState({ templateName: e.target.value })}
                placeholder="Nome do template..."
                className={'mt-2 w-full rounded-lg px-3 py-2 text-sm ' + (isDark ? 'bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-600' : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400')}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDER CURRENT STEP
  // ============================================================
  const renderCurrentStep = () => {
    if (currentStep === 1) return renderStep1Product();

    if (isSimple) {
      if (currentStep === 2) return renderStep2StyleSimple();
      if (currentStep === 3) return renderReviewStep();
    } else {
      if (currentStep === 2) return renderStep2StyleAdvanced();
      if (currentStep === 3) return renderStep3Scene();
      if (currentStep === 4) return renderStep4Camera();
      if (currentStep === 5) return renderReviewStep();
    }
    return null;
  };

  const isLastStep = currentStep === totalSteps;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className={'flex-1 overflow-y-auto ' + (isDark ? '' : 'bg-[#F5F5F7]')} style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 1rem))' }}>
      <div className="max-w-2xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={goPrev} className={(isDark ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-900') + ' p-2 -ml-2 rounded-lg transition-colors'}>
              <i className="fas fa-arrow-left"></i>
            </button>
            <div>
              <h1 className={(isDark ? 'text-white' : 'text-[#1A1A1A]') + ' text-lg font-semibold'}>Still Criativo</h1>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>
                Modo {isSimple ? 'Simples' : 'Avançado'} · Passo {currentStep} de {totalSteps}
              </p>
            </div>
          </div>
          <div className={'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ' + (isDark ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-amber-50 text-amber-600 border border-amber-200')}>
            <i className="fas fa-coins text-[10px]"></i>
            <span>{userCredits.toLocaleString()}</span>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-1 mb-6">
          {steps.map((step, i) => (
            <React.Fragment key={step.id}>
              <button
                onClick={() => { if (step.id < currentStep) setCurrentStep(step.id); }}
                className={'flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium transition-all ' +
                  (step.id === currentStep
                    ? (isDark ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-amber-100 text-amber-600 border border-amber-300')
                    : step.id < currentStep
                      ? (isDark ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-pointer' : 'bg-green-100 text-green-600 border border-green-300 cursor-pointer')
                      : (isDark ? 'bg-neutral-800 text-neutral-600 border border-neutral-700' : 'bg-gray-100 text-gray-400 border border-gray-200')
                  )}
              >
                <i className={'fas ' + (step.id < currentStep ? 'fa-check' : step.icon) + ' text-[8px]'}></i>
                <span className="hidden md:inline">{step.title}</span>
              </button>
              {i < steps.length - 1 && (
                <div className={'flex-1 h-px ' + (step.id < currentStep ? (isDark ? 'bg-green-500/30' : 'bg-green-300') : (isDark ? 'bg-neutral-800' : 'bg-gray-200'))}></div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        {renderCurrentStep()}

        {/* Navigation Buttons (inline) */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={goPrev}
            className={'flex-1 py-3 rounded-xl font-medium text-sm transition-all ' + (isDark ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}
          >
            <i className="fas fa-arrow-left mr-2"></i>Voltar
          </button>
          {isLastStep ? (
            <button
              onClick={onGenerate}
              disabled={userCredits < 2}
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fas fa-wand-magic-sparkles mr-2"></i>Gerar 2 Variações (2 créditos)
            </button>
          ) : (
            canGoNext() && (
              <button
                onClick={goNext}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium text-sm"
              >
                Continuar<i className="fas fa-arrow-right ml-2"></i>
              </button>
            )
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL: Selecionar Produto (mesmo padrão do Product Studio) */}
      {/* ============================================================ */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-2xl border w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col'}>
            {/* Header */}
            <div className={(isDark ? 'border-neutral-800' : 'border-gray-200') + ' border-b p-4 flex items-center justify-between'}>
              <div>
                <h2 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold'}>Selecione o produto</h2>
                <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>{filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} disponíveis</p>
              </div>
              <button
                onClick={() => { setShowProductModal(false); setProductSearchTerm(''); setProductFilterCategoryGroup(''); setProductFilterCategory(''); }}
                className={(isDark ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-600') + ' w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-800/50 transition-colors'}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Filtros */}
            <div className="p-4 flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm'}></i>
                <input
                  type="text"
                  placeholder="Buscar produto..."
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400') + ' w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-amber-500/50'}
                  autoFocus
                />
              </div>
              <select
                value={productFilterCategoryGroup}
                onChange={(e) => { setProductFilterCategoryGroup(e.target.value); setProductFilterCategory(''); }}
                className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' px-4 py-2.5 border rounded-xl text-sm sm:w-40'}
              >
                <option value="">Categoria</option>
                {CATEGORY_GROUPS.map(group => (
                  <option key={group.id} value={group.id}>{group.label}</option>
                ))}
              </select>
              {productFilterCategoryGroup && (
                <select
                  value={productFilterCategory}
                  onChange={(e) => setProductFilterCategory(e.target.value)}
                  className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' px-4 py-2.5 border rounded-xl text-sm sm:w-40'}
                >
                  <option value="">Subcategoria</option>
                  {CATEGORY_GROUPS.find(g => g.id === productFilterCategoryGroup)?.items.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Grid de Produtos */}
            <div className="flex-1 overflow-y-auto p-4 pt-0">
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredProducts.map(product => {
                    const productImage = getProductImageUrl(product);
                    return (
                      <div
                        key={product.id}
                        onClick={() => {
                          onUpdateState({ mainProduct: product, mainProductView: 'front', productPresentation: 'ai_choose', customPresentationText: '' });
                          setUploadProductType(null);
                          setShowProductModal(false);
                          setProductSearchTerm('');
                          setProductFilterCategoryGroup('');
                          setProductFilterCategory('');
                        }}
                        className={(isDark ? 'bg-neutral-800 border-neutral-700 hover:border-amber-500/50' : 'bg-gray-50 border-gray-200 hover:border-amber-300') + ' rounded-xl border overflow-hidden cursor-pointer transition-all group'}
                      >
                        <div className={(isDark ? 'bg-neutral-700' : 'bg-gray-100') + ' aspect-square relative overflow-hidden'}>
                          {productImage ? (
                            <img
                              src={productImage}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-image text-2xl'}></i>
                            </div>
                          )}
                          <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="w-full py-1.5 bg-gradient-to-r from-amber-500 to-orange-400 text-white rounded-lg font-medium text-[10px]">
                              <i className="fas fa-check mr-1"></i>Selecionar
                            </button>
                          </div>
                        </div>
                        <div className="p-2.5">
                          <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[8px] font-medium uppercase tracking-wide'}>{product.sku}</p>
                          <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium truncate mt-0.5'}>{product.name}</p>
                          {product.category && (
                            <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] mt-1'}>{product.category}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-100') + ' w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3'}>
                    <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-search text-xl'}></i>
                  </div>
                  <p className={(isDark ? 'text-white' : 'text-gray-900') + ' font-medium text-sm mb-1'}>
                    {productSearchTerm || productFilterCategoryGroup || productFilterCategory ? 'Nenhum produto encontrado' : 'Nenhum produto disponível'}
                  </p>
                  <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>
                    {productSearchTerm || productFilterCategoryGroup || productFilterCategory ? 'Tente ajustar os filtros' : 'Importe produtos para começar'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: Adicionar Elemento */}
      {/* ============================================================ */}
      {showAddElementModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-2xl border w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col'}>
            {/* Header */}
            <div className={(isDark ? 'border-neutral-800' : 'border-gray-200') + ' border-b p-4 flex items-center justify-between'}>
              <div>
                <h2 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold'}>Adicionar Produto</h2>
                <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Selecione um produto adicional para a composição</p>
              </div>
              <button
                onClick={() => { setShowAddElementModal(false); setElementSearchTerm(''); setElementFilterCategoryGroup(''); setElementFilterCategory(''); }}
                className={(isDark ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-600') + ' w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-800/50 transition-colors'}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Tabs */}
            <div className={'flex border-b ' + (isDark ? 'border-neutral-800' : 'border-gray-200')}>
              {[
                { id: 'catalog' as const, label: 'Do Catálogo', icon: 'fa-box' },
                { id: 'upload' as const, label: 'Foto / Upload', icon: 'fa-camera' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setElementTab(tab.id)}
                  className={'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2 ' +
                    (elementTab === tab.id
                      ? (isDark ? 'border-amber-500 text-amber-400' : 'border-amber-500 text-amber-600')
                      : (isDark ? 'border-transparent text-neutral-500 hover:text-white' : 'border-transparent text-gray-400 hover:text-gray-600')
                    )}
                >
                  <i className={'fas ' + tab.icon + ' text-[10px]'}></i>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Posição (comum a todos) */}
            <div className="p-4 pb-0">
              <input
                value={elementPosition}
                onChange={(e) => setElementPosition(e.target.value)}
                placeholder="Posicionamento: ex. ao lado esquerdo, levemente inclinado"
                className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400') + ' w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-amber-500/50'}
              />
            </div>

            {/* Tab Content */}
            {elementTab === 'catalog' && (
              <>
                {/* Filtros */}
                <div className="p-4 pb-0 flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm'}></i>
                    <input
                      type="text"
                      placeholder="Buscar produto..."
                      value={elementSearchTerm}
                      onChange={(e) => setElementSearchTerm(e.target.value)}
                      className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400') + ' w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-amber-500/50'}
                    />
                  </div>
                  <select
                    value={elementFilterCategoryGroup}
                    onChange={(e) => { setElementFilterCategoryGroup(e.target.value); setElementFilterCategory(''); }}
                    className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' px-4 py-2.5 border rounded-xl text-sm sm:w-40'}
                  >
                    <option value="">Categoria</option>
                    {CATEGORY_GROUPS.map(group => (
                      <option key={group.id} value={group.id}>{group.label}</option>
                    ))}
                  </select>
                  {elementFilterCategoryGroup && (
                    <select
                      value={elementFilterCategory}
                      onChange={(e) => setElementFilterCategory(e.target.value)}
                      className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' px-4 py-2.5 border rounded-xl text-sm sm:w-40'}
                    >
                      <option value="">Subcategoria</option>
                      {CATEGORY_GROUPS.find(g => g.id === elementFilterCategoryGroup)?.items.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Grid de Produtos */}
                <div className="flex-1 overflow-y-auto p-4">
                  {filteredElementProducts.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {filteredElementProducts.map(product => {
                        const productImage = getProductImageUrl(product);
                        return (
                          <div
                            key={product.id}
                            onClick={() => handleAddCatalogElement(product)}
                            className={(isDark ? 'bg-neutral-800 border-neutral-700 hover:border-amber-500/50' : 'bg-gray-50 border-gray-200 hover:border-amber-300') + ' rounded-xl border overflow-hidden cursor-pointer transition-all group'}
                          >
                            <div className={(isDark ? 'bg-neutral-700' : 'bg-gray-100') + ' aspect-square relative overflow-hidden'}>
                              {productImage ? (
                                <img
                                  src={productImage}
                                  alt={product.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-image text-2xl'}></i>
                                </div>
                              )}
                              <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="w-full py-1.5 bg-gradient-to-r from-amber-500 to-orange-400 text-white rounded-lg font-medium text-[10px]">
                                  <i className="fas fa-plus mr-1"></i>Adicionar
                                </button>
                              </div>
                            </div>
                            <div className="p-2.5">
                              <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[8px] font-medium uppercase tracking-wide'}>{product.sku}</p>
                              <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium truncate mt-0.5'}>{product.name}</p>
                              {product.category && (
                                <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] mt-1'}>{product.category}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-100') + ' w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3'}>
                        <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-search text-xl'}></i>
                      </div>
                      <p className={(isDark ? 'text-white' : 'text-gray-900') + ' font-medium text-sm mb-1'}>
                        {elementSearchTerm || elementFilterCategoryGroup || elementFilterCategory ? 'Nenhum produto encontrado' : 'Nenhum produto disponível'}
                      </p>
                      <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>
                        {elementSearchTerm || elementFilterCategoryGroup || elementFilterCategory ? 'Tente ajustar os filtros' : 'Importe produtos para começar'}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {elementTab === 'upload' && (
              <div className="flex-1 flex items-center justify-center p-4">
                <label className={'block rounded-xl p-8 border-2 border-dashed cursor-pointer transition-colors w-full text-center ' + (isDark ? 'border-neutral-700 hover:border-amber-500/50 text-neutral-500' : 'border-gray-300 hover:border-amber-400 text-gray-400')}>
                  <i className="fas fa-camera text-3xl mb-3 block"></i>
                  <span className="text-sm font-medium block">Tirar foto ou selecionar imagem</span>
                  <span className="text-[10px] block mt-1">JPG, PNG ou WebP</span>
                  <input ref={elementFileRef} type="file" accept="image/*" capture="environment" onChange={handleElementUpload} className="hidden" />
                </label>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
