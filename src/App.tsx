import React, { useState, useEffect, useRef } from 'react';
import { Studio } from './components/Studio';
import { Product, User, HistoryLog, Client, Collection, WhatsAppTemplate } from './types';
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
const COLORS = ['Preto', 'Branco', 'Azul', 'Vermelho', 'Verde', 'Amarelo', 'Rosa', 'Cinza', 'Marrom', 'Bege'];
const FITS = ['Slim', 'Regular', 'Oversized', 'Skinny', 'Relaxed'];
const COLLECTIONS = ['Verão 2025', 'Inverno 2025', 'Básicos', 'Premium', 'Outlet', 'Lançamentos'];

const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  { id: '1', name: 'Provador Virtual', message: 'Olá {nome}! 🛍️\n\nPreparei um visual especial para você! Veja como ficou {produto} em você.\n\nO que achou? 😍', isDefault: true },
  { id: '2', name: 'Look Completo', message: 'Oi {nome}! ✨\n\nMontei um look completo pensando em você!\n\nProdutos:\n{produtos}\n\nPosso reservar para você?', isDefault: false },
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
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterFit, setFilterFit] = useState('');
  
  // New Product Form
  const [newProduct, setNewProduct] = useState({
    name: '',
    brand: '',
    color: '',
    fit: '',
    category: '',
    collection: ''
  });
  
  // Clients State
  const [clients, setClients] = useState<Client[]>([]);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showClientDetail, setShowClientDetail] = useState<Client | null>(null);
  const [showProvadorIA, setShowProvadorIA] = useState(false);
  const [selectedClientForProvador, setSelectedClientForProvador] = useState<Client | null>(null);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [newClient, setNewClient] = useState({
    firstName: '',
    lastName: '',
    whatsapp: '',
    email: '',
    photo: '',
    notes: ''
  });
  
  // Provador Page State
  const [provadorSelectedClient, setProvadorSelectedClient] = useState<Client | null>(null);
  const [provadorSelectedProducts, setProvadorSelectedProducts] = useState<Product[]>([]);
  const [provadorMessage, setProvadorMessage] = useState('');
  const [provadorGeneratedImage, setProvadorGeneratedImage] = useState<string | null>(null);
  const [isGeneratingProvador, setIsGeneratingProvador] = useState(false);
  
  // Collections State
  const [collections, setCollections] = useState<Collection[]>(
    COLLECTIONS.map((name, i) => ({ id: `col-${i}`, name, createdAt: new Date().toISOString() }))
  );
  const [filterCollection, setFilterCollection] = useState('');
  
  // WhatsApp Templates
  const [whatsappTemplates] = useState<WhatsAppTemplate[]>(DEFAULT_WHATSAPP_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate>(DEFAULT_WHATSAPP_TEMPLATES[0]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const clientPhotoInputRef = useRef<HTMLInputElement>(null);
  
  const { userCredits, currentPlan, deductCredits, upgradePlan, setCredits } = useCredits();

  // Get unique brands from products
  const uniqueBrands = [...new Set(products.map(p => p.brand).filter(Boolean))];

  // Filtered products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || product.category === filterCategory;
    const matchesColor = !filterColor || product.color === filterColor;
    const matchesBrand = !filterBrand || product.brand === filterBrand;
    const matchesFit = !filterFit || product.fit === filterFit;
    const matchesCollection = !filterCollection || product.collection === filterCollection;
    
    return matchesSearch && matchesCategory && matchesColor && matchesBrand && matchesFit && matchesCollection;
  });
  
  // Filtered clients
  const filteredClients = clients.filter(client => {
    const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
    return fullName.includes(clientSearchTerm.toLowerCase()) ||
           client.whatsapp.includes(clientSearchTerm) ||
           (client.email && client.email.toLowerCase().includes(clientSearchTerm.toLowerCase()));
  });
  
  // Clients with Provador IA enabled
  const clientsWithProvador = clients.filter(c => c.hasProvadorIA && c.photo);

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

  const handleAddHistoryLog = (
    action: string, details: string, status: HistoryLog['status'], 
    items: Product[], method: HistoryLog['method'], cost: number
  ) => {
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
      id: `product-${Date.now()}`,
      sku: `SKU-${Date.now().toString().slice(-6)}`,
      name: newProduct.name,
      brand: newProduct.brand,
      color: newProduct.color,
      fit: newProduct.fit,
      category: newProduct.category,
      collection: newProduct.collection,
      images: [{ name: `${newProduct.name}.jpg`, base64: selectedImage }]
    };

    setProducts(prev => [...prev, product]);
    setShowCreateProduct(false);
    setSelectedImage(null);
    setNewProduct({ name: '', brand: '', color: '', fit: '', category: '', collection: '' });
  };

  // ══════════════════════════════════════════════════════════════════
  // CLIENT HANDLERS
  // ══════════════════════════════════════════════════════════════════
  
  const handleClientPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setNewClient(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateClient = () => {
    if (!newClient.firstName || !newClient.lastName || !newClient.whatsapp) {
      alert('Preencha nome, sobrenome e WhatsApp');
      return;
    }

    const client: Client = {
      id: `client-${Date.now()}`,
      firstName: newClient.firstName,
      lastName: newClient.lastName,
      whatsapp: newClient.whatsapp.replace(/\D/g, ''),
      email: newClient.email || undefined,
      photo: newClient.photo || undefined,
      hasProvadorIA: !!newClient.photo,
      notes: newClient.notes || undefined,
      status: 'active',
      createdAt: new Date().toISOString(),
      totalOrders: 0
    };

    setClients(prev => [...prev, client]);
    setShowCreateClient(false);
    setNewClient({ firstName: '', lastName: '', whatsapp: '', email: '', photo: '', notes: '' });
  };

  const handleDeleteClient = (clientId: string) => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      setClients(prev => prev.filter(c => c.id !== clientId));
      setShowClientDetail(null);
    }
  };

  const handleOpenProvadorIA = (client: Client) => {
    setSelectedClientForProvador(client);
    setShowProvadorIA(true);
    setShowClientDetail(null);
  };
  
  // Abrir Provador com cliente selecionado (do menu lateral)
  const handleOpenProvadorPage = (client?: Client) => {
    if (client) {
      setProvadorSelectedClient(client);
    }
    setCurrentPage('provador');
  };

  const formatWhatsApp = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) {
      return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
    }
    return phone;
  };

  const handleSendWhatsApp = (client: Client, message: string, imageUrl?: string) => {
    const phone = client.whatsapp.replace(/\D/g, '');
    const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${fullPhone}?text=${encodedMessage}`;
    window.open(url, '_blank');
  };

  const handleGenerateDescription = async (product: Product) => {
    setIsGeneratingDescription(true);
    setTimeout(() => {
      setIsGeneratingDescription(false);
      alert('Descrição enviada para geração! Você receberá o resultado em breve.');
    }, 2000);
  };

  const handleOpenInStudio = (product: Product) => {
    setShowProductDetail(null);
    setCurrentPage('studio');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCategory('');
    setFilterColor('');
    setFilterBrand('');
    setFilterFit('');
    setFilterCollection('');
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  };

  const handleDemoLogin = () => {
    setUser({ id: 'demo-user', name: 'Usuário Demo', email: 'demo@vizzu.ai', avatar: '', plan: 'Free' });
    setCredits(50);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };
  
  // ══════════════════════════════════════════════════════════════════
  // PROVADOR HANDLERS
  // ══════════════════════════════════════════════════════════════════
  
  const handleProvadorAddProduct = (product: Product) => {
    if (provadorSelectedProducts.length < 5) {
      setProvadorSelectedProducts(prev => [...prev, product]);
    }
  };
  
  const handleProvadorRemoveProduct = (productId: string) => {
    setProvadorSelectedProducts(prev => prev.filter(p => p.id !== productId));
  };
  
  const handleProvadorGenerate = async () => {
    if (!provadorSelectedClient || provadorSelectedProducts.length === 0) {
      alert('Selecione um cliente e pelo menos um produto');
      return;
    }
    
    setIsGeneratingProvador(true);
    // Simular geração - aqui entraria a chamada real da API
    setTimeout(() => {
      setProvadorGeneratedImage(provadorSelectedClient.photo || '');
      setIsGeneratingProvador(false);
    }, 3000);
  };
  
  const handleProvadorSendWhatsApp = () => {
    if (!provadorSelectedClient) return;
    
    let message = selectedTemplate.message
      .replace('{nome}', provadorSelectedClient.firstName)
      .replace('{produto}', provadorSelectedProducts.map(p => p.name).join(', '))
      .replace('{produtos}', provadorSelectedProducts.map(p => `• ${p.name}`).join('\n'));
    
    if (provadorMessage) {
      message = provadorMessage;
    }
    
    handleSendWhatsApp(provadorSelectedClient, message);
  };

  // LOGIN SCREEN
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-slate-900 flex items-center justify-center p-4">
        <div className="relative z-10 w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="Vizzu" className="h-16 mx-auto mb-4" />
            <p className="text-slate-400 text-sm">AI Visual Studio para E-commerce</p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-white text-center mb-6">Bem-vindo!</h2>

            <div className="space-y-4">
              <button onClick={handleGoogleLogin} className="w-full py-4 bg-white text-slate-800 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-slate-100 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar com Google
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                <div className="relative flex justify-center text-sm"><span className="px-4 text-slate-500 bg-transparent">ou</span></div>
              </div>

              <button onClick={handleDemoLogin} className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold flex items-center justify-center gap-3 transition-colors">
                <i className="fas fa-play"></i>
                Testar Gratuitamente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MAIN APP
  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-100">
      
      {/* DESKTOP SIDEBAR - Hidden on mobile */}
      <aside className="hidden md:flex w-56 bg-gradient-to-b from-slate-900 via-purple-950 to-slate-900 flex-col shadow-2xl">
        
        <div className="p-6 border-b border-white/10 flex flex-col items-center">
          <img src="/logo.png" alt="Vizzu" className="h-12" />
          <span className="text-[10px] text-purple-300/70 mt-1">Estúdio com IA para lojistas</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              currentPage === 'dashboard'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <i className="fas fa-home w-5"></i>
            Dashboard
          </button>

          <button
            onClick={() => setCurrentPage('studio')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              currentPage === 'studio'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <i className="fas fa-wand-magic-sparkles w-5"></i>
            Vizzu Studio®
          </button>
          
          {/* NOVO: Vizzu Provador® */}
          <button
            onClick={() => setCurrentPage('provador')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              currentPage === 'provador'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <i className="fas fa-user-tag w-5"></i>
            Vizzu Provador®
          </button>

          <button
            onClick={() => setCurrentPage('products')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              currentPage === 'products'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <i className="fas fa-box w-5"></i>
            Produtos
          </button>

          <button
            onClick={() => setCurrentPage('clients')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              currentPage === 'clients'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <i className="fas fa-users w-5"></i>
            Clientes
          </button>

          <button
            onClick={() => setCurrentPage('history')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              currentPage === 'history'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <i className="fas fa-clock-rotate-left w-5"></i>
            Histórico
          </button>
        </nav>

        {/* Bottom Section */}
        <div className="p-3 border-t border-white/10 space-y-3">
          
          {/* Credits */}
          <div className="bg-white/5 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase">Créditos</span>
              <button 
                onClick={() => { setCurrentPage('settings'); setSettingsTab('plan'); }}
                className="text-purple-400 hover:text-purple-300 text-xs font-bold"
              >
                + Add
              </button>
            </div>
            <p className="text-2xl font-black text-white">{userCredits.toLocaleString()}</p>
            <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (userCredits / currentPlan.limit) * 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Settings Button */}
          <button
            onClick={() => setCurrentPage('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              currentPage === 'settings'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <i className="fas fa-cog w-5"></i>
            Configurações
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
              {user.avatar ? (
                <img src={user.avatar} className="w-full h-full object-cover" alt="" />
              ) : (
                <i className="fas fa-user text-white text-sm"></i>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500">Plano {currentPlan.name}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-hidden flex flex-col pb-20 md:pb-0">

        {/* DASHBOARD PAGE */}
        {currentPage === 'dashboard' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
              {/* Page Header */}
              <div className="flex items-center gap-4 mb-6 md:mb-8">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                  <i className="fas fa-home text-white text-xl md:text-2xl"></i>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl md:text-3xl font-black text-slate-800">Dashboard</h1>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] md:text-xs font-bold rounded-full uppercase">{currentPlan.name}</span>
                  </div>
                  <p className="text-slate-500 text-sm">Resumo do seu estúdio de imagens AI</p>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
                <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                      <i className="fas fa-box text-sm md:text-base"></i>
                    </div>
                  </div>
                  <p className="text-2xl md:text-3xl font-black text-slate-800">{products.length}</p>
                  <p className="text-[10px] md:text-xs text-slate-500">Produtos</p>
                </div>

                <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                      <i className="fas fa-users text-sm md:text-base"></i>
                    </div>
                  </div>
                  <p className="text-2xl md:text-3xl font-black text-slate-800">{clients.length}</p>
                  <p className="text-[10px] md:text-xs text-slate-500">Clientes</p>
                </div>

                <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                      <i className="fas fa-coins text-sm md:text-base"></i>
                    </div>
                  </div>
                  <p className="text-2xl md:text-3xl font-black text-slate-800">{userCredits}</p>
                  <p className="text-[10px] md:text-xs text-slate-500">Créditos</p>
                </div>

                <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-4 md:p-5 shadow-lg">
                  <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/20 text-white flex items-center justify-center">
                      <i className="fas fa-crown text-sm md:text-base"></i>
                    </div>
                  </div>
                  <p className="text-2xl md:text-3xl font-black text-white">{currentPlan.name}</p>
                  <p className="text-[10px] md:text-xs text-white/70">Plano</p>
                </div>
              </div>

              {/* Quick Actions */}
              <h2 className="text-base md:text-lg font-bold text-slate-700 mb-3 md:mb-4">Ações Rápidas</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                <button 
                  onClick={() => setCurrentPage('studio')}
                  className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 hover:border-purple-300 hover:shadow-lg transition-all text-left group"
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform">
                    <i className="fas fa-wand-magic-sparkles text-lg md:text-xl"></i>
                  </div>
                  <h3 className="font-bold text-slate-800 mb-1 text-sm md:text-base">Vizzu Studio®</h3>
                  <p className="text-xs md:text-sm text-slate-500">Gerar imagens com IA</p>
                </button>

                <button 
                  onClick={() => setCurrentPage('provador')}
                  className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 md:p-6 border border-purple-200 hover:border-purple-400 hover:shadow-lg transition-all text-left group"
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform">
                    <i className="fas fa-user-tag text-lg md:text-xl"></i>
                  </div>
                  <h3 className="font-bold text-slate-800 mb-1 text-sm md:text-base">Vizzu Provador®</h3>
                  <p className="text-xs md:text-sm text-slate-500">Vista seus clientes</p>
                </button>

                <button 
                  onClick={() => { setCurrentPage('settings'); setSettingsTab('plan'); }}
                  className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 hover:border-orange-300 hover:shadow-lg transition-all text-left group"
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform">
                    <i className="fas fa-bolt text-lg md:text-xl"></i>
                  </div>
                  <h3 className="font-bold text-slate-800 mb-1 text-sm md:text-base">Comprar Créditos</h3>
                  <p className="text-xs md:text-sm text-slate-500">Upgrade de plano</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STUDIO PAGE */}
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
        
        {/* VIZZU PROVADOR® PAGE */}
        {currentPage === 'provador' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
              {/* Page Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                    <i className="fas fa-user-tag text-white text-2xl"></i>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-black text-slate-800">Vizzu Provador®</h1>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-full uppercase">{currentPlan.name}</span>
                    </div>
                    <p className="text-slate-500 text-sm">Vista seus clientes virtualmente e envie pelo WhatsApp</p>
                  </div>
                </div>
                <span className="px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-full">3 créd./geração</span>
              </div>
              
              {/* Main Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Coluna 1: Selecionar Cliente */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <i className="fas fa-user text-purple-500"></i>
                      1. Selecionar Cliente
                    </h3>
                  </div>
                  <div className="p-4">
                    {provadorSelectedClient ? (
                      <div className="text-center">
                        <div className="relative inline-block mb-3">
                          <img 
                            src={provadorSelectedClient.photo} 
                            alt={provadorSelectedClient.firstName}
                            className="w-24 h-24 rounded-full object-cover border-4 border-purple-200"
                          />
                          <button 
                            onClick={() => setProvadorSelectedClient(null)}
                            className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                        <p className="font-bold text-slate-800">{provadorSelectedClient.firstName} {provadorSelectedClient.lastName}</p>
                        <p className="text-sm text-slate-500">{formatWhatsApp(provadorSelectedClient.whatsapp)}</p>
                      </div>
                    ) : (
                      <div>
                        {clientsWithProvador.length > 0 ? (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {clientsWithProvador.map(client => (
                              <div 
                                key={client.id}
                                onClick={() => setProvadorSelectedClient(client)}
                                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50 cursor-pointer transition-all"
                              >
                                <img src={client.photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-sm text-slate-800 truncate">{client.firstName} {client.lastName}</p>
                                  <p className="text-xs text-slate-500">{formatWhatsApp(client.whatsapp)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                              <i className="fas fa-user-plus text-slate-300 text-2xl"></i>
                            </div>
                            <p className="text-sm text-slate-500 mb-4">Nenhum cliente com foto cadastrado</p>
                            <button 
                              onClick={() => setCurrentPage('clients')}
                              className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-bold"
                            >
                              Cadastrar Cliente
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Coluna 2: Selecionar Produtos */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <i className="fas fa-shirt text-pink-500"></i>
                      2. Selecionar Produtos
                      <span className="ml-auto text-xs text-slate-400">{provadorSelectedProducts.length}/5</span>
                    </h3>
                  </div>
                  <div className="p-4">
                    {/* Produtos Selecionados */}
                    {provadorSelectedProducts.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Selecionados:</p>
                        <div className="flex flex-wrap gap-2">
                          {provadorSelectedProducts.map(product => (
                            <div key={product.id} className="flex items-center gap-2 bg-purple-50 rounded-lg px-2 py-1">
                              <img src={product.images[0]?.base64 || product.images[0]?.url} alt="" className="w-6 h-6 rounded object-cover" />
                              <span className="text-xs font-bold text-purple-700 truncate max-w-[100px]">{product.name}</span>
                              <button onClick={() => handleProvadorRemoveProduct(product.id)} className="text-purple-400 hover:text-red-500">
                                <i className="fas fa-times text-xs"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Lista de Produtos */}
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {products.filter(p => !provadorSelectedProducts.find(sp => sp.id === p.id)).map(product => (
                        <div 
                          key={product.id}
                          onClick={() => handleProvadorAddProduct(product)}
                          className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 hover:border-pink-300 hover:bg-pink-50 cursor-pointer transition-all"
                        >
                          <img src={product.images[0]?.base64 || product.images[0]?.url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{product.name}</p>
                            <p className="text-[10px] text-slate-400">{product.sku}</p>
                          </div>
                          <i className="fas fa-plus text-slate-300"></i>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Coluna 3: Preview e Ações */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <i className="fas fa-image text-amber-500"></i>
                      3. Gerar e Enviar
                    </h3>
                  </div>
                  <div className="p-4">
                    {/* Preview */}
                    <div className="aspect-square bg-slate-100 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                      {isGeneratingProvador ? (
                        <div className="text-center">
                          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3"></div>
                          <p className="text-sm text-slate-500">Gerando imagem...</p>
                        </div>
                      ) : provadorGeneratedImage ? (
                        <img src={provadorGeneratedImage} alt="Gerado" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-4">
                          <i className="fas fa-wand-magic-sparkles text-slate-300 text-4xl mb-3"></i>
                          <p className="text-sm text-slate-400">A imagem gerada aparecerá aqui</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Mensagem WhatsApp */}
                    <div className="mb-4">
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Mensagem WhatsApp</label>
                      <select 
                        value={selectedTemplate.id}
                        onChange={(e) => setSelectedTemplate(whatsappTemplates.find(t => t.id === e.target.value) || whatsappTemplates[0])}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-2"
                      >
                        {whatsappTemplates.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <textarea
                        value={provadorMessage || selectedTemplate.message}
                        onChange={(e) => setProvadorMessage(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
                        placeholder="Mensagem personalizada..."
                      />
                    </div>
                    
                    {/* Botões de Ação */}
                    <div className="space-y-2">
                      <button
                        onClick={handleProvadorGenerate}
                        disabled={!provadorSelectedClient || provadorSelectedProducts.length === 0 || isGeneratingProvador}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <i className="fas fa-wand-magic-sparkles"></i>
                        Gerar Imagem (3 créd.)
                      </button>
                      
                      <button
                        onClick={handleProvadorSendWhatsApp}
                        disabled={!provadorSelectedClient || !provadorGeneratedImage}
                        className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <i className="fab fa-whatsapp"></i>
                        Enviar WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PRODUCTS PAGE */}
        {currentPage === 'products' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
              {/* Page Header */}
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                    <i className="fas fa-box text-white text-lg md:text-xl"></i>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl md:text-2xl font-black text-slate-800">Produtos</h1>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] md:text-xs font-bold rounded-full uppercase">{currentPlan.name}</span>
                    </div>
                    <p className="text-slate-500 text-xs md:text-sm">Gerencie seu catálogo de produtos</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowImport(true)}
                  className="px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all text-sm md:text-base"
                >
                  <i className="fas fa-plus mr-2"></i>
                  <span className="hidden md:inline">Novo Produto</span>
                  <span className="md:hidden">Novo</span>
                </button>
              </div>

              {/* Filters */}
              <div className="bg-white rounded-2xl border border-slate-200 p-3 md:p-4 mb-4 md:mb-6">
                <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 md:pb-0">
                  <div className="flex-shrink-0 w-48 md:flex-1 md:min-w-[200px]">
                    <div className="relative">
                      <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                      <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 md:py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="flex-shrink-0 px-3 py-2 md:py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Categoria</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <select
                    value={filterColor}
                    onChange={(e) => setFilterColor(e.target.value)}
                    className="hidden sm:block flex-shrink-0 px-3 py-2 md:py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Cor</option>
                    {COLORS.map(color => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                  <select
                    value={filterCollection}
                    onChange={(e) => setFilterCollection(e.target.value)}
                    className="hidden md:block flex-shrink-0 px-3 py-2 md:py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Coleção</option>
                    {collections.map(col => (
                      <option key={col.id} value={col.name}>{col.name}</option>
                    ))}
                  </select>
                  {(searchTerm || filterCategory || filterColor || filterBrand || filterFit || filterCollection) && (
                    <button
                      onClick={clearFilters}
                      className="flex-shrink-0 px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg font-medium"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {filteredProducts.length} de {products.length} produtos
                </p>
              </div>

              {/* Products Grid */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 p-4 md:p-6">
                    {filteredProducts.map(product => (
                      <div 
                        key={product.id}
                        onClick={() => setShowProductDetail(product)}
                        className="bg-slate-50 rounded-xl overflow-hidden border border-slate-200 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all group"
                      >
                        <div className="aspect-square bg-white relative overflow-hidden">
                          <img 
                            src={product.images[0]?.base64 || product.images[0]?.url} 
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          {product.brand && (
                            <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-[9px] md:text-[10px] font-bold text-slate-600 px-1.5 py-0.5 rounded-full">
                              {product.brand}
                            </span>
                          )}
                        </div>
                        <div className="p-2 md:p-3">
                          <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase">{product.sku}</p>
                          <p className="text-[11px] md:text-xs font-bold text-slate-700 truncate">{product.name}</p>
                          <div className="flex gap-1 mt-1.5 md:mt-2 flex-wrap">
                            {product.category && (
                              <span className="text-[8px] md:text-[9px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">
                                {product.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 md:p-12 text-center">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 md:mb-6">
                      <i className="fas fa-search text-slate-300 text-2xl md:text-3xl"></i>
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-slate-700 mb-2">Nenhum produto</h3>
                    <p className="text-slate-500 text-sm mb-4 md:mb-6">Adicione novos produtos</p>
                    <button 
                      onClick={() => setShowImport(true)}
                      className="px-5 py-2.5 bg-purple-100 text-purple-700 rounded-xl font-bold hover:bg-purple-200 transition-colors text-sm"
                    >
                      <i className="fas fa-plus mr-2"></i>Adicionar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CLIENTS PAGE */}
        {currentPage === 'clients' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
              {/* Page Header */}
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                    <i className="fas fa-users text-white text-lg md:text-xl"></i>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl md:text-2xl font-black text-slate-800">Clientes</h1>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] md:text-xs font-bold rounded-full uppercase">{currentPlan.name}</span>
                    </div>
                    <p className="text-slate-500 text-xs md:text-sm">Gerencie seus clientes e Provador IA</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowCreateClient(true)}
                  className="px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all text-sm md:text-base"
                >
                  <i className="fas fa-plus mr-2"></i>
                  <span className="hidden md:inline">Novo Cliente</span>
                  <span className="md:hidden">Novo</span>
                </button>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                      <i className="fas fa-users text-sm"></i>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-slate-800">{clients.length}</p>
                  <p className="text-[10px] md:text-xs text-slate-500">Total Clientes</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                      <i className="fas fa-user-check text-sm"></i>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-slate-800">{clients.filter(c => c.status === 'active').length}</p>
                  <p className="text-[10px] md:text-xs text-slate-500">Ativos</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                      <i className="fas fa-camera text-sm"></i>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-slate-800">{clientsWithProvador.length}</p>
                  <p className="text-[10px] md:text-xs text-slate-500">Provador IA</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                      <i className="fas fa-crown text-sm"></i>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-slate-800">{clients.filter(c => c.status === 'vip').length}</p>
                  <p className="text-[10px] md:text-xs text-slate-500">VIP</p>
                </div>
              </div>

              {/* Search */}
              {clients.length > 0 && (
                <div className="mb-4">
                  <div className="relative">
                    <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input
                      type="text"
                      placeholder="Buscar por nome, WhatsApp ou e-mail..."
                      value={clientSearchTerm}
                      onChange={(e) => setClientSearchTerm(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* Clients List or Empty State */}
              {clients.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="p-8 md:p-12 text-center">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4 md:mb-6">
                      <i className="fas fa-users text-green-400 text-2xl md:text-3xl"></i>
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-slate-700 mb-2">Nenhum cliente cadastrado</h3>
                    <p className="text-slate-500 text-sm mb-6">Adicione clientes para usar o Vizzu Provador® e enviar pelo WhatsApp</p>
                    <button 
                      onClick={() => setShowCreateClient(true)}
                      className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold hover:shadow-lg transition-all text-sm"
                    >
                      <i className="fas fa-plus mr-2"></i>Adicionar Primeiro Cliente
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="divide-y divide-slate-100">
                    {filteredClients.map(client => (
                      <div 
                        key={client.id} 
                        className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => setShowClientDetail(client)}
                      >
                        <div className="flex items-center gap-4">
                          {/* Avatar */}
                          <div className="relative">
                            {client.photo ? (
                              <img 
                                src={client.photo} 
                                alt={client.firstName}
                                className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover border-2 border-white shadow-md"
                              />
                            ) : (
                              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                                <span className="text-lg md:text-xl font-bold text-slate-500">
                                  {client.firstName[0]}{client.lastName[0]}
                                </span>
                              </div>
                            )}
                            {client.hasProvadorIA && (
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center border-2 border-white">
                                <i className="fas fa-camera text-white text-[8px]"></i>
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-slate-800 truncate">
                                {client.firstName} {client.lastName}
                              </h3>
                              {client.status === 'vip' && (
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded-full">
                                  VIP
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-500">{formatWhatsApp(client.whatsapp)}</p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {client.hasProvadorIA && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleOpenProvadorPage(client); }}
                                className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center hover:bg-purple-200 transition-colors"
                                title="Vizzu Provador®"
                              >
                                <i className="fas fa-wand-magic-sparkles"></i>
                              </button>
                            )}
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                handleSendWhatsApp(client, `Olá ${client.firstName}!`); 
                              }}
                              className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200 transition-colors"
                              title="WhatsApp"
                            >
                              <i className="fab fa-whatsapp text-lg"></i>
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

        {/* CREATE CLIENT MODAL */}
        {showCreateClient && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between z-10">
                <h3 className="text-lg font-bold text-slate-800">Novo Cliente</h3>
                <button 
                  onClick={() => { setShowCreateClient(false); setNewClient({ firstName: '', lastName: '', whatsapp: '', email: '', photo: '', notes: '' }); }}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Photo Upload */}
                <div className="flex flex-col items-center mb-6">
                  <div 
                    onClick={() => clientPhotoInputRef.current?.click()}
                    className="relative cursor-pointer group"
                  >
                    {newClient.photo ? (
                      <img 
                        src={newClient.photo} 
                        alt="Preview" 
                        className="w-24 h-24 rounded-full object-cover border-4 border-purple-200 shadow-lg"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center border-4 border-slate-200">
                        <i className="fas fa-camera text-slate-400 text-2xl"></i>
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <i className="fas fa-camera text-white text-xl"></i>
                    </div>
                  </div>
                  <input
                    ref={clientPhotoInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={handleClientPhotoUpload}
                    className="hidden"
                  />
                  <p className="text-xs text-slate-500 mt-2">Foto para Vizzu Provador® (opcional)</p>
                  {newClient.photo && (
                    <div className="flex items-center gap-1 mt-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                      <i className="fas fa-check text-[10px]"></i>
                      <span className="text-[10px] font-bold">Provador IA ativado</span>
                    </div>
                  )}
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome *</label>
                    <input
                      type="text"
                      value={newClient.firstName}
                      onChange={(e) => setNewClient(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Maria"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Sobrenome *</label>
                    <input
                      type="text"
                      value={newClient.lastName}
                      onChange={(e) => setNewClient(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Silva"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">WhatsApp *</label>
                  <div className="relative">
                    <i className="fab fa-whatsapp absolute left-4 top-1/2 -translate-y-1/2 text-green-500"></i>
                    <input
                      type="tel"
                      value={newClient.whatsapp}
                      onChange={(e) => setNewClient(prev => ({ ...prev, whatsapp: e.target.value }))}
                      placeholder="(11) 99999-9999"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">E-mail (opcional)</label>
                  <div className="relative">
                    <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input
                      type="email"
                      value={newClient.email}
                      onChange={(e) => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="maria@email.com"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Observações (opcional)</label>
                  <textarea
                    value={newClient.notes}
                    onChange={(e) => setNewClient(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Preferências, tamanhos, etc..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleCreateClient}
                  disabled={!newClient.firstName || !newClient.lastName || !newClient.whatsapp}
                  className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="fas fa-user-plus mr-2"></i>Cadastrar Cliente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CLIENT DETAIL MODAL */}
        {showClientDetail && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-5 py-6 text-center relative">
                <button 
                  onClick={() => setShowClientDetail(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white"
                >
                  <i className="fas fa-times"></i>
                </button>
                
                {/* Avatar */}
                <div className="relative inline-block">
                  {showClientDetail.photo ? (
                    <img 
                      src={showClientDetail.photo} 
                      alt={showClientDetail.firstName}
                      className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg mx-auto"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mx-auto">
                      <span className="text-2xl font-bold text-slate-500">
                        {showClientDetail.firstName[0]}{showClientDetail.lastName[0]}
                      </span>
                    </div>
                  )}
                  {showClientDetail.hasProvadorIA && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center border-2 border-white">
                      <i className="fas fa-camera text-white text-[10px]"></i>
                    </div>
                  )}
                </div>
                
                <h2 className="text-xl font-bold text-white mt-3">
                  {showClientDetail.firstName} {showClientDetail.lastName}
                </h2>
                <p className="text-white/80 text-sm">{formatWhatsApp(showClientDetail.whatsapp)}</p>
              </div>

              <div className="p-5 space-y-4">
                {/* Status Badges */}
                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    showClientDetail.status === 'active' ? 'bg-green-100 text-green-700' :
                    showClientDetail.status === 'vip' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {showClientDetail.status === 'active' ? 'Ativo' : showClientDetail.status === 'vip' ? 'VIP' : 'Inativo'}
                  </span>
                  {showClientDetail.hasProvadorIA && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                      <i className="fas fa-camera mr-1"></i>Vizzu Provador®
                    </span>
                  )}
                </div>

                {/* Info */}
                {showClientDetail.email && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <i className="fas fa-envelope text-slate-400"></i>
                    <span className="text-sm text-slate-600">{showClientDetail.email}</span>
                  </div>
                )}
                
                {showClientDetail.notes && (
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-xs font-bold text-slate-500 mb-1">Observações</p>
                    <p className="text-sm text-slate-600">{showClientDetail.notes}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {showClientDetail.hasProvadorIA && (
                    <button
                      onClick={() => handleOpenProvadorPage(showClientDetail)}
                      className="col-span-2 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                      <i className="fas fa-wand-magic-sparkles"></i>
                      Vizzu Provador®
                    </button>
                  )}
                  <button
                    onClick={() => handleSendWhatsApp(showClientDetail, `Olá ${showClientDetail.firstName}!`)}
                    className="py-3 bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <i className="fab fa-whatsapp"></i>
                    WhatsApp
                  </button>
                  <button
                    onClick={() => handleDeleteClient(showClientDetail.id)}
                    className="py-3 bg-red-100 text-red-600 rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-trash"></i>
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HISTORY PAGE */}
        {currentPage === 'history' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                  <i className="fas fa-clock-rotate-left text-white text-lg md:text-xl"></i>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl md:text-2xl font-black text-slate-800">Histórico</h1>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] md:text-xs font-bold rounded-full uppercase">{currentPlan.name}</span>
                  </div>
                  <p className="text-slate-500 text-xs md:text-sm">Acompanhe todas as suas atividades</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-8 md:p-12 text-center">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 md:mb-6">
                    <i className="fas fa-clock-rotate-left text-slate-300 text-2xl md:text-3xl"></i>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-slate-700 mb-2">Nenhuma atividade</h3>
                  <p className="text-slate-500 text-sm">As atividades aparecerão aqui</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS PAGE */}
        {currentPage === 'settings' && (
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col md:flex-row h-full">
              
              {/* Settings Tabs */}
              <div className="md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 p-2 md:p-4">
                <div className="hidden md:flex items-center gap-3 mb-4 px-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center">
                    <i className="fas fa-cog text-white"></i>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Configurações</h2>
                    <p className="text-[10px] text-slate-400">Gerencie sua conta</p>
                  </div>
                </div>
                <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
                  <button
                    onClick={() => setSettingsTab('profile')}
                    className={`flex-shrink-0 flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                      settingsTab === 'profile' ? 'bg-purple-100 text-purple-700' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <i className="fas fa-user w-4 md:w-5"></i>Perfil
                  </button>
                  <button
                    onClick={() => setSettingsTab('company')}
                    className={`flex-shrink-0 flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                      settingsTab === 'company' ? 'bg-purple-100 text-purple-700' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <i className="fas fa-building w-4 md:w-5"></i>Empresa
                  </button>
                  <button
                    onClick={() => setSettingsTab('plan')}
                    className={`flex-shrink-0 flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                      settingsTab === 'plan' ? 'bg-purple-100 text-purple-700' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <i className="fas fa-credit-card w-4 md:w-5"></i>Plano
                  </button>
                  <button
                    onClick={() => setSettingsTab('integrations')}
                    className={`flex-shrink-0 flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                      settingsTab === 'integrations' ? 'bg-purple-100 text-purple-700' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <i className="fas fa-plug w-4 md:w-5"></i>Integrações
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex-shrink-0 flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-medium text-red-600 hover:bg-red-50 transition-all whitespace-nowrap md:mt-4 md:pt-4 md:border-t md:border-slate-200"
                  >
                    <i className="fas fa-sign-out-alt w-4 md:w-5"></i>Sair
                  </button>
                </nav>
              </div>

              {/* Settings Content */}
              <div className="flex-1 p-4 md:p-8 overflow-y-auto">
                <div className="max-w-2xl">
                  {settingsTab === 'profile' && (
                    <div>
                      <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-4 md:mb-6">Perfil & Senha</h3>
                      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 mb-4 md:mb-6">
                        <h4 className="font-bold text-slate-700 mb-4">Informações Pessoais</h4>
                        <div className="flex items-center gap-4 md:gap-6 mb-4 md:mb-6">
                          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
                            {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="" /> : <i className="fas fa-user text-white text-xl md:text-2xl"></i>}
                          </div>
                          <button className="px-3 md:px-4 py-2 border border-slate-200 rounded-lg text-xs md:text-sm font-bold text-slate-600 hover:bg-slate-50">Alterar Foto</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                          <div>
                            <label className="block text-xs md:text-sm font-bold text-slate-600 mb-2">Nome</label>
                            <input type="text" defaultValue={user.name} className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-slate-200 rounded-xl text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs md:text-sm font-bold text-slate-600 mb-2">Email</label>
                            <input type="email" defaultValue={user.email} className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm" disabled />
                          </div>
                        </div>
                      </div>
                      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6">
                        <h4 className="font-bold text-slate-700 mb-4">Alterar Senha</h4>
                        <div className="space-y-3 md:space-y-4">
                          <div>
                            <label className="block text-xs md:text-sm font-bold text-slate-600 mb-2">Senha Atual</label>
                            <input type="password" className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-slate-200 rounded-xl text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs md:text-sm font-bold text-slate-600 mb-2">Nova Senha</label>
                            <input type="password" className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-slate-200 rounded-xl text-sm" />
                          </div>
                          <button className="w-full md:w-auto px-6 py-2.5 md:py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 text-sm">Salvar</button>
                        </div>
                      </div>
                    </div>
                  )}
                  {settingsTab === 'company' && (
                    <div>
                      <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-4 md:mb-6">Infos da Empresa</h3>
                      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6">
                        <div className="space-y-3 md:space-y-4">
                          <div>
                            <label className="block text-xs md:text-sm font-bold text-slate-600 mb-2">Nome da Empresa</label>
                            <input type="text" className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-slate-200 rounded-xl text-sm" placeholder="Sua Empresa Ltda" />
                          </div>
                          <div>
                            <label className="block text-xs md:text-sm font-bold text-slate-600 mb-2">CNPJ</label>
                            <input type="text" className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-slate-200 rounded-xl text-sm" placeholder="00.000.000/0000-00" />
                          </div>
                          <button className="w-full md:w-auto px-6 py-2.5 md:py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 text-sm">Salvar</button>
                        </div>
                      </div>
                    </div>
                  )}
                  {settingsTab === 'plan' && (
                    <div>
                      <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-4 md:mb-6">Plano & Créditos</h3>
                      <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-4 md:p-6 mb-4 md:mb-6 text-white">
                        <div className="flex items-center justify-between mb-3 md:mb-4">
                          <div>
                            <p className="text-xs md:text-sm text-white/70">Plano Atual</p>
                            <p className="text-2xl md:text-3xl font-black">{currentPlan.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs md:text-sm text-white/70">Créditos</p>
                            <p className="text-2xl md:text-3xl font-black">{userCredits}</p>
                          </div>
                        </div>
                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                          <div className="h-full bg-white rounded-full" style={{ width: `${Math.min(100, (userCredits / currentPlan.limit) * 100)}%` }}></div>
                        </div>
                      </div>
                      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6">
                        <h4 className="font-bold text-slate-700 mb-4">Escolha seu Plano</h4>
                        <div className="grid grid-cols-2 gap-3 md:gap-4">
                          {PLANS.map(plan => (
                            <div 
                              key={plan.id}
                              onClick={() => upgradePlan(plan.id)}
                              className={`p-3 md:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                currentPlan.id === plan.id ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:border-purple-300'
                              }`}
                            >
                              <h5 className="font-bold text-slate-800 text-sm md:text-base">{plan.name}</h5>
                              <p className="text-xl md:text-2xl font-black text-slate-800 my-1 md:my-2">{plan.limit}</p>
                              <p className="text-[10px] md:text-xs text-slate-500">créd./mês</p>
                              <p className="text-xs md:text-sm font-bold text-purple-600 mt-1 md:mt-2">{plan.price}</p>
                              {currentPlan.id === plan.id && (
                                <span className="inline-block mt-2 text-[9px] md:text-[10px] font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">ATUAL</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {settingsTab === 'integrations' && (
                    <div>
                      <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-4 md:mb-6">Integrações</h3>
                      <div className="space-y-3 md:space-y-4">
                        {[
                          { icon: 'fab fa-shopify', color: 'green', name: 'Shopify', desc: 'Sincronize produtos' },
                          { icon: 'fab fa-wordpress', color: 'purple', name: 'WooCommerce', desc: 'Loja WordPress' },
                          { icon: 'fas fa-cube', color: 'orange', name: 'Magento', desc: 'Adobe Commerce' },
                          { icon: 'fas fa-store', color: 'pink', name: 'VTEX', desc: 'VTEX IO' },
                        ].map(item => (
                          <div key={item.name} className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 flex items-center justify-between">
                            <div className="flex items-center gap-3 md:gap-4">
                              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-${item.color}-100 flex items-center justify-center`}>
                                <i className={`${item.icon} text-${item.color}-600 text-lg md:text-2xl`}></i>
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-800 text-sm md:text-base">{item.name}</h4>
                                <p className="text-xs md:text-sm text-slate-500">{item.desc}</p>
                              </div>
                            </div>
                            <button className="px-3 md:px-4 py-1.5 md:py-2 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 text-xs md:text-sm">Conectar</button>
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 px-2 py-2 z-40">
        <div className="flex items-center justify-around">
          <button onClick={() => setCurrentPage('dashboard')} className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${currentPage === 'dashboard' ? 'text-white' : 'text-slate-500'}`}>
            <i className="fas fa-home text-lg"></i>
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <button onClick={() => setCurrentPage('products')} className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${currentPage === 'products' ? 'text-white' : 'text-slate-500'}`}>
            <i className="fas fa-box text-lg"></i>
            <span className="text-[10px] font-medium">Produtos</span>
          </button>
          {/* PROVADOR - CENTER HIGHLIGHT */}
          <button onClick={() => setCurrentPage('provador')} className="relative -mt-6">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
              currentPage === 'provador' ? 'bg-gradient-to-r from-purple-600 to-pink-600 scale-110' : 'bg-gradient-to-r from-purple-500 to-pink-500'
            }`}>
              <i className="fas fa-user-tag text-white text-xl"></i>
            </div>
            <span className={`block text-[10px] font-bold mt-1 text-center ${currentPage === 'provador' ? 'text-white' : 'text-slate-400'}`}>Provador</span>
          </button>
          <button onClick={() => setCurrentPage('clients')} className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${currentPage === 'clients' ? 'text-white' : 'text-slate-500'}`}>
            <i className="fas fa-users text-lg"></i>
            <span className="text-[10px] font-medium">Clientes</span>
          </button>
          <button onClick={() => setCurrentPage('settings')} className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${currentPage === 'settings' ? 'text-white' : 'text-slate-500'}`}>
            <i className="fas fa-cog text-lg"></i>
            <span className="text-[10px] font-medium">Config</span>
          </button>
        </div>
      </nav>

      {/* IMPORT MODAL */}
      {showImport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-md p-5 md:p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 md:mb-6">
              <h3 className="text-lg md:text-xl font-bold text-slate-800">Adicionar Produto</h3>
              <button onClick={() => setShowImport(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <p className="text-slate-500 text-sm mb-5 md:mb-6">Escolha como adicionar a imagem:</p>
            <div className="grid grid-cols-2 gap-3 md:gap-4 mb-5 md:mb-6">
              <label className="flex flex-col items-center gap-2 md:gap-3 p-4 md:p-6 border-2 border-dashed border-slate-200 rounded-2xl hover:border-purple-400 hover:bg-purple-50/50 transition-all active:scale-95 cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && handleFileSelect(e.target.files)} />
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-purple-100 flex items-center justify-center">
                  <i className="fas fa-images text-purple-600 text-lg md:text-xl"></i>
                </div>
                <span className="text-xs md:text-sm font-bold text-slate-700">Galeria</span>
                <span className="text-[10px] md:text-xs text-slate-400">Escolher foto</span>
              </label>
              <label className="flex flex-col items-center gap-2 md:gap-3 p-4 md:p-6 border-2 border-dashed border-slate-200 rounded-2xl hover:border-pink-400 hover:bg-pink-50/50 transition-all active:scale-95 cursor-pointer">
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files && handleFileSelect(e.target.files)} />
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-pink-100 flex items-center justify-center">
                  <i className="fas fa-camera text-pink-600 text-lg md:text-xl"></i>
                </div>
                <span className="text-xs md:text-sm font-bold text-slate-700">Câmera</span>
                <span className="text-[10px] md:text-xs text-slate-400">Tirar foto agora</span>
              </label>
            </div>
            <div 
              className="hidden md:block border-2 border-dashed border-slate-200 rounded-2xl p-6 md:p-8 text-center hover:border-purple-400 hover:bg-purple-50/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files); }}
            >
              <p className="text-sm text-slate-500">Ou arraste uma imagem aqui</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && handleFileSelect(e.target.files)} />
          </div>
        </div>
      )}

      {/* CREATE PRODUCT MODAL */}
      {showCreateProduct && selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-lg p-5 md:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 md:mb-6">
              <h3 className="text-lg md:text-xl font-bold text-slate-800">Criar Produto</h3>
              <button onClick={() => { setShowCreateProduct(false); setSelectedImage(null); }} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="mb-5 md:mb-6">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden border border-slate-200 mx-auto">
                <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="space-y-3 md:space-y-4">
              <div>
                <label className="block text-xs md:text-sm font-bold text-slate-600 mb-1.5 md:mb-2">Nome do Produto *</label>
                <input type="text" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm" placeholder="Ex: Camiseta Básica Branca" />
              </div>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-600 mb-1.5 md:mb-2">Marca</label>
                  <input type="text" value={newProduct.brand} onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})} className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm" placeholder="Ex: Nike" />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-600 mb-1.5 md:mb-2">Cor</label>
                  <select value={newProduct.color} onChange={(e) => setNewProduct({...newProduct, color: e.target.value})} className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm">
                    <option value="">Selecione</option>
                    {COLORS.map(color => <option key={color} value={color}>{color}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-600 mb-1.5 md:mb-2">Caimento</label>
                  <select value={newProduct.fit} onChange={(e) => setNewProduct({...newProduct, fit: e.target.value})} className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm">
                    <option value="">Selecione</option>
                    {FITS.map(fit => <option key={fit} value={fit}>{fit}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-600 mb-1.5 md:mb-2">Categoria *</label>
                  <select value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})} className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm">
                    <option value="">Selecione</option>
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs md:text-sm font-bold text-slate-600 mb-1.5 md:mb-2">Coleção</label>
                <select value={newProduct.collection} onChange={(e) => setNewProduct({...newProduct, collection: e.target.value})} className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm">
                  <option value="">Selecione (opcional)</option>
                  {COLLECTIONS.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
              <button onClick={handleCreateProduct} className="w-full py-3.5 md:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-colors text-sm md:text-base">
                <i className="fas fa-check mr-2"></i>Criar Produto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT DETAIL MODAL */}
      {showProductDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-2xl p-5 md:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h3 className="text-lg md:text-xl font-bold text-slate-800">Detalhes do Produto</h3>
              <button onClick={() => setShowProductDetail(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="flex flex-col md:flex-row gap-4 md:gap-6">
              <div className="w-full md:w-48 h-48 rounded-2xl overflow-hidden border border-slate-200 flex-shrink-0">
                <img src={showProductDetail.images[0]?.base64 || showProductDetail.images[0]?.url} alt={showProductDetail.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">{showProductDetail.sku}</p>
                <h4 className="text-xl md:text-2xl font-bold text-slate-800 mb-3 md:mb-4">{showProductDetail.name}</h4>
                <div className="grid grid-cols-2 gap-2 md:gap-3 mb-4 md:mb-6">
                  {showProductDetail.brand && <div className="bg-slate-50 rounded-xl p-2.5 md:p-3"><p className="text-[9px] md:text-[10px] text-slate-400 uppercase mb-0.5">Marca</p><p className="text-xs md:text-sm font-bold text-slate-700">{showProductDetail.brand}</p></div>}
                  {showProductDetail.category && <div className="bg-slate-50 rounded-xl p-2.5 md:p-3"><p className="text-[9px] md:text-[10px] text-slate-400 uppercase mb-0.5">Categoria</p><p className="text-xs md:text-sm font-bold text-slate-700">{showProductDetail.category}</p></div>}
                  {showProductDetail.color && <div className="bg-slate-50 rounded-xl p-2.5 md:p-3"><p className="text-[9px] md:text-[10px] text-slate-400 uppercase mb-0.5">Cor</p><p className="text-xs md:text-sm font-bold text-slate-700">{showProductDetail.color}</p></div>}
                  {showProductDetail.fit && <div className="bg-slate-50 rounded-xl p-2.5 md:p-3"><p className="text-[9px] md:text-[10px] text-slate-400 uppercase mb-0.5">Caimento</p><p className="text-xs md:text-sm font-bold text-slate-700">{showProductDetail.fit}</p></div>}
                </div>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-2 md:gap-3 mt-4 md:mt-6 pt-4 md:pt-6 border-t border-slate-200">
              <button onClick={() => handleOpenInStudio(showProductDetail)} className="flex-1 py-3.5 md:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-colors text-sm">
                <i className="fas fa-wand-magic-sparkles mr-2"></i>Otimizar no Studio
              </button>
              <button onClick={() => handleGenerateDescription(showProductDetail)} disabled={isGeneratingDescription} className="flex-1 py-3.5 md:py-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors disabled:opacity-50 text-sm">
                {isGeneratingDescription ? <><i className="fas fa-spinner fa-spin mr-2"></i>Gerando...</> : <><i className="fas fa-file-lines mr-2"></i>Gerar Descrição</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
