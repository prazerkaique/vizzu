/**
 * ═══════════════════════════════════════════════════════════════
 * VIZZU - Utilitário de Compressão de Imagens
 * ═══════════════════════════════════════════════════════════════
 *
 * Este módulo comprime imagens antes do upload para reduzir
 * o consumo de banda (egress) do Supabase.
 *
 * CONFIGURAÇÃO FÁCIL:
 * - Para desativar: mude COMPRESSION_ENABLED para false
 * - Para ajustar qualidade: mude COMPRESSION_QUALITY (0.1 a 1.0)
 *
 * ECONOMIA ESTIMADA:
 * - Foto iPhone 4MB → ~200KB (95% menor)
 * - Screenshot 2MB → ~150KB (92% menor)
 */

import imageCompression from 'browser-image-compression';

// ═══════════════════════════════════════════════════════════════
// CONFIGURAÇÕES - AJUSTE AQUI SE NECESSÁRIO
// ═══════════════════════════════════════════════════════════════

/** Ativar/desativar compressão globalmente */
export const COMPRESSION_ENABLED = true;

/** Qualidade da imagem (0.1 a 1.0) - 0.85 = ótimo balanço qualidade/tamanho */
export const COMPRESSION_QUALITY = 0.85;

/** Tamanho máximo em MB (imagens maiores serão reduzidas) */
export const MAX_SIZE_MB = 1;

/** Largura máxima em pixels (mantém proporção) */
export const MAX_WIDTH_PX = 1920;

/** Altura máxima em pixels (mantém proporção) */
export const MAX_HEIGHT_PX = 1920;

/** Usar WebP quando possível (mais eficiente que JPEG) */
export const USE_WEBP = true;

// ═══════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════

export interface CompressionResult {
  blob: Blob;
  base64: string;
  originalSize: number;
  compressedSize: number;
  savings: number; // Porcentagem economizada
  wasCompressed: boolean;
}

export interface CompressionOptions {
  /** Qualidade (0.1 a 1.0) - sobrescreve COMPRESSION_QUALITY */
  quality?: number;
  /** Tamanho máximo em MB */
  maxSizeMB?: number;
  /** Largura máxima em pixels */
  maxWidthOrHeight?: number;
  /** Forçar compressão mesmo se COMPRESSION_ENABLED = false */
  force?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// FUNÇÕES PRINCIPAIS
// ═══════════════════════════════════════════════════════════════

/**
 * Comprime uma imagem (File ou Blob) e retorna informações detalhadas
 */
export async function compressImage(
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const originalSize = file.size;

  // Se compressão desativada e não forçada, retorna original
  if (!COMPRESSION_ENABLED && !options.force) {
    const base64 = await blobToBase64(file);
    return {
      blob: file instanceof Blob ? file : file,
      base64,
      originalSize,
      compressedSize: originalSize,
      savings: 0,
      wasCompressed: false,
    };
  }

  try {
    // Converter Blob para File se necessário
    const inputFile = file instanceof File
      ? file
      : new File([file], 'image.jpg', { type: file.type || 'image/jpeg' });

    // Opções de compressão
    const compressionOptions = {
      maxSizeMB: options.maxSizeMB ?? MAX_SIZE_MB,
      maxWidthOrHeight: options.maxWidthOrHeight ?? Math.max(MAX_WIDTH_PX, MAX_HEIGHT_PX),
      useWebWorker: true,
      initialQuality: options.quality ?? COMPRESSION_QUALITY,
      fileType: USE_WEBP ? 'image/webp' : undefined,
    };

    // Comprimir
    const compressedBlob = await imageCompression(inputFile, compressionOptions);
    const compressedSize = compressedBlob.size;

    // Converter para base64
    const base64 = await blobToBase64(compressedBlob);

    // Calcular economia
    const savings = Math.round((1 - compressedSize / originalSize) * 100);

    return {
      blob: compressedBlob,
      base64,
      originalSize,
      compressedSize,
      savings: Math.max(0, savings),
      wasCompressed: true,
    };
  } catch (error) {
    // Em caso de erro, retorna original
    console.error('Erro na compressão de imagem:', error);
    const base64 = await blobToBase64(file);
    return {
      blob: file instanceof Blob ? file : file,
      base64,
      originalSize,
      compressedSize: originalSize,
      savings: 0,
      wasCompressed: false,
    };
  }
}

/**
 * Comprime uma imagem e retorna apenas o base64 (uso mais comum)
 */
export async function compressImageToBase64(
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<string> {
  const result = await compressImage(file, options);
  return result.base64;
}

/**
 * Comprime uma imagem a partir de uma URL ou base64 existente
 * Útil para recomprimir imagens já salvas
 */
export async function compressImageFromUrl(
  url: string,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  try {
    // Buscar imagem
    const response = await fetch(url);
    const blob = await response.blob();

    // Comprimir
    return await compressImage(blob, options);
  } catch (error) {
    console.error('Erro ao comprimir imagem da URL:', error);
    throw error;
  }
}

/**
 * Comprime uma imagem base64 e retorna novo base64
 */
export async function compressBase64Image(
  base64: string,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  try {
    // Converter base64 para blob
    const blob = await base64ToBlob(base64);

    // Comprimir
    return await compressImage(blob, options);
  } catch (error) {
    console.error('Erro ao comprimir imagem base64:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════════

/**
 * Converte Blob/File para base64
 */
export function blobToBase64(blob: Blob | File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Falha ao converter para base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Converte base64 para Blob
 */
export async function base64ToBlob(base64: string): Promise<Blob> {
  // Extrair tipo MIME e dados
  const matches = base64.match(/^data:(.+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Base64 inválido');
  }

  const mimeType = matches[1];
  const data = matches[2];

  // Decodificar
  const byteCharacters = atob(data);
  const byteArrays: BlobPart[] = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);

    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    byteArrays.push(new Uint8Array(byteNumbers));
  }

  return new Blob(byteArrays, { type: mimeType });
}

/**
 * Formata bytes para string legível (ex: "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Verifica se compressão está ativa
 */
export function isCompressionEnabled(): boolean {
  return COMPRESSION_ENABLED;
}
