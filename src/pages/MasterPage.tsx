import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { useUI } from '../contexts/UIContext';

const SESSION_KEY = 'vizzu_master_unlocked';

interface Metrics {
  total_users: number;
  generations_today: number;
  total_credits: number;
  plans: { plan: string; count: number }[];
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
  const [isUnlocked, setIsUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === 'true');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Stored password for RPCs
  const [storedPassword, setStoredPassword] = useState(() => sessionStorage.getItem('vizzu_master_pw') || '');

  // Metrics
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

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

  // ── Auth ──
  const handleUnlock = async () => {
    if (!password.trim()) return;
    setAuthLoading(true);
    setAuthError('');
    try {
      const { data, error } = await supabase.rpc('master_verify_password', { p_password: password });
      if (error) throw error;
      if (data === true) {
        sessionStorage.setItem(SESSION_KEY, 'true');
        sessionStorage.setItem('vizzu_master_pw', password);
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

  useEffect(() => {
    if (isUnlocked && storedPassword) loadMetrics();
  }, [isUnlocked, storedPassword, loadMetrics]);

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
  const updateField = async (field: string, value: string) => {
    if (!userData || !storedPassword) return;
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
            onClick={loadMetrics}
            disabled={metricsLoading}
            className={'px-3 py-2 rounded-xl text-xs font-medium transition-all ' + (isDark ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
          >
            <i className={'fas fa-sync-alt mr-1.5 ' + (metricsLoading ? 'fa-spin' : '')}></i>Atualizar
          </button>
        </div>

        {/* ═══ SEÇÃO 1: MÉTRICAS ═══ */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={cardClass + ' p-4'}>
              <p className={labelClass}>Usuários totais</p>
              <p className={'text-2xl font-bold mt-1 ' + (isDark ? 'text-white' : 'text-gray-900')}>{metrics.total_users}</p>
            </div>
            <div className={cardClass + ' p-4'}>
              <p className={labelClass}>Gerações hoje</p>
              <p className={'text-2xl font-bold mt-1 ' + (isDark ? 'text-white' : 'text-gray-900')}>{metrics.generations_today}</p>
            </div>
            <div className={cardClass + ' p-4'}>
              <p className={labelClass}>Créditos em circulação</p>
              <p className={'text-2xl font-bold mt-1 ' + (isDark ? 'text-white' : 'text-gray-900')}>{Number(metrics.total_credits).toLocaleString()}</p>
            </div>
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
