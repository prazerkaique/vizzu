import React, { useState, useEffect, useRef } from 'react';
import { Studio } from './components/Studio';
import { Product, User, HistoryLog } from './types';
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

type Page = 'dashboard' | 'studio' | 'products' | 'clients' | 'history' | 'settings';
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
    category: ''
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
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
    
    return matchesSearch && matchesCategory && matchesColor && matchesBrand && matchesFit;
  });

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
      images: [{ name: `${newProduct.name}.jpg`, base64: selectedImage }]
    };

    setProducts(prev => [...prev, product]);
    setShowCreateProduct(false);
    setSelectedImage(null);
    setNewProduct({ name: '', brand: '', color: '', fit: '', category: '' });
  };

  const handleGenerateDescription = async (product: Product) => {
    setIsGeneratingDescription(true);
    // Aqui você vai chamar o webhook do n8n
    // Por enquanto só simula um delay
    setTimeout(() => {
      setIsGeneratingDescription(false);
      alert('Descrição enviada para geração! Você receberá o resultado em breve.');
    }, 2000);
  };

  const handleOpenInStudio = (product: Product) => {
    setShowProductDetail(null);
    setCurrentPage('studio');
    // O Studio deve receber o produto selecionado
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCategory('');
    setFilterColor('');
    setFilterBrand('');
    setFilterFit('');
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

  // LOGIN SCREEN
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-slate-900 flex items-center justify-center p-4">
        <div className="relative z-10 w-full max-w-md">
          <div className="text-center mb-8">
            <img 
              src="/logo.png" 
              alt="Vizzu" 
              className="h-16 mx-auto mb-4"
            />
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

  // MAIN APP WITH SIDEBAR
  return (
    <div className="h-screen flex bg-slate-100">
      
      {/* SIDEBAR */}
      <aside className="w-56 bg-gradient-to-b from-slate-900 via-purple-950 to-slate-900 flex flex-col shadow-2xl">
        
        <div className="p-6 border-b border-white/10 flex justify-center">
          <img 
            src="/logo.png" 
            alt="Vizzu" 
            className="h-12"
          />
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
            Vizzu Studio
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
      <main className="flex-1 overflow-hidden flex flex-col">
        
        {/* DASHBOARD PAGE */}
        {currentPage === 'dashboard' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-6xl mx-auto">
              <h1 className="text-3xl font-black text-slate-800 mb-2">Bem-vindo, {user.name.split(' ')[0]}!</h1>
              <p className="text-slate-500 mb-8">Resumo do seu estúdio de imagens AI</p>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                      <i className="fas fa-box"></i>
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase">Total Produtos</span>
                  </div>
                  <p className="text-3xl font-black text-slate-800">{products.length}</p>
                  <p className="text-xs text-slate-500 mt-1">No catálogo</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                      <i className="fas fa-image"></i>
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase">Imagens Geradas</span>
                  </div>
                  <p className="text-3xl font-black text-slate-800">0</p>
                  <p className="text-xs text-slate-500 mt-1">Este mês</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                      <i className="fas fa-coins"></i>
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase">Créditos</span>
                  </div>
                  <p className="text-3xl font-black text-slate-800">{userCredits}</p>
                  <p className="text-xs text-slate-500 mt-1">Disponíveis</p>
                </div>

                <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-5 shadow-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center">
                      <i className="fas fa-crown"></i>
                    </div>
                    <span className="text-xs font-bold text-white/70 uppercase">Plano</span>
                  </div>
                  <p className="text-3xl font-black text-white">{currentPlan.name}</p>
                  <p className="text-xs text-white/70 mt-1">{currentPlan.limit} créd./mês</p>
                </div>
              </div>

              {/* Quick Actions */}
              <h2 className="text-lg font-bold text-slate-700 mb-4">Ações Rápidas</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                  onClick={() => setCurrentPage('studio')}
                  className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-purple-300 hover:shadow-lg transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <i className="fas fa-wand-magic-sparkles text-xl"></i>
                  </div>
                  <h3 className="font-bold text-slate-800 mb-1">Abrir Studio</h3>
                  <p className="text-sm text-slate-500">Gerar imagens com IA</p>
                </button>

                <button 
                  onClick={() => setShowImport(true)}
                  className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-pink-300 hover:shadow-lg transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <i className="fas fa-cloud-upload-alt text-xl"></i>
                  </div>
                  <h3 className="font-bold text-slate-800 mb-1">Importar Produtos</h3>
                  <p className="text-sm text-slate-500">Adicionar novas imagens</p>
                </button>

                <button 
                  onClick={() => { setCurrentPage('settings'); setSettingsTab('plan'); }}
                  className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-orange-300 hover:shadow-lg transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <i className="fas fa-bolt text-xl"></i>
                  </div>
                  <h3 className="font-bold text-slate-800 mb-1">Comprar Créditos</h3>
                  <p className="text-sm text-slate-500">Upgrade de plano</p>
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
          />
        )}

        {/* PRODUCTS PAGE - IMPROVED */}
        {currentPage === 'products' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-black text-slate-800 mb-2">Produtos</h1>
                  <p className="text-slate-500">Gerencie seu catálogo de produtos</p>
                </div>
                <button 
                  onClick={() => setShowImport(true)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                >
                  <i className="fas fa-plus mr-2"></i>Novo Produto
                </button>
              </div>

              {/* Filters */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
                <div className="flex flex-wrap gap-3">
                  {/* Search */}
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                      <input
                        type="text"
                        placeholder="Buscar por nome ou SKU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Category Filter */}
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Todas Categorias</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  {/* Color Filter */}
                  <select
                    value={filterColor}
                    onChange={(e) => setFilterColor(e.target.value)}
                    className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Todas Cores</option>
                    {COLORS.map(color => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>

                  {/* Brand Filter */}
                  <select
                    value={filterBrand}
                    onChange={(e) => setFilterBrand(e.target.value)}
                    className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Todas Marcas</option>
                    {uniqueBrands.map(brand => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>

                  {/* Fit Filter */}
                  <select
                    value={filterFit}
                    onChange={(e) => setFilterFit(e.target.value)}
                    className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Todos Caimentos</option>
                    {FITS.map(fit => (
                      <option key={fit} value={fit}>{fit}</option>
                    ))}
                  </select>

                  {/* Clear Filters */}
                  {(searchTerm || filterCategory || filterColor || filterBrand || filterFit) && (
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2.5 text-sm text-purple-600 hover:bg-purple-50 rounded-lg font-medium"
                    >
                      <i className="fas fa-times mr-2"></i>Limpar
                    </button>
                  )}
                </div>

                {/* Results count */}
                <p className="text-xs text-slate-400 mt-3">
                  Mostrando {filteredProducts.length} de {products.length} produtos
                </p>
              </div>

              {/* Products Grid */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-6">
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
                            <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-[10px] font-bold text-slate-600 px-2 py-1 rounded-full">
                              {product.brand}
                            </span>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{product.sku}</p>
                          <p className="text-xs font-bold text-slate-700 truncate">{product.name}</p>
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {product.category && (
                              <span className="text-[9px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">
                                {product.category}
                              </span>
                            )}
                            {product.color && (
                              <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                {product.color}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
                      <i className="fas fa-search text-slate-300 text-3xl"></i>
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 mb-2">Nenhum produto encontrado</h3>
                    <p className="text-slate-500 mb-6">Tente ajustar os filtros ou adicione novos produtos</p>
                    <button 
                      onClick={() => setShowImport(true)}
                      className="px-6 py-3 bg-purple-100 text-purple-700 rounded-xl font-bold hover:bg-purple-200 transition-colors"
                    >
                      <i className="fas fa-plus mr-2"></i>Adicionar Produto
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CLIENTS PAGE */}
        {currentPage === 'clients' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-black text-slate-800 mb-2">Clientes</h1>
                  <p className="text-slate-500">Gerencie seus clientes e acessos</p>
                </div>
                <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all">
                  <i className="fas fa-plus mr-2"></i>Novo Cliente
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-users text-slate-300 text-3xl"></i>
                </div>
                <h3 className="text-xl font-bold text-slate-700 mb-2">Nenhum cliente cadastrado</h3>
                <p className="text-slate-500 mb-6">Adicione clientes para gerenciar acessos e permissões</p>
                <button className="px-6 py-3 bg-purple-100 text-purple-700 rounded-xl font-bold hover:bg-purple-200 transition-colors">
                  <i className="fas fa-plus mr-2"></i>Adicionar Primeiro Cliente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HISTORY PAGE */}
        {currentPage === 'history' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-black text-slate-800 mb-2">Histórico</h1>
                  <p className="text-slate-500">Acompanhe todas as atividades da plataforma</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">
                    <i className="fas fa-filter mr-2"></i>Filtrar
                  </button>
                  <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">
                    <i className="fas fa-download mr-2"></i>Exportar
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-12 text-center">
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
                    <i className="fas fa-clock-rotate-left text-slate-300 text-3xl"></i>
                  </div>
                  <h3 className="text-xl font-bold text-slate-700 mb-2">Nenhuma atividade ainda</h3>
                  <p className="text-slate-500">As atividades aparecerão aqui conforme você usar a plataforma</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS PAGE */}
        {currentPage === 'settings' && (
          <div className="flex-1 overflow-y-auto">
            <div className="flex h-full">
              
              {/* Settings Sidebar */}
              <div className="w-64 bg-white border-r border-slate-200 p-4">
                <h2 className="text-lg font-bold text-slate-800 mb-4 px-3">Configurações</h2>
                <nav className="space-y-1">
                  <button
                    onClick={() => setSettingsTab('profile')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      settingsTab === 'profile'
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <i className="fas fa-user w-5"></i>
                    Perfil & Senha
                  </button>

                  <button
                    onClick={() => setSettingsTab('company')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      settingsTab === 'company'
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <i className="fas fa-building w-5"></i>
                    Infos da Empresa
                  </button>

                  <button
                    onClick={() => setSettingsTab('plan')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      settingsTab === 'plan'
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <i className="fas fa-credit-card w-5"></i>
                    Plano & Créditos
                  </button>

                  <button
                    onClick={() => setSettingsTab('integrations')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      settingsTab === 'integrations'
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <i className="fas fa-plug w-5"></i>
                    Integrações
                  </button>

                  <div className="pt-4 mt-4 border-t border-slate-200">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
                    >
                      <i className="fas fa-sign-out-alt w-5"></i>
                      Sair da Conta
                    </button>
                  </div>
                </nav>
              </div>

              {/* Settings Content */}
              <div className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-2xl">
                  
                  {/* Profile Tab */}
                  {settingsTab === 'profile' && (
                    <div>
                      <h3 className="text-2xl font-bold text-slate-800 mb-6">Perfil & Senha</h3>
                      
                      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
                        <h4 className="font-bold text-slate-700 mb-4">Informações Pessoais</h4>
                        
                        <div className="flex items-center gap-6 mb-6">
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
                            {user.avatar ? (
                              <img src={user.avatar} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <i className="fas fa-user text-white text-2xl"></i>
                            )}
                          </div>
                          <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">
                            Alterar Foto
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">Nome</label>
                            <input 
                              type="text" 
                              defaultValue={user.name}
                              className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">Email</label>
                            <input 
                              type="email" 
                              defaultValue={user.email}
                              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50"
                              disabled
                            />
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 p-6">
                        <h4 className="font-bold text-slate-700 mb-4">Alterar Senha</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">Senha Atual</label>
                            <input type="password" className="w-full px-4 py-3 border border-slate-200 rounded-xl" />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">Nova Senha</label>
                            <input type="password" className="w-full px-4 py-3 border border-slate-200 rounded-xl" />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">Confirmar Nova Senha</label>
                            <input type="password" className="w-full px-4 py-3 border border-slate-200 rounded-xl" />
                          </div>
                          <button className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700">
                            Salvar Alterações
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Company Tab */}
                  {settingsTab === 'company' && (
                    <div>
                      <h3 className="text-2xl font-bold text-slate-800 mb-6">Infos da Empresa</h3>
                      
                      <div className="bg-white rounded-2xl border border-slate-200 p-6">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">Nome da Empresa</label>
                            <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl" placeholder="Sua Empresa Ltda" />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">CNPJ</label>
                            <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl" placeholder="00.000.000/0000-00" />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">Endereço</label>
                            <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl" placeholder="Rua, número, cidade" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-bold text-slate-600 mb-2">Telefone</label>
                              <input type="tel" className="w-full px-4 py-3 border border-slate-200 rounded-xl" placeholder="(00) 00000-0000" />
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-slate-600 mb-2">Website</label>
                              <input type="url" className="w-full px-4 py-3 border border-slate-200 rounded-xl" placeholder="https://sua-empresa.com" />
                            </div>
                          </div>
                          <button className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700">
                            Salvar Informações
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Plan Tab */}
                  {settingsTab === 'plan' && (
                    <div>
                      <h3 className="text-2xl font-bold text-slate-800 mb-6">Plano & Créditos</h3>
                      
                      {/* Current Status */}
                      <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-6 mb-6 text-white">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm text-white/70">Plano Atual</p>
                            <p className="text-3xl font-black">{currentPlan.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-white/70">Créditos Restantes</p>
                            <p className="text-3xl font-black">{userCredits}</p>
                          </div>
                        </div>
                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-white rounded-full"
                            style={{ width: `${Math.min(100, (userCredits / currentPlan.limit) * 100)}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-white/70 mt-2">{userCredits} de {currentPlan.limit} créditos disponíveis</p>
                      </div>

                      {/* Plans */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-6">
                        <h4 className="font-bold text-slate-700 mb-4">Escolha seu Plano</h4>
                        <div className="grid grid-cols-2 gap-4">
                          {PLANS.map(plan => (
                            <div 
                              key={plan.id}
                              onClick={() => upgradePlan(plan.id)}
                              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                currentPlan.id === plan.id 
                                  ? 'border-purple-500 bg-purple-50' 
                                  : 'border-slate-200 hover:border-purple-300'
                              }`}
                            >
                              <h5 className="font-bold text-slate-800">{plan.name}</h5>
                              <p className="text-2xl font-black text-slate-800 my-2">{plan.limit}</p>
                              <p className="text-xs text-slate-500">créditos/mês</p>
                              <p className="text-sm font-bold text-purple-600 mt-2">{plan.price}</p>
                              {currentPlan.id === plan.id && (
                                <span className="inline-block mt-2 text-[10px] font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                                  ATUAL
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Integrations Tab */}
                  {settingsTab === 'integrations' && (
                    <div>
                      <h3 className="text-2xl font-bold text-slate-800 mb-6">Integrações</h3>
                      
                      <div className="space-y-4">
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                              <i className="fab fa-shopify text-green-600 text-2xl"></i>
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800">Shopify</h4>
                              <p className="text-sm text-slate-500">Sincronize produtos automaticamente</p>
                            </div>
                          </div>
                          <button className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200">
                            Conectar
                          </button>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                              <i className="fab fa-wordpress text-purple-600 text-2xl"></i>
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800">WooCommerce</h4>
                              <p className="text-sm text-slate-500">Integre com sua loja WordPress</p>
                            </div>
                          </div>
                          <button className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200">
                            Conectar
                          </button>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                              <i className="fas fa-cube text-orange-600 text-2xl"></i>
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800">Magento / Adobe Commerce</h4>
                              <p className="text-sm text-slate-500">Conecte sua loja Magento</p>
                            </div>
                          </div>
                          <button className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200">
                            Conectar
                          </button>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center">
                              <i className="fas fa-store text-pink-600 text-2xl"></i>
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800">VTEX</h4>
                              <p className="text-sm text-slate-500">Integração com VTEX IO</p>
                            </div>
                          </div>
                          <button className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200">
                            Conectar
                          </button>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                              <i className="fas fa-code text-slate-600 text-2xl"></i>
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800">API REST</h4>
                              <p className="text-sm text-slate-500">Acesso direto via API</p>
                            </div>
                          </div>
                          <button className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200">
                            Ver Docs
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* IMPORT MODAL - Escolher arquivo ou câmera */}
      {showImport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">Adicionar Produto</h3>
              <button onClick={() => setShowImport(false)} className="text-slate-400 hover:text-slate-600">
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <p className="text-slate-500 text-sm mb-6">Escolha como você quer adicionar a imagem do produto:</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Upload de Arquivo */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-slate-200 rounded-2xl hover:border-purple-400 hover:bg-purple-50/50 transition-all"
              >
                <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center">
                  <i className="fas fa-folder-open text-purple-600 text-xl"></i>
                </div>
                <span className="text-sm font-bold text-slate-700">Escolher Arquivo</span>
                <span className="text-xs text-slate-400">PNG, JPG, WEBP</span>
              </button>

              {/* Tirar Foto */}
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-slate-200 rounded-2xl hover:border-pink-400 hover:bg-pink-50/50 transition-all"
              >
                <div className="w-14 h-14 rounded-full bg-pink-100 flex items-center justify-center">
                  <i className="fas fa-camera text-pink-600 text-xl"></i>
                </div>
                <span className="text-sm font-bold text-slate-700">Tirar Foto</span>
                <span className="text-xs text-slate-400">Usar câmera</span>
              </button>
            </div>

            {/* Hidden inputs */}
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              className="hidden"
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
            />
            <input 
              ref={cameraInputRef}
              type="file" 
              accept="image/*" 
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
            />

            {/* Drag and drop area */}
            <div 
              className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-purple-400 hover:bg-purple-50/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files); }}
            >
              <p className="text-sm text-slate-500">Ou arraste uma imagem aqui</p>
            </div>
          </div>
        </div>
      )}

      {/* CREATE PRODUCT MODAL */}
      {showCreateProduct && selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">Criar Produto</h3>
              <button 
                onClick={() => { setShowCreateProduct(false); setSelectedImage(null); }} 
                className="text-slate-400 hover:text-slate-600"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Preview da imagem */}
            <div className="mb-6">
              <div className="w-32 h-32 rounded-xl overflow-hidden border border-slate-200 mx-auto">
                <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Formulário */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Nome do Produto *</label>
                <input 
                  type="text" 
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                  placeholder="Ex: Camiseta Básica Branca"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Marca</label>
                  <input 
                    type="text" 
                    value={newProduct.brand}
                    onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                    placeholder="Ex: Nike"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Cor</label>
                  <select 
                    value={newProduct.color}
                    onChange={(e) => setNewProduct({...newProduct, color: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Selecione</option>
                    {COLORS.map(color => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Caimento</label>
                  <select 
                    value={newProduct.fit}
                    onChange={(e) => setNewProduct({...newProduct, fit: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Selecione</option>
                    {FITS.map(fit => (
                      <option key={fit} value={fit}>{fit}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Categoria *</label>
                  <select 
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Selecione</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button 
                onClick={handleCreateProduct}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-colors"
              >
                <i className="fas fa-check mr-2"></i>Criar Produto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT DETAIL MODAL */}
      {showProductDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">Detalhes do Produto</h3>
              <button 
                onClick={() => setShowProductDetail(null)} 
                className="text-slate-400 hover:text-slate-600"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="flex gap-6">
              {/* Imagem */}
              <div className="w-48 h-48 rounded-2xl overflow-hidden border border-slate-200 flex-shrink-0">
                <img 
                  src={showProductDetail.images[0]?.base64 || showProductDetail.images[0]?.url} 
                  alt={showProductDetail.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Info */}
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">{showProductDetail.sku}</p>
                <h4 className="text-2xl font-bold text-slate-800 mb-4">{showProductDetail.name}</h4>
                
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {showProductDetail.brand && (
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[10px] text-slate-400 uppercase mb-1">Marca</p>
                      <p className="text-sm font-bold text-slate-700">{showProductDetail.brand}</p>
                    </div>
                  )}
                  {showProductDetail.category && (
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[10px] text-slate-400 uppercase mb-1">Categoria</p>
                      <p className="text-sm font-bold text-slate-700">{showProductDetail.category}</p>
                    </div>
                  )}
                  {showProductDetail.color && (
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[10px] text-slate-400 uppercase mb-1">Cor</p>
                      <p className="text-sm font-bold text-slate-700">{showProductDetail.color}</p>
                    </div>
                  )}
                  {showProductDetail.fit && (
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[10px] text-slate-400 uppercase mb-1">Caimento</p>
                      <p className="text-sm font-bold text-slate-700">{showProductDetail.fit}</p>
                    </div>
                  )}
                </div>

                {showProductDetail.description && (
                  <div className="mb-6">
                    <p className="text-[10px] text-slate-400 uppercase mb-1">Descrição</p>
                    <p className="text-sm text-slate-600">{showProductDetail.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
              <button 
                onClick={() => handleOpenInStudio(showProductDetail)}
                className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-colors"
              >
                <i className="fas fa-wand-magic-sparkles mr-2"></i>
                Otimizar no Studio
              </button>
              <button 
                onClick={() => handleGenerateDescription(showProductDetail)}
                disabled={isGeneratingDescription}
                className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                {isGeneratingDescription ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Gerando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-file-lines mr-2"></i>
                    Gerar Descrição
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
