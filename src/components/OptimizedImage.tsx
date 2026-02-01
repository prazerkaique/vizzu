import React, { useState } from 'react';
import { getOptimizedImageUrl, type ImageSize } from '../utils/imageUrl';

interface OptimizedImageProps {
  src: string | undefined;
  size?: ImageSize;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  objectFit?: 'cover' | 'contain';
  imgStyle?: React.CSSProperties;
}

/**
 * Componente de imagem otimizada com:
 * - Placeholder pulse enquanto carrega
 * - Thumbnail server-side via Supabase Image Transformation
 * - Fade-in suave quando a imagem fica pronta
 */
export function OptimizedImage({
  src,
  size = 'thumb',
  alt = '',
  className = '',
  style,
  onClick,
  objectFit = 'contain',
  imgStyle,
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const optimizedSrc = getOptimizedImageUrl(src, size);

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
        style={imgStyle}
      />
    </div>
  );
}
