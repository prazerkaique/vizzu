// ═══════════════════════════════════════════════════════════════
// VIZZU - Product Studio Result (Página de Pós-Criação)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { Product, ProductStudioSession, ProductStudioImage, ProductStudioAngle } from '../../types';

interface ProductStudioResultProps {
  product: Product;
  session: ProductStudioSession;
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
  const [pendingAction, setPendingAction] = useState<'back' | null>(null);

  const images = session.images;
  const currentImage = images[currentIndex];

  // Obter imagem original do produto
  const getOriginalImage = (): string => {
    if (product.originalImages?.front?.url) return product.originalImages.front.url;
    if (product.images?.[0]?.url) return product.images[0].url;
    if (product.images?.[0]?.base64) return product.images[0].base64;
    return '';
  };

  const originalImage = getOriginalImage();

  // Navegação do carrossel
  const goToPrevious = () => {
    setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const goToIndex = (index: number) => {
    setCurrentIndex(index);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'Escape') handleBackClick();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) goToNext();
    if (isRightSwipe) goToPrevious();
  };

  // Salvar imagem
  const handleSave = () => {
    setIsSaved(true);
    onSave();
  };

  // Download da imagem atual
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
    } catch (error) {
      // Fallback: abrir em nova aba
      window.open(currentImage.url, '_blank');
    }
  };

  // Download de todas as imagens
  const handleDownloadAll = async () => {
    for (const img of images) {
      try {
        const response = await fetch(img.url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${product.sku}-${img.angle}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        // Pequeno delay entre downloads
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        window.open(img.url, '_blank');
      }
    }
  };

  // Verificar ao tentar sair
  const handleBackClick = () => {
    if (!isSaved) {
      setPendingAction('back');
      setShowExitModal(true);
    } else {
      onBack();
    }
  };

  // Confirmar saída
  const confirmExit = (save: boolean) => {
    if (save) {
      handleSave();
    }
    setShowExitModal(false);
    if (pendingAction === 'back') {
      onBack();
    }
    setPendingAction(null);
  };

  // Confirmar exclusão
  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    setShowDeleteModal(false);
    onDelete();
  };

  return (
    <div className={'min-h-screen ' + (theme === 'dark' ? 'bg-black' : 'bg-gray-50')}>
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className={'sticky top-0 z-40 px-4 py-3 border-b ' + (theme === 'dark' ? 'bg-black/90 backdrop-blur-xl border-neutral-800' : 'bg-white/90 backdrop-blur-xl border-gray-200')}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackClick}
              className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700' : 'bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-200') + ' w-10 h-10 rounded-xl flex items-center justify-center transition-all'}
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <div>
              <h1 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-base font-semibold'}>Resultado</h1>
              <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>{product.name}</p>
            </div>
          </div>

          {/* Status de salvamento */}
          {isSaved && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-lg">
              <i className="fas fa-check text-green-400 text-xs"></i>
              <span className="text-green-400 text-xs font-medium">Salvo</span>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CONTEÚDO PRINCIPAL */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto p-4 md:p-6">

        {/* Layout Desktop: Lado a lado | Mobile: Empilhado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* IMAGEM ORIGINAL (REFERÊNCIA) */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-2xl border overflow-hidden'}>
            <div className={'px-4 py-3 border-b ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-100')}>
              <div className="flex items-center gap-2">
                <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' w-8 h-8 rounded-lg flex items-center justify-center'}>
                  <i className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' fas fa-image text-sm'}></i>
                </div>
                <div>
                  <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>Imagem Original</p>
                  <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Referência do produto</p>
                </div>
              </div>
            </div>
            <div className={'flex items-center justify-center p-4 min-h-[300px] md:min-h-[400px] ' + (theme === 'dark' ? 'bg-neutral-800/30' : 'bg-gray-50')}>
              {originalImage ? (
                <img
                  src={originalImage}
                  alt={product.name}
                  className="max-w-full max-h-[380px] object-contain rounded-lg"
                />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-image text-4xl'}></i>
                  <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-sm'}>Sem imagem</p>
                </div>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* IMAGEM GERADA COM CARROSSEL */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-2xl border overflow-hidden'}>
            <div className={'px-4 py-3 border-b ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-100')}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-gradient-to-r from-pink-500 to-orange-400 w-8 h-8 rounded-lg flex items-center justify-center">
                    <i className="fas fa-wand-magic-sparkles text-white text-sm"></i>
                  </div>
                  <div>
                    <p className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-sm font-medium'}>Imagem Gerada</p>
                    <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>
                      {currentIndex + 1} de {images.length} • {ANGLE_LABELS[currentImage?.angle] || currentImage?.angle}
                    </p>
                  </div>
                </div>
                {/* Contador */}
                <div className={(theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100') + ' px-3 py-1 rounded-full'}>
                  <span className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>
                    {currentIndex + 1}/{images.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Área do Carrossel */}
            <div
              className={'relative flex items-center justify-center p-4 min-h-[300px] md:min-h-[400px] ' + (theme === 'dark' ? 'bg-neutral-800/30' : 'bg-gray-50')}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {currentImage ? (
                <>
                  <img
                    src={currentImage.url}
                    alt={`${product.name} - ${currentImage.angle}`}
                    className="max-w-full max-h-[380px] object-contain rounded-lg transition-all duration-300"
                  />

                  {/* Setas de Navegação */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={goToPrevious}
                        className={'absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all ' + (theme === 'dark' ? 'bg-black/60 hover:bg-black/80 text-white' : 'bg-white/80 hover:bg-white text-gray-800 shadow-lg')}
                      >
                        <i className="fas fa-chevron-left text-lg"></i>
                      </button>
                      <button
                        onClick={goToNext}
                        className={'absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all ' + (theme === 'dark' ? 'bg-black/60 hover:bg-black/80 text-white' : 'bg-white/80 hover:bg-white text-gray-800 shadow-lg')}
                      >
                        <i className="fas fa-chevron-right text-lg"></i>
                      </button>
                    </>
                  )}

                  {/* Badge do ângulo atual */}
                  <div className="absolute top-3 left-3 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-orange-400 rounded-lg shadow-lg">
                    <span className="text-white text-xs font-semibold">{ANGLE_LABELS[currentImage.angle] || currentImage.angle}</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <i className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-image text-4xl'}></i>
                  <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-sm'}>Nenhuma imagem gerada</p>
                </div>
              )}
            </div>

            {/* Indicadores de página (dots) */}
            {images.length > 1 && (
              <div className={'flex justify-center gap-2 py-3 border-t ' + (theme === 'dark' ? 'border-neutral-800' : 'border-gray-100')}>
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => goToIndex(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      idx === currentIndex
                        ? 'bg-gradient-to-r from-pink-500 to-orange-400 w-6'
                        : (theme === 'dark' ? 'bg-neutral-700 hover:bg-neutral-600' : 'bg-gray-300 hover:bg-gray-400')
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* BOTÕES DE ÂNGULOS */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {images.length > 1 && (
          <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-2xl border p-4 mt-6'}>
            <p className={(theme === 'dark' ? 'text-neutral-500' : 'text-gray-500') + ' text-xs font-medium uppercase tracking-wide mb-3'}>
              <i className="fas fa-th-large mr-2"></i>Selecionar Ângulo
            </p>
            <div className="flex flex-wrap gap-2">
              {images.map((img, idx) => (
                <button
                  key={img.id || idx}
                  onClick={() => goToIndex(idx)}
                  className={'px-4 py-2.5 rounded-xl font-medium text-sm transition-all ' +
                    (idx === currentIndex
                      ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-lg shadow-pink-500/25'
                      : (theme === 'dark'
                        ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border border-neutral-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200')
                    )
                  }
                >
                  <i className={'fas fa-camera mr-2 ' + (idx === currentIndex ? '' : 'opacity-60')}></i>
                  {ANGLE_LABELS[img.angle] || img.angle}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* BOTÕES DE AÇÃO */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-2xl border p-4 mt-6'}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Salvar */}
            <button
              onClick={handleSave}
              disabled={isSaved}
              className={'py-3.5 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ' +
                (isSaved
                  ? (theme === 'dark' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-green-100 text-green-600 border border-green-200')
                  : 'bg-gradient-to-r from-pink-500 to-orange-400 text-white hover:opacity-90 shadow-lg shadow-pink-500/25'
                )
              }
            >
              <i className={'fas ' + (isSaved ? 'fa-check' : 'fa-save')}></i>
              <span>{isSaved ? 'Salvo' : 'Salvar'}</span>
            </button>

            {/* Gerar Novamente */}
            <button
              onClick={onRegenerate}
              className={(theme === 'dark' ? 'bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200') + ' py-3.5 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2'}
            >
              <i className="fas fa-rotate"></i>
              <span>Gerar Novamente</span>
            </button>

            {/* Baixar */}
            <button
              onClick={handleDownload}
              className={(theme === 'dark' ? 'bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200') + ' py-3.5 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2'}
            >
              <i className="fas fa-download"></i>
              <span>Baixar</span>
            </button>

            {/* Excluir */}
            <button
              onClick={handleDeleteClick}
              className={(theme === 'dark' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30' : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200') + ' py-3.5 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2'}
            >
              <i className="fas fa-trash"></i>
              <span>Excluir</span>
            </button>
          </div>

          {/* Baixar Todas */}
          {images.length > 1 && (
            <button
              onClick={handleDownloadAll}
              className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200') + ' w-full mt-3 py-3 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2'}
            >
              <i className="fas fa-download"></i>
              <span>Baixar Todas as Fotos ({images.length})</span>
            </button>
          )}
        </div>

        {/* Dica de navegação */}
        <p className={(theme === 'dark' ? 'text-neutral-600' : 'text-gray-400') + ' text-xs text-center mt-4'}>
          <i className="fas fa-keyboard mr-1"></i>
          Use as setas ← → do teclado para navegar
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL - DESEJA SALVAR? */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowExitModal(false)}></div>
          <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' relative z-10 w-full max-w-md rounded-2xl border p-6 shadow-2xl'}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <i className="fas fa-exclamation-triangle text-yellow-500 text-xl"></i>
              </div>
              <div>
                <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold'}>Sair sem salvar?</h3>
                <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-sm'}>As imagens geradas serão perdidas</p>
              </div>
            </div>

            <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-sm mb-6'}>
              Você ainda não salvou as imagens geradas. Deseja salvar antes de sair?
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => confirmExit(true)}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all"
              >
                <i className="fas fa-save mr-2"></i>Salvar e Sair
              </button>
              <button
                onClick={() => confirmExit(false)}
                className={(theme === 'dark' ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200') + ' w-full py-3 rounded-xl font-semibold text-sm transition-all'}
              >
                Sair sem Salvar
              </button>
              <button
                onClick={() => setShowExitModal(false)}
                className={(theme === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' w-full py-2 text-sm font-medium transition-all'}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL - CONFIRMAR EXCLUSÃO */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}></div>
          <div className={(theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' relative z-10 w-full max-w-md rounded-2xl border p-6 shadow-2xl'}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <i className="fas fa-trash text-red-500 text-xl"></i>
              </div>
              <div>
                <h3 className={(theme === 'dark' ? 'text-white' : 'text-gray-900') + ' text-lg font-semibold'}>Excluir imagens?</h3>
                <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-500') + ' text-sm'}>Esta ação não pode ser desfeita</p>
              </div>
            </div>

            <p className={(theme === 'dark' ? 'text-neutral-400' : 'text-gray-600') + ' text-sm mb-6'}>
              Tem certeza que deseja excluir {images.length > 1 ? 'todas as ' + images.length + ' imagens geradas' : 'a imagem gerada'}? Esta ação é permanente.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className={(theme === 'dark' ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200') + ' flex-1 py-3 rounded-xl font-semibold text-sm transition-all'}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold text-sm hover:bg-red-600 transition-all"
              >
                <i className="fas fa-trash mr-2"></i>Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
