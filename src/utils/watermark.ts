// ═══════════════════════════════════════════════════════════════
// VIZZU - Watermark Utility (Canvas-based)
// Grava marca d'água no arquivo de imagem para downloads do plano free.
// ═══════════════════════════════════════════════════════════════

let cachedLogo: HTMLImageElement | null = null;

function loadLogo(): Promise<HTMLImageElement> {
  if (cachedLogo) return Promise.resolve(cachedLogo);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { cachedLogo = img; resolve(img); };
    img.onerror = reject;
    img.src = '/vizzu-icon-white.png';
  });
}

/**
 * Aplica marca d'água no blob de imagem via Canvas.
 * Retorna novo Blob com a marca gravada.
 */
export async function applyWatermark(blob: Blob): Promise<Blob> {
  const [logo, imageBitmap] = await Promise.all([
    loadLogo(),
    createImageBitmap(blob),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = imageBitmap.width;
  canvas.height = imageBitmap.height;
  const ctx = canvas.getContext('2d')!;

  // Desenhar imagem original
  ctx.drawImage(imageBitmap, 0, 0);

  // Configurar marca d'água
  const logoSize = Math.max(80, Math.min(canvas.width, canvas.height) * 0.08);
  const spacing = logoSize * 2.2;

  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(-30 * Math.PI / 180);

  // Calcular área para cobrir (maior que canvas por causa da rotação)
  const diagonal = Math.sqrt(canvas.width ** 2 + canvas.height ** 2);
  const startX = -diagonal / 2;
  const startY = -diagonal / 2;

  for (let y = startY; y < diagonal; y += spacing) {
    for (let x = startX; x < diagonal; x += spacing) {
      ctx.drawImage(logo, x - logoSize / 2, y - logoSize / 2, logoSize, logoSize);
    }
  }

  ctx.restore();
  imageBitmap.close();

  // Determinar formato de saída
  const mimeType = blob.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
  const quality = mimeType === 'image/jpeg' ? 0.92 : undefined;

  return new Promise((resolve) => {
    canvas.toBlob((result) => resolve(result || blob), mimeType, quality);
  });
}
