// ═══════════════════════════════════════════════════════════════
// VIZZU - Product Hub Modal (Hub 360° do Produto)
// Modal unificado que mostra TODAS as gerações de um produto
// em todas as features + atalhos rápidos para criar
// + Ações: excluir imagens, editar no editor IA
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Product, CreativeStillGeneration } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { OptimizedImage } from '../OptimizedImage';
import { useImageViewer } from '../ImageViewer';
import DownloadModal, { type DownloadImageGroup } from './DownloadModal';
import { ImageEditModal } from './ImageEditModal';
import type { DownloadableImage } from '../../utils/downloadSizes';
import { editStudioImage, saveCreativeStillEdit, saveLookComposerEdit } from '../../lib/api/studio';
import { EcommerceExportButton } from './EcommerceExportButton';
import type { VizzuTheme } from '../../contexts/UIContext';

// ── Types ──

interface Tab {
  id: string;
  label: string;
  icon: string;
  count: number;
}

interface EditingImage {
  url: string;
  name: string;
  tab: string;
  generationId?: string;
  imageId?: string;
  variationIndex?: number;
  view?: 'front' | 'back';
}

export interface ProductHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  theme: VizzuTheme;
  userId?: string;
  navigateTo: (page: string) => void;
  setProductForCreation: (p: Product | null) => void;
  onEditProduct?: (p: Product) => void;
  onRefreshProduct?: () => void;
  showToast?: (msg: string, type: 'success' | 'error') => void;
  editBalance?: number;
  regularBalance?: number;
  resolution?: '2k' | '4k';
  /** Aba padrão para abrir (ex: 'cs' para Still Criativo) */
  defaultTab?: string;
}

// ── Helpers ──

function getAngleLabel(angle: string): string {
  const labels: Record<string, string> = {
    front: 'Frente',
    back: 'Costas',
    'side-left': 'Lat. Esq.',
    'side-right': 'Lat. Dir.',
    '45-left': '45° Esq.',
    '45-right': '45° Dir.',
    top: 'Superior',
    detail: 'Detalhe',
    front_detail: 'Det. Frente',
    back_detail: 'Det. Costas',
    folded: 'Dobrada',
  };
  return labels[angle] || angle;
}

function getCSVariationUrls(gen: CreativeStillGeneration): string[] {
  if (gen.variation_urls && gen.variation_urls.length > 0) return gen.variation_urls;
  return [gen.variation_1_url, gen.variation_2_url].filter(Boolean) as string[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: undefined,
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Component ──

export const ProductHubModal: React.FC<ProductHubModalProps> = ({
  isOpen,
  onClose,
  product,
  theme,
  userId,
  navigateTo,
  setProductForCreation,
  onEditProduct,
  onRefreshProduct,
  showToast,
  editBalance = 0,
  regularBalance = 0,
  resolution = '2k',
  defaultTab,
}) => {
  const isDark = theme !== 'light';
  const { openViewer } = useImageViewer();

  // CS data (não está no Product, precisa buscar)
  const [csGenerations, setCsGenerations] = useState<CreativeStillGeneration[]>([]);
  const [isLoadingCS, setIsLoadingCS] = useState(true);

  // Sales tab inline edit
  const [isEditingSales, setIsEditingSales] = useState(false);
  const [salesForm, setSalesForm] = useState({ price: '', priceSale: '', sizes: [] as string[], isForSale: false, isSet: false });
  const [isSavingSales, setIsSavingSales] = useState(false);

  // Delete & Edit states
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingImage, setEditingImage] = useState<EditingImage | null>(null);

  // Pending delete with undo (timeout-based)
  const pendingDeleteTimer = useRef<NodeJS.Timeout | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !product?.id || !userId) {
      setCsGenerations([]);
      setIsLoadingCS(false);
      return;
    }
    setIsLoadingCS(true);
    supabase
      .from('creative_still_generations')
      .select('*')
      .eq('product_id', product.id)
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setCsGenerations((data || []) as CreativeStillGeneration[]);
        setIsLoadingCS(false);
      });
  }, [isOpen, product?.id, userId]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (pendingDeleteTimer.current) clearTimeout(pendingDeleteTimer.current);
    };
  }, []);

  // ── Contagens por feature ──
  const psSessions = product.generatedImages?.productStudio || [];
  const psCount = psSessions.reduce((sum, s) => sum + s.images.length, 0);

  const csCount = csGenerations.reduce((sum, g) => sum + getCSVariationUrls(g).length, 0);

  const lcLooks = product.generatedImages?.modeloIA || [];
  const lcCount = lcLooks.length;

  const srImages = product.generatedImages?.studioReady || [];
  const srCount = srImages.length;

  const ccImages = product.generatedImages?.cenarioCriativo || [];
  const ccCount = ccImages.length;

  // ── Tabs ──
  const hasSalesData = !!(product.price || product.isForSale);
  const tabs: Tab[] = useMemo(() => [
    { id: 'ps', label: 'Vizzu Product Studio®', icon: 'fa-camera', count: psCount },
    { id: 'cs', label: 'Vizzu Still Criativo®', icon: 'fa-gem', count: csCount },
    { id: 'lc', label: 'Vizzu Look Composer®', icon: 'fa-layer-group', count: lcCount },
    { id: 'sr', label: 'Vizzu Studio Ready®', icon: 'fa-cube', count: srCount },
    { id: 'cc', label: 'Vizzu Cenário Criativo®', icon: 'fa-mountain-sun', count: ccCount },
    { id: 'sales', label: 'Vendas', icon: 'fa-tag', count: hasSalesData ? 1 : 0 },
  ], [psCount, csCount, lcCount, srCount, ccCount, hasSalesData]);

  // Auto-selecionar primeira aba com conteúdo
  const firstNonEmpty = tabs.find(t => t.count > 0)?.id || 'ps';
  const [activeTab, setActiveTab] = useState(firstNonEmpty);

  useEffect(() => {
    if (isOpen) {
      if (defaultTab && tabs.find(t => t.id === defaultTab && t.count > 0)) {
        setActiveTab(defaultTab);
      } else {
        const first = tabs.find(t => t.count > 0)?.id || 'ps';
        setActiveTab(first);
      }
      // Reset states on open
      setConfirmDeleteId(null);
      setDeletingId(null);
      setPendingDeleteId(null);
    }
  }, [isOpen, tabs, defaultTab]);

  // ── Atalhos ──
  const handleShortcut = useCallback((page: string) => {
    setProductForCreation(product);
    onClose();
    navigateTo(page);
  }, [product, onClose, navigateTo, setProductForCreation]);

  // ── Delete handler ──
  const handleDelete = useCallback(async (deleteKey: string, deleteAction: () => Promise<void>) => {
    setDeletingId(deleteKey);
    try {
      await deleteAction();
      showToast?.('Imagem excluída', 'success');
      onRefreshProduct?.();
      // Re-fetch CS data if it was a CS delete
      if (deleteKey.startsWith('cs-') && userId) {
        const { data } = await supabase
          .from('creative_still_generations')
          .select('*')
          .eq('product_id', product.id)
          .eq('user_id', userId)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(50);
        setCsGenerations((data || []) as CreativeStillGeneration[]);
      }
    } catch (err) {
      console.error('[Hub] Erro ao deletar:', err);
      showToast?.('Erro ao excluir imagem', 'error');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }, [product.id, userId, showToast, onRefreshProduct]);

  // ── Edit handlers ──
  const handleEditGenerate = useCallback(async (params: { correctionPrompt: string; referenceImageBase64?: string }) => {
    if (!editingImage) return { success: false, error: 'Nenhuma imagem selecionada' };
    try {
      // Foto original do produto = referência de cor para o Gemini
      const origUrl = product.originalImages?.front?.url || product.images?.[0]?.url || '';
      const result = await editStudioImage({
        userId,
        productId: product.id,
        currentImageUrl: editingImage.url,
        correctionPrompt: params.correctionPrompt,
        referenceImageBase64: params.referenceImageBase64,
        resolution,
        productInfo: { name: product.name, category: product.category, color: product.color, description: product.description },
        originalImageUrl: origUrl,
      });
      return result;
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao editar' };
    }
  }, [editingImage, userId, product, resolution]);

  const handleEditSave = useCallback(async (newImageUrl: string) => {
    if (!editingImage) return { success: false };
    try {
      const tab = editingImage.tab;

      if (tab === 'cs' && editingImage.generationId != null && editingImage.variationIndex != null) {
        await saveCreativeStillEdit({
          generationId: editingImage.generationId,
          variationIndex: editingImage.variationIndex,
          newImageUrl,
        });
      } else if (tab === 'lc' && editingImage.generationId && editingImage.view) {
        await saveLookComposerEdit({
          productId: product.id,
          generationId: editingImage.generationId,
          view: editingImage.view,
          newImageUrl,
        });
      } else if (editingImage.imageId) {
        // PS, SR, CC — update product_images diretamente
        await supabase
          .from('product_images')
          .update({ url: newImageUrl })
          .eq('id', editingImage.imageId);
      }

      showToast?.('Imagem atualizada!', 'success');
      onRefreshProduct?.();

      // Re-fetch CS if needed
      if (tab === 'cs' && userId) {
        const { data } = await supabase
          .from('creative_still_generations')
          .select('*')
          .eq('product_id', product.id)
          .eq('user_id', userId)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(50);
        setCsGenerations((data || []) as CreativeStillGeneration[]);
      }

      return { success: true };
    } catch (err: any) {
      showToast?.('Erro ao salvar edição', 'error');
      return { success: false };
    }
  }, [editingImage, product, userId, showToast, onRefreshProduct]);

  // ── Download ──
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const downloadGroups: DownloadImageGroup[] = useMemo(() => {
    const groups: DownloadImageGroup[] = [];

    const psImgs: DownloadableImage[] = psSessions.flatMap(s =>
      s.images.map(img => ({ url: img.url, label: getAngleLabel(img.angle), featurePrefix: 'VProductStudio' }))
    );
    if (psImgs.length) groups.push({ label: 'Vizzu Product Studio®', featurePrefix: 'VProductStudio', images: psImgs });

    const csImgs: DownloadableImage[] = csGenerations.flatMap(g =>
      getCSVariationUrls(g).map((url, i) => ({ url, label: `Variação ${i + 1}`, featurePrefix: 'VCreativeStill' }))
    );
    if (csImgs.length) groups.push({ label: 'Vizzu Still Criativo®', featurePrefix: 'VCreativeStill', images: csImgs });

    const lcImgs: DownloadableImage[] = lcLooks.flatMap(look => {
      const imgs: DownloadableImage[] = [{ url: look.images.front, label: 'Frente', featurePrefix: 'VLookComposer' }];
      if (look.images.back) imgs.push({ url: look.images.back, label: 'Costas', featurePrefix: 'VLookComposer' });
      return imgs;
    });
    if (lcImgs.length) groups.push({ label: 'Vizzu Look Composer®', featurePrefix: 'VLookComposer', images: lcImgs });

    const srImgs: DownloadableImage[] = srImages.map(img => ({ url: img.images.front, label: 'Studio Ready', featurePrefix: 'VStudioReady' }));
    if (srImgs.length) groups.push({ label: 'Vizzu Studio Ready®', featurePrefix: 'VStudioReady', images: srImgs });

    const ccImgs: DownloadableImage[] = ccImages.map(img => ({ url: img.images.front, label: 'Cenário', featurePrefix: 'VCenario' }));
    if (ccImgs.length) groups.push({ label: 'Vizzu Cenário Criativo®', featurePrefix: 'VCenario', images: ccImgs });

    return groups;
  }, [psSessions, csGenerations, lcLooks, srImages, ccImages]);

  const totalDownloadableImages = downloadGroups.reduce((sum, g) => sum + g.images.length, 0);

  // Export e-commerce: imagens flat para o botão genérico
  const allExportableImages = useMemo(() => {
    return downloadGroups.flatMap(g => g.images.map(img => ({ url: img.url, label: img.label })));
  }, [downloadGroups]);

  // ── Image action overlay ──
  const renderImageWithActions = (
    imageUrl: string,
    altText: string,
    deleteKey: string,
    deleteAction: () => Promise<void>,
    editInfo: EditingImage,
    opts?: { aspect?: string; objectFit?: 'cover' | 'contain'; bottomLabel?: string }
  ) => {
    const isConfirming = confirmDeleteId === deleteKey;
    const isDeleting = deletingId === deleteKey;

    return (
      <div
        className={'rounded-lg overflow-hidden border cursor-zoom-in transition-all hover:border-[#FF6B6B]/50 relative group ' + (isDark ? 'border-neutral-800' : 'border-gray-200')}
        onClick={() => !isConfirming && openViewer(imageUrl, { alt: altText })}
      >
        <OptimizedImage src={imageUrl} size="preview" alt={altText} className={'w-full ' + (opts?.aspect || 'aspect-square')} objectFit={opts?.objectFit} />

        {/* Bottom label (ex: ângulo) */}
        {opts?.bottomLabel && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1">
            <p className="text-white text-[7px] font-medium text-center">{opts.bottomLabel}</p>
          </div>
        )}

        {/* Confirm delete overlay */}
        {isConfirming && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10" onClick={e => e.stopPropagation()}>
            <p className="text-white text-[10px] font-medium mb-2">Excluir?</p>
            <div className="flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(deleteKey, deleteAction); }}
                disabled={isDeleting}
                className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isDeleting ? <i className="fas fa-spinner fa-spin text-xs"></i> : <i className="fas fa-check text-xs"></i>}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                className="w-8 h-8 rounded-full bg-neutral-700 text-white flex items-center justify-center hover:bg-neutral-600 transition-colors"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
          </div>
        )}

        {/* Hover action buttons */}
        {!isConfirming && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-end justify-between p-1.5 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
            <button
              onClick={(e) => { e.stopPropagation(); setEditingImage(editInfo); }}
              className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center hover:bg-[#FF6B6B] transition-colors"
              title="Editar"
            >
              <i className="fas fa-pen text-[9px]"></i>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(deleteKey); }}
              className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center hover:bg-red-500 transition-colors"
              title="Excluir"
            >
              <i className="fas fa-trash text-[9px]"></i>
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── Render ──
  if (!isOpen) return null;

  const productImage = (() => {
    const ps = product.generatedImages?.productStudio || [];
    for (let i = ps.length - 1; i >= 0; i--) {
      const front = ps[i].images.find(img => img.angle === 'front');
      if (front?.url) return front.url;
      if (ps[i].images[0]?.url) return ps[i].images[0].url;
    }
    if (product.originalImages?.front && typeof product.originalImages.front === 'object') {
      return (product.originalImages.front as any).url || '';
    }
    return product.images?.[0]?.url || '';
  })();

  const shortcuts = [
    { label: 'Product Studio®', icon: 'fa-camera', page: 'product-studio', desc: 'Foto profissional' },
    { label: 'Provador®', icon: 'fa-shirt', page: 'provador', desc: 'Vista seus clientes' },
    { label: 'Look Composer®', icon: 'fa-layer-group', page: 'look-composer', desc: 'Monte combinações' },
    { label: 'Still Criativo®', icon: 'fa-gem', page: 'creative-still', desc: 'Foto editorial' },
  ];

  // ── Tab content renderers ──

  const renderPS = () => {
    if (psCount === 0) return renderEmpty('Product Studio');
    const sorted = [...psSessions].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return (
      <div className="space-y-4">
        {sorted.map(session => (
          <div key={session.id}>
            <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] mb-2'}>
              {formatDate(session.createdAt)} &middot; {session.images.length} {session.images.length === 1 ? 'foto' : 'fotos'}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {session.images.map(img =>
                renderImageWithActions(
                  img.url,
                  getAngleLabel(img.angle),
                  `ps-${img.id}`,
                  async () => { await supabase.from('product_images').delete().eq('id', img.id); },
                  { url: img.url, name: `${product.name} — ${getAngleLabel(img.angle)}`, tab: 'ps', imageId: img.id },
                  { bottomLabel: getAngleLabel(img.angle) }
                )
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderCS = () => {
    if (isLoadingCS) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className={'w-5 h-5 border-2 rounded-full animate-spin border-t-transparent ' + (isDark ? 'border-neutral-600' : 'border-gray-300')}></div>
          <span className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-xs ml-2'}>Carregando...</span>
        </div>
      );
    }
    if (csCount === 0) return renderEmpty('Still Criativo');
    return (
      <div className="space-y-4">
        {csGenerations.map(gen => {
          const urls = getCSVariationUrls(gen);
          if (urls.length === 0) return null;
          return (
            <div key={gen.id}>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] mb-2'}>
                {formatDate(gen.created_at)} &middot; {urls.length} {urls.length === 1 ? 'variação' : 'variações'}
                {gen.resolution === '4k' && <span className="ml-1 px-1 py-0.5 bg-amber-500/20 text-amber-500 text-[8px] rounded">4K</span>}
              </p>
              <div className={'grid gap-2 ' + (urls.length === 1 ? 'grid-cols-2' : urls.length <= 3 ? 'grid-cols-3' : 'grid-cols-4')}>
                {urls.map((url, i) =>
                  renderImageWithActions(
                    url,
                    `Variação ${i + 1}`,
                    `cs-${gen.id}-${i}`,
                    async () => {
                      // Se é a única variação, deleta a geração inteira
                      if (urls.length === 1) {
                        await supabase.from('creative_still_generations').delete().eq('id', gen.id);
                      } else {
                        // Remove a variação do array
                        const newUrls = urls.filter((_, idx) => idx !== i);
                        await supabase.from('creative_still_generations').update({ variation_urls: newUrls }).eq('id', gen.id);
                      }
                    },
                    { url, name: `${product.name} — Still Variação ${i + 1}`, tab: 'cs', generationId: gen.id, variationIndex: i },
                    { aspect: 'aspect-[4/5]', objectFit: 'contain' }
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderLC = () => {
    if (lcCount === 0) return renderEmpty('Look Composer');
    const sorted = [...lcLooks].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return (
      <div className="grid grid-cols-3 gap-2">
        {sorted.map(look => (
          <div key={look.id} className="relative">
            {renderImageWithActions(
              look.images.front,
              'Look Composer',
              `lc-${look.id}`,
              async () => { await supabase.from('product_images').delete().eq('id', look.id); },
              { url: look.images.front, name: `${product.name} — Look`, tab: 'lc', generationId: look.id, view: 'front' },
              { aspect: 'aspect-[3/4]' }
            )}
            {look.images.back && (
              <div className="absolute top-1 right-1 px-1 py-0.5 bg-black/60 text-white text-[7px] rounded pointer-events-none z-[5]">
                F+C
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderSR = () => {
    if (srCount === 0) return renderEmpty('Studio Ready');
    return (
      <div className="grid grid-cols-3 gap-2">
        {srImages.map(img =>
          renderImageWithActions(
            img.images.front,
            'Studio Ready',
            `sr-${img.id}`,
            async () => { await supabase.from('product_images').delete().eq('id', img.id); },
            { url: img.images.front, name: `${product.name} — Studio Ready`, tab: 'sr', imageId: img.id },
          )
        )}
      </div>
    );
  };

  const renderCC = () => {
    if (ccCount === 0) return renderEmpty('Cenário Criativo');
    return (
      <div className="grid grid-cols-3 gap-2">
        {ccImages.map(img =>
          renderImageWithActions(
            img.images.front,
            'Cenário Criativo',
            `cc-${img.id}`,
            async () => { await supabase.from('product_images').delete().eq('id', img.id); },
            { url: img.images.front, name: `${product.name} — Cenário`, tab: 'cc', imageId: img.id },
          )
        )}
      </div>
    );
  };

  // ── Vendas Tab ──
  const handleSaveSales = async () => {
    if (!userId) return;
    setIsSavingSales(true);
    try {
      const { error } = await supabase.from('products').update({
        price: parseFloat(salesForm.price) || null,
        price_sale: parseFloat(salesForm.priceSale) || null,
        sizes: salesForm.sizes.length > 0 ? salesForm.sizes : [],
        is_for_sale: salesForm.isForSale,
        is_set: salesForm.isSet,
      }).eq('id', product.id).eq('user_id', userId);
      if (error) throw error;
      showToast?.('Informações de venda salvas!', 'success');
      setIsEditingSales(false);
      onRefreshProduct?.();
    } catch (e: any) {
      showToast?.(e.message || 'Erro ao salvar', 'error');
    } finally {
      setIsSavingSales(false);
    }
  };

  const startEditSales = () => {
    setSalesForm({
      price: product.price != null ? String(product.price) : '',
      priceSale: product.priceSale != null ? String(product.priceSale) : '',
      sizes: product.sizes || [],
      isForSale: product.isForSale || false,
      isSet: product.isSet || false,
    });
    setIsEditingSales(true);
  };

  const renderSales = () => {
    const hasPrice = product.price != null;
    const displayPrice = product.priceSale ?? product.price;
    const hasPromo = product.priceSale != null && product.price != null;
    const fmtPrice = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

    if (isEditingSales) {
      return (
        <div className={'rounded-xl p-4 space-y-4 ' + (isDark ? 'bg-neutral-900/50' : 'bg-gray-50')}>
          <div className="flex items-center justify-between">
            <h4 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold'}>Editar informações de venda</h4>
          </div>
          {/* Toggle conjunto */}
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setSalesForm(f => ({ ...f, isSet: !f.isSet }))}
              className={'w-8 rounded-full relative transition-colors cursor-pointer ' + (salesForm.isSet ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]' : (isDark ? 'bg-neutral-700' : 'bg-gray-300'))}
              style={{ height: '18px' }}
            >
              <div className={'absolute top-0.5 rounded-full bg-white shadow transition-transform ' + (salesForm.isSet ? 'translate-x-[14px]' : 'translate-x-0.5')} style={{ width: '14px', height: '14px' }}></div>
            </div>
            <div>
              <span className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-xs'}>Produto conjunto</span>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[9px]'}>2+ peças vendidas juntas (ex: pijama, biquini)</p>
            </div>
          </label>
          {/* Toggle à venda */}
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setSalesForm(f => ({ ...f, isForSale: !f.isForSale }))}
              className={'w-8 rounded-full relative transition-colors cursor-pointer ' + (salesForm.isForSale ? 'bg-[#FF6B6B]' : (isDark ? 'bg-neutral-700' : 'bg-gray-300'))}
              style={{ height: '18px' }}
            >
              <div className={'absolute top-0.5 rounded-full bg-white shadow transition-transform ' + (salesForm.isForSale ? 'translate-x-[14px]' : 'translate-x-0.5')} style={{ width: '14px', height: '14px' }}></div>
            </div>
            <span className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-xs'}>Produto à venda</span>
          </label>
          {/* Preços */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>Preço (R$)</label>
              <input type="number" step="0.01" min="0" placeholder="89,90" value={salesForm.price} onChange={e => setSalesForm(f => ({ ...f, price: e.target.value }))} className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-600' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400') + ' w-full px-3 py-2 border rounded-lg text-sm'} />
            </div>
            <div>
              <label className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1'}>Preço promo (R$)</label>
              <input type="number" step="0.01" min="0" placeholder="Opcional" value={salesForm.priceSale} onChange={e => setSalesForm(f => ({ ...f, priceSale: e.target.value }))} className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-600' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400') + ' w-full px-3 py-2 border rounded-lg text-sm'} />
            </div>
          </div>
          {/* Tamanhos */}
          <div>
            <label className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' block text-[9px] font-medium uppercase tracking-wide mb-1.5'}>Tamanhos disponíveis</label>
            <div className="flex flex-wrap gap-1.5">
              {['PP', 'P', 'M', 'G', 'GG', 'XG', 'Único'].map(size => {
                const active = salesForm.sizes.includes(size);
                return (
                  <button key={size} type="button" onClick={() => setSalesForm(f => ({ ...f, sizes: active ? f.sizes.filter(s => s !== size) : [...f.sizes, size] }))} className={'px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ' + (active ? 'bg-[#FF6B6B]/10 border-[#FF6B6B]/30 text-[#FF6B6B]' : (isDark ? 'bg-neutral-800 border-neutral-700 text-neutral-500' : 'bg-white border-gray-200 text-gray-400'))}>
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Botões */}
          <div className="flex gap-2 pt-1">
            <button onClick={() => setIsEditingSales(false)} className={(isDark ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300') + ' flex-1 py-2 rounded-lg text-xs font-medium transition-colors'}>Cancelar</button>
            <button onClick={handleSaveSales} disabled={isSavingSales} className={'flex-1 py-2 rounded-lg text-xs font-semibold text-white transition-all bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] hover:opacity-90 flex items-center justify-center gap-1.5' + (isSavingSales ? ' opacity-70' : '')}>
              {isSavingSales ? <><i className="fas fa-circle-notch fa-spin text-[10px]"></i>Salvando...</> : <><i className="fas fa-check text-[10px]"></i>Salvar</>}
            </button>
          </div>
        </div>
      );
    }

    if (!hasPrice) {
      return (
        <div className={'rounded-xl p-6 text-center ' + (isDark ? 'bg-neutral-900/50' : 'bg-gray-50')}>
          <div className={'w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ' + (isDark ? 'bg-neutral-800' : 'bg-gray-100')}>
            <i className={'fas fa-tag text-lg ' + (isDark ? 'text-neutral-600' : 'text-gray-400')}></i>
          </div>
          <p className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-xs mb-3'}>Adicione um preço para disponibilizar este produto para venda via WhatsApp</p>
          <button onClick={startEditSales} className="px-4 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-lg text-xs font-medium hover:opacity-90 transition-opacity">
            <i className="fas fa-plus mr-1.5"></i>Adicionar preço
          </button>
        </div>
      );
    }

    // Display mode
    return (
      <div className="space-y-3">
        {/* Card de preço */}
        <div className={'rounded-xl p-4 ' + (isDark ? 'bg-neutral-900/50 border border-neutral-800' : 'bg-gray-50 border border-gray-200')}>
          <div className="flex items-center justify-between mb-3">
            <div>
              {hasPromo ? (
                <div className="flex items-baseline gap-2">
                  <span className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-sm line-through'}>{fmtPrice(product.price!)}</span>
                  <span className="text-xl font-bold text-[#FF6B6B]">{fmtPrice(product.priceSale!)}</span>
                </div>
              ) : (
                <span className="text-xl font-bold text-[#FF9F43]">{fmtPrice(product.price!)}</span>
              )}
            </div>
            <button onClick={startEditSales} className={(isDark ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-700') + ' text-xs transition-colors'}>
              <i className="fas fa-pen mr-1"></i>Editar
            </button>
          </div>
          {/* Status */}
          <div className="flex items-center gap-2 mb-3">
            <span className={'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ' + (product.isForSale ? 'bg-green-500/10 text-green-500' : (isDark ? 'bg-neutral-800 text-neutral-500' : 'bg-gray-200 text-gray-500'))}>
              <i className={'fas ' + (product.isForSale ? 'fa-check-circle' : 'fa-pause-circle') + ' text-[8px]'}></i>
              {product.isForSale ? 'À venda' : 'Fora de catálogo'}
            </span>
          </div>
          {/* Tamanhos */}
          {product.sizes && product.sizes.length > 0 && (
            <div>
              <p className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[9px] uppercase tracking-wide mb-1.5'}>Tamanhos</p>
              <div className="flex flex-wrap gap-1">
                {product.sizes.map(s => (
                  <span key={s} className={'px-2 py-0.5 rounded text-[10px] font-medium ' + (isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-200 text-gray-600')}>{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* Preview WhatsApp */}
        <div className={'rounded-xl p-3 border ' + (isDark ? 'bg-[#0b141a] border-neutral-800' : 'bg-[#e5ddd5] border-gray-200')}>
          <p className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[9px] uppercase tracking-wide mb-2'}><i className="fab fa-whatsapp mr-1"></i>Preview da mensagem</p>
          <div className={'rounded-lg p-2.5 text-xs leading-relaxed ' + (isDark ? 'bg-[#005c4b] text-white/90' : 'bg-white text-gray-800 shadow-sm')}>
            • {product.name} — {displayPrice != null ? fmtPrice(displayPrice) : 'Consulte'}{product.sizes && product.sizes.length > 0 ? `\nTamanhos: ${product.sizes.join(', ')}` : ''}
          </div>
        </div>
      </div>
    );
  };

  const renderEmpty = (featureName: string) => (
    <div className={'rounded-xl p-6 text-center ' + (isDark ? 'bg-neutral-900/50' : 'bg-gray-50')}>
      <i className={'fas fa-image text-2xl mb-2 ' + (isDark ? 'text-neutral-700' : 'text-gray-300')}></i>
      <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-xs'}>
        Nenhuma geração de {featureName} para este produto
      </p>
    </div>
  );

  const tabContentMap: Record<string, () => React.ReactNode> = {
    ps: renderPS,
    cs: renderCS,
    lc: renderLC,
    sr: renderSR,
    cc: renderCC,
    sales: renderSales,
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
      onClick={onClose}
    >
      <div
        className={(isDark ? 'bg-neutral-900' : 'bg-white') + ' rounded-t-2xl md:rounded-2xl w-full max-w-lg overflow-hidden flex flex-col'}
        style={{
          maxHeight: 'calc(92vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
          marginBottom: 'env(safe-area-inset-bottom, 0px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ═══ HEADER ═══ */}
        <div className={'flex items-center gap-3 p-4 border-b ' + (isDark ? 'border-neutral-800' : 'border-gray-200')}>
          <div className={'w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 ' + (isDark ? 'bg-neutral-800' : 'bg-gray-100')}>
            {productImage ? (
              <OptimizedImage src={productImage} size="thumb" alt={product.name} className="w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <i className={'fas fa-image ' + (isDark ? 'text-neutral-600' : 'text-gray-400')}></i>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold truncate'}>{product.name}</h3>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px]'}>{product.sku ? `SKU ${product.sku}` : `ID ${product.id.slice(0, 8)}`}</span>
              {product.category && (
                <span className={'text-[9px] px-1.5 py-0.5 rounded ' + (isDark ? 'bg-white/5 text-neutral-400' : 'bg-gray-100 text-gray-500')}>
                  {product.category}
                </span>
              )}
              {product.color && (
                <span className={'text-[9px] px-1.5 py-0.5 rounded ' + (isDark ? 'bg-white/5 text-neutral-400' : 'bg-gray-100 text-gray-500')}>
                  {product.color}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {totalDownloadableImages > 0 && (
              <button
                onClick={() => setShowDownloadModal(true)}
                className="h-8 px-2.5 rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white flex items-center justify-center gap-1.5 hover:opacity-90 transition-all"
              >
                <i className="fas fa-download text-[10px]"></i>
                <span className="text-[10px] font-semibold">{totalDownloadableImages}</span>
              </button>
            )}
            <EcommerceExportButton
              images={allExportableImages}
              productId={product.id}
              tool="product-hub"
              compact
              className={(isDark ? 'bg-neutral-800 hover:bg-neutral-700' : 'bg-gray-100 hover:bg-gray-200') + ' h-8 px-2.5 rounded-full flex items-center justify-center gap-1.5 transition-colors'}
            />
            {onEditProduct && (
              <button
                onClick={() => { onEditProduct(product); onClose(); }}
                className={(isDark ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700') + ' w-8 h-8 rounded-full flex items-center justify-center'}
              >
                <i className="fas fa-pen text-xs"></i>
              </button>
            )}
            <button
              onClick={onClose}
              className={(isDark ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700') + ' w-8 h-8 rounded-full flex items-center justify-center'}
            >
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>
        </div>

        {/* ═══ TABS ═══ */}
        <div className={'flex items-center gap-1 px-4 py-2.5 border-b overflow-x-auto no-scrollbar ' + (isDark ? 'border-neutral-800' : 'border-gray-200')}>
          {tabs.filter(t => t.count > 0 || t.id === activeTab || t.id === 'sales').map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap flex-shrink-0 ' +
                (activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white'
                  : isDark
                    ? 'bg-neutral-800 text-neutral-400 hover:text-white'
                    : 'bg-gray-100 text-gray-500 hover:text-gray-700')
              }
            >
              <i className={'fas ' + tab.icon + ' text-[9px]'}></i>
              {tab.label}
              <span className={
                'px-1 py-0.5 rounded text-[8px] font-bold ' +
                (activeTab === tab.id
                  ? 'bg-white/20'
                  : isDark ? 'bg-white/10' : 'bg-gray-200')
              }>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ═══ ANTES/DEPOIS ═══ */}
        {(() => {
          const origUrl = product.originalImages?.front?.url || (product.images?.[0]?.url);
          const latestPs = [...(product.generatedImages?.productStudio || [])].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          const psUrl = latestPs[0]?.images.find(img => img.angle === 'front')?.url || latestPs[0]?.images[0]?.url;
          if (!origUrl || !psUrl) return null;
          return (
            <div className={'px-4 pt-3 pb-1 border-b ' + (isDark ? 'border-neutral-800' : 'border-gray-200')}>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[9px] uppercase tracking-wider font-medium mb-2'}>
                <i className="fas fa-arrow-right-arrow-left mr-1 text-[8px]"></i>Antes / Depois
              </p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className={'rounded-lg overflow-hidden border cursor-zoom-in ' + (isDark ? 'border-neutral-800' : 'border-gray-200')} onClick={() => openViewer(origUrl, { alt: 'Original' })}>
                  <OptimizedImage src={origUrl} size="preview" alt="Antes" className="w-full aspect-square" objectFit="contain" />
                  <div className={'text-center py-1 border-t text-[8px] font-medium uppercase tracking-wider ' + (isDark ? 'border-neutral-800 text-neutral-500 bg-neutral-900/50' : 'border-gray-200 text-gray-400 bg-gray-50')}>
                    Antes
                  </div>
                </div>
                <div className={'rounded-lg overflow-hidden border cursor-zoom-in border-[#FF6B6B]/20'} onClick={() => openViewer(psUrl, { alt: 'Depois' })}>
                  <OptimizedImage src={psUrl} size="preview" alt="Depois" className="w-full aspect-square" objectFit="contain" />
                  <div className="text-center py-1 border-t border-[#FF6B6B]/15 text-[8px] font-medium uppercase tracking-wider text-[#FF6B6B] bg-[#FF6B6B]/[0.03]">
                    Depois
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ═══ CONTENT ═══ */}
        <div className="flex-1 overflow-y-auto p-4">
          {tabContentMap[activeTab]?.()}
        </div>

        {/* ═══ ATALHOS "Deseja criar?" ═══ */}
        <div className={'border-t px-4 py-3 ' + (isDark ? 'border-neutral-800' : 'border-gray-200')}>
          <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-semibold mb-2'}>
            <i className="fas fa-wand-magic-sparkles text-[#FF6B6B] mr-1.5 text-[10px]"></i>
            Deseja criar?
          </p>
          <div className="grid grid-cols-4 gap-2">
            {shortcuts.map(s => (
              <button
                key={s.page}
                onClick={() => handleShortcut(s.page)}
                className={(isDark ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700' : 'bg-gray-50 hover:bg-gray-100 border-gray-200') + ' border rounded-xl p-2 text-center transition-all'}
              >
                <div className={'w-7 h-7 mx-auto rounded-lg flex items-center justify-center mb-1 ' + (isDark ? 'bg-white/10' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
                  <i className={'fas ' + s.icon + ' text-[10px] ' + (isDark ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
                </div>
                <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-[9px] font-medium leading-tight'}>{s.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Download Modal */}
      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        productName={product.name}
        originalImageUrl={product.originalImages?.front?.url || product.images?.[0]?.url}
        groups={downloadGroups}
        theme={theme}
      />


      {/* Edit Modal */}
      {editingImage && (
        <ImageEditModal
          isOpen={!!editingImage}
          onClose={() => setEditingImage(null)}
          currentImageUrl={editingImage.url}
          imageName={editingImage.name}
          editBalance={editBalance}
          regularBalance={regularBalance}
          resolution={resolution}
          onGenerate={handleEditGenerate}
          onSave={handleEditSave}
          theme={theme}
        />
      )}
    </div>
  );
};
