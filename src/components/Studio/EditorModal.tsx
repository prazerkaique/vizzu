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

type ToolType = 'studio' | 'cenario' | 'lifestyle' | 'provador' | null;

const TOOL_CFG = {
  studio: { name: 'Studio', icon: 'fa-store', credits: 1, color: 'purple' },
  cenario: { name: 'Cenário', icon: 'fa-film', credits: 2, color: 'pink' },
  lifestyle: { name: 'Modelo IA', icon: 'fa-user-friends', credits: 3, color: 'orange' },
  provador: { name: 'Provador', icon: 'fa-shirt', credits: 3, color: 'emerald' }
};

const MODEL_OPTS = {
  gender: [{ id: 'woman', label: 'Mulher' }, { id: 'man', label: 'Homem' }],
  ethnicity: [{ id: 'caucasian', label: 'Branca' }, { id: 'black', label: 'Negra' }, { id: 'asian', label: 'Asiática' }, { id: 'latino', label: 'Latina' }, { id: 'mixed', label: 'Mista' }],
  bodyType: [{ id: 'slim', label: 'Magro(a)' }, { id: 'athletic', label: 'Atlético(a)' }, { id: 'average', label: 'Médio' }, { id: 'curvy', label: 'Curvilíneo(a)' }, { id: 'plussize', label: 'Plus Size' }],
  ageRange: [{ id: 'young', label: '18-25' }, { id: 'adult', label: '26-35' }, { id: 'mature', label: '36-50' }, { id: 'senior', label: '50+' }]
};

const CATEGORIES = [
  { id: 'top', label: 'Parte de Cima' }, { id: 'bottom', label: 'Parte de Baixo' }, { id: 'shoes', label: 'Calçado' }, { id: 'fullbody', label: 'Corpo Inteiro' }, { id: 'accessory', label: 'Acessório' }
];

export const EditorModal: React.FC<Props> = ({ product, products, userCredits, savedModels, clients = [], selectedClient: initialSelectedClient, companyLogo, onSaveModel, onDeleteModel, onClose, onUpdateProduct, onDeductCredits, onGenerateImage, onMarkSaved, onSendWhatsApp }) => {
  const [tool, setTool] = useState<ToolType>(initialSelectedClient ? 'provador' : null);
  const [isGen, setIsGen] = useState(false);
  const [genImg, setGenImg] = useState<string|null>(null);
  const [genId, setGenId] = useState<string|null>(null);
  const [error, setError] = useState<string|null>(null);
  const [images, setImages] = useState<ProductImage[]>(product.images || []);
  const [selIdx, setSelIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [cenPrompt, setCenPrompt] = useState('');
  const [modelTab, setModelTab] = useState<'new'|'saved'>('new');
  const [selModelId, setSelModelId] = useState<string|null>(null);
  const [category, setCategory] = useState('top');
  const [prodDesc, setProdDesc] = useState('');
  const [modelSettings, setModelSettings] = useState({ gender: 'woman' as 'woman'|'man', ethnicity: 'caucasian', bodyType: 'average', ageRange: 'adult' });
  const [modelDetail, setModelDetail] = useState('');
  const [clothing, setClothing] = useState('');
  const [pose, setPose] = useState('');
  const [showLook, setShowLook] = useState(false);
  const [look, setLook] = useState<LookComposition>({});
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [showRefine, setShowRefine] = useState(false);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [zoom, setZoom] = useState<string|null>(null);
  const [viewMode, setViewMode] = useState<'original'|'result'>('original');
  
  // Provador IA States
  const [provadorClient, setProvadorClient] = useState<Client | null>(initialSelectedClient || null);
  const [provadorProducts, setProvadorProducts] = useState<Product[]>([product]);
  const [provadorMessage, setProvadorMessage] = useState(`Olá {nome}! 🛍️\n\nPreparei um visual especial para você! Veja como ficou.\n\nO que achou? 😍`);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [addWatermark, setAddWatermark] = useState(true);
  
  // Clientes com Provador IA ativo
  const clientsWithProvador = clients.filter(c => c.hasProvadorIA && c.photo);

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
    if (tool === 'provador' && !provadorClient) { setError('Selecione um cliente'); return; }
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
      else if (tool === 'provador' && provadorClient) {
        const opts = {
          clientPhoto: provadorClient.photo,
          clientName: `${provadorClient.firstName} ${provadorClient.lastName}`,
          products: provadorProducts.map(p => ({ id: p.id, name: p.name, image: p.images[0]?.base64 || p.images[0]?.url })),
          addWatermark,
          companyLogo
        };
        result = await onGenerateImage(product, 'provador', undefined, opts);
      }
      if (result?.image) { setGenImg(result.image); setGenId(result.generationId); setViewMode('result'); }
      else setError('IA não retornou imagem');
    } catch (e: any) { setError(e.message || 'Erro'); }
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
    setGenImg(null); setGenId(null); setShowRefine(false); setError(null); setTool(t); setViewMode('original');
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
            <input type="text" value={newModelName} onChange={(e) => setNewModelName(e.target.value)} placeholder="Nome do modelo..." className="w-full p-3 border border-slate-300 rounded-lg mb-4" autoFocus />
            <button onClick={handleSaveModel} disabled={!newModelName.trim()} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold disabled:opacity-50">
              <i className="fas fa-save mr-2"></i>Salvar
            </button>
          </div>
        </div>
      )}

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
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center">
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>
        </div>

        {/* Mobile Content - Scrollable */}
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

            {/* Zoom button */}
            {displayImage && !isGen && (
              <button 
                onClick={() => setZoom(displayImage)} 
                className="absolute top-3 right-3 w-10 h-10 bg-black/50 text-white rounded-lg flex items-center justify-center"
              >
                <i className="fas fa-expand"></i>
              </button>
            )}
          </div>

          {/* Gallery - Horizontal Scroll */}
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

          {/* Tools Tabs */}
          <div className="px-4 py-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Ferramentas</h3>
            <div className="flex gap-2">
              {(['studio', 'cenario', 'lifestyle', 'provador'] as ToolType[]).map(t => t && (
                <button
                  key={t}
                  onClick={() => handleSelectTool(t)}
                  disabled={t === 'provador' && clientsWithProvador.length === 0}
                  className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all flex flex-col items-center gap-1 ${
                    tool === t 
                      ? t === 'provador' 
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' 
                      : t === 'provador' && clientsWithProvador.length === 0
                        ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                        : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <i className={`fas ${TOOL_CFG[t].icon}`}></i>
                  <span>{TOOL_CFG[t].name}</span>
                  <span className={`text-[10px] ${tool === t ? 'text-white/70' : 'text-amber-600'}`}>
                    {TOOL_CFG[t].credits} créd.
                  </span>
                </button>
              ))}
            </div>
            {clientsWithProvador.length === 0 && (
              <p className="text-[10px] text-slate-400 mt-2 text-center">
                <i className="fas fa-info-circle mr-1"></i>
                Cadastre clientes com foto para usar o Provador IA
              </p>
            )}
          </div>

          {/* Tool Config */}
          {tool && (
            <div className="px-4 pb-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                
                {tool === 'studio' && (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <i className="fas fa-magic text-purple-600 text-2xl"></i>
                    </div>
                    <p className="text-sm text-slate-600">Remove o fundo e aplica fundo branco profissional</p>
                  </div>
                )}
                
                {tool === 'cenario' && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-2 block">Descreva o cenário</label>
                    <textarea 
                      value={cenPrompt} 
                      onChange={(e) => setCenPrompt(e.target.value)} 
                      placeholder="Ex: Em uma praia tropical ao pôr do sol..."
                      className="w-full p-3 border border-slate-200 rounded-xl text-sm resize-none" 
                      rows={3} 
                    />
                  </div>
                )}
                
                {tool === 'lifestyle' && (
                  <div className="space-y-4">
                    <div className="flex bg-slate-200 rounded-lg p-1">
                      <button onClick={() => setModelTab('new')} className={`flex-1 py-2 text-xs font-bold rounded-md ${modelTab === 'new' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Novo Modelo</button>
                      <button onClick={() => setModelTab('saved')} className={`flex-1 py-2 text-xs font-bold rounded-md ${modelTab === 'saved' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Salvos ({savedModels.length})</button>
                    </div>
                    
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <label className="text-[10px] font-bold text-amber-700 uppercase mb-1 block"><i className="fas fa-exclamation-triangle mr-1"></i>Descreva o produto</label>
                      <textarea value={prodDesc} onChange={(e) => setProdDesc(e.target.value)} placeholder="Ex: Camiseta preta com logo..." className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs resize-none" rows={2} />
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Tipo do produto</label>
                      <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm">
                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    </div>
                    
                    {modelTab === 'new' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          {MODEL_OPTS.gender.map(g => (
                            <button key={g.id} onClick={() => setModelSettings(p => ({...p, gender: g.id as 'woman'|'man'}))} className={`py-3 rounded-xl text-sm font-bold border-2 ${modelSettings.gender === g.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200'}`}>{g.label}</button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <select value={modelSettings.ethnicity} onChange={(e) => setModelSettings(p => ({...p, ethnicity: e.target.value}))} className="p-3 bg-white border border-slate-200 rounded-xl text-sm">{MODEL_OPTS.ethnicity.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}</select>
                          <select value={modelSettings.bodyType} onChange={(e) => setModelSettings(p => ({...p, bodyType: e.target.value}))} className="p-3 bg-white border border-slate-200 rounded-xl text-sm">{MODEL_OPTS.bodyType.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}</select>
                        </div>
                        <select value={modelSettings.ageRange} onChange={(e) => setModelSettings(p => ({...p, ageRange: e.target.value}))} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm">{MODEL_OPTS.ageRange.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</select>
                        <textarea value={modelDetail} onChange={(e) => setModelDetail(e.target.value)} placeholder="Detalhes adicionais..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm resize-none" rows={2} />
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
                            <button onClick={(e) => { e.stopPropagation(); onDeleteModel(m.id); }} className={`${selModelId === m.id ? 'text-slate-500' : 'text-slate-300'} hover:text-red-400`}><i className="fas fa-trash text-xs"></i></button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="space-y-3 pt-3 border-t border-slate-200">
                      <textarea value={clothing} onChange={(e) => setClothing(e.target.value)} placeholder="Roupas adicionais (opcional)..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm resize-none" rows={2} />
                      <textarea value={pose} onChange={(e) => setPose(e.target.value)} placeholder="Pose do modelo (opcional)..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm resize-none" rows={2} />
                    </div>
                    
                    <button onClick={() => setShowLook(!showLook)} className="w-full flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                      <span className="text-sm font-bold text-slate-800"><i className="fas fa-layer-group text-indigo-600 mr-2"></i>Compor Look {Object.keys(look).length > 0 && <span className="text-indigo-600">({Object.keys(look).length})</span>}</span>
                      <i className={`fas fa-chevron-down text-slate-400 transition-transform ${showLook ? 'rotate-180' : ''}`}></i>
                    </button>
                    {showLook && <div className="mt-2"><LookComposer products={products} composition={look} onChange={setLook} /></div>}
                  </div>
                )}
                
                {/* PROVADOR IA CONFIG */}
                {tool === 'provador' && (
                  <div className="space-y-4">
                    {/* Cliente selecionado */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Cliente</label>
                      {provadorClient ? (
                        <div 
                          onClick={() => setShowClientPicker(true)}
                          className="flex items-center gap-3 p-3 bg-white border-2 border-emerald-200 rounded-xl cursor-pointer hover:bg-emerald-50 transition-colors"
                        >
                          <img src={provadorClient.photo} alt={provadorClient.firstName} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md" />
                          <div className="flex-1">
                            <p className="font-bold text-slate-800">{provadorClient.firstName} {provadorClient.lastName}</p>
                            <p className="text-xs text-slate-500">{provadorClient.whatsapp}</p>
                          </div>
                          <i className="fas fa-chevron-right text-slate-400"></i>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setShowClientPicker(true)}
                          className="w-full p-4 border-2 border-dashed border-slate-300 rounded-xl text-center hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
                        >
                          <i className="fas fa-user-plus text-slate-400 text-2xl mb-2"></i>
                          <p className="text-sm text-slate-500">Selecionar Cliente</p>
                        </button>
                      )}
                    </div>
                    
                    {/* Produtos selecionados */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Produtos</label>
                        <button onClick={() => setShowProductPicker(true)} className="text-xs text-emerald-600 font-bold"><i className="fas fa-plus mr-1"></i>Adicionar</button>
                      </div>
                      <div className="space-y-2">
                        {provadorProducts.map((p, idx) => (
                          <div key={p.id} className="flex items-center gap-3 p-2 bg-white border border-slate-200 rounded-xl">
                            <img src={p.images[0]?.base64 || p.images[0]?.url} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                              <p className="text-[10px] text-slate-500">{p.sku}</p>
                            </div>
                            {provadorProducts.length > 1 && (
                              <button onClick={() => setProvadorProducts(prev => prev.filter(x => x.id !== p.id))} className="text-slate-300 hover:text-red-400">
                                <i className="fas fa-times"></i>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Mensagem WhatsApp */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">
                        <i className="fab fa-whatsapp text-green-500 mr-1"></i>Mensagem
                      </label>
                      <textarea 
                        value={provadorMessage} 
                        onChange={(e) => setProvadorMessage(e.target.value)}
                        className="w-full p-3 border border-slate-200 rounded-xl text-sm resize-none" 
                        rows={4}
                        placeholder="Use {nome} para personalizar..."
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Use {'{nome}'} para o nome do cliente</p>
                    </div>
                    
                    {/* Marca d'água */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2">
                        <i className="fas fa-copyright text-slate-400"></i>
                        <span className="text-sm text-slate-700">Adicionar marca d'água</span>
                      </div>
                      <button 
                        onClick={() => setAddWatermark(!addWatermark)}
                        className={`w-12 h-7 rounded-full transition-colors ${addWatermark ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${addWatermark ? 'translate-x-6' : 'translate-x-1'}`}></div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Refine */}
          {showRefine && genImg && (
            <div className="px-4 pb-4">
              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200">
                <h4 className="text-sm font-bold text-purple-800 mb-2"><i className="fas fa-magic mr-2"></i>Refinar Imagem</h4>
                <textarea value={refinePrompt} onChange={(e) => setRefinePrompt(e.target.value)} placeholder="O que ajustar?" className="w-full p-3 border border-purple-200 rounded-xl text-sm resize-none mb-3" rows={2} />
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
              {tool === 'provador' && provadorClient && onSendWhatsApp ? (
                <button 
                  onClick={() => {
                    const msg = provadorMessage.replace('{nome}', provadorClient.firstName);
                    onSendWhatsApp(provadorClient, msg, genImg || undefined);
                  }} 
                  className="flex-1 h-12 bg-green-500 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                >
                  <i className="fab fa-whatsapp text-lg"></i>WhatsApp
                </button>
              ) : (
                <>
                  <button onClick={() => setShowRefine(true)} className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center border border-purple-200"><i className="fas fa-magic"></i></button>
                  {tool === 'lifestyle' && modelTab === 'new' && <button onClick={() => setShowSaveModal(true)} className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-200"><i className="fas fa-user-plus"></i></button>}
                </>
              )}
            </>
          ) : (
            <button 
              onClick={handleGen} 
              disabled={isGen || !hasOrig || !tool || (tool === 'cenario' && !cenPrompt.trim()) || (tool === 'lifestyle' && modelTab === 'saved' && !selModelId) || (tool === 'provador' && !provadorClient)} 
              className={`flex-1 h-14 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:from-slate-400 disabled:to-slate-500 ${
                tool === 'provador' 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                  : 'bg-gradient-to-r from-purple-600 to-pink-600'
              }`}
            >
              {isGen ? <><i className="fas fa-spinner fa-spin"></i><span>Gerando...</span></> : <><i className="fas fa-wand-magic-sparkles"></i><span>Gerar Imagem</span>{tool && <span className="text-white/70">({TOOL_CFG[tool].credits} créd.)</span>}</>}
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* DESKTOP LAYOUT */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="hidden md:flex bg-slate-50 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex-col">
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center"><i className="fas fa-arrow-left"></i></button>
            <div className="text-white"><h2 className="font-bold text-lg">{product.name}</h2><p className="text-sm text-white/70 font-mono">{product.sku}</p></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-xl px-4 py-2 text-white flex items-center gap-2"><i className="fas fa-bolt text-yellow-300"></i><span className="font-bold">{userCredits}</span></div>
            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center"><i className="fas fa-times"></i></button>
          </div>
        </div>
        
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto">
            <div className="flex gap-4 min-h-[300px]">
              <div className="w-1/3 bg-white rounded-2xl border border-slate-200 p-4 flex flex-col">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3"><i className="fas fa-bullseye mr-1"></i>Referência</h3>
                <div className="flex-1 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
                  {hasOrig ? <img src={current.base64 || current.url} className="w-full h-full object-contain" /> : <div className="text-slate-400 text-center text-xs"><i className="fas fa-image text-3xl mb-2"></i><p>Selecione</p></div>}
                </div>
              </div>
              <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-4 flex flex-col relative group">
                <h3 className="text-sm font-bold text-slate-700 mb-3"><i className="fas fa-sparkles text-purple-500 mr-2"></i>Resultado</h3>
                <div className="flex-1 bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl overflow-hidden relative flex items-center justify-center">
                  {isGen ? <div className="flex flex-col items-center text-purple-500"><div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-500 animate-spin mb-3"></div><p className="text-sm font-bold">Gerando...</p></div>
                  : genImg ? <><img src={genImg} className="w-full h-full object-contain" /><button onClick={() => setZoom(genImg)} className="absolute top-3 right-3 w-10 h-10 bg-black/50 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100"><i className="fas fa-expand"></i></button></>
                  : <div className="text-center text-slate-400 p-8"><div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3"><i className="fas fa-wand-magic-sparkles text-2xl text-slate-300"></i></div><p className="text-sm">Configure e clique em Gerar</p></div>}
                </div>
                {genImg && !isGen && !showRefine && (
                  <div className="absolute bottom-6 left-6 right-6 flex justify-center gap-3">
                    <button onClick={() => { setGenImg(null); setGenId(null); }} className="w-12 h-12 bg-white text-red-500 rounded-full shadow-lg flex items-center justify-center border border-red-100"><i className="fas fa-trash-alt"></i></button>
                    <button onClick={handleSave} disabled={isSaving} className="flex-1 max-w-xs h-12 bg-green-600 text-white font-bold rounded-full shadow-xl flex items-center justify-center gap-2">{isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}Salvar</button>
                    <button onClick={() => setShowRefine(true)} className="w-12 h-12 bg-white text-purple-600 rounded-full shadow-lg flex items-center justify-center border border-purple-100"><i className="fas fa-magic"></i></button>
                    {tool === 'lifestyle' && modelTab === 'new' && <button onClick={() => setShowSaveModal(true)} className="w-12 h-12 bg-white text-indigo-600 rounded-full shadow-lg flex items-center justify-center border border-indigo-100"><i className="fas fa-user-plus"></i></button>}
                  </div>
                )}
                {showRefine && genImg && (
                  <div className="absolute bottom-4 left-4 right-4 p-4 bg-white shadow-lg rounded-xl border border-purple-100">
                    <textarea value={refinePrompt} onChange={(e) => setRefinePrompt(e.target.value)} placeholder="O que ajustar?" className="w-full p-2 border border-purple-200 rounded-lg text-sm resize-none mb-2" rows={2} />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowRefine(false)} className="px-3 py-1.5 text-xs text-slate-500">Cancelar</button>
                      <button onClick={handleRefine} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg"><i className="fas fa-magic mr-1"></i>Refinar (1 créd.)</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3"><i className="fas fa-exclamation-circle text-red-500"></i><p className="text-xs text-red-700">{error}</p><button onClick={() => setError(null)} className="ml-auto text-red-400"><i className="fas fa-times"></i></button></div>}

            <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-4 flex flex-col min-h-[120px]">
              <h3 className="text-xs font-bold text-slate-700 uppercase mb-3"><i className="fas fa-th-large text-slate-400 mr-1"></i>Galeria</h3>
              <div className="flex-1 overflow-y-auto">
                {images.length > 0 ? (
                  <div className="grid grid-cols-6 lg:grid-cols-8 gap-2">
                    {images.map((img, idx) => (
                      <div key={idx} onClick={() => setSelIdx(idx)} className={`aspect-square rounded-xl overflow-hidden cursor-pointer relative group border-2 transition-all ${selIdx === idx ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-slate-100 hover:border-slate-300'}`}>
                        <img src={img.base64 || img.url} className="w-full h-full object-cover" />
                        {selIdx === idx && <div className="absolute inset-0 bg-purple-500/10 flex items-center justify-center"><div className="bg-purple-500 text-white w-5 h-5 rounded-full flex items-center justify-center"><i className="fas fa-check text-[8px]"></i></div></div>}
                        <button onClick={(e) => handleDeleteImg(idx, e)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 text-[8px]"><i className="fas fa-times"></i></button>
                      </div>
                    ))}
                  </div>
                ) : <div className="h-full flex items-center justify-center text-slate-400 text-xs">Nenhuma imagem</div>}
              </div>
            </div>
          </div>
          
          <div className="w-80 bg-white border-l border-slate-200 p-5 overflow-y-auto flex-shrink-0">
            <h3 className="text-lg font-bold text-slate-800 mb-4"><i className="fas fa-toolbox text-purple-500 mr-2"></i>Ferramentas</h3>
            <div className="space-y-3">
              {(['studio', 'cenario', 'lifestyle', 'provador'] as ToolType[]).map(t => t && (
                <div 
                  key={t} 
                  onClick={() => !(t === 'provador' && clientsWithProvador.length === 0) && handleSelectTool(t)} 
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    t === 'provador' && clientsWithProvador.length === 0 
                      ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                      : tool === t 
                        ? t === 'provador'
                          ? 'border-emerald-500 bg-emerald-50 shadow-md'
                          : 'border-purple-500 bg-purple-50 shadow-md' 
                        : 'border-slate-200 hover:border-purple-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        tool === t 
                          ? t === 'provador' ? 'bg-emerald-600 text-white' : 'bg-purple-600 text-white' 
                          : 'bg-slate-100 text-slate-500'
                      }`}><i className={`fas ${TOOL_CFG[t].icon}`}></i></div>
                      <span className="font-bold text-slate-800">{TOOL_CFG[t].name}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      t === 'provador' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'
                    }`}>{TOOL_CFG[t].credits} créd.</span>
                  </div>
                  
                  {tool === t && (
                    <div className="mt-3 pt-3 border-t border-slate-200" onClick={(e) => e.stopPropagation()}>
                      {t === 'studio' && <button onClick={handleGen} disabled={isGen || !hasOrig} className="w-full py-2.5 bg-purple-600 text-white font-bold rounded-lg text-sm disabled:opacity-50 flex items-center justify-center gap-2">{isGen ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}{isGen ? 'Gerando...' : 'Gerar'}</button>}
                      
                      {t === 'cenario' && <>
                        <textarea value={cenPrompt} onChange={(e) => setCenPrompt(e.target.value)} placeholder="Descreva o cenário..." className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none mb-3" rows={3} />
                        <button onClick={handleGen} disabled={isGen || !hasOrig || !cenPrompt.trim()} className="w-full py-2.5 bg-purple-600 text-white font-bold rounded-lg text-sm disabled:opacity-50 flex items-center justify-center gap-2">{isGen ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}{isGen ? 'Gerando...' : 'Gerar'}</button>
                      </>}
                      
                      {t === 'lifestyle' && <>
                        <div className="flex bg-slate-200 rounded-lg p-1 mb-3">
                          <button onClick={() => setModelTab('new')} className={`flex-1 py-1.5 text-xs font-bold rounded-md ${modelTab === 'new' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Novo</button>
                          <button onClick={() => setModelTab('saved')} className={`flex-1 py-1.5 text-xs font-bold rounded-md ${modelTab === 'saved' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Salvos ({savedModels.length})</button>
                        </div>
                        
                        <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                          <label className="text-[9px] font-bold text-amber-700 uppercase mb-1 block"><i className="fas fa-exclamation-triangle mr-1"></i>Descreva o produto</label>
                          <textarea value={prodDesc} onChange={(e) => setProdDesc(e.target.value)} placeholder="Ex: Camiseta preta com logo..." className="w-full p-2 bg-white border border-amber-300 rounded text-[11px] resize-none" rows={2} />
                        </div>
                        
                        <div className="mb-3">
                          <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">Tipo do produto</label>
                          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs">{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
                        </div>
                        
                        {modelTab === 'new' && (
                          <div className="space-y-3 mb-3">
                            <div className="grid grid-cols-2 gap-2">{MODEL_OPTS.gender.map(g => <button key={g.id} onClick={() => setModelSettings(p => ({...p, gender: g.id as 'woman'|'man'}))} className={`py-1.5 rounded-lg text-xs font-bold border ${modelSettings.gender === g.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>{g.label}</button>)}</div>
                            <div className="grid grid-cols-2 gap-2">
                              <select value={modelSettings.ethnicity} onChange={(e) => setModelSettings(p => ({...p, ethnicity: e.target.value}))} className="p-1.5 bg-white border border-slate-200 rounded text-xs">{MODEL_OPTS.ethnicity.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}</select>
                              <select value={modelSettings.bodyType} onChange={(e) => setModelSettings(p => ({...p, bodyType: e.target.value}))} className="p-1.5 bg-white border border-slate-200 rounded text-xs">{MODEL_OPTS.bodyType.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}</select>
                            </div>
                            <select value={modelSettings.ageRange} onChange={(e) => setModelSettings(p => ({...p, ageRange: e.target.value}))} className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs">{MODEL_OPTS.ageRange.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</select>
                            <textarea value={modelDetail} onChange={(e) => setModelDetail(e.target.value)} placeholder="Detalhes faciais..." className="w-full p-2 bg-white border border-slate-200 rounded text-xs resize-none" rows={2} />
                          </div>
                        )}
                        
                        {modelTab === 'saved' && (
                          <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                            {savedModels.length === 0 ? <div className="text-center py-4 text-slate-400 text-xs bg-slate-50 rounded-lg border border-dashed">Nenhum modelo salvo</div> : savedModels.map(m => (
                              <div key={m.id} onClick={() => setSelModelId(m.id)} className={`p-2 rounded-lg border cursor-pointer flex items-center gap-2 ${selModelId === m.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 hover:border-slate-400 text-slate-700'}`}>
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100"><img src={m.referenceImage} className="w-full h-full object-cover object-top" /></div>
                                <div className="flex-1 min-w-0"><p className="font-bold text-xs truncate">{m.name}</p><p className={`text-[9px] ${selModelId === m.id ? 'text-slate-400' : 'text-slate-500'}`}>{m.usageCount}x</p></div>
                                <button onClick={(e) => { e.stopPropagation(); onDeleteModel(m.id); }} className={`${selModelId === m.id ? 'text-slate-500' : 'text-slate-300'} hover:text-red-400`}><i className="fas fa-trash text-[10px]"></i></button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="space-y-2 pt-2 border-t border-slate-200">
                          <textarea value={clothing} onChange={(e) => setClothing(e.target.value)} placeholder="Roupas adicionais..." className="w-full p-2 bg-white border border-slate-200 rounded text-xs resize-none" rows={2} />
                          <textarea value={pose} onChange={(e) => setPose(e.target.value)} placeholder="Pose..." className="w-full p-2 bg-white border border-slate-200 rounded text-xs resize-none" rows={2} />
                        </div>
                        
                        <div className="mt-3">
                          <button onClick={() => setShowLook(!showLook)} className="w-full flex items-center justify-between p-2 bg-indigo-50 rounded-lg border border-indigo-200">
                            <span className="text-xs font-bold text-slate-800"><i className="fas fa-layer-group text-indigo-600 mr-2"></i>Look {Object.keys(look).length > 0 && <span className="text-indigo-600">({Object.keys(look).length})</span>}</span>
                            <i className={`fas fa-chevron-down text-slate-400 transition-transform ${showLook ? 'rotate-180' : ''}`}></i>
                          </button>
                          {showLook && <div className="mt-2"><LookComposer products={products} composition={look} onChange={setLook} /></div>}
                        </div>
                        
                        <button onClick={handleGen} disabled={isGen || !hasOrig || (modelTab === 'saved' && !selModelId)} className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-3">{isGen ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}{isGen ? 'Gerando...' : `Gerar (${TOOL_CFG.lifestyle.credits} créd.)`}</button>
                      </>}
                      
                      {/* PROVADOR IA CONFIG - Desktop */}
                      {t === 'provador' && clientsWithProvador.length > 0 && <>
                        {/* Cliente */}
                        <div className="mb-3">
                          <label className="text-[9px] font-bold text-slate-500 uppercase mb-1.5 block">Cliente</label>
                          {provadorClient ? (
                            <div onClick={() => setShowClientPicker(true)} className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg cursor-pointer hover:bg-emerald-100">
                              <img src={provadorClient.photo} alt="" className="w-8 h-8 rounded-full object-cover" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">{provadorClient.firstName} {provadorClient.lastName}</p>
                                <p className="text-[10px] text-slate-500">{provadorClient.whatsapp}</p>
                              </div>
                              <i className="fas fa-chevron-right text-slate-400 text-[10px]"></i>
                            </div>
                          ) : (
                            <button onClick={() => setShowClientPicker(true)} className="w-full p-3 border-2 border-dashed border-slate-300 rounded-lg text-center hover:border-emerald-400">
                              <i className="fas fa-user-plus text-slate-300 text-lg mb-1"></i>
                              <p className="text-[10px] text-slate-400">Selecionar Cliente</p>
                            </button>
                          )}
                        </div>
                        
                        {/* Produtos */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Produtos ({provadorProducts.length})</label>
                            <button onClick={() => setShowProductPicker(true)} className="text-[10px] text-emerald-600 font-bold"><i className="fas fa-plus mr-1"></i>Add</button>
                          </div>
                          <div className="space-y-1.5 max-h-24 overflow-y-auto">
                            {provadorProducts.map(p => (
                              <div key={p.id} className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-lg">
                                <img src={p.images[0]?.base64 || p.images[0]?.url} alt="" className="w-8 h-8 rounded object-cover" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-medium text-slate-700 truncate">{p.name}</p>
                                </div>
                                {provadorProducts.length > 1 && (
                                  <button onClick={() => setProvadorProducts(pr => pr.filter(x => x.id !== p.id))} className="text-slate-300 hover:text-red-400"><i className="fas fa-times text-[10px]"></i></button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Mensagem */}
                        <div className="mb-3">
                          <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block"><i className="fab fa-whatsapp text-green-500 mr-1"></i>Mensagem</label>
                          <textarea value={provadorMessage} onChange={(e) => setProvadorMessage(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-[11px] resize-none" rows={3} />
                        </div>
                        
                        {/* Marca d'água */}
                        <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg mb-3">
                          <span className="text-[10px] text-slate-600"><i className="fas fa-copyright mr-1"></i>Marca d'água</span>
                          <button onClick={() => setAddWatermark(!addWatermark)} className={`w-10 h-5 rounded-full ${addWatermark ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${addWatermark ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
                          </button>
                        </div>
                        
                        {/* Botões */}
                        <div className="space-y-2">
                          <button onClick={handleGen} disabled={isGen || !hasOrig || !provadorClient} className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-lg text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                            {isGen ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-wand-magic-sparkles"></i>}
                            {isGen ? 'Gerando...' : `Gerar (${TOOL_CFG.provador.credits} créd.)`}
                          </button>
                          {genImg && provadorClient && onSendWhatsApp && (
                            <button onClick={() => { const msg = provadorMessage.replace('{nome}', provadorClient.firstName); onSendWhatsApp(provadorClient, msg, genImg || undefined); }} className="w-full py-2.5 bg-green-500 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2">
                              <i className="fab fa-whatsapp"></i>Enviar WhatsApp
                            </button>
                          )}
                        </div>
                      </>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CLIENT PICKER MODAL */}
      {showClientPicker && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Selecionar Cliente</h3>
              <button onClick={() => setShowClientPicker(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="p-4">
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl mb-4"
              />
              
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {clientsWithProvador.filter(c => 
                  `${c.firstName} ${c.lastName}`.toLowerCase().includes(clientSearch.toLowerCase())
                ).map(client => (
                  <div
                    key={client.id}
                    onClick={() => { setProvadorClient(client); setShowClientPicker(false); }}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${
                      provadorClient?.id === client.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                    }`}
                  >
                    <img src={client.photo} alt={client.firstName} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md" />
                    <div className="flex-1">
                      <p className="font-bold text-slate-800">{client.firstName} {client.lastName}</p>
                      <p className="text-xs text-slate-500">{client.whatsapp}</p>
                    </div>
                    {provadorClient?.id === client.id && (
                      <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                        <i className="fas fa-check text-white text-xs"></i>
                      </div>
                    )}
                  </div>
                ))}
                
                {clientsWithProvador.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <i className="fas fa-user-slash text-3xl mb-3"></i>
                    <p className="text-sm">Nenhum cliente com foto cadastrada</p>
                    <p className="text-xs mt-1">Cadastre clientes com foto para usar o Provador IA</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT PICKER MODAL */}
      {showProductPicker && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Adicionar Produto</h3>
              <button onClick={() => setShowProductPicker(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto">
                {products.filter(p => !provadorProducts.find(x => x.id === p.id)).map(p => (
                  <div
                    key={p.id}
                    onClick={() => { 
                      setProvadorProducts(prev => [...prev, p]); 
                      setShowProductPicker(false); 
                    }}
                    className="bg-slate-50 rounded-xl overflow-hidden border border-slate-200 cursor-pointer hover:border-emerald-400 transition-colors"
                  >
                    <div className="aspect-square">
                      <img src={p.images[0]?.base64 || p.images[0]?.url} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-2">
                      <p className="text-[10px] font-medium text-slate-800 truncate">{p.name}</p>
                      <p className="text-[9px] text-slate-500">{p.sku}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
