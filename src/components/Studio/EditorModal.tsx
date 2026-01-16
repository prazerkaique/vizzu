// ═══════════════════════════════════════════════════════════════
// VIZZU - EditorModal (Redesign Suno Style)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Product, ProductImage, SavedModelProfile, LookComposition } from '../../types';
import { optimizeImage } from '../../utils/imageOptimizer';
import { LookComposer } from './LookComposer';

interface Props {
  product: Product;
  products: Product[];
  userCredits: number;
  savedModels: SavedModelProfile[];
  onSaveModel: (p: SavedModelProfile) => void;
  onDeleteModel: (id: string) => void;
  onClose: () => void;
  onUpdateProduct: (id: string, u: Partial<Product>) => void;
  onDeductCredits: (n: number, r: string) => boolean;
  onGenerateImage: (p: Product, t: 'studio'|'cenario'|'lifestyle'|'provador'|'refine', prompt?: string, opts?: any) => Promise<{image: string|null; generationId: string|null}>;
  onMarkSaved?: (id: string) => void;
}

type ToolType = 'studio' | 'cenario' | 'lifestyle' | null;

const TOOLS = {
  studio: { 
    name: 'Fundo Pro', 
    icon: 'fa-expand', 
    credits: 1,
    desc: 'Fundo branco profissional'
  },
  cenario: { 
    name: 'Cenário', 
    icon: 'fa-image', 
    credits: 2,
    desc: 'Ambiente personalizado'
  },
  lifestyle: { 
    name: 'Modelo IA', 
    icon: 'fa-user', 
    credits: 3,
    desc: 'Modelo vestindo o produto'
  }
};

const MODEL_OPTS = {
  gender: [{ id: 'woman', label: 'Feminino' }, { id: 'man', label: 'Masculino' }],
  ethnicity: [
    { id: 'caucasian', label: 'Branca' }, 
    { id: 'black', label: 'Negra' }, 
    { id: 'asian', label: 'Asiática' }, 
    { id: 'latino', label: 'Latina' }, 
    { id: 'mixed', label: 'Mista' }
  ],
  bodyType: [
    { id: 'slim', label: 'Magro' }, 
    { id: 'athletic', label: 'Atlético' }, 
    { id: 'average', label: 'Médio' }, 
    { id: 'curvy', label: 'Curvilíneo' }, 
    { id: 'plussize', label: 'Plus Size' }
  ],
  ageRange: [
    { id: 'young', label: '18-25' }, 
    { id: 'adult', label: '26-35' }, 
    { id: 'mature', label: '36-50' }, 
    { id: 'senior', label: '50+' }
  ]
};

const CATEGORIES = [
  { id: 'top', label: 'Parte de cima' }, 
  { id: 'bottom', label: 'Parte de baixo' }, 
  { id: 'shoes', label: 'Calçado' }, 
  { id: 'fullbody', label: 'Corpo inteiro' }, 
  { id: 'accessory', label: 'Acessório' }
];

export const EditorModal: React.FC<Props> = ({ 
  product, products, userCredits, savedModels,
  onSaveModel, onDeleteModel, onClose, onUpdateProduct, 
  onDeductCredits, onGenerateImage, onMarkSaved
}) => {
  const [tool, setTool] = useState<ToolType>(null);
  const [isGen, setIsGen] = useState(false);
  const [genImg, setGenImg] = useState<string|null>(null);
  const [genId, setGenId] = useState<string|null>(null);
  const [error, setError] = useState<string|null>(null);
  const [images, setImages] = useState<ProductImage[]>(product.images || []);
  const [selIdx, setSelIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  
  // Tool states
  const [cenPrompt, setCenPrompt] = useState('');
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
  
  // Modals
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [zoom, setZoom] = useState<string|null>(null);

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
    const cost = TOOLS[tool].credits;
    if (userCredits < cost) { setError('Créditos insuficientes'); return; }
    if (tool === 'cenario' && !cenPrompt.trim()) { setError('Descreva o cenário'); return; }
    if (tool === 'lifestyle' && modelTab === 'saved' && !selModelId) { setError('Selecione um modelo'); return; }
    if (!onDeductCredits(cost, `VIZZU: ${TOOLS[tool].name}`)) { setError('Erro ao processar'); return; }
    
    setIsGen(true); setError(null);
    try {
      let result;
      const catLabel = CATEGORIES.find(c => c.id === category)?.label || 'garment';
      
      if (tool === 'studio') {
        result = await onGenerateImage(product, 'studio');
      } else if (tool === 'cenario') {
        result = await onGenerateImage(product, 'cenario', cenPrompt);
      } else if (tool === 'lifestyle') {
        const lookItems = buildLookItems();
        const opts = modelTab === 'saved' && selModel
          ? { referenceImage: selModel.referenceImage, modelPrompt: selModel.modelPrompt, clothingPrompt: clothing || undefined, posePrompt: pose || undefined, lookItems: lookItems.length ? lookItems : undefined, productCategory: catLabel, productDescription: prodDesc || undefined }
          : { modelPrompt: buildModelPrompt(), clothingPrompt: clothing || undefined, posePrompt: pose || undefined, lookItems: lookItems.length ? lookItems : undefined, productCategory: catLabel, productDescription: prodDesc || undefined };
        result = await onGenerateImage(product, 'lifestyle', undefined, opts);
      }
      
      if (result?.image) { 
        setGenImg(result.image); 
        setGenId(result.generationId); 
      } else {
        setError('Não foi possível gerar a imagem');
      }
    } catch (e: any) { 
      setError(e.message || 'Erro na geração'); 
    } finally { 
      setIsGen(false); 
    }
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
        setGenImg(null);
        setGenId(null);
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
    setNewModelName(''); 
    setShowSaveModal(false); 
    setModelTab('saved'); 
    setSelModelId(profile.id);
  };

  const handleSelectTool = (t: ToolType) => {
    if (genImg && tool !== t && !confirm('Descartar imagem?')) return;
    setGenImg(null); 
    setGenId(null); 
    setError(null); 
    setTool(t === tool ? null : t);
  };

  const displayImage = genImg || current?.base64 || current?.url;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      
      {/* Zoom Modal */}
      {zoom && (
        <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center p-4" onClick={() => setZoom(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-neutral-900 text-white flex items-center justify-center">
            <i className="fas fa-times text-sm"></i>
          </button>
          <img src={zoom} className="max-w-full max-h-[90vh] object-contain rounded-xl" />
        </div>
      )}
      
      {/* Save Model Modal */}
      {showSaveModal && genImg && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 rounded-2xl p-5 w-full max-w-sm border border-neutral-800">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-white">Salvar modelo</h3>
              <button onClick={() => setShowSaveModal(false)} className="text-neutral-500 hover:text-white">
                <i className="fas fa-times text-sm"></i>
              </button>
            </div>
            <div className="flex justify-center mb-5">
              <div className="w-20 h-20 rounded-full border-2 border-pink-500/50 overflow-hidden">
                <img src={genImg} className="w-full h-full object-cover object-top" />
              </div>
            </div>
            <input 
              type="text" 
              value={newModelName} 
              onChange={(e) => setNewModelName(e.target.value)} 
              placeholder="Nome do modelo" 
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 mb-4" 
              autoFocus 
            />
            <button 
              onClick={handleSaveModel} 
              disabled={!newModelName.trim()} 
              className="w-full py-3 bg-white hover:bg-neutral-100 text-black text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Salvar
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MOBILE LAYOUT */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="md:hidden h-full flex flex-col">
        
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between border-b border-neutral-800/50">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center">
            <i className="fas fa-arrow-left text-white text-xs"></i>
          </button>
          
          <div className="text-center flex-1 px-4">
            <p className="text-xs text-neutral-500 truncate">{product.sku}</p>
            <h2 className="text-sm font-medium text-white truncate">{product.name}</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-neutral-900 rounded-full px-2.5 py-1">
              <i className="fas fa-bolt text-[8px] text-pink-400"></i>
              <span className="text-xs font-medium text-white">{userCredits}</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          
          {/* Image Display */}
          <div className="relative aspect-square bg-neutral-900 m-4 rounded-2xl overflow-hidden">
            {isGen ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-neutral-700 border-t-pink-500 animate-spin mb-3"></div>
                <p className="text-xs text-neutral-400">Gerando...</p>
              </div>
            ) : displayImage ? (
              <>
                <img 
                  src={displayImage} 
                  className="w-full h-full object-contain"
                  onClick={() => setZoom(displayImage)}
                />
                {genImg && (
                  <div className="absolute top-3 left-3 bg-green-500/20 text-green-400 text-[10px] font-medium px-2 py-1 rounded-full border border-green-500/30">
                    <i className="fas fa-check mr-1"></i>Gerado
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-600">
                <i className="fas fa-image text-2xl mb-2"></i>
                <p className="text-xs">Sem imagem</p>
              </div>
            )}
          </div>

          {/* Gallery Thumbnails */}
          <div className="px-4 mb-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button 
                  key={idx} 
                  onClick={() => { setSelIdx(idx); setGenImg(null); }}
                  className={`flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 transition-colors ${
                    selIdx === idx && !genImg
                      ? 'border-pink-500' 
                      : 'border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <img src={img.base64 || img.url} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-4 mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
              <i className="fas fa-exclamation-circle text-red-400 text-xs"></i>
              <p className="text-xs text-red-400 flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400/50">
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
          )}

          {/* Tools */}
          <div className="px-4 mb-4">
            <p className="text-[10px] text-neutral-500 uppercase tracking-wide mb-2 font-medium">Ferramentas</p>
            <div className="flex gap-2">
              {(['studio', 'cenario', 'lifestyle'] as ToolType[]).map(t => t && (
                <button
                  key={t}
                  onClick={() => handleSelectTool(t)}
                  className={`flex-1 py-3 rounded-xl text-center transition-all ${
                    tool === t
                      ? 'bg-white text-black'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  <i className={`fas ${TOOLS[t].icon} text-sm mb-1 block`}></i>
                  <span className="text-[10px] font-medium block">{TOOLS[t].name}</span>
                  <span className={`text-[9px] ${tool === t ? 'text-neutral-600' : 'text-neutral-600'}`}>
                    {TOOLS[t].credits} créd.
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tool Config */}
          {tool && (
            <div className="px-4 pb-4">
              <div className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
                
                {/* STUDIO */}
                {tool === 'studio' && (
                  <div className="text-center py-4">
                    <p className="text-sm text-neutral-300">{TOOLS.studio.desc}</p>
                    <p className="text-xs text-neutral-500 mt-2">Remove o fundo e aplica branco profissional</p>
                  </div>
                )}
                
                {/* CENÁRIO */}
                {tool === 'cenario' && (
                  <div>
                    <label className="text-[10px] text-neutral-500 uppercase tracking-wide font-medium mb-2 block">
                      Descreva o cenário
                    </label>
                    <textarea 
                      value={cenPrompt} 
                      onChange={(e) => setCenPrompt(e.target.value)} 
                      placeholder="Ex: Mesa de madeira com plantas, luz natural..."
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-500 resize-none focus:outline-none focus:border-neutral-600" 
                      rows={3} 
                    />
                  </div>
                )}
                
                {/* MODELO IA */}
                {tool === 'lifestyle' && (
                  <div className="space-y-4">
                    
                    {/* Tabs */}
                    <div className="flex bg-neutral-800 rounded-lg p-0.5">
                      <button 
                        onClick={() => setModelTab('new')} 
                        className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
                          modelTab === 'new' ? 'bg-neutral-700 text-white' : 'text-neutral-400'
                        }`}
                      >
                        Novo
                      </button>
                      <button 
                        onClick={() => setModelTab('saved')} 
                        className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
                          modelTab === 'saved' ? 'bg-neutral-700 text-white' : 'text-neutral-400'
                        }`}
                      >
                        Salvos ({savedModels.length})
                      </button>
                    </div>
                    
                    {/* Product Description */}
                    <div className="p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl">
                      <label className="text-[10px] text-pink-400 uppercase tracking-wide font-medium mb-1.5 flex items-center gap-1">
                        <i className="fas fa-info-circle text-[8px]"></i>
                        Descreva o produto
                      </label>
                      <textarea 
                        value={prodDesc} 
                        onChange={(e) => setProdDesc(e.target.value)} 
                        placeholder="Ex: Camiseta preta com logo Nike branco..." 
                        className="w-full bg-transparent text-sm text-white placeholder-pink-300/50 resize-none focus:outline-none" 
                        rows={2} 
                      />
                    </div>
                    
                    {/* Category */}
                    <div>
                      <label className="text-[10px] text-neutral-500 uppercase tracking-wide font-medium mb-1.5 block">
                        Tipo do produto
                      </label>
                      <select 
                        value={category} 
                        onChange={(e) => setCategory(e.target.value)} 
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
                      >
                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    </div>
                    
                    {/* New Model Options */}
                    {modelTab === 'new' && (
                      <div className="space-y-3">
                        
                        {/* Gender */}
                        <div>
                          <label className="text-[10px] text-neutral-500 uppercase tracking-wide font-medium mb-1.5 block">Gênero</label>
                          <div className="grid grid-cols-2 gap-2">
                            {MODEL_OPTS.gender.map(g => (
                              <button 
                                key={g.id} 
                                onClick={() => setModelSettings(p => ({...p, gender: g.id as 'woman'|'man'}))} 
                                className={`py-2.5 rounded-xl text-xs font-medium transition-colors ${
                                  modelSettings.gender === g.id 
                                    ? 'bg-white text-black' 
                                    : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                                }`}
                              >
                                {g.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Ethnicity & Body */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-neutral-500 uppercase tracking-wide font-medium mb-1.5 block">Etnia</label>
                            <select 
                              value={modelSettings.ethnicity} 
                              onChange={(e) => setModelSettings(p => ({...p, ethnicity: e.target.value}))} 
                              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                            >
                              {MODEL_OPTS.ethnicity.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-neutral-500 uppercase tracking-wide font-medium mb-1.5 block">Porte</label>
                            <select 
                              value={modelSettings.bodyType} 
                              onChange={(e) => setModelSettings(p => ({...p, bodyType: e.target.value}))} 
                              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                            >
                              {MODEL_OPTS.bodyType.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                            </select>
                          </div>
                        </div>
                        
                        {/* Age */}
                        <div>
                          <label className="text-[10px] text-neutral-500 uppercase tracking-wide font-medium mb-1.5 block">Idade</label>
                          <select 
                            value={modelSettings.ageRange} 
                            onChange={(e) => setModelSettings(p => ({...p, ageRange: e.target.value}))} 
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                          >
                            {MODEL_OPTS.ageRange.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                          </select>
                        </div>
                        
                        {/* Details */}
                        <div>
                          <label className="text-[10px] text-neutral-500 uppercase tracking-wide font-medium mb-1.5 block">
                            Detalhes <span className="text-neutral-600">(opcional)</span>
                          </label>
                          <textarea 
                            value={modelDetail} 
                            onChange={(e) => setModelDetail(e.target.value)} 
                            placeholder="Ex: Cabelos longos, olhos verdes..." 
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 resize-none focus:outline-none" 
                            rows={2} 
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Saved Models */}
                    {modelTab === 'saved' && (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {savedModels.length === 0 ? (
                          <div className="text-center py-8 text-neutral-500">
                            <i className="fas fa-user-slash text-lg mb-2"></i>
                            <p className="text-xs">Nenhum modelo salvo</p>
                          </div>
                        ) : savedModels.map(m => (
                          <button 
                            key={m.id} 
                            onClick={() => setSelModelId(m.id)} 
                            className={`w-full p-3 rounded-xl flex items-center gap-3 transition-colors ${
                              selModelId === m.id 
                                ? 'bg-white text-black' 
                                : 'bg-neutral-800 text-white border border-neutral-700'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-700 flex-shrink-0">
                              <img src={m.referenceImage} className="w-full h-full object-cover object-top" />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="text-xs font-medium truncate">{m.name}</p>
                              <p className={`text-[10px] ${selModelId === m.id ? 'text-neutral-500' : 'text-neutral-500'}`}>
                                {m.usageCount}x usado
                              </p>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); onDeleteModel(m.id); }} 
                              className={`${selModelId === m.id ? 'text-neutral-400' : 'text-neutral-600'} hover:text-red-400`}
                            >
                              <i className="fas fa-trash text-[10px]"></i>
                            </button>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Clothing & Pose */}
                    <div className="pt-3 border-t border-neutral-800 space-y-3">
                      <div>
                        <label className="text-[10px] text-neutral-500 uppercase tracking-wide font-medium mb-1.5 block">
                          Roupa <span className="text-neutral-600">(opcional)</span>
                        </label>
                        <textarea 
                          value={clothing} 
                          onChange={(e) => setClothing(e.target.value)} 
                          placeholder="Ex: Jeans azul, tênis branco..." 
                          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 resize-none focus:outline-none" 
                          rows={2} 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-neutral-500 uppercase tracking-wide font-medium mb-1.5 block">
                          Pose <span className="text-neutral-600">(opcional)</span>
                        </label>
                        <textarea 
                          value={pose} 
                          onChange={(e) => setPose(e.target.value)} 
                          placeholder="Ex: Em pé, mãos no bolso..." 
                          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 resize-none focus:outline-none" 
                          rows={2} 
                        />
                      </div>
                    </div>
                    
                    {/* Look Composer Toggle */}
                    <button 
                      onClick={() => setShowLook(!showLook)} 
                      className="w-full flex items-center justify-between p-3 bg-neutral-800 rounded-xl border border-neutral-700"
                    >
                      <span className="text-xs font-medium text-white flex items-center gap-2">
                        <i className="fas fa-layer-group text-neutral-400 text-[10px]"></i>
                        Composição de Look
                        {Object.keys(look).length > 0 && (
                          <span className="text-pink-400">({Object.keys(look).length})</span>
                        )}
                      </span>
                      <i className={`fas fa-chevron-down text-neutral-500 text-[10px] transition-transform ${showLook ? 'rotate-180' : ''}`}></i>
                    </button>
                    {showLook && (
                      <div className="mt-2">
                        <LookComposer products={products} composition={look} onChange={setLook} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-neutral-800/50 bg-black">
          {genImg && !isGen ? (
            <div className="flex gap-2">
              <button 
                onClick={() => { setGenImg(null); setGenId(null); }} 
                className="w-11 h-11 bg-neutral-900 border border-neutral-800 text-neutral-400 rounded-xl flex items-center justify-center"
              >
                <i className="fas fa-trash-alt text-xs"></i>
              </button>
              <button 
                onClick={handleSave} 
                disabled={isSaving} 
                className="flex-1 h-11 bg-white hover:bg-neutral-100 text-black font-semibold rounded-xl flex items-center justify-center gap-2 text-sm transition-colors"
              >
                {isSaving ? (
                  <i className="fas fa-spinner fa-spin text-xs"></i>
                ) : (
                  <><i className="fas fa-check text-xs"></i>Salvar</>
                )}
              </button>
              {tool === 'lifestyle' && modelTab === 'new' && (
                <button 
                  onClick={() => setShowSaveModal(true)} 
                  className="w-11 h-11 bg-neutral-900 border border-neutral-800 text-neutral-400 rounded-xl flex items-center justify-center"
                >
                  <i className="fas fa-user-plus text-xs"></i>
                </button>
              )}
            </div>
          ) : (
            <button 
              onClick={handleGen} 
              disabled={isGen || !hasOrig || !tool || (tool === 'cenario' && !cenPrompt.trim()) || (tool === 'lifestyle' && modelTab === 'saved' && !selModelId)} 
              className="w-full h-11 bg-gradient-to-r from-pink-500 to-orange-400 disabled:from-neutral-700 disabled:to-neutral-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 text-sm transition-all disabled:cursor-not-allowed"
            >
              {isGen ? (
                <><i className="fas fa-spinner fa-spin text-xs"></i>Gerando...</>
              ) : (
                <>
                  <i className="fas fa-wand-magic-sparkles text-xs"></i>
                  Gerar
                  {tool && <span className="text-white/70 text-xs">({TOOLS[tool].credits} créd.)</span>}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* DESKTOP LAYOUT */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="hidden md:flex h-full">
        
        {/* Left Panel - Image */}
        <div className="flex-1 flex flex-col p-6">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={onClose} 
                className="w-10 h-10 rounded-full bg-neutral-900 hover:bg-neutral-800 flex items-center justify-center transition-colors"
              >
                <i className="fas fa-arrow-left text-white text-sm"></i>
              </button>
              <div>
                <p className="text-xs text-neutral-500">{product.sku}</p>
                <h2 className="text-lg font-semibold text-white">{product.name}</h2>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-neutral-900 rounded-full px-3 py-1.5">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center">
                  <i className="fas fa-bolt text-[8px] text-white"></i>
                </div>
                <span className="text-sm font-semibold text-white">{userCredits}</span>
              </div>
            </div>
          </div>
          
          {/* Image Area */}
          <div className="flex-1 flex gap-6">
            
            {/* Main Image */}
            <div className="flex-1 bg-neutral-900 rounded-2xl overflow-hidden relative flex items-center justify-center border border-neutral-800">
              {isGen ? (
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full border-2 border-neutral-700 border-t-pink-500 animate-spin mb-3"></div>
                  <p className="text-sm text-neutral-400">Gerando...</p>
                </div>
              ) : displayImage ? (
                <>
                  <img src={displayImage} className="max-w-full max-h-full object-contain" />
                  <button 
                    onClick={() => setZoom(displayImage)} 
                    className="absolute top-4 right-4 w-9 h-9 bg-black/50 hover:bg-black/70 text-white rounded-lg flex items-center justify-center transition-colors"
                  >
                    <i className="fas fa-expand text-xs"></i>
                  </button>
                  {genImg && (
                    <div className="absolute top-4 left-4 bg-green-500/20 text-green-400 text-xs font-medium px-3 py-1.5 rounded-full border border-green-500/30">
                      <i className="fas fa-check mr-1.5"></i>Gerado
                    </div>
                  )}
                </>
              ) : (
                <div className="text-neutral-600 text-center">
                  <i className="fas fa-image text-3xl mb-2"></i>
                  <p className="text-sm">Selecione uma imagem</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Gallery */}
          <div className="mt-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button 
                  key={idx} 
                  onClick={() => { setSelIdx(idx); setGenImg(null); }}
                  className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${
                    selIdx === idx && !genImg
                      ? 'border-pink-500' 
                      : 'border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <img src={img.base64 || img.url} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
          
          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
              <i className="fas fa-exclamation-circle text-red-400 text-sm"></i>
              <p className="text-sm text-red-400 flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400/50 hover:text-red-400">
                <i className="fas fa-times text-sm"></i>
              </button>
            </div>
          )}
          
          {/* Action Buttons - Desktop */}
          {genImg && !isGen && (
            <div className="mt-4 flex gap-3">
              <button 
                onClick={() => { setGenImg(null); setGenId(null); }} 
                className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 rounded-xl text-sm transition-colors"
              >
                <i className="fas fa-trash-alt mr-2"></i>Descartar
              </button>
              <button 
                onClick={handleSave} 
                disabled={isSaving} 
                className="flex-1 py-2.5 bg-white hover:bg-neutral-100 text-black font-semibold rounded-xl text-sm transition-colors"
              >
                {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-check mr-2"></i>Salvar no produto</>}
              </button>
              {tool === 'lifestyle' && modelTab === 'new' && (
                <button 
                  onClick={() => setShowSaveModal(true)} 
                  className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 rounded-xl text-sm transition-colors"
                >
                  <i className="fas fa-user-plus mr-2"></i>Salvar modelo
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Right Panel - Tools */}
        <div className="w-80 bg-neutral-900/50 border-l border-neutral-800 p-5 overflow-y-auto">
          
          <h3 className="text-sm font-semibold text-white mb-4">Ferramentas</h3>
          
          {/* Tool Selection */}
          <div className="space-y-2 mb-6">
            {(['studio', 'cenario', 'lifestyle'] as ToolType[]).map(t => t && (
              <button 
                key={t} 
                onClick={() => handleSelectTool(t)} 
                className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${
                  tool === t 
                    ? 'bg-white text-black' 
                    : 'bg-neutral-800/50 text-white hover:bg-neutral-800 border border-neutral-800'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  tool === t ? 'bg-neutral-200' : 'bg-neutral-700'
                }`}>
                  <i className={`fas ${TOOLS[t].icon} text-xs`}></i>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{TOOLS[t].name}</p>
                  <p className={`text-[10px] ${tool === t ? 'text-neutral-500' : 'text-neutral-500'}`}>
                    {TOOLS[t].desc}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  tool === t ? 'bg-neutral-200 text-neutral-600' : 'bg-neutral-700 text-neutral-400'
                }`}>
                  {TOOLS[t].credits}
                </span>
              </button>
            ))}
          </div>
          
          {/* Tool Config */}
          {tool && (
            <div className="border-t border-neutral-800 pt-4">
              
              {/* STUDIO */}
              {tool === 'studio' && (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                    <i className="fas fa-expand text-neutral-400"></i>
                  </div>
                  <p className="text-sm text-neutral-300">{TOOLS.studio.desc}</p>
                  <p className="text-xs text-neutral-500 mt-1">Remove o fundo e aplica branco profissional</p>
                  
                  <button 
                    onClick={handleGen} 
                    disabled={isGen || !hasOrig} 
                    className="w-full mt-6 py-2.5 bg-gradient-to-r from-pink-500 to-orange-400 disabled:from-neutral-700 disabled:to-neutral-700 text-white font-semibold rounded-xl text-sm transition-all disabled:cursor-not-allowed"
                  >
                    {isGen ? 'Gerando...' : 'Gerar'}
                  </button>
                </div>
              )}
              
              {/* CENÁRIO */}
              {tool === 'cenario' && (
                <div>
                  <label className="text-[10px] text-neutral-500 uppercase tracking-wide font-medium mb-2 block">
                    Descreva o cenário
                  </label>
                  <textarea 
                    value={cenPrompt} 
                    onChange={(e) => setCenPrompt(e.target.value)} 
                    placeholder="Ex: Mesa de madeira com plantas, luz natural..."
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-500 resize-none focus:outline-none focus:border-neutral-600 mb-4" 
                    rows={3} 
                  />
                  
                  <button 
                    onClick={handleGen} 
                    disabled={isGen || !hasOrig || !cenPrompt.trim()} 
                    className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-orange-400 disabled:from-neutral-700 disabled:to-neutral-700 text-white font-semibold rounded-xl text-sm transition-all disabled:cursor-not-allowed"
                  >
                    {isGen ? 'Gerando...' : 'Gerar cenário'}
                  </button>
                </div>
              )}
              
              {/* MODELO IA - Desktop (mesmo conteúdo do mobile, adaptado) */}
              {tool === 'lifestyle' && (
                <div className="space-y-4">
                  
                  {/* Tabs */}
                  <div className="flex bg-neutral-800 rounded-lg p-0.5">
                    <button 
                      onClick={() => setModelTab('new')} 
                      className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
                        modelTab === 'new' ? 'bg-neutral-700 text-white' : 'text-neutral-400'
                      }`}
                    >
                      Novo
                    </button>
                    <button 
                      onClick={() => setModelTab('saved')} 
                      className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
                        modelTab === 'saved' ? 'bg-neutral-700 text-white' : 'text-neutral-400'
                      }`}
                    >
                      Salvos ({savedModels.length})
                    </button>
                  </div>
                  
                  {/* Product Description */}
                  <div className="p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl">
                    <label className="text-[10px] text-pink-400 uppercase tracking-wide font-medium mb-1.5 flex items-center gap-1">
                      <i className="fas fa-info-circle text-[8px]"></i>
                      Descreva o produto
                    </label>
                    <textarea 
                      value={prodDesc} 
                      onChange={(e) => setProdDesc(e.target.value)} 
                      placeholder="Ex: Camiseta preta com logo..." 
                      className="w-full bg-transparent text-sm text-white placeholder-pink-300/50 resize-none focus:outline-none" 
                      rows={2} 
                    />
                  </div>
                  
                  {/* Category */}
                  <div>
                    <label className="text-[10px] text-neutral-500 uppercase tracking-wide font-medium mb-1.5 block">
                      Tipo do produto
                    </label>
                    <select 
                      value={category} 
                      onChange={(e) => setCategory(e.target.value)} 
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
                    >
                      {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                  
                  {/* New Model Options */}
                  {modelTab === 'new' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        {MODEL_OPTS.gender.map(g => (
                          <button 
                            key={g.id} 
                            onClick={() => setModelSettings(p => ({...p, gender: g.id as 'woman'|'man'}))} 
                            className={`py-2 rounded-xl text-xs font-medium transition-colors ${
                              modelSettings.gender === g.id 
                                ? 'bg-white text-black' 
                                : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                            }`}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <select 
                          value={modelSettings.ethnicity} 
                          onChange={(e) => setModelSettings(p => ({...p, ethnicity: e.target.value}))} 
                          className="bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        >
                          {MODEL_OPTS.ethnicity.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                        </select>
                        <select 
                          value={modelSettings.bodyType} 
                          onChange={(e) => setModelSettings(p => ({...p, bodyType: e.target.value}))} 
                          className="bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        >
                          {MODEL_OPTS.bodyType.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                        </select>
                      </div>
                      
                      <select 
                        value={modelSettings.ageRange} 
                        onChange={(e) => setModelSettings(p => ({...p, ageRange: e.target.value}))} 
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        {MODEL_OPTS.ageRange.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                      </select>
                      
                      <textarea 
                        value={modelDetail} 
                        onChange={(e) => setModelDetail(e.target.value)} 
                        placeholder="Detalhes adicionais..." 
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 resize-none focus:outline-none" 
                        rows={2} 
                      />
                    </div>
                  )}
                  
                  {/* Saved Models */}
                  {modelTab === 'saved' && (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {savedModels.length === 0 ? (
                        <div className="text-center py-6 text-neutral-500 text-xs">
                          Nenhum modelo salvo
                        </div>
                      ) : savedModels.map(m => (
                        <button 
                          key={m.id} 
                          onClick={() => setSelModelId(m.id)} 
                          className={`w-full p-2.5 rounded-xl flex items-center gap-2 transition-colors ${
                            selModelId === m.id 
                              ? 'bg-white text-black' 
                              : 'bg-neutral-800 text-white border border-neutral-700'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-700 flex-shrink-0">
                            <img src={m.referenceImage} className="w-full h-full object-cover object-top" />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-xs font-medium truncate">{m.name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Clothing & Pose */}
                  <div className="pt-3 border-t border-neutral-800 space-y-2">
                    <textarea 
                      value={clothing} 
                      onChange={(e) => setClothing(e.target.value)} 
                      placeholder="Roupa (opcional)..." 
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 resize-none focus:outline-none" 
                      rows={2} 
                    />
                    <textarea 
                      value={pose} 
                      onChange={(e) => setPose(e.target.value)} 
                      placeholder="Pose (opcional)..." 
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 resize-none focus:outline-none" 
                      rows={2} 
                    />
                  </div>
                  
                  {/* Generate Button */}
                  <button 
                    onClick={handleGen} 
                    disabled={isGen || !hasOrig || (modelTab === 'saved' && !selModelId)} 
                    className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-orange-400 disabled:from-neutral-700 disabled:to-neutral-700 text-white font-semibold rounded-xl text-sm transition-all disabled:cursor-not-allowed mt-4"
                  >
                    {isGen ? 'Gerando...' : `Gerar (${TOOLS.lifestyle.credits} créd.)`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
