import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useImageViewer } from './ImageViewerContext';
import { ZoomableImage } from './ZoomableImage';
import { getOptimizedImageUrl } from '../../utils/imageUrl';
import { smartDownload } from '../../utils/downloadHelper';
import { useSpringAnimation, SPRING } from '../../utils/springAnimation';

export function ImageViewer() {
  const { state, closeViewer } = useImageViewer();
  const { isOpen, src, alt, onDownload } = state;

  const [displaySrc, setDisplaySrc] = useState('');
  const [fullLoaded, setFullLoaded] = useState(false);
  const [dismissY, setDismissY] = useState(0);
  const [bgOpacity, setBgOpacity] = useState(0);
  const [showUI, setShowUI] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  const springBg = useSpringAnimation();
  const closingRef = useRef(false);

  // Open animation
  useEffect(() => {
    if (isOpen && src) {
      closingRef.current = false;
      setIsClosing(false);
      setDismissY(0);
      setShowUI(true);
      setFullLoaded(false);

      // Start with display-quality image (likely cached)
      const displayUrl = getOptimizedImageUrl(src, 'display') || src;
      setDisplaySrc(displayUrl);

      // Fade in background
      requestAnimationFrame(() => setBgOpacity(1));

      // Lock body scroll
      document.body.classList.add('image-viewer-open');

      // Preload full-quality image
      const fullUrl = getOptimizedImageUrl(src, 'full') || src;
      if (fullUrl !== displayUrl) {
        const img = new Image();
        img.onload = () => {
          if ('decode' in img) {
            img.decode().then(() => {
              if (!closingRef.current) {
                setDisplaySrc(fullUrl);
                setFullLoaded(true);
              }
            }).catch(() => {
              if (!closingRef.current) {
                setDisplaySrc(fullUrl);
                setFullLoaded(true);
              }
            });
          } else {
            if (!closingRef.current) {
              setDisplaySrc(fullUrl);
              setFullLoaded(true);
            }
          }
        };
        img.src = fullUrl;
      } else {
        setFullLoaded(true);
      }

      // Push history state for back button handling
      window.history.pushState({ imageViewer: true }, '');
    }

    return () => {
      document.body.classList.remove('image-viewer-open');
    };
  }, [isOpen, src]);

  // Handle back button
  useEffect(() => {
    if (!isOpen) return;

    const handlePopState = (e: PopStateEvent) => {
      if (isOpen) {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setIsClosing(true);
    setBgOpacity(0);

    // Remove the history state we pushed (if it's ours)
    if (window.history.state?.imageViewer) {
      window.history.back();
    }

    // Wait for fade out then unmount
    setTimeout(() => {
      setDisplaySrc('');
      setFullLoaded(false);
      closeViewer();
    }, 250);
  }, [closeViewer]);

  const handleDismiss = useCallback(() => {
    handleClose();
  }, [handleClose]);

  const handleDismissDrag = useCallback((y: number) => {
    setDismissY(y);
    const progress = Math.min(1, Math.abs(y) / 300);
    setBgOpacity(1 - progress * 0.6);
  }, []);

  const handleScaleChange = useCallback((scale: number) => {
    // Hide/show UI based on zoom
    setShowUI(scale <= 1.05);
  }, []);

  const handleDownload = useCallback(() => {
    if (onDownload) {
      onDownload();
    } else if (src) {
      smartDownload(src, {
        filename: `vizzu-${Date.now()}.png`,
      });
    }
  }, [src, onDownload]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      style={{
        backgroundColor: `rgba(0, 0, 0, ${bgOpacity * 0.95})`,
        transition: isClosing ? 'background-color 250ms ease-out' : 'background-color 200ms ease-out',
      }}
    >
      {/* Header */}
      <div
        className="relative z-10 flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{
          paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))',
          opacity: showUI ? 1 : 0,
          transition: 'opacity 200ms ease',
          pointerEvents: showUI ? 'auto' : 'none',
        }}
      >
        {/* Loading indicator */}
        <div className="flex items-center gap-2">
          {!fullLoaded && (
            <div className="flex items-center gap-2 text-white/60 text-xs">
              <div className="w-3 h-3 border-2 border-white/40 border-t-white/90 rounded-full animate-spin" />
              <span>HD</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Download */}
          <button
            onClick={handleDownload}
            className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 active:bg-white/30 transition-colors"
          >
            <i className="fas fa-download text-sm"></i>
          </button>

          {/* Close */}
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 active:bg-white/30 transition-colors"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>
      </div>

      {/* Zoomable Image */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden"
        style={{
          transform: `translate3d(0, ${dismissY}px, 0)`,
          transition: dismissY === 0 && !isClosing ? 'transform 300ms cubic-bezier(0.2, 0.9, 0.3, 1)' : 'none',
        }}
      >
        <ZoomableImage
          src={displaySrc}
          alt={alt}
          className="w-full h-full"
          onDismiss={handleDismiss}
          onScaleChange={handleScaleChange}
          onDismissDrag={handleDismissDrag}
        />
      </div>

      {/* Bottom safe area spacer */}
      <div
        className="flex-shrink-0"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          opacity: showUI ? 1 : 0,
          transition: 'opacity 200ms ease',
        }}
      />
    </div>
  );
}
