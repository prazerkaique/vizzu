// ═══════════════════════════════════════════════════════════════
// VIZZU - Image Edit Modal (Genérico — reutilizável para PS, CS, LC)
// Liquid Glass aesthetic — backdrop-blur, transparências, bordas
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ZoomableImage } from '../ImageViewer';
import { useUI } from '../../contexts/UIContext';

interface GenerateResult {
  success: boolean;
  new_image_url?: string;
  credits_deducted?: boolean;
  credit_source?: string;
  error?: string;
}

export interface ImageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentImageUrl: string;
  imageName: string;
  editBalance: number;
  regularBalance: number;
  resolution: '2k' | '4k';
  onGenerate: (params: {
    correctionPrompt: string;
    referenceImageBase64?: string;
  }) => Promise<GenerateResult>;
  onSave: (newImageUrl: string) => Promise<{ success: boolean }>;
  onSaveAsNew?: (newImageUrl: string) => Promise<{ success: boolean }>;
  onDeductEditCredits?: (amount: number) => Promise<{ success: boolean; source?: string }>;
  theme?: 'dark' | 'light';
}

type ModalMode = 'input' | 'generating' | 'compare';

const MAX_REF_SIZE_MB = 10;

const EDIT_LOADING_PHRASES = [
  "Analisando a imagem original...",
  "Entendendo a correção solicitada...",
  "Aplicando os ajustes com IA...",
  "Refinando detalhes da edição...",
  "Preservando a qualidade original...",
  "Ajustando cores e iluminação...",
  "Renderizando resultado final...",
  "Quase pronto! Últimos retoques...",
];

export const ImageEditModal: React.FC<ImageEditModalProps> = ({
  isOpen, onClose, currentImageUrl, imageName,
  editBalance, regularBalance, resolution,
  onGenerate, onSave, onSaveAsNew, onDeductEditCredits,
  theme = 'dark',
}) => {
  const { showToast } = useUI();

  const [mode, setMode] = useState<ModalMode>('input');
  const [correctionPrompt, setCorrectionPrompt] = useState('');
  const [referenceBase64, setReferenceBase64] = useState<string | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null);
  const [lastSource, setLastSource] = useState<'edit' | 'regular' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Zoom state
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [hoverTarget, setHoverTarget] = useState<'before' | 'after' | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Loading phrase rotation
  const [phraseIndex, setPhraseIndex] = useState(0);
  useEffect(() => {
    if (mode !== 'generating') return;
    setPhraseIndex(0);
    const interval = setInterval(() => {
      setPhraseIndex(prev => (prev + 1) % EDIT_LOADING_PHRASES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [mode]);

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
    setZoomImage(null);
    setHoverTarget(null);
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

  // ── Desktop hover zoom ────────────────────────────────────

  const handleImageMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, target: 'before' | 'after') => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
    setHoverTarget(target);
  }, []);

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

    setMode('generating');
    setIsGenerating(true);

    try {
      const result = await onGenerate({
        correctionPrompt: correctionPrompt.trim(),
        referenceImageBase64: referenceBase64 || undefined,
      });

      if (result.success && result.new_image_url) {
        if (result.credits_deducted) {
          setLastSource((result.credit_source as 'edit' | 'regular') || (editBalance >= creditCost ? 'edit' : 'regular'));
        } else if (onDeductEditCredits) {
          const deductResult = await onDeductEditCredits(creditCost);
          setLastSource((deductResult.source as 'edit' | 'regular') || (editBalance >= creditCost ? 'edit' : 'regular'));
        }
        setNewImageUrl(result.new_image_url);
        setMode('compare');
      } else {
        showToast(result.error || 'Erro ao gerar correção. Tente novamente.', 'error');
        setMode('input');
      }
    } catch (err) {
      console.error('[ImageEditModal] Error:', err);
      showToast('Erro de rede. Verifique sua conexão.', 'error');
      setMode('input');
    } finally {
      setIsGenerating(false);
    }
  }, [correctionPrompt, hasEnoughCredits, referenceBase64, creditCost, editBalance, onGenerate, onDeductEditCredits, showToast]);

  // ── Compare Actions ────────────────────────────────────────

  const handleUseNew = useCallback(async () => {
    if (!newImageUrl) return;

    try {
      const result = await onSave(newImageUrl);
      if (result.success) {
        showToast('Imagem atualizada!', 'success');
        handleClose();
      } else {
        console.error('[ImageEditModal] Save falhou:', result);
        showToast('Erro ao salvar imagem no servidor. Tente novamente.', 'error');
      }
    } catch (err) {
      console.error('[ImageEditModal] Erro ao salvar edição:', err);
      showToast('Erro de conexão ao salvar. Tente novamente.', 'error');
    }
  }, [newImageUrl, onSave, showToast, handleClose]);

  const handleKeepOriginal = useCallback(() => {
    showToast('Imagem original mantida', 'info');
    handleClose();
  }, [showToast, handleClose]);

  const handleSaveAsNew = useCallback(async () => {
    if (!newImageUrl || !onSaveAsNew) return;
    try {
      const result = await onSaveAsNew(newImageUrl);
      if (result.success) {
        showToast('Imagem salva como nova variação!', 'success');
        handleClose();
      } else {
        console.error('[ImageEditModal] SaveAsNew falhou:', result);
        showToast('Erro ao salvar nova variação. Tente novamente.', 'error');
      }
    } catch (err) {
      console.error('[ImageEditModal] Erro ao salvar como nova:', err);
      showToast('Erro de conexão ao salvar. Tente novamente.', 'error');
    }
  }, [newImageUrl, onSaveAsNew, showToast, handleClose]);

  const handleRetry = useCallback(() => {
    setNewImageUrl(null);
    setLastSource(null);
    setZoomImage(null);
    setHoverTarget(null);
    setMode('input');
  }, []);

  // ── Render ─────────────────────────────────────────────────

  if (!isOpen) return null;

  const glassCard = isDark
    ? 'bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
    : 'bg-white/70 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.08)]';

  const glassInner = isDark
    ? 'bg-white/[0.03] border border-white/[0.06]'
    : 'bg-white/50 border border-white/40';

  const renderCompareImage = (src: string, label: string, target: 'before' | 'after') => {
    const isActive = hoverTarget === target;
    const isBefore = target === 'before';

    return (
      <div className={
        'rounded-xl overflow-hidden ' +
        (isBefore ? glassInner : 'border border-[#FF6B6B]/20 bg-[#FF6B6B]/[0.03]')
      }>
        <div
          className={
            'relative flex items-center justify-center p-2 md:p-3 cursor-zoom-in overflow-hidden ' +
            (isDark
              ? (isBefore ? 'bg-black/20' : 'bg-black/10')
              : (isBefore ? 'bg-gray-100/50' : 'bg-[#FF6B6B]/[0.02]'))
          }
          onMouseEnter={() => setHoverTarget(target)}
          onMouseLeave={() => setHoverTarget(null)}
          onMouseMove={(e) => handleImageMouseMove(e, target)}
          onClick={() => setZoomImage(src)}
        >
          <img
            src={src}
            alt={label}
            className={
              'max-h-[200px] md:max-h-[320px] object-contain rounded-lg transition-opacity duration-150 ' +
              (isActive ? 'lg:opacity-0' : 'opacity-100')
            }
          />
          {isActive && (
            <div
              className="hidden lg:block absolute inset-0 bg-no-repeat"
              style={{
                backgroundImage: `url(${src})`,
                backgroundPosition: `${mousePos.x}% ${mousePos.y}%`,
                backgroundSize: '250%',
              }}
            />
          )}
          <div className={
            'hidden lg:flex absolute bottom-2 right-2 w-7 h-7 rounded-lg items-center justify-center transition-all pointer-events-none ' +
            (isDark ? 'bg-black/50 text-white/70' : 'bg-white/70 text-gray-600')
          }>
            <i className="fas fa-search-plus text-xs"></i>
          </div>
          <div className={
            'lg:hidden absolute bottom-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center pointer-events-none ' +
            (isDark ? 'bg-black/50 text-white/70' : 'bg-white/70 text-gray-600')
          }>
            <i className="fas fa-expand text-xs"></i>
          </div>
        </div>
        <div className={
          'px-3 py-1.5 border-t flex items-center gap-2 ' +
          (isBefore
            ? (isDark ? 'border-white/[0.06]' : 'border-gray-200/40')
            : 'border-[#FF6B6B]/15')
        }>
          <div className={
            'w-1.5 h-1.5 rounded-full ' +
            (isBefore
              ? (isDark ? 'bg-neutral-500' : 'bg-gray-400')
              : 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]')
          }></div>
          <p className={
            'text-[9px] uppercase tracking-wider font-medium ' +
            (isBefore
              ? (isDark ? 'text-neutral-500' : 'text-gray-500')
              : 'text-[#FF6B6B]')
          }>
            {label}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={handleClose} />

      <div className={
        'relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden ' + glassCard
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
                Editar imagem
              </h2>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>
                {imageName}
              </p>
            </div>
          </div>

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

          {/* ─── MODE: INPUT ─── */}
          {mode === 'input' && (
            <div className="p-5">
              <div className={'rounded-xl overflow-hidden mb-4 ' + glassInner}>
                <div className={
                  'flex items-center justify-center p-3 ' +
                  (isDark ? 'bg-black/20' : 'bg-gray-100/50')
                }>
                  <img
                    src={currentImageUrl}
                    alt={imageName}
                    className="max-h-[180px] md:max-h-[220px] object-contain rounded-lg"
                  />
                </div>
                <div className={
                  'px-3 py-1.5 border-t flex items-center gap-2 ' +
                  (isDark ? 'border-white/[0.06]' : 'border-gray-200/40')
                }>
                  <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]"></div>
                  <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] uppercase tracking-wider font-medium'}>
                    {imageName}
                  </p>
                </div>
              </div>

              <div className="mb-3">
                <label className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-xs font-semibold mb-1.5 block'}>
                  <i className="fas fa-rotate text-[#FF6B6B] mr-1.5 text-[10px]"></i>
                  O que deseja corrigir?
                </label>
                <textarea
                  value={correctionPrompt}
                  onChange={(e) => setCorrectionPrompt(e.target.value)}
                  placeholder={'Ex: "Remover reflexo na mesa"\n"Ajustar a iluminação do lado esquerdo"\n"A cor do produto ficou diferente do original"'}
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
                    <p className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[9px] mt-1.5 max-w-[280px] mx-auto leading-relaxed'}>
                      <strong className={isDark ? 'text-neutral-500' : 'text-gray-500'}>O que é isso?</strong> Envie uma foto <strong>real do produto</strong> para mostrar à IA como a correção deve ficar. Exemplo: se a costura ficou errada na imagem gerada, envie uma foto real mostrando a costura correta. <strong>Não é obrigatório</strong> — serve apenas como guia visual.
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

              <div className={'rounded-xl p-3 mb-4 ' + glassInner}>
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

          {/* ─── MODE: GENERATING ─── */}
          {mode === 'generating' && (
            <div className="flex flex-col items-center justify-center p-8 min-h-[350px]">
              {/* Motion GIF (padrão Vizzu — Scene-1.gif) */}
              <div className="w-40 h-40 mb-5 rounded-2xl overflow-hidden flex items-center justify-center">
                <img
                  src="/Scene-1.gif"
                  alt=""
                  className="h-full object-cover"
                  style={{ width: '140%', maxWidth: 'none' }}
                />
              </div>
              <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-1'}>
                Gerando correção...
              </p>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs text-center min-h-[16px] transition-all duration-300'}>
                {EDIT_LOADING_PHRASES[phraseIndex]}
              </p>
            </div>
          )}

          {/* ─── MODE: COMPARE ─── */}
          {mode === 'compare' && newImageUrl && (
            <div className="p-5">
              {lastSource === 'regular' && (
                <div className="mb-4 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                  <i className="fas fa-info-circle text-amber-400 text-xs mt-0.5 flex-shrink-0"></i>
                  <p className="text-amber-300 text-[11px]">
                    Seus créditos de edição acabaram. Esta correção usou <strong>{creditCost} crédito{creditCost > 1 ? 's' : ''}</strong> do seu saldo regular.
                  </p>
                </div>
              )}

              <p className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[9px] text-center mb-2'}>
                <i className="fas fa-search-plus mr-1"></i>
                <span className="hidden lg:inline">Passe o mouse para ampliar ou clique para tela cheia</span>
                <span className="lg:hidden">Toque na imagem para ampliar</span>
              </p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {renderCompareImage(currentImageUrl, 'Anterior', 'before')}
                {renderCompareImage(newImageUrl, 'Nova', 'after')}
              </div>

              <div className="flex flex-col gap-2.5">
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

                {onSaveAsNew && (
                  <button
                    onClick={handleSaveAsNew}
                    className={
                      'w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ' +
                      (isDark
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100')
                    }
                  >
                    <i className="fas fa-copy text-xs"></i>
                    Salvar como Nova
                  </button>
                )}

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

      {/* ═══ FULLSCREEN ZOOM MODAL ═══ */}
      {zoomImage && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black/95" onClick={() => setZoomImage(null)}>
          <div
            className="flex items-center justify-between p-4 flex-shrink-0"
            style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 1rem))' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 bg-white/10 rounded-lg p-1">
              <button
                onClick={() => setZoomImage(currentImageUrl)}
                className={
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all ' +
                  (zoomImage === currentImageUrl ? 'bg-white text-black' : 'text-white/70 hover:text-white')
                }
              >
                Anterior
              </button>
              {newImageUrl && (
                <button
                  onClick={() => setZoomImage(newImageUrl)}
                  className={
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-all ' +
                    (zoomImage === newImageUrl
                      ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white'
                      : 'text-white/70 hover:text-white')
                  }
                >
                  Nova
                </button>
              )}
            </div>

            <button
              onClick={() => setZoomImage(null)}
              className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="flex-1 overflow-hidden" onClick={e => e.stopPropagation()}>
            <ZoomableImage
              src={zoomImage}
              alt={imageName}
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};
