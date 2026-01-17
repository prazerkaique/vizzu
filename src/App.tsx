import React, { useState, useEffect, useRef } from 'react';
import { Studio } from './components/Studio';
import { LookComposer } from './components/Studio/LookComposer';
import { AuthPage } from './components/AuthPage';
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
type SettingsTab = 'profile' | 'appearance' | 'company' | 'plan' | 'integrations';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
  const [showVideoTutorial, setShowVideoTutorial] = useState<'studio' | 'provador' | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  
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

  // Check for existing Supabase session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ 
          id: session.user.id, 
          name: session.user.user_metadata?.full_name || 'Usuário', 
          email: session.user.email || '', 
          avatar: session.user.user_metadata?.avatar_url || '', 
          plan: 'Free' 
        });
        setIsAuthenticated(true);
      }
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ 
          id: session.user.id, 
          name: session.user.user_metadata?.full_name || 'Usuário', 
          email: session.user.email || '', 
          avatar: session.user.user_metadata?.avatar_url || '', 
          plan: 'Free' 
        });
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
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

  const handleLogout = async () => { 
    await supabase.auth.signOut(); 
    setUser(null);
    setIsAuthenticated(false);
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
  // AUTH CHECK - Show AuthPage if not authenticated
  // ═══════════════════════════════════════════════════════════════
  if (!isAuthenticated) {
    return (
      <AuthPage 
        onLogin={(userData) => {
          setUser({
            id: userData.id || '1',
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
    <div className={'h-screen flex flex-col md:flex-row ' + (theme === 'dark' ? 'bg-black' : 'bg-gray-50')}>
      
      {/* DESKTOP SIDEBAR */}
      <aside className={'hidden md:flex w-52 flex-col border-r ' + (theme === 'dark' ? 'bg-neutral-950 border-neutral-900' : 'bg-gradient-to-b from-pink-500 via-fuchsia-500 to-violet-500 border-violet-600')}>
        <div className={'p-5 border-b flex flex-col items-center ' + (theme === 'dark' ? 'border-neutral-900' : 'border-white/20')}>
          <img src="/logo.png" alt="Vizzu" className="h-10" />
          <span className={'text-[9px] mt-1 ' + (theme === 'dark' ? 'text-neutral-600' : 'text-white/70')}>Estúdio com IA para lojistas</span>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {[
            { id: 'dashboard' as Page, icon: 'fa-home', label: 'Dashboard' },
            { id: 'studio' as Page, icon: 'fa-wand-magic-sparkles', label: 'Vizzu Studio®' },
            { id: 'provador' as Page, icon: 'fa-shirt', label: 'Vizzu Provador®' },
            { id: 'products' as Page, icon: 'fa-box', label: 'Produtos' },
            { id: 'clients' as Page, icon: 'fa-users', label: 'Clientes' },
            { id: 'history' as Page, icon: 'fa-clock-rotate-left', label: 'Histórico' },
          ].map(item => (
            <button 
              key={item.id} 
              onClick={() => setCurrentPage(item.id)} 
              className={'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ' + 
                (currentPage === item.id 
                  ? (theme === 'dark' ? 'bg-gradient-to-r from-pink-500/20 to-orange-400/20 text-white' : 'bg-white/25 text-white') 
                  : (theme === 'dark' ? 'text-neutral-500 hover:text-white hover:bg-neutral-900' : 'text-white/90 hover:text-white hover:bg-white/15')
                )
              }
            >
              <i className={'fas ' + item.icon + ' w-4 text-[10px]'}></i>{item.label}
            </button>
          ))}
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
          <button 
            onClick={() => setCurrentPage('settings')} 
            className={'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ' + 
              (currentPage === 'settings' 
                ? (theme === 'dark' ? 'bg-neutral-800 text-white' : 'bg-white/25 text-white') 
                : (theme === 'dark' ? 'text-neutral-500 hover:text-white hover:bg-neutral-900' : 'text-white/90 hover:text-white hover:bg-white/15')
              )
            }
          >
            <i className="fas fa-cog w-4 text-[10px]"></i>Configurações
          </button>
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
      <main className="flex-1 overflow-hidden flex flex-col pb-16 md:pb-0">

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* DASHBOARD */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {currentPage === 'dashboard' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className={'w-10 h-10 rounded-xl flex items-center justify-center ' + (theme === 'dark' ? 'bg-gradient-to-r from-pink-500/20 to-orange-400/20 border border-pink-500/30' : 'bg-gradient-to-r from-pink-500 to-orange-400 shadow-lg shadow-pink-500/25')}>
                  <i className={'fas fa-home text-sm ' + (theme === 'dark' ? 'text-pink-400' : 'text-white')}></i>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className={'text-xl font-bold ' + (theme === 'dark' ? 'text-white' : 'text-gray-900')}>Dashboard</h1>
                    <span className={'px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wide ' + (theme === 'dark' ? 'bg-pink-500/20 text-pink-400' : 'bg-gradient-to-r from-pink-500 to-orange-400 text-white')}>{currentPlan.name}</span>
                  </div>
                  <p className={theme === 'dark' ? 'text-neutral-500 text-sm' : 'text-gray-500 text-sm'}>Resumo do seu estúdio de imagens AI</p>
                </div>
              </div>
              
              {/* CARD CRIAR */}
              <style>{`
                @keyframes gradient-shift {
                  0% { background-position: 0% 50%; }
                  50% { background-position: 100% 50%; }
                  100% { background-position: 0% 50%; }
                }
                .animated-gradient-btn {
                  background-size: 200% 200%;
                  transition: all 0.3s ease;
                }
                .animated-gradient-btn:hover {
                  animation: gradient-shift 3s ease infinite;
                  transform: translateY(-2px);
                  box-shadow: 0 10px 40px -10px rgba(236, 72, 153, 0.5);
                }
                .video-card {
                  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .video-card:hover {
                  transform: translateY(-4px);
                }
                .video-card:hover .video-overlay {
                  opacity: 0.4;
                }
                .video-card:hover .play-btn {
                  transform: scale(1.1);
                  box-shadow: 0 0 30px rgba(255,255,255,0.3);
                }
              `}</style>
              
              <div className={'rounded-2xl p-5 mb-5 ' + (theme === 'dark' ? 'bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 border border-neutral-800' : 'bg-white shadow-xl shadow-gray-200/50 border border-gray-100')}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-r from-pink-500 to-orange-400">
                      <i className="fas fa-wand-magic-sparkles text-white text-xs"></i>
                    </div>
                    <h2 className={'text-base font-bold uppercase tracking-wide ' + (theme === 'dark' ? 'text-white' : 'text-gray-900')}>Criar</h2>
                  </div>
                  <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-xs'}>
                    <i className="fas fa-play-circle mr-1"></i>Clique para ver tutorial
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Vizzu Studio Card */}
                  <div 
                    onClick={() => setShowVideoTutorial('studio')}
                    className={'video-card group relative overflow-hidden rounded-xl cursor-pointer ' + (theme === 'dark' ? 'bg-neutral-800 border border-neutral-700' : 'bg-gray-100 border-2 border-gray-200')}
                    style={{ aspectRatio: '16/9', minHeight: '180px' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600"></div>
                    <div className="video-overlay absolute inset-0 bg-black/50 transition-opacity duration-300"></div>
                    <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 bg-purple-500 text-white text-[9px] font-bold rounded-full uppercase">IA</span>
                          <span className="text-white/60 text-xs">1-3 créditos</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1">Vizzu Studio®</h3>
                        <p className="text-white/70 text-sm">Gere fotos profissionais com IA</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="play-btn w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 border border-white/30">
                          <i className="fas fa-play text-white ml-1"></i>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setCurrentPage('studio'); }}
                          className="animated-gradient-btn px-4 py-2 bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 text-white text-sm font-bold rounded-lg flex items-center gap-2"
                        >
                          Acessar <i className="fas fa-arrow-right text-xs"></i>
                        </button>
                      </div>
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
                  </div>
                  
                  {/* Vizzu Provador Card */}
                  <div 
                    onClick={() => setShowVideoTutorial('provador')}
                    className={'video-card group relative overflow-hidden rounded-xl cursor-pointer ' + (theme === 'dark' ? 'bg-neutral-800 border border-neutral-700' : 'bg-gray-100 border-2 border-gray-200')}
                    style={{ aspectRatio: '16/9', minHeight: '180px' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500"></div>
                    <div className="video-overlay absolute inset-0 bg-black/50 transition-opacity duration-300"></div>
                    <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white text-[9px] font-bold rounded-full uppercase">Novo</span>
                          <span className="text-white/60 text-xs">3 créditos</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1">Vizzu Provador®</h3>
                        <p className="text-white/70 text-sm">Vista seus clientes virtualmente</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="play-btn w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 border border-white/30">
                          <i className="fas fa-play text-white ml-1"></i>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setCurrentPage('provador'); }}
                          className="animated-gradient-btn px-4 py-2 bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 text-white text-sm font-bold rounded-lg flex items-center gap-2"
                        >
                          Acessar <i className="fas fa-arrow-right text-xs"></i>
                        </button>
                      </div>
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
                  </div>
                </div>
              </div>
              
              {/* STATS GRID */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <div className={'rounded-xl p-4 ' + (theme === 'dark' ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-100 shadow-sm')}>
                  <div className={'w-9 h-9 rounded-lg flex items-center justify-center mb-3 ' + (theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100')}>
                    <i className={'fas fa-box text-sm ' + (theme === 'dark' ? 'text-blue-400' : 'text-blue-600')}></i>
                  </div>
                  <p className={'text-2xl font-bold ' + (theme === 'dark' ? 'text-white' : 'text-gray-900')}>{products.length}</p>
                  <p className={theme === 'dark' ? 'text-neutral-500 text-xs' : 'text-gray-500 text-xs'}>Produtos</p>
                </div>
                <div className={'rounded-xl p-4 ' + (theme === 'dark' ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-100 shadow-sm')}>
                  <div className={'w-9 h-9 rounded-lg flex items-center justify-center mb-3 ' + (theme === 'dark' ? 'bg-green-500/20' : 'bg-green-100')}>
                    <i className={'fas fa-check-circle text-sm ' + (theme === 'dark' ? 'text-green-400' : 'text-green-600')}></i>
                  </div>
                  <p className={'text-2xl font-bold ' + (theme === 'dark' ? 'text-white' : 'text-gray-900')}>{products.filter(p => (p as any).generatedImages?.length > 0).length}</p>
                  <p className={theme === 'dark' ? 'text-neutral-500 text-xs' : 'text-gray-500 text-xs'}>Otimizados</p>
                </div>
                <div className={'rounded-xl p-4 ' + (theme === 'dark' ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-100 shadow-sm')}>
                  <div className={'w-9 h-9 rounded-lg flex items-center justify-center mb-3 ' + (theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-100')}>
                    <i className={'fas fa-users text-sm ' + (theme === 'dark' ? 'text-purple-400' : 'text-purple-600')}></i>
                  </div>
                  <p className={'text-2xl font-bold ' + (theme === 'dark' ? 'text-white' : 'text-gray-900')}>{clients.length}</p>
                  <p className={theme === 'dark' ? 'text-neutral-500 text-xs' : 'text-gray-500 text-xs'}>Clientes</p>
                </div>
                <div className={'rounded-xl p-4 ' + (theme === 'dark' ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-100 shadow-sm')}>
                  <div className={'w-9 h-9 rounded-lg flex items-center justify-center mb-3 ' + (theme === 'dark' ? 'bg-amber-500/20' : 'bg-amber-100')}>
                    <i className={'fas fa-coins text-sm ' + (theme === 'dark' ? 'text-amber-400' : 'text-amber-600')}></i>
                  </div>
                  <p className={'text-2xl font-bold ' + (theme === 'dark' ? 'text-white' : 'text-gray-900')}>{userCredits}</p>
                  <p className={theme === 'dark' ? 'text-neutral-500 text-xs' : 'text-gray-500 text-xs'}>Créditos</p>
                </div>
              </div>
              
              {/* CARD PLANO */}
              <div className={'rounded-2xl p-5 relative overflow-hidden ' + (theme === 'dark' ? 'bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-orange-500/10 border border-pink-500/20' : 'bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400')}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-white/5 to-transparent rounded-full translate-y-1/2 -translate-x-1/2"></div>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={'w-12 h-12 rounded-xl flex items-center justify-center ' + (theme === 'dark' ? 'bg-gradient-to-r from-pink-500 to-orange-400' : 'bg-white/20 backdrop-blur-sm')}>
                      <i className="fas fa-crown text-lg text-white"></i>
                    </div>
                    <div>
                      <p className={theme === 'dark' ? 'text-neutral-400 text-xs uppercase tracking-wide' : 'text-white/80 text-xs uppercase tracking-wide'}>Seu plano atual</p>
                      <p className="text-2xl font-bold text-white">{currentPlan.name}</p>
                      <p className={theme === 'dark' ? 'text-neutral-500 text-xs' : 'text-white/70 text-xs'}>{currentPlan.limit} créditos/mês • {userCredits} disponíveis</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setCurrentPage('settings'); setSettingsTab('plan'); }}
                    className={'px-5 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ' + (theme === 'dark' ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white hover:opacity-90' : 'bg-white text-purple-600 hover:bg-white/90 shadow-lg')}
                  >
                    <i className="fas fa-bolt text-xs"></i>
                    Fazer Upgrade
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STUDIO */}
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
            theme={theme}
          />
        )}

        {/* PROVADOR */}
        {currentPage === 'provador' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={'w-10 h-10 rounded-xl flex items-center justify-center ' + (theme === 'dark' ? 'bg-gradient-to-r from-pink-500/20 to-orange-400/20 border border-pink-500/30' : 'bg-gradient-to-r from-pink-500 to-orange-400 shadow-lg shadow-pink-500/25')}>
                    <i className={'fas fa-shirt text-sm ' + (theme === 'dark' ? 'text-pink-400' : 'text-white')}></i>
                  </div>
                  <div>
                    <h1 className={'text-lg font-semibold ' + (theme === 'dark' ? 'text-white' : 'text-gray-900')}>Vizzu Provador®</h1>
                    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs hidden md:block'}>Vista seus clientes virtualmente</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={'px-2 py-1 text-[10px] font-medium rounded-lg ' + (theme === 'dark' ? 'bg-neutral-900 border border-neutral-800 text-neutral-400' : 'bg-pink-100 text-pink-600')}>3 créd.</span>
                  {(provadorClient || Object.keys(provadorLook).length > 0) && (
                    <button onClick={handleProvadorReset} className={'p-2 rounded-lg text-xs transition-colors ' + (theme === 'dark' ? 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700')}>
                      <i className="fas fa-undo"></i>
                    </button>
                  )}
                </div>
              </div>

              {/* Desktop Grid */}
              <div className="hidden lg:grid lg:grid-cols-4 gap-4">
                {/* Col 1: Cliente */}
                <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border overflow-hidden'}>
                  <div className={'p-3 border-b ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-100')}>
                    <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-xs flex items-center gap-2'}>
                      <span className={'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ' + (provadorClient ? 'bg-green-500 text-white' : (theme === 'dark' ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-200 text-gray-500'))}>
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
                        <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-xs'}>{provadorClient.firstName} {provadorClient.lastName}</p>
                        <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{formatWhatsApp(provadorClient.whatsapp)}</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {clientsWithProvador.length > 0 ? clientsWithProvador.slice(0, 5).map(client => (
                          <div key={client.id} onClick={() => setProvadorClient(client)} className={'flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ' + (theme === 'dark' ? 'border-neutral-800 hover:border-pink-500/50 hover:bg-neutral-800' : 'border-gray-200 hover:border-pink-300 hover:bg-pink-50')}>
                            <img src={getClientPhoto(client)} alt="" className="w-8 h-8 rounded-full object-cover" />
                            <div className="flex-1 min-w-0">
                              <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-xs truncate'}>{client.firstName} {client.lastName}</p>
                              <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px]'}>{client.photos?.length || 1} foto(s)</p>
                            </div>
                          </div>
                        )) : (
                          <div className="text-center py-4">
                            <i className={(theme === 'dark' ? 'text-neutral-700' : 'text-gray-300') + ' fas fa-user-plus text-lg mb-2'}></i>
                            <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Nenhum cliente</p>
                            <button onClick={() => setCurrentPage('clients')} className={(theme === 'dark' ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-pink-500 text-white hover:bg-pink-600') + ' mt-2 px-3 py-1 rounded-lg text-[10px] font-medium'}>Cadastrar</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Col 2: Foto */}
                <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border overflow-hidden'}>
                  <div className={'p-3 border-b ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-100')}>
                    <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-xs flex items-center gap-2'}>
                      <span className={'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ' + (provadorClient && provadorPhotoType ? 'bg-green-500 text-white' : (theme === 'dark' ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-200 text-gray-500'))}>
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
                              className={'flex items-center gap-2 p-2 rounded-lg border transition-all ' + (!hasPhoto ? (theme === 'dark' ? 'border-neutral-800' : 'border-gray-200') + ' opacity-50 cursor-not-allowed' : provadorPhotoType === photoType.id ? 'border-pink-500 bg-pink-500/10 cursor-pointer' : (theme === 'dark' ? 'border-neutral-800 hover:border-neutral-700' : 'border-gray-200 hover:border-pink-300') + ' cursor-pointer')}>
                              {hasPhoto && photoSrc ? <img src={photoSrc} alt="" className="w-8 h-8 rounded-lg object-cover" /> : <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' w-8 h-8 rounded-lg flex items-center justify-center'}><i className={'fas ' + photoType.icon + ' text-[10px] ' + (theme === 'dark' ? 'text-neutral-600' : 'text-gray-400')}></i></div>}
                              <div className="flex-1">
                                <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-xs'}>{photoType.label}</p>
                                <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px]'}>{hasPhoto ? 'Disponível' : 'Não cadastrada'}</p>
                              </div>
                              {hasPhoto && provadorPhotoType === photoType.id && <i className="fas fa-check text-pink-400 text-xs"></i>}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' text-center py-6'}>
                        <i className="fas fa-image text-lg mb-2"></i>
                        <p className="text-[10px]">Selecione um cliente</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Col 3: Look */}
                <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border overflow-hidden'}>
                  <div className={'p-3 border-b ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-100')}>
                    <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-xs flex items-center gap-2'}>
                      <span className={'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ' + (Object.keys(provadorLook).length > 0 ? 'bg-green-500 text-white' : (theme === 'dark' ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-200 text-gray-500'))}>
                        {Object.keys(provadorLook).length > 0 ? <i className="fas fa-check text-[8px]"></i> : '3'}
                      </span>
                      Look
                      {Object.keys(provadorLook).length > 0 && <span className="ml-auto text-[9px] text-pink-400 bg-pink-500/20 px-1.5 py-0.5 rounded-full">{Object.keys(provadorLook).length}</span>}
                    </h3>
                  </div>
                  <div className="p-2">
                    <select value={provadorLookFilter} onChange={(e) => setProvadorLookFilter(e.target.value)} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-2 py-1.5 border rounded-lg text-[10px] mb-2'}>
                      <option value="">Todas coleções</option>
                      {COLLECTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="max-h-[240px] overflow-y-auto">
                      <LookComposer products={provadorLookFilter ? products.filter(p => p.collection === provadorLookFilter) : products} composition={provadorLook} onChange={setProvadorLook} theme={theme} />
                    </div>
                  </div>
                </div>

                {/* Col 4: Gerar */}
                <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border overflow-hidden'}>
                  <div className={'p-3 border-b ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-100')}>
                    <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-xs flex items-center gap-2'}>
                      <span className={'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ' + (provadorGeneratedImage ? 'bg-green-500 text-white' : (theme === 'dark' ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-200 text-gray-500'))}>
                        {provadorGeneratedImage ? <i className="fas fa-check text-[8px]"></i> : '4'}
                      </span>
                      Gerar e Enviar
                    </h3>
                  </div>
                  <div className="p-3">
                    <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' aspect-[3/4] rounded-lg mb-3 flex items-center justify-center overflow-hidden'}>
                      {isGeneratingProvador ? (
                        <div className="text-center"><div className={'w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-2 ' + (theme === 'dark' ? 'border-neutral-600 border-t-pink-500' : 'border-gray-300 border-t-pink-500')}></div><p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Gerando...</p></div>
                      ) : provadorGeneratedImage ? (
                        <img src={provadorGeneratedImage} alt="Gerado" className="w-full h-full object-cover" />
                      ) : provadorClient && getClientPhoto(provadorClient, provadorPhotoType) ? (
                        <div className="relative w-full h-full"><img src={getClientPhoto(provadorClient, provadorPhotoType)} alt="Preview" className="w-full h-full object-cover opacity-30" /><div className="absolute inset-0 flex items-center justify-center"><div className="text-center"><i className="fas fa-wand-magic-sparkles text-pink-400 text-lg mb-1"></i><p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px]'}>Clique em Gerar</p></div></div></div>
                      ) : (
                        <div className="text-center p-4"><i className={(theme === 'dark' ? 'text-neutral-700' : 'text-gray-300') + ' fas fa-image text-2xl mb-2'}></i><p className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' text-[10px]'}>Preview</p></div>
                      )}
                    </div>
                    <select value={selectedTemplate.id} onChange={(e) => { const t = whatsappTemplates.find(x => x.id === e.target.value); if (t) { setSelectedTemplate(t); setProvadorMessage(t.message); } }} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-2 py-1.5 border rounded-lg text-[10px] mb-2'}>
                      {whatsappTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <textarea value={provadorMessage} onChange={(e) => setProvadorMessage(e.target.value)} rows={2} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-2 py-1.5 border rounded-lg text-[10px] resize-none mb-3'} placeholder="Mensagem..." />
                    <div className="space-y-2">
                      <button onClick={handleProvadorGenerate} disabled={!provadorClient || Object.keys(provadorLook).length === 0 || isGeneratingProvador || userCredits < 3} className="w-full py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
                        {isGeneratingProvador ? <><i className="fas fa-spinner fa-spin text-[10px]"></i>Gerando...</> : <><i className="fas fa-wand-magic-sparkles text-[10px]"></i>Gerar (3 créd.)</>}
                      </button>
                      <button onClick={handleProvadorSendWhatsApp} disabled={!provadorClient || !provadorGeneratedImage} className={(theme === 'dark' ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700' : 'bg-gray-100 hover:bg-gray-200 border-gray-200') + ' w-full py-2 text-green-500 border rounded-lg font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors'}>
                        <i className="fab fa-whatsapp text-[10px]"></i>Enviar WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile - simplified message */}
              <div className="lg:hidden text-center py-8">
                <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-sm'}>Use em um dispositivo maior para melhor experiência</p>
              </div>
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
                <button onClick={() => setShowImport(true)} className="px-3 py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-xs">
                  <i className="fas fa-plus mr-1.5"></i>Novo
                </button>
              </div>
              
              <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-3 mb-4'}>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <div className="flex-shrink-0 w-44">
                    <div className="relative">
                      <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px]'}></i>
                      <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full pl-7 pr-2 py-1.5 border rounded-lg text-xs'} />
                    </div>
                  </div>
                  <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' flex-shrink-0 px-2.5 py-1.5 border rounded-lg text-xs'}>
                    <option value="">Categoria</option>
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <p className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-500') + ' text-[10px] mt-2'}>{filteredProducts.length} de {products.length} produtos</p>
              </div>
              
              <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border overflow-hidden'}>
                {filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 p-3">
                    {filteredProducts.map(product => (
                      <div key={product.id} onClick={() => setShowProductDetail(product)} className={(theme === 'dark' ? 'bg-neutral-800 hover:bg-neutral-700' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200') + ' rounded-lg overflow-hidden cursor-pointer transition-colors group'}>
                        <div className={(theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200') + ' aspect-square relative overflow-hidden'}>
                          <img src={product.images[0]?.base64 || product.images[0]?.url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
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
                      <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-search text-xl'}></i>
                    </div>
                    <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium mb-1'}>Nenhum produto</h3>
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
                  <i className="fas fa-plus mr-1.5"></i>Novo
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

        {/* HISTORY */}
        {currentPage === 'history' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center gap-3 mb-5">
                <div className={'w-10 h-10 rounded-xl flex items-center justify-center ' + (theme === 'dark' ? 'bg-gradient-to-r from-pink-500/20 to-orange-400/20 border border-pink-500/30' : 'bg-gradient-to-r from-pink-500 to-orange-400 shadow-lg shadow-pink-500/25')}>
                  <i className={'fas fa-clock-rotate-left text-sm ' + (theme === 'dark' ? 'text-pink-400' : 'text-white')}></i>
                </div>
                <div>
                  <h1 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold'}>Histórico</h1>
                  <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Suas atividades</p>
                </div>
              </div>
              <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-8 text-center'}>
                <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-purple-100') + ' w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3'}>
                  <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-purple-400') + ' fas fa-clock-rotate-left text-xl'}></i>
                </div>
                <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium mb-1'}>Nenhuma atividade</h3>
                <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>As atividades aparecerão aqui</p>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {currentPage === 'settings' && (
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col md:flex-row h-full">
              <div className={'md:w-56 border-b md:border-b-0 md:border-r p-2 md:p-3 ' + (theme === 'dark' ? 'bg-neutral-950 border-neutral-900' : 'bg-white border-gray-200')}>
                <nav className="flex md:flex-col gap-0.5 overflow-x-auto">
                  {[
                    { id: 'profile' as SettingsTab, icon: 'fa-user', label: 'Perfil' },
                    { id: 'appearance' as SettingsTab, icon: 'fa-palette', label: 'Aparência' },
                    { id: 'company' as SettingsTab, icon: 'fa-building', label: 'Empresa' },
                    { id: 'plan' as SettingsTab, icon: 'fa-credit-card', label: 'Plano' },
                    { id: 'integrations' as SettingsTab, icon: 'fa-plug', label: 'Integrações' },
                  ].map(item => (
                    <button key={item.id} onClick={() => setSettingsTab(item.id)} className={'flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ' + (settingsTab === item.id ? (theme === 'dark' ? 'bg-neutral-800 text-white' : 'bg-gray-100 text-gray-900') : (theme === 'dark' ? 'text-neutral-500 hover:text-white hover:bg-neutral-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'))}>
                      <i className={'fas ' + item.icon + ' w-3.5 text-[10px]'}></i>{item.label}
                    </button>
                  ))}
                  <button onClick={handleLogout} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 md:mt-4 md:pt-3 md:border-t md:border-neutral-800">
                    <i className="fas fa-sign-out-alt w-3.5 text-[10px]"></i>Sair
                  </button>
                </nav>
              </div>
              
              <div className="flex-1 p-4 md:p-6 overflow-y-auto">
                <div className="max-w-xl">
                  {settingsTab === 'plan' && (
                    <div>
                      <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold mb-4'}>Plano & Créditos</h3>
                      <div className={(theme === 'dark' ? 'bg-neutral-900 border-pink-500/30' : 'bg-white border-pink-200 shadow-sm') + ' border rounded-xl p-4 mb-4'}>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide'}>Plano Atual</p>
                            <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xl font-bold'}>{currentPlan.name}</p>
                          </div>
                          <div className="text-right">
                            <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide'}>Créditos</p>
                            <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xl font-bold'}>{userCredits}</p>
                          </div>
                        </div>
                        <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-200') + ' h-1.5 rounded-full overflow-hidden'}>
                          <div className="h-full bg-gradient-to-r from-pink-500 to-orange-400 rounded-full" style={{ width: Math.min(100, (userCredits / currentPlan.limit) * 100) + '%' }}></div>
                        </div>
                      </div>
                      <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-4'}>
                        <h4 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-sm mb-3'}>Escolha seu Plano</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {PLANS.map(plan => (
                            <div key={plan.id} onClick={() => upgradePlan(plan.id)} className={'p-3 rounded-lg border cursor-pointer transition-all ' + (currentPlan.id === plan.id ? 'border-pink-500 bg-pink-500/10' : (theme === 'dark' ? 'border-neutral-800 hover:border-neutral-700' : 'border-gray-200 hover:border-gray-300'))}>
                              <h5 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-xs'}>{plan.name}</h5>
                              <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-bold my-1'}>{plan.limit}</p>
                              <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>créd./mês</p>
                              <p className="text-[10px] font-medium text-pink-500 mt-1">{plan.price}</p>
                              {currentPlan.id === plan.id && <span className="inline-block mt-2 text-[8px] font-medium text-pink-500 bg-pink-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wide">ATUAL</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
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
                            <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] mt-0.5'}>Escolha entre tema claro ou escuro</p>
                          </div>
                          <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' flex items-center gap-1 p-1 rounded-lg'}>
                            <button onClick={() => setTheme('dark')} className={'px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ' + (theme === 'dark' ? 'bg-white text-neutral-900' : 'text-gray-500 hover:text-gray-700')}>
                              <i className="fas fa-moon text-[10px]"></i>Escuro
                            </button>
                            <button onClick={() => setTheme('light')} className={'px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ' + (theme === 'light' ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white' : 'text-gray-500 hover:text-gray-700')}>
                              <i className="fas fa-sun text-[10px]"></i>Claro
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {settingsTab === 'company' && (
                    <div>
                      <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold mb-4'}>Empresa</h3>
                      <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-4'}>
                        <div className="space-y-3">
                          <div>
                            <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>Nome da Empresa</label>
                            <input type="text" className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'} placeholder="Sua Empresa Ltda" />
                          </div>
                          <div>
                            <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>CNPJ</label>
                            <input type="text" className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'} placeholder="00.000.000/0000-00" />
                          </div>
                          <button className="px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium text-xs hover:opacity-90 transition-opacity">Salvar</button>
                        </div>
                      </div>
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
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className={'md:hidden fixed bottom-0 left-0 right-0 border-t px-2 py-1.5 z-40 ' + (theme === 'dark' ? 'bg-neutral-950 border-neutral-900' : 'bg-white border-gray-200 shadow-lg')}>
        <div className="flex items-center justify-around">
          <button onClick={() => setCurrentPage('dashboard')} className={'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ' + (currentPage === 'dashboard' ? (theme === 'dark' ? 'text-white' : 'text-pink-500') : (theme === 'dark' ? 'text-neutral-600' : 'text-gray-400'))}>
            <i className="fas fa-home text-sm"></i>
            <span className="text-[9px] font-medium">Home</span>
          </button>
          <button onClick={() => setCurrentPage('products')} className={'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ' + (currentPage === 'products' ? (theme === 'dark' ? 'text-white' : 'text-pink-500') : (theme === 'dark' ? 'text-neutral-600' : 'text-gray-400'))}>
            <i className="fas fa-box text-sm"></i>
            <span className="text-[9px] font-medium">Produtos</span>
          </button>
          <button onClick={() => setShowStudioPicker(true)} className="relative -mt-5">
            <div className={'w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-all ' + ((currentPage === 'studio' || currentPage === 'provador') ? 'bg-gradient-to-br from-pink-500 to-orange-400 scale-110' : 'bg-gradient-to-br from-pink-500/80 to-orange-400/80')}>
              <i className="fas fa-wand-magic-sparkles text-white text-lg"></i>
            </div>
            <span className={'block text-[9px] font-medium mt-0.5 text-center ' + ((currentPage === 'studio' || currentPage === 'provador') ? (theme === 'dark' ? 'text-white' : 'text-pink-500') : (theme === 'dark' ? 'text-neutral-500' : 'text-gray-500'))}>Criar</span>
          </button>
          <button onClick={() => setCurrentPage('clients')} className={'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ' + (currentPage === 'clients' ? (theme === 'dark' ? 'text-white' : 'text-pink-500') : (theme === 'dark' ? 'text-neutral-600' : 'text-gray-400'))}>
            <i className="fas fa-users text-sm"></i>
            <span className="text-[9px] font-medium">Clientes</span>
          </button>
          <button onClick={() => setCurrentPage('settings')} className={'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ' + (currentPage === 'settings' ? (theme === 'dark' ? 'text-white' : 'text-pink-500') : (theme === 'dark' ? 'text-neutral-600' : 'text-gray-400'))}>
            <i className="fas fa-cog text-sm"></i>
            <span className="text-[9px] font-medium">Config</span>
          </button>
        </div>
      </nav>

      {/* VIDEO TUTORIAL MODAL */}
      {showVideoTutorial && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowVideoTutorial(null)}>
          <div className={'relative w-full max-w-4xl rounded-2xl overflow-hidden ' + (theme === 'dark' ? 'bg-neutral-900' : 'bg-white')} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowVideoTutorial(null)} className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
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

      {/* STUDIO PICKER MODAL */}
      {showStudioPicker && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowStudioPicker(false)}>
          <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-t-2xl w-full p-5 pb-8 border-t'} onClick={(e) => e.stopPropagation()}>
            <div className={(theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-300') + ' w-10 h-1 rounded-full mx-auto mb-5'}></div>
            <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold text-center mb-1'}>O que você quer criar?</h3>
            <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs text-center mb-5'}>Escolha uma das opções</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setShowStudioPicker(false); setCurrentPage('studio'); }} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 hover:border-neutral-600' : 'bg-gray-50 border-gray-200 hover:border-purple-300 hover:bg-purple-50') + ' border rounded-xl p-4 text-left transition-all group'}>
                <div className={(theme === 'dark' ? 'bg-neutral-700 group-hover:bg-neutral-600' : 'bg-purple-100 group-hover:bg-purple-200') + ' w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-colors'}>
                  <i className={(theme === 'dark' ? 'text-neutral-300' : 'text-purple-600') + ' fas fa-wand-magic-sparkles text-sm'}></i>
                </div>
                <h4 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-sm mb-0.5'}>Vizzu Studio®</h4>
                <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] leading-relaxed'}>Gere fotos profissionais com IA</p>
              </button>
              <button onClick={() => { setShowStudioPicker(false); setCurrentPage('provador'); }} className={(theme === 'dark' ? 'bg-neutral-800 border-pink-500/30 hover:border-pink-500/50' : 'bg-pink-50 border-pink-200 hover:border-pink-400 hover:bg-pink-100') + ' border rounded-xl p-4 text-left transition-all group'}>
                <div className={(theme === 'dark' ? 'bg-gradient-to-r from-pink-500/20 to-orange-400/20 group-hover:from-pink-500/30 group-hover:to-orange-400/30' : 'bg-gradient-to-r from-pink-100 to-orange-100 group-hover:from-pink-200 group-hover:to-orange-200') + ' w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-colors'}>
                  <i className="fas fa-shirt text-pink-500 text-sm"></i>
                </div>
                <h4 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-sm mb-0.5'}>Vizzu Provador®</h4>
                <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] leading-relaxed'}>Vista seus clientes virtualmente</p>
              </button>
            </div>
            <button onClick={() => setShowStudioPicker(false)} className={(theme === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-700') + ' w-full mt-5 py-2.5 font-medium text-xs transition-colors'}>Cancelar</button>
          </div>
        </div>
      )}

      {/* CREATE CLIENT MODAL */}
      {showCreateClient && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-t-2xl md:rounded-2xl border w-full max-w-md max-h-[90vh] overflow-y-auto'}>
            <div className={'sticky top-0 border-b px-4 py-3 flex items-center justify-between z-10 ' + (theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200')}>
              <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>Novo Cliente</h3>
              <button onClick={() => { setShowCreateClient(false); setNewClient({ firstName: '', lastName: '', whatsapp: '', email: '', photos: [], notes: '' }); }} className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700') + ' w-7 h-7 rounded-full flex items-center justify-center transition-colors'}>
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
                        <div onClick={() => { if (existingPhoto) return; setUploadingPhotoType(photoType.id); clientPhotoInputRef.current?.click(); }} className={'relative aspect-square rounded-lg overflow-hidden border border-dashed transition-all cursor-pointer ' + (existingPhoto ? 'border-pink-500/50 bg-pink-500/10' : (theme === 'dark' ? 'border-neutral-700 hover:border-pink-500/50 hover:bg-neutral-800' : 'border-purple-300 hover:border-pink-400 hover:bg-purple-50'))}>
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
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <input ref={clientPhotoInputRef} type="file" accept="image/*" capture="user" onChange={handleClientPhotoUpload} className="hidden" />
                {newClient.photos.length > 0 && (
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
              <button onClick={handleCreateClient} disabled={!newClient.firstName || !newClient.lastName || !newClient.whatsapp} className="w-full py-3 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                <i className="fas fa-user-plus mr-2"></i>Cadastrar Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLIENT DETAIL MODAL */}
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

      {/* IMPORT MODAL */}
      {showImport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-t-2xl md:rounded-2xl border w-full max-w-sm p-5 max-h-[85vh] overflow-y-auto'}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>Adicionar Produto</h3>
              <button onClick={() => setShowImport(false)} className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700') + ' w-7 h-7 rounded-full flex items-center justify-center'}>
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
            <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mb-4'}>Escolha como adicionar a imagem:</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <label className={(theme === 'dark' ? 'border-neutral-700 hover:border-pink-500/50 hover:bg-neutral-800' : 'border-purple-300 hover:border-pink-400 hover:bg-purple-50') + ' flex flex-col items-center gap-2 p-4 border border-dashed rounded-xl transition-all cursor-pointer'}>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && handleFileSelect(e.target.files)} />
                <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-purple-100') + ' w-10 h-10 rounded-full flex items-center justify-center'}>
                  <i className={(theme === 'dark' ? 'text-neutral-400' : 'text-purple-500') + ' fas fa-images text-sm'}></i>
                </div>
                <span className={(theme === 'dark' ? 'text-neutral-300' : 'text-gray-700') + ' text-[10px] font-medium'}>Galeria</span>
              </label>
              <label className={(theme === 'dark' ? 'border-neutral-700 hover:border-pink-500/50 hover:bg-neutral-800' : 'border-purple-300 hover:border-pink-400 hover:bg-purple-50') + ' flex flex-col items-center gap-2 p-4 border border-dashed rounded-xl transition-all cursor-pointer'}>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files && handleFileSelect(e.target.files)} />
                <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-purple-100') + ' w-10 h-10 rounded-full flex items-center justify-center'}>
                  <i className={(theme === 'dark' ? 'text-neutral-400' : 'text-purple-500') + ' fas fa-camera text-sm'}></i>
                </div>
                <span className={(theme === 'dark' ? 'text-neutral-300' : 'text-gray-700') + ' text-[10px] font-medium'}>Câmera</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* CREATE PRODUCT MODAL */}
      {showCreateProduct && selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-t-2xl md:rounded-2xl border w-full max-w-md p-5 max-h-[90vh] overflow-y-auto'}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>Criar Produto</h3>
              <button onClick={() => { setShowCreateProduct(false); setSelectedImage(null); }} className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700') + ' w-7 h-7 rounded-full flex items-center justify-center'}>
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
            <div className="mb-4">
              <div className={(theme === 'dark' ? 'border-neutral-700' : 'border-gray-200') + ' w-20 h-20 rounded-lg overflow-hidden border mx-auto'}>
                <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
              </div>
            </div>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>Caimento</label>
                  <select value={newProduct.fit} onChange={(e) => setNewProduct({...newProduct, fit: e.target.value})} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}>
                    <option value="">Selecione</option>
                    {FITS.map(fit => <option key={fit} value={fit}>{fit}</option>)}
                  </select>
                </div>
                <div>
                  <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>Categoria *</label>
                  <select value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}>
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

      {/* PRODUCT DETAIL MODAL */}
      {showProductDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-t-2xl md:rounded-2xl border w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto'}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>Detalhes do Produto</h3>
              <button onClick={() => setShowProductDetail(null)} className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700') + ' w-7 h-7 rounded-full flex items-center justify-center'}>
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <div className={(theme === 'dark' ? 'border-neutral-700' : 'border-gray-200') + ' w-full md:w-40 h-40 rounded-xl overflow-hidden border flex-shrink-0'}>
                <img src={showProductDetail.images[0]?.base64 || showProductDetail.images[0]?.url} alt={showProductDetail.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] font-medium uppercase tracking-wide mb-0.5'}>{showProductDetail.sku}</p>
                <h4 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-base font-semibold mb-3'}>{showProductDetail.name}</h4>
                <div className="grid grid-cols-2 gap-2 mb-3">
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
              </div>
            </div>
            <div className={'flex flex-col md:flex-row gap-2 mt-4 pt-4 border-t ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-200')}>
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
