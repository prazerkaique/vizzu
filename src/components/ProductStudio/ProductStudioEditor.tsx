// ═══════════════════════════════════════════════════════════════
// VIZZU - Product Studio Editor (Página 2)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';

import { Product, HistoryLog, ProductAttributes, CATEGORY_ATTRIBUTES, ProductStudioSession, ProductStudioImage, ProductStudioAngle } from '../../types';
import { generateProductStudioV2, pollStudioGeneration, retryStudioAngle, ProductPresentationStyle, FabricFinish, StudioBackground, StudioShadow, StudioAngleStatus } from '../../lib/api/studio';
import { ProductStudioResult } from './ProductStudioResult';
import { smartDownload } from '../../utils/downloadHelper';
import { ResolutionSelector, Resolution } from '../ResolutionSelector';
import { Resolution4KConfirmModal, has4KConfirmation, savePreferredResolution, getPreferredResolution } from '../Resolution4KConfirmModal';
import { RESOLUTION_COST, canUseResolution, Plan } from '../../hooks/useCredits';
import { OptimizedImage } from '../OptimizedImage';
import { supabase } from '../../services/supabaseClient';
import { getProductType, CLOTHING_CATEGORIES, FOOTWEAR_CATEGORIES, HEADWEAR_CATEGORIES, BAG_CATEGORIES, ACCESSORY_CATEGORIES } from '../../lib/productConfig';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { useSystemLoad } from '../../hooks/useSystemLoad';
import { ReportModal } from '../ReportModal';
import { submitReport } from '../../lib/api/reports';
import { StudioEditModal } from './StudioEditModal';

// ═══════════════════════════════════════════════════════════════
// PENDING GENERATION (sobrevive ao F5 / fechamento do app)
// ═══════════════════════════════════════════════════════════════
const PENDING_PS_KEY = 'vizzu-pending-product-studio';

interface PendingProductStudioGeneration {
  productId: string;
  productName: string;
  userId: string;
  startTime: number;
  angles: string[];
  generationId?: string; // v9: ID da geração para polling incremental
}

const savePendingPSGeneration = (data: PendingProductStudioGeneration) => {
  try {
    localStorage.setItem(PENDING_PS_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Erro ao salvar geração pendente PS:', e);
  }
};

const getPendingPSGeneration = (): PendingProductStudioGeneration | null => {
  try {
    const stored = localStorage.getItem(PENDING_PS_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error('Erro ao ler geração pendente PS:', e);
  }
  return null;
};

const clearPendingPSGeneration = () => {
  try {
    localStorage.removeItem(PENDING_PS_KEY);
  } catch (e) {
    console.error('Erro ao limpar geração pendente PS:', e);
  }
};


interface ProductStudioEditorProps {
 product: Product;
 userCredits: number;
 onUpdateProduct: (productId: string, updates: Partial<Product>) => void;
 onDeductCredits: (amount: number, reason: string) => boolean;
 onAddHistoryLog: (action: string, details: string, status: HistoryLog['status'], items: Product[], method: HistoryLog['method'], cost: number) => void;
 onBack: () => void;
 onCheckCredits?: (creditsNeeded: number, actionContext: 'studio' | 'cenario' | 'lifestyle' | 'video' | 'provador' | 'generic') => boolean;
 theme?: 'dark' | 'light';
 userId?: string;
 // Props para geração global
 isGenerating?: boolean;
 isMinimized?: boolean;
 generationProgress?: number;
 generationText?: string;
 onSetGenerating?: (value: boolean) => void;
 onSetMinimized?: (value: boolean) => void;
 onSetProgress?: (value: number) => void;
 onSetLoadingText?: (value: string) => void;
 isAnyGenerationRunning?: boolean;
 // Navegação para outras ferramentas
 onNavigate?: (page: 'look-composer' | 'lifestyle' | 'provador', productId?: string, imageUrl?: string) => void;
 // Plano atual do usuário para verificar permissões de resolução
 currentPlan?: Plan;
 // Callback para abrir modal de planos (quando tentar usar 4K sem permissão)
 onOpenPlanModal?: () => void;
 // Créditos de edição (para StudioEditModal)
 editBalance?: number;
 onDeductEditCredits?: (amount: number, generationId?: string) => Promise<{ success: boolean; source?: 'edit' | 'regular' }>;
}

// Frases de loading para Product Studio
const LOADING_PHRASES = [
 "Preparando o estúdio fotográfico...",
 "Ajustando a iluminação perfeita...",
 "Posicionando o produto...",
 "Renderizando em alta qualidade...",
 "Aplicando acabamentos profissionais...",
 "Criando fundo neutro de estúdio...",
 "Processando texturas e detalhes...",
 "Otimizando sombras e reflexos...",
 "Finalizando a composição...",
 "Quase pronto! Últimos ajustes..."
];

// Categorias importadas de ../../lib/productConfig

// Ângulos por tipo de produto
const ANGLES_CONFIG = {
 clothing: [
 { id: 'front' as ProductStudioAngle, label: 'Frente', icon: 'fa-shirt' },
 { id: 'back' as ProductStudioAngle, label: 'Costas', icon: 'fa-shirt' },
 { id: 'front_detail' as ProductStudioAngle, label: 'Detalhe Frente', icon: 'fa-magnifying-glass-plus' },
 { id: 'back_detail' as ProductStudioAngle, label: 'Detalhe Costas', icon: 'fa-magnifying-glass-plus' },
 { id: 'folded' as ProductStudioAngle, label: 'Dobrada', icon: 'fa-layer-group' },
 ],
 footwear: [
 { id: 'front' as ProductStudioAngle, label: 'Frente', icon: 'fa-shoe-prints' },
 { id: 'back' as ProductStudioAngle, label: 'Par Traseira', icon: 'fa-shoe-prints' },
 { id: 'side-left' as ProductStudioAngle, label: 'Lateral', icon: 'fa-arrows-left-right' },
 { id: 'top' as ProductStudioAngle, label: 'Par Superior', icon: 'fa-arrow-up' },
 { id: 'detail' as ProductStudioAngle, label: 'Sola', icon: 'fa-arrow-down' },
 ],
 headwear: [
 { id: 'front' as ProductStudioAngle, label: 'Frente', icon: 'fa-hat-cowboy' },
 { id: 'back' as ProductStudioAngle, label: 'Traseira', icon: 'fa-hat-cowboy' },
 { id: 'side-left' as ProductStudioAngle, label: 'Lateral', icon: 'fa-arrows-left-right' },
 { id: 'top' as ProductStudioAngle, label: 'Vista Superior', icon: 'fa-arrow-up' },
 { id: 'front_detail' as ProductStudioAngle, label: 'Detalhe', icon: 'fa-magnifying-glass-plus' },
 ],
 bag: [
 { id: 'front' as ProductStudioAngle, label: 'Frente', icon: 'fa-bag-shopping' },
 { id: 'back' as ProductStudioAngle, label: 'Traseira', icon: 'fa-bag-shopping' },
 { id: 'side-left' as ProductStudioAngle, label: 'Lateral', icon: 'fa-arrows-left-right' },
 { id: 'top' as ProductStudioAngle, label: 'Vista Superior', icon: 'fa-arrow-up' },
 { id: 'detail' as ProductStudioAngle, label: 'Interior', icon: 'fa-magnifying-glass-plus' },
 { id: 'front_detail' as ProductStudioAngle, label: 'Detalhe', icon: 'fa-magnifying-glass-plus' },
 ],
 accessory: [
 { id: 'front' as ProductStudioAngle, label: 'Frente', icon: 'fa-glasses' },
 { id: 'back' as ProductStudioAngle, label: 'Trás', icon: 'fa-glasses' },
 { id: 'side-left' as ProductStudioAngle, label: 'Lateral Esq.', icon: 'fa-caret-left' },
 { id: 'side-right' as ProductStudioAngle, label: 'Lateral Dir.', icon: 'fa-caret-right' },
 { id: 'detail' as ProductStudioAngle, label: 'Detalhe', icon: 'fa-magnifying-glass-plus' },
 ],
};

const CATEGORIES = ['Camisetas', 'Calças', 'Calçados', 'Acessórios', 'Vestidos', 'Shorts', 'Jaquetas', 'Blusas', 'Regatas', 'Tops', 'Tênis', 'Sandálias', 'Botas', 'Óculos', 'Bijuterias', 'Bolsas'];
const COLORS = ['Preto', 'Branco', 'Azul', 'Vermelho', 'Verde', 'Amarelo', 'Rosa', 'Cinza', 'Marrom', 'Bege', 'Laranja', 'Roxo', 'Nude', 'Estampado', 'Multicolor'];

export const ProductStudioEditor: React.FC<ProductStudioEditorProps> = ({
 product,
 userCredits,
 onUpdateProduct,
 onDeductCredits,
 onAddHistoryLog,
 onBack,
 onCheckCredits,
 theme = 'dark',
 userId,
 // Props de geração global
 isGenerating: globalIsGenerating = false,
 isMinimized = false,
 generationProgress = 0,
 generationText = '',
 onSetGenerating,
 onSetMinimized,
 onSetProgress,
 onSetLoadingText,
 isAnyGenerationRunning = false,
 onNavigate,
 currentPlan,
 onOpenPlanModal,
 editBalance = 0,
 onDeductEditCredits,
}) => {
 const { showToast } = useUI();
 const { checkLoad } = useSystemLoad();

 // Mensagem de alta demanda (exibida no loading)
 const [highDemandMessage, setHighDemandMessage] = useState<string | null>(null);

 // Estados de edição do produto
 const [editMode, setEditMode] = useState(false);
 const [editedProduct, setEditedProduct] = useState({
 name: product.name,
 sku: product.sku,
 category: product.category || '',
 color: product.color || '',
 description: product.description || '',
 });
 const [editedAttributes, setEditedAttributes] = useState<ProductAttributes>(product.attributes || {});

 // Estado do carrossel e toggle de visualização
 const [currentImageIndex, setCurrentImageIndex] = useState(0);
 const [viewMode, setViewMode] = useState<'original' | 'otimizada'>('original'); // Começa em 'original' por padrão

 // Estados de seleção de ângulos
 const [selectedAngles, setSelectedAngles] = useState<ProductStudioAngle[]>(['front']);

 // Estado do estilo de apresentação (Ghost Mannequin ou Flat Lay)
 const [presentationStyle, setPresentationStyle] = useState<ProductPresentationStyle>('ghost-mannequin');
 const [showPresentationTooltip, setShowPresentationTooltip] = useState(false);
 const [expandedStyleImage, setExpandedStyleImage] = useState<{ url: string; label: string } | null>(null);

 // Estado do acabamento do tecido (só para flat-lay)
 const [fabricFinish, setFabricFinish] = useState<FabricFinish>('natural');
 const [studioBackground, setStudioBackground] = useState<StudioBackground>('gray');
 const [studioShadow, setStudioShadow] = useState<StudioShadow>('with-shadow');
 const [productNotes, setProductNotes] = useState('');

 // Estado de geração local (fallback se não tiver props globais)
 const [localIsGenerating, setLocalIsGenerating] = useState(false);
 const [localProgress, setLocalProgress] = useState(0);
 const [localLoadingText, setLocalLoadingText] = useState('');
 const [phraseIndex, setPhraseIndex] = useState(0);

 // Estado para mostrar página de resultado após geração
 const [showResult, setShowResult] = useState(false);
 const [currentSession, setCurrentSession] = useState<ProductStudioSession | null>(null);

 // Estado para modal de ângulo sem referência
 const [showNoRefModal, setShowNoRefModal] = useState(false);
 const [angleWithoutRef, setAngleWithoutRef] = useState<ProductStudioAngle | null>(null);
 const [noRefModalMode, setNoRefModalMode] = useState<'blocked' | 'warning' | 'detail-tip'>('warning');
 const [uploadingRef, setUploadingRef] = useState(false);

 // Estado de resolução (2K ou 4K)
 const [resolution, setResolution] = useState<Resolution>(() => getPreferredResolution());
 const [show4KConfirmModal, setShow4KConfirmModal] = useState(false);
 const [pending4KConfirm, setPending4KConfirm] = useState(false);

 // Verificar se plano permite 4K
 const canUse4K = currentPlan ? canUseResolution(currentPlan, '4k') : false;

 // Estado do modal de edição (para imagens já otimizadas)
 const [showEditModalEditor, setShowEditModalEditor] = useState(false);

 // v9: Ângulos completados pelo polling incremental (atualizado em tempo real)
 const [completedAngleStatuses, setCompletedAngleStatuses] = useState<StudioAngleStatus[]>([]);
 const [generationFinalStatus, setGenerationFinalStatus] = useState<'processing' | 'completed' | 'partial' | 'failed' | null>(null);

 // Lock instantâneo para prevenir clique duplo (v9 4.1)
 const [isSubmitting, setIsSubmitting] = useState(false);

 // v9 3.1: Retry individual de ângulos que falharam
 const [retryAttempts, setRetryAttempts] = useState<Record<string, number>>({});
 const [retryingAngle, setRetryingAngle] = useState<string | null>(null);
 // v9 3.2: Report de problema
 const [showReportModal, setShowReportModal] = useState(false);
 const [reportAngle, setReportAngle] = useState<string | null>(null);
 // Refs para evitar stale closure no polling
 const generationFinalStatusRef = useRef<string | null>(null);
 const completedAngleStatusesRef = useRef<StudioAngleStatus[]>([]);
 // ID da geração atual (sobrevive ao cleanup do polling)
 const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);

 const { user: authUser } = useAuth();

 // Sincronizar ref dos ângulos completados (para acessar dentro de callbacks sem stale closure)
 useEffect(() => {
 completedAngleStatusesRef.current = completedAngleStatuses;
 }, [completedAngleStatuses]);

 // Usar estado global se disponível, senão local
 const isGenerating = onSetGenerating ? globalIsGenerating : localIsGenerating;
 const currentProgress = onSetProgress ? generationProgress : localProgress;
 const currentLoadingText = onSetLoadingText ? generationText : localLoadingText;

 // ═══════════════════════════════════════════════════════════════
 // VERIFICAR GERAÇÃO PENDENTE AO CARREGAR (sobrevive ao F5)
 // ═══════════════════════════════════════════════════════════════
 // Polling incremental v9: usa generationId direto
 // Retorna 'polling' para continuar, 'completed' para parar (tudo pronto ou falha total)
 const checkPendingPSGeneration = useCallback(async (): Promise<'polling' | 'completed'> => {
 const pending = getPendingPSGeneration();
 if (!pending || !userId) return 'polling';

 // Expirar após 10 minutos (safety net absoluto)
 const elapsedMinutes = (Date.now() - pending.startTime) / 1000 / 60;
 if (elapsedMinutes > 10) {
 clearPendingPSGeneration();
 generationFinalStatusRef.current = 'failed';
 setGenerationFinalStatus('failed');
 showToast('A geração demorou mais que o esperado e foi cancelada. Seus créditos foram devolvidos.', 'error');
 return 'completed';
 }

 try {
 // v9: polling por generationId (incremental)
 if (pending.generationId) {
 const pollResult = await pollStudioGeneration(pending.generationId);

 // Atualizar ângulos completados (UI reflete em tempo real)
 if (pollResult.completedAngles.length > 0) {
   setCompletedAngleStatuses(pollResult.completedAngles);
 }

 // Calcular progresso
 const totalAngles = pending.angles.length;
 const doneAngles = pollResult.completedAngles.filter(a => a.status === 'completed').length;
 const setProgress = onSetProgress || setLocalProgress;

 if (doneAngles > 0) {
   // Progresso real baseado em ângulos concluídos
   const realProgress = Math.round((doneAngles / totalAngles) * 95);
   setProgress(Math.max(realProgress, 15));
 } else {
   // Nenhum ângulo pronto ainda — progresso suave baseado no tempo
   // Sobe de 10% a 50% ao longo de 2 minutos enquanto espera
   const elapsedMs = Date.now() - pending.startTime;
   const timeProgress = Math.min(Math.round(10 + (elapsedMs / 120000) * 40), 50);
   setProgress(timeProgress);
 }

 // Geração terminou (completed, partial, ou failed)?
 if (pollResult.generationStatus === 'completed' || pollResult.generationStatus === 'partial' || pollResult.generationStatus === 'failed') {
   generationFinalStatusRef.current = pollResult.generationStatus;
   setGenerationFinalStatus(pollResult.generationStatus);
   setCurrentGenerationId(pending.generationId || null);
   clearPendingPSGeneration();

   const successAngles = pollResult.completedAngles.filter(a => a.status === 'completed');

   if (successAngles.length > 0) {
     const newImages: ProductStudioImage[] = successAngles.map((item, idx) => ({
       id: item.id || `${pending.generationId}-${idx}`,
       url: item.url!,
       angle: (item.angle || 'front') as ProductStudioAngle,
       createdAt: new Date().toISOString()
     }));

     const sessionId = pending.generationId!;
     const newSession: ProductStudioSession = {
       id: sessionId,
       productId: product.id,
       images: newImages,
       status: 'ready',
       createdAt: new Date().toISOString()
     };

     const currentGenerated = product.generatedImages || {
       studioReady: [], cenarioCriativo: [], modeloIA: [], productStudio: []
     };
     onUpdateProduct(product.id, {
       generatedImages: {
         ...currentGenerated,
         productStudio: [...(currentGenerated.productStudio || []), newSession]
       }
     });

     const notifiedKey = `vizzu_bg_notified_${userId}`;
     const notified = JSON.parse(localStorage.getItem(notifiedKey) || '[]');
     notified.push(`ps-${sessionId}`);
     localStorage.setItem(notifiedKey, JSON.stringify(notified.slice(-200)));

     setCurrentSession(newSession);

     // Mostrar tela de resultados sempre que houver imagens geradas
     setShowResult(true);

     // Re-poll após 5s para capturar ângulos que chegaram tarde (ex: top)
     // Workers paralelos podem terminar DEPOIS do status virar 'completed'
     const genId = pending.generationId!;
     setTimeout(async () => {
       try {
         const latePoll = await pollStudioGeneration(genId);
         const lateAngles = latePoll.completedAngles.filter(a => a.status === 'completed');
         if (lateAngles.length > successAngles.length) {
           const lateImages: ProductStudioImage[] = lateAngles.map((item, idx) => ({
             id: item.id || `${genId}-${idx}`,
             url: item.url!,
             angle: (item.angle || 'front') as ProductStudioAngle,
             createdAt: new Date().toISOString()
           }));
           const lateSession: ProductStudioSession = {
             id: genId,
             productId: product.id,
             images: lateImages,
             status: 'ready',
             createdAt: newSession.createdAt
           };
           setCurrentSession(lateSession);
           const curGen = product.generatedImages || {
             studioReady: [], cenarioCriativo: [], modeloIA: [], productStudio: []
           };
           const updPS = [...(curGen.productStudio || [])];
           const sIdx = updPS.findIndex(s => s.id === genId);
           if (sIdx >= 0) updPS[sIdx] = lateSession;
           else updPS.push(lateSession);
           onUpdateProduct(product.id, {
             generatedImages: { ...curGen, productStudio: updPS }
           });
         }
       } catch (e) {
         console.warn('[Polling] Late re-poll failed:', e);
       }
     }, 5000);
   }

   // Se falhou completamente (nenhum ângulo gerado), mostrar erro
   if (pollResult.generationStatus === 'failed' && successAngles.length === 0) {
     showToast(pollResult.error_message || 'Não conseguimos gerar suas imagens. Seus créditos foram devolvidos automaticamente.', 'error');
   }

   // Sucesso parcial: alguns ângulos geraram, outros falharam
   if (pollResult.generationStatus === 'partial' && successAngles.length > 0) {
     const failedAngles = pollResult.completedAngles.filter(a => a.status === 'failed');
     if (failedAngles.length > 0) {
       showToast(`${successAngles.length} de ${successAngles.length + failedAngles.length} imagens geradas. Os créditos dos ângulos que falharam foram devolvidos.`, 'info');
     }
   }

   return 'completed';
 }

 return 'polling';
 }

 // Fallback v8: polling por user_id + product_id (sem generationId)
 const { data: generation, error } = await supabase
 .from('generations')
 .select('id, status, output_urls')
 .eq('user_id', userId)
 .eq('product_id', pending.productId)
 .order('created_at', { ascending: false })
 .limit(1)
 .single();

 if (error || !generation) return 'polling';

 const hasResults = generation.output_urls &&
 (Array.isArray(generation.output_urls) ? generation.output_urls.length > 0 : true);
 if (!hasResults) return 'polling';

 clearPendingPSGeneration();

 const urls = generation.output_urls as Array<{ angle: string; url: string; id?: string }>;
 const newImages: ProductStudioImage[] = (Array.isArray(urls) ? urls : []).map((item, idx) => ({
 id: item.id || `${generation.id}-${idx}`,
 url: item.url,
 angle: (item.angle || 'front') as ProductStudioAngle,
 createdAt: new Date().toISOString()
 }));

 if (newImages.length === 0) return 'polling';

 const newSession: ProductStudioSession = {
 id: generation.id,
 productId: product.id,
 images: newImages,
 status: 'ready',
 createdAt: new Date().toISOString()
 };

 const currentGenerated = product.generatedImages || {
 studioReady: [], cenarioCriativo: [], modeloIA: [], productStudio: []
 };
 onUpdateProduct(product.id, {
 generatedImages: {
 ...currentGenerated,
 productStudio: [...(currentGenerated.productStudio || []), newSession]
 }
 });

 const notifiedKey = `vizzu_bg_notified_${userId}`;
 const notified = JSON.parse(localStorage.getItem(notifiedKey) || '[]');
 notified.push(`ps-${generation.id}`);
 localStorage.setItem(notifiedKey, JSON.stringify(notified.slice(-200)));

 setCurrentSession(newSession);
 setShowResult(true);
 return 'completed';
 } catch (err) {
 console.error('[Polling] Erro ao consultar Supabase:', err);
 return 'polling';
 }
 }, [userId, product.id]);

 // Polling de geração pendente ao montar (F5 / refresh durante geração)
 useEffect(() => {
 const pending = getPendingPSGeneration();
 if (!pending || !userId || pending.productId !== product.id) return;

 const setGenerating = onSetGenerating || setLocalIsGenerating;
 const setProgress = onSetProgress || setLocalProgress;

 setGenerating(true);
 setProgress(10);

 // Restaurar ângulos selecionados da geração pendente
 if (pending.angles?.length > 0) {
 setSelectedAngles(pending.angles as ProductStudioAngle[]);
 }

 // Polling a cada 3s (v9 é mais rápido pois busca por generationId)
 const interval = setInterval(async () => {
 const result = await checkPendingPSGeneration();
 if (result === 'completed') {
 clearInterval(interval);
 setProgress(100);
 setTimeout(() => {
   setGenerating(false);
   setProgress(0);
   if (onSetMinimized) onSetMinimized(false);
 }, 1000);
 }
 }, 3000);

 return () => {
 clearInterval(interval);
 };
 }, [userId, product.id]);

 // Rotacionar frases de loading
 useEffect(() => {
 if (!isGenerating) return;

 const interval = setInterval(() => {
 setPhraseIndex(prev => (prev + 1) % LOADING_PHRASES.length);
 }, 3000);

 return () => clearInterval(interval);
 }, [isGenerating]);

 // Atualizar texto de loading baseado na frase atual
 useEffect(() => {
 if (isGenerating) {
 const setText = onSetLoadingText || setLocalLoadingText;
 setText(LOADING_PHRASES[phraseIndex]);
 }
 }, [phraseIndex, isGenerating, onSetLoadingText]);

 // Determinar tipo de produto baseado na categoria (usa config centralizada)
 const productType = getProductType(editedProduct.category || product.category);
 const availableAngles = ANGLES_CONFIG[productType];

 // Obter todas as imagens do produto
 const productImages = useMemo(() => {
 const images: { url: string; type: string }[] = [];

 if (product.originalImages?.front?.url) {
 images.push({ url: product.originalImages.front.url, type: 'Frente' });
 }
 if (product.originalImages?.back?.url) {
 images.push({ url: product.originalImages.back.url, type: 'Costas' });
 }
 if (product.originalImages?.['side-left']?.url) {
 images.push({ url: product.originalImages['side-left'].url, type: 'Lateral Esq.' });
 }
 if (product.originalImages?.['side-right']?.url) {
 images.push({ url: product.originalImages['side-right'].url, type: 'Lateral Dir.' });
 }
 if (product.originalImages?.top?.url) {
 images.push({ url: product.originalImages.top.url, type: 'Cima' });
 }
 if (product.originalImages?.frontDetail?.url) {
 images.push({ url: product.originalImages.frontDetail.url, type: 'Detalhe Frente' });
 }
 if (product.originalImages?.backDetail?.url) {
 images.push({ url: product.originalImages.backDetail.url, type: 'Detalhe Costas' });
 }
 if (product.originalImages?.detail?.url && !product.originalImages?.frontDetail?.url) {
 images.push({ url: product.originalImages.detail.url, type: 'Detalhe' });
 }

 // Fallback para array de imagens legado
 if (images.length === 0 && product.images) {
 product.images.forEach((img, idx) => {
 const url = img.url || img.base64;
 if (url) {
 images.push({ url, type: `Foto ${idx + 1}` });
 }
 });
 }

 return images;
 }, [product]);

 // Obter imagens geradas do Product Studio
 const generatedImages = useMemo(() => {
 const images: { url: string; angle: string; sessionId: string }[] = [];
 const sessions = product.generatedImages?.productStudio || [];

 sessions.forEach(session => {
 session.images.forEach(img => {
 images.push({
 url: img.url,
 angle: img.angle,
 sessionId: session.id
 });
 });
 });

 return images;
 }, [product]);

 // Imagem principal: prioriza gerada (frente) > gerada (qualquer) > original
 const mainImage = useMemo(() => {
 // Primeiro, procurar imagem de frente gerada
 const frontGenerated = generatedImages.find(img => img.angle === 'front');
 if (frontGenerated) return { url: frontGenerated.url, type: 'Gerada - Frente', isGenerated: true };

 // Se não tem frente gerada, pegar primeira gerada
 if (generatedImages.length > 0) {
 const angleLabels: Record<string, string> = {
 'front': 'Frente', 'back': 'Costas', 'side-left': 'Lateral Esq.',
 'side-right': 'Lateral Dir.', '45-left': '45° Esq.', '45-right': '45° Dir.',
 'top': 'Cima', 'detail': 'Detalhe'
 };
 return {
 url: generatedImages[0].url,
 type: `Gerada - ${angleLabels[generatedImages[0].angle] || generatedImages[0].angle}`,
 isGenerated: true
 };
 }

 // Fallback para imagem original
 if (productImages.length > 0) {
 return { url: productImages[0].url, type: productImages[0].type, isGenerated: false };
 }

 return null;
 }, [generatedImages, productImages]);

 // Verificar se produto está otimizado
 const isOptimized = generatedImages.length > 0;

 // Ajustar viewMode automaticamente quando o estado de otimização muda
 useEffect(() => {
 if (isOptimized) {
 // Se produto está otimizado, mostrar imagens otimizadas por padrão
 setViewMode('otimizada');
 } else {
 // Se não está otimizado, forçar viewMode para original
 setViewMode('original');
 }
 setCurrentImageIndex(0);
 }, [isOptimized]);

 // Mapear quais imagens de referência estão disponíveis
 // IMPORTANTE: Só considera disponível se tiver o ID (necessário para a API)
 const availableReferences = useMemo(() => {
 const refs: Record<ProductStudioAngle, boolean> = {
 'front': false,
 'back': false,
 'side-left': false,
 'side-right': false,
 '45-left': false,
 '45-right': false,
 'top': false,
 'detail': false,
 'front_detail': false,
 'back_detail': false,
 'folded': false,
 };

 // Verificar originalImages - PRECISA ter ID para funcionar
 if (product.originalImages?.front?.id) refs.front = true;
 if (product.originalImages?.back?.id) refs.back = true;
 if (product.originalImages?.['side-left']?.id) refs['side-left'] = true;
 if (product.originalImages?.['side-right']?.id) refs['side-right'] = true;
 if (product.originalImages?.top?.id) refs.top = true;
 if (product.originalImages?.detail?.id || product.originalImages?.frontDetail?.id) refs.detail = true;
 if (product.originalImages?.frontDetail?.id) refs.front_detail = true;
 if (product.originalImages?.backDetail?.id) refs.back_detail = true;
 if (product.originalImages?.['45-left']?.id) refs['45-left'] = true;
 if (product.originalImages?.['45-right']?.id) refs['45-right'] = true;

 // Fallback: se não tem originalImages mas tem images legado (com ID)
 if (!refs.front && product.images?.[0]?.id) refs.front = true;
 if (!refs.back && product.images?.[1]?.id) refs.back = true;

 return refs;
 }, [product]);

 // Labels amigáveis para os ângulos
 const angleLabels: Record<ProductStudioAngle, string> = {
 'front': 'Frente',
 'back': 'Costas',
 'side-left': 'Lateral Esquerda',
 'side-right': 'Lateral Direita',
 '45-left': '45° Esquerda',
 '45-right': '45° Direita',
 'top': 'Vista de Cima',
 'detail': 'Detalhe',
 'front_detail': 'Detalhe Frente',
 'back_detail': 'Detalhe Costas',
 'folded': 'Dobrada',
 };

 // Calcular créditos: 1 crédito por foto * multiplicador de resolução
 const calculateCredits = (numAngles: number): number => {
 const baseCredits = numAngles * 1;
 return baseCredits * RESOLUTION_COST[resolution];
 };

 const creditsNeeded = calculateCredits(selectedAngles.length);

 // Handler para mudança de resolução com confirmação 4K
 const handleResolutionChange = (newResolution: Resolution) => {
 if (newResolution === '4k' && !has4KConfirmation()) {
 // Primeira vez selecionando 4K - mostrar modal de confirmação
 setPending4KConfirm(true);
 setShow4KConfirmModal(true);
 return;
 }

 setResolution(newResolution);
 savePreferredResolution(newResolution);
 };

 // Confirmar seleção de 4K
 const handleConfirm4K = () => {
 setResolution('4k');
 savePreferredResolution('4k');
 setShow4KConfirmModal(false);
 setPending4KConfirm(false);
 };

 // Cancelar seleção de 4K
 const handleCancel4K = () => {
 setShow4KConfirmModal(false);
 setPending4KConfirm(false);
 };

 // Handler para abrir modal de upgrade de plano
 const handleUpgradeClick = () => {
 if (onOpenPlanModal) {
 onOpenPlanModal();
 }
 };

 // Toggle ângulo - lógica de bloqueio e avisos
 const toggleAngle = (angle: ProductStudioAngle) => {
 // Front é obrigatório — não pode desmarcar
 if (angle === 'front') return;

 // Se já está selecionado, remove
 if (selectedAngles.includes(angle)) {
 setSelectedAngles(prev => prev.filter(a => a !== angle));
 return;
 }

 // AVISO: costas ou detalhe costas SEM foto de costas
 if ((angle === 'back' || angle === 'back_detail') && !availableReferences['back']) {
 setAngleWithoutRef(angle);
 setNoRefModalMode('warning');
 setShowNoRefModal(true);
 return;
 }

 // DICA DE DETALHE: detalhe frente sem foto de detalhe frente
 if (angle === 'front_detail' && !availableReferences['front_detail']) {
 setAngleWithoutRef(angle);
 setNoRefModalMode('detail-tip');
 setShowNoRefModal(true);
 return;
 }

 // DICA DE DETALHE: detalhe costas com foto de costas, mas sem foto de detalhe costas
 if (angle === 'back_detail' && !availableReferences['back_detail']) {
 setAngleWithoutRef(angle);
 setNoRefModalMode('detail-tip');
 setShowNoRefModal(true);
 return;
 }

 // AVISO: outros ângulos sem referência (permite continuar)
 if (angle !== 'folded' && !availableReferences[angle]) {
 setAngleWithoutRef(angle);
 setNoRefModalMode('warning');
 setShowNoRefModal(true);
 return;
 }

 // Tem referência ou não precisa - adiciona normalmente
 setSelectedAngles(prev => [...prev, angle]);
 };

 // Selecionar todos os ângulos disponíveis (inclui todos, mesmo sem referência)
 const selectAllAngles = () => {
 setSelectedAngles(availableAngles.map(a => a.id));
 };

 // Limpar seleção (front sempre fica)
 const clearAngles = () => {
 setSelectedAngles(['front']);
 };

 // Obter atributos disponíveis para a categoria
 const categoryAttributes = CATEGORY_ATTRIBUTES[editedProduct.category] || [];

 // Salvar edições do produto
 const handleSaveEdit = () => {
 onUpdateProduct(product.id, {
 name: editedProduct.name,
 sku: editedProduct.sku,
 category: editedProduct.category,
 color: editedProduct.color,
 description: editedProduct.description,
 attributes: editedAttributes,
 });
 setEditMode(false);
 };

 // Cancelar edição
 const handleCancelEdit = () => {
 setEditedProduct({
 name: product.name,
 sku: product.sku,
 category: product.category || '',
 color: product.color || '',
 description: product.description || '',
 });
 setEditedAttributes(product.attributes || {});
 setEditMode(false);
 };

 // Minimizar modal
 const handleMinimize = () => {
 if (onSetMinimized) {
 onSetMinimized(true);
 }
 };

 // ═══════════════════════════════════════════════════════════════
 // Callbacks para página de resultado
 // ═══════════════════════════════════════════════════════════════

 // Salvar sessão (já está salva no produto, só marca como "confirmada")
 const handleResultSave = () => {
 // Session was already saved in product during generation
 // This callback confirms user wants to keep the images

 // After saving, stay on product page (don't return to list)
 setShowResult(false);
 setCurrentSession(null);
 // Produto já está atualizado com as imagens geradas
 };

 // Gerar novamente (volta para seleção de ângulos)
 const handleResultRegenerate = () => {
 if (currentSession) {
 // Restaurar os ângulos que foram gerados para facilitar regeneração
 setSelectedAngles(currentSession.images.map(img => img.angle));
 }
 setShowResult(false);
 setCurrentSession(null);
 };

 // Excluir sessão
 const handleResultDelete = () => {
 if (!currentSession) return;

 // Remover a sessão do produto
 const currentGenerated = product.generatedImages || {
 studioReady: [],
 cenarioCriativo: [],
 modeloIA: [],
 productStudio: []
 };

 const updatedSessions = (currentGenerated.productStudio || []).filter(
 s => s.id !== currentSession.id
 );

 onUpdateProduct(product.id, {
 generatedImages: {
 ...currentGenerated,
 productStudio: updatedSessions
 }
 });

 // Log de histórico
 if (onAddHistoryLog) {
 onAddHistoryLog(
 'Product Studio',
 `Excluído ${currentSession.images.length} fotos de "${product.name}"`,
 'success',
 [product],
 'manual',
 0
 );
 }

 setShowResult(false);
 setCurrentSession(null);
 };

 // Voltar da página de resultado
 const handleResultBack = () => {
 setShowResult(false);
 setCurrentSession(null);
 };

 // Obter imagem atual do carrossel (para download e navegação)
 const getCurrentCarouselImage = () => {
 if (viewMode === 'otimizada' && generatedImages.length > 0) {
 const safeIndex = Math.min(currentImageIndex, generatedImages.length - 1);
 return generatedImages[safeIndex];
 }
 return null;
 };

 // Download da imagem gerada atual
 const handleDownloadMainImage = async (format: 'png' | 'jpeg') => {
 const currentImg = getCurrentCarouselImage();
 if (!currentImg) return;

 try {
 if (format === 'jpeg') {
 // Converte para JPEG via canvas antes de fazer download
 const canvas = document.createElement('canvas');
 const ctx = canvas.getContext('2d');
 const img = new Image();
 img.crossOrigin = 'anonymous';

 await new Promise((resolve, reject) => {
 img.onload = resolve;
 img.onerror = reject;
 img.src = currentImg.url;
 });

 canvas.width = img.width;
 canvas.height = img.height;
 ctx?.drawImage(img, 0, 0);

 const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
 await smartDownload(dataUrl, {
 filename: `${product.sku}_${currentImg.angle}.jpg`,
 shareTitle: 'Vizzu Product Studio',
 shareText: `${product.name}`
 });
 } else {
 await smartDownload(currentImg.url, {
 filename: `${product.sku}_${currentImg.angle}.png`,
 shareTitle: 'Vizzu Product Studio',
 shareText: `${product.name}`
 });
 }
 } catch {
 window.open(currentImg.url, '_blank');
 }
 };

 // Navegar para outras ferramentas com o produto
 const handleNavigateToFeature = (destination: 'look-composer' | 'lifestyle' | 'provador') => {
 if (onNavigate) {
 const currentImg = getCurrentCarouselImage();
 onNavigate(destination, product.id, currentImg?.url || generatedImages[0]?.url);
 }
 };

 // Maximizar modal (voltar do minimizado)
 const handleMaximize = () => {
 if (onSetMinimized) {
 onSetMinimized(false);
 }
 };

 // Função para adicionar referência a um ângulo (chamada pelo modal)
 const handleAddReference = async (file: File) => {
 if (!angleWithoutRef || !userId) return;

 setUploadingRef(true);
 try {
 // Criar FormData para upload
 const formData = new FormData();
 formData.append('file', file);
 formData.append('product_id', product.id);
 formData.append('user_id', userId);
 formData.append('angle', angleWithoutRef);

 // Fazer upload via API (supondo que existe um endpoint para isso)
 // Por enquanto, vamos usar o supabase client diretamente
 const fileName = `${userId}/${product.id}/original_${angleWithoutRef}_${Date.now()}.${file.name.split('.').pop()}`;

 // Upload para o storage
 const { createClient } = await import('@supabase/supabase-js');
 const supabase = createClient(
 'https://dbdqiqehuapcicejnzyd.supabase.co',
 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiZHFpcWVodWFwY2ljZWpuenlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NjkwNTAsImV4cCI6MjA1MjU0NTA1MH0.gHFzWFLKHrNsRNB-8P8R1WKp_c__-Ft5NfvkwHPF_Ns'
 );

 const { error: uploadError } = await supabase.storage
 .from('products')
 .upload(fileName, file, { upsert: true });

 if (uploadError) throw uploadError;

 const publicUrl = `https://dbdqiqehuapcicejnzyd.supabase.co/storage/v1/object/public/products/${fileName}`;

 // Inserir registro na tabela product_images
 const { data: imageData, error: insertError } = await supabase
 .from('product_images')
 .insert({
 product_id: product.id,
 user_id: userId,
 type: 'original',
 angle: angleWithoutRef,
 storage_path: fileName,
 url: publicUrl,
 file_name: file.name,
 mime_type: file.type,
 is_primary: false
 })
 .select()
 .single();

 if (insertError) throw insertError;

 // Atualizar o produto com a nova referência
 const newOriginalImages = {
 ...product.originalImages,
 [angleWithoutRef]: {
 id: imageData.id,
 url: publicUrl,
 storagePath: fileName
 }
 };

 onUpdateProduct(product.id, {
 originalImages: newOriginalImages
 });

 // Fechar modal e selecionar o ângulo
 setShowNoRefModal(false);
 setSelectedAngles(prev => [...prev, angleWithoutRef]);
 setAngleWithoutRef(null);

 } catch (error) {
 console.error('Erro ao fazer upload:', error);
 alert('Erro ao adicionar imagem de referência. Tente novamente.');
 } finally {
 setUploadingRef(false);
 }
 };

 // Iniciar polling incremental (usado tanto por v9 direto quanto por fallback)
 const startIncrementalPolling = useCallback(() => {
 const pollStart = Date.now();
 const pending = getPendingPSGeneration();
 const numAngles = pending?.angles?.length || 5;
 const maxPollMs = Math.max(10, numAngles * 2.5) * 60 * 1000; // ~2.5 min por ângulo, mínimo 10 min

 const pollInterval = setInterval(async () => {
 if (Date.now() - pollStart > maxPollMs) {
   console.warn(`[Studio] Polling timeout — parando após ${Math.round(maxPollMs / 60000)} minutos`);
   clearInterval(pollInterval);
   clearPendingPSGeneration();
   setGenerationFinalStatus('failed');
   const setGen = onSetGenerating || setLocalIsGenerating;
   const setProg = onSetProgress || setLocalProgress;
   setGen(false);
   setProg(0);
   setIsSubmitting(false);
   if (onSetMinimized) onSetMinimized(false);
   // Se já tiver ângulos parciais prontos, mostrar resultados mesmo com timeout
   if (completedAngleStatusesRef.current && completedAngleStatusesRef.current.length > 0) {
     const partialAngles = completedAngleStatusesRef.current.filter(a => a.status === 'completed' && a.url);
     if (partialAngles.length > 0) {
       showToast(`Parte das imagens demorou mais que o esperado. Exibindo ${partialAngles.length} resultado${partialAngles.length > 1 ? 's' : ''} disponível${partialAngles.length > 1 ? 'is' : ''}.`, 'info');
       const pending = getPendingPSGeneration();
       const newImages = partialAngles.map((item, idx) => ({
         id: item.id || `timeout-${idx}`,
         url: item.url!,
         angle: (item.angle || 'front') as ProductStudioAngle,
         createdAt: new Date().toISOString()
       }));
       const newSession: ProductStudioSession = {
         id: `timeout-${Date.now()}`,
         productId: product.id,
         images: newImages,
         status: 'ready' as const,
         createdAt: new Date().toISOString()
       };
       setCurrentSession(newSession);
       setShowResult(true);
     } else {
       showToast('A geração demorou mais que o esperado e foi cancelada. Seus créditos foram devolvidos.', 'error');
     }
   } else {
     showToast('A geração demorou mais que o esperado e foi cancelada. Seus créditos foram devolvidos.', 'error');
   }
   return;
 }
 const result = await checkPendingPSGeneration();
 if (result === 'completed') {
   clearInterval(pollInterval);
   const setGen = onSetGenerating || setLocalIsGenerating;
   const setProg = onSetProgress || setLocalProgress;
   setProg(100);

   // Sempre fechar loading após conclusão — tela de resultados cuida do resto
   setTimeout(() => {
     setGen(false);
     setProg(0);
     if (onSetMinimized) onSetMinimized(false);
     setIsSubmitting(false);
   }, 1000);
 }
 }, 3000); // v9: poll a cada 3s (mais rápido que v8)

 return pollInterval;
 }, [checkPendingPSGeneration, onSetGenerating, onSetMinimized, onSetProgress]);

 // Gerar imagens
 const handleGenerate = async () => {
 if (selectedAngles.length === 0) return;

 // Lock instantâneo — previne clique duplo no MESMO tick
 if (isSubmitting) return;
 setIsSubmitting(true);

 // Verificar se há alguma geração rodando
 if (isAnyGenerationRunning) {
 setIsSubmitting(false);
 alert('Aguarde a geração atual terminar antes de iniciar uma nova.');
 return;
 }

 // Verificar créditos
 if (onCheckCredits && !onCheckCredits(creditsNeeded, 'studio')) {
 setIsSubmitting(false);
 return;
 }

 // Obter os IDs das imagens originais para TODOS os ângulos disponíveis
 const imageIds: Record<string, string | undefined> = {};

 const getImageId = (img: { id?: string; url?: string } | undefined): string | undefined => {
 if (!img) return undefined;
 if (img.id) return img.id;
 return undefined;
 };

 imageIds.front = getImageId(product.originalImages?.front) || getImageId(product.images?.[0]);
 imageIds.back = getImageId(product.originalImages?.back) || getImageId(product.images?.[1]);
 imageIds['side-left'] = getImageId(product.originalImages?.['side-left']);
 imageIds['side-right'] = getImageId(product.originalImages?.['side-right']);
 imageIds.top = getImageId(product.originalImages?.top);
 imageIds.detail = getImageId(product.originalImages?.detail);
 imageIds.front_detail = getImageId(product.originalImages?.frontDetail);
 imageIds.back_detail = getImageId(product.originalImages?.backDetail);
 imageIds['45-left'] = getImageId(product.originalImages?.['45-left']);
 imageIds['45-right'] = getImageId(product.originalImages?.['45-right']);

 if (!imageIds.front || !userId) {
 setIsSubmitting(false);
 alert('Erro: Imagem frontal ou usuário não encontrado.');
 return;
 }

 // Verificar carga do sistema antes de iniciar
 const loadInfo = await checkLoad();
 setHighDemandMessage(loadInfo.message);

 // Iniciar geração (global ou local)
 const setGenerating = onSetGenerating || setLocalIsGenerating;
 const setProgress = onSetProgress || setLocalProgress;

 setGenerating(true);
 setProgress(5);
 setPhraseIndex(0);
 setCompletedAngleStatuses([]);
 setGenerationFinalStatus(null);
 generationFinalStatusRef.current = null;
 setHighDemandMessage(null);
 setRetryAttempts({});
 setRetryingAngle(null);
 setCurrentGenerationId(null);

 // Salvar geração pendente (sem generationId por enquanto — será atualizado após resposta)
 savePendingPSGeneration({
 productId: product.id,
 productName: product.name,
 userId: userId!,
 startTime: Date.now(),
 angles: selectedAngles,
 });

 try {
 // Montar objeto de referências
 const referenceImages: Record<string, string> = {};
 if (imageIds.back) referenceImages.back = imageIds.back;
 if (imageIds['side-left']) referenceImages['side-left'] = imageIds['side-left'];
 if (imageIds['side-right']) referenceImages['side-right'] = imageIds['side-right'];
 if (imageIds['45-left']) referenceImages['45-left'] = imageIds['45-left'];
 if (imageIds['45-right']) referenceImages['45-right'] = imageIds['45-right'];
 if (imageIds.top) referenceImages.top = imageIds.top;
 if (imageIds.detail) referenceImages.detail = imageIds.detail;
 if (imageIds.front_detail) referenceImages.front_detail = imageIds.front_detail;
 if (imageIds.back_detail) referenceImages.back_detail = imageIds.back_detail;

 // Chamar a API
 const response = await generateProductStudioV2({
 productId: product.id,
 userId: userId,
 imageId: imageIds.front!,
 referenceImages: Object.keys(referenceImages).length > 0 ? referenceImages : undefined,
 angles: selectedAngles,
 presentationStyle: productType === 'clothing' ? presentationStyle : 'flat-lay',
 fabricFinish: (productType === 'clothing' ? presentationStyle : 'flat-lay') === 'flat-lay' ? fabricFinish : 'natural',
 productInfo: {
 name: product.name,
 category: product.category || editedProduct.category,
 description: product.description || editedProduct.description,
 },
 studioBackground,
 studioShadow,
 productNotes: productNotes.trim(),
 resolution,
 });

 // ═══ v9: Resposta imediata com generation_id + status 'processing' ═══
 if (response.success && response.generation_id && response.status === 'processing') {
 console.log('[Studio v9] Resposta imediata! generation_id:', response.generation_id);

 // Atualizar pending com o generationId real
 savePendingPSGeneration({
   productId: product.id,
   productName: product.name,
   userId: userId!,
   startTime: Date.now(),
   angles: selectedAngles,
   generationId: response.generation_id,
 });

 setProgress(10);

 // Iniciar polling incremental
 startIncrementalPolling();

 // Log de histórico
 if (onAddHistoryLog) {
   onAddHistoryLog(
     'Product Studio',
     `Geração iniciada: ${selectedAngles.length} fotos de "${product.name}"`,
     'success',
     [product],
     'ai',
     response.credits_used || creditsNeeded
   );
 }

 return; // Não limpar generating — polling cuida disso
 }

 // ═══ Fallback v8: webhook timeout (502/504) ═══
 if ((response as any)._serverTimeout) {
 console.warn('[Studio v8] Webhook timeout — iniciando polling fallback');
 startIncrementalPolling();
 return;
 }

 // ═══ Fallback v8: resposta completa (todos os resultados de uma vez) ═══
 clearPendingPSGeneration();

 if (!response.success || !response.results) {
 throw new Error(response.message || 'Erro ao gerar imagens');
 }

 setProgress(95);

 const newImages: ProductStudioImage[] = response.results.map((result) => ({
 id: result.id,
 url: result.url,
 angle: result.angle as ProductStudioAngle,
 createdAt: new Date().toISOString()
 }));

 setProgress(100);

 if (onAddHistoryLog) {
 onAddHistoryLog(
 'Product Studio',
 `Gerado ${selectedAngles.length} fotos profissionais de "${product.name}"`,
 'success',
 [product],
 'ai',
 response.credits_used || creditsNeeded
 );
 }

 const sessionId = response.generation_id || `session-${Date.now()}`;
 const newSession: ProductStudioSession = {
 id: sessionId,
 productId: product.id,
 images: newImages,
 status: 'ready',
 createdAt: new Date().toISOString()
 };

 const currentGenerated = product.generatedImages || {
 studioReady: [], cenarioCriativo: [], modeloIA: [], productStudio: []
 };

 onUpdateProduct(product.id, {
 generatedImages: {
 ...currentGenerated,
 productStudio: [...(currentGenerated.productStudio || []), newSession]
 }
 });

 if (userId) {
 const notifiedKey = `vizzu_bg_notified_${userId}`;
 const notified = JSON.parse(localStorage.getItem(notifiedKey) || '[]');
 notified.push(`ps-${sessionId}`);
 localStorage.setItem(notifiedKey, JSON.stringify(notified.slice(-200)));
 }

 setCurrentSession(newSession);
 setShowResult(true);
 setSelectedAngles(['front']);

 setIsSubmitting(false);
 setGenerating(false);
 setProgress(0);
 if (onSetMinimized) onSetMinimized(false);

 } catch (error) {
 const msg = error instanceof Error ? error.message : '';
 const isNetworkAbort = msg.includes('Failed to fetch') || msg.includes('Load failed') || msg.includes('NetworkError') || msg.includes('AbortError');

 if (isNetworkAbort) {
 // Rede caiu — workflow pode estar rodando, iniciar polling
 console.warn('[Studio] Rede interrompida — iniciando polling fallback');
 startIncrementalPolling();
 } else {
 // Erro real — parar tudo
 clearPendingPSGeneration();
 console.error('Erro ao gerar imagens:', error);
 alert(`Erro ao gerar imagens: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
 if (onAddHistoryLog) {
 onAddHistoryLog(
 'Product Studio',
 `Erro ao gerar fotos de "${product.name}": ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
 'error',
 [product],
 'ai',
 0
 );
 }
 setIsSubmitting(false);
 setGenerating(false);
 setProgress(0);
 if (onSetMinimized) onSetMinimized(false);
 }
 }
 };

 // ═══════════════════════════════════════════════════════════════
 // v9 3.1: RETRY DE ÂNGULO INDIVIDUAL
 // ═══════════════════════════════════════════════════════════════
 const handleRetryAngle = async (angleId: string) => {
   const frontAngle = completedAngleStatuses.find(a => a.angle === 'front' && a.status === 'completed');
   if (!frontAngle?.url || !userId || !currentGenerationId) return;

   setRetryingAngle(angleId);

   try {
     const result = await retryStudioAngle({
       productId: product.id,
       userId,
       angle: angleId,
       generationId: currentGenerationId,
       frontStudioUrl: frontAngle.url,
       presentationStyle: productType === 'clothing' ? presentationStyle : 'flat-lay',
       fabricFinish: (productType === 'clothing' ? presentationStyle : 'flat-lay') === 'flat-lay' ? fabricFinish : 'natural',
       productInfo: {
         name: product.name,
         category: product.category || editedProduct.category,
         description: product.description || editedProduct.description,
       },
       studioBackground,
       studioShadow,
       productNotes: productNotes.trim(),
       resolution,
     });

     if (result.success && result.url) {
       // Sucesso! Atualizar estado do ângulo para verde
       setCompletedAngleStatuses(prev =>
         prev.map(a => a.angle === angleId
           ? { ...a, status: 'completed' as const, url: result.url, id: result.id }
           : a
         )
       );
     } else {
       // Falha — incrementar tentativas
       setRetryAttempts(prev => ({ ...prev, [angleId]: (prev[angleId] || 0) + 1 }));
     }
   } catch {
     setRetryAttempts(prev => ({ ...prev, [angleId]: (prev[angleId] || 0) + 1 }));
   } finally {
     setRetryingAngle(null);
   }
 };

 // Detectar quando todos os ângulos ficam prontos (incluindo retries)
 useEffect(() => {
   if (!generationFinalStatus || generationFinalStatus === 'processing' || generationFinalStatus === 'completed') return;
   if (completedAngleStatuses.length === 0) return;

   const allCompleted = completedAngleStatuses.every(a => a.status === 'completed');
   if (allCompleted) {
     generationFinalStatusRef.current = 'completed';
     setGenerationFinalStatus('completed');

     // Rebuild session com todos os ângulos (incluindo retries)
     const newImages: ProductStudioImage[] = completedAngleStatuses
       .filter(a => a.status === 'completed' && a.url)
       .map((item, idx) => ({
         id: item.id || `${currentGenerationId}-${idx}`,
         url: item.url!,
         angle: (item.angle || 'front') as ProductStudioAngle,
         createdAt: new Date().toISOString()
       }));

     if (newImages.length > 0 && currentGenerationId) {
       const updatedSession: ProductStudioSession = {
         id: currentGenerationId,
         productId: product.id,
         images: newImages,
         status: 'ready',
         createdAt: new Date().toISOString()
       };

       // Atualizar sessão no produto
       const currentGenerated = product.generatedImages || {
         studioReady: [], cenarioCriativo: [], modeloIA: [], productStudio: []
       };
       const existingIdx = (currentGenerated.productStudio || []).findIndex(s => s.id === currentGenerationId);
       const updatedPS = [...(currentGenerated.productStudio || [])];
       if (existingIdx >= 0) {
         updatedPS[existingIdx] = updatedSession;
       } else {
         updatedPS.push(updatedSession);
       }
       onUpdateProduct(product.id, {
         generatedImages: { ...currentGenerated, productStudio: updatedPS }
       });

       setCurrentSession(updatedSession);
     }

     // Auto-fechar após 1s
     const setGen = onSetGenerating || setLocalIsGenerating;
     const setProg = onSetProgress || setLocalProgress;
     setTimeout(() => {
       setShowResult(true);
       setGen(false);
       setProg(0);
       if (onSetMinimized) onSetMinimized(false);
     }, 1000);
   }
 }, [completedAngleStatuses, generationFinalStatus]);

 // ═══════════════════════════════════════════════════════════════
 // v9 3.2: REPORT DE PROBLEMA
 // ═══════════════════════════════════════════════════════════════
 const handleReportSubmit = async (observation: string) => {
   if (!authUser || !reportAngle || !currentGenerationId) return;
   const frontAngle = completedAngleStatuses.find(a => a.angle === 'front' && a.status === 'completed');
   const result = await submitReport({
     userId: authUser.id,
     userEmail: authUser.email || '',
     userName: authUser.name || authUser.email || '',
     generationType: 'product-studio',
     generationId: currentGenerationId,
     productName: product.name,
     generatedImageUrl: frontAngle?.url || product.images?.[0]?.url || '',
     observation: `[Ângulo: ${reportAngle}] ${observation}`,
   });
   if (!result.success) {
     throw new Error(result.error || 'Erro ao enviar report');
   }
 };

 // Fechar modal de loading quando geração terminou com falhas
 const handleCloseFailedGeneration = () => {
   // Rebuild session com ângulos que tiveram sucesso (incluindo retries)
   const successAngles = completedAngleStatuses.filter(a => a.status === 'completed' && a.url);
   if (successAngles.length > 0 && currentGenerationId) {
     const newImages: ProductStudioImage[] = successAngles.map((item, idx) => ({
       id: item.id || `${currentGenerationId}-retry-${idx}`,
       url: item.url!,
       angle: (item.angle || 'front') as ProductStudioAngle,
       createdAt: new Date().toISOString()
     }));

     const updatedSession: ProductStudioSession = {
       id: currentGenerationId,
       productId: product.id,
       images: newImages,
       status: 'ready',
       createdAt: new Date().toISOString()
     };

     // Atualizar sessão no produto (pode ter mais imagens após retries)
     const currentGenerated = product.generatedImages || {
       studioReady: [], cenarioCriativo: [], modeloIA: [], productStudio: []
     };
     const existingIdx = (currentGenerated.productStudio || []).findIndex(s => s.id === currentGenerationId);
     const updatedPS = [...(currentGenerated.productStudio || [])];
     if (existingIdx >= 0) {
       updatedPS[existingIdx] = updatedSession;
     } else {
       updatedPS.push(updatedSession);
     }
     onUpdateProduct(product.id, {
       generatedImages: { ...currentGenerated, productStudio: updatedPS }
     });

     setCurrentSession(updatedSession);
     setShowResult(true);
   }

   // Fechar loading
   const setGen = onSetGenerating || setLocalIsGenerating;
   const setProg = onSetProgress || setLocalProgress;
   setGen(false);
   setProg(0);
   if (onSetMinimized) onSetMinimized(false);
   setRetryAttempts({});
   setRetryingAngle(null);
   setIsSubmitting(false);
 };

 // Handler para atualizar imagem editada no session (tela de resultado)
 const handleImageUpdated = (angle: string, newUrl: string) => {
 if (!currentSession) return;
 setCurrentSession({
 ...currentSession,
 images: currentSession.images.map(img =>
 img.angle === angle ? { ...img, url: newUrl } : img
 ),
 });
 };

 // Handler para atualizar imagem otimizada existente (tela do editor)
 const handleOptimizedImageUpdated = (angle: string, newUrl: string) => {
 const currentGenerated = product.generatedImages || {
 productStudio: [], studioReady: [], cenarioCriativo: [], modeloIA: []
 };
 const updatedPS = (currentGenerated.productStudio || []).map(session => ({
 ...session,
 images: session.images.map(img =>
 img.angle === angle ? { ...img, url: newUrl } : img
 ),
 }));
 onUpdateProduct(product.id, {
 generatedImages: { ...currentGenerated, productStudio: updatedPS }
 });
 };

 // ═══════════════════════════════════════════════════════════════
 // Se tem resultado para mostrar, renderiza página de resultado
 // ═══════════════════════════════════════════════════════════════
 if (showResult && currentSession) {
 return (
 <ProductStudioResult
 product={product}
 session={currentSession}
 creditsUsed={calculateCredits(currentSession.images.length)}
 userCredits={userCredits}
 onSave={handleResultSave}
 onRegenerate={handleResultRegenerate}
 onDelete={handleResultDelete}
 onBack={handleResultBack}
 editBalance={editBalance}
 regularBalance={userCredits}
 resolution={resolution}
 studioBackground={studioBackground}
 studioShadow={studioShadow}
 productNotes={productNotes}
 onImageUpdated={handleImageUpdated}
 onDeductEditCredits={onDeductEditCredits}
 theme={theme}
 />
 );
 }

 return (
 <div className={'flex-1 overflow-y-auto p-4 md:p-6 ' + (theme === 'dark' ? 'bg-black' : 'bg-gray-50')}>
 <div className="max-w-7xl mx-auto">

 {/* HEADER */}
 <div className="flex items-center justify-between mb-5">
 <div className="flex items-center gap-3">
 <button
 onClick={onBack}
 className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700' : 'bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-100 ') + ' w-10 h-10 rounded-xl flex items-center justify-center transition-all'}
 >
 <i className="fas fa-arrow-left"></i>
 </button>
 <div>
 <h1 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-extrabold'}>Product Studio</h1>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs font-serif italic'}>{product.name}</p>
 </div>
 </div>
 <div className={'flex items-center gap-1.5 px-3 py-1.5 rounded-lg ' + (theme === 'dark' ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-200 ')}>
 <i className={"fas fa-coins text-xs " + (theme === 'dark' ? 'text-neutral-400' : 'text-gray-500')}></i>
 <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-sm'}>{userCredits}</span>
 </div>
 </div>

 {/* LAYOUT 2 COLUNAS */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* COLUNA ESQUERDA - Produto */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 <div className="space-y-4">

 {/* Container de Imagem Principal com Toggle e Carrossel */}
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border overflow-hidden'}>
 {/* Toggle Original / Otimizada - só aparece se tiver fotos otimizadas */}
 {isOptimized && (
 <div className={'flex items-center justify-center gap-1 p-3 border-b ' + (theme === 'dark' ? 'border-neutral-800 bg-neutral-900' : 'border-gray-100 bg-gray-50')}>
 <button
 onClick={() => { setViewMode('original'); setCurrentImageIndex(0); }}
 className={'px-4 py-2 rounded-lg text-xs font-medium transition-all ' +
 (viewMode === 'original'
 ? (theme === 'dark' ? 'bg-white/10 text-white border border-white/15' : 'bg-gray-900 text-white')
 : (theme === 'dark' ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100')
 )
 }
 >
 <i className="fas fa-image mr-1.5"></i>
 Original
 {productImages.length > 0 && (
 <span className="ml-1.5 opacity-70">({productImages.length})</span>
 )}
 </button>
 <button
 onClick={() => { setViewMode('otimizada'); setCurrentImageIndex(0); }}
 className={'px-4 py-2 rounded-lg text-xs font-medium transition-all ' +
 (viewMode === 'otimizada'
 ? (theme === 'dark' ? 'bg-white/10 text-white border border-white/15' : 'bg-gray-900 text-white')
 : (theme === 'dark' ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100')
 )
 }
 >
 <i className="fas fa-sparkles mr-1.5"></i>
 Otimizada
 <span className="ml-1.5 opacity-70">({generatedImages.length})</span>
 </button>
 </div>
 )}

 {/* Área do Carrossel */}
 {(() => {
 const currentImages = viewMode === 'otimizada' ? generatedImages : productImages;
 const safeIndex = Math.min(currentImageIndex, Math.max(0, currentImages.length - 1));
 const currentImg = currentImages[safeIndex];

 return (
 <div className={'relative flex items-center justify-center p-4 min-h-[300px] max-h-[500px] ' + (theme === 'dark' ? 'bg-neutral-800/50' : 'bg-gray-100')}>
 {currentImg ? (
 <>
 <img
 src={viewMode === 'otimizada' ? (currentImg as any).url : (currentImg as any).url}
 alt={product.name}
 className="max-w-full max-h-[450px] object-contain rounded-lg"
 />
 {/* Badge do ângulo/tipo */}
 <div className="absolute top-3 left-3 flex items-center gap-1.5">
 <div className="px-2 py-1 bg-black/50 backdrop-blur-sm rounded-lg">
 <span className="text-white text-xs font-medium capitalize">
 {viewMode === 'otimizada' ? (currentImg as any).angle : (currentImg as any).type}
 </span>
 </div>
 {viewMode === 'otimizada' && (currentImg as any).url?.includes('/edit_') && (
 <div className="px-2 py-1 bg-blue-500/80 backdrop-blur-sm rounded-lg flex items-center gap-1">
 <i className="fas fa-pen-to-square text-white text-[8px]"></i>
 <span className="text-white text-[10px] font-medium">Editado</span>
 </div>
 )}
 </div>
 {/* Navegação do carrossel */}
 {currentImages.length > 1 && (
 <>
 <button
 onClick={() => setCurrentImageIndex(prev => prev === 0 ? currentImages.length - 1 : prev - 1)}
 className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors"
 >
 <i className="fas fa-chevron-left"></i>
 </button>
 <button
 onClick={() => setCurrentImageIndex(prev => prev === currentImages.length - 1 ? 0 : prev + 1)}
 className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors"
 >
 <i className="fas fa-chevron-right"></i>
 </button>
 {/* Indicadores */}
 <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
 {currentImages.map((_, idx) => (
 <button
 key={idx}
 onClick={() => setCurrentImageIndex(idx)}
 className={`w-2 h-2 rounded-full transition-all ${idx === safeIndex ? 'bg-white w-4' : 'bg-white/50'}`}
 />
 ))}
 </div>
 </>
 )}
 </>
 ) : (
 <div className="w-full h-64 flex flex-col items-center justify-center gap-2">
 <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-image text-4xl'}></i>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-sm'}>
 {viewMode === 'otimizada' ? 'Nenhuma foto otimizada ainda' : 'Nenhuma foto original'}
 </p>
 </div>
 )}
 </div>
 );
 })()}

 {/* Miniaturas */}
 {(() => {
 const currentImages = viewMode === 'otimizada' ? generatedImages : productImages;
 const safeIndex = Math.min(currentImageIndex, Math.max(0, currentImages.length - 1));

 if (currentImages.length <= 1) return null;

 return (
 <div className={'flex gap-2 p-3 border-t overflow-x-auto ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-100')}>
 {currentImages.map((img, idx) => (
 <button
 key={idx}
 onClick={() => setCurrentImageIndex(idx)}
 className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
 idx === safeIndex
 ? (theme === 'dark' ? 'border-white/40' : 'border-gray-900')
 : (theme === 'dark' ? 'border-neutral-700' : 'border-gray-200')
 }`}
 >
 <OptimizedImage
 src={(img as any).url}
 alt=""
 className="w-full h-full object-cover"
 size="thumb"
 />
 </button>
 ))}
 </div>
 );
 })()}

 {/* Botão Gerar Novamente (dentro do card, logo após miniaturas) */}
 {isOptimized && viewMode === 'otimizada' && generatedImages.length > 0 && (
 <div className={'border-t px-3 py-2.5 ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-100')}>
 <button
 onClick={() => setShowEditModalEditor(true)}
 className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] hover:from-[#FF5252] hover:to-[#FF8F2F] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B6B]/20"
 >
 <i className="fas fa-rotate text-sm text-white"></i>
 <span className="text-white text-sm font-semibold">Gerar novamente</span>
 </button>
 </div>
 )}
 </div>

 {/* Informações do Produto */}
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-4'}>
 <div className="flex items-center justify-between mb-4">
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold'}>
 <i className={"fas fa-info-circle mr-2 " + (theme === 'dark' ? 'text-neutral-400' : 'text-gray-500')}></i>Informações do Produto
 </h3>
 {!editMode ? (
 <button
 onClick={() => setEditMode(true)}
 className={(theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' text-xs font-medium hover:underline'}
 >
 <i className="fas fa-pen mr-1"></i>Editar
 </button>
 ) : (
 <div className="flex gap-2">
 <button
 onClick={handleCancelEdit}
 className={(theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' text-xs font-medium'}
 >
 Cancelar
 </button>
 <button
 onClick={handleSaveEdit}
 className={(theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' text-xs font-medium hover:underline'}
 >
 Salvar
 </button>
 </div>
 )}
 </div>

 {!editMode ? (
 // Modo visualização
 <div className="space-y-3">
 <div>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide'}>Nome</p>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>{product.name}</p>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide'}>SKU</p>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm'}>{product.sku}</p>
 </div>
 <div>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide'}>Categoria</p>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm'}>{product.category || '-'}</p>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide'}>Cor</p>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm'}>{product.color || '-'}</p>
 </div>
 {product.attributes && Object.keys(product.attributes).length > 0 && (
 <div>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide'}>Caimento</p>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm'}>{product.attributes.caimento || '-'}</p>
 </div>
 )}
 </div>
 {product.description && (
 <div>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide'}>Descrição</p>
 <p className={(theme === 'dark' ? 'text-neutral-300' : 'text-gray-700') + ' text-xs'}>{product.description}</p>
 </div>
 )}
 </div>
 ) : (
 // Modo edição
 <div className="space-y-3">
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide block mb-1'}>Nome</label>
 <input
 type="text"
 value={editedProduct.name}
 onChange={(e) => setEditedProduct(prev => ({ ...prev, name: e.target.value }))}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}
 />
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide block mb-1'}>SKU</label>
 <input
 type="text"
 value={editedProduct.sku}
 onChange={(e) => setEditedProduct(prev => ({ ...prev, sku: e.target.value }))}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}
 />
 </div>
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide block mb-1'}>Categoria</label>
 <select
 value={editedProduct.category}
 onChange={(e) => setEditedProduct(prev => ({ ...prev, category: e.target.value }))}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}
 >
 <option value="">Selecione</option>
 {CATEGORIES.map(cat => (
 <option key={cat} value={cat}>{cat}</option>
 ))}
 </select>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide block mb-1'}>Cor</label>
 <select
 value={editedProduct.color}
 onChange={(e) => setEditedProduct(prev => ({ ...prev, color: e.target.value }))}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}
 >
 <option value="">Selecione</option>
 {COLORS.map(color => (
 <option key={color} value={color}>{color}</option>
 ))}
 </select>
 </div>
 {categoryAttributes.length > 0 && (
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide block mb-1'}>{categoryAttributes[0].label}</label>
 <select
 value={editedAttributes[categoryAttributes[0].id] || ''}
 onChange={(e) => setEditedAttributes(prev => ({ ...prev, [categoryAttributes[0].id]: e.target.value }))}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}
 >
 <option value="">Selecione</option>
 {categoryAttributes[0].options.map(opt => (
 <option key={opt.id} value={opt.id}>{opt.label}</option>
 ))}
 </select>
 </div>
 )}
 </div>
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide block mb-1'}>Descrição</label>
 <textarea
 value={editedProduct.description}
 onChange={(e) => setEditedProduct(prev => ({ ...prev, description: e.target.value }))}
 rows={2}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm resize-none'}
 />
 </div>
 </div>
 )}
 </div>

 {/* Botões de Ação (só aparecem se o produto foi otimizado) */}
 {isOptimized && (
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-4'}>
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>
 <i className={"fas fa-magic mr-2 " + (theme === 'dark' ? 'text-neutral-400' : 'text-gray-500')}></i>Usar Imagem Otimizada
 </h3>
 <div className="grid grid-cols-2 gap-2">
 {/* Montar Look */}
 <button
 onClick={() => handleNavigateToFeature('look-composer')}
 disabled={!onNavigate}
 className={(theme === 'dark' ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-white/60 border-gray-200/60 hover:border-gray-300') + ' p-3 rounded-xl border transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-xl'}
 >
 <div className={'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 backdrop-blur-xl ' + (theme === 'dark' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
 <i className={'fas fa-layer-group text-xs ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
 </div>
 <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Montar Look</span>
 </button>

 {/* Cenário Criativo */}
 <button
 onClick={() => handleNavigateToFeature('lifestyle')}
 disabled={!onNavigate}
 className={(theme === 'dark' ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-white/60 border-gray-200/60 hover:border-gray-300') + ' p-3 rounded-xl border transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-xl'}
 >
 <div className={'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 backdrop-blur-xl ' + (theme === 'dark' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
 <i className={'fas fa-mountain-sun text-xs ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
 </div>
 <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Cenário Criativo</span>
 </button>

 {/* Vestir Cliente */}
 <button
 onClick={() => handleNavigateToFeature('provador')}
 disabled={!onNavigate}
 className={(theme === 'dark' ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-white/60 border-gray-200/60 hover:border-gray-300') + ' p-3 rounded-xl border transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-xl'}
 >
 <div className={'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 backdrop-blur-xl ' + (theme === 'dark' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
 <i className={'fas fa-user-check text-xs ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
 </div>
 <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Vestir Cliente</span>
 </button>

 {/* Download */}
 <div className="relative group">
 <button
 className={(theme === 'dark' ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-white/60 border-gray-200/60 hover:border-gray-300') + ' w-full p-3 rounded-xl border transition-all flex items-center gap-2 backdrop-blur-xl'}
 >
 <div className={'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 backdrop-blur-xl ' + (theme === 'dark' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
 <i className={'fas fa-download text-xs ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
 </div>
 <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Download</span>
 <i className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' fas fa-chevron-down text-[8px] ml-auto'}></i>
 </button>
 {/* Dropdown de formatos */}
 <div className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200 ') + ' absolute bottom-full left-0 right-0 mb-1 rounded-lg border overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10'}>
 <button
 onClick={() => handleDownloadMainImage('png')}
 className={(theme === 'dark' ? 'hover:bg-neutral-700 text-white' : 'hover:bg-gray-50 text-gray-900') + ' w-full px-3 py-2 text-xs text-left flex items-center gap-2'}
 >
 <i className={"fas fa-file-image " + (theme === 'dark' ? 'text-neutral-400' : 'text-gray-500')}></i>
 PNG (Alta qualidade)
 </button>
 <button
 onClick={() => handleDownloadMainImage('jpeg')}
 className={(theme === 'dark' ? 'hover:bg-neutral-700 text-white border-t border-neutral-700' : 'hover:bg-gray-50 text-gray-900 border-t border-gray-100') + ' w-full px-3 py-2 text-xs text-left flex items-center gap-2'}
 >
 <i className={"fas fa-file-image " + (theme === 'dark' ? 'text-neutral-400' : 'text-gray-500')}></i>
 JPEG (Arquivo menor)
 </button>
 </div>
 </div>
 </div>
 </div>
 )}

 </div>

 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* COLUNA DIREITA - Configurações */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 <div className="space-y-4">

 {/* Info do tipo de produto detectado */}
 <div className={(theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200') + ' rounded-xl p-4 border'}>
 <div className="flex items-center gap-3">
 <div className={(theme === 'dark' ? 'bg-white/10' : 'bg-gray-200') + ' w-10 h-10 rounded-lg flex items-center justify-center'}>
 <i className={(theme === 'dark' ? 'text-neutral-300' : 'text-gray-600') + ' fas ' + (productType === 'footwear' ? 'fa-shoe-prints' : productType === 'headwear' ? 'fa-hat-cowboy' : productType === 'bag' ? 'fa-bag-shopping' : productType === 'accessory' ? 'fa-glasses' : 'fa-shirt')}></i>
 </div>
 <div>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>
 {productType === 'footwear' ? 'Calçado' : productType === 'headwear' ? 'Acessório de Cabeça' : productType === 'bag' ? 'Bolsa/Mochila' : productType === 'accessory' ? 'Acessório' : 'Roupa'}
 </p>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs'}>
 {availableAngles.length} ângulos disponíveis
 </p>
 </div>
 </div>
 </div>

 {/* Seleção de Ângulos */}
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-4'}>
 <div className="flex items-center justify-between mb-4">
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold'}>
 <i className={"fas fa-camera mr-2 " + (theme === 'dark' ? 'text-neutral-400' : 'text-gray-500')}></i>Selecione os Ângulos
 </h3>
 <div className="flex gap-2">
 <button
 onClick={selectAllAngles}
 className={(theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' text-[10px] font-medium'}
 >
 Todos
 </button>
 <span className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-300')}>|</span>
 <button
 onClick={clearAngles}
 className={(theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' text-[10px] font-medium'}
 >
 Limpar
 </button>
 </div>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
 {availableAngles.map(angle => {
 const isSelected = selectedAngles.includes(angle.id);
 const isFront = angle.id === 'front';
 // Nenhum ângulo é bloqueado — todos podem ser selecionados (com aviso)
 const isBlocked = false;
 // Tem referência completa (incluindo detalhe específico)
 const hasRef = isFront || angle.id === 'folded' || availableReferences[angle.id];
 // Tem referência base mas falta detalhe específico (dica suave)
 const hasDetailTip = !isBlocked && (
 (angle.id === 'front_detail' && !availableReferences['front_detail']) ||
 (angle.id === 'back_detail' && availableReferences['back'] && !availableReferences['back_detail'])
 );
 return (
 <button
 key={angle.id}
 onClick={() => toggleAngle(angle.id)}
 disabled={isBlocked}
 className={'p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 relative ' +
 (isBlocked
 ? (theme === 'dark' ? 'bg-neutral-900 border-neutral-800 text-neutral-600 cursor-not-allowed opacity-50' : 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed opacity-50')
 : (isFront || isSelected)
 ? (theme === 'dark' ? 'bg-white/10 border-white/30 text-white' : 'bg-gray-100 border-gray-900 text-gray-900')
 : (theme === 'dark'
 ? 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600'
 : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300')
 )
 }
 >
 {/* Indicador: bloqueado (cadeado vermelho) */}
 {isBlocked && (
 <div className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
 theme === 'dark' ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-500'
 }`}>
 <i className="fas fa-lock"></i>
 </div>
 )}
 {/* Indicador: dica de detalhe (info azul) */}
 {!isBlocked && hasDetailTip && !isSelected && (
 <div className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
 theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-500'
 }`}>
 <i className="fas fa-info"></i>
 </div>
 )}
 {/* Indicador: sem referência (aviso âmbar) */}
 {!isFront && !isBlocked && !hasDetailTip && !hasRef && (
 <div className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
 theme === 'dark' ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-500'
 }`}>
 <i className="fas fa-exclamation"></i>
 </div>
 )}
 <i className={`fas ${angle.icon} text-xl`}></i>
 <span className="text-xs font-medium">{angle.label}</span>
 {(isFront || isSelected) && !isBlocked && (
 <i className="fas fa-check-circle text-green-400 text-sm"></i>
 )}
 {isBlocked && (
 <span className={(theme === 'dark' ? 'text-red-400/60' : 'text-red-400') + " text-[10px]"}>Sem foto costas</span>
 )}
 {!isFront && !isBlocked && hasDetailTip && !isSelected && (
 <span className={(theme === 'dark' ? 'text-blue-400/60' : 'text-blue-400') + " text-[10px]"}>Sem detalhe</span>
 )}
 {!isFront && !isBlocked && !hasDetailTip && !hasRef && !isSelected && (
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + " text-[10px]"}>Sem ref.</span>
 )}
 </button>
 );
 })}
 </div>

 {/* Legenda */}
 <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-neutral-800/50">
 <div className="flex items-center gap-1.5">
 <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
 <i className="fas fa-check text-green-400 text-[8px]"></i>
 </div>
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + " text-[10px]"}>Com referência</span>
 </div>
 <div className="flex items-center gap-1.5">
 <div className={"w-4 h-4 rounded-full flex items-center justify-center " + (theme === 'dark' ? "bg-blue-500/20" : "bg-blue-100")}>
 <i className={"fas fa-info text-[8px] " + (theme === 'dark' ? 'text-blue-400' : 'text-blue-500')}></i>
 </div>
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + " text-[10px]"}>Sem detalhe</span>
 </div>
 <div className="flex items-center gap-1.5">
 <div className={"w-4 h-4 rounded-full flex items-center justify-center " + (theme === 'dark' ? "bg-amber-500/20" : "bg-amber-100")}>
 <i className={"fas fa-exclamation text-[8px] " + (theme === 'dark' ? 'text-amber-400' : 'text-amber-500')}></i>
 </div>
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + " text-[10px]"}>Sem referência</span>
 </div>
 <div className="flex items-center gap-1.5">
 <div className={"w-4 h-4 rounded-full flex items-center justify-center " + (theme === 'dark' ? "bg-red-500/20" : "bg-red-100")}>
 <i className={"fas fa-lock text-[8px] " + (theme === 'dark' ? 'text-red-400' : 'text-red-500')}></i>
 </div>
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + " text-[10px]"}>Bloqueado</span>
 </div>
 </div>
 </div>

 {/* Estilo de Apresentação - Apenas para roupas */}
 {productType === 'clothing' && (
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-4'}>
 <div className="flex items-center justify-between mb-4">
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold'}>
 <i className={"fas fa-tshirt mr-2 " + (theme === 'dark' ? 'text-neutral-400' : 'text-gray-500')}></i>Estilo de Apresentação
 </h3>
 {/* Tooltip com exemplos visuais */}
 <div className="relative">
 <button
 onClick={() => setShowPresentationTooltip(!showPresentationTooltip)}
 onBlur={() => setTimeout(() => setShowPresentationTooltip(false), 200)}
 className={(theme === 'dark' ? 'text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700' : 'text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200') + ' w-6 h-6 rounded-full flex items-center justify-center transition-all'}
 >
 <i className="fas fa-question text-[10px]"></i>
 </button>
 {/* Dropdown com exemplos visuais */}
 {showPresentationTooltip && (
 <div className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200 ') + ' absolute right-0 top-8 w-80 rounded-xl border p-4 z-20'}>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs text-center mb-3'}>
 Exemplos de cada estilo:
 </p>
 <div className="grid grid-cols-2 gap-3">
 {/* Ghost Mannequin Example */}
 <div className="text-center">
 <div
 className={'relative rounded-lg overflow-hidden border-2 mb-2 cursor-pointer transition-all hover:scale-105 ' + (theme === 'dark' ? 'border-neutral-500' : 'border-gray-300')}
 onClick={(e) => {
 e.stopPropagation();
 setExpandedStyleImage({
 url: 'https://dbdqiqehuapcicejnzyd.supabase.co/storage/v1/object/public/products/314df8ec-687f-44d6-bc11-f00f0bab2bde/e587218a-950f-43f6-8de4-ff65e6c4608d/studio_front_ghost_2K_27315fcf-1e7c-481f-a9e6-c9ff9db9bfd4.png',
 label: 'Ghost Mannequin'
 });
 }}
 >
 <OptimizedImage
 src="https://dbdqiqehuapcicejnzyd.supabase.co/storage/v1/object/public/products/314df8ec-687f-44d6-bc11-f00f0bab2bde/e587218a-950f-43f6-8de4-ff65e6c4608d/studio_front_ghost_2K_27315fcf-1e7c-481f-a9e6-c9ff9db9bfd4.png"
 alt="Ghost Mannequin"
 className="w-full h-32 object-cover"
 size="thumb"
 />
 <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
 <i className="fas fa-search-plus text-white text-lg"></i>
 </div>
 </div>
 <span className="text-neutral-400 text-xs font-semibold">Ghost Mannequin</span>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] mt-1'}>
 Vestido em corpo invisível
 </p>
 </div>
 {/* Flat Lay Example */}
 <div className="text-center">
 <div
 className={'relative rounded-lg overflow-hidden border-2 mb-2 cursor-pointer transition-all hover:scale-105 ' + (theme === 'dark' ? 'border-blue-500/50' : 'border-blue-300')}
 onClick={(e) => {
 e.stopPropagation();
 setExpandedStyleImage({
 url: 'https://dbdqiqehuapcicejnzyd.supabase.co/storage/v1/object/public/products/314df8ec-687f-44d6-bc11-f00f0bab2bde/e587218a-950f-43f6-8de4-ff65e6c4608d/studio_front_flatlay_2K_38960141-980e-47f2-b84b-848d21da7430.png',
 label: 'Flat Lay'
 });
 }}
 >
 <OptimizedImage
 src="https://dbdqiqehuapcicejnzyd.supabase.co/storage/v1/object/public/products/314df8ec-687f-44d6-bc11-f00f0bab2bde/e587218a-950f-43f6-8de4-ff65e6c4608d/studio_front_flatlay_2K_38960141-980e-47f2-b84b-848d21da7430.png"
 alt="Flat Lay"
 className="w-full h-32 object-cover"
 size="thumb"
 />
 <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
 <i className="fas fa-search-plus text-white text-lg"></i>
 </div>
 </div>
 <span className="text-blue-400 text-xs font-semibold">Flat Lay</span>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] mt-1'}>
 Deitado, vista de cima
 </p>
 </div>
 </div>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] text-center mt-3'}>
 <i className="fas fa-search-plus mr-1"></i>
 Clique nas imagens para ampliar
 </p>
 </div>
 )}
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 {/* Ghost Mannequin */}
 <button
 onClick={() => setPresentationStyle('ghost-mannequin')}
 className={'p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ' +
 (presentationStyle === 'ghost-mannequin'
 ? 'bg-gradient-to-r from-[#FF6B6B]/15 to-[#FF9F43]/15 border-[#FF9F43]'
 : (theme === 'dark'
 ? 'bg-neutral-800 border-neutral-700 hover:border-neutral-600'
 : 'bg-gray-50 border-gray-200 hover:border-gray-300')
 )
 }
 >
 <div className={'w-12 h-12 rounded-xl flex items-center justify-center ' +
 (presentationStyle === 'ghost-mannequin'
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]'
 : (theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200'))
 }>
 <i className={'fas fa-person text-xl ' + (presentationStyle === 'ghost-mannequin' ? 'text-white' : (theme === 'dark' ? 'text-neutral-400' : 'text-gray-500'))}></i>
 </div>
 <span className={(presentationStyle === 'ghost-mannequin' ? (theme === 'dark' ? 'text-neutral-200' : 'text-gray-700') : (theme === 'dark' ? 'text-neutral-400' : 'text-gray-600')) + ' text-xs font-medium'}>
 Ghost Mannequin
 </span>
 {presentationStyle === 'ghost-mannequin' && (
 <i className="fas fa-check-circle text-green-400 text-sm"></i>
 )}
 </button>

 {/* Flat Lay */}
 <button
 onClick={() => setPresentationStyle('flat-lay')}
 className={'p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ' +
 (presentationStyle === 'flat-lay'
 ? 'bg-gradient-to-r from-[#FF6B6B]/15 to-[#FF9F43]/15 border-[#FF9F43]'
 : (theme === 'dark'
 ? 'bg-neutral-800 border-neutral-700 hover:border-neutral-600'
 : 'bg-gray-50 border-gray-200 hover:border-gray-300')
 )
 }
 >
 <div className={'w-12 h-12 rounded-xl flex items-center justify-center ' +
 (presentationStyle === 'flat-lay'
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]'
 : (theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200'))
 }>
 <i className={'fas fa-shirt text-xl ' + (presentationStyle === 'flat-lay' ? 'text-white' : (theme === 'dark' ? 'text-neutral-400' : 'text-gray-500'))}></i>
 </div>
 <span className={(presentationStyle === 'flat-lay' ? (theme === 'dark' ? 'text-neutral-200' : 'text-gray-700') : (theme === 'dark' ? 'text-neutral-400' : 'text-gray-600')) + ' text-xs font-medium'}>
 Flat Lay
 </span>
 {presentationStyle === 'flat-lay' && (
 <i className="fas fa-check-circle text-green-400 text-sm"></i>
 )}
 </button>
 </div>

 {/* Acabamento do Tecido — só aparece quando Flat Lay */}
 {presentationStyle === 'flat-lay' && (
 <div className="mt-4">
 <h4 className={(theme === 'dark' ? 'text-neutral-300' : 'text-gray-700') + ' text-xs font-semibold mb-2'}>
 <i className={"fas fa-wand-magic-sparkles mr-1.5 " + (theme === 'dark' ? 'text-neutral-400' : 'text-gray-500')}></i>Acabamento do Tecido
 </h4>
 <div className="grid grid-cols-2 gap-2">
 {/* Natural */}
 <button
 onClick={() => setFabricFinish('natural')}
 className={'p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1.5 ' +
 (fabricFinish === 'natural'
 ? 'bg-gradient-to-r from-[#FF6B6B]/10 to-[#FF9F43]/10 border-[#FF9F43]'
 : (theme === 'dark'
 ? 'bg-neutral-800 border-neutral-700 hover:border-neutral-600'
 : 'bg-gray-50 border-gray-200 hover:border-gray-300')
 )
 }
 >
 <div className={'w-9 h-9 rounded-lg flex items-center justify-center ' +
 (fabricFinish === 'natural'
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]'
 : (theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200'))
 }>
 <i className={'fas fa-leaf text-base ' + (fabricFinish === 'natural' ? 'text-white' : (theme === 'dark' ? 'text-neutral-400' : 'text-gray-500'))}></i>
 </div>
 <span className={(fabricFinish === 'natural' ? (theme === 'dark' ? 'text-neutral-200' : 'text-gray-700') : (theme === 'dark' ? 'text-neutral-400' : 'text-gray-600')) + ' text-[11px] font-medium'}>
 Natural
 </span>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-[9px] leading-tight text-center'}>
 Rugas e textura realistas
 </p>
 {fabricFinish === 'natural' && (
 <i className="fas fa-check-circle text-green-400 text-xs"></i>
 )}
 </button>

 {/* Passada */}
 <button
 onClick={() => setFabricFinish('pressed')}
 className={'p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1.5 ' +
 (fabricFinish === 'pressed'
 ? 'bg-gradient-to-r from-[#FF6B6B]/10 to-[#FF9F43]/10 border-[#FF9F43]'
 : (theme === 'dark'
 ? 'bg-neutral-800 border-neutral-700 hover:border-neutral-600'
 : 'bg-gray-50 border-gray-200 hover:border-gray-300')
 )
 }
 >
 <div className={'w-9 h-9 rounded-lg flex items-center justify-center ' +
 (fabricFinish === 'pressed'
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]'
 : (theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200'))
 }>
 <i className={'fas fa-wand-magic-sparkles text-base ' + (fabricFinish === 'pressed' ? 'text-white' : (theme === 'dark' ? 'text-neutral-400' : 'text-gray-500'))}></i>
 </div>
 <span className={(fabricFinish === 'pressed' ? (theme === 'dark' ? 'text-neutral-200' : 'text-gray-700') : (theme === 'dark' ? 'text-neutral-400' : 'text-gray-600')) + ' text-[11px] font-medium'}>
 Passada
 </span>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-[9px] leading-tight text-center'}>
 Lisa e sem rugas
 </p>
 {fabricFinish === 'pressed' && (
 <i className="fas fa-check-circle text-green-400 text-xs"></i>
 )}
 </button>
 </div>
 </div>
 )}
 </div>
 )}

 {/* Observações do Produto */}
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-4'}>
 <h4 className={(theme === 'dark' ? 'text-neutral-300' : 'text-gray-700') + ' text-xs font-semibold mb-2'}>
 <i className={"fas fa-circle-info mr-1.5 " + (theme === 'dark' ? 'text-neutral-400' : 'text-gray-500')}></i>Observações do produto
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' font-normal ml-1'}>(opcional)</span>
 </h4>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] leading-relaxed mb-2'}>
 Use este campo <strong>apenas</strong> para descrever detalhes estruturais que a IA pode não perceber na foto frontal, mas que devem aparecer em todos os ângulos. Não descreva cores ou formas já visíveis nas fotos.
 </p>
 <textarea
 value={productNotes}
 onChange={(e) => setProductNotes(e.target.value)}
 maxLength={300}
 rows={2}
 placeholder={'Ex: "2 zippers no topo da bolsa" · "logo bordado na manga esquerda" · "botões dourados nas costas"'}
 className={(theme === 'dark'
 ? 'bg-neutral-800 border-neutral-700 text-neutral-200 placeholder-neutral-600'
 : 'bg-gray-50 border-gray-200 text-gray-700 placeholder-gray-400'
 ) + ' w-full rounded-lg border px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#FF9F43]/50 focus:border-[#FF9F43] resize-none'}
 />
 {productNotes.length > 0 && (
 <p className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-300') + ' text-[9px] mt-1 text-right'}>
 {productNotes.length}/300
 </p>
 )}
 </div>

 {/* Fundo do Estúdio */}
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-4'}>
 <h4 className={(theme === 'dark' ? 'text-neutral-300' : 'text-gray-700') + ' text-xs font-semibold mb-2'}>
 <i className={"fas fa-fill-drip mr-1.5 " + (theme === 'dark' ? 'text-neutral-400' : 'text-gray-500')}></i>Fundo do Estúdio
 </h4>
 <div className="grid grid-cols-2 gap-2">
 {/* Cinza */}
 <button
 onClick={() => setStudioBackground('gray')}
 className={'p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1.5 ' +
 (studioBackground === 'gray'
 ? 'bg-gradient-to-r from-[#FF6B6B]/10 to-[#FF9F43]/10 border-[#FF9F43]'
 : (theme === 'dark'
 ? 'bg-neutral-800 border-neutral-700 hover:border-neutral-600'
 : 'bg-gray-50 border-gray-200 hover:border-gray-300')
 )
 }
 >
 <div className={'w-9 h-9 rounded-lg flex items-center justify-center ' +
 (studioBackground === 'gray'
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]'
 : (theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200'))
 }>
 <div className={'w-5 h-5 rounded ' + (studioBackground === 'gray' ? 'bg-white/30' : (theme === 'dark' ? 'bg-neutral-500' : 'bg-gray-400'))} style={{ backgroundColor: studioBackground === 'gray' ? undefined : '#9ca3af' }}></div>
 </div>
 <span className={(studioBackground === 'gray' ? (theme === 'dark' ? 'text-neutral-200' : 'text-gray-700') : (theme === 'dark' ? 'text-neutral-400' : 'text-gray-600')) + ' text-[11px] font-medium'}>
 Cinza
 </span>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-[9px] leading-tight text-center'}>
 Fundo cinza neutro
 </p>
 {studioBackground === 'gray' && (
 <i className="fas fa-check-circle text-green-400 text-xs"></i>
 )}
 </button>

 {/* Branco */}
 <button
 onClick={() => setStudioBackground('white')}
 className={'p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1.5 ' +
 (studioBackground === 'white'
 ? 'bg-gradient-to-r from-[#FF6B6B]/10 to-[#FF9F43]/10 border-[#FF9F43]'
 : (theme === 'dark'
 ? 'bg-neutral-800 border-neutral-700 hover:border-neutral-600'
 : 'bg-gray-50 border-gray-200 hover:border-gray-300')
 )
 }
 >
 <div className={'w-9 h-9 rounded-lg flex items-center justify-center ' +
 (studioBackground === 'white'
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]'
 : (theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200'))
 }>
 <div className={'w-5 h-5 rounded border ' + (studioBackground === 'white' ? 'bg-white/80 border-white/40' : (theme === 'dark' ? 'bg-white border-neutral-600' : 'bg-white border-gray-300'))}></div>
 </div>
 <span className={(studioBackground === 'white' ? (theme === 'dark' ? 'text-neutral-200' : 'text-gray-700') : (theme === 'dark' ? 'text-neutral-400' : 'text-gray-600')) + ' text-[11px] font-medium'}>
 Branco
 </span>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-[9px] leading-tight text-center'}>
 Fundo branco limpo
 </p>
 {studioBackground === 'white' && (
 <i className="fas fa-check-circle text-green-400 text-xs"></i>
 )}
 </button>
 </div>
 </div>

 {/* Sombra do Produto */}
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-4'}>
 <h4 className={(theme === 'dark' ? 'text-neutral-300' : 'text-gray-700') + ' text-xs font-semibold mb-2'}>
 <i className={"fas fa-cloud-sun mr-1.5 " + (theme === 'dark' ? 'text-neutral-400' : 'text-gray-500')}></i>Sombra
 </h4>
 <div className="grid grid-cols-2 gap-2">
 <button
 onClick={() => setStudioShadow('with-shadow')}
 className={'p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1.5 ' +
 (studioShadow === 'with-shadow'
 ? 'bg-gradient-to-r from-[#FF6B6B]/10 to-[#FF9F43]/10 border-[#FF9F43]'
 : (theme === 'dark'
 ? 'bg-neutral-800 border-neutral-700 hover:border-neutral-600'
 : 'bg-gray-50 border-gray-200 hover:border-gray-300')
 )
 }
 >
 <div className={'w-9 h-9 rounded-lg flex items-center justify-center ' +
 (studioShadow === 'with-shadow'
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]'
 : (theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200'))
 }>
 <i className={'fas fa-circle-half-stroke text-sm ' + (studioShadow === 'with-shadow' ? 'text-white' : (theme === 'dark' ? 'text-neutral-400' : 'text-gray-500'))}></i>
 </div>
 <span className={(studioShadow === 'with-shadow' ? (theme === 'dark' ? 'text-neutral-200' : 'text-gray-700') : (theme === 'dark' ? 'text-neutral-400' : 'text-gray-600')) + ' text-[11px] font-medium'}>
 Com sombra
 </span>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-[9px] leading-tight text-center'}>
 Sombra suave natural
 </p>
 {studioShadow === 'with-shadow' && (
 <i className="fas fa-check-circle text-green-400 text-xs"></i>
 )}
 </button>
 <button
 onClick={() => setStudioShadow('no-shadow')}
 className={'p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1.5 ' +
 (studioShadow === 'no-shadow'
 ? 'bg-gradient-to-r from-[#FF6B6B]/10 to-[#FF9F43]/10 border-[#FF9F43]'
 : (theme === 'dark'
 ? 'bg-neutral-800 border-neutral-700 hover:border-neutral-600'
 : 'bg-gray-50 border-gray-200 hover:border-gray-300')
 )
 }
 >
 <div className={'w-9 h-9 rounded-lg flex items-center justify-center ' +
 (studioShadow === 'no-shadow'
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]'
 : (theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200'))
 }>
 <i className={'fas fa-ban text-sm ' + (studioShadow === 'no-shadow' ? 'text-white' : (theme === 'dark' ? 'text-neutral-400' : 'text-gray-500'))}></i>
 </div>
 <span className={(studioShadow === 'no-shadow' ? (theme === 'dark' ? 'text-neutral-200' : 'text-gray-700') : (theme === 'dark' ? 'text-neutral-400' : 'text-gray-600')) + ' text-[11px] font-medium'}>
 Sem sombra
 </span>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-[9px] leading-tight text-center'}>
 Fundo 100% limpo
 </p>
 {studioShadow === 'no-shadow' && (
 <i className="fas fa-check-circle text-green-400 text-xs"></i>
 )}
 </button>
 </div>
 </div>

 {/* Seletor de Resolução */}
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-4'}>
 <ResolutionSelector
 resolution={resolution}
 onChange={handleResolutionChange}
 canUse4K={canUse4K}
 onUpgradeClick={handleUpgradeClick}
 theme={theme}
 disabled={isGenerating}
 />
 </div>

 {/* Resumo de Créditos */}
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-4'}>
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>
 <i className={"fas fa-receipt mr-2 " + (theme === 'dark' ? 'text-neutral-400' : 'text-gray-500')}></i>Resumo
 </h3>

 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-sm'}>Fotos selecionadas</span>
 <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>{selectedAngles.length}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-sm'}>Resolução</span>
 <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>{resolution.toUpperCase()}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-sm'}>Créditos necessários</span>
 <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-bold'}>{creditsNeeded}</span>
 </div>
 <div className={'h-px my-2 ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-200')}></div>
 <div className="flex items-center justify-between">
 <span className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-sm'}>Seus créditos</span>
 <span className={(userCredits >= creditsNeeded ? 'text-green-400' : 'text-red-400') + ' text-sm font-bold'}>{userCredits}</span>
 </div>
 </div>

 {/* Explicação de créditos */}
 <div className={(theme === 'dark' ? 'bg-neutral-800/50' : 'bg-gray-50') + ' rounded-lg p-3 mt-3'}>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>
 <i className="fas fa-info-circle mr-1"></i>
 1 crédito por foto{resolution === '4k' ? ' (x2 para 4K)' : ''}.
 </p>
 </div>
 </div>

 {/* Botão Criar */}
 <button
 onClick={() => handleGenerate()}
 disabled={selectedAngles.length === 0 || isGenerating || isSubmitting || userCredits < creditsNeeded || isAnyGenerationRunning}
 className={'w-full py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ' +
 (isGenerating
 ? 'bg-[#FF9F43] cursor-wait'
 : (selectedAngles.length === 0 || userCredits < creditsNeeded || isAnyGenerationRunning)
 ? (theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-300') + ' cursor-not-allowed opacity-50'
 : 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] hover:opacity-90 '
 )
 }
 >
 {isGenerating ? (
 <>
 <i className="fas fa-spinner fa-spin"></i>
 <span>Gerando... {currentProgress}%</span>
 </>
 ) : isAnyGenerationRunning ? (
 <>
 <i className="fas fa-clock"></i>
 <span>Aguardando outra geração...</span>
 </>
 ) : (
 <>
 <i className="fas fa-wand-magic-sparkles"></i>
 <span>Criar {selectedAngles.length > 0 ? `${selectedAngles.length} Foto${selectedAngles.length > 1 ? 's' : ''}` : 'Fotos'}</span>
 </>
 )}
 </button>

 {/* Aviso de créditos insuficientes */}
 {userCredits < creditsNeeded && selectedAngles.length > 0 && (
 <p className="text-center text-red-400 text-xs">
 <i className="fas fa-exclamation-triangle mr-1"></i>
 Créditos insuficientes
 </p>
 )}

 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* FOTOS GERADAS */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 {generatedImages.length > 0 && (
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-4 mt-4'}>
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>
 <i className="fas fa-sparkles mr-2 text-green-400"></i>Fotos Geradas
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs font-normal ml-2'}>({generatedImages.length})</span>
 </h3>
 <div className="grid grid-cols-3 gap-2">
 {generatedImages.map((img, idx) => (
 <div
 key={`gen-${idx}`}
 className={'relative rounded-lg overflow-hidden border ' + (theme === 'dark' ? 'border-neutral-700 hover:border-green-500/50' : 'border-gray-200 hover:border-green-300') + ' transition-all'}
 >
 <OptimizedImage
 src={img.url}
 alt={`${img.angle} view`}
 className="w-full aspect-square object-cover"
 size="preview"
 />
 <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
 <span className="text-white text-[10px] font-medium capitalize">{img.angle}</span>
 </div>
 {/* Botão de download */}
 <a
 href={img.url}
 download={`${product.sku}-${img.angle}.png`}
 target="_blank"
 rel="noopener noreferrer"
 className="absolute top-2 right-2 w-6 h-6 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
 >
 <i className="fas fa-download text-[10px]"></i>
 </a>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* FOTOS ORIGINAIS */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 {productImages.length > 0 && (
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-4 mt-4'}>
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>
 <i className="fas fa-image mr-2 text-neutral-400"></i>Fotos Originais
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs font-normal ml-2'}>({productImages.length})</span>
 </h3>
 <div className="grid grid-cols-3 gap-2">
 {productImages.map((img, idx) => (
 <div
 key={`orig-${idx}`}
 className={'relative rounded-lg overflow-hidden border ' + (theme === 'dark' ? 'border-neutral-700 hover:border-neutral-500' : 'border-gray-200 hover:border-gray-400') + ' transition-all'}
 >
 <OptimizedImage
 src={img.url}
 alt={img.type}
 className="w-full aspect-square object-cover"
 size="preview"
 />
 <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
 <span className="text-white text-[10px] font-medium">{img.type}</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>

 </div>

 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* MODAL - Ângulo sem imagem de referência (3 modos) */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 {showNoRefModal && angleWithoutRef && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 safe-area-all">
 {/* Backdrop */}
 <div
 className="absolute inset-0 bg-black/70 backdrop-blur-sm"
 onClick={() => {
 setShowNoRefModal(false);
 setAngleWithoutRef(null);
 }}
 ></div>

 {/* Modal */}
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + " relative z-10 w-full max-w-md rounded-2xl border overflow-hidden"}>
 {/* Header com ícone */}
 <div className="p-6 pb-4 text-center">
 {noRefModalMode === 'blocked' ? (
 <>
 <div className={"w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center " + (theme === 'dark' ? "bg-red-500/20" : "bg-red-100")}>
 <i className={"fas fa-lock text-2xl " + (theme === 'dark' ? 'text-red-400' : 'text-red-500')}></i>
 </div>
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + " text-lg font-semibold font-serif mb-2"}>
 Foto de costas necessária
 </h3>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + " text-sm"}>
 Para gerar o ângulo <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-semibold'}>{angleLabels[angleWithoutRef]}</span>,
 é necessário ter uma foto de costas do produto no cadastro.
 </p>
 </>
 ) : noRefModalMode === 'detail-tip' ? (
 <>
 <div className={"w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center " + (theme === 'dark' ? "bg-blue-500/20" : "bg-blue-100")}>
 <i className={"fas fa-info-circle text-2xl " + (theme === 'dark' ? 'text-blue-400' : 'text-blue-500')}></i>
 </div>
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + " text-lg font-semibold font-serif mb-2"}>
 Dica para melhores resultados
 </h3>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + " text-sm"}>
 A imagem de <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-semibold'}>{angleLabels[angleWithoutRef]}</span> pode
 ser gerada, mas para melhores resultados é importante enviar uma foto de referência desse ângulo no cadastro de produto.
 </p>
 </>
 ) : (
 <>
 <div className={"w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center " + (theme === 'dark' ? "bg-amber-500/20" : "bg-amber-100")}>
 <i className={"fas fa-image text-2xl " + (theme === 'dark' ? 'text-amber-400' : 'text-amber-500')}></i>
 </div>
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + " text-lg font-semibold font-serif mb-2"}>
 Sem imagem de referência
 </h3>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + " text-sm"}>
 O ângulo <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-semibold'}>{angleLabels[angleWithoutRef]}</span> não
 possui foto de referência. A IA vai gerar normalmente, mas o resultado pode não ser tão fiel ao produto real.
 </p>
 </>
 )}
 </div>

 {/* Botões */}
 <div className="px-6 pb-4 space-y-3">
 {/* Botão continuar (NÃO aparece no modo bloqueado) */}
 {noRefModalMode !== 'blocked' && (
 <button
 onClick={() => {
 setShowNoRefModal(false);
 if (angleWithoutRef) {
 setSelectedAngles(prev => [...prev, angleWithoutRef]);
 }
 setAngleWithoutRef(null);
 }}
 className="w-full px-4 py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] hover:from-[#FF5555] hover:to-[#FF9F43] text-white rounded-xl font-medium transition-all text-center flex items-center justify-center gap-2"
 >
 <i className="fas fa-check"></i>
 <span>{noRefModalMode === 'detail-tip' ? 'Entendi, gerar assim mesmo' : 'Continuar mesmo assim'}</span>
 </button>
 )}

 {/* Botão de adicionar referência com input de arquivo */}
 <label className="block">
 <input
 type="file"
 accept="image/*"
 className="hidden"
 onChange={(e) => {
 const file = e.target.files?.[0];
 if (file) {
 handleAddReference(file);
 }
 }}
 disabled={uploadingRef}
 />
 <div className={`w-full px-4 py-3 rounded-xl font-medium transition-all text-center cursor-pointer flex items-center justify-center gap-2 ${
 noRefModalMode === 'blocked'
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] hover:from-[#FF5555] hover:to-[#FF9F43] text-white'
 : (theme === 'dark' ? 'bg-neutral-800 hover:bg-neutral-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700')
 } ${uploadingRef ? 'opacity-50 cursor-wait' : ''}`}>
 {uploadingRef ? (
 <>
 <i className="fas fa-spinner fa-spin"></i>
 <span>Enviando...</span>
 </>
 ) : (
 <>
 <i className="fas fa-upload"></i>
 <span>{noRefModalMode === 'blocked' ? 'Adicionar foto de costas' : 'Adicionar foto de referência'}</span>
 </>
 )}
 </div>
 </label>

 {/* Botão cancelar / fechar */}
 <button
 onClick={() => {
 setShowNoRefModal(false);
 setAngleWithoutRef(null);
 }}
 disabled={uploadingRef}
 className={(theme === 'dark' ? 'text-neutral-500 hover:text-neutral-300' : 'text-gray-400 hover:text-gray-600') + " w-full px-4 py-2 text-sm transition-all text-center"}
 >
 {noRefModalMode === 'blocked' ? 'Fechar' : 'Cancelar'}
 </button>
 </div>

 {/* Dica contextual */}
 <div className="px-6 pb-6">
 {noRefModalMode === 'blocked' ? (
 <div className={(theme === 'dark' ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200') + " flex items-start gap-3 rounded-xl p-3 border"}>
 <i className={"fas fa-exclamation-triangle mt-0.5 " + (theme === 'dark' ? 'text-red-400' : 'text-red-500')}></i>
 <p className={(theme === 'dark' ? 'text-red-400/80' : 'text-red-600') + " text-xs"}>
 Sem a foto de costas, não é possível gerar ângulos de costas ou detalhe de costas com qualidade.
 </p>
 </div>
 ) : noRefModalMode === 'detail-tip' ? (
 <div className={(theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200') + " flex items-start gap-3 rounded-xl p-3 border"}>
 <i className={"fas fa-lightbulb mt-0.5 " + (theme === 'dark' ? 'text-blue-400' : 'text-blue-500')}></i>
 <p className={(theme === 'dark' ? 'text-blue-400/80' : 'text-blue-600') + " text-xs"}>
 Uma foto de referência desse ângulo ({angleLabels[angleWithoutRef!]}) ajuda a IA a reproduzir com mais fidelidade.
 Envie pelo cadastro do produto para melhores resultados.
 </p>
 </div>
 ) : (
 <div className={(theme === 'dark' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200') + " flex items-start gap-3 rounded-xl p-3 border"}>
 <i className="fas fa-lightbulb text-amber-400 mt-0.5"></i>
 <p className={(theme === 'dark' ? 'text-amber-400/80' : 'text-amber-600') + " text-xs"}>
 Com uma foto de referência deste ângulo, a IA reproduz melhor cores, proporções e detalhes do produto.
 </p>
 </div>
 )}
 </div>
 </div>
 </div>
 )}

 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* MODAL DE LOADING - Full Screen com Blur */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 {isGenerating && !isMinimized && (
 <div className="fixed inset-0 z-50 flex items-center justify-center">
 {/* Backdrop com blur */}
 <div className={`absolute inset-0 backdrop-blur-2xl ${theme === 'dark' ? 'bg-black/80' : 'bg-white/30'}`}></div>

 {/* Container do conteúdo */}
 <div className="relative z-10 flex flex-col items-center justify-center max-w-md mx-auto p-6">
 {/* Motion personalizado em loop (crop 20% cada lado para esconder watermark) */}
 <div className="w-64 h-64 mb-6 rounded-2xl overflow-hidden flex items-center justify-center">
 <img
 src="/Scene-1.gif"
 alt=""
 className="h-full object-cover"
 style={{ width: '140%', maxWidth: 'none' }}
 />
 </div>

 {/* Título */}
 <h2 className={`text-2xl font-bold font-serif mb-2 text-center ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
 Criando suas fotos...
 </h2>

 {/* Frase de loading */}
 <p className={`text-sm mb-6 text-center min-h-[20px] transition-all duration-300 ${theme === 'dark' ? 'text-neutral-400' : 'text-gray-500'}`}>
 {currentLoadingText}
 </p>

 {/* Barra de progresso */}
 <div className="w-full max-w-xs mb-4">
 <div className={`h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-200'}`}>
 <div
 className="h-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] rounded-full transition-all duration-500"
 style={{ width: `${currentProgress}%` }}
 ></div>
 </div>
 <p className={`text-sm font-medium text-center mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
 {currentProgress}%
 </p>
 </div>

 {/* Aviso de alta demanda */}
 {highDemandMessage && (
 <div className={`w-full max-w-xs mb-4 px-4 py-3 rounded-xl border ${theme === 'dark' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
   <div className="flex items-center gap-2">
     <i className={`fas fa-clock text-sm ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}></i>
     <p className={`text-xs ${theme === 'dark' ? 'text-amber-300' : 'text-amber-700'}`}>
       {highDemandMessage}
     </p>
   </div>
 </div>
 )}

 {/* Cards dos ângulos sendo gerados */}
 <div className="w-full max-w-xs mb-6">
 <div className="flex flex-col gap-2">
 {selectedAngles.map((angleId, idx) => {
 // v9: usar estado REAL do polling incremental (se disponível)
 const angleStatus = completedAngleStatuses.find(a => a.angle === angleId);
 const isAngleDone = angleStatus?.status === 'completed';
 const isAngleFailed = angleStatus?.status === 'failed' || (generationFinalStatus === 'failed' && !angleStatus);

 // Se não temos dados reais, usa heurística baseada no progresso
 // (para v8 fallback ou antes do primeiro poll retornar)
 const hasRealData = completedAngleStatuses.length > 0;
 let isAngleActive = false;
 if (!hasRealData) {
   const angleCount = selectedAngles.length;
   const perAngle = 90 / angleCount;
   const angleStart = idx * perAngle;
   const angleEnd = angleStart + perAngle;
   isAngleActive = currentProgress >= angleStart && currentProgress < angleEnd;
 } else {
   // Com dados reais: ativo = primeiro ângulo que ainda não completou/falhou
   const firstPendingIdx = selectedAngles.findIndex(a => {
     const s = completedAngleStatuses.find(cs => cs.angle === a);
     return !s || (s.status !== 'completed' && s.status !== 'failed');
   });
   isAngleActive = !isAngleDone && !isAngleFailed && idx === firstPendingIdx;
 }

 const config = availableAngles.find(a => a.id === angleId);
 const label = config?.label || angleLabels[angleId] || angleId;
 const icon = config?.icon || 'fa-image';

 return (
 <div
 key={angleId}
 className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-500 ${
 isAngleDone
 ? (theme === 'dark' ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200')
 : isAngleFailed
 ? (theme === 'dark' ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200')
 : isAngleActive
 ? (theme === 'dark' ? 'bg-white/10 border-white/20' : 'bg-white border-gray-300 shadow-sm')
 : (theme === 'dark' ? 'bg-neutral-900/50 border-neutral-800/50' : 'bg-gray-50/50 border-gray-200/50')
 }`}
 >
 {/* Ícone do ângulo */}
 <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all duration-500 ${
 isAngleDone
 ? 'bg-green-500/20 text-green-400'
 : isAngleFailed
 ? 'bg-red-500/20 text-red-400'
 : isAngleActive
 ? 'bg-gradient-to-br from-[#FF6B6B]/20 to-[#FF9F43]/20 text-[#FF9F43]'
 : (theme === 'dark' ? 'bg-neutral-800 text-neutral-600' : 'bg-gray-200 text-gray-400')
 }`}>
 <i className={`fas ${isAngleDone ? 'fa-check' : isAngleFailed ? 'fa-times' : icon}`}></i>
 </div>

 {/* Label + thumbnail */}
 <div className="flex-1 min-w-0">
 <span className={`text-sm font-medium transition-all duration-500 ${
 isAngleDone
 ? (theme === 'dark' ? 'text-green-400' : 'text-green-600')
 : isAngleFailed
 ? (theme === 'dark' ? 'text-red-400' : 'text-red-600')
 : isAngleActive
 ? (theme === 'dark' ? 'text-white' : 'text-gray-900')
 : (theme === 'dark' ? 'text-neutral-600' : 'text-gray-400')
 }`}>
 {label}
 </span>
 {isAngleFailed && (
 <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-red-500/70' : 'text-red-400'}`}>Falhou</p>
 )}
 </div>

 {/* Thumbnail da imagem gerada */}
 {isAngleDone && angleStatus?.url && (
 <img
 src={angleStatus.url}
 alt={label}
 className="w-8 h-8 rounded-lg object-cover border border-green-500/30"
 />
 )}

 {/* Status icon */}
 {isAngleDone && !angleStatus?.url && (
 <i className="fas fa-check-circle text-green-400 text-sm"></i>
 )}
 {isAngleFailed && (
   generationFinalStatus && generationFinalStatus !== 'processing' ? (
     retryingAngle === angleId ? (
       <i className="fas fa-spinner fa-spin text-[#FF9F43] text-sm"></i>
     ) : (retryAttempts[angleId] || 0) >= 2 ? (
       <button
         onClick={(e) => { e.stopPropagation(); setReportAngle(angleId); setShowReportModal(true); }}
         className="text-xs font-medium text-amber-400 hover:text-amber-300 whitespace-nowrap"
       >
         Reportar
       </button>
     ) : (
       <button
         onClick={(e) => { e.stopPropagation(); handleRetryAngle(angleId); }}
         className="text-xs font-medium text-[#FF9F43] hover:text-[#FF6B6B] whitespace-nowrap"
       >
         Tentar de novo
       </button>
     )
   ) : (
     <i className="fas fa-exclamation-circle text-red-400 text-sm"></i>
   )
 )}
 {isAngleActive && (
 <i className="fas fa-spinner fa-spin text-[#FF9F43] text-sm"></i>
 )}
 </div>
 );
 })}
 </div>
 {(() => {
 const doneCount = completedAngleStatuses.filter(a => a.status === 'completed').length;
 const failedCount = completedAngleStatuses.filter(a => a.status === 'failed').length;
 return (
 <p className={`text-xs text-center mt-2 ${theme === 'dark' ? 'text-neutral-600' : 'text-gray-400'}`}>
   {doneCount > 0
     ? `${doneCount} de ${selectedAngles.length} pronta${doneCount > 1 ? 's' : ''}${failedCount > 0 ? ` • ${failedCount} falha${failedCount > 1 ? 's' : ''}` : ''}`
     : `${selectedAngles.length} foto${selectedAngles.length > 1 ? 's' : ''} • ${creditsNeeded} crédito${creditsNeeded > 1 ? 's' : ''}`
   }
 </p>
 );
 })()}
 </div>

 {/* Botões de ação — mudam conforme o estado */}
 {generationFinalStatus && generationFinalStatus !== 'processing' ? (
   <>
     {/* Geração terminou com falhas — botão de fechar/ver resultados */}
     <button
       onClick={handleCloseFailedGeneration}
       className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:opacity-90`}
     >
       <i className={`fas ${completedAngleStatuses.some(a => a.status === 'completed') ? 'fa-images' : 'fa-times'}`}></i>
       <span>{completedAngleStatuses.some(a => a.status === 'completed') ? 'Ver resultados' : 'Fechar'}</span>
     </button>
     <p className={`text-xs mt-2 text-center ${theme === 'dark' ? 'text-neutral-500' : 'text-gray-400'}`}>
       Você pode tentar novamente os ângulos que falharam
     </p>
   </>
 ) : (
   <>
     {/* Ainda gerando — minimizar e cancelar */}
     <button
       onClick={handleMinimize}
       className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${theme === 'dark' ? 'bg-neutral-800 hover:bg-neutral-700 text-white' : 'bg-white/80 hover:bg-white border border-gray-200/60 text-gray-700 shadow-sm'}`}
     >
       <i className="fas fa-minus"></i>
       <span>Minimizar e continuar navegando</span>
     </button>

     <p className={`text-xs mt-3 text-center ${theme === 'dark' ? 'text-neutral-600' : 'text-gray-400'}`}>
       A geração continuará em segundo plano
     </p>

     <button
       onClick={() => {
         clearPendingPSGeneration();
         setCompletedAngleStatuses([]);
         setGenerationFinalStatus(null);
         generationFinalStatusRef.current = null;
         setRetryAttempts({});
         setRetryingAngle(null);
         setCurrentGenerationId(null);
         const setGen = onSetGenerating || setLocalIsGenerating;
         const setProg = onSetProgress || setLocalProgress;
         setGen(false);
         setProg(0);
         if (onSetMinimized) onSetMinimized(false);
       }}
       className={`mt-4 text-xs transition-all ${theme === 'dark' ? 'text-neutral-600 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
     >
       Cancelar geração
     </button>
   </>
 )}
 </div>
 </div>
 )}

 {/* BARRA MINIMIZADA - Renderizada no App.tsx para aparecer em todas as páginas */}

 {/* Lightbox Modal para visualizar imagens de estilo ampliadas */}
 {expandedStyleImage && (
 <div
 className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
 onClick={() => setExpandedStyleImage(null)}
 >
 <div className="relative max-w-3xl max-h-[90vh] mx-4">
 {/* Botão fechar */}
 <button
 onClick={() => setExpandedStyleImage(null)}
 className="absolute -top-12 right-0 text-white/80 hover:text-white transition-colors"
 >
 <i className="fas fa-times text-2xl"></i>
 </button>
 {/* Imagem ampliada */}
 <img
 src={expandedStyleImage.url}
 alt={expandedStyleImage.label}
 className="max-w-full max-h-[80vh] rounded-xl object-contain"
 onClick={(e) => e.stopPropagation()}
 />
 {/* Label */}
 <p className="text-center text-white text-lg font-semibold mt-4">
 {expandedStyleImage.label}
 </p>
 </div>
 </div>
 )}

 {/* Modal de confirmação 4K */}
 <Resolution4KConfirmModal
 isOpen={show4KConfirmModal}
 onConfirm={handleConfirm4K}
 onCancel={handleCancel4K}
 theme={theme}
 />

 {/* Modal de Report para ângulo com problema (v9 3.2) */}
 <ReportModal
   isOpen={showReportModal}
   onClose={() => { setShowReportModal(false); setReportAngle(null); }}
   onSubmit={handleReportSubmit}
   generationType="product-studio"
   productName={product.name}
   theme={theme}
 />

 {/* Modal de Edição de Imagem Otimizada */}
 {showEditModalEditor && generatedImages.length > 0 && (() => {
 const safeIdx = Math.min(currentImageIndex, generatedImages.length - 1);
 const img = generatedImages[safeIdx];
 const sessionId = img.sessionId;
 const session = (product.generatedImages?.productStudio || []).find(s => s.id === sessionId);
 const currentImage: ProductStudioImage = { id: img.url, url: img.url, angle: img.angle as ProductStudioAngle, createdAt: new Date().toISOString() };
 const dummySession: ProductStudioSession = session || { id: sessionId, productId: product.id, images: [currentImage], status: 'ready', createdAt: new Date().toISOString() };
 return (
 <StudioEditModal
   isOpen={showEditModalEditor}
   onClose={() => setShowEditModalEditor(false)}
   product={product}
   currentImage={currentImage}
   generationId={sessionId}
   session={dummySession}
   editBalance={editBalance ?? 0}
   regularBalance={userCredits}
   resolution={resolution}
   studioBackground={studioBackground}
   studioShadow={studioShadow}
   productNotes={productNotes}
   onImageUpdated={handleOptimizedImageUpdated}
   onDeductEditCredits={onDeductEditCredits}
   theme={theme}
 />
 );
 })()}
 </div>
 );
};
