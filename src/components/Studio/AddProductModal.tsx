// ═══════════════════════════════════════════════════════════════
// VIZZU - AddProductModal (Multi-Step com Frente/Costas + Atributos)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef } from 'react';
import { Product, ProductImage, ProductAttributes, CATEGORY_ATTRIBUTES } from '../../types';
import { compressImage, formatFileSize } from '../../utils/imageCompression';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreateProduct: (product: Omit<Product, 'id' | 'sku'>, frontImage: string, backImage?: string, detailImage?: string) => Promise<void>;
  theme?: 'dark' | 'light';
}

type Step = 'source' | 'photos' | 'details';

// Categorias organizadas por grupos
const CATEGORY_GROUPS = [
  { label: '👒 Cabeça', items: ['Bonés', 'Chapéus', 'Tiaras', 'Lenços'] },
  { label: '👕 Topo', items: ['Camisetas', 'Blusas', 'Regatas', 'Tops', 'Camisas', 'Bodies', 'Jaquetas', 'Casacos', 'Blazers', 'Moletons'] },
  { label: '👖 Baixo', items: ['Calças', 'Shorts', 'Bermudas', 'Saias', 'Leggings', 'Shorts Fitness'] },
  { label: '👗 Peças Inteiras', items: ['Vestidos', 'Macacões', 'Jardineiras', 'Biquínis', 'Maiôs'] },
  { label: '👟 Pés', items: ['Calçados', 'Tênis', 'Sandálias', 'Botas'] },
  { label: '👜 Acessórios', items: ['Bolsas', 'Cintos', 'Relógios', 'Óculos', 'Bijuterias', 'Acessórios', 'Outros Acessórios'] },
];

const COLORS = ['Preto', 'Branco', 'Azul', 'Vermelho', 'Verde', 'Amarelo', 'Rosa', 'Cinza', 'Marrom', 'Bege', 'Laranja', 'Roxo', 'Nude', 'Estampado', 'Multicolor'];

export const AddProductModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onCreateProduct,
  theme = 'dark'
}) => {
  const [step, setStep] = useState<Step>('source');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [detailImage, setDetailImage] = useState<string | null>(null);
  const [uploadTarget, setUploadTarget] = useState<'front' | 'back' | 'detail'>('front');
  const [showConfirmNoBack, setShowConfirmNoBack] = useState(false);
  const [showConfirmNoDetail, setShowConfirmNoDetail] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    color: '',
    category: ''
  });

  // Estado para atributos dinâmicos
  const [attributes, setAttributes] = useState<ProductAttributes>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark';

  // Pegar atributos da categoria selecionada
  const categoryAttrs = formData.category ? CATEGORY_ATTRIBUTES[formData.category] || [] : [];

  // Reset ao fechar
  const handleClose = () => {
    setStep('source');
    setFrontImage(null);
    setBackImage(null);
    setDetailImage(null);
    setFormData({ name: '', brand: '', color: '', category: '' });
    setAttributes({});
    setShowConfirmNoBack(false);
    setShowConfirmNoDetail(false);
    onClose();
  };

  // Handler de seleção de arquivo
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Comprimir imagem antes de salvar
        const result = await compressImage(file);

        if (result.wasCompressed && result.savings > 0) {
          console.info(`[Compressão] ${formatFileSize(result.originalSize)} → ${formatFileSize(result.compressedSize)} (${result.savings}% menor)`);
        }

        const base64 = result.base64;
        if (uploadTarget === 'front') {
          setFrontImage(base64);
        } else if (uploadTarget === 'back') {
          setBackImage(base64);
        } else {
          setDetailImage(base64);
        }
        // Se é a primeira foto (frente), vai para step de fotos
        if (step === 'source') {
          setStep('photos');
        }
      } catch (error) {
        console.error('Erro ao processar imagem:', error);
      }
    }
    // Reset input
    if (e.target) e.target.value = '';
  };

  // Trigger upload para frente, costas ou detalhe
  const triggerUpload = (target: 'front' | 'back' | 'detail', useCamera: boolean = false) => {
    setUploadTarget(target);
    if (useCamera) {
      cameraInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  // Remover foto
  const removePhoto = (target: 'front' | 'back' | 'detail') => {
    if (target === 'front') {
      setFrontImage(null);
      // Se removeu a frente, volta para source
      setStep('source');
    } else if (target === 'back') {
      setBackImage(null);
    } else {
      setDetailImage(null);
    }
  };

  // Continuar para detalhes
  const goToDetails = () => {
    if (!frontImage) return;
    if (!backImage) {
      setShowConfirmNoBack(true);
    } else if (!detailImage) {
      setShowConfirmNoDetail(true);
    } else {
      setStep('details');
    }
  };

  // Confirmar sem foto de costas
  const confirmNoBack = () => {
    setShowConfirmNoBack(false);
    // Após confirmar sem costas, verifica se tem detalhe
    if (!detailImage) {
      setShowConfirmNoDetail(true);
    } else {
      setStep('details');
    }
  };

  // Confirmar sem foto de detalhe
  const confirmNoDetail = () => {
    setShowConfirmNoDetail(false);
    setStep('details');
  };

  // Handler para mudança de categoria (limpa atributos antigos)
  const handleCategoryChange = (category: string) => {
    setFormData({ ...formData, category });
    setAttributes({}); // Limpa atributos ao trocar categoria
  };

  // Handler para mudança de atributo
  const handleAttributeChange = (attrId: string, value: string) => {
    setAttributes(prev => ({ ...prev, [attrId]: value }));
  };

  // Criar produto
  const handleCreate = async () => {
    if (!frontImage || !formData.name || !formData.category) {
      alert('Preencha pelo menos o nome e a categoria do produto');
      return;
    }

    setIsCreating(true);
    try {
      await onCreateProduct(
        {
          name: formData.name,
          brand: formData.brand || undefined,
          color: formData.color || undefined,
          category: formData.category,
          attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
          images: [],
          hasBackImage: !!backImage,
          hasDetailImage: !!detailImage
        },
        frontImage,
        backImage || undefined,
        detailImage || undefined
      );
      handleClose();
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      alert('Erro ao criar produto. Tente novamente.');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        id="add-product-file"
        name="productFile"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={cameraInputRef}
        id="add-product-camera"
        name="productCamera"
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Modal Overlay */}
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
        <div className={`rounded-t-2xl md:rounded-2xl border w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col safe-area-bottom-sheet ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'}`}>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* STEP 1: SOURCE - Escolher fonte da imagem */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {step === 'source' && (
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Adicionar Produto
                </h3>
                <button
                  onClick={handleClose}
                  className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700'}`}
                >
                  <i className="fas fa-times text-xs"></i>
                </button>
              </div>

              <p className={`text-xs mb-4 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
                Escolha como adicionar a imagem:
              </p>

              <div className="grid grid-cols-2 gap-3">
                {/* Galeria */}
                <button
                  onClick={() => triggerUpload('front', false)}
                  className={`flex flex-col items-center gap-3 p-6 border-2 border-dashed rounded-xl transition-all ${isDark ? 'border-neutral-700 hover:border-pink-500/50 hover:bg-neutral-800' : 'border-purple-200 hover:border-pink-400 hover:bg-purple-50'}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDark ? 'bg-neutral-800' : 'bg-purple-100'}`}>
                    <i className={`fas fa-images text-lg ${isDark ? 'text-purple-400' : 'text-purple-500'}`}></i>
                  </div>
                  <span className={`text-sm font-medium ${isDark ? 'text-neutral-300' : 'text-gray-700'}`}>Galeria</span>
                </button>

                {/* Câmera */}
                <button
                  onClick={() => triggerUpload('front', true)}
                  className={`flex flex-col items-center gap-3 p-6 border-2 border-dashed rounded-xl transition-all ${isDark ? 'border-neutral-700 hover:border-pink-500/50 hover:bg-neutral-800' : 'border-purple-200 hover:border-pink-400 hover:bg-purple-50'}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDark ? 'bg-neutral-800' : 'bg-purple-100'}`}>
                    <i className={`fas fa-camera text-lg ${isDark ? 'text-purple-400' : 'text-purple-500'}`}></i>
                  </div>
                  <span className={`text-sm font-medium ${isDark ? 'text-neutral-300' : 'text-gray-700'}`}>Câmera</span>
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* STEP 2: PHOTOS - Fotos de Frente e Costas */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {step === 'photos' && (
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setStep('source'); setFrontImage(null); setBackImage(null); }}
                    className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700'}`}
                  >
                    <i className="fas fa-arrow-left text-xs"></i>
                  </button>
                  <h3 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Fotos do Produto
                  </h3>
                </div>
                <button
                  onClick={handleClose}
                  className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700'}`}
                >
                  <i className="fas fa-times text-xs"></i>
                </button>
              </div>

              {/* Fotos Grid */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {/* FRENTE */}
                <div className="flex flex-col">
                  <label className={`text-[9px] font-medium uppercase tracking-wide mb-1.5 flex items-center gap-1 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                    <i className="fas fa-image text-pink-500 text-[8px]"></i>
                    Frente <span className="text-pink-500">*</span>
                  </label>
                  {frontImage ? (
                    <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-pink-500">
                      <img src={frontImage} alt="Frente" className="w-full h-full object-cover" />
                      <div className="absolute top-1 right-1 flex gap-0.5">
                        <button
                          onClick={() => triggerUpload('front', false)}
                          className="w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center"
                        >
                          <i className="fas fa-sync text-[8px]"></i>
                        </button>
                        <button
                          onClick={() => removePhoto('front')}
                          className="w-6 h-6 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center"
                        >
                          <i className="fas fa-times text-[8px]"></i>
                        </button>
                      </div>
                      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-pink-500 text-white text-[8px] font-bold rounded-full">
                        <i className="fas fa-check mr-0.5"></i>OK
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => triggerUpload('front', false)}
                      className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all ${isDark ? 'border-neutral-700 hover:border-pink-500/50 bg-neutral-800/50' : 'border-gray-300 hover:border-pink-400 bg-gray-50'}`}
                    >
                      <i className={`fas fa-plus text-sm ${isDark ? 'text-neutral-600' : 'text-gray-400'}`}></i>
                      <span className={`text-[9px] ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Adicionar</span>
                    </button>
                  )}
                </div>

                {/* COSTAS */}
                <div className="flex flex-col">
                  <label className={`text-[9px] font-medium uppercase tracking-wide mb-1.5 flex items-center gap-1 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                    <i className="fas fa-image text-neutral-500 text-[8px]"></i>
                    Costas
                  </label>
                  {backImage ? (
                    <div className={`relative aspect-square rounded-xl overflow-hidden border-2 ${isDark ? 'border-green-500' : 'border-green-400'}`}>
                      <img src={backImage} alt="Costas" className="w-full h-full object-cover" />
                      <div className="absolute top-1 right-1 flex gap-0.5">
                        <button
                          onClick={() => triggerUpload('back', false)}
                          className="w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center"
                        >
                          <i className="fas fa-sync text-[8px]"></i>
                        </button>
                        <button
                          onClick={() => removePhoto('back')}
                          className="w-6 h-6 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center"
                        >
                          <i className="fas fa-times text-[8px]"></i>
                        </button>
                      </div>
                      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-green-500 text-white text-[8px] font-bold rounded-full">
                        <i className="fas fa-check mr-0.5"></i>OK
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => triggerUpload('back', false)}
                      className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all ${isDark ? 'border-neutral-700 hover:border-green-500/50 bg-neutral-800/50' : 'border-gray-300 hover:border-green-400 bg-gray-50'}`}
                    >
                      <i className={`fas fa-plus text-sm ${isDark ? 'text-neutral-600' : 'text-gray-400'}`}></i>
                      <span className={`text-[9px] ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Adicionar</span>
                    </button>
                  )}
                </div>

                {/* DETALHE */}
                <div className="flex flex-col">
                  <label className={`text-[9px] font-medium uppercase tracking-wide mb-1.5 flex items-center gap-1 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                    <i className="fas fa-magnifying-glass-plus text-purple-500 text-[8px]"></i>
                    Detalhe
                  </label>
                  {detailImage ? (
                    <div className={`relative aspect-square rounded-xl overflow-hidden border-2 ${isDark ? 'border-purple-500' : 'border-purple-400'}`}>
                      <img src={detailImage} alt="Detalhe" className="w-full h-full object-cover" />
                      <div className="absolute top-1 right-1 flex gap-0.5">
                        <button
                          onClick={() => triggerUpload('detail', false)}
                          className="w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center"
                        >
                          <i className="fas fa-sync text-[8px]"></i>
                        </button>
                        <button
                          onClick={() => removePhoto('detail')}
                          className="w-6 h-6 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center"
                        >
                          <i className="fas fa-times text-[8px]"></i>
                        </button>
                      </div>
                      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-purple-500 text-white text-[8px] font-bold rounded-full">
                        <i className="fas fa-check mr-0.5"></i>OK
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => triggerUpload('detail', false)}
                      className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all ${isDark ? 'border-neutral-700 hover:border-purple-500/50 bg-neutral-800/50' : 'border-gray-300 hover:border-purple-400 bg-gray-50'}`}
                    >
                      <i className={`fas fa-plus text-sm ${isDark ? 'text-neutral-600' : 'text-gray-400'}`}></i>
                      <span className={`text-[9px] ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Adicionar</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Dica */}
              <div className={`rounded-lg p-3 mb-4 ${isDark ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}`}>
                <p className="text-amber-500 text-[11px] flex items-start gap-2">
                  <i className="fas fa-lightbulb mt-0.5"></i>
                  <span>
                    <strong>Dica:</strong> Adicionar foto de costas permite que a IA gere imagens de ambos os ângulos, melhorando muito a qualidade do resultado.
                  </span>
                </p>
              </div>

              {/* Botão Continuar */}
              <button
                onClick={goToDetails}
                disabled={!frontImage}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Continuar
                <i className="fas fa-arrow-right text-xs"></i>
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* STEP 3: DETAILS - Dados do Produto */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {step === 'details' && (
            <div className="p-5 overflow-y-auto max-h-[80vh]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStep('photos')}
                    className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700'}`}
                  >
                    <i className="fas fa-arrow-left text-xs"></i>
                  </button>
                  <h3 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Criar Produto
                  </h3>
                </div>
                <button
                  onClick={handleClose}
                  className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700'}`}
                >
                  <i className="fas fa-times text-xs"></i>
                </button>
              </div>

              {/* Preview das imagens */}
              <div className="flex items-center justify-center gap-2 mb-4">
                {frontImage && (
                  <div className="relative">
                    <div className={`w-14 h-14 rounded-lg overflow-hidden border-2 ${isDark ? 'border-pink-500/50' : 'border-pink-300'}`}>
                      <img src={frontImage} alt="Frente" className="w-full h-full object-cover" />
                    </div>
                    <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[7px] font-bold rounded ${isDark ? 'bg-pink-500/20 text-pink-400' : 'bg-pink-100 text-pink-500'}`}>F</span>
                  </div>
                )}
                {backImage ? (
                  <div className="relative">
                    <div className={`w-14 h-14 rounded-lg overflow-hidden border-2 ${isDark ? 'border-green-500/50' : 'border-green-300'}`}>
                      <img src={backImage} alt="Costas" className="w-full h-full object-cover" />
                    </div>
                    <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[7px] font-bold rounded ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-500'}`}>C</span>
                  </div>
                ) : (
                  <div className="relative opacity-40">
                    <div className={`w-14 h-14 rounded-lg border-2 border-dashed flex items-center justify-center ${isDark ? 'border-neutral-700 bg-neutral-800' : 'border-gray-300 bg-gray-100'}`}>
                      <i className={`fas fa-image text-xs ${isDark ? 'text-neutral-600' : 'text-gray-400'}`}></i>
                    </div>
                    <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[7px] font-bold rounded ${isDark ? 'bg-neutral-800 text-neutral-500' : 'bg-gray-100 text-gray-400'}`}>C</span>
                  </div>
                )}
                {detailImage ? (
                  <div className="relative">
                    <div className={`w-14 h-14 rounded-lg overflow-hidden border-2 ${isDark ? 'border-purple-500/50' : 'border-purple-300'}`}>
                      <img src={detailImage} alt="Detalhe" className="w-full h-full object-cover" />
                    </div>
                    <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[7px] font-bold rounded ${isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-500'}`}>D</span>
                  </div>
                ) : (
                  <div className="relative opacity-40">
                    <div className={`w-14 h-14 rounded-lg border-2 border-dashed flex items-center justify-center ${isDark ? 'border-neutral-700 bg-neutral-800' : 'border-gray-300 bg-gray-100'}`}>
                      <i className={`fas fa-magnifying-glass-plus text-xs ${isDark ? 'text-neutral-600' : 'text-gray-400'}`}></i>
                    </div>
                    <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[7px] font-bold rounded ${isDark ? 'bg-neutral-800 text-neutral-500' : 'bg-gray-100 text-gray-400'}`}>D</span>
                  </div>
                )}
              </div>

              {/* Formulário */}
              <div className="space-y-3">
                <div>
                  <label className={`block text-[9px] font-medium uppercase tracking-wide mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
                    Nome do Produto <span className="text-pink-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="add-product-name"
                    name="productName"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm ${isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                    placeholder="Ex: Camiseta Básica Branca"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-[9px] font-medium uppercase tracking-wide mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Marca</label>
                    <input
                      type="text"
                      id="add-product-brand"
                      name="productBrand"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className={`w-full px-3 py-2.5 border rounded-lg text-sm ${isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                      placeholder="Ex: Nike"
                    />
                  </div>
                  <div>
                    <label className={`block text-[9px] font-medium uppercase tracking-wide mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Cor</label>
                    <select
                      id="add-product-color"
                      name="productColor"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className={`w-full px-3 py-2.5 border rounded-lg text-sm ${isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    >
                      <option value="">Selecione</option>
                      {COLORS.map(color => <option key={color} value={color}>{color}</option>)}
                    </select>
                  </div>
                </div>

                {/* Categoria */}
                <div>
                  <label className={`block text-[9px] font-medium uppercase tracking-wide mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
                    Categoria <span className="text-pink-500">*</span>
                  </label>
                  <select
                    id="add-product-category"
                    name="productCategory"
                    value={formData.category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm ${isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  >
                    <option value="">Selecione</option>
                    {CATEGORY_GROUPS.map(group => (
                      <optgroup key={group.label} label={group.label}>
                        {group.items.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* ATRIBUTOS CONDICIONAIS POR CATEGORIA */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {categoryAttrs.length > 0 && (
                  <div className={`p-3 rounded-xl border transition-all ${isDark ? 'bg-neutral-800/50 border-neutral-700' : 'bg-purple-50 border-purple-200'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <i className={`fas fa-sliders text-xs ${isDark ? 'text-pink-400' : 'text-pink-500'}`}></i>
                      <span className={`text-[10px] font-medium uppercase tracking-wide ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>
                        Atributos de {formData.category}
                      </span>
                    </div>
                    <div className={`grid gap-3 ${categoryAttrs.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {categoryAttrs.map(attr => (
                        <div key={attr.id}>
                          <label className={`block text-[9px] font-medium uppercase tracking-wide mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
                            {attr.label}
                          </label>
                          <select
                            value={attributes[attr.id] || ''}
                            onChange={(e) => handleAttributeChange(attr.id, e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg text-sm ${isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                          >
                            <option value="">Selecione</option>
                            {attr.options.map(opt => (
                              <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                    <p className={`text-[9px] mt-2 ${isDark ? 'text-neutral-600' : 'text-gray-400'}`}>
                      <i className="fas fa-info-circle mr-1"></i>
                      Esses atributos ajudam a IA a gerar imagens mais precisas
                    </p>
                  </div>
                )}

                {/* Botão Criar */}
                <button
                  onClick={handleCreate}
                  disabled={isCreating || !formData.name || !formData.category}
                  className="w-full py-3 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <i className="fas fa-spinner fa-spin text-xs"></i>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check"></i>
                      Criar Produto
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODAL: Confirmação sem foto de costas */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {showConfirmNoBack && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className={`rounded-2xl border w-full max-w-sm p-5 ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                <i className="fas fa-exclamation-triangle text-amber-500"></i>
              </div>
              <div>
                <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Produto sem foto de costas</h4>
              </div>
            </div>

            <p className={`text-sm mb-4 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
              A IA pode não conseguir gerar resultados precisos para as costas do modelo. Deseja continuar mesmo assim?
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => { setShowConfirmNoBack(false); }}
                className={`flex-1 py-2.5 rounded-lg font-medium text-sm ${isDark ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                <i className="fas fa-plus mr-1.5"></i>
                Adicionar
              </button>
              <button
                onClick={confirmNoBack}
                className="flex-1 py-2.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-sm hover:opacity-90"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODAL: Confirmação sem foto de detalhe */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {showConfirmNoDetail && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className={`rounded-2xl border w-full max-w-sm p-5 ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
                <i className="fas fa-magnifying-glass-plus text-purple-500"></i>
              </div>
              <div>
                <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Imagem de detalhe</h4>
              </div>
            </div>

            <p className={`text-sm mb-3 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
              A imagem de detalhe é importante quando o produto possui:
            </p>

            <ul className={`text-sm mb-4 space-y-1.5 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
              <li className="flex items-center gap-2">
                <i className="fas fa-tag text-purple-500 text-xs"></i>
                <span><strong>Logo da marca</strong> que precisa aparecer fiel</span>
              </li>
              <li className="flex items-center gap-2">
                <i className="fas fa-palette text-purple-500 text-xs"></i>
                <span><strong>Estampa específica</strong> ou desenho</span>
              </li>
              <li className="flex items-center gap-2">
                <i className="fas fa-gem text-purple-500 text-xs"></i>
                <span><strong>Detalhes pequenos</strong> como bordados ou botões</span>
              </li>
            </ul>

            <p className={`text-xs mb-4 ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>
              <i className="fas fa-lightbulb text-amber-500 mr-1"></i>
              Tire uma foto com zoom no detalhe mais importante do produto.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => { setShowConfirmNoDetail(false); }}
                className={`flex-1 py-2.5 rounded-lg font-medium text-sm ${isDark ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                <i className="fas fa-plus mr-1.5"></i>
                Adicionar
              </button>
              <button
                onClick={confirmNoDetail}
                className="flex-1 py-2.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-sm hover:opacity-90"
              >
                Continuar sem
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddProductModal;
