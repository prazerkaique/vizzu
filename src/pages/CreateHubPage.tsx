import React from 'react';
import { useUI } from '../contexts/UIContext';
import { useGeneration } from '../contexts/GenerationContext';

interface CreateHubPageProps {
  userCredits: number;
}

export function CreateHubPage({ userCredits }: CreateHubPageProps) {
  const { theme, navigateTo, setSettingsTab, setShowVideoTutorial } = useUI();
  const { completedFeatures, clearCompletedFeature } = useGeneration();

  return (
    <div className={'flex-1 overflow-y-auto p-4 md:p-6 transition-colors duration-200 ' + (theme === 'dark' ? '' : 'bg-cream')}>
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
    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-600') + ' text-xs font-serif italic'}>Escolha uma ferramenta para criar com IA</p>
    </div>
    </div>
    </div>

    {/* Video Cards Grid - 2x2 */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
    {/* Card 1: Vizzu Product Studio */}
    <div
    onClick={() => { clearCompletedFeature('product-studio'); navigateTo('product-studio'); }}
    className={'creation-card group relative overflow-hidden rounded-xl cursor-pointer active:opacity-90 ' + (theme === 'dark' ? 'bg-neutral-800 border border-neutral-700' : 'bg-gray-100 border-2 border-gray-200')}
    style={{ minHeight: '240px', height: 'auto' }}
    >
    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/banner-product-studio.webp)' }}></div>
    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20 group-hover:from-black/60 group-hover:via-black/30 group-hover:to-black/10 transition-all duration-300"></div>
    <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
    <div>
    <div className="flex items-center gap-2 mb-2">
    <span className="px-2 py-0.5 bg-white/90 text-[#FF6B6B] text-[9px] font-bold rounded-full uppercase whitespace-nowrap">IA</span>
    <span className="flex items-center gap-1 px-2 py-0.5 bg-white/15 backdrop-blur-sm rounded-full text-sm text-white/90 whitespace-nowrap">
    <i className="fas fa-coins text-[#FF9F43] text-[10px]"></i>1 crédito/foto
    </span>
    </div>
    <h3 className="text-xl font-bold text-white mb-1 font-serif">Vizzu Product Studio®</h3>
    <p className="text-white/70 text-sm">Fotos profissionais do produto em múltiplos ângulos com fundo cinza de estúdio</p>
    </div>
    <div className="flex items-center justify-between">
    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 border border-white/30 group-hover:bg-white/30 group-hover:scale-110">
    <i className="fas fa-cube text-white text-lg"></i>
    </div>
    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all">
    <i className="fas fa-arrow-right text-white/60 text-xs group-hover:text-white transition-colors"></i>
    </div>
    </div>
    </div>
    {completedFeatures.includes('product-studio') && (
    <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-full shadow-lg animate-bounce">
    <i className="fas fa-check-circle text-[#FF6B6B] text-xs"></i>
    <span className="text-[#FF6B6B] text-[10px] font-bold">Pronto!</span>
    </div>
    )}
    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
    </div>

    {/* Card 2: Vizzu Provador */}
    <div
    onClick={() => { clearCompletedFeature('provador'); navigateTo('provador'); }}
    className={'creation-card group relative overflow-hidden rounded-xl cursor-pointer active:opacity-90 ' + (theme === 'dark' ? 'bg-neutral-800 border border-neutral-700' : 'bg-gray-100 border-2 border-gray-200')}
    style={{ minHeight: '240px', height: 'auto' }}
    >
    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/banner-provador.webp)' }}></div>
    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20 group-hover:from-black/60 group-hover:via-black/30 group-hover:to-black/10 transition-all duration-300"></div>
    <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
    <div>
    <div className="flex items-center gap-2 mb-2">
    <span className="px-2 py-0.5 bg-white/90 text-[#FF6B6B] text-[9px] font-bold rounded-full uppercase whitespace-nowrap">Novo</span>
    <span className="flex items-center gap-1 px-2 py-0.5 bg-white/15 backdrop-blur-sm rounded-full text-sm text-white/90 whitespace-nowrap">
    <i className="fas fa-coins text-[#FF9F43] text-[10px]"></i>1 crédito
    </span>
    </div>
    <h3 className="text-xl font-bold text-white mb-1 font-serif">Vizzu Provador®</h3>
    <p className="text-white/70 text-sm">Vista seu cliente com suas roupas. Prova virtual pelo WhatsApp</p>
    </div>
    <div className="flex items-center justify-between">
    <div className="play-btn w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 border border-white/30 group-hover:bg-white/30 group-hover:scale-110">
    <i className="fas fa-play text-white ml-1"></i>
    </div>
    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all">
    <i className="fas fa-arrow-right text-white/60 text-xs group-hover:text-white transition-colors"></i>
    </div>
    </div>
    </div>
    {completedFeatures.includes('provador') && (
    <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-full shadow-lg animate-bounce">
    <i className="fas fa-check-circle text-[#FF6B6B] text-xs"></i>
    <span className="text-[#FF6B6B] text-[10px] font-bold">Pronto!</span>
    </div>
    )}
    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
    </div>

    {/* Card 3: Vizzu Look Composer */}
    <div
    onClick={() => { clearCompletedFeature('look-composer'); navigateTo('look-composer'); }}
    className={'creation-card group relative overflow-hidden rounded-xl cursor-pointer active:opacity-90 ' + (theme === 'dark' ? 'bg-neutral-800 border border-neutral-700' : 'bg-gray-100 border-2 border-gray-200')}
    style={{ minHeight: '240px', height: 'auto' }}
    >
    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/banner-look-composer.webp)' }}></div>
    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20 group-hover:from-black/60 group-hover:via-black/30 group-hover:to-black/10 transition-all duration-300"></div>
    <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
    <div>
    <div className="flex items-center gap-2 mb-2">
    <span className="px-2 py-0.5 bg-white/90 text-[#FF6B6B] text-[9px] font-bold rounded-full uppercase whitespace-nowrap">IA</span>
    <span className="flex items-center gap-1 px-2 py-0.5 bg-white/15 backdrop-blur-sm rounded-full text-sm text-white/90 whitespace-nowrap">
    <i className="fas fa-coins text-[#FF9F43] text-[10px]"></i>1 crédito
    </span>
    </div>
    <h3 className="text-xl font-bold text-white mb-1 font-serif">Vizzu Look Composer®</h3>
    <p className="text-white/70 text-sm">Crie looks com modelos virtuais em fundo studio ou cenário personalizado</p>
    </div>
    <div className="flex items-center justify-between">
    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 border border-white/30 group-hover:bg-white/30 group-hover:scale-110">
    <i className="fas fa-vest-patches text-white text-lg"></i>
    </div>
    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all">
    <i className="fas fa-arrow-right text-white/60 text-xs group-hover:text-white transition-colors"></i>
    </div>
    </div>
    </div>
    {completedFeatures.includes('look-composer') && (
    <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-full shadow-lg animate-bounce">
    <i className="fas fa-check-circle text-[#FF6B6B] text-xs"></i>
    <span className="text-[#FF6B6B] text-[10px] font-bold">Pronto!</span>
    </div>
    )}
    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
    </div>

    {/* Card 4: Vizzu Still Criativo */}
    <div
    onClick={() => { clearCompletedFeature('creative-still'); navigateTo('creative-still'); }}
    className={'creation-card group relative overflow-hidden rounded-xl cursor-pointer active:opacity-90 ' + (theme === 'dark' ? 'bg-neutral-800 border border-neutral-700' : 'bg-gray-100 border-2 border-gray-200')}
    style={{ minHeight: '240px', height: 'auto' }}
    >
    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/banner-still-criativo.webp)' }}></div>
    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20 group-hover:from-black/60 group-hover:via-black/30 group-hover:to-black/10 transition-all duration-300"></div>
    <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
    <div>
    <div className="flex items-center gap-2 mb-2">
    <span className="px-2 py-0.5 bg-white/90 text-[#FF6B6B] text-[9px] font-bold rounded-full uppercase whitespace-nowrap">Novo</span>
    <span className="flex items-center gap-1 px-2 py-0.5 bg-white/15 backdrop-blur-sm rounded-full text-sm text-white/90 whitespace-nowrap">
    <i className="fas fa-coins text-[#FF9F43] text-[10px]"></i>1 crédito
    </span>
    </div>
    <h3 className="text-xl font-bold text-white mb-1 font-serif">Vizzu Still Criativo®</h3>
    <p className="text-white/70 text-sm">Composições artísticas de produto. Fotos estilo still life para Instagram</p>
    </div>
    <div className="flex items-center justify-between">
    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 border border-white/30 group-hover:bg-white/30 group-hover:scale-110">
    <i className="fas fa-palette text-white text-lg"></i>
    </div>
    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all">
    <i className="fas fa-arrow-right text-white/60 text-xs group-hover:text-white transition-colors"></i>
    </div>
    </div>
    </div>
    {completedFeatures.includes('creative-still') && (
    <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-full shadow-lg animate-bounce">
    <i className="fas fa-check-circle text-[#FF6B6B] text-xs"></i>
    <span className="text-[#FF6B6B] text-[10px] font-bold">Pronto!</span>
    </div>
    )}
    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
    </div>
    </div>

    {/* Em Breve - Faixa compacta */}
    <div className={'mt-4 rounded-xl ' + (theme === 'dark' ? 'bg-neutral-800/30 border border-neutral-700/50' : 'bg-gray-200/30 border border-gray-300/50')}>
    <div className="px-5 py-3 flex items-center gap-3">
    <i className={'fas fa-sparkles text-sm ' + (theme === 'dark' ? 'text-neutral-500' : 'text-gray-400')}></i>
    <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-sm font-serif italic'}>Mais ferramentas em breve</span>
    </div>
    </div>

    {/* Quick Stats */}
    <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-4 mt-4 transition-colors duration-200'}>
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
