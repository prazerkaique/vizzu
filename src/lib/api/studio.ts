// ═══════════════════════════════════════════════════════════════
// VIZZU - Studio API
// Chamadas para os webhooks do n8n
// ═══════════════════════════════════════════════════════════════

const N8N_BASE_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '';

if (!N8N_BASE_URL) {
  console.warn('VITE_N8N_WEBHOOK_URL não configurada - funcionalidades de geração indisponíveis');
}

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
// CENÁRIO CRIATIVO
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
 */
export async function generateCenario(params: CenarioParams): Promise<StudioReadyResponse> {
  const response = await fetch(`${N8N_BASE_URL}/vizzu/cenario-criativo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: params.productId,
      user_id: params.userId,
      image_id: params.imageId,
      scene_prompt: params.prompt,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao gerar cenário');
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════
// MODELO IA
// ═══════════════════════════════════════════════════════════════

interface ModeloIAParams {
  productId: string;
  userId: string;
  imageId: string;
  imageUrl?: string;
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
      image_url: params.imageUrl,
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

// ═══════════════════════════════════════════════════════════════
// REFINAR IMAGEM
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// DELETAR GERAÇÃO
// ═══════════════════════════════════════════════════════════════

interface DeleteGenerationParams {
  generationId: string;
  userId: string;
}

interface DeleteGenerationResponse {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Deleta uma imagem gerada do Supabase
 */
export async function deleteGeneration(params: DeleteGenerationParams): Promise<DeleteGenerationResponse> {
  const response = await fetch(`${N8N_BASE_URL}/vizzu/delete-generation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      generation_id: params.generationId,
      user_id: params.userId,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao deletar geração');
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════
// GERAR LEGENDA IA
// ═══════════════════════════════════════════════════════════════

export interface GenerateCaptionParams {
  userId: string;
  productName: string;
  productCategory: string;
  productColor?: string;
  generationType: 'studio' | 'cenario' | 'lifestyle';
  scenePrompt?: string;
  companySettings: {
    name: string;
    targetAudience: string;
    voiceTone: string;
    voiceExamples?: string;
    hashtags: string[];
    emojisEnabled: boolean;
    captionStyle: string;
    callToAction?: string;
  };
}

export interface GenerateCaptionResponse {
  success: boolean;
  caption?: string;
  hashtags?: string[];
  error?: string;
}

/**
 * Gera uma legenda para Instagram usando IA
 */
export async function generateCaption(params: GenerateCaptionParams): Promise<GenerateCaptionResponse> {
  const response = await fetch(`${N8N_BASE_URL}/vizzu/generate-caption`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: params.userId,
      product_name: params.productName,
      product_category: params.productCategory,
      product_color: params.productColor,
      generation_type: params.generationType,
      scene_prompt: params.scenePrompt,
      company_name: params.companySettings.name,
      target_audience: params.companySettings.targetAudience,
      voice_tone: params.companySettings.voiceTone,
      voice_examples: params.companySettings.voiceExamples,
      hashtags: params.companySettings.hashtags,
      emojis_enabled: params.companySettings.emojisEnabled,
      caption_style: params.companySettings.captionStyle,
      call_to_action: params.companySettings.callToAction,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao gerar legenda');
  }

  return data;
}
