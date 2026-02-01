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
 // Features resumidas por plano (para os cards)
 const PLAN_HIGHLIGHTS: Record<string, string[]> = {
 basic: [
 '40 gerações/mês',
 'Resolução 2K',
 'Até 5.000 produtos',
 'Todas as ferramentas',
 'Modelos IA personalizados',
 ],
 pro: [
 '100 gerações/mês',
 'Resolução 2K + 4K',
 'Até 10.000 produtos',
 'Geração de vídeos',
 'Agente ativo WhatsApp',
 ],
 premier: [
 '200 gerações/mês',
 'Resolução 4K',
 'Até 50.000 produtos',
 'Integração e-commerce',
 'Suporte prioritário',
 ],
 enterprise: [
 '400 gerações/mês',
 'Resolução 4K',
 'Produtos ilimitados',
 'API dedicada',
 'Suporte prioritário',
 ],
 };

 // Matriz completa para tabela comparativa
 const COMPARISON_FEATURES = [
 { name: 'Gerações/mês', values: ['40', '100', '200', '400'] },
 { name: 'Resolução máxima', values: ['2K', '4K', '4K', '4K'] },
 { name: 'Limite de produtos', values: ['5.000', '10.000', '50.000', 'Ilimitado'] },
 { name: 'Vizzu Studio', values: [true, true, true, true] },
 { name: 'Vizzu Provador', values: [true, true, true, true] },
 { name: 'Modelo IA personalizado', values: [true, true, true, true] },
 { name: 'Legendas IA', values: [true, true, true, true] },
 { name: 'Catálogo + WhatsApp', values: [true, true, true, true] },
 { name: 'Geração em 4K', values: [false, true, true, true] },
 { name: 'Geração de vídeos', values: [false, true, true, true] },
 { name: 'Agente ativo WhatsApp', values: [false, true, true, true] },
 { name: 'Integração e-commerce', values: [false, false, true, true] },
 { name: 'Suporte prioritário', values: [false, false, true, true] },
 ];

 return (
 <div>
 {/* Header */}
 <div className="text-center mb-6">
 <h2 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xl font-bold mb-1 font-serif'}>Planos e Preços</h2>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-sm'}>Escolha o plano ideal para seu negócio</p>
 </div>

 {/* Status atual de creditos */}
 <div className={(theme === 'dark' ? 'bg-neutral-900/80 backdrop-blur-xl border-neutral-800' : 'bg-white/80 backdrop-blur-xl border-gray-200') + ' border rounded-2xl p-5 mb-6'}>
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 <div className={'w-10 h-10 rounded-xl flex items-center justify-center ' + (theme === 'dark' ? 'bg-neutral-800 border border-neutral-700' : 'bg-gray-50 border border-gray-200')}>
 <i className={'fas fa-coins text-sm ' + (theme === 'dark' ? 'text-neutral-300' : 'text-gray-600')}></i>
 </div>
 <div>
 <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px] uppercase tracking-wider font-medium'}>Créditos disponíveis</p>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-2xl font-bold'}>{userCredits.toLocaleString()}</p>
 </div>
 </div>
 <div className="text-right">
 <span className={(theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-neutral-300' : 'bg-gray-100 border-gray-200 text-gray-700') + ' inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border'}>
 <i className="fas fa-crown text-[10px] text-[#FF9F43]"></i>
 {currentPlan.name}
 </span>
 </div>
 </div>
 <div className="flex items-center justify-between mb-1.5">
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px]'}>{currentPlan.limit} créditos/mês no plano</span>
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px]'}>Renova em {daysUntilRenewal} dias</span>
 </div>
 <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' h-2 rounded-full overflow-hidden'}>
 <div className="h-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] rounded-full transition-all" style={{ width: Math.min(100, Math.max(3, (Math.min(userCredits, currentPlan.limit) / currentPlan.limit) * 100)) + '%' }}></div>
 </div>
 {userCredits > currentPlan.limit && (
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] mt-1.5'}>Inclui {(userCredits - currentPlan.limit).toLocaleString()} créditos extras</p>
 )}
 </div>

 {/* Toggle Mensal/Anual */}
 <div className="flex items-center justify-center gap-3 mb-6">
 <span className={(billingPeriod === 'monthly' ? (theme === 'dark' ? 'text-white' : 'text-gray-900') : (theme === 'dark' ? 'text-neutral-500' : 'text-gray-400')) + ' text-sm font-medium'}>Mensal</span>
 <button
 onClick={() => onSetBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
 className={((billingPeriod === 'yearly' ? 'bg-[#FF9F43]' : (theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-300'))) + ' relative w-12 h-6 rounded-full transition-colors'}
 >
 <div className={'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ' + (billingPeriod === 'yearly' ? 'translate-x-7' : 'translate-x-1')}></div>
 </button>
 <span className={(billingPeriod === 'yearly' ? (theme === 'dark' ? 'text-white' : 'text-gray-900') : (theme === 'dark' ? 'text-neutral-500' : 'text-gray-400')) + ' text-sm font-medium flex items-center gap-2'}>
 Anual
 <span className={(theme === 'dark' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600') + ' px-1.5 py-0.5 text-[10px] font-bold rounded'}>-20%</span>
 </span>
 </div>

 {/* Cards dos Planos */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
 {PLANS.map(plan => {
 const isCurrentPlan = currentPlan.id === plan.id;
 const price = billingPeriod === 'monthly' ? plan.priceMonthly : plan.priceYearly;
 const isPro = plan.id === 'pro';
 const isPremier = plan.id === 'premier';
 const highlights = PLAN_HIGHLIGHTS[plan.id] || [];

 return (
 <div
 key={plan.id}
 className={
 'relative rounded-2xl p-4 transition-all flex flex-col ' +
 (isCurrentPlan
 ? (theme === 'dark' ? 'bg-neutral-900/80 backdrop-blur-xl border-2 border-[#FF9F43]/60' : 'bg-white border-2 border-[#FF9F43]/60 shadow-sm')
 : (theme === 'dark' ? 'bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 hover:border-neutral-600' : 'bg-white border border-gray-200 hover:border-gray-300 shadow-sm')
 )
 }
 >
 {/* Badge */}
 {isCurrentPlan && (
 <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
 <span className="px-3 py-1 bg-[#FF9F43] text-white text-[10px] font-bold rounded-full whitespace-nowrap">
 SEU PLANO
 </span>
 </div>
 )}
 {isPro && !isCurrentPlan && (
 <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
 <span className={(theme === 'dark' ? 'bg-neutral-700 text-neutral-200' : 'bg-gray-800 text-white') + ' px-3 py-1 text-[10px] font-bold rounded-full whitespace-nowrap'}>
 MAIS POPULAR
 </span>
 </div>
 )}
 {isPremier && !isCurrentPlan && (
 <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
 <span className={(theme === 'dark' ? 'bg-neutral-700 text-neutral-200' : 'bg-gray-800 text-white') + ' px-3 py-1 text-[10px] font-bold rounded-full whitespace-nowrap'}>
 MELHOR VALOR
 </span>
 </div>
 )}

 <div className="pt-2 flex flex-col flex-1">
 <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-bold font-serif'}>{plan.name}</h3>
 <div className="mt-2 mb-3">
 <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-2xl font-bold'}>
 R$ {price.toFixed(2).replace('.', ',')}
 </span>
 <span className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-xs'}>/mês</span>
 </div>

 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] mb-3'}>R$ {plan.creditPrice.toFixed(2).replace('.', ',')} por crédito extra</p>

 <ul className="space-y-1.5 mb-4 flex-1">
 {highlights.map((feature, i) => (
 <li key={i} className="flex items-center gap-2 text-[11px]">
 <i className={'fas fa-check text-[9px] ' + (theme === 'dark' ? 'text-neutral-400' : 'text-gray-500')}></i>
 <span className={theme === 'dark' ? 'text-neutral-300' : 'text-gray-600'}>{feature}</span>
 </li>
 ))}
 </ul>

 <button
 onClick={() => {
 if (!isCurrentPlan) {
 showToast('Checkout Stripe não implementado. Configure os webhooks do N8N.', 'info');
 }
 }}
 className={
 'w-full py-2.5 rounded-xl font-semibold text-sm transition-all ' +
 (isCurrentPlan
 ? (theme === 'dark' ? 'bg-neutral-800 text-neutral-500 cursor-default' : 'bg-gray-100 text-gray-400 cursor-default')
 : 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:opacity-90'
 )
 }
 >
 {isCurrentPlan ? 'Plano atual' : plan.priceMonthly > currentPlan.priceMonthly ? 'Fazer upgrade' : 'Mudar plano'}
 </button>
 </div>
 </div>
 );
 })}
 </div>

 {/* Tabela comparativa */}
 <div className={(theme === 'dark' ? 'bg-neutral-900/80 backdrop-blur-xl border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' border rounded-2xl overflow-hidden mb-8'}>
 <button
 onClick={(e) => {
 const el = (e.currentTarget as HTMLElement).nextElementSibling;
 if (el) el.classList.toggle('hidden');
 const icon = (e.currentTarget as HTMLElement).querySelector('.chevron-icon');
 if (icon) icon.classList.toggle('rotate-180');
 }}
 className={'w-full flex items-center justify-between p-4 text-left ' + (theme === 'dark' ? 'text-white hover:bg-neutral-800/50' : 'text-gray-900 hover:bg-gray-50')}
 >
 <span className="font-semibold text-sm">Comparar todos os recursos</span>
 <i className="chevron-icon fas fa-chevron-down text-xs transition-transform"></i>
 </button>
 <div className="hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-[11px]">
 <thead>
 <tr className={(theme === 'dark' ? 'border-neutral-800' : 'border-gray-100') + ' border-b'}>
 <th className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-left py-2 px-4 font-medium'}>Recurso</th>
 {PLANS.map(p => (
 <th key={p.id} className={(theme === 'dark' ? 'text-neutral-300' : 'text-gray-700') + ' text-center py-2 px-2 font-semibold'}>{p.name}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {COMPARISON_FEATURES.map((feat, i) => (
 <tr key={i} className={(theme === 'dark' ? 'border-neutral-800/50' : 'border-gray-50') + ' border-b last:border-0'}>
 <td className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' py-2 px-4'}>{feat.name}</td>
 {feat.values.map((val, j) => (
 <td key={j} className="text-center py-2 px-2">
 {typeof val === 'boolean' ? (
 val ? <i className={'fas fa-check text-[9px] ' + (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500')}></i> : <i className={(theme === 'dark' ? 'text-neutral-700' : 'text-gray-300') + ' fas fa-minus text-[9px]'}></i>
 ) : (
 <span className={theme === 'dark' ? 'text-neutral-300' : 'text-gray-700'}>{val}</span>
 )}
 </td>
 ))}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>

 {/* Secao: Compre Creditos Adicionais */}
 <div className={(theme === 'dark' ? 'bg-neutral-900/80 backdrop-blur-xl border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' border rounded-2xl p-5 mb-6'}>
 <div className="flex items-center gap-3 mb-4">
 <div className={'w-10 h-10 rounded-xl flex items-center justify-center ' + (theme === 'dark' ? 'bg-neutral-800 border border-neutral-700' : 'bg-gray-50 border border-gray-200')}>
 <i className={'fas fa-coins text-sm ' + (theme === 'dark' ? 'text-neutral-300' : 'text-gray-600')}></i>
 </div>
 <div>
 <h4 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm'}>Créditos adicionais</h4>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-xs'}>R$ {currentPlan.creditPrice.toFixed(2).replace('.', ',')} por crédito no plano {currentPlan.name}</p>
 </div>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 {CREDIT_PACKAGES.map(amount => (
 <button
 key={amount}
 onClick={() => showToast('Checkout Stripe não implementado. Configure os webhooks do N8N.', 'info')}
 className={(theme === 'dark' ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 hover:border-neutral-600' : 'bg-gray-50 hover:bg-gray-100 border-gray-200 hover:border-gray-300') + ' border rounded-xl p-3 transition-all text-center group'}
 >
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-bold text-xl'}>{amount}</p>
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] mb-1'}>créditos</p>
 <p className={(theme === 'dark' ? 'text-neutral-300' : 'text-gray-700') + ' font-semibold text-xs'}>
 R$ {(amount * currentPlan.creditPrice).toFixed(2).replace('.', ',')}
 </p>
 </button>
 ))}
 </div>
 </div>

 {/* FAQ */}
 <div className={(theme === 'dark' ? 'bg-neutral-900/80 backdrop-blur-xl border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' border rounded-2xl p-5'}>
 <details className="group">
 <summary className={(theme === 'dark' ? 'text-white hover:text-neutral-300' : 'text-gray-900 hover:text-gray-600') + ' font-medium text-sm cursor-pointer flex items-center justify-between'}>
 Perguntas Frequentes
 <i className="fas fa-chevron-down text-xs transition-transform group-open:rotate-180"></i>
 </summary>
 <div className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' mt-4 space-y-3 text-xs'}>
 <div>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium mb-1'}>O que são créditos?</p>
 <p>Cada foto gerada consome 1 crédito. Fotos em 4K consomem 2 créditos. Criar um modelo IA custa 2 créditos.</p>
 </div>
 <div>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium mb-1'}>Posso mudar de plano?</p>
 <p>Sim! Você pode fazer upgrade ou downgrade a qualquer momento.</p>
 </div>
 <div>
 <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' font-medium mb-1'}>Os créditos acumulam?</p>
 <p>Créditos do plano não acumulam para o próximo mês. Créditos comprados avulso não expiram.</p>
 </div>
 </div>
 </details>
 </div>

 {/* Footer */}
 <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-400') + ' text-center text-xs mt-6'}>
 Precisa de mais? <a href="#" className={(theme === 'dark' ? 'text-neutral-300 hover:text-white' : 'text-gray-600 hover:text-gray-900') + ' underline'}>Entre em contato</a> para planos personalizados.
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
