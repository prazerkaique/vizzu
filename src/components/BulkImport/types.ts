import type { DetectedProduct } from '../../lib/api/studio';

export interface BulkRawImage {
  filename: string;
  base64: string; // data:image/... ou raw base64
}

export interface BulkProduct {
  id: string;
  folderName: string;
  name: string;
  category?: string;
  brand?: string;
  color?: string;
  material?: string;
  fit?: string;
  price?: number;
  sku?: string;
  rawImages: BulkRawImage[];
  angleAssignment: Record<string, number>; // angle key → index em rawImages
  aiDetected?: DetectedProduct;
  aiAnalyzed: boolean;
  selected: boolean;
  importStatus?: 'pending' | 'importing' | 'success' | 'error';
  importError?: string;
}

export type BulkStep = 'upload' | 'analyzing' | 'review' | 'importing' | 'validation' | 'done';

export interface CsvProductData {
  name: string; // nome original (antes de normalizar)
  price?: number;
  brand?: string;
  sku?: string;
  color?: string;
}

export interface ImportResults {
  success: string[];
  failed: { name: string; error: string }[];
}
