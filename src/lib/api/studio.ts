// ═══════════════════════════════════════════════════════════════
// VIZZU - Studio API
// Chamadas para os webhooks do n8n
// v2.3 - Suporte a geração assíncrona com polling
// ═══════════════════════════════════════════════════════════════

import { supabase } from '../../services/supabaseClient';

const N8N_BASE_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '';

// Configurações de polling para geração assíncrona
const POLLING_INTERVAL_MS = 3000; // 3 segundos entre cada verificação
const POLLING_TIMEOUT_MS = 300000; // 5 minutos de timeout máximo
const ESTIMATED_GENERATION_TIME_MS = 120000; // 2 minutos estimados para geração

/**
 * Calcula o progresso simulado baseado no tempo decorrido
 * Usa curva ease-out: começa rápido e desacelera
 * @param elapsedMs - Tempo decorrido em ms
 * @param estimatedTotalMs - Tempo total estimado em ms
 * @param startProgress - Progresso inicial (ex: 10)
 * @param maxProgress - Progresso máximo antes de completar (ex: 95)
 */
function calculateEasedProgress(
  elapsedMs: number,
  estimatedTotalMs: number = ESTIMATED_GENERATION_TIME_MS,
  startProgress: number = 10,
  maxProgress: number = 95
): number {
  // Normaliza o tempo para 0-1 (pode passar de 1 se demorar mais que o estimado)
  const normalizedTime = Math.min(elapsedMs / estimatedTotalMs, 1.5);

  // Curva ease-out quadrática: 1 - (1 - t)^2
  // Começa rápido e desacelera
  const eased = 1 - Math.pow(1 - Math.min(normalizedTime, 1), 2);

  // Mapeia para o range de progresso
  const progress = startProgress + (maxProgress - startProgress) * eased;

  return Math.round(progress);
}

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
// PRODUCT STUDIO v2 - MULTI-ANGLE
// ═══════════════════════════════════════════════════════════════

interface ProductStudioV2Params {
  productId: string;
  userId: string;
  imageId: string;  // Imagem frontal (obrigatória)
  angles: string[];
  // Imagens de referência para cada ângulo (se disponíveis)
  referenceImages?: {
    back?: string;
    'side-left'?: string;
    'side-right'?: string;
    '45-left'?: string;
    '45-right'?: string;
    top?: string;
    detail?: string;
  };
  // Informações do produto para melhorar o prompt
  productInfo?: {
    name?: string;
    category?: string;
    description?: string;
  };
}

interface ProductStudioV2Result {
  angle: string;
  url: string;
  id: string;
}

interface ProductStudioV2Response {
  success: boolean;
  results?: ProductStudioV2Result[];
  generation_id?: string;
  credits_used?: number;
  credits_remaining?: number;
  error?: string;
  message?: string;
}

/**
 * Product Studio - Gera múltiplos ângulos do produto
 * Endpoint: /vizzu/studio/generate
 * Custo: 1 crédito por ângulo
 */
export async function generateProductStudioV2(params: ProductStudioV2Params): Promise<ProductStudioV2Response> {
  const response = await fetch(`${N8N_BASE_URL}/vizzu/studio/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: params.productId,
      user_id: params.userId,
      image_id: params.imageId,
      angles: params.angles,
      // Enviar todas as imagens de referência disponíveis
      reference_images: params.referenceImages || {},
      // Informações do produto (contexto útil para o n8n)
      product_name: params.productInfo?.name,
      product_category: params.productInfo?.category,
      product_description: params.productInfo?.description,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao gerar imagens');
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

interface LookPiece {
  slot: string;
  image: string;
  name: string;
  sku?: string;
  productId?: string;
  imageId?: string;
}

interface ModelProfile {
  gender: 'woman' | 'man';
  ethnicity: string;
  bodyType: string;
  ageRange: string;
}

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
  productAttributes?: Record<string, string>;  // Atributos específicos (caimento, tamanho, etc.)
  lookItems?: Array<LookPiece>;
  orientation?: { type: 'vertical' | 'horizontal'; width: number; height: number };
  productNotes?: string;      // Observações adicionais do produto
  modelDetails?: string;      // Detalhes do modelo (fisionomia, cabelo, altura, etc.)
  // Parâmetros de fundo
  backgroundType?: 'studio' | 'custom' | 'prompt';
  customBackgroundUrl?: string;      // URL do fundo customizado (upload ou preset)
  customBackgroundBase64?: string;   // Base64 do fundo customizado (upload)
  backgroundPrompt?: string;         // Prompt para gerar fundo por IA
  solidColor?: string;               // Cor sólida (hex) para fundo
  sceneHint?: string;                // Dica de cena para melhorar o prompt (ex: "model standing on grass")
  // Parâmetros de ângulos (frente/costas)
  viewsMode?: 'front' | 'front-back';
  backImageId?: string;              // ID da imagem de costas do produto principal
  backImageUrl?: string;             // URL da imagem de costas do produto principal
  lookItemsBack?: Array<LookPiece>;  // Itens do look com imagens de costas
  // Parâmetros para indicar que é imagem de costas (UPDATE ao invés de INSERT)
  isBackView?: boolean;              // Se true, é geração de imagem de costas
  frontGenerationId?: string;        // ID da geração de frente (para fazer UPDATE)
  // Callback de progresso (opcional)
  onProgress?: (progress: number) => void;  // Callback chamado durante polling com progresso 0-100
}

/**
 * Modelo IA - Gera modelo humano usando o produto
 * Custo: 1-2 créditos (composer = 2)
 */
export async function generateModeloIA(params: ModeloIAParams): Promise<StudioReadyResponse> {
  console.log('[generateModeloIA] Iniciando...');
  console.log('[generateModeloIA] N8N_BASE_URL:', N8N_BASE_URL);

  // Determinar modo: composer se tem lookItems, senão describe
  const isComposerMode = params.lookItems && params.lookItems.length > 0;
  const mode = isComposerMode ? 'composer' : 'describe';

  // Converter lookItems para lookComposition (formato do novo workflow)
  let lookComposition: Record<string, { name: string; sku: string; image: string; productId?: string; imageId?: string }> | null = null;

  if (isComposerMode && params.lookItems) {
    lookComposition = {};
    for (const item of params.lookItems) {
      lookComposition[item.slot] = {
        name: item.name,
        sku: item.sku || '',
        image: item.image,
        productId: item.productId,
        imageId: item.imageId,
      };
    }
  }

  // Extrair perfil do modelo do modelPrompt
  const modelProfile = parseModelPrompt(params.modelPrompt);

  const fullUrl = `${N8N_BASE_URL}/vizzu/modelo-ia-v2`;
  console.log('[generateModeloIA] Chamando URL:', fullUrl);

  // Debug para rastrear linkedTo
  const linkedToValue = params.isBackView ? params.frontGenerationId : null;
  console.log('[generateModeloIA] isBackView:', params.isBackView);
  console.log('[generateModeloIA] frontGenerationId:', params.frontGenerationId);
  console.log('[generateModeloIA] linkedTo sendo enviado:', linkedToValue);

  const response = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      productId: params.productId,
      userId: params.userId,
      imageId: params.imageId,
      imageUrl: params.imageUrl,
      mode: mode,
      modelProfile: modelProfile,
      productCategory: params.productCategory,
      productAttributes: params.productAttributes || {},  // Atributos específicos (caimento, tamanho, etc.)
      sceneDescription: params.clothingPrompt || params.productDescription || '',
      orientation: params.orientation?.type || 'vertical',
      lookComposition: lookComposition,
      savedModelId: params.referenceImage ? 'custom' : null,
      productNotes: params.productNotes || '',       // Observações adicionais do produto
      modelDetails: params.modelDetails || '',       // Detalhes do modelo (fisionomia, cabelo, etc.)
      // Parâmetros de fundo
      backgroundType: params.backgroundType || 'studio',
      customBackgroundUrl: params.customBackgroundUrl || null,
      customBackgroundBase64: params.customBackgroundBase64 || null,
      backgroundPrompt: params.backgroundPrompt || null,
      solidColor: params.solidColor || null,
      sceneHint: params.sceneHint || null,
      // Prompt de pose personalizada
      posePrompt: params.posePrompt || null,
      // Parâmetros de ângulos (frente/costas)
      viewsMode: params.viewsMode || 'front',
      backImageId: params.backImageId || null,
      backImageUrl: params.backImageUrl || null,
      lookItemsBack: params.lookItemsBack || null,
      // Parâmetros para indicar que é imagem de costas
      isBackView: params.isBackView || false,
      frontGenerationId: params.frontGenerationId || null,
      // Se for back view, vincular à geração de frente via campo linked_to
      linkedTo: params.isBackView ? params.frontGenerationId : null,
    }),
  });

  const data = await response.json();
  console.log('[generateModeloIA] Response status:', response.status);
  console.log('[generateModeloIA] Response data:', data);

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao gerar modelo');
  }

  // Se a resposta indica processamento assíncrono, fazer polling
  if (data.processing === true && data.generation?.id) {
    console.log('[generateModeloIA] Geração assíncrona detectada, iniciando polling...');
    const generationId = data.generation.id;
    const startTime = Date.now();

    // Notificar progresso inicial
    if (params.onProgress) {
      params.onProgress(10);
    }

    while (Date.now() - startTime < POLLING_TIMEOUT_MS) {
      // Aguardar antes de verificar
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));

      // Atualizar progresso simulado
      if (params.onProgress) {
        const elapsedMs = Date.now() - startTime;
        const progress = calculateEasedProgress(elapsedMs);
        params.onProgress(progress);
      }

      // Consultar status da geração no Supabase
      const { data: generation, error } = await supabase
        .from('generations')
        .select('id, status, output_image_url, type')
        .eq('id', generationId)
        .single();

      if (error) {
        console.error('[generateModeloIA] Erro ao consultar geração:', error);
        continue;
      }

      console.log('[generateModeloIA] Polling - Status:', generation?.status);

      if (generation?.status === 'completed' && generation?.output_image_url) {
        console.log('[generateModeloIA] Geração concluída:', generation.output_image_url);
        // Notificar 100% ao completar
        if (params.onProgress) {
          params.onProgress(100);
        }
        return {
          success: true,
          generation: {
            id: generation.id,
            image_url: generation.output_image_url,
            type: generation.type
          },
          credits_remaining: data.credits_remaining
        };
      }

      if (generation?.status === 'failed' || generation?.status === 'error') {
        throw new Error('Falha na geração da imagem');
      }
    }

    throw new Error('Timeout aguardando geração da imagem');
  }

  return data;
}

/**
 * Converte o modelPrompt para o objeto modelProfile
 */
function parseModelPrompt(prompt: string): ModelProfile {
  const lowerPrompt = prompt.toLowerCase();

  // Detectar gênero
  const gender: 'woman' | 'man' = lowerPrompt.includes('female') || lowerPrompt.includes('woman') ? 'woman' : 'man';

  // Detectar etnia
  let ethnicity = 'mixed';
  if (lowerPrompt.includes('caucasian') || lowerPrompt.includes('white')) ethnicity = 'caucasian';
  else if (lowerPrompt.includes('black') || lowerPrompt.includes('african')) ethnicity = 'black';
  else if (lowerPrompt.includes('asian')) ethnicity = 'asian';
  else if (lowerPrompt.includes('latin') || lowerPrompt.includes('hispanic')) ethnicity = 'latin';
  else if (lowerPrompt.includes('brazilian')) ethnicity = 'brazilian';
  else if (lowerPrompt.includes('mixed')) ethnicity = 'mixed';

  // Detectar tipo de corpo
  let bodyType = 'average';
  if (lowerPrompt.includes('slim') || lowerPrompt.includes('thin')) bodyType = 'slim';
  else if (lowerPrompt.includes('athletic') || lowerPrompt.includes('fit')) bodyType = 'athletic';
  else if (lowerPrompt.includes('curvy') || lowerPrompt.includes('plus')) bodyType = 'curvy';
  else if (lowerPrompt.includes('average')) bodyType = 'average';

  // Detectar faixa etária
  let ageRange = 'adult';
  if (lowerPrompt.includes('young') || lowerPrompt.includes('20')) ageRange = 'young';
  else if (lowerPrompt.includes('adult') || lowerPrompt.includes('30')) ageRange = 'adult';
  else if (lowerPrompt.includes('mature') || lowerPrompt.includes('40') || lowerPrompt.includes('50')) ageRange = 'mature';

  return { gender, ethnicity, bodyType, ageRange };
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

// ═══════════════════════════════════════════════════════════════
// PROVADOR IA
// ═══════════════════════════════════════════════════════════════

interface ProvadorLookItem {
  productId: string;
  imageId?: string;
  imageUrl: string;
  name: string;
  category: string;
  attributes?: Record<string, string>;  // Atributos específicos (caimento, tamanho, etc.)
}

interface ProvadorParams {
  userId: string;
  clientId: string;
  clientName: string;
  clientPhoto: {
    type: 'frente' | 'costas' | 'rosto';
    base64: string;
  };
  lookComposition: {
    head?: ProvadorLookItem;
    top?: ProvadorLookItem;
    bottom?: ProvadorLookItem;
    feet?: ProvadorLookItem;
    accessory1?: ProvadorLookItem;
    accessory2?: ProvadorLookItem;
  };
  notes?: string;
}

interface ProvadorResponse {
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
 * Provador IA - Veste o cliente virtualmente com os produtos
 * Custo: 3 créditos
 */
export async function generateProvador(params: ProvadorParams): Promise<ProvadorResponse> {
  const response = await fetch(`${N8N_BASE_URL}/vizzu/provador`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: params.userId,
      clientId: params.clientId,
      clientName: params.clientName,
      clientPhoto: params.clientPhoto,
      lookComposition: params.lookComposition,
      notes: params.notes || '',
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao gerar provador');
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════
// GERAR IMAGENS DO MODELO SALVO
// ═══════════════════════════════════════════════════════════════

interface SavedModelProfile {
  name: string;
  gender: 'woman' | 'man';
  ethnicity: string;
  skinTone: string;
  bodyType: string;
  ageRange: string;
  height: string;
  hairColor: string;
  hairStyle: string;
  hairLength?: string;
  eyeColor: string;
  expression: string;
  bustSize?: string;
  waistType?: string;
  physicalNotes?: string;
  hairNotes?: string;
  skinNotes?: string;
}

interface GenerateModelImagesParams {
  modelId: string;
  userId: string;
  modelProfile: SavedModelProfile;
  prompt?: string; // Prompt otimizado para Flux 2.0
}

interface GenerateModelImagesResponse {
  success: boolean;
  model?: {
    id: string;
    images: {
      front?: string;
      back?: string;
      face?: string;
    };
    status: string;
  };
  error?: string;
  message?: string;
}

/**
 * Gera as 3 imagens do modelo salvo (frente, costas, rosto)
 * Custo: 0 créditos (custo é ao usar o modelo no Studio)
 */
export async function generateModelImages(params: GenerateModelImagesParams): Promise<GenerateModelImagesResponse> {
  const response = await fetch(`${N8N_BASE_URL}/vizzu/generate-model-images`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      modelId: params.modelId,
      userId: params.userId,
      modelProfile: params.modelProfile,
      prompt: params.prompt, // Prompt otimizado para Flux 2.0
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao gerar imagens do modelo');
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════
// WHATSAPP - ENVIO VIA EVOLUTION API
// ═══════════════════════════════════════════════════════════════

interface SendWhatsAppParams {
  phone: string;
  message: string;
  imageUrl?: string;
  clientName?: string;
}

interface SendWhatsAppResponse {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Envia mensagem WhatsApp via Evolution API
 * Suporta envio de imagem + texto
 */
// ═══════════════════════════════════════════════════════════════
// ANÁLISE DE IMAGEM DE PRODUTO (IA)
// ═══════════════════════════════════════════════════════════════

interface DetectedProduct {
  type: string;           // Ex: "Camiseta", "Calça", "Tênis"
  color: string;          // Ex: "Branco", "Azul Marinho"
  pattern: string;        // Ex: "Liso", "Listrado", "Estampado"
  material?: string;      // Ex: "Algodão", "Jeans", "Couro"
  gender?: string;        // Ex: "Masculino", "Feminino", "Unissex"
  brand?: string;         // Ex: "Nike", "Adidas", "Zara" (se identificável)
  fit?: string;           // Ex: "Slim", "Regular", "Oversized", "Skinny"
  suggestedName?: string; // Ex: "Camiseta Básica Branca"
  confidence: number;     // 0-1
}

export type { DetectedProduct };

interface AnalyzeProductImageParams {
  imageBase64: string;
  userId?: string;
}

interface AnalyzeProductImageResponse {
  success: boolean;
  products: DetectedProduct[];
  multipleProducts: boolean;
  error?: string;
}

/**
 * Analisa uma imagem de produto usando IA (Gemini Vision)
 * Detecta: tipo de produto, cor, padrão, material, gênero
 * Se múltiplos produtos na imagem, retorna lista para seleção
 */
export async function analyzeProductImage(params: AnalyzeProductImageParams): Promise<AnalyzeProductImageResponse> {
  try {
    const response = await fetch(`${N8N_BASE_URL}/vizzu/analyze-product`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: params.imageBase64,
        userId: params.userId || null,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erro ao analisar imagem');
    }

    return data;
  } catch (error: any) {
    console.error('Erro ao analisar imagem:', error);
    return {
      success: false,
      products: [],
      multipleProducts: false,
      error: error.message || 'Erro ao analisar imagem',
    };
  }
}

export async function sendWhatsAppMessage(params: SendWhatsAppParams): Promise<SendWhatsAppResponse> {
  try {
    const response = await fetch(`${N8N_BASE_URL}/vizzu/send-whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: params.phone,
        message: params.message,
        imageUrl: params.imageUrl || null,
        clientName: params.clientName || 'Cliente',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Erro ao enviar WhatsApp');
    }

    return data;
  } catch (error: any) {
    console.error('Erro ao enviar WhatsApp:', error);
    return {
      success: false,
      error: error.message || 'Erro ao enviar WhatsApp',
    };
  }
}
