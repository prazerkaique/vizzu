import React from 'react';
import { useUI } from '../contexts/UIContext';

interface CreateHubPageProps {
  userCredits: number;
}

export function CreateHubPage({ userCredits }: CreateHubPageProps) {
  const { theme, navigateTo, setSettingsTab, setShowVideoTutorial } = useUI();

  return (
    <div className={'flex-1 overflow-y-auto p-4 md:p-6 ' + (theme === 'dark' ? '' : 'bg-cream')}>
    <style>{`
    .creation-card {
    transition: all 0.3s ease;
    }
    .creation-card:hover {
    transform: translateY(-8px);
    border: 1px solid #e5e6ea;
    }
    .creation-card:active {
    transform: scale(0.98);
    }
    @media (max-width: 768px) {
    .creation-card:hover {
    transform: none;
    border: none;
    }
    }
    `}</style>
    <div className="max-w-5xl mx-auto">
    {/* Header */}
    <div className="mb-6">
    <div className="flex items-center gap-3 mb-2">
    <div className={'w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xl ' + (theme === 'dark' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
    <i className={'fas fa-wand-magic-sparkles text-sm ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
    </div>
    <div>
    <h1 className={'text-xl font-extrabold ' + (theme === 'dark' ? 'text-white' : 'text-[#1A1A1A]')}>Vizzu Creation</h1>
    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs font-serif italic'}>Escolha uma ferramenta para criar com IA</p>
    </div>
    </div>
    </div>

    {/* Video Cards Grid - 2x2 */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Card 1: Vizzu Product Studio */}
    <div
    onClick={() => navigateTo('product-studio')}
    className={'creation-card group relative overflow-hidden rounded-xl cursor-pointer ' + (theme === 'dark' ? 'bg-neutral-800 border border-neutral-700' : 'bg-gray-100 border-2 border-gray-200')}
    style={{ minHeight: '240px', height: 'auto' }}
    >
    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/banner-product-studio.webp)' }}></div>
    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20 group-hover:from-black/60 group-hover:via-black/30 group-hover:to-black/10 transition-all duration-300"></div>
    <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
    <div>
    <div className="flex items-center gap-2 mb-2">
    <span className="px-2 py-0.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white text-[9px] font-bold rounded-full uppercase">IA</span>
    <span className="text-white/60 text-xs">10 créditos/foto</span>
    </div>
    <h3 className="text-xl font-bold text-white mb-1 font-serif">Vizzu Product Studio®</h3>
    <p className="text-white/70 text-sm">Fotos profissionais do produto em múltiplos ângulos com fundo cinza de estúdio</p>
    </div>
    <div className="flex items-center justify-between">
    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 border border-white/30 group-hover:bg-white/30 group-hover:scale-110">
    <i className="fas fa-cube text-white text-lg"></i>
    </div>
    <button
    onClick={(e) => { e.stopPropagation(); navigateTo('product-studio'); }}
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
    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/banner-provador.webp)' }}></div>
    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20 group-hover:from-black/60 group-hover:via-black/30 group-hover:to-black/10 transition-all duration-300"></div>
    <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
    <div>
    <div className="flex items-center gap-2 mb-2">
    <span className="px-2 py-0.5 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-[9px] font-bold rounded-full uppercase">Novo</span>
    <span className="text-white/60 text-xs">10 créditos</span>
    </div>
    <h3 className="text-xl font-bold text-white mb-1 font-serif">Vizzu Provador®</h3>
    <p className="text-white/70 text-sm">Vista seu cliente com suas roupas. Prova virtual pelo WhatsApp</p>
    </div>
    <div className="flex items-center justify-between">
    <div className="play-btn w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 border border-white/30 group-hover:bg-white/30 group-hover:scale-110">
    <i className="fas fa-play text-white ml-1"></i>
    </div>
    <button
    onClick={(e) => { e.stopPropagation(); navigateTo('provador'); }}
    className="px-4 py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-all border border-white/30"
    >
    Acessar <i className="fas fa-arrow-right text-xs"></i>
    </button>
    </div>
    </div>
    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
    </div>

    {/* Card 3: Vizzu Look Composer */}
    <div
    onClick={() => navigateTo('look-composer')}
    className={'creation-card group relative overflow-hidden rounded-xl cursor-pointer ' + (theme === 'dark' ? 'bg-neutral-800 border border-neutral-700' : 'bg-gray-100 border-2 border-gray-200')}
    style={{ minHeight: '240px', height: 'auto' }}
    >
    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/banner-look-composer.webp)' }}></div>
    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20 group-hover:from-black/60 group-hover:via-black/30 group-hover:to-black/10 transition-all duration-300"></div>
    <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
    <div>
    <div className="flex items-center gap-2 mb-2">
    <span className="px-2 py-0.5 bg-indigo-500 text-white text-[9px] font-bold rounded-full uppercase">IA</span>
    <span className="text-white/60 text-xs">10-20 créditos</span>
    </div>
    <h3 className="text-xl font-bold text-white mb-1 font-serif">Vizzu Look Composer®</h3>
    <p className="text-white/70 text-sm">Crie looks com modelos virtuais em fundo studio ou cenário personalizado</p>
    </div>
    <div className="flex items-center justify-between">
    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 border border-white/30 group-hover:bg-white/30 group-hover:scale-110">
    <i className="fas fa-vest-patches text-white text-lg"></i>
    </div>
    <button
    onClick={(e) => { e.stopPropagation(); navigateTo('look-composer'); }}
    className="px-4 py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-all border border-white/30"
    >
    Acessar <i className="fas fa-arrow-right text-xs"></i>
    </button>
    </div>
    </div>
    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
    </div>

    {/* Card 4: Vizzu Still Criativo */}
    <div
    onClick={() => navigateTo('creative-still')}
    className={'creation-card group relative overflow-hidden rounded-xl cursor-pointer ' + (theme === 'dark' ? 'bg-neutral-800 border border-neutral-700' : 'bg-gray-100 border-2 border-gray-200')}
    style={{ minHeight: '240px', height: 'auto' }}
    >
    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/banner-still-criativo.webp)' }}></div>
    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20 group-hover:from-black/60 group-hover:via-black/30 group-hover:to-black/10 transition-all duration-300"></div>
    <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
    <div>
    <div className="flex items-center gap-2 mb-2">
    <span className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-bold rounded-full uppercase">Novo</span>
    <span className="text-white/60 text-xs">2 créditos</span>
    </div>
    <h3 className="text-xl font-bold text-white mb-1 font-serif">Vizzu Still Criativo®</h3>
    <p className="text-white/70 text-sm">Composições artísticas de produto. Fotos estilo still life para Instagram</p>
    </div>
    <div className="flex items-center justify-between">
    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 border border-white/30 group-hover:bg-white/30 group-hover:scale-110">
    <i className="fas fa-palette text-white text-lg"></i>
    </div>
    <button
    onClick={(e) => { e.stopPropagation(); navigateTo('creative-still'); }}
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
    <div className={'w-10 h-10 rounded-lg flex items-center justify-center ' + (theme === 'dark' ? 'bg-gray-300' : 'bg-gray-300')}>
    <i className={'fas fa-sparkles ' + (theme === 'dark' ? 'text-neutral-500' : 'text-gray-500')}></i>
    </div>
    <div>
    <div className="flex items-center gap-2">
    <span className={'px-2 py-0.5 text-[9px] font-bold rounded-full uppercase ' + (theme === 'dark' ? 'bg-neutral-600 text-neutral-300' : 'bg-gray-400 text-white')}>Em breve</span>
    </div>
    <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-sm mt-0.5 font-serif italic'}>Mais ferramentas em desenvolvimento</p>
    </div>
    </div>
    <button
    disabled
    className={'px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 cursor-not-allowed ' + (theme === 'dark' ? 'bg-gray-300 text-neutral-500' : 'bg-gray-300 text-gray-500')}
    >
    Aguarde <i className="fas fa-clock text-xs"></i>
    </button>
    </div>
    </div>

    {/* Quick Stats */}
    <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-4 mt-4'}>
    <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
    <div className={'w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xl ' + (theme === 'dark' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
    <i className={'fas fa-coins ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
    </div>
    <div>
    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide'}>Seus Créditos</p>
    <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xl font-bold'}>{userCredits.toLocaleString()}</p>
    </div>
    </div>
    <button
    onClick={() => { navigateTo('settings'); setSettingsTab('plan'); }}
    className="px-4 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
    >
    Comprar mais
    </button>
    </div>
    </div>
    </div>
    </div>
  );
}
