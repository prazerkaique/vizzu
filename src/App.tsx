import React, { useState, useEffect, useRef } from 'react';
import { Studio } from './components/Studio';
import { LookComposer } from './components/Studio/LookComposer';
import { Product, User, HistoryLog, Client, ClientPhoto, Collection, WhatsAppTemplate, LookComposition } from './types';
import { useCredits, PLANS } from './hooks/useCredits';
import { supabase } from './services/supabaseClient';

const DEMO_PRODUCTS: Product[] = [
  {
    id: '1', sku: 'TSH-001', name: 'Camiseta Premium Algodão Preta',
    description: 'Camiseta 100% algodão premium na cor preta', category: 'Camisetas',
    brand: 'Vizzu Wear', color: 'Preto', fit: 'Regular',
    images: [{ name: 'camiseta-preta.jpg', base64: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNTAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHBhdGggZD0iTTEwMCAxMDAgTDE1MCA1MCBMMjUwIDUwIEwzMDAgMTAwIEwzMDAgMzUwIEwxMjUgMzUwIEwxMDAgMzUwIFoiIGZpbGw9IiMyMDIwMjAiLz48dGV4dCB4PSIyMDAiIHk9IjQ1MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2Ij5UU0gtMDAxPC90ZXh0Pjwvc3ZnPg==' }]
  },
  {
    id: '2', sku: 'TSH-002', name: 'Camiseta Estampada Summer Vibes', category: 'Camisetas',
    brand: 'Vizzu Wear', color: 'Azul', fit: 'Slim',
    images: [{ name: 'camiseta-estampada.jpg', base64: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNTAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHBhdGggZD0iTTEwMCAxMDAgTDE1MCA1MCBMMjUwIDUwIEwzMDAgMTAwIEwzMDAgMzUwIEwxMjUgMzUwIEwxMDAgMzUwIFoiIGZpbGw9IiMxODkyZDIiLz48Y2lyY2xlIGN4PSIyMDAiIGN5PSIyMDAiIHI9IjQwIiBmaWxsPSIjZmZkNzAwIi8+PHRleHQgeD0iMjAwIiB5PSI0NTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NiI+VFNILTAwMjwvdGV4dD48L3N2Zz4=' }]
  },
  {
    id: '3', sku: 'JNS-001', name: 'Calça Jeans Slim Fit Azul', category: 'Calças',
    brand: 'Denim Co', color: 'Azul', fit: 'Slim',
    images: [{ name: 'jeans-azul.jpg', base64: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNTAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHBhdGggZD0iTTEzMCA1MCBMMjcwIDUwIEwyODAgODAgTDI3NSA0MDAgTDIyMCA0MDAgTDIwMCAyNTAgTDE4MCA0MDAgTDEyNSA0MDAgTDEyMCA4MCBaIiBmaWxsPSIjMWQ0ZWQ4Ii8+PHRleHQgeD0iMjAwIiB5PSI0NTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NiI+Sk5TLTAwMTwvdGV4dD48L3N2Zz4=' }]
  },
  {
    id: '4', sku: 'SNK-001', name: 'Tênis Running Performance', category: 'Calçados',
    brand: 'SportMax', color: 'Preto', fit: 'Regular',
    images: [{ name: 'tenis-running.jpg', base64: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNTAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHBhdGggZD0iTTUwLDI5MCBDNTAsMjkwIDEwMCwyMzAgMTgwLDIzMCBDMjUwLDIzMCAzMDAsMjUwIDM1MCwyODAgTDM1MCwzMjAgQzM1MCwzMjAgMzAwLDM0MCAyMDAsMzQwIEMxNDUsMzQwIDUwLDMyMCA1MCwzMjAgWiIgZmlsbD0iIzIzMjMyMyIvPjxwYXRoIGQ9Ik01MCwzMTUgTDM1MCwzMTUgTDM1MCwzMzAgTDUwLDMzMCBaIiBmaWxsPSIjZmZmIi8+PHRleHQgeD0iMjAwIiB5PSI0NTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NiI+U05LLTAwMTwvdGV4dD48L3N2Zz4=' }]
  }
];

const CATEGORIES = ['Camisetas', 'Calças', 'Calçados', 'Acessórios', 'Vestidos', 'Shorts', 'Jaquetas'];
const COLLECTIONS = ['Verão 2025', 'Inverno 2025', 'Básicos', 'Premium', 'Promoção'];
const COLORS = ['Preto', 'Branco', 'Azul', 'Vermelho', 'Verde', 'Amarelo', 'Rosa', 'Cinza', 'Marrom', 'Bege'];
const FITS = ['Slim', 'Regular', 'Oversized', 'Skinny', 'Relaxed'];

const PHOTO_TYPES: { id: ClientPhoto['type']; label: string; icon: string }[] = [
  { id: 'frente', label: 'Frente', icon: 'fa-user' },
  { id: 'costas', label: 'Costas', icon: 'fa-user-slash' },
  { id: 'rosto', label: 'Rosto', icon: 'fa-face-smile' },
];

const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  { id: '1', name: 'Provador Virtual', message: 'Olá {nome}! 🛍️\n\nPreparei um visual especial para você! Veja como ficou.\n\nO que achou? 😍', isDefault: true },
  { id: '2', name: 'Look Completo', message: 'Oi {nome}! ✨\n\nMontei um look completo pensando em você!\n\nPosso reservar para você?', isDefault: false },
  { id: '3', name: 'Novidades', message: 'Oi {nome}! 👋\n\nTemos novidades que combinam com você! Olha só como ficou:\n\nGostou? Posso separar! 💜', isDefault: false },
];

type Page = 'dashboard' | 'studio' | 'provador' | 'products' | 'clients' | 'history' | 'settings';
type SettingsTab = 'profile' | 'company' | 'plan' | 'integrations';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('profile');
  const [showImport, setShowImport] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showProductDetail, setShowProductDetail] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  
  const [newProduct, setNewProduct] = useState({ name: '', brand: '', color: '', fit: '', category: '', collection: '' });
  
  const [clients, setClients] = useState<Client[]>([]);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showClientDetail, setShowClientDetail] = useState<Client | null>(null);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [newClient, setNewClient] = useState({ firstName: '', lastName: '', whatsapp: '', email: '', photos: [] as ClientPhoto[], notes: '' });
  const [uploadingPhotoType, setUploadingPhotoType] = useState<ClientPhoto['type'] | null>(null);
  
  const [provadorClient, setProvadorClient] = useState<Client | null>(null);
  const [provadorPhotoType, setProvadorPhotoType] = useState<ClientPhoto['type']>('frente');
  const [provadorLook, setProvadorLook] = useState<LookComposition>({});
  const [provadorMessage, setProvadorMessage] = useState(DEFAULT_WHATSAPP_TEMPLATES[0].message);
  const [provadorGeneratedImage, setProvadorGeneratedImage] = useState<string | null>(null);
  const [isGeneratingProvador, setIsGeneratingProvador] = useState(false);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate>(DEFAULT_WHATSAPP_TEMPLATES[0]);
  const [provadorStep, setProvadorStep] = useState<1 | 2 | 3 | 4>(1);
  const [provadorLookFilter, setProvadorLookFilter] = useState<string>('');
  const [provadorLookSearch, setProvadorLookSearch] = useState('');
  const [showStudioPicker, setShowStudioPicker] = useState(false);
  
  const [whatsappTemplates] = useState<WhatsAppTemplate[]>(DEFAULT_WHATSAPP_TEMPLATES);
  
  const clientPhotoInputRef = useRef<HTMLInputElement>(null);
  
  const { userCredits, currentPlan, deductCredits, upgradePlan, setCredits } = useCredits();

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });
  
  const filteredClients = clients.filter(client => {
    const fullName = (client.firstName + ' ' + client.lastName).toLowerCase();
    return fullName.includes(clientSearchTerm.toLowerCase()) || client.whatsapp.includes(clientSearchTerm) || (client.email && client.email.toLowerCase().includes(clientSearchTerm.toLowerCase()));
  });
  
  const clientsWithProvador = clients.filter(c => c.hasProvadorIA && (c.photos?.length || c.photo));

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ id: session.user.id, name: session.user.user_metadata?.full_name || 'Usuário', email: session.user.email || '', avatar: session.user.user_metadata?.avatar_url || '', plan: 'Free' });
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, name: session.user.user_metadata?.full_name || 'Usuário', email: session.user.email || '', avatar: session.user.user_metadata?.avatar_url || '', plan: 'Free' });
      } else {
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleUpdateProduct = (productId: string, updates: Partial<Product>) => { 
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...updates } : p)); 
  };
  
  const handleDeductCredits = (amount: number, reason: string): boolean => { 
    return deductCredits(amount, reason); 
  };
  
  const handleAddHistoryLog = (action: string, details: string, status: HistoryLog['status'], items: Product[], method: HistoryLog['method'], cost: number) => { 
    console.log('History:', { action, details, status, itemsCount: items.length, method, cost }); 
  };

  const handleFileSelect = (files: FileList) => {
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => { 
        setSelectedImage(reader.result as string); 
        setShowImport(false); 
        setShowCreateProduct(true); 
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateProduct = () => {
    if (!selectedImage || !newProduct.name || !newProduct.category) { 
      alert('Preencha pelo menos o nome e a categoria do produto'); 
      return; 
    }
    const product: Product = { 
      id: 'product-' + Date.now(), 
      sku: 'SKU-' + Date.now().toString().slice(-6), 
      name: newProduct.name, 
      brand: newProduct.brand, 
      color: newProduct.color, 
      fit: newProduct.fit, 
      category: newProduct.category, 
      collection: newProduct.collection, 
      images: [{ name: newProduct.name + '.jpg', base64: selectedImage }] 
    };
    setProducts(prev => [...prev, product]);
    setShowCreateProduct(false); 
    setSelectedImage(null); 
    setNewProduct({ name: '', brand: '', color: '', fit: '', category: '', collection: '' });
  };

  const handleClientPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingPhotoType) {
      const reader = new FileReader();
      reader.onload = () => {
        const newPhoto: ClientPhoto = { 
          type: uploadingPhotoType, 
          base64: reader.result as string, 
          createdAt: new Date().toISOString() 
        };
        setNewClient(prev => ({ 
          ...prev, 
          photos: [...prev.photos.filter(p => p.type !== uploadingPhotoType), newPhoto] 
        }));
        setUploadingPhotoType(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveClientPhoto = (type: ClientPhoto['type']) => { 
    setNewClient(prev => ({ ...prev, photos: prev.photos.filter(p => p.type !== type) })); 
  };

  const handleCreateClient = () => {
    if (!newClient.firstName || !newClient.lastName || !newClient.whatsapp) { 
      alert('Preencha nome, sobrenome e WhatsApp'); 
      return; 
    }
    const client: Client = { 
      id: 'client-' + Date.now(), 
      firstName: newClient.firstName, 
      lastName: newClient.lastName, 
      whatsapp: newClient.whatsapp.replace(/\D/g, ''), 
      email: newClient.email || undefined, 
      photos: newClient.photos.length > 0 ? newClient.photos : undefined, 
      photo: newClient.photos[0]?.base64, 
      hasProvadorIA: newClient.photos.length > 0, 
      notes: newClient.notes || undefined, 
      status: 'active', 
      createdAt: new Date().toISOString(), 
      totalOrders: 0 
    };
    setClients(prev => [...prev, client]);
    setShowCreateClient(false); 
    setNewClient({ firstName: '', lastName: '', whatsapp: '', email: '', photos: [], notes: '' });
  };

  const handleDeleteClient = (clientId: string) => { 
    if (confirm('Tem certeza que deseja excluir este cliente?')) { 
      setClients(prev => prev.filter(c => c.id !== clientId)); 
      setShowClientDetail(null); 
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

  const handleGoogleLogin = async () => { 
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } }); 
  };
  
  const handleDemoLogin = () => { 
    setUser({ id: 'demo-user', name: 'Usuário Demo', email: 'demo@vizzu.ai', avatar: '', plan: 'Free' }); 
    setCredits(50); 
  };
  
  const handleLogout = async () => { 
    await supabase.auth.signOut(); 
    setUser(null); 
  };

  const handleProvadorGenerate = async () => {
    if (!provadorClient) { alert('Selecione um cliente'); return; }
    const clientPhoto = getClientPhoto(provadorClient, provadorPhotoType);
    if (!clientPhoto) { alert('Cliente não possui foto do tipo selecionado'); return; }
    const lookItems = Object.values(provadorLook).filter(Boolean);
    if (lookItems.length === 0) { alert('Selecione pelo menos uma peça para o look'); return; }
    if (userCredits < 3) { alert('Créditos insuficientes'); return; }
    setIsGeneratingProvador(true);
    setTimeout(() => { 
      deductCredits(3, 'Vizzu Provador®'); 
      setProvadorGeneratedImage(clientPhoto); 
      setIsGeneratingProvador(false); 
    }, 3000);
  };
  
  const handleProvadorSendWhatsApp = () => { 
    if (!provadorClient) return; 
    const message = provadorMessage.replace('{nome}', provadorClient.firstName); 
    handleSendWhatsApp(provadorClient, message); 
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

  // ═══════════════════════════════════════════════════════════════
  // LOGIN SCREEN - SUNO STYLE
  // ═══════════════════════════════════════════════════════════════
  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="relative z-10 w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="Vizzu" className="h-14 mx-auto mb-3" />
            <p className="text-neutral-500 text-xs">AI Visual Studio para E-commerce</p>
          </div>
          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6">
            <h2 className="text-lg font-semibold text-white text-center mb-5">Bem-vindo!</h2>
            <div className="space-y-3">
              <button onClick={handleGoogleLogin} className="w-full py-3 bg-white text-neutral-900 rounded-xl font-medium text-sm flex items-center justify-center gap-3 hover:bg-neutral-100 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar com Google
              </button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-800"></div></div>
                <div className="relative flex justify-center text-xs"><span className="px-3 bg-neutral-900 text-neutral-600">ou</span></div>
              </div>
              <button onClick={handleDemoLogin} className="w-full py-3 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                <i className="fas fa-play text-xs"></i>Testar Gratuitamente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN LAYOUT - SUNO STYLE
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="h-screen flex flex-col md:flex-row bg-black">
      
      {/* DESKTOP SIDEBAR - SUNO STYLE */}
      <aside className="hidden md:flex w-52 bg-neutral-950 flex-col border-r border-neutral-900">
        <div className="p-5 border-b border-neutral-900 flex flex-col items-center">
          <img src="/logo.png" alt="Vizzu" className="h-10" />
          <span className="text-[9px] text-neutral-600 mt-1">Estúdio com IA para lojistas</span>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {[
            { id: 'dashboard' as Page, icon: 'fa-home', label: 'Dashboard' },
            { id: 'studio' as Page, icon: 'fa-wand-magic-sparkles', label: 'Vizzu Studio®' },
            { id: 'provador' as Page, icon: 'fa-user-tag', label: 'Vizzu Provador®' },
            { id: 'products' as Page, icon: 'fa-box', label: 'Produtos' },
            { id: 'clients' as Page, icon: 'fa-users', label: 'Clientes' },
            { id: 'history' as Page, icon: 'fa-clock-rotate-left', label: 'Histórico' },
          ].map(item => (
            <button 
              key={item.id} 
              onClick={() => setCurrentPage(item.id)} 
              className={'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ' + (currentPage === item.id ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white hover:bg-neutral-900')}
            >
              <i className={'fas ' + item.icon + ' w-4 text-[10px]'}></i>{item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-neutral-900 space-y-2">
          <div className="bg-neutral-900 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-medium text-neutral-500 uppercase tracking-wide">Créditos</span>
              <button onClick={() => { setCurrentPage('settings'); setSettingsTab('plan'); }} className="text-pink-400 hover:text-pink-300 text-[9px] font-medium">+ Add</button>
            </div>
            <p className="text-xl font-bold text-white">{userCredits.toLocaleString()}</p>
            <div className="mt-2 h-1 bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-pink-500 to-orange-400 rounded-full" style={{ width: Math.min(100, (userCredits / currentPlan.limit) * 100) + '%' }}></div>
            </div>
          </div>
          <button 
            onClick={() => setCurrentPage('settings')} 
            className={'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ' + (currentPage === 'settings' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white hover:bg-neutral-900')}
          >
            <i className="fas fa-cog w-4 text-[10px]"></i>Configurações
          </button>
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden">
              {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="" /> : <i className="fas fa-user text-neutral-500 text-xs"></i>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user.name}</p>
              <p className="text-[9px] text-neutral-600">{currentPlan.name}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-hidden flex flex-col pb-16 md:pb-0">

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* DASHBOARD - SUNO STYLE */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {currentPage === 'dashboard' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-pink-500/20 to-orange-400/20 border border-pink-500/30 flex items-center justify-center">
                  <i className="fas fa-home text-pink-400 text-sm"></i>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-semibold text-white">Dashboard</h1>
                    <span className="px-2 py-0.5 bg-pink-500/20 text-pink-400 text-[9px] font-medium rounded-full uppercase tracking-wide">{currentPlan.name}</span>
                  </div>
                  <p className="text-neutral-500 text-xs">Resumo do seu estúdio</p>
                </div>
              </div>
              
              {/* Banner Principal */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                {/* Seus Produtos */}
                <div className="bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-orange-500/10 rounded-xl p-4 border border-pink-500/20">
                  <p className="text-[10px] text-neutral-400 uppercase tracking-wide mb-1">Seus produtos</p>
                  <p className="text-3xl font-bold text-white">{products.length}</p>
                  <p className="text-[10px] text-neutral-500 mt-1">cadastrados no catálogo</p>
                </div>
                
                {/* Banner Funcionalidades */}
                <div className="md:col-span-2 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-orange-500/10 rounded-xl p-4 border border-pink-500/20 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-pink-500 text-white text-[8px] font-bold rounded-full uppercase">Novo</span>
                      <p className="text-xs font-medium text-white">Vizzu Provador® com IA</p>
                    </div>
                    <p className="text-[10px] text-neutral-400 leading-relaxed">Vista seus clientes virtualmente e envie looks personalizados direto pelo WhatsApp.</p>
                  </div>
                  <button onClick={() => setCurrentPage('provador')} className="ml-4 px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-xs hover:opacity-90 transition-opacity">
                    Experimentar
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 md:grid-cols-3 gap-3 mb-5">
                <div className="bg-neutral-900 rounded-xl p-3 border border-neutral-800">
                  <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center mb-2">
                    <i className="fas fa-users text-neutral-400 text-xs"></i>
                  </div>
                  <p className="text-xl font-bold text-white">{clients.length}</p>
                  <p className="text-[10px] text-neutral-500">Clientes</p>
                </div>
                <div className="bg-neutral-900 rounded-xl p-3 border border-neutral-800">
                  <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center mb-2">
                    <i className="fas fa-coins text-neutral-400 text-xs"></i>
                  </div>
                  <p className="text-xl font-bold text-white">{userCredits}</p>
                  <p className="text-[10px] text-neutral-500">Créditos</p>
                </div>
                <div className="bg-neutral-900 rounded-xl p-3 border border-pink-500/30">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-pink-500/20 to-orange-400/20 flex items-center justify-center mb-2">
                    <i className="fas fa-crown text-pink-400 text-xs"></i>
                  </div>
                  <p className="text-xl font-bold text-white">{currentPlan.name}</p>
                  <p className="text-[10px] text-neutral-500">Plano</p>
                </div>
              </div>
              
              {/* Quick Actions */}
              <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Ações Rápidas</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button onClick={() => setCurrentPage('studio')} className="bg-neutral-900 rounded-xl p-4 border border-neutral-800 hover:border-neutral-700 transition-all text-left group">
                  <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center mb-3 group-hover:bg-neutral-700 transition-colors">
                    <i className="fas fa-wand-magic-sparkles text-neutral-400 text-sm"></i>
                  </div>
                  <h3 className="font-medium text-white text-sm mb-0.5">Vizzu Studio®</h3>
                  <p className="text-xs text-neutral-500">Gerar imagens com IA</p>
                </button>
                <button onClick={() => setCurrentPage('provador')} className="bg-neutral-900 rounded-xl p-4 border border-pink-500/30 hover:border-pink-500/50 transition-all text-left group">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-pink-500/20 to-orange-400/20 flex items-center justify-center mb-3 group-hover:from-pink-500/30 group-hover:to-orange-400/30 transition-colors">
                    <i className="fas fa-user-tag text-pink-400 text-sm"></i>
                  </div>
                  <h3 className="font-medium text-white text-sm mb-0.5">Vizzu Provador®</h3>
                  <p className="text-xs text-neutral-500">Vista seus clientes</p>
                </button>
                <button onClick={() => { setCurrentPage('settings'); setSettingsTab('plan'); }} className="bg-neutral-900 rounded-xl p-4 border border-neutral-800 hover:border-neutral-700 transition-all text-left group">
                  <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center mb-3 group-hover:bg-neutral-700 transition-colors">
                    <i className="fas fa-bolt text-neutral-400 text-sm"></i>
                  </div>
                  <h3 className="font-medium text-white text-sm mb-0.5">Comprar Créditos</h3>
                  <p className="text-xs text-neutral-500">Upgrade de plano</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* STUDIO */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {currentPage === 'studio' && (
          <Studio 
            products={products} 
            userCredits={userCredits} 
            onUpdateProduct={handleUpdateProduct} 
            onDeductCredits={handleDeductCredits} 
            onAddHistoryLog={handleAddHistoryLog} 
            onOpenSettings={() => { setCurrentPage('settings'); setSettingsTab('plan'); }} 
            onImport={() => setShowImport(true)} 
            currentPlan={currentPlan} 
          />
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* PROVADOR - SUNO STYLE */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {currentPage === 'provador' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
              
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-pink-500/20 to-orange-400/20 border border-pink-500/30 flex items-center justify-center">
                    <i className="fas fa-user-tag text-pink-400 text-sm"></i>
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-white">Vizzu Provador®</h1>
                    <p className="text-neutral-500 text-xs hidden md:block">Vista seus clientes virtualmente</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-neutral-900 border border-neutral-800 text-neutral-400 text-[10px] font-medium rounded-lg">3 créd.</span>
                  {(provadorClient || Object.keys(provadorLook).length > 0) && (
                    <button onClick={handleProvadorReset} className="p-2 bg-neutral-900 border border-neutral-800 text-neutral-400 rounded-lg text-xs hover:bg-neutral-800 hover:text-white transition-colors">
                      <i className="fas fa-undo"></i>
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile Progress */}
              <div className="lg:hidden mb-4">
                <div className="flex items-center justify-between mb-2">
                  {[1, 2, 3, 4].map(step => {
                    const isCompleted = (step === 1 && provadorClient) || 
                                       (step === 2 && provadorClient && provadorPhotoType) || 
                                       (step === 3 && Object.keys(provadorLook).length > 0) ||
                                       (step === 4 && provadorGeneratedImage);
                    const isCurrent = provadorStep === step;
                    return (
                      <div key={step} className="flex items-center">
                        <div 
                          onClick={() => setProvadorStep(step as 1|2|3|4)}
                          className={'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer transition-all ' + 
                            (isCompleted ? 'bg-green-500 text-white' : 
                             isCurrent ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white scale-110' : 
                             'bg-neutral-800 text-neutral-500')}
                        >
                          {isCompleted ? <i className="fas fa-check text-[8px]"></i> : step}
                        </div>
                        {step < 4 && (
                          <div className={'h-0.5 w-8 mx-1 rounded-full ' + (isCompleted ? 'bg-green-500' : 'bg-neutral-800')}></div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-neutral-500 text-center">
                  {provadorStep === 1 && 'Selecione o cliente'}
                  {provadorStep === 2 && 'Escolha a foto'}
                  {provadorStep === 3 && 'Monte o look'}
                  {provadorStep === 4 && 'Gere e envie'}
                </p>
              </div>
              
              {/* Desktop Grid */}
              <div className="hidden lg:grid lg:grid-cols-4 gap-4">
                
                {/* Col 1: Cliente */}
                <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden">
                  <div className="p-3 border-b border-neutral-800">
                    <h3 className="font-medium text-white text-xs flex items-center gap-2">
                      <span className={'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ' + (provadorClient ? 'bg-green-500 text-white' : 'bg-neutral-800 text-neutral-400')}>
                        {provadorClient ? <i className="fas fa-check text-[8px]"></i> : '1'}
                      </span>
                      Selecionar Cliente
                    </h3>
                  </div>
                  <div className="p-3">
                    {provadorClient ? (
                      <div className="text-center">
                        <div className="relative inline-block mb-2">
                          <img src={getClientPhoto(provadorClient, provadorPhotoType) || getClientPhoto(provadorClient)} alt={provadorClient.firstName} className="w-16 h-16 rounded-full object-cover border-2 border-pink-500/50" />
                          <button onClick={() => { setProvadorClient(null); setProvadorStep(1); }} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[9px] hover:bg-red-600">
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                        <p className="font-medium text-white text-xs">{provadorClient.firstName} {provadorClient.lastName}</p>
                        <p className="text-[10px] text-neutral-500">{formatWhatsApp(provadorClient.whatsapp)}</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {clientsWithProvador.length > 0 ? clientsWithProvador.slice(0, 5).map(client => (
                          <div key={client.id} onClick={() => setProvadorClient(client)} className="flex items-center gap-2 p-2 rounded-lg border border-neutral-800 hover:border-pink-500/50 hover:bg-neutral-800 cursor-pointer transition-all">
                            <img src={getClientPhoto(client)} alt="" className="w-8 h-8 rounded-full object-cover" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs text-white truncate">{client.firstName} {client.lastName}</p>
                              <p className="text-[9px] text-neutral-500">{client.photos?.length || 1} foto(s)</p>
                            </div>
                          </div>
                        )) : (
                          <div className="text-center py-4">
                            <i className="fas fa-user-plus text-neutral-700 text-lg mb-2"></i>
                            <p className="text-[10px] text-neutral-500">Nenhum cliente</p>
                            <button onClick={() => setCurrentPage('clients')} className="mt-2 px-3 py-1 bg-neutral-800 text-white rounded-lg text-[10px] font-medium hover:bg-neutral-700">Cadastrar</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Col 2: Foto */}
                <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden">
                  <div className="p-3 border-b border-neutral-800">
                    <h3 className="font-medium text-white text-xs flex items-center gap-2">
                      <span className={'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ' + (provadorClient && provadorPhotoType ? 'bg-green-500 text-white' : 'bg-neutral-800 text-neutral-400')}>
                        {provadorClient && provadorPhotoType ? <i className="fas fa-check text-[8px]"></i> : '2'}
                      </span>
                      Selecionar Foto
                    </h3>
                  </div>
                  <div className="p-3">
                    {provadorClient ? (
                      <div className="space-y-1.5">
                        {PHOTO_TYPES.map(photoType => {
                          const hasPhoto = provadorClient.photos?.some(p => p.type === photoType.id) || (photoType.id === 'frente' && provadorClient.photo);
                          const photoSrc = provadorClient.photos?.find(p => p.type === photoType.id)?.base64 || (photoType.id === 'frente' ? provadorClient.photo : undefined);
                          return (
                            <div key={photoType.id} onClick={() => hasPhoto && setProvadorPhotoType(photoType.id)} 
                              className={'flex items-center gap-2 p-2 rounded-lg border transition-all ' + (!hasPhoto ? 'border-neutral-800 opacity-50 cursor-not-allowed' : provadorPhotoType === photoType.id ? 'border-pink-500 bg-pink-500/10 cursor-pointer' : 'border-neutral-800 hover:border-neutral-700 cursor-pointer')}>
                              {hasPhoto && photoSrc ? <img src={photoSrc} alt="" className="w-8 h-8 rounded-lg object-cover" /> : <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center"><i className={'fas ' + photoType.icon + ' text-neutral-600 text-[10px]'}></i></div>}
                              <div className="flex-1">
                                <p className="font-medium text-xs text-white">{photoType.label}</p>
                                <p className="text-[9px] text-neutral-500">{hasPhoto ? 'Disponível' : 'Não cadastrada'}</p>
                              </div>
                              {hasPhoto && provadorPhotoType === photoType.id && <i className="fas fa-check text-pink-400 text-xs"></i>}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-neutral-600">
                        <i className="fas fa-image text-lg mb-2"></i>
                        <p className="text-[10px]">Selecione um cliente</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Col 3: Look */}
                <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden">
                  <div className="p-3 border-b border-neutral-800">
                    <h3 className="font-medium text-white text-xs flex items-center gap-2">
                      <span className={'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ' + (Object.keys(provadorLook).length > 0 ? 'bg-green-500 text-white' : 'bg-neutral-800 text-neutral-400')}>
                        {Object.keys(provadorLook).length > 0 ? <i className="fas fa-check text-[8px]"></i> : '3'}
                      </span>
                      Look
                      {Object.keys(provadorLook).length > 0 && <span className="ml-auto text-[9px] text-pink-400 bg-pink-500/20 px-1.5 py-0.5 rounded-full">{Object.keys(provadorLook).length}</span>}
                    </h3>
                  </div>
                  <div className="p-2">
                    <select value={provadorLookFilter} onChange={(e) => setProvadorLookFilter(e.target.value)} className="w-full px-2 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-[10px] text-white mb-2">
                      <option value="">Todas coleções</option>
                      {COLLECTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="max-h-[240px] overflow-y-auto">
                      <LookComposer products={provadorLookFilter ? products.filter(p => p.collection === provadorLookFilter) : products} composition={provadorLook} onChange={setProvadorLook} />
                    </div>
                  </div>
                </div>

                {/* Col 4: Gerar */}
                <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden">
                  <div className="p-3 border-b border-neutral-800">
                    <h3 className="font-medium text-white text-xs flex items-center gap-2">
                      <span className={'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ' + (provadorGeneratedImage ? 'bg-green-500 text-white' : 'bg-neutral-800 text-neutral-400')}>
                        {provadorGeneratedImage ? <i className="fas fa-check text-[8px]"></i> : '4'}
                      </span>
                      Gerar e Enviar
                    </h3>
                  </div>
                  <div className="p-3">
                    <div className="aspect-[3/4] bg-neutral-800 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                      {isGeneratingProvador ? (
                        <div className="text-center"><div className="w-8 h-8 border-2 border-neutral-600 border-t-pink-500 rounded-full animate-spin mx-auto mb-2"></div><p className="text-[10px] text-neutral-500">Gerando...</p></div>
                      ) : provadorGeneratedImage ? (
                        <img src={provadorGeneratedImage} alt="Gerado" className="w-full h-full object-cover" />
                      ) : provadorClient && getClientPhoto(provadorClient, provadorPhotoType) ? (
                        <div className="relative w-full h-full"><img src={getClientPhoto(provadorClient, provadorPhotoType)} alt="Preview" className="w-full h-full object-cover opacity-30" /><div className="absolute inset-0 flex items-center justify-center"><div className="text-center"><i className="fas fa-wand-magic-sparkles text-pink-400 text-lg mb-1"></i><p className="text-[10px] text-neutral-400">Clique em Gerar</p></div></div></div>
                      ) : (
                        <div className="text-center p-4"><i className="fas fa-image text-neutral-700 text-2xl mb-2"></i><p className="text-[10px] text-neutral-600">Preview</p></div>
                      )}
                    </div>
                    <select value={selectedTemplate.id} onChange={(e) => { const t = whatsappTemplates.find(x => x.id === e.target.value); if (t) { setSelectedTemplate(t); setProvadorMessage(t.message); } }} className="w-full px-2 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-[10px] text-white mb-2">
                      {whatsappTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <textarea value={provadorMessage} onChange={(e) => setProvadorMessage(e.target.value)} rows={2} className="w-full px-2 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-[10px] text-white resize-none mb-3" placeholder="Mensagem..." />
                    <div className="space-y-2">
                      <button onClick={handleProvadorGenerate} disabled={!provadorClient || Object.keys(provadorLook).length === 0 || isGeneratingProvador || userCredits < 3} className="w-full py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
                        {isGeneratingProvador ? <><i className="fas fa-spinner fa-spin text-[10px]"></i>Gerando...</> : <><i className="fas fa-wand-magic-sparkles text-[10px]"></i>Gerar (3 créd.)</>}
                      </button>
                      <button onClick={handleProvadorSendWhatsApp} disabled={!provadorClient || !provadorGeneratedImage} className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-green-400 border border-neutral-700 rounded-lg font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors">
                        <i className="fab fa-whatsapp text-[10px]"></i>Enviar WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Accordion */}
              <div className="lg:hidden space-y-2">
                
                {/* Step 1 */}
                <div className={'bg-neutral-900 rounded-xl border overflow-hidden transition-all ' + (provadorStep === 1 ? 'border-pink-500' : provadorClient ? 'border-green-500/50' : 'border-neutral-800')}>
                  <div onClick={() => setProvadorStep(1)} className="p-3 flex items-center gap-3 cursor-pointer">
                    <div className={'w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ' + (provadorClient ? 'bg-green-500 text-white' : provadorStep === 1 ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white' : 'bg-neutral-800 text-neutral-500')}>
                      {provadorClient ? <i className="fas fa-check text-[10px]"></i> : '1'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white text-sm">Selecionar Cliente</p>
                      {provadorClient && provadorStep !== 1 && <p className="text-[10px] text-green-400">{provadorClient.firstName} {provadorClient.lastName}</p>}
                    </div>
                    <i className={'fas text-neutral-500 text-xs ' + (provadorStep === 1 ? 'fa-chevron-up' : 'fa-chevron-down')}></i>
                  </div>
                  {provadorStep === 1 && (
                    <div className="px-3 pb-3 border-t border-neutral-800">
                      {clientsWithProvador.length > 0 ? (
                        <div className="space-y-2 mt-3 max-h-56 overflow-y-auto">
                          {clientsWithProvador.map(client => (
                            <div key={client.id} onClick={() => { setProvadorClient(client); setProvadorStep(2); }} className={'flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ' + (provadorClient?.id === client.id ? 'border-pink-500 bg-pink-500/10' : 'border-neutral-800 hover:border-neutral-700')}>
                              <img src={getClientPhoto(client)} alt="" className="w-10 h-10 rounded-full object-cover" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-white text-sm">{client.firstName} {client.lastName}</p>
                                <p className="text-[10px] text-neutral-500">{formatWhatsApp(client.whatsapp)}</p>
                              </div>
                              {provadorClient?.id === client.id && <i className="fas fa-check text-pink-400 text-xs"></i>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                            <i className="fas fa-user-plus text-neutral-600 text-lg"></i>
                          </div>
                          <p className="text-xs text-neutral-500 mb-3">Nenhum cliente com foto</p>
                          <button onClick={() => setCurrentPage('clients')} className="px-4 py-2 bg-neutral-800 text-white rounded-lg text-xs font-medium hover:bg-neutral-700">Cadastrar Cliente</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Step 2 */}
                <div className={'bg-neutral-900 rounded-xl border overflow-hidden transition-all ' + (provadorStep === 2 ? 'border-pink-500' : (provadorClient && provadorPhotoType) ? 'border-green-500/50' : 'border-neutral-800')}>
                  <div onClick={() => provadorClient && setProvadorStep(2)} className={'p-3 flex items-center gap-3 ' + (provadorClient ? 'cursor-pointer' : 'opacity-50')}>
                    <div className={'w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ' + ((provadorClient && provadorPhotoType) ? 'bg-green-500 text-white' : provadorStep === 2 ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white' : 'bg-neutral-800 text-neutral-500')}>
                      {(provadorClient && provadorPhotoType) ? <i className="fas fa-check text-[10px]"></i> : '2'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white text-sm">Selecionar Foto</p>
                      {provadorPhotoType && provadorStep !== 2 && <p className="text-[10px] text-green-400">Foto: {PHOTO_TYPES.find(p => p.id === provadorPhotoType)?.label}</p>}
                    </div>
                    <i className={'fas text-neutral-500 text-xs ' + (provadorStep === 2 ? 'fa-chevron-up' : 'fa-chevron-down')}></i>
                  </div>
                  {provadorStep === 2 && provadorClient && (
                    <div className="px-3 pb-3 border-t border-neutral-800">
                      <div className="space-y-2 mt-3">
                        {PHOTO_TYPES.map(photoType => {
                          const hasPhoto = provadorClient.photos?.some(p => p.type === photoType.id) || (photoType.id === 'frente' && provadorClient.photo);
                          const photoSrc = provadorClient.photos?.find(p => p.type === photoType.id)?.base64 || (photoType.id === 'frente' ? provadorClient.photo : undefined);
                          return (
                            <div key={photoType.id} onClick={() => { if (hasPhoto) { setProvadorPhotoType(photoType.id); setProvadorStep(3); } }} 
                              className={'flex items-center gap-3 p-2.5 rounded-lg border transition-all ' + (!hasPhoto ? 'border-neutral-800 opacity-50' : provadorPhotoType === photoType.id ? 'border-pink-500 bg-pink-500/10 cursor-pointer' : 'border-neutral-800 hover:border-neutral-700 cursor-pointer')}>
                              {hasPhoto && photoSrc ? <img src={photoSrc} alt="" className="w-12 h-12 rounded-lg object-cover" /> : <div className="w-12 h-12 rounded-lg bg-neutral-800 flex items-center justify-center"><i className={'fas ' + photoType.icon + ' text-neutral-600'}></i></div>}
                              <div className="flex-1">
                                <p className="font-medium text-white text-sm">{photoType.label}</p>
                                <p className="text-[10px] text-neutral-500">{hasPhoto ? 'Toque para selecionar' : 'Não cadastrada'}</p>
                              </div>
                              {hasPhoto && provadorPhotoType === photoType.id && <div className="w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center"><i className="fas fa-check text-white text-[8px]"></i></div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 3 */}
                <div className={'bg-neutral-900 rounded-xl border overflow-hidden transition-all ' + (provadorStep === 3 ? 'border-pink-500' : Object.keys(provadorLook).length > 0 ? 'border-green-500/50' : 'border-neutral-800')}>
                  <div onClick={() => provadorClient && setProvadorStep(3)} className={'p-3 flex items-center gap-3 ' + (provadorClient ? 'cursor-pointer' : 'opacity-50')}>
                    <div className={'w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ' + (Object.keys(provadorLook).length > 0 ? 'bg-green-500 text-white' : provadorStep === 3 ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white' : 'bg-neutral-800 text-neutral-500')}>
                      {Object.keys(provadorLook).length > 0 ? <i className="fas fa-check text-[10px]"></i> : '3'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white text-sm">Composição do Look</p>
                      {Object.keys(provadorLook).length > 0 && provadorStep !== 3 && <p className="text-[10px] text-green-400">{Object.keys(provadorLook).length} peça(s)</p>}
                    </div>
                    {Object.keys(provadorLook).length > 0 && <span className="px-2 py-0.5 bg-pink-500/20 text-pink-400 text-[10px] font-medium rounded-full">{Object.keys(provadorLook).length}</span>}
                    <i className={'fas text-neutral-500 text-xs ' + (provadorStep === 3 ? 'fa-chevron-up' : 'fa-chevron-down')}></i>
                  </div>
                  {provadorStep === 3 && (
                    <div className="px-3 pb-3 border-t border-neutral-800">
                      <div className="flex gap-2 mt-3 mb-3">
                        <div className="relative flex-1">
                          <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-600 text-[10px]"></i>
                          <input type="text" placeholder="Buscar produto..." value={provadorLookSearch} onChange={(e) => setProvadorLookSearch(e.target.value)} className="w-full pl-7 pr-2 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-white" />
                        </div>
                        <select value={provadorLookFilter} onChange={(e) => setProvadorLookFilter(e.target.value)} className="px-2 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-white">
                          <option value="">Todas</option>
                          {COLLECTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        <LookComposer 
                          products={products.filter(p => {
                            const matchesSearch = !provadorLookSearch || p.name.toLowerCase().includes(provadorLookSearch.toLowerCase()) || p.sku.toLowerCase().includes(provadorLookSearch.toLowerCase());
                            const matchesCollection = !provadorLookFilter || p.collection === provadorLookFilter;
                            return matchesSearch && matchesCollection;
                          })} 
                          composition={provadorLook} 
                          onChange={setProvadorLook} 
                        />
                      </div>
                      {Object.keys(provadorLook).length > 0 && (
                        <button onClick={() => setProvadorStep(4)} className="w-full mt-3 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-colors">
                          Continuar <i className="fas fa-arrow-right text-[10px]"></i>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Step 4 */}
                <div className={'bg-neutral-900 rounded-xl border overflow-hidden transition-all ' + (provadorStep === 4 ? 'border-pink-500' : provadorGeneratedImage ? 'border-green-500/50' : 'border-neutral-800')}>
                  <div onClick={() => (provadorClient && Object.keys(provadorLook).length > 0) && setProvadorStep(4)} className={'p-3 flex items-center gap-3 ' + ((provadorClient && Object.keys(provadorLook).length > 0) ? 'cursor-pointer' : 'opacity-50')}>
                    <div className={'w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ' + (provadorGeneratedImage ? 'bg-green-500 text-white' : provadorStep === 4 ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white' : 'bg-neutral-800 text-neutral-500')}>
                      {provadorGeneratedImage ? <i className="fas fa-check text-[10px]"></i> : '4'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white text-sm">Gerar e Enviar</p>
                      {provadorGeneratedImage && provadorStep !== 4 && <p className="text-[10px] text-green-400">Imagem gerada!</p>}
                    </div>
                    <i className={'fas text-neutral-500 text-xs ' + (provadorStep === 4 ? 'fa-chevron-up' : 'fa-chevron-down')}></i>
                  </div>
                  {provadorStep === 4 && (
                    <div className="px-3 pb-3 border-t border-neutral-800">
                      <div className="aspect-square bg-neutral-800 rounded-lg mt-3 mb-3 flex items-center justify-center overflow-hidden">
                        {isGeneratingProvador ? (
                          <div className="text-center">
                            <div className="w-10 h-10 border-2 border-neutral-600 border-t-pink-500 rounded-full animate-spin mx-auto mb-2"></div>
                            <p className="text-xs text-neutral-500">Gerando imagem...</p>
                          </div>
                        ) : provadorGeneratedImage ? (
                          <img src={provadorGeneratedImage} alt="Gerado" className="w-full h-full object-cover" />
                        ) : provadorClient && getClientPhoto(provadorClient, provadorPhotoType) ? (
                          <div className="relative w-full h-full">
                            <img src={getClientPhoto(provadorClient, provadorPhotoType)} alt="Preview" className="w-full h-full object-cover opacity-30" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-center">
                                <i className="fas fa-wand-magic-sparkles text-pink-400 text-2xl mb-2"></i>
                                <p className="text-neutral-400 text-xs">Pronto para gerar!</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center p-4">
                            <i className="fas fa-image text-neutral-700 text-3xl mb-2"></i>
                            <p className="text-xs text-neutral-600">Preview</p>
                          </div>
                        )}
                      </div>
                      <div className="mb-3">
                        <label className="text-[9px] font-medium text-neutral-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                          <i className="fab fa-whatsapp text-green-500"></i>Mensagem
                        </label>
                        <select value={selectedTemplate.id} onChange={(e) => { const t = whatsappTemplates.find(x => x.id === e.target.value); if (t) { setSelectedTemplate(t); setProvadorMessage(t.message); } }} className="w-full px-2.5 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-white mb-2">
                          {whatsappTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <textarea value={provadorMessage} onChange={(e) => setProvadorMessage(e.target.value)} rows={3} className="w-full px-2.5 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-white resize-none" placeholder="Mensagem personalizada..." />
                      </div>
                      <div className="space-y-2">
                        <button onClick={handleProvadorGenerate} disabled={!provadorClient || Object.keys(provadorLook).length === 0 || isGeneratingProvador || userCredits < 3} className="w-full py-3 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                          {isGeneratingProvador ? <><i className="fas fa-spinner fa-spin text-sm"></i>Gerando...</> : <><i className="fas fa-wand-magic-sparkles text-sm"></i>Gerar Imagem (3 créd.)</>}
                        </button>
                        <button onClick={handleProvadorSendWhatsApp} disabled={!provadorClient || !provadorGeneratedImage} className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-green-400 border border-neutral-700 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors">
                          <i className="fab fa-whatsapp text-lg"></i>Enviar pelo WhatsApp
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* PRODUCTS - SUNO STYLE */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {currentPage === 'products' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-pink-500/20 to-orange-400/20 border border-pink-500/30 flex items-center justify-center">
                    <i className="fas fa-box text-pink-400 text-sm"></i>
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-white">Produtos</h1>
                    <p className="text-neutral-500 text-xs">Gerencie seu catálogo</p>
                  </div>
                </div>
                <button onClick={() => setShowImport(true)} className="px-3 py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-xs">
                  <i className="fas fa-plus mr-1.5"></i>Novo
                </button>
              </div>
              
              {/* Filters */}
              <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-3 mb-4">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <div className="flex-shrink-0 w-44">
                    <div className="relative">
                      <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-600 text-[10px]"></i>
                      <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-7 pr-2 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-white" />
                    </div>
                  </div>
                  <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="flex-shrink-0 px-2.5 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-white">
                    <option value="">Categoria</option>
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <p className="text-[10px] text-neutral-600 mt-2">{filteredProducts.length} de {products.length} produtos</p>
              </div>
              
              {/* Grid */}
              <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden">
                {filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 p-3">
                    {filteredProducts.map(product => (
                      <div key={product.id} onClick={() => setShowProductDetail(product)} className="bg-neutral-800 rounded-lg overflow-hidden cursor-pointer hover:bg-neutral-700 transition-colors group">
                        <div className="aspect-square bg-neutral-700 relative overflow-hidden">
                          <img src={product.images[0]?.base64 || product.images[0]?.url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        </div>
                        <div className="p-2">
                          <p className="text-[8px] font-medium text-neutral-500 uppercase tracking-wide">{product.sku}</p>
                          <p className="text-[10px] font-medium text-white truncate">{product.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <div className="w-14 h-14 rounded-full bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                      <i className="fas fa-search text-neutral-600 text-xl"></i>
                    </div>
                    <h3 className="text-sm font-medium text-white mb-1">Nenhum produto</h3>
                    <button onClick={() => setShowImport(true)} className="mt-3 px-4 py-2 bg-neutral-800 text-white rounded-lg font-medium text-xs hover:bg-neutral-700">
                      <i className="fas fa-plus mr-1.5"></i>Adicionar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CLIENTS - SUNO STYLE */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {currentPage === 'clients' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-pink-500/20 to-orange-400/20 border border-pink-500/30 flex items-center justify-center">
                    <i className="fas fa-users text-pink-400 text-sm"></i>
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-white">Clientes</h1>
                    <p className="text-neutral-500 text-xs">Gerencie seus clientes</p>
                  </div>
                </div>
                <button onClick={() => setShowCreateClient(true)} className="px-3 py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-xs">
                  <i className="fas fa-plus mr-1.5"></i>Novo
                </button>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                <div className="bg-neutral-900 rounded-xl p-3 border border-neutral-800">
                  <p className="text-xl font-bold text-white">{clients.length}</p>
                  <p className="text-[10px] text-neutral-500">Total</p>
                </div>
                <div className="bg-neutral-900 rounded-xl p-3 border border-neutral-800">
                  <p className="text-xl font-bold text-white">{clients.filter(c => c.status === 'active').length}</p>
                  <p className="text-[10px] text-neutral-500">Ativos</p>
                </div>
                <div className="bg-neutral-900 rounded-xl p-3 border border-neutral-800">
                  <p className="text-xl font-bold text-white">{clientsWithProvador.length}</p>
                  <p className="text-[10px] text-neutral-500">Provador IA</p>
                </div>
                <div className="bg-neutral-900 rounded-xl p-3 border border-neutral-800">
                  <p className="text-xl font-bold text-white">{clients.filter(c => c.status === 'vip').length}</p>
                  <p className="text-[10px] text-neutral-500">VIP</p>
                </div>
              </div>
              
              {/* Search */}
              {clients.length > 0 && (
                <div className="mb-4">
                  <div className="relative">
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 text-xs"></i>
                    <input type="text" placeholder="Buscar por nome, WhatsApp ou e-mail..." value={clientSearchTerm} onChange={(e) => setClientSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white" />
                  </div>
                </div>
              )}
              
              {/* List */}
              {clients.length === 0 ? (
                <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                    <i className="fas fa-users text-neutral-600 text-xl"></i>
                  </div>
                  <h3 className="text-sm font-medium text-white mb-1">Nenhum cliente cadastrado</h3>
                  <p className="text-neutral-500 text-xs mb-4">Adicione clientes para usar o Vizzu Provador®</p>
                  <button onClick={() => setShowCreateClient(true)} className="px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-xs">
                    <i className="fas fa-plus mr-1.5"></i>Adicionar Cliente
                  </button>
                </div>
              ) : (
                <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden">
                  <div className="divide-y divide-neutral-800">
                    {filteredClients.map(client => (
                      <div key={client.id} className="p-3 hover:bg-neutral-800/50 transition-colors cursor-pointer" onClick={() => setShowClientDetail(client)}>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {getClientPhoto(client) ? (
                              <img src={getClientPhoto(client)} alt={client.firstName} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
                                <span className="text-sm font-medium text-neutral-400">{client.firstName[0]}{client.lastName[0]}</span>
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
                              <h3 className="font-medium text-white text-sm truncate">{client.firstName} {client.lastName}</h3>
                              {client.photos && client.photos.length > 1 && (
                                <span className="text-[8px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded-full">{client.photos.length} fotos</span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-500">{formatWhatsApp(client.whatsapp)}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {client.hasProvadorIA && (
                              <button onClick={(e) => { e.stopPropagation(); setProvadorClient(client); setCurrentPage('provador'); }} className="w-8 h-8 rounded-lg bg-neutral-800 text-pink-400 flex items-center justify-center hover:bg-neutral-700 transition-colors" title="Vizzu Provador®">
                                <i className="fas fa-wand-magic-sparkles text-xs"></i>
                              </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); handleSendWhatsApp(client, 'Olá ' + client.firstName + '!'); }} className="w-8 h-8 rounded-lg bg-neutral-800 text-green-400 flex items-center justify-center hover:bg-neutral-700 transition-colors" title="WhatsApp">
                              <i className="fab fa-whatsapp text-sm"></i>
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

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* HISTORY - SUNO STYLE */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {currentPage === 'history' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-pink-500/20 to-orange-400/20 border border-pink-500/30 flex items-center justify-center">
                  <i className="fas fa-clock-rotate-left text-pink-400 text-sm"></i>
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white">Histórico</h1>
                  <p className="text-neutral-500 text-xs">Suas atividades</p>
                </div>
              </div>
              <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-clock-rotate-left text-neutral-600 text-xl"></i>
                </div>
                <h3 className="text-sm font-medium text-white mb-1">Nenhuma atividade</h3>
                <p className="text-neutral-500 text-xs">As atividades aparecerão aqui</p>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SETTINGS - SUNO STYLE */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {currentPage === 'settings' && (
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col md:flex-row h-full">
              {/* Sidebar */}
              <div className="md:w-56 bg-neutral-950 border-b md:border-b-0 md:border-r border-neutral-900 p-2 md:p-3">
                <nav className="flex md:flex-col gap-0.5 overflow-x-auto">
                  {[
                    { id: 'profile' as SettingsTab, icon: 'fa-user', label: 'Perfil' },
                    { id: 'company' as SettingsTab, icon: 'fa-building', label: 'Empresa' },
                    { id: 'plan' as SettingsTab, icon: 'fa-credit-card', label: 'Plano' },
                    { id: 'integrations' as SettingsTab, icon: 'fa-plug', label: 'Integrações' },
                  ].map(item => (
                    <button key={item.id} onClick={() => setSettingsTab(item.id)} className={'flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ' + (settingsTab === item.id ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white hover:bg-neutral-900')}>
                      <i className={'fas ' + item.icon + ' w-3.5 text-[10px]'}></i>{item.label}
                    </button>
                  ))}
                  <button onClick={handleLogout} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 md:mt-4 md:pt-3 md:border-t md:border-neutral-800">
                    <i className="fas fa-sign-out-alt w-3.5 text-[10px]"></i>Sair
                  </button>
                </nav>
              </div>
              
              {/* Content */}
              <div className="flex-1 p-4 md:p-6 overflow-y-auto">
                <div className="max-w-xl">
                  
                  {/* Plan Tab */}
                  {settingsTab === 'plan' && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Plano & Créditos</h3>
                      <div className="bg-neutral-900 border border-pink-500/30 rounded-xl p-4 mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-wide">Plano Atual</p>
                            <p className="text-xl font-bold text-white">{currentPlan.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-neutral-500 uppercase tracking-wide">Créditos</p>
                            <p className="text-xl font-bold text-white">{userCredits}</p>
                          </div>
                        </div>
                        <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-pink-500 to-orange-400 rounded-full" style={{ width: Math.min(100, (userCredits / currentPlan.limit) * 100) + '%' }}></div>
                        </div>
                      </div>
                      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-4">
                        <h4 className="font-medium text-white text-sm mb-3">Escolha seu Plano</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {PLANS.map(plan => (
                            <div key={plan.id} onClick={() => upgradePlan(plan.id)} className={'p-3 rounded-lg border cursor-pointer transition-all ' + (currentPlan.id === plan.id ? 'border-pink-500 bg-pink-500/10' : 'border-neutral-800 hover:border-neutral-700')}>
                              <h5 className="font-medium text-white text-xs">{plan.name}</h5>
                              <p className="text-lg font-bold text-white my-1">{plan.limit}</p>
                              <p className="text-[10px] text-neutral-500">créd./mês</p>
                              <p className="text-[10px] font-medium text-pink-400 mt-1">{plan.price}</p>
                              {currentPlan.id === plan.id && <span className="inline-block mt-2 text-[8px] font-medium text-pink-400 bg-pink-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wide">ATUAL</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Profile Tab */}
                  {settingsTab === 'profile' && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Perfil</h3>
                      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-4">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="w-14 h-14 rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden">
                            {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="" /> : <i className="fas fa-user text-neutral-500 text-lg"></i>}
                          </div>
                          <button className="px-3 py-1.5 bg-neutral-800 text-white rounded-lg text-[10px] font-medium hover:bg-neutral-700 transition-colors">Alterar Foto</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-1.5">Nome</label>
                            <input type="text" defaultValue={user.name} className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-1.5">Email</label>
                            <input type="email" defaultValue={user.email} className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-500" disabled />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Company Tab */}
                  {settingsTab === 'company' && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Empresa</h3>
                      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-4">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-1.5">Nome da Empresa</label>
                            <input type="text" className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white" placeholder="Sua Empresa Ltda" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-1.5">CNPJ</label>
                            <input type="text" className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white" placeholder="00.000.000/0000-00" />
                          </div>
                          <button className="px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-xs hover:opacity-90 transition-opacity">Salvar</button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Integrations Tab */}
                  {settingsTab === 'integrations' && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Integrações</h3>
                      <div className="space-y-2">
                        {[
                          { icon: 'fab fa-shopify', name: 'Shopify', desc: 'Sincronize produtos' },
                          { icon: 'fab fa-wordpress', name: 'WooCommerce', desc: 'Loja WordPress' },
                          { icon: 'fas fa-store', name: 'VTEX', desc: 'VTEX IO' },
                        ].map(item => (
                          <div key={item.name} className="bg-neutral-900 rounded-xl border border-neutral-800 p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-neutral-800 flex items-center justify-center">
                                <i className={item.icon + ' text-neutral-400 text-sm'}></i>
                              </div>
                              <div>
                                <h4 className="font-medium text-white text-xs">{item.name}</h4>
                                <p className="text-[10px] text-neutral-500">{item.desc}</p>
                              </div>
                            </div>
                            <button className="px-3 py-1.5 bg-neutral-800 text-white rounded-lg font-medium hover:bg-neutral-700 text-[10px] transition-colors">Conectar</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MOBILE BOTTOM NAVIGATION - SUNO STYLE */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-neutral-950 border-t border-neutral-900 px-2 py-1.5 z-40">
        <div className="flex items-center justify-around">
          <button onClick={() => setCurrentPage('dashboard')} className={'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ' + (currentPage === 'dashboard' ? 'text-white' : 'text-neutral-600')}>
            <i className="fas fa-home text-sm"></i>
            <span className="text-[9px] font-medium">Home</span>
          </button>
          <button onClick={() => setCurrentPage('products')} className={'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ' + (currentPage === 'products' ? 'text-white' : 'text-neutral-600')}>
            <i className="fas fa-box text-sm"></i>
            <span className="text-[9px] font-medium">Produtos</span>
          </button>
          
          {/* Central Button */}
          <button onClick={() => setShowStudioPicker(true)} className="relative -mt-5">
            <div className={'w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-all ' + ((currentPage === 'studio' || currentPage === 'provador') ? 'bg-gradient-to-br from-pink-500 to-orange-400 scale-110' : 'bg-gradient-to-br from-pink-500/80 to-orange-400/80')}>
              <i className="fas fa-wand-magic-sparkles text-white text-lg"></i>
            </div>
            <span className={'block text-[9px] font-medium mt-0.5 text-center ' + ((currentPage === 'studio' || currentPage === 'provador') ? 'text-white' : 'text-neutral-500')}>Criar</span>
          </button>
          
          <button onClick={() => setCurrentPage('clients')} className={'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ' + (currentPage === 'clients' ? 'text-white' : 'text-neutral-600')}>
            <i className="fas fa-users text-sm"></i>
            <span className="text-[9px] font-medium">Clientes</span>
          </button>
          <button onClick={() => setCurrentPage('settings')} className={'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ' + (currentPage === 'settings' ? 'text-white' : 'text-neutral-600')}>
            <i className="fas fa-cog text-sm"></i>
            <span className="text-[9px] font-medium">Config</span>
          </button>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* STUDIO PICKER MODAL - SUNO STYLE */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showStudioPicker && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowStudioPicker(false)}>
          <div className="bg-neutral-900 rounded-t-2xl w-full p-5 pb-8 border-t border-neutral-800" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-neutral-700 rounded-full mx-auto mb-5"></div>
            <h3 className="text-lg font-semibold text-white text-center mb-1">O que você quer criar?</h3>
            <p className="text-xs text-neutral-500 text-center mb-5">Escolha uma das opções</p>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => { setShowStudioPicker(false); setCurrentPage('studio'); }}
                className="bg-neutral-800 border border-neutral-700 rounded-xl p-4 text-left hover:border-neutral-600 transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-neutral-700 flex items-center justify-center mb-3 group-hover:bg-neutral-600 transition-colors">
                  <i className="fas fa-wand-magic-sparkles text-neutral-300 text-sm"></i>
                </div>
                <h4 className="font-medium text-white text-sm mb-0.5">Vizzu Studio®</h4>
                <p className="text-[10px] text-neutral-500 leading-relaxed">Gere fotos profissionais com IA</p>
              </button>
              
              <button 
                onClick={() => { setShowStudioPicker(false); setCurrentPage('provador'); }}
                className="bg-neutral-800 border border-pink-500/30 rounded-xl p-4 text-left hover:border-pink-500/50 transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-r from-pink-500/20 to-orange-400/20 flex items-center justify-center mb-3 group-hover:from-pink-500/30 group-hover:to-orange-400/30 transition-colors">
                  <i className="fas fa-user-tag text-pink-400 text-sm"></i>
                </div>
                <h4 className="font-medium text-white text-sm mb-0.5">Vizzu Provador®</h4>
                <p className="text-[10px] text-neutral-500 leading-relaxed">Vista seus clientes virtualmente</p>
              </button>
            </div>
            
            <button onClick={() => setShowStudioPicker(false)} className="w-full mt-5 py-2.5 text-neutral-500 font-medium text-xs hover:text-white transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CREATE CLIENT MODAL - SUNO STYLE */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showCreateClient && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-neutral-900 rounded-t-2xl md:rounded-2xl border border-neutral-800 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 px-4 py-3 flex items-center justify-between z-10">
              <h3 className="text-sm font-medium text-white">Novo Cliente</h3>
              <button onClick={() => { setShowCreateClient(false); setNewClient({ firstName: '', lastName: '', whatsapp: '', email: '', photos: [], notes: '' }); }} className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors">
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Photo Upload */}
              <div>
                <label className="text-[9px] font-medium text-neutral-500 uppercase tracking-wide mb-2 block">
                  <i className="fas fa-camera text-pink-400 mr-1"></i>Fotos para Provador IA
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PHOTO_TYPES.map(photoType => {
                    const existingPhoto = newClient.photos.find(p => p.type === photoType.id);
                    return (
                      <div key={photoType.id} className="text-center">
                        <div 
                          onClick={() => { if (existingPhoto) return; setUploadingPhotoType(photoType.id); clientPhotoInputRef.current?.click(); }} 
                          className={'relative aspect-square rounded-lg overflow-hidden border border-dashed transition-all cursor-pointer ' + (existingPhoto ? 'border-pink-500/50 bg-pink-500/10' : 'border-neutral-700 hover:border-pink-500/50 hover:bg-neutral-800')}
                        >
                          {existingPhoto ? (
                            <>
                              <img src={existingPhoto.base64} alt={photoType.label} className="w-full h-full object-cover" />
                              <button onClick={(e) => { e.stopPropagation(); handleRemoveClientPhoto(photoType.id); }} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[9px] hover:bg-red-600">
                                <i className="fas fa-times"></i>
                              </button>
                              <div className="absolute bottom-0 left-0 right-0 bg-pink-500 text-white text-[8px] py-0.5 font-medium">
                                <i className="fas fa-check mr-0.5"></i>{photoType.label}
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-neutral-600">
                              <i className={'fas ' + photoType.icon + ' text-lg mb-1'}></i>
                              <span className="text-[9px] font-medium">{photoType.label}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <input ref={clientPhotoInputRef} type="file" accept="image/*" capture="user" onChange={handleClientPhotoUpload} className="hidden" />
                {newClient.photos.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1.5 bg-pink-500/10 text-pink-400 rounded-lg">
                    <i className="fas fa-check text-[10px]"></i>
                    <span className="text-[10px] font-medium">Provador IA ativado - {newClient.photos.length} foto(s)</span>
                  </div>
                )}
              </div>
              
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-medium text-neutral-500 uppercase tracking-wide mb-1 block">Nome *</label>
                  <input type="text" value={newClient.firstName} onChange={(e) => setNewClient(prev => ({ ...prev, firstName: e.target.value }))} placeholder="Maria" className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white" />
                </div>
                <div>
                  <label className="text-[9px] font-medium text-neutral-500 uppercase tracking-wide mb-1 block">Sobrenome *</label>
                  <input type="text" value={newClient.lastName} onChange={(e) => setNewClient(prev => ({ ...prev, lastName: e.target.value }))} placeholder="Silva" className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white" />
                </div>
              </div>
              
              {/* WhatsApp */}
              <div>
                <label className="text-[9px] font-medium text-neutral-500 uppercase tracking-wide mb-1 block">WhatsApp *</label>
                <div className="relative">
                  <i className="fab fa-whatsapp absolute left-3 top-1/2 -translate-y-1/2 text-green-500 text-sm"></i>
                  <input type="tel" value={newClient.whatsapp} onChange={(e) => setNewClient(prev => ({ ...prev, whatsapp: e.target.value }))} placeholder="(11) 99999-9999" className="w-full pl-9 pr-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white" />
                </div>
              </div>
              
              {/* Email */}
              <div>
                <label className="text-[9px] font-medium text-neutral-500 uppercase tracking-wide mb-1 block">E-mail (opcional)</label>
                <div className="relative">
                  <i className="fas fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 text-xs"></i>
                  <input type="email" value={newClient.email} onChange={(e) => setNewClient(prev => ({ ...prev, email: e.target.value }))} placeholder="maria@email.com" className="w-full pl-9 pr-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white" />
                </div>
              </div>
              
              {/* Notes */}
              <div>
                <label className="text-[9px] font-medium text-neutral-500 uppercase tracking-wide mb-1 block">Observações (opcional)</label>
                <textarea value={newClient.notes} onChange={(e) => setNewClient(prev => ({ ...prev, notes: e.target.value }))} placeholder="Preferências, tamanhos, etc..." rows={2} className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white resize-none" />
              </div>
              
              {/* Submit */}
              <button onClick={handleCreateClient} disabled={!newClient.firstName || !newClient.lastName || !newClient.whatsapp} className="w-full py-3 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                <i className="fas fa-user-plus mr-2"></i>Cadastrar Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CLIENT DETAIL MODAL - SUNO STYLE */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showClientDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-neutral-900 rounded-t-2xl md:rounded-2xl border border-neutral-800 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="bg-neutral-800 px-4 py-5 text-center relative border-b border-neutral-700">
              <button onClick={() => setShowClientDetail(null)} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors">
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
              <div className="grid grid-cols-2 gap-2 pt-2">
                {showClientDetail.hasProvadorIA && (
                  <button onClick={() => { setProvadorClient(showClientDetail); setShowClientDetail(null); setCurrentPage('provador'); }} className="col-span-2 py-2.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-xs flex items-center justify-center gap-2">
                    <i className="fas fa-wand-magic-sparkles text-[10px]"></i>Vizzu Provador®
                  </button>
                )}
                <button onClick={() => handleSendWhatsApp(showClientDetail, 'Olá ' + showClientDetail.firstName + '!')} className="py-2.5 bg-neutral-800 hover:bg-neutral-700 text-green-400 border border-neutral-700 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-colors">
                  <i className="fab fa-whatsapp text-sm"></i>WhatsApp
                </button>
                <button onClick={() => handleDeleteClient(showClientDetail.id)} className="py-2.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-colors">
                  <i className="fas fa-trash text-[10px]"></i>Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CLIENT PICKER MODAL - SUNO STYLE */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showClientPicker && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-neutral-900 rounded-t-2xl md:rounded-2xl border border-neutral-800 w-full max-w-sm max-h-[80vh] overflow-hidden">
            <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">Selecionar Cliente</h3>
              <button onClick={() => setShowClientPicker(false)} className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white">
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
            <div className="p-4">
              <input type="text" placeholder="Buscar cliente..." value={clientSearchTerm} onChange={(e) => setClientSearchTerm(e.target.value)} className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white mb-3" />
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {clientsWithProvador.filter(c => (c.firstName + ' ' + c.lastName).toLowerCase().includes(clientSearchTerm.toLowerCase())).map(client => (
                  <div key={client.id} onClick={() => { setProvadorClient(client); setShowClientPicker(false); }} className={'flex items-center gap-3 p-2.5 rounded-lg cursor-pointer border transition-all ' + (provadorClient?.id === client.id ? 'border-pink-500 bg-pink-500/10' : 'border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800')}>
                    <img src={getClientPhoto(client)} alt={client.firstName} className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex-1">
                      <p className="font-medium text-white text-sm">{client.firstName} {client.lastName}</p>
                      <p className="text-[10px] text-neutral-500">{client.photos?.length || 1} foto(s)</p>
                    </div>
                    {provadorClient?.id === client.id && (
                      <div className="w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center">
                        <i className="fas fa-check text-white text-[8px]"></i>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* IMPORT MODAL - SUNO STYLE */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showImport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-neutral-900 rounded-t-2xl md:rounded-2xl border border-neutral-800 w-full max-w-sm p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white">Adicionar Produto</h3>
              <button onClick={() => setShowImport(false)} className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white">
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
            <p className="text-neutral-500 text-xs mb-4">Escolha como adicionar a imagem:</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <label className="flex flex-col items-center gap-2 p-4 border border-dashed border-neutral-700 rounded-xl hover:border-pink-500/50 hover:bg-neutral-800 transition-all cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && handleFileSelect(e.target.files)} />
                <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
                  <i className="fas fa-images text-neutral-400 text-sm"></i>
                </div>
                <span className="text-[10px] font-medium text-neutral-300">Galeria</span>
              </label>
              <label className="flex flex-col items-center gap-2 p-4 border border-dashed border-neutral-700 rounded-xl hover:border-pink-500/50 hover:bg-neutral-800 transition-all cursor-pointer">
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files && handleFileSelect(e.target.files)} />
                <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
                  <i className="fas fa-camera text-neutral-400 text-sm"></i>
                </div>
                <span className="text-[10px] font-medium text-neutral-300">Câmera</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CREATE PRODUCT MODAL - SUNO STYLE */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showCreateProduct && selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-neutral-900 rounded-t-2xl md:rounded-2xl border border-neutral-800 w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white">Criar Produto</h3>
              <button onClick={() => { setShowCreateProduct(false); setSelectedImage(null); }} className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white">
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
            <div className="mb-4">
              <div className="w-20 h-20 rounded-lg overflow-hidden border border-neutral-700 mx-auto">
                <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-medium text-neutral-500 uppercase tracking-wide mb-1">Nome do Produto *</label>
                <input type="text" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white" placeholder="Ex: Camiseta Básica Branca" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-medium text-neutral-500 uppercase tracking-wide mb-1">Marca</label>
                  <input type="text" value={newProduct.brand} onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})} className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white" placeholder="Ex: Nike" />
                </div>
                <div>
                  <label className="block text-[9px] font-medium text-neutral-500 uppercase tracking-wide mb-1">Cor</label>
                  <select value={newProduct.color} onChange={(e) => setNewProduct({...newProduct, color: e.target.value})} className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white">
                    <option value="">Selecione</option>
                    {COLORS.map(color => <option key={color} value={color}>{color}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-medium text-neutral-500 uppercase tracking-wide mb-1">Caimento</label>
                  <select value={newProduct.fit} onChange={(e) => setNewProduct({...newProduct, fit: e.target.value})} className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white">
                    <option value="">Selecione</option>
                    {FITS.map(fit => <option key={fit} value={fit}>{fit}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-medium text-neutral-500 uppercase tracking-wide mb-1">Categoria *</label>
                  <select value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})} className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white">
                    <option value="">Selecione</option>
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleCreateProduct} className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity">
                <i className="fas fa-check mr-1.5"></i>Criar Produto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PRODUCT DETAIL MODAL - SUNO STYLE */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showProductDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-neutral-900 rounded-t-2xl md:rounded-2xl border border-neutral-800 w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white">Detalhes do Produto</h3>
              <button onClick={() => setShowProductDetail(null)} className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white">
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-40 h-40 rounded-xl overflow-hidden border border-neutral-700 flex-shrink-0">
                <img src={showProductDetail.images[0]?.base64 || showProductDetail.images[0]?.url} alt={showProductDetail.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <p className="text-[9px] font-medium text-neutral-500 uppercase tracking-wide mb-0.5">{showProductDetail.sku}</p>
                <h4 className="text-base font-semibold text-white mb-3">{showProductDetail.name}</h4>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {showProductDetail.brand && (
                    <div className="bg-neutral-800 rounded-lg p-2">
                      <p className="text-[8px] text-neutral-500 uppercase tracking-wide mb-0.5">Marca</p>
                      <p className="text-[10px] font-medium text-white">{showProductDetail.brand}</p>
                    </div>
                  )}
                  {showProductDetail.category && (
                    <div className="bg-neutral-800 rounded-lg p-2">
                      <p className="text-[8px] text-neutral-500 uppercase tracking-wide mb-0.5">Categoria</p>
                      <p className="text-[10px] font-medium text-white">{showProductDetail.category}</p>
                    </div>
                  )}
                  {showProductDetail.color && (
                    <div className="bg-neutral-800 rounded-lg p-2">
                      <p className="text-[8px] text-neutral-500 uppercase tracking-wide mb-0.5">Cor</p>
                      <p className="text-[10px] font-medium text-white">{showProductDetail.color}</p>
                    </div>
                  )}
                  {showProductDetail.fit && (
                    <div className="bg-neutral-800 rounded-lg p-2">
                      <p className="text-[8px] text-neutral-500 uppercase tracking-wide mb-0.5">Caimento</p>
                      <p className="text-[10px] font-medium text-white">{showProductDetail.fit}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-2 mt-4 pt-4 border-t border-neutral-800">
              <button onClick={() => { setShowProductDetail(null); setCurrentPage('studio'); }} className="flex-1 py-2.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-xs">
                <i className="fas fa-wand-magic-sparkles mr-1.5"></i>Abrir no Studio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
