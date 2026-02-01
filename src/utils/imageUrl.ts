/**
 * ═══════════════════════════════════════════════════════════════
 * VIZZU - Sistema de Thumbnails Server-Side (Supabase Pro)
 * ═══════════════════════════════════════════════════════════════
 *
 * Usa Supabase Image Transformation para servir thumbnails
 * diretamente do servidor. O browser nunca baixa a imagem
 * original para grids e listagens.
 *
 * URLs Supabase storage:
 *   /storage/v1/object/public/{bucket}/{path}       → original
 *   /storage/v1/render/image/public/{bucket}/{path}  → transformed
 */

export type ImageSize = 'thumb' | 'preview' | 'display' | 'full';

const SIZE_CONFIG: Record<ImageSize, { width: number; quality: number } | null> = {
  thumb:   { width: 400,  quality: 75 },
  preview: { width: 800,  quality: 80 },
  display: { width: 1280, quality: 85 },
  full:    null,
};

/**
 * Converte uma URL de storage Supabase para usar Image Transformation.
 * Se a URL não for do Supabase storage, retorna a original.
 */
function toTransformUrl(url: string, width: number, quality: number): string {
  // Supabase storage public URL pattern:
  //   https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
  // Transform URL pattern:
  //   https://{project}.supabase.co/storage/v1/render/image/public/{bucket}/{path}?width=X&quality=Y
  if (url.includes('/storage/v1/object/public/')) {
    return url.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    ) + `?width=${width}&quality=${quality}`;
  }

  // Not a Supabase storage URL — return as-is
  return url;
}

/**
 * Retorna a URL otimizada para o tamanho solicitado (síncrono).
 * Para URLs Supabase, usa Image Transformation server-side.
 * Para outras URLs (base64, blob, externas), retorna a original.
 */
export function getOptimizedImageUrl(
  url: string | undefined,
  size: ImageSize = 'thumb'
): string | undefined {
  if (!url) return undefined;
  if (size === 'full') return url;

  // Skip for base64 and blob URLs (already local)
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  const config = SIZE_CONFIG[size];
  if (!config) return url;

  return toTransformUrl(url, config.width, config.quality);
}

/**
 * Alias síncrono — mantido para compatibilidade.
 */
export function getImageUrl(url: string | undefined, size: ImageSize = 'full'): string | undefined {
  return getOptimizedImageUrl(url, size);
}
