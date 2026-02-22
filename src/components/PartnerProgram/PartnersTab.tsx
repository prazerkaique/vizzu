import React, { useState } from 'react';
import { useUI } from '../../contexts/UIContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePartnerProgram } from '../../hooks/usePartnerProgram';
import { PartnerTermsModal } from '../PartnerTermsModal';

const REWARD_TABLE = [
  { plan: 'Basic', annual: 40, monthly: 12, friend: 10 },
  { plan: 'Pro', annual: 100, monthly: 30, friend: 10 },
  { plan: 'Premier', annual: 200, monthly: 60, friend: 10 },
  { plan: 'Master', annual: 400, monthly: 120, friend: 10 },
];

const STEPS_PRE = [
  { num: 1, icon: 'fa-share-nodes', title: 'Compartilhe seu link', desc: 'Envie para amigos, colegas e parceiros' },
  { num: 2, icon: 'fa-user-check', title: 'Amigo assina um plano', desc: 'Qualquer plano pago — mensal ou anual' },
  { num: 3, icon: 'fa-gift', title: 'Vocês dois ganham', desc: 'Seu amigo ganha 10 créditos e você ganha até 400' },
];

const STEPS_POST = [
  { icon: 'fa-share-nodes', title: 'Compartilhe', desc: 'Envie seu link para amigos e parceiros' },
  { icon: 'fa-user-check', title: 'Amigo assina', desc: 'Qualquer plano pago vale' },
  { icon: 'fa-gift', title: 'Ganhem créditos', desc: 'Após 7 dias, créditos liberados' },
];

const FAQ = [
  { q: 'Preciso estar em um plano pago para participar?', a: 'Não. Qualquer usuário com conta ativa pode participar do programa, mesmo no plano gratuito.' },
  { q: 'O indicado precisa assinar pelo meu link?', a: 'Sim. O cadastro precisa ser feito através do seu link de indicação para que a recomendação seja rastreada.' },
  { q: 'Quanto tempo demora para receber os créditos?', a: 'Os créditos ficam em holdback por 7 dias após a assinatura do indicado (respeitando o direito de arrependimento). Depois disso, ficam disponíveis para resgate.' },
  { q: 'Posso indicar quantas pessoas quiser?', a: 'Sim! Não há limite de indicações. Quanto mais pessoas assinarem pelo seu link, mais créditos você ganha.' },
  { q: 'O que acontece se o indicado cancelar?', a: 'Se o cancelamento ocorrer dentro dos 7 dias de holdback, a recompensa é cancelada automaticamente. Após os 7 dias, os créditos já são seus.' },
];

export const PartnersTab: React.FC = () => {
  const { theme, isV2 } = useUI();
  const { user } = useAuth();
  const {
    referralCode,
    hasAcceptedTerms,
    stats,
    referrals,
    payouts,
    isLoading,
    isClaimLoading,
    acceptTerms,
    claimCredits,
  } = usePartnerProgram(user?.id);

  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showTermsReadOnly, setShowTermsReadOnly] = useState(false);
  const [copied, setCopied] = useState(false);
  const [claimResult, setClaimResult] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const cardClass = (theme !== 'light' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-xl border p-5';
  const headingClass = (theme !== 'light' ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm';
  const subClass = (theme !== 'light' ? 'text-neutral-400' : 'text-gray-500') + ' text-xs';
  const mutedClass = theme !== 'light' ? 'text-neutral-500' : 'text-gray-400';

  const referralLink = referralCode ? `https://vizzu.pro/?ref=${referralCode}` : '';

  const handleCopyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = referralLink;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsApp = () => {
    if (!referralLink) return;
    const text = encodeURIComponent(`Ei! Conhece o Vizzu? Gera fotos profissionais com IA. Use meu link e ganhe 10 créditos grátis: ${referralLink}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleClaim = async () => {
    const result = await claimCredits();
    if (result.success) {
      setClaimResult({ message: `${result.creditsClaimed} créditos resgatados com sucesso!`, type: 'success' });
    } else {
      setClaimResult({ message: result.error || 'Erro ao resgatar créditos', type: 'error' });
    }
    setTimeout(() => setClaimResult(null), 4000);
  };

  const handleAcceptTerms = async () => {
    const ok = await acceptTerms();
    if (ok) setShowTermsModal(false);
    return ok;
  };

  // Estado de loading
  if (hasAcceptedTerms === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-[#FF6B6B] rounded-full animate-spin"></div>
      </div>
    );
  }

  // =============================================
  // TELA PRÉ-ACEITE — Hero comercial
  // =============================================
  if (!hasAcceptedTerms) {
    return (
      <div className="space-y-5">
        {/* Hero banner */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] p-8 md:p-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
          <div className="relative text-center max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/20 backdrop-blur-sm mx-auto mb-4">
              <i className="fas fa-gift text-2xl text-white"></i>
            </div>
            <h2 className={(isV2 ? 'text-3xl md:text-4xl font-extrabold tracking-tight' : 'text-2xl md:text-3xl font-bold') + ' text-white mb-3 leading-tight'}>
              Ganhe até 400 créditos por indicação
            </h2>
            <p className="text-white/80 text-sm md:text-base leading-relaxed">
              Indique amigos para o Vizzu. Quando eles assinarem, vocês dois ganham créditos grátis.
            </p>
          </div>
        </div>

        {/* 3 steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STEPS_PRE.map(step => (
            <div key={step.num} className={cardClass + ' flex items-start gap-4'}>
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#FF6B6B]/10 to-[#FF9F43]/10">
                  <i className={'fas ' + step.icon + ' text-lg text-[#FF6B6B]'}></i>
                </div>
                <span className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white">
                  {step.num}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-1'}>{step.title}</p>
                <p className={subClass + ' leading-relaxed'}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabela de recompensas */}
        <div className={cardClass}>
          <h3 className={headingClass + ' mb-1'}>Quanto você ganha</h3>
          <p className={subClass + ' mb-4'}>Créditos por indicação que assinar um plano</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={'border-b ' + (theme !== 'light' ? 'border-neutral-800' : 'border-gray-100')}>
                  <th className={'text-left py-2.5 font-semibold ' + (theme !== 'light' ? 'text-neutral-400' : 'text-gray-500')}>Plano</th>
                  <th className={'text-center py-2.5 font-semibold ' + (theme !== 'light' ? 'text-neutral-400' : 'text-gray-500')}>Anual</th>
                  <th className={'text-center py-2.5 font-semibold ' + (theme !== 'light' ? 'text-neutral-400' : 'text-gray-500')}>Mensal</th>
                  <th className={'text-center py-2.5 font-semibold ' + (theme !== 'light' ? 'text-neutral-400' : 'text-gray-500')}>Amigo ganha</th>
                </tr>
              </thead>
              <tbody>
                {REWARD_TABLE.map(r => (
                  <tr key={r.plan} className={'border-b last:border-0 ' + (theme !== 'light' ? 'border-neutral-800' : 'border-gray-50')}>
                    <td className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' py-3 font-medium'}>{r.plan}</td>
                    <td className="text-center py-3">
                      <span className="inline-flex items-center gap-1 text-[#FF6B6B] font-bold text-sm">
                        {r.annual}
                      </span>
                    </td>
                    <td className={(theme !== 'light' ? 'text-neutral-300' : 'text-gray-600') + ' text-center py-3 font-medium'}>{r.monthly}</td>
                    <td className={(theme !== 'light' ? 'text-neutral-400' : 'text-gray-500') + ' text-center py-3'}>{r.friend}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={mutedClass + ' text-[10px] mt-2'}>Mensal = 30% do anual. Pagamento único por indicação.</p>
          </div>
        </div>

        {/* CTA grande */}
        <button
          onClick={() => setShowTermsModal(true)}
          className="w-full py-4 rounded-xl text-white font-semibold text-base bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] hover:shadow-lg hover:shadow-[#FF6B6B]/20 hover:scale-[1.005] active:scale-[0.995] transition-all"
        >
          <i className="fas fa-rocket mr-2"></i>
          Quero participar
        </button>

        <PartnerTermsModal
          isOpen={showTermsModal}
          onAccept={handleAcceptTerms}
          isLoading={isLoading}
          onClose={() => setShowTermsModal(false)}
        />
      </div>
    );
  }

  // =============================================
  // TELA PÓS-ACEITE — Dashboard
  // =============================================
  return (
    <div className="space-y-4">
      {/* Link de indicação — destaque */}
      <div className={cardClass}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]">
            <i className="fas fa-link text-white text-xs"></i>
          </div>
          <div>
            <h3 className={headingClass}>Compartilhe e ganhe</h3>
            <p className={subClass}>Cada pessoa que assinar pelo seu link gera créditos para vocês dois</p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <div className={'flex-1 rounded-lg px-3 py-2.5 text-sm font-mono truncate ' + (theme !== 'light' ? 'bg-neutral-800 text-neutral-300' : 'bg-gray-100 text-gray-700')}>
            {referralLink || 'Carregando...'}
          </div>
          <button
            onClick={handleCopyLink}
            disabled={!referralCode}
            className={'px-4 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ' + (
              copied
                ? 'bg-green-500 text-white'
                : theme !== 'light'
                  ? 'bg-neutral-700 text-white hover:bg-neutral-600'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
            )}
          >
            <i className={'fas ' + (copied ? 'fa-check' : 'fa-copy') + ' text-[10px]'}></i>
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
          <button
            onClick={handleWhatsApp}
            disabled={!referralCode}
            className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-green-500 text-white hover:bg-green-600 transition-all flex items-center gap-1.5"
          >
            <i className="fab fa-whatsapp text-sm"></i>
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Stats — 4 cards com labels humanos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Amigos indicados', value: stats.totalReferrals, icon: 'fa-users', color: 'text-blue-500' },
          { label: 'Já assinaram', value: stats.convertedReferrals, icon: 'fa-check-circle', color: 'text-green-500' },
          { label: 'Créditos acumulados', value: stats.creditsEarned, icon: 'fa-star', color: 'text-yellow-500' },
          { label: 'Prontos para resgate', value: stats.creditsAvailable, icon: 'fa-gift', color: 'text-[#FF6B6B]' },
        ].map(s => (
          <div key={s.label} className={cardClass}>
            <div className="flex items-center gap-2 mb-1">
              <i className={`fas ${s.icon} text-[10px] ${s.color}`}></i>
              <p className={subClass}>{s.label}</p>
            </div>
            <p className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' text-2xl font-bold'}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabela "Quanto você ganha" — subida para 3a posição */}
      <div className={cardClass}>
        <h3 className={headingClass + ' mb-3'}>Quanto você ganha</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className={'border-b ' + (theme !== 'light' ? 'border-neutral-800' : 'border-gray-100')}>
                <th className={'text-left py-2 font-semibold ' + (theme !== 'light' ? 'text-neutral-400' : 'text-gray-500')}>Plano do indicado</th>
                <th className={'text-right py-2 font-semibold ' + (theme !== 'light' ? 'text-neutral-400' : 'text-gray-500')}>Anual</th>
                <th className={'text-right py-2 font-semibold ' + (theme !== 'light' ? 'text-neutral-400' : 'text-gray-500')}>Mensal</th>
                <th className={'text-right py-2 font-semibold ' + (theme !== 'light' ? 'text-neutral-400' : 'text-gray-500')}>Amigo ganha</th>
              </tr>
            </thead>
            <tbody>
              {REWARD_TABLE.map(r => (
                <tr key={r.plan} className={'border-b last:border-0 ' + (theme !== 'light' ? 'border-neutral-800' : 'border-gray-50')}>
                  <td className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' py-2.5 font-medium'}>{r.plan}</td>
                  <td className="text-right py-2.5">
                    <span className="inline-flex items-center gap-1 text-[#FF6B6B] font-semibold">
                      <i className="fas fa-star text-[8px]"></i>{r.annual}
                    </span>
                  </td>
                  <td className={(theme !== 'light' ? 'text-neutral-300' : 'text-gray-700') + ' text-right py-2.5 font-medium'}>{r.monthly}</td>
                  <td className={(theme !== 'light' ? 'text-neutral-400' : 'text-gray-500') + ' text-right py-2.5'}>{r.friend}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={mutedClass + ' text-[10px] mt-2'}>Mensal = 30% do valor anual. Pagamento único por indicação.</p>
        </div>
      </div>

      {/* Como funciona — 3 steps (textos curtos) */}
      <div className={cardClass}>
        <h3 className={headingClass + ' mb-4'}>Como funciona</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STEPS_POST.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ' + (theme !== 'light' ? 'bg-neutral-800' : 'bg-gray-100')}>
                <div className="relative">
                  <i className={'fas ' + step.icon + ' text-sm text-[#FF6B6B]'}></i>
                  <span className={'absolute -top-2 -right-2 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ' + (theme !== 'light' ? 'bg-neutral-700 text-white' : 'bg-gray-200 text-gray-600')}>
                    {i + 1}
                  </span>
                </div>
              </div>
              <div>
                <p className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' text-xs font-semibold mb-0.5'}>{step.title}</p>
                <p className={subClass}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lista de indicações */}
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={headingClass}>Suas indicações</h3>
          <span className={mutedClass + ' text-[10px]'}>{referrals.length} total</span>
        </div>
        {referrals.length === 0 ? (
          <div className={'text-center py-8 rounded-lg ' + (theme !== 'light' ? 'bg-neutral-800' : 'bg-gray-50')}>
            <i className={'fas fa-user-friends text-2xl mb-2 ' + mutedClass}></i>
            <p className={subClass}>Nenhuma indicação ainda — compartilhe seu link e comece a ganhar!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {referrals.map(r => (
              <div key={r.id} className={'flex items-center justify-between rounded-lg p-3 ' + (theme !== 'light' ? 'bg-neutral-800' : 'bg-gray-50')}>
                <div className="flex items-center gap-3">
                  <div className={'w-8 h-8 rounded-full flex items-center justify-center ' + (theme !== 'light' ? 'bg-neutral-700' : 'bg-gray-200')}>
                    <i className={'fas fa-user text-[10px] ' + mutedClass}></i>
                  </div>
                  <div>
                    <p className={(theme !== 'light' ? 'text-neutral-300' : 'text-gray-600') + ' text-xs'}>{r.referred_email}</p>
                    <p className={mutedClass + ' text-[10px]'}>{new Date(r.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {r.plan_id && <span className={mutedClass + ' text-[10px]'}>{r.plan_id}</span>}
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold ${
                    r.status === 'converted'
                      ? 'bg-green-500/10 text-green-500'
                      : r.status === 'cancelled'
                        ? 'bg-red-500/10 text-red-500'
                        : 'bg-yellow-500/10 text-yellow-600'
                  }`}>
                    <i className={`fas ${r.status === 'converted' ? 'fa-check' : r.status === 'cancelled' ? 'fa-times' : 'fa-clock'} text-[8px]`}></i>
                    {r.status === 'converted' ? 'Convertido' : r.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                  </span>
                  {r.status === 'converted' && (
                    <span className="text-[#FF6B6B] text-xs font-semibold">+{r.credits_amount}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cronograma de payouts */}
      {payouts.length > 0 && (
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={headingClass}>Cronograma de resgates</h3>
            {stats.creditsAvailable > 0 && (
              <button
                onClick={handleClaim}
                disabled={isClaimLoading}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:shadow-lg transition-all disabled:opacity-50"
              >
                {isClaimLoading ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Resgatando...
                  </span>
                ) : (
                  <>Resgatar {stats.creditsAvailable} créditos</>
                )}
              </button>
            )}
          </div>

          {claimResult && (
            <div className={`rounded-lg px-3 py-2 text-xs font-medium mb-3 ${claimResult.type === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'}`}>
              <i className={`fas ${claimResult.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-1.5`}></i>
              {claimResult.message}
            </div>
          )}

          <div className="space-y-2">
            {payouts.map(p => (
              <div key={p.id} className={'flex items-center justify-between rounded-lg p-3 ' + (theme !== 'light' ? 'bg-neutral-800' : 'bg-gray-50')}>
                <div>
                  <p className={(theme !== 'light' ? 'text-white' : 'text-gray-900') + ' text-xs font-semibold'}>{p.credits} créditos</p>
                  <p className={mutedClass + ' text-[10px]'}>
                    {p.status === 'claimed'
                      ? `Resgatado em ${new Date(p.claimed_at!).toLocaleDateString('pt-BR')}`
                      : p.status === 'available' || new Date(p.available_at) <= new Date()
                        ? 'Disponível para resgate'
                        : `Disponível em ${new Date(p.available_at).toLocaleDateString('pt-BR')}`
                    }
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold ${
                  p.status === 'claimed'
                    ? 'bg-blue-500/10 text-blue-500'
                    : p.status === 'available' || (p.status === 'pending' && new Date(p.available_at) <= new Date())
                      ? 'bg-green-500/10 text-green-500'
                      : p.status === 'cancelled'
                        ? 'bg-red-500/10 text-red-500'
                        : 'bg-yellow-500/10 text-yellow-600'
                }`}>
                  {p.status === 'claimed' ? 'Resgatado' : p.status === 'available' || (p.status === 'pending' && new Date(p.available_at) <= new Date()) ? 'Disponível' : p.status === 'cancelled' ? 'Cancelado' : 'Em holdback'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAQ */}
      <div className={cardClass}>
        <h3 className={headingClass + ' mb-3'}>Perguntas frequentes</h3>
        <div className="space-y-2">
          {FAQ.map((faq, i) => (
            <details key={i} className={'group rounded-xl border p-3 ' + (theme !== 'light' ? 'border-neutral-800' : 'border-gray-100')}>
              <summary className={'cursor-pointer list-none flex items-center justify-between text-xs font-medium ' + (theme !== 'light' ? 'text-neutral-300' : 'text-gray-700')}>
                {faq.q}
                <i className="fas fa-chevron-down text-[8px] opacity-40 group-open:rotate-180 transition-transform"></i>
              </summary>
              <p className={subClass + ' mt-2 leading-relaxed'}>{faq.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Link termos */}
      <div className="text-center pb-2">
        <button onClick={() => setShowTermsReadOnly(true)} className={mutedClass + ' text-[10px] hover:underline'}>
          Ver termos do programa
        </button>
      </div>

      <PartnerTermsModal
        isOpen={showTermsReadOnly}
        onAccept={async () => true}
        isLoading={false}
        readOnly
        onClose={() => setShowTermsReadOnly(false)}
      />
    </div>
  );
};
