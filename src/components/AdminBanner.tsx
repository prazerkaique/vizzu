import React, { useState } from 'react';
import type { BannerConfig } from '../hooks/useAdminBanners';

interface AdminBannerProps {
  demandBanner: BannerConfig;
  maintenanceBanner: BannerConfig;
  promoBanner: BannerConfig;
}

function BannerItem({ type, config, onDismiss }: {
  type: 'demand' | 'maintenance' | 'promo';
  config: BannerConfig;
  onDismiss: () => void;
}) {
  if (!config.active || !config.message) return null;

  const styles = {
    demand: {
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-800',
      icon: 'fas fa-clock',
      iconBg: 'bg-amber-100 text-amber-600',
    },
    maintenance: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-800',
      icon: 'fas fa-wrench',
      iconBg: 'bg-blue-100 text-blue-600',
    },
    promo: {
      bg: 'bg-gradient-to-r from-[#FF6B6B]/10 to-[#FF9F43]/10 border-[#FF6B6B]/20',
      text: 'text-gray-800',
      icon: 'fas fa-bullhorn',
      iconBg: 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white',
    },
  };

  const s = styles[type];

  return (
    <div className={`${s.bg} border-b px-4 py-2.5 flex items-center gap-3`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${s.iconBg}`}>
        <i className={`${s.icon} text-xs`}></i>
      </div>
      <p className={`${s.text} text-xs font-medium flex-1`}>
        {config.message}
      </p>
      {type === 'promo' && config.link && config.linkLabel && (
        <a
          href={config.link}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] hover:opacity-90 transition-opacity flex-shrink-0"
        >
          {config.linkLabel}
        </a>
      )}
      <button
        onClick={onDismiss}
        className={`${s.text} opacity-50 hover:opacity-100 transition-opacity flex-shrink-0 p-1`}
        title="Fechar"
      >
        <i className="fas fa-times text-xs"></i>
      </button>
    </div>
  );
}

export function AdminBanner({ demandBanner, maintenanceBanner, promoBanner }: AdminBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const dismiss = (key: string) => setDismissed(prev => new Set(prev).add(key));

  return (
    <>
      {!dismissed.has('maintenance') && (
        <BannerItem type="maintenance" config={maintenanceBanner} onDismiss={() => dismiss('maintenance')} />
      )}
      {!dismissed.has('demand') && (
        <BannerItem type="demand" config={demandBanner} onDismiss={() => dismiss('demand')} />
      )}
      {!dismissed.has('promo') && (
        <BannerItem type="promo" config={promoBanner} onDismiss={() => dismiss('promo')} />
      )}
    </>
  );
}
