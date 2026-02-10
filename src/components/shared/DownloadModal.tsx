// ═══════════════════════════════════════════════════════════════
// VIZZU - Download Modal (seleção de imagens + escolha de formato)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { OptimizedImage } from '../OptimizedImage';
import DownloadProgressModal from './DownloadProgressModal';
import { DOWNLOAD_PRESETS, getDownloadUrl, buildFilename, type DownloadableImage, type DownloadPreset } from '../../utils/downloadSizes';
import { generateZipFromImages, type ZipProgress } from '../../utils/zipDownload';
import { smartDownload } from '../../utils/downloadHelper';

// ── Types ──

export interface DownloadImageGroup {
  label: string;
  featurePrefix: string;
  images: DownloadableImage[];
}

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  /** Modo flat — lista simples de imagens (usado nas features) */
  images?: DownloadableImage[];
  /** Modo agrupado — imagens por feature (usado no ProductHubModal) */
  groups?: DownloadImageGroup[];
  theme?: 'dark' | 'light';
}

// ── Component ──

export default function DownloadModal({
  isOpen,
  onClose,
  productName,
  images,
  groups,
  theme = 'dark',
}: DownloadModalProps) {
  const isDark = theme === 'dark';

  // ── Flatten images ──
  const allImages = useMemo(() => {
    if (images) return images;
    if (groups) return groups.flatMap((g) => g.images);
    return [];
  }, [images, groups]);

  const isGrouped = !!groups && groups.length > 0;

  // ── State ──
  const [step, setStep] = useState<'select' | 'format'>('select');
  const [selected, setSelected] = useState<Set<number>>(() => new Set(allImages.map((_, i) => i)));
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(() => new Set(groups?.map((_, i) => i) || []));
  const [zipProgress, setZipProgress] = useState<ZipProgress | null>(null);
  const zipAbortRef = useRef<AbortController | null>(null);

  // Reset ao abrir/fechar
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelected(new Set(allImages.map((_, i) => i)));
      setExpandedGroups(new Set(groups?.map((_, i) => i) || []));
      setZipProgress(null);
    }
  }, [isOpen, allImages.length]);

  // ── Selection helpers ──
  const selectedCount = selected.size;
  const allSelected = selectedCount === allImages.length && allImages.length > 0;

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allImages.map((_, i) => i)));
    }
  }, [allSelected, allImages]);

  const toggleImage = useCallback((index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  // Group-level select/deselect
  const getGroupIndexRange = useCallback((groupIndex: number): number[] => {
    if (!groups) return [];
    let offset = 0;
    for (let i = 0; i < groupIndex; i++) offset += groups[i].images.length;
    return Array.from({ length: groups[groupIndex].images.length }, (_, i) => offset + i);
  }, [groups]);

  const toggleGroup = useCallback((groupIndex: number) => {
    const indexes = getGroupIndexRange(groupIndex);
    const allGroupSelected = indexes.every((i) => selected.has(i));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allGroupSelected) {
        indexes.forEach((i) => next.delete(i));
      } else {
        indexes.forEach((i) => next.add(i));
      }
      return next;
    });
  }, [getGroupIndexRange, selected]);

  const toggleGroupExpand = useCallback((groupIndex: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupIndex)) next.delete(groupIndex);
      else next.add(groupIndex);
      return next;
    });
  }, []);

  // ── Selected images array ──
  const selectedImages = useMemo(
    () => Array.from(selected).sort((a, b) => a - b).map((i) => allImages[i]).filter(Boolean),
    [selected, allImages]
  );

  // ── Download handlers ──
  const handlePresetDownload = useCallback(async (preset: DownloadPreset) => {
    if (selectedImages.length === 0) return;

    if (selectedImages.length === 1) {
      // Download direto
      const img = selectedImages[0];
      const url = getDownloadUrl(img.url, preset);
      const filename = buildFilename(productName, img.featurePrefix, img.label, preset);
      await smartDownload(url, { filename });
      onClose();
      return;
    }

    // Múltiplas imagens → ZIP com 1 preset
    const abort = new AbortController();
    zipAbortRef.current = abort;
    setZipProgress({ phase: 'downloading', current: 0, total: 0, percentage: 0 });
    await generateZipFromImages(selectedImages, productName, setZipProgress, abort.signal, [preset]);
    setZipProgress(null);
    zipAbortRef.current = null;
    onClose();
  }, [selectedImages, productName, onClose]);

  const handleDownloadAll = useCallback(async () => {
    if (selectedImages.length === 0) return;
    const abort = new AbortController();
    zipAbortRef.current = abort;
    setZipProgress({ phase: 'downloading', current: 0, total: 0, percentage: 0 });
    await generateZipFromImages(selectedImages, productName, setZipProgress, abort.signal);
    setZipProgress(null);
    zipAbortRef.current = null;
    onClose();
  }, [selectedImages, productName, onClose]);

  const handleCancelZip = useCallback(() => {
    zipAbortRef.current?.abort();
    setZipProgress(null);
  }, []);

  // ── Render ──
  if (!isOpen) return null;

  // ── Shared styles ──
  const overlayClass = 'fixed inset-0 z-[100] flex items-end md:items-center justify-center';
  const modalClass = (isDark ? 'bg-[#1a1a1a]' : 'bg-white') +
    ' rounded-t-2xl md:rounded-2xl w-full max-w-lg flex flex-col overflow-hidden shadow-2xl';

  return (
    <>
      <div className={overlayClass}>
        {/* Overlay */}
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md" onClick={onClose} />

        {/* Modal */}
        <div
          className={modalClass}
          style={{ maxHeight: 'min(85vh, 680px)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {step === 'select' ? (
            // ═══════════════════════════════════════
            // STEP 1 — Image Selection
            // ═══════════════════════════════════════
            <>
              {/* Header */}
              <div className={'flex items-center justify-between px-5 py-4 border-b ' + (isDark ? 'border-white/[0.06]' : 'border-gray-100')}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B6B] to-[#FF9F43] flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-download text-white text-xs" />
                  </div>
                  <div className="min-w-0">
                    <h3 className={(isDark ? 'text-white' : 'text-[#373632]') + ' text-sm font-semibold truncate'}>
                      Download
                    </h3>
                    <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[11px] truncate'}>
                      {productName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className={(isDark ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-600') + ' w-8 h-8 rounded-full flex items-center justify-center transition-colors'}
                >
                  <i className="fas fa-times text-sm" />
                </button>
              </div>

              {/* Select all bar */}
              <div className={'flex items-center justify-between px-5 py-2.5 border-b ' + (isDark ? 'border-white/[0.04]' : 'border-gray-50')}>
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-2 group"
                >
                  <div className={
                    'w-5 h-5 rounded flex items-center justify-center transition-all ' +
                    (allSelected
                      ? 'bg-gradient-to-br from-[#FF6B6B] to-[#FF9F43]'
                      : isDark ? 'border border-white/20 hover:border-white/40' : 'border border-gray-300 hover:border-gray-400')
                  }>
                    {allSelected && <i className="fas fa-check text-white text-[9px]" />}
                  </div>
                  <span className={(isDark ? 'text-neutral-300' : 'text-gray-600') + ' text-xs font-medium'}>
                    Selecionar todas
                  </span>
                </button>
                <span className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[11px]'}>
                  {selectedCount} de {allImages.length}
                </span>
              </div>

              {/* Image grid / groups (scrollable) */}
              <div className="flex-1 overflow-y-auto px-5 py-3">
                {isGrouped && groups ? (
                  // ── Grouped mode ──
                  <div className="space-y-3">
                    {groups.map((group, gi) => {
                      const indexes = getGroupIndexRange(gi);
                      const groupAllSelected = indexes.length > 0 && indexes.every((i) => selected.has(i));
                      const groupSomeSelected = indexes.some((i) => selected.has(i));
                      const isExpanded = expandedGroups.has(gi);

                      return (
                        <div key={gi}>
                          {/* Group header */}
                          <div className="flex items-center justify-between mb-2">
                            <button
                              onClick={() => toggleGroupExpand(gi)}
                              className="flex items-center gap-2"
                            >
                              <i className={'fas text-[10px] transition-transform ' + (isExpanded ? 'fa-chevron-down' : 'fa-chevron-right') + (isDark ? ' text-neutral-500' : ' text-gray-400')} />
                              <span className={(isDark ? 'text-neutral-300' : 'text-gray-600') + ' text-xs font-semibold'}>
                                {group.label}
                              </span>
                              <span className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[10px]'}>
                                ({group.images.length})
                              </span>
                            </button>
                            <button
                              onClick={() => toggleGroup(gi)}
                              className={
                                'flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium transition-colors ' +
                                (groupAllSelected
                                  ? 'text-[#FF6B6B] bg-[#FF6B6B]/10'
                                  : isDark ? 'text-neutral-500 hover:text-neutral-300' : 'text-gray-400 hover:text-gray-600')
                              }
                            >
                              <div className={
                                'w-3.5 h-3.5 rounded flex items-center justify-center ' +
                                (groupAllSelected
                                  ? 'bg-gradient-to-br from-[#FF6B6B] to-[#FF9F43]'
                                  : groupSomeSelected
                                    ? 'bg-[#FF6B6B]/40'
                                    : isDark ? 'border border-white/20' : 'border border-gray-300')
                              }>
                                {(groupAllSelected || groupSomeSelected) && <i className="fas fa-check text-white text-[7px]" />}
                              </div>
                              {groupAllSelected ? 'Grupo' : 'Selec. grupo'}
                            </button>
                          </div>

                          {/* Group images */}
                          {isExpanded && (
                            <div className="grid grid-cols-4 gap-2 ml-4">
                              {group.images.map((img, ii) => {
                                const flatIndex = indexes[ii];
                                const isSelected = selected.has(flatIndex);
                                return (
                                  <ImageThumb
                                    key={flatIndex}
                                    img={img}
                                    isSelected={isSelected}
                                    onToggle={() => toggleImage(flatIndex)}
                                    isDark={isDark}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // ── Flat mode ──
                  <div className="grid grid-cols-4 gap-2">
                    {allImages.map((img, i) => (
                      <ImageThumb
                        key={i}
                        img={img}
                        isSelected={selected.has(i)}
                        onToggle={() => toggleImage(i)}
                        isDark={isDark}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className={'flex items-center justify-between px-5 py-3 border-t ' + (isDark ? 'border-white/[0.06]' : 'border-gray-100')}>
                <span className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-xs'}>
                  {selectedCount} {selectedCount === 1 ? 'selecionada' : 'selecionadas'}
                </span>
                <button
                  onClick={() => setStep('format')}
                  disabled={selectedCount === 0}
                  className={
                    'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ' +
                    (selectedCount > 0
                      ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:opacity-90'
                      : isDark ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed')
                  }
                >
                  Continuar
                  <i className="fas fa-arrow-right text-xs" />
                </button>
              </div>
            </>
          ) : (
            // ═══════════════════════════════════════
            // STEP 2 — Format Selection
            // ═══════════════════════════════════════
            <>
              {/* Header */}
              <div className={'flex items-center gap-3 px-5 py-4 border-b ' + (isDark ? 'border-white/[0.06]' : 'border-gray-100')}>
                <button
                  onClick={() => setStep('select')}
                  className={(isDark ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' w-8 h-8 rounded-full flex items-center justify-center transition-colors'}
                >
                  <i className="fas fa-arrow-left text-sm" />
                </button>
                <div className="min-w-0 flex-1">
                  <h3 className={(isDark ? 'text-white' : 'text-[#373632]') + ' text-sm font-semibold'}>
                    Escolha o formato
                  </h3>
                  <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[11px]'}>
                    {selectedCount} {selectedCount === 1 ? 'imagem' : 'imagens'} · {productName}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className={(isDark ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-600') + ' w-8 h-8 rounded-full flex items-center justify-center transition-colors'}
                >
                  <i className="fas fa-times text-sm" />
                </button>
              </div>

              {/* Format list */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                {/* ⭐ Baixar Tudo (ZIP destaque) */}
                <button
                  onClick={handleDownloadAll}
                  className={
                    'w-full p-4 rounded-xl text-left transition-all group ' +
                    'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] hover:opacity-90'
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-file-zipper text-white text-lg" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-bold">
                        Baixar Tudo (ZIP)
                      </p>
                      <p className="text-white/70 text-[11px]">
                        {selectedCount} {selectedCount === 1 ? 'imagem' : 'imagens'} × {DOWNLOAD_PRESETS.length} tamanhos · Organizado em pastas
                      </p>
                    </div>
                  </div>
                </button>

                {/* Separador */}
                <div className="flex items-center gap-3 py-1">
                  <div className={'flex-1 h-px ' + (isDark ? 'bg-white/[0.06]' : 'bg-gray-100')} />
                  <span className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[10px] uppercase tracking-wider'}>
                    ou escolha um tamanho
                  </span>
                  <div className={'flex-1 h-px ' + (isDark ? 'bg-white/[0.06]' : 'bg-gray-100')} />
                </div>

                {/* 6 presets */}
                {DOWNLOAD_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetDownload(preset)}
                    className={
                      'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ' +
                      (isDark
                        ? 'hover:bg-white/[0.04] active:bg-white/[0.08]'
                        : 'hover:bg-gray-50 active:bg-gray-100')
                    }
                  >
                    <div className={
                      'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ' +
                      (isDark ? 'bg-white/[0.06]' : 'bg-gray-100')
                    }>
                      <i className={'fas fa-' + preset.icon + ' text-xs ' + (isDark ? 'text-neutral-400' : 'text-gray-500')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={(isDark ? 'text-white' : 'text-[#373632]') + ' text-[13px] font-medium'}>
                        {preset.label}
                      </p>
                      <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[11px]'}>
                        {preset.description}
                      </p>
                    </div>
                    <span className={(isDark ? 'text-neutral-600' : 'text-gray-300') + ' text-[11px] font-mono flex-shrink-0'}>
                      {preset.formatLabel}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ZIP Progress overlay */}
      {zipProgress && (
        <DownloadProgressModal
          isOpen={!!zipProgress}
          progress={zipProgress}
          theme={theme}
          onCancel={handleCancelZip}
        />
      )}
    </>
  );
}

// ── Thumbnail subcomponent ──

function ImageThumb({
  img,
  isSelected,
  onToggle,
  isDark,
}: {
  img: DownloadableImage;
  isSelected: boolean;
  onToggle: () => void;
  isDark: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      className={
        'relative rounded-lg overflow-hidden border-2 transition-all ' +
        (isSelected
          ? 'border-[#FF6B6B] ring-1 ring-[#FF6B6B]/30'
          : isDark ? 'border-transparent hover:border-white/10' : 'border-transparent hover:border-gray-200')
      }
    >
      <OptimizedImage
        src={img.url}
        alt={img.label}
        size="thumb"
        className="w-full aspect-square"
      />

      {/* Checkbox overlay */}
      <div className={
        'absolute top-1.5 left-1.5 w-5 h-5 rounded flex items-center justify-center transition-all ' +
        (isSelected
          ? 'bg-gradient-to-br from-[#FF6B6B] to-[#FF9F43] shadow-sm'
          : isDark ? 'bg-black/50 border border-white/20' : 'bg-white/80 border border-gray-300')
      }>
        {isSelected && <i className="fas fa-check text-white text-[8px]" />}
      </div>

      {/* Label */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1">
        <p className="text-white text-[8px] font-medium truncate text-center">
          {img.label}
        </p>
      </div>
    </button>
  );
}
