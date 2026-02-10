// ═══════════════════════════════════════════════════════════════
// VIZZU - Download Bottom Sheet (escolha de tamanho individual)
// ═══════════════════════════════════════════════════════════════

import { useRef, useCallback, useEffect } from 'react';
import { DOWNLOAD_PRESETS, getDownloadUrl, buildFilename, type DownloadPreset } from '../../utils/downloadSizes';
import { smartDownload } from '../../utils/downloadHelper';

interface DownloadBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageLabel: string;
  productName: string;
  featurePrefix: string;
  theme?: 'dark' | 'light';
  onDownloadStart?: () => void;
  onDownloadEnd?: (success: boolean) => void;
}

export default function DownloadBottomSheet({
  isOpen,
  onClose,
  imageUrl,
  imageLabel,
  productName,
  featurePrefix,
  theme = 'dark',
  onDownloadStart,
  onDownloadEnd,
}: DownloadBottomSheetProps) {
  const isDark = theme === 'dark';
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);

  // Fechar ao pressionar Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Bloquear scroll do body quando aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleDownload = useCallback(async (preset: DownloadPreset) => {
    onDownloadStart?.();

    // Para data: URLs (canvas), baixar direto sem wsrv.nl
    const isDataUrl = imageUrl.startsWith('data:');
    const downloadUrl = isDataUrl ? imageUrl : getDownloadUrl(imageUrl, preset);
    const filename = buildFilename(productName, featurePrefix, imageLabel, preset);

    const success = await smartDownload(downloadUrl, {
      filename,
      shareTitle: `${productName} - ${imageLabel}`,
    });

    onDownloadEnd?.(success);
    onClose();
  }, [imageUrl, productName, featurePrefix, imageLabel, onClose, onDownloadStart, onDownloadEnd]);

  // Swipe down to close
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const diff = e.touches[0].clientY - startYRef.current;
    if (diff > 80) onClose();
  }, [onClose]);

  // Icon mapping
  const iconMap: Record<string, string> = {
    expand: 'fas fa-expand',
    store: 'fas fa-store',
    tags: 'fas fa-tags',
    hashtag: 'fas fa-hashtag',
    globe: 'fas fa-globe',
    compress: 'fas fa-compress',
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[998] bg-black/35 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        className={
          'fixed bottom-0 left-0 right-0 z-[999] rounded-t-2xl transition-transform duration-300 max-h-[85vh] overflow-y-auto ' +
          (isDark
            ? 'bg-[#1a1a1a] border-t border-white/[0.08]'
            : 'bg-white border-t border-gray-100')
        }
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2.5 pb-0">
          <div className={
            'w-9 h-1 rounded-full ' +
            (isDark ? 'bg-white/20' : 'bg-gray-300')
          } />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <i className="fas fa-arrow-down text-[#FF6B6B] text-[13px]" />
            <span className={
              'text-[15px] font-bold ' +
              (isDark ? 'text-white' : 'text-[#373632]')
            }>
              {imageLabel}
            </span>
          </div>
          <button
            onClick={onClose}
            className={
              'w-7 h-7 rounded-lg flex items-center justify-center text-[11px] transition-colors ' +
              (isDark
                ? 'bg-white/[0.06] text-neutral-500 hover:bg-white/[0.1] hover:text-neutral-300'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600')
            }
          >
            <i className="fas fa-xmark" />
          </button>
        </div>

        {/* Divider */}
        <div className={
          'h-px mx-5 ' +
          (isDark ? 'bg-white/[0.06]' : 'bg-gray-100')
        } />

        {/* Preset list */}
        <div className="px-3 py-2 pb-5">
          {DOWNLOAD_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleDownload(preset)}
              className={
                'flex items-center gap-3.5 w-full text-left px-3 py-3.5 rounded-xl transition-colors ' +
                (isDark
                  ? 'hover:bg-white/[0.04] active:bg-white/[0.08]'
                  : 'hover:bg-[#f7f5f2] active:bg-[#f0ece7]')
              }
            >
              {/* Icon */}
              <span className={
                'w-9 h-9 rounded-[10px] flex items-center justify-center text-sm flex-shrink-0 transition-colors ' +
                (isDark
                  ? 'bg-white/[0.04] text-neutral-500 group-hover:bg-[#FF6B6B]/10 group-hover:text-[#FF6B6B]'
                  : 'bg-[#f7f5f2] text-gray-400')
              }
              style={{ '--tw-group-hover': 1 } as React.CSSProperties}
              >
                <i className={iconMap[preset.icon] || 'fas fa-download'} />
              </span>

              {/* Text */}
              <span className="flex-1 min-w-0">
                <span className={
                  'block text-[13px] font-semibold ' +
                  (isDark ? 'text-white' : 'text-[#373632]')
                }>
                  {preset.label}
                </span>
                <span className={
                  'block text-[11px] mt-0.5 ' +
                  (isDark ? 'text-neutral-500' : 'text-gray-400')
                }>
                  {preset.description}
                </span>
              </span>

              {/* Format badge */}
              <span className={
                'text-[10px] font-bold tracking-wider uppercase flex-shrink-0 ' +
                (isDark ? 'text-neutral-600' : 'text-gray-300')
              }>
                {preset.formatLabel}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
