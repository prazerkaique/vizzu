import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense, lazy } from 'react';
import { AuthPage } from './components/AuthPage';
import { CreditExhaustedModal } from './components/CreditExhaustedModal';
import { BulkImportModal } from './components/BulkImportModal';
import { LoadingSkeleton } from './components/LoadingSkeleton';

// Lazy loading dos componentes pesados (carrega só quando acessar)
const VizzuLookComposer = lazy(() => import('./components/LookComposer').then(m => ({ default: m.LookComposer })));
const ProductStudio = lazy(() => import('./components/ProductStudio').then(m => ({ default: m.ProductStudio })));
const VizzuProvadorWizard = lazy(() => import('./components/Provador/VizzuProvadorWizard').then(m => ({ default: m.VizzuProvadorWizard })));
const CreativeStill = lazy(() => import('./components/CreativeStill').then(m => ({ default: m.CreativeStill })));

import { Product, User, HistoryLog, Client, ClientPhoto, ClientLook, Collection, WhatsAppTemplate, LookComposition, ProductAttributes, CATEGORY_ATTRIBUTES, CompanySettings, SavedModel } from './types';
import { useUI, type Page, type SettingsTab } from './contexts/UIContext';
import { useAuth } from './contexts/AuthContext';
import { useHistory } from './contexts/HistoryContext';
import { useProducts } from './contexts/ProductsContext';
import { useClients } from './contexts/ClientsContext';
import { useCredits, PLANS, CREDIT_PACKAGES } from './hooks/useCredits';
import { useDebounce } from './hooks/useDebounce';
import { supabase } from './services/supabaseClient';
import { generateStudioReady, generateCenario, generateModeloIA, generateProvador, generateModelImages, sendWhatsAppMessage, analyzeProductImage } from './lib/api/studio';
import heic2any from 'heic2any';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { smartDownload } from './utils/downloadHelper';
import { compressImage, formatFileSize, COMPRESSION_ENABLED } from './utils/imageCompression';
import { ImageMigrationPanel } from './components/Admin/ImageMigrationPanel';
import { runFullMigration, runProductMigration, runStorageMigration } from './utils/imageMigration';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { ClientsPage } from './pages/ClientsPage';
import { ModelsPage } from './pages/ModelsPage';

// Expor funções de migração globalmente para uso via Console (F12)
declare global {
 interface Window {
 vizzu: {
 comprimirImagens: typeof runFullMigration;
 comprimirProdutos: typeof runProductMigration;
 comprimirStorage: typeof runStorageMigration;
 };
 }
}
window.vizzu = {
 comprimirImagens: runFullMigration,
 comprimirProdutos: runProductMigration,
 comprimirStorage: runStorageMigration,
};


const CATEGORY_GROUPS = [
 { id: 'cabeca', label: 'Cabeça', items: ['Bonés', 'Chapéus', 'Tiaras', 'Lenços'] },
 { id: 'parte-de-cima', label: 'Parte de Cima', items: ['Camisetas', 'Blusas', 'Regatas', 'Tops', 'Camisas', 'Bodies', 'Jaquetas', 'Casacos', 'Blazers', 'Moletons'] },
 { id: 'parte-de-baixo', label: 'Parte de Baixo', items: ['Calças', 'Shorts', 'Bermudas', 'Saias', 'Leggings', 'Shorts Fitness'] },
 { id: 'pecas-inteiras', label: 'Peças Inteiras', items: ['Vestidos', 'Macacões', 'Jardineiras', 'Biquínis', 'Maiôs'] },
 { id: 'calcados', label: 'Calçados', items: ['Tênis', 'Sandálias', 'Botas', 'Sapatos', 'Chinelos'] },
 { id: 'acessorios', label: 'Acessórios', items: ['Bolsas', 'Cintos', 'Relógios', 'Óculos', 'Bijuterias', 'Mochilas', 'Outros Acessórios'] },
];
const CATEGORIES = CATEGORY_GROUPS.flatMap(g => g.items);
// Helper para encontrar categoria pai de uma subcategoria
const getCategoryGroupBySubcategory = (subcategory: string) => CATEGORY_GROUPS.find(g => g.items.includes(subcategory));
const COLLECTIONS = ['Verão 2025', 'Inverno 2025', 'Básicos', 'Premium', 'Promoção'];
const COLORS = [
 // Básicas
 'Preto', 'Branco', 'Cinza', 'Cinza Claro', 'Cinza Escuro', 'Chumbo',
 // Azuis
 'Azul', 'Azul Claro', 'Azul Marinho', 'Azul Royal', 'Azul Bebê', 'Azul Petróleo', 'Turquesa', 'Ciano',
 // Verdes
 'Verde', 'Verde Claro', 'Verde Escuro', 'Verde Militar', 'Verde Musgo', 'Oliva', 'Menta', 'Esmeralda',
 // Vermelhos e Rosas
 'Vermelho', 'Vermelho Escuro', 'Vinho', 'Bordô', 'Marsala', 'Coral', 'Salmão',
 'Rosa', 'Rosa Claro', 'Rosa Pink', 'Rosa Bebê', 'Rosa Chá', 'Fúcsia', 'Magenta',
 // Amarelos e Laranjas
 'Amarelo', 'Amarelo Claro', 'Amarelo Ouro', 'Mostarda', 'Laranja', 'Laranja Queimado', 'Terracota', 'Pêssego',
 // Marrons e Neutros
 'Marrom', 'Marrom Claro', 'Marrom Escuro', 'Chocolate', 'Café', 'Caramelo', 'Castanho',
 'Bege', 'Creme', 'Areia', 'Nude', 'Off-White', 'Cru',
 // Roxos
 'Roxo', 'Lilás', 'Lavanda', 'Violeta', 'Uva', 'Berinjela', 'Púrpura',
 // Metálicos
 'Dourado', 'Prateado', 'Bronze', 'Cobre', 'Rose Gold', 'Champagne',
 // Especiais
 'Estampado', 'Multicolor', 'Tie-dye', 'Degradê', 'Animal Print', 'Floral', 'Xadrez', 'Listrado'
];

// PHOTO_TYPES moved to ClientsPage

const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
 { id: '1', name: 'Provador Virtual', message: 'Oi {nome}! 😍\n\nMontei esse look especial pra você:', isDefault: true },
 { id: '2', name: 'Look Completo', message: 'Oi {nome}! ✨\n\nOlha só o que separei pra você:', isDefault: false },
 { id: '3', name: 'Novidades', message: 'Oi {nome}! 👋\n\nChegou novidade que combina com você:', isDefault: false },
];

// Frases de loading do Provador - ícones neutros, mensagens engajantes
const PROVADOR_LOADING_PHRASES = [
 { text: 'Analisando a foto do cliente...', icon: 'fa-camera' },
 { text: 'Identificando medidas e proporções...', icon: 'fa-ruler' },
 { text: 'Preparando as peças selecionadas...', icon: 'fa-shirt' },
 { text: 'Ajustando caimento e modelagem...', icon: 'fa-scissors' },
 { text: 'Combinando cores e texturas...', icon: 'fa-palette' },
 { text: 'Aplicando iluminação natural...', icon: 'fa-sun' },
 { text: 'Refinando detalhes do look...', icon: 'fa-wand-magic-sparkles' },
 { text: 'Criando composição final...', icon: 'fa-layer-group' },
 { text: 'Nossa IA está caprichando...', icon: 'fa-sparkles' },
 { text: 'Quase pronto, aguarde mais um pouco...', icon: 'fa-hourglass-half' },
 { text: 'Finalizando sua imagem...', icon: 'fa-check-circle' },
];

// Page and SettingsTab types imported from UIContext

// ModelCardCarousel moved to ModelsPage

function App() {
 // UI state from context
 const { theme, setTheme, currentPage, navigateTo, goBack, settingsTab, setSettingsTab, showSettingsDropdown, setShowSettingsDropdown, sidebarCollapsed, setSidebarCollapsed, toast, showToast, successNotification, setSuccessNotification, showVideoTutorial, setShowVideoTutorial } = useUI();

 // Auth state from context
 const { user, isAuthenticated, login, loginDemo, logout } = useAuth();
 // History from context
 const { historyLogs, setHistoryLogs, addHistoryLog, loadUserHistory } = useHistory();
 // Products from context
 const { products, setProducts, loadUserProducts, updateProduct: handleUpdateProduct, deleteProduct: handleDeleteProduct, deleteSelectedProducts, isProductOptimized, getProductDisplayImage, getOptimizedImages, getOriginalImages } = useProducts();
 // Clients from context
 const { clients, setClients, clientLooks, setClientLooks, loadUserClients, saveClientToSupabase, deleteClientFromSupabase, uploadClientPhoto, saveClientPhotoToDb, loadClientPhotos, getClientPhoto } = useClients();
 // Product states moved to ProductsPage
 const [productForCreation, setProductForCreation] = useState<Product | null>(null);
 
 // clients from ClientsContext
 // historyLogs from HistoryContext
 const [showCreateClient, setShowCreateClient] = useState(false);
 // showClientDetail, clientDetailLooks, showWhatsAppLookModal, selectedLookForWhatsApp,
 // whatsAppLookMessage, isSendingWhatsAppLook, editingClient, editClientPhotos,
 // clientSearchTerm, debouncedClientSearchTerm, newClient, uploadingPhotoType,
 // processingClientPhoto, showClientPhotoSourcePicker, isSavingClient
 // all moved to ClientsPage

 const [provadorClient, setProvadorClient] = useState<Client | null>(null);
 const [provadorPhotoType, setProvadorPhotoType] = useState<ClientPhoto['type']>('frente');
 const [provadorLook, setProvadorLook] = useState<LookComposition>({});
 const [provadorMessage, setProvadorMessage] = useState(DEFAULT_WHATSAPP_TEMPLATES[0].message);
 const [provadorGeneratedImage, setProvadorGeneratedImage] = useState<string | null>(null);
 const [isGeneratingProvador, setIsGeneratingProvador] = useState(false);
 const [provadorMinimized, setProvadorMinimized] = useState(false);
 const [provadorLoadingIndex, setProvadorLoadingIndex] = useState(0);
 const [provadorProgress, setProvadorProgress] = useState(0);
 const [showClientPicker, setShowClientPicker] = useState(false);
 const [createClientFromProvador, setCreateClientFromProvador] = useState(false);
 const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate>(DEFAULT_WHATSAPP_TEMPLATES[0]);
 const [provadorStep, setProvadorStep] = useState<1 | 2 | 3 | 4>(1);
 const [provadorLookFilter, setProvadorLookFilter] = useState<string>('');
 const [provadorLookSearch, setProvadorLookSearch] = useState('');
 // clientLooks from ClientsContext
 const [savingLook, setSavingLook] = useState(false);
 const [selectedSavedLook, setSelectedSavedLook] = useState<ClientLook | null>(null);
 const [showStudioPicker, setShowStudioPicker] = useState(false);
 const [showAddProductHint, setShowAddProductHint] = useState(false);
 // showVideoTutorial from UIContext

 // Product Studio - estados de geração em background
 const [isGeneratingProductStudio, setIsGeneratingProductStudio] = useState(false);
 const [productStudioMinimized, setProductStudioMinimized] = useState(false);
 const [productStudioProgress, setProductStudioProgress] = useState(0);
 const [productStudioLoadingText, setProductStudioLoadingText] = useState('');

 // Look Composer - estados de geração em background
 const [isGeneratingLookComposer, setIsGeneratingLookComposer] = useState(false);
 const [lookComposerMinimized, setLookComposerMinimized] = useState(false);
 const [lookComposerProgress, setLookComposerProgress] = useState(0);
 const [lookComposerLoadingText, setLookComposerLoadingText] = useState('');

 // Draggable minimized bar position
 const [minimizedBarPos, setMinimizedBarPos] = useState<{ x: number; y: number }>({ x: -1, y: -1 });
 const dragRef = React.useRef<{ startX: number; startY: number; startPosX: number; startPosY: number; dragging: boolean }>({ startX: 0, startY: 0, startPosX: 0, startPosY: 0, dragging: false });

 const getMinimizedPos = React.useCallback(() => {
 if (minimizedBarPos.x === -1) return { right: 24, bottom: 24 };
 return { left: minimizedBarPos.x, top: minimizedBarPos.y };
 }, [minimizedBarPos]);

 const handleDragStart = React.useCallback((e: React.MouseEvent | React.TouchEvent) => {
 const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
 const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
 const el = (e.currentTarget as HTMLElement);
 const rect = el.getBoundingClientRect();
 dragRef.current = { startX: clientX, startY: clientY, startPosX: rect.left, startPosY: rect.top, dragging: false };

 const handleMove = (ev: MouseEvent | TouchEvent) => {
 const cx = 'touches' in ev ? ev.touches[0].clientX : ev.clientX;
 const cy = 'touches' in ev ? ev.touches[0].clientY : ev.clientY;
 const dx = cx - dragRef.current.startX;
 const dy = cy - dragRef.current.startY;
 if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragRef.current.dragging = true;
 if (dragRef.current.dragging) {
 ev.preventDefault();
 const newX = Math.max(0, Math.min(window.innerWidth - 300, dragRef.current.startPosX + dx));
 const newY = Math.max(0, Math.min(window.innerHeight - 80, dragRef.current.startPosY + dy));
 setMinimizedBarPos({ x: newX, y: newY });
 }
 };
 const handleEnd = () => {
 window.removeEventListener('mousemove', handleMove);
 window.removeEventListener('mouseup', handleEnd);
 window.removeEventListener('touchmove', handleMove);
 window.removeEventListener('touchend', handleEnd);
 };
 window.addEventListener('mousemove', handleMove);
 window.addEventListener('mouseup', handleEnd);
 window.addEventListener('touchmove', handleMove, { passive: false });
 window.addEventListener('touchend', handleEnd);
 }, []);

 const handleMinimizedClick = React.useCallback((restoreFn: () => void) => {
 if (!dragRef.current.dragging) restoreFn();
 }, []);

 // theme from UIContext

 // Detecta se está rodando como PWA standalone (sem UI do browser)
 const [isPWA, setIsPWA] = useState(false);
 useEffect(() => {
 const checkPWA = () => {
 const isStandalone = window.matchMedia('(display-mode: standalone)').matches
 || (window.navigator as any).standalone === true // iOS Safari
 || document.referrer.includes('android-app://'); // Android TWA
 setIsPWA(isStandalone);
 };
 checkPWA();
 // Listener para mudanças (raro, mas possível)
 const mediaQuery = window.matchMedia('(display-mode: standalone)');
 mediaQuery.addEventListener('change', checkPWA);
 return () => mediaQuery.removeEventListener('change', checkPWA);
 }, []);

 // Swipe navigation - estados para navegação por gestos
 const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
 const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
 const [swipeBackProgress, setSwipeBackProgress] = useState(0);
 const [isSwipeBack, setIsSwipeBack] = useState(false);

 // Páginas principais para navegação por swipe (ordem da bottom nav)
 const SWIPE_PAGES: Page[] = ['dashboard', 'products', 'create', 'models', 'clients'];

 const EDGE_ZONE = 30; // pixels da borda esquerda para ativar swipe-back
 const SWIPE_BACK_THRESHOLD = 0.10; // 10% da tela para confirmar

 // Handlers de touch para swipe navigation
 const handleTouchStart = (e: React.TouchEvent) => {
 const startX = e.targetTouches[0].clientX;
 const startY = e.targetTouches[0].clientY;
 setTouchEnd(null);
 setTouchStart({ x: startX, y: startY });

 // Detectar se começou na borda esquerda (swipe-back)
 // Ativa mesmo sem histórico — goBack() faz fallback para dashboard
 if (startX <= EDGE_ZONE && currentPage !== 'dashboard') {
 setIsSwipeBack(true);
 setSwipeBackProgress(0);
 }
 };

 const handleTouchMove = (e: React.TouchEvent) => {
 const currentX = e.targetTouches[0].clientX;
 const currentY = e.targetTouches[0].clientY;
 setTouchEnd({ x: currentX, y: currentY });

 // Atualizar progresso do swipe-back
 if (isSwipeBack && touchStart) {
 const deltaX = currentX - touchStart.x;
 const deltaY = Math.abs(currentY - touchStart.y);
 // Cancelar se movimento vertical for maior que horizontal
 if (deltaY > Math.abs(deltaX) && deltaX < 50) {
 setIsSwipeBack(false);
 setSwipeBackProgress(0);
 return;
 }
 const screenWidth = window.innerWidth;
 const progress = Math.max(0, Math.min(1, deltaX / screenWidth));
 setSwipeBackProgress(progress);
 }
 };

 const handleTouchEnd = () => {
 // Swipe-back da borda esquerda
 if (isSwipeBack) {
 if (swipeBackProgress >= SWIPE_BACK_THRESHOLD) {
 goBack();
 }
 setIsSwipeBack(false);
 setSwipeBackProgress(0);
 setTouchStart(null);
 setTouchEnd(null);
 return;
 }

 if (!touchStart || !touchEnd) return;

 const distanceX = touchStart.x - touchEnd.x;
 const distanceY = touchStart.y - touchEnd.y;
 const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);
 const minSwipeDistance = 80;

 // Só navega se for swipe horizontal e não estiver em uma feature específica
 const isMainPage = SWIPE_PAGES.includes(currentPage);
 if (!isMainPage || !isHorizontalSwipe || Math.abs(distanceX) < minSwipeDistance) {
 setTouchStart(null);
 setTouchEnd(null);
 return;
 }

 const currentIndex = SWIPE_PAGES.indexOf(currentPage);
 const isSwipeLeft = distanceX > 0;
 const isSwipeRight = distanceX < 0;

 if (isSwipeLeft && currentIndex < SWIPE_PAGES.length - 1) {
 navigateTo(SWIPE_PAGES[currentIndex + 1]);
 } else if (isSwipeRight && currentIndex > 0) {
 navigateTo(SWIPE_PAGES[currentIndex - 1]);
 }

 setTouchStart(null);
 setTouchEnd(null);
 };
 
 const [whatsappTemplates] = useState<WhatsAppTemplate[]>(DEFAULT_WHATSAPP_TEMPLATES);

 // Saved Models (shared with LookComposer)
 const [savedModels, setSavedModels] = useState<SavedModel[]>([]);
 const [showCreateModel, setShowCreateModel] = useState(false);
 // showModelDetail, editingModel, modelWizardStep, newModel, savingModel,
 // generatingModelImages, modelGenerationProgress, modelGenerationStep,
 // modelPreviewImages, showCreateDropdown, modelFilter* all moved to ModelsPage

 // Minimized Modals System
 type MinimizedModal = {
 id: string;
 title: string;
 icon: string;
 type: 'createModel' | 'modelDetail' | 'createProduct' | 'productDetail' | 'createClient' | 'clientDetail';
 progress?: number; // For showing progress in mini window
 };
 const [minimizedModals, setMinimizedModals] = useState<MinimizedModal[]>([]);

 const minimizeModal = (modal: MinimizedModal) => {
 setMinimizedModals(prev => [...prev.filter(m => m.id !== modal.id), modal]);
 // Hide the original modal
 if (modal.type === 'createModel') setShowCreateModel(false);
 // modelDetail modal moved to ModelsPage
 // createProduct and productDetail modals moved to ProductsPage
 if (modal.type === 'createClient') setShowCreateClient(false);
 // clientDetail modal moved to ClientsPage
 };

 const restoreModal = (modalId: string) => {
 const modal = minimizedModals.find(m => m.id === modalId);
 if (modal) {
 setMinimizedModals(prev => prev.filter(m => m.id !== modalId));
 // Restore the original modal
 if (modal.type === 'createModel') setShowCreateModel(true);
 // For detail modals, we'd need to store the detail object too
 }
 };

 const closeMinimizedModal = (modalId: string) => {
 setMinimizedModals(prev => prev.filter(m => m.id !== modalId));
 };

 // Credit Exhausted Modal
 const [showCreditModal, setShowCreditModal] = useState(false);
 const [creditModalContext, setCreditModalContext] = useState<{
 creditsNeeded: number;
 actionContext: 'studio' | 'cenario' | 'lifestyle' | 'video' | 'provador' | 'generic';
 }>({ creditsNeeded: 1, actionContext: 'generic' });

 // Company Settings (para geração de legendas IA)
 const [companySettings, setCompanySettings] = useState<CompanySettings>(() => {
 const saved = localStorage.getItem('vizzu_company_settings');
 if (saved) {
 try { return JSON.parse(saved); } catch { }
 }
 return {
 name: '',
 cnpj: '',
 instagram: '',
 targetAudience: '',
 voiceTone: 'casual' as const,
 voiceExamples: '',
 hashtags: [],
 emojisEnabled: true,
 captionStyle: 'media' as const,
 callToAction: '',
 };
 });

 // sidebar persistence moved to UIContext

 // Persistir company settings (localStorage + Supabase)
 useEffect(() => {
 localStorage.setItem('vizzu_company_settings', JSON.stringify(companySettings));
 // Sincronizar com Supabase se usuário estiver logado
 if (user?.id && companySettings.name) {
 saveCompanySettingsToSupabase(companySettings, user.id);
 }
 }, [companySettings, user?.id]);

 // clients + history persistence moved to their contexts

 const clientPhotoInputRef = useRef<HTMLInputElement>(null);
 // longPressTimer, longPressProductId moved to ProductsPage

 // Lottie Theme Toggle
 const dotLottieRef = useRef<any>(null);
 const dotLottieRefCallback = useCallback((dotLottie: any) => {
 dotLottieRef.current = dotLottie;
 }, []);

 // Hook de créditos com integração ao backend
 const {
 userCredits,
 currentPlan,
 billingPeriod,
 daysUntilRenewal,
 isCheckoutLoading,
 deductCredits,
 purchaseCredits,
 upgradePlan,
 addCredits,
 applyPlanChange,
 setBillingPeriod,
 setCredits,
 refresh: refreshCredits,
 } = useCredits({ userId: user?.id, enableBackend: true });

 // Função para verificar créditos e mostrar modal se insuficientes
 const checkCreditsAndShowModal = (
 creditsNeeded: number,
 actionContext: 'studio' | 'cenario' | 'lifestyle' | 'video' | 'provador' | 'generic'
 ): boolean => {
 if (userCredits >= creditsNeeded) {
 return true; // Tem créditos suficientes
 }
 // Mostrar modal de créditos insuficientes
 setCreditModalContext({ creditsNeeded, actionContext });
 setShowCreditModal(true);
 return false;
 };

 // Handler para compra de créditos
 const handleBuyCredits = async (amount: number) => {
 try {
 const result = await purchaseCredits(amount);

 if (result.checkoutUrl) {
 // Redirecionar para checkout (Stripe/Mercado Pago)
 window.open(result.checkoutUrl, '_blank');
 setShowCreditModal(false);
 // Toast informando sobre redirecionamento
 showToast('Redirecionando para pagamento...', 'info');
 } else if (result.success) {
 // Modo demo/offline - créditos adicionados localmente
 setShowCreditModal(false);
 addHistoryLog('Créditos adicionados', `${amount} créditos foram adicionados à sua conta`, 'success', [], 'system', 0);
 showToast(`${amount} créditos adicionados!`, 'success');
 } else {
 showToast(result.error || 'Erro ao processar compra', 'error');
 }
 } catch (e: any) {
 console.error('Error buying credits:', e);
 showToast('Erro ao processar compra', 'error');
 }
 };

 // Handler para upgrade de plano
 const handleUpgradePlanFromModal = async (planId: string) => {
 try {
 const result = await upgradePlan(planId);
 const plan = PLANS.find(p => p.id === planId);

 if (result.checkoutUrl) {
 // Redirecionar para checkout de assinatura
 window.open(result.checkoutUrl, '_blank');
 setShowCreditModal(false);
 showToast('Redirecionando para pagamento...', 'info');
 } else if (result.success) {
 // Modo demo/offline - plano alterado localmente
 setShowCreditModal(false);
 if (plan) {
 addHistoryLog('Plano atualizado', `Você fez upgrade para o plano ${plan.name}`, 'success', [], 'system', 0);
 showToast(`Upgrade para ${plan.name} realizado!`, 'success');
 }
 } else {
 showToast(result.error || 'Erro ao processar upgrade', 'error');
 }
 } catch (e: any) {
 console.error('Error upgrading plan:', e);
 showToast('Erro ao processar upgrade', 'error');
 }
 };

 // filteredProducts, visibleProductsCount reset moved to ProductsPage

 // filteredClients, clientsWithProvador moved to ClientsPage

// dashboardStats moved to DashboardPage

// loadUserProducts moved to ProductsContext

// loadUserClients, saveClientToSupabase, deleteClientFromSupabase moved to ClientsContext

// ═══════════════════════════════════════════════════════════════
// SINCRONIZAÇÃO DE HISTÓRICO
// ═══════════════════════════════════════════════════════════════

// loadUserHistory + saveHistoryToSupabase moved to HistoryContext

// ═══════════════════════════════════════════════════════════════
// SINCRONIZAÇÃO DE CONFIGURAÇÕES DA EMPRESA
// ═══════════════════════════════════════════════════════════════

const loadUserCompanySettings = async (_userId: string) => {
 // TODO: Tabela company_settings não existe no Supabase ainda
 // Por enquanto, usar apenas localStorage (carregado no useEffect inicial)
 // Quando a tabela for criada, descomentar o código abaixo
 return;
};

const saveCompanySettingsToSupabase = async (_settings: CompanySettings, _userId: string) => {
 // TODO: Tabela company_settings não existe no Supabase ainda
 // Por enquanto, salvar apenas em localStorage (feito automaticamente pelo useEffect)
 return;
};

 // Auth session + onAuthStateChange moved to AuthContext
 // Load user data when user changes (triggered by AuthContext)
 const prevUserIdRef = useRef<string | null>(null);
 useEffect(() => {
 if (user && user.id !== prevUserIdRef.current) {
 prevUserIdRef.current = user.id;
 loadUserProducts(user.id);
 loadUserClients(user.id);
 loadUserHistory(user.id);
 loadUserCompanySettings(user.id);
 } else if (!user) {
 prevUserIdRef.current = null;
 }
 }, [user]);

 // currentPage + theme persistence moved to UIContext

 // Controlar frases e progresso do loading do Provador
 // Tempo médio de geração: ~75 segundos (1:15)
 useEffect(() => {
 if (!isGeneratingProvador) {
 setProvadorLoadingIndex(0);
 setProvadorProgress(0);
 return;
 }

 // Atualizar frase a cada 7 segundos (11 frases em ~77 segundos)
 const phraseInterval = setInterval(() => {
 setProvadorLoadingIndex(prev => (prev + 1) % PROVADOR_LOADING_PHRASES.length);
 }, 7000);

 // Progresso calibrado para ~75 segundos até 100%
 // 0-50%: rápido (primeiros ~20s)
 // 50-80%: médio (próximos ~30s)
 // 80-100%: lento (últimos ~25s)
 const progressInterval = setInterval(() => {
 setProvadorProgress(prev => {
 if (prev >= 100) return 100; // Para em 100%

 let increment: number;
 if (prev < 50) {
 // 0-50% em ~20s (40 intervalos de 500ms) = 1.25% por intervalo
 increment = 1.25;
 } else if (prev < 80) {
 // 50-80% em ~30s (60 intervalos) = 0.5% por intervalo
 increment = 0.5;
 } else {
 // 80-100% em ~25s (50 intervalos) = 0.4% por intervalo
 increment = 0.4;
 }

 return Math.min(100, prev + increment);
 });
 }, 500);

 return () => {
 clearInterval(phraseInterval);
 clearInterval(progressInterval);
 };
 }, [isGeneratingProvador]);

 // Fechar modais com Esc (product modals moved to ProductsPage)
 useEffect(() => {
 const handleEsc = (e: KeyboardEvent) => {
 if (e.key === 'Escape') {
 // showCreateClient, showClientDetail ESC moved to ClientsPage
 if (showClientPicker) setShowClientPicker(false);
 else if (showVideoTutorial) setShowVideoTutorial(null);
 }
 };
 window.addEventListener('keydown', handleEsc);
 return () => window.removeEventListener('keydown', handleEsc);
 }, [showClientPicker, showVideoTutorial]);

 // Scroll automático para produto recém-criado moved to ProductsPage

 // handleUpdateProduct, isProductOptimized, getProductDisplayImage, getOptimizedImages, getOriginalImages moved to ProductsContext

 const handleDeductCredits = (amount: number, reason: string): boolean => {
 return deductCredits(amount, reason);
 };

 // showToast from UIContext

 // toggleProductSelection, longPress, selectAllProducts moved to ProductsPage
 // handleDeleteProduct + handleDeleteSelectedProducts moved to ProductsContext

 // Função para gerar imagens com IA via n8n
 const handleGenerateImage = async (
 product: Product, 
 toolType: 'studio' | 'cenario' | 'lifestyle' | 'provador' | 'refine',
 prompt?: string,
 opts?: any
 ): Promise<{ image: string | null; generationId: string | null }> => {
 if (!user?.id) {
 throw new Error('Usuário não autenticado');
 }

 // Pegar a imagem selecionada (passada em opts ou primeira por padrão)
 const selectedImage = opts?.selectedImage || product.images[0];
 
 if (!selectedImage?.id) {
 throw new Error('Imagem não encontrada. Certifique-se de que o produto tem imagens.');
 }

 try {
 // ═══════════════════════════════════════════════════════════
 // STUDIO READY - Fundo branco profissional
 // ═══════════════════════════════════════════════════════════
 if (toolType === 'studio') {
 const result = await generateStudioReady({
 productId: product.id,
 userId: user.id,
 imageId: selectedImage.id,
 });

 if (result.success && result.generation) {
 if (result.credits_remaining !== undefined) {
 setCredits(result.credits_remaining);
 }
 loadUserProducts(user.id);
 addHistoryLog('Imagem gerada', `Studio Ready para "${product.name}"`, 'success', [product], 'ai', 1);
 return {
 image: result.generation.image_url,
 generationId: result.generation.id,
 };
 }

 throw new Error(result.message || 'Erro ao gerar imagem');
 }

 // ═══════════════════════════════════════════════════════════
 // CENÁRIO CRIATIVO - Ambiente personalizado
 // ═══════════════════════════════════════════════════════════
 if (toolType === 'cenario') {
 if (!prompt) {
 throw new Error('Prompt do cenário é obrigatório');
 }

 const result = await generateCenario({
 productId: product.id,
 userId: user.id,
 imageId: selectedImage.id,
 prompt: prompt,
 });

 if (result.success && result.generation) {
 if (result.credits_remaining !== undefined) {
 setCredits(result.credits_remaining);
 }
 loadUserProducts(user.id);
 addHistoryLog('Imagem gerada', `Cenário Criativo para "${product.name}"`, 'success', [product], 'ai', 1);
 return {
 image: result.generation.image_url,
 generationId: result.generation.id,
 };
 }
 
 throw new Error(result.message || 'Erro ao gerar cenário');
 }

 // ═══════════════════════════════════════════════════════════
 // MODELO IA (LIFESTYLE) - Modelo humano usando produto
 // ═══════════════════════════════════════════════════════════
 if (toolType === 'lifestyle') {
 const result = await generateModeloIA({
 productId: product.id,
 userId: user.id,
 imageId: selectedImage.id,
 imageUrl: selectedImage.url || selectedImage.base64,
 modelPrompt: opts?.modelPrompt || prompt || 'Professional model',
 clothingPrompt: opts?.clothingPrompt,
 posePrompt: opts?.posePrompt,
 referenceImage: opts?.referenceImage,
 productCategory: product.category || 'clothing',
 productDescription: product.description,
 productAttributes: product.attributes, // Atributos específicos (caimento, tamanho, etc.)
 lookItems: opts?.lookItems,
 productNotes: opts?.productNotes, // Observações adicionais do produto
 modelDetails: opts?.modelDetails, // Detalhes do modelo
 onProgress: opts?.onProgress, // Callback de progresso (opcional)
 });

 if (result.success && result.generation) {
 if (result.credits_remaining !== undefined) {
 setCredits(result.credits_remaining);
 }
 loadUserProducts(user.id);
 addHistoryLog('Imagem gerada', `Modelo IA para "${product.name}"`, 'success', [product], 'ai', 3);
 return {
 image: result.generation.image_url,
 generationId: result.generation.id,
 };
 }

 throw new Error(result.message || 'Erro ao gerar modelo');
 }

 // TODO: Implementar provador e refine
 throw new Error(`Ferramenta "${toolType}" ainda não implementada no backend`);

 } catch (error: any) {
 console.error('Erro na geração:', error);
 throw error;
 }
 };

 // handleFileSelect moved to ProductsPage
 // handleImageDrop, handleDragOver, analyzeProductImageWithAI, applyDetectedProduct,
 // handleSelectDetectedProduct, handleCreateProduct, startEditProduct, handleSaveEditedProduct
 // all moved to ProductsPage

 // handleDragOver, handleRemoveClientPhoto moved to ClientsPage
 // uploadClientPhoto, saveClientPhotoToDb, loadClientPhotos moved to ClientsContext

 // handleCreateClient, handleDeleteClient, startEditingClient, processEditClientPhoto,
 // saveEditingClient all moved to ClientsPage
 // (function bodies removed - see ClientsPage)
 // ═══════════════════════════════════════════════════════════════
 // CLIENT LOOKS - Funções para gerenciar looks salvos
 // ═══════════════════════════════════════════════════════════════

 const loadClientLooks = async (clientId: string) => {
 if (!user) return;
 try {
 const { data, error } = await supabase
 .from('client_looks')
 .select('*')
 .eq('client_id', clientId)
 .eq('user_id', user.id)
 .order('created_at', { ascending: false });

 if (error) throw error;

 const looks: ClientLook[] = (data || []).map(l => ({
 id: l.id,
 clientId: l.client_id,
 userId: l.user_id,
 imageUrl: l.image_url,
 storagePath: l.storage_path,
 lookItems: l.look_items || {},
 notes: l.notes,
 createdAt: l.created_at,
 }));

 setClientLooks(looks);
 } catch (error) {
 console.error('Erro ao carregar looks:', error);
 }
 };

 const saveClientLook = async (client: Client, imageUrl: string, lookItems: LookComposition) => {
 if (!user || !client) return null;

 setSavingLook(true);
 try {
 // Fazer download da imagem e converter para blob
 const response = await fetch(imageUrl);
 if (!response.ok) {
 throw new Error(`Erro ao baixar imagem: ${response.status} ${response.statusText}`);
 }
 const blob = await response.blob();

 // Gerar nome único para o arquivo
 const fileName = `${Date.now()}.png`;
 const storagePath = `${user.id}/${client.id}/${fileName}`;

 // Upload para o Storage
 const { error: uploadError } = await supabase.storage
 .from('client-looks')
 .upload(storagePath, blob, {
 contentType: 'image/png',
 upsert: false
 });

 if (uploadError) throw uploadError;

 // Obter URL pública
 const { data: urlData } = supabase.storage
 .from('client-looks')
 .getPublicUrl(storagePath);

 const publicUrl = urlData.publicUrl;

 // Salvar no banco
 const { data, error } = await supabase
 .from('client_looks')
 .insert({
 client_id: client.id,
 user_id: user.id,
 image_url: publicUrl,
 storage_path: storagePath,
 look_items: lookItems,
 })
 .select()
 .single();

 if (error) throw error;

 const newLook: ClientLook = {
 id: data.id,
 clientId: data.client_id,
 userId: data.user_id,
 imageUrl: data.image_url,
 storagePath: data.storage_path,
 lookItems: data.look_items || {},
 createdAt: data.created_at,
 };

 setClientLooks(prev => [newLook, ...prev]);
 return newLook;
 } catch (error) {
 console.error('Erro ao salvar look:', error);
 alert('Erro ao salvar look. Tente novamente.');
 return null;
 } finally {
 setSavingLook(false);
 }
 };

 const deleteClientLook = async (look: ClientLook) => {
 if (!user) return;

 try {
 // Deletar do Storage se tiver path
 if (look.storagePath) {
 await supabase.storage
 .from('client-looks')
 .remove([look.storagePath]);
 }

 // Deletar do banco
 const { error } = await supabase
 .from('client_looks')
 .delete()
 .eq('id', look.id)
 .eq('user_id', user.id);

 if (error) throw error;

 setClientLooks(prev => prev.filter(l => l.id !== look.id));

 if (selectedSavedLook?.id === look.id) {
 setSelectedSavedLook(null);
 }
 } catch (error) {
 console.error('Erro ao deletar look:', error);
 alert('Erro ao deletar look.');
 }
 };

 // Carregar looks quando cliente é selecionado no Provador
 useEffect(() => {
 if (provadorClient) {
 loadClientLooks(provadorClient.id);
 } else {
 setClientLooks([]);
 setSelectedSavedLook(null);
 }
 }, [provadorClient?.id]);


 // Handler para salvar modelo a partir do LookComposer
 const handleSaveModel = (model: SavedModel) => {
 setSavedModels(prev => [...prev, model]);
 };

 // formatWhatsApp moved to ClientsPage

 const handleSendWhatsApp = (client: Client, message: string) => {
 const phone = client.whatsapp.replace(/\D/g, '');
 const fullPhone = phone.startsWith('55') ? phone : '55' + phone;
 const encodedMessage = encodeURIComponent(message);
 window.open('https://wa.me/' + fullPhone + '?text=' + encodedMessage, '_blank');
 };

 const handleLogout = async () => {
 await logout();
 setProducts([]);
 };
 
 const handleProvadorSendWhatsApp = async () => {
 if (!provadorClient) return;

 // Pegar a URL da imagem (gerada ou look salvo)
 const imageUrl = provadorGeneratedImage || selectedSavedLook?.imageUrl;
 const message = provadorMessage.replace('{nome}', provadorClient.firstName);

 // Se tem imagem, tenta compartilhar com Web Share API
 if (imageUrl) {
 try {
 // Baixa a imagem como blob
 const response = await fetch(imageUrl);
 const blob = await response.blob();
 const file = new File([blob], 'look.png', { type: 'image/png' });

 // Verifica se o dispositivo suporta compartilhar arquivos
 if (navigator.canShare?.({ files: [file] })) {
 await navigator.share({
 files: [file],
 text: message
 });
 return; // Sucesso - não precisa do fallback
 }
 } catch {
 // User cancelled or error - use fallback
 }

 // Fallback: WhatsApp com texto + link da imagem
 const phone = provadorClient.whatsapp?.replace(/\D/g, '') || '';
 const fullPhone = phone.startsWith('55') ? phone : '55' + phone;
 const fullMessage = message + '\n\n' + imageUrl;
 window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(fullMessage)}`, '_blank');
 } else {
 // Sem imagem - envia só o texto
 handleSendWhatsApp(provadorClient, message);
 }
 };
 
 const handleProvadorReset = () => {
 setProvadorClient(null);
 setProvadorPhotoType('frente');
 setProvadorLook({});
 setProvadorGeneratedImage(null);
 setProvadorMessage(DEFAULT_WHATSAPP_TEMPLATES[0].message);
 setProvadorStep(1);
 setProvadorLookFilter('');
 setProvadorLookSearch('');
 };

 // Funcoes auxiliares para o novo VizzuProvadorWizard
 const handleProvadorGenerateForWizard = async (
 client: Client,
 photoType: ClientPhoto['type'],
 look: LookComposition,
 resolution: '2k' | '4k' = '2k'
 ): Promise<string | null> => {
 if (!client || !user || Object.keys(look).length === 0) return null;

 // Calcular créditos baseado na resolução (3 base * multiplicador)
 const resolutionMultiplier = resolution === '4k' ? 2 : 1;
 const creditsNeeded = 3 * resolutionMultiplier;

 // Verificar creditos
 if (!checkCreditsAndShowModal(creditsNeeded, 'provador')) {
 return null;
 }

 setIsGeneratingProvador(true);
 setProvadorProgress(0);
 setProvadorLoadingIndex(0);

 // Animacao de loading
 const loadingInterval = setInterval(() => {
 setProvadorLoadingIndex(prev => (prev + 1) % PROVADOR_LOADING_PHRASES.length);
 }, 3000);

 const progressInterval = setInterval(() => {
 setProvadorProgress(prev => {
 if (prev >= 95) return prev;
 return prev + Math.random() * 5;
 });
 }, 500);

 try {
 // Obter foto do cliente
 const clientPhotoBase64 = getClientPhoto(client, photoType) || '';
 if (!clientPhotoBase64) {
 throw new Error('Foto do cliente nao encontrada');
 }

 // Remover prefixo data:image/... se existir
 const base64Clean = clientPhotoBase64.replace(/^data:image\/\w+;base64,/, '');

 // Montar lookComposition no formato esperado pelo backend
 const lookCompositionPayload: Record<string, { productId: string; imageId?: string; imageUrl: string; name: string; category: string; attributes?: Record<string, string> }> = {};

 for (const [slot, item] of Object.entries(look)) {
 if (item) {
 const product = products.find(p => p.id === item.productId);
 lookCompositionPayload[slot] = {
 productId: item.productId || '',
 imageId: item.imageId,
 imageUrl: item.image,
 name: item.name,
 category: product?.category || 'roupa',
 attributes: product?.attributes || {}
 };
 }
 }

 const result = await generateProvador({
 userId: user.id,
 clientId: client.id,
 clientName: `${client.firstName} ${client.lastName}`,
 clientPhoto: {
 type: photoType,
 base64: base64Clean
 },
 lookComposition: lookCompositionPayload,
 resolution: resolution
 });

 clearInterval(loadingInterval);
 clearInterval(progressInterval);
 setProvadorProgress(100);

 if (result.success && result.generation) {
 if (result.credits_remaining !== undefined) {
 setCredits(result.credits_remaining);
 }
 addHistoryLog('Provador gerado', `Look para ${client.firstName}`, 'success', [], 'ai', 3);
 return result.generation.image_url;
 } else {
 throw new Error(result.message || 'Erro ao gerar imagem');
 }
 } catch (error: any) {
 clearInterval(loadingInterval);
 clearInterval(progressInterval);
 console.error('Erro no Provador:', error);
 alert(error.message || 'Erro ao gerar imagem');
 return null;
 } finally {
 setIsGeneratingProvador(false);
 setProvadorProgress(0);
 }
 };

 const handleProvadorSendWhatsAppForWizard = async (client: Client, imageUrl: string, message: string, look: LookComposition) => {
 // A mensagem já vem formatada do wizard (com nome do cliente e itens do look)
 const finalMessage = message;

 // Confirmação antes de enviar
 const confirmMessage = `Deseja enviar um WhatsApp para ${client.firstName} ${client.lastName}?\n\nMensagem:\n"${finalMessage.substring(0, 200)}${finalMessage.length > 200 ? '...' : ''}"`;

 if (!window.confirm(confirmMessage)) {
 return;
 }

 try {
 // Tenta enviar via Evolution API (envia imagem diretamente no WhatsApp)
 const result = await sendWhatsAppMessage({
 phone: client.whatsapp || '',
 message: finalMessage,
 imageUrl: imageUrl,
 clientName: `${client.firstName} ${client.lastName}`,
 });

 if (result.success) {
 alert('WhatsApp enviado com sucesso!');
 return;
 }

 // Evolution API failed, try fallback
 } catch {
 // Evolution API error, use fallback
 }

 // Fallback: Web Share API (mobile) ou wa.me (desktop)
 try {
 const response = await fetch(imageUrl);
 const blob = await response.blob();
 const file = new File([blob], 'look.png', { type: 'image/png' });

 if (navigator.canShare?.({ files: [file] })) {
 await navigator.share({
 files: [file],
 text: finalMessage
 });
 return;
 }
 } catch {
 // Share API failed, use wa.me
 }

 // Final fallback: WhatsApp with text + image link
 const phone = client.whatsapp?.replace(/\D/g, '') || '';
 const fullPhone = phone.startsWith('55') ? phone : '55' + phone;
 const fullMessage = finalMessage + '\n\n' + imageUrl;
 window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(fullMessage)}`, '_blank');
 };

 const handleProvadorDownloadImage = async (imageUrl: string, clientName: string) => {
 await smartDownload(imageUrl, {
 filename: `vizzu_provador_${clientName.replace(/\s+/g, '_')}_${Date.now()}`,
 shareTitle: 'Vizzu Provador',
 shareText: `Look para ${clientName}`
 });
 };

 const handleProvadorGenerateAIMessage = async (clientName: string): Promise<string> => {
 // Gera uma mensagem personalizada que funciona bem com os itens do look abaixo
 const messages = [
 `Oi ${clientName}! 😍\n\nMontei esse look especial pra você:`,
 `Oi ${clientName}! ✨\n\nOlha só o que separei pra você:`,
 `${clientName}! 💜\n\nPrepara o coração pra esse look:`,
 `Oi ${clientName}! 🛍️\n\nVeja esse visual que criei pra você:`,
 `${clientName}! 🔥\n\nTem que ver esse look que montei:`,
 ];
 return messages[Math.floor(Math.random() * messages.length)];
 };


 const handleUpdateClientForProvador = async (client: Client) => {
 // Atualizar no estado local
 setClients(prev => prev.map(c => c.id === client.id ? client : c));

 // Salvar no localStorage
 const updatedClients = clients.map(c => c.id === client.id ? client : c);
 localStorage.setItem('vizzu_clients', JSON.stringify(updatedClients));

 // Salvar no Supabase se usuario logado
 if (user?.id) {
 try {
 await saveClientToSupabase(client, user.id);
 } catch (error) {
 console.error('Erro ao salvar cliente no Supabase:', error);
 }
 }
 };

 // addHistoryLog moved to HistoryContext as addHistoryLog

 // Função para processar imagem (converte HEIC se necessário + comprime)
 const processImageFile = async (file: File): Promise<string> => {
 try {
 let processedFile: File | Blob = file;

 // Converter HEIC/HEIF para PNG se necessário
 if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
 const convertedBlob = await heic2any({
 blob: file,
 toType: 'image/png',
 quality: 0.9
 });
 processedFile = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
 }

 // Comprimir imagem para reduzir consumo de banda
 const result = await compressImage(processedFile);

 // Log de economia (apenas em desenvolvimento)
 if (result.wasCompressed && result.savings > 0) {
 console.info(`[Compressão] ${formatFileSize(result.originalSize)} → ${formatFileSize(result.compressedSize)} (${result.savings}% menor)`);
 }

 return result.base64;
 } catch (error) {
 throw error;
 }
 };
 const handleProvadorGenerate = async () => {
 if (!provadorClient || !user || Object.keys(provadorLook).length === 0) return;

 // Verificar créditos
 if (!checkCreditsAndShowModal(10, 'provador')) {
 return;
 }

 setIsGeneratingProvador(true);
 try {
 // Obter foto do cliente
 const clientPhotoBase64 = getClientPhoto(provadorClient, provadorPhotoType) || '';
 if (!clientPhotoBase64) {
 throw new Error('Foto do cliente não encontrada');
 }

 // Remover prefixo data:image/... se existir
 const base64Clean = clientPhotoBase64.replace(/^data:image\/\w+;base64,/, '');

 // Montar lookComposition no formato esperado pelo backend
 const lookCompositionPayload: Record<string, { productId: string; imageId?: string; imageUrl: string; name: string; category: string; attributes?: Record<string, string> }> = {};

 for (const [slot, item] of Object.entries(provadorLook)) {
 if (item) {
 // Buscar produto para obter categoria e attributes
 const product = products.find(p => p.id === item.productId);
 lookCompositionPayload[slot] = {
 productId: item.productId || '',
 imageId: item.imageId,
 imageUrl: item.image,
 name: item.name,
 category: product?.category || 'roupa',
 attributes: product?.attributes || {}
 };
 }
 }

 const result = await generateProvador({
 userId: user.id,
 clientId: provadorClient.id,
 clientName: `${provadorClient.firstName} ${provadorClient.lastName}`,
 clientPhoto: {
 type: provadorPhotoType,
 base64: base64Clean
 },
 lookComposition: lookCompositionPayload
 });

 if (result.success && result.generation) {
 setProvadorGeneratedImage(result.generation.image_url);
 if (result.credits_remaining !== undefined) {
 setCredits(result.credits_remaining);
 }
 setProvadorStep(4);
 addHistoryLog('Provador gerado', `Look para ${provadorClient.firstName}`, 'success', [], 'ai', 3);
 } else {
 throw new Error(result.message || 'Erro ao gerar imagem');
 }
 } catch (error: any) {
 console.error('Erro no Provador:', error);
 alert(error.message || 'Erro ao gerar imagem');
 } finally {
 setIsGeneratingProvador(false);
 }
 };

 // ═══════════════════════════════════════════════════════════════
 // AUTH CHECK - Show AuthPage if not authenticated
 // ═══════════════════════════════════════════════════════════════
 if (!isAuthenticated) {
 return (
 <AuthPage
 onLogin={(userData) => {
 login(userData as any);
 }}
 onDemoMode={() => {
 loginDemo();
 setCredits(50);
 }}
 />
 );
 }

 // ═══════════════════════════════════════════════════════════════
 // MAIN LAYOUT - SUNO STYLE
 // ═══════════════════════════════════════════════════════════════
 return (
 <div
 className={'h-[100dvh] flex flex-col md:flex-row overflow-hidden ' + (theme === 'dark' ? 'bg-black' : 'bg-cream')}
 onTouchStart={handleTouchStart}
 onTouchMove={handleTouchMove}
 onTouchEnd={handleTouchEnd}
 >
 
 {/* DESKTOP SIDEBAR */}
 <aside className={'hidden md:flex flex-col border-r transition-all duration-200 ' + (sidebarCollapsed ? 'w-20' : 'w-52') + ' ' + (theme === 'dark' ? 'bg-neutral-950/95 backdrop-blur-xl border-neutral-800/50' : 'bg-[#efebe6] border-[#e5e6ea]')}>
 <div className={'p-4 border-b flex flex-col items-center ' + (theme === 'dark' ? 'border-neutral-900' : 'border-[#e5e6ea]')}>
 <button onClick={() => navigateTo('dashboard')} className="hover:opacity-80 transition-opacity">
 {sidebarCollapsed
 ? <img src="/favicon-96x96.png" alt="Vizzu" className="h-10 w-10" style={theme === 'dark' ? { filter: 'brightness(0) invert(1)' } : undefined} />
 : <img src={theme === 'dark' ? '/Logo2White.png' : '/Logo2Black.png'} alt="Vizzu" className="h-16" />
 }
 </button>
 {!sidebarCollapsed && <span className={'text-[9px] -mt-2.5 font-serif italic ' + (theme === 'dark' ? 'text-neutral-600' : 'text-[#373632]/60')}>Estúdio de Bolso</span>}
 <button
 onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
 title={sidebarCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
 className={'mt-2 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ' + (theme === 'dark' ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-[#373632]/50 hover:text-[#373632] hover:bg-white/60')}
 >
 <i className={'far ' + (sidebarCollapsed ? 'fa-bars' : 'fa-angles-left') + ' text-[11px]'}></i>
 </button>
 </div>
 <nav className="flex-1 p-2 space-y-1">
 {/* Dashboard */}
 <button
 onClick={() => navigateTo('dashboard')}
 title="Dashboard"
 className={'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ' +
 (sidebarCollapsed ? 'justify-center' : '') + ' ' +
 (currentPage === 'dashboard'
 ? (theme === 'dark' ? 'bg-gradient-to-r from-[#E91E8C]/15 to-[#FF9F43]/15 text-white' : 'bg-white/60 text-[#373632]')
 : (theme === 'dark' ? 'text-neutral-400 hover:text-white hover:bg-neutral-900' : 'text-[#373632] hover:text-[#373632] hover:bg-white/40')
 )
 }
 >
 <i className="fas fa-home w-4 text-[10px]"></i>{!sidebarCollapsed && 'Dashboard'}
 </button>

 {/* Produtos */}
 <button
 onClick={() => navigateTo('products')}
 title="Produtos"
 className={'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ' +
 (sidebarCollapsed ? 'justify-center' : '') + ' ' +
 (currentPage === 'products'
 ? (theme === 'dark' ? 'bg-gradient-to-r from-[#E91E8C]/15 to-[#FF9F43]/15 text-white' : 'bg-white/60 text-[#373632]')
 : (theme === 'dark' ? 'text-neutral-400 hover:text-white hover:bg-neutral-900' : 'text-[#373632] hover:text-[#373632] hover:bg-white/40')
 )
 }
 >
 <i className="fas fa-box w-4 text-[10px]"></i>{!sidebarCollapsed && 'Produtos'}
 </button>

 {/* Botão CRIAR - Destacado no Centro */}
 <div className="py-2">
 <button
 onClick={() => navigateTo('create')}
 title="Criar"
 className={'w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ' +
 (currentPage === 'create' || currentPage === 'provador' || currentPage === 'look-composer' || currentPage === 'lifestyle' || currentPage === 'creative-still' || currentPage === 'product-studio'
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white scale-[1.02]'
 : 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:scale-[1.02]'
 )
 }
 >
 <i className="fas fa-wand-magic-sparkles text-[10px]"></i>{!sidebarCollapsed && 'Criar'}
 </button>
 </div>

 {/* Modelos */}
 <button
 onClick={() => navigateTo('models')}
 title="Modelos"
 className={'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ' +
 (sidebarCollapsed ? 'justify-center' : '') + ' ' +
 (currentPage === 'models'
 ? (theme === 'dark' ? 'bg-gradient-to-r from-[#E91E8C]/15 to-[#FF9F43]/15 text-white' : 'bg-white/60 text-[#373632]')
 : (theme === 'dark' ? 'text-neutral-400 hover:text-white hover:bg-neutral-900' : 'text-[#373632] hover:text-[#373632] hover:bg-white/40')
 )
 }
 >
 <i className="fas fa-user-tie w-4 text-[10px]"></i>{!sidebarCollapsed && 'Modelos'}
 </button>

 {/* Clientes */}
 <button
 onClick={() => navigateTo('clients')}
 title="Clientes"
 className={'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ' +
 (sidebarCollapsed ? 'justify-center' : '') + ' ' +
 (currentPage === 'clients'
 ? (theme === 'dark' ? 'bg-gradient-to-r from-[#E91E8C]/15 to-[#FF9F43]/15 text-white' : 'bg-white/60 text-[#373632]')
 : (theme === 'dark' ? 'text-neutral-400 hover:text-white hover:bg-neutral-900' : 'text-[#373632] hover:text-[#373632] hover:bg-white/40')
 )
 }
 >
 <i className="fas fa-users w-4 text-[10px]"></i>{!sidebarCollapsed && 'Clientes'}
 </button>
 </nav>
 <div className={'p-3 border-t space-y-2 ' + (theme === 'dark' ? 'border-neutral-900' : 'border-[#e5e6ea]')}>
 <div className={(theme === 'dark' ? 'bg-neutral-900' : 'bg-white/40') + ' rounded-xl p-3'}>
 {!sidebarCollapsed ? (
 <>
 <div className="flex items-center justify-between mb-1.5">
 <span className={'text-[9px] font-medium uppercase tracking-wide ' + (theme === 'dark' ? 'text-neutral-400' : 'text-[#373632]/60')}>Créditos</span>
 <button onClick={() => { navigateTo('settings'); setSettingsTab('plan'); }} className={(theme === 'dark' ? 'text-[#E91E8C] hover:text-[#E91E8C]' : 'text-[#373632] hover:text-[#373632]/80') + ' text-[9px] font-medium'}>+ Add</button>
 </div>
 <p className={'text-xl font-bold ' + (theme === 'dark' ? 'text-white' : 'text-[#373632]')}>{userCredits.toLocaleString()}</p>
 <div className={'mt-2 h-1.5 rounded-full overflow-hidden ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-[#e5e6ea]')}>
 <div className={(theme === 'dark' ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]' : 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]') + ' h-full rounded-full'} style={{ width: Math.min(100, (userCredits / currentPlan.limit) * 100) + '%' }}></div>
 </div>
 </>
 ) : (
 <p className={'text-xs font-bold text-center ' + (theme === 'dark' ? 'text-white' : 'text-[#373632]')}>{userCredits}</p>
 )}
 </div>
 {/* Configurações com Dropdown */}
 <div className="relative">
 <button
 onClick={() => sidebarCollapsed ? (navigateTo('settings'), setSettingsTab('profile')) : setShowSettingsDropdown(!showSettingsDropdown)}
 title="Configurações"
 className={'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ' +
 (sidebarCollapsed ? 'justify-center' : 'justify-between') + ' ' +
 (currentPage === 'settings'
 ? (theme === 'dark' ? 'bg-gradient-to-r from-[#E91E8C]/15 to-[#FF9F43]/15 text-white' : 'bg-white/60 text-[#373632]')
 : (theme === 'dark' ? 'text-neutral-400 hover:text-white hover:bg-neutral-900' : 'text-[#373632] hover:text-[#373632] hover:bg-white/40')
 )
 }
 >
 {sidebarCollapsed ? (
 <i className="fas fa-cog w-4 text-[10px]"></i>
 ) : (
 <>
 <span className="flex items-center gap-2.5">
 <i className="fas fa-cog w-4 text-[10px]"></i>Configurações
 </span>
 <i className={'fas fa-chevron-' + (showSettingsDropdown ? 'down' : 'up') + ' text-[8px] opacity-60'}></i>
 </>
 )}
 </button>
 {/* Dropdown Up */}
 {showSettingsDropdown && !sidebarCollapsed && (
 <div className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-[#e5e6ea]') + ' absolute bottom-full mb-1 left-0 right-0 rounded-xl border overflow-hidden z-50'}>
 <button
 onClick={() => { navigateTo('settings'); setSettingsTab('profile'); setShowSettingsDropdown(false); }}
 className={'w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ' + (theme === 'dark' ? 'text-neutral-300 hover:bg-gray-300' : 'text-gray-700 hover:bg-gray-100')}
 >
 <i className="fas fa-user w-4 text-[10px] text-center"></i>Perfil
 </button>
 <button
 onClick={() => { navigateTo('settings'); setSettingsTab('appearance'); setShowSettingsDropdown(false); }}
 className={'w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ' + (theme === 'dark' ? 'text-neutral-300 hover:bg-gray-300' : 'text-gray-700 hover:bg-gray-100')}
 >
 <i className="fas fa-palette w-4 text-[10px] text-center"></i>Aparência
 </button>
 <button
 onClick={() => { navigateTo('settings'); setSettingsTab('company'); setShowSettingsDropdown(false); }}
 className={'w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ' + (theme === 'dark' ? 'text-neutral-300 hover:bg-gray-300' : 'text-gray-700 hover:bg-gray-100')}
 >
 <i className="fas fa-building w-4 text-[10px] text-center"></i>Empresa
 </button>
 <button
 onClick={() => { navigateTo('settings'); setSettingsTab('plan'); setShowSettingsDropdown(false); }}
 className={'w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ' + (theme === 'dark' ? 'text-neutral-300 hover:bg-gray-300' : 'text-gray-700 hover:bg-gray-100')}
 >
 <i className="fas fa-credit-card w-4 text-[10px] text-center"></i>Planos & Créditos
 </button>
 <button
 onClick={() => { navigateTo('settings'); setSettingsTab('integrations'); setShowSettingsDropdown(false); }}
 className={'w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ' + (theme === 'dark' ? 'text-neutral-300 hover:bg-gray-300' : 'text-gray-700 hover:bg-gray-100')}
 >
 <i className="fas fa-plug w-4 text-[10px] text-center"></i>Integrações
 </button>
 <div className={(theme === 'dark' ? 'border-neutral-700' : 'border-[#e5e6ea]') + ' border-t'}></div>
 <button
 onClick={() => { navigateTo('settings'); setSettingsTab('history'); setShowSettingsDropdown(false); }}
 className={'w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ' + (theme === 'dark' ? 'text-neutral-300 hover:bg-gray-300' : 'text-gray-700 hover:bg-gray-100')}
 >
 <i className="fas fa-clock-rotate-left w-4 text-[10px] text-center"></i>Histórico
 </button>
 </div>
 )}
 </div>
 <div className={'flex items-center gap-2.5 px-2 py-2 ' + (sidebarCollapsed ? 'justify-center' : '')}>
 <div className={'w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-white/40')}>
 {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="" /> : <i className={'fas fa-user text-xs ' + (theme === 'dark' ? 'text-white/70' : 'text-[#373632]/60')}></i>}
 </div>
 {!sidebarCollapsed && (
 <div className="flex-1 min-w-0">
 <p className={'text-xs font-medium truncate ' + (theme === 'dark' ? 'text-white' : 'text-[#373632]')}>{user?.name}</p>
 <p className={'text-[9px] ' + (theme === 'dark' ? 'text-neutral-600' : 'text-[#373632]/60')}>Plano {currentPlan.name}</p>
 </div>
 )}
 </div>
 </div>
 </aside>

 {/* MAIN CONTENT */}
 <main className={'flex-1 overflow-hidden flex flex-col md:pt-0 md:pb-0 ' + (!['product-studio', 'provador', 'look-composer', 'lifestyle', 'creative-still'].includes(currentPage) ? 'pt-12 pb-16' : '')} style={{ overscrollBehavior: 'contain' }}>

 {/* MOBILE TOP HEADER - Esconde quando está dentro das features de criação */}
 {!['product-studio', 'provador', 'look-composer', 'lifestyle', 'creative-still'].includes(currentPage) && (
 <div
 className={'md:hidden fixed top-0 left-0 right-0 z-40 px-4 py-2.5 flex items-center justify-between border-b ' + (theme === 'dark' ? 'bg-neutral-950/95 border-neutral-800 backdrop-blur-sm' : 'bg-cream/95 border-gray-200 backdrop-blur-sm')}
 style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}
 >
 <button onClick={() => navigateTo('dashboard')} className="flex items-center hover:opacity-80 transition-opacity">
 <img src={theme === 'dark' ? '/Logo2White.png' : '/Logo2Black.png'} alt="Vizzu" className="h-11" />
 </button>
 <div className="flex items-center gap-2">
 <button
 onClick={() => { navigateTo('settings'); setSettingsTab('plan'); }}
 className={'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ' + (theme === 'dark' ? 'bg-white/10 text-neutral-300 border border-white/15' : 'bg-gray-100 text-gray-600 border border-gray-200')}
 >
 <i className="fas fa-coins text-[10px]"></i>
 <span>{userCredits}</span>
 </button>
 <button
 onClick={() => navigateTo('settings')}
 className={'w-8 h-8 rounded-lg flex items-center justify-center transition-colors ' + (theme === 'dark' ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100')}
 >
 <i className="fas fa-cog text-sm"></i>
 </button>
 </div>
 </div>
 )}

 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* DASHBOARD */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 {currentPage === 'dashboard' && <DashboardPage />}

 {/* PÁGINA VIZZU CREATION - Hub de Features */}
 {currentPage === 'create' && (
 <div className={'flex-1 overflow-y-auto p-4 md:p-6 ' + (theme === 'dark' ? '' : 'bg-cream')}>
 <style>{`
 .creation-card {
 transition: all 0.3s ease;
 }
 .creation-card:hover {
 transform: translateY(-8px);
 border: 1px solid #e5e6ea;
 }
 .creation-card:active {
 transform: scale(0.98);
 }
 @media (max-width: 768px) {
 .creation-card:hover {
 transform: none;
 border: none;
 }
 }
 `}</style>
 <div className="max-w-5xl mx-auto">
 {/* Header */}
 <div className="mb-6">
 <div className="flex items-center gap-3 mb-2">
 <div className={'w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xl ' + (theme === 'dark' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
 <i className={'fas fa-wand-magic-sparkles text-sm ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
 </div>
 <div>
 <h1 className={'text-xl font-extrabold ' + (theme === 'dark' ? 'text-white' : 'text-[#1A1A1A]')}>Vizzu Creation</h1>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs font-serif italic'}>Escolha uma ferramenta para criar com IA</p>
 </div>
 </div>
 </div>

 {/* Video Cards Grid - 2x2 */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* Card 1: Vizzu Product Studio */}
 <div
 onClick={() => navigateTo('product-studio')}
 className={'creation-card group relative overflow-hidden rounded-xl cursor-pointer ' + (theme === 'dark' ? 'bg-neutral-800 border border-neutral-700' : 'bg-gray-100 border-2 border-gray-200')}
 style={{ minHeight: '240px', height: 'auto' }}
 >
 <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/banner-product-studio.webp)' }}></div>
 <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20 group-hover:from-black/60 group-hover:via-black/30 group-hover:to-black/10 transition-all duration-300"></div>
 <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
 <div>
 <div className="flex items-center gap-2 mb-2">
 <span className="px-2 py-0.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white text-[9px] font-bold rounded-full uppercase">IA</span>
 <span className="text-white/60 text-xs">10 créditos/foto</span>
 </div>
 <h3 className="text-xl font-bold text-white mb-1 font-serif">Vizzu Product Studio®</h3>
 <p className="text-white/70 text-sm">Fotos profissionais do produto em múltiplos ângulos com fundo cinza de estúdio</p>
 </div>
 <div className="flex items-center justify-between">
 <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 border border-white/30 group-hover:bg-white/30 group-hover:scale-110">
 <i className="fas fa-cube text-white text-lg"></i>
 </div>
 <button
 onClick={(e) => { e.stopPropagation(); navigateTo('product-studio'); }}
 className="px-4 py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-all border border-white/30"
 >
 Acessar <i className="fas fa-arrow-right text-xs"></i>
 </button>
 </div>
 </div>
 <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
 </div>

 {/* Card 2: Vizzu Provador */}
 <div
 onClick={() => setShowVideoTutorial('provador')}
 className={'creation-card group relative overflow-hidden rounded-xl cursor-pointer ' + (theme === 'dark' ? 'bg-neutral-800 border border-neutral-700' : 'bg-gray-100 border-2 border-gray-200')}
 style={{ minHeight: '240px', height: 'auto' }}
 >
 <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/banner-provador.webp)' }}></div>
 <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20 group-hover:from-black/60 group-hover:via-black/30 group-hover:to-black/10 transition-all duration-300"></div>
 <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
 <div>
 <div className="flex items-center gap-2 mb-2">
 <span className="px-2 py-0.5 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-[9px] font-bold rounded-full uppercase">Novo</span>
 <span className="text-white/60 text-xs">10 créditos</span>
 </div>
 <h3 className="text-xl font-bold text-white mb-1 font-serif">Vizzu Provador®</h3>
 <p className="text-white/70 text-sm">Vista seu cliente com suas roupas. Prova virtual pelo WhatsApp</p>
 </div>
 <div className="flex items-center justify-between">
 <div className="play-btn w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 border border-white/30 group-hover:bg-white/30 group-hover:scale-110">
 <i className="fas fa-play text-white ml-1"></i>
 </div>
 <button
 onClick={(e) => { e.stopPropagation(); navigateTo('provador'); }}
 className="px-4 py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-all border border-white/30"
 >
 Acessar <i className="fas fa-arrow-right text-xs"></i>
 </button>
 </div>
 </div>
 <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
 </div>

 {/* Card 3: Look Completo */}
 <div
 onClick={() => navigateTo('look-composer')}
 className={'creation-card group relative overflow-hidden rounded-xl cursor-pointer ' + (theme === 'dark' ? 'bg-neutral-800 border border-neutral-700' : 'bg-gray-100 border-2 border-gray-200')}
 style={{ minHeight: '240px', height: 'auto' }}
 >
 <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/banner-look-composer.webp)' }}></div>
 <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20 group-hover:from-black/60 group-hover:via-black/30 group-hover:to-black/10 transition-all duration-300"></div>
 <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
 <div>
 <div className="flex items-center gap-2 mb-2">
 <span className="px-2 py-0.5 bg-indigo-500 text-white text-[9px] font-bold rounded-full uppercase">IA</span>
 <span className="text-white/60 text-xs">10-20 créditos</span>
 </div>
 <h3 className="text-xl font-bold text-white mb-1 font-serif">Look Completo®</h3>
 <p className="text-white/70 text-sm">Crie looks com modelos virtuais em fundo studio ou cenário personalizado</p>
 </div>
 <div className="flex items-center justify-between">
 <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 border border-white/30 group-hover:bg-white/30 group-hover:scale-110">
 <i className="fas fa-vest-patches text-white text-lg"></i>
 </div>
 <button
 onClick={(e) => { e.stopPropagation(); navigateTo('look-composer'); }}
 className="px-4 py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-all border border-white/30"
 >
 Acessar <i className="fas fa-arrow-right text-xs"></i>
 </button>
 </div>
 </div>
 <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
 </div>

 {/* Card 4: Still Criativo */}
 <div
 onClick={() => navigateTo('creative-still')}
 className={'creation-card group relative overflow-hidden rounded-xl cursor-pointer ' + (theme === 'dark' ? 'bg-neutral-800 border border-neutral-700' : 'bg-gray-100 border-2 border-gray-200')}
 style={{ minHeight: '240px', height: 'auto' }}
 >
 <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/banner-still-criativo.webp)' }}></div>
 <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20 group-hover:from-black/60 group-hover:via-black/30 group-hover:to-black/10 transition-all duration-300"></div>
 <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
 <div>
 <div className="flex items-center gap-2 mb-2">
 <span className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-bold rounded-full uppercase">Novo</span>
 <span className="text-white/60 text-xs">2 créditos</span>
 </div>
 <h3 className="text-xl font-bold text-white mb-1 font-serif">Still Criativo®</h3>
 <p className="text-white/70 text-sm">Composições artísticas de produto. Fotos estilo still life para Instagram</p>
 </div>
 <div className="flex items-center justify-between">
 <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 border border-white/30 group-hover:bg-white/30 group-hover:scale-110">
 <i className="fas fa-palette text-white text-lg"></i>
 </div>
 <button
 onClick={(e) => { e.stopPropagation(); navigateTo('creative-still'); }}
 className="px-4 py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-all border border-white/30"
 >
 Acessar <i className="fas fa-arrow-right text-xs"></i>
 </button>
 </div>
 </div>
 <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
 </div>
 </div>

 {/* Card Em Breve - Compacto */}
 <div className={'mt-4 rounded-xl overflow-hidden ' + (theme === 'dark' ? 'bg-neutral-800/50 border border-neutral-700' : 'bg-gray-200/50 border border-gray-300')}>
 <div className="relative px-5 py-4 flex items-center justify-between">
 <div className="absolute inset-0 bg-gradient-to-r from-gray-700/30 via-gray-600/20 to-gray-700/30"></div>
 <div className="relative flex items-center gap-3">
 <div className={'w-10 h-10 rounded-lg flex items-center justify-center ' + (theme === 'dark' ? 'bg-gray-300' : 'bg-gray-300')}>
 <i className={'fas fa-sparkles ' + (theme === 'dark' ? 'text-neutral-500' : 'text-gray-500')}></i>
 </div>
 <div>
 <div className="flex items-center gap-2">
 <span className={'px-2 py-0.5 text-[9px] font-bold rounded-full uppercase ' + (theme === 'dark' ? 'bg-neutral-600 text-neutral-300' : 'bg-gray-400 text-white')}>Em breve</span>
 </div>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-sm mt-0.5 font-serif italic'}>Mais ferramentas em desenvolvimento</p>
 </div>
 </div>
 <button
 disabled
 className={'px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 cursor-not-allowed ' + (theme === 'dark' ? 'bg-gray-300 text-neutral-500' : 'bg-gray-300 text-gray-500')}
 >
 Aguarde <i className="fas fa-clock text-xs"></i>
 </button>
 </div>
 </div>

 {/* Quick Stats */}
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-4 mt-4'}>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className={'w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xl ' + (theme === 'dark' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
 <i className={'fas fa-coins ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
 </div>
 <div>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide'}>Seus Créditos</p>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xl font-bold'}>{userCredits.toLocaleString()}</p>
 </div>
 </div>
 <button
 onClick={() => { navigateTo('settings'); setSettingsTab('plan'); }}
 className="px-4 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
 >
 Comprar mais
 </button>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* PRODUCT STUDIO - Monta quando ativo ou gerando */}
 {(currentPage === 'product-studio' || isGeneratingProductStudio) && (
 <div style={{ display: currentPage === 'product-studio' ? 'contents' : 'none' }}>
 <Suspense fallback={<LoadingSkeleton theme={theme} />}>
 <ProductStudio
 products={products}
 userCredits={userCredits}
 onUpdateProduct={handleUpdateProduct}
 onDeductCredits={handleDeductCredits}
 onAddHistoryLog={addHistoryLog}
 onImport={() => navigateTo('products')}
 currentPlan={currentPlan}
 theme={theme}
 onCheckCredits={checkCreditsAndShowModal}
 userId={user?.id}
 isGenerating={isGeneratingProductStudio}
 isMinimized={productStudioMinimized}
 generationProgress={productStudioProgress}
 generationText={productStudioLoadingText}
 onSetGenerating={setIsGeneratingProductStudio}
 onSetMinimized={setProductStudioMinimized}
 onSetProgress={setProductStudioProgress}
 onSetLoadingText={setProductStudioLoadingText}
 isAnyGenerationRunning={isGeneratingProvador || isGeneratingProductStudio || isGeneratingLookComposer}
 onNavigate={(page) => navigateTo(page)}
 initialProduct={productForCreation}
 onClearInitialProduct={() => setProductForCreation(null)}
 onBack={goBack}
 onOpenPlanModal={() => { navigateTo('settings'); setSettingsTab('plan'); }}
 />
 </Suspense>
 </div>
 )}

 {/* PROVADOR - Monta quando ativo ou gerando */}
 {(currentPage === 'provador' || isGeneratingProvador) && (
 <div style={{ display: currentPage === 'provador' ? 'contents' : 'none' }}>
 <Suspense fallback={<LoadingSkeleton theme={theme} />}>
 <VizzuProvadorWizard
 theme={theme}
 clients={clients}
 products={products}
 collections={COLLECTIONS}
 userCredits={userCredits}
 whatsappTemplates={whatsappTemplates}
 onCreateClient={() => { setCreateClientFromProvador(true); setShowCreateClient(true); }}
 onUpdateClient={handleUpdateClientForProvador}
 onClientSelect={(client) => {
 setProvadorClient(client);
 if (client) {
 loadClientLooks(client.id);
 } else {
 setClientLooks([]);
 }
 }}
 onGenerate={handleProvadorGenerateForWizard}
 onSendWhatsApp={handleProvadorSendWhatsAppForWizard}
 onDownloadImage={handleProvadorDownloadImage}
 onSaveLook={saveClientLook}
 onDeleteLook={deleteClientLook}
 onGenerateAIMessage={handleProvadorGenerateAIMessage}
 clientLooks={clientLooks}
 isGenerating={isGeneratingProvador}
 isMinimized={provadorMinimized}
 generationProgress={provadorProgress}
 loadingText={PROVADOR_LOADING_PHRASES[provadorLoadingIndex]?.text || 'Gerando...'}
 onSetMinimized={setProvadorMinimized}
 initialProduct={productForCreation}
 onClearInitialProduct={() => setProductForCreation(null)}
 onBack={goBack}
 currentPlan={currentPlan}
 onOpenPlanModal={() => { navigateTo('settings'); setSettingsTab('plan'); }}
 />
 </Suspense>
 </div>
 )}

 {/* LOOK COMPOSER - Monta quando ativo ou gerando */}
 {(currentPage === 'look-composer' || isGeneratingLookComposer) && (
 <div style={{ display: currentPage === 'look-composer' ? 'contents' : 'none' }}>
 <Suspense fallback={<LoadingSkeleton theme={theme} />}>
 <VizzuLookComposer
 products={products}
 userCredits={userCredits}
 onUpdateProduct={handleUpdateProduct}
 onDeductCredits={handleDeductCredits}
 onAddHistoryLog={addHistoryLog}
 onImport={() => navigateTo('products')}
 currentPlan={currentPlan}
 theme={theme}
 onCheckCredits={checkCreditsAndShowModal}
 userId={user?.id}
 savedModels={savedModels}
 onSaveModel={handleSaveModel}
 onOpenCreateModel={() => {
 const plan = user?.plan || 'free';
 const limit = plan === 'free' ? 1 : 10;
 if (savedModels.length >= limit) return;
 setShowCreateModel(true);
 }}
 modelLimit={(() => { const plan = user?.plan || 'free'; return plan === 'free' ? 1 : 10; })()}
 isGenerating={isGeneratingLookComposer}
 isMinimized={lookComposerMinimized}
 generationProgress={lookComposerProgress}
 generationText={lookComposerLoadingText}
 onSetGenerating={setIsGeneratingLookComposer}
 onSetMinimized={setLookComposerMinimized}
 onSetProgress={setLookComposerProgress}
 onSetLoadingText={setLookComposerLoadingText}
 isAnyGenerationRunning={isGeneratingProvador || isGeneratingProductStudio || isGeneratingLookComposer}
 initialProduct={productForCreation}
 onClearInitialProduct={() => setProductForCreation(null)}
 onBack={goBack}
 onOpenPlanModal={() => { navigateTo('settings'); setSettingsTab('plan'); }}
 />
 </Suspense>
 </div>
 )}

 {/* STILL CRIATIVO - Monta apenas quando ativo */}
 {currentPage === 'creative-still' && (
 <div style={{ display: 'contents' }}>
 <Suspense fallback={<LoadingSkeleton theme={theme} />}>
 <CreativeStill
 theme={theme}
 products={products}
 userCredits={userCredits}
 userId={user?.id}
 onDeductCredits={handleDeductCredits}
 onAddHistoryLog={addHistoryLog}
 onCheckCredits={checkCreditsAndShowModal}
 currentPlan={currentPlan}
 onBack={goBack}
 onOpenPlanModal={() => { navigateTo('settings'); setSettingsTab('plan'); }}
 initialProduct={productForCreation}
 onClearInitialProduct={() => setProductForCreation(null)}
 />
 </Suspense>
 </div>
 )}

 {/* MODELS */}
 {currentPage === 'models' && <ModelsPage savedModels={savedModels} setSavedModels={setSavedModels} showCreateModel={showCreateModel} setShowCreateModel={setShowCreateModel} />}

 {/* PRODUCTS */}
 {currentPage === 'products' && <ProductsPage productForCreation={productForCreation} setProductForCreation={setProductForCreation} />}

 {/* CLIENTS */}
 {currentPage === 'clients' && <ClientsPage showCreateClient={showCreateClient} setShowCreateClient={setShowCreateClient} createClientFromProvador={createClientFromProvador} setCreateClientFromProvador={setCreateClientFromProvador} setProvadorClient={setProvadorClient} />}

 {/* SETTINGS */}
 {currentPage === 'settings' && (
 <div className="flex-1 overflow-y-auto p-4 md:p-6">
 <div className="max-w-2xl mx-auto">
 {/* Header com Dropdown */}
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-3">
 <div className={'w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xl ' + (theme === 'dark' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
 <i className={'fas fa-cog text-sm ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
 </div>
 <div>
 <h1 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-extrabold'}>Configurações</h1>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs font-serif italic hidden md:block'}>Gerencie sua conta e preferências</p>
 </div>
 </div>
 <button onClick={handleLogout} className={'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-500 transition-colors ' + (theme === 'dark' ? 'hover:bg-red-500/10' : 'hover:bg-red-50')}>
 <i className="fas fa-sign-out-alt"></i>
 <span className="hidden md:inline">Sair</span>
 </button>
 </div>

 {/* Tabs de navegação - Mobile */}
 <div className="flex gap-1 overflow-x-auto pb-4 -mx-4 px-4 md:hidden scrollbar-hide">
 {[
 { id: 'profile' as SettingsTab, label: 'Perfil', icon: 'fa-user' },
 { id: 'appearance' as SettingsTab, label: 'Aparência', icon: 'fa-palette' },
 { id: 'company' as SettingsTab, label: 'Empresa', icon: 'fa-building' },
 { id: 'plan' as SettingsTab, label: 'Planos', icon: 'fa-credit-card' },
 { id: 'integrations' as SettingsTab, label: 'Integrações', icon: 'fa-plug' },
 { id: 'history' as SettingsTab, label: 'Histórico', icon: 'fa-clock-rotate-left' },
 { id: 'tools' as SettingsTab, label: 'Ferramentas', icon: 'fa-wrench' },
 ].map(tab => (
 <button
 key={tab.id}
 onClick={() => setSettingsTab(tab.id)}
 className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
 settingsTab === tab.id
 ? theme === 'dark' ? 'bg-neutral-700 text-white' : 'bg-gray-900 text-white'
 : theme === 'dark'
 ? 'bg-neutral-800 text-neutral-400 hover:bg-gray-300'
 : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
 }`}
 >
 <i className={`fas ${tab.icon} text-[10px]`}></i>
 {tab.label}
 </button>
 ))}
 </div>

 {/* Conteúdo da Seção */}
 <div className={settingsTab === 'plan' ? '' : 'max-w-xl'}>
 {settingsTab === 'plan' && (() => {
 // Lista completa de todas as funcionalidades
 const ALL_FEATURES = [
 { id: 'studio', name: 'Vizzu Studio', plans: ['starter', 'pro', 'premier'] },
 { id: 'provador', name: 'Vizzu Provador', plans: ['starter', 'pro', 'premier'] },
 { id: 'dashboard', name: 'Dashboard', plans: ['starter', 'pro', 'premier'] },
 { id: 'fundo-estudio', name: 'Fundo de Estudio', plans: ['starter', 'pro', 'premier'] },
 { id: 'cenario', name: 'Cenario Criativo', plans: ['starter', 'pro', 'premier'] },
 { id: 'reels', name: 'Fotos para Reels e Stories', plans: ['starter', 'pro', 'premier'] },
 { id: 'modelo-ia', name: 'Modelo IA Feito sob medida', plans: ['starter', 'pro', 'premier'] },
 { id: 'legendas', name: 'Gerador de Legendas IA', plans: ['starter', 'pro', 'premier'] },
 { id: 'catalogo', name: 'Catalogo Virtual + WhatsApp', plans: ['starter', 'pro', 'premier'] },
 { id: 'atendente-receptivo', name: 'Atendente Receptivo WhatsApp', plans: ['starter', 'pro', 'premier'] },
 { id: 'videos', name: 'Geracao de Videos para Instagram', plans: ['pro', 'premier'] },
 { id: 'agente-whatsapp', name: 'Agente Ativo de WhatsApp', plans: ['pro', 'premier'] },
 { id: 'ecommerce', name: 'Integracao com e-commerces', plans: ['premier'] },
 { id: 'suporte', name: 'Suporte prioritario', plans: ['premier'] },
 ];

 return (
 <div>
 {/* Header */}
 <div className="text-center mb-6">
 <h2 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xl font-bold mb-1 font-serif'}>Escolha o plano ideal para seu negocio</h2>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-sm font-serif italic'}>Transforme suas fotos de produtos em imagens profissionais com IA</p>
 </div>

 {/* Status atual de creditos */}
 <div className="bg-gradient-to-br from-[#E91E8C]/20 via-[#A855F7]/15 to-[#FF6B9D]/20 border border-[#E91E8C]/30 rounded-2xl p-5 mb-6 backdrop-blur-sm">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-4">
 <div className={'w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-xl ' + (theme === 'dark' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
 <i className={'fas fa-coins text-lg ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
 </div>
 <div>
 <p className="text-[#E91E8C] text-[10px] uppercase tracking-wider font-medium">Seus Creditos</p>
 <p className="text-white text-3xl font-bold">{userCredits} <span className="text-base font-normal text-neutral-400">/ {currentPlan.limit}</span></p>
 </div>
 </div>
 <div className="text-right">
 <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white whitespace-nowrap">
 <i className="fas fa-crown text-[10px]"></i>
 {currentPlan.name}
 </span>
 </div>
 </div>
 <div className="bg-neutral-900/50 h-3 rounded-full overflow-hidden">
 <div className="h-full bg-gradient-to-r from-[#E91E8C] via-[#A855F7] to-[#FF6B9D] rounded-full transition-all " style={{ width: Math.min(100, (userCredits / currentPlan.limit) * 100) + '%' }}></div>
 </div>
 </div>

 {/* Toggle Mensal/Anual */}
 <div className="flex items-center justify-center gap-3 mb-6">
 <span className={(billingPeriod === 'monthly' ? 'text-white' : 'text-neutral-500') + ' text-sm font-medium'}>Mensal</span>
 <button
 onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
 className={(billingPeriod === 'yearly' ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]' : 'bg-gray-300') + ' relative w-14 h-7 rounded-full transition-colors'}
 >
 <div className={'absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ' + (billingPeriod === 'yearly' ? 'translate-x-8' : 'translate-x-1')}></div>
 </button>
 <span className={(billingPeriod === 'yearly' ? 'text-white' : 'text-neutral-500') + ' text-sm font-medium flex items-center gap-2'}>
 Anual
 <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full">-20%</span>
 </span>
 </div>

 {/* Cards dos Planos */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
 {PLANS.map(plan => {
 const isCurrentPlan = currentPlan.id === plan.id;
 const price = billingPeriod === 'monthly' ? plan.priceMonthly : plan.priceYearly;
 const isPro = plan.id === 'pro';
 const isPremier = plan.id === 'premier';

 return (
 <div
 key={plan.id}
 className={
 'relative rounded-2xl p-5 transition-all ' +
 (isCurrentPlan
 ? 'bg-gradient-to-br from-[#FF6B6B]/20 via-[#FF9F43]/15 to-neutral-900 border-2 border-[#FF9F43]'
 : isPro
 ? 'bg-gradient-to-br from-[#FF6B6B]/15 via-[#FF9F43]/10 to-neutral-900 border border-[#FF9F43]/30 hover:border-neutral-500'
 : isPremier
 ? 'bg-gradient-to-br from-amber-900/30 via-orange-900/20 to-neutral-900 border border-amber-500/30 hover:border-amber-500/60'
 : 'bg-gradient-to-br from-neutral-800/50 to-neutral-900 border border-neutral-700 hover:border-neutral-600'
 )
 }
 >
 {/* Badge */}
 {isCurrentPlan && (
 <div className="absolute -top-3 left-1/2 -translate-x-1/2">
 <span className="px-4 py-1.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white text-[10px] font-bold rounded-full whitespace-nowrap">
 ATUAL
 </span>
 </div>
 )}
 {isPro && !isCurrentPlan && (
 <div className="absolute -top-3 left-1/2 -translate-x-1/2">
 <span className="px-4 py-1.5 bg-gradient-to-r from-[#E91E8C] to-[#A855F7] text-white text-[10px] font-bold rounded-full whitespace-nowrap">
 POPULAR
 </span>
 </div>
 )}
 {isPremier && !isCurrentPlan && (
 <div className="absolute -top-3 left-1/2 -translate-x-1/2">
 <span className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-[#FF9F43] text-white text-[10px] font-bold rounded-full flex items-center gap-1 whitespace-nowrap">
 <i className="fas fa-star text-[8px]"></i>
 COMPLETO
 </span>
 </div>
 )}

 <div className="pt-3">
 <h3 className="text-white text-xl font-bold font-serif">{plan.name}</h3>
 <div className="mt-3 mb-4">
 <span className="text-white text-3xl font-bold">
 R$ {price.toFixed(2).replace('.', ',')}
 </span>
 <span className="text-neutral-500 text-sm">/mes</span>
 </div>

 <div className="bg-neutral-900/50 rounded-xl p-3 mb-4 border border-neutral-800">
 <div className="flex items-center gap-2">
 <i className="fas fa-bolt text-amber-400"></i>
 <span className="text-white font-bold text-xl">{plan.limit}</span>
 <span className="text-neutral-400 text-xs">creditos/mes</span>
 </div>
 <p className="text-neutral-500 text-[10px] mt-1">R$ {plan.creditPrice.toFixed(2).replace('.', ',')} por credito extra</p>
 </div>

 <ul className="space-y-2 mb-4">
 {ALL_FEATURES.map((feature) => {
 const hasFeature = feature.plans.includes(plan.id);
 return (
 <li key={feature.id} className="flex items-start gap-2 text-[11px]">
 {hasFeature ? (
 <i className="fas fa-check text-emerald-400 mt-0.5 text-[9px]"></i>
 ) : (
 <i className="fas fa-times text-red-500 mt-0.5 text-[9px]"></i>
 )}
 <span className={hasFeature ? 'text-neutral-300' : 'text-neutral-600 line-through'}>{feature.name}</span>
 </li>
 );
 })}
 </ul>

 <button
 onClick={() => {
 if (!isCurrentPlan) {
 showToast('Checkout Stripe nao implementado. Configure os webhooks do n8n.', 'info');
 }
 }}
 className={
 'w-full py-3 rounded-xl font-semibold text-sm transition-all ' +
 (isCurrentPlan
 ? 'bg-neutral-800 text-neutral-500 cursor-default'
 : 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:scale-[1.02]'
 )
 }
 >
 {isCurrentPlan ? 'Plano Atual' : 'Escolher Plano'}
 </button>
 </div>
 </div>
 );
 })}
 </div>

 {/* Secao: Compre Creditos Adicionais */}
 <div className="bg-gradient-to-br from-amber-900/20 via-orange-900/10 to-neutral-900 border border-amber-500/20 rounded-2xl p-5 mb-6">
 <div className="flex items-center gap-3 mb-4">
 <div className={'w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xl ' + (theme === 'dark' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
 <i className={'fas fa-coins ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
 </div>
 <div>
 <h4 className="text-white font-semibold">Compre Creditos Adicionais</h4>
 <p className="text-neutral-400 text-xs">R$ {currentPlan.creditPrice.toFixed(2).replace('.', ',')} por credito no seu plano</p>
 </div>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 {CREDIT_PACKAGES.map(amount => (
 <button
 key={amount}
 onClick={() => showToast('Checkout Stripe nao implementado. Configure os webhooks do n8n.', 'info')}
 className="bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 hover:border-amber-500/50 rounded-xl p-4 transition-all hover:scale-[1.02] group"
 >
 <div className="flex items-center justify-center gap-2 mb-2">
 <i className="fas fa-bolt text-amber-400 group-hover:scale-110 transition-transform"></i>
 <span className="text-white font-bold text-2xl">{amount}</span>
 </div>
 <p className="text-neutral-500 text-[10px] mb-1">creditos</p>
 <p className="text-amber-400 font-bold text-sm">
 R$ {(amount * currentPlan.creditPrice).toFixed(2).replace('.', ',')}
 </p>
 </button>
 ))}
 </div>
 </div>

 {/* FAQ */}
 <div className="bg-gradient-to-br from-neutral-800/50 to-neutral-900 border border-neutral-700 rounded-2xl p-5">
 <details className="group">
 <summary className="text-white hover:text-neutral-300 font-medium text-sm cursor-pointer flex items-center justify-between">
 <span className="flex items-center gap-2">
 <i className="fas fa-circle-question text-[#E91E8C]"></i>
 Perguntas Frequentes
 </span>
 <i className="fas fa-chevron-down text-xs transition-transform group-open:rotate-180"></i>
 </summary>
 <div className="text-neutral-400 mt-4 space-y-3 text-xs">
 <div>
 <p className="text-white font-medium mb-1">O que sao creditos?</p>
 <p>Creditos sao usados para gerar imagens com IA. Cada foto gerada consome 10 creditos.</p>
 </div>
 <div>
 <p className="text-white font-medium mb-1">Posso mudar de plano?</p>
 <p>Sim! Voce pode fazer upgrade ou downgrade a qualquer momento. O valor e ajustado proporcionalmente.</p>
 </div>
 <div>
 <p className="text-white font-medium mb-1">Os creditos acumulam?</p>
 <p>Creditos nao utilizados nao acumulam para o proximo mes, mas creditos comprados avulso nao expiram.</p>
 </div>
 </div>
 </details>
 </div>

 {/* Footer */}
 <p className="text-neutral-500 text-center text-xs mt-6">
 Precisa de mais? <a href="#" className="text-[#E91E8C] hover:underline">Entre em contato</a> para planos personalizados.
 </p>
 </div>
 );
 })()}
 
 {settingsTab === 'profile' && (
 <div>
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold mb-4 font-serif'}>Perfil</h3>
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-4'}>
 <div className="flex items-center gap-3 mb-5">
 <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' w-14 h-14 rounded-full flex items-center justify-center overflow-hidden'}>
 {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="" /> : <i className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' fas fa-user text-lg'}></i>}
 </div>
 <button className={(theme === 'dark' ? 'bg-neutral-800 text-white hover:bg-gray-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200') + ' px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors'}>Alterar Foto</button>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 <div>
 <label htmlFor="profile-name" className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>Nome</label>
 <input type="text" id="profile-name" name="profileName" autoComplete="name" defaultValue={user?.name} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'} />
 </div>
 <div>
 <label htmlFor="profile-email" className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>Email</label>
 <input type="email" id="profile-email" name="profileEmail" autoComplete="email" defaultValue={user?.email} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-neutral-500' : 'bg-gray-100 border-gray-200 text-gray-500') + ' w-full px-3 py-2 border rounded-lg text-sm'} disabled />
 </div>
 </div>
 </div>
 </div>
 )}
 
 {settingsTab === 'appearance' && (
 <div>
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold mb-4 font-serif'}>Aparência</h3>
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-4'}>
 <div className="flex items-center justify-between">
 <div>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-sm'}>Tema</p>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] mt-0.5'}>
 {theme === 'dark' ? 'Modo escuro ativo' : 'Modo claro ativo'}
 </p>
 </div>
 <div
 onClick={() => {
 // Trocar tema
 setTheme(theme === 'dark' ? 'light' : 'dark');
 // Disparar evento de clique no Lottie para animar
 if (dotLottieRef.current) {
 // Enviar evento de pointer down para state machine
 dotLottieRef.current.postStateMachineEvent('OnPointerDown');
 }
 }}
 className="cursor-pointer hover:scale-110 transition-transform"
 style={{ width: 80, height: 80 }}
 >
 <DotLottieReact
 dotLottieRefCallback={dotLottieRefCallback}
 src="https://lottie.host/97eaa266-6a0b-45c7-917f-97933914029a/GtkUp9Odq8.lottie"
 autoplay
 useFrameInterpolation
 stateMachineId="StateMachine1"
 style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
 />
 </div>
 </div>
 </div>
 </div>
 )}
 
 {settingsTab === 'company' && (
 <div className="space-y-4">
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold font-serif'}>Empresa</h3>

 {/* Dados Básicos */}
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-4'}>
 <h4 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-sm mb-3 flex items-center gap-2'}>
 <i className="fas fa-building text-[#E91E8C] text-xs"></i>
 Dados Básicos
 </h4>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>Nome da Empresa</label>
 <input
 type="text"
 value={companySettings.name}
 onChange={(e) => setCompanySettings({ ...companySettings, name: e.target.value })}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}
 placeholder="Sua Loja"
 />
 </div>
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>Instagram</label>
 <input
 type="text"
 value={companySettings.instagram || ''}
 onChange={(e) => setCompanySettings({ ...companySettings, instagram: e.target.value })}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}
 placeholder="@sualoja"
 />
 </div>
 </div>
 </div>

 {/* Configurações de Legenda IA */}
 <div className={(theme === 'dark' ? 'bg-gradient-to-r from-[#E91E8C]/10 to-[#FF9F43]/10 border-[#E91E8C]/30' : 'bg-gradient-to-r from-[#E91E8C]/5 to-[#FF9F43]/5 border-[#E91E8C]/20') + ' rounded-xl border p-4'}>
 <h4 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-sm mb-1 flex items-center gap-2'}>
 <i className="fas fa-wand-magic-sparkles text-[#E91E8C] text-xs"></i>
 Gerador de Legendas IA
 </h4>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-xs mb-4'}>Configure como a IA vai gerar legendas para suas postagens</p>

 <div className="space-y-4">
 {/* Público Alvo */}
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>Público Alvo</label>
 <input
 type="text"
 value={companySettings.targetAudience}
 onChange={(e) => setCompanySettings({ ...companySettings, targetAudience: e.target.value })}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}
 placeholder="Ex: Mulheres 25-45 anos, classe B/C, que gostam de moda casual"
 />
 </div>

 {/* Tom de Voz */}
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>Tom de Voz</label>
 <div className="grid grid-cols-5 gap-2">
 {[
 { id: 'formal', label: 'Formal', icon: '👔' },
 { id: 'casual', label: 'Casual', icon: '😊' },
 { id: 'divertido', label: 'Divertido', icon: '🎉' },
 { id: 'luxo', label: 'Luxo', icon: '✨' },
 { id: 'jovem', label: 'Jovem', icon: '🔥' },
 ].map(tone => (
 <button
 key={tone.id}
 onClick={() => setCompanySettings({ ...companySettings, voiceTone: tone.id as any })}
 className={`p-2 rounded-lg border text-center transition-all ${
 companySettings.voiceTone === tone.id
 ? 'border-[#E91E8C] bg-[#E91E8C]/20 text-[#E91E8C]'
 : theme === 'dark'
 ? 'border-neutral-700 bg-neutral-800 text-neutral-400 hover:border-neutral-600'
 : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
 }`}
 >
 <span className="text-lg block mb-0.5">{tone.icon}</span>
 <span className="text-[10px] font-medium">{tone.label}</span>
 </button>
 ))}
 </div>
 </div>

 {/* Exemplos de Tom */}
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>
 Exemplos de Como Você Fala
 <span className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' font-normal ml-1'}>(opcional)</span>
 </label>
 <textarea
 value={companySettings.voiceExamples || ''}
 onChange={(e) => setCompanySettings({ ...companySettings, voiceExamples: e.target.value })}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm resize-none'}
 rows={2}
 placeholder="Cole aqui algumas legendas que você já usou e gostou..."
 />
 </div>

 {/* Hashtags */}
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>Hashtags Favoritas</label>
 <input
 type="text"
 value={companySettings.hashtags.join(' ')}
 onChange={(e) => setCompanySettings({ ...companySettings, hashtags: e.target.value.split(' ').filter(h => h.startsWith('#') || h === '') })}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}
 placeholder="#moda #fashion #lookdodia #ootd"
 />
 <p className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' text-[10px] mt-1'}>Separe as hashtags por espaço</p>
 </div>

 {/* Tamanho e Emojis */}
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>Tamanho da Legenda</label>
 <select
 value={companySettings.captionStyle}
 onChange={(e) => setCompanySettings({ ...companySettings, captionStyle: e.target.value as any })}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}
 >
 <option value="curta">Curta (1-2 linhas)</option>
 <option value="media">Média (3-5 linhas)</option>
 <option value="longa">Longa (storytelling)</option>
 </select>
 </div>
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>Usar Emojis?</label>
 <button
 onClick={() => setCompanySettings({ ...companySettings, emojisEnabled: !companySettings.emojisEnabled })}
 className={`w-full px-3 py-2 border rounded-lg text-sm font-medium transition-all ${
 companySettings.emojisEnabled
 ? 'border-[#E91E8C] bg-[#E91E8C]/20 text-[#E91E8C]'
 : theme === 'dark'
 ? 'border-neutral-700 bg-neutral-800 text-neutral-400'
 : 'border-gray-200 bg-white text-gray-500'
 }`}
 >
 {companySettings.emojisEnabled ? '✅ Sim, usar emojis' : '❌ Não usar'}
 </button>
 </div>
 </div>

 {/* Call to Action */}
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>
 Call to Action Padrão
 <span className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' font-normal ml-1'}>(opcional)</span>
 </label>
 <input
 type="text"
 value={companySettings.callToAction || ''}
 onChange={(e) => setCompanySettings({ ...companySettings, callToAction: e.target.value })}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}
 placeholder="Ex: Compre pelo link na bio! | Chama no direct 💬"
 />
 </div>
 </div>
 </div>

 {/* Botão Salvar */}
 <button
 onClick={() => showToast('Configurações salvas!', 'success')}
 className="w-full py-2.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
 >
 <i className="fas fa-check"></i>
 Salvar Configurações
 </button>
 </div>
 )}
 
 {settingsTab === 'integrations' && (
 <div>
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold mb-4 font-serif'}>Integrações</h3>
 <div className="space-y-2">
 {[
 { icon: 'fab fa-shopify', name: 'Shopify', desc: 'Sincronize produtos' },
 { icon: 'fab fa-wordpress', name: 'WooCommerce', desc: 'Loja WordPress' },
 { icon: 'fas fa-store', name: 'VTEX', desc: 'VTEX IO' },
 ].map(item => (
 <div key={item.name} className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-3 flex items-center justify-between'}>
 <div className="flex items-center gap-3">
 <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' w-9 h-9 rounded-lg flex items-center justify-center'}>
 <i className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' ' + item.icon + ' text-sm'}></i>
 </div>
 <div>
 <h4 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-xs'}>{item.name}</h4>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{item.desc}</p>
 </div>
 </div>
 <button className={(theme === 'dark' ? 'bg-neutral-800 text-white hover:bg-gray-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200') + ' px-3 py-1.5 rounded-lg font-medium text-[10px] transition-colors'}>Conectar</button>
 </div>
 ))}
 </div>
 </div>
 )}

 {settingsTab === 'history' && (
 <div>
 <div className="flex items-center justify-between mb-4">
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold font-serif'}>Histórico</h3>
 {historyLogs.length > 0 && (
 <button
 onClick={() => { if (confirm('Limpar todo o histórico?')) setHistoryLogs([]); }}
 className={(theme === 'dark' ? 'text-neutral-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500') + ' text-xs flex items-center gap-1.5'}
 >
 <i className="fas fa-trash-alt"></i>
 Limpar
 </button>
 )}
 </div>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mb-4'}>{historyLogs.length} atividades registradas</p>

 {historyLogs.length === 0 ? (
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-8 text-center'}>
 <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-purple-100') + ' w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3'}>
 <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-purple-400') + ' fas fa-clock-rotate-left text-xl'}></i>
 </div>
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium mb-1'}>Nenhuma atividade</h3>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>As atividades aparecerão aqui</p>
 </div>
 ) : (
 <div className="space-y-2">
 {historyLogs.map(log => {
 const statusConfig = {
 success: { icon: 'fa-check-circle', color: 'text-green-500', bg: theme === 'dark' ? 'bg-green-500/10' : 'bg-green-50' },
 error: { icon: 'fa-times-circle', color: 'text-red-500', bg: theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50' },
 pending: { icon: 'fa-clock', color: 'text-yellow-500', bg: theme === 'dark' ? 'bg-yellow-500/10' : 'bg-yellow-50' },
 };
 const methodConfig: Record<string, { icon: string; label: string }> = {
 manual: { icon: 'fa-hand', label: 'Manual' },
 auto: { icon: 'fa-robot', label: 'Automático' },
 api: { icon: 'fa-plug', label: 'API' },
 ai: { icon: 'fa-wand-magic-sparkles', label: 'IA' },
 bulk: { icon: 'fa-layer-group', label: 'Em massa' },
 system: { icon: 'fa-gear', label: 'Sistema' },
 };
 const status = statusConfig[log.status];
 const method = methodConfig[log.method] || methodConfig.system;
 const date = log.date ? new Date(log.date) : new Date();

 return (
 <div key={log.id} className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700' : 'bg-white border-gray-200 hover:border-gray-300 ') + ' rounded-xl border p-4 transition-colors'}>
 <div className="flex items-start gap-3">
 <div className={status.bg + ' w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0'}>
 <i className={'fas ' + status.icon + ' ' + status.color}></i>
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-1">
 <h4 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>{log.action}</h4>
 <span className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-500') + ' text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-1'}>
 <i className={'fas ' + method.icon + ' text-[8px]'}></i>
 {method.label}
 </span>
 </div>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs mb-2'}>{log.details}</p>
 <div className="flex items-center gap-3 text-[10px]">
 <span className={theme === 'dark' ? 'text-neutral-500' : 'text-gray-400'}>
 <i className="fas fa-calendar mr-1"></i>
 {date.toLocaleDateString('pt-BR')} às {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
 </span>
 {log.cost > 0 && (
 <span className="text-[#E91E8C]">
 <i className="fas fa-coins mr-1"></i>
 {log.cost} crédito{log.cost !== 1 ? 's' : ''}
 </span>
 )}
 {log.itemsCount && log.itemsCount > 0 && (
 <span className={theme === 'dark' ? 'text-neutral-500' : 'text-gray-400'}>
 <i className="fas fa-box mr-1"></i>
 {log.itemsCount} item{log.itemsCount !== 1 ? 's' : ''}
 </span>
 )}
 </div>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 )}

 {settingsTab === 'tools' && (
 <div>
 <div className="flex items-center justify-between mb-4">
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold font-serif'}>Ferramentas</h3>
 </div>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mb-4'}>Ferramentas de administração e manutenção</p>

 {/* Painel de Migração de Imagens */}
 <ImageMigrationPanel userId={user?.id} theme={theme} />
 </div>
 )}
 </div>
 </div>
 </div>
 )}
 </main>

 {/* MOBILE BOTTOM NAVIGATION - Esconde quando está dentro das features de criação */}
 {!['product-studio', 'provador', 'look-composer', 'lifestyle', 'creative-still'].includes(currentPage) && (
 <nav
 className={'md:hidden fixed bottom-0 left-0 right-0 border-t px-2 py-1 z-40 pwa-bottom-nav ' + (theme === 'dark' ? 'bg-neutral-950 border-neutral-900' : 'bg-white border-gray-200 ')}
 >
 <div className="flex items-center justify-around">
 <button onClick={() => navigateTo('dashboard')} className={'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ' + (currentPage === 'dashboard' ? (theme === 'dark' ? 'text-white' : 'text-neutral-900') : (theme === 'dark' ? 'text-neutral-600' : 'text-gray-400'))}>
 <i className="fas fa-home text-sm"></i>
 <span className="text-[9px] font-medium">Home</span>
 </button>
 <button onClick={() => navigateTo('products')} className={'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ' + (currentPage === 'products' ? (theme === 'dark' ? 'text-white' : 'text-neutral-900') : (theme === 'dark' ? 'text-neutral-600' : 'text-gray-400'))}>
 <i className="fas fa-box text-sm"></i>
 <span className="text-[9px] font-medium">Produtos</span>
 </button>
 {/* Botão CRIAR - Central destacado */}
 <button onClick={() => navigateTo('create')} className="relative -mt-5">
 <div className={'w-12 h-12 rounded-xl flex items-center justify-center transition-transform ' + ((currentPage === 'create' || currentPage === 'provador' || currentPage === 'look-composer' || currentPage === 'lifestyle' || currentPage === 'creative-still' || currentPage === 'product-studio') ? 'bg-gradient-to-br from-[#FF6B6B] to-[#FF9F43] scale-110' : 'bg-[#373632]')}>
 <img src="/vizzu-icon-white.png" alt="Vizzu" className="h-[38px] w-auto" />
 </div>
 <span className={'block text-[9px] font-medium mt-0.5 text-center ' + ((currentPage === 'create' || currentPage === 'provador' || currentPage === 'look-composer' || currentPage === 'lifestyle' || currentPage === 'creative-still' || currentPage === 'product-studio') ? (theme === 'dark' ? 'text-white' : 'text-neutral-900') : (theme === 'dark' ? 'text-neutral-500' : 'text-gray-500'))}>Criar</span>
 </button>
 <button onClick={() => navigateTo('models')} className={'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ' + (currentPage === 'models' ? (theme === 'dark' ? 'text-white' : 'text-neutral-900') : (theme === 'dark' ? 'text-neutral-600' : 'text-gray-400'))}>
 <i className="fas fa-user-tie text-sm"></i>
 <span className="text-[9px] font-medium">Modelos</span>
 </button>
 <button onClick={() => navigateTo('clients')} className={'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ' + (currentPage === 'clients' ? (theme === 'dark' ? 'text-white' : 'text-neutral-900') : (theme === 'dark' ? 'text-neutral-600' : 'text-gray-400'))}>
 <i className="fas fa-users text-sm"></i>
 <span className="text-[9px] font-medium">Clientes</span>
 </button>
 </div>
 </nav>
 )}


 {/* VIDEO TUTORIAL MODAL */}
 {showVideoTutorial && (
 <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setShowVideoTutorial(null)}>
 <div className={'relative w-full max-w-4xl rounded-t-2xl md:rounded-2xl overflow-hidden safe-area-bottom-sheet ' + (theme === 'dark' ? 'bg-neutral-900' : 'bg-white')} onClick={(e) => e.stopPropagation()}>
 {/* Drag handle - mobile */}
 <div className="md:hidden absolute top-2 left-1/2 -translate-x-1/2 z-30">
 <div className="bg-white/30 w-10 h-1 rounded-full"></div>
 </div>
 <button onClick={() => setShowVideoTutorial(null)} className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/50 text-white hidden md:flex items-center justify-center hover:bg-black/70 transition-colors">
 <i className="fas fa-times"></i>
 </button>
 <div className="relative aspect-video bg-black">
 <div className={'absolute inset-0 flex flex-col items-center justify-center text-white ' + (showVideoTutorial === 'studio' ? 'bg-gradient-to-br from-[#A855F7] via-indigo-600 to-blue-600' : 'bg-gradient-to-br from-[#E91E8C] via-[#FF6B9D] to-[#FF9F43]')}>
 <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 border border-white/30">
 <i className="fas fa-play text-3xl ml-1"></i>
 </div>
 <p className="text-lg font-medium mb-1">Tutorial {showVideoTutorial === 'studio' ? 'Vizzu Studio®' : 'Vizzu Provador®'}</p>
 <p className="text-white/60 text-sm">Vídeo em breve...</p>
 </div>
 </div>
 <div className={'p-5 border-t ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-200')}>
 <div className="flex items-center justify-between">
 <div>
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-bold font-serif'}>{showVideoTutorial === 'studio' ? 'Vizzu Studio®' : 'Vizzu Provador®'}</h3>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-sm'}>{showVideoTutorial === 'studio' ? 'Transforme suas fotos de produto em imagens profissionais' : 'Vista seus clientes virtualmente e aumente suas vendas'}</p>
 </div>
 <button onClick={() => { setShowVideoTutorial(null); navigateTo(showVideoTutorial); }} className={'px-6 py-3 text-white font-bold rounded-xl flex items-center gap-2 ' + (showVideoTutorial === 'studio' ? 'bg-gradient-to-r from-[#A855F7] via-indigo-500 to-[#A855F7]' : 'bg-gradient-to-r from-[#E91E8C] via-[#FF6B9D] to-[#FF9F43]')}>
 <i className="fas fa-rocket"></i>Começar Agora<i className="fas fa-arrow-right text-sm"></i>
 </button>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Client modals moved to ClientsPage */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* NOTIFICAÇÃO DE SUCESSO */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 {successNotification && (
 <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] animate-fade-in">
 <div className="flex items-center gap-2 px-4 py-3 bg-green-500 text-white rounded-xl ">
 <i className="fas fa-check-circle"></i>
 <span className="text-sm font-medium">{successNotification}</span>
 </div>
 </div>
 )}



 {/* Modal de Créditos Esgotados */}
 <CreditExhaustedModal
 isOpen={showCreditModal}
 onClose={() => setShowCreditModal(false)}
 creditsNeeded={creditModalContext.creditsNeeded}
 currentCredits={userCredits}
 currentPlan={currentPlan}
 billingPeriod={billingPeriod}
 actionContext={creditModalContext.actionContext}
 daysUntilRenewal={daysUntilRenewal}
 onBuyCredits={handleBuyCredits}
 onUpgradePlan={handleUpgradePlanFromModal}
 onSetBillingPeriod={setBillingPeriod}
 theme={theme}
 />


 {/* Minimized Modals Floating Windows */}
 {minimizedModals.length > 0 && (
 <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2">
 {minimizedModals.map((modal) => (
 <div
 key={modal.id}
 className={(theme === 'dark' ? 'bg-neutral-900/95 backdrop-blur-xl border-neutral-700' : 'bg-white/95 backdrop-blur-xl border-gray-200') + ' rounded-xl border p-3 min-w-[200px] cursor-pointer hover:scale-105 transition-all animate-fade-in'}
 onClick={() => restoreModal(modal.id)}
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className={'w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-xl ' + (theme === 'dark' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
 <i className={'fas ' + modal.icon + ' text-xs ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
 </div>
 <div>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium truncate max-w-[120px]'}>{modal.title}</p>
 {modal.progress !== undefined && (
 <div className="flex items-center gap-1.5">
 <div className="w-16 h-1 bg-gray-300 rounded-full overflow-hidden">
 <div className="h-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] animate-pulse" style={{ width: '60%' }}></div>
 </div>
 <span className="text-[10px] text-neutral-500">Gerando...</span>
 </div>
 )}
 </div>
 </div>
 <button
 onClick={(e) => { e.stopPropagation(); closeMinimizedModal(modal.id); }}
 className={(theme === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-600') + ' p-1 transition-colors'}
 >
 <i className="fas fa-times text-xs"></i>
 </button>
 </div>
 </div>
 ))}
 </div>
 )}

 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* BARRAS MINIMIZADAS GLOBAIS - Aparecem em qualquer página */}
 {/* ═══════════════════════════════════════════════════════════════ */}

 {/* Product Studio - Minimizado */}
 {isGeneratingProductStudio && productStudioMinimized && (
 <div
 className="fixed z-50 cursor-grab active:cursor-grabbing select-none touch-none"
 style={minimizedBarPos.x === -1 ? { bottom: 24, right: 24 } : { left: minimizedBarPos.x, top: minimizedBarPos.y }}
 onMouseDown={handleDragStart}
 onTouchStart={handleDragStart}
 onClick={() => handleMinimizedClick(() => setProductStudioMinimized(false))}
 >
 <div className="bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] rounded-2xl p-4 flex items-center gap-4 min-w-[280px] shadow-lg">
 <div className="w-10 h-10 flex-shrink-0">
 <DotLottieReact
 src="https://lottie.host/d29d70f3-bf03-4212-b53f-932dbefb9077/kIkLDFupvi.lottie"
 loop
 autoplay
 style={{ width: '100%', height: '100%' }}
 />
 </div>
 <div className="flex-1">
 <p className="text-white text-sm font-medium">Product Studio</p>
 <div className="flex items-center gap-2 mt-1">
 <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
 <div
 className="h-full bg-white rounded-full transition-all duration-500"
 style={{ width: `${productStudioProgress}%` }}
 ></div>
 </div>
 <span className="text-white text-xs font-medium">{productStudioProgress}%</span>
 </div>
 </div>
 <button className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
 <i className="fas fa-expand"></i>
 </button>
 </div>
 </div>
 )}

 {/* Look Composer - Minimizado */}
 {isGeneratingLookComposer && lookComposerMinimized && (
 <div
 className="fixed z-50 cursor-grab active:cursor-grabbing select-none touch-none"
 style={minimizedBarPos.x === -1 ? { bottom: 24, right: 24 } : { left: minimizedBarPos.x, top: minimizedBarPos.y }}
 onMouseDown={handleDragStart}
 onTouchStart={handleDragStart}
 onClick={() => handleMinimizedClick(() => setLookComposerMinimized(false))}
 >
 <div className="bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] rounded-2xl p-4 flex items-center gap-4 min-w-[280px] shadow-lg">
 <div className="w-10 h-10 flex-shrink-0">
 <DotLottieReact
 src="https://lottie.host/d29d70f3-bf03-4212-b53f-932dbefb9077/kIkLDFupvi.lottie"
 loop
 autoplay
 style={{ width: '100%', height: '100%' }}
 />
 </div>
 <div className="flex-1">
 <p className="text-white text-sm font-medium">Look Composer</p>
 <div className="flex items-center gap-2 mt-1">
 <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
 <div
 className="h-full bg-white rounded-full transition-all duration-500"
 style={{ width: `${lookComposerProgress}%` }}
 ></div>
 </div>
 <span className="text-white text-xs font-medium">{lookComposerProgress}%</span>
 </div>
 </div>
 <button className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
 <i className="fas fa-expand"></i>
 </button>
 </div>
 </div>
 )}

 {/* Vizzu Provador - Minimizado */}
 {isGeneratingProvador && provadorMinimized && (
 <div
 className="fixed z-50 cursor-grab active:cursor-grabbing select-none touch-none"
 style={minimizedBarPos.x === -1 ? { bottom: 24, right: 24 } : { left: minimizedBarPos.x, top: minimizedBarPos.y }}
 onMouseDown={handleDragStart}
 onTouchStart={handleDragStart}
 onClick={() => handleMinimizedClick(() => setProvadorMinimized(false))}
 >
 <div className="bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] rounded-2xl p-4 flex items-center gap-4 min-w-[280px] shadow-lg">
 <div className="w-10 h-10 flex-shrink-0">
 <DotLottieReact
 src="https://lottie.host/d29d70f3-bf03-4212-b53f-932dbefb9077/kIkLDFupvi.lottie"
 loop
 autoplay
 style={{ width: '100%', height: '100%' }}
 />
 </div>
 <div className="flex-1">
 <p className="text-white text-sm font-medium">Vizzu Provador</p>
 <div className="flex items-center gap-2 mt-1">
 <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
 <div
 className="h-full bg-white rounded-full transition-all duration-500"
 style={{ width: `${provadorProgress}%` }}
 ></div>
 </div>
 <span className="text-white text-xs font-medium">{Math.round(provadorProgress)}%</span>
 </div>
 </div>
 <button className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
 <i className="fas fa-expand"></i>
 </button>
 </div>
 </div>
 )}

 {/* Toast de notificação */}
 {toast && (
 <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
 <div className={`px-4 py-3 rounded-xl flex items-center gap-2 ${
 toast.type === 'success' ? 'bg-green-500 text-white' :
 toast.type === 'error' ? 'bg-red-500 text-white' :
 'bg-neutral-800 text-white'
 }`}>
 <i className={`fas ${
 toast.type === 'success' ? 'fa-check-circle' :
 toast.type === 'error' ? 'fa-exclamation-circle' :
 'fa-info-circle'
 } text-sm`}></i>
 <span className="text-sm font-medium">{toast.message}</span>
 </div>
 </div>
 )}
 </div>
 );
}

export default App;
