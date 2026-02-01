/**
 * ═══════════════════════════════════════════════════════════════
 * VIZZU - Sistema de Thumbnails Client-Side
 * ═══════════════════════════════════════════════════════════════
 *
 * Redimensiona imagens via Canvas e cacheia no IndexedDB.
 * Na primeira carga, baixa a original e gera o thumbnail.
 * Nas próximas, serve direto do cache (instantâneo).
 *
 * Quando migrar pro Supabase Pro, basta trocar a implementação
 * interna de getImageUrl() para usar /render/image/ na URL.
 */

export type ImageSize = 'thumb' | 'preview' | 'display' | 'full';

const SIZE_CONFIG: Record<ImageSize, { width: number; quality: number } | null> = {
  thumb:   { width: 256,  quality: 0.75 },
  preview: { width: 512,  quality: 0.80 },
  display: { width: 1024, quality: 0.85 },
  full:    null,
};

// ── IndexedDB Cache ──

const DB_NAME = 'vizzu-thumbs';
const DB_VERSION = 1;
const STORE_NAME = 'images';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getCached(key: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function setCache(key: string, value: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
  } catch {
    // Silently fail - cache is optional
  }
}

// ── Canvas Resize ──

function resizeImage(
  img: HTMLImageElement,
  maxWidth: number,
  quality: number
): string {
  let { width, height } = img;

  if (width <= maxWidth) {
    // Image already smaller, just re-encode as WebP
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/webp', quality);
  }

  const ratio = maxWidth / width;
  width = maxWidth;
  height = Math.round(height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/webp', quality);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ── In-flight request dedup ──

const pendingRequests = new Map<string, Promise<string>>();

// ── Public API ──

/**
 * Retorna uma URL otimizada para o tamanho solicitado.
 * - 'full': retorna a URL original sem modificação
 * - 'thumb'/'preview'/'display': redimensiona via Canvas e cacheia no IndexedDB
 *
 * Na primeira chamada, retorna a URL original (para exibir algo imediato)
 * e inicia o processamento em background. Use getOptimizedImageUrl() para
 * obter a versão otimizada de forma assíncrona.
 */
export function getImageUrl(url: string | undefined, size: ImageSize = 'full'): string | undefined {
  if (!url) return undefined;
  if (size === 'full') return url;
  return url; // Synchronous: returns original, async version handles optimization
}

/**
 * Versão assíncrona que retorna o thumbnail cacheado ou o gera.
 * Retorna a URL original como fallback se algo falhar.
 */
export async function getOptimizedImageUrl(
  url: string | undefined,
  size: ImageSize = 'thumb'
): Promise<string | undefined> {
  if (!url) return undefined;
  if (size === 'full') return url;

  // Skip optimization for base64 and blob URLs (already local)
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  const config = SIZE_CONFIG[size];
  if (!config) return url;

  const cacheKey = `${size}:${url}`;

  // Check cache first
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  // Dedup: if already processing this exact request, wait for it
  const pending = pendingRequests.get(cacheKey);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const img = await loadImage(url);
      const resized = resizeImage(img, config.width, config.quality);
      await setCache(cacheKey, resized);
      return resized;
    } catch {
      return url; // Fallback to original on any error
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  pendingRequests.set(cacheKey, promise);
  return promise;
}

/**
 * Limpa o cache de thumbnails (útil para liberar espaço).
 */
export async function clearThumbnailCache(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
  } catch {
    // Silently fail
  }
}
