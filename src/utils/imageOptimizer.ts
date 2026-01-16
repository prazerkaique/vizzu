export interface ImageOptimizationResult {
  success: boolean;
  base64: string;
  suggestedFileName: string;
  error?: string;
}

export async function optimizeImage(imageSource: string, productName: string = ''): Promise<ImageOptimizationResult> {
  const suggestedFileName = productName.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50) + '.webp';
  
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageSource;
    });

    const size = Math.min(Math.max(img.width, img.height), 2048);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);
    
    const scale = Math.min(size / img.width, size / img.height);
    const x = (size - img.width * scale) / 2;
    const y = (size - img.height * scale) / 2;
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    
    return { success: true, base64: canvas.toDataURL('image/webp', 0.85), suggestedFileName };
  } catch (error) {
    return { success: false, base64: '', suggestedFileName, error: String(error) };
  }
}
