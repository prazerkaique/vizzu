import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Studio } from './components/Studio';
import { LookComposer as StudioLookComposer } from './components/Studio/LookComposer';
import { LookComposer as VizzuLookComposer } from './components/LookComposer';
import { ProductStudio } from './components/ProductStudio';
import { AuthPage } from './components/AuthPage';
import { CreditExhaustedModal } from './components/CreditExhaustedModal';
import { BulkImportModal } from './components/BulkImportModal';
import { Product, User, HistoryLog, Client, ClientPhoto, ClientLook, Collection, WhatsAppTemplate, LookComposition, ProductAttributes, CATEGORY_ATTRIBUTES, CompanySettings, SavedModel, MODEL_OPTIONS } from './types';
import { useCredits, PLANS, CREDIT_PACKAGES } from './hooks/useCredits';
import { supabase } from './services/supabaseClient';
import { generateStudioReady, generateCenario, generateModeloIA, generateProvador, generateModelImages, sendWhatsAppMessage, analyzeProductImage } from './lib/api/studio';
import heic2any from 'heic2any';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { VizzuProvadorWizard } from './components/Provador/VizzuProvadorWizard';


const CATEGORY_GROUPS = [
  { label: '👒 Cabeça', items: ['Bonés', 'Chapéus', 'Tiaras', 'Lenços'] },
  { label: '👕 Topo', items: ['Camisetas', 'Blusas', 'Regatas', 'Tops', 'Camisas', 'Bodies', 'Jaquetas', 'Casacos', 'Blazers', 'Moletons'] },
  { label: '👖 Baixo', items: ['Calças', 'Shorts', 'Bermudas', 'Saias', 'Leggings', 'Shorts Fitness'] },
  { label: '👗 Peças Inteiras', items: ['Vestidos', 'Macacões', 'Jardineiras', 'Biquínis', 'Maiôs'] },
  { label: '👟 Pés', items: ['Calçados', 'Tênis', 'Sandálias', 'Botas'] },
  { label: '👜 Acessórios', items: ['Bolsas', 'Cintos', 'Relógios', 'Óculos', 'Bijuterias', 'Acessórios'] },
];
const CATEGORIES = CATEGORY_GROUPS.flatMap(g => g.items);
const COLLECTIONS = ['Verão 2025', 'Inverno 2025', 'Básicos', 'Premium', 'Promoção'];
const COLORS = ['Preto', 'Branco', 'Azul', 'Vermelho', 'Verde', 'Amarelo', 'Rosa', 'Cinza', 'Marrom', 'Bege', 'Laranja', 'Roxo', 'Nude', 'Estampado', 'Multicolor'];

const PHOTO_TYPES: { id: ClientPhoto['type']; label: string; icon: string }[] = [
  { id: 'frente', label: 'Frente', icon: 'fa-user' },
  { id: 'costas', label: 'Costas', icon: 'fa-user-slash' },
  { id: 'rosto', label: 'Rosto', icon: 'fa-face-smile' },
];

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

type Page = 'dashboard' | 'create' | 'studio' | 'provador' | 'look-composer' | 'lifestyle' | 'product-studio' | 'models' | 'products' | 'clients' | 'settings';
type SettingsTab = 'profile' | 'appearance' | 'company' | 'plan' | 'integrations' | 'history';

// Componente de carrossel para cards de modelos
const ModelCardCarousel: React.FC<{
  images: { key: string; label: string; src: string }[];
  modelName: string;
  onCardClick: () => void;
}> = ({ images, modelName, onCardClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToImage = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(index);
  };

  return (
    <div className="relative w-full h-full" onClick={onCardClick}>
      {/* Imagem atual */}
      <img
        src={images[currentIndex].src}
        alt={`${modelName} - ${images[currentIndex].label}`}
        className="w-full h-full object-cover"
      />

      {/* Setas de navegação */}
      {images.length > 1 && (
        <>
          <button
            onClick={prevImage}
            className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
          >
            <i className="fas fa-chevron-left text-xs"></i>
          </button>
          <button
            onClick={nextImage}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
          >
            <i className="fas fa-chevron-right text-xs"></i>
          </button>
        </>
      )}

      {/* Indicadores de navegação */}
      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {images.map((img, index) => (
            <button
              key={img.key}
              onClick={(e) => goToImage(index, e)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-white w-3'
                  : 'bg-white/50 hover:bg-white/80'
              }`}
              title={img.label}
            />
          ))}
        </div>
      )}

      {/* Label da imagem atual */}
      <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/40 backdrop-blur-sm text-white text-[9px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        {images[currentIndex].label}
      </div>
    </div>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const saved = localStorage.getItem('vizzu_currentPage');
    return (saved as Page) || 'dashboard';
  });
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('profile');
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showProductDetail, setShowProductDetail] = useState<Product | null>(null);
const [selectedFrontImage, setSelectedFrontImage] = useState<string | null>(null);
const [selectedBackImage, setSelectedBackImage] = useState<string | null>(null);
const [uploadTarget, setUploadTarget] = useState<'front' | 'back'>('front');
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [showPhotoSourcePicker, setShowPhotoSourcePicker] = useState<'front' | 'back' | null>(null);
  const [successNotification, setSuccessNotification] = useState<string | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [lastCreatedProductId, setLastCreatedProductId] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [filterCollection, setFilterCollection] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showDeleteProductsModal, setShowDeleteProductsModal] = useState(false);
  const [deleteProductTarget, setDeleteProductTarget] = useState<Product | null>(null);
  const [productForCreation, setProductForCreation] = useState<Product | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const [newProduct, setNewProduct] = useState({ name: '', brand: '', color: '', category: '', collection: '' });
  const [productAttributes, setProductAttributes] = useState<ProductAttributes>({});

  // Estados para análise de IA da imagem do produto
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [detectedProducts, setDetectedProducts] = useState<Array<{ type: string; color: string; pattern: string; material?: string; gender?: string; suggestedName?: string; confidence: number }>>([]);
  const [showProductSelector, setShowProductSelector] = useState(false);
  
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('vizzu_clients');
    if (saved) {
      try { return JSON.parse(saved); } catch { }
    }
    return [];
  });
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>(() => {
    const saved = localStorage.getItem('vizzu_history');
    if (saved) {
      try { return JSON.parse(saved); } catch { }
    }
    return [];
  });
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showClientDetail, setShowClientDetail] = useState<Client | null>(null);
  const [clientDetailLooks, setClientDetailLooks] = useState<ClientLook[]>([]);
  const [showWhatsAppLookModal, setShowWhatsAppLookModal] = useState<Client | null>(null);
  const [selectedLookForWhatsApp, setSelectedLookForWhatsApp] = useState<ClientLook | null>(null);
  const [whatsAppLookMessage, setWhatsAppLookMessage] = useState('');
  const [isSendingWhatsAppLook, setIsSendingWhatsAppLook] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editClientPhotos, setEditClientPhotos] = useState<ClientPhoto[]>([]);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [newClient, setNewClient] = useState({ firstName: '', lastName: '', whatsapp: '', email: '', gender: '' as 'male' | 'female' | '', photos: [] as ClientPhoto[], notes: '' });
  const [uploadingPhotoType, setUploadingPhotoType] = useState<ClientPhoto['type'] | null>(null);
  const [processingClientPhoto, setProcessingClientPhoto] = useState(false);
  const [showClientPhotoSourcePicker, setShowClientPhotoSourcePicker] = useState<{ photoType: ClientPhoto['type']; mode: 'create' | 'edit' } | null>(null);
  const [isSavingClient, setIsSavingClient] = useState(false);

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
  const [clientLooks, setClientLooks] = useState<ClientLook[]>([]);
  const [savingLook, setSavingLook] = useState(false);
  const [selectedSavedLook, setSelectedSavedLook] = useState<ClientLook | null>(null);
  const [showStudioPicker, setShowStudioPicker] = useState(false);
  const [showAddProductHint, setShowAddProductHint] = useState(false);
  const [showVideoTutorial, setShowVideoTutorial] = useState<'studio' | 'provador' | null>(null);

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

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('vizzu_theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  // Swipe navigation - estados para navegação por gestos
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  // Páginas principais para navegação por swipe (ordem da bottom nav)
  const SWIPE_PAGES: Page[] = ['dashboard', 'products', 'create', 'models', 'clients'];

  // Handlers de touch para swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const handleTouchEnd = () => {
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
      // Swipe para esquerda = avançar
      setCurrentPage(SWIPE_PAGES[currentIndex + 1]);
    } else if (isSwipeRight && currentIndex > 0) {
      // Swipe para direita = voltar
      setCurrentPage(SWIPE_PAGES[currentIndex - 1]);
    }

    setTouchStart(null);
    setTouchEnd(null);
  };
  
  const [whatsappTemplates] = useState<WhatsAppTemplate[]>(DEFAULT_WHATSAPP_TEMPLATES);

  // Saved Models
  const [savedModels, setSavedModels] = useState<SavedModel[]>([]);
  const [showCreateModel, setShowCreateModel] = useState(false);
  const [showModelDetail, setShowModelDetail] = useState<SavedModel | null>(null);
  const [editingModel, setEditingModel] = useState<SavedModel | null>(null);
  const [modelWizardStep, setModelWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [newModel, setNewModel] = useState({
    name: '',
    gender: 'woman' as 'woman' | 'man',
    ethnicity: 'brazilian',
    skinTone: 'medium',
    bodyType: 'average',
    ageRange: 'adult',
    height: 'medium',
    hairColor: 'brown',
    hairStyle: 'straight',
    hairLength: 'medium',
    eyeColor: 'brown',
    expression: 'natural-smile',
    bustSize: 'medium',
    waistType: 'medium',
    referenceImage: null as string | null,
    physicalNotes: '',
    hairNotes: '',
    skinNotes: '',
  });
  const [savingModel, setSavingModel] = useState(false);
  const [generatingModelImages, setGeneratingModelImages] = useState(false);
  const [modelPreviewImages, setModelPreviewImages] = useState<{ front?: string; back?: string; face?: string } | null>(null);
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);

  // Filtros da página de Modelos
  const [modelFilterGender, setModelFilterGender] = useState<string>('');
  const [modelFilterSkinTone, setModelFilterSkinTone] = useState<string>('');
  const [modelFilterAge, setModelFilterAge] = useState<string>('');
  const [modelFilterBodyType, setModelFilterBodyType] = useState<string>('');
  const [modelFilterSearch, setModelFilterSearch] = useState<string>('');

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
    if (modal.type === 'modelDetail') setShowModelDetail(null);
    if (modal.type === 'createProduct') setShowCreateProduct(false);
    if (modal.type === 'productDetail') setShowProductDetail(null);
    if (modal.type === 'createClient') setShowCreateClient(false);
    if (modal.type === 'clientDetail') setShowClientDetail(null);
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

  // Persistir company settings (localStorage + Supabase)
  useEffect(() => {
    localStorage.setItem('vizzu_company_settings', JSON.stringify(companySettings));
    // Sincronizar com Supabase se usuário estiver logado
    if (user?.id && companySettings.name) {
      saveCompanySettingsToSupabase(companySettings, user.id);
    }
  }, [companySettings, user?.id]);

  // Persistir clientes (sem fotos - fotos vêm do Supabase Storage)
  useEffect(() => {
    try {
      // Salvar clientes sem as fotos (fotos são carregadas do Supabase)
      const clientsWithoutPhotos = clients.map(c => ({
        ...c,
        photo: undefined,
        photos: []
      }));
      localStorage.setItem('vizzu_clients', JSON.stringify(clientsWithoutPhotos));
    } catch (e) {
      console.warn('Não foi possível salvar clientes no localStorage:', e);
    }
  }, [clients]);

  // Persistir histórico
  useEffect(() => {
    localStorage.setItem('vizzu_history', JSON.stringify(historyLogs));
  }, [historyLogs]);

  const clientPhotoInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [longPressProductId, setLongPressProductId] = useState<string | null>(null);

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
        setToast({ type: 'info', message: 'Redirecionando para pagamento...' });
      } else if (result.success) {
        // Modo demo/offline - créditos adicionados localmente
        setShowCreditModal(false);
        handleAddHistoryLog('Créditos adicionados', `${amount} créditos foram adicionados à sua conta`, 'success', [], 'system', 0);
        setToast({ type: 'success', message: `${amount} créditos adicionados!` });
      } else {
        setToast({ type: 'error', message: result.error || 'Erro ao processar compra' });
      }
    } catch (e: any) {
      console.error('Error buying credits:', e);
      setToast({ type: 'error', message: 'Erro ao processar compra' });
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
        setToast({ type: 'info', message: 'Redirecionando para pagamento...' });
      } else if (result.success) {
        // Modo demo/offline - plano alterado localmente
        setShowCreditModal(false);
        if (plan) {
          handleAddHistoryLog('Plano atualizado', `Você fez upgrade para o plano ${plan.name}`, 'success', [], 'system', 0);
          setToast({ type: 'success', message: `Upgrade para ${plan.name} realizado!` });
        }
      } else {
        setToast({ type: 'error', message: result.error || 'Erro ao processar upgrade' });
      }
    } catch (e: any) {
      console.error('Error upgrading plan:', e);
      setToast({ type: 'error', message: 'Erro ao processar upgrade' });
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || product.category === filterCategory;
    const matchesColor = !filterColor || product.color === filterColor;
    const matchesCollection = !filterCollection || product.collection === filterCollection;
    return matchesSearch && matchesCategory && matchesColor && matchesCollection;
  });
  
  const filteredClients = clients.filter(client => {
    const fullName = (client.firstName + ' ' + client.lastName).toLowerCase();
    return fullName.includes(clientSearchTerm.toLowerCase()) || client.whatsapp.includes(clientSearchTerm) || (client.email && client.email.toLowerCase().includes(clientSearchTerm.toLowerCase()));
  });
  
  const clientsWithProvador = clients.filter(c => c.hasProvadorIA && (c.photos?.length || c.photo));

// Função para carregar produtos do usuário do Supabase
const loadUserProducts = async (userId: string) => {
  try {
    const { data: productsData, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images (*)
      `)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    if (productsData && productsData.length > 0) {
      const formattedProducts: Product[] = productsData.map(p => {
        const allImages = p.product_images || [];
        
        // Separar imagens originais das geradas
        const originalImages = allImages.filter((img: any) => 
          img.type === 'original' || img.type === 'front' || img.type === 'back'
        );
        
        const generatedStudio = allImages.filter((img: any) => img.type === 'studio_ready');
        const generatedCenario = allImages.filter((img: any) => img.type === 'cenario_criativo');
        const generatedModelo = allImages.filter((img: any) => img.type === 'modelo_ia');
        const generatedProductStudio = allImages.filter((img: any) => img.type === 'product_studio');

        // Debug: verificar generation_id das imagens do Supabase
        if (generatedModelo.length > 0) {
          console.log('[Debug] Modelo IA images from Supabase:', generatedModelo.map((img: any) => ({
            id: img.id,
            generation_id: img.generation_id,
            url: img.url?.substring(0, 50) + '...',
            metadata: img.metadata
          })));
        }

        // Formatar imagens originais para o array images
        const formattedOriginalImages = originalImages.map((img: any) => ({
          id: img.id,
          name: img.file_name,
          url: img.url,
          base64: img.url,
          type: img.type === 'original' ? 'front' : img.type
        }));

        // Construir objeto originalImages por ângulo (para ProductStudio)
        const originalImagesObj: any = {};
        originalImages.forEach((img: any) => {
          const angle = img.angle || (img.type === 'original' ? 'front' : img.type);
          if (angle && !originalImagesObj[angle]) {
            originalImagesObj[angle] = {
              id: img.id,
              url: img.url,
              storagePath: img.storage_path
            };
          }
        });

        // Se não tiver front, usar a primeira imagem do array
        if (!originalImagesObj.front && formattedOriginalImages.length > 0) {
          originalImagesObj.front = {
            id: formattedOriginalImages[0].id,
            url: formattedOriginalImages[0].url
          };
        }

        // Agrupar imagens do Product Studio por generation_id para criar sessões
        const productStudioSessions: Record<string, any[]> = {};
        generatedProductStudio.forEach((img: any) => {
          const sessionId = img.generation_id || `session-${img.created_at?.split('T')[0] || 'unknown'}`;
          if (!productStudioSessions[sessionId]) {
            productStudioSessions[sessionId] = [];
          }
          productStudioSessions[sessionId].push(img);
        });

        // Formatar sessões do Product Studio
        const formattedProductStudio = Object.entries(productStudioSessions).map(([sessionId, images]) => ({
          id: sessionId,
          productId: p.id,
          images: images.map((img: any) => ({
            id: img.id,
            url: img.url,
            angle: img.angle || 'front',
            createdAt: img.created_at
          })),
          status: 'ready' as const,
          createdAt: images[0]?.created_at || new Date().toISOString()
        }));

        // Formatar imagens geradas para generatedImages
        const generatedImages = {
          studioReady: generatedStudio.map((img: any) => ({
            id: img.id,
            createdAt: img.created_at,
            tool: 'studio' as const,
            images: { front: img.url, back: undefined },
            metadata: img.metadata || {}
          })),
          cenarioCriativo: generatedCenario.map((img: any) => ({
            id: img.id,
            createdAt: img.created_at,
            tool: 'cenario' as const,
            images: { front: img.url, back: undefined },
            metadata: img.metadata || {}
          })),
          modeloIA: generatedModelo.map((img: any) => {
            // Parse metadata se for string (vem do Supabase como JSON stringificado)
            const metadata = typeof img.metadata === 'string'
              ? JSON.parse(img.metadata)
              : (img.metadata || {});
            return {
              id: img.id,
              createdAt: img.created_at,
              tool: 'lifestyle' as const,
              images: {
                front: img.url,
                back: metadata?.backImageUrl || undefined
              },
              metadata: metadata
            };
          }),
          productStudio: formattedProductStudio
        };
        
        return {
          id: p.id,
          sku: p.sku,
          name: p.name,
          description: p.description,
          category: p.category,
          brand: p.brand,
          color: p.color,
          fit: p.fit,
          collection: p.collection,
          attributes: p.attributes || {},
          images: formattedOriginalImages,
          originalImages: originalImagesObj,
          generatedImages: generatedImages
        };
      });
      
      setProducts(formattedProducts);
    } else {
      setProducts([]);
    }
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
  }
};

// Função para carregar clientes do usuário do Supabase
const loadUserClients = async (userId: string) => {
  try {
    // Buscar clientes
    const { data: clientsData, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      // Tabela pode não existir ainda - usar apenas localStorage
      console.log('Clientes: tabela não existe no Supabase, usando localStorage');
      return;
    }

    // Buscar fotos de todos os clientes
    const { data: photosData } = await supabase
      .from('client_photos')
      .select('*')
      .eq('user_id', userId);

    // Mapear fotos por client_id
    const photosByClient: Record<string, ClientPhoto[]> = {};
    if (photosData) {
      for (const p of photosData) {
        if (!photosByClient[p.client_id]) {
          photosByClient[p.client_id] = [];
        }
        photosByClient[p.client_id].push({
          type: p.type as ClientPhoto['type'],
          base64: p.url, // Usamos URL em vez de base64
          createdAt: p.created_at
        });
      }
    }

    // Pegar clientes locais para possível sincronização
    const localClients: Client[] = JSON.parse(localStorage.getItem('vizzu_clients') || '[]');

    if (clientsData && clientsData.length > 0) {
      const formattedClients: Client[] = clientsData.map(c => {
        const clientPhotos = photosByClient[c.id] || [];
        return {
          id: c.id,
          firstName: c.first_name,
          lastName: c.last_name,
          whatsapp: c.whatsapp,
          email: c.email || undefined,
          gender: c.gender || undefined,
          photo: clientPhotos[0]?.base64 || undefined,
          photos: clientPhotos,
          hasProvadorIA: clientPhotos.length > 0 || c.has_provador_ia || false,
          notes: c.notes || undefined,
          tags: c.tags || [],
          createdAt: c.created_at,
          updatedAt: c.updated_at || undefined,
          lastContactAt: c.last_contact_at || undefined,
          totalOrders: c.total_orders || 0,
          status: c.status || 'active',
        };
      });

      // Sincronizar clientes locais que não estão no servidor
      const serverIds = new Set(formattedClients.map(c => c.id));
      const localOnly = localClients.filter(c => !serverIds.has(c.id));
      localOnly.forEach(localClient => {
        saveClientToSupabase(localClient, userId);
      });

      // IMPORTANTE: Substituir estado local com dados do servidor + locais sincronizados
      setClients([...formattedClients, ...localOnly]);
      console.log(`Clientes: ${formattedClients.length} do servidor + ${localOnly.length} locais sincronizados`);
    } else {
      // Servidor vazio - sincronizar locais para o servidor
      const validLocalClients = localClients;
      if (validLocalClients.length > 0) {
        console.log(`Clientes: sincronizando ${validLocalClients.length} clientes locais para o servidor`);
        for (const client of validLocalClients) {
          await saveClientToSupabase(client, userId);
        }
        // Manter os clientes locais já que foram sincronizados
      } else {
        // Servidor vazio e local vazio - limpar estado
        setClients([]);
        console.log('Clientes: nenhum cliente encontrado');
      }
    }
  } catch (error) {
    console.error('Erro ao carregar clientes:', error);
  }
};

// Função para salvar cliente no Supabase
const saveClientToSupabase = async (client: Client, userId: string) => {
  try {
    // Nota: fotos são salvas na tabela client_photos separadamente
    const { error } = await supabase
      .from('clients')
      .upsert({
        id: client.id,
        user_id: userId,
        first_name: client.firstName,
        last_name: client.lastName,
        whatsapp: client.whatsapp,
        email: client.email || null,
        gender: client.gender || null,
        has_provador_ia: client.hasProvadorIA || false,
        notes: client.notes || null,
        created_at: client.createdAt,
        updated_at: client.updatedAt || null,
        last_contact_at: client.lastContactAt || null,
        total_orders: client.totalOrders || 0,
        status: client.status,
      }, { onConflict: 'id' });

    if (error) {
      console.log('Erro ao salvar cliente no Supabase (tabela pode não existir):', error.message);
    }
  } catch (error) {
    console.error('Erro ao salvar cliente:', error);
  }
};

// Função para deletar cliente do Supabase
const deleteClientFromSupabase = async (clientId: string) => {
  try {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId);

    if (error) {
      console.log('Erro ao deletar cliente do Supabase:', error.message);
    }
  } catch (error) {
    console.error('Erro ao deletar cliente:', error);
  }
};

// ═══════════════════════════════════════════════════════════════
// SINCRONIZAÇÃO DE HISTÓRICO
// ═══════════════════════════════════════════════════════════════

const loadUserHistory = async (userId: string) => {
  try {
    const { data: historyData, error } = await supabase
      .from('history_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.log('Histórico: tabela não existe no Supabase, usando localStorage');
      return;
    }

    const localHistory: HistoryLog[] = JSON.parse(localStorage.getItem('vizzu_history') || '[]');

    if (historyData && historyData.length > 0) {
      const formattedHistory: HistoryLog[] = historyData.map(h => ({
        id: h.id,
        date: h.date,
        action: h.action,
        details: h.details,
        status: h.status,
        method: h.method,
        cost: h.cost || 0,
        itemsCount: h.items_count || 0,
        createdAt: h.created_at ? new Date(h.created_at) : undefined,
      }));

      // Substituir estado com dados do servidor
      setHistoryLogs(formattedHistory);
      console.log(`Histórico: ${formattedHistory.length} registros carregados do servidor`);
    } else {
      // Servidor vazio - sincronizar locais
      if (localHistory.length > 0) {
        console.log(`Histórico: sincronizando ${localHistory.length} registros locais`);
        for (const log of localHistory.slice(0, 50)) {
          await saveHistoryToSupabase(log, userId);
        }
      } else {
        setHistoryLogs([]);
        console.log('Histórico: nenhum registro encontrado');
      }
    }
  } catch (error) {
    console.error('Erro ao carregar histórico:', error);
  }
};

const saveHistoryToSupabase = async (log: HistoryLog, userId: string) => {
  try {
    const { error } = await supabase
      .from('history_logs')
      .upsert({
        id: log.id,
        user_id: userId,
        date: log.date || new Date().toISOString(),
        action: log.action,
        details: log.details,
        status: log.status,
        method: log.method,
        cost: log.cost || 0,
        items_count: log.itemsCount || log.items?.length || log.products?.length || 0,
        created_at: log.createdAt instanceof Date ? log.createdAt.toISOString() : (log.createdAt || new Date().toISOString()),
      }, { onConflict: 'id' });

    if (error) {
      console.log('Erro ao salvar histórico no Supabase:', error.message);
    }
  } catch (error) {
    console.error('Erro ao salvar histórico:', error);
  }
};

// ═══════════════════════════════════════════════════════════════
// SINCRONIZAÇÃO DE CONFIGURAÇÕES DA EMPRESA
// ═══════════════════════════════════════════════════════════════

const loadUserCompanySettings = async (userId: string) => {
  try {
    const { data: settingsData, error } = await supabase
      .from('company_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    const localSettings = JSON.parse(localStorage.getItem('vizzu_company_settings') || '{}');

    if (error) {
      if (error.code === 'PGRST116') {
        // Não encontrado no servidor - sincronizar local se existir
        if (localSettings.name) {
          console.log('Configurações: sincronizando do localStorage para o servidor');
          await saveCompanySettingsToSupabase(localSettings, userId);
        }
      } else {
        console.log('Configurações: tabela não existe no Supabase, usando localStorage');
      }
      return;
    }

    if (settingsData) {
      const formattedSettings: CompanySettings = {
        name: settingsData.name || '',
        cnpj: settingsData.cnpj || undefined,
        instagram: settingsData.instagram || undefined,
        targetAudience: settingsData.target_audience || '',
        voiceTone: settingsData.voice_tone || 'casual',
        voiceExamples: settingsData.voice_examples || undefined,
        hashtags: settingsData.hashtags || [],
        emojisEnabled: settingsData.emojis_enabled ?? true,
        captionStyle: settingsData.caption_style || 'media',
        callToAction: settingsData.call_to_action || undefined,
      };

      setCompanySettings(formattedSettings);
      console.log('Configurações: carregadas do servidor');
    }
  } catch (error) {
    console.error('Erro ao carregar configurações:', error);
  }
};

const saveCompanySettingsToSupabase = async (settings: CompanySettings, userId: string) => {
  try {
    const { error } = await supabase
      .from('company_settings')
      .upsert({
        user_id: userId,
        name: settings.name,
        cnpj: settings.cnpj || null,
        instagram: settings.instagram || null,
        target_audience: settings.targetAudience,
        voice_tone: settings.voiceTone,
        voice_examples: settings.voiceExamples || null,
        hashtags: settings.hashtags || [],
        emojis_enabled: settings.emojisEnabled,
        caption_style: settings.captionStyle,
        call_to_action: settings.callToAction || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      console.log('Erro ao salvar configurações no Supabase:', error.message);
    }
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
  }
};

  // Check for existing Supabase session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const userId = session.user.id;
        const userEmail = session.user.email;

        // Verificar se é um usuário diferente do último logado
        const lastUserId = localStorage.getItem('vizzu_last_user_id');
        if (lastUserId && lastUserId !== userId) {
          console.log('⚠️ Usuário diferente detectado! Limpando dados locais antigos...');
          localStorage.removeItem('vizzu_clients');
          localStorage.removeItem('vizzu_history');
          localStorage.removeItem('vizzu_company_settings');
          localStorage.removeItem('vizzu_credits_data');
        }
        localStorage.setItem('vizzu_last_user_id', userId);

        setUser({
          id: userId,
          name: session.user.user_metadata?.full_name || 'Usuário',
          email: userEmail || '',
          avatar: session.user.user_metadata?.avatar_url || '',
          plan: 'Free'
        });
        setIsAuthenticated(true);
        // Carregar todos os dados do usuário
        loadUserProducts(userId);
        loadUserClients(userId);
        loadUserHistory(userId);
        loadUserCompanySettings(userId);
        // Nota: savedModels carrega automaticamente via useEffect quando user muda
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const userId = session.user.id;
        const userEmail = session.user.email;

        // Verificar se é um usuário diferente
        const lastUserId = localStorage.getItem('vizzu_last_user_id');
        if (lastUserId && lastUserId !== userId) {
          // Usuário diferente - limpar dados locais antigos
          localStorage.removeItem('vizzu_clients');
          localStorage.removeItem('vizzu_history');
          localStorage.removeItem('vizzu_company_settings');
          localStorage.removeItem('vizzu_credits_data');
        }
        localStorage.setItem('vizzu_last_user_id', userId);

        setUser({
          id: userId,
          name: session.user.user_metadata?.full_name || 'Usuário',
          email: userEmail || '',
          avatar: session.user.user_metadata?.avatar_url || '',
          plan: 'Free'
        });
        setIsAuthenticated(true);
        // Carregar todos os dados do usuário
        loadUserProducts(userId);
        loadUserClients(userId);
        loadUserHistory(userId);
        loadUserCompanySettings(userId);
        // Nota: savedModels carrega automaticamente via useEffect quando user muda
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Persistir página atual no localStorage
  useEffect(() => {
    localStorage.setItem('vizzu_currentPage', currentPage);
  }, [currentPage]);

  // Persistir tema no localStorage e atualizar theme-color para PWA
  useEffect(() => {
    localStorage.setItem('vizzu_theme', theme);
    // Atualiza a cor do tema na status bar do PWA/mobile
    const themeColorMeta = document.querySelector('meta[name="theme-color"]:not([media])') || document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', theme === 'dark' ? '#0a0a0a' : '#ffffff');
    }
  }, [theme]);

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

  // Fechar modais com Esc
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showBulkImport) setShowBulkImport(false);
        else if (showCreateProduct) setShowCreateProduct(false);
        else if (showImport) setShowImport(false);
        else if (showProductDetail) setShowProductDetail(null);
        else if (showCreateClient) setShowCreateClient(false);
        else if (showClientDetail) setShowClientDetail(null);
        else if (showClientPicker) setShowClientPicker(false);
        else if (showVideoTutorial) setShowVideoTutorial(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showBulkImport, showCreateProduct, showImport, showProductDetail, showCreateClient, showClientDetail, showClientPicker, showVideoTutorial]);

  // Scroll automático para produto recém-criado
  useEffect(() => {
    if (lastCreatedProductId && products.length > 0) {
      // Ir para Produtos para ver o produto
      setCurrentPage('products');

      // Pequeno delay para o DOM renderizar
      setTimeout(() => {
        const productElement = document.querySelector(`[data-product-id="${lastCreatedProductId}"]`);
        if (productElement) {
          productElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setLastCreatedProductId(null);
      }, 300);
    }
  }, [lastCreatedProductId, products]);

  const handleUpdateProduct = (productId: string, updates: Partial<Product>) => { 
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...updates } : p)); 
  };
  
  const handleDeductCredits = (amount: number, reason: string): boolean => {
    return deductCredits(amount, reason);
  };

  // Função para mostrar toast
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Função para toggle seleção de produto
  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Funções para long press (seleção estilo iPhone)
  const handleProductTouchStart = (productId: string) => {
    setLongPressProductId(productId);
    longPressTimer.current = setTimeout(() => {
      // Long press detectado - ativa modo seleção
      toggleProductSelection(productId);
      setLongPressProductId(null);
      // Vibração haptic feedback (se disponível)
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };

  const handleProductTouchEnd = (productId: string) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    // Se ainda é o mesmo produto (não foi long press)
    if (longPressProductId === productId) {
      setLongPressProductId(null);
      // Se está em modo de seleção, toggle seleção
      if (selectedProducts.length > 0) {
        toggleProductSelection(productId);
      } else {
        // Se não está em modo de seleção, abre o card
        const product = products.find(p => p.id === productId);
        if (product) setShowProductDetail(product);
      }
    }
  };

  const handleProductTouchMove = () => {
    // Cancelar long press se usuário moveu o dedo
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setLongPressProductId(null);
  };

  // Função para selecionar todos os produtos filtrados
  const selectAllProducts = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  // Função para deletar um produto
  const handleDeleteProduct = async (product: Product) => {
    // Remover do estado local imediatamente (UX responsiva)
    setProducts(prev => prev.filter(p => p.id !== product.id));
    setSelectedProducts(prev => prev.filter(id => id !== product.id));

    // Deletar do Supabase
    try {
      // Primeiro deletar as imagens do produto
      const { error: imagesError } = await supabase
        .from('product_images')
        .delete()
        .eq('product_id', product.id);

      if (imagesError) {
        console.error('Erro ao deletar imagens:', imagesError);
      }

      // Depois deletar o produto
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (error) {
        console.error('Erro ao deletar produto:', error);
        showToast('Erro ao excluir produto do servidor', 'error');
        // Recarregar produtos em caso de erro
        if (user?.id) {
          loadUserProducts(user.id);
        }
        return;
      }

      showToast(`"${product.name}" foi excluído`, 'success');
      handleAddHistoryLog('Produto excluído', `"${product.name}" foi removido do catálogo`, 'success', [product], 'manual', 0);
    } catch (e) {
      console.error('Erro ao deletar produto:', e);
      showToast('Erro ao excluir produto', 'error');
    }
  };

  // Função para deletar produtos selecionados
  const handleDeleteSelectedProducts = async () => {
    const count = selectedProducts.length;
    const productsToDelete = products.filter(p => selectedProducts.includes(p.id));

    // Remover do estado local imediatamente (UX responsiva)
    setProducts(prev => prev.filter(p => !selectedProducts.includes(p.id)));
    setSelectedProducts([]);
    setShowDeleteProductsModal(false);

    // Deletar do Supabase
    try {
      // Primeiro deletar as imagens dos produtos
      const { error: imagesError } = await supabase
        .from('product_images')
        .delete()
        .in('product_id', selectedProducts);

      if (imagesError) {
        console.error('Erro ao deletar imagens:', imagesError);
      }

      // Depois deletar os produtos
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', selectedProducts);

      if (error) {
        console.error('Erro ao deletar produtos:', error);
        showToast('Erro ao excluir produtos do servidor', 'error');
        // Recarregar produtos em caso de erro
        if (user?.id) {
          loadUserProducts(user.id);
        }
        return;
      }

      showToast(`${count} produto${count > 1 ? 's' : ''} excluído${count > 1 ? 's' : ''}`, 'success');
      handleAddHistoryLog('Produtos excluídos', `${count} produto${count > 1 ? 's foram removidos' : ' foi removido'} do catálogo`, 'success', productsToDelete, 'manual', 0);
    } catch (e) {
      console.error('Erro ao deletar produtos:', e);
      showToast('Erro ao excluir produtos', 'error');
    }
  };

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
          handleAddHistoryLog('Imagem gerada', `Studio Ready para "${product.name}"`, 'success', [product], 'ai', 1);
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
          handleAddHistoryLog('Imagem gerada', `Cenário Criativo para "${product.name}"`, 'success', [product], 'ai', 1);
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
          productAttributes: product.attributes,  // Atributos específicos (caimento, tamanho, etc.)
          lookItems: opts?.lookItems,
          productNotes: opts?.productNotes,       // Observações adicionais do produto
          modelDetails: opts?.modelDetails,       // Detalhes do modelo
        });

        if (result.success && result.generation) {
          if (result.credits_remaining !== undefined) {
            setCredits(result.credits_remaining);
          }
          loadUserProducts(user.id);
          handleAddHistoryLog('Imagem gerada', `Modelo IA para "${product.name}"`, 'success', [product], 'ai', 3);
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

  const handleFileSelect = (files: FileList, target: 'front' | 'back' = 'front') => {
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        if (target === 'front') {
          setSelectedFrontImage(base64);
          // Analisar imagem com IA para pré-preencher campos
          analyzeProductImageWithAI(base64);
        } else {
          setSelectedBackImage(base64);
        }
        setShowImport(false);
        setShowCreateProduct(true);
      };
      reader.readAsDataURL(file);
    }
  };
// Drag and Drop para imagens de produto
  const handleImageDrop = (e: React.DragEvent<HTMLDivElement>, type: 'front' | 'back') => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (type === 'front') {
          setSelectedFrontImage(base64);
          // Analisar imagem com IA para pré-preencher campos
          analyzeProductImageWithAI(base64);
        } else {
          setSelectedBackImage(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Função para analisar imagem do produto com IA
  const analyzeProductImageWithAI = async (imageBase64: string) => {
    setIsAnalyzingImage(true);
    setDetectedProducts([]);

    try {
      const result = await analyzeProductImage({ imageBase64, userId: user?.id });

      if (result.success && result.products.length > 0) {
        if (result.multipleProducts && result.products.length > 1) {
          // Múltiplos produtos detectados - mostrar seletor
          setDetectedProducts(result.products);
          setShowProductSelector(true);
        } else {
          // Produto único - preencher campos automaticamente
          applyDetectedProduct(result.products[0]);
        }
      }
    } catch (error) {
      console.error('Erro ao analisar imagem:', error);
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  // Função para aplicar produto detectado nos campos do formulário
  const applyDetectedProduct = (product: { type: string; color: string; pattern?: string; material?: string; gender?: string; brand?: string; fit?: string; suggestedName?: string }) => {
    // Mapear tipo detectado para categoria do sistema
    const categoryMap: Record<string, string> = {
      'Camiseta': 'Camiseta', 'Camisa': 'Camisa', 'Blusa': 'Blusa', 'Top': 'Top',
      'Regata': 'Regata', 'Cropped': 'Cropped', 'Body': 'Body', 'Moletom': 'Moletom',
      'Suéter': 'Suéter', 'Cardigan': 'Cardigan', 'Jaqueta': 'Jaqueta', 'Blazer': 'Blazer',
      'Colete': 'Colete', 'Casaco': 'Casaco', 'Calça': 'Calça', 'Shorts': 'Shorts',
      'Bermuda': 'Bermuda', 'Saia': 'Saia', 'Vestido': 'Vestido', 'Macacão': 'Macacão',
      'Jardineira': 'Jardineira', 'Legging': 'Legging', 'Tênis': 'Tênis', 'Sapato': 'Sapato',
      'Sandália': 'Sandália', 'Bota': 'Bota', 'Chinelo': 'Chinelo', 'Sapatilha': 'Sapatilha',
      'Bolsa': 'Bolsa', 'Mochila': 'Mochila', 'Carteira': 'Carteira', 'Cinto': 'Cinto',
      'Óculos': 'Óculos', 'Relógio': 'Relógio', 'Brinco': 'Brinco', 'Colar': 'Colar',
      'Pulseira': 'Pulseira', 'Anel': 'Anel', 'Chapéu': 'Chapéu', 'Boné': 'Boné',
      'Cachecol': 'Cachecol', 'Lenço': 'Lenço', 'Gravata': 'Gravata', 'Cueca': 'Cueca',
      'Calcinha': 'Calcinha', 'Sutiã': 'Sutiã', 'Meias': 'Meias', 'Pijama': 'Pijama',
      'Biquíni': 'Biquíni', 'Maiô': 'Maiô', 'Sunga': 'Sunga'
    };

    // Mapear categoria singular para plural (para CATEGORY_ATTRIBUTES)
    const categoryToPluralMap: Record<string, string> = {
      'Camiseta': 'Camisetas', 'Camisa': 'Camisas', 'Blusa': 'Blusas', 'Top': 'Tops',
      'Regata': 'Regatas', 'Vestido': 'Vestidos', 'Saia': 'Saias', 'Calça': 'Calças',
      'Shorts': 'Shorts', 'Bermuda': 'Bermudas', 'Jaqueta': 'Jaquetas', 'Casaco': 'Casacos'
    };

    // Mapear fit da IA para ID do atributo caimento
    const fitToAttributeMap: Record<string, string> = {
      'Slim': 'slim', 'Regular': 'regular', 'Oversized': 'oversized', 'Skinny': 'skinny',
      'Loose': 'solta', 'Cropped': 'cropped', 'Longline': 'longline', 'Relaxed': 'relaxed',
      'Boxy': 'boxy', 'Justa': 'justa', 'Solta': 'solta', 'Amplo': 'amplo',
      'Justo': 'justo', 'Evasê': 'evase', 'Reto': 'reto'
    };

    const matchedCategory = categoryMap[product.type] || '';
    const pluralCategory = categoryToPluralMap[product.type] || '';

    setNewProduct(prev => ({
      ...prev,
      name: product.suggestedName || prev.name,
      color: product.color || prev.color,
      category: matchedCategory || prev.category,
      brand: product.brand || prev.brand
    }));

    // Aplicar atributos baseado na categoria detectada
    const newAttributes: ProductAttributes = {};

    // Se detectou caimento/fit, mapear para o atributo correto
    if (product.fit) {
      const fitId = fitToAttributeMap[product.fit] || product.fit.toLowerCase();

      // Verificar se a categoria tem o atributo 'caimento'
      const categoryAttrs = CATEGORY_ATTRIBUTES[pluralCategory];
      if (categoryAttrs) {
        const caimentoAttr = categoryAttrs.find(attr => attr.id === 'caimento');
        if (caimentoAttr) {
          // Verificar se o valor é válido para esta categoria
          const validOption = caimentoAttr.options.find(opt => opt.id === fitId);
          if (validOption) {
            newAttributes.caimento = fitId;
          } else {
            // Tentar encontrar a opção mais próxima
            const normalizedFit = fitId.toLowerCase();
            const closeMatch = caimentoAttr.options.find(opt =>
              opt.id.toLowerCase().includes(normalizedFit) ||
              normalizedFit.includes(opt.id.toLowerCase())
            );
            if (closeMatch) {
              newAttributes.caimento = closeMatch.id;
            }
          }
        }
      }
    }

    // Definir comprimento padrão baseado no tipo de produto
    if (pluralCategory && CATEGORY_ATTRIBUTES[pluralCategory]) {
      const comprimentoAttr = CATEGORY_ATTRIBUTES[pluralCategory].find(attr => attr.id === 'comprimento');
      if (comprimentoAttr && comprimentoAttr.options.length > 0) {
        // Definir 'regular' como padrão se existir, senão o primeiro
        const regularOption = comprimentoAttr.options.find(opt => opt.id === 'regular');
        newAttributes.comprimento = regularOption ? 'regular' : comprimentoAttr.options[0].id;
      }
    }

    if (Object.keys(newAttributes).length > 0) {
      setProductAttributes(newAttributes);
    }

    setShowProductSelector(false);
    setDetectedProducts([]);
  };

  // Handler para seleção de produto detectado
  const handleSelectDetectedProduct = (product: typeof detectedProducts[0]) => {
    applyDetectedProduct(product);
  };

  const handleCreateProduct = async () => {
    if (!selectedFrontImage || !newProduct.name || !newProduct.category) {
      alert('Preencha pelo menos o nome, categoria e adicione a foto de frente');
      return;
    }

    setIsCreatingProduct(true);

    try {
      const n8nUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
      if (!n8nUrl) {
        throw new Error('URL do webhook não configurada');
      }
      const response = await fetch(`${n8nUrl}/vizzu/produto-importar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          sku: 'SKU-' + Date.now().toString().slice(-6),
          name: newProduct.name,
          brand: newProduct.brand || null,
          color: newProduct.color || null,
          category: newProduct.category,
          collection: newProduct.collection || null,
          attributes: Object.keys(productAttributes).length > 0 ? productAttributes : null,
          image_front_base64: selectedFrontImage,
          image_back_base64: selectedBackImage || null
        })
      });

      const data = await response.json();

      if (data.success) {
        if (user?.id) {
          await loadUserProducts(user.id);
        }
        setShowCreateProduct(false);
        setShowImport(false);
        setSelectedFrontImage(null);
        setSelectedBackImage(null);
        setNewProduct({ name: '', brand: '', color: '', category: '', collection: '' });
        setProductAttributes({});

        // Notificação de sucesso
        setSuccessNotification('Produto criado com sucesso!');
        setTimeout(() => setSuccessNotification(null), 3000);

        // Guardar ID para scroll (o produto mais recente terá o SKU gerado)
        if (data.product?.id) {
          setLastCreatedProductId(data.product.id);
        }

        // Log no histórico
        handleAddHistoryLog('Produto criado', `"${newProduct.name}" foi adicionado ao catálogo`, 'success', [], 'manual', 0);
      } else {
        alert('Erro ao criar produto: ' + (data.error || 'Tente novamente'));
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao criar produto. Verifique sua conexão.');
    } finally {
      setIsCreatingProduct(false);
    }
  };

const handleRemoveClientPhoto = (type: ClientPhoto['type']) => {
    setNewClient(prev => ({ ...prev, photos: prev.photos.filter(p => p.type !== type) }));
  };

  // Upload de foto do cliente para o Storage
  const uploadClientPhoto = async (userId: string, clientId: string, photo: ClientPhoto): Promise<{ url: string; storagePath: string } | null> => {
    try {
      // Converter base64 para blob
      const base64Data = photo.base64.replace(/^data:image\/\w+;base64,/, '');
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      // Detectar tipo da imagem
      const mimeType = photo.base64.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';
      const extension = mimeType.split('/')[1] || 'jpg';
      const blob = new Blob([byteArray], { type: mimeType });

      // Caminho: userId/clientId/tipo.ext
      const storagePath = `${userId}/${clientId}/${photo.type}.${extension}`;

      // Upload para o Storage
      const { error: uploadError } = await supabase.storage
        .from('client-photos')
        .upload(storagePath, blob, { upsert: true });

      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        return null;
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('client-photos')
        .getPublicUrl(storagePath);

      return { url: urlData.publicUrl, storagePath };
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      return null;
    }
  };

  // Salvar referência da foto no banco
  const saveClientPhotoToDb = async (userId: string, clientId: string, photo: ClientPhoto, url: string, storagePath: string) => {
    try {
      const { error } = await supabase
        .from('client_photos')
        .upsert({
          client_id: clientId,
          user_id: userId,
          type: photo.type,
          storage_path: storagePath,
          url: url
        }, { onConflict: 'client_id,type' });

      if (error) {
        console.log('Erro ao salvar foto no banco:', error.message);
      }
    } catch (error) {
      console.error('Erro ao salvar foto:', error);
    }
  };

  // Carregar fotos do cliente do Storage
  const loadClientPhotos = async (clientId: string): Promise<ClientPhoto[]> => {
    try {
      const { data, error } = await supabase
        .from('client_photos')
        .select('*')
        .eq('client_id', clientId);

      if (error || !data) return [];

      return data.map(p => ({
        type: p.type as ClientPhoto['type'],
        base64: p.url, // Usamos a URL em vez de base64
        createdAt: p.created_at
      }));
    } catch (error) {
      console.error('Erro ao carregar fotos:', error);
      return [];
    }
  };

  const handleCreateClient = async () => {
    if (!newClient.firstName || !newClient.lastName || !newClient.whatsapp) {
      alert('Preencha nome, sobrenome e WhatsApp');
      return;
    }

    // Bloquear botão para evitar múltiplos cliques
    setIsSavingClient(true);

    try {
      const clientId = crypto.randomUUID();
      const photosToUpload = [...newClient.photos];

      const client: Client = {
        id: clientId,
        firstName: newClient.firstName,
        lastName: newClient.lastName,
        whatsapp: newClient.whatsapp.replace(/\D/g, ''),
        email: newClient.email || undefined,
        gender: newClient.gender || undefined,
        photos: photosToUpload.length > 0 ? photosToUpload : undefined,
        photo: photosToUpload[0]?.base64,
        hasProvadorIA: photosToUpload.length > 0,
        notes: newClient.notes || undefined,
        status: 'active',
        createdAt: new Date().toISOString(),
        totalOrders: 0
      };

      // Adicionar cliente ao estado
      setClients(prev => [...prev, client]);

      // Sincronizar com Supabase
      if (user?.id) {
        // Salvar cliente no banco
        await saveClientToSupabase(client, user.id);

        // Upload das fotos para o Storage
        if (photosToUpload.length > 0) {
          const uploadedPhotos: ClientPhoto[] = [];

          for (const photo of photosToUpload) {
            const result = await uploadClientPhoto(user.id, clientId, photo);
            if (result) {
              await saveClientPhotoToDb(user.id, clientId, photo, result.url, result.storagePath);
              uploadedPhotos.push({ ...photo, base64: result.url });
            }
          }

          // Atualizar cliente com URLs das fotos
          if (uploadedPhotos.length > 0) {
            setClients(prev => prev.map(c =>
              c.id === clientId
                ? { ...c, photos: uploadedPhotos, photo: uploadedPhotos[0]?.base64 }
                : c
            ));
          }
        }
      }

      // Log no histórico
      handleAddHistoryLog('Cliente cadastrado', `${client.firstName} ${client.lastName} foi adicionado`, 'success', [], 'manual', 0);

      // Fechar modal e limpar formulário
      setShowCreateClient(false);
      setNewClient({ firstName: '', lastName: '', whatsapp: '', email: '', gender: '', photos: [], notes: '' });

      // Mostrar notificação de sucesso
      setSuccessNotification('Cliente cadastrado com sucesso!');
      setTimeout(() => setSuccessNotification(null), 3000);

      // Navegação baseada na origem
      if (createClientFromProvador) {
        // Se veio do Provador, selecionar o cliente e voltar para lá
        setProvadorClient(client);
        setCurrentPage('provador');
        setCreateClientFromProvador(false);
      } else {
        // Se não veio do Provador, ir para lista de clientes
        setCurrentPage('clients');
      }
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      alert('Erro ao salvar cliente. Tente novamente.');
    } finally {
      setIsSavingClient(false);
    }
  };

  const handleDeleteClient = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      setClients(prev => prev.filter(c => c.id !== clientId));
      setShowClientDetail(null);

      // Sincronizar deleção com Supabase
      deleteClientFromSupabase(clientId);

      if (client) {
        handleAddHistoryLog('Cliente excluído', `${client.firstName} ${client.lastName} foi removido`, 'success', [], 'manual', 0);
      }
    }
  };

  const getClientPhoto = (client: Client, type?: ClientPhoto['type']): string | undefined => {
    if (type && client.photos) {
      const photo = client.photos.find(p => p.type === type);
      if (photo) return photo.base64;
    }
    if (client.photos?.length) return client.photos[0].base64;
    return client.photo;
  };

  // Função para iniciar edição de cliente
  const startEditingClient = (client: Client) => {
    setEditingClient({ ...client });
    setEditClientPhotos(client.photos ? [...client.photos] : []);
    setShowClientDetail(null);
  };

  // Função para processar foto no modo de edição
  const processEditClientPhoto = async (file: File, photoType: ClientPhoto['type']) => {
    setProcessingClientPhoto(true);
    try {
      let processedFile: File | Blob = file;
      const fileName = file.name.toLowerCase();
      const isHeic = file.type === 'image/heic' || file.type === 'image/heif' ||
                     fileName.endsWith('.heic') || fileName.endsWith('.heif') ||
                     (file.type === '' && (fileName.endsWith('.heic') || fileName.endsWith('.heif')));

      if (isHeic) {
        try {
          const convertedBlob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
          processedFile = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        } catch (heicError: any) {
          if (!heicError.message?.includes('already')) throw heicError;
        }
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        if (!base64 || base64.length < 100) {
          alert('Erro ao processar a imagem.');
          setProcessingClientPhoto(false);
          return;
        }
        const newPhoto: ClientPhoto = { type: photoType, base64, createdAt: new Date().toISOString() };
        setEditClientPhotos(prev => [...prev.filter(p => p.type !== photoType), newPhoto]);
        setProcessingClientPhoto(false);
      };
      reader.onerror = () => {
        alert('Erro ao ler a imagem.');
        setProcessingClientPhoto(false);
      };
      reader.readAsDataURL(processedFile);
    } catch (error: any) {
      alert(error.message || 'Erro ao processar a imagem.');
      setProcessingClientPhoto(false);
    }
  };

  // Função para salvar edição do cliente
  const saveEditingClient = async () => {
    if (!editingClient) return;

    const updatedClient: Client = {
      ...editingClient,
      photos: editClientPhotos.length > 0 ? editClientPhotos : undefined,
      photo: editClientPhotos[0]?.base64,
      hasProvadorIA: editClientPhotos.length > 0
    };

    // Atualizar no estado local
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));

    // Salvar no Supabase
    if (user?.id) {
      await saveClientToSupabase(updatedClient, user.id);

      // Upload das novas fotos
      for (const photo of editClientPhotos) {
        if (photo.base64.startsWith('data:')) {
          const result = await uploadClientPhoto(user.id, updatedClient.id, photo);
          if (result) {
            await saveClientPhotoToDb(user.id, updatedClient.id, photo, result.url, result.storagePath);
          }
        }
      }
    }

    setEditingClient(null);
    setEditClientPhotos([]);
    setSuccessNotification('Cliente atualizado com sucesso!');
    setTimeout(() => setSuccessNotification(null), 3000);
  };

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

  // Carregar looks quando abre detalhe do cliente
  useEffect(() => {
    const loadLooksForDetail = async () => {
      if (showClientDetail && user) {
        try {
          const { data, error } = await supabase
            .from('client_looks')
            .select('*')
            .eq('client_id', showClientDetail.id)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (!error && data) {
            const looks: ClientLook[] = data.map(l => ({
              id: l.id,
              clientId: l.client_id,
              userId: l.user_id,
              imageUrl: l.image_url,
              storagePath: l.storage_path,
              lookItems: l.look_items || {},
              createdAt: l.created_at,
            }));
            setClientDetailLooks(looks);
          }
        } catch (error) {
          console.error('Erro ao carregar looks do cliente:', error);
        }
      } else {
        setClientDetailLooks([]);
      }
    };
    loadLooksForDetail();
  }, [showClientDetail?.id, user]);

  // ═══════════════════════════════════════════════════════════════
  // SAVED MODELS - Funções para gerenciar modelos salvos
  // ═══════════════════════════════════════════════════════════════

  const loadSavedModels = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('saved_models')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const models: SavedModel[] = (data || []).map(m => ({
        id: m.id,
        userId: m.user_id,
        name: m.name,
        gender: m.gender,
        ethnicity: m.ethnicity,
        skinTone: m.skin_tone,
        bodyType: m.body_type,
        ageRange: m.age_range,
        height: m.height,
        hairColor: m.hair_color,
        hairStyle: m.hair_style,
        eyeColor: m.eye_color,
        expression: m.expression,
        bustSize: m.bust_size,
        waistType: m.waist_type,
        referenceImageUrl: m.reference_image_url,
        referenceStoragePath: m.reference_storage_path,
        images: typeof m.images === 'string' ? JSON.parse(m.images) : (m.images || {}),
        status: m.status,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      }));

      console.log('Modelos carregados:', models);
      setSavedModels(models);
    } catch (error) {
      console.error('Erro ao carregar modelos:', error);
    }
  };

  // Carregar modelos ao autenticar
  useEffect(() => {
    if (user) {
      loadSavedModels();
    }
  }, [user?.id]);

  const getModelLimit = () => {
    // Free: 1 modelo, Pagos: 10 modelos
    const plan = user?.plan || 'free';
    return plan === 'free' ? 1 : 10;
  };

  const canCreateModel = () => {
    return savedModels.length < getModelLimit();
  };

  const resetModelWizard = () => {
    setModelWizardStep(1);
    setNewModel({
      name: '',
      gender: 'woman',
      ethnicity: 'brazilian',
      skinTone: 'medium',
      bodyType: 'average',
      ageRange: 'adult',
      height: 'medium',
      hairColor: 'brown',
      hairStyle: 'straight',
      hairLength: 'medium',
      eyeColor: 'brown',
      expression: 'natural-smile',
      bustSize: 'medium',
      waistType: 'medium',
      referenceImage: null,
      physicalNotes: '',
      hairNotes: '',
      skinNotes: '',
    });
    setEditingModel(null);
    setModelPreviewImages(null);
    setGeneratingModelImages(false);
  };

  // Gerar preview do modelo (sem salvar no DB ainda)
  const generateModelPreview = async () => {
    if (!user || !newModel.name.trim()) return;

    setGeneratingModelImages(true);
    setModelPreviewImages(null);

    try {
      const result = await generateModelImages({
        modelId: 'preview-' + Date.now(), // ID temporário para preview
        userId: user.id,
        modelProfile: {
          name: newModel.name.trim(),
          gender: newModel.gender,
          ethnicity: newModel.ethnicity,
          skinTone: newModel.skinTone,
          bodyType: newModel.bodyType,
          ageRange: newModel.ageRange,
          height: newModel.height,
          hairColor: newModel.hairColor,
          hairStyle: newModel.hairStyle,
          hairLength: newModel.hairLength,
          eyeColor: newModel.eyeColor,
          expression: newModel.expression,
          bustSize: newModel.gender === 'woman' ? newModel.bustSize : undefined,
          waistType: newModel.waistType,
          physicalNotes: newModel.physicalNotes || undefined,
          hairNotes: newModel.hairNotes || undefined,
          skinNotes: newModel.skinNotes || undefined,
        },
        prompt: generateModelPrompt(), // Prompt otimizado para Flux 2.0
      });

      if (result.success && result.model?.images) {
        setModelPreviewImages(result.model.images);
      } else {
        throw new Error(result.error || 'Erro ao gerar preview');
      }
    } catch (error) {
      console.error('Erro ao gerar preview:', error);
      alert('Erro ao gerar preview do modelo. Tente novamente.');
    } finally {
      setGeneratingModelImages(false);
    }
  };

  const saveModel = async () => {
    if (!user || !newModel.name.trim()) return null;

    setSavingModel(true);
    try {
      // Se já tem preview, salva como 'ready' com as imagens
      const hasPreview = modelPreviewImages && (modelPreviewImages.front || modelPreviewImages.back || modelPreviewImages.face);

      const modelData = {
        user_id: user.id,
        name: newModel.name.trim(),
        gender: newModel.gender,
        ethnicity: newModel.ethnicity,
        skin_tone: newModel.skinTone,
        body_type: newModel.bodyType,
        age_range: newModel.ageRange,
        height: newModel.height,
        hair_color: newModel.hairColor,
        hair_style: newModel.hairStyle,
        eye_color: newModel.eyeColor,
        expression: newModel.expression,
        bust_size: newModel.gender === 'woman' ? newModel.bustSize : null,
        waist_type: newModel.gender === 'woman' ? newModel.waistType : null,
        reference_image_url: newModel.referenceImage,
        status: hasPreview ? 'ready' : 'draft',
        images: hasPreview ? modelPreviewImages : {},
      };

      let result;
      if (editingModel) {
        // Atualizar modelo existente
        const { data, error } = await supabase
          .from('saved_models')
          .update(modelData)
          .eq('id', editingModel.id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Criar novo modelo
        const { data, error } = await supabase
          .from('saved_models')
          .insert(modelData)
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      await loadSavedModels();
      setShowCreateModel(false);
      resetModelWizard();

      return result;
    } catch (error) {
      console.error('Erro ao salvar modelo:', error);
      alert('Erro ao salvar modelo. Tente novamente.');
      return null;
    } finally {
      setSavingModel(false);
    }
  };

  // Handler para salvar modelo a partir do LookComposer
  const handleSaveModel = (model: SavedModel) => {
    setSavedModels(prev => [...prev, model]);
  };

  const deleteModel = async (model: SavedModel) => {
    if (!user) return;

    try {
      // Deletar imagem de referência se existir
      if (model.referenceStoragePath) {
        await supabase.storage
          .from('model-references')
          .remove([model.referenceStoragePath]);
      }

      // Deletar imagens geradas
      if (model.images) {
        const imagePaths = [];
        if (model.images.front) imagePaths.push(`${user.id}/${model.id}/front.png`);
        if (model.images.back) imagePaths.push(`${user.id}/${model.id}/back.png`);
        if (model.images.face) imagePaths.push(`${user.id}/${model.id}/face.png`);
        if (imagePaths.length > 0) {
          await supabase.storage.from('model-images').remove(imagePaths);
        }
      }

      // Deletar do banco
      const { error } = await supabase
        .from('saved_models')
        .delete()
        .eq('id', model.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setSavedModels(prev => prev.filter(m => m.id !== model.id));
      if (showModelDetail?.id === model.id) {
        setShowModelDetail(null);
      }
    } catch (error) {
      console.error('Erro ao deletar modelo:', error);
      alert('Erro ao deletar modelo.');
    }
  };

  const getModelLabel = (field: keyof typeof MODEL_OPTIONS, id: string) => {
    const options = MODEL_OPTIONS[field] as { id: string; label: string }[];
    return options?.find(o => o.id === id)?.label || id;
  };

  // Função para gerar o prompt do modelo para Flux 2.0
  // Otimizado seguindo documentação: Subject + Action + Style + Context
  const generateModelPrompt = () => {
    // Traduções para inglês (melhor resultado no Flux)
    const translations: Record<string, Record<string, string>> = {
      gender: { 'woman': 'woman', 'man': 'man' },
      ethnicity: {
        'caucasian': 'Caucasian', 'latino': 'Latino/Hispanic', 'black': 'Black/African',
        'asian': 'East Asian', 'indian': 'South Asian/Indian', 'middle-eastern': 'Middle Eastern', 'mixed': 'Mixed race'
      },
      skinTone: {
        'very-light': 'very fair/porcelain', 'light': 'fair', 'medium-light': 'light olive',
        'medium': 'medium/olive', 'medium-dark': 'tan', 'dark': 'brown', 'very-dark': 'deep brown/ebony'
      },
      bodyType: { 'slim': 'slim/slender', 'athletic': 'athletic/toned', 'average': 'average', 'curvy': 'curvy', 'plus': 'plus size' },
      ageRange: {
        'baby': '0-2 years old baby', 'child': '3-12 years old child', 'teen': '13-19 years old teenager',
        'young': '20-25 years old young adult', 'adult': '25-35 years old adult', 'mature': '35-50 years old mature adult',
        'senior': '50-60 years old senior', 'elderly': '60+ years old elderly'
      },
      height: { 'very-short': 'petite', 'short': 'below average height', 'medium': 'average height', 'tall': 'tall', 'very-tall': 'very tall' },
      hairColor: {
        'black': 'jet black', 'dark-brown': 'dark brown', 'brown': 'brown', 'light-brown': 'light brown/chestnut',
        'blonde': 'blonde', 'platinum': 'platinum blonde', 'red': 'red/auburn', 'gray': 'gray/silver', 'white': 'white'
      },
      hairStyle: { 'straight': 'straight', 'wavy': 'wavy', 'curly': 'curly', 'coily': 'coily/kinky', 'braided': 'braided' },
      hairLength: { 'bald': 'bald/shaved', 'very-short': 'buzz cut', 'short': 'short', 'medium': 'medium length', 'long': 'long', 'very-long': 'very long' },
      eyeColor: { 'black': 'dark brown/black', 'dark-brown': 'dark brown', 'brown': 'brown', 'hazel': 'hazel', 'green': 'green', 'blue': 'blue', 'gray': 'gray' },
      expression: { 'neutral': 'neutral/relaxed', 'smile': 'gentle smile', 'serious': 'serious/confident', 'happy': 'happy/joyful', 'professional': 'professional/poised' },
      bustSize: { 'small': 'small bust', 'medium': 'medium bust', 'large': 'large bust' },
      waistType: { 'defined': 'defined waist', 'straight': 'straight torso', 'hourglass': 'hourglass figure' }
    };

    const t = (cat: string, val: string) => translations[cat]?.[val] || val;

    // Subject (quem é o modelo)
    const subject = `${t('ageRange', newModel.ageRange)} ${t('ethnicity', newModel.ethnicity)} ${t('gender', newModel.gender)}, ${t('skinTone', newModel.skinTone)} skin, ${t('bodyType', newModel.bodyType)} body type, ${t('height', newModel.height)}`;

    // Hair
    const hairLen = newModel.hairLength || 'medium';
    const hair = hairLen === 'bald' ? 'bald/shaved head' : `${t('hairColor', newModel.hairColor)} ${t('hairLength', hairLen)} ${t('hairStyle', newModel.hairStyle)} hair`;

    // Face
    const face = `${t('eyeColor', newModel.eyeColor)} eyes, ${t('expression', newModel.expression)} expression`;

    // Body specifics (women only)
    const bodyParts = [];
    if (newModel.gender === 'woman' && newModel.bustSize) bodyParts.push(t('bustSize', newModel.bustSize));
    if (newModel.waistType) bodyParts.push(t('waistType', newModel.waistType));
    const bodySpecifics = bodyParts.join(', ');

    // Build full prompt
    let prompt = `${subject}. ${hair}. ${face}`;
    if (bodySpecifics) prompt += `. ${bodySpecifics}`;

    // Custom notes
    const notes = [];
    if (newModel.physicalNotes) notes.push(`Physical: ${newModel.physicalNotes}`);
    if (newModel.hairNotes) notes.push(`Hair: ${newModel.hairNotes}`);
    if (newModel.skinNotes) notes.push(`Skin: ${newModel.skinNotes}`);
    if (notes.length > 0) prompt += `\n\n${notes.join('. ')}`;

    // Style/Context - sempre inclusos
    prompt += '\n\n📸 Configurações fixas:\n';
    prompt += '• Fundo: cinza neutro (#B0B0B0)\n';
    prompt += '• Roupa: camiseta branca com logo Vizzu + jeans azul\n';
    prompt += '• Iluminação: estúdio profissional\n';
    prompt += '• Câmera: Canon EOS R5, 85mm f/1.4';

    return prompt;
  };

  const formatWhatsApp = (phone: string) => { 
    const digits = phone.replace(/\D/g, ''); 
    if (digits.length === 11) { 
      return '(' + digits.slice(0,2) + ') ' + digits.slice(2,7) + '-' + digits.slice(7); 
    } 
    return phone; 
  };

  const handleSendWhatsApp = (client: Client, message: string) => {
    const phone = client.whatsapp.replace(/\D/g, '');
    const fullPhone = phone.startsWith('55') ? phone : '55' + phone;
    const encodedMessage = encodeURIComponent(message);
    window.open('https://wa.me/' + fullPhone + '?text=' + encodedMessage, '_blank');
  };

  const handleLogout = async () => { 
    await supabase.auth.signOut(); 
    setUser(null);
    setIsAuthenticated(false);
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
      } catch (error) {
        // Usuário cancelou ou erro - usa fallback
        console.log('Share API não disponível ou cancelado, usando fallback');
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
    look: LookComposition
  ): Promise<string | null> => {
    if (!client || !user || Object.keys(look).length === 0) return null;

    // Verificar creditos
    if (!checkCreditsAndShowModal(3, 'provador')) {
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
        lookComposition: lookCompositionPayload
      });

      clearInterval(loadingInterval);
      clearInterval(progressInterval);
      setProvadorProgress(100);

      if (result.success && result.generation) {
        if (result.credits_remaining !== undefined) {
          setCredits(result.credits_remaining);
        }
        handleAddHistoryLog('Provador gerado', `Look para ${client.firstName}`, 'success', [], 'ai', 3);
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
    // Emojis para cada tipo de peça
    const lookEmojis: Record<string, string> = {
      head: '🧢',
      top: '👕',
      bottom: '👖',
      feet: '👟',
      accessory1: '💼',
      accessory2: '⌚',
    };

    // Formatar os itens do look
    const formatLookItems = () => {
      const items: string[] = [];
      const lookKeys = ['head', 'top', 'bottom', 'feet', 'accessory1', 'accessory2'] as const;

      lookKeys.forEach(key => {
        const item = look[key];
        if (item && item.name) {
          const emoji = lookEmojis[key] || '👔';
          // Por enquanto preço fictício - no futuro virá do produto
          const price = 'Consulte';
          items.push(`${emoji} ${item.name} — ${price}`);
        }
      });

      return items.join('\n');
    };

    // Monta a mensagem final com os produtos
    const baseMessage = message.replace('{nome}', client.firstName);
    const lookItemsFormatted = formatLookItems();
    const finalMessage = lookItemsFormatted
      ? `${baseMessage}\n\n${lookItemsFormatted}`
      : baseMessage;

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

      console.log('Evolution API falhou, tentando fallback:', result.error);
    } catch (error) {
      console.log('Erro Evolution API, usando fallback:', error);
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
    } catch (error) {
      console.log('Share API falhou, usando wa.me');
    }

    // Fallback final: WhatsApp com texto + link da imagem
    const phone = client.whatsapp?.replace(/\D/g, '') || '';
    const fullPhone = phone.startsWith('55') ? phone : '55' + phone;
    const fullMessage = finalMessage + '\n\n' + imageUrl;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(fullMessage)}`, '_blank');
  };

  const handleProvadorDownloadImage = async (imageUrl: string, clientName: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vizzu_provador_${clientName.replace(/\s+/g, '_')}_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar imagem:', error);
      // Fallback: abrir em nova aba
      window.open(imageUrl, '_blank');
    }
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

  // Função para formatar itens do look com emojis
  const formatLookItemsForMessage = (lookItems: LookComposition): string => {
    const lookEmojis: Record<string, string> = {
      head: '🧢',
      top: '👕',
      bottom: '👖',
      feet: '👟',
      accessory1: '💼',
      accessory2: '⌚',
    };
    const items: string[] = [];
    const lookKeys = ['head', 'top', 'bottom', 'feet', 'accessory1', 'accessory2'] as const;
    lookKeys.forEach(key => {
      const item = lookItems[key];
      if (item && item.name) {
        const emoji = lookEmojis[key] || '👔';
        items.push(`${emoji} ${item.name} — Consulte`);
      }
    });
    return items.join('\n');
  };

  // Função para gerar mensagem completa para WhatsApp com look
  const generateWhatsAppLookMessage = (client: Client, look: ClientLook): string => {
    const baseMessage = `Oi ${client.firstName}! 😍\n\nMontei esse look especial pra você:`;
    const lookItems = formatLookItemsForMessage(look.lookItems);
    return lookItems ? `${baseMessage}\n\n${lookItems}` : baseMessage;
  };

  // Função para abrir modal de WhatsApp com looks
  const openWhatsAppLookModal = (client: Client) => {
    setShowWhatsAppLookModal(client);
    // Se tiver apenas 1 look, seleciona automaticamente
    if (clientDetailLooks.length === 1) {
      const look = clientDetailLooks[0];
      setSelectedLookForWhatsApp(look);
      setWhatsAppLookMessage(generateWhatsAppLookMessage(client, look));
    } else if (clientDetailLooks.length > 1) {
      setSelectedLookForWhatsApp(null);
      setWhatsAppLookMessage('');
    } else {
      // Sem looks, mensagem simples
      setWhatsAppLookMessage(`Oi ${client.firstName}! 😍`);
    }
  };

  // Função para enviar WhatsApp com look selecionado (via Evolution API / n8n)
  const sendWhatsAppWithLook = async () => {
    if (!showWhatsAppLookModal) return;
    const client = showWhatsAppLookModal;
    const imageUrl = selectedLookForWhatsApp?.imageUrl;

    setIsSendingWhatsAppLook(true);

    try {
      // Tenta enviar via Evolution API (envia imagem diretamente no WhatsApp)
      const result = await sendWhatsAppMessage({
        phone: client.whatsapp || '',
        message: whatsAppLookMessage,
        imageUrl: imageUrl,
        clientName: `${client.firstName} ${client.lastName}`,
      });

      if (result.success) {
        alert('WhatsApp enviado com sucesso!');
        setShowWhatsAppLookModal(null);
        setSelectedLookForWhatsApp(null);
        setWhatsAppLookMessage('');
        setIsSendingWhatsAppLook(false);
        return;
      }

      console.log('Evolution API falhou, tentando fallback:', result.error);
    } catch (error) {
      console.log('Erro Evolution API, usando fallback:', error);
    }

    // Fallback: Web Share API (mobile) ou wa.me (desktop)
    if (imageUrl) {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], 'look.png', { type: 'image/png' });

        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            text: whatsAppLookMessage
          });
          setShowWhatsAppLookModal(null);
          setSelectedLookForWhatsApp(null);
          setWhatsAppLookMessage('');
          setIsSendingWhatsAppLook(false);
          return;
        }
      } catch (error) {
        console.log('Share API falhou, usando wa.me');
      }
    }

    // Fallback final: WhatsApp com texto + link da imagem
    const phone = client.whatsapp?.replace(/\D/g, '') || '';
    const fullPhone = phone.startsWith('55') ? phone : '55' + phone;
    const fullMessage = imageUrl ? whatsAppLookMessage + '\n\n' + imageUrl : whatsAppLookMessage;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(fullMessage)}`, '_blank');

    setShowWhatsAppLookModal(null);
    setSelectedLookForWhatsApp(null);
    setWhatsAppLookMessage('');
    setIsSendingWhatsAppLook(false);
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

  const handleAddHistoryLog = (action: string, details: string, status: 'success' | 'error' | 'pending', items: Product[], method: 'manual' | 'auto' | 'api' | 'ai' | 'bulk' | 'system', cost: number) => {
    const newLog: HistoryLog = {
      id: `log-${Date.now()}`,
      date: new Date().toISOString(),
      action,
      details,
      status,
      items,
      method,
      cost,
      itemsCount: items.length,
      createdAt: new Date(),
    };
    setHistoryLogs(prev => [newLog, ...prev].slice(0, 100)); // Mantém últimos 100 registros

    // Sincronizar com Supabase se usuário estiver logado
    if (user?.id) {
      saveHistoryToSupabase(newLog, user.id);
    }
  };

  // Função para processar imagem (converte HEIC se necessário)
  const processImageFile = async (file: File): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        let processedFile: File | Blob = file;
        
        if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
          const convertedBlob = await heic2any({
            blob: file,
            toType: 'image/png',
            quality: 0.9
          });
          processedFile = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        }
        
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        reader.readAsDataURL(processedFile);
      } catch (error) {
        reject(error);
      }
    });
  };
  const handleProvadorGenerate = async () => {
    if (!provadorClient || !user || Object.keys(provadorLook).length === 0) return;

    // Verificar créditos
    if (!checkCreditsAndShowModal(3, 'provador')) {
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
        handleAddHistoryLog('Provador gerado', `Look para ${provadorClient.firstName}`, 'success', [], 'ai', 3);
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

  const handleClientPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingPhotoType) return;
    processClientPhotoFile(file, uploadingPhotoType);
  };

  // Função compartilhada para processar arquivo de foto (com conversão HEIC)
  const processClientPhotoFile = async (file: File, photoType: ClientPhoto['type']) => {
    setProcessingClientPhoto(true);

    try {
      let processedFile: File | Blob = file;

      // Detectar HEIC por extensão ou tipo MIME (iOS às vezes não reporta MIME correto)
      const fileName = file.name.toLowerCase();
      const isHeic = file.type === 'image/heic' ||
                     file.type === 'image/heif' ||
                     fileName.endsWith('.heic') ||
                     fileName.endsWith('.heif') ||
                     (file.type === '' && (fileName.endsWith('.heic') || fileName.endsWith('.heif')));

      console.log('[processClientPhotoFile] Arquivo:', file.name, 'Tipo:', file.type, 'Tamanho:', file.size, 'É HEIC:', isHeic);

      // Converter HEIC/HEIF para PNG
      if (isHeic) {
        console.log('[processClientPhotoFile] Convertendo HEIC para PNG...');
        try {
          const convertedBlob = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.85
          });
          processedFile = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
          console.log('[processClientPhotoFile] Conversão HEIC concluída! Novo tamanho:', processedFile.size);
        } catch (heicError: any) {
          console.error('[processClientPhotoFile] Erro na conversão HEIC:', heicError);
          // Se falhar, tenta usar o arquivo original (alguns dispositivos já enviam como JPEG)
          if (heicError.message?.includes('already a jpeg') || heicError.message?.includes('already')) {
            console.log('[processClientPhotoFile] Arquivo já é JPEG, usando original');
            processedFile = file;
          } else {
            throw new Error('Não foi possível converter a imagem HEIC. Tente tirar a foto diretamente pelo app ou converter para JPG antes.');
          }
        }
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        console.log('[processClientPhotoFile] Base64 gerado, tamanho:', base64.length);

        if (!base64 || base64.length < 100) {
          console.error('[processClientPhotoFile] Base64 inválido ou muito pequeno');
          alert('Erro ao processar a imagem. Tente novamente.');
          setUploadingPhotoType(null);
          setProcessingClientPhoto(false);
          return;
        }

        const newPhoto: ClientPhoto = {
          type: photoType,
          base64,
          createdAt: new Date().toISOString()
        };
        setNewClient(prev => ({
          ...prev,
          photos: [...prev.photos.filter(p => p.type !== photoType), newPhoto]
        }));
        setUploadingPhotoType(null);
        setProcessingClientPhoto(false);
      };
      reader.onerror = (error) => {
        console.error('[processClientPhotoFile] Erro ao ler arquivo:', error);
        alert('Erro ao ler a imagem. Tente novamente.');
        setUploadingPhotoType(null);
        setProcessingClientPhoto(false);
      };
      reader.readAsDataURL(processedFile);
    } catch (error: any) {
      console.error('[processClientPhotoFile] Erro ao processar foto:', error);
      alert(error.message || 'Erro ao processar a imagem. Tente outro formato (JPG ou PNG).');
      setUploadingPhotoType(null);
      setProcessingClientPhoto(false);
    }
  };

  // Drag and drop para fotos do cliente
  const handleClientPhotoDrop = (e: React.DragEvent<HTMLDivElement>, photoType: ClientPhoto['type']) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif'))) {
      processClientPhotoFile(file, photoType);
    }
  };

  // Drag and drop para fotos do cliente no modo de edição
  const handleEditClientPhotoDrop = (e: React.DragEvent<HTMLDivElement>, photoType: ClientPhoto['type']) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif'))) {
      processEditClientPhoto(file, photoType);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // AUTH CHECK - Show AuthPage if not authenticated
  // ═══════════════════════════════════════════════════════════════
  if (!isAuthenticated) {
    return (
      <AuthPage 
        onLogin={(userData) => {
          setUser({
            id: (userData as any).id || '1',
            email: userData.email,
            name: userData.name,
            avatar: userData.avatar || '',
            plan: 'Free'
          } as User);
          setIsAuthenticated(true);
        }}
        onDemoMode={() => {
          setUser({
            id: 'demo',
            email: 'demo@vizzu.com.br',
            name: 'Usuário Demo',
            avatar: '',
            plan: 'Free'
          } as User);
          setCredits(50);
          setIsAuthenticated(true);
        }}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN LAYOUT - SUNO STYLE
  // ═══════════════════════════════════════════════════════════════
  return (
    <div
      className={'h-[100dvh] flex flex-col md:flex-row overflow-hidden ' + (theme === 'dark' ? 'bg-black' : 'bg-gray-50')}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      
      {/* DESKTOP SIDEBAR */}
      <aside className={'hidden md:flex w-52 flex-col border-r ' + (theme === 'dark' ? 'bg-neutral-950/95 backdrop-blur-xl border-neutral-800/50' : 'bg-gradient-to-b from-pink-500 via-fuchsia-500 to-violet-500 border-violet-600')}>
        <div className={'p-5 border-b flex flex-col items-center ' + (theme === 'dark' ? 'border-neutral-900' : 'border-white/20')}>
          <button onClick={() => setCurrentPage('dashboard')} className="hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="Vizzu" className="h-10" />
          </button>
          <span className={'text-[9px] mt-1 ' + (theme === 'dark' ? 'text-neutral-600' : 'text-white/70')}>Estúdio com IA para lojistas</span>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {/* Dashboard */}
          <button
            onClick={() => setCurrentPage('dashboard')}
            className={'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ' +
              (currentPage === 'dashboard'
                ? (theme === 'dark' ? 'bg-gradient-to-r from-pink-500/20 to-orange-400/20 text-white' : 'bg-white/25 text-white')
                : (theme === 'dark' ? 'text-neutral-500 hover:text-white hover:bg-neutral-900' : 'text-white/90 hover:text-white hover:bg-white/15')
              )
            }
          >
            <i className="fas fa-home w-4 text-[10px]"></i>Dashboard
          </button>

          {/* Produtos */}
          <button
            onClick={() => setCurrentPage('products')}
            className={'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ' +
              (currentPage === 'products'
                ? (theme === 'dark' ? 'bg-gradient-to-r from-pink-500/20 to-orange-400/20 text-white' : 'bg-white/25 text-white')
                : (theme === 'dark' ? 'text-neutral-500 hover:text-white hover:bg-neutral-900' : 'text-white/90 hover:text-white hover:bg-white/15')
              )
            }
          >
            <i className="fas fa-box w-4 text-[10px]"></i>Produtos
          </button>

          {/* Botão CRIAR - Destacado no Centro */}
          <div className="py-2">
            <button
              onClick={() => setCurrentPage('create')}
              className={'w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ' +
                (currentPage === 'create' || currentPage === 'provador' || currentPage === 'look-composer' || currentPage === 'lifestyle' || currentPage === 'product-studio'
                  ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-lg shadow-pink-500/30 scale-[1.02]'
                  : 'bg-gradient-to-r from-pink-500 to-orange-400 text-white hover:shadow-lg hover:shadow-pink-500/30 hover:scale-[1.02]'
                )
              }
            >
              <i className="fas fa-wand-magic-sparkles text-[10px]"></i>Criar
            </button>
          </div>

          {/* Modelos */}
          <button
            onClick={() => setCurrentPage('models')}
            className={'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ' +
              (currentPage === 'models'
                ? (theme === 'dark' ? 'bg-gradient-to-r from-pink-500/20 to-orange-400/20 text-white' : 'bg-white/25 text-white')
                : (theme === 'dark' ? 'text-neutral-500 hover:text-white hover:bg-neutral-900' : 'text-white/90 hover:text-white hover:bg-white/15')
              )
            }
          >
            <i className="fas fa-user-tie w-4 text-[10px]"></i>Modelos
          </button>

          {/* Clientes */}
          <button
            onClick={() => setCurrentPage('clients')}
            className={'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ' +
              (currentPage === 'clients'
                ? (theme === 'dark' ? 'bg-gradient-to-r from-pink-500/20 to-orange-400/20 text-white' : 'bg-white/25 text-white')
                : (theme === 'dark' ? 'text-neutral-500 hover:text-white hover:bg-neutral-900' : 'text-white/90 hover:text-white hover:bg-white/15')
              )
            }
          >
            <i className="fas fa-users w-4 text-[10px]"></i>Clientes
          </button>
        </nav>
        <div className={'p-3 border-t space-y-2 ' + (theme === 'dark' ? 'border-neutral-900' : 'border-white/20')}>
          <div className={(theme === 'dark' ? 'bg-neutral-900' : 'bg-white/20 backdrop-blur-sm') + ' rounded-xl p-3'}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={'text-[9px] font-medium uppercase tracking-wide ' + (theme === 'dark' ? 'text-neutral-500' : 'text-white/70')}>Créditos</span>
              <button onClick={() => { setCurrentPage('settings'); setSettingsTab('plan'); }} className={(theme === 'dark' ? 'text-pink-500 hover:text-pink-400' : 'text-white hover:text-white/80') + ' text-[9px] font-medium'}>+ Add</button>
            </div>
            <p className="text-xl font-bold text-white">{userCredits.toLocaleString()}</p>
            <div className={'mt-2 h-1.5 rounded-full overflow-hidden ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-white/30')}>
              <div className={(theme === 'dark' ? 'bg-gradient-to-r from-pink-500 to-orange-400' : 'bg-white') + ' h-full rounded-full'} style={{ width: Math.min(100, (userCredits / currentPlan.limit) * 100) + '%' }}></div>
            </div>
          </div>
          {/* Configurações com Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
              className={'w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ' +
                (currentPage === 'settings'
                  ? (theme === 'dark' ? 'bg-gradient-to-r from-pink-500/20 to-orange-400/20 text-white' : 'bg-white/25 text-white')
                  : (theme === 'dark' ? 'text-neutral-500 hover:text-white hover:bg-neutral-900' : 'text-white/90 hover:text-white hover:bg-white/15')
                )
              }
            >
              <span className="flex items-center gap-2.5">
                <i className="fas fa-cog w-4 text-[10px]"></i>Configurações
              </span>
              <i className={'fas fa-chevron-' + (showSettingsDropdown ? 'down' : 'up') + ' text-[8px] opacity-60'}></i>
            </button>
            {/* Dropdown Up */}
            {showSettingsDropdown && (
              <div className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200') + ' absolute bottom-full mb-1 left-0 right-0 rounded-xl border shadow-lg overflow-hidden z-50'}>
                <button
                  onClick={() => { setCurrentPage('settings'); setSettingsTab('profile'); setShowSettingsDropdown(false); }}
                  className={'w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ' + (theme === 'dark' ? 'text-neutral-300 hover:bg-neutral-700' : 'text-gray-700 hover:bg-gray-100')}
                >
                  <i className="fas fa-user w-4 text-[10px] text-center"></i>Perfil
                </button>
                <button
                  onClick={() => { setCurrentPage('settings'); setSettingsTab('appearance'); setShowSettingsDropdown(false); }}
                  className={'w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ' + (theme === 'dark' ? 'text-neutral-300 hover:bg-neutral-700' : 'text-gray-700 hover:bg-gray-100')}
                >
                  <i className="fas fa-palette w-4 text-[10px] text-center"></i>Aparência
                </button>
                <button
                  onClick={() => { setCurrentPage('settings'); setSettingsTab('company'); setShowSettingsDropdown(false); }}
                  className={'w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ' + (theme === 'dark' ? 'text-neutral-300 hover:bg-neutral-700' : 'text-gray-700 hover:bg-gray-100')}
                >
                  <i className="fas fa-building w-4 text-[10px] text-center"></i>Empresa
                </button>
                <button
                  onClick={() => { setCurrentPage('settings'); setSettingsTab('plan'); setShowSettingsDropdown(false); }}
                  className={'w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ' + (theme === 'dark' ? 'text-neutral-300 hover:bg-neutral-700' : 'text-gray-700 hover:bg-gray-100')}
                >
                  <i className="fas fa-credit-card w-4 text-[10px] text-center"></i>Planos & Créditos
                </button>
                <button
                  onClick={() => { setCurrentPage('settings'); setSettingsTab('integrations'); setShowSettingsDropdown(false); }}
                  className={'w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ' + (theme === 'dark' ? 'text-neutral-300 hover:bg-neutral-700' : 'text-gray-700 hover:bg-gray-100')}
                >
                  <i className="fas fa-plug w-4 text-[10px] text-center"></i>Integrações
                </button>
                <div className={(theme === 'dark' ? 'border-neutral-700' : 'border-gray-200') + ' border-t'}></div>
                <button
                  onClick={() => { setCurrentPage('settings'); setSettingsTab('history'); setShowSettingsDropdown(false); }}
                  className={'w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ' + (theme === 'dark' ? 'text-neutral-300 hover:bg-neutral-700' : 'text-gray-700 hover:bg-gray-100')}
                >
                  <i className="fas fa-clock-rotate-left w-4 text-[10px] text-center"></i>Histórico
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className={'w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-white/20')}>
              {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="" /> : <i className="fas fa-user text-xs text-white/70"></i>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate text-white">{user?.name}</p>
              <p className={'text-[9px] ' + (theme === 'dark' ? 'text-neutral-600' : 'text-white/70')}>Plano {currentPlan.name}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className={'flex-1 overflow-hidden flex flex-col md:pt-0 ' + (!['product-studio', 'provador', 'look-composer', 'lifestyle'].includes(currentPage) ? 'pt-12' : '')} style={{ overscrollBehavior: 'contain' }}>

        {/* MOBILE TOP HEADER - Esconde quando está dentro das features de criação */}
        {!['product-studio', 'provador', 'look-composer', 'lifestyle'].includes(currentPage) && (
        <div
          className={'md:hidden fixed top-0 left-0 right-0 z-40 px-4 py-2.5 flex items-center justify-between border-b ' + (theme === 'dark' ? 'bg-neutral-950/95 border-neutral-800 backdrop-blur-sm' : 'bg-white/95 border-gray-200 backdrop-blur-sm shadow-sm')}
          style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}
        >
          <button onClick={() => setCurrentPage('dashboard')} className="flex items-center hover:opacity-80 transition-opacity">
            <img src={theme === 'dark' ? '/logo.png' : '/logo-light.png'} alt="Vizzu" className="h-8" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setCurrentPage('settings'); setSettingsTab('plan'); }}
              className={'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ' + (theme === 'dark' ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30' : 'bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-200')}
            >
              <i className="fas fa-coins text-[10px]"></i>
              <span>{userCredits}</span>
            </button>
            <button
              onClick={() => setCurrentPage('settings')}
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
        {currentPage === 'dashboard' && (
          <div className={'flex-1 overflow-y-auto p-4 md:p-6 ' + (theme === 'dark' ? '' : 'bg-[#F5F5F7]')}>
            <div className="max-w-5xl mx-auto">
              {/* Header com boas-vindas */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className={'text-xl font-bold ' + (theme === 'dark' ? 'text-white' : 'text-[#1A1A1A]')}>Dashboard</h1>
                    <span className={'px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wide ' + (theme === 'dark' ? 'bg-pink-500/20 text-pink-400' : 'bg-gradient-to-r from-pink-500 to-orange-400 text-white')}>{currentPlan.name}</span>
                  </div>
                  <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-sm'}>
                    Bem-vindo de volta, <span className="font-medium">{user?.name?.split(' ')[0] || 'usuário'}</span>
                  </p>
                </div>
                <button
                  onClick={() => setCurrentPage('create')}
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-pink-500/25"
                >
                  <i className="fas fa-plus text-xs"></i>
                  Novo Projeto
                </button>
              </div>

              {/* ÚLTIMAS CRIAÇÕES */}
              {(() => {
                // Combinar fontes de imagens geradas
                const recentCreations: { id: string; imageUrl: string; name: string; type: 'studio' | 'provador' | 'look'; date: string }[] = [];

                // Adicionar looks do Provador
                clientLooks.forEach(look => {
                  if (look.imageUrl) {
                    const client = clients.find(c => c.id === look.clientId);
                    recentCreations.push({
                      id: look.id,
                      imageUrl: look.imageUrl,
                      name: client ? `${client.firstName}` : 'Look',
                      type: 'provador',
                      date: look.createdAt
                    });
                  }
                });

                // Adicionar produtos com imagens geradas
                products.forEach(product => {
                  const genImages = (product as any).generatedImages;
                  if (genImages?.studioReady?.[0]?.images?.front) {
                    recentCreations.push({
                      id: `studio-${product.id}`,
                      imageUrl: genImages.studioReady[0].images.front,
                      name: product.name,
                      type: 'studio',
                      date: genImages.studioReady[0].createdAt || new Date().toISOString()
                    });
                  }
                });

                // Ordenar por data (mais recente primeiro) e limitar a 4
                const sortedCreations = recentCreations
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 4);

                return (
                  <div className={'rounded-2xl p-5 mb-4 ' + (theme === 'dark' ? 'bg-neutral-900/80 backdrop-blur-xl border border-neutral-800' : 'bg-white/80 backdrop-blur-xl border border-gray-200 shadow-sm')}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <i className={'fas fa-sparkles text-sm ' + (theme === 'dark' ? 'text-pink-400' : 'text-pink-500')}></i>
                        <h2 className={'text-sm font-semibold uppercase tracking-wide ' + (theme === 'dark' ? 'text-white' : 'text-gray-900')}>Últimas Criações</h2>
                      </div>
                      {sortedCreations.length > 0 && (
                        <button
                          onClick={() => { setCurrentPage('settings'); setSettingsTab('history'); }}
                          className={(theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' text-xs font-medium transition-colors'}
                        >
                          Ver todas <i className="fas fa-arrow-right ml-1"></i>
                        </button>
                      )}
                    </div>

                    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                      {/* Criações recentes */}
                      {sortedCreations.map((creation) => (
                        <div
                          key={creation.id}
                          onClick={() => {
                            if (creation.type === 'studio') setCurrentPage('product-studio');
                            else if (creation.type === 'provador') setCurrentPage('provador');
                            else setCurrentPage('look-composer');
                          }}
                          className={'flex-shrink-0 w-24 cursor-pointer group ' + (theme === 'dark' ? 'hover:opacity-80' : 'hover:opacity-90') + ' transition-opacity'}
                        >
                          <div className={'w-24 h-24 rounded-xl overflow-hidden mb-2 relative ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100')}>
                            <img src={creation.imageUrl} alt="" className="w-full h-full object-cover" />
                            <div className={'absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-medium ' +
                              (creation.type === 'studio' ? 'bg-purple-500 text-white' :
                               creation.type === 'provador' ? 'bg-pink-500 text-white' :
                               'bg-amber-500 text-white')}>
                              {creation.type === 'studio' ? 'Studio' : creation.type === 'provador' ? 'Provador' : 'Look'}
                            </div>
                          </div>
                          <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-[10px] truncate'}>{creation.name}</p>
                        </div>
                      ))}

                      {/* Card + Nova Criação */}
                      <div
                        onClick={() => setCurrentPage('create')}
                        className={'flex-shrink-0 w-24 cursor-pointer group'}
                      >
                        <div className={'w-24 h-24 rounded-xl flex items-center justify-center transition-all border-2 border-dashed ' + (theme === 'dark' ? 'bg-neutral-800/50 border-neutral-700 hover:border-pink-500/50 hover:bg-neutral-800' : 'bg-gray-50 border-gray-300 hover:border-pink-400 hover:bg-gray-100')}>
                          <div className="text-center">
                            <div className={'w-10 h-10 mx-auto rounded-lg flex items-center justify-center mb-1 ' + (theme === 'dark' ? 'bg-pink-500/20' : 'bg-pink-100')}>
                              <i className={'fas fa-plus ' + (theme === 'dark' ? 'text-pink-400' : 'text-pink-500')}></i>
                            </div>
                          </div>
                        </div>
                        <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-[10px] text-center mt-2'}>Criar</p>
                      </div>

                      {/* Placeholder se não houver criações */}
                      {sortedCreations.length === 0 && (
                        <div className={'flex-1 flex items-center justify-center py-4 ' + (theme === 'dark' ? 'text-neutral-500' : 'text-gray-400')}>
                          <div className="text-center">
                            <i className="fas fa-wand-magic-sparkles text-2xl mb-2 opacity-50"></i>
                            <p className="text-xs">Suas criações aparecerão aqui</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* STATS GRID - 4 Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {/* Créditos */}
                <div className={'rounded-xl p-4 ' + (theme === 'dark' ? 'bg-neutral-900/80 backdrop-blur-xl border border-neutral-800' : 'bg-white/80 backdrop-blur-xl border border-gray-200 shadow-sm')}>
                  <div className="flex items-start justify-between mb-2">
                    <div className={'w-8 h-8 rounded-lg flex items-center justify-center ' + (theme === 'dark' ? 'bg-amber-500/20' : 'bg-amber-100')}>
                      <i className={'fas fa-coins text-xs ' + (theme === 'dark' ? 'text-amber-400' : 'text-amber-600')}></i>
                    </div>
                  </div>
                  <p className={'text-xl font-bold ' + (theme === 'dark' ? 'text-white' : 'text-gray-900')}>{userCredits}<span className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' text-sm font-normal'}>/{currentPlan.limit}</span></p>
                  <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Créditos</p>
                  <div className={'mt-2 h-1 rounded-full overflow-hidden ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-200')}>
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${Math.min(100, (userCredits / currentPlan.limit) * 100)}%` }} />
                  </div>
                </div>

                {/* Imagens Geradas */}
                <div className={'rounded-xl p-4 ' + (theme === 'dark' ? 'bg-neutral-900/80 backdrop-blur-xl border border-neutral-800' : 'bg-white/80 backdrop-blur-xl border border-gray-200 shadow-sm')}>
                  <div className="flex items-start justify-between mb-2">
                    <div className={'w-8 h-8 rounded-lg flex items-center justify-center ' + (theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-100')}>
                      <i className={'fas fa-wand-magic-sparkles text-xs ' + (theme === 'dark' ? 'text-purple-400' : 'text-purple-600')}></i>
                    </div>
                  </div>
                  <p className={'text-xl font-bold ' + (theme === 'dark' ? 'text-white' : 'text-gray-900')}>
                    {historyLogs.filter(log => log.method === 'ai' && log.status === 'success').length}
                  </p>
                  <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Imagens geradas</p>
                </div>

                {/* Clientes */}
                <div className={'rounded-xl p-4 ' + (theme === 'dark' ? 'bg-neutral-900/80 backdrop-blur-xl border border-neutral-800' : 'bg-white/80 backdrop-blur-xl border border-gray-200 shadow-sm')}>
                  <div className="flex items-start justify-between mb-2">
                    <div className={'w-8 h-8 rounded-lg flex items-center justify-center ' + (theme === 'dark' ? 'bg-pink-500/20' : 'bg-pink-100')}>
                      <i className={'fas fa-users text-xs ' + (theme === 'dark' ? 'text-pink-400' : 'text-pink-600')}></i>
                    </div>
                  </div>
                  <p className={'text-xl font-bold ' + (theme === 'dark' ? 'text-white' : 'text-gray-900')}>{clients.length}</p>
                  <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Clientes</p>
                </div>

                {/* Produtos */}
                <div className={'rounded-xl p-4 ' + (theme === 'dark' ? 'bg-neutral-900/80 backdrop-blur-xl border border-neutral-800' : 'bg-white/80 backdrop-blur-xl border border-gray-200 shadow-sm')}>
                  <div className="flex items-start justify-between mb-2">
                    <div className={'w-8 h-8 rounded-lg flex items-center justify-center ' + (theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100')}>
                      <i className={'fas fa-box text-xs ' + (theme === 'dark' ? 'text-blue-400' : 'text-blue-600')}></i>
                    </div>
                  </div>
                  <p className={'text-xl font-bold ' + (theme === 'dark' ? 'text-white' : 'text-gray-900')}>{products.length}</p>
                  <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Produtos</p>
                </div>
              </div>

              {/* USO DE CRÉDITOS - Dados reais */}
              {(() => {
                const aiLogs = historyLogs.filter(log => log.method === 'ai' && log.status === 'success');
                const studioCount = aiLogs.filter(log => log.action.toLowerCase().includes('studio')).reduce((sum, log) => sum + (log.cost || 1), 0);
                const provadorCount = aiLogs.filter(log => log.action.toLowerCase().includes('provador')).reduce((sum, log) => sum + (log.cost || 1), 0);
                const lookCount = aiLogs.filter(log => log.action.toLowerCase().includes('look') || log.action.toLowerCase().includes('modelo')).reduce((sum, log) => sum + (log.cost || 1), 0);
                const totalCredits = studioCount + provadorCount + lookCount;
                const studioPercent = totalCredits > 0 ? Math.round((studioCount / totalCredits) * 100) : 0;
                const provadorPercent = totalCredits > 0 ? Math.round((provadorCount / totalCredits) * 100) : 0;
                const lookPercent = totalCredits > 0 ? Math.round((lookCount / totalCredits) * 100) : 0;

                return (
                  <div className={'rounded-2xl p-5 mb-4 ' + (theme === 'dark' ? 'bg-neutral-900/80 backdrop-blur-xl border border-neutral-800' : 'bg-white/80 backdrop-blur-xl border border-gray-200 shadow-sm')}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <i className={'fas fa-chart-bar text-sm ' + (theme === 'dark' ? 'text-indigo-400' : 'text-indigo-500')}></i>
                        <h2 className={'text-sm font-semibold uppercase tracking-wide ' + (theme === 'dark' ? 'text-white' : 'text-gray-900')}>Uso de Créditos</h2>
                      </div>
                      <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-xs'}>{totalCredits} créditos usados</span>
                    </div>

                    {totalCredits === 0 ? (
                      <div className={'text-center py-4 ' + (theme === 'dark' ? 'text-neutral-500' : 'text-gray-400')}>
                        <i className="fas fa-chart-pie text-2xl mb-2 opacity-50"></i>
                        <p className="text-xs">Nenhum crédito usado ainda</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs w-20'}>Studio</span>
                          <div className={'flex-1 h-2 rounded-full overflow-hidden ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-200')}>
                            <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all" style={{ width: `${studioPercent}%` }} />
                          </div>
                          <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs w-10 text-right'}>{studioPercent}%</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs w-20'}>Provador</span>
                          <div className={'flex-1 h-2 rounded-full overflow-hidden ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-200')}>
                            <div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all" style={{ width: `${provadorPercent}%` }} />
                          </div>
                          <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs w-10 text-right'}>{provadorPercent}%</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs w-20'}>Look</span>
                          <div className={'flex-1 h-2 rounded-full overflow-hidden ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-200')}>
                            <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all" style={{ width: `${lookPercent}%` }} />
                          </div>
                          <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs w-10 text-right'}>{lookPercent}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* DICA DO DIA + PLANO - Grid 2:1 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Dica do dia - 2 colunas */}
                <div className={'md:col-span-2 rounded-2xl p-5 relative overflow-hidden flex items-center min-h-[120px] ' + (theme === 'dark' ? 'bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-emerald-500/10 border border-teal-500/20' : 'bg-gradient-to-r from-teal-50 via-cyan-50 to-emerald-50 border border-teal-200')}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
                  <div className="relative flex items-center gap-4 w-full">
                    <div className={'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ' + (theme === 'dark' ? 'bg-teal-500/20' : 'bg-teal-100')}>
                      <i className={'fas fa-lightbulb text-lg ' + (theme === 'dark' ? 'text-teal-400' : 'text-teal-600')}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={'text-sm font-semibold mb-1 ' + (theme === 'dark' ? 'text-white' : 'text-gray-900')}>Dica do dia</h3>
                      <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-sm'}>
                        Use fotos com boa iluminação e fundo neutro para melhores resultados nas gerações de IA. Quanto melhor a foto original, melhor o resultado final!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Plano - 1 coluna */}
                <div className={'md:col-span-1 rounded-2xl p-5 relative overflow-hidden flex items-center min-h-[120px] ' + (theme === 'dark' ? 'bg-gradient-to-br from-purple-900/40 via-pink-900/30 to-orange-900/40 border border-pink-500/20 backdrop-blur-xl' : 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400')}>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
                  <div className="relative flex flex-col w-full">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ' + (theme === 'dark' ? 'bg-gradient-to-r from-pink-500 to-orange-400' : 'bg-white/20 backdrop-blur-sm')}>
                        <i className="fas fa-crown text-white"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-white/70') + ' text-[10px] uppercase tracking-wide'}>Seu plano</p>
                        <p className="text-xl font-bold text-white">{currentPlan.name}</p>
                      </div>
                    </div>
                    <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-white/80') + ' text-xs mb-2'}>{userCredits}/{currentPlan.limit} créditos</p>
                    <button
                      onClick={() => { setCurrentPage('settings'); setSettingsTab('plan'); }}
                      className={'w-full py-2 rounded-lg font-medium text-xs transition-all flex items-center justify-center gap-1 ' + (theme === 'dark' ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20' : 'bg-white/20 hover:bg-white/30 text-white')}
                    >
                      Upgrade <i className="fas fa-arrow-right text-[10px]"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PÁGINA VIZZU CREATION - Hub de Features */}
        {currentPage === 'create' && (
          <div className={'flex-1 overflow-y-auto p-4 md:p-6 ' + (theme === 'dark' ? '' : 'bg-[#F5F5F7]')}>
            <style>{`
              .creation-card {
                transition: all 0.3s ease;
              }
              .creation-card:hover {
                transform: translateY(-8px);
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
              }
              .creation-card:active {
                transform: scale(0.98);
              }
              @media (max-width: 768px) {
                .creation-card:hover {
                  transform: none;
                  box-shadow: none;
                }
              }
            `}</style>
            <div className="max-w-5xl mx-auto">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className={'w-10 h-10 rounded-xl flex items-center justify-center ' + (theme === 'dark' ? 'bg-gradient-to-r from-pink-500/20 to-orange-400/20 border border-pink-500/30' : 'bg-gradient-to-r from-pink-500 to-orange-400 shadow-lg shadow-pink-500/25')}>
                    <i className={'fas fa-wand-magic-sparkles text-sm ' + (theme === 'dark' ? 'text-pink-400' : 'text-white')}></i>
                  </div>
                  <div>
                    <h1 className={'text-xl font-bold ' + (theme === 'dark' ? 'text-white' : 'text-[#1A1A1A]')}>Vizzu Creation</h1>
                    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Escolha uma ferramenta para criar com IA</p>
                  </div>
                </div>
              </div>

              {/* Video Cards Grid - 2x2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1: Vizzu Product Studio */}
                <div
                  onClick={() => setCurrentPage('product-studio')}
                  className={'creation-card group relative overflow-hidden rounded-xl cursor-pointer ' + (theme === 'dark' ? 'bg-neutral-800 border border-neutral-700' : 'bg-gray-100 border-2 border-gray-200')}
                  style={{ minHeight: '240px', height: 'auto' }}
                >
                  <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/Banner-Vizzu-Studio.jpg)' }}></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-600/75 to-pink-600/25"></div>
                  <div className="video-overlay absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30 group-hover:from-black/70 group-hover:via-black/40 group-hover:to-black/20 transition-all duration-300"></div>
                  <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-pink-500 text-white text-[9px] font-bold rounded-full uppercase">IA</span>
                        <span className="text-white/60 text-xs">1-8 créditos</span>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-1">Vizzu Product Studio®</h3>
                      <p className="text-white/70 text-sm">Fotos profissionais do produto em múltiplos ângulos com fundo cinza de estúdio</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 border border-white/30 group-hover:bg-white/30 group-hover:scale-110">
                        <i className="fas fa-cube text-white text-lg"></i>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setCurrentPage('product-studio'); }}
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
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600"></div>
                  <div className="video-overlay absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-all duration-300"></div>
                  <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-[9px] font-bold rounded-full uppercase">Novo</span>
                        <span className="text-white/60 text-xs">3 créditos</span>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-1">Vizzu Provador®</h3>
                      <p className="text-white/70 text-sm">Vista seu cliente com suas roupas. Prova virtual pelo WhatsApp</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="play-btn w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 border border-white/30 group-hover:bg-white/30 group-hover:scale-110">
                        <i className="fas fa-play text-white ml-1"></i>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setCurrentPage('provador'); }}
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
                  onClick={() => setCurrentPage('look-composer')}
                  className={'creation-card group relative overflow-hidden rounded-xl cursor-pointer ' + (theme === 'dark' ? 'bg-neutral-800 border border-neutral-700' : 'bg-gray-100 border-2 border-gray-200')}
                  style={{ minHeight: '240px', height: 'auto' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700"></div>
                  <div className="video-overlay absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-all duration-300"></div>
                  <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-indigo-500 text-white text-[9px] font-bold rounded-full uppercase">IA</span>
                        <span className="text-white/60 text-xs">1-2 créditos</span>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-1">Look Completo</h3>
                      <p className="text-white/70 text-sm">Crie looks com modelos virtuais em fundo studio ou cenário personalizado</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 border border-white/30 group-hover:bg-white/30 group-hover:scale-110">
                        <i className="fas fa-vest-patches text-white text-lg"></i>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setCurrentPage('look-composer'); }}
                        className="px-4 py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-all border border-white/30"
                      >
                        Acessar <i className="fas fa-arrow-right text-xs"></i>
                      </button>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
                </div>

                {/* Card 4: Lifestyle Shot */}
                <div
                  onClick={() => setCurrentPage('lifestyle')}
                  className={'creation-card group relative overflow-hidden rounded-xl cursor-pointer ' + (theme === 'dark' ? 'bg-neutral-800 border border-neutral-700' : 'bg-gray-100 border-2 border-gray-200')}
                  style={{ minHeight: '240px', height: 'auto' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-600 via-cyan-600 to-emerald-600"></div>
                  <div className="video-overlay absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-all duration-300"></div>
                  <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-teal-500 text-white text-[9px] font-bold rounded-full uppercase">IA</span>
                        <span className="text-white/60 text-xs">3 créditos</span>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-1">Lifestyle Shot</h3>
                      <p className="text-white/70 text-sm">Produto em ação. Tênis no skate, bolsa no café. Fotos que engajam</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 border border-white/30 group-hover:bg-white/30 group-hover:scale-110">
                        <i className="fas fa-camera-retro text-white text-lg"></i>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setCurrentPage('lifestyle'); }}
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
                    <div className={'w-10 h-10 rounded-lg flex items-center justify-center ' + (theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-300')}>
                      <i className={'fas fa-sparkles ' + (theme === 'dark' ? 'text-neutral-500' : 'text-gray-500')}></i>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={'px-2 py-0.5 text-[9px] font-bold rounded-full uppercase ' + (theme === 'dark' ? 'bg-neutral-600 text-neutral-300' : 'bg-gray-400 text-white')}>Em breve</span>
                      </div>
                      <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-sm mt-0.5'}>Mais ferramentas em desenvolvimento</p>
                    </div>
                  </div>
                  <button
                    disabled
                    className={'px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 cursor-not-allowed ' + (theme === 'dark' ? 'bg-neutral-700 text-neutral-500' : 'bg-gray-300 text-gray-500')}
                  >
                    Aguarde <i className="fas fa-clock text-xs"></i>
                  </button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-4 mt-4'}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-pink-500/20 to-orange-400/20 flex items-center justify-center">
                      <i className="fas fa-coins text-pink-400"></i>
                    </div>
                    <div>
                      <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide'}>Seus Créditos</p>
                      <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xl font-bold'}>{userCredits.toLocaleString()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setCurrentPage('settings'); setSettingsTab('plan'); }}
                    className="px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Comprar mais
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PRODUCT STUDIO - Mantém montado para preservar estado */}
        <div style={{ display: currentPage === 'product-studio' ? 'contents' : 'none' }}>
          <ProductStudio
            products={products}
            userCredits={userCredits}
            onUpdateProduct={handleUpdateProduct}
            onDeductCredits={handleDeductCredits}
            onAddHistoryLog={handleAddHistoryLog}
            onImport={() => setShowImport(true)}
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
            onNavigate={(page) => setCurrentPage(page)}
            initialProduct={productForCreation}
            onClearInitialProduct={() => setProductForCreation(null)}
            onBack={() => setCurrentPage('create')}
          />
        </div>

        {/* PROVADOR - Mantém montado para preservar estado */}
        <div style={{ display: currentPage === 'provador' ? 'contents' : 'none' }}>
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
            onBack={() => setCurrentPage('create')}
          />
        </div>

        {/* LOOK COMPOSER - Mantém montado para preservar estado */}
        <div style={{ display: currentPage === 'look-composer' ? 'contents' : 'none' }}>
          <VizzuLookComposer
            products={products}
            userCredits={userCredits}
            onUpdateProduct={handleUpdateProduct}
            onDeductCredits={handleDeductCredits}
            onAddHistoryLog={handleAddHistoryLog}
            onImport={() => setShowImport(true)}
            currentPlan={currentPlan}
            theme={theme}
            onCheckCredits={checkCreditsAndShowModal}
            userId={user?.id}
            savedModels={savedModels}
            onSaveModel={handleSaveModel}
            onOpenCreateModel={() => {
              if (!canCreateModel()) {
                return; // UI já mostra mensagem de limite
              }
              resetModelWizard();
              setShowCreateModel(true);
            }}
            modelLimit={getModelLimit()}
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
            onBack={() => setCurrentPage('create')}
          />
        </div>

        {/* LIFESTYLE SHOT - Mantém montado para preservar estado */}
        <div style={{ display: currentPage === 'lifestyle' ? 'contents' : 'none' }}>
          <div
            className={'flex-1 overflow-y-auto p-4 md:p-6 ' + (theme === 'dark' ? '' : 'bg-[#F5F5F7]')}
            style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 1rem))' }}
          >
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentPage('create')}
                    className={(theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-900') + ' p-2 -ml-2 rounded-lg transition-colors'}
                  >
                    <i className="fas fa-arrow-left"></i>
                  </button>
                  <div className={'w-10 h-10 rounded-xl flex items-center justify-center ' + (theme === 'dark' ? 'bg-gradient-to-r from-teal-500/20 to-cyan-400/20 border border-teal-500/30' : 'bg-gradient-to-r from-teal-500 to-cyan-500 shadow-lg shadow-teal-500/25')}>
                    <i className={'fas fa-camera-retro text-sm ' + (theme === 'dark' ? 'text-teal-400' : 'text-white')}></i>
                  </div>
                  <div>
                    <h1 className={(theme === 'dark' ? 'text-white' : 'text-[#1A1A1A]') + ' text-lg font-semibold'}>Lifestyle Shot</h1>
                    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Produto em ação, fotos que engajam</p>
                  </div>
                </div>
                <div className={'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ' + (theme === 'dark' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'bg-teal-50 text-teal-600 border border-teal-200')}>
                  <i className="fas fa-coins text-[10px]"></i>
                  <span>3 créditos</span>
                </div>
              </div>

              {/* Conteúdo em desenvolvimento */}
              <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-2xl border p-8 text-center'}>
                <div className={'w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4 ' + (theme === 'dark' ? 'bg-teal-500/20' : 'bg-teal-100')}>
                  <i className={'fas fa-camera-retro text-3xl ' + (theme === 'dark' ? 'text-teal-400' : 'text-teal-500')}></i>
                </div>
                <h2 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xl font-bold mb-2'}>Em desenvolvimento</h2>
                <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-sm mb-6 max-w-md mx-auto'}>
                  O Lifestyle Shot coloca seu produto em ação: tênis no skate, bolsa no café, óculos na praia.
                  Fotos contextuais que geram mais engajamento. Em breve!
                </p>
                <button
                  onClick={() => setCurrentPage('create')}
                  className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                  <i className="fas fa-arrow-left mr-2"></i>Voltar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MODELS */}
        {currentPage === 'models' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={'w-10 h-10 rounded-xl flex items-center justify-center ' + (theme === 'dark' ? 'bg-gradient-to-r from-pink-500/20 to-orange-400/20 border border-pink-500/30' : 'bg-gradient-to-r from-pink-500 to-orange-400 shadow-lg shadow-pink-500/25')}>
                    <i className={'fas fa-user-tie text-sm ' + (theme === 'dark' ? 'text-pink-400' : 'text-white')}></i>
                  </div>
                  <div>
                    <h1 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold'}>Modelos Salvos</h1>
                    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Crie e gerencie seus modelos de IA</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>
                    {savedModels.length}/{getModelLimit()} modelos
                  </span>
                  <button
                    onClick={() => { resetModelWizard(); setShowCreateModel(true); }}
                    disabled={!canCreateModel()}
                    className={'px-3 py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-xs transition-opacity ' + (!canCreateModel() ? 'opacity-50 cursor-not-allowed' : '')}
                  >
                    <i className="fas fa-plus mr-1.5"></i>Novo Modelo
                  </button>
                </div>
              </div>

              {/* Filtros */}
              <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-3 mb-4'}>
                <div className="flex flex-wrap gap-2">
                  {/* Busca */}
                  <div className="flex-shrink-0 w-40">
                    <div className="relative">
                      <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px]'}></i>
                      <input
                        type="text"
                        placeholder="Buscar..."
                        value={modelFilterSearch}
                        onChange={(e) => setModelFilterSearch(e.target.value)}
                        className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400') + ' w-full pl-7 pr-2 py-1.5 border rounded-lg text-xs'}
                      />
                    </div>
                  </div>
                  {/* Gênero */}
                  <select
                    value={modelFilterGender}
                    onChange={(e) => setModelFilterGender(e.target.value)}
                    className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' px-2 py-1.5 border rounded-lg text-xs'}
                  >
                    <option value="">Gênero</option>
                    <option value="woman">Feminino</option>
                    <option value="man">Masculino</option>
                  </select>
                  {/* Tom de Pele */}
                  <select
                    value={modelFilterSkinTone}
                    onChange={(e) => setModelFilterSkinTone(e.target.value)}
                    className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' px-2 py-1.5 border rounded-lg text-xs'}
                  >
                    <option value="">Tom de Pele</option>
                    <option value="very-light">Muito Claro</option>
                    <option value="light">Claro</option>
                    <option value="medium">Médio</option>
                    <option value="tan">Bronzeado</option>
                    <option value="dark">Escuro</option>
                    <option value="very-dark">Muito Escuro</option>
                  </select>
                  {/* Idade */}
                  <select
                    value={modelFilterAge}
                    onChange={(e) => setModelFilterAge(e.target.value)}
                    className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' px-2 py-1.5 border rounded-lg text-xs'}
                  >
                    <option value="">Idade</option>
                    <option value="young">Jovem (18-25)</option>
                    <option value="adult">Adulto (25-40)</option>
                    <option value="mature">Maduro (40+)</option>
                  </select>
                  {/* Tipo Físico */}
                  <select
                    value={modelFilterBodyType}
                    onChange={(e) => setModelFilterBodyType(e.target.value)}
                    className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' px-2 py-1.5 border rounded-lg text-xs'}
                  >
                    <option value="">Tipo Físico</option>
                    <option value="slim">Magro</option>
                    <option value="average">Médio</option>
                    <option value="athletic">Atlético</option>
                    <option value="curvy">Curvilíneo</option>
                    <option value="plus">Plus Size</option>
                  </select>
                  {/* Limpar filtros */}
                  {(modelFilterSearch || modelFilterGender || modelFilterSkinTone || modelFilterAge || modelFilterBodyType) && (
                    <button
                      onClick={() => {
                        setModelFilterSearch('');
                        setModelFilterGender('');
                        setModelFilterSkinTone('');
                        setModelFilterAge('');
                        setModelFilterBodyType('');
                      }}
                      className={(theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' px-2 py-1.5 text-xs transition-colors'}
                    >
                      <i className="fas fa-times mr-1"></i>Limpar
                    </button>
                  )}
                </div>
              </div>

              {/* Empty State */}
              {savedModels.length === 0 ? (
                <div className={'rounded-2xl p-12 text-center ' + (theme === 'dark' ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-100 shadow-sm')}>
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-pink-500/10 to-orange-400/10 flex items-center justify-center">
                    <i className="fas fa-user-tie text-3xl text-pink-500"></i>
                  </div>
                  <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold mb-2'}>Nenhum modelo criado</h3>
                  <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-sm mb-6 max-w-md mx-auto'}>
                    Crie modelos personalizados para usar no Vizzu Studio. Defina características como gênero, etnia, tipo de corpo e muito mais.
                  </p>
                  <button
                    onClick={() => { resetModelWizard(); setShowCreateModel(true); }}
                    className="px-4 py-2.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-sm"
                  >
                    <i className="fas fa-plus mr-2"></i>Criar Primeiro Modelo
                  </button>
                </div>
              ) : (
                /* Models Grid - Vertical Cards */
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {savedModels
                    .filter(model => {
                      if (modelFilterSearch && !model.name.toLowerCase().includes(modelFilterSearch.toLowerCase())) return false;
                      if (modelFilterGender && model.gender !== modelFilterGender) return false;
                      if (modelFilterSkinTone && model.skinTone !== modelFilterSkinTone) return false;
                      if (modelFilterAge && model.ageRange !== modelFilterAge) return false;
                      if (modelFilterBodyType && model.bodyType !== modelFilterBodyType) return false;
                      return true;
                    })
                    .map(model => {
                      const images = [
                        { key: 'front', label: 'Frente', src: model.images.front },
                        { key: 'back', label: 'Costas', src: model.images.back },
                        { key: 'face', label: 'Rosto', src: model.images.face },
                      ].filter(img => img.src);
                      return (
                        <div
                          key={model.id}
                          className={'rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02] group ' + (theme === 'dark' ? 'bg-neutral-900 border border-neutral-800 hover:border-pink-500/50' : 'bg-white border border-gray-100 shadow-sm hover:shadow-lg')}
                        >
                          {/* Image Carousel */}
                          <div className={'relative aspect-[3/4] flex items-center justify-center ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-gradient-to-br from-pink-50 to-orange-50')}>
                            {images.length > 0 ? (
                              <ModelCardCarousel
                                images={images}
                                modelName={model.name}
                                onCardClick={() => setShowModelDetail(model)}
                              />
                            ) : (
                              <div className="text-center" onClick={() => setShowModelDetail(model)}>
                                <div className={'w-20 h-20 rounded-full mx-auto flex items-center justify-center ' + (model.gender === 'woman' ? 'bg-gradient-to-br from-pink-400 to-rose-500' : 'bg-gradient-to-br from-blue-400 to-indigo-500')}>
                                  <i className="fas fa-user text-3xl text-white"></i>
                                </div>
                                <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-xs mt-3'}>
                                  {model.status === 'generating' ? 'Gerando imagens...' : model.status === 'error' ? 'Erro na geração' : 'Sem imagem'}
                                </p>
                              </div>
                            )}
                            {model.status === 'generating' && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <div className="w-16 h-16">
                                  <DotLottieReact
                                    src="https://lottie.host/d29d70f3-bf03-4212-b53f-932dbefb9077/kIkLDFupvi.lottie"
                                    loop
                                    autoplay
                                    style={{ width: '100%', height: '100%' }}
                                  />
                                </div>
                              </div>
                            )}
                            {/* Status Badge */}
                            <div className={'absolute top-2 right-2 px-2 py-1 rounded-full text-[10px] font-medium ' + (
                              model.status === 'ready' ? 'bg-green-500/20 text-green-400 backdrop-blur-sm' :
                              model.status === 'generating' ? 'bg-yellow-500/20 text-yellow-400 backdrop-blur-sm' :
                              model.status === 'error' ? 'bg-red-500/20 text-red-400 backdrop-blur-sm' :
                              'bg-neutral-500/20 text-neutral-400 backdrop-blur-sm'
                            )}>
                              {model.status === 'ready' ? 'Pronto' : model.status === 'generating' ? 'Gerando...' : model.status === 'error' ? 'Erro' : 'Rascunho'}
                            </div>
                          </div>
                          {/* Info */}
                          <div className="p-3" onClick={() => setShowModelDetail(model)}>
                            <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm mb-1.5 truncate'}>{model.name}</h3>
                            <div className="flex flex-wrap gap-1">
                              <span className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-600') + ' px-1.5 py-0.5 rounded text-[9px]'}>
                                {getModelLabel('gender', model.gender)}
                              </span>
                              <span className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-600') + ' px-1.5 py-0.5 rounded text-[9px]'}>
                                {getModelLabel('skinTone', model.skinTone)}
                              </span>
                              <span className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-600') + ' px-1.5 py-0.5 rounded text-[9px]'}>
                                {getModelLabel('ageRange', model.ageRange)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Nenhum resultado com filtros */}
              {savedModels.length > 0 && savedModels.filter(model => {
                if (modelFilterSearch && !model.name.toLowerCase().includes(modelFilterSearch.toLowerCase())) return false;
                if (modelFilterGender && model.gender !== modelFilterGender) return false;
                if (modelFilterSkinTone && model.skinTone !== modelFilterSkinTone) return false;
                if (modelFilterAge && model.ageRange !== modelFilterAge) return false;
                if (modelFilterBodyType && model.bodyType !== modelFilterBodyType) return false;
                return true;
              }).length === 0 && (
                <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-xl border p-8 text-center'}>
                  <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-filter text-3xl mb-3'}></i>
                  <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-sm'}>Nenhum modelo encontrado com os filtros selecionados</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PRODUCTS */}
        {currentPage === 'products' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={'w-10 h-10 rounded-xl flex items-center justify-center ' + (theme === 'dark' ? 'bg-gradient-to-r from-pink-500/20 to-orange-400/20 border border-pink-500/30' : 'bg-gradient-to-r from-pink-500 to-orange-400 shadow-lg shadow-pink-500/25')}>
                    <i className={'fas fa-box text-sm ' + (theme === 'dark' ? 'text-pink-400' : 'text-white')}></i>
                  </div>
                  <div>
                    <h1 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold'}>Produtos</h1>
                    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Gerencie seu catálogo</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowBulkImport(true)} className="px-3 py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-xs hover:opacity-90 transition-opacity">
                    <i className="fas fa-file-import mr-1.5"></i>Importar
                  </button>
                  <button onClick={() => setShowCreateProduct(true)} className="px-3 py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-xs">
                    <i className="fas fa-plus mr-1.5"></i>Novo
                  </button>
                </div>
              </div>
              
              <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-3 mb-4'}>
                <div className="flex flex-wrap gap-2">
                  <div className="flex-shrink-0 w-44">
                    <div className="relative">
                      <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px]'}></i>
                      <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full pl-7 pr-2 py-1.5 border rounded-lg text-xs'} />
                    </div>
                  </div>
                  <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' flex-shrink-0 px-2.5 py-1.5 border rounded-lg text-xs'}>
                    <option value="">Categoria</option>
                    {CATEGORY_GROUPS.map(group => (
                      <optgroup key={group.label} label={group.label}>
                        {group.items.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <select value={filterColor} onChange={(e) => setFilterColor(e.target.value)} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' flex-shrink-0 px-2.5 py-1.5 border rounded-lg text-xs'}>
                    <option value="">Cor</option>
                    {COLORS.map(color => <option key={color} value={color}>{color}</option>)}
                  </select>
                  <select value={filterCollection} onChange={(e) => setFilterCollection(e.target.value)} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' flex-shrink-0 px-2.5 py-1.5 border rounded-lg text-xs'}>
                    <option value="">Coleção</option>
                    {COLLECTIONS.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                  {(filterCategory || filterColor || filterCollection) && (
                    <button onClick={() => { setFilterCategory(''); setFilterColor(''); setFilterCollection(''); }} className="px-2.5 py-1.5 text-xs text-pink-500 hover:bg-pink-500/10 rounded-lg transition-colors">
                      <i className="fas fa-times mr-1"></i>Limpar
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-500') + ' text-[10px]'}>{filteredProducts.length} de {products.length} produtos</p>
                  {filteredProducts.length > 0 && (
                    <button onClick={selectAllProducts} className={(theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' text-[10px] flex items-center gap-1'}>
                      <i className={`far fa-${selectedProducts.length === filteredProducts.length ? 'check-square' : 'square'} text-xs`}></i>
                      {selectedProducts.length === filteredProducts.length ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                  )}
                </div>
              </div>

              {/* Barra de ações para produtos selecionados */}
              {selectedProducts.length > 0 && (
                <div className={(theme === 'dark' ? 'bg-pink-500/20 border-pink-500/30' : 'bg-pink-50 border-pink-200') + ' rounded-xl border p-3 mb-4 flex items-center justify-between'}>
                  <div className="flex items-center gap-2">
                    <span className="text-pink-500 font-medium text-sm">{selectedProducts.length} selecionado{selectedProducts.length > 1 ? 's' : ''}</span>
                    <button onClick={() => setSelectedProducts([])} className={(theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' text-xs'}>
                      <i className="fas fa-times mr-1"></i>Cancelar
                    </button>
                  </div>
                  <button onClick={() => setShowDeleteProductsModal(true)} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors">
                    <i className="fas fa-trash text-[10px]"></i>Excluir {selectedProducts.length > 1 ? `(${selectedProducts.length})` : ''}
                  </button>
                </div>
              )}
              
              <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border overflow-hidden'}>
                {filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 p-3">
                    {filteredProducts.map(product => (
                      <div
                        key={product.id}
                        className={(theme === 'dark' ? 'bg-neutral-800 hover:bg-neutral-700' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200') + ' rounded-lg overflow-hidden cursor-pointer transition-colors group relative select-none ' + (selectedProducts.includes(product.id) ? 'ring-2 ring-pink-500' : '')}
                        onTouchStart={() => handleProductTouchStart(product.id)}
                        onTouchEnd={() => handleProductTouchEnd(product.id)}
                        onTouchMove={handleProductTouchMove}
                        onClick={(e) => {
                          // Desktop: clique abre card se não está em modo seleção
                          if (window.matchMedia('(pointer: fine)').matches) {
                            if (selectedProducts.length > 0) {
                              toggleProductSelection(product.id);
                            } else {
                              setShowProductDetail(product);
                            }
                          }
                        }}
                      >
                        <div className={(theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200') + ' aspect-square relative overflow-hidden'}>
                          <img src={product.images[0]?.base64 || product.images[0]?.url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform pointer-events-none" />
                          {/* Checkbox de seleção - visível em modo seleção ou hover no desktop */}
                          <div
                            className={'absolute top-1.5 left-1.5 w-5 h-5 rounded flex items-center justify-center transition-all pointer-events-none ' + (selectedProducts.includes(product.id) ? 'bg-pink-500 text-white' : selectedProducts.length > 0 ? 'bg-black/50 text-white/70' : 'bg-black/50 text-white/70 opacity-0 group-hover:opacity-100')}
                          >
                            <i className={`fas fa-${selectedProducts.includes(product.id) ? 'check' : 'square'} text-[8px]`}></i>
                          </div>
                          {/* Botão delete individual - apenas desktop hover */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteProductTarget(product); setShowDeleteProductsModal(true); }}
                            className="absolute top-1.5 right-1.5 w-5 h-5 rounded bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hidden md:flex"
                            title="Excluir produto"
                          >
                            <i className="fas fa-trash text-[8px]"></i>
                          </button>
                        </div>
                        <div className="p-2">
                          <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-[8px] font-medium uppercase tracking-wide'}>{product.sku}</p>
                          <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-[10px] font-medium truncate'}>{product.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3'}>
                      <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-box text-xl'}></i>
                    </div>
                    <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium mb-1'}>Nenhum produto</h3>
                    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mb-3'}>Adicione seu primeiro produto</p>
                    <button onClick={() => setShowImport(true)} className={(theme === 'dark' ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-pink-500 text-white hover:bg-pink-600') + ' mt-3 px-4 py-2 rounded-lg font-medium text-xs'}>
                      <i className="fas fa-plus mr-1.5"></i>Adicionar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CLIENTS */}
        {currentPage === 'clients' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={'w-10 h-10 rounded-xl flex items-center justify-center ' + (theme === 'dark' ? 'bg-gradient-to-r from-pink-500/20 to-orange-400/20 border border-pink-500/30' : 'bg-gradient-to-r from-pink-500 to-orange-400 shadow-lg shadow-pink-500/25')}>
                    <i className={'fas fa-users text-sm ' + (theme === 'dark' ? 'text-pink-400' : 'text-white')}></i>
                  </div>
                  <div>
                    <h1 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold'}>Clientes</h1>
                    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Gerencie seus clientes</p>
                  </div>
                </div>
                <button onClick={() => setShowCreateClient(true)} className="px-3 py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-xs">
                  <i className="fas fa-plus mr-1.5"></i>Novo Cliente
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl p-3 border'}>
                  <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xl font-bold'}>{clients.length}</p>
                  <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Total</p>
                </div>
                <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl p-3 border'}>
                  <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xl font-bold'}>{clients.filter(c => c.status === 'active').length}</p>
                  <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Ativos</p>
                </div>
                <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl p-3 border'}>
                  <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xl font-bold'}>{clientsWithProvador.length}</p>
                  <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Provador IA</p>
                </div>
                <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl p-3 border'}>
                  <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xl font-bold'}>{clients.filter(c => c.status === 'vip').length}</p>
                  <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>VIP</p>
                </div>
              </div>
              
              {clients.length > 0 && (
                <div className="mb-4">
                  <div className="relative">
                    <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs'}></i>
                    <input type="text" placeholder="Buscar por nome, WhatsApp ou e-mail..." value={clientSearchTerm} onChange={(e) => setClientSearchTerm(e.target.value)} className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-gray-200 text-gray-900 shadow-sm') + ' w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm'} />
                  </div>
                </div>
              )}
              
              {clients.length === 0 ? (
                <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-8 text-center'}>
                  <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-purple-100') + ' w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3'}>
                    <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-purple-400') + ' fas fa-users text-xl'}></i>
                  </div>
                  <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium mb-1'}>Nenhum cliente cadastrado</h3>
                  <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mb-4'}>Adicione clientes para usar o Vizzu Provador®</p>
                  <button onClick={() => setShowCreateClient(true)} className="px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-xs">
                    <i className="fas fa-plus mr-1.5"></i>Adicionar Cliente
                  </button>
                </div>
              ) : (
                <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border overflow-hidden'}>
                  <div className={'divide-y ' + (theme === 'dark' ? 'divide-neutral-800' : 'divide-gray-100')}>
                    {filteredClients.map(client => (
                      <div key={client.id} className={(theme === 'dark' ? 'hover:bg-neutral-800/50' : 'hover:bg-purple-50') + ' p-3 transition-colors cursor-pointer'} onClick={() => setShowClientDetail(client)}>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {getClientPhoto(client) ? (
                              <img src={getClientPhoto(client)} alt={client.firstName} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-purple-100') + ' w-10 h-10 rounded-full flex items-center justify-center'}>
                                <span className={(theme === 'dark' ? 'text-neutral-400' : 'text-purple-500') + ' text-sm font-medium'}>{client.firstName[0]}{client.lastName[0]}</span>
                              </div>
                            )}
                            {client.hasProvadorIA && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-pink-500 rounded-full flex items-center justify-center">
                                <i className="fas fa-camera text-white text-[6px]"></i>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-sm truncate'}>{client.firstName} {client.lastName}</h3>
                              {client.photos && client.photos.length > 1 && (
                                <span className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400' : 'bg-purple-100 text-purple-600') + ' text-[8px] px-1.5 py-0.5 rounded-full'}>{client.photos.length} fotos</span>
                              )}
                            </div>
                            <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>{formatWhatsApp(client.whatsapp)}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {client.hasProvadorIA && (
                              <button onClick={(e) => { e.stopPropagation(); setProvadorClient(client); setCurrentPage('provador'); }} className={(theme === 'dark' ? 'bg-neutral-800 hover:bg-neutral-700' : 'bg-pink-100 hover:bg-pink-200') + ' w-8 h-8 rounded-lg text-pink-500 flex items-center justify-center transition-colors'} title="Vizzu Provador®">
                                <i className="fas fa-wand-magic-sparkles text-xs"></i>
                              </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); handleSendWhatsApp(client, 'Olá ' + client.firstName + '!'); }} className={(theme === 'dark' ? 'bg-neutral-800 hover:bg-neutral-700' : 'bg-green-100 hover:bg-green-200') + ' w-8 h-8 rounded-lg text-green-500 flex items-center justify-center transition-colors'} title="WhatsApp">
                              <i className="fab fa-whatsapp text-sm"></i>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); if (confirm('Excluir cliente ' + client.firstName + ' ' + client.lastName + '?')) handleDeleteClient(client.id); }} className={(theme === 'dark' ? 'bg-neutral-800 hover:bg-red-500/20' : 'bg-gray-100 hover:bg-red-100') + ' w-8 h-8 rounded-lg text-red-500 flex items-center justify-center transition-colors'} title="Excluir">
                              <i className="fas fa-trash text-xs"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {currentPage === 'settings' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-2xl mx-auto">
              {/* Header com Dropdown */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={'w-10 h-10 rounded-xl flex items-center justify-center ' + (theme === 'dark' ? 'bg-gradient-to-r from-fuchsia-500/20 to-rose-400/20 border border-fuchsia-500/30' : 'bg-gradient-to-r from-fuchsia-500 to-rose-400 shadow-lg shadow-fuchsia-500/25')}>
                    <i className={'fas fa-cog text-sm ' + (theme === 'dark' ? 'text-fuchsia-400' : 'text-white')}></i>
                  </div>
                  <div>
                    <h1 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold'}>Configurações</h1>
                    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs hidden md:block'}>Gerencie sua conta e preferências</p>
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
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSettingsTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      settingsTab === tab.id
                        ? 'bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white shadow-lg shadow-fuchsia-500/30'
                        : theme === 'dark'
                          ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
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
                        <h2 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xl font-bold mb-1'}>Escolha o plano ideal para seu negocio</h2>
                        <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-sm'}>Transforme suas fotos de produtos em imagens profissionais com IA</p>
                      </div>

                      {/* Status atual de creditos */}
                      <div className="bg-gradient-to-br from-fuchsia-600/20 via-purple-600/15 to-rose-600/20 border border-fuchsia-500/30 rounded-2xl p-5 mb-6 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-500 to-rose-500 flex items-center justify-center shadow-lg shadow-fuchsia-500/30">
                              <i className="fas fa-coins text-white text-lg"></i>
                            </div>
                            <div>
                              <p className="text-fuchsia-300 text-[10px] uppercase tracking-wider font-medium">Seus Creditos</p>
                              <p className="text-white text-3xl font-bold">{userCredits} <span className="text-base font-normal text-neutral-400">/ {currentPlan.limit}</span></p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white shadow-lg whitespace-nowrap">
                              <i className="fas fa-crown text-[10px]"></i>
                              {currentPlan.name}
                            </span>
                          </div>
                        </div>
                        <div className="bg-neutral-900/50 h-3 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-rose-500 rounded-full transition-all shadow-lg shadow-fuchsia-500/50" style={{ width: Math.min(100, (userCredits / currentPlan.limit) * 100) + '%' }}></div>
                        </div>
                      </div>

                      {/* Toggle Mensal/Anual */}
                      <div className="flex items-center justify-center gap-3 mb-6">
                        <span className={(billingPeriod === 'monthly' ? 'text-white' : 'text-neutral-500') + ' text-sm font-medium'}>Mensal</span>
                        <button
                          onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
                          className={(billingPeriod === 'yearly' ? 'bg-gradient-to-r from-fuchsia-500 to-rose-500' : 'bg-neutral-700') + ' relative w-14 h-7 rounded-full transition-colors'}
                        >
                          <div className={'absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ' + (billingPeriod === 'yearly' ? 'translate-x-8' : 'translate-x-1')}></div>
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
                                  ? 'bg-gradient-to-br from-fuchsia-600/30 via-purple-600/20 to-rose-600/30 border-2 border-fuchsia-500 shadow-xl shadow-fuchsia-500/20'
                                  : isPro
                                    ? 'bg-gradient-to-br from-fuchsia-900/30 via-purple-900/20 to-neutral-900 border border-fuchsia-500/30 hover:border-fuchsia-500/60'
                                    : isPremier
                                      ? 'bg-gradient-to-br from-amber-900/30 via-orange-900/20 to-neutral-900 border border-amber-500/30 hover:border-amber-500/60'
                                      : 'bg-gradient-to-br from-neutral-800/50 to-neutral-900 border border-neutral-700 hover:border-neutral-600'
                                )
                              }
                            >
                              {/* Badge */}
                              {isCurrentPlan && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                  <span className="px-4 py-1.5 bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white text-[10px] font-bold rounded-full shadow-lg whitespace-nowrap">
                                    ATUAL
                                  </span>
                                </div>
                              )}
                              {isPro && !isCurrentPlan && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                  <span className="px-4 py-1.5 bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white text-[10px] font-bold rounded-full shadow-lg whitespace-nowrap">
                                    POPULAR
                                  </span>
                                </div>
                              )}
                              {isPremier && !isCurrentPlan && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                  <span className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-full shadow-lg flex items-center gap-1 whitespace-nowrap">
                                    <i className="fas fa-star text-[8px]"></i>
                                    COMPLETO
                                  </span>
                                </div>
                              )}

                              <div className="pt-3">
                                <h3 className="text-white text-xl font-bold">{plan.name}</h3>
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
                                      : 'bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white hover:shadow-lg hover:shadow-fuchsia-500/30 hover:scale-[1.02]'
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
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                            <i className="fas fa-coins text-white"></i>
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
                              <i className="fas fa-circle-question text-fuchsia-400"></i>
                              Perguntas Frequentes
                            </span>
                            <i className="fas fa-chevron-down text-xs transition-transform group-open:rotate-180"></i>
                          </summary>
                          <div className="text-neutral-400 mt-4 space-y-3 text-xs">
                            <div>
                              <p className="text-white font-medium mb-1">O que sao creditos?</p>
                              <p>Creditos sao usados para gerar imagens com IA. Cada geracao consome de 1 a 3 creditos dependendo da complexidade.</p>
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
                        Precisa de mais? <a href="#" className="text-fuchsia-400 hover:underline">Entre em contato</a> para planos personalizados.
                      </p>
                    </div>
                  );
                  })()}
                  
                  {settingsTab === 'profile' && (
                    <div>
                      <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold mb-4'}>Perfil</h3>
                      <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-4'}>
                        <div className="flex items-center gap-3 mb-5">
                          <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' w-14 h-14 rounded-full flex items-center justify-center overflow-hidden'}>
                            {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="" /> : <i className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' fas fa-user text-lg'}></i>}
                          </div>
                          <button className={(theme === 'dark' ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200') + ' px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors'}>Alterar Foto</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>Nome</label>
                            <input type="text" defaultValue={user?.name} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'} />
                          </div>
                          <div>
                            <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>Email</label>
                            <input type="email" defaultValue={user?.email} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-neutral-500' : 'bg-gray-100 border-gray-200 text-gray-500') + ' w-full px-3 py-2 border rounded-lg text-sm'} disabled />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {settingsTab === 'appearance' && (
                    <div>
                      <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold mb-4'}>Aparência</h3>
                      <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-4'}>
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
                      <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold'}>Empresa</h3>

                      {/* Dados Básicos */}
                      <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-4'}>
                        <h4 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-sm mb-3 flex items-center gap-2'}>
                          <i className="fas fa-building text-pink-500 text-xs"></i>
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
                      <div className={(theme === 'dark' ? 'bg-gradient-to-r from-pink-500/10 to-orange-500/10 border-pink-500/30' : 'bg-gradient-to-r from-pink-50 to-orange-50 border-pink-200') + ' rounded-xl border p-4'}>
                        <h4 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-sm mb-1 flex items-center gap-2'}>
                          <i className="fas fa-wand-magic-sparkles text-pink-500 text-xs"></i>
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
                                      ? 'border-pink-500 bg-pink-500/20 text-pink-500'
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
                                    ? 'border-pink-500 bg-pink-500/20 text-pink-500'
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
                        className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                      >
                        <i className="fas fa-check"></i>
                        Salvar Configurações
                      </button>
                    </div>
                  )}
                  
                  {settingsTab === 'integrations' && (
                    <div>
                      <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold mb-4'}>Integrações</h3>
                      <div className="space-y-2">
                        {[
                          { icon: 'fab fa-shopify', name: 'Shopify', desc: 'Sincronize produtos' },
                          { icon: 'fab fa-wordpress', name: 'WooCommerce', desc: 'Loja WordPress' },
                          { icon: 'fas fa-store', name: 'VTEX', desc: 'VTEX IO' },
                        ].map(item => (
                          <div key={item.name} className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-3 flex items-center justify-between'}>
                            <div className="flex items-center gap-3">
                              <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' w-9 h-9 rounded-lg flex items-center justify-center'}>
                                <i className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' ' + item.icon + ' text-sm'}></i>
                              </div>
                              <div>
                                <h4 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-xs'}>{item.name}</h4>
                                <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{item.desc}</p>
                              </div>
                            </div>
                            <button className={(theme === 'dark' ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200') + ' px-3 py-1.5 rounded-lg font-medium text-[10px] transition-colors'}>Conectar</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {settingsTab === 'history' && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold'}>Histórico</h3>
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
                        <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-8 text-center'}>
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
                              <div key={log.id} className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700' : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm') + ' rounded-xl border p-4 transition-colors'}>
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
                                        <span className="text-pink-500">
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
                </div>
            </div>
          </div>
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION - Esconde quando está dentro das features de criação */}
      {!['product-studio', 'provador', 'look-composer', 'lifestyle'].includes(currentPage) && (
      <nav
        className={'md:hidden flex-shrink-0 border-t px-2 pt-1.5 ' + (theme === 'dark' ? 'bg-neutral-950 border-neutral-900' : 'bg-white border-gray-200 shadow-lg')}
        style={{ paddingBottom: 'calc(0.375rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex items-center justify-around">
          <button onClick={() => setCurrentPage('dashboard')} className={'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ' + (currentPage === 'dashboard' ? (theme === 'dark' ? 'text-white' : 'text-pink-500') : (theme === 'dark' ? 'text-neutral-600' : 'text-gray-400'))}>
            <i className="fas fa-home text-sm"></i>
            <span className="text-[9px] font-medium">Home</span>
          </button>
          <button onClick={() => setCurrentPage('products')} className={'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ' + (currentPage === 'products' ? (theme === 'dark' ? 'text-white' : 'text-pink-500') : (theme === 'dark' ? 'text-neutral-600' : 'text-gray-400'))}>
            <i className="fas fa-box text-sm"></i>
            <span className="text-[9px] font-medium">Produtos</span>
          </button>
          {/* Botão CRIAR - Central destacado */}
          <button onClick={() => setCurrentPage('create')} className="relative -mt-5">
            <div className={'w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/30 transition-all ' + ((currentPage === 'create' || currentPage === 'provador' || currentPage === 'look-composer' || currentPage === 'lifestyle' || currentPage === 'product-studio') ? 'bg-gradient-to-br from-pink-500 to-orange-400 scale-110' : 'bg-gradient-to-br from-pink-500 to-orange-400')}>
              <i className="fas fa-wand-magic-sparkles text-white text-lg"></i>
            </div>
            <span className={'block text-[9px] font-medium mt-0.5 text-center ' + ((currentPage === 'create' || currentPage === 'provador' || currentPage === 'look-composer' || currentPage === 'lifestyle' || currentPage === 'product-studio') ? (theme === 'dark' ? 'text-white' : 'text-pink-500') : (theme === 'dark' ? 'text-neutral-500' : 'text-gray-500'))}>Criar</span>
          </button>
          <button onClick={() => setCurrentPage('models')} className={'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ' + (currentPage === 'models' ? (theme === 'dark' ? 'text-white' : 'text-pink-500') : (theme === 'dark' ? 'text-neutral-600' : 'text-gray-400'))}>
            <i className="fas fa-user-tie text-sm"></i>
            <span className="text-[9px] font-medium">Modelos</span>
          </button>
          <button onClick={() => setCurrentPage('clients')} className={'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ' + (currentPage === 'clients' ? (theme === 'dark' ? 'text-white' : 'text-pink-500') : (theme === 'dark' ? 'text-neutral-600' : 'text-gray-400'))}>
            <i className="fas fa-users text-sm"></i>
            <span className="text-[9px] font-medium">Clientes</span>
          </button>
        </div>
      </nav>
      )}


      {/* VIDEO TUTORIAL MODAL */}
      {showVideoTutorial && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setShowVideoTutorial(null)}>
          <div className={'relative w-full max-w-4xl rounded-t-2xl md:rounded-2xl overflow-hidden ' + (theme === 'dark' ? 'bg-neutral-900' : 'bg-white')} onClick={(e) => e.stopPropagation()}>
            {/* Drag handle - mobile */}
            <div className="md:hidden absolute top-2 left-1/2 -translate-x-1/2 z-30">
              <div className="bg-white/30 w-10 h-1 rounded-full"></div>
            </div>
            <button onClick={() => setShowVideoTutorial(null)} className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/50 text-white hidden md:flex items-center justify-center hover:bg-black/70 transition-colors">
              <i className="fas fa-times"></i>
            </button>
            <div className="relative aspect-video bg-black">
              <div className={'absolute inset-0 flex flex-col items-center justify-center text-white ' + (showVideoTutorial === 'studio' ? 'bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600' : 'bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500')}>
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
                  <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-bold'}>{showVideoTutorial === 'studio' ? 'Vizzu Studio®' : 'Vizzu Provador®'}</h3>
                  <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-sm'}>{showVideoTutorial === 'studio' ? 'Transforme suas fotos de produto em imagens profissionais' : 'Vista seus clientes virtualmente e aumente suas vendas'}</p>
                </div>
                <button onClick={() => { setShowVideoTutorial(null); setCurrentPage(showVideoTutorial); }} className={'px-6 py-3 text-white font-bold rounded-xl flex items-center gap-2 ' + (showVideoTutorial === 'studio' ? 'bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600' : 'bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500')}>
                  <i className="fas fa-rocket"></i>Começar Agora<i className="fas fa-arrow-right text-sm"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CLIENT MODAL */}
      {showCreateClient && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => { setShowCreateClient(false); setNewClient({ firstName: '', lastName: '', whatsapp: '', email: '', gender: '', photos: [], notes: '' }); }}>
          <div className={(theme === 'dark' ? 'bg-neutral-900/95 backdrop-blur-2xl border-neutral-800' : 'bg-white/95 backdrop-blur-2xl border-gray-200') + ' rounded-t-2xl md:rounded-2xl border w-full max-w-md max-h-[90vh] overflow-y-auto'} onClick={(e) => e.stopPropagation()}>
            {/* Drag handle - mobile */}
            <div className="md:hidden pt-3 pb-1 flex justify-center">
              <div className={(theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-300') + ' w-10 h-1 rounded-full'}></div>
            </div>
            <div className={'sticky top-0 border-b px-4 py-3 flex items-center justify-between z-10 ' + (theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200')}>
              <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>Novo Cliente</h3>
              <button onClick={() => { setShowCreateClient(false); setNewClient({ firstName: '', lastName: '', whatsapp: '', email: '', gender: '', photos: [], notes: '' }); }} className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700') + ' hidden md:flex w-7 h-7 rounded-full items-center justify-center transition-colors'}>
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] font-medium uppercase tracking-wide mb-2 block'}>
                  <i className="fas fa-camera text-pink-400 mr-1"></i>Fotos para Provador IA
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PHOTO_TYPES.map(photoType => {
                    const existingPhoto = newClient.photos.find(p => p.type === photoType.id);
                    return (
                      <div key={photoType.id} className="text-center">
                        <div
                          onClick={() => { if (existingPhoto) return; setShowClientPhotoSourcePicker({ photoType: photoType.id, mode: 'create' }); }}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleClientPhotoDrop(e, photoType.id)}
                          className={'relative aspect-square rounded-lg overflow-hidden border border-dashed transition-all cursor-pointer ' + (existingPhoto ? 'border-pink-500/50 bg-pink-500/10' : (theme === 'dark' ? 'border-neutral-700 hover:border-pink-500/50 hover:bg-neutral-800' : 'border-purple-300 hover:border-pink-400 hover:bg-purple-50'))}
                        >
                          {existingPhoto ? (
                            <>
                              <img src={existingPhoto.base64} alt={photoType.label} className="w-full h-full object-cover" />
                              <button onClick={(e) => { e.stopPropagation(); handleRemoveClientPhoto(photoType.id); }} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[9px] hover:bg-red-600"><i className="fas fa-times"></i></button>
                              <div className="absolute bottom-0 left-0 right-0 bg-pink-500 text-white text-[8px] py-0.5 font-medium"><i className="fas fa-check mr-0.5"></i>{photoType.label}</div>
                            </>
                          ) : (
                            <div className={(theme === 'dark' ? 'text-neutral-600' : 'text-purple-400') + ' flex flex-col items-center justify-center h-full'}>
                              <i className={'fas ' + photoType.icon + ' text-lg mb-1'}></i>
                              <span className="text-[9px] font-medium">{photoType.label}</span>
                              <span className="text-[7px] opacity-60 mt-0.5">ou arraste</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {processingClientPhoto && (
                  <div className="flex items-center gap-2 mt-2 px-2.5 py-2 bg-blue-500/10 text-blue-400 rounded-lg">
                    <i className="fas fa-spinner fa-spin text-sm"></i>
                    <span className="text-[10px] font-medium">Processando imagem... (pode levar alguns segundos)</span>
                  </div>
                )}
                {!processingClientPhoto && newClient.photos.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1.5 bg-pink-500/10 text-pink-500 rounded-lg">
                    <i className="fas fa-check text-[10px]"></i>
                    <span className="text-[10px] font-medium">Provador IA ativado - {newClient.photos.length} foto(s)</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] font-medium uppercase tracking-wide mb-1 block'}>Nome *</label>
                  <input type="text" value={newClient.firstName} onChange={(e) => setNewClient(prev => ({ ...prev, firstName: e.target.value }))} placeholder="Maria" className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'} />
                </div>
                <div>
                  <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] font-medium uppercase tracking-wide mb-1 block'}>Sobrenome *</label>
                  <input type="text" value={newClient.lastName} onChange={(e) => setNewClient(prev => ({ ...prev, lastName: e.target.value }))} placeholder="Silva" className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'} />
                </div>
              </div>
              <div>
                <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] font-medium uppercase tracking-wide mb-1 block'}>Gênero *</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setNewClient(prev => ({ ...prev, gender: 'female' }))} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${newClient.gender === 'female' ? 'bg-pink-500 text-white' : (theme === 'dark' ? 'bg-neutral-800 border border-neutral-700 text-neutral-400 hover:border-pink-500/50' : 'bg-gray-50 border border-gray-200 text-gray-600 hover:border-pink-400')}`}>
                    <i className="fas fa-venus mr-1.5"></i>Feminino
                  </button>
                  <button type="button" onClick={() => setNewClient(prev => ({ ...prev, gender: 'male' }))} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${newClient.gender === 'male' ? 'bg-blue-500 text-white' : (theme === 'dark' ? 'bg-neutral-800 border border-neutral-700 text-neutral-400 hover:border-blue-500/50' : 'bg-gray-50 border border-gray-200 text-gray-600 hover:border-blue-400')}`}>
                    <i className="fas fa-mars mr-1.5"></i>Masculino
                  </button>
                </div>
              </div>
              <div>
                <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] font-medium uppercase tracking-wide mb-1 block'}>WhatsApp *</label>
                <div className="relative">
                  <i className="fab fa-whatsapp absolute left-3 top-1/2 -translate-y-1/2 text-green-500 text-sm"></i>
                  <input type="tel" value={newClient.whatsapp} onChange={(e) => setNewClient(prev => ({ ...prev, whatsapp: e.target.value }))} placeholder="(11) 99999-9999" className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full pl-9 pr-3 py-2 border rounded-lg text-sm'} />
                </div>
              </div>
              <div>
                <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] font-medium uppercase tracking-wide mb-1 block'}>E-mail (opcional)</label>
                <div className="relative">
                  <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-xs'}></i>
                  <input type="email" value={newClient.email} onChange={(e) => setNewClient(prev => ({ ...prev, email: e.target.value }))} placeholder="maria@email.com" className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full pl-9 pr-3 py-2 border rounded-lg text-sm'} />
                </div>
              </div>
              <div>
                <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] font-medium uppercase tracking-wide mb-1 block'}>Observações (opcional)</label>
                <textarea value={newClient.notes} onChange={(e) => setNewClient(prev => ({ ...prev, notes: e.target.value }))} placeholder="Preferências, tamanhos, etc..." rows={2} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm resize-none'} />
              </div>
              {/* Botões de ação */}
              <div className="flex gap-2 pt-2">
                <button onClick={() => { setShowCreateClient(false); setNewClient({ firstName: '', lastName: '', whatsapp: '', email: '', gender: '', photos: [], notes: '' }); }} className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200') + ' flex-1 py-3 rounded-xl font-medium text-sm transition-colors md:hidden'}>
                  Cancelar
                </button>
                <button onClick={handleCreateClient} disabled={!newClient.firstName || !newClient.lastName || !newClient.whatsapp || isSavingClient || processingClientPhoto} className="flex-1 md:w-full py-3 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSavingClient ? (
                    <><i className="fas fa-spinner fa-spin mr-2"></i>Salvando...</>
                  ) : (
                    <><i className="fas fa-user-plus mr-2"></i>Cadastrar</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CLIENT DETAIL MODAL */}
      {showClientDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setShowClientDetail(null)}>
          <div className="bg-neutral-900 rounded-t-2xl md:rounded-2xl border border-neutral-800 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Drag handle - mobile */}
            <div className="md:hidden pt-3 pb-1 flex justify-center">
              <div className="bg-neutral-700 w-10 h-1 rounded-full"></div>
            </div>
            <div className="bg-neutral-800 px-4 py-5 text-center relative border-b border-neutral-700">
              <button onClick={() => setShowClientDetail(null)} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-neutral-700 hidden md:flex items-center justify-center text-neutral-400 hover:text-white transition-colors">
                <i className="fas fa-times text-xs"></i>
              </button>
              <div className="relative inline-block">
                {getClientPhoto(showClientDetail) ? (
                  <img src={getClientPhoto(showClientDetail)} alt={showClientDetail.firstName} className="w-16 h-16 rounded-full object-cover border-2 border-neutral-600 mx-auto" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-neutral-700 flex items-center justify-center mx-auto">
                    <span className="text-xl font-medium text-neutral-400">{showClientDetail.firstName[0]}{showClientDetail.lastName[0]}</span>
                  </div>
                )}
                {showClientDetail.hasProvadorIA && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center border-2 border-neutral-800">
                    <i className="fas fa-camera text-white text-[8px]"></i>
                  </div>
                )}
              </div>
              <h2 className="text-base font-semibold text-white mt-2">{showClientDetail.firstName} {showClientDetail.lastName}</h2>
              <p className="text-neutral-400 text-xs">{formatWhatsApp(showClientDetail.whatsapp)}</p>
            </div>
            <div className="p-4 space-y-3">
              {showClientDetail.photos && showClientDetail.photos.length > 0 && (
                <div>
                  <p className="text-[9px] font-medium text-neutral-500 uppercase tracking-wide mb-2">Fotos Cadastradas</p>
                  <div className="flex gap-2">
                    {showClientDetail.photos.map(photo => (
                      <div key={photo.type} className="relative">
                        <img src={photo.base64} alt={photo.type} className="w-14 h-14 rounded-lg object-cover" />
                        <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[7px] py-0.5 text-center font-medium capitalize">{photo.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                <span className={'px-2 py-1 rounded-full text-[10px] font-medium ' + (showClientDetail.status === 'active' ? 'bg-green-500/20 text-green-400' : showClientDetail.status === 'vip' ? 'bg-amber-500/20 text-amber-400' : 'bg-neutral-800 text-neutral-400')}>
                  {showClientDetail.status === 'active' ? 'Ativo' : showClientDetail.status === 'vip' ? 'VIP' : 'Inativo'}
                </span>
                {showClientDetail.hasProvadorIA && (
                  <span className="px-2 py-1 bg-pink-500/20 text-pink-400 rounded-full text-[10px] font-medium">
                    <i className="fas fa-camera mr-1"></i>Vizzu Provador®
                  </span>
                )}
              </div>
              {showClientDetail.email && (
                <div className="flex items-center gap-2.5 p-2.5 bg-neutral-800 rounded-lg">
                  <i className="fas fa-envelope text-neutral-500 text-xs"></i>
                  <span className="text-xs text-neutral-300">{showClientDetail.email}</span>
                </div>
              )}
              {showClientDetail.notes && (
                <div className="p-2.5 bg-neutral-800 rounded-lg">
                  <p className="text-[9px] font-medium text-neutral-500 uppercase tracking-wide mb-1">Observações</p>
                  <p className="text-xs text-neutral-300">{showClientDetail.notes}</p>
                </div>
              )}
              {/* Looks Salvos */}
              {clientDetailLooks.length > 0 && (
                <div>
                  <p className="text-[9px] font-medium text-neutral-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <i className="fas fa-images text-pink-400"></i>
                    Looks Gerados ({clientDetailLooks.length})
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {clientDetailLooks.map(look => (
                      <div key={look.id} className="relative group">
                        <img
                          src={look.imageUrl}
                          alt="Look"
                          className="w-full aspect-[3/4] object-cover rounded-lg border border-neutral-700 cursor-pointer hover:border-pink-500 transition-colors"
                          onClick={() => window.open(look.imageUrl, '_blank')}
                        />
                        <div className="absolute bottom-1 left-1 right-1 bg-black/70 text-white text-[8px] py-0.5 px-1 rounded text-center truncate">
                          {new Date(look.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 pt-2">
                {showClientDetail.hasProvadorIA && (
                  <button onClick={() => { setProvadorClient(showClientDetail); setShowClientDetail(null); setCurrentPage('provador'); }} className="col-span-2 py-2.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-xs flex items-center justify-center gap-2">
                    <i className="fas fa-wand-magic-sparkles text-[10px]"></i>Vizzu Provador®
                  </button>
                )}
                <button onClick={() => startEditingClient(showClientDetail)} className="py-2.5 bg-neutral-800 hover:bg-neutral-700 text-blue-400 border border-neutral-700 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-colors">
                  <i className="fas fa-pen text-[10px]"></i>Editar
                </button>
                <button onClick={() => openWhatsAppLookModal(showClientDetail)} className="py-2.5 bg-neutral-800 hover:bg-neutral-700 text-green-400 border border-neutral-700 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-colors">
                  <i className="fab fa-whatsapp text-sm"></i>WhatsApp
                </button>
                <button onClick={() => handleDeleteClient(showClientDetail.id)} className="col-span-2 py-2.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-colors">
                  <i className="fas fa-trash text-[10px]"></i>Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WHATSAPP LOOK MODAL */}
      {showWhatsAppLookModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => { setShowWhatsAppLookModal(null); setSelectedLookForWhatsApp(null); setWhatsAppLookMessage(''); }}>
          <div className="bg-neutral-900 rounded-t-2xl md:rounded-2xl border border-neutral-800 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Drag handle - mobile */}
            <div className="md:hidden pt-3 pb-1 flex justify-center">
              <div className="bg-neutral-700 w-10 h-1 rounded-full"></div>
            </div>
            <div className="sticky top-0 border-b px-4 py-3 flex items-center justify-between z-10 bg-neutral-900 border-neutral-800">
              <h3 className="text-white text-sm font-medium flex items-center gap-2">
                <i className="fab fa-whatsapp text-green-500"></i>
                Enviar Look via WhatsApp
              </h3>
              <button onClick={() => { setShowWhatsAppLookModal(null); setSelectedLookForWhatsApp(null); setWhatsAppLookMessage(''); }} className="w-7 h-7 rounded-full bg-neutral-800 hidden md:flex items-center justify-center text-neutral-400 hover:text-white transition-colors">
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Info do cliente */}
              <div className="flex items-center gap-3">
                {getClientPhoto(showWhatsAppLookModal) ? (
                  <img src={getClientPhoto(showWhatsAppLookModal)} alt="" className="w-10 h-10 rounded-full object-cover border border-neutral-700" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
                    <span className="text-sm text-neutral-400">{showWhatsAppLookModal.firstName[0]}</span>
                  </div>
                )}
                <div>
                  <p className="text-white text-sm font-medium">{showWhatsAppLookModal.firstName} {showWhatsAppLookModal.lastName}</p>
                  <p className="text-neutral-400 text-xs">{formatWhatsApp(showWhatsAppLookModal.whatsapp)}</p>
                </div>
              </div>

              {/* Seleção de Look */}
              {clientDetailLooks.length > 0 ? (
                <div>
                  <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-2">
                    {clientDetailLooks.length === 1 ? 'Look que será enviado' : 'Selecione o look para enviar'}
                  </p>
                  <div className={`grid gap-2 ${clientDetailLooks.length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
                    {clientDetailLooks.map(look => (
                      <div
                        key={look.id}
                        onClick={() => {
                          setSelectedLookForWhatsApp(look);
                          setWhatsAppLookMessage(generateWhatsAppLookMessage(showWhatsAppLookModal, look));
                        }}
                        className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                          selectedLookForWhatsApp?.id === look.id
                            ? 'border-green-500 ring-2 ring-green-500/30'
                            : 'border-neutral-700 hover:border-neutral-600'
                        }`}
                      >
                        <img
                          src={look.imageUrl}
                          alt="Look"
                          className={`w-full ${clientDetailLooks.length === 1 ? 'object-contain max-h-[300px] bg-neutral-800' : 'object-cover aspect-[3/4]'}`}
                        />
                        {selectedLookForWhatsApp?.id === look.id && (
                          <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <i className="fas fa-check text-white text-[8px]"></i>
                          </div>
                        )}
                        <div className="absolute bottom-1 left-1 right-1 bg-black/70 text-white text-[8px] py-0.5 px-1 rounded text-center">
                          {new Date(look.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-images text-neutral-600 text-2xl mb-2"></i>
                  <p className="text-neutral-400 text-xs">Nenhum look gerado ainda</p>
                  <p className="text-neutral-500 text-[10px]">Gere looks no Vizzu Provador®</p>
                </div>
              )}

              {/* Mensagem */}
              {(selectedLookForWhatsApp || clientDetailLooks.length === 0) && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-medium text-green-400 uppercase tracking-wide flex items-center gap-1">
                      <i className="fab fa-whatsapp text-green-500"></i>
                      Mensagem
                    </p>
                  </div>
                  <textarea
                    value={whatsAppLookMessage}
                    onChange={(e) => setWhatsAppLookMessage(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 bg-neutral-800/50 border border-green-500/20 rounded-lg text-xs text-white placeholder-neutral-500 resize-none"
                    placeholder="Digite sua mensagem..."
                  />
                </div>
              )}

              {/* Botão de enviar */}
              <button
                onClick={sendWhatsAppWithLook}
                disabled={(clientDetailLooks.length > 0 && !selectedLookForWhatsApp) || isSendingWhatsAppLook}
                className={`w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                  (clientDetailLooks.length > 0 && !selectedLookForWhatsApp) || isSendingWhatsAppLook
                    ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {isSendingWhatsAppLook ? (
                  <><i className="fas fa-spinner fa-spin"></i>Enviando...</>
                ) : (
                  <><i className="fab fa-whatsapp"></i>Enviar pelo WhatsApp</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CLIENT MODAL */}
      {editingClient && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => { setEditingClient(null); setEditClientPhotos([]); }}>
          <div className="bg-neutral-900 rounded-t-2xl md:rounded-2xl border border-neutral-800 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Drag handle - mobile */}
            <div className="md:hidden pt-3 pb-1 flex justify-center">
              <div className="bg-neutral-700 w-10 h-1 rounded-full"></div>
            </div>
            <div className="sticky top-0 border-b px-4 py-3 flex items-center justify-between z-10 bg-neutral-900 border-neutral-800">
              <h3 className="text-white text-sm font-medium">Editar Cliente</h3>
              <button onClick={() => { setEditingClient(null); setEditClientPhotos([]); }} className="w-7 h-7 rounded-full bg-neutral-800 hidden md:flex items-center justify-center text-neutral-400 hover:text-white transition-colors">
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Fotos */}
              <div>
                <label className="text-neutral-500 text-[9px] font-medium uppercase tracking-wide mb-2 block">
                  <i className="fas fa-camera text-pink-400 mr-1"></i>Fotos para Provador IA
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PHOTO_TYPES.map(photoType => {
                    const existingPhoto = editClientPhotos.find(p => p.type === photoType.id);
                    return (
                      <div key={photoType.id} className="text-center">
                        <div
                          onClick={() => { if (existingPhoto) return; setShowClientPhotoSourcePicker({ photoType: photoType.id, mode: 'edit' }); }}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleEditClientPhotoDrop(e, photoType.id)}
                          className={'relative aspect-square rounded-lg overflow-hidden border border-dashed transition-all cursor-pointer ' + (existingPhoto ? 'border-pink-500/50 bg-pink-500/10' : 'border-neutral-700 hover:border-pink-500/50 hover:bg-neutral-800')}
                        >
                          {existingPhoto ? (
                            <>
                              <img src={existingPhoto.base64} alt={photoType.label} className="w-full h-full object-cover" />
                              <button onClick={(e) => { e.stopPropagation(); setEditClientPhotos(prev => prev.filter(p => p.type !== photoType.id)); }} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[9px] hover:bg-red-600"><i className="fas fa-times"></i></button>
                              <div className="absolute bottom-0 left-0 right-0 bg-pink-500 text-white text-[8px] py-0.5 font-medium text-center"><i className="fas fa-check mr-0.5"></i>{photoType.label}</div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-neutral-600">
                              <i className={'fas ' + photoType.icon + ' text-lg mb-1'}></i>
                              <span className="text-[9px] font-medium">{photoType.label}</span>
                              <span className="text-[7px] opacity-60 mt-0.5">ou arraste</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {processingClientPhoto && (
                  <div className="flex items-center gap-2 mt-2 px-2.5 py-2 bg-blue-500/10 text-blue-400 rounded-lg">
                    <i className="fas fa-spinner fa-spin text-sm"></i>
                    <span className="text-[10px] font-medium">Processando imagem...</span>
                  </div>
                )}
              </div>
              {/* Nome */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-500 text-[9px] font-medium uppercase tracking-wide mb-1 block">Nome *</label>
                  <input type="text" value={editingClient.firstName} onChange={(e) => setEditingClient(prev => prev ? { ...prev, firstName: e.target.value } : null)} className="bg-neutral-800 border-neutral-700 text-white w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-neutral-500 text-[9px] font-medium uppercase tracking-wide mb-1 block">Sobrenome *</label>
                  <input type="text" value={editingClient.lastName} onChange={(e) => setEditingClient(prev => prev ? { ...prev, lastName: e.target.value } : null)} className="bg-neutral-800 border-neutral-700 text-white w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
              {/* Gênero */}
              <div>
                <label className="text-neutral-500 text-[9px] font-medium uppercase tracking-wide mb-1 block">Gênero</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditingClient(prev => prev ? { ...prev, gender: 'female' } : null)} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${editingClient.gender === 'female' ? 'bg-pink-500 text-white' : 'bg-neutral-800 border border-neutral-700 text-neutral-400 hover:border-pink-500/50'}`}>
                    <i className="fas fa-venus mr-1.5"></i>Feminino
                  </button>
                  <button type="button" onClick={() => setEditingClient(prev => prev ? { ...prev, gender: 'male' } : null)} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${editingClient.gender === 'male' ? 'bg-blue-500 text-white' : 'bg-neutral-800 border border-neutral-700 text-neutral-400 hover:border-blue-500/50'}`}>
                    <i className="fas fa-mars mr-1.5"></i>Masculino
                  </button>
                </div>
              </div>
              {/* WhatsApp */}
              <div>
                <label className="text-neutral-500 text-[9px] font-medium uppercase tracking-wide mb-1 block">WhatsApp *</label>
                <div className="relative">
                  <i className="fab fa-whatsapp absolute left-3 top-1/2 -translate-y-1/2 text-green-500 text-sm"></i>
                  <input type="tel" value={editingClient.whatsapp} onChange={(e) => setEditingClient(prev => prev ? { ...prev, whatsapp: e.target.value } : null)} className="bg-neutral-800 border-neutral-700 text-white w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
              {/* Email */}
              <div>
                <label className="text-neutral-500 text-[9px] font-medium uppercase tracking-wide mb-1 block">E-mail (opcional)</label>
                <input type="email" value={editingClient.email || ''} onChange={(e) => setEditingClient(prev => prev ? { ...prev, email: e.target.value } : null)} className="bg-neutral-800 border-neutral-700 text-white w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              {/* Observações */}
              <div>
                <label className="text-neutral-500 text-[9px] font-medium uppercase tracking-wide mb-1 block">Observações</label>
                <textarea value={editingClient.notes || ''} onChange={(e) => setEditingClient(prev => prev ? { ...prev, notes: e.target.value } : null)} rows={2} className="bg-neutral-800 border-neutral-700 text-white w-full px-3 py-2 border rounded-lg text-sm resize-none" />
              </div>
              {/* Botões */}
              <div className="flex gap-2 pt-2">
                <button onClick={() => { setEditingClient(null); setEditClientPhotos([]); }} className="flex-1 py-3 bg-neutral-800 text-neutral-300 rounded-xl font-medium text-sm">
                  Cancelar
                </button>
                <button onClick={saveEditingClient} disabled={!editingClient.firstName || !editingClient.lastName || !editingClient.whatsapp || processingClientPhoto} className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-xl font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  <i className="fas fa-check mr-2"></i>Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


{/* PHOTO SOURCE PICKER */}
{showPhotoSourcePicker && (
  <div className="fixed inset-0 z-[60] bg-black/60 flex items-end justify-center" onClick={() => setShowPhotoSourcePicker(null)}>
    <div className={(theme === 'dark' ? 'bg-neutral-900/95 backdrop-blur-2xl border-neutral-800' : 'bg-white/95 backdrop-blur-2xl border-gray-200') + ' rounded-t-2xl w-full max-w-md p-5 pb-8 border-t'} onClick={(e) => e.stopPropagation()}>
      <div className={(theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-300') + ' w-10 h-1 rounded-full mx-auto mb-4'}></div>
      <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium text-center mb-4'}>
        Adicionar foto {showPhotoSourcePicker === 'front' ? 'de frente' : 'de costas'}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <label className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 hover:border-pink-500/50' : 'bg-gray-50 border-gray-200 hover:border-pink-400') + ' border rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all'}>
          <div className={(theme === 'dark' ? 'bg-neutral-700' : 'bg-pink-100') + ' w-12 h-12 rounded-full flex items-center justify-center'}>
            <i className="fas fa-images text-pink-500"></i>
          </div>
          <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Galeria</span>
          <input 
            type="file" 
            accept="image/*,.heic,.heif" 
            className="hidden" 
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                try {
                  const base64 = await processImageFile(file);
                  if (showPhotoSourcePicker === 'front') {
                    setSelectedFrontImage(base64);
                    // Analisar imagem com IA para pré-preencher campos
                    analyzeProductImageWithAI(base64);
                  } else {
                    setSelectedBackImage(base64);
                  }
                  setShowPhotoSourcePicker(null);
                } catch (error) {
                  console.error('Erro ao processar imagem:', error);
                  alert('Erro ao processar imagem. Tente outro formato.');
                }
              }
            }}
          />
        </label>
        <label className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 hover:border-pink-500/50' : 'bg-gray-50 border-gray-200 hover:border-pink-400') + ' border rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all'}>
          <div className={(theme === 'dark' ? 'bg-neutral-700' : 'bg-orange-100') + ' w-12 h-12 rounded-full flex items-center justify-center'}>
            <i className="fas fa-camera text-orange-500"></i>
          </div>
          <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Câmera</span>
          <input
            type="file"
            accept="image/*,.heic,.heif"
            capture="environment"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                try {
                  const base64 = await processImageFile(file);
                  if (showPhotoSourcePicker === 'front') {
                    setSelectedFrontImage(base64);
                    // Analisar imagem com IA para pré-preencher campos
                    analyzeProductImageWithAI(base64);
                  } else {
                    setSelectedBackImage(base64);
                  }
                  setShowPhotoSourcePicker(null);
                } catch (error) {
                  console.error('Erro ao processar imagem:', error);
                  alert('Erro ao processar imagem. Tente outro formato.');
                }
              }
            }}
          />
        </label>
      </div>
      <button onClick={() => setShowPhotoSourcePicker(null)} className={(theme === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' w-full mt-4 py-2 text-xs font-medium'}>
        Cancelar
      </button>
    </div>
  </div>
)}

{/* CLIENT PHOTO SOURCE PICKER */}
{showClientPhotoSourcePicker && (
  <div className="fixed inset-0 z-[60] bg-black/60 flex items-end justify-center" onClick={() => setShowClientPhotoSourcePicker(null)}>
    <div className={(theme === 'dark' ? 'bg-neutral-900/95 backdrop-blur-2xl border-neutral-800' : 'bg-white/95 backdrop-blur-2xl border-gray-200') + ' rounded-t-2xl w-full max-w-md p-5 pb-8 border-t'} onClick={(e) => e.stopPropagation()}>
      <div className={(theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-300') + ' w-10 h-1 rounded-full mx-auto mb-4'}></div>
      <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium text-center mb-4'}>
        Adicionar foto - {PHOTO_TYPES.find(p => p.id === showClientPhotoSourcePicker.photoType)?.label}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <label className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 hover:border-pink-500/50' : 'bg-gray-50 border-gray-200 hover:border-pink-400') + ' border rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all'}>
          <div className={(theme === 'dark' ? 'bg-neutral-700' : 'bg-pink-100') + ' w-12 h-12 rounded-full flex items-center justify-center'}>
            <i className="fas fa-images text-pink-500"></i>
          </div>
          <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Galeria</span>
          <input
            type="file"
            accept="image/*,.heic,.heif"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file && showClientPhotoSourcePicker) {
                if (showClientPhotoSourcePicker.mode === 'create') {
                  processClientPhotoFile(file, showClientPhotoSourcePicker.photoType);
                } else {
                  processEditClientPhoto(file, showClientPhotoSourcePicker.photoType);
                }
                setShowClientPhotoSourcePicker(null);
              }
            }}
          />
        </label>
        <label className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 hover:border-pink-500/50' : 'bg-gray-50 border-gray-200 hover:border-pink-400') + ' border rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all'}>
          <div className={(theme === 'dark' ? 'bg-neutral-700' : 'bg-orange-100') + ' w-12 h-12 rounded-full flex items-center justify-center'}>
            <i className="fas fa-camera text-orange-500"></i>
          </div>
          <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Câmera</span>
          <input
            type="file"
            accept="image/*,.heic,.heif"
            capture="user"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file && showClientPhotoSourcePicker) {
                if (showClientPhotoSourcePicker.mode === 'create') {
                  processClientPhotoFile(file, showClientPhotoSourcePicker.photoType);
                } else {
                  processEditClientPhoto(file, showClientPhotoSourcePicker.photoType);
                }
                setShowClientPhotoSourcePicker(null);
              }
            }}
          />
        </label>
      </div>
      <button onClick={() => setShowClientPhotoSourcePicker(null)} className={(theme === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' w-full mt-4 py-2 text-xs font-medium'}>
        Cancelar
      </button>
    </div>
  </div>
)}

{/* PRODUCT SELECTOR MODAL - Quando múltiplos produtos são detectados na imagem */}
{showProductSelector && detectedProducts.length > 1 && (
  <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setShowProductSelector(false)}>
    <div className={(theme === 'dark' ? 'bg-neutral-900/95 backdrop-blur-2xl border-neutral-700/50' : 'bg-white/95 backdrop-blur-2xl border-gray-200') + ' rounded-t-2xl md:rounded-2xl border w-full max-w-md p-5 max-h-[80vh] overflow-y-auto'} onClick={(e) => e.stopPropagation()}>
      <div className={(theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-300') + ' w-10 h-1 rounded-full mx-auto mb-4 md:hidden'}></div>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
          <i className="fas fa-wand-magic-sparkles text-white"></i>
        </div>
        <div>
          <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold'}>Múltiplos produtos detectados</h3>
          <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-xs'}>Qual produto deseja cadastrar agora?</p>
        </div>
      </div>

      <div className="space-y-2">
        {detectedProducts.map((product, index) => (
          <button
            key={index}
            onClick={() => handleSelectDetectedProduct(product)}
            className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 hover:border-pink-500/50 hover:bg-neutral-800/80' : 'bg-gray-50 border-gray-200 hover:border-pink-400 hover:bg-pink-50') + ' w-full p-4 border rounded-xl flex items-center gap-4 transition-all text-left'}
          >
            <div className={(theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200') + ' w-12 h-12 rounded-lg flex items-center justify-center'}>
              <i className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' fas fa-tshirt text-xl'}></i>
            </div>
            <div className="flex-1">
              <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>{product.suggestedName || product.type}</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <span className={(theme === 'dark' ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-200 text-gray-600') + ' px-2 py-0.5 rounded text-[10px]'}>{product.type}</span>
                <span className={(theme === 'dark' ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-200 text-gray-600') + ' px-2 py-0.5 rounded text-[10px]'}>{product.color}</span>
                {product.pattern && product.pattern !== 'Liso' && (
                  <span className={(theme === 'dark' ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-200 text-gray-600') + ' px-2 py-0.5 rounded text-[10px]'}>{product.pattern}</span>
                )}
              </div>
            </div>
            <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-chevron-right'}></i>
          </button>
        ))}
      </div>

      <button
        onClick={() => setShowProductSelector(false)}
        className={(theme === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' w-full mt-4 py-2 text-xs font-medium'}
      >
        Preencher manualmente
      </button>
    </div>
  </div>
)}

{/* CREATE PRODUCT MODAL */}
{showCreateProduct && (
  <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => { setShowCreateProduct(false); setSelectedFrontImage(null); setSelectedBackImage(null); }}>
    <div className={(theme === 'dark' ? 'bg-neutral-900/95 backdrop-blur-2xl border-neutral-700/50' : 'bg-white/95 backdrop-blur-2xl border-gray-200') + ' relative rounded-t-2xl md:rounded-2xl border w-full max-w-md p-5 max-h-[90vh] overflow-y-auto shadow-2xl'} onClick={(e) => e.stopPropagation()}>
      {/* Drag handle - mobile */}
      <div className="md:hidden pb-2 flex justify-center -mt-1">
        <div className={(theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-300') + ' w-10 h-1 rounded-full'}></div>
      </div>
      <div className="flex items-center justify-between mb-4">
        <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>Criar Produto</h3>
        <button onClick={() => { setShowCreateProduct(false); setSelectedFrontImage(null); setSelectedBackImage(null); }} className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700') + ' w-7 h-7 rounded-full hidden md:flex items-center justify-center'}>
          <i className="fas fa-times text-xs"></i>
        </button>
      </div>

      {/* Fotos Frente/Costas */}
      <div className="mb-4">
        <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px] font-medium uppercase tracking-wide mb-2'}>Fotos do Produto</p>
        <div className="grid grid-cols-2 gap-3">
          {/* FRENTE */}
          <div className="flex flex-col">
            <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] font-medium uppercase tracking-wide mb-1 flex items-center gap-1'}>
              <i className="fas fa-image text-pink-500 text-[8px]"></i>
              Frente <span className="text-pink-500">*</span>
            </label>
            {selectedFrontImage ? (
              <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-pink-500">
                <img src={selectedFrontImage} alt="Frente" className="w-full h-full object-cover" />
                <div className="absolute top-1 right-1 flex gap-1">
                  <button onClick={() => setShowPhotoSourcePicker('front')} className="w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center">
                    <i className="fas fa-sync text-[8px]"></i>
                  </button>
                  <button onClick={() => setSelectedFrontImage(null)} className="w-6 h-6 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center">
                    <i className="fas fa-times text-[8px]"></i>
                  </button>
                </div>
                <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-pink-500 text-white text-[8px] font-bold rounded-full">
                  <i className="fas fa-check mr-0.5"></i>OK
                </div>
              </div>
            ) : (
              <div onDrop={(e) => handleImageDrop(e, 'front')} onDragOver={handleDragOver} onClick={() => setShowPhotoSourcePicker('front')} className={(theme === 'dark' ? 'border-neutral-700 hover:border-pink-500/50 bg-neutral-800/50' : 'border-gray-300 hover:border-pink-400 bg-gray-50') + ' aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all cursor-pointer'}>
                <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-plus text-lg'}></i>
                <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px]'}>Arraste ou clique</span>
              </div>
            )}
          </div>

          {/* COSTAS */}
          <div className="flex flex-col">
            <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] font-medium uppercase tracking-wide mb-1 flex items-center gap-1'}>
              <i className="fas fa-image text-neutral-400 text-[8px]"></i>
              Costas <span className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' text-[8px]'}>(opcional)</span>
            </label>
            {selectedBackImage ? (
              <div className={(theme === 'dark' ? 'border-green-500' : 'border-green-400') + ' relative aspect-square rounded-lg overflow-hidden border-2'}>
                <img src={selectedBackImage} alt="Costas" className="w-full h-full object-cover" />
                <div className="absolute top-1 right-1 flex gap-1">
                  <button onClick={() => setShowPhotoSourcePicker('back')} className="w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center">
                    <i className="fas fa-sync text-[8px]"></i>
                  </button>
                  <button onClick={() => setSelectedBackImage(null)} className="w-6 h-6 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center">
                    <i className="fas fa-times text-[8px]"></i>
                  </button>
                </div>
                <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-green-500 text-white text-[8px] font-bold rounded-full">
                  <i className="fas fa-check mr-0.5"></i>OK
                </div>
              </div>
            ) : (
              <div onDrop={(e) => handleImageDrop(e, 'back')} onDragOver={handleDragOver} onClick={() => setShowPhotoSourcePicker('back')} className={(theme === 'dark' ? 'border-neutral-700 hover:border-green-500/50 bg-neutral-800/50' : 'border-gray-300 hover:border-green-400 bg-gray-50') + ' aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all cursor-pointer'}>
                <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-plus text-lg'}></i>
                <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px]'}>Arraste ou clique</span>
              </div>
            )}
          </div>
        </div>

        {/* Dica */}
        <div className={(theme === 'dark' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200') + ' rounded-lg p-2 mt-3 border'}>
          <p className="text-amber-500 text-[10px] flex items-start gap-1.5">
            <i className="fas fa-lightbulb mt-0.5"></i>
            <span><strong>Dica:</strong> Adicionar foto de costas permite que a IA gere imagens de ambos os ângulos.</span>
          </p>
        </div>

      </div>

      {/* OVERLAY DE ANÁLISE IA - Tela imersiva de loading */}
      {isAnalyzingImage && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center rounded-2xl">
          {/* Animação central */}
          <div className="relative mb-6">
            {/* Círculo externo pulsante */}
            <div className="absolute inset-0 w-24 h-24 rounded-full bg-gradient-to-r from-purple-500/30 to-pink-500/30 animate-ping"></div>
            {/* Círculo principal */}
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/50">
              <i className="fas fa-wand-magic-sparkles text-white text-3xl animate-pulse"></i>
            </div>
          </div>

          {/* Texto */}
          <h3 className="text-white text-lg font-semibold mb-2">Analisando imagem...</h3>
          <p className="text-purple-300 text-sm text-center px-8 mb-4">
            Nossa IA está identificando o produto, cor, marca e categoria
          </p>

          {/* Barra de progresso animada */}
          <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-loading"></div>
          </div>

          {/* Lista de detecções */}
          <div className="mt-6 space-y-2 text-center">
            <div className="flex items-center gap-2 text-purple-300 text-xs">
              <i className="fas fa-check-circle text-green-400"></i>
              <span>Tipo de produto</span>
            </div>
            <div className="flex items-center gap-2 text-purple-300 text-xs">
              <i className="fas fa-spinner fa-spin text-purple-400"></i>
              <span>Cor e padrão</span>
            </div>
            <div className="flex items-center gap-2 text-purple-300/50 text-xs">
              <i className="fas fa-circle text-purple-400/30"></i>
              <span>Marca e caimento</span>
            </div>
          </div>
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-3">
        <div>
          <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>Nome do Produto *</label>
          <input type="text" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'} placeholder="Ex: Camiseta Básica Branca" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>Marca</label>
            <input type="text" value={newProduct.brand} onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'} placeholder="Ex: Nike" />
          </div>
          <div>
            <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>Cor</label>
            <select value={newProduct.color} onChange={(e) => setNewProduct({...newProduct, color: e.target.value})} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}>
              <option value="">Selecione</option>
              {COLORS.map(color => <option key={color} value={color}>{color}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>Categoria *</label>
          <select value={newProduct.category} onChange={(e) => { setNewProduct({...newProduct, category: e.target.value}); setProductAttributes({}); }} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}>
            <option value="">Selecione</option>
            {CATEGORY_GROUPS.map(group => (
              <optgroup key={group.label} label={group.label}>
                {group.items.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Atributos condicionais por categoria */}
        {newProduct.category && CATEGORY_ATTRIBUTES[newProduct.category] && (
          <div className={(theme === 'dark' ? 'bg-neutral-800/50 border-neutral-700' : 'bg-purple-50 border-purple-200') + ' p-3 rounded-xl border'}>
            <div className="flex items-center gap-2 mb-2">
              <i className={(theme === 'dark' ? 'text-pink-400' : 'text-pink-500') + ' fas fa-sliders text-xs'}></i>
              <span className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-[10px] font-medium uppercase tracking-wide'}>Atributos de {newProduct.category}</span>
            </div>
            <div className={`grid gap-3 ${CATEGORY_ATTRIBUTES[newProduct.category].length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {CATEGORY_ATTRIBUTES[newProduct.category].map(attr => (
                <div key={attr.id}>
                  <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>{attr.label}</label>
                  <select
                    value={productAttributes[attr.id] || ''}
                    onChange={(e) => setProductAttributes(prev => ({ ...prev, [attr.id]: e.target.value }))}
                    className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}
                  >
                    <option value="">Selecione</option>
                    {attr.options.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <p className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' text-[9px] mt-2'}>
              <i className="fas fa-info-circle mr-1"></i>
              Esses atributos ajudam a IA a gerar imagens mais precisas
            </p>
          </div>
        )}

        <button onClick={handleCreateProduct} disabled={isCreatingProduct || !selectedFrontImage} className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {isCreatingProduct ? (
            <>
              <i className="fas fa-spinner fa-spin text-xs"></i>
              Salvando...
            </>
          ) : (
            <>
              <i className="fas fa-check mr-1.5"></i>Criar Produto
            </>
          )}
        </button>
      </div>
    </div>
  </div>
)}

      {/* PRODUCT DETAIL MODAL */}
      {showProductDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setShowProductDetail(null)}>
          <div
            className={(theme === 'dark' ? 'bg-neutral-900' : 'bg-white') + ' rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col'}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle - mobile */}
            <div className="md:hidden pt-3 pb-1 flex justify-center">
              <div className={(theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-300') + ' w-10 h-1 rounded-full'}></div>
            </div>
            {/* Header fixo */}
            <div className={'flex items-center justify-between p-4 border-b ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-200')}>
              <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>Detalhes do Produto</h3>
              <button onClick={() => setShowProductDetail(null)} className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700') + ' w-7 h-7 rounded-full hidden md:flex items-center justify-center'}>
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>

            {/* Conteúdo com scroll */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Imagem - adaptável à proporção original */}
              <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' rounded-xl overflow-hidden mb-4'}>
                <img
                  src={showProductDetail.images[0]?.base64 || showProductDetail.images[0]?.url}
                  alt={showProductDetail.name}
                  className="w-full h-auto max-h-[50vh] object-contain"
                />
              </div>

              {/* Informações do produto */}
              <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] font-medium uppercase tracking-wide mb-0.5'}>{showProductDetail.sku}</p>
              <h4 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-base font-semibold mb-3'}>{showProductDetail.name}</h4>

              <div className="grid grid-cols-2 gap-2">
                {showProductDetail.brand && (
                  <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' rounded-lg p-2'}>
                    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[8px] uppercase tracking-wide mb-0.5'}>Marca</p>
                    <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-[10px] font-medium'}>{showProductDetail.brand}</p>
                  </div>
                )}
                {showProductDetail.category && (
                  <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' rounded-lg p-2'}>
                    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[8px] uppercase tracking-wide mb-0.5'}>Categoria</p>
                    <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-[10px] font-medium'}>{showProductDetail.category}</p>
                  </div>
                )}
                {showProductDetail.color && (
                  <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' rounded-lg p-2'}>
                    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[8px] uppercase tracking-wide mb-0.5'}>Cor</p>
                    <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-[10px] font-medium'}>{showProductDetail.color}</p>
                  </div>
                )}
                {showProductDetail.fit && (
                  <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' rounded-lg p-2'}>
                    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[8px] uppercase tracking-wide mb-0.5'}>Caimento</p>
                    <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-[10px] font-medium'}>{showProductDetail.fit}</p>
                  </div>
                )}
              </div>

              {/* Seção "Deseja criar?" */}
              <div className={'mt-5 pt-4 border-t ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-200')}>
                <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>
                  <i className="fas fa-wand-magic-sparkles text-pink-500 mr-2"></i>
                  Deseja criar?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {/* Product Studio */}
                  <button
                    onClick={() => {
                      setProductForCreation(showProductDetail);
                      setShowProductDetail(null);
                      setCurrentPage('product-studio');
                    }}
                    className={(theme === 'dark' ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700' : 'bg-gray-50 hover:bg-gray-100 border-gray-200') + ' border rounded-xl p-3 text-left transition-all group'}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-400 flex items-center justify-center mb-2">
                      <i className="fas fa-camera text-white text-xs"></i>
                    </div>
                    <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Product Studio</p>
                    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px]'}>Foto profissional</p>
                  </button>

                  {/* Provador */}
                  <button
                    onClick={() => {
                      setProductForCreation(showProductDetail);
                      setShowProductDetail(null);
                      setCurrentPage('provador');
                    }}
                    className={(theme === 'dark' ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700' : 'bg-gray-50 hover:bg-gray-100 border-gray-200') + ' border rounded-xl p-3 text-left transition-all group'}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-pink-500 to-rose-400 flex items-center justify-center mb-2">
                      <i className="fas fa-shirt text-white text-xs"></i>
                    </div>
                    <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Provador</p>
                    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px]'}>Vista seus clientes</p>
                  </button>

                  {/* Look Completo */}
                  <button
                    onClick={() => {
                      setProductForCreation(showProductDetail);
                      setShowProductDetail(null);
                      setCurrentPage('look-composer');
                    }}
                    className={(theme === 'dark' ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700' : 'bg-gray-50 hover:bg-gray-100 border-gray-200') + ' border rounded-xl p-3 text-left transition-all group'}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-orange-500 to-yellow-400 flex items-center justify-center mb-2">
                      <i className="fas fa-layer-group text-white text-xs"></i>
                    </div>
                    <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Look Completo</p>
                    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px]'}>Monte combinações</p>
                  </button>

                  {/* Cenário Criativo */}
                  <button
                    onClick={() => {
                      setProductForCreation(showProductDetail);
                      setShowProductDetail(null);
                      setCurrentPage('lifestyle');
                    }}
                    className={(theme === 'dark' ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700' : 'bg-gray-50 hover:bg-gray-100 border-gray-200') + ' border rounded-xl p-3 text-left transition-all group'}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-400 flex items-center justify-center mb-2">
                      <i className="fas fa-mountain-sun text-white text-xs"></i>
                    </div>
                    <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Cenário Criativo</p>
                    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px]'}>Com ambiente</p>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* NOTIFICAÇÃO DE SUCESSO */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {successNotification && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] animate-fade-in">
          <div className="flex items-center gap-2 px-4 py-3 bg-green-500 text-white rounded-xl shadow-lg">
            <i className="fas fa-check-circle"></i>
            <span className="text-sm font-medium">{successNotification}</span>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL: IMPORTAÇÃO EM MASSA (Google Sheets, XML, ZIP) */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <BulkImportModal
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onImport={(importedProducts) => {
          const newProducts = importedProducts.map(p => ({
            ...p,
            id: p.id || `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            sku: p.sku || `SKU-${Date.now()}`,
            name: p.name || 'Produto Importado',
            category: p.category || '',
            images: p.images || [],
            createdAt: p.createdAt || new Date().toISOString(),
          } as Product));

          setProducts(prev => [...prev, ...newProducts]);

          // Log da importação
          const newLog: HistoryLog = {
            id: `log-${Date.now()}`,
            date: new Date().toISOString(),
            action: 'Importação em Massa',
            details: `${newProducts.length} produtos importados`,
            status: 'success',
            method: 'bulk',
            cost: 0,
            itemsCount: newProducts.length,
          };
          setHistoryLogs(prev => [newLog, ...prev]);

          // Notificação
          setSuccessNotification(`${newProducts.length} produtos importados com sucesso!`);
          setTimeout(() => setSuccessNotification(null), 3000);
        }}
        theme={theme}
      />

      {/* Modal de confirmação de exclusão de produtos */}
      {showDeleteProductsModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => { setShowDeleteProductsModal(false); setDeleteProductTarget(null); }}>
          <div className={(theme === 'dark' ? 'bg-neutral-900' : 'bg-white') + ' rounded-t-2xl md:rounded-2xl w-full max-w-sm p-5 shadow-xl'} onClick={(e) => e.stopPropagation()}>
            {/* Drag handle - mobile */}
            <div className="md:hidden pb-3 flex justify-center -mt-1">
              <div className={(theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-300') + ' w-10 h-1 rounded-full'}></div>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <i className="fas fa-trash text-red-500"></i>
              </div>
              <div>
                <h4 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium'}>
                  {deleteProductTarget ? 'Excluir Produto' : `Excluir ${selectedProducts.length} Produto${selectedProducts.length > 1 ? 's' : ''}`}
                </h4>
                <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-xs'}>Esta ação não pode ser desfeita</p>
              </div>
            </div>

            <p className={(theme === 'dark' ? 'text-neutral-300' : 'text-gray-600') + ' text-sm mb-4'}>
              {deleteProductTarget
                ? <>Tem certeza que deseja excluir <strong>"{deleteProductTarget.name}"</strong>?</>
                : <>Tem certeza que deseja excluir <strong>{selectedProducts.length} produto{selectedProducts.length > 1 ? 's' : ''}</strong> selecionado{selectedProducts.length > 1 ? 's' : ''}?</>
              }
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => { setShowDeleteProductsModal(false); setDeleteProductTarget(null); }}
                className={(theme === 'dark' ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200') + ' flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors'}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (deleteProductTarget) {
                    handleDeleteProduct(deleteProductTarget);
                    setShowDeleteProductsModal(false);
                    setDeleteProductTarget(null);
                  } else {
                    handleDeleteSelectedProducts();
                  }
                }}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <i className="fas fa-trash text-xs"></i>
                Excluir
              </button>
            </div>
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

      {/* CREATE MODEL WIZARD MODAL */}
      {showCreateModel && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => { setShowCreateModel(false); setEditingModel(null); }}>
          <div className={(theme === 'dark' ? 'bg-neutral-900/95 backdrop-blur-2xl border-neutral-800' : 'bg-white/95 backdrop-blur-2xl border-gray-200') + ' rounded-t-2xl md:rounded-2xl border w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col'} onClick={(e) => e.stopPropagation()}>
            {/* Drag handle - mobile */}
            <div className="md:hidden pt-3 pb-1 flex justify-center">
              <div className={(theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-300') + ' w-10 h-1 rounded-full'}></div>
            </div>
            {/* Header com Steps */}
            <div className={'p-4 border-b ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-200')}>
              <div className="flex items-center justify-between mb-3">
                <h2 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold'}>
                  {editingModel ? 'Editar Modelo' : 'Criar Modelo'}
                </h2>
                <div className="hidden md:flex items-center gap-2">
                  <button
                    onClick={() => minimizeModal({ id: 'createModel', title: newModel.name || 'Novo Modelo', icon: 'fa-user', type: 'createModel', progress: generatingModelImages ? 50 : undefined })}
                    className={(theme === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-600') + ' transition-colors'}
                    title="Minimizar"
                  >
                    <i className="fas fa-window-minimize"></i>
                  </button>
                  <button onClick={() => { setShowCreateModel(false); setEditingModel(null); }} className={(theme === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-600') + ' transition-colors'}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>
              {/* Step Indicators */}
              <div className="flex items-center justify-between gap-2">
                {[
                  { step: 1, label: 'Gênero' },
                  { step: 2, label: 'Físico' },
                  { step: 3, label: 'Aparência' },
                  { step: 4, label: 'Proporções' },
                  { step: 5, label: 'Finalizar' },
                ].map(({ step, label }) => (
                  <div key={step} className="flex-1 text-center">
                    <div className={'mx-auto w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium mb-1 transition-all ' + (
                      modelWizardStep === step
                        ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white'
                        : modelWizardStep > step
                          ? (theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600')
                          : (theme === 'dark' ? 'bg-neutral-800 text-neutral-500' : 'bg-gray-100 text-gray-400')
                    )}>
                      {modelWizardStep > step ? <i className="fas fa-check text-[10px]"></i> : step}
                    </div>
                    <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Step 1: Gênero */}
              {modelWizardStep === 1 && (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold mb-1'}>Selecione o Gênero</h3>
                    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-sm'}>Escolha o gênero do modelo que você deseja criar</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {MODEL_OPTIONS.gender.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setNewModel({ ...newModel, gender: opt.id as 'woman' | 'man' })}
                        className={'p-6 rounded-xl border-2 transition-all text-center ' + (
                          newModel.gender === opt.id
                            ? 'border-pink-500/50 bg-gradient-to-r from-pink-500/20 to-orange-400/20'
                            : (theme === 'dark' ? 'border-neutral-800 hover:border-neutral-700' : 'border-gray-200 hover:border-pink-300')
                        )}
                      >
                        <i className={'fas ' + (opt.id === 'woman' ? 'fa-venus' : 'fa-mars') + ' text-4xl mb-3 ' + (newModel.gender === opt.id ? 'text-pink-500' : (theme === 'dark' ? 'text-neutral-500' : 'text-gray-400'))}></i>
                        <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-base font-medium'}>{opt.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Físico */}
              {modelWizardStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Faixa Etária</label>
                    <div className="grid grid-cols-4 gap-2">
                      {MODEL_OPTIONS.ageRange.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setNewModel({ ...newModel, ageRange: opt.id })}
                          className={'px-2 py-2 rounded-lg border transition-all text-[10px] font-medium ' + (
                            newModel.ageRange === opt.id
                              ? 'border-pink-500/50 bg-gradient-to-r from-pink-500/20 to-orange-400/20 text-pink-400'
                              : (theme === 'dark' ? 'border-neutral-800 hover:border-neutral-700 text-neutral-400' : 'border-gray-200 hover:border-pink-300 text-gray-600')
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Etnia</label>
                    <div className="grid grid-cols-3 gap-2">
                      {MODEL_OPTIONS.ethnicity.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setNewModel({ ...newModel, ethnicity: opt.id })}
                          className={'px-3 py-2 rounded-lg border transition-all text-xs font-medium ' + (
                            newModel.ethnicity === opt.id
                              ? 'border-pink-500/50 bg-gradient-to-r from-pink-500/20 to-orange-400/20 text-pink-400'
                              : (theme === 'dark' ? 'border-neutral-800 hover:border-neutral-700 text-neutral-400' : 'border-gray-200 hover:border-pink-300 text-gray-600')
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Tom de Pele</label>
                    <div className="grid grid-cols-4 gap-2">
                      {MODEL_OPTIONS.skinTone.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setNewModel({ ...newModel, skinTone: opt.id })}
                          className={'px-3 py-2 rounded-lg border transition-all text-xs font-medium ' + (
                            newModel.skinTone === opt.id
                              ? 'border-pink-500/50 bg-gradient-to-r from-pink-500/20 to-orange-400/20 text-pink-400'
                              : (theme === 'dark' ? 'border-neutral-800 hover:border-neutral-700 text-neutral-400' : 'border-gray-200 hover:border-pink-300 text-gray-600')
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Tipo de Corpo</label>
                    <div className="grid grid-cols-3 gap-2">
                      {MODEL_OPTIONS.bodyType.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setNewModel({ ...newModel, bodyType: opt.id })}
                          className={'px-3 py-2 rounded-lg border transition-all text-xs font-medium ' + (
                            newModel.bodyType === opt.id
                              ? 'border-pink-500/50 bg-gradient-to-r from-pink-500/20 to-orange-400/20 text-pink-400'
                              : (theme === 'dark' ? 'border-neutral-800 hover:border-neutral-700 text-neutral-400' : 'border-gray-200 hover:border-pink-300 text-gray-600')
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Altura</label>
                    <div className="grid grid-cols-3 gap-2">
                      {MODEL_OPTIONS.height.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setNewModel({ ...newModel, height: opt.id })}
                          className={'px-3 py-2 rounded-lg border transition-all text-xs font-medium ' + (
                            newModel.height === opt.id
                              ? 'border-pink-500/50 bg-gradient-to-r from-pink-500/20 to-orange-400/20 text-pink-400'
                              : (theme === 'dark' ? 'border-neutral-800 hover:border-neutral-700 text-neutral-400' : 'border-gray-200 hover:border-pink-300 text-gray-600')
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Observações Físicas <span className="text-neutral-500">(opcional)</span></label>
                    <textarea
                      value={newModel.physicalNotes}
                      onChange={(e) => setNewModel({ ...newModel, physicalNotes: e.target.value })}
                      placeholder="Ex: Ombros largos, pernas longas, tatuagens visíveis..."
                      rows={2}
                      className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400') + ' w-full px-3 py-2 rounded-lg border text-xs resize-none'}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Aparência */}
              {modelWizardStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Cor do Cabelo</label>
                    <div className="grid grid-cols-3 gap-2">
                      {MODEL_OPTIONS.hairColor.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setNewModel({ ...newModel, hairColor: opt.id })}
                          className={'px-3 py-2 rounded-lg border transition-all text-xs font-medium ' + (
                            newModel.hairColor === opt.id
                              ? 'border-pink-500/50 bg-gradient-to-r from-pink-500/20 to-orange-400/20 text-pink-400'
                              : (theme === 'dark' ? 'border-neutral-800 hover:border-neutral-700 text-neutral-400' : 'border-gray-200 hover:border-pink-300 text-gray-600')
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Tipo de Cabelo</label>
                    <div className="grid grid-cols-3 gap-2">
                      {MODEL_OPTIONS.hairStyle.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setNewModel({ ...newModel, hairStyle: opt.id })}
                          className={'px-3 py-2 rounded-lg border transition-all text-xs font-medium ' + (
                            newModel.hairStyle === opt.id
                              ? 'border-pink-500/50 bg-gradient-to-r from-pink-500/20 to-orange-400/20 text-pink-400'
                              : (theme === 'dark' ? 'border-neutral-800 hover:border-neutral-700 text-neutral-400' : 'border-gray-200 hover:border-pink-300 text-gray-600')
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Tamanho do Cabelo</label>
                    <div className="grid grid-cols-3 gap-2">
                      {MODEL_OPTIONS.hairLength.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setNewModel({ ...newModel, hairLength: opt.id })}
                          className={'px-3 py-2 rounded-lg border transition-all text-xs font-medium ' + (
                            newModel.hairLength === opt.id
                              ? 'border-pink-500/50 bg-gradient-to-r from-pink-500/20 to-orange-400/20 text-pink-400'
                              : (theme === 'dark' ? 'border-neutral-800 hover:border-neutral-700 text-neutral-400' : 'border-gray-200 hover:border-pink-300 text-gray-600')
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Observações do Cabelo <span className="text-neutral-500">(opcional)</span></label>
                    <input
                      type="text"
                      value={newModel.hairNotes}
                      onChange={(e) => setNewModel({ ...newModel, hairNotes: e.target.value })}
                      placeholder="Ex: Franja, mechas coloridas, raspado nas laterais..."
                      className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400') + ' w-full px-3 py-2 rounded-lg border text-xs'}
                    />
                  </div>
                  <div>
                    <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Cor dos Olhos</label>
                    <div className="grid grid-cols-3 gap-2">
                      {MODEL_OPTIONS.eyeColor.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setNewModel({ ...newModel, eyeColor: opt.id })}
                          className={'px-3 py-2 rounded-lg border transition-all text-xs font-medium ' + (
                            newModel.eyeColor === opt.id
                              ? 'border-pink-500/50 bg-gradient-to-r from-pink-500/20 to-orange-400/20 text-pink-400'
                              : (theme === 'dark' ? 'border-neutral-800 hover:border-neutral-700 text-neutral-400' : 'border-gray-200 hover:border-pink-300 text-gray-600')
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Expressão</label>
                    <div className="grid grid-cols-3 gap-2">
                      {MODEL_OPTIONS.expression.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setNewModel({ ...newModel, expression: opt.id })}
                          className={'px-2 py-2 rounded-lg border transition-all text-[10px] font-medium ' + (
                            newModel.expression === opt.id
                              ? 'border-pink-500/50 bg-gradient-to-r from-pink-500/20 to-orange-400/20 text-pink-400'
                              : (theme === 'dark' ? 'border-neutral-800 hover:border-neutral-700 text-neutral-400' : 'border-gray-200 hover:border-pink-300 text-gray-600')
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Observações da Pele <span className="text-neutral-500">(opcional)</span></label>
                    <input
                      type="text"
                      value={newModel.skinNotes}
                      onChange={(e) => setNewModel({ ...newModel, skinNotes: e.target.value })}
                      placeholder="Ex: Sardas, manchas, vitiligo, cicatrizes..."
                      className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400') + ' w-full px-3 py-2 rounded-lg border text-xs'}
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Proporções */}
              {modelWizardStep === 4 && (
                <div className="space-y-4">
                  {newModel.gender === 'woman' && (
                    <div>
                      <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Tamanho do Busto</label>
                      <div className="grid grid-cols-3 gap-2">
                        {MODEL_OPTIONS.bustSize.map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => setNewModel({ ...newModel, bustSize: opt.id })}
                            className={'px-3 py-2 rounded-lg border transition-all text-xs font-medium ' + (
                              newModel.bustSize === opt.id
                                ? 'border-pink-500/50 bg-gradient-to-r from-pink-500/20 to-orange-400/20 text-pink-400'
                                : (theme === 'dark' ? 'border-neutral-800 hover:border-neutral-700 text-neutral-400' : 'border-gray-200 hover:border-pink-300 text-gray-600')
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Tipo de Cintura</label>
                    <div className="grid grid-cols-3 gap-2">
                      {MODEL_OPTIONS.waistType.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setNewModel({ ...newModel, waistType: opt.id })}
                          className={'px-3 py-2 rounded-lg border transition-all text-xs font-medium ' + (
                            newModel.waistType === opt.id
                              ? 'border-pink-500/50 bg-gradient-to-r from-pink-500/20 to-orange-400/20 text-pink-400'
                              : (theme === 'dark' ? 'border-neutral-800 hover:border-neutral-700 text-neutral-400' : 'border-gray-200 hover:border-pink-300 text-gray-600')
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Preview rápido das características até agora */}
                  <div className={(theme === 'dark' ? 'bg-neutral-800/50' : 'bg-gray-50') + ' rounded-xl p-3 mt-4'}>
                    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] font-medium uppercase tracking-wide mb-2'}>Resumo do Modelo</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className={(theme === 'dark' ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-200 text-gray-600') + ' px-2 py-0.5 rounded-full text-[10px]'}>{getModelLabel('gender', newModel.gender)}</span>
                      <span className={(theme === 'dark' ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-200 text-gray-600') + ' px-2 py-0.5 rounded-full text-[10px]'}>{getModelLabel('ageRange', newModel.ageRange)}</span>
                      <span className={(theme === 'dark' ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-200 text-gray-600') + ' px-2 py-0.5 rounded-full text-[10px]'}>{getModelLabel('ethnicity', newModel.ethnicity)}</span>
                      <span className={(theme === 'dark' ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-200 text-gray-600') + ' px-2 py-0.5 rounded-full text-[10px]'}>{getModelLabel('skinTone', newModel.skinTone)}</span>
                      <span className={(theme === 'dark' ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-200 text-gray-600') + ' px-2 py-0.5 rounded-full text-[10px]'}>{getModelLabel('bodyType', newModel.bodyType)}</span>
                      <span className={(theme === 'dark' ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-200 text-gray-600') + ' px-2 py-0.5 rounded-full text-[10px]'}>{getModelLabel('hairColor', newModel.hairColor)} {getModelLabel('hairLength', newModel.hairLength)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Criar e Visualizar */}
              {modelWizardStep === 5 && (
                <div className="space-y-4">
                  {/* Estado: Gerando */}
                  {generatingModelImages && (
                    <div className="text-center py-8">
                      <div className="w-24 h-24 mx-auto mb-4">
                        <DotLottieReact
                          src="https://lottie.host/d29d70f3-bf03-4212-b53f-932dbefb9077/kIkLDFupvi.lottie"
                          loop
                          autoplay
                          style={{ width: '100%', height: '100%' }}
                        />
                      </div>
                      <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-semibold text-lg mb-2'}>Criando seu modelo...</h3>
                      <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-sm'}>A IA está gerando as imagens. Isso pode levar alguns segundos.</p>
                    </div>
                  )}

                  {/* Estado: Preview pronto */}
                  {!generatingModelImages && modelPreviewImages && (
                    <>
                      <div className="text-center mb-2">
                        <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-semibold text-lg'}>{newModel.name}</h3>
                        <p className={(theme === 'dark' ? 'text-green-400' : 'text-green-600') + ' text-sm'}>
                          <i className="fas fa-check-circle mr-1"></i>Modelo criado com sucesso!
                        </p>
                      </div>
                      {/* Grid de imagens geradas */}
                      <div className="grid grid-cols-3 gap-2">
                        {['front', 'back', 'face'].map((type) => {
                          const imgUrl = modelPreviewImages[type as keyof typeof modelPreviewImages];
                          const labels = { front: 'Frente', back: 'Costas', face: 'Rosto' };
                          return (
                            <div key={type} className="text-center">
                              <div className={'aspect-[3/4] rounded-xl overflow-hidden mb-1 ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100')}>
                                {imgUrl ? (
                                  <img
                                    src={imgUrl}
                                    alt={type}
                                    className="w-full h-full object-contain"
                                    loading="eager"
                                    decoding="async"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      const retryCount = parseInt(target.dataset.retry || '0');
                                      if (retryCount < 3) {
                                        console.log('Retry imagem:', type, 'tentativa', retryCount + 1);
                                        target.dataset.retry = String(retryCount + 1);
                                        setTimeout(() => {
                                          target.src = imgUrl + '?retry=' + Date.now();
                                        }, 1000 * (retryCount + 1));
                                      } else {
                                        console.error('Falha ao carregar imagem após 3 tentativas:', type);
                                      }
                                    }}
                                    onLoad={() => console.log('Imagem carregada:', type)}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-300') + ' fas fa-image text-xl'}></i>
                                  </div>
                                )}
                              </div>
                              <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{labels[type as keyof typeof labels]}</span>
                            </div>
                          );
                        })}
                      </div>
                      <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs text-center mt-2'}>
                        Gostou? Salve o modelo ou gere outro com as mesmas características.
                      </p>
                    </>
                  )}

                  {/* Estado: Aguardando criar */}
                  {!generatingModelImages && !modelPreviewImages && (
                    <>
                      {/* Nome do modelo */}
                      <div>
                        <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>Nome do Modelo</label>
                        <input
                          type="text"
                          value={newModel.name}
                          onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                          placeholder="Ex: Modelo Feminino Casual"
                          className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400') + ' w-full px-3 py-2.5 rounded-lg border text-sm'}
                        />
                      </div>

                      {/* Prompt que será enviado */}
                      <div>
                        <label className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs font-medium block mb-2'}>
                          <i className="fas fa-wand-magic-sparkles text-pink-500 mr-1"></i>
                          Prompt para a IA (Flux 2.0)
                        </label>
                        <div className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700' : 'bg-gray-50 border-gray-200') + ' p-3 rounded-lg border text-xs leading-relaxed ' + (theme === 'dark' ? 'text-neutral-300' : 'text-gray-600')}>
                          {generateModelPrompt()}
                        </div>
                        <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] mt-1'}>
                          Este prompt será usado para gerar imagens de rosto, frente e costas
                        </p>
                      </div>

                      {/* Preview das características */}
                      <div className={(theme === 'dark' ? 'bg-gradient-to-r from-pink-500/10 to-orange-400/10 border-pink-500/20' : 'bg-gradient-to-r from-pink-50 to-orange-50 border-pink-200') + ' rounded-xl p-3 border'}>
                        <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px] font-medium uppercase tracking-wide mb-2'}>
                          <i className="fas fa-check-circle text-green-500 mr-1"></i>
                          Resumo do Modelo
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <span className={(theme === 'dark' ? 'bg-neutral-700 text-neutral-300' : 'bg-white text-gray-600') + ' px-2 py-0.5 rounded-full text-[10px]'}>{getModelLabel('gender', newModel.gender)}</span>
                          <span className={(theme === 'dark' ? 'bg-neutral-700 text-neutral-300' : 'bg-white text-gray-600') + ' px-2 py-0.5 rounded-full text-[10px]'}>{getModelLabel('ageRange', newModel.ageRange)}</span>
                          <span className={(theme === 'dark' ? 'bg-neutral-700 text-neutral-300' : 'bg-white text-gray-600') + ' px-2 py-0.5 rounded-full text-[10px]'}>{getModelLabel('ethnicity', newModel.ethnicity)}</span>
                          <span className={(theme === 'dark' ? 'bg-neutral-700 text-neutral-300' : 'bg-white text-gray-600') + ' px-2 py-0.5 rounded-full text-[10px]'}>{getModelLabel('skinTone', newModel.skinTone)}</span>
                          <span className={(theme === 'dark' ? 'bg-neutral-700 text-neutral-300' : 'bg-white text-gray-600') + ' px-2 py-0.5 rounded-full text-[10px]'}>{getModelLabel('bodyType', newModel.bodyType)}</span>
                          <span className={(theme === 'dark' ? 'bg-neutral-700 text-neutral-300' : 'bg-white text-gray-600') + ' px-2 py-0.5 rounded-full text-[10px]'}>{getModelLabel('height', newModel.height)}</span>
                          <span className={(theme === 'dark' ? 'bg-neutral-700 text-neutral-300' : 'bg-white text-gray-600') + ' px-2 py-0.5 rounded-full text-[10px]'}>{getModelLabel('hairColor', newModel.hairColor)} {getModelLabel('hairLength', newModel.hairLength)}</span>
                          <span className={(theme === 'dark' ? 'bg-neutral-700 text-neutral-300' : 'bg-white text-gray-600') + ' px-2 py-0.5 rounded-full text-[10px]'}>{getModelLabel('eyeColor', newModel.eyeColor)}</span>
                          {newModel.gender === 'woman' && (
                            <span className={(theme === 'dark' ? 'bg-neutral-700 text-neutral-300' : 'bg-white text-gray-600') + ' px-2 py-0.5 rounded-full text-[10px]'}>Busto {getModelLabel('bustSize', newModel.bustSize)}</span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={'p-4 border-t flex justify-between gap-2 ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-200')}>
              {/* Steps 1-4: Cancelar/Voltar + Próximo */}
              {modelWizardStep < 5 && (
                <>
                  <button
                    onClick={() => modelWizardStep > 1 ? setModelWizardStep((modelWizardStep - 1) as 1 | 2 | 3 | 4 | 5) : (setShowCreateModel(false), setEditingModel(null))}
                    className={(theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' px-4 py-2 text-sm font-medium transition-colors'}
                  >
                    {modelWizardStep === 1 ? 'Cancelar' : 'Voltar'}
                  </button>
                  <button
                    onClick={() => setModelWizardStep((modelWizardStep + 1) as 1 | 2 | 3 | 4 | 5)}
                    className="px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg text-sm font-medium"
                  >
                    Próximo
                  </button>
                </>
              )}

              {/* Step 5: Estados diferentes */}
              {modelWizardStep === 5 && (
                <>
                  {/* Gerando: só mostra loading */}
                  {generatingModelImages && (
                    <div className="flex-1 text-center">
                      <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-sm'}>
                        <i className="fas fa-spinner fa-spin mr-2"></i>Gerando imagens...
                      </span>
                    </div>
                  )}

                  {/* Sem preview: Voltar + Criar Modelo */}
                  {!generatingModelImages && !modelPreviewImages && (
                    <>
                      <button
                        onClick={() => setModelWizardStep(4)}
                        className={(theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' px-4 py-2 text-sm font-medium transition-colors'}
                      >
                        Voltar
                      </button>
                      <button
                        onClick={generateModelPreview}
                        disabled={!newModel.name.trim()}
                        className={'px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-opacity ' + (!newModel.name.trim() ? 'opacity-50 cursor-not-allowed' : '')}
                      >
                        <i className="fas fa-wand-magic-sparkles"></i>
                        Criar Modelo
                      </button>
                    </>
                  )}

                  {/* Com preview: Descartar + Gerar Outro + Criar + Salvar */}
                  {!generatingModelImages && modelPreviewImages && (
                    <>
                      <button
                        onClick={() => { setModelPreviewImages(null); setShowCreateModel(false); resetModelWizard(); }}
                        className={(theme === 'dark' ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-600') + ' px-2 py-2 text-sm font-medium transition-colors'}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                      <button
                        onClick={() => { setModelPreviewImages(null); generateModelPreview(); }}
                        className={(theme === 'dark' ? 'text-neutral-400 hover:text-white border-neutral-700' : 'text-gray-600 hover:text-gray-800 border-gray-300') + ' px-2 py-2 border rounded-lg text-sm font-medium transition-colors'}
                        title="Gerar Outro"
                      >
                        <i className="fas fa-redo"></i>
                      </button>

                      {/* Criar Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                          className={(theme === 'dark' ? 'text-neutral-400 hover:text-white border-neutral-700' : 'text-gray-600 hover:text-gray-800 border-gray-300') + ' px-3 py-2 border rounded-lg text-sm font-medium transition-colors flex items-center gap-1'}
                        >
                          <i className="fas fa-plus"></i>
                          Criar
                          <i className={'fas fa-chevron-' + (showCreateDropdown ? 'up' : 'down') + ' text-xs ml-1'}></i>
                        </button>
                        {showCreateDropdown && (
                          <div className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200') + ' absolute bottom-full mb-2 right-0 rounded-xl border shadow-lg overflow-hidden min-w-[180px] z-10'}>
                            <button
                              onClick={() => {
                                setShowCreateDropdown(false);
                                setShowCreateModel(false);
                                setCurrentPage('product-studio');
                                // TODO: Pass model to Studio Ready
                              }}
                              className={(theme === 'dark' ? 'hover:bg-neutral-700 text-white' : 'hover:bg-gray-50 text-gray-900') + ' w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors'}
                            >
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-400 flex items-center justify-center">
                                <i className="fas fa-camera text-white text-xs"></i>
                              </div>
                              <div>
                                <p className="font-medium">Studio Ready</p>
                                <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Foto profissional</p>
                              </div>
                            </button>
                            <button
                              onClick={() => {
                                setShowCreateDropdown(false);
                                setShowCreateModel(false);
                                setCurrentPage('lifestyle');
                                // TODO: Pass model to Cenário Criativo
                              }}
                              className={(theme === 'dark' ? 'hover:bg-neutral-700 text-white' : 'hover:bg-gray-50 text-gray-900') + ' w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors'}
                            >
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-400 flex items-center justify-center">
                                <i className="fas fa-mountain-sun text-white text-xs"></i>
                              </div>
                              <div>
                                <p className="font-medium">Cenário Criativo</p>
                                <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Com ambiente</p>
                              </div>
                            </button>
                            <button
                              onClick={() => {
                                setShowCreateDropdown(false);
                                setShowCreateModel(false);
                                setCurrentPage('look-composer');
                                // TODO: Pass model to Look Composer
                              }}
                              className={(theme === 'dark' ? 'hover:bg-neutral-700 text-white' : 'hover:bg-gray-50 text-gray-900') + ' w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors'}
                            >
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-orange-500 to-yellow-400 flex items-center justify-center">
                                <i className="fas fa-layer-group text-white text-xs"></i>
                              </div>
                              <div>
                                <p className="font-medium">Look Composer</p>
                                <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Montar look</p>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={saveModel}
                        disabled={savingModel}
                        className={'px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg text-sm font-medium flex items-center gap-2 ' + (savingModel ? 'opacity-70' : '')}
                      >
                        {savingModel ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                            Salvando...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-check"></i>
                            Salvar
                          </>
                        )}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODEL DETAIL MODAL */}
      {showModelDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setShowModelDetail(null)}>
          <div className={(theme === 'dark' ? 'bg-neutral-900/95 backdrop-blur-2xl border-neutral-800' : 'bg-white/95 backdrop-blur-2xl border-gray-200') + ' rounded-t-2xl md:rounded-2xl border w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col'} onClick={(e) => e.stopPropagation()}>
            {/* Drag handle - mobile */}
            <div className="md:hidden pt-3 pb-1 flex justify-center">
              <div className={(theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-300') + ' w-10 h-1 rounded-full'}></div>
            </div>
            {/* Header */}
            <div className={'p-4 border-b flex items-center justify-between ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-200')}>
              <h2 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold'}>{showModelDetail.name}</h2>
              <button onClick={() => setShowModelDetail(null)} className={(theme === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-600') + ' hidden md:block transition-colors'}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Images Grid */}
              {(showModelDetail.images.front || showModelDetail.images.back || showModelDetail.images.face) ? (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {['front', 'back', 'face'].map((type) => {
                    const imgUrl = showModelDetail.images[type as keyof typeof showModelDetail.images];
                    return (
                      <div key={type} className={'aspect-[3/4] rounded-xl overflow-hidden ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100')}>
                        {imgUrl ? (
                          <img src={imgUrl} alt={type} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-300') + ' fas fa-image text-2xl'}></i>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={'rounded-xl p-8 mb-4 text-center ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100')}>
                  <div className={'w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center ' + (showModelDetail.gender === 'woman' ? 'bg-gradient-to-br from-pink-400 to-rose-500' : 'bg-gradient-to-br from-blue-400 to-indigo-500')}>
                    <i className="fas fa-user text-3xl text-white"></i>
                  </div>
                  <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-sm'}>
                    {showModelDetail.status === 'generating' ? 'Gerando imagens...' : 'Nenhuma imagem gerada'}
                  </p>
                </div>
              )}
              {/* Características */}
              <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-50') + ' rounded-xl p-4'}>
                <h4 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>Características</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500')}>Gênero:</span>
                    <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium'}>{getModelLabel('gender', showModelDetail.gender)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500')}>Etnia:</span>
                    <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium'}>{getModelLabel('ethnicity', showModelDetail.ethnicity)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500')}>Pele:</span>
                    <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium'}>{getModelLabel('skinTone', showModelDetail.skinTone)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500')}>Corpo:</span>
                    <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium'}>{getModelLabel('bodyType', showModelDetail.bodyType)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500')}>Idade:</span>
                    <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium'}>{getModelLabel('ageRange', showModelDetail.ageRange)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500')}>Altura:</span>
                    <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium'}>{getModelLabel('height', showModelDetail.height)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500')}>Cabelo:</span>
                    <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium'}>{getModelLabel('hairColor', showModelDetail.hairColor)} - {getModelLabel('hairStyle', showModelDetail.hairStyle)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500')}>Olhos:</span>
                    <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium'}>{getModelLabel('eyeColor', showModelDetail.eyeColor)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500')}>Expressão:</span>
                    <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium'}>{getModelLabel('expression', showModelDetail.expression)}</span>
                  </div>
                  {showModelDetail.gender === 'woman' && showModelDetail.bustSize && (
                    <div className="flex justify-between">
                      <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500')}>Busto:</span>
                      <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium'}>{getModelLabel('bustSize', showModelDetail.bustSize)}</span>
                    </div>
                  )}
                  {showModelDetail.waistType && (
                    <div className="flex justify-between">
                      <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500')}>Cintura:</span>
                      <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium'}>{getModelLabel('waistType', showModelDetail.waistType)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Footer */}
            <div className={'p-4 border-t flex gap-2 ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-200')}>
              <button
                onClick={() => {
                  if (window.confirm('Tem certeza que deseja excluir este modelo?')) {
                    deleteModel(showModelDetail);
                    setShowModelDetail(null);
                  }
                }}
                className={(theme === 'dark' ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50') + ' px-4 py-2 rounded-lg text-sm font-medium transition-colors'}
              >
                <i className="fas fa-trash mr-2"></i>Excluir
              </button>
              <button
                onClick={() => {
                  // Carregar dados no wizard para edição
                  setNewModel({
                    name: showModelDetail.name,
                    gender: showModelDetail.gender,
                    ethnicity: showModelDetail.ethnicity,
                    skinTone: showModelDetail.skinTone,
                    bodyType: showModelDetail.bodyType,
                    ageRange: showModelDetail.ageRange,
                    height: showModelDetail.height,
                    hairColor: showModelDetail.hairColor,
                    hairStyle: showModelDetail.hairStyle,
                    hairLength: (showModelDetail as any).hairLength || 'medium',
                    eyeColor: showModelDetail.eyeColor,
                    expression: showModelDetail.expression,
                    bustSize: showModelDetail.bustSize || 'medium',
                    waistType: showModelDetail.waistType || 'medium',
                    referenceImage: showModelDetail.referenceImageUrl || null,
                    physicalNotes: (showModelDetail as any).physicalNotes || '',
                    hairNotes: (showModelDetail as any).hairNotes || '',
                    skinNotes: (showModelDetail as any).skinNotes || '',
                  });
                  setEditingModel(showModelDetail);
                  setModelWizardStep(1);
                  setShowModelDetail(null);
                  setShowCreateModel(true);
                }}
                className={(theme === 'dark' ? 'text-neutral-400 hover:bg-neutral-800' : 'text-gray-500 hover:bg-gray-100') + ' px-4 py-2 rounded-lg text-sm font-medium transition-colors'}
              >
                <i className="fas fa-edit mr-2"></i>Editar
              </button>
              <button
                onClick={() => setShowModelDetail(null)}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg text-sm font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Minimized Modals Floating Windows */}
      {minimizedModals.length > 0 && (
        <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2">
          {minimizedModals.map((modal) => (
            <div
              key={modal.id}
              className={(theme === 'dark' ? 'bg-neutral-900/95 backdrop-blur-xl border-neutral-700' : 'bg-white/95 backdrop-blur-xl border-gray-200') + ' rounded-xl border shadow-lg p-3 min-w-[200px] cursor-pointer hover:scale-105 transition-all animate-fade-in'}
              onClick={() => restoreModal(modal.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 flex items-center justify-center">
                    <i className={'fas ' + modal.icon + ' text-white text-xs'}></i>
                  </div>
                  <div>
                    <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium truncate max-w-[120px]'}>{modal.title}</p>
                    {modal.progress !== undefined && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1 bg-neutral-700 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-pink-500 to-orange-400 animate-pulse" style={{ width: '60%' }}></div>
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
          className="fixed bottom-6 right-6 z-50 cursor-pointer"
          onClick={() => setProductStudioMinimized(false)}
        >
          <div className="bg-gradient-to-r from-pink-500 to-orange-400 rounded-2xl p-4 shadow-2xl shadow-pink-500/20 flex items-center gap-4 min-w-[280px]">
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
          className="fixed bottom-6 right-6 z-50 cursor-pointer"
          onClick={() => setLookComposerMinimized(false)}
        >
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl p-4 shadow-2xl shadow-blue-500/20 flex items-center gap-4 min-w-[280px]">
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
          className="fixed bottom-6 right-6 z-50 cursor-pointer"
          onClick={() => setProvadorMinimized(false)}
        >
          <div className="bg-gradient-to-r from-pink-500 to-orange-400 rounded-2xl p-4 shadow-2xl shadow-pink-500/20 flex items-center gap-4 min-w-[280px]">
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
          <div className={`px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 ${
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
