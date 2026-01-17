// ═══════════════════════════════════════════════════════════════
// VIZZU - Studio API
// Chamadas para os webhooks do n8n
// ═══════════════════════════════════════════════════════════════

const N8N_BASE_URL = 'https://n8nwebhook.brainia.store/webhook';

interface StudioReadyParams {
  productId: string;
  userId: string;
  imageId: string;
}

interface StudioReadyResponse {
  success: boolean;
  generation?: {
    id: string;
    image_url: string;
    type: string;
  };
  credits_remaining?: number;
  error?: string;
  message?: string;
}

/**
 * Studio Ready - Gera imagem com fundo branco profissional
 * Custo: 1 crédito
 */
export async function generateStudioReady(params: StudioReadyParams): Promise<StudioReadyResponse> {
  const response = await fetch(`${N8N_BASE_URL}/vizzu/studio-ready`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: params.productId,
      user_id: params.userId,
      image_id: params.imageId,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao gerar imagem');
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════
// Funções para futuras ferramentas
// ═══════════════════════════════════════════════════════════════

interface CenarioParams {
  productId: string;
  userId: string;
  imageId: string;
  prompt: string;
}

/**
 * Cenário Criativo - Gera imagem com ambiente personalizado
 * Custo: 2 créditos
 * TODO: Implementar workflow no n8n
 */
export async function generateCenario(params: CenarioParams): Promise<StudioReadyResponse> {
  const response = await fetch(`${N8N_BASE_URL}/vizzu/cenario`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: params.productId,
      user_id: params.userId,
      image_id: params.imageId,
      prompt: params.prompt,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao gerar cenário');
  }

  return data;
}

interface ModeloIAParams {
  productId: string;
  userId: string;
  imageId: string;
  modelPrompt: string;
  clothingPrompt?: string;
  posePrompt?: string;
  referenceImage?: string;
  productCategory: string;
  productDescription?: string;
  lookItems?: Array<{ slot: string; image: string; name: string }>;
}

/**
 * Modelo IA - Gera modelo humano usando o produto
 * Custo: 3 créditos
 * TODO: Implementar workflow no n8n
 */
export async function generateModeloIA(params: ModeloIAParams): Promise<StudioReadyResponse> {
  const response = await fetch(`${N8N_BASE_URL}/vizzu/modelo-ia`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: params.productId,
      user_id: params.userId,
      image_id: params.imageId,
      model_prompt: params.modelPrompt,
      clothing_prompt: params.clothingPrompt,
      pose_prompt: params.posePrompt,
      reference_image: params.referenceImage,
      product_category: params.productCategory,
      product_description: params.productDescription,
      look_items: params.lookItems,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao gerar modelo');
  }

  return data;
}

interface RefineParams {
  productId: string;
  userId: string;
  generationId: string;
  referenceImage: string;
  prompt: string;
}

/**
 * Refinar - Ajusta uma imagem gerada anteriormente
 * Custo: 1 crédito
 * TODO: Implementar workflow no n8n
 */
export async function refineImage(params: RefineParams): Promise<StudioReadyResponse> {
  const response = await fetch(`${N8N_BASE_URL}/vizzu/refine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: params.productId,
      user_id: params.userId,
      generation_id: params.generationId,
      reference_image: params.referenceImage,
      prompt: params.prompt,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao refinar imagem');
  }

  return data;
}
