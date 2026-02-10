// ═══════════════════════════════════════════════════════════════
// VIZZU - Hook: Modo Seleção de Imagens para Download
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from 'react';
import type { DownloadableImage } from '../utils/downloadSizes';

export function useDownloadSelection(images: DownloadableImage[]) {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => {
      if (prev) setSelectedIds(new Set()); // limpa ao sair
      return !prev;
    });
  }, []);

  const toggleSelection = useCallback((index: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(images.map((_, i) => i)));
  }, [images]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedImages = useMemo(() => {
    if (!isSelectionMode || selectedIds.size === 0) return images;
    return images.filter((_, i) => selectedIds.has(i));
  }, [images, isSelectionMode, selectedIds]);

  const buttonLabel = useMemo(() => {
    if (!isSelectionMode || selectedIds.size === 0) {
      return `Baixar Tudo (${images.length})`;
    }
    return `Baixar ${selectedIds.size} selecionada${selectedIds.size > 1 ? 's' : ''}`;
  }, [isSelectionMode, selectedIds.size, images.length]);

  return {
    isSelectionMode,
    selectedIds,
    toggleSelectionMode,
    toggleSelection,
    selectAll,
    deselectAll,
    selectedImages,
    buttonLabel,
  };
}
