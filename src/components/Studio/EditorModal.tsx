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
  onGenerateImage: (p: Product, t: 'studio'|'cenario'|'lifestyle'|'refine', prompt?: string, opts?: any) => Promise<{image: string|null; generationId: string|null}>;
  onMarkSaved?: (id: string) => void;
}

type ToolType = 'studio' | 'cenario' | 'lifestyle' | null;

const TOOL_CFG = {
  studio: { name: 'Studio Ready', icon: 'fa-store', credits: 1 },
  cenario: { name: 'Cenário', icon: 'fa-film', credits: 2 },
  lifestyle: { name: 'Modelo IA', icon: 'fa-user-friends', credits: 3 }
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

export const EditorModal: React.FC<Props> = ({ product, products, userCredits, savedModels, onSaveModel, onDeleteModel, onClose, onUpdateProduct, onDeductCredits, onGenerateImage, onMarkSaved }) => {
  const [tool, setTool] = useState<ToolType>(null);
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
      if (result?.image) { setGenImg(result.image); setGenId(result.generationId); }
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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      {zoom && <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center" onClick={() => setZoom(null)}><button className="absolute top-4 right-4 w-12 h-12 bg-white/10 text-white rounded-full flex items-center justify-center"><i className="fas fa-times text-xl"></i></button><img src={zoom} className="max-w-full max-h-[90vh] object-contain rounded-lg" /></div>}
      
      {showSaveModal && genImg && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6"><h3 className="text-xl font-bold">Salvar Modelo</h3><button onClick={() => setShowSaveModal(false)} className="text-slate-400"><i className="fas fa-times"></i></button></div>
            <div className="flex justify-center mb-6"><div className="w-32 h-32 rounded-full border-4 border-indigo-200 overflow-hidden"><img src={genImg} className="w-full h-full object-cover object-top" /></div></div>
            <input type="text" value={newModelName} onChange={(e) => setNewModelName(e.target.value)} placeholder="Nome do modelo..." className="w-full p-3 border border-slate-300 rounded-lg mb-4" autoFocus />
            <button onClick={handleSaveModel} disabled={!newModelName.trim()} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold disabled:opacity-50"><i className="fas fa-save mr-2"></i>Salvar</button>
          </div>
        </div>
      )}

      <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center"><i className="fas fa-arrow-left"></i></button>
            <div className="text-white"><h2 className="font-bold text-lg">{product.name}</h2><p className="text-sm text-white/70 font-mono">{product.sku}</p></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-xl px-4 py-2 text-white flex items-center gap-2"><i className="fas fa-bolt"></i><span className="font-bold">{userCredits}</span></div>
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
              {(['studio', 'cenario', 'lifestyle'] as ToolType[]).map(t => t && (
                <div key={t} onClick={() => { if (genImg && tool !== t && !confirm('Descartar imagem?')) return; setGenImg(null); setGenId(null); setShowRefine(false); setError(null); setTool(t); }}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${tool === t ? 'border-purple-500 bg-purple-50 shadow-md' : 'border-slate-200 hover:border-purple-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tool === t ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'}`}><i className={`fas ${TOOL_CFG[t].icon}`}></i></div>
                      <span className="font-bold text-slate-800">{TOOL_CFG[t].name}</span>
                    </div>
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">{TOOL_CFG[t].credits} créd.</span>
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
                            <div className="grid grid-cols-2 gap-2">
                              {MODEL_OPTS.gender.map(g => <button key={g.id} onClick={() => setModelSettings(p => ({...p, gender: g.id as 'woman'|'man'}))} className={`py-1.5 rounded-lg text-xs font-bold border ${modelSettings.gender === g.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>{g.label}</button>)}
                            </div>
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
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
