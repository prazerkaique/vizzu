import { useState, useEffect, useCallback, useRef } from 'react';
import { useOnboarding } from '../../hooks/useOnboarding';
import { TourExitConfirm } from './TourExitConfirm';

// ═══════════════════════════════════════════════════════════════
// FeatureTour — Tour guiado com spotlight + tooltip
// Overlay escuro com "buraco" ao redor do elemento alvo
// Tooltip posicionado via getBoundingClientRect
// ═══════════════════════════════════════════════════════════════

export interface TourStop {
  target: string;      // valor do data-tour="xxx"
  title: string;
  description: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

interface FeatureTourProps {
  featureId: string;
  stops: TourStop[];
  theme: 'dark' | 'light';
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8; // px ao redor do elemento target
const TOOLTIP_GAP = 12; // px entre spotlight e tooltip
const MAX_SPOTLIGHT_HEIGHT = 200; // cap para elementos muito altos

export function FeatureTour({ featureId, stops, theme }: FeatureTourProps) {
  const { shouldShowTour, markTourComplete, dismissAllTours } = useOnboarding();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<ResizeObserver | null>(null);
  const isDark = theme === 'dark';

  const isActive = shouldShowTour(featureId);

  // Encontrar e posicionar no elemento alvo
  const updatePosition = useCallback(() => {
    if (!isActive || !stops[currentIndex]) return;

    const targetEl = document.querySelector(`[data-tour="${stops[currentIndex].target}"]`);
    if (!targetEl) {
      // Elemento não encontrado — skip este stop
      setSpotlightRect(null);
      return;
    }

    const rect = targetEl.getBoundingClientRect();
    const rawHeight = rect.height + PADDING * 2;
    const cappedHeight = Math.min(rawHeight, MAX_SPOTLIGHT_HEIGHT);
    const spotlight: SpotlightRect = {
      top: rect.top - PADDING,
      left: rect.left - PADDING,
      width: rect.width + PADDING * 2,
      height: cappedHeight,
    };
    setSpotlightRect(spotlight);

    // Calcular posição do tooltip
    const placement = stops[currentIndex].placement;
    const tooltipWidth = Math.min(320, window.innerWidth - 32);
    const tooltipHeight = 180; // estimativa conservadora
    const style: React.CSSProperties = { maxWidth: tooltipWidth };

    const centerX = Math.max(16, Math.min(
      spotlight.left + spotlight.width / 2 - tooltipWidth / 2,
      window.innerWidth - tooltipWidth - 16
    ));

    switch (placement) {
      case 'bottom': {
        let top = spotlight.top + spotlight.height + TOOLTIP_GAP;
        // Se o tooltip sairia pela parte inferior, muda pra top
        if (top + tooltipHeight > window.innerHeight - 16) {
          top = Math.max(16, spotlight.top - tooltipHeight - TOOLTIP_GAP);
        }
        style.top = top;
        style.left = centerX;
        break;
      }
      case 'top': {
        let topVal = spotlight.top - tooltipHeight - TOOLTIP_GAP;
        // Se sairia pela parte superior, muda pra bottom
        if (topVal < 16) {
          topVal = spotlight.top + spotlight.height + TOOLTIP_GAP;
        }
        style.top = Math.max(16, topVal);
        style.left = centerX;
        break;
      }
      case 'right':
        style.top = Math.max(16, Math.min(
          spotlight.top + spotlight.height / 2 - 60,
          window.innerHeight - tooltipHeight - 16
        ));
        style.left = Math.min(
          spotlight.left + spotlight.width + TOOLTIP_GAP,
          window.innerWidth - tooltipWidth - 16
        );
        break;
      case 'left':
        style.top = Math.max(16, Math.min(
          spotlight.top + spotlight.height / 2 - 60,
          window.innerHeight - tooltipHeight - 16
        ));
        style.right = window.innerWidth - spotlight.left + TOOLTIP_GAP;
        break;
    }

    setTooltipStyle(style);
  }, [isActive, currentIndex, stops]);

  // Scroll para o elemento e posicionar
  useEffect(() => {
    if (!isActive || !stops[currentIndex]) return;

    const targetEl = document.querySelector(`[data-tour="${stops[currentIndex].target}"]`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Esperar scroll terminar antes de posicionar
      const timer = setTimeout(updatePosition, 400);
      return () => clearTimeout(timer);
    } else {
      updatePosition();
    }
  }, [isActive, currentIndex, stops, updatePosition]);

  // ResizeObserver para reposicionar se layout mudar
  useEffect(() => {
    if (!isActive) return;

    observerRef.current = new ResizeObserver(() => updatePosition());
    observerRef.current.observe(document.body);

    window.addEventListener('resize', updatePosition);
    return () => {
      observerRef.current?.disconnect();
      window.removeEventListener('resize', updatePosition);
    };
  }, [isActive, updatePosition]);

  // Fade in
  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    }
    setIsVisible(false);
  }, [isActive]);

  // Keyboard
  useEffect(() => {
    if (!isActive) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') setShowExitConfirm(true);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isActive, currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < stops.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      // Último step — finalizar
      markTourComplete(featureId);
      setIsVisible(false);
    }
  }, [currentIndex, stops.length, featureId, markTourComplete]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
  }, [currentIndex]);

  const handleExit = useCallback(() => {
    dismissAllTours();
    setShowExitConfirm(false);
    setIsVisible(false);
  }, [dismissAllTours]);

  if (!isActive) return null;

  const stop = stops[currentIndex];
  const isLast = currentIndex === stops.length - 1;

  return (
    <>
      {/* Overlay */}
      <div
        className={'fixed inset-0 z-[55] transition-opacity duration-300 ' + (isVisible ? 'opacity-100' : 'opacity-0')}
        style={{ pointerEvents: 'auto' }}
      >
        {/* Background escuro */}
        <div className="absolute inset-0 bg-black/60" onClick={() => setShowExitConfirm(true)} />

        {/* Spotlight — "buraco" via box-shadow */}
        {spotlightRect && (
          <div
            className="absolute rounded-xl transition-all duration-300 ease-out"
            style={{
              top: spotlightRect.top,
              left: spotlightRect.left,
              width: spotlightRect.width,
              height: spotlightRect.height,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Tooltip */}
        <div
          className={
            'fixed rounded-xl p-4 shadow-2xl border transition-all duration-300 ' +
            (isDark
              ? 'bg-neutral-900 border-neutral-700 text-white'
              : 'bg-white border-gray-200 text-gray-900') +
            (isVisible ? ' opacity-100 translate-y-0' : ' opacity-0 translate-y-2')
          }
          style={tooltipStyle}
        >
          {/* Botão X no canto */}
          <button
            onClick={() => setShowExitConfirm(true)}
            className={
              'absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors ' +
              (isDark ? 'text-neutral-500 hover:text-white hover:bg-neutral-700' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100')
            }
          >
            <i className="fas fa-times" />
          </button>

          {/* Contador */}
          <div className={
            'text-[10px] font-medium uppercase tracking-wider mb-2 ' +
            (isDark ? 'text-neutral-500' : 'text-gray-400')
          }>
            {currentIndex + 1} de {stops.length}
          </div>

          {/* Título */}
          <h4 className="text-sm font-bold mb-1 pr-6">
            {stop.title}
          </h4>

          {/* Descrição */}
          <p className={
            'text-xs leading-relaxed mb-4 ' +
            (isDark ? 'text-neutral-400' : 'text-gray-500')
          }>
            {stop.description}
          </p>

          {/* Botões */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ' +
                (currentIndex === 0
                  ? 'opacity-0 pointer-events-none'
                  : isDark
                    ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100')
              }
            >
              <i className="fas fa-arrow-left mr-1" />
              Anterior
            </button>

            <button
              onClick={handleNext}
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:opacity-90 transition-opacity"
            >
              {isLast ? (
                <>Entendi! <i className="fas fa-check ml-1" /></>
              ) : (
                <>Próximo <i className="fas fa-arrow-right ml-1" /></>
              )}
            </button>
          </div>

          {/* Barra de progresso */}
          <div className={
            'mt-3 flex gap-1 ' + (stops.length > 6 ? 'hidden' : '')
          }>
            {stops.map((_, i) => (
              <div
                key={i}
                className={
                  'h-1 rounded-full flex-1 transition-colors ' +
                  (i <= currentIndex
                    ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]'
                    : isDark ? 'bg-neutral-700' : 'bg-gray-200')
                }
              />
            ))}
          </div>
        </div>
      </div>

      {/* Modal de confirmação */}
      {showExitConfirm && (
        <TourExitConfirm
          theme={theme}
          onContinue={() => setShowExitConfirm(false)}
          onExit={handleExit}
        />
      )}
    </>
  );
}
