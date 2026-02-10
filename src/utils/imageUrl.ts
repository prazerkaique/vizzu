/**
 * ═══════════════════════════════════════════════════════════════
 * VIZZU - Sistema de Thumbnails via wsrv.nl (CDN gratuito)
 * ═══════════════════════════════════════════════════════════════
 *
 * Usa wsrv.nl para redimensionar imagens do Supabase Storage.
 * As imagens originais ficam no Supabase; o wsrv.nl faz o resize
 * sob demanda e cacheia na CDN global do Cloudflare.
 *
 * Isso elimina o uso de Supabase Image Transformations (limite
 * de 100 imagens/mês no plano Pro) sem custo adicional.
 *
 * URL pattern:
 *   https://wsrv.nl/?url={supabase_public_url}&w={width}&q={quality}&output=webp
 */

export type ImageSize = 'thumb' | 'preview' | 'display' | 'full';

const SIZE_CONFIG: Record<ImageSize, { width: number; quality: number } | null> = {
  thumb:   { width: 400,  quality: 75 },
  preview: { width: 800,  quality: 80 },
  display: { width: 1280, quality: 85 },
  full:    null,
};

/**
 * Converte uma URL pública para usar wsrv.nl como proxy de resize.
 * Se a URL não for http(s), retorna a original.
 */
function toTransformUrl(url: string, width: number, quality: number): string {
  if (url.startsWith('http')) {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&q=${quality}&fit=contain&output=webp`;
  }

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

/**
 * Gera URL wsrv.nl para download com formato dinâmico (webp, jpg, png).
 * Diferente de toTransformUrl que sempre retorna webp.
 */
export function getDownloadImageUrl(
  url: string,
  width: number,
  quality: number,
  format: 'webp' | 'jpg' | 'png'
): string {
  if (!url.startsWith('http')) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&q=${quality}&fit=contain&output=${format}`;
}
