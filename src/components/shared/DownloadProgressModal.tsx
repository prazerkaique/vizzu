// ═══════════════════════════════════════════════════════════════
// VIZZU - Download Progress Modal (barra de progresso ZIP)
// ═══════════════════════════════════════════════════════════════

import type { ZipProgress } from '../../utils/zipDownload';
import type { VizzuTheme } from '../../contexts/UIContext';

interface DownloadProgressModalProps {
  isOpen: boolean;
  progress: ZipProgress;
  theme?: VizzuTheme;
  onCancel?: () => void;
}

export default function DownloadProgressModal({
  isOpen,
  progress,
  theme = 'dark',
  onCancel,
}: DownloadProgressModalProps) {
  const isDark = theme !== 'light';

  if (!isOpen) return null;

  const phaseLabel = progress.phase === 'downloading'
    ? `Baixando imagens... ${progress.current}/${progress.total}`
    : progress.phase === 'compressing'
      ? 'Comprimindo ZIP...'
      : 'Pronto!';

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center px-4 pb-6">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px]" />

      {/* Card */}
      <div className={
        'relative rounded-2xl px-6 py-5 shadow-xl min-w-[320px] max-w-[400px] w-full border ' +
        (isDark
          ? 'bg-[#1a1a1a] border-white/[0.08]'
          : 'bg-white border-gray-100')
      }>
        <div className="flex items-center gap-3 mb-3">
          <i className="fas fa-file-zipper text-[#FF9F43]" />
          <span className={
            'text-[13px] font-semibold ' +
            (isDark ? 'text-white' : 'text-[#373632]')
          }>
            {phaseLabel}
          </span>
        </div>

        {/* Progress bar */}
        <div className={
          'h-1.5 rounded-full overflow-hidden ' +
          (isDark ? 'bg-white/[0.06]' : 'bg-gray-100')
        }>
          <div
            className="h-full rounded-full transition-[width] duration-300 ease-out"
            style={{
              width: `${progress.percentage}%`,
              background: 'linear-gradient(90deg, #FF6B6B, #FF9F43)',
            }}
          />
        </div>

        {onCancel && progress.phase !== 'done' && (
          <button
            onClick={onCancel}
            className={
              'mt-3 text-[11px] font-medium transition-colors ' +
              (isDark
                ? 'text-neutral-500 hover:text-neutral-300'
                : 'text-gray-400 hover:text-gray-600')
            }
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
