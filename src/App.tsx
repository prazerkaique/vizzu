import React, { useState, useEffect } from 'react';
import { Studio } from './components/Studio';
import { Product, User, HistoryLog } from './types';
import { useCredits, PLANS } from './hooks/useCredits';
import { supabase } from './services/supabaseClient';

const DEMO_PRODUCTS: Product[] = [
  {
    id: '1', sku: 'TSH-001', name: 'Camiseta Premium Algodão Preta',
    description: 'Camiseta 100% algodão premium na cor preta', category: 'Vestuário',
    images: [{ name: 'camiseta-preta.jpg', base64: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNTAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHBhdGggZD0iTTEwMCAxMDAgTDE1MCA1MCBMMjUwIDUwIEwzMDAgMTAwIEwzMDAgMzUwIEwxMjUgMzUwIEwxMDAgMzUwIFoiIGZpbGw9IiMyMDIwMjAiLz48dGV4dCB4PSIyMDAiIHk9IjQ1MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2Ij5UU0gtMDAxPC90ZXh0Pjwvc3ZnPg==' }]
  },
  {
    id: '2', sku: 'TSH-002', name: 'Camiseta Estampada Summer Vibes', category: 'Vestuário',
    images: [{ name: 'camiseta-estampada.jpg', base64: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNTAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHBhdGggZD0iTTEwMCAxMDAgTDE1MCA1MCBMMjUwIDUwIEwzMDAgMTAwIEwzMDAgMzUwIEwxMjUgMzUwIEwxMDAgMzUwIFoiIGZpbGw9IiMxODkyZDIiLz48Y2lyY2xlIGN4PSIyMDAiIGN5PSIyMDAiIHI9IjQwIiBmaWxsPSIjZmZkNzAwIi8+PHRleHQgeD0iMjAwIiB5PSI0NTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NiI+VFNILTAwMjwvdGV4dD48L3N2Zz4=' }]
  },
  {
    id: '3', sku: 'JNS-001', name: 'Calça Jeans Slim Fit Azul', category: 'Vestuário',
    images: [{ name: 'jeans-azul.jpg', base64: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNTAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHBhdGggZD0iTTEzMCA1MCBMMjcwIDUwIEwyODAgODAgTDI3NSA0MDAgTDIyMCA0MDAgTDIwMCAyNTAgTDE4MCA0MDAgTDEyNSA0MDAgTDEyMCA4MCBaIiBmaWxsPSIjMWQ0ZWQ4Ii8+PHRleHQgeD0iMjAwIiB5PSI0NTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NiI+Sk5TLTAwMTwvdGV4dD48L3N2Zz4=' }]
  },
  {
    id: '4', sku: 'SNK-001', name: 'Tênis Running Performance', category: 'Calçados',
    images: [{ name: 'tenis-running.jpg', base64: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNTAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHBhdGggZD0iTTUwLDI5MCBDNTAsMjkwIDEwMCwyMzAgMTgwLDIzMCBDMjUwLDIzMCAzMDAsMjUwIDM1MCwyODAgTDM1MCwzMjAgQzM1MCwzMjAgMzAwLDM0MCAyMDAsMzQwIEMxNDUsMzQwIDUwLDMyMCA1MCwzMjAgWiIgZmlsbD0iIzIzMjMyMyIvPjxwYXRoIGQ9Ik01MCwzMTUgTDM1MCwzMTUgTDM1MCwzMzAgTDUwLDMzMCBaIiBmaWxsPSIjZmZmIi8+PHRleHQgeD0iMjAwIiB5PSI0NTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NiI+U05LLTAwMTwvdGV4dD48L3N2Zz4=' }]
  }
];

type Page = 'dashboard' | 'studio' | 'products' | 'clients' | 'history' | 'settings';
type SettingsTab = 'profile' | 'company' | 'plan' | 'integrations';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('profile');
  const [showImport, setShowImport] = useState(false);
  
  const { userCredits, currentPlan, deductCredits, upgradePlan, setCredits } = useCredits();

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

  const handleImportProduct = (files: FileList) => {
    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = () => {
        const newProduct: Product = {
          id: `imported-${Date.now()}-${index}`,
          sku: `IMP-${Date.now().toString().slice(-4)}-${index}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          category: 'Importado',
          images: [{ name: file.name, base64: reader.result as string }]
        };
        setProducts(prev => [...prev, newProduct]);
      };
      reader.readAsDataURL(file);
    });
    setShowImport(false);
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-slate-900 flex items-center justify-center p-4 font-['Inter']">
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
            <h2 className="text-xl font-semibold text-white text-center mb-6">Bem-vindo!</h2>

            <div className="space-y-4">
              <button onClick={handleGoogleLogin} className="w-full py-4 bg-white text-slate-800 rounded-xl font-medium flex items-center justify-center gap-3 hover:bg-slate-100 transition-colors">
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

              <button onClick={handleDemoLogin} className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium flex items-center justify-center gap-3 transition-colors">
                <i className="far fa-play-circle"></i>
                Testar gratuitamente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MAIN APP WITH SIDEBAR
  return (
    <div className="h-screen flex bg-slate-50 font-['Inter']">
      
      {/* SIDEBAR */}
      <aside className="w-56 bg-gradient-to-b from-slate-900 via-purple-950 to-slate-900 flex flex-col shadow-2xl">
        
        {/* Logo */}
        <div className="p-6 border-b border-white/10 flex justify-center">
          <img 
            src="/logo.png" 
            alt="Vizzu" 
            className="h-12"
          />
        </div>

        {/* Navigation - Outline Icons */}
        <nav className="flex-1 p-3 space-y-1">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              currentPage === 'dashboard'
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <i className="far fa-home w-5"></i>
            Dashboard
          </button>

          <button
            onClick={() => setCurrentPage('studio')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              currentPage === 'studio'
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <i className="far fa-wand-magic-sparkles w-5"></i>
            Vizzu Studio
          </button>

          <button
            onClick={() => setCurrentPage('products')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              currentPage === 'products'
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <i className="far fa-box w-5"></i>
            Produtos
          </button>

          <button
            onClick={() => setCurrentPage('clients')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              currentPage === 'clients'
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <i className="far fa-users w-5"></i>
            Clientes
          </button>

          <button
            onClick={() => setCurrentPage('history')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              currentPage === 'history'
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <i className="far fa-clock-rotate-left w-5"></i>
            Histórico
          </button>
        </nav>

        {/* Bottom Section */}
        <div className="p-3 border-t border-white/10 space-y-3">
          
          {/* Credits */}
          <div className="bg-white/5 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">Créditos</span>
              <button 
                onClick={() => { setCurrentPage('settings'); setSettingsTab('plan'); }}
                className="text-purple-400 hover:text-purple-300 text-xs font-medium"
              >
                + Adicionar
              </button>
            </div>
            <p className="text-2xl font-semibold text-white">{userCredits.toLocaleString()}</p>
            <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (userCredits / currentPlan.limit) * 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Settings Button */}
          <button
            onClick={() => setCurrentPage('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              currentPage === 'settings'
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <i className="far fa-cog w-5"></i>
            Configurações
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center overflow-hidden">
              {user.avatar ? (
                <img src={user.avatar} className="w-full h-full object-cover" alt="" />
              ) : (
                <i className="far fa-user text-white text-sm"></i>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-500">{currentPlan.name}</p>
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
              <h1 className="text-2xl font-semibold text-slate-800 mb-1">Bem-vindo, {user.name.split(' ')[0]}!</h1>
              <p className="text-slate-500 text-sm mb-8">Resumo do seu estúdio de imagens AI</p>

              {/* Stats Cards - Clean, no borders, monochromatic */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                      <i className="far fa-box"></i>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mb-1">Total produtos</p>
                  <p className="text-2xl font-semibold text-slate-800">{products.length}</p>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                      <i className="far fa-image"></i>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mb-1">Imagens geradas</p>
                  <p className="text-2xl font-semibold text-slate-800">0</p>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                      <i className="far fa-coins"></i>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mb-1">Créditos disponíveis</p>
                  <p className="text-2xl font-semibold text-slate-800">{userCredits}</p>
                </div>

                {/* Plan Card - Subtle highlight with left border */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-purple-500">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                      <i className="far fa-crown"></i>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mb-1">Seu plano</p>
                  <p className="text-2xl font-semibold text-slate-800">{currentPlan.name}</p>
                </div>
              </div>

              {/* Quick Actions - Clean, no borders */}
              <h2 className="text-sm font-medium text-slate-500 mb-4">Ações rápidas</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                  onClick={() => setCurrentPage('studio')}
                  className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-4 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                    <i className="far fa-wand-magic-sparkles text-xl"></i>
                  </div>
                  <h3 className="font-medium text-slate-800 mb-1">Abrir Studio</h3>
                  <p className="text-sm text-slate-400">Gerar imagens com IA</p>
                </button>

                <button 
                  onClick={() => setShowImport(true)}
                  className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-4 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                    <i className="far fa-cloud-upload text-xl"></i>
                  </div>
                  <h3 className="font-medium text-slate-800 mb-1">Importar produtos</h3>
                  <p className="text-sm text-slate-400">Adicionar novas imagens</p>
                </button>

                <button 
                  onClick={() => { setCurrentPage('settings'); setSettingsTab('plan'); }}
                  className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-4 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                    <i className="far fa-bolt text-xl"></i>
                  </div>
                  <h3 className="font-medium text-slate-800 mb-1">Comprar créditos</h3>
                  <p className="text-sm text-slate-400">Upgrade de plano</p>
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

        {/* PRODUCTS PAGE */}
        {currentPage === 'products' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-2xl font-semibold text-slate-800 mb-1">Produtos</h1>
                  <p className="text-slate-500 text-sm">Gerencie seu catálogo de produtos</p>
                </div>
                <button 
                  onClick={() => setShowImport(true)}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium shadow-sm transition-colors"
                >
                  <i className="far fa-plus mr-2"></i>Importar
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-6">
                  {products.map(product => (
                    <div 
                      key={product.id}
                      onClick={() => setCurrentPage('studio')}
                      className="bg-slate-50 rounded-xl overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group"
                    >
                      <div className="aspect-square bg-white relative overflow-hidden">
                        <img 
                          src={product.images[0]?.base64 || product.images[0]?.url} 
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="p-3">
                        <p className="text-[10px] text-slate-400">{product.sku}</p>
                        <p className="text-xs font-medium text-slate-700 truncate">{product.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
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
                  <h1 className="text-2xl font-semibold text-slate-800 mb-1">Clientes</h1>
                  <p className="text-slate-500 text-sm">Gerencie seus clientes e acessos</p>
                </div>
                <button className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium shadow-sm transition-colors">
                  <i className="far fa-plus mr-2"></i>Novo cliente
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <i className="far fa-users text-slate-300 text-2xl"></i>
                </div>
                <h3 className="text-lg font-medium text-slate-700 mb-2">Nenhum cliente cadastrado</h3>
                <p className="text-slate-400 text-sm mb-6">Adicione clientes para gerenciar acessos</p>
                <button className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-colors">
                  <i className="far fa-plus mr-2"></i>Adicionar primeiro cliente
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
                  <h1 className="text-2xl font-semibold text-slate-800 mb-1">Histórico</h1>
                  <p className="text-slate-500 text-sm">Acompanhe todas as atividades</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-white rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 shadow-sm">
                    <i className="far fa-filter mr-2"></i>Filtrar
                  </button>
                  <button className="px-4 py-2 bg-white rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 shadow-sm">
                    <i className="far fa-download mr-2"></i>Exportar
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <i className="far fa-clock-rotate-left text-slate-300 text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-slate-700 mb-2">Nenhuma atividade ainda</h3>
                  <p className="text-slate-400 text-sm">As atividades aparecerão aqui</p>
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
              <div className="w-64 bg-white border-r border-slate-100 p-4">
                <h2 className="text-lg font-semibold text-slate-800 mb-4 px-3">Configurações</h2>
                <nav className="space-y-1">
                  <button
                    onClick={() => setSettingsTab('profile')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      settingsTab === 'profile'
                        ? 'bg-purple-50 text-purple-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <i className="far fa-user w-5"></i>
                    Perfil & Senha
                  </button>

                  <button
                    onClick={() => setSettingsTab('company')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      settingsTab === 'company'
                        ? 'bg-purple-50 text-purple-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <i className="far fa-building w-5"></i>
                    Infos da empresa
                  </button>

                  <button
                    onClick={() => setSettingsTab('plan')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      settingsTab === 'plan'
                        ? 'bg-purple-50 text-purple-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <i className="far fa-credit-card w-5"></i>
                    Plano & Créditos
                  </button>

                  <button
                    onClick={() => setSettingsTab('integrations')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      settingsTab === 'integrations'
                        ? 'bg-purple-50 text-purple-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <i className="far fa-plug w-5"></i>
                    Integrações
                  </button>

                  <div className="pt-4 mt-4 border-t border-slate-100">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
                    >
                      <i className="far fa-sign-out w-5"></i>
                      Sair da conta
                    </button>
                  </div>
                </nav>
              </div>

              {/* Settings Content */}
              <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
                <div className="max-w-2xl">
                  
                  {/* Profile Tab */}
                  {settingsTab === 'profile' && (
                    <div>
                      <h3 className="text-xl font-semibold text-slate-800 mb-6">Perfil & Senha</h3>
                      
                      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                        <h4 className="font-medium text-slate-700 mb-4">Informações pessoais</h4>
                        
                        <div className="flex items-center gap-6 mb-6">
                          <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center overflow-hidden">
                            {user.avatar ? (
                              <img src={user.avatar} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <i className="far fa-user text-white text-2xl"></i>
                            )}
                          </div>
                          <button className="px-4 py-2 bg-slate-100 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200">
                            Alterar foto
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Nome</label>
                            <input 
                              type="text" 
                              defaultValue={user.name}
                              className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Email</label>
                            <input 
                              type="email" 
                              defaultValue={user.email}
                              className="w-full px-4 py-3 bg-slate-100 border-0 rounded-xl text-sm text-slate-400"
                              disabled
                            />
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl shadow-sm p-6">
                        <h4 className="font-medium text-slate-700 mb-4">Alterar senha</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Senha atual</label>
                            <input type="password" className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-purple-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Nova senha</label>
                            <input type="password" className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-purple-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Confirmar nova senha</label>
                            <input type="password" className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-purple-500" />
                          </div>
                          <button className="px-5 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors">
                            Salvar alterações
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Company Tab */}
                  {settingsTab === 'company' && (
                    <div>
                      <h3 className="text-xl font-semibold text-slate-800 mb-6">Infos da empresa</h3>
                      
                      <div className="bg-white rounded-2xl shadow-sm p-6">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Nome da empresa</label>
                            <input type="text" className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-purple-500" placeholder="Sua Empresa Ltda" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">CNPJ</label>
                            <input type="text" className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-purple-500" placeholder="00.000.000/0000-00" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Endereço</label>
                            <input type="text" className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-purple-500" placeholder="Rua, número, cidade" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-600 mb-2">Telefone</label>
                              <input type="tel" className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-purple-500" placeholder="(00) 00000-0000" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-600 mb-2">Website</label>
                              <input type="url" className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-purple-500" placeholder="https://sua-empresa.com" />
                            </div>
                          </div>
                          <button className="px-5 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors">
                            Salvar informações
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Plan Tab */}
                  {settingsTab === 'plan' && (
                    <div>
                      <h3 className="text-xl font-semibold text-slate-800 mb-6">Plano & Créditos</h3>
                      
                      {/* Current Status - Subtle */}
                      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border-l-4 border-purple-500">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Plano atual</p>
                            <p className="text-2xl font-semibold text-slate-800">{currentPlan.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-400 mb-1">Créditos restantes</p>
                            <p className="text-2xl font-semibold text-slate-800">{userCredits}</p>
                          </div>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${Math.min(100, (userCredits / currentPlan.limit) * 100)}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">{userCredits} de {currentPlan.limit} créditos disponíveis</p>
                      </div>

                      {/* Plans */}
                      <div className="bg-white rounded-2xl shadow-sm p-6">
                        <h4 className="font-medium text-slate-700 mb-4">Escolha seu plano</h4>
                        <div className="grid grid-cols-2 gap-4">
                          {PLANS.map(plan => (
                            <div 
                              key={plan.id}
                              onClick={() => upgradePlan(plan.id)}
                              className={`p-4 rounded-xl cursor-pointer transition-all ${
                                currentPlan.id === plan.id 
                                  ? 'bg-purple-50 ring-2 ring-purple-500' 
                                  : 'bg-slate-50 hover:bg-slate-100'
                              }`}
                            >
                              <h5 className="font-medium text-slate-800">{plan.name}</h5>
                              <p className="text-2xl font-semibold text-slate-800 my-2">{plan.limit}</p>
                              <p className="text-xs text-slate-400">créditos/mês</p>
                              <p className="text-sm font-medium text-purple-600 mt-2">{plan.price}</p>
                              {currentPlan.id === plan.id && (
                                <span className="inline-block mt-2 text-[10px] font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                                  Atual
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
                      <h3 className="text-xl font-semibold text-slate-800 mb-6">Integrações</h3>
                      
                      <div className="space-y-3">
                        {/* Shopify */}
                        <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                              <i className="fab fa-shopify text-slate-500 text-lg"></i>
                            </div>
                            <div>
                              <h4 className="font-medium text-slate-800">Shopify</h4>
                              <p className="text-sm text-slate-400">Sincronize produtos</p>
                            </div>
                          </div>
                          <button className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
                            Conectar
                          </button>
                        </div>

                        {/* WooCommerce */}
                        <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                              <i className="fab fa-wordpress text-slate-500 text-lg"></i>
                            </div>
                            <div>
                              <h4 className="font-medium text-slate-800">WooCommerce</h4>
                              <p className="text-sm text-slate-400">Integre com WordPress</p>
                            </div>
                          </div>
                          <button className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
                            Conectar
                          </button>
                        </div>

                        {/* Magento */}
                        <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                              <i className="far fa-cube text-slate-500 text-lg"></i>
                            </div>
                            <div>
                              <h4 className="font-medium text-slate-800">Magento</h4>
                              <p className="text-sm text-slate-400">Adobe Commerce</p>
                            </div>
                          </div>
                          <button className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
                            Conectar
                          </button>
                        </div>

                        {/* VTEX */}
                        <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                              <i className="far fa-store text-slate-500 text-lg"></i>
                            </div>
                            <div>
                              <h4 className="font-medium text-slate-800">VTEX</h4>
                              <p className="text-sm text-slate-400">VTEX IO</p>
                            </div>
                          </div>
                          <button className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
                            Conectar
                          </button>
                        </div>

                        {/* API */}
                        <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                              <i className="far fa-code text-slate-500 text-lg"></i>
                            </div>
                            <div>
                              <h4 className="font-medium text-slate-800">API REST</h4>
                              <p className="text-sm text-slate-400">Acesso direto</p>
                            </div>
                          </div>
                          <button className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
                            Ver docs
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

      {/* IMPORT MODAL */}
      {showImport && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Importar produtos</h3>
              <button onClick={() => setShowImport(false)} className="text-slate-400 hover:text-slate-600">
                <i className="far fa-times"></i>
              </button>
            </div>
            
            <div 
              className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center hover:border-purple-300 hover:bg-purple-50/50 transition-colors cursor-pointer"
              onClick={() => document.getElementById('file-input')?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleImportProduct(e.dataTransfer.files); }}
            >
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <i className="far fa-cloud-upload text-slate-400 text-xl"></i>
              </div>
              <p className="text-sm font-medium text-slate-700 mb-1">Arraste imagens aqui</p>
              <p className="text-xs text-slate-400">ou clique para selecionar</p>
              <input 
                id="file-input" 
                type="file" 
                accept="image/*" 
                multiple 
                className="hidden"
                onChange={(e) => e.target.files && handleImportProduct(e.target.files)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
