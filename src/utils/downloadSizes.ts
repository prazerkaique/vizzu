// ═══════════════════════════════════════════════════════════════
// VIZZU - Download Sizes (presets para e-commerce)
// ═══════════════════════════════════════════════════════════════

export type DownloadFormat = 'png' | 'webp' | 'jpg';

export interface DownloadPreset {
  id: string;
  label: string;
  description: string;
  icon: string;
  width: number | null;   // null = original
  quality: number;
  format: DownloadFormat;
  formatLabel: string;
}

export const DOWNLOAD_PRESETS: DownloadPreset[] = [
  {
    id: 'original',
    label: 'Original (Alta)',
    description: 'Sem redimensionar \u00b7 Qualidade m\u00e1xima',
    icon: 'expand',
    width: null,
    quality: 100,
    format: 'png',
    formatLabel: 'PNG',
  },
  {
    id: 'ecommerce',
    label: 'E-commerce \u00b7 2048px',
    description: 'Shopify, VTEX, WooCommerce',
    icon: 'store',
    width: 2048,
    quality: 90,
    format: 'webp',
    formatLabel: 'WebP',
  },
  {
    id: 'marketplaces',
    label: 'Marketplaces \u00b7 1200px',
    description: 'Mercado Livre, Amazon, Shopee',
    icon: 'tags',
    width: 1200,
    quality: 85,
    format: 'jpg',
    formatLabel: 'JPEG',
  },
  {
    id: 'social',
    label: 'Redes Sociais \u00b7 1080px',
    description: 'Instagram, Facebook, Pinterest',
    icon: 'hashtag',
    width: 1080,
    quality: 85,
    format: 'jpg',
    formatLabel: 'JPEG',
  },
  {
    id: 'web',
    label: 'Web \u00b7 800px',
    description: 'Blog, email, newsletter',
    icon: 'globe',
    width: 800,
    quality: 80,
    format: 'webp',
    formatLabel: 'WebP',
  },
  {
    id: 'thumbnail',
    label: 'Miniatura \u00b7 400px',
    description: 'WhatsApp, cat\u00e1logos, listagens',
    icon: 'compress',
    width: 400,
    quality: 75,
    format: 'webp',
    formatLabel: 'WebP',
  },
];

const FORMAT_EXTENSIONS: Record<DownloadFormat, string> = {
  png: '.png',
  webp: '.webp',
  jpg: '.jpg',
};

/**
 * Monta URL wsrv.nl para download com formato/tamanho específico.
 * Se width=null (Original), retorna a URL sem resize.
 */
export function getDownloadUrl(url: string, preset: DownloadPreset): string {
  // data: e blob: não passam pelo wsrv.nl
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  // Original: sem processamento wsrv.nl
  if (!preset.width) return url;

  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${preset.width}&q=${preset.quality}&fit=contain&output=${preset.format}`;
}

/**
 * Monta nome de arquivo padronizado para download.
 * Ex: "Camiseta Polo - VStudio - Frente - E-commerce.webp"
 */
export function buildFilename(
  productName: string,
  featurePrefix: string,
  imageLabel: string,
  preset: DownloadPreset
): string {
  const sanitize = (s: string) =>
    s.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();

  const parts = [
    sanitize(productName),
    featurePrefix,
    sanitize(imageLabel),
    preset.id === 'original' ? 'Original' : preset.label.split(' \u00b7 ')[0],
  ];

  return parts.join(' - ') + FORMAT_EXTENSIONS[preset.format];
}

/**
 * Tipo para imagens coletadas de qualquer feature.
 */
export interface DownloadableImage {
  url: string;
  label: string;
  featurePrefix: string;
}
