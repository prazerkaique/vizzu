import React, { useState, useRef } from 'react';
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
} from './index';
import { compressImage } from '../../utils/imageCompression';

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
  const [elementTab, setElementTab] = useState<'catalog' | 'upload'>('catalog');
  const [elementPosition, setElementPosition] = useState('');
  const [elementSearchTerm, setElementSearchTerm] = useState('');
  const elementFileRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark';
  const isSimple = wizardState.mode === 'simple';
  const steps = isSimple ? SIMPLE_STEPS : ADVANCED_STEPS;
  const totalSteps = steps.length;

  // Filtra produtos
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  const filteredElementProducts = products.filter(p =>
    p.name.toLowerCase().includes(elementSearchTerm.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(elementSearchTerm.toLowerCase())
  );

  // Navegação
  const canGoNext = () => {
    if (currentStep === 1) return !!wizardState.mainProduct;
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

  // Helper: pegar imagem de um produto
  const getProductImageUrl = (product: Product): string => {
    if (product.originalImages?.front?.url) return product.originalImages.front.url;
    if (product.images?.[0]?.url) return product.images[0].url;
    return '';
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
      onUpdateState({ mainProduct: uploadedProduct });
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
            onClick={() => { onUpdateState({ mainProduct: null }); }}
            className={(isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-500') + ' text-xs font-medium'}
          >
            Trocar
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Selecionar do catálogo */}
          <button
            onClick={() => setShowProductModal(true)}
            className={'w-full rounded-xl p-4 text-left flex items-center gap-4 transition-all border ' + (isDark ? 'bg-neutral-900 border-neutral-800 hover:border-amber-500/50' : 'bg-white border-gray-200 hover:border-amber-400 shadow-sm')}
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

          {/* Upload / Drag and Drop */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={'w-full rounded-xl p-6 border-2 border-dashed text-center transition-all cursor-pointer ' +
              (dragOver
                ? (isDark ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-amber-400 bg-amber-50 text-amber-500')
                : (isDark ? 'border-neutral-700 hover:border-amber-500/50 text-neutral-500 hover:text-amber-400' : 'border-gray-300 hover:border-amber-400 text-gray-400 hover:text-amber-500')
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

  const renderStep2StyleSimple = () => (
    <div>
      {/* Estética */}
      {sectionTitle('Estética', 'fa-palette')}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
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
      <div className="mb-1">
        <label className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-xs'}>
          <input
            type="radio"
            checked={wizardState.aestheticPreset === null && wizardState.aestheticCustom.length > 0}
            onChange={() => onUpdateState({ aestheticPreset: null })}
            className="mr-2"
          />
          Descrever minha própria estética
        </label>
      </div>
      {(wizardState.aestheticPreset === null) && (
        <textarea
          value={wizardState.aestheticCustom}
          onChange={(e) => onUpdateState({ aestheticCustom: e.target.value })}
          placeholder="Ex: Aesthetic Y2K com elementos metálicos e tons pastel..."
          className={'w-full rounded-lg p-3 text-sm resize-none h-20 ' + (isDark ? 'bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-600' : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400')}
        />
      )}

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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
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
      <div className="mb-1">
        <label className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-xs'}>
          <input
            type="radio"
            checked={wizardState.aestheticPreset === null && wizardState.aestheticCustom.length > 0}
            onChange={() => onUpdateState({ aestheticPreset: null })}
            className="mr-2"
          />
          Descrever minha própria estética
        </label>
      </div>
      {(wizardState.aestheticPreset === null) && (
        <textarea
          value={wizardState.aestheticCustom}
          onChange={(e) => onUpdateState({ aestheticCustom: e.target.value })}
          placeholder="Ex: Aesthetic Y2K com elementos metálicos..."
          className={'w-full rounded-lg p-3 text-sm resize-none h-20 ' + (isDark ? 'bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-600' : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400')}
        />
      )}

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
            <ReviewRow icon="fa-box" label="Produto" value={wizardState.mainProduct?.name || 'Nenhum'} onEdit={() => setCurrentStep(1)} />
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
      <div className="max-w-2xl mx-auto p-4 md:p-6 pb-32">
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

        {/* Footer Navigation */}
        <div className={'fixed bottom-0 left-0 right-0 md:left-52 p-4 border-t z-30 ' + (isDark ? 'bg-neutral-950/95 backdrop-blur-xl border-neutral-800' : 'bg-white/95 backdrop-blur-xl border-gray-200')}>
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <button
              onClick={goPrev}
              className={(isDark ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' px-4 py-2.5 rounded-xl text-sm font-medium transition-colors'}
            >
              <i className="fas fa-arrow-left mr-2 text-xs"></i>Voltar
            </button>
            {isLastStep ? (
              <button
                onClick={onGenerate}
                disabled={userCredits < 2}
                className={'px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-semibold transition-all hover:shadow-lg hover:shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'}
              >
                <i className="fas fa-wand-magic-sparkles text-xs"></i>
                Gerar 2 Variações
                <span className="text-xs opacity-80">(2 créditos)</span>
              </button>
            ) : (
              <button
                onClick={goNext}
                disabled={!canGoNext()}
                className={'px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-semibold transition-all hover:shadow-lg hover:shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed'}
              >
                Próximo <i className="fas fa-arrow-right ml-2 text-xs"></i>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL: Selecionar Produto */}
      {/* ============================================================ */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={() => setShowProductModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
          <div
            onClick={(e) => e.stopPropagation()}
            className={'relative w-full md:max-w-lg md:rounded-2xl rounded-t-2xl overflow-hidden max-h-[80vh] flex flex-col ' + (isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-white')}
          >
            {/* Header */}
            <div className={'p-4 border-b flex items-center justify-between ' + (isDark ? 'border-neutral-800' : 'border-gray-200')}>
              <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold'}>Selecionar Produto</h3>
              <button onClick={() => setShowProductModal(false)} className={(isDark ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-600') + ' transition-colors'}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            {/* Search */}
            <div className="p-3">
              <div className={'flex items-center gap-2 rounded-lg px-3 py-2 ' + (isDark ? 'bg-neutral-800' : 'bg-gray-100')}>
                <i className={'fas fa-search text-xs ' + (isDark ? 'text-neutral-500' : 'text-gray-400')}></i>
                <input
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  placeholder="Buscar produto..."
                  className={'flex-1 bg-transparent text-sm outline-none ' + (isDark ? 'text-white placeholder-neutral-600' : 'text-gray-900 placeholder-gray-400')}
                  autoFocus
                />
              </div>
            </div>
            {/* Lista */}
            <div className="flex-1 overflow-y-auto p-3 pt-0 space-y-1">
              {filteredProducts.length === 0 ? (
                <p className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-sm text-center py-8'}>Nenhum produto encontrado</p>
              ) : (
                filteredProducts.slice(0, 30).map(product => (
                  <button
                    key={product.id}
                    onClick={() => {
                      onUpdateState({ mainProduct: product });
                      setShowProductModal(false);
                      setProductSearchTerm('');
                    }}
                    className={'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ' + (isDark ? 'hover:bg-neutral-800' : 'hover:bg-gray-50')}
                  >
                    <div className={'w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 ' + (isDark ? 'bg-neutral-800' : 'bg-gray-100')}>
                      {getProductImageUrl(product) ? (
                        <img src={getProductImageUrl(product)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <i className={'fas fa-image text-xs ' + (isDark ? 'text-neutral-700' : 'text-gray-300')}></i>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-medium truncate'}>{product.name}</p>
                      <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs truncate'}>
                        {[product.color, product.category].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: Adicionar Elemento */}
      {/* ============================================================ */}
      {showAddElementModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={() => setShowAddElementModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
          <div
            onClick={(e) => e.stopPropagation()}
            className={'relative w-full md:max-w-lg md:rounded-2xl rounded-t-2xl overflow-hidden max-h-[80vh] flex flex-col ' + (isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-white')}
          >
            {/* Header */}
            <div className={'p-4 border-b flex items-center justify-between ' + (isDark ? 'border-neutral-800' : 'border-gray-200')}>
              <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold'}>Adicionar Produto</h3>
              <button onClick={() => setShowAddElementModal(false)} className={(isDark ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-600') + ' transition-colors'}>
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
            <div className="p-3 pb-0">
              <input
                value={elementPosition}
                onChange={(e) => setElementPosition(e.target.value)}
                placeholder="Posicionamento: ex. ao lado esquerdo, levemente inclinado"
                className={'w-full rounded-lg px-3 py-2 text-xs ' + (isDark ? 'bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-600' : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400')}
              />
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-3">
              {elementTab === 'catalog' && (
                <>
                  <div className={'flex items-center gap-2 rounded-lg px-3 py-2 mb-2 ' + (isDark ? 'bg-neutral-800' : 'bg-gray-100')}>
                    <i className={'fas fa-search text-xs ' + (isDark ? 'text-neutral-500' : 'text-gray-400')}></i>
                    <input
                      value={elementSearchTerm}
                      onChange={(e) => setElementSearchTerm(e.target.value)}
                      placeholder="Buscar produto..."
                      className={'flex-1 bg-transparent text-sm outline-none ' + (isDark ? 'text-white placeholder-neutral-600' : 'text-gray-900 placeholder-gray-400')}
                    />
                  </div>
                  <div className="space-y-1">
                    {filteredElementProducts.slice(0, 20).map(product => (
                      <button
                        key={product.id}
                        onClick={() => handleAddCatalogElement(product)}
                        className={'w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors ' + (isDark ? 'hover:bg-neutral-800' : 'hover:bg-gray-50')}
                      >
                        <div className={'w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 ' + (isDark ? 'bg-neutral-800' : 'bg-gray-100')}>
                          {getProductImageUrl(product) ? (
                            <img src={getProductImageUrl(product)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <i className={'fas fa-image text-xs ' + (isDark ? 'text-neutral-700' : 'text-gray-300')}></i>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium truncate'}>{product.name}</p>
                          <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] truncate'}>{product.category}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {elementTab === 'upload' && (
                <div className="text-center py-6">
                  <label className={'block rounded-xl p-6 border-2 border-dashed cursor-pointer transition-colors ' + (isDark ? 'border-neutral-700 hover:border-amber-500/50 text-neutral-500' : 'border-gray-300 hover:border-amber-400 text-gray-400')}>
                    <i className="fas fa-camera text-2xl mb-2 block"></i>
                    <span className="text-sm font-medium block">Tirar foto ou selecionar imagem</span>
                    <span className="text-[10px] block mt-1">JPG, PNG ou WebP</span>
                    <input ref={elementFileRef} type="file" accept="image/*" capture="environment" onChange={handleElementUpload} className="hidden" />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
