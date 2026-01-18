import React, { useState, useEffect } from 'react';
import { Product, ProductImage, SavedModelProfile, LookComposition, Client } from '../../types';
import { optimizeImage } from '../../utils/imageOptimizer';
import { LookComposer } from './LookComposer';

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
  onDeductCredits: (n: number, r: string) => boolean;
  onGenerateImage: (p: Product, t: 'studio'|'cenario'|'lifestyle'|'provador'|'refine', prompt?: string, opts?: any) => Promise<{image: string|null; generationId: string|null}>;
  onMarkSaved?: (id: string) => void;
  onSendWhatsApp?: (client: Client, message: string, imageUrl?: string) => void;
  theme?: 'dark' | 'light';
  userId?: string;
}

type ToolType = 'studio' | 'cenario' | 'lifestyle' | null;
type LifestyleStep = 'item' | 'model' | 'look' | 'orientation' | 'export';
type LookMode = 'describe' | 'composer';
type OrientationType = 'vertical' | 'horizontal';
type ExportType = 'social' | 'ecommerce';

const TOOL_CFG = {
  studio: { name: 'Studio Ready', icon: 'fa-store', credits: 1, desc: 'Fundo branco', fullDesc: 'Fundo branco profissional com sombra suave. Ideal para e-commerce.' },
  cenario: { name: 'Cenário Criativo', icon: 'fa-film', credits: 2, desc: 'Ambiente personalizado', fullDesc: 'Crie um ambiente promocional personalizado para seu produto.' },
  lifestyle: { name: 'Modelo IA', icon: 'fa-user-friends', credits: 1, desc: 'Humano com produto', fullDesc: 'Gere um modelo humano usando seu produto. Salve para reutilizar!' }
};

const MODEL_OPTS = {
  gender: [{ id: 'woman', label: 'Mulher' }, { id: 'man', label: 'Homem' }],
  ethnicity: [{ id: 'caucasian', label: 'Branca/Caucasiana' }, { id: 'black', label: 'Negra/Afrodescendente' }, { id: 'asian', label: 'Asiática' }, { id: 'latino', label: 'Latina/Hispânica' }, { id: 'middleeastern', label: 'Oriente Médio' }, { id: 'mixed', label: 'Mista/Parda' }],
  bodyType: [{ id: 'slim', label: 'Magro(a)' }, { id: 'athletic', label: 'Atlético(a)' }, { id: 'average', label: 'Médio' }, { id: 'curvy', label: 'Curvilíneo(a)' }, { id: 'plussize', label: 'Plus Size' }],
  ageRange: [{ id: 'young', label: '18-25 anos' }, { id: 'adult', label: '26-35 anos' }, { id: 'mature', label: '36-50 anos' }, { id: 'senior', label: '50+ anos' }]
};

const CATEGORIES = [
  { id: 'top', label: 'Parte de Cima (Camiseta, Blusa, Casaco)' },
  { id: 'bottom', label: 'Parte de Baixo (Calça, Short, Saia)' },
  { id: 'shoes', label: 'Calçado (Tênis, Sapato, Sandália)' },
  { id: 'fullbody', label: 'Corpo Inteiro (Vestido, Macacão)' },
  { id: 'accessory', label: 'Acessório (Bolsa, Chapéu, Joia)' }
];

// Opções de descrição de look (quando não usa Look Composer)
const LOOK_DESCRIBE_OPTIONS = {
  top: [
    { id: 'tshirt_white', label: 'Camiseta branca básica' },
    { id: 'tshirt_black', label: 'Camiseta preta básica' },
    { id: 'shirt_social', label: 'Camisa social' },
    { id: 'blouse_casual', label: 'Blusa casual' },
    { id: 'sweater', label: 'Suéter/Moletom' },
    { id: 'jacket', label: 'Jaqueta/Casaco' },
    { id: 'none', label: 'Sem peça superior adicional' },
  ],
  bottom: [
    { id: 'jeans_blue', label: 'Jeans azul' },
    { id: 'jeans_black', label: 'Jeans preto' },
    { id: 'chino_beige', label: 'Calça chino bege' },
    { id: 'shorts', label: 'Shorts/Bermuda' },
    { id: 'skirt', label: 'Saia' },
    { id: 'dress_pants', label: 'Calça social' },
    { id: 'none', label: 'Sem peça inferior adicional' },
  ],
  shoes: [
    { id: 'sneakers_white', label: 'Tênis branco' },
    { id: 'sneakers_black', label: 'Tênis preto' },
    { id: 'boots', label: 'Botas' },
    { id: 'sandals', label: 'Sandálias' },
    { id: 'heels', label: 'Salto alto' },
    { id: 'loafers', label: 'Mocassim/Sapatênis' },
    { id: 'none', label: 'Sem calçado visível' },
  ],
  accessories: [
    { id: 'watch', label: 'Relógio' },
    { id: 'sunglasses', label: 'Óculos de sol' },
    { id: 'bag', label: 'Bolsa/Mochila' },
    { id: 'hat', label: 'Chapéu/Boné' },
    { id: 'jewelry', label: 'Joias/Bijuterias' },
    { id: 'none', label: 'Sem acessórios' },
  ]
};

const ORIENTATION_OPTIONS = [
  { 
    id: 'vertical' as OrientationType, 
    label: 'Vertical (9:16)', 
    dimensions: '1080 x 1920',
    icon: 'fa-mobile-screen',
    usedFor: 'Stories, Reels, TikTok, Status WhatsApp'
  },
  { 
    id: 'horizontal' as OrientationType, 
    label: 'Horizontal (16:9)', 
    dimensions: '1920 x 1080',
    icon: 'fa-desktop',
    usedFor: 'Banners e-commerce, YouTube, Carrossel desktop'
  },
];

const EXPORT_OPTIONS = [
  { 
    id: 'social' as ExportType, 
    label: 'Redes Sociais', 
    format: 'PNG',
    icon: 'fa-share-nodes',
    desc: 'Melhor compatibilidade com redes sociais'
  },
  { 
    id: 'ecommerce' as ExportType, 
    label: 'E-commerce', 
    format: 'SVG',
    icon: 'fa-store',
    desc: 'Mais leve e com qualidade vetorial'
  },
];

export const EditorModal: React.FC<Props> = ({
  product, products, userCredits, savedModels, clients = [],
  selectedClient: initialSelectedClient, companyLogo,
  onSaveModel, onDeleteModel, onClose, onUpdateProduct,
  onDeductCredits, onGenerateImage, onMarkSaved, onSendWhatsApp,
  theme = 'dark',
  userId
}) => {
  const [tool, setTool] = useState<ToolType>(null);
  const [isGen, setIsGen] = useState(false);
  const [genImg, setGenImg] = useState<string|null>(null);
  const [genId, setGenId] = useState<string|null>(null);
  const [error, setError] = useState<string|null>(null);
  const [images, setImages] = useState<ProductImage[]>(product.images || []);
  const [selIdx, setSelIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [cenPrompt, setCenPrompt] = useState('');
  
  // Lifestyle Step System
  const [lifestyleStep, setLifestyleStep] = useState<LifestyleStep>('item');
  const [modelTab, setModelTab] = useState<'new'|'saved'>('new');
  const [selModelId, setSelModelId] = useState<string|null>(null);
  
  // Step 1: Item Principal
  const [category, setCategory] = useState('top');
  const [prodDesc, setProdDesc] = useState('');
  
  // Step 2: Modelo
  const [modelSettings, setModelSettings] = useState({ gender: 'woman' as 'woman'|'man', ethnicity: 'caucasian', bodyType: 'average', ageRange: 'adult' });
  const [modelDetail, setModelDetail] = useState('');
  const [pose, setPose] = useState('');
  
  // Step 3: Look
  const [lookMode, setLookMode] = useState<LookMode>('describe');
  const [look, setLook] = useState<LookComposition>({});
  const [describedLook, setDescribedLook] = useState({
    top: 'none',
    bottom: 'jeans_blue',
    shoes: 'sneakers_white',
    accessories: 'none'
  });
  
  // Step 4: Orientação
  const [orientation, setOrientation] = useState<OrientationType>('vertical');
  
  // Step 5: Export
  const [exportType, setExportType] = useState<ExportType>('social');
  
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [showRefine, setShowRefine] = useState(false);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [zoom, setZoom] = useState<string|null>(null);
  const [viewMode, setViewMode] = useState<'original'|'result'>('original');

  useEffect(() => { if (product.images) setImages(product.images); }, [product.images]);

  const current = images[selIdx];
  const hasOrig = !!current?.base64 || !!current?.url;
  const selModel = savedModels.find(m => m.id === selModelId);
  const isDark = theme === 'dark';
  
  // Calcula créditos dinamicamente baseado no Look Mode
  const lifestyleCredits = lookMode === 'composer' ? 2 : 1;

  const buildModelPrompt = () => {
    const g = modelSettings.gender === 'woman' ? 'Female' : 'Male';
    const e = MODEL_OPTS.ethnicity.find(x => x.id === modelSettings.ethnicity)?.label || '';
    const b = MODEL_OPTS.bodyType.find(x => x.id === modelSettings.bodyType)?.label || '';
    const a = MODEL_OPTS.ageRange.find(x => x.id === modelSettings.ageRange)?.label || '';
    return `${g} model, ${e}, ${b}, ${a}.${modelDetail ? ' ' + modelDetail : ''}${pose ? ' Pose: ' + pose : ''}`;
  };

  const buildLookItems = () => Object.entries(look).map(([slot, item]) => item ? { slot, image: item.image, name: item.name } : null).filter(Boolean) as any[];
  
  const buildDescribedLookPrompt = () => {
    const parts: string[] = [];
    
    if (describedLook.top !== 'none') {
      const topItem = LOOK_DESCRIBE_OPTIONS.top.find(x => x.id === describedLook.top);
      if (topItem) parts.push(topItem.label);
    }
    if (describedLook.bottom !== 'none') {
      const bottomItem = LOOK_DESCRIBE_OPTIONS.bottom.find(x => x.id === describedLook.bottom);
      if (bottomItem) parts.push(bottomItem.label);
    }
    if (describedLook.shoes !== 'none') {
      const shoesItem = LOOK_DESCRIBE_OPTIONS.shoes.find(x => x.id === describedLook.shoes);
      if (shoesItem) parts.push(shoesItem.label);
    }
    if (describedLook.accessories !== 'none') {
      const accItem = LOOK_DESCRIBE_OPTIONS.accessories.find(x => x.id === describedLook.accessories);
      if (accItem) parts.push(accItem.label);
    }
    
    return parts.length > 0 ? `Wearing: ${parts.join(', ')}` : '';
  };

  const getOrientationDimensions = () => {
    const opt = ORIENTATION_OPTIONS.find(o => o.id === orientation);
    return opt ? { width: orientation === 'vertical' ? 1080 : 1920, height: orientation === 'vertical' ? 1920 : 1080, aspectRatio: orientation === 'vertical' ? '9:16' : '16:9' } : { width: 1080, height: 1920, aspectRatio: '9:16' };
  };

  // Step validation
  const isStepComplete = (step: LifestyleStep): boolean => {
    switch (step) {
      case 'item': return !!category && !!prodDesc.trim();
      case 'model': return modelTab === 'saved' ? !!selModelId : true;
      case 'look': return true; // Always valid
      case 'orientation': return true;
      case 'export': return true;
      default: return false;
    }
  };

  const handleStepToggle = (step: LifestyleStep) => {
    setLifestyleStep(lifestyleStep === step ? step : step);
  };

  const handleGen = async () => {
    if (!tool || !hasOrig) return;
    
    // Calcula custo baseado na ferramenta
    let cost = TOOL_CFG[tool].credits;
    if (tool === 'lifestyle') {
      cost = lifestyleCredits;
    }
    
    if (userCredits < cost) { setError('Créditos insuficientes'); return; }
    if (tool === 'cenario' && !cenPrompt.trim()) { setError('Descreva o cenário'); return; }
    if (tool === 'lifestyle' && modelTab === 'saved' && !selModelId) { setError('Selecione um modelo'); return; }
    if (tool === 'lifestyle' && !prodDesc.trim()) { setError('Descreva o produto principal'); return; }
    
    setIsGen(true); setError(null);
    try {
      let result;
      const catLabel = CATEGORIES.find(c => c.id === category)?.label || 'garment';
      const orientationData = getOrientationDimensions();
      
      if (tool === 'studio') {
        result = await onGenerateImage(product, 'studio', undefined, { selectedImage: current });
      }
      else if (tool === 'cenario') {
        result = await onGenerateImage(product, 'cenario', cenPrompt, { selectedImage: current });
      }
      else if (tool === 'lifestyle') {
        const lookItems = lookMode === 'composer' ? buildLookItems() : [];
        const clothingPrompt = lookMode === 'describe' ? buildDescribedLookPrompt() : undefined;
        
        const opts = modelTab === 'saved' && selModel
          ? { 
              selectedImage: current, 
              referenceImage: selModel.referenceImage, 
              modelPrompt: selModel.modelPrompt, 
              clothingPrompt: clothingPrompt,
              posePrompt: pose || undefined, 
              lookItems: lookItems.length ? lookItems : undefined, 
              productCategory: catLabel, 
              productDescription: prodDesc || undefined,
              orientation: orientationData,
              exportFormat: exportType === 'social' ? 'png' : 'svg'
            }
          : { 
              selectedImage: current, 
              modelPrompt: buildModelPrompt(), 
              clothingPrompt: clothingPrompt,
              posePrompt: pose || undefined, 
              lookItems: lookItems.length ? lookItems : undefined, 
              productCategory: catLabel, 
              productDescription: prodDesc || undefined,
              orientation: orientationData,
              exportFormat: exportType === 'social' ? 'png' : 'svg'
            };
        result = await onGenerateImage(product, 'lifestyle', undefined, opts);
      }
      if (result?.image) { setGenImg(result.image); setGenId(result.generationId); setViewMode('result'); }
      else setError('A IA não retornou uma imagem válida.');
    } catch (e: any) { setError(e.message || 'Erro na geração'); }
    finally { setIsGen(false); }
  };

  const handleRefine = async () => {
    if (!genImg || !refinePrompt.trim()) return;
    if (userCredits < 1) { setError('Créditos insuficientes'); return; }
    if (!onDeductCredits(1, 'VIZZU: Refinar')) return;
    setIsGen(true); setError(null);
    try {
      const result = await onGenerateImage(product, 'refine', refinePrompt, { referenceImage: genImg });
      if (result?.image) { setGenImg(result.image); setGenId(result.generationId); setShowRefine(false); setRefinePrompt(''); }
    } catch { setError('Erro ao refinar'); }
    finally { setIsGen(false); }
  };

  const handleSave = async () => {
    if (!genImg) return;
    setIsSaving(true);
    try {
      const opt = await optimizeImage(genImg, product.name);
      if (opt.success) {
        const newImg: ProductImage = { name: opt.suggestedFileName, base64: opt.base64, url: opt.base64 };
        const upd = [...images, newImg];
        setImages(upd);
        onUpdateProduct(product.id, { images: upd });
        if (genId && onMarkSaved) onMarkSaved(genId);
      }
    } catch { setError('Erro ao salvar'); }
    finally { setIsSaving(false); }
  };

  const handleSaveModel = () => {
    if (!newModelName.trim() || !genImg) return;
    const profile: SavedModelProfile = { id: `model-${Date.now()}`, name: newModelName.trim(), referenceImage: genImg, settings: { ...modelSettings }, modelPrompt: buildModelPrompt(), createdAt: new Date().toISOString(), usageCount: 0 };
    onSaveModel(profile);
    setNewModelName(''); setShowSaveModal(false); setModelTab('saved'); setSelModelId(profile.id);
  };

  const handleDeleteImg = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Excluir imagem?')) {
      const newImgs = images.filter((_, i) => i !== idx);
      setImages(newImgs);
      onUpdateProduct(product.id, { images: newImgs });
      if (selIdx >= newImgs.length) setSelIdx(Math.max(0, newImgs.length - 1));
    }
  };

  const handleSelectTool = (t: ToolType) => {
    if (genImg && tool !== t && !confirm('Descartar imagem gerada?')) return;
    setGenImg(null); setGenId(null); setShowRefine(false); setError(null); setTool(t === tool ? null : t); setViewMode('original');
    // Reset lifestyle step quando muda de ferramenta
    if (t === 'lifestyle') {
      setLifestyleStep('item');
    }
  };

  const displayImage = viewMode === 'result' && genImg ? genImg : (current?.base64 || current?.url);

  // ═══════════════════════════════════════════════════════════════
  // LIFESTYLE STEP COMPONENT
  // ═══════════════════════════════════════════════════════════════
  const LifestyleStepAccordion = ({ step, title, icon, isActive, isComplete, children }: { step: LifestyleStep; title: string; icon: string; isActive: boolean; isComplete: boolean; children: React.ReactNode }) => (
    <div className={`rounded-xl border-2 overflow-hidden transition-all ${isActive ? 'border-pink-500 shadow-lg shadow-pink-500/10' : isComplete ? (isDark ? 'border-green-500/30 bg-green-500/5' : 'border-green-300 bg-green-50') : (isDark ? 'border-neutral-700' : 'border-gray-200')}`}>
      <button 
        onClick={() => handleStepToggle(step)} 
        className={`w-full p-3 flex items-center justify-between transition-colors ${isActive ? (isDark ? 'bg-pink-500/10' : 'bg-pink-50') : ''}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isComplete && !isActive ? 'bg-green-500 text-white' : isActive ? 'bg-pink-500 text-white' : (isDark ? 'bg-neutral-700 text-neutral-400' : 'bg-gray-100 text-gray-500')}`}>
            {isComplete && !isActive ? <i className="fas fa-check text-sm"></i> : <i className={`fas ${icon} text-sm`}></i>}
          </div>
          <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</span>
        </div>
        <i className={`fas fa-chevron-down transition-transform ${isDark ? 'text-neutral-500' : 'text-gray-400'} ${isActive ? 'rotate-180' : ''}`}></i>
      </button>
      {isActive && (
        <div className={`p-3 pt-0 border-t ${isDark ? 'border-neutral-700' : 'border-gray-200'}`}>
          {children}
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // LIFESTYLE PANEL CONTENT
  // ═══════════════════════════════════════════════════════════════
  const LifestylePanel = () => (
    <div className="space-y-3">
      <p className={`text-xs mb-3 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>{TOOL_CFG.lifestyle.fullDesc}</p>
      
      {/* Tabs Novo/Salvo */}
      <div className={`flex rounded-lg p-1 mb-3 ${isDark ? 'bg-neutral-800' : 'bg-gray-100'}`}>
        <button onClick={() => setModelTab('new')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${modelTab === 'new' ? isDark ? 'bg-neutral-700 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm' : isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Novo Modelo</button>
        <button onClick={() => setModelTab('saved')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${modelTab === 'saved' ? isDark ? 'bg-neutral-700 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm' : isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Salvos ({savedModels.length})</button>
      </div>
      
      {/* Saved Models Quick Select */}
      {modelTab === 'saved' && (
        <div className="space-y-2 mb-3 max-h-24 overflow-y-auto">
          {savedModels.length === 0 ? (
            <div className={`text-center py-3 text-xs rounded-lg border border-dashed ${isDark ? 'text-neutral-500 bg-neutral-800/50 border-neutral-700' : 'text-gray-400 bg-gray-50 border-gray-300'}`}>
              <i className="fas fa-user-slash text-base mb-1"></i>
              <p>Nenhum modelo salvo</p>
            </div>
          ) : savedModels.map(m => (
            <div key={m.id} onClick={() => setSelModelId(m.id)} className={`p-2 rounded-lg border-2 cursor-pointer flex items-center gap-2 transition-all ${selModelId === m.id ? 'bg-pink-500 border-pink-500 text-white' : isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
              <div className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ${isDark ? 'bg-neutral-700' : 'bg-gray-100'}`}>
                <img src={m.referenceImage} className="w-full h-full object-cover object-top" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xs truncate">{m.name}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onDeleteModel(m.id); }} className={`hover:text-red-400 ${selModelId === m.id ? 'text-white/70' : isDark ? 'text-neutral-500' : 'text-gray-400'}`}><i className="fas fa-trash text-[10px]"></i></button>
            </div>
          ))}
        </div>
      )}
      
      {/* Steps Accordion */}
      <div className="space-y-2">
        
        {/* STEP 1: Item Principal */}
        <LifestyleStepAccordion 
          step="item" 
          title="1. Item Principal" 
          icon="fa-tshirt" 
          isActive={lifestyleStep === 'item'} 
          isComplete={isStepComplete('item')}
        >
          <div className="space-y-3 pt-3">
            <div>
              <label className={`text-[9px] font-bold uppercase mb-1.5 flex items-center gap-1 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                <i className={`fas fa-tag ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}></i>Categoria do Produto
              </label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={`w-full p-2 border rounded-lg text-xs ${isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            
            <div className={`p-2.5 rounded-lg border ${isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
              <label className="text-[9px] font-bold text-amber-500 uppercase mb-1 flex items-center gap-1">
                <i className="fas fa-exclamation-triangle"></i>Descreva o produto principal *
              </label>
              <textarea 
                value={prodDesc} 
                onChange={(e) => setProdDesc(e.target.value)} 
                placeholder="Ex: Camiseta preta com logo Nike branco no peito, tecido dry-fit..." 
                className={`w-full p-2 border rounded text-[11px] resize-none ${isDark ? 'bg-neutral-800 border-amber-500/30 text-white placeholder-neutral-500' : 'bg-white border-amber-300 text-gray-900 placeholder-gray-400'}`} 
                rows={2} 
              />
              <p className="text-[9px] text-amber-500/80 mt-1"><i className="fas fa-info-circle mr-1"></i>Quanto mais detalhes, mais fiel o resultado.</p>
            </div>
            
            <button 
              onClick={() => setLifestyleStep('model')} 
              disabled={!isStepComplete('item')}
              className="w-full py-2 bg-pink-500 text-white font-bold rounded-lg text-xs disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Próximo <i className="fas fa-arrow-right text-[10px]"></i>
            </button>
          </div>
        </LifestyleStepAccordion>
        
        {/* STEP 2: Modelo */}
        <LifestyleStepAccordion 
          step="model" 
          title="2. Modelo" 
          icon="fa-user" 
          isActive={lifestyleStep === 'model'} 
          isComplete={isStepComplete('model')}
        >
          <div className="space-y-3 pt-3">
            {modelTab === 'new' && (
              <>
                {/* Gênero */}
                <div>
                  <label className={`text-[9px] font-bold uppercase mb-1.5 block ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Gênero</label>
                  <div className="grid grid-cols-2 gap-2">
                    {MODEL_OPTS.gender.map(g => (
                      <button key={g.id} onClick={() => setModelSettings(p => ({...p, gender: g.id as 'woman'|'man'}))} className={`py-2 rounded-lg text-xs font-bold border-2 transition-all flex items-center justify-center gap-2 ${modelSettings.gender === g.id ? 'bg-pink-500 border-pink-500 text-white' : isDark ? 'bg-neutral-800 border-neutral-700 text-neutral-400' : 'bg-white border-gray-200 text-gray-500'}`}>
                        <i className={`fas ${g.id === 'woman' ? 'fa-venus' : 'fa-mars'}`}></i>{g.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Etnia e Porte */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`text-[9px] font-bold uppercase mb-1 block ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Etnia</label>
                    <select value={modelSettings.ethnicity} onChange={(e) => setModelSettings(p => ({...p, ethnicity: e.target.value}))} className={`w-full p-1.5 border rounded text-xs ${isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                      {MODEL_OPTS.ethnicity.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`text-[9px] font-bold uppercase mb-1 block ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Porte</label>
                    <select value={modelSettings.bodyType} onChange={(e) => setModelSettings(p => ({...p, bodyType: e.target.value}))} className={`w-full p-1.5 border rounded text-xs ${isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                      {MODEL_OPTS.bodyType.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                    </select>
                  </div>
                </div>
                
                {/* Idade */}
                <div>
                  <label className={`text-[9px] font-bold uppercase mb-1 block ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Idade</label>
                  <select value={modelSettings.ageRange} onChange={(e) => setModelSettings(p => ({...p, ageRange: e.target.value}))} className={`w-full p-1.5 border rounded text-xs ${isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                    {MODEL_OPTS.ageRange.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>
                </div>
                
                {/* Detalhes Faciais */}
                <div>
                  <label className={`text-[9px] font-bold uppercase mb-1 block ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Detalhes Faciais (opcional)</label>
                  <textarea value={modelDetail} onChange={(e) => setModelDetail(e.target.value)} placeholder="Ex: Cabelos longos ondulados, olhos verdes, sorriso suave..." className={`w-full p-2 border rounded text-xs resize-none ${isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`} rows={2} />
                </div>
                
                {/* Pose */}
                <div>
                  <label className={`text-[9px] font-bold uppercase mb-1 block ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Pose / Expressão (opcional)</label>
                  <textarea value={pose} onChange={(e) => setPose(e.target.value)} placeholder="Ex: Em pé confiante, mãos no bolso, olhando para câmera..." className={`w-full p-2 border rounded text-xs resize-none ${isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`} rows={2} />
                </div>
              </>
            )}
            
            <button 
              onClick={() => setLifestyleStep('look')} 
              className="w-full py-2 bg-pink-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2"
            >
              Próximo <i className="fas fa-arrow-right text-[10px]"></i>
            </button>
          </div>
        </LifestyleStepAccordion>
        
        {/* STEP 3: Look */}
        <LifestyleStepAccordion 
          step="look" 
          title="3. Look" 
          icon="fa-layer-group" 
          isActive={lifestyleStep === 'look'} 
          isComplete={isStepComplete('look')}
        >
          <div className="space-y-3 pt-3">
            {/* Mode Selection */}
            <div className={`flex rounded-lg p-1 ${isDark ? 'bg-neutral-800' : 'bg-gray-100'}`}>
              <button 
                onClick={() => setLookMode('describe')} 
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${lookMode === 'describe' ? 'bg-pink-500 text-white shadow-sm' : isDark ? 'text-neutral-400' : 'text-gray-500'}`}
              >
                <i className="fas fa-pen text-[10px]"></i>Descrever
              </button>
              <button 
                onClick={() => setLookMode('composer')} 
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${lookMode === 'composer' ? 'bg-pink-500 text-white shadow-sm' : isDark ? 'text-neutral-400' : 'text-gray-500'}`}
              >
                <i className="fas fa-th-large text-[10px]"></i>Look Composer
              </button>
            </div>
            
            {/* Cost indicator */}
            <div className={`flex items-center justify-center gap-2 py-1.5 rounded-lg ${lookMode === 'composer' ? 'bg-amber-500/10 border border-amber-500/30' : (isDark ? 'bg-neutral-800' : 'bg-gray-100')}`}>
              <i className={`fas fa-bolt text-xs ${lookMode === 'composer' ? 'text-amber-500' : 'text-pink-500'}`}></i>
              <span className={`text-xs font-bold ${lookMode === 'composer' ? 'text-amber-500' : (isDark ? 'text-white' : 'text-gray-900')}`}>
                {lookMode === 'composer' ? '2 créditos' : '1 crédito'}
              </span>
              {lookMode === 'composer' && (
                <span className="text-[9px] text-amber-500/70">(usa seus produtos)</span>
              )}
            </div>
            
            {/* Describe Mode */}
            {lookMode === 'describe' && (
              <div className="space-y-2">
                <p className={`text-[10px] ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
                  <i className="fas fa-info-circle mr-1"></i>Selecione peças genéricas para compor o look
                </p>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`text-[9px] font-bold uppercase mb-1 block ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Parte de Cima</label>
                    <select value={describedLook.top} onChange={(e) => setDescribedLook(p => ({...p, top: e.target.value}))} className={`w-full p-1.5 border rounded text-[10px] ${isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                      {LOOK_DESCRIBE_OPTIONS.top.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`text-[9px] font-bold uppercase mb-1 block ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Parte de Baixo</label>
                    <select value={describedLook.bottom} onChange={(e) => setDescribedLook(p => ({...p, bottom: e.target.value}))} className={`w-full p-1.5 border rounded text-[10px] ${isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                      {LOOK_DESCRIBE_OPTIONS.bottom.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`text-[9px] font-bold uppercase mb-1 block ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Calçado</label>
                    <select value={describedLook.shoes} onChange={(e) => setDescribedLook(p => ({...p, shoes: e.target.value}))} className={`w-full p-1.5 border rounded text-[10px] ${isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                      {LOOK_DESCRIBE_OPTIONS.shoes.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`text-[9px] font-bold uppercase mb-1 block ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Acessórios</label>
                    <select value={describedLook.accessories} onChange={(e) => setDescribedLook(p => ({...p, accessories: e.target.value}))} className={`w-full p-1.5 border rounded text-[10px] ${isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                      {LOOK_DESCRIBE_OPTIONS.accessories.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}
            
            {/* Composer Mode */}
            {lookMode === 'composer' && (
              <div>
                <p className={`text-[10px] mb-2 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
                  <i className="fas fa-store mr-1"></i>Selecione produtos da sua loja para compor o look
                </p>
                <LookComposer products={products} composition={look} onChange={setLook} theme={theme} />
              </div>
            )}
            
            <button 
              onClick={() => setLifestyleStep('orientation')} 
              className="w-full py-2 bg-pink-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2"
            >
              Próximo <i className="fas fa-arrow-right text-[10px]"></i>
            </button>
          </div>
        </LifestyleStepAccordion>
        
        {/* STEP 4: Orientação */}
        <LifestyleStepAccordion 
          step="orientation" 
          title="4. Orientação" 
          icon="fa-crop" 
          isActive={lifestyleStep === 'orientation'} 
          isComplete={isStepComplete('orientation')}
        >
          <div className="space-y-3 pt-3">
            <div className="space-y-2">
              {ORIENTATION_OPTIONS.map(opt => (
                <button 
                  key={opt.id}
                  onClick={() => setOrientation(opt.id)}
                  className={`w-full p-3 rounded-xl border-2 text-left transition-all ${orientation === opt.id ? 'border-pink-500 bg-pink-500/10' : (isDark ? 'border-neutral-700 hover:border-neutral-600' : 'border-gray-200 hover:border-gray-300')}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${orientation === opt.id ? 'bg-pink-500 text-white' : (isDark ? 'bg-neutral-700 text-neutral-400' : 'bg-gray-100 text-gray-500')}`}>
                      <i className={`fas ${opt.icon}`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{opt.label}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${isDark ? 'bg-neutral-700 text-neutral-400' : 'bg-gray-100 text-gray-500'}`}>{opt.dimensions}</span>
                      </div>
                      <p className={`text-[10px] mt-0.5 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
                        <i className="fas fa-lightbulb text-amber-500 mr-1"></i>
                        Mais usado para: {opt.usedFor}
                      </p>
                    </div>
                    {orientation === opt.id && (
                      <div className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-check text-white text-[10px]"></i>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
            
            <button 
              onClick={() => setLifestyleStep('export')} 
              className="w-full py-2 bg-pink-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2"
            >
              Próximo <i className="fas fa-arrow-right text-[10px]"></i>
            </button>
          </div>
        </LifestyleStepAccordion>
        
        {/* STEP 5: Export */}
        <LifestyleStepAccordion 
          step="export" 
          title="5. Formato de Export" 
          icon="fa-download" 
          isActive={lifestyleStep === 'export'} 
          isComplete={isStepComplete('export')}
        >
          <div className="space-y-3 pt-3">
            <div className="space-y-2">
              {EXPORT_OPTIONS.map(opt => (
                <button 
                  key={opt.id}
                  onClick={() => setExportType(opt.id)}
                  className={`w-full p-3 rounded-xl border-2 text-left transition-all ${exportType === opt.id ? 'border-pink-500 bg-pink-500/10' : (isDark ? 'border-neutral-700 hover:border-neutral-600' : 'border-gray-200 hover:border-gray-300')}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${exportType === opt.id ? 'bg-pink-500 text-white' : (isDark ? 'bg-neutral-700 text-neutral-400' : 'bg-gray-100 text-gray-500')}`}>
                      <i className={`fas ${opt.icon}`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{opt.label}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${opt.format === 'PNG' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>{opt.format}</span>
                      </div>
                      <p className={`text-[10px] mt-0.5 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>{opt.desc}</p>
                    </div>
                    {exportType === opt.id && (
                      <div className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-check text-white text-[10px]"></i>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
            
            {/* Summary & Generate */}
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-neutral-800/50 border-neutral-700' : 'bg-gray-50 border-gray-200'}`}>
              <h5 className={`text-[10px] font-bold uppercase mb-2 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Resumo da Geração</h5>
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span className={isDark ? 'text-neutral-500' : 'text-gray-500'}>Categoria:</span>
                  <span className={isDark ? 'text-white' : 'text-gray-900'}>{CATEGORIES.find(c => c.id === category)?.label.split('(')[0].trim()}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-neutral-500' : 'text-gray-500'}>Look:</span>
                  <span className={isDark ? 'text-white' : 'text-gray-900'}>{lookMode === 'composer' ? `Composer (${Object.keys(look).length} itens)` : 'Descrito'}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-neutral-500' : 'text-gray-500'}>Orientação:</span>
                  <span className={isDark ? 'text-white' : 'text-gray-900'}>{ORIENTATION_OPTIONS.find(o => o.id === orientation)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-neutral-500' : 'text-gray-500'}>Export:</span>
                  <span className={isDark ? 'text-white' : 'text-gray-900'}>{EXPORT_OPTIONS.find(e => e.id === exportType)?.format}</span>
                </div>
                <div className={`flex justify-between pt-2 mt-2 border-t ${isDark ? 'border-neutral-700' : 'border-gray-200'}`}>
                  <span className="font-bold text-pink-500">Custo:</span>
                  <span className="font-bold text-pink-500">{lifestyleCredits} crédito{lifestyleCredits > 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          </div>
        </LifestyleStepAccordion>
      </div>
      
      {/* Generate Button */}
      <button 
        onClick={handleGen} 
        disabled={isGen || !hasOrig || !prodDesc.trim() || (modelTab === 'saved' && !selModelId)} 
        className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-4 shadow-lg shadow-pink-500/25"
      >
        {isGen ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}
        {isGen ? 'Gerando...' : `Gerar Modelo IA (${lifestyleCredits} créd.)`}
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/90 md:bg-black/80 md:backdrop-blur-sm flex items-end md:items-center justify-center">
      
      {/* Zoom Modal */}
      {zoom && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4" onClick={() => setZoom(null)}>
          <button className="absolute top-4 right-4 w-12 h-12 bg-white/10 text-white rounded-full flex items-center justify-center"><i className="fas fa-times text-xl"></i></button>
          <img src={zoom} className="max-w-full max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}
      
      {/* Save Model Modal */}
      {showSaveModal && genImg && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className={`rounded-2xl shadow-2xl p-6 w-full max-w-md border ${isDark ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Salvar Modelo</h3>
              <button onClick={() => setShowSaveModal(false)} className={isDark ? 'text-neutral-500' : 'text-gray-400'}><i className="fas fa-times"></i></button>
            </div>
            <div className="flex justify-center mb-6">
              <div className="w-32 h-32 rounded-full border-4 border-pink-500/30 overflow-hidden">
                <img src={genImg} className="w-full h-full object-cover object-top" />
              </div>
            </div>
            <p className={`text-sm text-center mb-4 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Nas próximas gerações com esse modelo, a IA tentará manter os mesmos traços.</p>
            <input type="text" value={newModelName} onChange={(e) => setNewModelName(e.target.value)} placeholder="Nome do modelo..." className={`w-full p-3 border rounded-lg mb-4 ${isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`} autoFocus />
            <button onClick={handleSaveModel} disabled={!newModelName.trim()} className="w-full py-3 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-xl font-bold disabled:opacity-50">
              <i className="fas fa-save mr-2"></i>Salvar
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* DESKTOP LAYOUT */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className={`hidden md:flex rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex-col ${isDark ? 'bg-neutral-950' : 'bg-gray-50'}`}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"><i className="fas fa-arrow-left"></i></button>
            <div className="text-white">
              <h2 className="font-bold text-lg">{product.name}</h2>
              <p className="text-sm text-white/70 font-mono">{product.sku}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-xl px-4 py-2 text-white flex items-center gap-2">
              <i className="fas fa-bolt text-yellow-300"></i>
              <span className="font-bold">{userCredits}</span>
              <span className="text-white/70 text-sm">créditos</span>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"><i className="fas fa-times"></i></button>
          </div>
        </div>
        
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Images */}
          <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto">
            
            {/* Image Preview Area */}
            <div className="flex gap-4 min-h-[300px]">
              {/* Original */}
              <div className={`w-1/3 rounded-2xl border p-4 flex flex-col shadow-sm ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-xs font-bold uppercase mb-3 flex items-center gap-2 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                  <i className={`fas fa-bullseye ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}></i>
                  Imagem de Referência
                </h3>
                <div className={`flex-1 rounded-xl overflow-hidden flex items-center justify-center ${isDark ? 'bg-neutral-800' : 'bg-gray-100'}`}>
                  {hasOrig ? (
                    <img src={current.base64 || current.url} className="w-full h-full object-contain" />
                  ) : (
                    <div className={`text-center text-xs ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>
                      <i className="fas fa-image text-3xl mb-2"></i>
                      <p>Selecione uma imagem</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Result */}
              <div className={`flex-1 rounded-2xl border p-4 flex flex-col relative group shadow-sm ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Resultado</h3>
                  {tool === 'lifestyle' && (
                    <span className={`text-[9px] px-2 py-1 rounded-full ${isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-500'}`}>
                      {ORIENTATION_OPTIONS.find(o => o.id === orientation)?.dimensions}
                    </span>
                  )}
                </div>
                <div className={`flex-1 rounded-xl overflow-hidden relative flex items-center justify-center ${isDark ? 'bg-neutral-800' : 'bg-gray-100'}`}>
                  {isGen ? (
                    <div className="flex flex-col items-center text-pink-500">
                      <div className="w-12 h-12 rounded-full border-4 border-pink-500/30 border-t-pink-500 animate-spin mb-3"></div>
                      <p className="text-sm font-bold">Gerando...</p>
                    </div>
                  ) : genImg ? (
                    <>
                      <img src={genImg} className="w-full h-full object-contain" />
                      <button onClick={() => setZoom(genImg)} className="absolute top-3 right-3 w-10 h-10 bg-black/50 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><i className="fas fa-expand"></i></button>
                    </>
                  ) : (
                    <div className={`text-center p-8 ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${isDark ? 'bg-neutral-700' : 'bg-gray-200'}`}>
                        <i className={`fas fa-wand-magic-sparkles text-2xl ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}></i>
                      </div>
                      <p className="text-sm">Configure ao lado e clique em Gerar</p>
                    </div>
                  )}
                </div>
                
                {/* Action buttons */}
                {genImg && !isGen && !showRefine && (
                  <div className="absolute bottom-6 left-6 right-6 flex justify-center gap-3">
                    <button onClick={() => { setGenImg(null); setGenId(null); }} className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center border text-red-500 ${isDark ? 'bg-neutral-800 border-red-500/30 hover:bg-red-500/10' : 'bg-white border-red-200 hover:bg-red-50'}`}><i className="fas fa-trash-alt"></i></button>
                    <button onClick={handleSave} disabled={isSaving} className="flex-1 max-w-xs h-12 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full shadow-xl flex items-center justify-center gap-2 transition-colors">
                      {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
                      Salvar ({EXPORT_OPTIONS.find(e => e.id === exportType)?.format})
                    </button>
                    <button onClick={() => setShowRefine(true)} className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center border text-pink-500 ${isDark ? 'bg-neutral-800 border-pink-500/30 hover:bg-pink-500/10' : 'bg-white border-pink-200 hover:bg-pink-50'}`}><i className="fas fa-magic"></i></button>
                    {tool === 'lifestyle' && modelTab === 'new' && (
                      <button onClick={() => setShowSaveModal(true)} className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center border text-purple-500 ${isDark ? 'bg-neutral-800 border-purple-500/30 hover:bg-purple-500/10' : 'bg-white border-purple-200 hover:bg-purple-50'}`}><i className="fas fa-user-plus"></i></button>
                    )}
                  </div>
                )}
                
                {/* Refine Panel */}
                {showRefine && genImg && (
                  <div className={`absolute bottom-4 left-4 right-4 p-4 shadow-lg rounded-xl border ${isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200'}`}>
                    <textarea value={refinePrompt} onChange={(e) => setRefinePrompt(e.target.value)} placeholder="O que você gostaria de ajustar?" className={`w-full p-2 border rounded-lg text-sm resize-none mb-2 ${isDark ? 'bg-neutral-700 border-neutral-600 text-white placeholder-neutral-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`} rows={2} />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowRefine(false)} className={`px-3 py-1.5 text-xs ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Cancelar</button>
                      <button onClick={handleRefine} disabled={!refinePrompt.trim() || isGen} className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white text-xs font-bold rounded-lg disabled:opacity-50">
                        <i className="fas fa-magic mr-1"></i>Refinar (1 créd.)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Error */}
            {error && (
              <div className={`rounded-xl p-3 flex items-center gap-3 ${isDark ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
                <i className="fas fa-exclamation-circle text-red-500"></i>
                <p className={`text-xs flex-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300"><i className="fas fa-times"></i></button>
              </div>
            )}

            {/* Gallery */}
            <div className={`flex-1 rounded-2xl border p-4 flex flex-col min-h-[120px] shadow-sm ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'}`}>
              <h3 className={`text-xs font-bold uppercase mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <i className={`fas fa-th-large ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}></i>
                Galeria do Produto
              </h3>
              <div className="flex-1 overflow-y-auto">
                {images.length > 0 ? (
                  <div className="grid grid-cols-6 lg:grid-cols-8 gap-2">
                    {images.map((img, idx) => (
                      <div key={idx} onClick={() => setSelIdx(idx)} className={`aspect-square rounded-xl overflow-hidden cursor-pointer relative group border-2 transition-all ${selIdx === idx ? 'border-pink-500 ring-2 ring-pink-500/20' : isDark ? 'border-neutral-700 hover:border-pink-500/50' : 'border-gray-200 hover:border-pink-300'}`}>
                        <img src={img.base64 || img.url} className="w-full h-full object-cover" />
                        {selIdx === idx && (
                          <div className="absolute inset-0 bg-pink-500/10 flex items-center justify-center">
                            <div className="bg-pink-500 text-white w-5 h-5 rounded-full flex items-center justify-center"><i className="fas fa-check text-[8px]"></i></div>
                          </div>
                        )}
                        <button onClick={(e) => handleDeleteImg(idx, e)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 text-[8px] transition-opacity"><i className="fas fa-times"></i></button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`h-full flex items-center justify-center text-xs ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>Nenhuma imagem no produto</div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right Panel - Tools */}
          <div className={`w-80 border-l p-5 overflow-y-auto flex-shrink-0 ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'}`}>
            <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <i className="fas fa-toolbox text-pink-500"></i>
              Ferramentas
            </h3>
            
            <div className="space-y-3">
              {(['studio', 'cenario', 'lifestyle'] as ToolType[]).map(t => t && (
                <div key={t} onClick={() => handleSelectTool(t)} className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${tool === t ? 'border-pink-500 bg-pink-500/10 shadow-md' : isDark ? 'border-neutral-700 hover:border-pink-500/50' : 'border-gray-200 hover:border-pink-300'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tool === t ? 'bg-pink-500 text-white' : isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-500'}`}>
                        <i className={`fas ${TOOL_CFG[t].icon}`}></i>
                      </div>
                      <div>
                        <span className={`font-bold block ${isDark ? 'text-white' : 'text-gray-900'}`}>{TOOL_CFG[t].name}</span>
                        <span className={`text-xs ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>{TOOL_CFG[t].desc}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-full text-pink-500 bg-pink-500/10">
                      {t === 'lifestyle' ? `${lifestyleCredits} créd.` : `${TOOL_CFG[t].credits} créd.`}
                    </span>
                  </div>
                  
                  {/* Tool expanded */}
                  {tool === t && (
                    <div className={`mt-3 pt-3 border-t ${isDark ? 'border-neutral-700' : 'border-gray-200'}`} onClick={(e) => e.stopPropagation()}>
                      
                      {t === 'studio' && (
                        <>
                          <p className={`text-xs mb-3 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>{TOOL_CFG.studio.fullDesc}</p>
                          <button onClick={handleGen} disabled={isGen || !hasOrig} className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25">
                            {isGen ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}
                            {isGen ? 'Gerando...' : 'Gerar'}
                          </button>
                        </>
                      )}
                      
                      {t === 'cenario' && (
                        <>
                          <p className={`text-xs mb-3 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>{TOOL_CFG.cenario.fullDesc}</p>
                          <textarea value={cenPrompt} onChange={(e) => setCenPrompt(e.target.value)} placeholder="Descreva o cenário..." className={`w-full p-2 border rounded-lg text-sm resize-none mb-3 ${isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`} rows={3} />
                          <button onClick={handleGen} disabled={isGen || !hasOrig || !cenPrompt.trim()} className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25">
                            {isGen ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}
                            {isGen ? 'Gerando...' : 'Gerar Cenário'}
                          </button>
                        </>
                      )}
                      
                      {t === 'lifestyle' && <LifestylePanel />}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Tip */}
            <div className={`mt-6 p-4 rounded-xl border ${isDark ? 'bg-neutral-800/50 border-neutral-700' : 'bg-gray-50 border-gray-200'}`}>
              <h4 className={`text-xs font-bold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <i className="fas fa-lightbulb text-yellow-500"></i>Dica de Consistência
              </h4>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                Ao <strong>Salvar um Modelo</strong>, a imagem gerada será usada como <strong>referência facial</strong>. Nas próximas gerações com esse modelo, a IA tentará manter os mesmos traços.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MOBILE LAYOUT */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className={`md:hidden w-full h-full flex flex-col ${isDark ? 'bg-neutral-900' : 'bg-white'}`}>
        
        {/* Mobile Header */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center"><i className="fas fa-arrow-left text-sm"></i></button>
            <div className="text-white min-w-0">
              <h2 className="font-bold text-sm truncate max-w-[180px]">{product.name}</h2>
              <p className="text-[10px] text-white/70 font-mono">{product.sku}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-white/20 rounded-lg px-3 py-1.5 text-white flex items-center gap-1.5">
              <i className="fas fa-bolt text-yellow-300 text-xs"></i>
              <span className="font-bold text-sm">{userCredits}</span>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center"><i className="fas fa-times text-sm"></i></button>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-y-auto pb-24">
          
          {/* Image Display */}
          <div className={isDark ? 'bg-neutral-800' : 'bg-gray-100'}>
            <div className="aspect-square flex items-center justify-center overflow-hidden">
              {isGen ? (
                <div className="flex flex-col items-center text-pink-500">
                  <div className="w-12 h-12 rounded-full border-4 border-pink-500/30 border-t-pink-500 animate-spin mb-3"></div>
                  <p className="text-sm font-bold">Gerando...</p>
                </div>
              ) : displayImage ? (
                <img src={displayImage} className="w-full h-full object-contain" onClick={() => setZoom(displayImage)} />
              ) : (
                <div className={`text-center ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>
                  <i className="fas fa-image text-4xl mb-2"></i>
                  <p className="text-sm">Sem imagem</p>
                </div>
              )}
            </div>
            
            {genImg && !isGen && (
              <div className={`absolute top-3 left-3 rounded-lg shadow-lg p-1 flex gap-1 ${isDark ? 'bg-neutral-800' : 'bg-white'}`}>
                <button onClick={() => setViewMode('original')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'original' ? 'bg-pink-500 text-white' : isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Original</button>
                <button onClick={() => setViewMode('result')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'result' ? 'bg-pink-500 text-white' : isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Resultado</button>
              </div>
            )}
          </div>

          {/* Gallery */}
          <div className={`border-b px-4 py-3 ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <div key={idx} onClick={() => { setSelIdx(idx); setViewMode('original'); }} className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all relative ${selIdx === idx ? 'border-pink-500 ring-2 ring-pink-500/20' : isDark ? 'border-neutral-700' : 'border-gray-200'}`}>
                  <img src={img.base64 || img.url} className="w-full h-full object-cover" />
                  {selIdx === idx && (
                    <div className="absolute inset-0 bg-pink-500/20 flex items-center justify-center">
                      <div className="w-4 h-4 bg-pink-500 rounded-full flex items-center justify-center"><i className="fas fa-check text-white text-[8px]"></i></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className={`mx-4 mt-3 rounded-xl p-3 flex items-center gap-3 ${isDark ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
              <i className="fas fa-exclamation-circle text-red-500"></i>
              <p className={`text-xs flex-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
              <button onClick={() => setError(null)} className="text-red-400"><i className="fas fa-times"></i></button>
            </div>
          )}

          {/* Tools */}
          <div className="px-4 py-3">
            <h3 className={`text-xs font-bold uppercase mb-2 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Ferramentas</h3>
            <div className="space-y-2">
              {(['studio', 'cenario', 'lifestyle'] as ToolType[]).map(t => t && (
                <div key={t} onClick={() => handleSelectTool(t)} className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${tool === t ? 'border-pink-500 bg-pink-500/10 shadow-md' : isDark ? 'border-neutral-700 bg-neutral-800' : 'border-gray-200 bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tool === t ? 'bg-pink-500 text-white' : isDark ? 'bg-neutral-700 text-neutral-400' : 'bg-gray-100 text-gray-500'}`}>
                        <i className={`fas ${TOOL_CFG[t].icon}`}></i>
                      </div>
                      <div>
                        <span className={`font-bold block text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{TOOL_CFG[t].name}</span>
                        <span className={`text-xs ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>{TOOL_CFG[t].desc}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-full text-pink-500 bg-pink-500/10">
                      {t === 'lifestyle' ? `${lifestyleCredits} créd.` : `${TOOL_CFG[t].credits} créd.`}
                    </span>
                  </div>
                  
                  {tool === t && (
                    <div className={`mt-3 pt-3 border-t ${isDark ? 'border-neutral-700' : 'border-gray-200'}`} onClick={e => e.stopPropagation()}>
                      {t === 'studio' && <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>{TOOL_CFG.studio.fullDesc}</p>}
                      
                      {t === 'cenario' && (
                        <>
                          <p className={`text-xs mb-2 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>{TOOL_CFG.cenario.fullDesc}</p>
                          <textarea value={cenPrompt} onChange={e => setCenPrompt(e.target.value)} placeholder="Descreva o cenário..." className={`w-full p-3 border rounded-xl text-sm resize-none ${isDark ? 'bg-neutral-700 border-neutral-600 text-white placeholder-neutral-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`} rows={3} />
                        </>
                      )}
                      
                      {t === 'lifestyle' && <LifestylePanel />}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Tip */}
            <div className={`mt-4 p-3 rounded-xl border ${isDark ? 'bg-neutral-800/50 border-neutral-700' : 'bg-gray-50 border-gray-200'}`}>
              <h4 className={`text-xs font-bold mb-1 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}><i className="fas fa-lightbulb text-yellow-500"></i>Dica</h4>
              <p className={`text-[11px] leading-relaxed ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Ao <strong>Salvar um Modelo</strong>, a IA tentará manter os mesmos traços nas próximas gerações.</p>
            </div>
          </div>
        </div>

        {/* Mobile Bottom Bar */}
        <div className={`fixed bottom-0 left-0 right-0 border-t p-4 flex gap-3 ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'}`}>
          {genImg && !isGen ? (
            <>
              <button onClick={() => { setGenImg(null); setGenId(null); setViewMode('original'); }} className={`w-12 h-12 rounded-xl flex items-center justify-center border text-red-500 ${isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'}`}><i className="fas fa-trash-alt"></i></button>
              <button onClick={handleSave} disabled={isSaving} className="flex-1 h-12 bg-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
                Salvar ({EXPORT_OPTIONS.find(e => e.id === exportType)?.format})
              </button>
              <button onClick={() => setShowRefine(true)} className={`w-12 h-12 rounded-xl flex items-center justify-center border text-pink-500 ${isDark ? 'bg-pink-500/10 border-pink-500/30' : 'bg-pink-50 border-pink-200'}`}><i className="fas fa-magic"></i></button>
              {tool === 'lifestyle' && modelTab === 'new' && <button onClick={() => setShowSaveModal(true)} className={`w-12 h-12 rounded-xl flex items-center justify-center border text-purple-500 ${isDark ? 'bg-purple-500/10 border-purple-500/30' : 'bg-purple-50 border-purple-200'}`}><i className="fas fa-user-plus"></i></button>}
            </>
          ) : (
            <button 
              onClick={handleGen} 
              disabled={isGen || !hasOrig || !tool || (tool === 'cenario' && !cenPrompt.trim()) || (tool === 'lifestyle' && !prodDesc.trim()) || (tool === 'lifestyle' && modelTab === 'saved' && !selModelId)} 
              className={`flex-1 h-14 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25 ${isGen || !hasOrig || !tool ? 'bg-neutral-400' : 'bg-gradient-to-r from-pink-500 to-orange-400'}`}
            >
              {isGen ? <><i className="fas fa-spinner fa-spin"></i>Gerando...</> : <><i className="fas fa-wand-magic-sparkles"></i>Gerar Imagem{tool && <span className="text-white/70">({tool === 'lifestyle' ? lifestyleCredits : TOOL_CFG[tool].credits})</span>}</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
