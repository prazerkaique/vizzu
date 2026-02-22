import React from 'react';
import { useUI } from '../../contexts/UIContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePartnerProgram } from '../../hooks/usePartnerProgram';

export const PartnerDashboardCard: React.FC = () => {
  const { theme, navigateTo, setSettingsTab } = useUI();
  const { user } = useAuth();
  const { hasAcceptedTerms, stats } = usePartnerProgram(user?.id);

  const handleClick = () => {
    navigateTo('settings');
    setSettingsTab('partners');
  };

  return (
    <div className={'rounded-2xl p-5 relative overflow-hidden flex items-center min-h-[120px] ' + (theme !== 'light' ? 'bg-neutral-900/80 border border-neutral-800' : 'bg-[#efebe6] border border-[#e5e6ea]')}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#FF6B6B]/10 to-[#FF9F43]/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
      <div className="relative flex flex-col w-full">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]">
            <i className="fas fa-handshake text-white"></i>
          </div>
          <div className="flex-1 min-w-0">
            <p className={(theme !== 'light' ? 'text-neutral-400' : 'text-[#373632]/60') + ' text-[10px] uppercase tracking-wide'}>Parceiros</p>
            {hasAcceptedTerms ? (
              <p className={(theme !== 'light' ? 'text-white' : 'text-[#373632]') + ' text-xl font-bold'}>{stats.creditsEarned} <span className="text-xs font-normal opacity-60">créditos ganhos</span></p>
            ) : (
              <p className={(theme !== 'light' ? 'text-white' : 'text-[#373632]') + ' text-sm font-bold'}>Ganhe até <span className="text-[#FF6B6B]">400</span> créditos</p>
            )}
          </div>
        </div>
        {hasAcceptedTerms && (
          <p className={(theme !== 'light' ? 'text-neutral-400' : 'text-[#373632]/60') + ' text-xs mb-2'}>{stats.totalReferrals} indicação{stats.totalReferrals !== 1 ? 'ões' : ''}</p>
        )}
        {!hasAcceptedTerms && (
          <p className={(theme !== 'light' ? 'text-neutral-400' : 'text-[#373632]/60') + ' text-xs mb-2'}>Indique amigos e ganhe créditos grátis</p>
        )}
        <button
          onClick={handleClick}
          className={'w-full py-2 rounded-lg font-medium text-xs transition-all flex items-center justify-center gap-1 ' + (theme !== 'light' ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20' : 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:opacity-90')}
        >
          {hasAcceptedTerms ? 'Ver detalhes' : 'Começar a indicar'} <i className="fas fa-arrow-right text-[10px]"></i>
        </button>
      </div>
    </div>
  );
};
