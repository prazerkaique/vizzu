// ═══════════════════════════════════════════════════════════════
// VIZZU - Studio Edit Modal (Edição/Correção de Imagem Gerada)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useCallback } from 'react';
import { Product, ProductStudioImage, ProductStudioSession } from '../../types';
import { editStudioImage, StudioBackground, StudioShadow } from '../../lib/api/studio';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';

interface StudioEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  currentImage: ProductStudioImage;
  generationId: string;
  session: ProductStudioSession;
  editBalance: number;
  regularBalance: number;
  resolution: '2k' | '4k';
  studioBackground?: StudioBackground;
  studioShadow?: StudioShadow;
  productNotes?: string;
  onImageUpdated: (angle: string, newUrl: string) => void;
  onDeductEditCredits: (amount: number, generationId?: string) => Promise<{ success: boolean; source?: 'edit' | 'regular' }>;
  theme?: 'dark' | 'light';
}

type ModalMode = 'input' | 'generating' | 'compare';

// Angle labels in Portuguese (reused from ProductStudioResult)
const ANGLE_LABELS: Record<string, string> = {
  'front': 'Frente',
  'back': 'Costas',
  'side-left': 'Lateral Esq.',
  'side-right': 'Lateral Dir.',
  '45-left': '45° Esq.',
  '45-right': '45° Dir.',
  'top': 'Topo',
  'detail': 'Detalhe',
  'front_detail': 'Detalhe Frente',
  'back_detail': 'Detalhe Costas',
  'folded': 'Dobrada',
};

const MAX_REF_SIZE_MB = 10;

export const StudioEditModal: React.FC<StudioEditModalProps> = ({
  isOpen,
  onClose,
  product,
  currentImage,
  generationId,
  editBalance,
  regularBalance,
  resolution,
  studioBackground,
  studioShadow,
  productNotes,
  onImageUpdated,
  onDeductEditCredits,
  theme = 'dark',
}) => {
  const { user } = useAuth();
  const { showToast } = useUI();

  // ── State ──────────────────────────────────────────────────
  const [mode, setMode] = useState<ModalMode>('input');
  const [correctionPrompt, setCorrectionPrompt] = useState('');
  const [referenceBase64, setReferenceBase64] = useState<string | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null);
  const [lastSource, setLastSource] = useState<'edit' | 'regular' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const creditCost = resolution === '4k' ? 2 : 1;
  const totalAvailable = editBalance + regularBalance;
  const hasEnoughCredits = totalAvailable >= creditCost;
  const willUseRegular = editBalance < creditCost;

  const isDark = theme === 'dark';

  // ── Helpers ────────────────────────────────────────────────

  const resetModal = useCallback(() => {
    setMode('input');
    setCorrectionPrompt('');
    setReferenceBase64(null);
    setReferencePreview(null);
    setNewImageUrl(null);
    setLastSource(null);
    setIsDragging(false);
    setIsGenerating(false);
  }, []);

  const handleClose = useCallback(() => {
    resetModal();
    onClose();
  }, [resetModal, onClose]);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Selecione uma imagem (JPG, PNG, WebP)', 'error');
      return;
    }
    if (file.size > MAX_REF_SIZE_MB * 1024 * 1024) {
      showToast(`Imagem muito grande (máx ${MAX_REF_SIZE_MB}MB)`, 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setReferenceBase64(result);
      setReferencePreview(result);
    };
    reader.readAsDataURL(file);
  }, [showToast]);

  // ── Drag & Drop ────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (e.target) e.target.value = '';
  }, [processFile]);

  // ── Generate ───────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!correctionPrompt.trim()) {
      showToast('Descreva a correção desejada', 'error');
      return;
    }
    if (!hasEnoughCredits) {
      showToast('Créditos insuficientes', 'error');
      return;
    }
    if (!user) return;

    setMode('generating');
    setIsGenerating(true);

    try {
      const result = await editStudioImage({
        userId: user.id,
        productId: product.id,
        generationId,
        angle: currentImage.angle,
        currentImageUrl: currentImage.url,
        correctionPrompt: correctionPrompt.trim(),
        referenceImageBase64: referenceBase64 || undefined,
        resolution,
        productInfo: { name: product.name, category: product.category },
        studioBackground,
        studioShadow,
        productNotes,
      });

      if (result.success && result.new_image_url) {
        // Debit credits
        const deductResult = await onDeductEditCredits(creditCost, generationId);
        setLastSource(deductResult.source || (editBalance >= creditCost ? 'edit' : 'regular'));
        setNewImageUrl(result.new_image_url);
        setMode('compare');
      } else {
        showToast(result.error || 'Erro ao gerar correção. Tente novamente.', 'error');
        setMode('input');
      }
    } catch (err) {
      console.error('[StudioEditModal] Error:', err);
      showToast('Erro de rede. Verifique sua conexão.', 'error');
      setMode('input');
    } finally {
      setIsGenerating(false);
    }
  }, [
    correctionPrompt, hasEnoughCredits, user, product, generationId, currentImage,
    referenceBase64, resolution, studioBackground, studioShadow, productNotes,
    creditCost, editBalance, onDeductEditCredits, showToast,
  ]);

  // ── Compare Actions ────────────────────────────────────────

  const handleUseNew = useCallback(() => {
    if (newImageUrl) {
      onImageUpdated(currentImage.angle, newImageUrl);
      showToast('Imagem atualizada!', 'success');
      handleClose();
    }
  }, [newImageUrl, currentImage.angle, onImageUpdated, showToast, handleClose]);

  const handleKeepOriginal = useCallback(() => {
    showToast('Imagem original mantida', 'info');
    handleClose();
  }, [showToast, handleClose]);

  const handleRetry = useCallback(() => {
    setNewImageUrl(null);
    setLastSource(null);
    setMode('input');
  }, []);

  // ── Render ─────────────────────────────────────────────────

  if (!isOpen) return null;

  const angleName = ANGLE_LABELS[currentImage.angle] || currentImage.angle;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal Container */}
      <div className={
        'relative z-10 flex flex-col w-full h-full max-w-4xl mx-auto overflow-hidden ' +
        (isDark ? 'bg-neutral-950' : 'bg-white')
      }>
        {/* ═══════════════════════════════════════════════════════ */}
        {/* HEADER */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className={
          'flex items-center justify-between px-4 py-3 border-b flex-shrink-0 ' +
          (isDark ? 'border-neutral-800 bg-neutral-900' : 'border-gray-200 bg-gray-50')
        }>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className={
                'w-9 h-9 rounded-xl flex items-center justify-center transition-all ' +
                (isDark ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300')
              }
            >
              <i className="fas fa-arrow-left text-sm"></i>
            </button>
            <div>
              <h2 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold'}>
                Gerar novamente
              </h2>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>
                {angleName} — {product.name}
              </p>
            </div>
          </div>

          {/* Credits badge */}
          <div className="flex items-center gap-2">
            {editBalance > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/15 rounded-lg">
                <i className="fas fa-pen-to-square text-emerald-400 text-[9px]"></i>
                <span className="text-emerald-400 font-semibold text-[10px]">{editBalance}</span>
              </div>
            )}
            <div className={
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg ' +
              (isDark ? 'bg-neutral-800' : 'bg-gray-100')
            }>
              <span className={(isDark ? 'text-white' : 'text-gray-900') + ' font-semibold text-[10px]'}>{regularBalance}</span>
              <i className="fas fa-coins text-yellow-400 text-[9px]"></i>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* CONTENT */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="flex-1 overflow-y-auto">

          {/* ─── MODE: INPUT ────────────────────────────────── */}
          {mode === 'input' && (
            <div className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

                {/* Current image preview */}
                <div className={
                  'rounded-xl overflow-hidden border ' +
                  (isDark ? 'border-neutral-800 bg-neutral-900' : 'border-gray-200 bg-gray-50')
                }>
                  <div className={
                    'px-3 py-2 border-b ' +
                    (isDark ? 'border-neutral-800' : 'border-gray-200')
                  }>
                    <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] uppercase tracking-wide'}>
                      Imagem Atual — {angleName}
                    </p>
                  </div>
                  <div className={
                    'flex items-center justify-center p-4 min-h-[200px] md:min-h-[300px] ' +
                    (isDark ? 'bg-neutral-800/50' : 'bg-gray-100')
                  }>
                    <img
                      src={currentImage.url}
                      alt={`${product.name} - ${angleName}`}
                      className="max-w-full max-h-[180px] md:max-h-[280px] object-contain rounded-lg"
                    />
                  </div>
                </div>

                {/* Correction form */}
                <div className="flex flex-col gap-3">

                  {/* Prompt textarea */}
                  <div>
                    <label className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-xs font-semibold mb-1.5 block'}>
                      <i className="fas fa-pen-to-square text-[#FF6B6B] mr-1.5 text-[10px]"></i>
                      O que deseja corrigir?
                    </label>
                    <textarea
                      value={correctionPrompt}
                      onChange={(e) => setCorrectionPrompt(e.target.value)}
                      placeholder={'Ex: "Remover sombra no canto esquerdo"\n"A costura do bolso ficou borrada"\n"Ajustar a cor para mais próximo do original"\n"O zipper deveria ter 2 puxadores, não 1"'}
                      rows={4}
                      maxLength={500}
                      className={
                        'w-full px-3 py-2.5 rounded-xl text-xs resize-none transition-all focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/40 ' +
                        (isDark
                          ? 'bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500'
                          : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400')
                      }
                    />
                    <p className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[9px] mt-1 text-right'}>
                      {correctionPrompt.length}/500
                    </p>
                  </div>

                  {/* Reference image drop zone */}
                  <div>
                    <label className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-xs font-semibold mb-1.5 block'}>
                      <i className="fas fa-image text-[#FF9F43] mr-1.5 text-[10px]"></i>
                      Imagem de referência
                      <span className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' font-normal ml-1'}>(opcional)</span>
                    </label>

                    {referencePreview ? (
                      // Preview of uploaded reference
                      <div className={
                        'relative rounded-xl overflow-hidden border ' +
                        (isDark ? 'border-neutral-700 bg-neutral-800' : 'border-gray-300 bg-gray-50')
                      }>
                        <img
                          src={referencePreview}
                          alt="Referência"
                          className="w-full h-32 object-contain p-2"
                        />
                        <button
                          onClick={() => { setReferenceBase64(null); setReferencePreview(null); }}
                          className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-red-500/80 text-white flex items-center justify-center hover:bg-red-500 transition-all"
                        >
                          <i className="fas fa-times text-xs"></i>
                        </button>
                      </div>
                    ) : (
                      // Drop zone
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={
                          'rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all ' +
                          (isDragging
                            ? 'border-[#FF6B6B] bg-[#FF6B6B]/10'
                            : isDark
                              ? 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-600'
                              : 'border-gray-300 bg-gray-50 hover:border-gray-400')
                        }
                      >
                        <i className={
                          'fas fa-cloud-arrow-up text-lg mb-1.5 block ' +
                          (isDragging ? 'text-[#FF6B6B]' : isDark ? 'text-neutral-600' : 'text-gray-400')
                        }></i>
                        <p className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px]'}>
                          Arraste uma imagem ou <span className="text-[#FF6B6B] font-medium">clique aqui</span>
                        </p>
                        <p className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[9px] mt-0.5'}>
                          Use para corrigir forma, posição ou detalhes
                        </p>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Cost & credits info */}
                  <div className={
                    'rounded-xl border p-3 ' +
                    (isDark ? 'border-neutral-800 bg-neutral-900' : 'border-gray-200 bg-gray-50')
                  }>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <i className="fas fa-ticket text-[#FF9F43] text-xs"></i>
                        <span className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-xs'}>
                          Custo: <strong>{creditCost} crédito{creditCost > 1 ? 's' : ''}</strong>
                        </span>
                      </div>
                      {willUseRegular && editBalance === 0 ? (
                        <span className="text-amber-400 text-[10px] font-medium">
                          <i className="fas fa-info-circle mr-1"></i>
                          Usa créditos regulares
                        </span>
                      ) : willUseRegular ? (
                        <span className="text-amber-400 text-[10px] font-medium">
                          <i className="fas fa-info-circle mr-1"></i>
                          Edição insuficiente
                        </span>
                      ) : (
                        <span className="text-emerald-400 text-[10px] font-medium">
                          <i className="fas fa-check-circle mr-1"></i>
                          Créditos de edição
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Generate button */}
                  <button
                    onClick={handleGenerate}
                    disabled={!correctionPrompt.trim() || !hasEnoughCredits}
                    className={
                      'w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ' +
                      (correctionPrompt.trim() && hasEnoughCredits
                        ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:opacity-90'
                        : isDark
                          ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed')
                    }
                  >
                    <i className="fas fa-wand-magic-sparkles"></i>
                    Gerar Correção
                  </button>

                  {!hasEnoughCredits && (
                    <p className="text-red-400 text-[10px] text-center">
                      <i className="fas fa-exclamation-triangle mr-1"></i>
                      Créditos insuficientes para esta resolução
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── MODE: GENERATING ───────────────────────────── */}
          {mode === 'generating' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[400px]">
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 rounded-full border-2 border-neutral-800"></div>
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#FF6B6B] animate-spin"></div>
                <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-[#FF9F43] animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <i className="fas fa-wand-magic-sparkles text-[#FF6B6B] text-sm"></i>
                </div>
              </div>
              <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-1'}>
                Gerando correção...
              </p>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>
                Isso pode levar alguns segundos
              </p>
            </div>
          )}

          {/* ─── MODE: COMPARE ──────────────────────────────── */}
          {mode === 'compare' && newImageUrl && (
            <div className="p-4 md:p-6">

              {/* Warning banner when using regular credits */}
              {lastSource === 'regular' && (
                <div className="mb-4 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
                  <i className="fas fa-info-circle text-amber-400 text-xs mt-0.5 flex-shrink-0"></i>
                  <p className="text-amber-300 text-[11px]">
                    Seus créditos de edição acabaram. Esta correção usou <strong>{creditCost} crédito{creditCost > 1 ? 's' : ''}</strong> do seu saldo regular.
                  </p>
                </div>
              )}

              {/* Before / After comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Before */}
                <div className={
                  'rounded-xl overflow-hidden border ' +
                  (isDark ? 'border-neutral-800 bg-neutral-900' : 'border-gray-200 bg-gray-50')
                }>
                  <div className={
                    'px-3 py-2 border-b flex items-center gap-2 ' +
                    (isDark ? 'border-neutral-800' : 'border-gray-200')
                  }>
                    <div className="w-2 h-2 rounded-full bg-neutral-500"></div>
                    <p className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide font-semibold'}>
                      Anterior
                    </p>
                  </div>
                  <div className={
                    'flex items-center justify-center p-4 min-h-[200px] md:min-h-[300px] ' +
                    (isDark ? 'bg-neutral-800/50' : 'bg-gray-100')
                  }>
                    <img
                      src={currentImage.url}
                      alt="Imagem anterior"
                      className="max-w-full max-h-[180px] md:max-h-[280px] object-contain rounded-lg"
                    />
                  </div>
                </div>

                {/* After */}
                <div className="rounded-xl overflow-hidden border border-[#FF6B6B]/30 bg-[#FF6B6B]/5">
                  <div className="px-3 py-2 border-b border-[#FF6B6B]/20 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]"></div>
                    <p className="text-[#FF6B6B] text-[10px] uppercase tracking-wide font-semibold">
                      Nova
                    </p>
                  </div>
                  <div className={
                    'flex items-center justify-center p-4 min-h-[200px] md:min-h-[300px] ' +
                    (isDark ? 'bg-neutral-800/30' : 'bg-gray-50')
                  }>
                    <img
                      src={newImageUrl}
                      alt="Nova imagem"
                      className="max-w-full max-h-[180px] md:max-h-[280px] object-contain rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleUseNew}
                  className="w-full py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  <i className="fas fa-check-circle"></i>
                  Usar Nova Imagem
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleKeepOriginal}
                    className={
                      'py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ' +
                      (isDark
                        ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                    }
                  >
                    <i className="fas fa-undo text-xs"></i>
                    Manter Original
                  </button>

                  <button
                    onClick={handleRetry}
                    className={
                      'py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 border ' +
                      (isDark
                        ? 'border-neutral-700 text-neutral-300 hover:bg-neutral-800'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50')
                    }
                  >
                    <i className="fas fa-rotate text-xs"></i>
                    Corrigir Novamente
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
