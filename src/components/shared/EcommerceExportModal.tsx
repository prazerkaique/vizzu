// ═══════════════════════════════════════════════════════════════
// VIZZU - Ecommerce Export Modal (multi-imagem, multi-plataforma)
// Exporta imagens otimizadas para Shopify/Magento/VTEX
// Portal + bottom-sheet mobile + draggable
// ═══════════════════════════════════════════════════════════════

import React, { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { exportImageToShopify } from '../../lib/api/shopify';
import type { VizzuTheme } from '../../contexts/UIContext';

// ─── Types ──────────────────────────────────────────────

export interface ExportableImage {
  url: string;
  label: string;
}

type ExportType = 'add' | 'replace' | 'set_primary';
type ModalStep = 'select' | 'exporting' | 'done';

interface ExportResult {
  url: string;
  label: string;
  success: boolean;
  error?: string;
}

interface EcommerceExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: ExportableImage[];
  productId: string;
  userId: string;
  tool: string;
  platform: string;
  theme: VizzuTheme;
}

// ─── Platform Config ────────────────────────────────────

const PLATFORM_CONFIG: Record<string, { icon: string; color: string; name: string }> = {
  shopify:  { icon: 'fab fa-shopify',  color: '#96BF48', name: 'Shopify' },
  magento:  { icon: 'fab fa-magento',  color: '#F46F25', name: 'Magento' },
  vtex:     { icon: 'fas fa-store',    color: '#F71963', name: 'VTEX' },
};

const EXPORT_OPTIONS: { value: ExportType; label: string; desc: string; icon: string }[] = [
  {
    value: 'add',
    label: 'Adicionar',
    desc: 'Adiciona ao lado das fotos existentes',
    icon: 'fa-plus',
  },
  {
    value: 'replace',
    label: 'Substituir todas',
    desc: 'Remove fotos existentes e usa apenas estas',
    icon: 'fa-arrows-rotate',
  },
  {
    value: 'set_primary',
    label: 'Adicionar como principal',
    desc: 'Adiciona e define a 1a como foto de capa',
    icon: 'fa-star',
  },
];

// ─── Component ──────────────────────────────────────────

export function EcommerceExportModal({
  isOpen,
  onClose,
  images,
  productId,
  userId,
  tool,
  platform,
  theme,
}: EcommerceExportModalProps) {
  const isDark = theme !== 'light';
  const plat = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.shopify;

  // State
  const [selected, setSelected] = useState<Set<number>>(() => new Set(images.map((_, i) => i)));
  const [exportType, setExportType] = useState<ExportType>('add');
  const [step, setStep] = useState<ModalStep>('select');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ExportResult[]>([]);

  // Drag state
  const modalRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, x: 0, y: 0 });

  const resetAndClose = useCallback(() => {
    setStep('select');
    setSelected(new Set(images.map((_, i) => i)));
    setExportType('add');
    setProgress(0);
    setResults([]);
    // Reset drag position
    dragRef.current = { active: false, startX: 0, startY: 0, x: 0, y: 0 };
    if (modalRef.current) modalRef.current.style.transform = '';
    onClose();
  }, [images, onClose]);

  if (!isOpen) return null;

  const toggleImage = (idx: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === images.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(images.map((_, i) => i)));
    }
  };

  const handleExport = async () => {
    const toExport = images.filter((_, i) => selected.has(i));
    if (toExport.length === 0) return;

    setStep('exporting');
    setProgress(0);
    const exportResults: ExportResult[] = [];

    for (let i = 0; i < toExport.length; i++) {
      const img = toExport[i];
      // First image gets the chosen action, rest always "add"
      const type: ExportType = i === 0 ? exportType : (exportType === 'add' ? 'add' : 'add');

      try {
        await exportImageToShopify({
          userId,
          vizzuProductId: productId,
          imageUrl: img.url,
          exportType: type,
          tool,
        });
        exportResults.push({ url: img.url, label: img.label, success: true });
      } catch (err: any) {
        exportResults.push({
          url: img.url,
          label: img.label,
          success: false,
          error: err.message || 'Erro desconhecido',
        });
      }

      setProgress(i + 1);
    }

    setResults(exportResults);
    setStep('done');
  };

  // Drag handlers (pointer events = mouse + touch)
  const onDragStart = (e: React.PointerEvent) => {
    const d = dragRef.current;
    d.active = true;
    d.startX = e.clientX - d.x;
    d.startY = e.clientY - d.y;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onDragMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active || !modalRef.current) return;
    const d = dragRef.current;
    d.x = e.clientX - d.startX;
    d.y = e.clientY - d.startY;
    modalRef.current.style.transform = `translate(${d.x}px, ${d.y}px)`;
  };

  const onDragEnd = () => {
    dragRef.current.active = false;
  };

  const selectedCount = selected.size;
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  // ─── Styles ──────────────────────────────────────────

  const bg = isDark ? 'bg-neutral-900' : 'bg-white';
  const border = isDark ? 'border-neutral-800' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-neutral-400' : 'text-gray-500';
  const cardBorder = isDark ? 'border-neutral-700' : 'border-gray-200';

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && step !== 'exporting' && resetAndClose()}
    >
      <div
        ref={modalRef}
        className={`${bg} border ${border} rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:w-[90%] max-w-md max-h-[85vh] overflow-y-auto overflow-x-hidden`}
      >
        {/* ─── Drag handle ──────────────────────── */}
        <div
          className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing touch-none select-none"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
        >
          <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-neutral-600' : 'bg-gray-300'}`} />
        </div>

        {/* ─── Header ──────────────────────────────── */}
        <div className={`flex items-center justify-between px-4 py-2 border-b ${isDark ? 'border-neutral-800' : 'border-gray-100'}`}>
          <div className="flex items-center gap-2">
            <i className={`${plat.icon} text-sm`} style={{ color: plat.color }} />
            <h3 className={`${textPrimary} font-semibold text-sm`}>
              Exportar para {plat.name}
            </h3>
          </div>
          {step !== 'exporting' && (
            <button
              onClick={resetAndClose}
              className={`${isDark ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-700'} transition-colors`}
            >
              <i className="fas fa-times text-sm" />
            </button>
          )}
        </div>

        {/* ─── Step: Select ─────────────────────────── */}
        {step === 'select' && (
          <>
            {/* Image Grid */}
            <div className="px-4 pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs ${textSecondary}`}>
                  {selectedCount} de {images.length} selecionada{images.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={toggleAll}
                  className="text-xs font-medium text-[#FF6B6B] hover:text-[#FF9F43] transition-colors"
                >
                  {selected.size === images.length ? 'Desmarcar tudo' : 'Selecionar tudo'}
                </button>
              </div>

              <div
                className={`grid gap-2 ${
                  images.length === 1 ? 'grid-cols-1' :
                  images.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'
                }`}
                style={{ maxHeight: '200px', overflowY: 'auto' }}
              >
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleImage(idx)}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                      selected.has(idx)
                        ? 'border-[#FF6B6B] ring-1 ring-[#FF6B6B]/30'
                        : `${cardBorder} border opacity-60`
                    }`}
                    style={{ aspectRatio: '1' }}
                  >
                    <img
                      src={img.url}
                      alt={img.label}
                      className="w-full h-full object-cover"
                    />
                    {/* Checkbox */}
                    <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-md flex items-center justify-center text-[10px] ${
                      selected.has(idx)
                        ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white'
                        : `${isDark ? 'bg-black/50' : 'bg-white/80'} ${textSecondary}`
                    }`}>
                      {selected.has(idx) && <i className="fas fa-check" />}
                    </div>
                    {/* Label */}
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1.5 py-0.5">
                      <span className="text-white text-[9px] font-medium truncate block">
                        {img.label}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Export Type Options */}
            <div className="px-4 py-3 space-y-1.5">
              {EXPORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setExportType(opt.value)}
                  className={`w-full text-left p-2 rounded-xl border transition-all flex items-center gap-2.5 ${
                    exportType === opt.value
                      ? `border-[#FF6B6B] ${isDark ? 'bg-neutral-800' : 'bg-orange-50'}`
                      : `${cardBorder} border ${isDark ? 'bg-neutral-900 hover:bg-neutral-800' : 'bg-white hover:bg-gray-50'}`
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    exportType === opt.value
                      ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white'
                      : `${isDark ? 'bg-neutral-700 text-neutral-400' : 'bg-gray-100 text-gray-500'}`
                  }`}>
                    <i className={`fas ${opt.icon} text-[10px]`} />
                  </div>
                  <div>
                    <p className={`${textPrimary} font-medium text-xs`}>{opt.label}</p>
                    <p className={`${textSecondary} text-[10px]`}>{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* CTA */}
            <div className={`px-4 py-3 border-t ${isDark ? 'border-neutral-800' : 'border-gray-100'}`}>
              <button
                onClick={handleExport}
                disabled={selectedCount === 0}
                className={`w-full py-2.5 rounded-xl font-semibold text-xs text-white transition-all ${
                  selectedCount === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] hover:opacity-90'
                }`}
              >
                <i className={`${plat.icon} mr-1.5`} />
                Exportar {selectedCount} {selectedCount === 1 ? 'imagem' : 'imagens'}
              </button>
            </div>
          </>
        )}

        {/* ─── Step: Exporting ─────────────────────── */}
        {step === 'exporting' && (
          <div className="px-4 py-8 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] flex items-center justify-center">
              <i className="fas fa-spinner fa-spin text-white text-lg" />
            </div>
            <div className="text-center">
              <p className={`${textPrimary} font-semibold text-sm`}>
                Exportando para {plat.name}...
              </p>
              <p className={`${textSecondary} text-xs mt-1`}>
                {progress} de {selectedCount} {selectedCount === 1 ? 'imagem' : 'imagens'}
              </p>
            </div>
            {/* Progress bar */}
            <div className={`w-full h-2 rounded-full ${isDark ? 'bg-neutral-800' : 'bg-gray-200'}`}>
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] transition-all duration-300"
                style={{ width: `${(progress / selectedCount) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* ─── Step: Done ──────────────────────────── */}
        {step === 'done' && (
          <div className="px-4 py-6">
            {/* Summary */}
            <div className="flex flex-col items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                failCount === 0
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-yellow-500/10 text-yellow-500'
              }`}>
                <i className={`fas ${failCount === 0 ? 'fa-check' : 'fa-exclamation-triangle'} text-lg`} />
              </div>
              <div className="text-center">
                <p className={`${textPrimary} font-semibold text-sm`}>
                  {failCount === 0 ? 'Exportação concluída!' : 'Exportação parcial'}
                </p>
                <p className={`${textSecondary} text-xs mt-1`}>
                  {successCount > 0 && (
                    <span className="text-green-500">
                      {successCount} enviada{successCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  {successCount > 0 && failCount > 0 && ' · '}
                  {failCount > 0 && (
                    <span className="text-red-500">
                      {failCount} com erro
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Error details */}
            {failCount > 0 && (
              <div className={`rounded-xl p-3 mb-4 ${isDark ? 'bg-red-500/10' : 'bg-red-50'} border ${isDark ? 'border-red-500/20' : 'border-red-200'}`}>
                {results.filter(r => !r.success).map((r, i) => (
                  <p key={i} className="text-red-500 text-[10px]">
                    <strong>{r.label}:</strong> {r.error}
                  </p>
                ))}
              </div>
            )}

            {/* Close */}
            <button
              onClick={resetAndClose}
              className="w-full py-2.5 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] hover:opacity-90 transition-all"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
