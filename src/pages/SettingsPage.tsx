import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CompanySettings } from '../types';
import { useUI, type SettingsTab } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { useHistory } from '../contexts/HistoryContext';
import { PLANS, CREDIT_PACKAGES } from '../hooks/useCredits';
import { ImageMigrationPanel } from '../components/Admin/ImageMigrationPanel';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface SettingsPageProps {
 userCredits: number;
 currentPlan: any;
 billingPeriod: string;
 daysUntilRenewal: number;
 isCheckoutLoading: boolean;
 onBuyCredits: (amount: number) => void;
 onUpgradePlan: (planId: string) => void;
 onSetBillingPeriod: (period: string) => void;
 onLogout: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
 userCredits,
 currentPlan,
 billingPeriod,
 daysUntilRenewal,
 isCheckoutLoading,
 onBuyCredits,
 onUpgradePlan,
 onSetBillingPeriod,
 onLogout,
}) => {
 const { theme, setTheme, settingsTab, setSettingsTab, showToast } = useUI();
 const { user } = useAuth();
 const { historyLogs, setHistoryLogs } = useHistory();

 // Company Settings
 const [companySettings, setCompanySettings] = useState<CompanySettings>(() => {
 const saved = localStorage.getItem('vizzu_company_settings');
 if (saved) {
 try { return JSON.parse(saved); } catch { }
 }
 return {
 name: '',
 cnpj: '',
 instagram: '',
 targetAudience: '',
 voiceTone: 'casual' as const,
 voiceExamples: '',
 hashtags: [],
 emojisEnabled: true,
 captionStyle: 'media' as const,
 callToAction: '',
 };
 });

 // Persistir company settings (localStorage + Supabase)
 useEffect(() => {
 localStorage.setItem('vizzu_company_settings', JSON.stringify(companySettings));
 if (user?.id && companySettings.name) {
 saveCompanySettingsToSupabase(companySettings, user.id);
 }
 }, [companySettings, user?.id]);

 const loadUserCompanySettings = async (_userId: string) => {
 // TODO: Tabela company_settings não existe no Supabase ainda
 return;
 };

 const saveCompanySettingsToSupabase = async (_settings: CompanySettings, _userId: string) => {
 // TODO: Tabela company_settings não existe no Supabase ainda
 return;
 };

 // Lottie Theme Toggle
 const dotLottieRef = useRef<any>(null);
 const dotLottieRefCallback = useCallback((dotLottie: any) => {
 dotLottieRef.current = dotLottie;
 }, []);

 return (
 <div className="flex-1 overflow-y-auto p-4 md:p-6">
 <div className="max-w-2xl mx-auto">
 {/* Header com Dropdown */}
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-3">
 <div className={'w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xl ' + (theme === 'dark' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
 <i className={'fas fa-cog text-sm ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
 </div>
 <div>
 <h1 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-extrabold'}>Configurações</h1>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs font-serif italic hidden md:block'}>Gerencie sua conta e preferências</p>
 </div>
 </div>
 <button onClick={onLogout} className={'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-500 transition-colors ' + (theme === 'dark' ? 'hover:bg-red-500/10' : 'hover:bg-red-50')}>
 <i className="fas fa-sign-out-alt"></i>
 <span className="hidden md:inline">Sair</span>
 </button>
 </div>

 {/* Tabs de navegação - Mobile */}
 <div className="flex gap-1 overflow-x-auto pb-4 -mx-4 px-4 md:hidden scrollbar-hide">
 {[
 { id: 'profile' as SettingsTab, label: 'Perfil', icon: 'fa-user' },
 { id: 'appearance' as SettingsTab, label: 'Aparência', icon: 'fa-palette' },
 { id: 'company' as SettingsTab, label: 'Empresa', icon: 'fa-building' },
 { id: 'plan' as SettingsTab, label: 'Planos', icon: 'fa-credit-card' },
 { id: 'integrations' as SettingsTab, label: 'Integrações', icon: 'fa-plug' },
 { id: 'history' as SettingsTab, label: 'Histórico', icon: 'fa-clock-rotate-left' },
 { id: 'tools' as SettingsTab, label: 'Ferramentas', icon: 'fa-wrench' },
 ].map(tab => (
 <button
 key={tab.id}
 onClick={() => setSettingsTab(tab.id)}
 className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
 settingsTab === tab.id
 ? theme === 'dark' ? 'bg-neutral-700 text-white' : 'bg-gray-900 text-white'
 : theme === 'dark'
 ? 'bg-neutral-800 text-neutral-400 hover:bg-gray-300'
 : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
 }`}
 >
 <i className={`fas ${tab.icon} text-[10px]`}></i>
 {tab.label}
 </button>
 ))}
 </div>

 {/* Conteúdo da Seção */}
 <div className={settingsTab === 'plan' ? '' : 'max-w-xl'}>
 {settingsTab === 'plan' && (() => {
 const ALL_FEATURES = [
 { id: 'studio', name: 'Vizzu Studio', plans: ['basic', 'pro', 'premier', 'enterprise'] },
 { id: 'provador', name: 'Vizzu Provador', plans: ['basic', 'pro', 'premier', 'enterprise'] },
 { id: 'dashboard', name: 'Dashboard', plans: ['basic', 'pro', 'premier', 'enterprise'] },
 { id: 'fundo-estudio', name: 'Fundo de Estúdio', plans: ['basic', 'pro', 'premier', 'enterprise'] },
 { id: 'cenario', name: 'Cenário Criativo', plans: ['basic', 'pro', 'premier', 'enterprise'] },
 { id: 'reels', name: 'Fotos para Reels e Stories', plans: ['basic', 'pro', 'premier', 'enterprise'] },
 { id: 'modelo-ia', name: 'Modelo IA Feito sob medida', plans: ['basic', 'pro', 'premier', 'enterprise'] },
 { id: 'legendas', name: 'Gerador de Legendas IA', plans: ['basic', 'pro', 'premier', 'enterprise'] },
 { id: 'catalogo', name: 'Catálogo Virtual + WhatsApp', plans: ['basic', 'pro', 'premier', 'enterprise'] },
 { id: 'atendente-receptivo', name: 'Atendente Receptivo WhatsApp', plans: ['basic', 'pro', 'premier', 'enterprise'] },
 { id: '4k', name: 'Geração em 4K', plans: ['pro', 'premier', 'enterprise'] },
 { id: 'videos', name: 'Geração de Vídeos para Instagram', plans: ['pro', 'premier', 'enterprise'] },
 { id: 'agente-whatsapp', name: 'Agente Ativo de WhatsApp', plans: ['pro', 'premier', 'enterprise'] },
 { id: 'ecommerce', name: 'Integração com e-commerces', plans: ['premier', 'enterprise'] },
 { id: 'suporte', name: 'Suporte prioritário', plans: ['premier', 'enterprise'] },
 ];

 return (
 <div>
 {/* Header */}
 <div className="text-center mb-6">
 <h2 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xl font-bold mb-1 font-serif'}>Escolha o plano ideal para seu negocio</h2>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-sm font-serif italic'}>Transforme suas fotos de produtos em imagens profissionais com IA</p>
 </div>

 {/* Status atual de creditos */}
 <div className="bg-gradient-to-br from-[#E91E8C]/20 via-[#A855F7]/15 to-[#FF6B9D]/20 border border-[#E91E8C]/30 rounded-2xl p-5 mb-6 backdrop-blur-sm">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-4">
 <div className={'w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-xl ' + (theme === 'dark' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
 <i className={'fas fa-coins text-lg ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
 </div>
 <div>
 <p className="text-[#E91E8C] text-[10px] uppercase tracking-wider font-medium">Seus Creditos</p>
 <p className="text-white text-3xl font-bold">{userCredits} <span className="text-base font-normal text-neutral-400">/ {currentPlan.limit}</span></p>
 </div>
 </div>
 <div className="text-right">
 <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white whitespace-nowrap">
 <i className="fas fa-crown text-[10px]"></i>
 {currentPlan.name}
 </span>
 </div>
 </div>
 <div className="bg-neutral-900/50 h-3 rounded-full overflow-hidden">
 <div className="h-full bg-gradient-to-r from-[#E91E8C] via-[#A855F7] to-[#FF6B9D] rounded-full transition-all " style={{ width: Math.min(100, (userCredits / currentPlan.limit) * 100) + '%' }}></div>
 </div>
 </div>

 {/* Toggle Mensal/Anual */}
 <div className="flex items-center justify-center gap-3 mb-6">
 <span className={(billingPeriod === 'monthly' ? 'text-white' : 'text-neutral-500') + ' text-sm font-medium'}>Mensal</span>
 <button
 onClick={() => onSetBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
 className={(billingPeriod === 'yearly' ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]' : 'bg-gray-300') + ' relative w-14 h-7 rounded-full transition-colors'}
 >
 <div className={'absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ' + (billingPeriod === 'yearly' ? 'translate-x-8' : 'translate-x-1')}></div>
 </button>
 <span className={(billingPeriod === 'yearly' ? 'text-white' : 'text-neutral-500') + ' text-sm font-medium flex items-center gap-2'}>
 Anual
 <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full">-20%</span>
 </span>
 </div>

 {/* Cards dos Planos */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
 {PLANS.map(plan => {
 const isCurrentPlan = currentPlan.id === plan.id;
 const price = billingPeriod === 'monthly' ? plan.priceMonthly : plan.priceYearly;
 const isPro = plan.id === 'pro';
 const isPremier = plan.id === 'premier';
 const isEnterprise = plan.id === 'enterprise';

 return (
 <div
 key={plan.id}
 className={
 'relative rounded-2xl p-5 transition-all ' +
 (isCurrentPlan
 ? 'bg-gradient-to-br from-[#FF6B6B]/20 via-[#FF9F43]/15 to-neutral-900 border-2 border-[#FF9F43]'
 : isPro
 ? 'bg-gradient-to-br from-[#FF6B6B]/15 via-[#FF9F43]/10 to-neutral-900 border border-[#FF9F43]/30 hover:border-neutral-500'
 : isPremier
 ? 'bg-gradient-to-br from-amber-900/30 via-orange-900/20 to-neutral-900 border border-amber-500/30 hover:border-amber-500/60'
 : isEnterprise
 ? 'bg-gradient-to-br from-purple-900/30 via-indigo-900/20 to-neutral-900 border border-purple-500/30 hover:border-purple-500/60'
 : 'bg-gradient-to-br from-neutral-800/50 to-neutral-900 border border-neutral-700 hover:border-neutral-600'
 )
 }
 >
 {/* Badge */}
 {isCurrentPlan && (
 <div className="absolute -top-3 left-1/2 -translate-x-1/2">
 <span className="px-4 py-1.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white text-[10px] font-bold rounded-full whitespace-nowrap">
 ATUAL
 </span>
 </div>
 )}
 {isPro && !isCurrentPlan && (
 <div className="absolute -top-3 left-1/2 -translate-x-1/2">
 <span className="px-4 py-1.5 bg-gradient-to-r from-[#E91E8C] to-[#A855F7] text-white text-[10px] font-bold rounded-full whitespace-nowrap">
 POPULAR
 </span>
 </div>
 )}
 {isPremier && !isCurrentPlan && (
 <div className="absolute -top-3 left-1/2 -translate-x-1/2">
 <span className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-[#FF9F43] text-white text-[10px] font-bold rounded-full flex items-center gap-1 whitespace-nowrap">
 <i className="fas fa-star text-[8px]"></i>
 MELHOR VALOR
 </span>
 </div>
 )}
 {isEnterprise && !isCurrentPlan && (
 <div className="absolute -top-3 left-1/2 -translate-x-1/2">
 <span className="px-4 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center gap-1 whitespace-nowrap">
 <i className="fas fa-building text-[8px]"></i>
 ENTERPRISE
 </span>
 </div>
 )}

 <div className="pt-3">
 <h3 className="text-white text-xl font-bold font-serif">{plan.name}</h3>
 <div className="mt-3 mb-4">
 <span className="text-white text-3xl font-bold">
 R$ {price.toFixed(2).replace('.', ',')}
 </span>
 <span className="text-neutral-500 text-sm">/mes</span>
 </div>

 <div className="bg-neutral-900/50 rounded-xl p-3 mb-4 border border-neutral-800">
 <div className="flex items-center gap-2">
 <i className="fas fa-bolt text-amber-400"></i>
 <span className="text-white font-bold text-xl">{plan.limit}</span>
 <span className="text-neutral-400 text-xs">creditos/mes</span>
 </div>
 <p className="text-neutral-500 text-[10px] mt-1">R$ {plan.creditPrice.toFixed(2).replace('.', ',')} por credito extra</p>
 </div>

 <ul className="space-y-2 mb-4">
 {ALL_FEATURES.map((feature) => {
 const hasFeature = feature.plans.includes(plan.id);
 return (
 <li key={feature.id} className="flex items-start gap-2 text-[11px]">
 {hasFeature ? (
 <i className="fas fa-check text-emerald-400 mt-0.5 text-[9px]"></i>
 ) : (
 <i className="fas fa-times text-red-500 mt-0.5 text-[9px]"></i>
 )}
 <span className={hasFeature ? 'text-neutral-300' : 'text-neutral-600 line-through'}>{feature.name}</span>
 </li>
 );
 })}
 </ul>

 <button
 onClick={() => {
 if (!isCurrentPlan) {
 showToast('Checkout Stripe nao implementado. Configure os webhooks do n8n.', 'info');
 }
 }}
 className={
 'w-full py-3 rounded-xl font-semibold text-sm transition-all ' +
 (isCurrentPlan
 ? 'bg-neutral-800 text-neutral-500 cursor-default'
 : 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:scale-[1.02]'
 )
 }
 >
 {isCurrentPlan ? 'Plano Atual' : plan.priceMonthly > currentPlan.priceMonthly ? 'Fazer upgrade' : 'Mudar para este plano'}
 </button>
 </div>
 </div>
 );
 })}
 </div>

 {/* Secao: Compre Creditos Adicionais */}
 <div className="bg-gradient-to-br from-amber-900/20 via-orange-900/10 to-neutral-900 border border-amber-500/20 rounded-2xl p-5 mb-6">
 <div className="flex items-center gap-3 mb-4">
 <div className={'w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xl ' + (theme === 'dark' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
 <i className={'fas fa-coins ' + (theme === 'dark' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
 </div>
 <div>
 <h4 className="text-white font-semibold">Compre Creditos Adicionais</h4>
 <p className="text-neutral-400 text-xs">R$ {currentPlan.creditPrice.toFixed(2).replace('.', ',')} por credito no seu plano</p>
 </div>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 {CREDIT_PACKAGES.map(amount => (
 <button
 key={amount}
 onClick={() => showToast('Checkout Stripe nao implementado. Configure os webhooks do n8n.', 'info')}
 className="bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 hover:border-amber-500/50 rounded-xl p-4 transition-all hover:scale-[1.02] group"
 >
 <div className="flex items-center justify-center gap-2 mb-2">
 <i className="fas fa-bolt text-amber-400 group-hover:scale-110 transition-transform"></i>
 <span className="text-white font-bold text-2xl">{amount}</span>
 </div>
 <p className="text-neutral-500 text-[10px] mb-1">creditos</p>
 <p className="text-amber-400 font-bold text-sm">
 R$ {(amount * currentPlan.creditPrice).toFixed(2).replace('.', ',')}
 </p>
 </button>
 ))}
 </div>
 </div>

 {/* FAQ */}
 <div className="bg-gradient-to-br from-neutral-800/50 to-neutral-900 border border-neutral-700 rounded-2xl p-5">
 <details className="group">
 <summary className="text-white hover:text-neutral-300 font-medium text-sm cursor-pointer flex items-center justify-between">
 <span className="flex items-center gap-2">
 <i className="fas fa-circle-question text-[#E91E8C]"></i>
 Perguntas Frequentes
 </span>
 <i className="fas fa-chevron-down text-xs transition-transform group-open:rotate-180"></i>
 </summary>
 <div className="text-neutral-400 mt-4 space-y-3 text-xs">
 <div>
 <p className="text-white font-medium mb-1">O que sao creditos?</p>
 <p>Creditos sao usados para gerar imagens com IA. Cada foto gerada consome 10 creditos.</p>
 </div>
 <div>
 <p className="text-white font-medium mb-1">Posso mudar de plano?</p>
 <p>Sim! Voce pode fazer upgrade ou downgrade a qualquer momento. O valor e ajustado proporcionalmente.</p>
 </div>
 <div>
 <p className="text-white font-medium mb-1">Os creditos acumulam?</p>
 <p>Creditos nao utilizados nao acumulam para o proximo mes, mas creditos comprados avulso nao expiram.</p>
 </div>
 </div>
 </details>
 </div>

 {/* Footer */}
 <p className="text-neutral-500 text-center text-xs mt-6">
 Precisa de mais? <a href="#" className="text-[#E91E8C] hover:underline">Entre em contato</a> para planos personalizados.
 </p>
 </div>
 );
 })()}

 {settingsTab === 'profile' && (
 <div>
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold mb-4 font-serif'}>Perfil</h3>
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-4'}>
 <div className="flex items-center gap-3 mb-5">
 <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' w-14 h-14 rounded-full flex items-center justify-center overflow-hidden'}>
 {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="" /> : <i className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' fas fa-user text-lg'}></i>}
 </div>
 <button className={(theme === 'dark' ? 'bg-neutral-800 text-white hover:bg-gray-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200') + ' px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors'}>Alterar Foto</button>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 <div>
 <label htmlFor="profile-name" className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>Nome</label>
 <input type="text" id="profile-name" name="profileName" autoComplete="name" defaultValue={user?.name} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'} />
 </div>
 <div>
 <label htmlFor="profile-email" className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>Email</label>
 <input type="email" id="profile-email" name="profileEmail" autoComplete="email" defaultValue={user?.email} className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-neutral-500' : 'bg-gray-100 border-gray-200 text-gray-500') + ' w-full px-3 py-2 border rounded-lg text-sm'} disabled />
 </div>
 </div>
 </div>
 </div>
 )}

 {settingsTab === 'appearance' && (
 <div>
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold mb-4 font-serif'}>Aparência</h3>
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-4'}>
 <div className="flex items-center justify-between">
 <div>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-sm'}>Tema</p>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] mt-0.5'}>
 {theme === 'dark' ? 'Modo escuro ativo' : 'Modo claro ativo'}
 </p>
 </div>
 <div
 onClick={() => {
 setTheme(theme === 'dark' ? 'light' : 'dark');
 if (dotLottieRef.current) {
 dotLottieRef.current.postStateMachineEvent('OnPointerDown');
 }
 }}
 className="cursor-pointer hover:scale-110 transition-transform"
 style={{ width: 80, height: 80 }}
 >
 <DotLottieReact
 dotLottieRefCallback={dotLottieRefCallback}
 src="https://lottie.host/97eaa266-6a0b-45c7-917f-97933914029a/GtkUp9Odq8.lottie"
 autoplay
 useFrameInterpolation
 stateMachineId="StateMachine1"
 style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
 />
 </div>
 </div>
 </div>
 </div>
 )}

 {settingsTab === 'company' && (
 <div className="space-y-4">
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold font-serif'}>Empresa</h3>

 {/* Dados Básicos */}
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-4'}>
 <h4 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-sm mb-3 flex items-center gap-2'}>
 <i className="fas fa-building text-[#E91E8C] text-xs"></i>
 Dados Básicos
 </h4>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>Nome da Empresa</label>
 <input
 type="text"
 value={companySettings.name}
 onChange={(e) => setCompanySettings({ ...companySettings, name: e.target.value })}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}
 placeholder="Sua Loja"
 />
 </div>
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>Instagram</label>
 <input
 type="text"
 value={companySettings.instagram || ''}
 onChange={(e) => setCompanySettings({ ...companySettings, instagram: e.target.value })}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}
 placeholder="@sualoja"
 />
 </div>
 </div>
 </div>

 {/* Configurações de Legenda IA */}
 <div className={(theme === 'dark' ? 'bg-gradient-to-r from-[#E91E8C]/10 to-[#FF9F43]/10 border-[#E91E8C]/30' : 'bg-gradient-to-r from-[#E91E8C]/5 to-[#FF9F43]/5 border-[#E91E8C]/20') + ' rounded-xl border p-4'}>
 <h4 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-sm mb-1 flex items-center gap-2'}>
 <i className="fas fa-wand-magic-sparkles text-[#E91E8C] text-xs"></i>
 Gerador de Legendas IA
 </h4>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-xs mb-4'}>Configure como a IA vai gerar legendas para suas postagens</p>

 <div className="space-y-4">
 {/* Público Alvo */}
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>Público Alvo</label>
 <input
 type="text"
 value={companySettings.targetAudience}
 onChange={(e) => setCompanySettings({ ...companySettings, targetAudience: e.target.value })}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}
 placeholder="Ex: Mulheres 25-45 anos, classe B/C, que gostam de moda casual"
 />
 </div>

 {/* Tom de Voz */}
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>Tom de Voz</label>
 <div className="grid grid-cols-5 gap-2">
 {[
 { id: 'formal', label: 'Formal', icon: '👔' },
 { id: 'casual', label: 'Casual', icon: '😊' },
 { id: 'divertido', label: 'Divertido', icon: '🎉' },
 { id: 'luxo', label: 'Luxo', icon: '✨' },
 { id: 'jovem', label: 'Jovem', icon: '🔥' },
 ].map(tone => (
 <button
 key={tone.id}
 onClick={() => setCompanySettings({ ...companySettings, voiceTone: tone.id as any })}
 className={`p-2 rounded-lg border text-center transition-all ${
 companySettings.voiceTone === tone.id
 ? 'border-[#E91E8C] bg-[#E91E8C]/20 text-[#E91E8C]'
 : theme === 'dark'
 ? 'border-neutral-700 bg-neutral-800 text-neutral-400 hover:border-neutral-600'
 : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
 }`}
 >
 <span className="text-lg block mb-0.5">{tone.icon}</span>
 <span className="text-[10px] font-medium">{tone.label}</span>
 </button>
 ))}
 </div>
 </div>

 {/* Exemplos de Tom */}
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>
 Exemplos de Como Você Fala
 <span className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' font-normal ml-1'}>(opcional)</span>
 </label>
 <textarea
 value={companySettings.voiceExamples || ''}
 onChange={(e) => setCompanySettings({ ...companySettings, voiceExamples: e.target.value })}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm resize-none'}
 rows={2}
 placeholder="Cole aqui algumas legendas que você já usou e gostou..."
 />
 </div>

 {/* Hashtags */}
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>Hashtags Favoritas</label>
 <input
 type="text"
 value={companySettings.hashtags.join(' ')}
 onChange={(e) => setCompanySettings({ ...companySettings, hashtags: e.target.value.split(' ').filter(h => h.startsWith('#') || h === '') })}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}
 placeholder="#moda #fashion #lookdodia #ootd"
 />
 <p className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' text-[10px] mt-1'}>Separe as hashtags por espaço</p>
 </div>

 {/* Tamanho e Emojis */}
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>Tamanho da Legenda</label>
 <select
 value={companySettings.captionStyle}
 onChange={(e) => setCompanySettings({ ...companySettings, captionStyle: e.target.value as any })}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}
 >
 <option value="curta">Curta (1-2 linhas)</option>
 <option value="media">Média (3-5 linhas)</option>
 <option value="longa">Longa (storytelling)</option>
 </select>
 </div>
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>Usar Emojis?</label>
 <button
 onClick={() => setCompanySettings({ ...companySettings, emojisEnabled: !companySettings.emojisEnabled })}
 className={`w-full px-3 py-2 border rounded-lg text-sm font-medium transition-all ${
 companySettings.emojisEnabled
 ? 'border-[#E91E8C] bg-[#E91E8C]/20 text-[#E91E8C]'
 : theme === 'dark'
 ? 'border-neutral-700 bg-neutral-800 text-neutral-400'
 : 'border-gray-200 bg-white text-gray-500'
 }`}
 >
 {companySettings.emojisEnabled ? '✅ Sim, usar emojis' : '❌ Não usar'}
 </button>
 </div>
 </div>

 {/* Call to Action */}
 <div>
 <label className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>
 Call to Action Padrão
 <span className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' font-normal ml-1'}>(opcional)</span>
 </label>
 <input
 type="text"
 value={companySettings.callToAction || ''}
 onChange={(e) => setCompanySettings({ ...companySettings, callToAction: e.target.value })}
 className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-gray-200 text-gray-900') + ' w-full px-3 py-2 border rounded-lg text-sm'}
 placeholder="Ex: Compre pelo link na bio! | Chama no direct 💬"
 />
 </div>
 </div>
 </div>

 {/* Botão Salvar */}
 <button
 onClick={() => showToast('Configurações salvas!', 'success')}
 className="w-full py-2.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
 >
 <i className="fas fa-check"></i>
 Salvar Configurações
 </button>
 </div>
 )}

 {settingsTab === 'integrations' && (
 <div>
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold mb-4 font-serif'}>Integrações</h3>
 <div className="space-y-2">
 {[
 { icon: 'fab fa-shopify', name: 'Shopify', desc: 'Sincronize produtos' },
 { icon: 'fab fa-wordpress', name: 'WooCommerce', desc: 'Loja WordPress' },
 { icon: 'fas fa-store', name: 'VTEX', desc: 'VTEX IO' },
 ].map(item => (
 <div key={item.name} className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-3 flex items-center justify-between'}>
 <div className="flex items-center gap-3">
 <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' w-9 h-9 rounded-lg flex items-center justify-center'}>
 <i className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' ' + item.icon + ' text-sm'}></i>
 </div>
 <div>
 <h4 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium text-xs'}>{item.name}</h4>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{item.desc}</p>
 </div>
 </div>
 <button className={(theme === 'dark' ? 'bg-neutral-800 text-white hover:bg-gray-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200') + ' px-3 py-1.5 rounded-lg font-medium text-[10px] transition-colors'}>Conectar</button>
 </div>
 ))}
 </div>
 </div>
 )}

 {settingsTab === 'history' && (
 <div>
 <div className="flex items-center justify-between mb-4">
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold font-serif'}>Histórico</h3>
 {historyLogs.length > 0 && (
 <button
 onClick={() => { if (confirm('Limpar todo o histórico?')) setHistoryLogs([]); }}
 className={(theme === 'dark' ? 'text-neutral-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500') + ' text-xs flex items-center gap-1.5'}
 >
 <i className="fas fa-trash-alt"></i>
 Limpar
 </button>
 )}
 </div>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mb-4'}>{historyLogs.length} atividades registradas</p>

 {historyLogs.length === 0 ? (
 <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-8 text-center'}>
 <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-purple-100') + ' w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3'}>
 <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-purple-400') + ' fas fa-clock-rotate-left text-xl'}></i>
 </div>
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium mb-1'}>Nenhuma atividade</h3>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>As atividades aparecerão aqui</p>
 </div>
 ) : (
 <div className="space-y-2">
 {historyLogs.map(log => {
 const statusConfig = {
 success: { icon: 'fa-check-circle', color: 'text-green-500', bg: theme === 'dark' ? 'bg-green-500/10' : 'bg-green-50' },
 error: { icon: 'fa-times-circle', color: 'text-red-500', bg: theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50' },
 pending: { icon: 'fa-clock', color: 'text-yellow-500', bg: theme === 'dark' ? 'bg-yellow-500/10' : 'bg-yellow-50' },
 };
 const methodConfig: Record<string, { icon: string; label: string }> = {
 manual: { icon: 'fa-hand', label: 'Manual' },
 auto: { icon: 'fa-robot', label: 'Automático' },
 api: { icon: 'fa-plug', label: 'API' },
 ai: { icon: 'fa-wand-magic-sparkles', label: 'IA' },
 bulk: { icon: 'fa-layer-group', label: 'Em massa' },
 system: { icon: 'fa-gear', label: 'Sistema' },
 };
 const status = statusConfig[log.status];
 const method = methodConfig[log.method] || methodConfig.system;
 const date = log.date ? new Date(log.date) : new Date();

 return (
 <div key={log.id} className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700' : 'bg-white border-gray-200 hover:border-gray-300 ') + ' rounded-xl border p-4 transition-colors'}>
 <div className="flex items-start gap-3">
 <div className={status.bg + ' w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0'}>
 <i className={'fas ' + status.icon + ' ' + status.color}></i>
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-1">
 <h4 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>{log.action}</h4>
 <span className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-500') + ' text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-1'}>
 <i className={'fas ' + method.icon + ' text-[8px]'}></i>
 {method.label}
 </span>
 </div>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs mb-2'}>{log.details}</p>
 <div className="flex items-center gap-3 text-[10px]">
 <span className={theme === 'dark' ? 'text-neutral-500' : 'text-gray-400'}>
 <i className="fas fa-calendar mr-1"></i>
 {date.toLocaleDateString('pt-BR')} às {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
 </span>
 {log.cost > 0 && (
 <span className="text-[#E91E8C]">
 <i className="fas fa-coins mr-1"></i>
 {log.cost} crédito{log.cost !== 1 ? 's' : ''}
 </span>
 )}
 {log.itemsCount && log.itemsCount > 0 && (
 <span className={theme === 'dark' ? 'text-neutral-500' : 'text-gray-400'}>
 <i className="fas fa-box mr-1"></i>
 {log.itemsCount} item{log.itemsCount !== 1 ? 's' : ''}
 </span>
 )}
 </div>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 )}

 {settingsTab === 'tools' && (
 <div>
 <div className="flex items-center justify-between mb-4">
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold font-serif'}>Ferramentas</h3>
 </div>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mb-4'}>Ferramentas de administração e manutenção</p>

 {/* Painel de Migração de Imagens */}
 <ImageMigrationPanel userId={user?.id} theme={theme} />
 </div>
 )}
 </div>
 </div>
 </div>
 );
};
