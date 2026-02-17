// ═══════════════════════════════════════════════════════════════
// VIZZU - Download Modal (seleção de imagens + escolha de formato)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { OptimizedImage } from '../OptimizedImage';
import DownloadProgressModal from './DownloadProgressModal';
import { StarRating } from './StarRating';
import { DOWNLOAD_PRESETS, getDownloadUrl, buildFilename, type DownloadableImage, type DownloadPreset } from '../../utils/downloadSizes';
import { generateZipFromImages, type ZipProgress } from '../../utils/zipDownload';
import { smartDownload, traditionalDownload } from '../../utils/downloadHelper';
import { submitDownloadRating } from '../../lib/api/ratings';
import { useAuth } from '../../contexts/AuthContext';
import { useWatermark } from '../../hooks/useWatermark';
import { applyWatermark } from '../../utils/watermark';
import type { VizzuTheme } from '../../contexts/UIContext';

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
  /** URL(s) da foto original do produto (antes da IA) — para rating. Array para features com múltiplos ângulos */
  originalImageUrl?: string | string[];
  /** Modo flat — lista simples de imagens (usado nas features) */
  images?: DownloadableImage[];
  /** Modo agrupado — imagens por feature (usado no ProductHubModal) */
  groups?: DownloadImageGroup[];
  theme?: VizzuTheme;
}

// ── Component ──

export default function DownloadModal({
  isOpen,
  onClose,
  productName,
  originalImageUrl,
  images,
  groups,
  theme = 'dark',
}: DownloadModalProps) {
  const isDark = theme !== 'light';
  const { user } = useAuth();
  const hasWatermark = useWatermark();

  // ── Flatten images ──
  const allImages = useMemo(() => {
    if (images) return images;
    if (groups) return groups.flatMap((g) => g.images);
    return [];
  }, [images, groups]);

  const isGrouped = !!groups && groups.length > 0;

  // ── State ──
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selected, setSelected] = useState<Set<number>>(() => new Set(allImages.map((_, i) => i)));
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(() => new Set(groups?.map((_, i) => i) || []));
  const [zipProgress, setZipProgress] = useState<ZipProgress | null>(null);
  const zipAbortRef = useRef<AbortController | null>(null);

  // ── Rating state (Step 3) ──
  const [rating, setRating] = useState(0);
  const [toolRating, setToolRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  // Reset ao abrir
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelected(new Set(allImages.map((_, i) => i)));
      setExpandedGroups(new Set(groups?.map((_, i) => i) || []));
      setZipProgress(null);
      setRating(0);
      setToolRating(0);
      setRatingComment('');
      setIsSubmittingRating(false);
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
  const watermarkTransform = hasWatermark ? applyWatermark : undefined;

  const handlePresetDownload = useCallback(async (preset: DownloadPreset) => {
    if (selectedImages.length === 0) return;

    if (selectedImages.length === 1) {
      const img = selectedImages[0];
      const url = getDownloadUrl(img.url, preset);
      const filename = buildFilename(productName, img.featurePrefix, img.label, preset);
      if (hasWatermark) {
        const resp = await fetch(url);
        const blob = await resp.blob();
        const stamped = await applyWatermark(blob);
        traditionalDownload(stamped, filename.includes('.') ? filename : `${filename}.png`);
      } else {
        await smartDownload(url, { filename });
      }
      setStep(3);
      return;
    }

    const abort = new AbortController();
    zipAbortRef.current = abort;
    setZipProgress({ phase: 'downloading', current: 0, total: 0, percentage: 0 });
    await generateZipFromImages(selectedImages, productName, setZipProgress, abort.signal, [preset], watermarkTransform);
    setZipProgress(null);
    zipAbortRef.current = null;
    setStep(3);
  }, [selectedImages, productName, hasWatermark, watermarkTransform]);

  const handleDownloadAll = useCallback(async () => {
    if (selectedImages.length === 0) return;
    const abort = new AbortController();
    zipAbortRef.current = abort;
    setZipProgress({ phase: 'downloading', current: 0, total: 0, percentage: 0 });
    await generateZipFromImages(selectedImages, productName, setZipProgress, abort.signal, undefined, watermarkTransform);
    setZipProgress(null);
    zipAbortRef.current = null;
    setStep(3);
  }, [selectedImages, productName, watermarkTransform]);

  const handleCancelZip = useCallback(() => {
    zipAbortRef.current?.abort();
    setZipProgress(null);
  }, []);

  // ── Rating handler ──
  const featureSource = useMemo(() => {
    const prefix = selectedImages[0]?.featurePrefix || allImages[0]?.featurePrefix || '';
    return prefix.replace(/^V/, '').replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '') || 'download';
  }, [selectedImages, allImages]);

  const handleSubmitRating = useCallback(async () => {
    if (rating === 0 || !user) return;
    setIsSubmittingRating(true);
    await submitDownloadRating({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      userPlan: user.plan,
      rating,
      toolRating: toolRating || undefined,
      comment: ratingComment.trim() || undefined,
      productName,
      featureSource,
      imageCount: selectedImages.length || allImages.length,
      imageUrls: (selectedImages.length > 0 ? selectedImages : allImages).map(img => img.url),
      originalImageUrls: Array.isArray(originalImageUrl) ? originalImageUrl : originalImageUrl ? [originalImageUrl] : [],
    });
    setIsSubmittingRating(false);
    onClose();
  }, [rating, toolRating, ratingComment, user, productName, featureSource, selectedImages, allImages, originalImageUrl, onClose]);

  // ── Render ──
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
        {/* Overlay */}
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

        {/* Modal */}
        <div
          className={
            (isDark ? 'bg-[#1a1a1a]' : 'bg-white') +
            ' relative rounded-t-2xl md:rounded-2xl w-full max-w-lg flex flex-col overflow-hidden shadow-2xl'
          }
          style={{ maxHeight: 'min(85vh, 700px)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {step === 1 ? (
            <Step1Selection
              isDark={isDark}
              productName={productName}
              allImages={allImages}
              isGrouped={isGrouped}
              groups={groups}
              selected={selected}
              selectedCount={selectedCount}
              allSelected={allSelected}
              expandedGroups={expandedGroups}
              toggleAll={toggleAll}
              toggleImage={toggleImage}
              toggleGroup={toggleGroup}
              toggleGroupExpand={toggleGroupExpand}
              getGroupIndexRange={getGroupIndexRange}
              onContinue={() => setStep(2)}
              onClose={onClose}
            />
          ) : step === 2 ? (
            <Step2Format
              isDark={isDark}
              productName={productName}
              selectedCount={selectedCount}
              onBack={() => setStep(1)}
              onClose={onClose}
              onPresetDownload={handlePresetDownload}
              onDownloadAll={handleDownloadAll}
            />
          ) : (
            <Step3Rating
              isDark={isDark}
              rating={rating}
              toolRating={toolRating}
              comment={ratingComment}
              isSubmitting={isSubmittingRating}
              onRatingChange={setRating}
              onToolRatingChange={setToolRating}
              onCommentChange={setRatingComment}
              onSubmit={handleSubmitRating}
              onSkip={onClose}
            />
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

// ═══════════════════════════════════════════════════════════════
// STEP 1 — Seleção de Imagens
// ═══════════════════════════════════════════════════════════════

function Step1Selection({
  isDark,
  productName,
  allImages,
  isGrouped,
  groups,
  selected,
  selectedCount,
  allSelected,
  expandedGroups,
  toggleAll,
  toggleImage,
  toggleGroup,
  toggleGroupExpand,
  getGroupIndexRange,
  onContinue,
  onClose,
}: {
  isDark: boolean;
  productName: string;
  allImages: DownloadableImage[];
  isGrouped: boolean;
  groups?: DownloadImageGroup[];
  selected: Set<number>;
  selectedCount: number;
  allSelected: boolean;
  expandedGroups: Set<number>;
  toggleAll: () => void;
  toggleImage: (i: number) => void;
  toggleGroup: (gi: number) => void;
  toggleGroupExpand: (gi: number) => void;
  getGroupIndexRange: (gi: number) => number[];
  onContinue: () => void;
  onClose: () => void;
}) {
  return (
    <>
      {/* ── Header ── */}
      <div className={'px-5 pt-5 pb-4 ' + (isDark ? '' : '')}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Step badge */}
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FF6B6B] to-[#FF9F43] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">1</span>
            </div>
            <div>
              <h3 className={(isDark ? 'text-white' : 'text-[#373632]') + ' text-base font-bold'}>
                Selecionar imagens
              </h3>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[11px]'}>
                Passo 1 de 2 · {productName}
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

        {/* Instrução */}
        <div className={(isDark ? 'bg-white/[0.04] border-white/[0.06]' : 'bg-[#f7f5f2] border-gray-100') + ' rounded-xl p-3 border'}>
          <p className={(isDark ? 'text-neutral-300' : 'text-gray-600') + ' text-xs leading-relaxed'}>
            <i className={'fas fa-hand-pointer mr-1.5 ' + (isDark ? 'text-[#FF9F43]' : 'text-[#FF6B6B]')} />
            Toque nas imagens para selecionar quais deseja baixar. Na próxima etapa você escolhe o tamanho e formato.
          </p>
        </div>
      </div>

      {/* ── Select all bar ── */}
      <div className={'flex items-center justify-between px-5 py-2 border-y ' + (isDark ? 'border-white/[0.06]' : 'border-gray-100')}>
        <button
          onClick={toggleAll}
          className="flex items-center gap-2 group"
        >
          <div className={
            'w-5 h-5 rounded flex items-center justify-center transition-all ' +
            (allSelected
              ? 'bg-gradient-to-br from-[#FF6B6B] to-[#FF9F43]'
              : isDark ? 'border border-white/20 group-hover:border-white/40' : 'border border-gray-300 group-hover:border-gray-400')
          }>
            {allSelected && <i className="fas fa-check text-white text-[9px]" />}
          </div>
          <span className={(isDark ? 'text-neutral-300' : 'text-gray-600') + ' text-xs font-medium'}>
            {allSelected ? 'Desmarcar todas' : 'Selecionar todas'}
          </span>
        </button>
        <span className={
          'text-[11px] font-medium px-2 py-0.5 rounded-full ' +
          (selectedCount > 0
            ? 'bg-gradient-to-r from-[#FF6B6B]/15 to-[#FF9F43]/15 text-[#FF6B6B]'
            : isDark ? 'text-neutral-600' : 'text-gray-400')
        }>
          {selectedCount} de {allImages.length}
        </span>
      </div>

      {/* ── Image grid (scrollable) ── */}
      <div className="flex-1 overflow-y-auto px-5 py-3 min-h-0">
        {isGrouped && groups ? (
          <div className="space-y-4">
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
                      {groupAllSelected ? 'Grupo selecionado' : 'Selecionar grupo'}
                    </button>
                  </div>

                  {/* Group images */}
                  {isExpanded && (
                    <div className="grid grid-cols-4 gap-2 ml-4">
                      {group.images.map((img, ii) => {
                        const flatIndex = indexes[ii];
                        return (
                          <ImageThumb
                            key={flatIndex}
                            img={img}
                            isSelected={selected.has(flatIndex)}
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
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
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

      {/* ── Footer CTA ── */}
      <div className={'px-5 py-4 border-t ' + (isDark ? 'border-white/[0.06] bg-[#1a1a1a]' : 'border-gray-100 bg-white')}>
        <button
          onClick={onContinue}
          disabled={selectedCount === 0}
          className={
            'w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-bold transition-all ' +
            (selectedCount > 0
              ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:opacity-90 shadow-lg shadow-[#FF6B6B]/25 active:scale-[0.98]'
              : isDark
                ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed')
          }
        >
          {selectedCount > 0 ? (
            <>
              <i className="fas fa-arrow-right text-xs" />
              Escolher formato ({selectedCount} {selectedCount === 1 ? 'imagem' : 'imagens'} × {DOWNLOAD_PRESETS.length} tamanhos)
            </>
          ) : (
            <>
              <i className="fas fa-hand-pointer text-xs" />
              Selecione ao menos uma imagem
            </>
          )}
        </button>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// STEP 2 — Escolha de Formato
// ═══════════════════════════════════════════════════════════════

function Step2Format({
  isDark,
  productName,
  selectedCount,
  onBack,
  onClose,
  onPresetDownload,
  onDownloadAll,
}: {
  isDark: boolean;
  productName: string;
  selectedCount: number;
  onBack: () => void;
  onClose: () => void;
  onPresetDownload: (preset: DownloadPreset) => void;
  onDownloadAll: () => void;
}) {
  return (
    <>
      {/* ── Header ── */}
      <div className={'px-5 pt-5 pb-4'}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Step badge */}
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FF6B6B] to-[#FF9F43] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">2</span>
            </div>
            <div>
              <h3 className={(isDark ? 'text-white' : 'text-[#373632]') + ' text-base font-bold'}>
                Escolher formato
              </h3>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[11px]'}>
                Passo 2 de 2 · {selectedCount} {selectedCount === 1 ? 'imagem selecionada' : 'imagens selecionadas'} · {productName}
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

        {/* Voltar */}
        <button
          onClick={onBack}
          className={(isDark ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' flex items-center gap-1.5 text-xs font-medium transition-colors'}
        >
          <i className="fas fa-arrow-left text-[10px]" />
          Voltar e alterar seleção
        </button>
      </div>

      {/* ── Format list ── */}
      <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2">
        {/* Baixar Tudo (ZIP) — destaque */}
        <button
          onClick={onDownloadAll}
          className="w-full p-4 rounded-xl text-left transition-all bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] hover:opacity-90 active:scale-[0.99] shadow-lg shadow-[#FF6B6B]/20"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <i className="fas fa-file-zipper text-white text-lg" />
            </div>
            <div>
              <p className="text-white text-sm font-bold">
                Baixar Tudo (ZIP)
              </p>
              <p className="text-white/70 text-[11px] mt-0.5">
                {selectedCount} {selectedCount === 1 ? 'imagem' : 'imagens'} × {DOWNLOAD_PRESETS.length} tamanhos = <span className="text-white font-semibold">{selectedCount * DOWNLOAD_PRESETS.length} arquivos</span> · ZIP organizado
              </p>
            </div>
            <i className="fas fa-download text-white/50 ml-auto flex-shrink-0" />
          </div>
        </button>

        {/* Separador */}
        <div className="flex items-center gap-3 py-2">
          <div className={'flex-1 h-px ' + (isDark ? 'bg-white/[0.06]' : 'bg-gray-200')} />
          <span className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[10px] uppercase tracking-wider font-medium'}>
            ou escolha um tamanho
          </span>
          <div className={'flex-1 h-px ' + (isDark ? 'bg-white/[0.06]' : 'bg-gray-200')} />
        </div>

        {/* 6 presets */}
        {DOWNLOAD_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onPresetDownload(preset)}
            className={
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all active:scale-[0.99] ' +
              (isDark
                ? 'hover:bg-white/[0.04] active:bg-white/[0.08] border border-white/[0.04]'
                : 'hover:bg-gray-50 active:bg-gray-100 border border-gray-100')
            }
          >
            <div className={
              'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ' +
              (isDark ? 'bg-white/[0.06]' : 'bg-gray-100')
            }>
              <i className={'fas fa-' + preset.icon + ' text-xs ' + (isDark ? 'text-neutral-400' : 'text-gray-500')} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={(isDark ? 'text-white' : 'text-[#373632]') + ' text-[13px] font-medium'}>
                {preset.label}
              </p>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[11px]'}>
                {preset.description} · {selectedCount} {selectedCount === 1 ? 'arquivo' : 'arquivos'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={(isDark ? 'text-neutral-600' : 'text-gray-300') + ' text-[11px] font-mono'}>
                {preset.formatLabel}
              </span>
              <i className={(isDark ? 'text-neutral-700' : 'text-gray-300') + ' fas fa-chevron-right text-[10px]'} />
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// STEP 3 — Avaliação pós-download
// ═══════════════════════════════════════════════════════════════

function Step3Rating({
  isDark,
  rating,
  toolRating,
  comment,
  isSubmitting,
  onRatingChange,
  onToolRatingChange,
  onCommentChange,
  onSubmit,
  onSkip,
}: {
  isDark: boolean;
  rating: number;
  toolRating: number;
  comment: string;
  isSubmitting: boolean;
  onRatingChange: (v: number) => void;
  onToolRatingChange: (v: number) => void;
  onCommentChange: (v: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
}) {

  return (
    <div className="px-5 py-6 flex flex-col items-center text-center">
      {/* Ícone de sucesso */}
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF6B6B] to-[#FF9F43] flex items-center justify-center mb-4">
        <i className="fas fa-check text-white text-lg" />
      </div>

      <h3 className={(isDark ? 'text-white' : 'text-[#373632]') + ' text-base font-bold mb-1'}>
        Download concluído!
      </h3>
      <p className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-xs mb-5'}>
        Avalie sua experiência
      </p>

      {/* Rating da imagem gerada */}
      <div className="w-full mb-4">
        <p className={(isDark ? 'text-neutral-300' : 'text-gray-600') + ' text-xs font-medium mb-2'}>
          <i className="fas fa-image mr-1.5 text-[#FF9F43] text-[10px]" />
          Qualidade da imagem gerada
        </p>
        <StarRating value={rating} onChange={onRatingChange} />
      </div>

      {/* Rating da ferramenta */}
      <div className={'w-full mb-1 pt-4 border-t ' + (isDark ? 'border-white/[0.06]' : 'border-gray-100')}>
        <p className={(isDark ? 'text-neutral-300' : 'text-gray-600') + ' text-xs font-medium mb-2'}>
          <i className="fas fa-wand-magic-sparkles mr-1.5 text-[#FF6B6B] text-[10px]" />
          Experiência com o Vizzu
        </p>
        <StarRating value={toolRating} onChange={onToolRatingChange} />
      </div>

      {/* Comentário (aparece após dar qualquer nota) */}
      {(rating > 0 || toolRating > 0) && (
        <div className="w-full mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <textarea
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Quer contar mais? (opcional)"
            className={
              'w-full rounded-xl px-4 py-3 text-sm resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/40 ' +
              (isDark
                ? 'bg-white/[0.06] border border-white/[0.08] text-white placeholder-neutral-600'
                : 'bg-[#f7f5f2] border border-gray-200 text-gray-800 placeholder-gray-400')
            }
          />
          <p className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[10px] text-right mt-1'}>
            {comment.length}/500
          </p>
        </div>
      )}

      {/* Botões */}
      <div className="flex items-center gap-3 w-full mt-5">
        <button
          onClick={onSkip}
          className={
            'flex-1 py-3 rounded-xl text-sm font-medium transition-colors ' +
            (isDark
              ? 'text-neutral-400 hover:text-white hover:bg-white/[0.06]'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100')
          }
        >
          Pular
        </button>
        <button
          onClick={onSubmit}
          disabled={rating === 0 || isSubmitting}
          className={
            'flex-1 py-3 rounded-xl text-sm font-bold transition-all ' +
            (rating > 0
              ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:opacity-90 shadow-lg shadow-[#FF6B6B]/25 active:scale-[0.98]'
              : isDark
                ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed')
          }
        >
          {isSubmitting ? (
            <i className="fas fa-spinner fa-spin" />
          ) : (
            <>Enviar <i className="fas fa-paper-plane ml-1.5 text-xs" /></>
          )}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Thumbnail subcomponent
// ═══════════════════════════════════════════════════════════════

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
        'relative rounded-xl overflow-hidden transition-all ' +
        (isSelected
          ? 'ring-2 ring-[#FF6B6B] ring-offset-2 ' + (isDark ? 'ring-offset-[#1a1a1a]' : 'ring-offset-white')
          : isDark ? 'hover:ring-1 hover:ring-white/20' : 'hover:ring-1 hover:ring-gray-200')
      }
    >
      <OptimizedImage
        src={img.url}
        alt={img.label}
        size="thumb"
        className={'w-full aspect-square transition-all ' + (isSelected ? '' : 'opacity-60')}
      />

      {/* Checkbox overlay */}
      <div className={
        'absolute top-1.5 left-1.5 w-5 h-5 rounded-md flex items-center justify-center transition-all ' +
        (isSelected
          ? 'bg-gradient-to-br from-[#FF6B6B] to-[#FF9F43] shadow-md'
          : 'bg-black/40 border border-white/30')
      }>
        {isSelected && <i className="fas fa-check text-white text-[8px]" />}
      </div>

      {/* Label */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1.5">
        <p className="text-white text-[9px] font-semibold truncate text-center drop-shadow-sm">
          {img.label}
        </p>
      </div>
    </button>
  );
}
