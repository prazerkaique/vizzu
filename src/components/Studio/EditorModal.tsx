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
}

type ToolType = 'studio' | 'cenario' | 'lifestyle' | null;

// ═══════════════════════════════════════════════════════════════
// CONFIGURAÇÕES DAS FERRAMENTAS - Nomes conforme design
// ═══════════════════════════════════════════════════════════════
const TOOL_CFG = {
  studio: { 
    name: 'Studio Ready', 
    icon: 'fa-store', 
    credits: 1, 
    color: 'purple',
    desc: 'Fundo branco',
    fullDesc: 'Fundo branco profissional com sombra suave. Ideal para e-commerce.'
  },
  cenario: { 
    name: 'Cenário Criativo', 
    icon: 'fa-film', 
    credits: 2, 
    color: 'pink',
    desc: 'Ambiente personalizado',
    fullDesc: 'Crie um ambiente promocional personalizado para seu produto.'
  },
  lifestyle: { 
    name: 'Modelo IA', 
    icon: 'fa-user-friends', 
    credits: 3, 
    color: 'orange',
    desc: 'Humano com produto',
    fullDesc: 'Gere um modelo humano usando seu produto. Salve para reutilizar!'
  }
};

const MODEL_OPTS = {
  gender: [{ id: 'woman', label: 'Mulher' }, { id: 'man', label: 'Homem' }],
  ethnicity: [
    { id: 'caucasian', label: 'Branca/Caucasiana' }, 
    { id: 'black', label: 'Negra/Afrodescendente' }, 
    { id: 'asian', label: 'Asiática' }, 
    { id: 'latino', label: 'Latina/Hispânica' }, 
    { id: 'middleeastern', label: 'Oriente Médio' },
    { id: 'mixed', label: 'Mista/Parda' }
  ],
  bodyType: [
    { id: 'slim', label: 'Magro(a)' }, 
    { id: 'athletic', label: 'Atlético(a)' }, 
    { id: 'average', label: 'Médio' }, 
    { id: 'curvy', label: 'Curvilíneo(a)' }, 
    { id: 'plussize', label: 'Plus Size' }
  ],
  ageRange: [
    { id: 'young', label: '18-25 anos' }, 
    { id: 'adult', label: '26-35 anos' }, 
    { id: 'mature', label: '36-50 anos' }, 
    { id: 'senior', label: '50+ anos' }
  ]
};

const CATEGORIES = [
  { id: 'top', label: 'Parte de Cima (Camiseta, Blusa, Casaco)' }, 
  { id: 'bottom', label: 'Parte de Baixo (Calça, Short, Saia)' }, 
  { id: 'shoes', label: 'Calçado (Tênis, Sapato, Sandália)' }, 
  { id: 'fullbody', label: 'Corpo Inteiro (Vestido, Macacão)' }, 
  { id: 'accessory', label: 'Acessório (Bolsa, Chapéu, Joia)' }
];

export const EditorModal: React.FC<Props> = ({ 
  product, products, userCredits, savedModels, clients = [], 
  selectedClient: initialSelectedClient, companyLogo, 
  onSaveModel, onDeleteModel, onClose, onUpdateProduct, 
  onDeductCredits, onGenerateImage, onMarkSaved, onSendWhatsApp 
}) => {
  const [tool, setTool] = useState<ToolType>(null);
  const [isGen, setIsGen] = useState(false);
  const [genImg, setGenImg] = useState<string|null>(null);
  const [genId, setGenId] = useState<string|null>(null);
  const [error, setError] = useState<string|null>(null);
  const [images, setImages] = useState<ProductImage[]>(product.images || []);
  const [selIdx, setSelIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  
  // Cenário states
  const [cenPrompt, setCenPrompt] = useState('');
  
  // Modelo IA states
  const [modelTab, setModelTab] = useState<'new'|'saved'>('new');
  const [selModelId, setSelModelId] = useState<string|null>(null);
  const [category, setCategory] = useState('top');
  const [prodDesc, setProdDesc] = useState('');
  const [modelSettings, setModelSettings] = useState({ 
    gender: 'woman' as 'woman'|'man', 
    ethnicity: 'caucasian', 
    bodyType: 'average', 
    ageRange: 'adult' 
  });
  const [modelDetail, setModelDetail] = useState('');
  const [clothing, setClothing] = useState('');
  const [pose, setPose] = useState('');
  const [showLook, setShowLook] = useState(false);
  const [look, setLook] = useState<LookComposition>({});
  
  // Other states
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

  const buildModelPrompt = () => {
    const g = modelSettings.gender === 'woman' ? 'Female' : 'Male';
    const e = MODEL_OPTS.ethnicity.find(x => x.id === modelSettings.ethnicity)?.label || '';
    const b = MODEL_OPTS.bodyType.find(x => x.id === modelSettings.bodyType)?.label || '';
    const a = MODEL_OPTS.ageRange.find(x => x.id === modelSettings.ageRange)?.label || '';
    return `${g} model, ${e}, ${b}, ${a}.${modelDetail ? ' ' + modelDetail : ''}`;
  };

  const buildLookItems = () => Object.entries(look).map(([slot, item]) => item ? { slot, image: item.image, name: item.name } : null).filter(Boolean) as any[];

  const handleGen = async () => {
    if (!tool || !hasOrig) return;
    const cost = TOOL_CFG[tool].credits;
    if (userCredits < cost) { setError('Créditos insuficientes'); return; }
    if (tool === 'cenario' && !cenPrompt.trim()) { setError('Descreva o cenário'); return; }
    if (tool === 'lifestyle' && modelTab === 'saved' && !selModelId) { setError('Selecione um modelo'); return; }
    if (!onDeductCredits(cost, `VIZZU: ${TOOL_CFG[tool].name}`)) { setError('Erro ao processar créditos'); return; }
    
    setIsGen(true); setError(null);
    try {
      let result;
      const catLabel = CATEGORIES.find(c => c.id === category)?.label || 'garment';
      if (tool === 'studio') result = await onGenerateImage(product, 'studio');
      else if (tool === 'cenario') result = await onGenerateImage(product, 'cenario', cenPrompt);
      else if (tool === 'lifestyle') {
        const lookItems = buildLookItems();
        const opts = modelTab === 'saved' && selModel
          ? { referenceImage: selModel.referenceImage, modelPrompt: selModel.modelPrompt, clothingPrompt: clothing || undefined, posePrompt: pose || undefined, lookItems: lookItems.length ? lookItems : undefined, productCategory: catLabel, productDescription: prodDesc || undefined }
          : { modelPrompt: buildModelPrompt(), clothingPrompt: clothing || undefined, posePrompt: pose || undefined, lookItems: lookItems.length ? lookItems : undefined, productCategory: catLabel, productDescription: prodDesc || undefined };
        result = await onGenerateImage(product, 'lifestyle', undefined, opts);
      }
      if (result?.image) { setGenImg(result.image); setGenId(result.generationId); setViewMode('result'); }
      else setError('A IA não retornou uma imagem válida. Verifique se o prompt não viola políticas de segurança ou tente simplificar.');
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
    const profile: SavedModelProfile = { 
      id: `model-${Date.now()}`, 
      name: newModelName.trim(), 
      referenceImage: genImg, 
      settings: { ...modelSettings }, 
      modelPrompt: buildModelPrompt(), 
      createdAt: new Date().toISOString(), 
      usageCount: 0 
    };
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
  };

  const displayImage = viewMode === 'result' && genImg ? genImg : (current?.base64 || current?.url);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 md:bg-black/80 md:backdrop-blur-sm flex items-end md:items-center justify-center">
      
      {/* Zoom Modal */}
      {zoom && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4" onClick={() => setZoom(null)}>
          <button className="absolute top-4 right-4 w-12 h-12 bg-white/10 text-white rounded-full flex items-center justify-center">
            <i className="fas fa-times text-xl"></i>
          </button>
          <img src={zoom} className="max-w-full max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}
      
      {/* Save Model Modal */}
      {showSaveModal && genImg && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Salvar Modelo</h3>
              <button onClick={() => setShowSaveModal(false)} className="text-slate-400"><i className="fas fa-times"></i></button>
            </div>
            <div className="flex justify-center mb-6">
              <div className="w-32 h-32 rounded-full border-4 border-purple-200 overflow-hidden">
                <img src={genImg} className="w-full h-full object-cover object-top" />
              </div>
            </div>
            <p className="text-sm text-slate-500 text-center mb-4">
              Nas próximas gerações com esse modelo, a IA tentará manter os mesmos traços.
            </p>
            <input type="text" value={newModelName} onChange={(e) => setNewModelName(e.target.value)} placeholder="Nome do modelo..." className="w-full p-3 border border-slate-300 rounded-lg mb-4" autoFocus />
            <button onClick={handleSaveModel} disabled={!newModelName.trim()} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold disabled:opacity-50">
              <i className="fas fa-save mr-2"></i>Salvar
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* DESKTOP LAYOUT */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="hidden md:flex bg-slate-50 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors">
              <i className="fas fa-arrow-left"></i>
            </button>
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
            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors">
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
        
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Images */}
          <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto">
            
            {/* Image Preview Area */}
            <div className="flex gap-4 min-h-[300px]">
              {/* Original */}
              <div className="w-1/3 bg-white rounded-2xl border border-slate-200 p-4 flex flex-col shadow-sm">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                  <i className="fas fa-bullseye text-slate-400"></i>
                  Imagem de Referência
                </h3>
                <div className="flex-1 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
                  {hasOrig ? (
                    <img src={current.base64 || current.url} className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-slate-400 text-center text-xs">
                      <i className="fas fa-image text-3xl mb-2"></i>
                      <p>Selecione uma imagem</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Result */}
              <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-4 flex flex-col relative group shadow-sm">
                <h3 className="text-sm font-bold text-slate-700 mb-3">Resultado</h3>
                <div className="flex-1 bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl overflow-hidden relative flex items-center justify-center">
                  {isGen ? (
                    <div className="flex flex-col items-center text-purple-500">
                      <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-500 animate-spin mb-3"></div>
                      <p className="text-sm font-bold">Gerando...</p>
                    </div>
                  ) : genImg ? (
                    <>
                      <img src={genImg} className="w-full h-full object-contain" />
                      <button onClick={() => setZoom(genImg)} className="absolute top-3 right-3 w-10 h-10 bg-black/50 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <i className="fas fa-expand"></i>
                      </button>
                    </>
                  ) : (
                    <div className="text-center text-slate-400 p-8">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i className="fas fa-wand-magic-sparkles text-2xl text-slate-300"></i>
                      </div>
                      <p className="text-sm">Configure ao lado e clique em Gerar</p>
                    </div>
                  )}
                </div>
                
                {/* Action buttons when image generated */}
                {genImg && !isGen && !showRefine && (
                  <div className="absolute bottom-6 left-6 right-6 flex justify-center gap-3">
                    <button onClick={() => { setGenImg(null); setGenId(null); }} className="w-12 h-12 bg-white text-red-500 rounded-full shadow-lg flex items-center justify-center border border-red-100 hover:bg-red-50 transition-colors">
                      <i className="fas fa-trash-alt"></i>
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="flex-1 max-w-xs h-12 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full shadow-xl flex items-center justify-center gap-2 transition-colors">
                      {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
                      Salvar no Produto
                    </button>
                    <button onClick={() => setShowRefine(true)} className="w-12 h-12 bg-white text-purple-600 rounded-full shadow-lg flex items-center justify-center border border-purple-100 hover:bg-purple-50 transition-colors">
                      <i className="fas fa-magic"></i>
                    </button>
                    {tool === 'lifestyle' && modelTab === 'new' && (
                      <button onClick={() => setShowSaveModal(true)} className="w-12 h-12 bg-white text-indigo-600 rounded-full shadow-lg flex items-center justify-center border border-indigo-100 hover:bg-indigo-50 transition-colors">
                        <i className="fas fa-user-plus"></i>
                      </button>
                    )}
                  </div>
                )}
                
                {/* Refine Panel */}
                {showRefine && genImg && (
                  <div className="absolute bottom-4 left-4 right-4 p-4 bg-white shadow-lg rounded-xl border border-purple-100">
                    <textarea value={refinePrompt} onChange={(e) => setRefinePrompt(e.target.value)} placeholder="O que você gostaria de ajustar na imagem?" className="w-full p-2 border border-purple-200 rounded-lg text-sm resize-none mb-2" rows={2} />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowRefine(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700">Cancelar</button>
                      <button onClick={handleRefine} disabled={!refinePrompt.trim() || isGen} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50">
                        <i className="fas fa-magic mr-1"></i>Refinar (1 créd.)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
                <i className="fas fa-exclamation-circle text-red-500"></i>
                <p className="text-xs text-red-700 flex-1">{error}</p>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                  <i className="fas fa-times"></i>
                </button>
              </div>
            )}

            {/* Gallery */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-4 flex flex-col min-h-[120px] shadow-sm">
              <h3 className="text-xs font-bold text-slate-700 uppercase mb-3 flex items-center gap-2">
                <i className="fas fa-th-large text-slate-400"></i>
                Galeria do Produto
              </h3>
              <div className="flex-1 overflow-y-auto">
                {images.length > 0 ? (
                  <div className="grid grid-cols-6 lg:grid-cols-8 gap-2">
                    {images.map((img, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setSelIdx(idx)} 
                        className={`aspect-square rounded-xl overflow-hidden cursor-pointer relative group border-2 transition-all ${
                          selIdx === idx 
                            ? 'border-purple-500 ring-2 ring-purple-500/20' 
                            : 'border-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <img src={img.base64 || img.url} className="w-full h-full object-cover" />
                        {selIdx === idx && (
                          <div className="absolute inset-0 bg-purple-500/10 flex items-center justify-center">
                            <div className="bg-purple-500 text-white w-5 h-5 rounded-full flex items-center justify-center">
                              <i className="fas fa-check text-[8px]"></i>
                            </div>
                          </div>
                        )}
                        <button 
                          onClick={(e) => handleDeleteImg(idx, e)} 
                          className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 text-[8px] transition-opacity"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    Nenhuma imagem no produto
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right Panel - Tools */}
          <div className="w-80 bg-white border-l border-slate-200 p-5 overflow-y-auto flex-shrink-0">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <i className="fas fa-toolbox text-purple-500"></i>
              Ferramentas
            </h3>
            
            <div className="space-y-3">
              {(['studio', 'cenario', 'lifestyle'] as ToolType[]).map(t => t && (
                <div 
                  key={t} 
                  onClick={() => handleSelectTool(t)} 
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    tool === t 
                      ? 'border-purple-500 bg-purple-50 shadow-md' 
                      : 'border-slate-200 hover:border-purple-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        tool === t 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        <i className={`fas ${TOOL_CFG[t].icon}`}></i>
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 block">{TOOL_CFG[t].name}</span>
                        <span className="text-xs text-slate-500">{TOOL_CFG[t].desc}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-full text-amber-600 bg-amber-50">
                      {TOOL_CFG[t].credits} créd.
                    </span>
                  </div>
                  
                  {/* Tool expanded content */}
                  {tool === t && (
                    <div className="mt-3 pt-3 border-t border-slate-200" onClick={(e) => e.stopPropagation()}>
                      
                      {/* STUDIO READY */}
                      {t === 'studio' && (
                        <>
                          <p className="text-xs text-slate-600 mb-3">{TOOL_CFG.studio.fullDesc}</p>
                          <button 
                            onClick={handleGen} 
                            disabled={isGen || !hasOrig} 
                            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                          >
                            {isGen ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}
                            {isGen ? 'Gerando...' : 'Gerar'}
                          </button>
                        </>
                      )}
                      
                      {/* CENÁRIO CRIATIVO */}
                      {t === 'cenario' && (
                        <>
                          <p className="text-xs text-slate-600 mb-3">{TOOL_CFG.cenario.fullDesc}</p>
                          <textarea 
                            value={cenPrompt} 
                            onChange={(e) => setCenPrompt(e.target.value)} 
                            placeholder="Descreva o cenário... Ex: Mesa de madeira com plantas, luz natural..." 
                            className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none mb-3" 
                            rows={3} 
                          />
                          <button 
                            onClick={handleGen} 
                            disabled={isGen || !hasOrig || !cenPrompt.trim()} 
                            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                          >
                            {isGen ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}
                            {isGen ? 'Gerando...' : 'Gerar Cenário'}
                          </button>
                        </>
                      )}
                      
                      {/* MODELO IA */}
                      {t === 'lifestyle' && (
                        <>
                          <p className="text-xs text-slate-600 mb-3">{TOOL_CFG.lifestyle.fullDesc}</p>
                          
                          {/* Tabs */}
                          <div className="flex bg-slate-200 rounded-lg p-1 mb-3">
                            <button 
                              onClick={() => setModelTab('new')} 
                              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                                modelTab === 'new' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                              }`}
                            >
                              Novo Modelo
                            </button>
                            <button 
                              onClick={() => setModelTab('saved')} 
                              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                                modelTab === 'saved' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                              }`}
                            >
                              Salvos ({savedModels.length})
                            </button>
                          </div>
                          
                          {/* Product Description - IMPORTANT */}
                          <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                            <label className="text-[9px] font-bold text-amber-700 uppercase mb-1 flex items-center gap-1">
                              <i className="fas fa-exclamation-triangle"></i>
                              Descreva o produto principal
                            </label>
                            <textarea 
                              value={prodDesc} 
                              onChange={(e) => setProdDesc(e.target.value)} 
                              placeholder="Ex: Camiseta preta com logo Nike branco no peito, gola redonda, tecido algodão, corte regular..." 
                              className="w-full p-2 bg-white border border-amber-300 rounded text-[11px] resize-none" 
                              rows={2} 
                            />
                            <p className="text-[9px] text-amber-600 mt-1">
                              <i className="fas fa-info-circle mr-1"></i>
                              Quanto mais detalhes (cor, estampa, logo, corte, tecido), mais fiel será o resultado.
                            </p>
                          </div>
                          
                          {/* Product Category */}
                          <div className="mb-3">
                            <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                              <i className="fas fa-tshirt text-slate-400"></i>
                              O que é o produto principal?
                            </label>
                            <select 
                              value={category} 
                              onChange={(e) => setCategory(e.target.value)} 
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                            >
                              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                            </select>
                            <p className="text-[9px] text-slate-400 mt-1">A IA usará isso para não alterar o produto.</p>
                          </div>
                          
                          {/* New Model Options */}
                          {modelTab === 'new' && (
                            <div className="space-y-3 mb-3">
                              {/* Gender */}
                              <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase mb-1.5 block">Gênero</label>
                                <div className="grid grid-cols-2 gap-2">
                                  {MODEL_OPTS.gender.map(g => (
                                    <button 
                                      key={g.id} 
                                      onClick={() => setModelSettings(p => ({...p, gender: g.id as 'woman'|'man'}))} 
                                      className={`py-2 rounded-lg text-xs font-bold border-2 transition-all flex items-center justify-center gap-2 ${
                                        modelSettings.gender === g.id 
                                          ? 'bg-slate-900 border-slate-900 text-white' 
                                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                                      }`}
                                    >
                                      <i className={`fas ${g.id === 'woman' ? 'fa-venus' : 'fa-mars'}`}></i>
                                      {g.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              
                              {/* Ethnicity & Body Type */}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">Etnia</label>
                                  <select 
                                    value={modelSettings.ethnicity} 
                                    onChange={(e) => setModelSettings(p => ({...p, ethnicity: e.target.value}))} 
                                    className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs"
                                  >
                                    {MODEL_OPTS.ethnicity.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">Porte Físico</label>
                                  <select 
                                    value={modelSettings.bodyType} 
                                    onChange={(e) => setModelSettings(p => ({...p, bodyType: e.target.value}))} 
                                    className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs"
                                  >
                                    {MODEL_OPTS.bodyType.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                                  </select>
                                </div>
                              </div>
                              
                              {/* Age */}
                              <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">Faixa Etária</label>
                                <select 
                                  value={modelSettings.ageRange} 
                                  onChange={(e) => setModelSettings(p => ({...p, ageRange: e.target.value}))} 
                                  className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs"
                                >
                                  {MODEL_OPTS.ageRange.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                                </select>
                              </div>
                              
                              {/* Facial Details */}
                              <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">Detalhes Faciais (opcional)</label>
                                <textarea 
                                  value={modelDetail} 
                                  onChange={(e) => setModelDetail(e.target.value)} 
                                  placeholder="Ex: Cabelos longos ondulados, olhos verdes, sardas..." 
                                  className="w-full p-2 bg-white border border-slate-200 rounded text-xs resize-none" 
                                  rows={2} 
                                />
                              </div>
                            </div>
                          )}
                          
                          {/* Saved Models */}
                          {modelTab === 'saved' && (
                            <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                              {savedModels.length === 0 ? (
                                <div className="text-center py-4 text-slate-400 text-xs bg-slate-50 rounded-lg border border-dashed">
                                  <i className="fas fa-user-slash text-lg mb-1"></i>
                                  <p>Nenhum modelo salvo</p>
                                </div>
                              ) : savedModels.map(m => (
                                <div 
                                  key={m.id} 
                                  onClick={() => setSelModelId(m.id)} 
                                  className={`p-2 rounded-lg border-2 cursor-pointer flex items-center gap-2 transition-all ${
                                    selModelId === m.id 
                                      ? 'bg-slate-900 border-slate-900 text-white' 
                                      : 'bg-white border-slate-200 hover:border-slate-400 text-slate-700'
                                  }`}
                                >
                                  <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                                    <img src={m.referenceImage} className="w-full h-full object-cover object-top" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-xs truncate">{m.name}</p>
                                    <p className={`text-[9px] ${selModelId === m.id ? 'text-slate-400' : 'text-slate-500'}`}>
                                      Usado {m.usageCount}x
                                    </p>
                                  </div>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); onDeleteModel(m.id); }} 
                                    className={`${selModelId === m.id ? 'text-slate-500' : 'text-slate-300'} hover:text-red-400`}
                                  >
                                    <i className="fas fa-trash text-[10px]"></i>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Additional Options */}
                          <div className="space-y-2 pt-2 border-t border-slate-200">
                            <div>
                              <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                <i className="fas fa-shirt text-slate-400"></i>
                                Roupa
                              </label>
                              <textarea 
                                value={clothing} 
                                onChange={(e) => setClothing(e.target.value)} 
                                placeholder="Ex: Camiseta branca básica, jeans azul..." 
                                className="w-full p-2 bg-white border border-slate-200 rounded text-xs resize-none" 
                                rows={2} 
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                <i className="fas fa-walking text-slate-400"></i>
                                Pose / Expressão
                              </label>
                              <textarea 
                                value={pose} 
                                onChange={(e) => setPose(e.target.value)} 
                                placeholder="Ex: Em pé confiante, mãos no bolso..." 
                                className="w-full p-2 bg-white border border-slate-200 rounded text-xs resize-none" 
                                rows={2} 
                              />
                            </div>
                          </div>
                          
                          {/* Look Composer */}
                          <div className="mt-3">
                            <button 
                              onClick={() => setShowLook(!showLook)} 
                              className="w-full flex items-center justify-between p-2 bg-indigo-50 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors"
                            >
                              <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                <i className="fas fa-layer-group text-indigo-600"></i>
                                Composição de Look
                                {Object.keys(look).length > 0 && (
                                  <span className="text-indigo-600">({Object.keys(look).length})</span>
                                )}
                              </span>
                              <i className={`fas fa-chevron-down text-slate-400 transition-transform ${showLook ? 'rotate-180' : ''}`}></i>
                            </button>
                            {showLook && (
                              <div className="mt-2">
                                <LookComposer products={products} composition={look} onChange={setLook} />
                              </div>
                            )}
                          </div>
                          
                          {/* Generate Button */}
                          <button 
                            onClick={handleGen} 
                            disabled={isGen || !hasOrig || (modelTab === 'saved' && !selModelId)} 
                            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-4 shadow-lg shadow-slate-900/20 transition-colors"
                          >
                            {isGen ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}
                            {isGen ? 'Gerando...' : `Gerar com Modelo (${TOOL_CFG.lifestyle.credits} créd.)`}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Tip */}
            <div className="mt-6 p-4 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
                <i className="fas fa-lightbulb text-yellow-500"></i>
                Dica de Consistência
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ao <strong>Salvar um Modelo</strong>, a imagem gerada será usada como <strong>referência facial</strong>. Nas próximas gerações com esse modelo, a IA tentará manter os mesmos traços.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MOBILE LAYOUT */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="md:hidden w-full h-full bg-white flex flex-col">
        
        {/* Mobile Header */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center">
              <i className="fas fa-arrow-left text-sm"></i>
            </button>
            <div className="text-white min-w-0">
              <h2 className="font-bold text-sm truncate max-w-[180px]">{product.name}</h2>
              <p className="text-[10px] text-white/70 font-mono">{product.sku}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-white/20 rounded-lg px-3 py-1.5 text-white flex items-center gap-1.5">
              <i className="fas fa-bolt text-yellow-300 text-xs"></i>
              <span className="font-bold text-sm">{userCredits}</span>
              <span className="text-white/70 text-xs">créditos</span>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center">
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-y-auto pb-24">
          
          {/* Image Display */}
          <div className="relative bg-slate-100">
            <div className="aspect-square flex items-center justify-center overflow-hidden">
              {isGen ? (
                <div className="flex flex-col items-center text-purple-500">
                  <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-500 animate-spin mb-3"></div>
                  <p className="text-sm font-bold">Gerando...</p>
                </div>
              ) : displayImage ? (
                <img 
                  src={displayImage} 
                  className="w-full h-full object-contain"
                  onClick={() => setZoom(displayImage)}
                />
              ) : (
                <div className="text-slate-400 text-center">
                  <i className="fas fa-image text-4xl mb-2"></i>
                  <p className="text-sm">Sem imagem</p>
                </div>
              )}
            </div>
            
            {/* View Toggle */}
            {genImg && !isGen && (
              <div className="absolute top-3 left-3 bg-white rounded-lg shadow-lg p-1 flex gap-1">
                <button 
                  onClick={() => setViewMode('original')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'original' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
                >
                  Original
                </button>
                <button 
                  onClick={() => setViewMode('result')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'result' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}
                >
                  Resultado
                </button>
              </div>
            )}

            {displayImage && !isGen && (
              <button 
                onClick={() => setZoom(displayImage)} 
                className="absolute top-3 right-3 w-10 h-10 bg-black/50 text-white rounded-lg flex items-center justify-center"
              >
                <i className="fas fa-expand"></i>
              </button>
            )}
          </div>

          {/* Gallery */}
          <div className="bg-white border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <div 
                  key={idx} 
                  onClick={() => { setSelIdx(idx); setViewMode('original'); }}
                  className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all relative ${
                    selIdx === idx ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-slate-200'
                  }`}
                >
                  <img src={img.base64 || img.url} className="w-full h-full object-cover" />
                  {selIdx === idx && (
                    <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                      <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                        <i className="fas fa-check text-white text-[8px]"></i>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button className="flex-shrink-0 w-14 h-14 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                <i className="fas fa-plus"></i>
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
              <i className="fas fa-exclamation-circle text-red-500"></i>
              <p className="text-xs text-red-700 flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400"><i className="fas fa-times"></i></button>
            </div>
          )}

          {/* Tools */}
          <div className="px-4 py-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Ferramentas</h3>
            <div className="space-y-2">
              {(['studio', 'cenario', 'lifestyle'] as ToolType[]).map(t => t && (
                <div
                  key={t}
                  onClick={() => handleSelectTool(t)}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    tool === t 
                      ? 'border-purple-500 bg-purple-50 shadow-md' 
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        tool === t ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <i className={`fas ${TOOL_CFG[t].icon}`}></i>
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 block text-sm">{TOOL_CFG[t].name}</span>
                        <span className="text-xs text-slate-500">{TOOL_CFG[t].desc}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-full text-amber-600 bg-amber-50">
                      {TOOL_CFG[t].credits} créd.
                    </span>
                  </div>
                  
                  {/* Expanded Tool Config */}
                  {tool === t && (
                    <div className="mt-3 pt-3 border-t border-slate-200" onClick={e => e.stopPropagation()}>
                      
                      {/* STUDIO */}
                      {t === 'studio' && (
                        <p className="text-xs text-slate-600">{TOOL_CFG.studio.fullDesc}</p>
                      )}
                      
                      {/* CENÁRIO */}
                      {t === 'cenario' && (
                        <>
                          <p className="text-xs text-slate-600 mb-2">{TOOL_CFG.cenario.fullDesc}</p>
                          <textarea 
                            value={cenPrompt} 
                            onChange={e => setCenPrompt(e.target.value)}
                            placeholder="Descreva o cenário... Ex: Mesa de madeira com plantas, luz natural..."
                            className="w-full p-3 border border-slate-200 rounded-xl text-sm resize-none"
                            rows={3}
                          />
                        </>
                      )}
                      
                      {/* MODELO IA */}
                      {t === 'lifestyle' && (
                        <div className="space-y-3">
                          <p className="text-xs text-slate-600">{TOOL_CFG.lifestyle.fullDesc}</p>
                          
                          <div className="flex bg-slate-200 rounded-lg p-1">
                            <button onClick={() => setModelTab('new')} className={`flex-1 py-2 text-xs font-bold rounded-md ${modelTab === 'new' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Novo Modelo</button>
                            <button onClick={() => setModelTab('saved')} className={`flex-1 py-2 text-xs font-bold rounded-md ${modelTab === 'saved' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Salvos ({savedModels.length})</button>
                          </div>
                          
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                            <label className="text-[10px] font-bold text-amber-700 uppercase mb-1 flex items-center gap-1">
                              <i className="fas fa-exclamation-triangle"></i>
                              Descreva o produto principal
                            </label>
                            <textarea value={prodDesc} onChange={e => setProdDesc(e.target.value)} placeholder="Ex: Camiseta preta com logo..." className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs resize-none" rows={2} />
                            <p className="text-[9px] text-amber-600 mt-1">
                              <i className="fas fa-info-circle mr-1"></i>
                              Quanto mais detalhes (cor, estampa, logo, corte, tecido), mais fiel será o resultado.
                            </p>
                          </div>
                          
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                              <i className="fas fa-tshirt text-slate-400"></i>
                              O que é o produto principal?
                            </label>
                            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm">
                              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                            </select>
                            <p className="text-[9px] text-slate-400 mt-1">A IA usará isso para não alterar o produto.</p>
                          </div>
                          
                          {modelTab === 'new' && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block">Gênero</label>
                                <div className="grid grid-cols-2 gap-2">
                                  {MODEL_OPTS.gender.map(g => (
                                    <button key={g.id} onClick={() => setModelSettings(p => ({...p, gender: g.id as 'woman'|'man'}))} className={`py-3 rounded-xl text-sm font-bold border-2 flex items-center justify-center gap-2 ${modelSettings.gender === g.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200'}`}>
                                      <i className={`fas ${g.id === 'woman' ? 'fa-venus' : 'fa-mars'}`}></i>
                                      {g.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Etnia</label>
                                  <select value={modelSettings.ethnicity} onChange={e => setModelSettings(p => ({...p, ethnicity: e.target.value}))} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm">{MODEL_OPTS.ethnicity.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}</select>
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Porte Físico</label>
                                  <select value={modelSettings.bodyType} onChange={e => setModelSettings(p => ({...p, bodyType: e.target.value}))} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm">{MODEL_OPTS.bodyType.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}</select>
                                </div>
                              </div>
                              
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Faixa Etária</label>
                                <select value={modelSettings.ageRange} onChange={e => setModelSettings(p => ({...p, ageRange: e.target.value}))} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm">{MODEL_OPTS.ageRange.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</select>
                              </div>
                              
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Detalhes Faciais (opcional)</label>
                                <textarea value={modelDetail} onChange={e => setModelDetail(e.target.value)} placeholder="Ex: Cabelos longos ondulados, olhos verdes, sardas..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm resize-none" rows={2} />
                              </div>
                            </div>
                          )}
                          
                          {modelTab === 'saved' && (
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {savedModels.length === 0 ? (
                                <div className="text-center py-6 text-slate-400 text-sm bg-white rounded-xl border border-dashed border-slate-300">
                                  <i className="fas fa-user-slash text-2xl mb-2"></i>
                                  <p>Nenhum modelo salvo</p>
                                </div>
                              ) : savedModels.map(m => (
                                <div key={m.id} onClick={() => setSelModelId(m.id)} className={`p-3 rounded-xl border-2 cursor-pointer flex items-center gap-3 ${selModelId === m.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200'}`}>
                                  <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 flex-shrink-0"><img src={m.referenceImage} className="w-full h-full object-cover object-top" /></div>
                                  <div className="flex-1 min-w-0"><p className="font-bold text-sm truncate">{m.name}</p><p className={`text-xs ${selModelId === m.id ? 'text-slate-400' : 'text-slate-500'}`}>Usado {m.usageCount}x</p></div>
                                  <button onClick={e => { e.stopPropagation(); onDeleteModel(m.id); }} className={`${selModelId === m.id ? 'text-slate-500' : 'text-slate-300'} hover:text-red-400`}><i className="fas fa-trash text-xs"></i></button>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div className="space-y-3 pt-3 border-t border-slate-200">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                <i className="fas fa-shirt text-slate-400"></i>
                                Roupa
                              </label>
                              <textarea value={clothing} onChange={e => setClothing(e.target.value)} placeholder="Ex: Camiseta branca básica, jeans azul..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm resize-none" rows={2} />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                <i className="fas fa-walking text-slate-400"></i>
                                Pose / Expressão
                              </label>
                              <textarea value={pose} onChange={e => setPose(e.target.value)} placeholder="Ex: Em pé confiante, mãos no bolso..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm resize-none" rows={2} />
                            </div>
                          </div>
                          
                          <button onClick={() => setShowLook(!showLook)} className="w-full flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                            <span className="text-sm font-bold text-slate-800"><i className="fas fa-layer-group text-indigo-600 mr-2"></i>Composição de Look {Object.keys(look).length > 0 && <span className="text-indigo-600">({Object.keys(look).length})</span>}</span>
                            <i className={`fas fa-chevron-down text-slate-400 transition-transform ${showLook ? 'rotate-180' : ''}`}></i>
                          </button>
                          {showLook && <div className="mt-2"><LookComposer products={products} composition={look} onChange={setLook} /></div>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Tip */}
            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-2">
                <i className="fas fa-lightbulb text-yellow-500"></i>
                Dica de Consistência
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Ao <strong>Salvar um Modelo</strong>, a imagem gerada será usada como <strong>referência facial</strong>. Nas próximas gerações com esse modelo, a IA tentará manter os mesmos traços.
              </p>
            </div>
          </div>

          {/* Refine */}
          {showRefine && genImg && (
            <div className="px-4 pb-4">
              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200">
                <h4 className="text-sm font-bold text-purple-800 mb-2"><i className="fas fa-magic mr-2"></i>Refinar Imagem</h4>
                <textarea value={refinePrompt} onChange={e => setRefinePrompt(e.target.value)} placeholder="O que ajustar?" className="w-full p-3 border border-purple-200 rounded-xl text-sm resize-none mb-3" rows={2} />
                <div className="flex gap-2">
                  <button onClick={() => setShowRefine(false)} className="flex-1 py-2.5 text-sm font-bold text-slate-500 bg-white rounded-xl border border-slate-200">Cancelar</button>
                  <button onClick={handleRefine} disabled={!refinePrompt.trim()} className="flex-1 py-2.5 bg-purple-600 text-white text-sm font-bold rounded-xl disabled:opacity-50"><i className="fas fa-magic mr-1"></i>Refinar (1 créd.)</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex gap-3">
          {genImg && !isGen ? (
            <>
              <button onClick={() => { setGenImg(null); setGenId(null); setViewMode('original'); }} className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center border border-red-200"><i className="fas fa-trash-alt"></i></button>
              <button onClick={handleSave} disabled={isSaving} className="flex-1 h-12 bg-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">{isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}Salvar</button>
              <button onClick={() => setShowRefine(true)} className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center border border-purple-200"><i className="fas fa-magic"></i></button>
              {tool === 'lifestyle' && modelTab === 'new' && <button onClick={() => setShowSaveModal(true)} className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-200"><i className="fas fa-user-plus"></i></button>}
            </>
          ) : (
            <button 
              onClick={handleGen} 
              disabled={isGen || !hasOrig || !tool || (tool === 'cenario' && !cenPrompt.trim()) || (tool === 'lifestyle' && modelTab === 'saved' && !selModelId)} 
              className="flex-1 h-14 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:from-slate-400 disabled:to-slate-500"
            >
              {isGen ? <><i className="fas fa-spinner fa-spin"></i><span>Gerando...</span></> : <><i className="fas fa-wand-magic-sparkles"></i><span>Gerar Imagem</span>{tool && <span className="text-white/70">({TOOL_CFG[tool].credits} créd.)</span>}</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
