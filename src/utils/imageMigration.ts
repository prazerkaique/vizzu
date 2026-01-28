/**
 * ═══════════════════════════════════════════════════════════════
 * VIZZU - Script de Migração para Compressão de Imagens Existentes
 * ═══════════════════════════════════════════════════════════════
 *
 * Este script comprime imagens já existentes no banco de dados
 * e no Supabase Storage para reduzir o consumo de egress.
 *
 * IMPORTANTE: Execute este script apenas uma vez!
 * Ele irá:
 * 1. Buscar todas as imagens de produtos (base64 no banco)
 * 2. Buscar todas as imagens nos buckets de storage
 * 3. Comprimir cada imagem
 * 4. Atualizar/substituir pela versão comprimida
 *
 * ATENÇÃO: Isso consome egress temporariamente (download + upload)
 * mas reduzirá significativamente o consumo futuro.
 */

import { supabase } from '../services/supabaseClient';
import { compressBase64Image, compressImage, formatFileSize } from './imageCompression';

// ═══════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════

export interface MigrationProgress {
  phase: 'idle' | 'products' | 'storage' | 'done';
  currentBucket?: string;
  total: number;
  processed: number;
  compressed: number;
  skipped: number;
  errors: number;
  totalSavings: number; // bytes economizados
  logs: MigrationLog[];
}

export interface MigrationLog {
  timestamp: Date;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface MigrationOptions {
  /** Comprimir imagens de produtos (base64 no banco) */
  compressProducts: boolean;
  /** Comprimir imagens no storage (buckets) */
  compressStorage: boolean;
  /** Buckets para processar */
  buckets: string[];
  /** ID do usuário (para filtrar apenas imagens do usuário) */
  userId?: string;
  /** Callback para atualização de progresso */
  onProgress?: (progress: MigrationProgress) => void;
  /** Modo dry-run (não salva alterações) */
  dryRun?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════

let progress: MigrationProgress = {
  phase: 'idle',
  total: 0,
  processed: 0,
  compressed: 0,
  skipped: 0,
  errors: 0,
  totalSavings: 0,
  logs: [],
};

function log(type: MigrationLog['type'], message: string, options?: MigrationOptions) {
  const entry: MigrationLog = { timestamp: new Date(), type, message };
  progress.logs.push(entry);

  // Console log com cor
  const colors = { info: '\x1b[36m', success: '\x1b[32m', warning: '\x1b[33m', error: '\x1b[31m' };
  console.log(`${colors[type]}[Migration] ${message}\x1b[0m`);

  options?.onProgress?.(progress);
}

function updateProgress(updates: Partial<MigrationProgress>, options?: MigrationOptions) {
  progress = { ...progress, ...updates };
  options?.onProgress?.(progress);
}

// ═══════════════════════════════════════════════════════════════
// MIGRAÇÃO DE PRODUTOS (BASE64 NO BANCO)
// ═══════════════════════════════════════════════════════════════

async function migrateProductImages(options: MigrationOptions): Promise<void> {
  log('info', 'Iniciando migração de imagens de produtos...', options);
  updateProgress({ phase: 'products' }, options);

  try {
    // Buscar todas as imagens de produtos
    let query = supabase
      .from('product_images')
      .select('id, product_id, image_data, image_type');

    if (options.userId) {
      query = query.eq('user_id', options.userId);
    }

    const { data: images, error } = await query;

    if (error) {
      log('error', `Erro ao buscar imagens: ${error.message}`, options);
      return;
    }

    if (!images || images.length === 0) {
      log('info', 'Nenhuma imagem de produto encontrada', options);
      return;
    }

    updateProgress({ total: progress.total + images.length }, options);
    log('info', `Encontradas ${images.length} imagens de produtos`, options);

    for (const image of images) {
      try {
        // Verificar se é base64
        if (!image.image_data || !image.image_data.startsWith('data:image')) {
          log('warning', `Imagem ${image.id} não é base64, pulando...`, options);
          updateProgress({ processed: progress.processed + 1, skipped: progress.skipped + 1 }, options);
          continue;
        }

        // Verificar tamanho original
        const originalSize = Math.round((image.image_data.length * 3) / 4); // Aproximação do tamanho em bytes

        // Se já é pequena (< 100KB), pular
        if (originalSize < 100 * 1024) {
          log('info', `Imagem ${image.id} já é pequena (${formatFileSize(originalSize)}), pulando...`, options);
          updateProgress({ processed: progress.processed + 1, skipped: progress.skipped + 1 }, options);
          continue;
        }

        // Comprimir
        const result = await compressBase64Image(image.image_data, { force: true });

        if (result.savings <= 5) {
          log('info', `Imagem ${image.id} já está otimizada (${result.savings}% economia), pulando...`, options);
          updateProgress({ processed: progress.processed + 1, skipped: progress.skipped + 1 }, options);
          continue;
        }

        // Atualizar no banco (se não for dry-run)
        if (!options.dryRun) {
          const { error: updateError } = await supabase
            .from('product_images')
            .update({ image_data: result.base64 })
            .eq('id', image.id);

          if (updateError) {
            log('error', `Erro ao atualizar imagem ${image.id}: ${updateError.message}`, options);
            updateProgress({ processed: progress.processed + 1, errors: progress.errors + 1 }, options);
            continue;
          }
        }

        const savings = result.originalSize - result.compressedSize;
        log('success', `Imagem ${image.id}: ${formatFileSize(result.originalSize)} → ${formatFileSize(result.compressedSize)} (${result.savings}% menor)`, options);
        updateProgress({
          processed: progress.processed + 1,
          compressed: progress.compressed + 1,
          totalSavings: progress.totalSavings + savings,
        }, options);

      } catch (err) {
        log('error', `Erro ao processar imagem ${image.id}: ${err}`, options);
        updateProgress({ processed: progress.processed + 1, errors: progress.errors + 1 }, options);
      }
    }

  } catch (err) {
    log('error', `Erro na migração de produtos: ${err}`, options);
  }
}

// ═══════════════════════════════════════════════════════════════
// MIGRAÇÃO DE STORAGE (BUCKETS)
// ═══════════════════════════════════════════════════════════════

async function migrateStorageBucket(bucketName: string, options: MigrationOptions): Promise<void> {
  log('info', `Processando bucket: ${bucketName}...`, options);
  updateProgress({ currentBucket: bucketName }, options);

  try {
    // Listar todos os arquivos no bucket
    const { data: folders, error: listError } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 1000 });

    if (listError) {
      log('error', `Erro ao listar bucket ${bucketName}: ${listError.message}`, options);
      return;
    }

    if (!folders || folders.length === 0) {
      log('info', `Bucket ${bucketName} está vazio`, options);
      return;
    }

    // Processar pastas (geralmente userId/itemId/)
    for (const folder of folders) {
      if (!folder.name) continue;

      // Listar arquivos dentro da pasta
      const { data: subFolders } = await supabase.storage
        .from(bucketName)
        .list(folder.name, { limit: 1000 });

      if (!subFolders) continue;

      for (const subFolder of subFolders) {
        const folderPath = `${folder.name}/${subFolder.name}`;

        // Listar arquivos finais
        const { data: files } = await supabase.storage
          .from(bucketName)
          .list(folderPath, { limit: 1000 });

        if (!files) continue;

        updateProgress({ total: progress.total + files.length }, options);

        for (const file of files) {
          if (!file.name) continue;

          // Pular se não for imagem
          const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);
          if (!isImage) {
            updateProgress({ processed: progress.processed + 1, skipped: progress.skipped + 1 }, options);
            continue;
          }

          const filePath = `${folderPath}/${file.name}`;

          try {
            // Verificar tamanho original
            const originalSize = file.metadata?.size || 0;

            // Se já é pequena (< 100KB), pular
            if (originalSize > 0 && originalSize < 100 * 1024) {
              log('info', `${filePath} já é pequena (${formatFileSize(originalSize)}), pulando...`, options);
              updateProgress({ processed: progress.processed + 1, skipped: progress.skipped + 1 }, options);
              continue;
            }

            // Baixar arquivo
            const { data: fileData, error: downloadError } = await supabase.storage
              .from(bucketName)
              .download(filePath);

            if (downloadError || !fileData) {
              log('error', `Erro ao baixar ${filePath}: ${downloadError?.message}`, options);
              updateProgress({ processed: progress.processed + 1, errors: progress.errors + 1 }, options);
              continue;
            }

            // Comprimir
            const result = await compressImage(fileData, { force: true });

            if (result.savings <= 5) {
              log('info', `${filePath} já está otimizada (${result.savings}% economia), pulando...`, options);
              updateProgress({ processed: progress.processed + 1, skipped: progress.skipped + 1 }, options);
              continue;
            }

            // Re-upload (se não for dry-run)
            if (!options.dryRun) {
              const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(filePath, result.blob, {
                  upsert: true,
                  contentType: result.blob.type,
                });

              if (uploadError) {
                log('error', `Erro ao fazer upload de ${filePath}: ${uploadError.message}`, options);
                updateProgress({ processed: progress.processed + 1, errors: progress.errors + 1 }, options);
                continue;
              }
            }

            const savings = result.originalSize - result.compressedSize;
            log('success', `${filePath}: ${formatFileSize(result.originalSize)} → ${formatFileSize(result.compressedSize)} (${result.savings}% menor)`, options);
            updateProgress({
              processed: progress.processed + 1,
              compressed: progress.compressed + 1,
              totalSavings: progress.totalSavings + savings,
            }, options);

          } catch (err) {
            log('error', `Erro ao processar ${filePath}: ${err}`, options);
            updateProgress({ processed: progress.processed + 1, errors: progress.errors + 1 }, options);
          }
        }
      }
    }

  } catch (err) {
    log('error', `Erro no bucket ${bucketName}: ${err}`, options);
  }
}

async function migrateStorageImages(options: MigrationOptions): Promise<void> {
  log('info', 'Iniciando migração de imagens do Storage...', options);
  updateProgress({ phase: 'storage' }, options);

  for (const bucket of options.buckets) {
    await migrateStorageBucket(bucket, options);
  }
}

// ═══════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export async function runImageMigration(options: MigrationOptions): Promise<MigrationProgress> {
  // Reset progress
  progress = {
    phase: 'idle',
    total: 0,
    processed: 0,
    compressed: 0,
    skipped: 0,
    errors: 0,
    totalSavings: 0,
    logs: [],
  };

  log('info', '═══════════════════════════════════════════════════════', options);
  log('info', 'VIZZU - Migração de Compressão de Imagens', options);
  log('info', `Modo: ${options.dryRun ? 'DRY-RUN (simulação)' : 'PRODUÇÃO'}`, options);
  log('info', '═══════════════════════════════════════════════════════', options);

  try {
    // Migrar imagens de produtos
    if (options.compressProducts) {
      await migrateProductImages(options);
    }

    // Migrar imagens do storage
    if (options.compressStorage && options.buckets.length > 0) {
      await migrateStorageImages(options);
    }

    updateProgress({ phase: 'done' }, options);

    log('info', '═══════════════════════════════════════════════════════', options);
    log('success', 'MIGRAÇÃO CONCLUÍDA!', options);
    log('info', `Total processado: ${progress.processed}`, options);
    log('info', `Comprimidas: ${progress.compressed}`, options);
    log('info', `Puladas: ${progress.skipped}`, options);
    log('info', `Erros: ${progress.errors}`, options);
    log('success', `Economia total: ${formatFileSize(progress.totalSavings)}`, options);
    log('info', '═══════════════════════════════════════════════════════', options);

  } catch (err) {
    log('error', `Erro fatal na migração: ${err}`, options);
  }

  return progress;
}

// ═══════════════════════════════════════════════════════════════
// FUNÇÕES DE CONVENIÊNCIA
// ═══════════════════════════════════════════════════════════════

/** Executa migração completa (produtos + storage) */
export async function runFullMigration(
  userId?: string,
  dryRun = false,
  onProgress?: (progress: MigrationProgress) => void
): Promise<MigrationProgress> {
  return runImageMigration({
    compressProducts: true,
    compressStorage: true,
    buckets: ['client-photos', 'model-images', 'model-references'],
    userId,
    dryRun,
    onProgress,
  });
}

/** Executa migração apenas de produtos */
export async function runProductMigration(
  userId?: string,
  dryRun = false,
  onProgress?: (progress: MigrationProgress) => void
): Promise<MigrationProgress> {
  return runImageMigration({
    compressProducts: true,
    compressStorage: false,
    buckets: [],
    userId,
    dryRun,
    onProgress,
  });
}

/** Executa migração apenas de storage */
export async function runStorageMigration(
  buckets: string[] = ['client-photos', 'model-images', 'model-references'],
  userId?: string,
  dryRun = false,
  onProgress?: (progress: MigrationProgress) => void
): Promise<MigrationProgress> {
  return runImageMigration({
    compressProducts: false,
    compressStorage: true,
    buckets,
    userId,
    dryRun,
    onProgress,
  });
}
