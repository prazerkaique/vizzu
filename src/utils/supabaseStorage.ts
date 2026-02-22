const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

/**
 * Gera URL publica de um arquivo no Supabase Storage.
 * Usa a env var VITE_SUPABASE_URL em vez de hardcodar o project ID.
 */
export function getStoragePublicUrl(bucket: string, path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
