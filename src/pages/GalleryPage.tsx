import { useState, useMemo, useCallback } from 'react';
import { useUI } from '../contexts/UIContext';
import { useGalleryData, FEATURE_CONFIG, type FeatureType, type GalleryItem } from '../hooks/useGalleryData';
import { useDebounce } from '../hooks/useDebounce';
import { useImageViewer } from '../components/ImageViewer';
import { OptimizedImage } from '../components/OptimizedImage';
import DownloadModal, { type DownloadImageGroup } from '../components/shared/DownloadModal';
import { EcommerceExportButton } from '../components/shared/EcommerceExportButton';
import type { DownloadableImage } from '../utils/downloadSizes';

// ═══════════════════════════════════════════════════════════════
// Galeria — Todas as gerações IA em um só lugar
// ═══════════════════════════════════════════════════════════════

const ITEMS_PER_PAGE = 24;

const FEATURE_ORDER: FeatureType[] = [
  'product-studio',
  'creative-still',
  'look-composer',
  'provador',
];

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) +
      ' ' +
      d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function GalleryPage() {
  const { theme } = useUI();
  const isDark = theme !== 'light';
  const { allItems, stats, isLoading } = useGalleryData();
  const { openViewer } = useImageViewer();

  // ── Filtros ──
  const [activeFeature, setActiveFeature] = useState<FeatureType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  // ── Paginação ──
  const [currentPage, setCurrentPage] = useState(1);

  // ── Seleção ──
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Antes/Depois ──
  const [showingOriginal, setShowingOriginal] = useState<Set<string>>(new Set());

  // ── Download ──
  const [downloadItem, setDownloadItem] = useState<GalleryItem | null>(null);
  const [showBulkDownload, setShowBulkDownload] = useState(false);

  // ── Filtered items ──
  const filteredItems = useMemo(() => {
    let items = allItems;

    if (activeFeature) {
      items = items.filter(i => i.featureType === activeFeature);
    }

    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      items = items.filter(i =>
        (i.productName && i.productName.toLowerCase().includes(term)) ||
        (i.clientName && i.clientName.toLowerCase().includes(term))
      );
    }

    return items;
  }, [allItems, activeFeature, debouncedSearch]);

  // ── Paginação calc ──
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  // Resetar página ao mudar filtro
  const handleFeatureFilter = useCallback((f: FeatureType | null) => {
    setActiveFeature(f);
    setCurrentPage(1);
  }, []);

  // ── Seleção helpers ──
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const cancelSelection = useCallback(() => {
    setIsSelecting(false);
    setSelectedIds(new Set());
  }, []);

  const toggleOriginal = useCallback((id: string) => {
    setShowingOriginal(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Download helpers ──
  const makeDownloadImage = (item: GalleryItem): DownloadableImage => ({
    url: item.imageUrl,
    label: item.productName || item.clientName || FEATURE_CONFIG[item.featureType].label,
    featurePrefix: item.featureType,
  });

  const selectedItems = useMemo(() =>
    allItems.filter(i => selectedIds.has(i.id)),
    [allItems, selectedIds]
  );

  const bulkDownloadGroups = useMemo<DownloadImageGroup[]>(() => {
    const grouped: Record<string, GalleryItem[]> = {};
    for (const item of selectedItems) {
      const key = item.featureType;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    }
    return Object.entries(grouped).map(([ft, items]) => ({
      label: FEATURE_CONFIG[ft as FeatureType].label,
      featurePrefix: ft,
      images: items.map(makeDownloadImage),
    }));
  }, [selectedItems]);

  // ── Styles (padrão do app: neutro com coral como acento) ──
  const cardBg = isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white/80 border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-neutral-400' : 'text-gray-500';
  const textMuted = isDark ? 'text-neutral-500' : 'text-gray-400';

  // ═══ RENDER ═══
  return (
    <div className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-6">
      <div className="max-w-[1600px] mx-auto">

      {/* ── Header (padrão Products/Clients: ícone frosted glass + título) ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={'w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xl ' + (isDark ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
            <i className={'fas fa-images text-sm ' + (isDark ? 'text-neutral-200' : 'text-[#1A1A1A]')} />
          </div>
          <div>
            <h1 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-lg font-extrabold'}>Galeria</h1>
            <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs font-serif italic'}>Todas as suas criações</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSelecting ? (
            <>
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setShowBulkDownload(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-xl text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  <i className="fas fa-download text-[10px]" />
                  Baixar ({selectedIds.size})
                </button>
              )}
              <button
                onClick={cancelSelection}
                className={`px-3 py-2 rounded-xl text-xs font-medium ${isDark ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'} transition-colors`}
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsSelecting(true)}
              className={`px-3 py-2 rounded-xl text-xs font-medium ${isDark ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'} transition-colors`}
            >
              <i className="fas fa-check-double mr-1.5 text-[10px]" />
              Selecionar
            </button>
          )}
        </div>
      </div>

      {/* ── Filtros (container neutro igual ProductsPage) ── */}
      <div className={`rounded-xl border p-3 mb-4 ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'}`}>
        {/* Feature chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => handleFeatureFilter(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeFeature === null
                ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white'
                : isDark
                  ? 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todas
            <span className={`ml-1.5 px-1 py-0.5 rounded text-[8px] font-bold ${
              activeFeature === null ? 'bg-white/20' : isDark ? 'bg-white/10' : 'bg-gray-200'
            }`}>
              {stats.total}
            </span>
          </button>

          {FEATURE_ORDER.map(ft => {
            const count = stats.byFeature[ft];
            if (count === 0) return null;
            const cfg = FEATURE_CONFIG[ft];
            return (
              <button
                key={ft}
                onClick={() => handleFeatureFilter(activeFeature === ft ? null : ft)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeFeature === ft
                    ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white'
                    : isDark
                      ? 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <i className={`fas ${cfg.icon} text-[10px]`} />
                {cfg.label}
                <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${
                  activeFeature === ft ? 'bg-white/20' : isDark ? 'bg-white/10' : 'bg-gray-200'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative mt-2">
          <i className={`fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs ${textMuted}`} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Buscar por nome do produto ou cliente..."
            className={`w-full pl-9 pr-8 py-1.5 rounded-lg text-xs border ${
              isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
            } focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]/30`}
          />
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${isDark ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}
            >
              <i className="fas fa-times" />
            </button>
          )}
        </div>

        {/* Info line */}
        <p className={`text-[10px] mt-2 ${textMuted}`}>
          {filteredItems.length === stats.total
            ? `${stats.total} criações`
            : `${filteredItems.length} de ${stats.total} criações`}
        </p>
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className={`rounded-xl border overflow-hidden animate-pulse ${cardBg}`}>
              <div className={`aspect-square ${isDark ? 'bg-neutral-800' : 'bg-gray-200'}`} />
              <div className="p-2 space-y-1.5">
                <div className={`h-3 rounded ${isDark ? 'bg-neutral-800' : 'bg-gray-200'} w-3/4`} />
                <div className={`h-2 rounded ${isDark ? 'bg-neutral-800' : 'bg-gray-200'} w-1/2`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && filteredItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <i className={`fas fa-images text-3xl mb-3 ${textMuted}`} />
          <p className={`text-sm font-medium ${textPrimary} mb-1`}>
            {debouncedSearch || activeFeature ? 'Nenhuma criação encontrada' : 'Sua galeria está vazia'}
          </p>
          <p className={`text-xs ${textSecondary}`}>
            {debouncedSearch || activeFeature
              ? 'Tente ajustar os filtros'
              : 'Comece gerando imagens nas ferramentas da Vizzu'}
          </p>
        </div>
      )}

      {/* ── Grid ── */}
      {!isLoading && filteredItems.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {paginatedItems.map(item => {
              const cfg = FEATURE_CONFIG[item.featureType];
              const isShowingOriginal = showingOriginal.has(item.id);
              const displayUrl = isShowingOriginal && item.originalImageUrl
                ? item.originalImageUrl
                : item.imageUrl;
              const isSelected = selectedIds.has(item.id);

              return (
                <div
                  key={item.id}
                  className={`group rounded-lg border overflow-hidden transition-colors cursor-pointer select-none ${
                    isDark ? 'bg-neutral-800 hover:bg-neutral-700' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                  } ${
                    isSelected ? (isDark ? 'ring-2 ring-neutral-500' : 'ring-2 ring-gray-400') : ''
                  }`}
                  onClick={() => {
                    if (isSelecting) {
                      toggleSelect(item.id);
                    } else {
                      openViewer(displayUrl, {
                        alt: item.productName || item.clientName || cfg.label,
                        downloadMeta: {
                          imageLabel: item.metadata?.angle || 'imagem',
                          productName: item.productName || item.clientName || 'Vizzu',
                          featurePrefix: item.featureType,
                        },
                      });
                    }
                  }}
                >
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden">
                    <OptimizedImage
                      src={displayUrl}
                      alt={item.productName || cfg.label}
                      className="w-full h-full object-cover"
                    />

                    {/* Selection checkbox */}
                    {isSelecting && (
                      <div className={`absolute top-1.5 left-1.5 w-5 h-5 rounded flex items-center justify-center transition-all pointer-events-none ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white'
                          : selectedIds.size > 0
                            ? 'bg-black/50 text-white/70'
                            : 'bg-black/50 text-white/70 opacity-0 group-hover:opacity-100'
                      }`}>
                        <i className={`fas fa-${isSelected ? 'check' : 'square'} text-[8px]`} />
                      </div>
                    )}

                    {/* Before/After label */}
                    {isShowingOriginal && (
                      <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold bg-black/60 text-white">
                        ORIGINAL
                      </div>
                    )}

                    {/* Feature badge (gradiente coral→laranja uniforme) */}
                    <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white text-[8px] font-bold flex items-center gap-1">
                      <i className={`fas ${cfg.icon} text-[6px]`} />
                      <span className="hidden sm:inline">{cfg.label.split(' ')[0]}</span>
                    </div>

                    {/* Hover overlay */}
                    {!isSelecting && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openViewer(item.imageUrl, {
                              alt: item.productName || item.clientName || cfg.label,
                              downloadMeta: {
                                imageLabel: item.metadata?.angle || 'imagem',
                                productName: item.productName || item.clientName || 'Vizzu',
                                featurePrefix: item.featureType,
                              },
                            });
                          }}
                          className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 flex items-center justify-center transition-all"
                          title="Zoom"
                        >
                          <i className="fas fa-expand text-xs" />
                        </button>

                        {item.originalImageUrl && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleOriginal(item.id);
                            }}
                            className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 flex items-center justify-center transition-all"
                            title="Antes/Depois"
                          >
                            <i className="fas fa-arrows-left-right text-xs" />
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDownloadItem(item);
                          }}
                          className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 flex items-center justify-center transition-all"
                          title="Download"
                        >
                          <i className="fas fa-download text-xs" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2">
                    <p className={`text-[10px] font-medium truncate ${textPrimary}`}>
                      {item.productName || item.clientName || cfg.label}
                    </p>
                    <p className={`text-[8px] font-medium uppercase tracking-wide ${textMuted}`}>
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-4">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-colors disabled:cursor-not-allowed ${
                  isDark
                    ? 'text-neutral-400 hover:text-white disabled:text-neutral-700'
                    : 'text-gray-500 hover:text-gray-900 disabled:text-gray-300'
                }`}
              >
                <i className="fas fa-chevron-left" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                .reduce<(number | string)[]>((acc, page, idx, arr) => {
                  if (idx > 0 && page - (arr[idx - 1] as number) > 1) acc.push('...');
                  acc.push(page);
                  return acc;
                }, [])
                .map((item, idx) =>
                  typeof item === 'string' ? (
                    <span key={`dot-${idx}`} className={`w-8 h-8 flex items-center justify-center text-xs ${textMuted}`}>
                      ...
                    </span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setCurrentPage(item)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                        item === currentPage
                          ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white font-semibold'
                          : isDark
                            ? 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-colors disabled:cursor-not-allowed ${
                  isDark
                    ? 'text-neutral-400 hover:text-white disabled:text-neutral-700'
                    : 'text-gray-500 hover:text-gray-900 disabled:text-gray-300'
                }`}
              >
                <i className="fas fa-chevron-right" />
              </button>
            </div>
          )}

          {/* Page info */}
          <p className={`text-center text-[10px] mt-2 ${textMuted}`}>
            {totalPages > 1
              ? `Página ${currentPage} de ${totalPages} — ${filteredItems.length} criações`
              : `${filteredItems.length} criações`}
          </p>
        </>
      )}

      {/* ── Selection bar (fixed bottom, padrão ProductsPage) ── */}
      {isSelecting && selectedIds.size > 0 && (
        <div className={`fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl shadow-2xl border flex items-center gap-3 ${
          isDark ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-gray-200'
        }`}>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] font-medium text-sm">
            {selectedIds.size} selecionada{selectedIds.size > 1 ? 's' : ''}
          </span>
          <div className={`w-px h-4 ${isDark ? 'bg-neutral-700' : 'bg-gray-200'}`} />
          <button
            onClick={() => setShowBulkDownload(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-xl text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <i className="fas fa-download text-[10px]" />
            Baixar
          </button>
          {(() => {
            const exportable = selectedItems.filter(i => i.productId);
            if (exportable.length === 0) return null;
            const firstProductId = exportable[0].productId!;
            return (
              <EcommerceExportButton
                images={exportable.map(i => ({ url: i.imageUrl, label: i.productName || 'Imagem' }))}
                productId={firstProductId}
                tool="gallery"
                compact
              />
            );
          })()}
          <button
            onClick={cancelSelection}
            className={`px-3 py-2 rounded-xl text-xs ${isDark ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'} transition-colors`}
          >
            Cancelar
          </button>
        </div>
      )}

      {/* ── Download modal (individual) ── */}
      {downloadItem && (
        <DownloadModal
          isOpen={true}
          onClose={() => setDownloadItem(null)}
          productName={downloadItem.productName || downloadItem.clientName || 'Vizzu'}
          originalImageUrl={downloadItem.originalImageUrl}
          images={[makeDownloadImage(downloadItem)]}
          theme={theme}
        />
      )}

      {/* ── Download modal (bulk) — só monta quando aberto ── */}
      {showBulkDownload && bulkDownloadGroups.length > 0 && (
        <DownloadModal
          isOpen={true}
          onClose={() => setShowBulkDownload(false)}
          productName="Seleção Galeria"
          groups={bulkDownloadGroups}
          theme={theme}
        />
      )}
      </div>
    </div>
  );
}
