// ═══════════════════════════════════════════════════════════════
// VIZZU - ZIP Download Engine (JSZip + wsrv.nl)
// ═══════════════════════════════════════════════════════════════

import { DOWNLOAD_PRESETS, getDownloadUrl, buildFilename, type DownloadableImage } from './downloadSizes';
import { traditionalDownload } from './downloadHelper';

export interface ZipProgress {
  phase: 'downloading' | 'compressing' | 'done';
  current: number;
  total: number;
  percentage: number;
}

export interface ZipEntry {
  url: string;
  productName: string;
  featurePrefix: string;
  imageLabel: string;
}

/**
 * Executa até N promises por vez (pool de concorrência).
 */
async function pooledMap<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Gera e baixa um ZIP com todas as imagens em todos os presets.
 *
 * Estrutura:
 *   featurePrefix/
 *     PresetName/
 *       ProductName - Feature - Label - Preset.ext
 */
export async function generateZipDownload(
  entries: ZipEntry[],
  zipFilename: string,
  onProgress?: (progress: ZipProgress) => void,
  signal?: AbortSignal
): Promise<boolean> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  // Total = entries × presets
  const total = entries.length * DOWNLOAD_PRESETS.length;
  let current = 0;

  const report = (phase: ZipProgress['phase']) => {
    onProgress?.({
      phase,
      current,
      total,
      percentage: Math.round((current / total) * 100),
    });
  };

  // Preparar lista flat de downloads
  const downloads = entries.flatMap((entry) =>
    DOWNLOAD_PRESETS.map((preset) => ({ entry, preset }))
  );

  // Download com concorrência limitada a 3
  report('downloading');

  await pooledMap(downloads, 3, async ({ entry, preset }) => {
    if (signal?.aborted) return;

    const downloadUrl = getDownloadUrl(entry.url, preset);
    const filename = buildFilename(
      entry.productName,
      entry.featurePrefix,
      entry.imageLabel,
      preset
    );

    // Pasta: Feature/Preset
    const presetFolder = preset.id === 'original' ? 'Original' : preset.label.split(' \u00b7 ')[0];
    const folderPath = `${entry.featurePrefix}/${presetFolder}`;

    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      zip.file(`${folderPath}/${filename}`, blob);
    } catch (err) {
      console.warn(`[ZIP] Falha ao baixar ${downloadUrl}:`, err);
      // Pula imagens que falharam — não trava o ZIP inteiro
    }

    current++;
    report('downloading');
  });

  if (signal?.aborted) return false;

  // Comprimir
  report('compressing');
  const blob = await zip.generateAsync({ type: 'blob' });
  current = total;
  report('done');

  // Salvar
  traditionalDownload(blob, zipFilename);
  return true;
}

/**
 * Shortcut: gera ZIP a partir de DownloadableImage[] + nome do produto.
 */
export async function generateZipFromImages(
  images: DownloadableImage[],
  productName: string,
  onProgress?: (progress: ZipProgress) => void,
  signal?: AbortSignal
): Promise<boolean> {
  const sanitized = productName.replace(/[<>:"/\\|?*]/g, '').trim();
  const zipFilename = `${sanitized}_Vizzu.zip`;

  const entries: ZipEntry[] = images.map((img) => ({
    url: img.url,
    productName,
    featurePrefix: img.featurePrefix,
    imageLabel: img.label,
  }));

  return generateZipDownload(entries, zipFilename, onProgress, signal);
}
