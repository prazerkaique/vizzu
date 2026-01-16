// ═══════════════════════════════════════════════════════════════
// VIZZU - AI Visual Studio Main Component
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, VisualStudioGeneration, SavedModelProfile, HistoryLog, LookComposition } from '../../types';
import { LookComposer } from './LookComposer';

interface StudioProps {
  products: Product[];
  userCredits: number;
  onUpdateProduct: (productId: string, updates: Partial<Product>) => void;
  onDeductCredits: (amount: number, reason: string) => boolean;
  onAddHistoryLog: (action: string, details: string, status: HistoryLog['status'], items: Product[], method: HistoryLog['method'], cost: number) => void;
  onOpenSettings?: () => void;
  onImport?: () => void;
  currentPlan?: { name: string; limit: number };
}

const CATEGORIES = ['Camisetas', 'Calças', 'Calçados', 'Acessórios', 'Vestidos', 'Shorts', 'Jaquetas'];
const COLLECTIONS = ['Verão 2025', 'Inverno 2025', 'Básicos', 'Premium', 'Promoção'];
const COLORS = ['Preto', 'Branco', 'Azul', 'Vermelho', 'Verde', 'Amarelo', 'Rosa', 'Cinza', 'Marrom', 'Bege'];

// Ferramentas disponíveis com novos nomes
const TOOLS = [
  { id: 'fundo', label: 'Fundo Profissional', icon: 'fa-store', desc: 'Fundo branco perfeito', credits: 1, color: 'purple' },
  { id: 'promocional', label: 'Foto Promocional', icon: 'fa-image', desc: 'Cenários criativos', credits: 2, color: 'pink' },
  { id: 'look', label: 'Look Virtual', icon: 'fa-user-astronaut', desc: 'Modelo com roupas', credits: 2, color: 'indigo' },
];

export const Studio: React.FC<StudioProps> = ({
  products, userCredits, onUpdateProduct, onDeductCredits, onAddHistoryLog, onOpenSettings, onImport, currentPlan
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterCollection, setFilterCollection] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [generations, setGenerations] = useState<VisualStudioGeneration[]>([]);
  const [savedModels, setSavedModels] = useState<SavedModelProfile[]>([]);
  
  // Editor states
  const [selectedTool, setSelectedTool] = useState<string>('fundo');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [lookComposition, setLookComposition] = useState<LookComposition>({});
  const [showImageOptions, setShowImageOptions] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('vizzu_saved_models');
    if (saved) {
      try { setSavedModels(JSON.parse(saved)); } catch(e) { console.error(e); }
    }
  }, []);

  const productsWithImages = useMemo(() => {
    return products.filter(p => {
      const hasImage = p.images?.length > 0 && (p.images[0]?.base64 || p.images[0]?.url);
      if (!hasImage) return false;
      
      const matchesSearch = !searchTerm || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !filterCategory || p.category === filterCategory;
      const matchesCollection = !filterCollection || p.collection === filterCollection;
      const matchesColor = !filterColor || p.color === filterColor;
      
      return matchesSearch && matchesCategory && matchesCollection && matchesColor;
    });
  }, [products, searchTerm, filterCategory, filterCollection, filterColor]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setGeneratedImage(null);
    setCustomPrompt('');
    setLookComposition({});
  };

  const handleBack = () => {
    setSelectedProduct(null);
    setGeneratedImage(null);
  };

  const handleGenerate = async () => {
    if (!selectedProduct || userCredits < TOOLS.find(t => t.id === selectedTool)!.credits) return;
    
    const tool = TOOLS.find(t => t.id === selectedTool)!;
    setIsGenerating(true);
    
    // Simular geração
    setTimeout(() => {
      const originalImage = selectedProduct.images[0]?.base64 || selectedProduct.images[0]?.url;
      setGeneratedImage(originalImage); // Na prática, seria a imagem gerada pela IA
      onDeductCredits(tool.credits, 'Vizzu Studio - ' + tool.label);
      setIsGenerating(false);
    }, 2500);
  };

  const handleSaveToProduct = () => {
    if (!selectedProduct || !generatedImage) return;
    
    const newImages = [
      { name: 'generated-' + Date.now() + '.jpg', base64: generatedImage },
      ...selectedProduct.images
    ];
    onUpdateProduct(selectedProduct.id, { images: newImages });
    alert('Imagem salva no produto!');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProduct) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const newImages = [
        { name: file.name, base64 },
        ...selectedProduct.images.slice(1)
      ];
      onUpdateProduct(selectedProduct.id, { images: newImages });
      setSelectedProduct({ ...selectedProduct, images: newImages });
    };
    reader.readAsDataURL(file);
    setShowImageOptions(false);
  };

  const handleTakePhoto = () => {
    // Em mobile, isso abre a câmera
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
    setShowImageOptions(false);
  };

  const handleChooseFromGallery = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
    setShowImageOptions(false);
  };

  const planName = currentPlan?.name || 'Free';
  const planLimit = currentPlan?.limit || 50;

  // ═══════════════════════════════════════════════════════════════
  // EDITOR VIEW (quando produto está selecionado)
  // ═══════════════════════════════════════════════════════════════
  if (selectedProduct) {
    const currentTool = TOOLS.find(t => t.id === selectedTool)!;
    const productImage = selectedProduct.images[0]?.base64 || selectedProduct.images[0]?.url;
    
    return (
      <div className="flex-1 overflow-y-auto bg-slate-50 h-full flex flex-col">
        {/* Header com voltar */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm z-10 flex-shrink-0">
          <button onClick={handleBack} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200">
            <i className="fas fa-arrow-left"></i>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 uppercase font-bold">{selectedProduct.sku}</p>
            <h1 className="text-sm font-bold text-slate-800 truncate">{selectedProduct.name}</h1>
          </div>
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl px-3 py-1.5">
            <span className="text-xs font-bold text-white">{userCredits} créd.</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-24">
          {/* Imagem principal com botão + */}
          <div className="relative mb-4">
            <div className="aspect-square bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-lg">
              {generatedImage ? (
                <img src={generatedImage} alt="Gerado" className="w-full h-full object-contain" />
              ) : (
                <img src={productImage} alt={selectedProduct.name} className="w-full h-full object-contain" />
              )}
            </div>
            
            {/* Botão + para adicionar/trocar foto */}
            <button 
              onClick={() => setShowImageOptions(true)}
              className="absolute bottom-3 right-3 w-12 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg flex items-center justify-center"
            >
              <i className="fas fa-plus text-lg"></i>
            </button>

            {/* Badge de gerado */}
            {generatedImage && (
              <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                <i className="fas fa-check"></i> Gerado
              </div>
            )}
          </div>

          {/* Opções de imagem (tirar foto / galeria) */}
          {showImageOptions && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={() => setShowImageOptions(false)}>
              <div className="bg-white rounded-t-3xl w-full p-6 pb-8" onClick={e => e.stopPropagation()}>
                <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-6"></div>
                <h3 className="text-lg font-bold text-slate-800 text-center mb-6">Adicionar Imagem</h3>
                
                <div className="space-y-3">
                  <button onClick={handleTakePhoto} className="w-full py-4 bg-purple-100 text-purple-700 rounded-xl font-bold flex items-center justify-center gap-3">
                    <i className="fas fa-camera text-xl"></i>
                    Tirar Foto
                  </button>
                  <button onClick={handleChooseFromGallery} className="w-full py-4 bg-slate-100 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-3">
                    <i className="fas fa-images text-xl"></i>
                    Escolher da Galeria
                  </button>
                </div>
                
                <button onClick={() => setShowImageOptions(false)} className="w-full mt-4 py-3 text-slate-500 font-medium">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/*" 
            onChange={handleImageUpload}
            className="hidden"
          />

          {/* Seletor de Ferramentas */}
          <div className="mb-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Escolha a ferramenta</h3>
            <div className="grid grid-cols-3 gap-2">
              {TOOLS.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => setSelectedTool(tool.id)}
                  className={'p-3 rounded-xl border-2 transition-all text-center ' + 
                    (selectedTool === tool.id 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-slate-200 bg-white hover:border-purple-300')}
                >
                  <div className={'w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center ' +
                    (tool.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                     tool.color === 'pink' ? 'bg-pink-100 text-pink-600' :
                     'bg-indigo-100 text-indigo-600')}>
                    <i className={'fas ' + tool.icon}></i>
                  </div>
                  <p className="text-[10px] font-bold text-slate-800 leading-tight">{tool.label}</p>
                  <span className="text-[9px] text-amber-600 font-bold">{tool.credits} créd.</span>
                </button>
              ))}
            </div>
          </div>

          {/* Opções específicas da ferramenta */}
          {selectedTool === 'promocional' && (
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Descreva o cenário</label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Ex: Na praia, ao pôr do sol, com coqueiros..."
                rows={3}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none"
              />
            </div>
          )}

          {selectedTool === 'look' && (
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Monte o Look</label>
              <LookComposer 
                products={products} 
                composition={lookComposition} 
                onChange={setLookComposition}
                collections={COLLECTIONS}
              />
            </div>
          )}

          {/* Se já gerou, mostrar botão de salvar */}
          {generatedImage && (
            <button
              onClick={handleSaveToProduct}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 mb-4"
            >
              <i className="fas fa-save"></i> Salvar no Produto
            </button>
          )}
        </div>

        {/* CTA Fixo - Menor */}
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 md:p-4 z-30">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || userCredits < currentTool.credits}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            {isGenerating ? (
              <><i className="fas fa-spinner fa-spin"></i> Gerando...</>
            ) : (
              <><i className="fas fa-wand-magic-sparkles"></i> Gerar ({currentTool.credits} créd.)</>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // GALLERY VIEW (lista de produtos)
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 relative h-full flex flex-col">
      
      {/* HEADER - DESKTOP */}
      <div className="hidden md:flex bg-white border-b border-slate-200 px-8 py-4 items-center justify-between shadow-sm z-10 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <i className="fas fa-magic text-white text-2xl"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Vizzu Studio®</h1>
              <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold uppercase">{planName}</span>
            </div>
            <p className="text-xs text-slate-500">Estúdio com IA para lojistas</p>
          </div>
        </div>
      </div>

      {/* HEADER - MOBILE */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 flex items-center justify-center shadow-lg">
            <i className="fas fa-magic text-white text-lg"></i>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-black text-slate-800">Studio®</h1>
              <span className="text-[8px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold uppercase">{planName}</span>
            </div>
          </div>
        </div>

        {/* Credits Badge - Mobile */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl px-3 py-2 min-w-[80px] shadow-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] font-bold text-slate-400 uppercase">Créditos</span>
          </div>
          <p className="text-lg font-black text-white leading-none">{userCredits}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20">
        <div className="max-w-7xl mx-auto">

          {/* FILTROS DE BUSCA */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 md:p-4 mb-4 shadow-sm">
            {/* Busca */}
            <div className="relative mb-3">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
              <input
                type="text"
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm"
              />
            </div>
            
            {/* Filtros em linha */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              <select 
                value={filterCategory} 
                onChange={(e) => setFilterCategory(e.target.value)}
                className="flex-shrink-0 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white min-w-[100px]"
              >
                <option value="">Categoria</option>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              
              <select 
                value={filterCollection} 
                onChange={(e) => setFilterCollection(e.target.value)}
                className="flex-shrink-0 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white min-w-[100px]"
              >
                <option value="">Coleção</option>
                {COLLECTIONS.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
              
              <select 
                value={filterColor} 
                onChange={(e) => setFilterColor(e.target.value)}
                className="flex-shrink-0 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white min-w-[90px]"
              >
                <option value="">Cor</option>
                {COLORS.map(color => <option key={color} value={color}>{color}</option>)}
              </select>
              
              {(filterCategory || filterCollection || filterColor) && (
                <button 
                  onClick={() => { setFilterCategory(''); setFilterCollection(''); setFilterColor(''); }}
                  className="flex-shrink-0 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold"
                >
                  <i className="fas fa-times mr-1"></i>Limpar
                </button>
              )}
            </div>
            
            <p className="text-[10px] text-slate-400 mt-2">{productsWithImages.length} de {products.length} produtos</p>
          </div>

          {/* GRID DE PRODUTOS */}
          {productsWithImages.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-camera text-slate-300 text-3xl"></i>
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-2">
                {searchTerm || filterCategory || filterCollection || filterColor ? 'Nenhum resultado' : 'Galeria Vazia'}
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
                {searchTerm ? 'Tente outros filtros.' : 'Adicione produtos com imagens para começar.'}
              </p>
              {!searchTerm && onImport && (
                <button onClick={onImport} className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-lg text-sm">
                  <i className="fas fa-plus mr-2"></i> Adicionar Produtos
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {productsWithImages.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleSelectProduct(product)}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                >
                  <div className="aspect-[3/4] bg-slate-100 relative overflow-hidden">
                    <img 
                      src={product.images[0]?.base64 || product.images[0]?.url} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                      <span className="text-white text-xs font-bold bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                        <i className="fas fa-wand-magic-sparkles mr-1"></i> Editar
                      </span>
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">{product.sku}</p>
                    <h3 className="text-[10px] font-bold text-slate-800 line-clamp-2 leading-snug">{product.name}</h3>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Botão Importar Flutuante Mobile */}
          {onImport && (
            <button 
              onClick={onImport}
              className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full shadow-xl flex items-center justify-center text-white z-30"
            >
              <i className="fas fa-plus text-xl"></i>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
