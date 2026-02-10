import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { CreativeStillGeneration, CreativeStillWizardState } from '../../types';
import { OptimizedImage } from '../OptimizedImage';
import { useImageViewer } from '../ImageViewer';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { ReportModal } from '../ReportModal';
import { submitReport } from '../../lib/api/reports';
import { ImageEditModal } from '../shared/ImageEditModal';
import { editStudioImage, saveCreativeStillEdit } from '../../lib/api/studio';

const lottieColorStyles = `
 @keyframes stillColorCycle {
 0%, 100% { filter: sepia(1) saturate(3) hue-rotate(20deg) brightness(1.1); }
 33% { filter: sepia(1) saturate(3) hue-rotate(35deg) brightness(1.2); }
 66% { filter: sepia(1) saturate(2.5) hue-rotate(10deg) brightness(1.1); }
 }
 .vizzu-still-lottie-gradient {
 animation: stillColorCycle 3s ease-in-out infinite;
 }
`;

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
 theme: 'dark' | 'light';
 generation: CreativeStillGeneration | null;
 wizardState: CreativeStillWizardState;
 isGenerating: boolean;
 progress: number;
 loadingText: string;
 onBackToHome: () => void;
 onGenerateAgain: () => void;
 onSaveTemplate: (name: string) => Promise<void>;
 onMinimize?: () => void;
 isMinimized?: boolean;
 editBalance?: number;
 regularBalance?: number;
 onDeductEditCredits?: (amount: number, generationId?: string) => Promise<{ success: boolean; source?: 'edit' | 'regular' }>;
 onVariationUpdated?: (index: number, newUrl: string) => void;
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
 wizardState,
 isGenerating,
 progress,
 loadingText,
 onBackToHome,
 onGenerateAgain,
 onSaveTemplate,
 onMinimize,
 isMinimized,
 editBalance = 0,
 regularBalance = 0,
 onDeductEditCredits,
 onVariationUpdated,
}) => {
 const { openViewer } = useImageViewer();
 const [selectedVariation, setSelectedVariation] = useState<number | null>(null);
 const [showSaveModal, setShowSaveModal] = useState(false);
 const [templateName, setTemplateName] = useState('');
 const [savingTemplate, setSavingTemplate] = useState(false);
 const [showReveal, setShowReveal] = useState(false);
 const [wasGenerating, setWasGenerating] = useState(false);
 const [showReportModal, setShowReportModal] = useState(false);
 const [reportVariationUrl, setReportVariationUrl] = useState<string | null>(null);
 const [editingVariation, setEditingVariation] = useState<{ index: number; url: string } | null>(null);

 const { user } = useAuth();
 const { showToast } = useUI();

 const isDark = theme === 'dark';

 const variationUrls = useMemo(() => getVariationUrls(generation), [generation]);
 const variationsRequested = generation?.variations_requested ?? wizardState.variationsCount ?? 2;
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

 const handleSave = async () => {
 if (!templateName.trim()) return;
 setSavingTemplate(true);
 try {
 await onSaveTemplate(templateName);
 setShowSaveModal(false);
 setTemplateName('');
 } finally {
 setSavingTemplate(false);
 }
 };

 // Report
 const handleReportSubmit = async (observation: string) => {
 if (!user || !reportVariationUrl) return;
 const result = await submitReport({
 userId: user.id,
 userEmail: user.email || '',
 userName: user.name || user.email || '',
 generationType: 'creative-still',
 generationId: generation?.id,
 productName: wizardState.mainProduct?.name || 'Still Criativo',
 generatedImageUrl: reportVariationUrl,
 originalImageUrl: wizardState.mainProduct?.originalImages?.front?.url || wizardState.mainProduct?.images?.[0]?.url || undefined,
 observation,
 });
 if (result.success) {
 showToast('Report enviado! Analisaremos em até 24h.', 'success');
 } else {
 throw new Error(result.error || 'Erro ao enviar report');
 }
 };

 const handleDownload = (url: string, variation: number) => {
 const link = document.createElement('a');
 link.href = url;
 link.download = `still-criativo-${wizardState.mainProduct?.name || 'produto'}-v${variation}.png`;
 link.click();
 };

 // Edit callbacks
 const resolution = (wizardState.resolution || '2k') as '2k' | '4k';
 const creditCost = resolution === '4k' ? 2 : 1;

 const handleEditGenerate = useCallback(async (params: { correctionPrompt: string; referenceImageBase64?: string }) => {
 if (!editingVariation) return { success: false, error: 'Nenhuma variação selecionada.' };
 return editStudioImage({
  currentImageUrl: editingVariation.url,
  correctionPrompt: params.correctionPrompt,
  referenceImageBase64: params.referenceImageBase64,
  resolution,
 });
 }, [editingVariation, resolution]);

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

 // ============================================================
 // LOADING STATE
 // ============================================================
 if (isGenerating && !isMinimized) {
 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center">
 {/* Backdrop com blur */}
 <div className={'absolute inset-0 backdrop-blur-xl ' + (isDark ? 'bg-black/80' : 'bg-white/80')}></div>

 {/* Container do conteúdo */}
 <div className="relative z-10 flex flex-col items-center justify-center max-w-md mx-auto p-6">
 {/* Botão minimizar */}
 {onMinimize && (
 <button
 onClick={onMinimize}
 className={'absolute top-2 right-2 w-10 h-10 rounded-xl flex items-center justify-center transition-all ' + (isDark ? 'bg-white/10 border border-white/20 text-neutral-300 hover:text-white hover:bg-white/15' : 'bg-black/5 border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-black/10')}
 title="Minimizar"
 >
 <i className="fas fa-minus text-sm"></i>
 </button>
 )}

 {/* Animação Lottie com degradê de cores (âmbar → laranja) */}
 <style>{lottieColorStyles}</style>
 <div className="w-64 h-64 mb-6 vizzu-still-lottie-gradient">
 <DotLottieReact
 src="https://lottie.host/d29d70f3-bf03-4212-b53f-932dbefb9077/kIkLDFupvi.lottie"
 loop
 autoplay
 style={{ width: '100%', height: '100%' }}
 />
 </div>

 {/* Título */}
 <h2 className={(isDark ? 'text-white' : 'text-[#1A1A1A]') + ' text-2xl font-bold font-serif mb-2 text-center'}>
 Criando seu Vizzu Still Criativo®...
 </h2>

 {/* Frase de loading */}
 <p className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-sm mb-6 text-center min-h-[20px] transition-all duration-300'}>
 {LOADING_PHRASES[phraseIndex]}
 </p>

 {/* Barra de progresso */}
 <div className="w-full max-w-xs mb-4">
 <div className={'h-2 rounded-full overflow-hidden ' + (isDark ? 'bg-neutral-800' : 'bg-gray-200')}>
 <div
 className="h-full bg-gradient-to-r from-amber-500 to-[#FF9F43] rounded-full transition-all duration-500"
 style={{ width: `${progress}%` }}
 ></div>
 </div>
 <p className={(isDark ? 'text-white' : 'text-[#1A1A1A]') + ' text-sm font-medium text-center mt-2'}>
 {progress}%
 </p>
 </div>

 {/* Info do produto sendo gerado */}
 {wizardState.mainProduct && (
 <div className={(isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-gray-50 border-gray-200') + ' rounded-xl p-4 border mb-6 w-full max-w-xs'}>
 <div className="flex items-center gap-3">
 {wizardState.mainProduct.originalImages?.front?.url || wizardState.mainProduct.images?.[0]?.url ? (
 <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
 <OptimizedImage
 src={wizardState.mainProduct.originalImages?.front?.url || wizardState.mainProduct.images?.[0]?.url || ''}
 alt={wizardState.mainProduct.name}
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
 <p className={(isDark ? 'text-white' : 'text-[#1A1A1A]') + ' text-sm font-medium truncate'}>{wizardState.mainProduct.name}</p>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>
 {variationsRequested} {variationsRequested === 1 ? 'variação' : 'variações'} · {creditsUsed} {creditsUsed === 1 ? 'crédito' : 'créditos'}
 </p>
 </div>
 </div>
 </div>
 )}

 <p className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-xs text-center'}>
 A geração pode levar até 2 minutos
 </p>
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
 {wizardState.mainProduct?.name || 'Vizzu Still Criativo'} · {variationsRequested} {variationsRequested === 1 ? 'variação' : 'variações'}
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
 onClick={() => handleDownload(url, vNum)}
 className={(isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-500') + ' text-xs font-medium'}
 >
 <i className="fas fa-download mr-1"></i>Download
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
 <button
 onClick={onGenerateAgain}
 className={'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ' + (isDark ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200')}
 >
 <i className="fas fa-redo text-xs"></i>Gerar Novas Variações
 </button>
 <button
 onClick={() => setShowSaveModal(true)}
 className={'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ' + (isDark ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200')}
 >
 <i className="fas fa-bookmark text-xs"></i>Salvar Template
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
 productName={wizardState.mainProduct?.name}
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
  onDeductEditCredits={onDeductEditCredits ? (amount) => onDeductEditCredits(amount, generation?.id) : undefined}
  theme={theme}
 />
 )}

 {/* ============================================================ */}
 {/* MODAL: Salvar Template */}
 {/* ============================================================ */}
 {showSaveModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowSaveModal(false)}>
 <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
 <div
 onClick={(e) => e.stopPropagation()}
 className={'relative w-full max-w-sm mx-4 rounded-2xl overflow-hidden ' + (isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-white ')}
 >
 <div className="p-5">
 <div className={'w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-4 ' + (isDark ? 'bg-amber-500/20' : 'bg-amber-100')}>
 <i className={'fas fa-bookmark text-xl ' + (isDark ? 'text-amber-400' : 'text-amber-500')}></i>
 </div>
 <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-base font-semibold font-serif text-center mb-1'}>Salvar como Template</h3>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs text-center mb-4'}>
 Este template poderá ser usado para criar stills com outros produtos mantendo o mesmo estilo.
 </p>
 <input
 value={templateName}
 onChange={(e) => setTemplateName(e.target.value)}
 placeholder="Nome do template..."
 className={'w-full rounded-lg px-3 py-2.5 text-sm mb-4 ' + (isDark ? 'bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-600' : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400')}
 autoFocus
 />
 <div className="flex gap-2">
 <button
 onClick={() => setShowSaveModal(false)}
 className={'flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ' + (isDark ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700')}
 >
 Cancelar
 </button>
 <button
 onClick={handleSave}
 disabled={!templateName.trim() || savingTemplate}
 className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-[#FF9F43] text-white rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {savingTemplate ? <i className="fas fa-spinner fa-spin"></i> : 'Salvar'}
 </button>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 );
};
