import React, { useState, useEffect, useRef, useMemo, Suspense, lazy } from 'react';
import { AuthPage } from './components/AuthPage';
import { CreditExhaustedModal } from './components/CreditExhaustedModal';
import { BulkImportModal } from './components/BulkImportModal';
import { LoadingSkeleton } from './components/LoadingSkeleton';

// Lazy loading dos componentes pesados (carrega só quando acessar)
const VizzuLookComposer = lazy(() => import('./components/LookComposer').then(m => ({ default: m.LookComposer })));
const ProductStudio = lazy(() => import('./components/ProductStudio').then(m => ({ default: m.ProductStudio })));
const VizzuProvadorWizard = lazy(() => import('./components/Provador/VizzuProvadorWizard').then(m => ({ default: m.VizzuProvadorWizard })));
const CreativeStill = lazy(() => import('./components/CreativeStill').then(m => ({ default: m.CreativeStill })));

import { Product, User, HistoryLog, Client, ClientPhoto, ClientLook, Collection, WhatsAppTemplate, LookComposition, ProductAttributes, CATEGORY_ATTRIBUTES, SavedModel } from './types';
import { useUI } from './contexts/UIContext';
import { useAuth } from './contexts/AuthContext';
import { useHistory } from './contexts/HistoryContext';
import { useProducts } from './contexts/ProductsContext';
import { useClients } from './contexts/ClientsContext';
import { useCredits, PLANS } from './hooks/useCredits';
import { useDebounce } from './hooks/useDebounce';
import { supabase } from './services/supabaseClient';
import { generateStudioReady, generateCenario, generateModeloIA, generateProvador, generateModelImages, sendWhatsAppMessage, analyzeProductImage } from './lib/api/studio';
import heic2any from 'heic2any';
import { smartDownload } from './utils/downloadHelper';
import { compressImage, formatFileSize, COMPRESSION_ENABLED } from './utils/imageCompression';
import { runFullMigration, runProductMigration, runStorageMigration } from './utils/imageMigration';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { ClientsPage } from './pages/ClientsPage';
import { ModelsPage } from './pages/ModelsPage';
import { SettingsPage } from './pages/SettingsPage';
import { CreateHubPage } from './pages/CreateHubPage';
import { AppLayout } from './components/Layout/AppLayout';

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
 const { theme, currentPage, navigateTo, goBack, setSettingsTab, showToast, showVideoTutorial, setShowVideoTutorial } = useUI();

 // Auth state from context
 const { user, isAuthenticated, login, loginDemo, logout } = useAuth();
 // History from context
 const { addHistoryLog, loadUserHistory } = useHistory();
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


 // sidebar persistence moved to UIContext


 // clients + history persistence moved to their contexts

 const clientPhotoInputRef = useRef<HTMLInputElement>(null);
 // longPressTimer, longPressProductId moved to ProductsPage


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



 // Auth session + onAuthStateChange moved to AuthContext
 // Load user data when user changes (triggered by AuthContext)
 const prevUserIdRef = useRef<string | null>(null);
 useEffect(() => {
 if (user && user.id !== prevUserIdRef.current) {
 prevUserIdRef.current = user.id;
 loadUserProducts(user.id);
 loadUserClients(user.id);
 loadUserHistory(user.id);
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
 <AppLayout
 userCredits={userCredits}
 currentPlan={currentPlan}
 isGeneratingProductStudio={isGeneratingProductStudio}
 productStudioMinimized={productStudioMinimized}
 productStudioProgress={productStudioProgress}
 setProductStudioMinimized={setProductStudioMinimized}
 isGeneratingLookComposer={isGeneratingLookComposer}
 lookComposerMinimized={lookComposerMinimized}
 lookComposerProgress={lookComposerProgress}
 setLookComposerMinimized={setLookComposerMinimized}
 isGeneratingProvador={isGeneratingProvador}
 provadorMinimized={provadorMinimized}
 provadorProgress={provadorProgress}
 setProvadorMinimized={setProvadorMinimized}
 minimizedModals={minimizedModals}
 restoreModal={restoreModal}
 closeMinimizedModal={closeMinimizedModal}
 onLogout={handleLogout}
 >


 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* DASHBOARD */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 {currentPage === 'dashboard' && <DashboardPage />}

 {/* PÁGINA VIZZU CREATION - Hub de Features */}
        {/* CREATE HUB */}
        {currentPage === 'create' && <CreateHubPage userCredits={userCredits} />}

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
        {currentPage === 'settings' && <SettingsPage userCredits={userCredits} currentPlan={currentPlan} billingPeriod={billingPeriod} daysUntilRenewal={daysUntilRenewal} isCheckoutLoading={isCheckoutLoading} onBuyCredits={handleBuyCredits} onUpgradePlan={handleUpgradePlanFromModal} onSetBillingPeriod={setBillingPeriod} onLogout={handleLogout} />}



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
 </AppLayout>
 );
}

export default App;
