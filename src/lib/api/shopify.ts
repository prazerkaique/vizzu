/**
 * Vizzu — API de integração Shopify
 *
 * Chamadas ao N8N para exportação de imagens para o Shopify.
 * Segue o mesmo padrão de studio.ts e billing.ts.
 */

import { supabase } from '../../services/supabaseClient';

const N8N_BASE_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '';

// ─── Types ──────────────────────────────────────────────

export interface ExportImageParams {
  userId: string;
  vizzuProductId: string;
  imageUrl: string;
  exportType: 'add' | 'replace' | 'set_primary';
  tool: string; // 'product-studio' | 'creative-still' | 'look-composer'
  generationId?: string;
}

export interface ExportImageResponse {
  success: boolean;
  external_media_id?: string;
  export_id?: string;
  message?: string;
  error?: string;
}

export interface ShopifyConnection {
  id: string;
  platform: string;
  store_domain: string;
  store_name: string;
  status: string;
  last_sync_at: string | null;
}

// ─── API Functions ──────────────────────────────────────

/**
 * Busca conexões Shopify ativas do user logado.
 * Consulta direta ao Supabase (RLS protege por user_id).
 */
export async function getShopifyConnections(userId: string): Promise<ShopifyConnection[]> {
  const { data, error } = await supabase
    .from('ecommerce_connections')
    .select('id, platform, store_domain, store_name, status, last_sync_at')
    .eq('user_id', userId)
    .eq('platform', 'shopify')
    .eq('status', 'active');

  if (error) {
    console.error('[shopify] Error fetching connections:', error);
    return [];
  }

  return data || [];
}

/**
 * Exporta uma imagem do Vizzu para o Shopify.
 * Chama o N8N que faz staged upload + associação ao produto.
 */
export async function exportImageToShopify(params: ExportImageParams): Promise<ExportImageResponse> {
  const response = await fetch(`${N8N_BASE_URL}/vizzu/shopify/export-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: params.userId,
      vizzu_product_id: params.vizzuProductId,
      image_url: params.imageUrl,
      export_type: params.exportType,
      tool: params.tool,
      generation_id: params.generationId || null,
    }),
  });

  const text = await response.text();

  if (!text) {
    throw new Error(`Servidor retornou resposta vazia (status ${response.status}).`);
  }

  let data: ExportImageResponse;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Resposta inválida do servidor (status ${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Erro ao exportar para Shopify');
  }

  return data;
}
