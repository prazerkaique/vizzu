import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useUI, type Page } from '../../contexts/UIContext';
import { useAuth } from '../../contexts/AuthContext';
import { useGeneration } from '../../contexts/GenerationContext';

interface AppLayoutProps {
 children: React.ReactNode;
 userCredits: number;
 currentPlan: any;
 restoreModal: (id: string) => void;
 onLogout: () => void;
}

export function AppLayout({
 children,
 userCredits,
 currentPlan,
 restoreModal,
 onLogout,
}: AppLayoutProps) {
 const { theme, currentPage, navigateTo, goBack, setSettingsTab, showSettingsDropdown, setShowSettingsDropdown, sidebarCollapsed, setSidebarCollapsed, toast, successNotification, showVideoTutorial, setShowVideoTutorial } = useUI();
 const { user } = useAuth();
 const {
   isGeneratingProductStudio, productStudioMinimized, productStudioProgress, setProductStudioMinimized,
   isGeneratingLookComposer, lookComposerMinimized, lookComposerProgress, setLookComposerMinimized,
   isGeneratingProvador, provadorMinimized, provadorProgress, setProvadorMinimized,
   minimizedModals, closeMinimizedModal,
 } = useGeneration();

 // Draggable minimized bar position
 const [minimizedBarPos, setMinimizedBarPos] = useState<{ x: number; y: number }>({ x: -1, y: -1 });
 const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number; dragging: boolean }>({ startX: 0, startY: 0, startPosX: 0, startPosY: 0, dragging: false });

 const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
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

 const handleMinimizedClick = useCallback((restoreFn: () => void) => {
 if (!dragRef.current.dragging) restoreFn();
 }, []);

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
 const mediaQuery = window.matchMedia('(display-mode: standalone)');
 mediaQuery.addEventListener('change', checkPWA);
 return () => mediaQuery.removeEventListener('change', checkPWA);
 }, []);

 // Swipe navigation
 const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
 const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
 const [swipeBackProgress, setSwipeBackProgress] = useState(0);
 const [isSwipeBack, setIsSwipeBack] = useState(false);

 const SWIPE_PAGES: Page[] = ['dashboard', 'products', 'create', 'models', 'clients'];
 const EDGE_ZONE = 30;
 const SWIPE_BACK_THRESHOLD = 0.10;

 const handleTouchStart = (e: React.TouchEvent) => {
 if (!isPWA) return;
 const startX = e.targetTouches[0].clientX;
 const startY = e.targetTouches[0].clientY;
 setTouchEnd(null);
 setTouchStart({ x: startX, y: startY });
 if (startX <= EDGE_ZONE && currentPage !== 'dashboard') {
 setIsSwipeBack(true);
 setSwipeBackProgress(0);
 }
 };

 const handleTouchMove = (e: React.TouchEvent) => {
 const currentX = e.targetTouches[0].clientX;
 const currentY = e.targetTouches[0].clientY;
 setTouchEnd({ x: currentX, y: currentY });
 if (isSwipeBack && touchStart) {
 const deltaX = currentX - touchStart.x;
 const deltaY = Math.abs(currentY - touchStart.y);
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

 const isCreationPage = ['product-studio', 'provador', 'look-composer', 'lifestyle', 'creative-still'].includes(currentPage);

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
 <main className={'flex-1 overflow-hidden flex flex-col md:pt-0 md:pb-0 ' + (!isCreationPage ? 'pt-12 pb-16' : '')} style={{ overscrollBehavior: 'contain' }}>

 {/* MOBILE TOP HEADER */}
 {!isCreationPage && (
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

 {children}
 </main>

 {/* MOBILE BOTTOM NAVIGATION */}
 {!isCreationPage && (
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

 {/* NOTIFICAÇÃO DE SUCESSO */}
 {successNotification && (
 <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] animate-fade-in">
 <div className="flex items-center gap-2 px-4 py-3 bg-green-500 text-white rounded-xl ">
 <i className="fas fa-check-circle"></i>
 <span className="text-sm font-medium">{successNotification}</span>
 </div>
 </div>
 )}

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

 {/* BARRAS MINIMIZADAS GLOBAIS */}

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
 <span className="text-white text-xs font-medium">{provadorProgress}%</span>
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
