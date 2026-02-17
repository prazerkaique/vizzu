import React, { useState, useMemo, useRef } from 'react';
import type { VizzuTheme } from '../contexts/UIContext';
import type { DetectedProduct } from '../lib/api/studio';
import { getProductType, UPLOAD_SLOTS_CONFIG, angleToApiField } from '../lib/productConfig';
import { compressImage } from '../utils/imageCompression';

// Copiar de ProductsPage.tsx para reusar
const CATEGORY_GROUPS = [
  { id: 'cabeca', label: 'Cabeça', items: ['Bonés', 'Chapéus', 'Gorros', 'Viseiras', 'Tiaras', 'Lenços'] },
  { id: 'parte-de-cima', label: 'Parte de Cima', items: ['Camisetas', 'Blusas', 'Regatas', 'Tops', 'Camisas', 'Bodies', 'Coletes', 'Jaquetas', 'Casacos', 'Blazers', 'Moletons'] },
  { id: 'parte-de-baixo', label: 'Parte de Baixo', items: ['Calças', 'Shorts', 'Bermudas', 'Saias', 'Leggings', 'Shorts Fitness'] },
  { id: 'pecas-inteiras', label: 'Peças Inteiras', items: ['Vestidos', 'Macacões', 'Jardineiras', 'Conjuntos', 'Pijamas', 'Biquínis', 'Maiôs', 'Sungas'] },
  { id: 'calcados', label: 'Calçados', items: ['Tênis', 'Sandálias', 'Botas', 'Sapatos', 'Chinelos'] },
  { id: 'acessorios', label: 'Acessórios', items: ['Bolsas', 'Mochilas', 'Pochetes', 'Cintos', 'Relógios', 'Óculos', 'Bijuterias', 'Gravatas', 'Cachecóis', 'Meias', 'Outros Acessórios'] },
];

const COLORS = [
  'Preto', 'Branco', 'Cinza', 'Cinza Claro', 'Cinza Escuro', 'Chumbo',
  'Azul', 'Azul Marinho', 'Azul Royal', 'Azul Claro', 'Azul Bebê', 'Azul Petróleo', 'Azul Turquesa', 'Índigo',
  'Vermelho', 'Vermelho Escuro', 'Bordô', 'Vinho', 'Carmim', 'Terracota',
  'Verde', 'Verde Escuro', 'Verde Militar', 'Verde Musgo', 'Verde Menta', 'Verde Água', 'Verde Oliva', 'Verde Limão', 'Esmeralda',
  'Amarelo', 'Amarelo Ouro', 'Mostarda', 'Dourado',
  'Rosa', 'Rosa Claro', 'Rosa Pink', 'Rosa Chá', 'Magenta', 'Fúcsia', 'Rosê', 'Salmão', 'Coral',
  'Laranja', 'Laranja Escuro', 'Pêssego',
  'Roxo', 'Lilás', 'Lavanda', 'Violeta', 'Púrpura', 'Berinjela',
  'Marrom', 'Caramelo', 'Café', 'Chocolate', 'Ferrugem', 'Tabaco', 'Areia', 'Nude',
  'Bege', 'Creme', 'Off-White', 'Marfim', 'Prata',
  'Jeans Claro', 'Jeans Médio', 'Jeans Escuro', 'Jeans Black',
  'Estampado', 'Tie-Dye', 'Xadrez', 'Listrado', 'Floral', 'Animal Print', 'Camuflado', 'Multicolor',
];

const categoryMap: Record<string, string> = {
  'Boné': 'Bonés', 'Chapéu': 'Chapéus', 'Tiara': 'Tiaras', 'Lenço': 'Lenços',
  'Gorro': 'Gorros', 'Viseira': 'Viseiras',
  'Camiseta': 'Camisetas', 'Blusa': 'Blusas', 'Regata': 'Regatas', 'Top': 'Tops',
  'Camisa': 'Camisas', 'Body': 'Bodies', 'Jaqueta': 'Jaquetas', 'Casaco': 'Casacos',
  'Blazer': 'Blazers', 'Moletom': 'Moletons', 'Cropped': 'Tops', 'Suéter': 'Moletons',
  'Cardigan': 'Casacos', 'Colete': 'Coletes', 'Lingerie': 'Bodies',
  'Calça': 'Calças', 'Shorts': 'Shorts', 'Bermuda': 'Bermudas', 'Saia': 'Saias',
  'Legging': 'Leggings', 'Short Fitness': 'Shorts Fitness',
  'Vestido': 'Vestidos', 'Macacão': 'Macacões', 'Jardineira': 'Jardineiras',
  'Conjunto': 'Conjuntos', 'Pijama': 'Pijamas', 'Biquíni': 'Biquínis', 'Maiô': 'Maiôs',
  'Sunga': 'Sungas',
  'Tênis': 'Tênis', 'Sandália': 'Sandálias', 'Bota': 'Botas', 'Sapato': 'Calçados',
  'Chinelo': 'Sandálias', 'Sapatilha': 'Calçados',
  'Bolsa': 'Bolsas', 'Mochila': 'Mochilas', 'Pochete': 'Pochetes', 'Necessaire': 'Pochetes',
  'Cinto': 'Cintos', 'Relógio': 'Relógios',
  'Óculos': 'Óculos', 'Brinco': 'Bijuterias', 'Colar': 'Bijuterias', 'Pulseira': 'Bijuterias',
  'Anel': 'Bijuterias', 'Bijuteria': 'Bijuterias', 'Acessório': 'Outros Acessórios',
  'Gravata': 'Gravatas', 'Meia': 'Meias', 'Cachecol': 'Cachecóis',
};

// Todas as categorias válidas (para fallback quando a IA retorna tipo já no plural ou desconhecido)
const ALL_VALID_CATEGORIES = CATEGORY_GROUPS.flatMap(g => g.items);

function resolveCategory(type: string): string {
  // 1. Mapa singular→plural
  if (categoryMap[type]) return categoryMap[type];
  // 2. Tipo já é uma categoria válida (plural)?
  if (ALL_VALID_CATEGORIES.includes(type)) return type;
  // 3. Sem match
  return '';
}

interface WizardProduct {
  name: string;
  category: string;
  color: string;
  brand: string;
  extraImages: Record<string, string | null>;
}

interface RegisterAllWizardProps {
  theme: VizzuTheme;
  detectedProducts: DetectedProduct[];
  frontImage: string;
  userId: string;
  onComplete: () => void;
  onClose: () => void;
}

const IMPORT_DELAY_MS = 3000;

export function RegisterAllWizard({ theme, detectedProducts, frontImage, userId, onComplete, onClose }: RegisterAllWizardProps) {
  const isDark = theme !== 'light';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string>('');

  // Inicializar produtos a partir dos detectados pela IA
  const [products, setProducts] = useState<WizardProduct[]>(() =>
    detectedProducts.map(dp => ({
      name: dp.suggestedName || dp.type,
      category: resolveCategory(dp.type),
      color: dp.color || '',
      brand: dp.brand || '',
      extraImages: {},
    }))
  );

  const [currentStep, setCurrentStep] = useState(0);
  const [phase, setPhase] = useState<'review' | 'importing' | 'done'>('review');
  const [currentImporting, setCurrentImporting] = useState(0);
  const [importResults, setImportResults] = useState<{ success: string[]; failed: { name: string; error: string }[] }>({ success: [], failed: [] });
  const [triedAdvance, setTriedAdvance] = useState(false);

  const product = products[currentStep];
  const totalProducts = products.length;

  // Slots de upload dinâmicos (sem o front que já está preenchido)
  const extraSlots = useMemo(() => {
    if (!product) return [];
    const productType = getProductType(product.category);
    return UPLOAD_SLOTS_CONFIG[productType].filter(s => s.angle !== 'front');
  }, [product?.category]);

  const updateProduct = (index: number, updates: Partial<WizardProduct>) => {
    setProducts(prev => prev.map((p, i) => i === index ? { ...p, ...updates } : p));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;

    try {
      const result = await compressImage(file);
      updateProduct(currentStep, {
        extraImages: { ...product.extraImages, [uploadTarget]: result.base64 },
      });
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
    }

    // Limpar input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeExtraImage = (angle: string) => {
    updateProduct(currentStep, {
      extraImages: { ...product.extraImages, [angle]: null },
    });
  };

  const handleNext = () => {
    if (!canAdvance) {
      setTriedAdvance(true);
      return;
    }
    setTriedAdvance(false);
    if (currentStep < totalProducts - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      startImport();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setTriedAdvance(false);
      setCurrentStep(currentStep - 1);
    }
  };

  const startImport = async () => {
    setPhase('importing');
    setCurrentImporting(0);

    const n8nUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
    if (!n8nUrl || !userId) {
      setImportResults({ success: [], failed: products.map(p => ({ name: p.name, error: 'Configuração inválida' })) });
      setPhase('done');
      return;
    }

    const results: typeof importResults = { success: [], failed: [] };

    for (let i = 0; i < products.length; i++) {
      setCurrentImporting(i);
      const p = products[i];

      try {
        const validAngles = new Set(UPLOAD_SLOTS_CONFIG[getProductType(p.category)].map(s => s.angle));
        const body: Record<string, any> = {
          user_id: userId,
          name: p.name,
          brand: p.brand || null,
          color: p.color || null,
          category: p.category,
          sku: `RA-${Date.now().toString(36).toUpperCase()}-${i}`,
          image_front_base64: frontImage,
        };

        // Adicionar imagens extras
        for (const [angle, base64] of Object.entries(p.extraImages)) {
          if (base64 && validAngles.has(angle)) {
            body[angleToApiField(angle)] = base64;
          }
        }

        const response = await fetch(`${n8nUrl}/vizzu/produto-importar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const data = await response.json();
        if (data.success) {
          results.success.push(p.name);
        } else {
          results.failed.push({ name: p.name, error: data.error || 'Erro desconhecido' });
        }
      } catch (err: any) {
        results.failed.push({ name: p.name, error: err.message || 'Erro de rede' });
      }

      // Throttle entre importações
      if (i < products.length - 1) {
        await new Promise(r => setTimeout(r, IMPORT_DELAY_MS));
      }
    }

    setImportResults(results);
    setPhase('done');
  };

  const isLastProduct = currentStep === totalProducts - 1;
  const canAdvance = product?.name && product?.category;

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
      <div
        className={(isDark ? 'bg-neutral-900/95 backdrop-blur-2xl border-neutral-700/50' : 'bg-white/95 backdrop-blur-2xl border-gray-200') + ' rounded-t-2xl md:rounded-2xl border w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto safe-area-bottom-sheet'}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle - mobile */}
        <div className="md:hidden pb-2 flex justify-center -mt-1">
          <div className={(isDark ? 'bg-neutral-600' : 'bg-gray-300') + ' w-10 h-1 rounded-full'}></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={'w-10 h-10 rounded-xl flex items-center justify-center ' + (isDark ? 'bg-white/10 border border-white/15' : 'bg-gray-50 border border-gray-200')}>
              <i className={'fas fa-layer-group text-sm ' + (isDark ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
            </div>
            <div>
              <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold'}>Cadastrar Todos</h3>
              <p className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-xs'}>
                {phase === 'review' ? `Produto ${currentStep + 1} de ${totalProducts}` :
                 phase === 'importing' ? 'Importando...' : 'Concluído'}
              </p>
            </div>
          </div>
          {phase === 'review' && (
            <button
              onClick={onClose}
              className={(isDark ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700') + ' w-7 h-7 rounded-full flex items-center justify-center'}
            >
              <i className="fas fa-times text-xs"></i>
            </button>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-5">
          {products.map((_, i) => (
            <div
              key={i}
              className={'h-1.5 rounded-full flex-1 transition-all ' + (
                phase !== 'review' ? 'bg-[#FF6B6B]' :
                i < currentStep ? 'bg-[#FF6B6B]' :
                i === currentStep ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]' :
                isDark ? 'bg-white/10' : 'bg-gray-200'
              )}
            ></div>
          ))}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* === FASE: REVIEW === */}
        {phase === 'review' && product && (
          <div className="space-y-4">
            {/* Nome do produto detectado */}
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-[#FF6B6B]/10 text-[#FF6B6B] text-[9px] font-bold rounded-full">
                {detectedProducts[currentStep]?.type}
              </span>
              {detectedProducts[currentStep]?.confidence >= 0.8 && (
                <span className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[9px]'}>
                  <i className="fas fa-check-circle text-[#FF6B6B] mr-0.5"></i>Alta confiança
                </span>
              )}
            </div>

            {/* Foto de frente (compartilhada) */}
            <div>
              <p className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px] font-medium uppercase tracking-wide mb-1.5'}>Foto de frente</p>
              <div className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-[#FF6B6B]">
                <img src={frontImage} alt="Frente" className="w-full h-full object-cover" />
                <div className="absolute bottom-0.5 left-0.5 px-1 py-0.5 text-white text-[7px] font-bold rounded-full bg-[#FF6B6B]">
                  <i className="fas fa-check mr-0.5"></i>OK
                </div>
              </div>
            </div>

            {/* Campos editáveis */}
            <div className="space-y-3">
              <div>
                <label className={(!product.name && triedAdvance ? 'text-[#FF6B6B]' : isDark ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>Nome *</label>
                <input
                  type="text"
                  value={product.name}
                  onChange={e => { updateProduct(currentStep, { name: e.target.value }); setTriedAdvance(false); }}
                  className={(!product.name && triedAdvance
                    ? 'border-[#FF6B6B] ring-1 ring-[#FF6B6B]/30 ' + (isDark ? 'bg-neutral-800 text-white' : 'bg-gray-50 text-gray-900')
                    : (isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900')
                  ) + ' w-full px-3 py-2 border rounded-lg text-sm'}
                  placeholder="Nome do produto"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={(!product.category && triedAdvance ? 'text-[#FF6B6B]' : isDark ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>
                    Categoria *
                  </label>
                  <select
                    value={product.category}
                    onChange={e => { updateProduct(currentStep, { category: e.target.value, extraImages: {} }); setTriedAdvance(false); }}
                    className={(!product.category && triedAdvance
                      ? 'border-[#FF6B6B] ring-1 ring-[#FF6B6B]/30 ' + (isDark ? 'bg-neutral-800 text-white' : 'bg-gray-50 text-gray-900')
                      : (isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900')
                    ) + ' w-full px-3 py-2 border rounded-lg text-sm'}
                  >
                    <option value="">Selecione</option>
                    {CATEGORY_GROUPS.map(group => (
                      <optgroup key={group.label} label={group.label}>
                        {group.items.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  {!product.category && triedAdvance && (
                    <p className="text-[#FF6B6B] text-[9px] mt-1">
                      <i className="fas fa-exclamation-circle mr-0.5"></i>Defina a categoria para continuar
                    </p>
                  )}
                </div>
                <div>
                  <label className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>Cor</label>
                  <select
                    value={product.color}
                    onChange={e => updateProduct(currentStep, { color: e.target.value })}
                    className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}
                  >
                    <option value="">Selecione</option>
                    {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>Marca</label>
                <input
                  type="text"
                  value={product.brand}
                  onChange={e => updateProduct(currentStep, { brand: e.target.value })}
                  className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}
                  placeholder="Ex: Nike"
                />
              </div>
            </div>

            {/* Upload de fotos extras */}
            {extraSlots.length > 0 && (
              <div>
                <p className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px] font-medium uppercase tracking-wide mb-2'}>
                  Fotos adicionais <span className={(isDark ? 'text-neutral-600' : 'text-gray-400')}>(opcional)</span>
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {extraSlots.map(slot => {
                    const img = product.extraImages[slot.angle];
                    return (
                      <div key={slot.angle} className="flex flex-col">
                        <span className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[8px] font-medium mb-0.5 flex items-center gap-0.5'}>
                          <i className={'fas ' + slot.icon + ' text-[7px]'} style={{ color: slot.accentColor }}></i>
                          {slot.label}
                        </span>
                        {img ? (
                          <div className="relative aspect-square rounded-lg overflow-hidden border-2" style={{ borderColor: slot.accentColor }}>
                            <img src={img} alt={slot.label} className="w-full h-full object-cover" />
                            <button
                              onClick={() => removeExtraImage(slot.angle)}
                              className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center"
                            >
                              <i className="fas fa-times text-[6px]"></i>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setUploadTarget(slot.angle); fileInputRef.current?.click(); }}
                            className={(isDark ? 'border-neutral-700 hover:border-neutral-500 bg-neutral-800/50' : 'border-gray-300 hover:border-gray-400 bg-gray-50') + ' aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer'}
                          >
                            <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-plus text-xs'}></i>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center gap-3 pt-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className={(isDark ? 'bg-white/10 hover:bg-white/15 text-neutral-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700') + ' px-4 py-2.5 rounded-xl text-sm font-medium transition-colors'}
                >
                  <i className="fas fa-arrow-left mr-2"></i>Anterior
                </button>
              )}
              <button
                onClick={handleNext}
                className={'flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:opacity-90'}
              >
                {isLastProduct ? (
                  <>
                    <i className="fas fa-cloud-arrow-up mr-2"></i>
                    Importar {totalProducts} produto{totalProducts !== 1 ? 's' : ''}
                  </>
                ) : (
                  <>
                    Próximo produto<i className="fas fa-arrow-right ml-2"></i>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* === FASE: IMPORTING === */}
        {phase === 'importing' && (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-[#FF6B6B]/10 mb-3">
                <i className="fas fa-cloud-arrow-up text-[#FF6B6B] text-2xl animate-pulse"></i>
              </div>
              <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>
                Importando produto {currentImporting + 1} de {totalProducts}...
              </p>
            </div>

            {/* Progress bar */}
            <div className={(isDark ? 'bg-white/10' : 'bg-gray-200') + ' h-2 rounded-full overflow-hidden'}>
              <div
                className="h-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] rounded-full transition-all duration-500"
                style={{ width: `${((currentImporting + 1) / totalProducts) * 100}%` }}
              ></div>
            </div>

            {/* Lista de produtos */}
            <div className="space-y-2">
              {products.map((p, i) => (
                <div key={i} className={'flex items-center gap-3 px-3 py-2 rounded-lg ' + (isDark ? 'bg-neutral-800/50' : 'bg-gray-50')}>
                  {i < currentImporting ? (
                    <i className="fas fa-check-circle text-[#FF6B6B] text-sm"></i>
                  ) : i === currentImporting ? (
                    <i className="fas fa-spinner fa-spin text-[#FF9F43] text-sm"></i>
                  ) : (
                    <i className={(isDark ? 'text-neutral-600' : 'text-gray-300') + ' fas fa-circle text-sm'}></i>
                  )}
                  <span className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-sm flex-1 truncate'}>{p.name}</span>
                  <span className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px]'}>{p.category}</span>
                </div>
              ))}
            </div>

            <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] text-center'}>
              <i className="fas fa-info-circle mr-1"></i>Não feche esta janela
            </p>
          </div>
        )}

        {/* === FASE: DONE === */}
        {phase === 'done' && (
          <div className="space-y-5 text-center">
            <div className={'w-20 h-20 rounded-2xl mx-auto flex items-center justify-center ' + (
              importResults.failed.length === 0 ? 'bg-[#FF6B6B]/10' :
              importResults.success.length === 0 ? 'bg-red-500/10' : 'bg-[#FF9F43]/10'
            )}>
              <i className={'fas text-4xl ' + (
                importResults.failed.length === 0 ? 'fa-circle-check text-[#FF6B6B]' :
                importResults.success.length === 0 ? 'fa-circle-xmark text-red-500' : 'fa-triangle-exclamation text-[#FF9F43]'
              )}></i>
            </div>

            <div>
              <h4 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold'}>
                {importResults.failed.length === 0 ? 'Tudo cadastrado!' :
                 importResults.success.length === 0 ? 'Falha na importação' : 'Importação parcial'}
              </h4>
              <p className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-sm mt-1'}>
                {importResults.success.length > 0 && (
                  <span className="text-[#FF6B6B] font-medium">{importResults.success.length} produto{importResults.success.length !== 1 ? 's' : ''} cadastrado{importResults.success.length !== 1 ? 's' : ''}</span>
                )}
                {importResults.success.length > 0 && importResults.failed.length > 0 && ' · '}
                {importResults.failed.length > 0 && (
                  <span className="text-red-500 font-medium">{importResults.failed.length} falha{importResults.failed.length !== 1 ? 's' : ''}</span>
                )}
              </p>
            </div>

            {importResults.failed.length > 0 && (
              <div className={(isDark ? 'bg-white/5' : 'bg-gray-50') + ' rounded-xl p-3 text-left'}>
                {importResults.failed.map((f, i) => (
                  <div key={i} className={'flex items-start gap-2 text-xs ' + (isDark ? 'text-neutral-400' : 'text-gray-600') + (i > 0 ? ' mt-2' : '')}>
                    <i className="fas fa-xmark text-red-400 mt-0.5 shrink-0"></i>
                    <div>
                      <span className="font-medium">{f.name}</span>
                      <span className="mx-1">—</span>
                      <span>{f.error}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={onComplete}
              className="px-6 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:opacity-90 transition-opacity"
            >
              <i className="fas fa-grid-2 mr-2"></i>Ver meus produtos
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
