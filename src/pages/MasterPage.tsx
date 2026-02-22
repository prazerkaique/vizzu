import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { useUI } from '../contexts/UIContext';


interface Metrics {
  total_users: number;
  generations_today: number;
  total_credits: number;
  plans: { plan: string; count: number }[];
}

interface UserRow {
  email: string;
  plan_id: string;
  whatsapp?: string | null;
}

interface MasterExtras {
  recent_users: (UserRow & { created_at: string })[];
  provider_stats: Record<string, number>;
  active_users_7d: number;
  active_users_30d: number;
  top_users: (UserRow & { generation_count: number })[];
  generations_by_feature: { feature: string; count: number }[];
  failure_rate: { total_7d: number; failed_7d: number };
  generation_trend: { today: number; yesterday: number; days_7d: number; days_30d: number };
  low_credit_users: (UserRow & { balance: number })[];
  recent_errors: { generation_type: string; error_message: string; created_at: string; email: string }[];
  hourly_distribution: { hour: number; success: number; errors: number }[];
  shopify_stats: { connections: number; exports: number };
  paid_users: number;
  recent_purchases?: { id: string; type: string; amount: number; description: string; created_at: string; user_id: string; email?: string }[];
  recent_generations?: { id: string; type: string; status: string; output_urls: any; created_at: string; user_id: string; email?: string }[];
  recent_payers?: { email: string; plan_id: string; amount: number; created_at: string; whatsapp?: string | null }[];
}

interface BannerConfig {
  active: boolean;
  message: string;
  link?: string;
  linkLabel?: string;
}

interface UserData {
  user_id: string;
  subscription: any;
  credits: any;
  generations: any[];
  transactions: any[];
  company: any;
  products_count: number;
}

export function MasterPage() {
  const { theme, showToast } = useUI();
  const isDark = theme !== 'light';

  // Auth state
  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Stored password for RPCs (apenas em memoria, nao persiste entre abas)
  const [storedPassword, setStoredPassword] = useState('');

  // Metrics
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Extras (recent users + provider stats)
  const [extras, setExtras] = useState<MasterExtras | null>(null);

  // User search
  const [searchEmail, setSearchEmail] = useState('');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Edit states
  const [editPlan, setEditPlan] = useState('');
  const [editCredits, setEditCredits] = useState('');
  const [editEditBalance, setEditEditBalance] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  // Banner controls
  const [bannerDemand, setBannerDemand] = useState<BannerConfig>({ active: false, message: 'Nossos servidores estão com alta demanda. As gerações podem demorar mais que o esperado.' });
  const [bannerMaintenance, setBannerMaintenance] = useState<BannerConfig>({ active: false, message: 'Estamos realizando melhorias nos nossos servidores para oferecer ainda mais qualidade. Algumas funcionalidades podem estar temporariamente indisponíveis.' });
  const [bannerPromo, setBannerPromo] = useState<BannerConfig>({ active: false, message: '', link: '', linkLabel: '' });
  const [bannerSaving, setBannerSaving] = useState<string | null>(null);

  // Debug toggles
  const [debugSlowBanner, setDebugSlowBanner] = useState(() => !!localStorage.getItem('vizzu-debug-slow'));

  // ── Auth ──
  const handleUnlock = async () => {
    if (!password.trim()) return;
    setAuthLoading(true);
    setAuthError('');
    try {
      const { data, error } = await supabase.rpc('master_verify_password', { p_password: password });
      if (error) throw error;
      if (data === true) {
        setStoredPassword(password);
        setIsUnlocked(true);
      } else {
        setAuthError('Senha incorreta');
      }
    } catch (e: any) {
      setAuthError(e.message || 'Erro ao verificar senha');
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Metrics ──
  const loadMetrics = useCallback(async () => {
    if (!storedPassword) return;
    setMetricsLoading(true);
    try {
      const { data, error } = await supabase.rpc('master_get_metrics', { p_password: storedPassword });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMetrics(data);
    } catch (e: any) {
      showToast('Erro ao carregar métricas: ' + e.message, 'error');
    } finally {
      setMetricsLoading(false);
    }
  }, [storedPassword, showToast]);

  // ── Extras (recent users + provider stats) ──
  const loadExtras = useCallback(async () => {
    if (!storedPassword) return;
    try {
      const { data, error } = await supabase.rpc('master_get_extras', { p_password: storedPassword });
      if (error) throw error;
      if (data?.error) return; // RPC não existe ainda — silently skip
      setExtras(data);
    } catch {
      // Se a RPC não existe ainda, ignora silenciosamente
    }
  }, [storedPassword]);

  // ── Load banners from app_config ──
  const loadBanners = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('app_config')
        .select('key, value')
        .in('key', ['banner_demand', 'banner_maintenance', 'banner_promo']);
      if (data) {
        for (const row of data) {
          const val = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
          if (row.key === 'banner_demand') setBannerDemand(v => ({ ...v, ...val }));
          if (row.key === 'banner_maintenance') setBannerMaintenance(v => ({ ...v, ...val }));
          if (row.key === 'banner_promo') setBannerPromo(v => ({ ...v, ...val }));
        }
      }
    } catch { /* silent */ }
  }, []);

  // ── Save banner to app_config ──
  const saveBanner = async (key: string, value: BannerConfig) => {
    setBannerSaving(key);
    try {
      const { error } = await supabase
        .from('app_config')
        .upsert({ key, value }, { onConflict: 'key' });
      if (error) throw error;
      showToast('Banner atualizado!', 'success');
    } catch (e: any) {
      showToast('Erro ao salvar banner: ' + e.message, 'error');
    } finally {
      setBannerSaving(null);
    }
  };

  useEffect(() => {
    if (isUnlocked && storedPassword) {
      loadMetrics();
      loadExtras();
      loadBanners();
    }
  }, [isUnlocked, storedPassword, loadMetrics, loadExtras, loadBanners]);

  // ── User search ──
  const searchUser = async () => {
    if (!searchEmail.trim() || !storedPassword) return;
    setSearchLoading(true);
    setSearchError('');
    setUserData(null);
    try {
      const { data, error } = await supabase.rpc('master_get_user', {
        p_email: searchEmail.trim().toLowerCase(),
        p_password: storedPassword,
      });
      if (error) throw error;
      if (data?.error === 'user_not_found') {
        setSearchError('Usuário não encontrado');
        return;
      }
      if (data?.error) throw new Error(data.error);
      setUserData(data);
      setEditPlan(data.subscription?.plan_id || '');
      setEditCredits(String(data.credits?.balance ?? 0));
      setEditEditBalance(String(data.credits?.edit_balance ?? 0));
    } catch (e: any) {
      setSearchError(e.message || 'Erro ao buscar usuário');
    } finally {
      setSearchLoading(false);
    }
  };

  // ── Update user ──
  const ALLOWED_FIELDS = ['plan_id', 'credits', 'edit_balance', 'status'];
  const ALLOWED_PLANS = ['free', 'starter', 'basic', 'pro', 'premier', 'enterprise', 'test', 'master'];

  const updateField = async (field: string, value: string) => {
    if (!userData || !storedPassword) return;

    // Validacao: campo permitido
    if (!ALLOWED_FIELDS.includes(field)) {
      showToast(`Campo "${field}" nao permitido`, 'error');
      return;
    }
    // Validacao por campo
    if (field === 'plan_id' && !ALLOWED_PLANS.includes(value)) {
      showToast('Plano invalido', 'error');
      return;
    }
    if ((field === 'credits' || field === 'edit_balance') && (isNaN(Number(value)) || Number(value) < 0 || Number(value) > 999999)) {
      showToast('Valor de creditos invalido (0-999999)', 'error');
      return;
    }
    if (field === 'status' && !['active', 'cancelled', 'trialing', 'past_due'].includes(value)) {
      showToast('Status invalido', 'error');
      return;
    }

    setSaving(field);
    try {
      const { data, error } = await supabase.rpc('master_update_user', {
        p_email: userData.subscription?.email || searchEmail,
        p_field: field,
        p_value: value,
        p_password: storedPassword,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      showToast(`${field} atualizado com sucesso!`, 'success');
      // Refresh user data
      await searchUser();
    } catch (e: any) {
      showToast('Erro: ' + e.message, 'error');
    } finally {
      setSaving(null);
    }
  };

  // ── Helpers ──
  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const cardClass = isDark
    ? 'bg-neutral-900 border border-neutral-800 rounded-2xl'
    : 'bg-white border border-gray-200 rounded-2xl shadow-sm';

  const inputClass = isDark
    ? 'bg-neutral-800 text-white border border-neutral-700 focus:border-[#FF6B6B] rounded-xl px-3 py-2 text-sm outline-none transition-colors'
    : 'bg-white text-gray-900 border border-gray-300 focus:border-[#FF6B6B] rounded-xl px-3 py-2 text-sm outline-none transition-colors';

  const labelClass = isDark ? 'text-neutral-400 text-xs font-medium' : 'text-gray-500 text-xs font-medium';
  const valueClass = isDark ? 'text-white text-sm font-semibold' : 'text-gray-900 text-sm font-semibold';

  // ── Plan badge helper ──
  const planBadge = (planId: string) => (
    <span className={'px-2 py-0.5 rounded-full text-[10px] font-medium capitalize flex-shrink-0 ' + (
      planId === 'free' ? (isDark ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-200 text-gray-600') :
      planId === 'starter' ? 'bg-blue-500/15 text-blue-400' :
      planId === 'pro' ? 'bg-purple-500/15 text-purple-400' :
      planId === 'premier' ? 'bg-amber-500/15 text-amber-400' :
      'bg-green-500/15 text-green-400'
    )}>{planId}</span>
  );

  // ── Contact button helper ──
  const contactBtn = (user: { email: string; whatsapp?: string | null }) => {
    const hasWa = user.whatsapp && user.whatsapp.trim().length >= 8;
    const cleanPhone = hasWa ? user.whatsapp!.replace(/\D/g, '') : '';
    const url = hasWa
      ? `https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}`
      : `mailto:${user.email}`;
    const icon = hasWa ? 'fab fa-whatsapp' : 'fas fa-envelope';
    const color = hasWa ? 'text-green-400 hover:text-green-300' : 'text-blue-400 hover:text-blue-300';
    const title = hasWa ? `WhatsApp: ${user.whatsapp}` : `Email: ${user.email}`;
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        title={title}
        className={'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ' + color + ' ' + (isDark ? 'hover:bg-neutral-700' : 'hover:bg-gray-200')}
      >
        <i className={icon + ' text-sm'}></i>
      </a>
    );
  };

  // ═══════════════════════════════════════
  // PASSWORD MODAL
  // ═══════════════════════════════════════
  if (!isUnlocked) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className={cardClass + ' w-full max-w-sm p-8'}>
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#FF6B6B]/15 to-[#FF9F43]/15 flex items-center justify-center">
              <i className="fas fa-crown text-2xl text-[#FF6B6B]"></i>
            </div>
            <h2 className={'text-xl font-bold font-serif ' + (isDark ? 'text-white' : 'text-gray-900')}>Painel Master</h2>
            <p className={isDark ? 'text-neutral-400 text-sm mt-1' : 'text-gray-500 text-sm mt-1'}>Digite a senha para acessar</p>
          </div>
          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setAuthError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
              placeholder="Senha"
              className={inputClass + ' w-full text-center text-lg tracking-[0.3em]'}
              autoFocus
            />
            {authError && <p className="text-red-400 text-xs text-center">{authError}</p>}
            <button
              onClick={handleUnlock}
              disabled={authLoading || !password.trim()}
              className="w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] hover:shadow-lg hover:shadow-[#FF6B6B]/25 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {authLoading ? <i className="fas fa-spinner fa-spin"></i> : 'Entrar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // MAIN PANEL
  // ═══════════════════════════════════════
  return (
    <div className={'h-full overflow-y-auto ' + (isDark ? 'bg-black' : 'bg-cream')}>
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B6B] to-[#FF9F43] flex items-center justify-center">
              <i className="fas fa-crown text-white text-sm"></i>
            </div>
            <div>
              <h1 className={'text-2xl font-bold font-serif ' + (isDark ? 'text-white' : 'text-gray-900')}>Painel Master</h1>
              <p className={isDark ? 'text-neutral-500 text-xs' : 'text-gray-400 text-xs'}>Administração interna do Vizzu</p>
            </div>
          </div>
          <button
            onClick={() => { loadMetrics(); loadExtras(); }}
            disabled={metricsLoading}
            className={'px-3 py-2 rounded-xl text-xs font-medium transition-all ' + (isDark ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
          >
            <i className={'fas fa-sync-alt mr-1.5 ' + (metricsLoading ? 'fa-spin' : '')}></i>Atualizar
          </button>
        </div>

        {/* ═══ SEÇÃO 1: MÉTRICAS PRINCIPAIS ═══ */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* Total Users */}
            <div className={cardClass + ' p-4'}>
              <p className={labelClass}>Usuários totais</p>
              <p className={'text-2xl font-bold mt-1 ' + (isDark ? 'text-white' : 'text-gray-900')}>{metrics.total_users}</p>
              {extras && (
                <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] mt-0.5'}>
                  {extras.active_users_7d} ativos (7d) / {extras.active_users_30d} (30d)
                </p>
              )}
            </div>
            {/* Generations Today */}
            <div className={cardClass + ' p-4'}>
              <p className={labelClass}>Gerações hoje</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className={'text-2xl font-bold ' + (isDark ? 'text-white' : 'text-gray-900')}>{metrics.generations_today}</p>
                {extras && extras.generation_trend && (() => {
                  const diff = extras.generation_trend.today - extras.generation_trend.yesterday;
                  if (diff === 0) return null;
                  return (
                    <span className={'text-xs font-medium ' + (diff > 0 ? 'text-green-400' : 'text-red-400')}>
                      {diff > 0 ? '+' : ''}{diff} vs ontem
                    </span>
                  );
                })()}
              </div>
              {extras?.generation_trend && (
                <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] mt-0.5'}>
                  7d: {extras.generation_trend.days_7d} | 30d: {extras.generation_trend.days_30d}
                </p>
              )}
            </div>
            {/* Success Rate */}
            <div className={cardClass + ' p-4'}>
              <p className={labelClass}>Uptime servidor (7d)</p>
              {extras?.failure_rate ? (() => {
                const { total_7d, failed_7d } = extras.failure_rate;
                const rate = total_7d > 0 ? ((total_7d - failed_7d) / total_7d * 100) : 100;
                return (
                  <>
                    <p className={'text-2xl font-bold mt-1 ' + (rate >= 95 ? 'text-green-400' : rate >= 85 ? 'text-yellow-400' : 'text-red-400')}>
                      {rate.toFixed(1)}%
                    </p>
                    <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] mt-0.5'}>
                      {failed_7d} erro{failed_7d !== 1 ? 's' : ''} de servidor em {total_7d} gerações
                    </p>
                  </>
                );
              })() : (
                <p className={'text-2xl font-bold mt-1 ' + (isDark ? 'text-white' : 'text-gray-900')}>—</p>
              )}
            </div>
            {/* Paid Users */}
            <div className={cardClass + ' p-4'}>
              <p className={labelClass}>Pagantes</p>
              <p className={'text-2xl font-bold mt-1 ' + (isDark ? 'text-white' : 'text-gray-900')}>
                {extras?.paid_users ?? '—'}
              </p>
              {extras && metrics.total_users > 0 && (
                <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] mt-0.5'}>
                  {((extras.paid_users / metrics.total_users) * 100).toFixed(1)}% de conversão
                </p>
              )}
            </div>
            {/* Credits */}
            <div className={cardClass + ' p-4'}>
              <p className={labelClass}>Créditos em circulação</p>
              <p className={'text-2xl font-bold mt-1 ' + (isDark ? 'text-white' : 'text-gray-900')}>{Number(metrics.total_credits).toLocaleString()}</p>
            </div>
            {/* Plans */}
            <div className={cardClass + ' p-4'}>
              <p className={labelClass}>Planos</p>
              <div className="mt-1 space-y-0.5">
                {metrics.plans?.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className={'text-xs capitalize ' + (isDark ? 'text-neutral-300' : 'text-gray-700')}>{p.plan}</span>
                    <span className={'text-xs font-bold ' + (isDark ? 'text-white' : 'text-gray-900')}>{p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ SEÇÃO 2: ÚLTIMOS CADASTROS + TOP USERS ═══ */}
        {extras && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Últimos Cadastros */}
              <div className={cardClass + ' p-5'}>
                <h3 className={'text-sm font-bold font-serif mb-3 flex items-center gap-2 ' + (isDark ? 'text-white' : 'text-gray-900')}>
                  <i className="fas fa-user-plus text-[#FF6B6B] text-xs"></i>Últimos Cadastros
                </h3>
                {extras.recent_users?.length > 0 ? (
                  <div className="space-y-2">
                    {extras.recent_users.map((u, i) => (
                      <div key={i} className={'flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:ring-1 hover:ring-[#FF6B6B]/30 transition-all ' + (isDark ? 'bg-neutral-800/50' : 'bg-gray-50')}
                        onClick={() => { setSearchEmail(u.email); }}
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B6B]/20 to-[#FF9F43]/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-[#FF6B6B] text-xs font-bold">{u.email?.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium truncate'}>{u.email}</p>
                          <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px]'}>
                            {new Date(u.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {contactBtn(u)}
                        {planBadge(u.plan_id)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-xs'}>Nenhum usuário</p>
                )}
              </div>

              {/* Top 5 Usuários */}
              <div className={cardClass + ' p-5'}>
                <h3 className={'text-sm font-bold font-serif mb-3 flex items-center gap-2 ' + (isDark ? 'text-white' : 'text-gray-900')}>
                  <i className="fas fa-trophy text-[#FF9F43] text-xs"></i>Top Usuários
                  <span className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] font-normal'}>30 dias</span>
                </h3>
                {extras.top_users?.length > 0 ? (
                  <div className="space-y-2">
                    {extras.top_users.map((u, i) => {
                      const maxCount = extras.top_users[0]?.generation_count || 1;
                      const pct = (u.generation_count / maxCount) * 100;
                      return (
                        <div key={i} className={'relative overflow-hidden flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:ring-1 hover:ring-[#FF6B6B]/30 transition-all ' + (isDark ? 'bg-neutral-800/50' : 'bg-gray-50')}
                          onClick={() => { setSearchEmail(u.email); }}
                        >
                          <div className={'absolute inset-0 rounded-xl opacity-10 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]'} style={{ width: `${pct}%` }} />
                          <span className={'text-xs font-bold w-5 text-center flex-shrink-0 ' + (i === 0 ? 'text-[#FF9F43]' : isDark ? 'text-neutral-500' : 'text-gray-400')}>
                            {i === 0 ? <i className="fas fa-crown"></i> : `#${i + 1}`}
                          </span>
                          <div className="flex-1 min-w-0 relative">
                            <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium truncate'}>{u.email}</p>
                          </div>
                          <span className={'text-xs font-bold relative ' + (isDark ? 'text-white' : 'text-gray-900')}>{u.generation_count}</span>
                          {contactBtn(u)}
                          {planBadge(u.plan_id)}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-xs'}>Sem dados</p>
                )}
              </div>
            </div>

            {/* ═══ SEÇÃO 3: FEATURES + PROVIDERS ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Gerações por Feature */}
              <div className={cardClass + ' p-5'}>
                <h3 className={'text-sm font-bold font-serif mb-3 flex items-center gap-2 ' + (isDark ? 'text-white' : 'text-gray-900')}>
                  <i className="fas fa-chart-bar text-[#FF6B6B] text-xs"></i>Gerações por Feature
                  <span className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] font-normal'}>30 dias</span>
                </h3>
                {extras.generations_by_feature?.length > 0 ? (() => {
                  const FEATURE_LABELS: Record<string, string> = {
                    product_studio: 'Product Studio', studio: 'Product Studio', studio_ready: 'Product Studio',
                    look_composer: 'Look Composer', modelo_ia: 'Look Composer', lifestyle: 'Look Composer', 'modelo-ia': 'Look Composer',
                    creative_still: 'Creative Still', cenario: 'Cenário Criativo', 'cenario-criativo': 'Cenário Criativo',
                    provador: 'Provador', refine: 'Studio Edit', colorize: 'Colorize',
                  };
                  const FEATURE_COLORS: Record<string, string> = {
                    product_studio: 'from-[#FF6B6B] to-[#FF9F43]', studio: 'from-[#FF6B6B] to-[#FF9F43]', studio_ready: 'from-[#FF6B6B] to-[#FF9F43]',
                    look_composer: 'from-blue-500 to-blue-400', modelo_ia: 'from-blue-500 to-blue-400', lifestyle: 'from-blue-500 to-blue-400', 'modelo-ia': 'from-blue-500 to-blue-400',
                    creative_still: 'from-violet-500 to-violet-400', cenario: 'from-purple-500 to-purple-400', 'cenario-criativo': 'from-purple-500 to-purple-400',
                    provador: 'from-emerald-500 to-emerald-400', refine: 'from-amber-500 to-amber-400', colorize: 'from-pink-500 to-pink-400',
                  };
                  const total = extras.generations_by_feature.reduce((s, f) => s + f.count, 0);
                  const maxCount = extras.generations_by_feature[0]?.count || 1;
                  return (
                    <div className="space-y-2.5">
                      {extras.generations_by_feature.map((f, i) => {
                        const pct = (f.count / maxCount) * 100;
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between mb-1">
                              <span className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-xs'}>{FEATURE_LABELS[f.feature] || f.feature}</span>
                              <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-bold'}>
                                {f.count} <span className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' font-normal'}>({total > 0 ? (f.count / total * 100).toFixed(0) : 0}%)</span>
                              </span>
                            </div>
                            <div className={'h-2 rounded-full overflow-hidden ' + (isDark ? 'bg-neutral-800' : 'bg-gray-100')}>
                              <div className={'h-full rounded-full bg-gradient-to-r ' + (FEATURE_COLORS[f.feature] || 'from-gray-400 to-gray-300')} style={{ width: `${Math.max(pct, 3)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                      <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] mt-1'}>Total: {total} gerações</p>
                    </div>
                  );
                })() : (
                  <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-xs'}>Sem dados</p>
                )}
              </div>

              {/* Provider Stats */}
              <div className={cardClass + ' p-5'}>
                <h3 className={'text-sm font-bold font-serif mb-3 flex items-center gap-2 ' + (isDark ? 'text-white' : 'text-gray-900')}>
                  <i className="fas fa-robot text-[#FF9F43] text-xs"></i>Providers IA
                  <span className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] font-normal'}>30 dias</span>
                </h3>
                {extras.provider_stats && Object.keys(extras.provider_stats).length > 0 ? (() => {
                  const entries = Object.entries(extras.provider_stats).sort((a, b) => b[1] - a[1]);
                  const total = entries.reduce((sum, [, v]) => sum + v, 0);
                  const PROVIDER_LABELS: Record<string, string> = {
                    'gemini-oficial': 'Gemini (API direta)', 'fal-gemini': 'Gemini (fal.ai)', 'fal-seedream': 'Seedream 4.5 (fal.ai)',
                  };
                  const PROVIDER_COLORS: Record<string, string> = {
                    'gemini-oficial': 'from-blue-500 to-blue-400', 'fal-gemini': 'from-[#FF6B6B] to-[#FF9F43]', 'fal-seedream': 'from-emerald-500 to-emerald-400',
                  };
                  return (
                    <div className="space-y-2.5">
                      {entries.map(([provider, count]) => {
                        const pct = total > 0 ? (count / total * 100) : 0;
                        return (
                          <div key={provider}>
                            <div className="flex items-center justify-between mb-1">
                              <span className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-xs'}>{PROVIDER_LABELS[provider] || provider}</span>
                              <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-bold'}>{count} <span className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' font-normal'}>({pct.toFixed(0)}%)</span></span>
                            </div>
                            <div className={'h-2 rounded-full overflow-hidden ' + (isDark ? 'bg-neutral-800' : 'bg-gray-100')}>
                              <div className={'h-full rounded-full bg-gradient-to-r ' + (PROVIDER_COLORS[provider] || 'from-gray-400 to-gray-300')} style={{ width: `${Math.max(pct, 3)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                      <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] mt-1'}>
                        Fallback: {entries.filter(([p]) => p !== 'gemini-oficial').reduce((s, [, v]) => s + v, 0)} ({total > 0 ? (entries.filter(([p]) => p !== 'gemini-oficial').reduce((s, [, v]) => s + v, 0) / total * 100).toFixed(1) : '0'}%)
                      </p>
                    </div>
                  );
                })() : (
                  <div className="text-center py-6">
                    <i className={'fas fa-chart-bar text-2xl mb-2 ' + (isDark ? 'text-neutral-700' : 'text-gray-200')}></i>
                    <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-xs'}>Sem dados ainda</p>
                    <p className={(isDark ? 'text-neutral-600' : 'text-gray-300') + ' text-[10px] mt-1'}>Aparece quando os workflows com fallback forem ativados</p>
                  </div>
                )}
              </div>
            </div>

            {/* ═══ SEÇÃO 3B: GRÁFICO DE PICO ═══ */}
            {extras.hourly_distribution && extras.hourly_distribution.length > 0 && (() => {
              // Preencher as 24 horas (SQL pode pular horas sem dados)
              const hourMap = new Map<number, { success: number; errors: number }>();
              extras.hourly_distribution.forEach(h => hourMap.set(h.hour, { success: h.success, errors: h.errors }));
              const hours = Array.from({ length: 24 }, (_, i) => ({
                hour: i,
                success: hourMap.get(i)?.success || 0,
                errors: hourMap.get(i)?.errors || 0,
              }));

              const maxSuccess = Math.max(...hours.map(h => h.success), 1);
              const maxErrors = Math.max(...hours.map(h => h.errors), 1);
              const peakHour = hours.reduce((best, h) => h.success > best.success ? h : best, hours[0]);
              const errorPeakHour = hours.reduce((best, h) => h.errors > best.errors ? h : best, hours[0]);
              const totalSuccess = hours.reduce((s, h) => s + h.success, 0);
              const totalErrors = hours.reduce((s, h) => s + h.errors, 0);

              return (
                <div className={cardClass + ' p-5'}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={'text-sm font-bold font-serif flex items-center gap-2 ' + (isDark ? 'text-white' : 'text-gray-900')}>
                      <i className="fas fa-clock text-[#FF6B6B] text-xs"></i>Horários de Pico
                      <span className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] font-normal'}>últimos 7 dias (BRT)</span>
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]"></div>
                        <span className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px]'}>Sucesso ({totalSuccess})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm bg-red-500"></div>
                        <span className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px]'}>Erros servidor ({totalErrors})</span>
                      </div>
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="relative" style={{ height: '200px' }}>
                    {/* Success area (top half) */}
                    <div className="absolute inset-x-0 top-0" style={{ height: '60%' }}>
                      <div className="flex items-end h-full gap-[2px] px-0.5">
                        {hours.map(h => {
                          const pct = maxSuccess > 0 ? (h.success / maxSuccess) * 100 : 0;
                          const isPeak = h.hour === peakHour.hour && h.success > 0;
                          return (
                            <div key={h.hour} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                              {/* Tooltip */}
                              <div className={'absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none ' + (isDark ? 'bg-neutral-700 text-white' : 'bg-gray-800 text-white')}>
                                {h.hour}h: {h.success} ok, {h.errors} srv erro{h.errors !== 1 ? 's' : ''}
                              </div>
                              <div
                                className={'w-full rounded-t-sm transition-all duration-300 ' + (isPeak ? 'bg-gradient-to-t from-[#FF6B6B] to-[#FF9F43] shadow-sm shadow-[#FF6B6B]/30' : isDark ? 'bg-gradient-to-t from-[#FF6B6B]/60 to-[#FF9F43]/40 group-hover:from-[#FF6B6B] group-hover:to-[#FF9F43]' : 'bg-gradient-to-t from-[#FF6B6B]/50 to-[#FF9F43]/30 group-hover:from-[#FF6B6B]/80 group-hover:to-[#FF9F43]/60')}
                                style={{ height: `${Math.max(pct, h.success > 0 ? 4 : 0)}%` }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Divider line (zero axis) */}
                    <div className={'absolute inset-x-0 border-t ' + (isDark ? 'border-neutral-700' : 'border-gray-200')} style={{ top: '60%' }} />

                    {/* Error area (bottom portion) */}
                    <div className="absolute inset-x-0" style={{ top: '60%', height: '28%' }}>
                      <div className="flex items-start h-full gap-[2px] px-0.5">
                        {hours.map(h => {
                          const pct = maxErrors > 0 ? (h.errors / maxErrors) * 100 : 0;
                          const isErrorPeak = h.hour === errorPeakHour.hour && h.errors > 0;
                          return (
                            <div key={h.hour} className="flex-1 flex flex-col items-center h-full group">
                              <div
                                className={'w-full rounded-b-sm transition-all duration-300 ' + (isErrorPeak ? 'bg-red-500 shadow-sm shadow-red-500/30' : isDark ? 'bg-red-500/40 group-hover:bg-red-500/70' : 'bg-red-400/30 group-hover:bg-red-400/60')}
                                style={{ height: `${Math.max(pct, h.errors > 0 ? 8 : 0)}%` }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Hour labels */}
                    <div className="absolute inset-x-0 bottom-0 flex gap-[2px] px-0.5" style={{ height: '12%' }}>
                      {hours.map(h => (
                        <div key={h.hour} className="flex-1 flex items-center justify-center">
                          {h.hour % 3 === 0 && (
                            <span className={(isDark ? 'text-neutral-600' : 'text-gray-300') + ' text-[9px]'}>{h.hour}h</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className={'flex items-center justify-between mt-3 pt-3 border-t ' + (isDark ? 'border-neutral-800' : 'border-gray-100')}>
                    <div className="flex items-center gap-1.5">
                      <i className="fas fa-arrow-up text-[8px] text-green-400"></i>
                      <span className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px]'}>
                        Pico: <span className={'font-bold ' + (isDark ? 'text-white' : 'text-gray-900')}>{peakHour.hour}h</span> ({peakHour.success} gerações)
                      </span>
                    </div>
                    {errorPeakHour.errors > 0 && (
                      <div className="flex items-center gap-1.5">
                        <i className="fas fa-arrow-down text-[8px] text-red-400"></i>
                        <span className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px]'}>
                          Pico de erros: <span className="font-bold text-red-400">{errorPeakHour.hour}h</span> ({errorPeakHour.errors} falhas)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ═══ SEÇÃO 4: ALERTAS — CRÉDITOS BAIXOS + ERROS ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Créditos acabando */}
              <div className={cardClass + ' p-5'}>
                <h3 className={'text-sm font-bold font-serif mb-3 flex items-center gap-2 ' + (isDark ? 'text-white' : 'text-gray-900')}>
                  <i className="fas fa-exclamation-triangle text-amber-400 text-xs"></i>Créditos Baixos
                  <span className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] font-normal'}>{'< 5 créditos'}</span>
                </h3>
                {extras.low_credit_users?.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {extras.low_credit_users.map((u, i) => (
                      <div key={i} className={'flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:ring-1 hover:ring-[#FF6B6B]/30 transition-all ' + (isDark ? 'bg-neutral-800/50' : 'bg-gray-50')}
                        onClick={() => { setSearchEmail(u.email); }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium truncate'}>{u.email}</p>
                        </div>
                        <span className={'text-xs font-bold ' + (u.balance <= 0 ? 'text-red-400' : 'text-amber-400')}>{u.balance}</span>
                        {contactBtn(u)}
                        {planBadge(u.plan_id)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <i className={'fas fa-check-circle text-lg mb-1 text-green-400'}></i>
                    <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-xs'}>Todos com saldo OK</p>
                  </div>
                )}
              </div>

              {/* Erros Recentes */}
              <div className={cardClass + ' p-5'}>
                <h3 className={'text-sm font-bold font-serif mb-3 flex items-center gap-2 ' + (isDark ? 'text-white' : 'text-gray-900')}>
                  <i className="fas fa-server text-red-400 text-xs"></i>Erros de Servidor
                </h3>
                {extras.recent_errors?.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {extras.recent_errors.map((e, i) => {
                      const FEATURE_LABELS: Record<string, string> = {
                        product_studio: 'PS', studio: 'PS', studio_ready: 'PS',
                        look_composer: 'LC', modelo_ia: 'LC', lifestyle: 'LC', 'modelo-ia': 'LC',
                        creative_still: 'CS', cenario: 'Cenário', 'cenario-criativo': 'Cenário',
                        provador: 'Provador', refine: 'Edit',
                      };
                      return (
                        <div key={i} className={'p-2 rounded-xl ' + (isDark ? 'bg-neutral-800/50' : 'bg-gray-50')}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 text-[10px] font-medium">
                              {FEATURE_LABELS[e.generation_type] || e.generation_type}
                            </span>
                            <span className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px]'}>
                              {new Date(e.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] truncate'}>{e.email}</span>
                          </div>
                          <p className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px] truncate'}>{e.error_message || 'Sem mensagem de erro'}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <i className={'fas fa-check-circle text-lg mb-1 text-green-400'}></i>
                    <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-xs'}>Nenhum erro de servidor</p>
                  </div>
                )}
              </div>
            </div>

            {/* ═══ SEÇÃO 5: SHOPIFY ═══ */}
            {extras.shopify_stats && (extras.shopify_stats.connections > 0 || extras.shopify_stats.exports > 0) && (
              <div className={cardClass + ' p-4'}>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <i className="fab fa-shopify text-[#96bf48] text-sm"></i>
                    <span className={labelClass}>Lojas conectadas</span>
                    <span className={'text-sm font-bold ' + (isDark ? 'text-white' : 'text-gray-900')}>{extras.shopify_stats.connections}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="fas fa-upload text-[#FF6B6B] text-xs"></i>
                    <span className={labelClass}>Imagens exportadas</span>
                    <span className={'text-sm font-bold ' + (isDark ? 'text-white' : 'text-gray-900')}>{extras.shopify_stats.exports}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══ SEÇÃO 6: ÚLTIMOS PAGANTES ═══ */}
        {extras?.recent_payers && extras.recent_payers.length > 0 && (
          <div className={cardClass + ' p-5'}>
            <h3 className={'text-sm font-bold font-serif mb-3 flex items-center gap-2 ' + (isDark ? 'text-white' : 'text-gray-900')}>
              <i className="fas fa-dollar-sign text-green-400 text-xs"></i>Últimos Pagantes
            </h3>
            <div className="space-y-2">
              {extras.recent_payers.map((p, i) => (
                <div key={i} className={'flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:ring-1 hover:ring-[#FF6B6B]/30 transition-all ' + (isDark ? 'bg-neutral-800/50' : 'bg-gray-50')}
                  onClick={() => setSearchEmail(p.email)}
                >
                  <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-dollar-sign text-green-400 text-xs"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium truncate'}>{p.email}</p>
                    <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px]'}>
                      {new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {p.amount > 0 && <span className="text-green-400 ml-2">+{p.amount} créditos</span>}
                    </p>
                  </div>
                  {contactBtn(p)}
                  {planBadge(p.plan_id)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ SEÇÃO 6B: COMPRAS RECENTES (via RPC) ═══ */}
        {extras?.recent_purchases && extras.recent_purchases.length > 0 && (
          <div className={cardClass + ' p-5'}>
            <h2 className={'text-lg font-bold font-serif mb-4 ' + (isDark ? 'text-white' : 'text-gray-900')}>
              <i className="fas fa-receipt text-[#FF9F43] mr-2 text-sm"></i>Compras Recentes
              <span className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] font-normal ml-2'}>todos os usuários</span>
            </h2>
            <div className="space-y-2">
              {extras.recent_purchases.map(p => (
                <div key={p.id} className={'flex items-center justify-between py-2 px-3 rounded-lg ' + (isDark ? 'bg-neutral-800/50' : 'bg-gray-50')}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ' + (
                      p.amount > 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                    )}>
                      <i className={'fas text-xs ' + (p.amount > 0 ? 'fa-plus text-green-500' : 'fa-minus text-red-500')}></i>
                    </div>
                    <div className="min-w-0">
                      <p className={'text-xs font-medium truncate ' + (isDark ? 'text-white' : 'text-gray-900')}>{p.description || p.type}</p>
                      <p className={labelClass + ' truncate'}>{p.email || p.user_id?.slice(0, 8) + '...'} · {new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <span className={'text-sm font-bold flex-shrink-0 ml-3 ' + (p.amount > 0 ? 'text-green-500' : 'text-red-500')}>
                    {p.amount > 0 ? '+' : ''}{p.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ SEÇÃO 7: ÚLTIMAS GERAÇÕES (via RPC) ═══ */}
        {extras?.recent_generations && extras.recent_generations.length > 0 && (
          <div className={cardClass + ' p-5'}>
            <h2 className={'text-lg font-bold font-serif mb-4 ' + (isDark ? 'text-white' : 'text-gray-900')}>
              <i className="fas fa-images text-[#FF6B6B] mr-2 text-sm"></i>Últimas Gerações
              <span className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] font-normal ml-2'}>todos os usuários</span>
            </h2>
            <div className="space-y-2">
              {extras.recent_generations.map(g => {
                const urls: string[] = (() => {
                  if (!g.output_urls) return [];
                  if (typeof g.output_urls === 'string') try { return JSON.parse(g.output_urls); } catch { return []; }
                  return Array.isArray(g.output_urls) ? g.output_urls : [];
                })();
                const firstUrl = urls[0];
                const featureLabels: Record<string, string> = {
                  'product-studio': 'Product Studio',
                  'creative-still': 'Still Criativo',
                  'look-composer': 'Look Composer',
                  'provador': 'Provador',
                  'model': 'Modelo IA',
                };
                const statusColors: Record<string, string> = {
                  completed: 'text-green-500',
                  processing: 'text-yellow-500',
                  failed: 'text-red-500',
                };
                return (
                  <div key={g.id} className={'flex items-center gap-3 py-2 px-3 rounded-lg ' + (isDark ? 'bg-neutral-800/50' : 'bg-gray-50')}>
                    {firstUrl ? (
                      <img src={firstUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className={'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ' + (isDark ? 'bg-neutral-700' : 'bg-gray-200')}>
                        <i className={'fas fa-image text-xs ' + (isDark ? 'text-neutral-500' : 'text-gray-400')}></i>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={'text-xs font-medium ' + (isDark ? 'text-white' : 'text-gray-900')}>{featureLabels[g.type] || g.type}</span>
                        <span className={'text-[10px] font-medium ' + (statusColors[g.status] || labelClass)}>
                          {g.status === 'completed' ? 'OK' : g.status === 'processing' ? 'Gerando...' : g.status}
                        </span>
                        {urls.length > 1 && <span className={labelClass}>({urls.length} imgs)</span>}
                      </div>
                      <p className={labelClass}>{g.email || g.user_id?.slice(0, 8) + '...'} · {new Date(g.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ SEÇÃO 2: BUSCA DE USUÁRIO ═══ */}
        <div className={cardClass + ' p-5'}>
          <h2 className={'text-lg font-bold font-serif mb-4 ' + (isDark ? 'text-white' : 'text-gray-900')}>
            <i className="fas fa-search text-[#FF6B6B] mr-2 text-sm"></i>Buscar Usuário
          </h2>
          <div className="flex gap-2">
            <input
              type="email"
              value={searchEmail}
              onChange={e => setSearchEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchUser()}
              placeholder="Email do usuário..."
              className={inputClass + ' flex-1'}
            />
            <button
              onClick={searchUser}
              disabled={searchLoading || !searchEmail.trim()}
              className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] hover:shadow-lg transition-all disabled:opacity-50"
            >
              {searchLoading ? <i className="fas fa-spinner fa-spin"></i> : 'Buscar'}
            </button>
          </div>
          {searchError && <p className="text-red-400 text-sm mt-2">{searchError}</p>}
        </div>

        {/* ═══ RESULTADOS DO USUÁRIO ═══ */}
        {userData && (
          <div className="space-y-4">
            {/* User ID badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white text-xs font-bold">
                {userData.subscription?.email}
              </span>
              <span className={isDark ? 'text-neutral-500 text-xs' : 'text-gray-400 text-xs'}>
                ID: {userData.user_id}
              </span>
              <span className={isDark ? 'text-neutral-500 text-xs' : 'text-gray-400 text-xs'}>
                {userData.products_count} produtos
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ── Card: Assinatura ── */}
              <div className={cardClass + ' p-5'}>
                <h3 className={'text-sm font-bold font-serif mb-3 flex items-center gap-2 ' + (isDark ? 'text-white' : 'text-gray-900')}>
                  <i className="fas fa-credit-card text-[#FF6B6B] text-xs"></i>Assinatura
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className={labelClass}>Plano</p>
                    <div className="flex gap-2 mt-1">
                      <select
                        value={editPlan}
                        onChange={e => setEditPlan(e.target.value)}
                        className={inputClass + ' flex-1'}
                      >
                        <option value="free">Free</option>
                        <option value="starter">Starter</option>
                        <option value="pro">Pro</option>
                        <option value="premier">Premier</option>
                        <option value="test">Test</option>
                        <option value="master">Master</option>
                      </select>
                      <button
                        onClick={() => updateField('plan_id', editPlan)}
                        disabled={saving === 'plan_id' || editPlan === userData.subscription?.plan_id}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] disabled:opacity-30 transition-opacity"
                      >
                        {saving === 'plan_id' ? <i className="fas fa-spinner fa-spin"></i> : 'Salvar'}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className={labelClass}>Status</p>
                      <p className={valueClass}>{userData.subscription?.status || '—'}</p>
                    </div>
                    <div>
                      <p className={labelClass}>Período</p>
                      <p className={valueClass}>{userData.subscription?.billing_period || '—'}</p>
                    </div>
                    <div>
                      <p className={labelClass}>Início do período</p>
                      <p className={valueClass + ' !text-xs'}>{formatDate(userData.subscription?.current_period_start)}</p>
                    </div>
                    <div>
                      <p className={labelClass}>Fim do período</p>
                      <p className={valueClass + ' !text-xs'}>{formatDate(userData.subscription?.current_period_end)}</p>
                    </div>
                  </div>
                  {/* Desativar conta */}
                  {userData.subscription?.status !== 'cancelled' && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Desativar conta de ${userData.subscription?.email}?`)) {
                          updateField('status', 'cancelled');
                        }
                      }}
                      disabled={saving === 'status'}
                      className={'w-full py-2 rounded-xl text-xs font-medium border transition-colors ' + (isDark ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-red-200 text-red-500 hover:bg-red-50')}
                    >
                      {saving === 'status' ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-ban mr-1.5"></i>Desativar conta</>}
                    </button>
                  )}
                </div>
              </div>

              {/* ── Card: Créditos ── */}
              <div className={cardClass + ' p-5'}>
                <h3 className={'text-sm font-bold font-serif mb-3 flex items-center gap-2 ' + (isDark ? 'text-white' : 'text-gray-900')}>
                  <i className="fas fa-coins text-[#FF9F43] text-xs"></i>Créditos
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className={labelClass}>Saldo atual</p>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="number"
                        value={editCredits}
                        onChange={e => setEditCredits(e.target.value)}
                        className={inputClass + ' flex-1'}
                      />
                      <button
                        onClick={() => updateField('credits', editCredits)}
                        disabled={saving === 'credits' || editCredits === String(userData.credits?.balance ?? 0)}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] disabled:opacity-30 transition-opacity"
                      >
                        {saving === 'credits' ? <i className="fas fa-spinner fa-spin"></i> : 'Salvar'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className={labelClass}>Créditos de edição</p>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="number"
                        value={editEditBalance}
                        onChange={e => setEditEditBalance(e.target.value)}
                        className={inputClass + ' flex-1'}
                      />
                      <button
                        onClick={() => updateField('edit_balance', editEditBalance)}
                        disabled={saving === 'edit_balance' || editEditBalance === String(userData.credits?.edit_balance ?? 0)}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] disabled:opacity-30 transition-opacity"
                      >
                        {saving === 'edit_balance' ? <i className="fas fa-spinner fa-spin"></i> : 'Salvar'}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className={labelClass}>Lifetime comprados</p>
                      <p className={valueClass}>{userData.credits?.lifetime_purchased?.toLocaleString() ?? '—'}</p>
                    </div>
                    <div>
                      <p className={labelClass}>Lifetime usados</p>
                      <p className={valueClass}>{userData.credits?.lifetime_used?.toLocaleString() ?? '—'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Card: Empresa ── */}
              {userData.company && (
                <div className={cardClass + ' p-5'}>
                  <h3 className={'text-sm font-bold font-serif mb-3 flex items-center gap-2 ' + (isDark ? 'text-white' : 'text-gray-900')}>
                    <i className="fas fa-building text-[#FF6B6B] text-xs"></i>Empresa
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className={labelClass}>Nome</p>
                      <p className={valueClass}>{userData.company.company_name || '—'}</p>
                    </div>
                    <div>
                      <p className={labelClass}>Instagram</p>
                      <p className={valueClass}>{userData.company.instagram || '—'}</p>
                    </div>
                    <div>
                      <p className={labelClass}>Segmento</p>
                      <p className={valueClass}>{userData.company.segment || '—'}</p>
                    </div>
                    <div>
                      <p className={labelClass}>WhatsApp</p>
                      <p className={valueClass}>{userData.company.whatsapp || '—'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Card: Gerações Recentes ── */}
              <div className={cardClass + ' p-5'}>
                <h3 className={'text-sm font-bold font-serif mb-3 flex items-center gap-2 ' + (isDark ? 'text-white' : 'text-gray-900')}>
                  <i className="fas fa-images text-[#FF9F43] text-xs"></i>Gerações Recentes
                  <span className={isDark ? 'text-neutral-500 text-xs font-normal' : 'text-gray-400 text-xs font-normal'}>
                    ({userData.generations?.length || 0})
                  </span>
                </h3>
                {userData.generations?.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {userData.generations.map((g: any, i: number) => (
                      <div key={i} className={'flex items-center gap-3 p-2 rounded-xl ' + (isDark ? 'bg-neutral-800/50' : 'bg-gray-50')}>
                        {/* Thumbnail */}
                        {(() => {
                          const urls = typeof g.output_urls === 'string' ? JSON.parse(g.output_urls) : g.output_urls;
                          const thumb = Array.isArray(urls) ? urls[0] : null;
                          return thumb ? (
                            <img src={thumb} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className={'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ' + (isDark ? 'bg-neutral-700' : 'bg-gray-200')}>
                              <i className={'fas fa-image text-xs ' + (isDark ? 'text-neutral-500' : 'text-gray-400')}></i>
                            </div>
                          );
                        })()}
                        <div className="flex-1 min-w-0">
                          <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium truncate'}>{g.generation_type || g.type || '—'}</p>
                          <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px]'}>{formatDate(g.created_at)}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          g.status === 'completed' ? 'bg-green-500/15 text-green-400' :
                          g.status === 'failed' ? 'bg-red-500/15 text-red-400' :
                          'bg-yellow-500/15 text-yellow-400'
                        }`}>{g.status}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-xs'}>Nenhuma geração</p>
                )}
              </div>
            </div>

            {/* ── Card: Transações (full width) ── */}
            <div className={cardClass + ' p-5'}>
              <h3 className={'text-sm font-bold font-serif mb-3 flex items-center gap-2 ' + (isDark ? 'text-white' : 'text-gray-900')}>
                <i className="fas fa-receipt text-[#FF6B6B] text-xs"></i>Transações de Créditos
                <span className={isDark ? 'text-neutral-500 text-xs font-normal' : 'text-gray-400 text-xs font-normal'}>
                  ({userData.transactions?.length || 0})
                </span>
              </h3>
              {userData.transactions?.length > 0 ? (
                <div className="max-h-60 overflow-y-auto pr-1">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className={isDark ? 'text-neutral-400' : 'text-gray-500'}>
                        <th className="text-left py-1.5 font-medium">Tipo</th>
                        <th className="text-right py-1.5 font-medium">Qtd</th>
                        <th className="text-left py-1.5 font-medium pl-3">Descrição</th>
                        <th className="text-right py-1.5 font-medium">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userData.transactions.map((t: any, i: number) => (
                        <tr key={i} className={'border-t ' + (isDark ? 'border-neutral-800' : 'border-gray-100')}>
                          <td className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' py-1.5'}>{t.type}</td>
                          <td className={`text-right py-1.5 font-bold ${t.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {t.amount > 0 ? '+' : ''}{t.amount}
                          </td>
                          <td className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' py-1.5 pl-3 truncate max-w-[200px]'}>{t.description || '—'}</td>
                          <td className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-right py-1.5 text-[10px]'}>{formatDate(t.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-xs'}>Nenhuma transação</p>
              )}
            </div>
          </div>
        )}

        {/* ═══ SEÇÃO: BANNERS & COMUNICAÇÕES ═══ */}
        <div className={cardClass + ' p-5'}>
          <h2 className={'text-lg font-bold font-serif mb-4 ' + (isDark ? 'text-white' : 'text-gray-900')}>
            <i className="fas fa-bullhorn text-[#FF6B6B] mr-2 text-sm"></i>Banners & Comunicações
          </h2>
          <div className="space-y-4">

            {/* Banner Alta Demanda */}
            <div className={'p-4 rounded-xl border ' + (isDark ? 'border-neutral-800 bg-neutral-800/30' : 'border-gray-200 bg-gray-50')}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <i className="fas fa-clock text-amber-500 text-xs"></i>
                  </div>
                  <div>
                    <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>Alta Demanda</p>
                    <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px]'}>Banner amarelo no topo para todos os usuários</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const updated = { ...bannerDemand, active: !bannerDemand.active };
                    setBannerDemand(updated);
                    saveBanner('banner_demand', updated);
                  }}
                  disabled={bannerSaving === 'banner_demand'}
                  className={`relative w-12 h-7 rounded-full transition-colors ${bannerDemand.active ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]' : isDark ? 'bg-neutral-700' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${bannerDemand.active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <input
                type="text"
                value={bannerDemand.message}
                onChange={e => setBannerDemand(v => ({ ...v, message: e.target.value }))}
                onBlur={() => saveBanner('banner_demand', bannerDemand)}
                placeholder="Mensagem do banner..."
                className={inputClass + ' w-full text-xs'}
              />
            </div>

            {/* Banner Manutenção */}
            <div className={'p-4 rounded-xl border ' + (isDark ? 'border-neutral-800 bg-neutral-800/30' : 'border-gray-200 bg-gray-50')}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <i className="fas fa-wrench text-blue-500 text-xs"></i>
                  </div>
                  <div>
                    <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>Servidores (Manutenção)</p>
                    <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px]'}>Banner azul polido sobre manutenção</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const updated = { ...bannerMaintenance, active: !bannerMaintenance.active };
                    setBannerMaintenance(updated);
                    saveBanner('banner_maintenance', updated);
                  }}
                  disabled={bannerSaving === 'banner_maintenance'}
                  className={`relative w-12 h-7 rounded-full transition-colors ${bannerMaintenance.active ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]' : isDark ? 'bg-neutral-700' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${bannerMaintenance.active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <textarea
                value={bannerMaintenance.message}
                onChange={e => setBannerMaintenance(v => ({ ...v, message: e.target.value }))}
                onBlur={() => saveBanner('banner_maintenance', bannerMaintenance)}
                placeholder="Mensagem polida sobre manutenção..."
                rows={2}
                className={inputClass + ' w-full text-xs resize-none'}
              />
            </div>

            {/* Banner Promo */}
            <div className={'p-4 rounded-xl border ' + (isDark ? 'border-neutral-800 bg-neutral-800/30' : 'border-gray-200 bg-gray-50')}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] flex items-center justify-center">
                    <i className="fas fa-bullhorn text-white text-xs"></i>
                  </div>
                  <div>
                    <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>Promoção</p>
                    <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px]'}>Banner coral com texto e link customizáveis</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const updated = { ...bannerPromo, active: !bannerPromo.active };
                    setBannerPromo(updated);
                    saveBanner('banner_promo', updated);
                  }}
                  disabled={bannerSaving === 'banner_promo'}
                  className={`relative w-12 h-7 rounded-full transition-colors ${bannerPromo.active ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]' : isDark ? 'bg-neutral-700' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${bannerPromo.active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={bannerPromo.message}
                  onChange={e => setBannerPromo(v => ({ ...v, message: e.target.value }))}
                  onBlur={() => saveBanner('banner_promo', bannerPromo)}
                  placeholder="Texto da promoção..."
                  className={inputClass + ' w-full text-xs'}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="url"
                    value={bannerPromo.link || ''}
                    onChange={e => setBannerPromo(v => ({ ...v, link: e.target.value }))}
                    onBlur={() => saveBanner('banner_promo', bannerPromo)}
                    placeholder="Link (https://...)"
                    className={inputClass + ' w-full text-xs'}
                  />
                  <input
                    type="text"
                    value={bannerPromo.linkLabel || ''}
                    onChange={e => setBannerPromo(v => ({ ...v, linkLabel: e.target.value }))}
                    onBlur={() => saveBanner('banner_promo', bannerPromo)}
                    placeholder="Texto do botão"
                    className={inputClass + ' w-full text-xs'}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ SEÇÃO: FERRAMENTAS DE DEBUG ═══ */}
        <div className={cardClass + ' p-5'}>
          <h2 className={'text-lg font-bold font-serif mb-4 ' + (isDark ? 'text-white' : 'text-gray-900')}>
            <i className="fas fa-flask text-[#FF9F43] mr-2 text-sm"></i>Debug & Testes
          </h2>
          <div className="space-y-3">
            {/* Toggle: SlowServerBanner */}
            <div className="flex items-center justify-between">
              <div>
                <p className={isDark ? 'text-white text-sm font-medium' : 'text-gray-900 text-sm font-medium'}>
                  Banner "Alta demanda"
                </p>
                <p className={isDark ? 'text-neutral-500 text-xs' : 'text-gray-400 text-xs'}>
                  Exibe o card de alta demanda em 10s (em vez de 8 min)
                </p>
              </div>
              <button
                onClick={() => {
                  if (debugSlowBanner) {
                    localStorage.removeItem('vizzu-debug-slow');
                    setDebugSlowBanner(false);
                    showToast('Debug banner desativado', 'info');
                  } else {
                    localStorage.setItem('vizzu-debug-slow', '10000');
                    setDebugSlowBanner(true);
                    showToast('Debug banner ativado — aparecerá em 10s na próxima geração', 'info');
                  }
                }}
                className={`relative w-12 h-7 rounded-full transition-colors ${debugSlowBanner ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]' : isDark ? 'bg-neutral-700' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${debugSlowBanner ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Empty state */}
        {!userData && !searchLoading && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#FF6B6B]/10 to-[#FF9F43]/10 flex items-center justify-center">
              <i className={'fas fa-user-search text-3xl ' + (isDark ? 'text-neutral-600' : 'text-gray-300')}></i>
            </div>
            <p className={isDark ? 'text-neutral-500 text-sm' : 'text-gray-400 text-sm'}>Busque um usuário pelo email para gerenciar</p>
          </div>
        )}
      </div>
    </div>
  );
}
