import React, { useState, useEffect, useCallback } from 'react';
import { CompanySettings } from '../types';
import { useUI, type SettingsTab } from '../contexts/UIContext';
import { getInvoices, type StripeInvoice } from '../lib/api/billing';
import { useAuth } from '../contexts/AuthContext';
import { useHistory } from '../contexts/HistoryContext';
import { CREDIT_PACKAGES, INDIVIDUAL_CREDIT_PRICE } from '../hooks/useCredits';
import { usePlans } from '../contexts/PlansContext';
import type { VizzuTheme } from '../contexts/UIContext';
import { supabase } from '../services/supabaseClient';
import { ConfirmModal } from '../components/shared/ConfirmModal';
import DownloadModal from '../components/shared/DownloadModal';
import type { DownloadableImage } from '../utils/downloadSizes';
import { useOnboarding } from '../hooks/useOnboarding';
import { useShopifyConnection } from '../hooks/useShopifyConnection';
import { TermsAcceptanceModal } from '../components/TermsAcceptanceModal';
import { CURRENT_TERMS_VERSION } from '../content/termsContent';
import { ClientsPage } from './ClientsPage';

interface SettingsPageProps {
 userCredits: number;
 editBalance?: number;
 currentPlan: any;
 billingPeriod: string;
 daysUntilRenewal: number;
 subscription?: import('../lib/api/billing').UserSubscription | null;
 isCheckoutLoading: boolean;
 onBuyCredits: (amount: number) => void;
 onUpgradePlan: (planId: string) => void;
 onSetBillingPeriod: (period: string) => void;
 onCancelSubscription: () => Promise<void>;
 onLogout: () => void;
 /** Navegar para galeria filtrada por nome do produto */
 onNavigateToGallery?: (productName: string) => void;
}

const HISTORY_PAGE_SIZE = 20;

const SHOPIFY_APP_URL = 'https://vizzu-shopify-gateway.vercel.app';

function ShopifyIntegrationCard({ theme }: { theme: VizzuTheme }) {
  const { connection, isConnected, isLoading, disconnect } = useShopifyConnection();
  const { showToast } = useUI();
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    if (!window.confirm('Desconectar a loja Shopify? Você poderá reconectar depois.')) return;
    setIsDisconnecting(true);
    const ok = await disconnect();
    setIsDisconnecting(false);
    if (ok) showToast('Shopify desconectado', 'success');
    else showToast('Erro ao desconectar', 'error');
  };

  if (isLoading) {
    return (
      <div className={(theme !== 'light' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-xl border p-3 flex items-center justify-between'}>
        <div className="flex items-center gap-3">
          <div className={(theme !== 'light' ? 'bg-neutral-800' : 'bg-gray-100') + ' w-9 h-9 rounded-lg flex items-center justify-center'}>
            <i className={(theme !== 'light' ? 'text-neutral-400' : 'text-gray-500') + ' fab fa-shopify text-sm'} />
          </div>
          <div>
            <h4 className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' font-medium text-xs'}>Shopify</h4>
            <p className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isConnected && connection) {
    return (
      <div className={(theme !== 'light' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-xl border p-3'}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#96bf48' }}>
              <i className="fab fa-shopify text-white text-sm" />
            </div>
            <div>
              <h4 className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' font-medium text-xs flex items-center gap-1.5'}>
                {connection.store_name || connection.store_domain}
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
              </h4>
              <p className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>
                {connection.store_domain}
              </p>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className={(theme !== 'light' ? 'text-neutral-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500') + ' text-[10px] transition-colors'}
          >
            {isDisconnecting ? 'Desconectando...' : 'Desconectar'}
          </button>
        </div>
        {connection.last_sync_at && (
          <p className={(theme !== 'light' ? 'text-neutral-600' : 'text-gray-400') + ' text-[10px] mt-2 ml-12'}>
            Última sync: {new Date(connection.last_sync_at).toLocaleString('pt-BR')}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={(theme !== 'light' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-xl border p-3 flex items-center justify-between'}>
      <div className="flex items-center gap-3">
        <div className={(theme !== 'light' ? 'bg-neutral-800' : 'bg-gray-100') + ' w-9 h-9 rounded-lg flex items-center justify-center'}>
          <i className={(theme !== 'light' ? 'text-neutral-400' : 'text-gray-500') + ' fab fa-shopify text-sm'} />
        </div>
        <div>
          <h4 className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' font-medium text-xs'}>Shopify</h4>
          <p className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Sincronize produtos e imagens</p>
        </div>
      </div>
      <a
        href={SHOPIFY_APP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="px-3 py-1.5 rounded-lg font-medium text-[10px] border text-white border-transparent"
        style={{ background: 'linear-gradient(135deg, #FF6B6B, #FF9F43)' }}
      >
        Conectar
      </a>
    </div>
  );
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
 userCredits,
 editBalance = 0,
 currentPlan,
 billingPeriod,
 daysUntilRenewal,
 subscription,
 isCheckoutLoading,
 onBuyCredits,
 onUpgradePlan,
 onSetBillingPeriod,
 onCancelSubscription,
 onLogout,
 onNavigateToGallery,
}) => {
 const { theme, selectedTheme, isV2, setTheme, settingsTab, setSettingsTab, showToast, navigateTo } = useUI();
 const { user } = useAuth();
 const { historyLogs, setHistoryLogs } = useHistory();
 const { allPlans, masterFeatures, planIncluded, planPersona, planCta } = usePlans();
 const { isTourEnabled, isSavingTourToggle, setTourEnabled } = useOnboarding();

 const [expandAllFeatures, setExpandAllFeatures] = useState(false);

 // P1: Controlled input para nome do perfil + dirty state
 const [profileName, setProfileName] = useState(user?.name || '');
 const [isSavingProfile, setIsSavingProfile] = useState(false);
 useEffect(() => { setProfileName(user?.name || ''); }, [user?.name]);
 const isProfileDirty = profileName.trim() !== (user?.name || '');

 // P3: Loading state para reset de senha
 const [isSendingReset, setIsSendingReset] = useState(false);

 // P5: Modal de confirmação para cancelar assinatura
 const [showCancelModal, setShowCancelModal] = useState(false);

 // Clients embedded states
 const [showCreateClientEmbed, setShowCreateClientEmbed] = useState(false);

 const [isCancelling, setIsCancelling] = useState(false);

 // Download de imagens do histórico
 const [showHistoryDownload, setShowHistoryDownload] = useState(false);

 // Faturas Stripe
 const [invoices, setInvoices] = useState<StripeInvoice[]>([]);
 const [invoicesLoading, setInvoicesLoading] = useState(false);
 const [invoicesError, setInvoicesError] = useState<string | null>(null);

 const isPaidPlan = subscription && subscription.plan_id !== 'free';

 const loadInvoices = useCallback(async () => {
   if (!user?.id) return;
   setInvoicesLoading(true);
   setInvoicesError(null);
   try {
     const data = await getInvoices(user.id);
     setInvoices(data);
   } catch (err: any) {
     setInvoicesError(err?.message || String(err));
   } finally {
     setInvoicesLoading(false);
   }
 }, [user?.id]);

 useEffect(() => {
   if (settingsTab === 'plan' && isPaidPlan) {
     loadInvoices();
   }
 }, [settingsTab, isPaidPlan, loadInvoices]);

 // P11: Paginação do histórico
 const [historyVisible, setHistoryVisible] = useState(HISTORY_PAGE_SIZE);

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
 whatsapp: '',
 segment: '',
 targetAudience: '',
 voiceTone: 'casual' as const,
 voiceExamples: '',
 hashtags: [],
 emojisEnabled: true,
 captionStyle: 'media' as const,
 callToAction: '',
 };
 });
 const [initialCompanySettings] = useState(companySettings);
 const isCompanyDirty = companySettings.name !== initialCompanySettings.name || companySettings.instagram !== initialCompanySettings.instagram;

 // Persistir company settings
 useEffect(() => {
 localStorage.setItem('vizzu_company_settings', JSON.stringify(companySettings));
 }, [companySettings]);

 // Dirty state combinado
 const isDirty = isProfileDirty || isCompanyDirty;

 // P1: Salvar perfil de verdade
 const handleSaveProfile = async () => {
 if (!isDirty) return;
 setIsSavingProfile(true);
 try {
 // Salvar nome via Supabase Auth
 if (isProfileDirty && profileName.trim()) {
 const { error } = await supabase.auth.updateUser({
 data: { full_name: profileName.trim(), name: profileName.trim() }
 });
 if (error) throw error;
 }
 showToast('Configurações salvas!', 'success');
 } catch (e: any) {
 showToast(e.message || 'Erro ao salvar. Tente novamente.', 'error');
 } finally {
 setIsSavingProfile(false);
 }
 };

 // Termos aceitos — carregar data e IP do aceite
 const [termsAcceptance, setTermsAcceptance] = useState<{ accepted_at: string; ip_address: string | null } | null>(null);
 const [showTermsModal, setShowTermsModal] = useState(false);
 useEffect(() => {
  if (!user?.id) return;
  supabase
   .from('terms_acceptance')
   .select('accepted_at, ip_address')
   .eq('user_id', user.id)
   .order('accepted_at', { ascending: false })
   .limit(1)
   .maybeSingle()
   .then(({ data }) => { if (data) setTermsAcceptance(data); });
 }, [user?.id]);

 // Theme options
 const themeOptions: { value: VizzuTheme; label: string }[] = [
   { value: 'v2', label: '☀ Claro' },
   { value: 'dark', label: '☾ Escuro' },
   { value: 'high-contrast', label: '◑ Alto Contraste AA' },
   { value: 'light', label: '◇ Legacy' },
 ];

 return (
 <div className="flex-1 overflow-y-auto p-4 md:p-6">
 <div className={settingsTab === 'plan' ? 'max-w-7xl mx-auto' : 'max-w-5xl mx-auto'}>
 {/* Header */}
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-3">
 {!isV2 && <div className={'w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xl ' + (theme !== 'light' ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
 <i className={'fas fa-cog text-sm ' + (theme !== 'light' ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
 </div>}
 <div>
 <h1 className={(isV2 ? 'text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.1] text-gray-900' : (theme !== 'light' ? 'text-white' : 'text-gray-900') + ' text-lg font-extrabold')}>Configurações</h1>
 <p className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs font-serif italic hidden md:block'}>Gerencie sua conta e preferências</p>
 </div>
 </div>
 <button onClick={onLogout} className={'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-500 transition-colors ' + (theme !== 'light' ? 'hover:bg-red-500/10' : 'hover:bg-red-50')}>
 <i className="fas fa-sign-out-alt"></i>
 <span className="hidden md:inline">Sair</span>
 </button>
 </div>

 {/* Tabs */}
 <div className="flex gap-1 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
 {[
 { id: 'profile' as SettingsTab, label: 'Perfil', icon: 'fa-user' },
 { id: 'plan' as SettingsTab, label: 'Planos & Créditos', icon: 'fa-credit-card' },
 { id: 'integrations' as SettingsTab, label: 'Integrações', icon: 'fa-plug' },
 { id: 'clients' as SettingsTab, label: 'Clientes', icon: 'fa-users' },
 { id: 'history' as SettingsTab, label: 'Histórico', icon: 'fa-clock-rotate-left' },
 ].map(tab => (
 <button
 key={tab.id}
 onClick={() => setSettingsTab(tab.id)}
 className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
 settingsTab === tab.id
 ? theme !== 'light' ? 'bg-neutral-700 text-white hc-selected' : 'bg-gray-900 text-white'
 : theme !== 'light'
 ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
 : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
 }`}
 >
 <i className={`fas ${tab.icon} text-[10px]`}></i>
 {tab.label}
 </button>
 ))}
 </div>

 {/* ═══════ PERFIL (unificado) ═══════ */}
 {settingsTab === 'profile' && (
 <div className="space-y-4">
 {/* Dados pessoais */}
 <div className={(theme !== 'light' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-xl border p-5'}>
 <h3 className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm mb-4'}>Dados Pessoais</h3>
 <div className="flex items-center gap-3 mb-5">
 <div className={(theme !== 'light' ? 'bg-neutral-800' : 'bg-gray-100') + ' w-14 h-14 rounded-full flex items-center justify-center overflow-hidden'}>
 {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="" /> : <i className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-400') + ' fas fa-user text-lg'}></i>}
 </div>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label htmlFor="profile-name" className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>Nome</label>
 <input type="text" id="profile-name" name="profileName" autoComplete="name" value={profileName} onChange={(e) => setProfileName(e.target.value)} className={(theme !== 'light' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2.5 border rounded-lg text-sm'} />
 </div>
 <div>
 <label htmlFor="profile-email" className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>Email</label>
 <input type="email" id="profile-email" name="profileEmail" autoComplete="email" defaultValue={user?.email} className={(theme !== 'light' ? 'bg-neutral-800 border-neutral-700 text-neutral-500' : 'bg-gray-100 border-gray-200 text-gray-500') + ' w-full px-3 py-2.5 border rounded-lg text-sm'} disabled />
 </div>
 </div>
 {/* Alterar Senha — via email */}
 <div className={'mt-5 pt-5 border-t ' + (theme !== 'light' ? 'border-neutral-800' : 'border-gray-100')}>
 <h4 className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' font-semibold text-xs mb-2'}>Alterar Senha</h4>
 <p className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mb-3'}>
 Para sua segurança, a troca de senha é feita por email.
 </p>
 <button
 onClick={async () => {
 if (isSendingReset) return;
 setIsSendingReset(true);
 try {
 const userEmail = user?.email;
 if (!userEmail) { showToast('Email do usuário não encontrado.', 'error'); return; }
 const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
 redirectTo: window.location.origin
 });
 if (error) throw error;
 showToast('Email de redefinição enviado! Verifique sua caixa de entrada.', 'success');
 } catch (e: any) {
 showToast(e.message || 'Erro ao enviar email de redefinição.', 'error');
 } finally {
 setIsSendingReset(false);
 }
 }}
 disabled={isSendingReset}
 className={'px-4 py-2.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg text-sm font-medium transition-opacity flex items-center gap-2 ' + (isSendingReset ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90')}
 >
 {isSendingReset ? (
 <><i className="fas fa-circle-notch fa-spin text-[10px]"></i>Enviando...</>
 ) : (
 <><i className="fas fa-envelope text-[10px]"></i>Enviar email de redefinição</>
 )}
 </button>
 </div>
 </div>

 {/* Empresa */}
 <div className={(theme !== 'light' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-xl border p-5'}>
 <h3 className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm mb-4'}>Empresa</h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>Nome da Empresa</label>
 <input
 type="text"
 value={companySettings.name}
 onChange={(e) => setCompanySettings({ ...companySettings, name: e.target.value })}
 className={(theme !== 'light' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2.5 border rounded-lg text-sm'}
 placeholder="Sua Loja"
 />
 </div>
 <div>
 <label className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>Instagram</label>
 <input
 type="text"
 value={companySettings.instagram || ''}
 onChange={(e) => setCompanySettings({ ...companySettings, instagram: e.target.value })}
 className={(theme !== 'light' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2.5 border rounded-lg text-sm'}
 placeholder="@sualoja"
 />
 </div>
 <div>
 <label className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>WhatsApp</label>
 <input
 type="tel"
 value={companySettings.whatsapp || ''}
 onChange={(e) => setCompanySettings({ ...companySettings, whatsapp: e.target.value })}
 className={(theme !== 'light' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2.5 border rounded-lg text-sm'}
 placeholder="(11) 99999-9999"
 />
 </div>
 <div>
 <label className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1.5'}>Segmento</label>
 <select
 value={companySettings.segment || ''}
 onChange={(e) => setCompanySettings({ ...companySettings, segment: e.target.value })}
 className={(theme !== 'light' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') + ' w-full px-3 py-2.5 border rounded-lg text-sm'}
 >
 <option value="">Selecione</option>
 <option value="Moda Feminina">Moda Feminina</option>
 <option value="Moda Masculina">Moda Masculina</option>
 <option value="Calçados">Calçados</option>
 <option value="Acessórios">Acessórios</option>
 <option value="Infantil">Infantil</option>
 <option value="Fitness">Fitness</option>
 <option value="Praia">Praia</option>
 <option value="Cosméticos">Cosméticos</option>
 <option value="Decoração">Decoração</option>
 <option value="Outro">Outro</option>
 </select>
 </div>
 </div>
 </div>

 {/* Plano atual + CTA */}
 <div className={(theme !== 'light' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-xl border p-5'}>
 <h3 className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm mb-4'}>Plano Atual</h3>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white">
 <i className="fas fa-crown text-[9px]"></i>
 {currentPlan.name}
 </span>
 <span className={(theme !== 'light' ? 'text-neutral-400' : 'text-gray-500') + ' text-sm'}>{currentPlan.limit} gerações/mês</span>
 </div>
 <button
 onClick={() => setSettingsTab('plan')}
 className={(theme !== 'light' ? 'bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700' : 'bg-gray-900 hover:bg-gray-800 text-white') + ' px-4 py-2 rounded-lg text-xs font-semibold transition-colors'}
 >
 Trocar Plano
 </button>
 </div>
 </div>

 {/* Tema */}
 <div className={(theme !== 'light' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-xl border p-5'}>
 <h3 className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm mb-1'}>Tema</h3>
 <p className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mb-3'}>
   Escolha a aparência do Vizzu
 </p>
 <select
   value={selectedTheme}
   onChange={(e) => setTheme(e.target.value as VizzuTheme)}
   className="w-full max-w-xs px-3 py-2 rounded-lg text-sm font-medium border-2 border-gray-900 bg-white text-gray-900 dark:border-white dark:bg-black dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
   style={{ borderColor: theme !== 'light' ? '#fff' : '#111', backgroundColor: theme !== 'light' ? '#000' : '#fff', color: theme !== 'light' ? '#fff' : '#111' }}
 >
   {themeOptions.map((opt) => (
     <option key={opt.value} value={opt.value}>{opt.label}</option>
   ))}
 </select>
 </div>

 {/* Copiloto / Tour guiado */}
 <div className={(theme !== 'light' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-xl border p-5'}>
 <div className="flex items-center justify-between">
 <div className="flex-1">
 <div className="flex items-center gap-2">
 <i className={(theme !== 'light' ? 'text-neutral-300' : 'text-gray-700') + ' fas fa-compass text-sm'}></i>
 <h3 className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm'}>Copiloto de Primeiro Uso</h3>
 </div>
 <p className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mt-1'}>
 {isTourEnabled
 ? 'Ativo \u2014 as ferramentas mostram um passo a passo'
 : 'Desativado \u2014 nenhum tour ser\u00e1 exibido'}
 </p>
 {!isTourEnabled && (
 <p className={(theme !== 'light' ? 'text-neutral-600' : 'text-gray-400') + ' text-[10px] mt-0.5'}>
 Ao ativar, o tour ser\u00e1 reiniciado em todas as ferramentas.
 </p>
 )}
 </div>
 <button
 onClick={async () => {
 const success = await setTourEnabled(!isTourEnabled);
 if (success) {
 showToast(
 !isTourEnabled ? 'Tour ativado! Visite qualquer ferramenta.' : 'Tour desativado.',
 'success'
 );
 } else {
 showToast('Erro ao salvar. Tente novamente.', 'error');
 }
 }}
 disabled={isSavingTourToggle}
 className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ml-4 ${
 isSavingTourToggle ? 'opacity-50 cursor-wait' :
 isTourEnabled
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]'
 : theme !== 'light' ? 'bg-neutral-700' : 'bg-gray-300'
 }`}
 >
 {isSavingTourToggle ? (
 <div className="absolute inset-0 flex items-center justify-center">
 <i className="fas fa-circle-notch fa-spin text-white text-[10px]"></i>
 </div>
 ) : (
 <div className={'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ' +
 (isTourEnabled ? 'translate-x-7' : 'translate-x-1')}></div>
 )}
 </button>
 </div>
 </div>

 {/* Termos de Uso aceitos */}
 <div className={(theme !== 'light' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-xl border p-5'}>
 <div className="flex items-center justify-between">
 <div>
 <h3 className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm'}>Termos de Uso e Privacidade</h3>
 {termsAcceptance ? (
 <p className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mt-1'}>
 Aceito em {new Date(termsAcceptance.accepted_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
 {termsAcceptance.ip_address && <span className={(theme !== 'light' ? 'text-neutral-600' : 'text-gray-400')}> — IP {termsAcceptance.ip_address}</span>}
 <span className={(theme !== 'light' ? 'text-neutral-600' : 'text-gray-400')}> — v{CURRENT_TERMS_VERSION}</span>
 </p>
 ) : (
 <p className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mt-1'}>Carregando...</p>
 )}
 </div>
 <button
 onClick={() => setShowTermsModal(true)}
 className={(theme !== 'light' ? 'bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700') + ' px-4 py-2 rounded-lg text-xs font-semibold transition-colors'}
 >
 Ver Termos
 </button>
 </div>
 </div>

 {/* P1: Salvar com dirty state + loading */}
 <button
 onClick={handleSaveProfile}
 disabled={!isDirty || isSavingProfile}
 className={'w-full py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ' +
 (isDirty && !isSavingProfile
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:opacity-90'
 : (theme !== 'light' ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed')
 )}
 >
 {isSavingProfile ? (
 <><i className="fas fa-circle-notch fa-spin text-xs"></i>Salvando...</>
 ) : (
 <><i className="fas fa-check"></i>Salvar Configurações</>
 )}
 </button>
 </div>
 )}

 {/* ═══════ PLANOS & CRÉDITOS ═══════ */}
 {settingsTab === 'plan' && (() => {
 // Dados dos planos vindos do Supabase via PlansContext
 const MASTER_FEATURES = masterFeatures;
 const PLAN_INCLUDED = planIncluded;
 const PLAN_PERSONA = planPersona;
 const PLAN_CTA = planCta;
 const isOnPaidPlan = currentPlan.id !== 'free';
 const ALL_DISPLAY_PLANS = allPlans.filter(p => p.id !== 'test' && p.id !== 'master' && !(p.id === 'free' && isOnPaidPlan));
 const MAX_COLLAPSED = 5;

 return (
 <div>
 {/* Header */}
 <div className="text-center mb-8">
 <h2 className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' text-3xl font-bold mb-2 font-serif'}>Planos e Preços</h2>
 <p className={(theme !== 'light' ? 'text-neutral-400' : 'text-gray-500') + ' text-base'}>Escolha o plano ideal para seu negócio</p>
 </div>

 {/* Card de assinatura atual */}
 <div className={(theme !== 'light' ? 'bg-neutral-900/80 backdrop-blur-xl border-neutral-800' : 'bg-white/80 backdrop-blur-xl border-gray-200') + ' border rounded-2xl p-5 mb-8 max-w-2xl mx-auto'}>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div>
 <p className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] uppercase tracking-wider font-medium mb-1'}>Plano Atual</p>
 <p className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' text-sm font-bold'}>{currentPlan.name}</p>
 </div>
 <div>
 <p className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] uppercase tracking-wider font-medium mb-1'}>Período de Cobrança</p>
 <p className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' text-sm font-bold'}>{billingPeriod === 'yearly' ? 'Anual' : 'Mensal'}</p>
 </div>
 <div>
 <p className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] uppercase tracking-wider font-medium mb-1'}>Próxima Cobrança</p>
 <p className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' text-sm font-bold'}>
 {(() => {
 const d = new Date();
 d.setDate(d.getDate() + daysUntilRenewal);
 return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
 })()}
 </p>
 </div>
 <div>
 <p className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] uppercase tracking-wider font-medium mb-1'}>Créditos Restantes</p>
 <p className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' text-sm font-bold'}>
 {userCredits.toLocaleString()}
 {editBalance > 0 && <span className="text-emerald-400 text-xs font-semibold ml-1.5">+{editBalance} edição</span>}
 </p>
 </div>
 </div>
 {/* P5: Cancelar com confirmação */}
 <div className={'mt-4 pt-3 border-t ' + (theme !== 'light' ? 'border-neutral-800' : 'border-gray-100')}>
 <button
 onClick={() => setShowCancelModal(true)}
 className={(theme !== 'light' ? 'text-neutral-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500') + ' text-xs transition-colors'}
 >
 Cancelar assinatura
 </button>
 </div>
 </div>

 {/* Toggle Mensal/Anual */}
 <div className="flex items-center justify-center gap-3 mb-6">
 <span className={(billingPeriod === 'monthly' ? (theme !== 'light' ? 'text-white' : 'text-gray-900') : (theme !== 'light' ? 'text-neutral-500' : 'text-gray-400')) + ' text-sm font-medium'}>Mensal</span>
 <button
 onClick={() => onSetBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
 className={((billingPeriod === 'yearly' ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]' : (theme !== 'light' ? 'bg-neutral-700' : 'bg-gray-300'))) + ' relative w-12 h-6 rounded-full transition-colors'}
 >
 <div className={'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ' + (billingPeriod === 'yearly' ? 'translate-x-7' : 'translate-x-1')}></div>
 </button>
 <span className={(billingPeriod === 'yearly' ? (theme !== 'light' ? 'text-white' : 'text-gray-900') : (theme !== 'light' ? 'text-neutral-500' : 'text-gray-400')) + ' text-sm font-medium'}>
 Anual
 </span>
 </div>

 {/* Social proof */}
 <div className="flex items-center justify-center gap-4 mb-8">
 <div className="flex -space-x-2">
 {[1,2,3,4].map(i => (
 <div key={i} className={(theme !== 'light' ? 'bg-neutral-700 border-neutral-900' : 'bg-gray-200 border-white') + ' w-6 h-6 rounded-full border-2 flex items-center justify-center'}>
 <i className={(theme !== 'light' ? 'text-neutral-400' : 'text-gray-400') + ' fas fa-user text-[7px]'}></i>
 </div>
 ))}
 </div>
 <p className={(theme !== 'light' ? 'text-neutral-400' : 'text-gray-500') + ' text-xs'}>Usado por <span className={theme !== 'light' ? 'text-white font-medium' : 'text-gray-900 font-medium'}>+500 criadores</span> no Brasil</p>
 </div>

 {/* Cards dos Planos */}
 <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${ALL_DISPLAY_PLANS.length <= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-5'} gap-3 mb-4`}>
 {ALL_DISPLAY_PLANS.map(plan => {
 const isCurrentPlan = currentPlan.id === plan.id;
 const isTrial = plan.id === 'free';
 const isEnterprise = plan.id === 'enterprise';
 const price = (isTrial || isEnterprise) ? 0 : (billingPeriod === 'monthly' ? plan.priceMonthly : plan.priceYearly);
 const isPro = plan.id === 'pro';
 const isPremier = plan.id === 'premier';
 const persona = PLAN_PERSONA[plan.id] || '';
 const annualSavings = (isTrial || isEnterprise) ? 0 : Math.round((plan.priceMonthly - plan.priceYearly) * 12);
 const included = PLAN_INCLUDED[plan.id] || new Set();

 // Features na ordem mestre — todas listadas, mesma ordem em todos os cards
 const allFeatures = MASTER_FEATURES.map(f => ({ name: f, has: included.has(f) }));
 const collapsedFeatures = allFeatures.slice(0, MAX_COLLAPSED);

 return (
 <div
 key={plan.id}
 className={
 'relative rounded-2xl p-5 transition-all flex flex-col ' +
 (isCurrentPlan
 ? (theme !== 'light' ? 'bg-neutral-900/80 backdrop-blur-xl border-2 border-[#FF9F43]' : 'bg-white border-2 border-[#FF9F43] shadow-sm')
 : isTrial
 ? (theme !== 'light' ? 'bg-neutral-900/40 backdrop-blur-xl border border-dashed border-neutral-700' : 'bg-gray-50/80 border border-dashed border-gray-300')
 : (theme !== 'light' ? 'bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 hover:border-neutral-600' : 'bg-white border border-gray-200 hover:border-gray-300 shadow-sm')
 )
 }
 >
 {/* Badge */}
 {isCurrentPlan && (
 <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
 <span className="px-3 py-1 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white text-[10px] font-bold rounded-full whitespace-nowrap">
 SEU PLANO
 </span>
 </div>
 )}
 {isPro && !isCurrentPlan && (
 <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
 <span className={(theme !== 'light' ? 'bg-neutral-700 text-neutral-200' : 'bg-gray-800 text-white') + ' px-3 py-1 text-[10px] font-bold rounded-full whitespace-nowrap'}>
 MAIS POPULAR
 </span>
 </div>
 )}
 {isPremier && !isCurrentPlan && (
 <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
 <span className={(theme !== 'light' ? 'bg-neutral-700 text-neutral-200' : 'bg-gray-800 text-white') + ' px-3 py-1 text-[10px] font-bold rounded-full whitespace-nowrap'}>
 MELHOR VALOR
 </span>
 </div>
 )}
 {isEnterprise && !isCurrentPlan && (
 <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
 <span className="bg-purple-600 text-white px-3 py-1 text-[10px] font-bold rounded-full whitespace-nowrap">
 ENTERPRISE
 </span>
 </div>
 )}

 <div className="pt-1 flex flex-col flex-1">
 <h3 className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' text-lg font-bold font-serif'}>{plan.name}</h3>
 <p className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] mb-2'}>{persona}</p>

 {/* Gerações em destaque */}
 <div className="mb-3">
 {isEnterprise ? (
 <span className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' text-xl font-extrabold'}>Sob consulta</span>
 ) : (
 <>
 <span className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' text-3xl font-extrabold'}>{plan.limit}</span>
 <span className={(theme !== 'light' ? 'text-neutral-400' : 'text-gray-500') + ' text-xs ml-1'}>gerações{isTrial ? '' : '/mês'}</span>
 </>
 )}
 </div>

 {/* Preço */}
 <div className="mb-1">
 {isEnterprise ? (
 <span className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' text-xl font-bold'}>Personalizado</span>
 ) : isTrial ? (
 <span className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' text-xl font-bold'}>Grátis</span>
 ) : (
 <>
 <span className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' text-xl font-bold'}>
 R$ {Number.isInteger(price) ? price : price.toFixed(2).replace('.', ',')}
 </span>
 <span className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-400') + ' text-xs'}>/mês</span>
 </>
 )}
 </div>

 {/* Economia anual */}
 {!isTrial && !isEnterprise && billingPeriod === 'yearly' ? (
 <p className={(theme !== 'light' ? 'text-emerald-400' : 'text-emerald-600') + ' text-[10px] font-medium mb-3'}>
 <i className="fas fa-tag text-[8px] mr-1"></i>
 Economize R$ {annualSavings.toLocaleString('pt-BR')}/ano
 </p>
 ) : (
 <div className="mb-3 h-[14px]">{isTrial && <span className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px]'}>Uso único, não renova</span>}{isEnterprise && <span className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px]'}>Valores sob medida para sua operação</span>}</div>
 )}

 {/* Features — mesma ordem em todos os cards */}
 <ul className="space-y-1.5 mb-3 flex-1">
 {(expandAllFeatures ? allFeatures : collapsedFeatures).map((feat, i) => (
 <li key={i} className="flex items-start gap-2 text-[11px]">
 {feat.has ? (
 <i className={'fas fa-check text-[9px] mt-0.5 shrink-0 ' + (theme !== 'light' ? 'text-emerald-400/70' : 'text-emerald-500/70')}></i>
 ) : (
 <span className="w-[9px] shrink-0"></span>
 )}
 <span className={feat.has ? (theme !== 'light' ? 'text-neutral-300' : 'text-gray-600') : (theme !== 'light' ? 'text-neutral-600' : 'text-gray-300')}>{feat.name}</span>
 </li>
 ))}
 {expandAllFeatures && !isTrial && !isEnterprise && (
 <li className={'flex items-center justify-between text-[10px] pt-1 mt-1 border-t ' + (theme !== 'light' ? 'border-neutral-800' : 'border-gray-100')}>
 <span className={theme !== 'light' ? 'text-neutral-400' : 'text-gray-500'}>Crédito extra</span>
 <span className={(theme !== 'light' ? 'text-neutral-300' : 'text-gray-700') + ' font-medium'}>R$ {INDIVIDUAL_CREDIT_PRICE.toFixed(2).replace('.', ',')}</span>
 </li>
 )}
 </ul>

 {/* P6: Loading state nos botões de plano */}
 <button
 onClick={() => {
 if (isCurrentPlan || isCheckoutLoading) return;
 if (isEnterprise) {
 window.open('https://wa.me/5544991534082?text=Ol%C3%A1%2C%20tenho%20interesse%20no%20plano%20Enterprise%20da%20Vizzu.', '_blank');
 return;
 }
 onUpgradePlan(plan.id);
 }}
 disabled={isCurrentPlan || (isCheckoutLoading && !isEnterprise)}
 className={
 'w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ' +
 (isCurrentPlan
 ? (theme !== 'light' ? 'bg-neutral-800 text-neutral-500 cursor-default' : 'bg-gray-100 text-gray-400 cursor-default')
 : isCheckoutLoading && !isEnterprise
 ? (theme !== 'light' ? 'bg-neutral-800 text-neutral-400 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed')
 : isPro
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:opacity-90'
 : isTrial
 ? (theme !== 'light' ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700' : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300')
 : (theme !== 'light' ? 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700' : 'bg-gray-900 hover:bg-gray-800 text-white')
 )
 }
 >
 {isCheckoutLoading && !isCurrentPlan && !isEnterprise ? (
 <><i className="fas fa-circle-notch fa-spin text-xs"></i>Processando...</>
 ) : isCurrentPlan ? 'Plano atual' : isEnterprise ? (<><i className="fab fa-whatsapp mr-1.5"></i>Falar com especialista</>) : isTrial ? 'Testar grátis' : 'Contratar'}
 </button>
 </div>
 </div>
 );
 })}
 </div>

 {/* Toggle Ver tudo / Ver menos */}
 <div className="text-center mb-6">
 <button
 onClick={() => setExpandAllFeatures(!expandAllFeatures)}
 className={(theme !== 'light' ? 'text-neutral-400 hover:text-neutral-200' : 'text-gray-500 hover:text-gray-700') + ' text-xs font-medium inline-flex items-center gap-1.5 transition-colors'}
 >
 <i className={'fas fa-chevron-down text-[8px] transition-transform ' + (expandAllFeatures ? 'rotate-180' : '')}></i>
 {expandAllFeatures ? 'Ver menos' : 'Ver tudo'}
 </button>
 </div>

 {/* Meios de pagamento */}
 <div className="flex items-center justify-center gap-3 mb-8">
 <span className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px]'}>Pagamento seguro via</span>
 <div className="flex items-center gap-2">
 <span className={(theme !== 'light' ? 'bg-neutral-800 text-neutral-400 border-neutral-700' : 'bg-gray-100 text-gray-500 border-gray-200') + ' px-2 py-0.5 rounded text-[10px] font-medium border'}>Pix</span>
 <span className={(theme !== 'light' ? 'bg-neutral-800 text-neutral-400 border-neutral-700' : 'bg-gray-100 text-gray-500 border-gray-200') + ' px-2 py-0.5 rounded text-[10px] font-medium border'}>Cartão</span>
 <span className={(theme !== 'light' ? 'bg-neutral-800 text-neutral-400 border-neutral-700' : 'bg-gray-100 text-gray-500 border-gray-200') + ' px-2 py-0.5 rounded text-[10px] font-medium border'}>Boleto</span>
 </div>
 <i className={'fas fa-lock text-[9px] ' + (theme !== 'light' ? 'text-neutral-600' : 'text-gray-300')}></i>
 </div>

 {/* P6: Loading state nos botões de créditos */}
 <div className={(theme !== 'light' ? 'bg-neutral-900/80 backdrop-blur-xl border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' border rounded-2xl p-5 mb-6'}>
 <div className="flex items-center gap-3 mb-4">
 <div className={'w-10 h-10 rounded-xl flex items-center justify-center ' + (theme !== 'light' ? 'bg-neutral-800 border border-neutral-700' : 'bg-gray-50 border border-gray-200')}>
 <i className={'fas fa-coins text-sm ' + (theme !== 'light' ? 'text-neutral-300' : 'text-gray-600')}></i>
 </div>
 <div>
 <h4 className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm'}>Créditos adicionais</h4>
 <p className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-400') + ' text-xs'}>R$ {INDIVIDUAL_CREDIT_PRICE.toFixed(2).replace('.', ',')} por crédito</p>
 </div>
 </div>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 {CREDIT_PACKAGES.map(amount => (
 <button
 key={amount}
 onClick={() => { if (!isCheckoutLoading) onBuyCredits(amount); }}
 disabled={isCheckoutLoading}
 className={(theme !== 'light' ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 hover:border-neutral-600' : 'bg-gray-50 hover:bg-gray-100 border-gray-200 hover:border-gray-300') + ' border rounded-xl p-3 transition-all text-center group' + (isCheckoutLoading ? ' opacity-60 cursor-not-allowed' : '')}
 >
 <p className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' font-bold text-xl'}>{amount}</p>
 <p className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] mb-1'}>créditos</p>
 <p className={(theme !== 'light' ? 'text-neutral-300' : 'text-gray-700') + ' font-semibold text-xs'}>
 R$ {(amount * INDIVIDUAL_CREDIT_PRICE).toFixed(2).replace('.', ',')}
 </p>
 </button>
 ))}
 </div>
 </div>


 {/* Histórico de Cobranças (Stripe Invoices) */}
 {isPaidPlan && (
 <div className={(theme !== 'light' ? 'bg-neutral-900/80 backdrop-blur-xl border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' border rounded-2xl p-5 mb-6'}>
 <div className="flex items-center gap-3 mb-4">
 <div className={'w-10 h-10 rounded-xl flex items-center justify-center ' + (theme !== 'light' ? 'bg-neutral-800 border border-neutral-700' : 'bg-gray-50 border border-gray-200')}>
 <i className={'fas fa-file-invoice text-sm ' + (theme !== 'light' ? 'text-neutral-300' : 'text-gray-600')}></i>
 </div>
 <div>
 <h4 className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm'}>Histórico de Cobranças</h4>
 <p className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-400') + ' text-xs'}>Suas faturas e pagamentos</p>
 </div>
 </div>

 {invoicesLoading ? (
 <div className="space-y-3">
 {[1, 2, 3].map(i => (
   <div key={i} className={(theme !== 'light' ? 'bg-neutral-800' : 'bg-gray-100') + ' rounded-xl h-14 animate-pulse'} />
 ))}
 </div>
 ) : invoicesError ? (
 <p className="text-red-400 text-xs text-center py-6">
 Erro: {invoicesError}
 </p>
 ) : invoices.length === 0 ? (
 <p className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-400') + ' text-xs text-center py-6'}>
 Nenhuma fatura encontrada
 </p>
 ) : (
 <div className="space-y-2">
 {invoices.map(inv => {
   const date = new Date(inv.created * 1000);
   const formattedDate = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
   const amount = (inv.amount_paid / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
   const isPaid = inv.status === 'paid';
   const isOpen = inv.status === 'open';

   return (
   <div key={inv.id} className={(theme !== 'light' ? 'bg-neutral-800/60 border-neutral-700/50 hover:bg-neutral-800' : 'bg-gray-50 border-gray-200/60 hover:bg-gray-100') + ' border rounded-xl px-4 py-3 transition-colors'}>
     <div className="flex items-center justify-between gap-3">
       <div className="flex items-center gap-3 min-w-0 flex-1">
         <div className={'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ' + (isPaid ? 'bg-green-500/10' : isOpen ? 'bg-yellow-500/10' : (theme !== 'light' ? 'bg-neutral-700' : 'bg-gray-200'))}>
           <i className={'fas text-xs ' + (isPaid ? 'fa-check text-green-500' : isOpen ? 'fa-clock text-yellow-500' : 'fa-xmark ' + (theme !== 'light' ? 'text-neutral-400' : 'text-gray-400'))}></i>
         </div>
         <div className="min-w-0">
           <div className="flex items-center gap-2">
             <span className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>{inv.number || inv.id.slice(-8).toUpperCase()}</span>
             <span className={'text-[10px] px-1.5 py-0.5 rounded-full font-medium ' + (isPaid ? 'bg-green-500/10 text-green-500' : isOpen ? 'bg-yellow-500/10 text-yellow-500' : (theme !== 'light' ? 'bg-neutral-700 text-neutral-400' : 'bg-gray-200 text-gray-500'))}>
               {isPaid ? 'Pago' : isOpen ? 'Pendente' : inv.status}
             </span>
           </div>
           <p className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] mt-0.5'}>{formattedDate}</p>
         </div>
       </div>
       <div className="flex items-center gap-3 flex-shrink-0">
         <span className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold'}>{amount}</span>
         {inv.hosted_invoice_url && (
           <a
             href={inv.hosted_invoice_url}
             target="_blank"
             rel="noopener noreferrer"
             className={'text-[10px] font-medium flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ' + (theme !== 'light' ? 'text-neutral-400 hover:text-white hover:bg-neutral-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200')}
           >
             Ver fatura <i className="fas fa-arrow-up-right-from-square text-[8px]"></i>
           </a>
         )}
       </div>
     </div>
   </div>
   );
 })}
 </div>
 )}
 </div>
 )}

 {/* FAQ */}
 <div className={(theme !== 'light' ? 'bg-neutral-900/80 backdrop-blur-xl border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' border rounded-2xl p-5'}>
 <details className="group">
 <summary className={(theme !== 'light' ? 'text-white hover:text-neutral-300' : 'text-gray-900 hover:text-gray-600') + ' font-medium text-sm cursor-pointer flex items-center justify-between'}>
 Perguntas Frequentes
 <i className="fas fa-chevron-down text-xs transition-transform group-open:rotate-180"></i>
 </summary>
 <div className={(theme !== 'light' ? 'text-neutral-400' : 'text-gray-500') + ' mt-4 space-y-3 text-xs'}>
 <div>
 <p className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' font-medium mb-1'}>O que são créditos?</p>
 <p>Cada foto gerada consome 1 crédito. Fotos em 4K consomem 2 créditos. Criar um modelo IA custa 2 créditos.</p>
 </div>
 <div>
 <p className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' font-medium mb-1'}>Posso mudar de plano?</p>
 <p>Sim! Você pode fazer upgrade ou downgrade a qualquer momento.</p>
 </div>
 <div>
 <p className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' font-medium mb-1'}>Os créditos acumulam?</p>
 <p>Créditos do plano não acumulam para o próximo mês. Créditos comprados avulso não expiram.</p>
 </div>
 </div>
 </details>
 </div>

 {/* P7: Footer com link WhatsApp */}
 <p className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-400') + ' text-center text-xs mt-6'}>
 Precisa de mais? <a href="https://wa.me/5544991534082?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20mais%20sobre%20planos%20personalizados%20da%20Vizzu." target="_blank" rel="noopener noreferrer" className={(theme !== 'light' ? 'text-neutral-300 hover:text-white' : 'text-gray-600 hover:text-gray-900') + ' underline'}>Entre em contato</a> para planos personalizados.
 </p>
 </div>
 );
 })()}

 {/* ═══════ INTEGRAÇÕES ═══════ */}
 {settingsTab === 'integrations' && (
 <div>
 <h3 className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold mb-2 font-serif'}>Integrações</h3>
 <p className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mb-4'}>Conecte o Vizzu com suas plataformas de e-commerce.</p>

 {currentPlan.id === 'premier' || currentPlan.id === 'enterprise' || currentPlan.id === 'master' ? (
 <div className="space-y-2">

 {/* Shopify — funcional */}
 <ShopifyIntegrationCard theme={theme} />

 {/* WooCommerce e VTEX — em breve */}
 {[
 { icon: 'fab fa-wordpress', name: 'WooCommerce', desc: 'Loja WordPress' },
 { icon: 'fas fa-store', name: 'VTEX', desc: 'VTEX IO' },
 ].map(item => (
 <div key={item.name} className={(theme !== 'light' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-xl border p-3 flex items-center justify-between opacity-60'}>
 <div className="flex items-center gap-3">
 <div className={(theme !== 'light' ? 'bg-neutral-800' : 'bg-gray-100') + ' w-9 h-9 rounded-lg flex items-center justify-center'}>
 <i className={(theme !== 'light' ? 'text-neutral-400' : 'text-gray-500') + ' ' + item.icon + ' text-sm'}></i>
 </div>
 <div>
 <h4 className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' font-medium text-xs'}>{item.name}</h4>
 <p className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{item.desc}</p>
 </div>
 </div>
 <span className={(theme !== 'light' ? 'bg-neutral-800 text-neutral-500 border-neutral-700' : 'bg-gray-100 text-gray-400 border-gray-200') + ' px-3 py-1.5 rounded-lg font-medium text-[10px] border'}>Em breve</span>
 </div>
 ))}
 </div>
 ) : (
 <div className={(theme !== 'light' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-xl border p-6 text-center'}>
 <div className={'w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ' + (theme !== 'light' ? 'bg-amber-500/10' : 'bg-amber-50')}>
 <i className="fas fa-lock text-xl text-amber-500"></i>
 </div>
 <h4 className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm mb-1'}>Disponível a partir do Premier</h4>
 <p className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mb-4'}>
 Integre o Vizzu com Shopify, WooCommerce e VTEX para sincronizar produtos e exportar imagens diretamente.
 </p>
 <button
 onClick={() => { setSettingsTab('plan'); }}
 className="px-5 py-2.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
 >
 <i className="fas fa-arrow-up mr-2"></i>
 Fazer upgrade para Premier
 </button>
 </div>
 )}
 </div>
 )}

 {/* ═══════ CLIENTES ═══════ */}
 {settingsTab === 'clients' && (
 <ClientsPage
   showCreateClient={showCreateClientEmbed}
   setShowCreateClient={setShowCreateClientEmbed}
   createClientFromProvador={false}
   setCreateClientFromProvador={() => {}}
   setProvadorClient={() => {}}
   embedded
 />
 )}

 {/* ═══════ HISTÓRICO ═══════ */}
 {settingsTab === 'history' && (
 <div>
 <div className="flex items-center justify-between mb-4">
 <h3 className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold font-serif'}>Histórico</h3>
 {historyLogs.some(l => l.imageUrl) && (
 <button
 onClick={() => setShowHistoryDownload(true)}
 className={(theme !== 'light' ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-900') + ' text-xs flex items-center gap-1.5 transition-colors'}
 >
 <i className="fas fa-download"></i>
 Baixar tudo
 </button>
 )}
 </div>
 {/* P12: Esconder contador quando 0 */}
 {historyLogs.length > 0 && (
 <p className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs mb-4'}>{historyLogs.length} atividade{historyLogs.length !== 1 ? 's' : ''} registrada{historyLogs.length !== 1 ? 's' : ''}</p>
 )}

 {historyLogs.length === 0 ? (
 <div className={(theme !== 'light' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-xl border p-8 text-center'}>
 <div className={(theme !== 'light' ? 'bg-neutral-800' : 'bg-gray-100') + ' w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3'}>
 <i className={(theme !== 'light' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-clock-rotate-left text-xl'}></i>
 </div>
 <h3 className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium mb-1'}>Nenhuma atividade ainda</h3>
 <p className={(theme !== 'light' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Quando você gerar imagens ou editar produtos, as atividades aparecerão aqui.</p>
 </div>
 ) : (
 <div className="space-y-2">
 {/* P11: Paginação com "Carregar mais" */}
 {historyLogs.slice(0, historyVisible).map(log => {
 const statusConfig = {
 success: { icon: 'fa-check-circle', color: 'text-green-500', bg: theme !== 'light' ? 'bg-green-500/10' : 'bg-green-50' },
 error: { icon: 'fa-times-circle', color: 'text-red-500', bg: theme !== 'light' ? 'bg-red-500/10' : 'bg-red-50' },
 pending: { icon: 'fa-clock', color: 'text-yellow-500', bg: theme !== 'light' ? 'bg-yellow-500/10' : 'bg-yellow-50' },
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
 <div key={log.id} onClick={() => {
   if (!onNavigateToGallery) return;
   // Extrair nome do produto das aspas no details, ou usar items
   const quoted = log.details.match(/"([^"]+)"/);
   const productName = log.items?.[0]?.name || quoted?.[1];
   if (productName) onNavigateToGallery(productName);
   else navigateTo('gallery');
 }} className={(theme !== 'light' ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700' : 'bg-white border-gray-200 hover:border-gray-300') + ' rounded-xl border p-4 transition-colors cursor-pointer'}>
 <div className="flex items-start gap-3">
 <div className={status.bg + ' w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0'}>
 <i className={'fas ' + status.icon + ' ' + status.color}></i>
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-1">
 <h4 className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>{log.action}</h4>
 <span className={(theme !== 'light' ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-500') + ' text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-1'}>
 <i className={'fas ' + method.icon + ' text-[8px]'}></i>
 {method.label}
 </span>
 </div>
 <p className={(theme !== 'light' ? 'text-neutral-400' : 'text-gray-600') + ' text-xs mb-2'}>{log.details}</p>
 {/* P14: flex-wrap para metadata */}
 <div className="flex items-center gap-3 text-[10px] flex-wrap">
 <span className={theme !== 'light' ? 'text-neutral-500' : 'text-gray-400'}>
 <i className="fas fa-calendar mr-1"></i>
 {date.toLocaleDateString('pt-BR')} às {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
 </span>
 {log.cost > 0 && (
 <span className="text-[#FF6B6B]">
 <i className="fas fa-coins mr-1"></i>
 {log.cost} crédito{log.cost !== 1 ? 's' : ''}
 </span>
 )}
 {log.resolution && (
 <span className={log.resolution === '4k' ? 'text-purple-500 font-semibold' : (theme !== 'light' ? 'text-neutral-500' : 'text-gray-400')}>
 <i className="fas fa-expand mr-1"></i>
 {log.resolution.toUpperCase()}
 </span>
 )}
 {log.itemsCount && log.itemsCount > 0 && (
 <span className={theme !== 'light' ? 'text-neutral-500' : 'text-gray-400'}>
 <i className="fas fa-box mr-1"></i>
 {log.itemsCount} item{log.itemsCount !== 1 ? 's' : ''}
 </span>
 )}
 {/* P13: Underline no link de download */}
 {log.imageUrl && (
 <a
 href={log.imageUrl}
 target="_blank"
 rel="noopener noreferrer"
 download
 className="text-[#FF6B6B] hover:text-[#FF9F43] transition-colors underline"
 onClick={(e) => e.stopPropagation()}
 >
 <i className="fas fa-download mr-1"></i>
 Baixar imagem
 </a>
 )}
 </div>
 </div>
 </div>
 </div>
 );
 })}
 {/* P11: Botão "Carregar mais" com contador */}
 {historyVisible < historyLogs.length && (
 <button
 onClick={() => setHistoryVisible(v => v + HISTORY_PAGE_SIZE)}
 className={(theme !== 'light' ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-200') + ' w-full py-2.5 rounded-xl text-xs font-medium border transition-colors flex items-center justify-center gap-2'}
 >
 <i className="fas fa-chevron-down text-[8px]"></i>
 Carregar mais ({historyVisible} de {historyLogs.length})
 </button>
 )}
 {historyVisible >= historyLogs.length && historyLogs.length > HISTORY_PAGE_SIZE && (
 <p className={(theme !== 'light' ? 'text-neutral-600' : 'text-gray-400') + ' text-center text-[10px] pt-2'}>
 Mostrando todas as {historyLogs.length} atividades
 </p>
 )}
 </div>
 )}
 </div>
 )}
 </div>

 {/* ═══════ MODAIS ═══════ */}

 {/* P5: Modal de cancelar assinatura */}
 <ConfirmModal
 isOpen={showCancelModal}
 onCancel={() => setShowCancelModal(false)}
 onConfirm={async () => {
 setIsCancelling(true);
 try {
 await onCancelSubscription();
 setShowCancelModal(false);
 } catch {
 // Toast de erro já é mostrado pelo handler
 } finally {
 setIsCancelling(false);
 }
 }}
 title="Cancelar assinatura?"
 description={`Você está no plano ${currentPlan.name}. Ao cancelar, o acesso continuará até o fim do período atual.`}
 consequences={[
 'Seus créditos restantes serão perdidos ao fim do período',
 'Você perderá acesso às ferramentas premium',
 'Gerações futuras ficarão limitadas ao plano gratuito',
 ]}
 confirmLabel="Cancelar assinatura"
 cancelLabel="Manter plano"
 variant="danger"
 isLoading={isCancelling}
 theme={theme}
 />

 {/* Download de todas as imagens do histórico */}
 <DownloadModal
 isOpen={showHistoryDownload}
 onClose={() => setShowHistoryDownload(false)}
 productName="Historico-Vizzu"
 images={historyLogs
 .filter((l): l is typeof l & { imageUrl: string } => !!l.imageUrl)
 .map((l, i): DownloadableImage => ({
 url: l.imageUrl,
 label: l.action || `Imagem ${i + 1}`,
 featurePrefix: 'historico',
 }))}
 theme={theme}
 />

 {/* Modal para reler os termos (fora de qualquer tab/scroll container) */}
 <TermsAcceptanceModal
  isOpen={showTermsModal}
  onAccept={async () => true}
  isLoading={false}
  readOnly
  onClose={() => setShowTermsModal(false)}
 />

 </div>
 );
};
