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

              {/* Stats Cards - 2 cols on mobile */}
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
                      <i className="fas fa-image text-sm md:text-base"></i>
                    </div>
                  </div>
                  <p className="text-2xl md:text-3xl font-black text-slate-800">0</p>
                  <p className="text-[10px] md:text-xs text-slate-500">Geradas</p>
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
                  <h3 className="font-bold text-slate-800 mb-1 text-sm md:text-base">Abrir Studio</h3>
                  <p className="text-xs md:text-sm text-slate-500">Gerar imagens com IA</p>
                </button>

                <button 
                  onClick={() => setShowImport(true)}
                  className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 hover:border-pink-300 hover:shadow-lg transition-all text-left group"
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform">
                    <i className="fas fa-cloud-upload-alt text-lg md:text-xl"></i>
                  </div>
                  <h3 className="font-bold text-slate-800 mb-1 text-sm md:text-base">Importar Produtos</h3>
                  <p className="text-xs md:text-sm text-slate-500">Adicionar novas imagens</p>
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

              {/* Filters - Scrollable on mobile */}
              <div className="bg-white rounded-2xl border border-slate-200 p-3 md:p-4 mb-4 md:mb-6">
                <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 md:pb-0">
                  {/* Search */}
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

                  {/* Category Filter */}
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

                  {/* Color Filter - Hidden on very small screens */}
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

                  {/* Clear Filters */}
                  {(searchTerm || filterCategory || filterColor || filterBrand || filterFit) && (
                    <button
                      onClick={clearFilters}
                      className="flex-shrink-0 px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg font-medium"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>

                {/* Results count */}
                <p className="text-xs text-slate-400 mt-2">
                  {filteredProducts.length} de {products.length} produtos
                </p>
              </div>

              {/* Products Grid - 2 cols mobile, more on desktop */}
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
                    <p className="text-slate-500 text-xs md:text-sm">Gerencie seus clientes e acessos</p>
                  </div>
                </div>
                <button 
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
                  <p className="text-2xl font-black text-slate-800">0</p>
                  <p className="text-[10px] md:text-xs text-slate-500">Total Clientes</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                      <i className="fas fa-user-check text-sm"></i>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-slate-800">0</p>
                  <p className="text-[10px] md:text-xs text-slate-500">Ativos</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                      <i className="fas fa-clock text-sm"></i>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-slate-800">0</p>
                  <p className="text-[10px] md:text-xs text-slate-500">Pendentes</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                      <i className="fas fa-crown text-sm"></i>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-slate-800">0</p>
                  <p className="text-[10px] md:text-xs text-slate-500">Premium</p>
                </div>
              </div>

              {/* Empty State */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-8 md:p-12 text-center">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4 md:mb-6">
                    <i className="fas fa-users text-green-400 text-2xl md:text-3xl"></i>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-slate-700 mb-2">Nenhum cliente cadastrado</h3>
                  <p className="text-slate-500 text-sm mb-6">Adicione clientes para gerenciar acessos e permissões</p>
                  <button className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold hover:shadow-lg transition-all text-sm">
                    <i className="fas fa-plus mr-2"></i>Adicionar Primeiro Cliente
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
              {/* Page Header */}
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
              
              {/* Settings Tabs - Horizontal scroll on mobile */}
              <div className="md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 p-2 md:p-4">
                {/* Settings Header - Desktop only */}
                <div className="hidden md:flex items-center gap-3 mb-4 px-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center">
                    <i className="fas fa-cog text-white"></i>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-800">Configurações</h2>
                    </div>
                    <p className="text-[10px] text-slate-400">Gerencie sua conta</p>
                  </div>
                </div>
                <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
                  <button
                    onClick={() => setSettingsTab('profile')}
                    className={`flex-shrink-0 flex items-center gap-2 md:gap-3 px-3 md:px-3 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                      settingsTab === 'profile'
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <i className="fas fa-user w-4 md:w-5"></i>
                    Perfil
                  </button>

                  <button
                    onClick={() => setSettingsTab('company')}
                    className={`flex-shrink-0 flex items-center gap-2 md:gap-3 px-3 md:px-3 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                      settingsTab === 'company'
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <i className="fas fa-building w-4 md:w-5"></i>
                    Empresa
                  </button>

                  <button
                    onClick={() => setSettingsTab('plan')}
                    className={`flex-shrink-0 flex items-center gap-2 md:gap-3 px-3 md:px-3 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                      settingsTab === 'plan'
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <i className="fas fa-credit-card w-4 md:w-5"></i>
                    Plano
                  </button>

                  <button
                    onClick={() => setSettingsTab('integrations')}
                    className={`flex-shrink-0 flex items-center gap-2 md:gap-3 px-3 md:px-3 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                      settingsTab === 'integrations'
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <i className="fas fa-plug w-4 md:w-5"></i>
                    Integrações
                  </button>

                  <button
                    onClick={handleLogout}
                    className="flex-shrink-0 flex items-center gap-2 md:gap-3 px-3 md:px-3 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-medium text-red-600 hover:bg-red-50 transition-all whitespace-nowrap md:mt-4 md:pt-4 md:border-t md:border-slate-200"
                  >
                    <i className="fas fa-sign-out-alt w-4 md:w-5"></i>
                    Sair
                  </button>
                </nav>
              </div>

              {/* Settings Content */}
              <div className="flex-1 p-4 md:p-8 overflow-y-auto">
                <div className="max-w-2xl">
                  
                  {/* Profile Tab */}
                  {settingsTab === 'profile' && (
                    <div>
                      <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-4 md:mb-6">Perfil & Senha</h3>
                      
                      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 mb-4 md:mb-6">
                        <h4 className="font-bold text-slate-700 mb-4">Informações Pessoais</h4>
                        
                        <div className="flex items-center gap-4 md:gap-6 mb-4 md:mb-6">
                          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
                            {user.avatar ? (
                              <img src={user.avatar} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <i className="fas fa-user text-white text-xl md:text-2xl"></i>
                            )}
                          </div>
                          <button className="px-3 md:px-4 py-2 border border-slate-200 rounded-lg text-xs md:text-sm font-bold text-slate-600 hover:bg-slate-50">
                            Alterar Foto
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                          <div>
                            <label className="block text-xs md:text-sm font-bold text-slate-600 mb-2">Nome</label>
                            <input 
                              type="text" 
                              defaultValue={user.name}
                              className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-slate-200 rounded-xl text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs md:text-sm font-bold text-slate-600 mb-2">Email</label>
                            <input 
                              type="email" 
                              defaultValue={user.email}
                              className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm"
                              disabled
                            />
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
                          <button className="w-full md:w-auto px-6 py-2.5 md:py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 text-sm">
                            Salvar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Company Tab */}
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
                          <button className="w-full md:w-auto px-6 py-2.5 md:py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 text-sm">
                            Salvar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Plan Tab */}
                  {settingsTab === 'plan' && (
                    <div>
                      <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-4 md:mb-6">Plano & Créditos</h3>
                      
                      {/* Current Status */}
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
                          <div 
                            className="h-full bg-white rounded-full"
                            style={{ width: `${Math.min(100, (userCredits / currentPlan.limit) * 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Plans */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6">
                        <h4 className="font-bold text-slate-700 mb-4">Escolha seu Plano</h4>
                        <div className="grid grid-cols-2 gap-3 md:gap-4">
                          {PLANS.map(plan => (
                            <div 
                              key={plan.id}
                              onClick={() => upgradePlan(plan.id)}
                              className={`p-3 md:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                currentPlan.id === plan.id 
                                  ? 'border-purple-500 bg-purple-50' 
                                  : 'border-slate-200 hover:border-purple-300'
                              }`}
                            >
                              <h5 className="font-bold text-slate-800 text-sm md:text-base">{plan.name}</h5>
                              <p className="text-xl md:text-2xl font-black text-slate-800 my-1 md:my-2">{plan.limit}</p>
                              <p className="text-[10px] md:text-xs text-slate-500">créd./mês</p>
                              <p className="text-xs md:text-sm font-bold text-purple-600 mt-1 md:mt-2">{plan.price}</p>
                              {currentPlan.id === plan.id && (
                                <span className="inline-block mt-2 text-[9px] md:text-[10px] font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
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
                            <button className="px-3 md:px-4 py-1.5 md:py-2 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 text-xs md:text-sm">
                              Conectar
                            </button>
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
          {/* Dashboard */}
          <button
            onClick={() => setCurrentPage('dashboard')}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
              currentPage === 'dashboard' ? 'text-white' : 'text-slate-500'
            }`}
          >
            <i className="fas fa-home text-lg"></i>
            <span className="text-[10px] font-medium">Home</span>
          </button>

          {/* Products */}
          <button
            onClick={() => setCurrentPage('products')}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
              currentPage === 'products' ? 'text-white' : 'text-slate-500'
            }`}
          >
            <i className="fas fa-box text-lg"></i>
            <span className="text-[10px] font-medium">Produtos</span>
          </button>

          {/* STUDIO - CENTER HIGHLIGHT with Liquid Glass */}
          <button
            onClick={() => setCurrentPage('studio')}
            className="relative -mt-6"
          >
            <div className={`studio-liquid-glass-btn w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
              currentPage === 'studio' ? 'scale-110' : ''
            }`}>
              <div className="studio-glass-effect"></div>
              <div className="studio-glass-tint"></div>
              <div className="studio-glass-shine"></div>
              <div className="studio-glass-icon">
                <i className="fas fa-wand-magic-sparkles text-2xl"></i>
              </div>
            </div>
            <span className={`block text-[10px] font-bold mt-1 text-center ${
              currentPage === 'studio' ? 'text-white' : 'text-slate-400'
            }`}>Studio®</span>
          </button>

          {/* Liquid Glass Styles for Studio Button */}
          <style>{`
            .studio-liquid-glass-btn {
              position: relative;
              overflow: hidden;
              box-shadow: 
                0 4px 24px rgba(0, 0, 0, 0.15),
                inset 0 0 0 0.5px rgba(255, 255, 255, 0.2);
            }
            .studio-glass-effect {
              position: absolute;
              z-index: 0;
              inset: 0;
              border-radius: 1rem;
              backdrop-filter: blur(50px) saturate(120%);
              -webkit-backdrop-filter: blur(50px) saturate(120%);
              background: rgba(120, 120, 130, 0.35);
            }
            .studio-glass-tint {
              z-index: 1;
              position: absolute;
              inset: 0;
              border-radius: 1rem;
              background: linear-gradient(
                180deg,
                rgba(255, 255, 255, 0.15) 0%,
                rgba(255, 255, 255, 0.02) 100%
              );
            }
            .studio-glass-shine {
              position: absolute;
              inset: 0;
              z-index: 2;
              overflow: hidden;
              border-radius: 1rem;
              box-shadow: 
                inset 0 0.5px 0 0 rgba(255, 255, 255, 0.3),
                inset 0 -0.5px 0 0 rgba(0, 0, 0, 0.05);
            }
            .studio-glass-icon {
              position: relative;
              z-index: 3;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .studio-glass-icon i {
              background: linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f97316 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));
            }
            .studio-liquid-glass-btn:active {
              transform: scale(0.95);
              filter: brightness(0.9);
            }
          `}</style>

          {/* Clients */}
          <button
            onClick={() => setCurrentPage('clients')}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
              currentPage === 'clients' ? 'text-white' : 'text-slate-500'
            }`}
          >
            <i className="fas fa-users text-lg"></i>
            <span className="text-[10px] font-medium">Clientes</span>
          </button>

          {/* Settings */}
          <button
            onClick={() => setCurrentPage('settings')}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
              currentPage === 'settings' ? 'text-white' : 'text-slate-500'
            }`}
          >
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
              {/* Upload de Arquivo - Galeria */}
              <label className="flex flex-col items-center gap-2 md:gap-3 p-4 md:p-6 border-2 border-dashed border-slate-200 rounded-2xl hover:border-purple-400 hover:bg-purple-50/50 transition-all active:scale-95 cursor-pointer">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden"
                  onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                />
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-purple-100 flex items-center justify-center">
                  <i className="fas fa-images text-purple-600 text-lg md:text-xl"></i>
                </div>
                <span className="text-xs md:text-sm font-bold text-slate-700">Galeria</span>
                <span className="text-[10px] md:text-xs text-slate-400">Escolher foto</span>
              </label>

              {/* Tirar Foto - Camera */}
              <label className="flex flex-col items-center gap-2 md:gap-3 p-4 md:p-6 border-2 border-dashed border-slate-200 rounded-2xl hover:border-pink-400 hover:bg-pink-50/50 transition-all active:scale-95 cursor-pointer">
                <input 
                  type="file" 
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                />
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-pink-100 flex items-center justify-center">
                  <i className="fas fa-camera text-pink-600 text-lg md:text-xl"></i>
                </div>
                <span className="text-xs md:text-sm font-bold text-slate-700">Câmera</span>
                <span className="text-[10px] md:text-xs text-slate-400">Tirar foto agora</span>
              </label>
            </div>

            {/* Drag and drop - Desktop only */}
            <div 
              className="hidden md:block border-2 border-dashed border-slate-200 rounded-2xl p-6 md:p-8 text-center hover:border-purple-400 hover:bg-purple-50/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files); }}
            >
              <p className="text-sm text-slate-500">Ou arraste uma imagem aqui</p>
            </div>

            {/* Hidden input for drag and drop */}
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              className="hidden"
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
            />
          </div>
        </div>
      )}

      {/* CREATE PRODUCT MODAL */}
      {showCreateProduct && selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-lg p-5 md:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 md:mb-6">
              <h3 className="text-lg md:text-xl font-bold text-slate-800">Criar Produto</h3>
              <button 
                onClick={() => { setShowCreateProduct(false); setSelectedImage(null); }} 
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Preview da imagem */}
            <div className="mb-5 md:mb-6">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden border border-slate-200 mx-auto">
                <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Formulário */}
            <div className="space-y-3 md:space-y-4">
              <div>
                <label className="block text-xs md:text-sm font-bold text-slate-600 mb-1.5 md:mb-2">Nome do Produto *</label>
                <input 
                  type="text" 
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm"
                  placeholder="Ex: Camiseta Básica Branca"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-600 mb-1.5 md:mb-2">Marca</label>
                  <input 
                    type="text" 
                    value={newProduct.brand}
                    onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm"
                    placeholder="Ex: Nike"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-600 mb-1.5 md:mb-2">Cor</label>
                  <select 
                    value={newProduct.color}
                    onChange={(e) => setNewProduct({...newProduct, color: e.target.value})}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm"
                  >
                    <option value="">Selecione</option>
                    {COLORS.map(color => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-600 mb-1.5 md:mb-2">Caimento</label>
                  <select 
                    value={newProduct.fit}
                    onChange={(e) => setNewProduct({...newProduct, fit: e.target.value})}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm"
                  >
                    <option value="">Selecione</option>
                    {FITS.map(fit => (
                      <option key={fit} value={fit}>{fit}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-600 mb-1.5 md:mb-2">Categoria *</label>
                  <select 
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm"
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
                className="w-full py-3.5 md:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-colors text-sm md:text-base"
              >
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
              <button 
                onClick={() => setShowProductDetail(null)} 
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 md:gap-6">
              {/* Imagem */}
              <div className="w-full md:w-48 h-48 rounded-2xl overflow-hidden border border-slate-200 flex-shrink-0">
                <img 
                  src={showProductDetail.images[0]?.base64 || showProductDetail.images[0]?.url} 
                  alt={showProductDetail.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Info */}
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">{showProductDetail.sku}</p>
                <h4 className="text-xl md:text-2xl font-bold text-slate-800 mb-3 md:mb-4">{showProductDetail.name}</h4>
                
                <div className="grid grid-cols-2 gap-2 md:gap-3 mb-4 md:mb-6">
                  {showProductDetail.brand && (
                    <div className="bg-slate-50 rounded-xl p-2.5 md:p-3">
                      <p className="text-[9px] md:text-[10px] text-slate-400 uppercase mb-0.5">Marca</p>
                      <p className="text-xs md:text-sm font-bold text-slate-700">{showProductDetail.brand}</p>
                    </div>
                  )}
                  {showProductDetail.category && (
                    <div className="bg-slate-50 rounded-xl p-2.5 md:p-3">
                      <p className="text-[9px] md:text-[10px] text-slate-400 uppercase mb-0.5">Categoria</p>
                      <p className="text-xs md:text-sm font-bold text-slate-700">{showProductDetail.category}</p>
                    </div>
                  )}
                  {showProductDetail.color && (
                    <div className="bg-slate-50 rounded-xl p-2.5 md:p-3">
                      <p className="text-[9px] md:text-[10px] text-slate-400 uppercase mb-0.5">Cor</p>
                      <p className="text-xs md:text-sm font-bold text-slate-700">{showProductDetail.color}</p>
                    </div>
                  )}
                  {showProductDetail.fit && (
                    <div className="bg-slate-50 rounded-xl p-2.5 md:p-3">
                      <p className="text-[9px] md:text-[10px] text-slate-400 uppercase mb-0.5">Caimento</p>
                      <p className="text-xs md:text-sm font-bold text-slate-700">{showProductDetail.fit}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col md:flex-row gap-2 md:gap-3 mt-4 md:mt-6 pt-4 md:pt-6 border-t border-slate-200">
              <button 
                onClick={() => handleOpenInStudio(showProductDetail)}
                className="flex-1 py-3.5 md:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-colors text-sm"
              >
                <i className="fas fa-wand-magic-sparkles mr-2"></i>
                Otimizar no Studio
              </button>
              <button 
                onClick={() => handleGenerateDescription(showProductDetail)}
                disabled={isGeneratingDescription}
                className="flex-1 py-3.5 md:py-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors disabled:opacity-50 text-sm"
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
