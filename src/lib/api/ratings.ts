// ═══════════════════════════════════════════════════════════════
// VIZZU — Download Ratings API
// Salva avaliação no Supabase + notifica admin via N8N (e-mail)
// ═══════════════════════════════════════════════════════════════

import { supabase } from '../../services/supabaseClient';

const N8N_BASE_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '';

export interface DownloadRatingParams {
  userId: string;
  userEmail: string;
  userName: string;
  userPlan?: string;
  rating: number;              // 1-5 — nota da imagem gerada
  toolRating?: number;         // 1-5 — nota da ferramenta
  comment?: string;
  productName?: string;
  featureSource?: string;      // 'product-studio', 'look-composer', etc.
  imageCount: number;
  imageUrls?: string[];        // URLs das imagens geradas (para planilha)
  originalImageUrls?: string[]; // URLs da(s) foto(s) original(is) do produto (antes da IA)
}

export async function submitDownloadRating(params: DownloadRatingParams): Promise<{ success: boolean }> {
  // 1. Salvar no Supabase (fonte de verdade)
  const { error } = await supabase
    .from('download_ratings')
    .insert({
      user_id: params.userId,
      user_email: params.userEmail,
      user_name: params.userName,
      rating: params.rating,
      tool_rating: params.toolRating || null,
      comment: params.comment || null,
      product_name: params.productName || null,
      feature_source: params.featureSource || null,
      image_count: params.imageCount,
    });

  if (error) {
    console.error('Erro ao salvar rating:', error);
    return { success: false };
  }

  // 2. Notificar admin via N8N (e-mail) — fire and forget
  const originalBullets = (params.originalImageUrls || [])
    .filter(Boolean)
    .map(url => `• ${url}`)
    .join('\n');

  try {
    fetch(`${N8N_BASE_URL}/vizzu/rating-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_name: params.userName,
        user_email: params.userEmail,
        user_plan: params.userPlan || 'N/A',
        rating: params.rating,
        tool_rating: params.toolRating || 0,
        comment: params.comment || 'Sem comentário',
        product_name: params.productName || 'N/A',
        feature_source: params.featureSource || 'N/A',
        image_urls: (params.imageUrls || []).join(', '),
        original_image_url: originalBullets,
      }),
    });
  } catch (e) {
    console.error('Erro ao enviar notificação de rating:', e);
  }

  return { success: true };
}
