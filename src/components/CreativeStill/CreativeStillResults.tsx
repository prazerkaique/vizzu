import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { CreativeStillGeneration, Product } from '../../types';
import { OptimizedImage } from '../OptimizedImage';
import { useImageViewer } from '../ImageViewer';
import { useAuth } from '../../contexts/AuthContext';
import { useUI, type VizzuTheme } from '../../contexts/UIContext';
import { ReportModal } from '../ReportModal';
import { submitReport } from '../../lib/api/reports';
import { ImageEditModal } from '../shared/ImageEditModal';
import { editStudioImage, saveCreativeStillEdit, saveCreativeStillSaveAsNew } from '../../lib/api/studio';
import DownloadModal from '../shared/DownloadModal';
import type { DownloadableImage } from '../../utils/downloadSizes';
import { EcommerceExportButton } from '../shared/EcommerceExportButton';

const LOADING_PHRASES = [
 "Preparando a composição criativa...",
 "Analisando a estética escolhida...",
 "Montando a superfície e cenário...",
 "Posicionando o produto principal...",
 "Adicionando elementos decorativos...",
 "Ajustando a iluminação da cena...",
 "Configurando câmera e lente...",
 "Renderizando em alta qualidade...",
 "Aplicando acabamentos finais...",
 "Quase pronto! Últimos ajustes...",
];

interface Props {
 theme: VizzuTheme;
 generation: CreativeStillGeneration | null;
 product: Product | null;
 resolution: '2k' | '4k';
 variationsCount: number;
 isGenerating: boolean;
 progress: number;
 loadingText: string;
 onBackToHome: () => void;
 onGenerateAgain: () => void;
 onMinimize?: () => void;
 onCancel?: () => void;
 isMinimized?: boolean;
 editBalance?: number;
 regularBalance?: number;
 onDeductEditCredits?: (amount: number, generationId?: string) => Promise<{ success: boolean; source?: 'edit' | 'regular' }>;
 onVariationUpdated?: (index: number, newUrl: string) => void;
 onVariationAdded?: (newUrl: string) => void;
}

/** Get the list of variation URLs from a generation, with retrocompat fallback */
function getVariationUrls(generation: CreativeStillGeneration | null): string[] {
 if (!generation) return [];
 if (generation.variation_urls && generation.variation_urls.length > 0) {
 return generation.variation_urls;
 }
 // Fallback for old generations with variation_1_url / variation_2_url
 return [generation.variation_1_url, generation.variation_2_url].filter(Boolean) as string[];
}

/** Dynamic grid classes based on number of variations */
function getGridClasses(count: number): string {
 if (count <= 2) return 'grid-cols-1 md:grid-cols-2';
 if (count <= 6) return 'grid-cols-2 md:grid-cols-3';
 return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
}

export const CreativeStillResults: React.FC<Props> = ({
 theme,
 generation,
 product,
 resolution: resolutionProp,
 variationsCount: variationsCountProp,
 isGenerating,
 progress,
 loadingText,
 onBackToHome,
 onGenerateAgain,
 onMinimize,
 onCancel,
 isMinimized,
 editBalance = 0,
 regularBalance = 0,
 onDeductEditCredits,
 onVariationUpdated,
 onVariationAdded,
}) => {
 const { openViewer } = useImageViewer();
 const [selectedVariation, setSelectedVariation] = useState<number | null>(null);
 const [showReveal, setShowReveal] = useState(false);
 const [wasGenerating, setWasGenerating] = useState(false);
 const [showReportModal, setShowReportModal] = useState(false);
 const [reportVariationUrl, setReportVariationUrl] = useState<string | null>(null);
 const [editingVariation, setEditingVariation] = useState<{ index: number; url: string } | null>(null);

 const { user } = useAuth();
 const { showToast } = useUI();

 const isDark = theme !== 'light';

 const variationUrls = useMemo(() => getVariationUrls(generation), [generation]);
 const variationsRequested = generation?.variations_requested ?? variationsCountProp;
 const creditsUsed = generation?.credits_used ?? variationsRequested;

 // Rotacionar frases de loading
 const [phraseIndex, setPhraseIndex] = useState(0);
 useEffect(() => {
 if (!isGenerating) return;
 setPhraseIndex(0);
 const interval = setInterval(() => {
 setPhraseIndex(prev => (prev + 1) % LOADING_PHRASES.length);
 }, 3000);
 return () => clearInterval(interval);
 }, [isGenerating]);

 // Track generating→done transition for reveal animation
 useEffect(() => {
 if (isGenerating) {
 setWasGenerating(true);
 } else if (wasGenerating && variationUrls.length > 0 && generation?.status !== 'failed') {
 setShowReveal(true);
 const timer = setTimeout(() => setShowReveal(false), 2500);
 return () => clearTimeout(timer);
 }
 }, [isGenerating, wasGenerating, variationUrls.length, generation?.status]);

 // Report
 const handleReportSubmit = async (observation: string) => {
 if (!user || !reportVariationUrl) return;
 const result = await submitReport({
 userId: user.id,
 userEmail: user.email || '',
 userName: user.name || user.email || '',
 generationType: 'creative-still',
 generationId: generation?.id,
 productName: product?.name || 'Still Criativo',
 generatedImageUrl: reportVariationUrl,
 originalImageUrl: product?.originalImages?.front?.url || product?.images?.[0]?.url || undefined,
 observation,
 });
 if (result.success) {
 showToast('Report enviado! Analisaremos em até 24h.', 'success');
 } else {
 throw new Error(result.error || 'Erro ao enviar report');
 }
 };

 // ── Download system ──
 const [showDownloadModal, setShowDownloadModal] = useState(false);
 const downloadableImages: DownloadableImage[] = useMemo(
  () => variationUrls.map((url, i) => ({ url, label: `Variação ${i + 1}`, featurePrefix: 'VCreativeStill' })),
  [variationUrls]
 );

 // Edit callbacks
 const resolution = resolutionProp;
 const creditCost = resolution === '4k' ? 2 : 1;

 const handleEditGenerate = useCallback(async (params: { correctionPrompt: string; referenceImageBase64?: string }) => {
 if (!editingVariation) return { success: false, error: 'Nenhuma variação selecionada.' };
 const origUrl = product?.originalImages?.front?.url || product?.images?.[0]?.url || '';
 return editStudioImage({
  userId: user?.id,
  productId: product?.id,
  currentImageUrl: editingVariation.url,
  correctionPrompt: params.correctionPrompt,
  referenceImageBase64: params.referenceImageBase64,
  resolution,
  productInfo: { name: product?.name, category: product?.category, color: product?.color, description: product?.description },
  originalImageUrl: origUrl,
 });
 }, [editingVariation, resolution, user, product]);

 const handleEditSave = useCallback(async (newImageUrl: string) => {
 if (!editingVariation || !generation?.id) return { success: false };
 // Update local state
 onVariationUpdated?.(editingVariation.index, newImageUrl);
 // Persist via N8N
 const result = await saveCreativeStillEdit({
  generationId: generation.id,
  variationIndex: editingVariation.index,
  newImageUrl,
 });
 if (!result.success) {
  console.error('[CS Edit] Save failed:', result.error);
  showToast('Imagem atualizada localmente, mas houve erro ao salvar no servidor.', 'info');
 }
 return result;
 }, [editingVariation, generation?.id, onVariationUpdated, showToast]);

 const handleEditSaveAsNew = useCallback(async (newImageUrl: string) => {
   if (!generation?.id) return { success: false };
   // Atualizar local state — append nova variação
   onVariationAdded?.(newImageUrl);
   // Persistir via N8N — append ao array variation_urls
   const result = await saveCreativeStillSaveAsNew({
     generationId: generation.id,
     newImageUrl,
   });
   if (!result.success) {
     console.error('[CS SaveAsNew] failed:', result.error);
     showToast('Imagem salva localmente, mas houve erro ao persistir no servidor.', 'info');
   }
   return result;
 }, [generation?.id, onVariationAdded, showToast]);

 // ============================================================
 // LOADING STATE (padrão Product Studio)
 // ============================================================
 if (isGenerating && !isMinimized) {
 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center">
 {/* Backdrop com blur pesado (padrão PS) */}
 <div className={'absolute inset-0 backdrop-blur-2xl ' + (isDark ? 'bg-black/80' : 'bg-white/30')}></div>

 {/* Container do conteúdo */}
 <div className="relative z-10 flex flex-col items-center justify-center max-w-md mx-auto p-6">
 {/* Motion GIF (padrão PS — Scene-1.gif) */}
 <div className="w-64 h-64 mb-6 rounded-2xl overflow-hidden flex items-center justify-center">
 <img
 src="/Scene-1.gif"
 alt=""
 className="h-full object-cover"
 style={{ width: '140%', maxWidth: 'none' }}
 />
 </div>

 {/* Título */}
 <h2 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-2xl font-bold font-serif mb-2 text-center'}>
 Criando suas fotos...
 </h2>

 {/* Frase de loading */}
 <p className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-sm mb-6 text-center min-h-[20px] transition-all duration-300'}>
 {LOADING_PHRASES[phraseIndex]}
 </p>

 {/* Barra de progresso (gradiente coral→laranja, padrão PS) */}
 <div className="w-full max-w-xs mb-4">
 <div className={'h-2 rounded-full overflow-hidden ' + (isDark ? 'bg-neutral-800' : 'bg-gray-200')}>
 <div
 className="h-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] rounded-full transition-all duration-500"
 style={{ width: `${progress}%` }}
 ></div>
 </div>
 <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-medium text-center mt-2'}>
 {progress}%
 </p>
 </div>

 {/* Info do produto sendo gerado */}
 {product && (
 <div className={(isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-gray-50 border-gray-200') + ' rounded-xl p-4 border mb-6 w-full max-w-xs'}>
 <div className="flex items-center gap-3">
 {product.originalImages?.front?.url || product.images?.[0]?.url ? (
 <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
 <OptimizedImage
 src={product.originalImages?.front?.url || product.images?.[0]?.url || ''}
 alt={product.name}
 className="w-full h-full"
 size="thumb"
 />
 </div>
 ) : (
 <div className={'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ' + (isDark ? 'bg-neutral-800' : 'bg-gray-200')}>
 <i className={'fas fa-image ' + (isDark ? 'text-neutral-600' : 'text-gray-400')}></i>
 </div>
 )}
 <div className="flex-1 min-w-0">
 <p className={(isDark ? 'text-white' : 'text-[#1A1A1A]') + ' text-sm font-medium truncate'}>{product.name}</p>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>
 {variationsRequested} {variationsRequested === 1 ? 'variação' : 'variações'} · {creditsUsed} {creditsUsed === 1 ? 'crédito' : 'créditos'}
 </p>
 </div>
 </div>
 </div>
 )}

 {/* Botão minimizar (padrão PS — embaixo, botão largo) */}
 {onMinimize && (
 <>
 <button
 onClick={onMinimize}
 className={'flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ' + (isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-white' : 'bg-white/80 hover:bg-white border border-gray-200/60 text-gray-700 shadow-sm')}
 >
 <i className="fas fa-minus"></i>
 <span>Minimizar e continuar navegando</span>
 </button>

 <p className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-xs mt-3 text-center'}>
 A geração continuará em segundo plano
 </p>
 </>
 )}

 {/* Botão cancelar */}
 {onCancel && (
 <button
 onClick={onCancel}
 className={(isDark ? 'text-neutral-600 hover:text-red-400' : 'text-gray-400 hover:text-red-500') + ' mt-4 text-xs transition-all'}
 >
 Cancelar geração
 </button>
 )}
 </div>
 </div>
 );
 }

 // ============================================================
 // REVEAL ANIMATION STATE
 // ============================================================
 if (showReveal) {
 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center">
 <div className={'absolute inset-0 backdrop-blur-xl ' + (isDark ? 'bg-black/80' : 'bg-white/80')}></div>
 <div className="relative z-10 flex flex-col items-center justify-center">
 <div className="w-72 h-72">
 <DotLottieReact
 src="https://lottie.host/c73f7881-d168-4dee-be3a-3c73bd916083/vnLD4LVey6.lottie"
 autoplay
 style={{ width: '100%', height: '100%' }}
 />
 </div>
 </div>
 </div>
 );
 }

 // ============================================================
 // ERROR STATE
 // ============================================================
 if (generation?.status === 'failed') {
 return (
 <div className={'flex-1 overflow-y-auto flex items-center justify-center p-4 ' + (isDark ? '' : 'bg-cream')}>
 <div className="max-w-md w-full text-center">
 <div className={'w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-6 ' + (isDark ? 'bg-red-500/20' : 'bg-red-100')}>
 <i className={'fas fa-exclamation-triangle text-3xl ' + (isDark ? 'text-red-400' : 'text-red-500')}></i>
 </div>
 <h2 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xl font-bold font-serif mb-2'}>Erro na geração</h2>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-sm mb-6'}>
 {generation.error_message || 'Ocorreu um erro ao gerar suas imagens. Tente novamente.'}
 </p>
 <div className="flex gap-3 justify-center">
 <button onClick={onBackToHome} className={(isDark ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' px-4 py-2.5 rounded-xl text-sm font-medium transition-colors'}>
 Voltar
 </button>
 <button onClick={onGenerateAgain} className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-[#FF9F43] text-white rounded-xl text-sm font-semibold">
 <i className="fas fa-redo mr-2 text-xs"></i>Tentar novamente
 </button>
 </div>
 </div>
 </div>
 );
 }

 // ============================================================
 // SUCCESS STATE
 // ============================================================
 // Build display list: show actual URLs or placeholders up to variationsRequested
 const displayCount = Math.max(variationUrls.length, variationsRequested);
 const displayItems = Array.from({ length: displayCount }, (_, i) => ({
 index: i,
 url: variationUrls[i] || null,
 }));

 return (
 <div className={'flex-1 overflow-y-auto p-4 md:p-6 ' + (isDark ? '' : 'bg-cream')} style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 1rem))' }}>
 <div className="max-w-5xl mx-auto">
 {/* Header */}
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-3">
 <button onClick={onBackToHome} className={(isDark ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-900') + ' p-2 -ml-2 rounded-lg transition-colors'}>
 <i className="fas fa-arrow-left"></i>
 </button>
 <div>
 <h1 className={(isDark ? 'text-white' : 'text-[#1A1A1A]') + ' text-lg font-extrabold'}>Resultado</h1>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>
 {product?.name || 'Vizzu Still Criativo'} · {variationsRequested} {variationsRequested === 1 ? 'variação' : 'variações'}
 </p>
 </div>
 </div>
 </div>

 {/* Variações - Dynamic Grid */}
 <div className={`grid ${getGridClasses(displayCount)} gap-4 mb-6`}>
 {displayItems.map(({ index, url }) => {
 const vNum = index + 1;
 const isSelected = selectedVariation === vNum;
 return (
 <div key={index} className="space-y-2">
 <button
 onClick={() => setSelectedVariation(vNum)}
 className={'w-full rounded-xl overflow-hidden border-2 transition-all ' +
 (isSelected
 ? (isDark ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-amber-400 ring-2 ring-amber-300')
 : (isDark ? 'border-neutral-800 hover:border-neutral-700' : 'border-gray-200 hover:border-gray-300')
 )}
 >
 <div className={'aspect-[4/5] flex items-center justify-center ' + (isDark ? 'bg-neutral-900' : 'bg-gray-100')}>
 {url ? (
 <OptimizedImage src={url} alt={`Variação ${vNum}`} className="w-full h-full" size="preview" />
 ) : (
 <div className="text-center">
 <i className={'fas fa-image text-4xl mb-2 ' + (isDark ? 'text-neutral-700' : 'text-gray-300')}></i>
 <p className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-sm'}>Variação {vNum}</p>
 <p className={(isDark ? 'text-neutral-700' : 'text-gray-300') + ' text-xs mt-1'}>Preview disponível após integração com n8n</p>
 </div>
 )}
 </div>
 </button>
 <div className="flex items-center justify-between px-1">
 <div className="flex items-center gap-2">
 <div className={'w-4 h-4 rounded-full border-2 flex items-center justify-center ' + (isSelected ? 'border-amber-500 bg-amber-500' : (isDark ? 'border-neutral-700' : 'border-gray-300'))}>
 {isSelected && <i className="fas fa-check text-[8px] text-white"></i>}
 </div>
 <span className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-xs'}>Variação {vNum}</span>
 </div>
 {url && (
 <div className="flex items-center gap-3">
 <button
 onClick={() => openViewer(url, { alt: `Variação ${vNum}` })}
 className={(isDark ? 'text-neutral-400 hover:text-neutral-300' : 'text-gray-500 hover:text-gray-600') + ' text-xs font-medium'}
 >
 <i className="fas fa-search-plus mr-1"></i>Zoom
 </button>
 <button
 onClick={() => openViewer(url, { alt: `Variação ${vNum}`, downloadMeta: { imageLabel: `Variação ${vNum}`, productName: product?.name || 'Creative Still', featurePrefix: 'VCreativeStill' } })}
 className={(isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-500') + ' text-xs font-medium'}
 >
 <i className="fas fa-expand mr-1"></i>Ampliar
 </button>
 <button
 onClick={() => setEditingVariation({ index, url })}
 className={(isDark ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-500') + ' text-xs font-medium'}
 >
 <i className="fas fa-pen mr-1"></i>Editar
 </button>
 <button
 onClick={() => { setReportVariationUrl(url); setShowReportModal(true); }}
 className={(isDark ? 'text-amber-400/70 hover:text-amber-400' : 'text-amber-500 hover:text-amber-600') + ' text-xs font-medium'}
 >
 <i className="fas fa-flag mr-1"></i>Report
 </button>
 </div>
 )}
 </div>
 </div>
 );
 })}
 </div>

 {/* Ações */}
 <div className={'rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3 ' + (isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-200 ')}>
 {variationUrls.length > 0 && (
  <>
  <button
   onClick={() => setShowDownloadModal(true)}
   className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-[#FF6B6B]/20 transition-all"
  >
   <i className="fas fa-download text-xs"></i>Download ({variationUrls.length})
  </button>
  {product && (
  <EcommerceExportButton
   images={variationUrls.map((url, i) => ({ url, label: `Variação ${i + 1}` }))}
   productId={product.id}
   tool="creative-still"
  />
  )}
  </>
 )}
 <button
 onClick={onGenerateAgain}
 className={'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ' + (isDark ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200')}
 >
 <i className="fas fa-redo text-xs"></i>Gerar Novas Variações
 </button>
 <button
 onClick={onBackToHome}
 className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-[#FF9F43] text-white rounded-xl text-sm font-semibold"
 >
 <i className="fas fa-check text-xs"></i>Finalizar
 </button>
 </div>
 </div>

 {/* ============================================================ */}
 {/* MODAL: Report */}
 {/* ============================================================ */}
 <ReportModal
 isOpen={showReportModal}
 onClose={() => { setShowReportModal(false); setReportVariationUrl(null); }}
 onSubmit={handleReportSubmit}
 generationType="creative-still"
 productName={product?.name}
 theme={theme}
 />

 {/* ============================================================ */}
 {/* MODAL: Edição de Variação */}
 {/* ============================================================ */}
 {editingVariation && (
 <ImageEditModal
  isOpen={!!editingVariation}
  onClose={() => setEditingVariation(null)}
  currentImageUrl={editingVariation.url}
  imageName={`Variação ${editingVariation.index + 1}`}
  editBalance={editBalance}
  regularBalance={regularBalance}
  resolution={resolution}
  onGenerate={handleEditGenerate}
  onSave={handleEditSave}
  onSaveAsNew={handleEditSaveAsNew}
  onDeductEditCredits={onDeductEditCredits ? (amount) => onDeductEditCredits(amount, generation?.id) : undefined}
  theme={theme}
 />
 )}

 {/* Download Bottom Sheet */}
 {/* Download Modal */}
 <DownloadModal
  isOpen={showDownloadModal}
  onClose={() => setShowDownloadModal(false)}
  productName={product?.name || 'Creative Still'}
  originalImageUrl={product?.originalImages?.front?.url || product?.images?.[0]?.url}
  images={downloadableImages}
  theme={theme}
 />

 </div>
 );
};
