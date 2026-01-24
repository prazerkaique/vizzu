// ═══════════════════════════════════════════════════════════════
// VIZZU - Look Composer Result (Página de Pós-Criação)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import { Product, LookComposition, SavedModel } from '../../types';

type ExportQuality = 'high' | 'performance';

interface LookComposerResultProps {
  product: Product;
  generatedImageUrl: string;
  generatedBackImageUrl?: string;  // Imagem de costas (opcional)
  generationId: string;
  lookMode: 'composer' | 'describe';
  lookComposition?: LookComposition;
  describedLook?: {
    top: string;
    bottom: string;
    shoes: string;
    accessories: string;
  };
  selectedModel?: SavedModel | null;
  backgroundType: 'studio' | 'custom' | 'prompt';
  creditsUsed: number;
  userCredits: number;
  onSave: () => void;
  onRegenerate: () => void;
  onDelete: () => void;
  onBack: () => void;
  onNewLook?: () => void;  // Criar novo look com o mesmo produto
  theme?: 'dark' | 'light';
}

// Labels dos slots em português
const SLOT_LABELS: Record<string, string> = {
  'head': 'Cabeça',
  'top': 'Parte de Cima',
  'bottom': 'Parte de Baixo',
  'feet': 'Calçados',
  'accessory1': 'Acessório 1',
  'accessory2': 'Acessório 2'
};

// Ícones dos slots
const SLOT_ICONS: Record<string, string> = {
  'head': 'fa-hat-wizard',
  'top': 'fa-shirt',
  'bottom': 'fa-person',
  'feet': 'fa-shoe-prints',
  'accessory1': 'fa-gem',
  'accessory2': 'fa-ring'
};

export const LookComposerResult: React.FC<LookComposerResultProps> = ({
  product,
  generatedImageUrl,
  generatedBackImageUrl,
  generationId,
  lookMode,
  lookComposition,
  describedLook,
  selectedModel,
  backgroundType,
  creditsUsed,
  userCredits,
  onSave,
  onRegenerate,
  onDelete,
  onBack,
  onNewLook,
  theme = 'dark'
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'back' | null>(null);
  const [timeAgo, setTimeAgo] = useState('agora');
  const [exportQuality, setExportQuality] = useState<ExportQuality>('high');
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);

  // Estado para alternar entre frente e costas
  const [currentView, setCurrentView] = useState<'front' | 'back'>('front');
  const hasBackImage = !!generatedBackImageUrl;
  const totalImages = hasBackImage ? 2 : 1;

  // Zoom com hover
  const [isHovering, setIsHovering] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const isDark = theme === 'dark';

  // Calcular tempo desde a geração
  useEffect(() => {
    const updateTimeAgo = () => {
      setTimeAgo('agora');
    };
    updateTimeAgo();
    const interval = setInterval(() => {
      // Para simplificar, mantemos "agora" por um tempo
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Obter imagem original do produto
  const getOriginalImage = (): string => {
    if (product.originalImages?.front?.url) return product.originalImages.front.url;
    if (product.images?.[0]?.url) return product.images[0].url;
    if (product.images?.[0]?.base64) return product.images[0].base64;
    return '';
  };

  const originalImage = getOriginalImage();
  const originalBackImage = product.originalImages?.back?.url || '';

  // Determinar qual imagem mostrar
  const getCurrentGeneratedImage = () => {
    if (currentView === 'back' && generatedBackImageUrl) {
      return generatedBackImageUrl;
    }
    return generatedImageUrl;
  };

  const getCurrentOriginalImage = () => {
    if (currentView === 'back' && originalBackImage) {
      return originalBackImage;
    }
    return originalImage;
  };

  const displayImage = showOriginal ? getCurrentOriginalImage() : getCurrentGeneratedImage();

  // Zoom com hover - mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePosition({ x, y });
  };

  // Salvar
  const handleSave = () => {
    setIsSaved(true);
    onSave();
  };

  // Download da imagem atual
  const handleDownload = async () => {
    const imageToDownload = getCurrentGeneratedImage();
    if (!imageToDownload) return;
    try {
      const response = await fetch(imageToDownload);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const viewSuffix = hasBackImage ? `-${currentView}` : '';
      a.download = `${product.sku}-look-composer${viewSuffix}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(imageToDownload, '_blank');
    }
  };

  // Download de todas as imagens (frente e costas)
  const handleDownloadAll = async () => {
    // Baixar frente
    if (generatedImageUrl) {
      try {
        const response = await fetch(generatedImageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${product.sku}-look-composer-frente.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch {
        window.open(generatedImageUrl, '_blank');
      }
    }
    // Baixar costas (com delay para não sobrescrever)
    if (generatedBackImageUrl) {
      await new Promise(resolve => setTimeout(resolve, 500));
      try {
        const response = await fetch(generatedBackImageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${product.sku}-look-composer-costas.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch {
        window.open(generatedBackImageUrl, '_blank');
      }
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

  // Obter peças do look
  const lookPieces = lookComposition ? Object.entries(lookComposition) : [];

  return (
    <div className={'min-h-screen flex flex-col overflow-y-auto ' + (isDark ? 'bg-black' : 'bg-gray-50')}>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HEADER - Gradient Pink → Orange */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-3 sticky top-0 z-40 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackClick}
              className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/30 transition-all"
            >
              <i className="fas fa-arrow-left text-sm"></i>
            </button>
            <div>
              <h1 className="text-white text-sm font-semibold">Look Criado!</h1>
              <p className="text-white/70 text-xs truncate max-w-[150px] md:max-w-none">{product.name}</p>
            </div>
          </div>

          {/* Créditos */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-lg">
              <span className="text-white/80 text-[10px]">-{creditsUsed}</span>
              <i className="fas fa-ticket text-white/80 text-[8px]"></i>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-lg">
              <span className="text-white font-semibold text-[10px]">{userCredits}</span>
              <i className="fas fa-coins text-yellow-300 text-[8px]"></i>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CONTEÚDO - Desktop: 2 colunas | Mobile: empilhado */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* COLUNA ESQUERDA - Imagem (60% = 3/5) */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-3 flex flex-col">
            <div
              className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-2xl border overflow-hidden flex flex-col'}
            >
              {/* Switch Original/Gerada */}
              <div className={'flex items-center justify-between px-4 py-2 border-b ' + (isDark ? 'border-neutral-800' : 'border-gray-100')}>
                <div className="flex items-center gap-3">
                  <span className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-[10px] uppercase tracking-wide'}>
                    {showOriginal ? 'Produto Original' : 'Look Gerado'}
                  </span>

                  {/* Toggle Frente/Costas - só aparece se tem imagem de costas */}
                  {hasBackImage && (
                    <div className={'flex items-center gap-1 p-0.5 rounded-lg ' + (isDark ? 'bg-neutral-800' : 'bg-gray-100')}>
                      <button
                        onClick={() => setCurrentView('front')}
                        className={'px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ' +
                          (currentView === 'front'
                            ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-sm'
                            : isDark ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700')
                        }
                      >
                        <i className="fas fa-eye mr-1"></i>Frente
                      </button>
                      <button
                        onClick={() => setCurrentView('back')}
                        className={'px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ' +
                          (currentView === 'back'
                            ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-sm'
                            : isDark ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700')
                        }
                      >
                        <i className="fas fa-eye mr-1"></i>Costas
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setShowOriginal(!showOriginal)}
                  className={'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ' +
                    (isDark
                      ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
                  }
                >
                  <i className={'fas ' + (showOriginal ? 'fa-wand-magic-sparkles' : 'fa-image')}></i>
                  <span>{showOriginal ? 'Ver Look' : 'Ver Original'}</span>
                </button>
              </div>

              {/* Área da Imagem com Zoom Hover */}
              <div
                ref={imageContainerRef}
                className={'relative flex items-center justify-center p-4 md:p-6 min-h-[280px] md:min-h-[450px] cursor-zoom-in overflow-hidden ' + (isDark ? 'bg-neutral-800/50' : 'bg-gray-100')}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                onMouseMove={handleMouseMove}
                onClick={() => setShowZoomModal(true)}
              >
                {displayImage ? (
                  <>
                    {/* Imagem normal */}
                    <img
                      src={displayImage}
                      alt={`${product.name} - ${showOriginal ? 'original' : 'look'}`}
                      className={'max-w-full max-h-[260px] md:max-h-[420px] object-contain rounded-lg transition-opacity duration-200 ' + (isHovering ? 'opacity-0 lg:opacity-0' : 'opacity-100')}
                      style={{ display: isHovering ? 'none' : 'block' }}
                    />

                    {/* Zoom com lupa (só desktop) */}
                    {isHovering && (
                      <div
                        className="hidden lg:block absolute inset-0 bg-no-repeat"
                        style={{
                          backgroundImage: `url(${displayImage})`,
                          backgroundPosition: `${mousePosition.x}% ${mousePosition.y}%`,
                          backgroundSize: '150%'
                        }}
                      />
                    )}

                    {/* Imagem mobile quando não está em hover */}
                    <img
                      src={displayImage}
                      alt={`${product.name}`}
                      className={'lg:hidden max-w-full max-h-[260px] object-contain rounded-lg ' + (isHovering ? '' : 'hidden')}
                    />

                    {/* Ícone de lupa (desktop) */}
                    <div className={'hidden lg:flex absolute bottom-3 right-3 w-8 h-8 rounded-lg items-center justify-center transition-all pointer-events-none ' + (isDark ? 'bg-black/60 text-white' : 'bg-white/80 text-gray-700')}>
                      <i className="fas fa-search-plus text-sm"></i>
                    </div>

                    {/* Badge indicando tipo e view */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1">
                      <div className={'px-2 py-1 rounded-lg text-[10px] font-medium ' + (showOriginal ? 'bg-neutral-600 text-white' : 'bg-gradient-to-r from-pink-500 to-orange-400 text-white')}>
                        {showOriginal ? 'Original' : 'Look Gerado'}
                      </div>
                      {hasBackImage && (
                        <div className={'px-2 py-1 rounded-lg text-[10px] font-medium ' + (isDark ? 'bg-black/60 text-white' : 'bg-white/80 text-gray-700')}>
                          <i className={'fas fa-eye mr-1 text-[8px]'}></i>
                          {currentView === 'front' ? 'Frente' : 'Costas'}
                        </div>
                      )}
                    </div>

                    {/* Badge de quantidade de imagens */}
                    {hasBackImage && (
                      <div className={'absolute top-3 right-3 px-2 py-1 rounded-lg text-[10px] font-bold ' + (isDark ? 'bg-purple-500/80 text-white' : 'bg-purple-500 text-white')}>
                        <i className="fas fa-images mr-1 text-[8px]"></i>
                        {totalImages} fotos
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-image text-3xl'}></i>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* COLUNA DIREITA - Info + Ações (40% = 2/5) */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-2 flex flex-col gap-3">

            {/* Card - Composição do Look */}
            <div className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-3'}>
              <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-semibold mb-3 flex items-center gap-2'}>
                <i className="fas fa-layer-group text-pink-400 text-[10px]"></i>
                {lookMode === 'composer' ? 'Peças do Look' : 'Look Descrito'}
              </h3>

              {lookMode === 'composer' && lookPieces.length > 0 ? (
                <div className="space-y-2">
                  {/* Peça principal (produto) */}
                  <div className={'flex items-center gap-2 p-2 rounded-lg ' + (isDark ? 'bg-pink-500/10 border border-pink-500/20' : 'bg-pink-50 border border-pink-200')}>
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                      {originalImage && (
                        <img src={originalImage} alt={product.name} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium truncate'}>{product.name}</p>
                      <p className="text-pink-400 text-[10px]">Peça Principal</p>
                    </div>
                  </div>

                  {/* Outras peças */}
                  {lookPieces.map(([slot, item]) => (
                    <div key={slot} className={'flex items-center gap-2 p-2 rounded-lg ' + (isDark ? 'bg-neutral-800' : 'bg-gray-50')}>
                      <div className={(isDark ? 'bg-neutral-700' : 'bg-gray-200') + ' w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden'}>
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <i className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' fas ' + (SLOT_ICONS[slot] || 'fa-shirt')}></i>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium truncate'}>{item.name || 'Sem nome'}</p>
                        <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>{SLOT_LABELS[slot] || slot}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : lookMode === 'describe' && describedLook ? (
                <div className="space-y-2 text-xs">
                  {describedLook.top && (
                    <div className={'p-2 rounded-lg ' + (isDark ? 'bg-neutral-800' : 'bg-gray-50')}>
                      <span className={(isDark ? 'text-neutral-500' : 'text-gray-500')}>Cima:</span>
                      <span className={(isDark ? 'text-white' : 'text-gray-900') + ' ml-2'}>{describedLook.top}</span>
                    </div>
                  )}
                  {describedLook.bottom && (
                    <div className={'p-2 rounded-lg ' + (isDark ? 'bg-neutral-800' : 'bg-gray-50')}>
                      <span className={(isDark ? 'text-neutral-500' : 'text-gray-500')}>Baixo:</span>
                      <span className={(isDark ? 'text-white' : 'text-gray-900') + ' ml-2'}>{describedLook.bottom}</span>
                    </div>
                  )}
                  {describedLook.shoes && (
                    <div className={'p-2 rounded-lg ' + (isDark ? 'bg-neutral-800' : 'bg-gray-50')}>
                      <span className={(isDark ? 'text-neutral-500' : 'text-gray-500')}>Calçados:</span>
                      <span className={(isDark ? 'text-white' : 'text-gray-900') + ' ml-2'}>{describedLook.shoes}</span>
                    </div>
                  )}
                  {describedLook.accessories && (
                    <div className={'p-2 rounded-lg ' + (isDark ? 'bg-neutral-800' : 'bg-gray-50')}>
                      <span className={(isDark ? 'text-neutral-500' : 'text-gray-500')}>Acessórios:</span>
                      <span className={(isDark ? 'text-white' : 'text-gray-900') + ' ml-2'}>{describedLook.accessories}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Nenhuma peça adicional</p>
              )}
            </div>

            {/* Card Informações */}
            <div className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-3'}>
              <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-semibold mb-3 flex items-center gap-2'}>
                <i className="fas fa-chart-simple text-pink-400 text-[10px]"></i>
                Informações
              </h3>

              <div className="space-y-2">
                {selectedModel && (
                  <div className="flex items-center gap-2">
                    <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-100') + ' w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden'}>
                      {selectedModel.images?.front ? (
                        <img src={selectedModel.images.front} alt={selectedModel.name} className="w-full h-full object-cover" />
                      ) : (
                        <i className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' fas fa-user text-[10px]'}></i>
                      )}
                    </div>
                    <div>
                      <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] uppercase tracking-wide'}>Modelo</p>
                      <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>{selectedModel.name}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-100') + ' w-7 h-7 rounded-lg flex items-center justify-center'}>
                    <i className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' fas fa-image text-[10px]'}></i>
                  </div>
                  <div>
                    <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] uppercase tracking-wide'}>Fundo</p>
                    <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>{backgroundType === 'studio' ? 'Estúdio' : 'Personalizado'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="bg-green-500/20 w-7 h-7 rounded-lg flex items-center justify-center">
                    <i className="fas fa-check text-green-400 text-[10px]"></i>
                  </div>
                  <div>
                    <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] uppercase tracking-wide'}>Status</p>
                    <p className="text-green-400 text-xs font-medium">Look gerado com sucesso</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Botão Salvar - Grande e destacado */}
            <button
              onClick={handleSave}
              disabled={isSaved}
              className={'w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ' +
                (isSaved
                  ? 'bg-green-500/20 text-green-400 border-2 border-green-500/30'
                  : 'bg-gradient-to-r from-pink-500 to-orange-400 text-white hover:opacity-90 shadow-lg shadow-pink-500/25'
                )
              }
            >
              <i className={'fas ' + (isSaved ? 'fa-check-circle' : 'fa-images')}></i>
              <span>{isSaved ? 'Look Salvo!' : 'Salvar Look'}</span>
            </button>

            {/* Botão Novo Look */}
            {onNewLook && (
              <button
                onClick={onNewLook}
                className={(isDark ? 'bg-neutral-800 text-white hover:bg-neutral-700 border-neutral-700' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200') + ' w-full py-3 rounded-xl font-semibold text-sm border transition-all flex items-center justify-center gap-2'}
              >
                <i className="fas fa-plus"></i>
                <span>Criar Novo Look</span>
              </button>
            )}

            {/* Opções de Download */}
            <div className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-3'}>
              <div className="flex items-center justify-between mb-2">
                <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] uppercase tracking-wide'}>
                  Baixar Imagem
                </p>
                <button
                  onClick={() => setShowDownloadOptions(!showDownloadOptions)}
                  className={(isDark ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' text-[10px] flex items-center gap-1'}
                >
                  <i className="fas fa-gear"></i>
                  {exportQuality === 'high' ? 'Alta Qualidade' : 'Performance'}
                </button>
              </div>

              {/* Opções de qualidade (expansível) */}
              {showDownloadOptions && (
                <div className={'mb-3 p-2 rounded-lg space-y-1.5 ' + (isDark ? 'bg-neutral-800' : 'bg-gray-50')}>
                  <button
                    onClick={() => setExportQuality('high')}
                    className={'w-full p-2 rounded-lg text-left text-xs flex items-center gap-2 transition-all ' +
                      (exportQuality === 'high'
                        ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                        : isDark ? 'hover:bg-neutral-700 text-neutral-300' : 'hover:bg-gray-100 text-gray-600')
                    }
                  >
                    <i className="fas fa-gem w-4"></i>
                    <div>
                      <span className="font-medium">Alta Qualidade</span>
                      <span className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' ml-2'}>PNG 2048px</span>
                    </div>
                    {exportQuality === 'high' && <i className="fas fa-check ml-auto text-pink-400"></i>}
                  </button>
                  <button
                    onClick={() => setExportQuality('performance')}
                    className={'w-full p-2 rounded-lg text-left text-xs flex items-center gap-2 transition-all ' +
                      (exportQuality === 'performance'
                        ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                        : isDark ? 'hover:bg-neutral-700 text-neutral-300' : 'hover:bg-gray-100 text-gray-600')
                    }
                  >
                    <i className="fas fa-bolt w-4"></i>
                    <div>
                      <span className="font-medium">Performance</span>
                      <span className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' ml-2'}>JPEG 1024px</span>
                    </div>
                    {exportQuality === 'performance' && <i className="fas fa-check ml-auto text-pink-400"></i>}
                  </button>
                </div>
              )}

              <div className={'grid gap-2 ' + (hasBackImage ? 'grid-cols-2' : 'grid-cols-1')}>
                {/* Baixar atual */}
                <button
                  onClick={handleDownload}
                  className={'py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 ' +
                    (isDark ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-white' : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700') + ' border'}
                  title={hasBackImage ? `Baixar imagem ${currentView === 'front' ? 'de frente' : 'de costas'}` : 'Baixar imagem'}
                >
                  <i className="fas fa-download text-sm"></i>
                  <span className="text-xs font-medium">{hasBackImage ? (currentView === 'front' ? 'Frente' : 'Costas') : 'Baixar'}</span>
                </button>

                {/* Baixar todas (só aparece se tem costas) */}
                {hasBackImage && (
                  <button
                    onClick={handleDownloadAll}
                    className={(isDark ? 'bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/30' : 'bg-purple-50 hover:bg-purple-100 border-purple-200') + ' py-2.5 px-4 rounded-lg border transition-all flex items-center justify-center gap-2'}
                    title="Baixar frente e costas"
                  >
                    <i className="fas fa-images text-purple-400 text-sm"></i>
                    <span className="text-purple-400 text-xs font-medium">Baixar Todas</span>
                  </button>
                )}
              </div>
            </div>

            {/* Ações Rápidas - Grid compacto */}
            <div className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm') + ' rounded-xl border p-3'}>
              <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] uppercase tracking-wide mb-2'}>
                Ações
              </p>

              <div className="grid grid-cols-3 gap-2">
                {/* Gerar Novamente */}
                <button
                  onClick={onRegenerate}
                  className={(isDark ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700' : 'bg-gray-50 hover:bg-gray-100 border-gray-200') + ' p-2.5 rounded-lg border transition-all flex flex-col items-center gap-1'}
                >
                  <i className={(isDark ? 'text-neutral-300' : 'text-gray-600') + ' fas fa-rotate text-sm'}></i>
                  <span className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-[9px]'}>Refazer</span>
                </button>

                {/* Zoom */}
                <button
                  onClick={() => setShowZoomModal(true)}
                  className={(isDark ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700' : 'bg-gray-50 hover:bg-gray-100 border-gray-200') + ' p-2.5 rounded-lg border transition-all flex flex-col items-center gap-1'}
                >
                  <i className={(isDark ? 'text-neutral-300' : 'text-gray-600') + ' fas fa-expand text-sm'}></i>
                  <span className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-[9px]'}>Ampliar</span>
                </button>

                {/* Descartar */}
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className={(isDark ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30' : 'bg-red-50 hover:bg-red-100 border-red-200') + ' p-2.5 rounded-lg border transition-all flex flex-col items-center gap-1'}
                >
                  <i className="fas fa-trash text-red-400 text-sm"></i>
                  <span className="text-red-400 text-[9px]">Excluir</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL - Zoom da Imagem com Switch */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showZoomModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={() => setShowZoomModal(false)}>
          {/* Header do Modal */}
          <div className="flex items-center justify-between p-4 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              {/* Switch Original/Gerada */}
              <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
                <button
                  onClick={() => setShowOriginal(false)}
                  className={'px-3 py-1.5 rounded-md text-xs font-medium transition-all ' +
                    (!showOriginal ? 'bg-white text-black' : 'text-white/70 hover:text-white')
                  }
                >
                  Look
                </button>
                <button
                  onClick={() => setShowOriginal(true)}
                  className={'px-3 py-1.5 rounded-md text-xs font-medium transition-all ' +
                    (showOriginal ? 'bg-white text-black' : 'text-white/70 hover:text-white')
                  }
                >
                  Original
                </button>
              </div>

              {/* Switch Frente/Costas - só aparece se tem imagem de costas */}
              {hasBackImage && (
                <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
                  <button
                    onClick={() => setCurrentView('front')}
                    className={'px-3 py-1.5 rounded-md text-xs font-medium transition-all ' +
                      (currentView === 'front' ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white' : 'text-white/70 hover:text-white')
                    }
                  >
                    <i className="fas fa-eye mr-1"></i>Frente
                  </button>
                  <button
                    onClick={() => setCurrentView('back')}
                    className={'px-3 py-1.5 rounded-md text-xs font-medium transition-all ' +
                      (currentView === 'back' ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white' : 'text-white/70 hover:text-white')
                    }
                  >
                    <i className="fas fa-eye mr-1"></i>Costas
                  </button>
                </div>
              )}
            </div>

            {/* Botão Fechar */}
            <button
              onClick={() => setShowZoomModal(false)}
              className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Imagem */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            <img
              src={displayImage}
              alt={product.name}
              className="max-w-full max-h-full object-contain"
              onClick={e => e.stopPropagation()}
            />
          </div>

          {/* Indicador de navegação para mobile */}
          {hasBackImage && (
            <div className="flex items-center justify-center gap-2 pb-4" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setCurrentView('front')}
                className={'w-2.5 h-2.5 rounded-full transition-all ' + (currentView === 'front' ? 'bg-pink-500 scale-125' : 'bg-white/30 hover:bg-white/50')}
              />
              <button
                onClick={() => setCurrentView('back')}
                className={'w-2.5 h-2.5 rounded-full transition-all ' + (currentView === 'back' ? 'bg-pink-500 scale-125' : 'bg-white/30 hover:bg-white/50')}
              />
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL - Sair sem Salvar */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowExitModal(false)}></div>
          <div className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' relative z-10 w-full max-w-sm rounded-2xl border p-5 shadow-2xl'}>
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-exclamation-triangle text-yellow-500 text-xl"></i>
              </div>
              <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-base font-bold'}>Sair sem salvar?</h3>
              <p className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-xs mt-1'}>O look gerado será perdido</p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => confirmExit(true)}
                className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-xl font-semibold text-sm hover:opacity-90"
              >
                <i className="fas fa-images mr-2"></i>Salvar e Sair
              </button>
              <button
                onClick={() => confirmExit(false)}
                className={(isDark ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200') + ' w-full py-2.5 rounded-xl font-semibold text-sm'}
              >
                Sair sem Salvar
              </button>
              <button
                onClick={() => setShowExitModal(false)}
                className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' w-full py-2 text-xs font-medium'}
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
          <div className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' relative z-10 w-full max-w-sm rounded-2xl border p-5 shadow-2xl'}>
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-trash text-red-500 text-xl"></i>
              </div>
              <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-base font-bold'}>Descartar look?</h3>
              <p className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-xs mt-1'}>Esta ação não pode ser desfeita</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className={(isDark ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200') + ' flex-1 py-2.5 rounded-xl font-semibold text-sm'}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-semibold text-sm hover:bg-red-600"
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
