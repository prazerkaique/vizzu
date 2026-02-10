// ═══════════════════════════════════════════════════════════════
// VIZZU - Product Hub Modal (Hub 360° do Produto)
// Modal unificado que mostra TODAS as gerações de um produto
// em todas as features + atalhos rápidos para criar
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, CreativeStillGeneration } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { OptimizedImage } from '../OptimizedImage';
import { useImageViewer } from '../ImageViewer';
import DownloadModal, { type DownloadImageGroup } from './DownloadModal';
import type { DownloadableImage } from '../../utils/downloadSizes';

// ── Types ──

interface Tab {
  id: string;
  label: string;
  icon: string;
  count: number;
}

export interface ProductHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  theme: 'dark' | 'light';
  userId?: string;
  navigateTo: (page: string) => void;
  setProductForCreation: (p: Product | null) => void;
  onEditProduct?: (p: Product) => void;
  /** Aba padrão para abrir (ex: 'cs' para Still Criativo) */
  defaultTab?: string;
}

// ── Helpers ──

function getAngleLabel(angle: string): string {
  const labels: Record<string, string> = {
    front: 'Frente',
    back: 'Costas',
    'side-left': 'Lat. Esq.',
    'side-right': 'Lat. Dir.',
    '45-left': '45° Esq.',
    '45-right': '45° Dir.',
    top: 'Superior',
    detail: 'Detalhe',
    front_detail: 'Det. Frente',
    back_detail: 'Det. Costas',
    folded: 'Dobrada',
  };
  return labels[angle] || angle;
}

function getCSVariationUrls(gen: CreativeStillGeneration): string[] {
  if (gen.variation_urls && gen.variation_urls.length > 0) return gen.variation_urls;
  return [gen.variation_1_url, gen.variation_2_url].filter(Boolean) as string[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: undefined,
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Component ──

export const ProductHubModal: React.FC<ProductHubModalProps> = ({
  isOpen,
  onClose,
  product,
  theme,
  userId,
  navigateTo,
  setProductForCreation,
  onEditProduct,
  defaultTab,
}) => {
  const isDark = theme === 'dark';
  const { openViewer } = useImageViewer();

  // CS data (não está no Product, precisa buscar)
  const [csGenerations, setCsGenerations] = useState<CreativeStillGeneration[]>([]);
  const [isLoadingCS, setIsLoadingCS] = useState(true);

  useEffect(() => {
    if (!isOpen || !product?.id || !userId) {
      setCsGenerations([]);
      setIsLoadingCS(false);
      return;
    }
    setIsLoadingCS(true);
    supabase
      .from('creative_still_generations')
      .select('*')
      .eq('product_id', product.id)
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setCsGenerations((data || []) as CreativeStillGeneration[]);
        setIsLoadingCS(false);
      });
  }, [isOpen, product?.id, userId]);

  // ── Contagens por feature ──
  const psSessions = product.generatedImages?.productStudio || [];
  const psCount = psSessions.reduce((sum, s) => sum + s.images.length, 0);

  const csCount = csGenerations.reduce((sum, g) => sum + getCSVariationUrls(g).length, 0);

  const lcLooks = product.generatedImages?.modeloIA || [];
  const lcCount = lcLooks.length;

  const srImages = product.generatedImages?.studioReady || [];
  const srCount = srImages.length;

  const ccImages = product.generatedImages?.cenarioCriativo || [];
  const ccCount = ccImages.length;

  // ── Tabs ──
  const tabs: Tab[] = useMemo(() => [
    { id: 'ps', label: 'Product Studio', icon: 'fa-camera', count: psCount },
    { id: 'cs', label: 'Still Criativo', icon: 'fa-gem', count: csCount },
    { id: 'lc', label: 'Look Composer', icon: 'fa-layer-group', count: lcCount },
    { id: 'sr', label: 'Studio Ready', icon: 'fa-cube', count: srCount },
    { id: 'cc', label: 'Cenário', icon: 'fa-mountain-sun', count: ccCount },
  ], [psCount, csCount, lcCount, srCount, ccCount]);

  // Auto-selecionar primeira aba com conteúdo
  const firstNonEmpty = tabs.find(t => t.count > 0)?.id || 'ps';
  const [activeTab, setActiveTab] = useState(firstNonEmpty);

  useEffect(() => {
    if (isOpen) {
      // Se defaultTab foi passado e essa aba tem conteúdo, usar ela
      if (defaultTab && tabs.find(t => t.id === defaultTab && t.count > 0)) {
        setActiveTab(defaultTab);
      } else {
        const first = tabs.find(t => t.count > 0)?.id || 'ps';
        setActiveTab(first);
      }
    }
  }, [isOpen, tabs, defaultTab]);

  // ── Atalhos ──
  const handleShortcut = useCallback((page: string) => {
    setProductForCreation(product);
    onClose();
    navigateTo(page);
  }, [product, onClose, navigateTo, setProductForCreation]);

  // ── Download ──
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const downloadGroups: DownloadImageGroup[] = useMemo(() => {
    const groups: DownloadImageGroup[] = [];

    // Product Studio
    const psImgs: DownloadableImage[] = psSessions.flatMap(s =>
      s.images.map(img => ({ url: img.url, label: getAngleLabel(img.angle), featurePrefix: 'VProductStudio' }))
    );
    if (psImgs.length) groups.push({ label: 'Product Studio', featurePrefix: 'VProductStudio', images: psImgs });

    // Creative Still
    const csImgs: DownloadableImage[] = csGenerations.flatMap(g =>
      getCSVariationUrls(g).map((url, i) => ({ url, label: `Variação ${i + 1}`, featurePrefix: 'VCreativeStill' }))
    );
    if (csImgs.length) groups.push({ label: 'Still Criativo', featurePrefix: 'VCreativeStill', images: csImgs });

    // Look Composer
    const lcImgs: DownloadableImage[] = lcLooks.flatMap(look => {
      const imgs: DownloadableImage[] = [{ url: look.images.front, label: 'Frente', featurePrefix: 'VLookComposer' }];
      if (look.images.back) imgs.push({ url: look.images.back, label: 'Costas', featurePrefix: 'VLookComposer' });
      return imgs;
    });
    if (lcImgs.length) groups.push({ label: 'Look Composer', featurePrefix: 'VLookComposer', images: lcImgs });

    // Studio Ready
    const srImgs: DownloadableImage[] = srImages.map(img => ({ url: img.images.front, label: 'Studio Ready', featurePrefix: 'VStudioReady' }));
    if (srImgs.length) groups.push({ label: 'Studio Ready', featurePrefix: 'VStudioReady', images: srImgs });

    // Cenário Criativo
    const ccImgs: DownloadableImage[] = ccImages.map(img => ({ url: img.images.front, label: 'Cenário', featurePrefix: 'VCenario' }));
    if (ccImgs.length) groups.push({ label: 'Cenário Criativo', featurePrefix: 'VCenario', images: ccImgs });

    return groups;
  }, [psSessions, csGenerations, lcLooks, srImages, ccImages]);

  const totalDownloadableImages = downloadGroups.reduce((sum, g) => sum + g.images.length, 0);

  // ── Render ──
  if (!isOpen) return null;

  const productImage = (() => {
    const ps = product.generatedImages?.productStudio || [];
    for (let i = ps.length - 1; i >= 0; i--) {
      const front = ps[i].images.find(img => img.angle === 'front');
      if (front?.url) return front.url;
      if (ps[i].images[0]?.url) return ps[i].images[0].url;
    }
    if (product.originalImages?.front && typeof product.originalImages.front === 'object') {
      return (product.originalImages.front as any).url || '';
    }
    return product.images?.[0]?.url || '';
  })();

  const shortcuts = [
    { label: 'Product Studio', icon: 'fa-camera', page: 'product-studio', desc: 'Foto profissional' },
    { label: 'Provador', icon: 'fa-shirt', page: 'provador', desc: 'Vista seus clientes' },
    { label: 'Look Composer', icon: 'fa-layer-group', page: 'look-composer', desc: 'Monte combinações' },
    { label: 'Still Criativo', icon: 'fa-gem', page: 'creative-still', desc: 'Foto editorial' },
  ];

  // ── Tab content renderers ──

  const renderPS = () => {
    if (psCount === 0) return renderEmpty('Product Studio');
    const sorted = [...psSessions].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return (
      <div className="space-y-4">
        {sorted.map(session => (
          <div key={session.id}>
            <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] mb-2'}>
              {formatDate(session.createdAt)} &middot; {session.images.length} {session.images.length === 1 ? 'foto' : 'fotos'}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {session.images.map(img => (
                <div
                  key={img.id}
                  className={'rounded-lg overflow-hidden border cursor-zoom-in transition-all hover:border-[#FF6B6B]/50 relative ' + (isDark ? 'border-neutral-800' : 'border-gray-200')}
                  onClick={() => openViewer(img.url, { alt: getAngleLabel(img.angle) })}
                >
                  <OptimizedImage src={img.url} size="preview" alt={getAngleLabel(img.angle)} className="w-full aspect-square" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                    <p className="text-white text-[7px] font-medium text-center">{getAngleLabel(img.angle)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderCS = () => {
    if (isLoadingCS) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className={'w-5 h-5 border-2 rounded-full animate-spin border-t-transparent ' + (isDark ? 'border-neutral-600' : 'border-gray-300')}></div>
          <span className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-xs ml-2'}>Carregando...</span>
        </div>
      );
    }
    if (csCount === 0) return renderEmpty('Still Criativo');
    return (
      <div className="space-y-4">
        {csGenerations.map(gen => {
          const urls = getCSVariationUrls(gen);
          if (urls.length === 0) return null;
          return (
            <div key={gen.id}>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] mb-2'}>
                {formatDate(gen.created_at)} &middot; {urls.length} {urls.length === 1 ? 'variação' : 'variações'}
                {gen.resolution === '4k' && <span className="ml-1 px-1 py-0.5 bg-amber-500/20 text-amber-500 text-[8px] rounded">4K</span>}
              </p>
              <div className={'grid gap-2 ' + (urls.length === 1 ? 'grid-cols-2' : urls.length <= 3 ? 'grid-cols-3' : 'grid-cols-4')}>
                {urls.map((url, i) => (
                  <div
                    key={i}
                    className={'rounded-lg overflow-hidden border cursor-zoom-in transition-all hover:border-[#FF6B6B]/50 ' + (isDark ? 'border-neutral-800' : 'border-gray-200')}
                    onClick={() => openViewer(url, { alt: `Variação ${i + 1}` })}
                  >
                    <OptimizedImage src={url} size="preview" alt={`Variação ${i + 1}`} className="w-full aspect-[4/5]" objectFit="contain" />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderLC = () => {
    if (lcCount === 0) return renderEmpty('Look Composer');
    const sorted = [...lcLooks].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return (
      <div className="grid grid-cols-3 gap-2">
        {sorted.map(look => (
          <div
            key={look.id}
            className={'rounded-lg overflow-hidden border cursor-zoom-in transition-all hover:border-[#FF6B6B]/50 relative ' + (isDark ? 'border-neutral-800' : 'border-gray-200')}
            onClick={() => openViewer(look.images.front, { alt: 'Look Composer' })}
          >
            <OptimizedImage src={look.images.front} size="preview" alt="Look" className="w-full aspect-[3/4]" />
            {look.images.back && (
              <div className="absolute top-1 right-1 px-1 py-0.5 bg-black/60 text-white text-[7px] rounded">
                F+C
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderSR = () => {
    if (srCount === 0) return renderEmpty('Studio Ready');
    return (
      <div className="grid grid-cols-3 gap-2">
        {srImages.map(img => (
          <div
            key={img.id}
            className={'rounded-lg overflow-hidden border cursor-zoom-in transition-all hover:border-[#FF6B6B]/50 ' + (isDark ? 'border-neutral-800' : 'border-gray-200')}
            onClick={() => openViewer(img.images.front, { alt: 'Studio Ready' })}
          >
            <OptimizedImage src={img.images.front} size="preview" alt="Studio Ready" className="w-full aspect-square" />
          </div>
        ))}
      </div>
    );
  };

  const renderCC = () => {
    if (ccCount === 0) return renderEmpty('Cenário Criativo');
    return (
      <div className="grid grid-cols-3 gap-2">
        {ccImages.map(img => (
          <div
            key={img.id}
            className={'rounded-lg overflow-hidden border cursor-zoom-in transition-all hover:border-[#FF6B6B]/50 ' + (isDark ? 'border-neutral-800' : 'border-gray-200')}
            onClick={() => openViewer(img.images.front, { alt: 'Cenário Criativo' })}
          >
            <OptimizedImage src={img.images.front} size="preview" alt="Cenário" className="w-full aspect-square" />
          </div>
        ))}
      </div>
    );
  };

  const renderEmpty = (featureName: string) => (
    <div className={'rounded-xl p-6 text-center ' + (isDark ? 'bg-neutral-900/50' : 'bg-gray-50')}>
      <i className={'fas fa-image text-2xl mb-2 ' + (isDark ? 'text-neutral-700' : 'text-gray-300')}></i>
      <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-xs'}>
        Nenhuma geração de {featureName} para este produto
      </p>
    </div>
  );

  const tabContentMap: Record<string, () => React.ReactNode> = {
    ps: renderPS,
    cs: renderCS,
    lc: renderLC,
    sr: renderSR,
    cc: renderCC,
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
      onClick={onClose}
    >
      <div
        className={(isDark ? 'bg-neutral-900' : 'bg-white') + ' rounded-t-2xl md:rounded-2xl w-full max-w-lg overflow-hidden flex flex-col'}
        style={{
          maxHeight: 'calc(92vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
          marginBottom: 'env(safe-area-inset-bottom, 0px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ═══ HEADER ═══ */}
        <div className={'flex items-center gap-3 p-4 border-b ' + (isDark ? 'border-neutral-800' : 'border-gray-200')}>
          {/* Thumbnail do produto */}
          <div className={'w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 ' + (isDark ? 'bg-neutral-800' : 'bg-gray-100')}>
            {productImage ? (
              <OptimizedImage src={productImage} size="thumb" alt={product.name} className="w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <i className={'fas fa-image ' + (isDark ? 'text-neutral-600' : 'text-gray-400')}></i>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold truncate'}>{product.name}</h3>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {product.sku && (
                <span className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px]'}>{product.sku}</span>
              )}
              {product.category && (
                <span className={'text-[9px] px-1.5 py-0.5 rounded ' + (isDark ? 'bg-white/5 text-neutral-400' : 'bg-gray-100 text-gray-500')}>
                  {product.category}
                </span>
              )}
              {product.color && (
                <span className={'text-[9px] px-1.5 py-0.5 rounded ' + (isDark ? 'bg-white/5 text-neutral-400' : 'bg-gray-100 text-gray-500')}>
                  {product.color}
                </span>
              )}
            </div>
          </div>

          {/* Ações header */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {totalDownloadableImages > 0 && (
              <button
                onClick={() => setShowDownloadModal(true)}
                className="h-8 px-2.5 rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white flex items-center justify-center gap-1.5 hover:opacity-90 transition-all"
              >
                <i className="fas fa-download text-[10px]"></i>
                <span className="text-[10px] font-semibold">{totalDownloadableImages}</span>
              </button>
            )}
            {onEditProduct && (
              <button
                onClick={() => { onEditProduct(product); onClose(); }}
                className={(isDark ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700') + ' w-8 h-8 rounded-full flex items-center justify-center'}
              >
                <i className="fas fa-pen text-xs"></i>
              </button>
            )}
            <button
              onClick={onClose}
              className={(isDark ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700') + ' w-8 h-8 rounded-full flex items-center justify-center'}
            >
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>
        </div>

        {/* ═══ TABS ═══ */}
        <div className={'flex items-center gap-1 px-4 py-2.5 border-b overflow-x-auto no-scrollbar ' + (isDark ? 'border-neutral-800' : 'border-gray-200')}>
          {tabs.filter(t => t.count > 0 || t.id === activeTab).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap flex-shrink-0 ' +
                (activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white'
                  : isDark
                    ? 'bg-neutral-800 text-neutral-400 hover:text-white'
                    : 'bg-gray-100 text-gray-500 hover:text-gray-700')
              }
            >
              <i className={'fas ' + tab.icon + ' text-[9px]'}></i>
              {tab.label}
              <span className={
                'px-1 py-0.5 rounded text-[8px] font-bold ' +
                (activeTab === tab.id
                  ? 'bg-white/20'
                  : isDark ? 'bg-white/10' : 'bg-gray-200')
              }>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ═══ CONTENT ═══ */}
        <div className="flex-1 overflow-y-auto p-4">
          {tabContentMap[activeTab]?.()}
        </div>

        {/* ═══ ATALHOS "Deseja criar?" ═══ */}
        <div className={'border-t px-4 py-3 ' + (isDark ? 'border-neutral-800' : 'border-gray-200')}>
          <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-semibold mb-2'}>
            <i className="fas fa-wand-magic-sparkles text-[#FF6B6B] mr-1.5 text-[10px]"></i>
            Deseja criar?
          </p>
          <div className="grid grid-cols-4 gap-2">
            {shortcuts.map(s => (
              <button
                key={s.page}
                onClick={() => handleShortcut(s.page)}
                className={(isDark ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700' : 'bg-gray-50 hover:bg-gray-100 border-gray-200') + ' border rounded-xl p-2 text-center transition-all'}
              >
                <div className={'w-7 h-7 mx-auto rounded-lg flex items-center justify-center mb-1 ' + (isDark ? 'bg-white/10' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
                  <i className={'fas ' + s.icon + ' text-[10px] ' + (isDark ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
                </div>
                <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-[9px] font-medium leading-tight'}>{s.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Download Modal */}
      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        productName={product.name}
        groups={downloadGroups}
        theme={theme}
      />
    </div>
  );
};
