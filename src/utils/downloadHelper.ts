// ═══════════════════════════════════════════════════════════════
// VIZZU - Download Helper (Web Share API + Fallback)
// ═══════════════════════════════════════════════════════════════

/**
 * Detecta se está em dispositivo móvel
 */
const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Verifica se Web Share API está disponível e suporta compartilhamento de arquivos
 */
const canUseWebShare = async (): Promise<boolean> => {
  if (!navigator.share || !navigator.canShare) return false;

  // Testa se pode compartilhar arquivos
  const testFile = new File(['test'], 'test.png', { type: 'image/png' });
  return navigator.canShare({ files: [testFile] });
};

/**
 * Converte URL de imagem para File object
 */
const urlToFile = async (url: string, filename: string): Promise<File> => {
  const response = await fetch(url);
  const blob = await response.blob();
  const mimeType = blob.type || 'image/png';
  return new File([blob], filename, { type: mimeType });
};

/**
 * Converte base64/data URL para File object
 */
const dataUrlToFile = (dataUrl: string, filename: string): File => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

/**
 * Download tradicional (fallback) — exportado para uso no ZIP
 */
export const traditionalDownload = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Interface para opções de download
 */
export interface DownloadOptions {
  /** Nome do arquivo (sem extensão) */
  filename: string;
  /** Título para o share sheet (opcional) */
  shareTitle?: string;
  /** Texto para o share sheet (opcional) */
  shareText?: string;
}

/**
 * Faz download de imagem - usa Web Share no mobile (salva na galeria)
 * e download tradicional no desktop
 *
 * @param imageSource - URL da imagem ou data URL (base64)
 * @param options - Opções de download
 * @returns Promise<boolean> - true se sucesso
 */
export const smartDownload = async (
  imageSource: string,
  options: DownloadOptions
): Promise<boolean> => {
  const { filename, shareTitle, shareText } = options;

  // Determina extensão e nome completo
  const isDataUrl = imageSource.startsWith('data:');
  const extension = isDataUrl
    ? (imageSource.includes('image/jpeg') ? '.jpg' : '.png')
    : (imageSource.includes('.jpg') || imageSource.includes('.jpeg') ? '.jpg' : '.png');
  const fullFilename = filename.includes('.') ? filename : `${filename}${extension}`;

  try {
    // Converte para File
    const file = isDataUrl
      ? dataUrlToFile(imageSource, fullFilename)
      : await urlToFile(imageSource, fullFilename);

    // Tenta Web Share no mobile
    if (isMobile() && await canUseWebShare()) {
      try {
        await navigator.share({
          files: [file],
          title: shareTitle || 'Vizzu',
          text: shareText || 'Imagem gerada com Vizzu'
        });
        return true;
      } catch (shareError: any) {
        // Usuário cancelou ou erro no share
        if (shareError.name === 'AbortError') {
          return false; // Usuário cancelou, não fazer fallback
        }
        // Outro erro, tentar fallback
        console.warn('Web Share falhou, usando fallback:', shareError);
      }
    }

    // Fallback: download tradicional
    traditionalDownload(file, fullFilename);
    return true;

  } catch (error) {
    console.error('Erro no download:', error);

    // Último recurso: abrir em nova aba
    try {
      window.open(imageSource, '_blank');
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Download de múltiplas imagens
 * No mobile, compartilha todas de uma vez
 * No desktop, faz download sequencial
 */
export const smartDownloadMultiple = async (
  images: Array<{ source: string; filename: string }>,
  shareTitle?: string
): Promise<boolean> => {
  if (images.length === 0) return false;

  try {
    const files = await Promise.all(
      images.map(async (img) => {
        const isDataUrl = img.source.startsWith('data:');
        const extension = isDataUrl
          ? (img.source.includes('image/jpeg') ? '.jpg' : '.png')
          : '.png';
        const fullFilename = img.filename.includes('.') ? img.filename : `${img.filename}${extension}`;

        return isDataUrl
          ? dataUrlToFile(img.source, fullFilename)
          : await urlToFile(img.source, fullFilename);
      })
    );

    // Tenta Web Share no mobile
    if (isMobile() && await canUseWebShare()) {
      try {
        await navigator.share({
          files,
          title: shareTitle || 'Vizzu',
          text: `${files.length} imagens geradas com Vizzu`
        });
        return true;
      } catch (shareError: any) {
        if (shareError.name === 'AbortError') {
          return false;
        }
        console.warn('Web Share falhou, usando fallback:', shareError);
      }
    }

    // Fallback: download sequencial
    for (const file of files) {
      traditionalDownload(file, file.name);
      // Pequeno delay entre downloads
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    return true;

  } catch (error) {
    console.error('Erro no download múltiplo:', error);
    return false;
  }
};
