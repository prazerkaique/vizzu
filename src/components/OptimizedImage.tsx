import React, { useState, useEffect, useRef } from 'react';
import { getOptimizedImageUrl, type ImageSize } from '../utils/imageUrl';

interface OptimizedImageProps {
  src: string | undefined;
  size?: ImageSize;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  objectFit?: 'cover' | 'contain';
}

/**
 * Componente de imagem otimizada com:
 * - Placeholder pulse enquanto carrega
 * - Thumbnail via Canvas + cache IndexedDB
 * - Fade-in suave quando a imagem fica pronta
 */
export function OptimizedImage({
  src,
  size = 'thumb',
  alt = '',
  className = '',
  style,
  onClick,
  objectFit = 'cover',
}: OptimizedImageProps) {
  const [optimizedSrc, setOptimizedSrc] = useState<string | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setLoaded(false);
    setError(false);
    setOptimizedSrc(undefined);

    if (!src) return;

    if (size === 'full') {
      setOptimizedSrc(src);
      return;
    }

    // Start with original URL for immediate display
    setOptimizedSrc(src);

    // Then optimize in background
    getOptimizedImageUrl(src, size).then((url) => {
      if (mountedRef.current && url) {
        setOptimizedSrc(url);
      }
    });

    return () => { mountedRef.current = false; };
  }, [src, size]);

  if (!src || error) {
    return (
      <div
        className={'flex items-center justify-center bg-gray-100 dark:bg-neutral-800 ' + className}
        style={style}
      >
        <i className="fas fa-image text-gray-300 dark:text-neutral-600 text-lg"></i>
      </div>
    );
  }

  return (
    <div className={'relative overflow-hidden ' + className} style={style} onClick={onClick}>
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-neutral-800 dark:to-neutral-700 animate-pulse" />
      )}
      <img
        src={optimizedSrc}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={
          'w-full h-full transition-opacity duration-300 ' +
          (objectFit === 'contain' ? 'object-contain ' : 'object-cover ') +
          (loaded ? 'opacity-100' : 'opacity-0')
        }
      />
    </div>
  );
}
