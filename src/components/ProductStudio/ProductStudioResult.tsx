// ═══════════════════════════════════════════════════════════════
// VIZZU - Product Studio Result (Página de Pós-Criação)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Product, ProductStudioSession, ProductStudioAngle } from '../../types';
import { ZoomableImage } from '../ImageViewer';
import { useAuth } from '../../contexts/AuthContext';
import { useUI, type VizzuTheme } from '../../contexts/UIContext';
import { ReportModal } from '../ReportModal';
import { submitReport } from '../../lib/api/reports';
import { getProductType as getProductTypeFromConfig } from '../../lib/productConfig';
import { StudioEditModal } from './StudioEditModal';
import type { StudioBackground, StudioShadow } from '../../lib/api/studio';
import { supabase } from '../../services/supabaseClient';
import DownloadModal from '../shared/DownloadModal';
import type { DownloadableImage } from '../../utils/downloadSizes';
import { EcommerceExportButton } from '../shared/EcommerceExportButton';
import { useWatermark } from '../../hooks/useWatermark';
import { WatermarkOverlay } from '../shared/WatermarkOverlay';

interface ProductStudioResultProps {
 product: Product;
 session: ProductStudioSession;
 creditsUsed: number;
 userCredits: number;
 onSave: () => void;
 onRegenerate: () => void;
 onDelete: () => void;
 onBack: () => void;
 // Edit modal props
 editBalance?: number;
 regularBalance?: number;
 resolution?: '2k' | '4k';
 studioBackground?: StudioBackground;
 studioShadow?: StudioShadow;
 productNotes?: string;
 onImageUpdated?: (angle: string, newUrl: string) => void;
 onImageSavedAsNew?: (angle: string, newUrl: string) => void;
 onDeductEditCredits?: (amount: number, generationId?: string) => Promise<{ success: boolean; source?: 'edit' | 'regular' }>;
 theme?: VizzuTheme;
}

// Labels dos ângulos em português
const ANGLE_LABELS: Record<ProductStudioAngle, string> = {
 'front': 'Frente',
 'back': 'Costas',
 'side-left': 'Lateral Esq.',
 'side-right': 'Lateral Dir.',
 '45-left': '45° Esq.',
 '45-right': '45° Dir.',
 'top': 'Topo',
 'detail': 'Detalhe',
 'front_detail': 'Detalhe Frente',
 'back_detail': 'Detalhe Costas',
 'folded': 'Dobrada'
};

// Ícones dos ângulos
const ANGLE_ICONS: Record<ProductStudioAngle, string> = {
 'front': 'fa-shirt',
 'back': 'fa-shirt',
 'side-left': 'fa-caret-left',
 'side-right': 'fa-caret-right',
 '45-left': 'fa-arrow-up-left',
 '45-right': 'fa-arrow-up-right',
 'top': 'fa-arrow-up',
 'detail': 'fa-magnifying-glass-plus',
 'front_detail': 'fa-magnifying-glass-plus',
 'back_detail': 'fa-magnifying-glass-plus',
 'folded': 'fa-layer-group'
};

// Categorias importadas de ../../lib/productConfig

export const ProductStudioResult: React.FC<ProductStudioResultProps> = ({
 product,
 session,
 creditsUsed,
 userCredits,
 onSave,
 onRegenerate,
 onDelete,
 onBack,
 editBalance = 0,
 regularBalance,
 resolution = '2k',
 studioBackground,
 studioShadow,
 productNotes,
 onImageUpdated,
 onImageSavedAsNew,
 onDeductEditCredits,
 theme = 'dark'
}) => {
 const [currentIndex, setCurrentIndex] = useState(0);
 const [isSaved, setIsSaved] = useState(false);
 const [showExitModal, setShowExitModal] = useState(false);
 const [showDeleteModal, setShowDeleteModal] = useState(false);
 const [showZoomModal, setShowZoomModal] = useState(false);
 const [showOriginal, setShowOriginal] = useState(false);
 const [pendingAction, setPendingAction] = useState<'back' | null>(null);
 const [timeAgo, setTimeAgo] = useState('agora');
 const [showReveal, setShowReveal] = useState(true);
 const [showReportModal, setShowReportModal] = useState(false);
 const [showEditModal, setShowEditModal] = useState(false);

 const { user } = useAuth();
 const { showToast } = useUI();
 const hasWatermark = useWatermark();

 // Reveal animation on mount
 useEffect(() => {
 const timer = setTimeout(() => setShowReveal(false), 2500);
 return () => clearTimeout(timer);
 }, []);

 // Zoom com hover
 const [isHovering, setIsHovering] = useState(false);
 const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
 const imageContainerRef = useRef<HTMLDivElement>(null);

 const images = session.images;
 const currentImage = images[currentIndex];

 // Determinar tipo de produto (usa config centralizada)
 const productType = getProductTypeFromConfig(product.category);

 // Ângulos disponíveis baseado no tipo de produto
 const getAvailableAngles = (): ProductStudioAngle[] => {
 switch (productType) {
 case 'footwear':
 return ['front', 'back', 'side-left', 'top', 'detail'];
 case 'headwear':
 return ['front', 'back', 'side-left', 'top', 'front_detail'];
 case 'bag':
 return ['front', 'back', 'side-left', 'top', 'detail', 'front_detail'];
 case 'accessory':
 return ['front', 'back', 'side-left', 'side-right', 'detail'];
 default: // clothing
 return ['front', 'back', 'front_detail', 'back_detail', 'folded'];
 }
 };

 const availableAngles = getAvailableAngles();

 // Calcular tempo desde a geração
 useEffect(() => {
 const updateTimeAgo = () => {
 const created = new Date(session.createdAt);
 const now = new Date();
 const diffMs = now.getTime() - created.getTime();
 const diffMins = Math.floor(diffMs / 60000);
 const diffHours = Math.floor(diffMs / 3600000);

 if (diffMins < 1) setTimeAgo('agora');
 else if (diffMins === 1) setTimeAgo('há 1 minuto');
 else if (diffMins < 60) setTimeAgo(`há ${diffMins} minutos`);
 else if (diffHours === 1) setTimeAgo('há 1 hora');
 else setTimeAgo(`há ${diffHours} horas`);
 };

 updateTimeAgo();
 const interval = setInterval(updateTimeAgo, 60000);
 return () => clearInterval(interval);
 }, [session.createdAt]);

 // Obter imagem original do produto
 const getOriginalImage = (): string => {
 if (product.originalImages?.front?.url) return product.originalImages.front.url;
 if (product.images?.[0]?.url) return product.images[0].url;
 if (product.images?.[0]?.base64) return product.images[0].base64;
 return '';
 };

 const originalImage = getOriginalImage();

 // Imagem atual a ser exibida (gerada ou original baseado no switch)
 const displayImage = showOriginal ? originalImage : currentImage?.url;

 // Touch/Swipe support
 const [touchStart, setTouchStart] = useState<number | null>(null);
 const [touchEnd, setTouchEnd] = useState<number | null>(null);
 const minSwipeDistance = 50;

 const onTouchStart = (e: React.TouchEvent) => {
 setTouchEnd(null);
 setTouchStart(e.targetTouches[0].clientX);
 };

 const onTouchMove = (e: React.TouchEvent) => {
 setTouchEnd(e.targetTouches[0].clientX);
 };

 const onTouchEnd = () => {
 if (!touchStart || !touchEnd) return;
 const distance = touchStart - touchEnd;
 if (distance > minSwipeDistance && currentIndex < images.length - 1) {
 setCurrentIndex(prev => prev + 1);
 }
 if (distance < -minSwipeDistance && currentIndex > 0) {
 setCurrentIndex(prev => prev - 1);
 }
 };

 // Zoom com hover - mouse move
 const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
 if (!imageContainerRef.current) return;
 const rect = imageContainerRef.current.getBoundingClientRect();
 const x = ((e.clientX - rect.left) / rect.width) * 100;
 const y = ((e.clientY - rect.top) / rect.height) * 100;
 setMousePosition({ x, y });
 };

 // Salvar
 const handleSave = () => {
 setIsSaved(true);
 onSave();
 };

 // ── Download system ──
 const [showDownloadModal, setShowDownloadModal] = useState(false);
 const downloadableImages: DownloadableImage[] = useMemo(
  () => images.map((img) => ({ url: img.url, label: ANGLE_LABELS[img.angle] || img.angle, featurePrefix: 'VProductStudio' })),
  [images]
 );

 // Report
 const handleReportSubmit = async (observation: string) => {
 if (!user || !currentImage?.url) return;
 const result = await submitReport({
 userId: user.id,
 userEmail: user.email || '',
 userName: user.name || user.email || '',
 generationType: 'product-studio',
 generationId: session.id,
 productName: product.name,
 generatedImageUrl: currentImage.url,
 originalImageUrl: originalImage || undefined,
 observation,
 });
 if (result.success) {
 showToast('Report enviado! Analisaremos em até 24h.', 'success');
 } else {
 throw new Error(result.error || 'Erro ao enviar report');
 }
 };

 // Verificar ao sair
 const handleBackClick = () => {
 if (!isSaved) {
 setPendingAction('back');
 setShowExitModal(true);
 } else {
 onBack();
 }
 };

 const confirmExit = (save: boolean) => {
 if (save) handleSave();
 setShowExitModal(false);
 if (pendingAction === 'back') onBack();
 setPendingAction(null);
 };

 const confirmDelete = () => {
 setShowDeleteModal(false);
 onDelete();
 };

 // Verificar se um ângulo foi gerado
 const isAngleGenerated = (angle: ProductStudioAngle): boolean => {
 return images.some(img => img.angle === angle);
 };

 // Ir para um ângulo específico
 const goToAngle = (angle: ProductStudioAngle) => {
 const idx = images.findIndex(img => img.angle === angle);
 if (idx !== -1) {
 setCurrentIndex(idx);
 setShowOriginal(false);
 }
 };

 if (showReveal) {
 return (
 <div className={'min-h-screen flex items-center justify-center ' + (theme !== 'light' ? 'bg-black' : 'bg-gray-50')}>
 <div className="w-72 h-72">
 <DotLottieReact
 src="https://lottie.host/c73f7881-d168-4dee-be3a-3c73bd916083/vnLD4LVey6.lottie"
 loop
 autoplay
 style={{ width: '100%', height: '100%' }}
 />
 </div>
 </div>
 );
 }

 return (
 <div className={'min-h-screen flex flex-col overflow-y-auto ' + (theme !== 'light' ? 'bg-black' : 'bg-gray-50')}>

 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* HEADER - Gradient Pink → Orange */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 <div className="bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] px-4 py-3 sticky top-0 z-40 flex-shrink-0">
 <div className="max-w-7xl mx-auto flex items-center justify-between">
 <div className="flex items-center gap-3">
 <button
 onClick={handleBackClick}
 className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/30 transition-all"
 >
 <i className="fas fa-arrow-left text-sm"></i>
 </button>
 <div>
 <h1 className="text-white text-sm font-semibold">Resultado</h1>
 <p className="text-white/70 text-xs truncate max-w-[150px] md:max-w-none">{product.name}</p>
 </div>
 </div>

 {/* Créditos */}
 <div className="flex items-center gap-2">
 <div className="flex items-center gap-1.5 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-lg">
 <span className="text-white/80 text-[10px]">-{creditsUsed}</span>
 <i className="fas fa-ticket text-white/80 text-[8px]"></i>
 </div>
 <div className="flex items-center gap-1.5 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-lg">
 <span className="text-white font-semibold text-[10px]">{userCredits}</span>
 <i className="fas fa-coins text-yellow-300 text-[8px]"></i>
 </div>
 </div>
 </div>
 </div>

 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* CONTEÚDO - Desktop: 2 colunas | Mobile: empilhado */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6">
 <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">

 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* COLUNA ESQUERDA - Imagem (60% = 3/5) */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 <div className="lg:col-span-3 flex flex-col">
 <div
 className={(theme !== 'light' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-2xl border overflow-hidden flex flex-col'}
 >
 {/* Switch Original/Gerada */}
 <div className={'flex items-center justify-between px-4 py-2 border-b ' + (theme !== 'light' ? 'border-neutral-800' : 'border-gray-100')}>
 <span className={(theme !== 'light' ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide'}>
 {showOriginal ? 'Imagem Original' : 'Imagem Gerada'}
 </span>
 <button
 onClick={() => setShowOriginal(!showOriginal)}
 className={'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ' +
 (theme !== 'light'
 ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
 : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
 }
 >
 <i className={'fas ' + (showOriginal ? 'fa-wand-magic-sparkles' : 'fa-image')}></i>
 <span>{showOriginal ? 'Ver Gerada' : 'Ver Original'}</span>
 </button>
 </div>

 {/* Área da Imagem com Zoom Hover */}
 <div
 ref={imageContainerRef}
 className={'relative flex items-center justify-center p-4 md:p-6 min-h-[280px] md:min-h-[400px] cursor-zoom-in overflow-hidden ' + (theme !== 'light' ? 'bg-neutral-800/50' : 'bg-gray-100')}
 onMouseEnter={() => setIsHovering(true)}
 onMouseLeave={() => setIsHovering(false)}
 onMouseMove={handleMouseMove}
 onClick={() => setShowZoomModal(true)}
 onTouchStart={onTouchStart}
 onTouchMove={onTouchMove}
 onTouchEnd={onTouchEnd}
 >
 {displayImage ? (
 <>
 {/* Imagem normal */}
 <img
 src={displayImage}
 alt={`${product.name} - ${showOriginal ? 'original' : currentImage?.angle}`}
 className={'max-w-full max-h-[260px] md:max-h-[380px] object-contain rounded-lg transition-opacity duration-200 ' + (isHovering ? 'opacity-0 lg:opacity-0' : 'opacity-100')}
 style={{ display: isHovering ? 'none' : 'block' }}
 />

 {/* Zoom com lupa (só desktop) */}
 {isHovering && (
 <div
 className="hidden lg:block absolute inset-0 bg-no-repeat"
 style={{
 backgroundImage: `url(${displayImage})`,
 backgroundPosition: `${mousePosition.x}% ${mousePosition.y}%`,
 backgroundSize: '110%'
 }}
 />
 )}

 {/* Imagem mobile quando não está em hover */}
 <img
 src={displayImage}
 alt={`${product.name}`}
 className={'lg:hidden max-w-full max-h-[260px] object-contain rounded-lg ' + (isHovering ? '' : 'hidden')}
 />

 {/* Ícone de lupa (desktop) */}
 <div className={'hidden lg:flex absolute bottom-3 right-3 w-8 h-8 rounded-lg items-center justify-center transition-all pointer-events-none ' + (theme !== 'light' ? 'bg-black/60 text-white' : 'bg-white/80 text-gray-700')}>
 <i className="fas fa-search-plus text-sm"></i>
 </div>

 {/* Badge indicando tipo */}
 <div className="absolute top-3 left-3 flex items-center gap-1.5">
  <div className={'px-2 py-1 rounded-lg text-[10px] font-medium ' + (showOriginal ? 'bg-neutral-600 text-white' : 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white')}>
   {showOriginal ? 'Original' : ANGLE_LABELS[currentImage?.angle] || 'Gerada'}
  </div>
  {!showOriginal && currentImage?.url?.includes('/edit_') && (
   <div className="px-2 py-1 bg-blue-500/80 backdrop-blur-sm rounded-lg flex items-center gap-1">
    <i className="fas fa-pen-to-square text-white text-[8px]"></i>
    <span className="text-white text-[10px] font-medium">Editado</span>
   </div>
  )}
 </div>

 {/* Watermark overlay (only on generated images) */}
 {hasWatermark && !showOriginal && <WatermarkOverlay />}
 </>
 ) : (
 <div className="flex flex-col items-center gap-2">
 <i className={(theme !== 'light' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-image text-3xl'}></i>
 </div>
 )}
 </div>

 {/* Botões de Ângulos */}
 <div className={'px-3 py-3 border-t ' + (theme !== 'light' ? 'border-neutral-800' : 'border-gray-100')}>
 <p className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] uppercase tracking-wide mb-2 text-center'}>
 Ângulos Gerados
 </p>
 <div className="flex items-center justify-center gap-1.5 flex-wrap">
 {availableAngles.map((angle) => {
 const isGenerated = isAngleGenerated(angle);
 const isActive = !showOriginal && currentImage?.angle === angle;
 return (
 <button
 key={angle}
 onClick={() => isGenerated && goToAngle(angle)}
 disabled={!isGenerated}
 className={'px-3 py-1.5 rounded-lg font-medium text-[11px] transition-all flex items-center gap-1.5 ' +
 (isActive
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white '
 : isGenerated
 ? (theme !== 'light'
 ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
 : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
 : (theme !== 'light'
 ? 'bg-neutral-800/50 text-neutral-600 cursor-not-allowed'
 : 'bg-gray-50 text-gray-400 cursor-not-allowed')
 )
 }
 >
 <i className={'fas ' + ANGLE_ICONS[angle] + ' text-[9px]'}></i>
 {ANGLE_LABELS[angle]}
 {!isGenerated && <i className="fas fa-lock text-[8px] opacity-50"></i>}
 </button>
 );
 })}
 </div>
 </div>
 </div>
 </div>

 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* COLUNA DIREITA - Info + Ações (40% = 2/5) */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 <div className="lg:col-span-2 flex flex-col gap-3">

 {/* Card Informações */}
 <div className={(theme !== 'light' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-3'}>
 <h3 className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' text-xs font-semibold mb-3 flex items-center gap-2'}>
 <i className="fas fa-chart-simple text-[#FF6B6B] text-[10px]"></i>
 Informações
 </h3>

 <div className="space-y-2">
 <div className="flex items-center gap-2">
 <div className={(theme !== 'light' ? 'bg-neutral-800' : 'bg-gray-100') + ' w-7 h-7 rounded-lg flex items-center justify-center'}>
 <i className={(theme !== 'light' ? 'text-neutral-400' : 'text-gray-500') + ' fas fa-clock text-[10px]'}></i>
 </div>
 <div>
 <p className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] uppercase tracking-wide'}>Gerado</p>
 <p className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>{timeAgo}</p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <div className="bg-green-500/20 w-7 h-7 rounded-lg flex items-center justify-center">
 <i className="fas fa-check text-green-400 text-[10px]"></i>
 </div>
 <div>
 <p className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] uppercase tracking-wide'}>Status</p>
 <p className="text-green-400 text-xs font-medium">{images.length} imagem{images.length > 1 ? 's' : ''} gerada{images.length > 1 ? 's' : ''}</p>
 </div>
 </div>
 </div>
 </div>

 {/* Botão Salvar - Grande e destacado */}
 <button
 onClick={handleSave}
 disabled={isSaved}
 className={'w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ' +
 (isSaved
 ? 'bg-green-500/20 text-green-400 border-2 border-green-500/30'
 : 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:opacity-90 '
 )
 }
 >
 <i className={'fas ' + (isSaved ? 'fa-check-circle' : 'fa-images')}></i>
 <span>{isSaved ? 'Imagens Salvas' : 'Salvar Imagens Criadas'}</span>
 </button>

 {/* Download + Export */}
 <div className="flex gap-2">
 <button
  onClick={() => setShowDownloadModal(true)}
  className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:opacity-90"
 >
  <i className="fas fa-download"></i>
  Download ({images.length})
 </button>
 <EcommerceExportButton
  images={downloadableImages.map(img => ({ url: img.url, label: img.label }))}
  productId={product.id}
  tool="product-studio"
 />
 </div>

 {/* Ações Rápidas - Grid compacto */}
 <div className={(theme !== 'light' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-3'}>
 <p className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] uppercase tracking-wide mb-2'}>
 Ações Rápidas
 </p>

 <div className="grid grid-cols-4 gap-2">

 {/* Edição IA */}
 <button
 onClick={() => onDeductEditCredits ? setShowEditModal(true) : onRegenerate()}
 className="p-2.5 rounded-lg border border-[#FF6B6B]/30 bg-gradient-to-r from-[#FF6B6B]/10 to-[#FF9F43]/10 hover:from-[#FF6B6B]/20 hover:to-[#FF9F43]/20 transition-all flex flex-col items-center gap-1"
 >
 <i className="fas fa-wand-magic-sparkles text-sm bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] bg-clip-text text-transparent"></i>
 <span className="text-[9px] font-medium bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] bg-clip-text text-transparent">Edição IA</span>
 </button>

 {/* Zoom */}
 <button
 onClick={() => setShowZoomModal(true)}
 className={(theme !== 'light' ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700' : 'bg-gray-50 hover:bg-gray-100 border-gray-200') + ' p-2.5 rounded-lg border transition-all flex flex-col items-center gap-1'}
 >
 <i className={(theme !== 'light' ? 'text-neutral-300' : 'text-gray-600') + ' fas fa-expand text-sm'}></i>
 <span className={(theme !== 'light' ? 'text-neutral-400' : 'text-gray-500') + ' text-[9px]'}>Ampliar</span>
 </button>

 {/* Report */}
 <button
 onClick={() => setShowReportModal(true)}
 className={(theme !== 'light' ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30' : 'bg-amber-50 hover:bg-amber-100 border-amber-200') + ' p-2.5 rounded-lg border transition-all flex flex-col items-center gap-1'}
 >
 <i className="fas fa-flag text-amber-400 text-sm"></i>
 <span className="text-amber-400 text-[9px]">Report</span>
 </button>

 {/* Descartar */}
 <button
 onClick={() => setShowDeleteModal(true)}
 className={(theme !== 'light' ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30' : 'bg-red-50 hover:bg-red-100 border-red-200') + ' p-2.5 rounded-lg border transition-all flex flex-col items-center gap-1'}
 >
 <i className="fas fa-trash text-red-400 text-sm"></i>
 <span className="text-red-400 text-[9px]">Excluir</span>
 </button>
 </div>
 </div>

 </div>
 </div>
 </div>

 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* MODAL - Zoom da Imagem com Switch */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 {showZoomModal && (
 <div className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={() => setShowZoomModal(false)}>
 {/* Header do Modal */}
 <div
 className="flex items-center justify-between p-4 flex-shrink-0"
 style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 1rem))' }}
 onClick={e => e.stopPropagation()}
 >
 {/* Switch Original/Gerada */}
 <div className="flex items-center gap-2 bg-white/10 rounded-lg p-1">
 <button
 onClick={() => setShowOriginal(false)}
 className={'px-3 py-1.5 rounded-md text-xs font-medium transition-all ' +
 (!showOriginal ? 'bg-white text-black' : 'text-white/70 hover:text-white')
 }
 >
 Gerada
 </button>
 <button
 onClick={() => setShowOriginal(true)}
 className={'px-3 py-1.5 rounded-md text-xs font-medium transition-all ' +
 (showOriginal ? 'bg-white text-black' : 'text-white/70 hover:text-white')
 }
 >
 Original
 </button>
 </div>

 {/* Botão Fechar */}
 <button
 onClick={() => setShowZoomModal(false)}
 className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
 >
 <i className="fas fa-times"></i>
 </button>
 </div>

 {/* Imagem com Pinch-to-Zoom */}
 <div className="flex-1 overflow-hidden" onClick={e => e.stopPropagation()}>
 <ZoomableImage
 src={(showOriginal ? originalImage : currentImage?.url) || ''}
 alt={product.name}
 className="w-full h-full"
 />
 </div>

 {/* Botões de Ângulos no Modal */}
 {!showOriginal && images.length > 1 && (
 <div className="flex items-center justify-center gap-2 p-4 flex-shrink-0" onClick={e => e.stopPropagation()}>
 {images.map((img, idx) => (
 <button
 key={img.id || idx}
 onClick={() => setCurrentIndex(idx)}
 className={'px-3 py-2 rounded-lg font-medium text-xs transition-all ' +
 (idx === currentIndex
 ? 'bg-white text-black'
 : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white')
 }
 >
 {ANGLE_LABELS[img.angle] || img.angle}
 </button>
 ))}
 </div>
 )}
 </div>
 )}

 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* MODAL - Sair sem Salvar */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 {showExitModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowExitModal(false)}></div>
 <div className={(theme !== 'light' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' relative z-10 w-full max-w-sm rounded-2xl border p-5 '}>
 <div className="text-center mb-4">
 <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-3">
 <i className="fas fa-exclamation-triangle text-yellow-500 text-xl"></i>
 </div>
 <h3 className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' text-base font-bold font-serif'}>Sair sem salvar?</h3>
 <p className={(theme !== 'light' ? 'text-neutral-400' : 'text-gray-500') + ' text-xs mt-1'}>As imagens geradas serão perdidas</p>
 </div>

 <div className="flex flex-col gap-2">
 <button
 onClick={() => confirmExit(true)}
 className="w-full py-2.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-xl font-semibold text-sm hover:opacity-90"
 >
 <i className="fas fa-images mr-2"></i>Salvar e Sair
 </button>
 <button
 onClick={() => confirmExit(false)}
 className={(theme !== 'light' ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200') + ' w-full py-2.5 rounded-xl font-semibold text-sm'}
 >
 Sair sem Salvar
 </button>
 <button
 onClick={() => setShowExitModal(false)}
 className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-500') + ' w-full py-2 text-xs font-medium'}
 >
 Cancelar
 </button>
 </div>
 </div>
 </div>
 )}

 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* MODAL - Report */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 <ReportModal
 isOpen={showReportModal}
 onClose={() => setShowReportModal(false)}
 onSubmit={handleReportSubmit}
 generationType="product-studio"
 productName={product.name}
 theme={theme}
 />

 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* MODAL - Confirmar Exclusão */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 {showDeleteModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}></div>
 <div className={(theme !== 'light' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' relative z-10 w-full max-w-sm rounded-2xl border p-5 '}>
 <div className="text-center mb-4">
 <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-3">
 <i className="fas fa-trash text-red-500 text-xl"></i>
 </div>
 <h3 className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' text-base font-bold font-serif'}>Descartar imagens?</h3>
 <p className={(theme !== 'light' ? 'text-neutral-400' : 'text-gray-500') + ' text-xs mt-1'}>Esta ação não pode ser desfeita</p>
 </div>

 <div className="flex gap-2">
 <button
 onClick={() => setShowDeleteModal(false)}
 className={(theme !== 'light' ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200') + ' flex-1 py-2.5 rounded-xl font-semibold text-sm'}
 >
 Cancelar
 </button>
 <button
 onClick={confirmDelete}
 className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-semibold text-sm hover:bg-red-600"
 >
 <i className="fas fa-trash mr-2"></i>Excluir
 </button>
 </div>
 </div>
 </div>
 )}

 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* MODAL - Editar Imagem */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 {showEditModal && currentImage && onDeductEditCredits && onImageUpdated && (
 <StudioEditModal
 isOpen={showEditModal}
 onClose={() => setShowEditModal(false)}
 product={product}
 currentImage={currentImage}
 generationId={session.id}
 session={session}
 editBalance={editBalance}
 regularBalance={regularBalance ?? userCredits}
 resolution={resolution}
 studioBackground={studioBackground}
 studioShadow={studioShadow}
 productNotes={productNotes}
 onImageUpdated={onImageUpdated}
 onSaveAsNew={user ? async (newImageUrl: string) => {
   const { error } = await supabase
     .from('product_images')
     .insert({
       product_id: product.id,
       user_id: user.id,
       type: 'product_studio',
       angle: currentImage.angle,
       url: newImageUrl,
       file_name: `ps_edit_${Date.now()}.png`,
       storage_path: `generated/ps_edit_${Date.now()}.png`,
       mime_type: 'image/png',
       is_primary: false,
       generation_id: session.id,
     });
   if (error) {
     console.error('[PSR SaveAsNew] Insert failed:', error);
     return { success: false };
   }
   onImageSavedAsNew?.(currentImage.angle, newImageUrl);
   return { success: true };
 } : undefined}
 onDeductEditCredits={onDeductEditCredits}
 theme={theme}
 />
 )}

 {/* Download Modal */}
 <DownloadModal
  isOpen={showDownloadModal}
  onClose={() => setShowDownloadModal(false)}
  productName={product.name}
  originalImageUrl={product.originalImages?.front?.url || product.images?.[0]?.url}
  images={downloadableImages}
  theme={theme}
 />

 </div>
 );
};
