// ═══════════════════════════════════════════════════════════════
// VIZZU - Product Studio Result (Página de Pós-Criação)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Product, ProductStudioSession, ProductStudioAngle } from '../../types';

interface ProductStudioResultProps {
  product: Product;
  session: ProductStudioSession;
  creditsUsed: number;
  userCredits: number;
  onSave: () => void;
  onRegenerate: () => void;
  onDelete: () => void;
  onBack: () => void;
  theme?: 'dark' | 'light';
}

// Labels dos ângulos em português
const ANGLE_LABELS: Record<ProductStudioAngle, string> = {
  'front': 'Frente',
  'back': 'Costas',
  'side-left': 'Lateral Esq.',
  'side-right': 'Lateral Dir.',
  '45-left': '45° Esq.',
  '45-right': '45° Dir.',
  'top': 'Topo',
  'detail': 'Detalhe'
};

export const ProductStudioResult: React.FC<ProductStudioResultProps> = ({
  product,
  session,
  creditsUsed,
  userCredits,
  onSave,
  onRegenerate,
  onDelete,
  onBack,
  theme = 'dark'
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showOriginalModal, setShowOriginalModal] = useState(false);
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'back' | null>(null);
  const [timeAgo, setTimeAgo] = useState('agora');

  const images = session.images;
  const currentImage = images[currentIndex];

  // Calcular tempo desde a geração
  useEffect(() => {
    const updateTimeAgo = () => {
      const created = new Date(session.createdAt);
      const now = new Date();
      const diffMs = now.getTime() - created.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);

      if (diffMins < 1) setTimeAgo('agora');
      else if (diffMins === 1) setTimeAgo('há 1 minuto');
      else if (diffMins < 60) setTimeAgo(`há ${diffMins} minutos`);
      else if (diffHours === 1) setTimeAgo('há 1 hora');
      else setTimeAgo(`há ${diffHours} horas`);
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 60000);
    return () => clearInterval(interval);
  }, [session.createdAt]);

  // Obter imagem original do produto
  const getOriginalImage = (): string => {
    if (product.originalImages?.front?.url) return product.originalImages.front.url;
    if (product.images?.[0]?.url) return product.images[0].url;
    if (product.images?.[0]?.base64) return product.images[0].base64;
    return '';
  };

  const originalImage = getOriginalImage();

  // Touch/Swipe support
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance && currentIndex < images.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
    if (distance < -minSwipeDistance && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Salvar
  const handleSave = () => {
    setIsSaved(true);
    onSave();
  };

  // Download
  const handleDownload = async () => {
    if (!currentImage?.url) return;
    try {
      const response = await fetch(currentImage.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${product.sku}-${currentImage.angle}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(currentImage.url, '_blank');
    }
  };

  // Verificar ao sair
  const handleBackClick = () => {
    if (!isSaved) {
      setPendingAction('back');
      setShowExitModal(true);
    } else {
      onBack();
    }
  };

  const confirmExit = (save: boolean) => {
    if (save) handleSave();
    setShowExitModal(false);
    if (pendingAction === 'back') onBack();
    setPendingAction(null);
  };

  const confirmDelete = () => {
    setShowDeleteModal(false);
    onDelete();
  };

  return (
    <div className={'min-h-screen flex flex-col ' + (theme === 'dark' ? 'bg-black' : 'bg-gray-50')}>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HEADER - Gradient Pink → Orange */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackClick}
              className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/30 transition-all"
            >
              <i className="fas fa-arrow-left text-sm"></i>
            </button>
            <div>
              <h1 className="text-white text-sm font-semibold">Resultado</h1>
              <p className="text-white/70 text-xs truncate max-w-[150px] md:max-w-none">{product.name}</p>
            </div>
          </div>

          {/* Créditos */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-lg">
              <span className="text-white/80 text-xs">-{creditsUsed}</span>
              <i className="fas fa-ticket text-white/80 text-[10px]"></i>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-lg">
              <span className="text-white font-semibold text-xs">{userCredits}</span>
              <i className="fas fa-coins text-yellow-300 text-[10px]"></i>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CONTEÚDO - Desktop: 2 colunas | Mobile: empilhado */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full">

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* COLUNA ESQUERDA - Imagem (60% = 3/5) */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-3 flex flex-col">
            <div
              className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-2xl border overflow-hidden flex-1 flex flex-col'}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {/* Área da Imagem */}
              <div className={'relative flex-1 flex items-center justify-center p-6 min-h-[350px] md:min-h-[450px] ' + (theme === 'dark' ? 'bg-neutral-800/50' : 'bg-gray-100')}>
                {currentImage ? (
                  <>
                    <img
                      src={currentImage.url}
                      alt={`${product.name} - ${currentImage.angle}`}
                      className="max-w-full max-h-[400px] md:max-h-[500px] object-contain rounded-lg"
                    />

                    {/* Botão Zoom */}
                    <button
                      onClick={() => setShowZoomModal(true)}
                      className={'absolute bottom-4 right-4 w-10 h-10 rounded-xl flex items-center justify-center transition-all ' + (theme === 'dark' ? 'bg-black/60 hover:bg-black/80 text-white' : 'bg-white/80 hover:bg-white text-gray-700 shadow-lg')}
                    >
                      <i className="fas fa-magnifying-glass-plus"></i>
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-image text-4xl'}></i>
                  </div>
                )}
              </div>

              {/* Toggle de Ângulos */}
              {images.length > 1 && (
                <div className={'px-4 py-4 border-t ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-100')}>
                  <div className="flex items-center justify-center gap-2">
                    {images.map((img, idx) => (
                      <button
                        key={img.id || idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={'px-4 py-2 rounded-xl font-medium text-sm transition-all ' +
                          (idx === currentIndex
                            ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-lg shadow-pink-500/25'
                            : (theme === 'dark'
                              ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
                          )
                        }
                      >
                        {ANGLE_LABELS[img.angle] || img.angle}
                      </button>
                    ))}
                  </div>
                  {/* Indicadores */}
                  <div className="flex justify-center gap-2 mt-3">
                    {images.map((_, idx) => (
                      <div
                        key={idx}
                        className={`w-2 h-2 rounded-full transition-all ${
                          idx === currentIndex
                            ? 'bg-gradient-to-r from-pink-500 to-orange-400 w-4'
                            : (theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-300')
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Info de swipe - Mobile only */}
            <p className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' text-[10px] text-center mt-2 lg:hidden'}>
              <i className="fas fa-hand-pointer mr-1"></i>Deslize para alternar
            </p>
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* COLUNA DIREITA - Info + Ações (40% = 2/5) */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Card Informações */}
            <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-2xl border p-4'}>
              <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-4 flex items-center gap-2'}>
                <i className="fas fa-chart-simple text-pink-400"></i>
                Informações
              </h3>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' w-8 h-8 rounded-lg flex items-center justify-center'}>
                    <i className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' fas fa-clock text-sm'}></i>
                  </div>
                  <div>
                    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide'}>Gerado</p>
                    <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>{timeAgo}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' w-8 h-8 rounded-lg flex items-center justify-center'}>
                    <i className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' fas fa-palette text-sm'}></i>
                  </div>
                  <div>
                    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide'}>Tipo</p>
                    <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>Studio Product</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-green-500/20 w-8 h-8 rounded-lg flex items-center justify-center">
                    <i className="fas fa-check text-green-400 text-sm"></i>
                  </div>
                  <div>
                    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide'}>Status</p>
                    <p className="text-green-400 text-sm font-medium">Pronto para e-commerce</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Botão Salvar - Grande e destacado */}
            <button
              onClick={handleSave}
              disabled={isSaved}
              className={'w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-3 ' +
                (isSaved
                  ? 'bg-green-500/20 text-green-400 border-2 border-green-500/30'
                  : 'bg-gradient-to-r from-pink-500 to-orange-400 text-white hover:opacity-90 shadow-xl shadow-pink-500/30'
                )
              }
            >
              <i className={'fas text-lg ' + (isSaved ? 'fa-check-circle' : 'fa-bookmark')}></i>
              <span>{isSaved ? 'Salvo na Galeria' : 'Salvar na Galeria'}</span>
            </button>

            {/* Ações Rápidas - Grid 2x2 */}
            <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-2xl border p-4'}>
              <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide mb-3'}>
                Ações Rápidas
              </p>

              <div className="grid grid-cols-2 gap-3">
                {/* Ver Original */}
                <button
                  onClick={() => setShowOriginalModal(true)}
                  className={(theme === 'dark' ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700' : 'bg-gray-50 hover:bg-gray-100 border-gray-200') + ' p-4 rounded-xl border transition-all flex flex-col items-center gap-2'}
                >
                  <i className={(theme === 'dark' ? 'text-neutral-300' : 'text-gray-600') + ' fas fa-eye text-lg'}></i>
                  <span className={(theme === 'dark' ? 'text-neutral-300' : 'text-gray-700') + ' text-xs font-medium'}>Ver Original</span>
                </button>

                {/* Baixar */}
                <button
                  onClick={handleDownload}
                  className={(theme === 'dark' ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700' : 'bg-gray-50 hover:bg-gray-100 border-gray-200') + ' p-4 rounded-xl border transition-all flex flex-col items-center gap-2'}
                >
                  <i className={(theme === 'dark' ? 'text-neutral-300' : 'text-gray-600') + ' fas fa-download text-lg'}></i>
                  <span className={(theme === 'dark' ? 'text-neutral-300' : 'text-gray-700') + ' text-xs font-medium'}>Baixar Imagem</span>
                </button>

                {/* Gerar Novamente */}
                <button
                  onClick={onRegenerate}
                  className={(theme === 'dark' ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700' : 'bg-gray-50 hover:bg-gray-100 border-gray-200') + ' p-4 rounded-xl border transition-all flex flex-col items-center gap-2'}
                >
                  <i className={(theme === 'dark' ? 'text-neutral-300' : 'text-gray-600') + ' fas fa-rotate text-lg'}></i>
                  <span className={(theme === 'dark' ? 'text-neutral-300' : 'text-gray-700') + ' text-xs font-medium'}>Gerar Novamente</span>
                </button>

                {/* Descartar */}
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className={(theme === 'dark' ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30' : 'bg-red-50 hover:bg-red-100 border-red-200') + ' p-4 rounded-xl border transition-all flex flex-col items-center gap-2'}
                >
                  <i className="fas fa-trash text-red-400 text-lg"></i>
                  <span className="text-red-400 text-xs font-medium">Descartar</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL - Zoom da Imagem */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showZoomModal && currentImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowZoomModal(false)}>
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm"></div>
          <div className="relative z-10 max-w-4xl max-h-[90vh]">
            <img
              src={currentImage.url}
              alt={product.name}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setShowZoomModal(false)}
              className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL - Ver Original */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showOriginalModal && originalImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowOriginalModal(false)}>
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm"></div>
          <div className="relative z-10 max-w-4xl max-h-[90vh]">
            <div className="absolute -top-10 left-0 px-3 py-1 bg-white/20 rounded-lg">
              <span className="text-white text-sm font-medium">Imagem Original</span>
            </div>
            <img
              src={originalImage}
              alt={product.name}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setShowOriginalModal(false)}
              className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL - Sair sem Salvar */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowExitModal(false)}></div>
          <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' relative z-10 w-full max-w-sm rounded-2xl border p-6 shadow-2xl'}>
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-exclamation-triangle text-yellow-500 text-2xl"></i>
              </div>
              <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-bold'}>Sair sem salvar?</h3>
              <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-sm mt-1'}>As imagens geradas serão perdidas</p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => confirmExit(true)}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-xl font-semibold text-sm hover:opacity-90"
              >
                <i className="fas fa-bookmark mr-2"></i>Salvar e Sair
              </button>
              <button
                onClick={() => confirmExit(false)}
                className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200') + ' w-full py-3 rounded-xl font-semibold text-sm'}
              >
                Sair sem Salvar
              </button>
              <button
                onClick={() => setShowExitModal(false)}
                className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' w-full py-2 text-sm font-medium'}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL - Confirmar Exclusão */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}></div>
          <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' relative z-10 w-full max-w-sm rounded-2xl border p-6 shadow-2xl'}>
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-trash text-red-500 text-2xl"></i>
              </div>
              <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-bold'}>Descartar imagens?</h3>
              <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-sm mt-1'}>Esta ação não pode ser desfeita</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className={(theme === 'dark' ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200') + ' flex-1 py-3 rounded-xl font-semibold text-sm'}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold text-sm hover:bg-red-600"
              >
                <i className="fas fa-trash mr-2"></i>Descartar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
