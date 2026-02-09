// ═══════════════════════════════════════════════════════════════
// VIZZU - Studio Edit Modal (Gerar Novamente / Correção de Imagem)
// Liquid Glass aesthetic — backdrop-blur, transparências, bordas
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
  onDeductEditCredits?: (amount: number, generationId?: string) => Promise<{ success: boolean; source?: 'edit' | 'regular' }>;
  theme?: 'dark' | 'light';
}

type ModalMode = 'input' | 'generating' | 'compare';

const ANGLE_LABELS: Record<string, string> = {
  'front': 'Frente', 'back': 'Costas', 'side-left': 'Lateral Esq.',
  'side-right': 'Lateral Dir.', '45-left': '45° Esq.', '45-right': '45° Dir.',
  'top': 'Topo', 'detail': 'Detalhe', 'front_detail': 'Detalhe Frente',
  'back_detail': 'Detalhe Costas', 'folded': 'Dobrada',
};

const MAX_REF_SIZE_MB = 10;

export const StudioEditModal: React.FC<StudioEditModalProps> = ({
  isOpen, onClose, product, currentImage, generationId,
  editBalance, regularBalance, resolution, studioBackground,
  studioShadow, productNotes, onImageUpdated, onDeductEditCredits,
  theme = 'dark',
}) => {
  const { user } = useAuth();
  const { showToast } = useUI();

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
    e.preventDefault(); e.stopPropagation(); setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
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
        if (onDeductEditCredits) {
          const deductResult = await onDeductEditCredits(creditCost, generationId);
          setLastSource(deductResult.source || (editBalance >= creditCost ? 'edit' : 'regular'));
        }
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

  // Glass card base classes
  const glassCard = isDark
    ? 'bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
    : 'bg-white/70 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.08)]';

  const glassInner = isDark
    ? 'bg-white/[0.03] border border-white/[0.06]'
    : 'bg-white/50 border border-white/40';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      {/* Backdrop — blur forte + gradiente sutil */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xl"
        onClick={handleClose}
      />

      {/* Modal Container — liquid glass */}
      <div className={
        'relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden ' +
        glassCard
      }>
        {/* ═══ HEADER ═══ */}
        <div className={
          'flex items-center justify-between px-5 py-3.5 border-b flex-shrink-0 ' +
          (isDark ? 'border-white/[0.06]' : 'border-gray-200/60')
        }>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className={
                'w-8 h-8 rounded-xl flex items-center justify-center transition-all ' +
                (isDark ? 'bg-white/[0.06] text-neutral-400 hover:bg-white/[0.12] hover:text-white' : 'bg-black/5 text-gray-500 hover:bg-black/10')
              }
            >
              <i className="fas fa-xmark text-sm"></i>
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

          {/* Credits */}
          <div className="flex items-center gap-1.5">
            {editBalance > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <i className="fas fa-pen-to-square text-emerald-400 text-[8px]"></i>
                <span className="text-emerald-400 font-semibold text-[10px]">{editBalance}</span>
              </div>
            )}
            <div className={
              'flex items-center gap-1 px-2 py-1 rounded-lg ' +
              (isDark ? 'bg-white/[0.06] border border-white/[0.08]' : 'bg-gray-100 border border-gray-200')
            }>
              <span className={(isDark ? 'text-white' : 'text-gray-900') + ' font-semibold text-[10px]'}>{regularBalance}</span>
              <i className="fas fa-coins text-yellow-400 text-[8px]"></i>
            </div>
          </div>
        </div>

        {/* ═══ CONTENT ═══ */}
        <div className="flex-1 overflow-y-auto">

          {/* ─── MODE: INPUT ────────────────────────────── */}
          {mode === 'input' && (
            <div className="p-5">
              {/* Current image — compact preview */}
              <div className={
                'rounded-xl overflow-hidden mb-4 ' + glassInner
              }>
                <div className={
                  'flex items-center justify-center p-3 ' +
                  (isDark ? 'bg-black/20' : 'bg-gray-100/50')
                }>
                  <img
                    src={currentImage.url}
                    alt={`${product.name} - ${angleName}`}
                    className="max-h-[180px] md:max-h-[220px] object-contain rounded-lg"
                  />
                </div>
                <div className={
                  'px-3 py-1.5 border-t flex items-center gap-2 ' +
                  (isDark ? 'border-white/[0.06]' : 'border-gray-200/40')
                }>
                  <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]"></div>
                  <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] uppercase tracking-wider font-medium'}>
                    {angleName}
                  </p>
                </div>
              </div>

              {/* Prompt textarea */}
              <div className="mb-3">
                <label className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-xs font-semibold mb-1.5 block'}>
                  <i className="fas fa-rotate text-[#FF6B6B] mr-1.5 text-[10px]"></i>
                  O que deseja corrigir?
                </label>
                <textarea
                  value={correctionPrompt}
                  onChange={(e) => setCorrectionPrompt(e.target.value)}
                  placeholder={'Ex: "Remover sombra no canto esquerdo"\n"A costura do bolso ficou borrada"\n"Ajustar a cor para mais próximo do original"'}
                  rows={3}
                  maxLength={500}
                  className={
                    'w-full px-3.5 py-2.5 rounded-xl text-xs resize-none transition-all focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/30 ' +
                    (isDark
                      ? 'bg-white/[0.04] border border-white/[0.08] text-white placeholder-neutral-600'
                      : 'bg-white/60 border border-gray-200/60 text-gray-900 placeholder-gray-400')
                  }
                />
                <p className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[9px] mt-1 text-right'}>
                  {correctionPrompt.length}/500
                </p>
              </div>

              {/* Reference image */}
              <div className="mb-4">
                <label className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-xs font-semibold mb-1.5 block'}>
                  <i className="fas fa-image text-[#FF9F43] mr-1.5 text-[10px]"></i>
                  Referência
                  <span className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' font-normal ml-1'}>(opcional)</span>
                </label>

                {referencePreview ? (
                  <div className={'relative rounded-xl overflow-hidden ' + glassInner}>
                    <img src={referencePreview} alt="Referência" className="w-full h-28 object-contain p-2" />
                    <button
                      onClick={() => { setReferenceBase64(null); setReferencePreview(null); }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-red-500/80 text-white flex items-center justify-center hover:bg-red-500 transition-all"
                    >
                      <i className="fas fa-xmark text-[10px]"></i>
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={
                      'rounded-xl border border-dashed p-3 text-center cursor-pointer transition-all ' +
                      (isDragging
                        ? 'border-[#FF6B6B] bg-[#FF6B6B]/10'
                        : isDark
                          ? 'border-white/[0.1] bg-white/[0.02] hover:border-white/[0.18]'
                          : 'border-gray-300/60 bg-white/30 hover:border-gray-400')
                    }
                  >
                    <i className={
                      'fas fa-cloud-arrow-up text-base mb-1 block ' +
                      (isDragging ? 'text-[#FF6B6B]' : isDark ? 'text-neutral-600' : 'text-gray-400')
                    }></i>
                    <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>
                      Arraste ou <span className="text-[#FF6B6B] font-medium">clique aqui</span>
                    </p>
                    <p className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[9px] mt-1 max-w-[260px] mx-auto leading-relaxed'}>
                      Envie uma foto do produto real mostrando como a correção deve ficar. A IA vai usar como guia visual para forma, posição ou detalhe.
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

              {/* Cost info */}
              <div className={
                'rounded-xl p-3 mb-4 ' + glassInner
              }>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-ticket text-[#FF9F43] text-[10px]"></i>
                    <span className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-[11px]'}>
                      Custo: <strong>{creditCost} crédito{creditCost > 1 ? 's' : ''}</strong>
                    </span>
                  </div>
                  {willUseRegular && editBalance === 0 ? (
                    <span className="text-amber-400 text-[10px]">
                      <i className="fas fa-info-circle mr-1"></i>Usa créditos regulares
                    </span>
                  ) : willUseRegular ? (
                    <span className="text-amber-400 text-[10px]">
                      <i className="fas fa-info-circle mr-1"></i>Edição insuficiente
                    </span>
                  ) : (
                    <span className="text-emerald-400 text-[10px]">
                      <i className="fas fa-check-circle mr-1"></i>Créditos de edição
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
                    ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:shadow-lg hover:shadow-[#FF6B6B]/25 hover:scale-[1.01] active:scale-[0.99]'
                    : isDark
                      ? 'bg-white/[0.04] text-neutral-600 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed')
                }
              >
                <i className="fas fa-rotate"></i>
                Gerar Correção
              </button>

              {!hasEnoughCredits && (
                <p className="text-red-400 text-[10px] text-center mt-2">
                  <i className="fas fa-exclamation-triangle mr-1"></i>
                  Créditos insuficientes para esta resolução
                </p>
              )}
            </div>
          )}

          {/* ─── MODE: GENERATING ───────────────────────── */}
          {mode === 'generating' && (
            <div className="flex flex-col items-center justify-center p-8 min-h-[350px]">
              <div className="relative w-16 h-16 mb-5">
                <div className={
                  'absolute inset-0 rounded-full border-2 ' +
                  (isDark ? 'border-white/[0.06]' : 'border-gray-200')
                }></div>
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#FF6B6B] animate-spin"></div>
                <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-[#FF9F43] animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <i className="fas fa-rotate text-[#FF6B6B] text-sm animate-pulse"></i>
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

          {/* ─── MODE: COMPARE ──────────────────────────── */}
          {mode === 'compare' && newImageUrl && (
            <div className="p-5">

              {/* Warning banner — regular credits */}
              {lastSource === 'regular' && (
                <div className="mb-4 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                  <i className="fas fa-info-circle text-amber-400 text-xs mt-0.5 flex-shrink-0"></i>
                  <p className="text-amber-300 text-[11px]">
                    Seus créditos de edição acabaram. Esta correção usou <strong>{creditCost} crédito{creditCost > 1 ? 's' : ''}</strong> do seu saldo regular.
                  </p>
                </div>
              )}

              {/* Before / After */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Before */}
                <div className={'rounded-xl overflow-hidden ' + glassInner}>
                  <div className={
                    'flex items-center justify-center p-3 ' +
                    (isDark ? 'bg-black/20' : 'bg-gray-100/50')
                  }>
                    <img
                      src={currentImage.url}
                      alt="Anterior"
                      className="max-h-[160px] md:max-h-[240px] object-contain rounded-lg"
                    />
                  </div>
                  <div className={
                    'px-3 py-1.5 border-t flex items-center gap-2 ' +
                    (isDark ? 'border-white/[0.06]' : 'border-gray-200/40')
                  }>
                    <div className={'w-1.5 h-1.5 rounded-full ' + (isDark ? 'bg-neutral-500' : 'bg-gray-400')}></div>
                    <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] uppercase tracking-wider font-medium'}>
                      Anterior
                    </p>
                  </div>
                </div>

                {/* After */}
                <div className="rounded-xl overflow-hidden border border-[#FF6B6B]/20 bg-[#FF6B6B]/[0.03]">
                  <div className={
                    'flex items-center justify-center p-3 ' +
                    (isDark ? 'bg-black/10' : 'bg-[#FF6B6B]/[0.02]')
                  }>
                    <img
                      src={newImageUrl}
                      alt="Nova"
                      className="max-h-[160px] md:max-h-[240px] object-contain rounded-lg"
                    />
                  </div>
                  <div className="px-3 py-1.5 border-t border-[#FF6B6B]/15 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]"></div>
                    <p className="text-[#FF6B6B] text-[9px] uppercase tracking-wider font-medium">
                      Nova
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons — lado a lado + gerar novamente embaixo */}
              <div className="flex flex-col gap-2.5">
                {/* Linha principal: Manter Original | Usar Nova Imagem */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleKeepOriginal}
                    className={
                      'py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ' +
                      (isDark
                        ? 'bg-white/[0.04] border border-white/[0.08] text-neutral-300 hover:bg-white/[0.08]'
                        : 'bg-white/60 border border-gray-200/60 text-gray-700 hover:bg-white/80')
                    }
                  >
                    <i className="fas fa-arrow-left text-xs"></i>
                    Manter Original
                  </button>

                  <button
                    onClick={handleUseNew}
                    className="py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[#FF6B6B]/25 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                  >
                    Usar Nova Imagem
                    <i className="fas fa-arrow-right text-xs"></i>
                  </button>
                </div>

                {/* Gerar novamente — discreto */}
                <button
                  onClick={handleRetry}
                  className={
                    'w-full py-2 text-xs transition-all flex items-center justify-center gap-1.5 ' +
                    (isDark ? 'text-neutral-500 hover:text-neutral-300' : 'text-gray-400 hover:text-gray-600')
                  }
                >
                  <i className="fas fa-rotate text-[10px]"></i>
                  Gerar novamente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
