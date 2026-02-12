import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUI, type Page } from '../../contexts/UIContext';
import { useAuth } from '../../contexts/AuthContext';
import { useGeneration } from '../../contexts/GenerationContext';
import { LowCreditsBanner } from '../LowCreditsBanner';

interface AppLayoutProps {
 children: React.ReactNode;
 userCredits: number;
 currentPlan: any;
 restoreModal: (id: string) => void;
 onLogout: () => void;
 onBuyCredits?: () => void;
 renderSwipePage?: (page: Page) => React.ReactNode;
}

export function AppLayout({
 children,
 userCredits,
 currentPlan,
 restoreModal,
 onLogout,
 onBuyCredits,
 renderSwipePage,
}: AppLayoutProps) {
 const { theme, currentPage, navigateTo, goBack, setSettingsTab, showSettingsDropdown, setShowSettingsDropdown, sidebarCollapsed, setSidebarCollapsed, toast, dismissToast, successNotification, showVideoTutorial, setShowVideoTutorial } = useUI();
 const { user } = useAuth();
 const {
   isGeneratingProductStudio, productStudioMinimized, productStudioProgress, setProductStudioMinimized,
   isGeneratingLookComposer, lookComposerMinimized, lookComposerProgress, setLookComposerMinimized,
   isGeneratingProvador, provadorMinimized, provadorProgress, setProvadorMinimized,
   isGeneratingCreativeStill, creativeStillMinimized, creativeStillProgress, setCreativeStillMinimized,
   isGeneratingModels, modelsMinimized, modelsProgress, setModelsMinimized,
   completedFeatures, clearCompletedFeature, clearAllCompletedFeatures,
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
 if (Math.abs(dx) > 10 || Math.abs(dy) > 10) dragRef.current.dragging = true;
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
 // Resetar dragging após delay suficiente para o click event do mobile chegar
 setTimeout(() => { dragRef.current.dragging = false; }, 200);
 };
 window.addEventListener('mousemove', handleMove);
 window.addEventListener('mouseup', handleEnd);
 window.addEventListener('touchmove', handleMove, { passive: false });
 window.addEventListener('touchend', handleEnd);
 }, []);

 const handleMinimizedClick = useCallback((restoreFn: () => void, page?: Page) => {
 if (!dragRef.current.dragging) {
   restoreFn();
   if (page) navigateTo(page);
 }
 }, [navigateTo]);

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

 // ── Instagram-style swipe navigation (PWA only) ──
 const SWIPE_PAGES: Page[] = ['dashboard', 'products', 'create', 'models', 'clients'];
 const mainContentRef = useRef<HTMLDivElement>(null);
 const adjacentContentRef = useRef<HTMLDivElement>(null);
 const [swipeAdjacentPage, setSwipeAdjacentPage] = useState<Page | null>(null);

 // Stable refs for event handler closures
 const currentPageRef = useRef(currentPage);
 currentPageRef.current = currentPage;
 const isPWARef = useRef(isPWA);
 isPWARef.current = isPWA;
 const navigateToRef = useRef(navigateTo);
 navigateToRef.current = navigateTo;
 const goBackRef = useRef(goBack);
 goBackRef.current = goBack;

 const swipeTrack = useRef<{
   active: boolean; startX: number; startY: number; startTime: number;
   decided: boolean; isHorizontal: boolean; isEdgeBack: boolean;
   direction: 'left' | 'right' | null; lastX: number; adjacentPage: Page | null;
   target: HTMLElement | null;
 }>({ active: false, startX: 0, startY: 0, startTime: 0, decided: false, isHorizontal: false, isEdgeBack: false, direction: null, lastX: 0, adjacentPage: null, target: null });

 useEffect(() => {
   const el = document.getElementById('swipe-root');
   if (!el) return;

   const EDGE_ZONE = 30;
   const DECISION_PX = 10;
   const THRESHOLD = 0.3;
   const VELOCITY = 500;
   const TRANSITION = 'transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1)';
   const PAGES: Page[] = ['dashboard', 'products', 'create', 'models', 'clients'];

   const getAdjacentPage = (dir: 'left' | 'right'): Page | null => {
     const idx = PAGES.indexOf(currentPageRef.current);
     if (idx === -1) return null;
     if (dir === 'left' && idx < PAGES.length - 1) return PAGES[idx + 1];
     if (dir === 'right' && idx > 0) return PAGES[idx - 1];
     return null;
   };

   const onStart = (e: TouchEvent) => {
     if (!isPWARef.current) return;
     const t = e.touches[0];
     const isMain = PAGES.includes(currentPageRef.current);
     swipeTrack.current = {
       active: true, startX: t.clientX, startY: t.clientY, startTime: Date.now(),
       decided: false, isHorizontal: false,
       isEdgeBack: !isMain && t.clientX <= EDGE_ZONE,
       direction: null, lastX: t.clientX, adjacentPage: null,
       target: e.target as HTMLElement,
     };
   };

   const onMove = (e: TouchEvent) => {
     const s = swipeTrack.current;
     if (!s.active) return;
     const t = e.touches[0];
     const dx = t.clientX - s.startX;
     const dy = t.clientY - s.startY;
     s.lastX = t.clientX;

     // Edge swipe back (sub-pages)
     if (s.isEdgeBack) {
       if (Math.abs(dy) > Math.abs(dx) && dx < 50) { s.active = false; return; }
       e.preventDefault();
       return;
     }

     // Direction decision
     if (!s.decided) {
       if (Math.abs(dx) > DECISION_PX || Math.abs(dy) > DECISION_PX) {
         s.decided = true;
         s.isHorizontal = Math.abs(dx) > Math.abs(dy);
         if (s.isHorizontal) {
           // Don't hijack swipe from range inputs or horizontally scrollable containers
           const tgt = s.target;
           if (tgt) {
             if (tgt.closest('input[type="range"]')) { s.active = false; return; }
             let check: HTMLElement | null = tgt;
             while (check && check.id !== 'swipe-root') {
               if (check.scrollWidth > check.clientWidth + 1) { s.active = false; return; }
               check = check.parentElement as HTMLElement;
             }
           }
           s.direction = dx < 0 ? 'left' : 'right';
           const adj = getAdjacentPage(s.direction);
           if (!adj) { s.active = false; return; }
           s.adjacentPage = adj;
           setSwipeAdjacentPage(adj);
           e.preventDefault();
         } else {
           s.active = false;
         }
       }
       return;
     }

     if (!s.isHorizontal) return;
     e.preventDefault();

     const screenW = window.innerWidth;
     let offset = dx / screenW;
     if (s.direction === 'left') offset = Math.max(-1, Math.min(0, offset));
     else offset = Math.min(1, Math.max(0, offset));

     if (mainContentRef.current) {
       mainContentRef.current.style.transition = 'none';
       mainContentRef.current.style.transform = `translateX(${offset * 100}%)`;
     }
     if (adjacentContentRef.current) {
       const base = s.direction === 'left' ? 100 : -100;
       adjacentContentRef.current.style.transition = 'none';
       adjacentContentRef.current.style.transform = `translateX(${base + offset * 100}%)`;
     }
   };

   const onEnd = () => {
     const s = swipeTrack.current;

     // Edge swipe back
     if (s.isEdgeBack) {
       const progress = Math.max(0, (s.lastX - s.startX) / window.innerWidth);
       if (progress >= 0.10) goBackRef.current();
       s.active = false;
       return;
     }

     if (!s.active || !s.decided || !s.isHorizontal || !s.adjacentPage) {
       s.active = false;
       setSwipeAdjacentPage(null);
       if (mainContentRef.current) { mainContentRef.current.style.transition = 'none'; mainContentRef.current.style.transform = ''; }
       return;
     }

     const dx = s.lastX - s.startX;
     const elapsed = Math.max(0.01, (Date.now() - s.startTime) / 1000);
     const velocity = Math.abs(dx) / elapsed;
     const ratio = Math.abs(dx) / window.innerWidth;
     const shouldNav = ratio > THRESHOLD || velocity > VELOCITY;
     const target = s.adjacentPage;
     const dir = s.direction;

     if (shouldNav && target) {
       if (mainContentRef.current) {
         mainContentRef.current.style.transition = TRANSITION;
         mainContentRef.current.style.transform = dir === 'left' ? 'translateX(-100%)' : 'translateX(100%)';
       }
       if (adjacentContentRef.current) {
         adjacentContentRef.current.style.transition = TRANSITION;
         adjacentContentRef.current.style.transform = 'translateX(0%)';
       }
       setTimeout(() => {
         navigateToRef.current(target);
         requestAnimationFrame(() => {
           setSwipeAdjacentPage(null);
           if (mainContentRef.current) { mainContentRef.current.style.transition = 'none'; mainContentRef.current.style.transform = ''; }
         });
       }, 300);
     } else {
       if (mainContentRef.current) {
         mainContentRef.current.style.transition = TRANSITION;
         mainContentRef.current.style.transform = 'translateX(0%)';
       }
       if (adjacentContentRef.current) {
         adjacentContentRef.current.style.transition = TRANSITION;
         adjacentContentRef.current.style.transform = `translateX(${dir === 'left' ? '100' : '-100'}%)`;
       }
       setTimeout(() => {
         setSwipeAdjacentPage(null);
         if (mainContentRef.current) { mainContentRef.current.style.transition = 'none'; mainContentRef.current.style.transform = ''; }
       }, 300);
     }

     s.active = false;
   };

   el.addEventListener('touchstart', onStart, { passive: true });
   el.addEventListener('touchmove', onMove, { passive: false });
   el.addEventListener('touchend', onEnd, { passive: true });
   return () => {
     el.removeEventListener('touchstart', onStart);
     el.removeEventListener('touchmove', onMove);
     el.removeEventListener('touchend', onEnd);
   };
 }, []);

 const isCreationPage = ['product-studio', 'provador', 'look-composer', 'lifestyle', 'creative-still'].includes(currentPage);

 // Limpar badge da feature específica quando navega para ela
 useEffect(() => {
   if (isCreationPage) {
     clearCompletedFeature(currentPage);
   } else if (currentPage === 'create') {
     // Não limpa automaticamente — badges ficam nos cards do hub
   }
 }, [currentPage, isCreationPage, clearCompletedFeature]);

 return (
 <div
 id="swipe-root"
 className={'h-[100dvh] flex flex-col md:flex-row overflow-hidden ' + (theme === 'dark' ? 'bg-black' : 'bg-cream')}
 >

 {/* DESKTOP SIDEBAR */}
 <aside className={'hidden md:flex flex-col border-r transition-all duration-200 ' + (sidebarCollapsed ? 'w-20' : 'w-52') + ' ' + (theme === 'dark' ? 'bg-neutral-950/95 backdrop-blur-xl border-neutral-800/50' : 'bg-[#efebe6] border-[#e5e6ea]')}>
 <div className={'p-4 border-b flex flex-col items-center relative ' + (theme === 'dark' ? 'border-neutral-900' : 'border-[#e5e6ea]')}>
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
 className={'absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-6 rounded-full flex items-center justify-center transition-colors z-10 border ' + (theme === 'dark' ? 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-800' : 'bg-white border-gray-200 text-[#373632]/50 hover:text-[#373632] shadow-sm')}
 >
 <i className={'fas ' + (sidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left') + ' text-[9px]'}></i>
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
 ? (theme === 'dark' ? 'bg-gradient-to-r from-[#FF6B6B]/15 to-[#FF9F43]/15 text-white' : 'bg-white/60 text-[#373632]')
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
 ? (theme === 'dark' ? 'bg-gradient-to-r from-[#FF6B6B]/15 to-[#FF9F43]/15 text-white' : 'bg-white/60 text-[#373632]')
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
 className={'relative w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ' +
 (currentPage === 'create' || currentPage === 'provador' || currentPage === 'look-composer' || currentPage === 'lifestyle' || currentPage === 'creative-still' || currentPage === 'product-studio'
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white scale-[1.02]'
 : 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:scale-[1.02]'
 )
 }
 >
 <i className="fas fa-wand-magic-sparkles text-[10px]"></i>{!sidebarCollapsed && 'Criar'}
 {completedFeatures.length > 0 && (
   <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-white text-[#FF6B6B] text-[10px] font-bold shadow-md animate-bounce">
     {completedFeatures.length}
   </span>
 )}
 </button>
 </div>

 {/* Modelos */}
 <button
 onClick={() => navigateTo('models')}
 title="Modelos"
 className={'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ' +
 (sidebarCollapsed ? 'justify-center' : '') + ' ' +
 (currentPage === 'models'
 ? (theme === 'dark' ? 'bg-gradient-to-r from-[#FF6B6B]/15 to-[#FF9F43]/15 text-white' : 'bg-white/60 text-[#373632]')
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
 ? (theme === 'dark' ? 'bg-gradient-to-r from-[#FF6B6B]/15 to-[#FF9F43]/15 text-white' : 'bg-white/60 text-[#373632]')
 : (theme === 'dark' ? 'text-neutral-400 hover:text-white hover:bg-neutral-900' : 'text-[#373632] hover:text-[#373632] hover:bg-white/40')
 )
 }
 >
 <i className="fas fa-users w-4 text-[10px]"></i>{!sidebarCollapsed && 'Clientes'}
 </button>
 </nav>
 <div className={'p-3 border-t space-y-2 ' + (theme === 'dark' ? 'border-neutral-900' : 'border-[#e5e6ea]')}>
 <div className={(theme === 'dark' ? 'bg-neutral-900' : 'bg-white/40') + ' rounded-xl p-3 transition-all' + (userCredits <= 5 ? ' ring-2 ring-red-500/50' : '')}>
 {!sidebarCollapsed ? (
 <>
 <div className="flex items-center justify-between mb-1.5">
 <span className={'text-[9px] font-medium uppercase tracking-wide ' + (theme === 'dark' ? 'text-neutral-400' : 'text-[#373632]/60')}>Créditos</span>
 <button onClick={() => { navigateTo('settings'); setSettingsTab('plan'); }} className={(theme === 'dark' ? 'text-[#FF6B6B] hover:text-[#FF6B6B]' : 'text-[#373632] hover:text-[#373632]/80') + ' text-[9px] font-medium'}>+ Add</button>
 </div>
 <p className={'text-xl font-bold ' + (theme === 'dark' ? 'text-white' : 'text-[#373632]')}>{userCredits.toLocaleString()}</p>
 <div className={'mt-2 h-1.5 rounded-full overflow-hidden ' + (theme === 'dark' ? 'bg-neutral-800' : 'bg-[#e5e6ea]')}>
 <div className={((userCredits <= currentPlan.limit * 0.2 ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]') + ' h-full rounded-full')} style={{ width: Math.min(100, Math.max(5, (Math.min(userCredits, currentPlan.limit) / currentPlan.limit) * 100)) + '%' }}></div>
 </div>
 {userCredits <= 5 && <p className="text-[9px] text-red-400 mt-1.5 font-medium">Saldo baixo</p>}
 </>
 ) : (
 <div className="text-center">
 <p className={'text-xs font-bold ' + (userCredits <= 5 ? 'text-red-400' : (theme === 'dark' ? 'text-white' : 'text-[#373632]'))}>{userCredits}</p>
 <p className={'text-[8px] ' + (userCredits <= 5 ? 'text-red-400/70' : (theme === 'dark' ? 'text-neutral-500' : 'text-[#373632]/40'))}>cred.</p>
 </div>
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
 ? (theme === 'dark' ? 'bg-gradient-to-r from-[#FF6B6B]/15 to-[#FF9F43]/15 text-white' : 'bg-white/60 text-[#373632]')
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
 className={'w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ' + (theme === 'dark' ? 'text-neutral-300 hover:bg-neutral-700' : 'text-gray-700 hover:bg-gray-100')}
 >
 <i className="fas fa-user w-4 text-[10px] text-center"></i>Perfil
 </button>
 <button
 onClick={() => { navigateTo('settings'); setSettingsTab('plan'); setShowSettingsDropdown(false); }}
 className={'w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ' + (theme === 'dark' ? 'text-neutral-300 hover:bg-neutral-700' : 'text-gray-700 hover:bg-gray-100')}
 >
 <i className="fas fa-credit-card w-4 text-[10px] text-center"></i>Planos & Créditos
 </button>
 <button
 onClick={() => { navigateTo('settings'); setSettingsTab('integrations'); setShowSettingsDropdown(false); }}
 className={'w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ' + (theme === 'dark' ? 'text-neutral-300 hover:bg-neutral-700' : 'text-gray-700 hover:bg-gray-100')}
 >
 <i className="fas fa-plug w-4 text-[10px] text-center"></i>Integrações
 </button>
 <div className={(theme === 'dark' ? 'border-neutral-700' : 'border-[#e5e6ea]') + ' border-t'}></div>
 <button
 onClick={() => { navigateTo('settings'); setSettingsTab('history'); setShowSettingsDropdown(false); }}
 className={'w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ' + (theme === 'dark' ? 'text-neutral-300 hover:bg-neutral-700' : 'text-gray-700 hover:bg-gray-100')}
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

 {/* LOW CREDITS BANNER */}
 {!isCreationPage && onBuyCredits && (
  <LowCreditsBanner
   userCredits={userCredits}
   currentPlanId={currentPlan?.id || 'free'}
   theme={theme as 'dark' | 'light'}
   onBuyCredits={onBuyCredits}
  />
 )}

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
 className={'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ' + (userCredits <= 5 ? 'bg-red-500/15 text-red-400 border border-red-500/30' : (theme === 'dark' ? 'bg-white/10 text-neutral-300 border border-white/15' : 'bg-gray-100 text-gray-600 border border-gray-200'))}
 >
 <i className={'fas fa-coins text-[10px] ' + (userCredits <= 5 ? 'text-red-400' : 'text-[#FF9F43]')}></i>
 <span>{userCredits} créditos</span>
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

 <div className="flex-1 relative overflow-hidden">
   <div ref={mainContentRef} className="absolute inset-0 flex flex-col" style={{ willChange: swipeAdjacentPage ? 'transform' : 'auto' }}>
     {children}
   </div>
   {swipeAdjacentPage && renderSwipePage && (
     <div ref={adjacentContentRef} className="absolute inset-0 flex flex-col overflow-y-auto" style={{ willChange: 'transform' }}>
       {renderSwipePage(swipeAdjacentPage)}
     </div>
   )}
 </div>
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
 {completedFeatures.length > 0 && (
   <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[#FF6B6B] text-white text-[10px] font-bold shadow-md animate-bounce">
     {completedFeatures.length}
   </span>
 )}
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
 <div className={'absolute inset-0 flex flex-col items-center justify-center text-white ' + (showVideoTutorial === 'studio' ? 'bg-gradient-to-br from-[#A855F7] via-indigo-600 to-blue-600' : 'bg-gradient-to-br from-[#FF6B6B] via-[#FF6B9D] to-[#FF9F43]')}>
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
 <button onClick={() => { setShowVideoTutorial(null); navigateTo(showVideoTutorial); }} className={'px-6 py-3 text-white font-bold rounded-xl flex items-center gap-2 ' + (showVideoTutorial === 'studio' ? 'bg-gradient-to-r from-[#A855F7] via-indigo-500 to-[#A855F7]' : 'bg-gradient-to-r from-[#FF6B6B] via-[#FF6B9D] to-[#FF9F43]')}>
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
 <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-xl ">
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
 onClick={() => handleMinimizedClick(() => setProductStudioMinimized(false), 'product-studio')}
 >
 <div className="bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] rounded-2xl p-4 flex items-center gap-4 min-w-[280px] shadow-lg">
 <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center">
 <img src="/Scene-1.gif" alt="" className="h-full object-cover" style={{ width: '140%', maxWidth: 'none' }} />
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
 onClick={() => handleMinimizedClick(() => setLookComposerMinimized(false), 'look-composer')}
 >
 <div className="bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] rounded-2xl p-4 flex items-center gap-4 min-w-[280px] shadow-lg">
 <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center">
 <img src="/Scene-1.gif" alt="" className="h-full object-cover" style={{ width: '140%', maxWidth: 'none' }} />
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
 onClick={() => handleMinimizedClick(() => setProvadorMinimized(false), 'provador')}
 >
 <div className="bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] rounded-2xl p-4 flex items-center gap-4 min-w-[280px] shadow-lg">
 <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center">
 <img src="/Scene-1.gif" alt="" className="h-full object-cover" style={{ width: '140%', maxWidth: 'none' }} />
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

 {/* Vizzu Still Criativo - Minimizado */}
 {isGeneratingCreativeStill && creativeStillMinimized && (
 <div
 className="fixed z-50 cursor-grab active:cursor-grabbing select-none touch-none"
 style={minimizedBarPos.x === -1 ? { bottom: 24, right: 24 } : { left: minimizedBarPos.x, top: minimizedBarPos.y }}
 onMouseDown={handleDragStart}
 onTouchStart={handleDragStart}
 onClick={() => handleMinimizedClick(() => setCreativeStillMinimized(false), 'creative-still')}
 >
 <div className="bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] rounded-2xl p-4 flex items-center gap-4 min-w-[280px] shadow-lg">
 <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center">
 <img src="/Scene-1.gif" alt="" className="h-full object-cover" style={{ width: '140%', maxWidth: 'none' }} />
 </div>
 <div className="flex-1">
 <p className="text-white text-sm font-medium">Still Criativo</p>
 <div className="flex items-center gap-2 mt-1">
 <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
 <div
 className="h-full bg-white rounded-full transition-all duration-500"
 style={{ width: `${creativeStillProgress}%` }}
 ></div>
 </div>
 <span className="text-white text-xs font-medium">{Math.round(creativeStillProgress)}%</span>
 </div>
 </div>
 <button className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
 <i className="fas fa-expand"></i>
 </button>
 </div>
 </div>
 )}

 {/* Modelos - Minimizado */}
 {isGeneratingModels && modelsMinimized && (
 <div
 className="fixed z-50 cursor-grab active:cursor-grabbing select-none touch-none"
 style={minimizedBarPos.x === -1 ? { bottom: 24, right: 24 } : { left: minimizedBarPos.x, top: minimizedBarPos.y }}
 onMouseDown={handleDragStart}
 onTouchStart={handleDragStart}
 onClick={() => handleMinimizedClick(() => setModelsMinimized(false), 'models')}
 >
 <div className="bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] rounded-2xl p-4 flex items-center gap-4 min-w-[280px] shadow-lg">
 <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center">
 <img src="/Scene-1.gif" alt="" className="h-full object-cover" style={{ width: '140%', maxWidth: 'none' }} />
 </div>
 <div className="flex-1">
 <p className="text-white text-sm font-medium">Criando Modelo</p>
 <div className="flex items-center gap-2 mt-1">
 <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
 <div
 className="h-full bg-white rounded-full transition-all duration-500"
 style={{ width: `${modelsProgress}%` }}
 ></div>
 </div>
 <span className="text-white text-xs font-medium">{modelsProgress}%</span>
 </div>
 </div>
 <button className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
 <i className="fas fa-expand"></i>
 </button>
 </div>
 </div>
 )}

 {/* Toast de notificação — clique para fechar */}
 {toast && (
 <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-fade-in w-[calc(100%-2rem)] max-w-sm">
 <div
 onClick={dismissToast}
 className={`px-4 py-3 rounded-xl flex flex-col items-center gap-2 cursor-pointer shadow-lg transition-opacity hover:opacity-90 ${
 toast.type === 'success' ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white' :
 toast.type === 'error' ? 'bg-red-500 text-white' :
 'bg-neutral-800 text-white'
 }`}
 >
 <div className="flex items-center gap-2">
 <i className={`fas ${
 toast.type === 'success' ? 'fa-check-circle' :
 toast.type === 'error' ? 'fa-exclamation-circle' :
 'fa-info-circle'
 } text-sm shrink-0`}></i>
 <span className="text-sm font-medium text-center">{toast.message}</span>
 </div>
 {toast.action && (
 <button onClick={(e) => { e.stopPropagation(); toast.action!.onClick(); }} className="px-2.5 py-0.5 bg-white/20 rounded-lg text-xs font-semibold hover:bg-white/30 transition-colors whitespace-nowrap">
 {toast.action.label} <i className="fas fa-arrow-right text-[9px] ml-1"></i>
 </button>
 )}
 </div>
 </div>
 )}
 </div>
 );
}
