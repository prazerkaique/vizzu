import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

export interface BannerConfig {
  active: boolean;
  message: string;
  link?: string;
  linkLabel?: string;
}

const DEFAULT_DEMAND: BannerConfig = { active: false, message: 'Nossos servidores estão com alta demanda. As gerações podem demorar mais que o esperado.' };
const DEFAULT_MAINTENANCE: BannerConfig = { active: false, message: 'Estamos realizando melhorias nos nossos servidores para oferecer ainda mais qualidade. Algumas funcionalidades podem estar temporariamente indisponíveis.' };
const DEFAULT_PROMO: BannerConfig = { active: false, message: '', link: '', linkLabel: '' };

export function useAdminBanners() {
  const [demandBanner, setDemandBanner] = useState<BannerConfig>(DEFAULT_DEMAND);
  const [maintenanceBanner, setMaintenanceBanner] = useState<BannerConfig>(DEFAULT_MAINTENANCE);
  const [promoBanner, setPromoBanner] = useState<BannerConfig>(DEFAULT_PROMO);
  const [loading, setLoading] = useState(true);

  const fetchBanners = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('app_config')
        .select('key, value')
        .in('key', ['banner_demand', 'banner_maintenance', 'banner_promo']);

      if (data) {
        for (const row of data) {
          const val = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
          if (row.key === 'banner_demand') setDemandBanner({ ...DEFAULT_DEMAND, ...val });
          if (row.key === 'banner_maintenance') setMaintenanceBanner({ ...DEFAULT_MAINTENANCE, ...val });
          if (row.key === 'banner_promo') setPromoBanner({ ...DEFAULT_PROMO, ...val });
        }
      }
    } catch {
      // silent — banners são opcionais
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
    const interval = setInterval(fetchBanners, 60_000);
    return () => clearInterval(interval);
  }, [fetchBanners]);

  return { demandBanner, maintenanceBanner, promoBanner, loading, refetch: fetchBanners };
}
