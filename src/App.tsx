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

type Page = 'dashboard' | 'studio' | 'products' | 'settings';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-slate-900 flex items-center justify-center p-4">
        <div className="relative z-10 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center shadow-2xl shadow-purple-500/50">
                <i className="fas fa-magic text-white text-2xl"></i>
              </div>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-2">VIZZU</h1>
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
        
        {/* Logo */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center shadow-lg">
              <i className="fas fa-magic text-white"></i>
            </div>
            <span className="text-xl font-black text-white tracking-tight">VIZZU</span>
          </div>
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
        </nav>

        {/* Bottom Section */}
        <div className="p-3 border-t border-white/10 space-y-3">
          
          {/* Credits */}
          <div className="bg-white/5 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase">Créditos</span>
              <button 
                onClick={() => setCurrentPage('settings')}
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
                  onClick={() => setCurrentPage('settings')}
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
            onOpenSettings={() => setCurrentPage('settings')}
            onImport={() => setShowImport(true)}
          />
        )}

        {/* PRODUCTS PAGE */}
        {currentPage === 'products' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-black text-slate-800 mb-2">Produtos</h1>
                  <p className="text-slate-500">Gerencie seu catálogo de produtos</p>
                </div>
                <button 
                  onClick={() => setShowImport(true)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                >
                  <i className="fas fa-plus mr-2"></i>Importar
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-6">
                  {products.map(product => (
                    <div 
                      key={product.id}
                      onClick={() => setCurrentPage('studio')}
                      className="bg-slate-50 rounded-xl overflow-hidden border border-slate-200 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all group"
                    >
                      <div className="aspect-square bg-white relative overflow-hidden">
                        <img 
                          src={product.images[0]?.base64 || product.images[0]?.url} 
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="p-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{product.sku}</p>
                        <p className="text-xs font-bold text-slate-700 truncate">{product.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS PAGE */}
        {currentPage === 'settings' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-black text-slate-800 mb-2">Configurações</h1>
              <p className="text-slate-500 mb-8">Gerencie sua conta e plano</p>

              {/* Current Plan */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
                <h2 className="text-lg font-bold text-slate-700 mb-4">Plano Atual</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-black text-slate-800">{currentPlan.name}</p>
                    <p className="text-slate-500">{currentPlan.price}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Créditos restantes</p>
                    <p className="text-3xl font-black text-purple-600">{userCredits}</p>
                  </div>
                </div>
                <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                    style={{ width: `${Math.min(100, (userCredits / currentPlan.limit) * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Plans */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
                <h2 className="text-lg font-bold text-slate-700 mb-4">Planos Disponíveis</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                      <h3 className="font-bold text-slate-800">{plan.name}</h3>
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

              {/* Account */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-700 mb-4">Conta</h2>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
                      {user.avatar ? (
                        <img src={user.avatar} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <i className="fas fa-user text-white text-xl"></i>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{user.name}</p>
                      <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-bold transition-colors"
                  >
                    <i className="fas fa-sign-out-alt mr-2"></i>Sair
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* IMPORT MODAL */}
      {showImport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">Importar Produtos</h3>
              <button onClick={() => setShowImport(false)} className="text-slate-400 hover:text-slate-600">
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div 
              className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center hover:border-purple-400 hover:bg-purple-50/50 transition-colors cursor-pointer"
              onClick={() => document.getElementById('file-input')?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleImportProduct(e.dataTransfer.files); }}
            >
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-cloud-upload-alt text-purple-600 text-2xl"></i>
              </div>
              <p className="text-sm font-bold text-slate-700 mb-2">Arraste imagens aqui</p>
              <p className="text-xs text-slate-500">ou clique para selecionar</p>
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
