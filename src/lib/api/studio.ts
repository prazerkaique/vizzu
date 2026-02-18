// ═══════════════════════════════════════════════════════════════
// VIZZU - Studio API
// Chamadas para os webhooks do n8n
// v2.3 - Suporte a geração assíncrona com polling
// ═══════════════════════════════════════════════════════════════

import { supabase } from '../../services/supabaseClient';

const N8N_BASE_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '';

// Configurações de polling para geração assíncrona
const POLLING_INTERVAL_MS = 3000; // 3 segundos entre cada verificação
const POLLING_TIMEOUT_MS = 720000; // 12 minutos de timeout máximo
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

  const text = await response.text();

  if (!text) {
    console.error(`[StudioReady] Resposta vazia - status: ${response.status} ${response.statusText}`);
    throw new Error(`Servidor retornou resposta vazia (status ${response.status}). Tente novamente.`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error(`[StudioReady] Resposta não é JSON - status: ${response.status}, body: ${text.substring(0, 500)}`);
    throw new Error(`Resposta inválida do servidor (status ${response.status}). Tente novamente.`);
  }

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao gerar imagem');
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════
// PRODUCT STUDIO v2 - MULTI-ANGLE
// ═══════════════════════════════════════════════════════════════

// Tipo de apresentação do produto
export type ProductPresentationStyle = 'ghost-mannequin' | 'flat-lay';

// Acabamento do tecido (só para flat-lay)
export type FabricFinish = 'natural' | 'pressed';

// Cor de fundo do estúdio
export type StudioBackground = 'gray' | 'white';

// Sombra no produto
export type StudioShadow = 'with-shadow' | 'no-shadow';

interface ProductStudioV2Params {
  productId: string;
  userId: string;
  imageId: string;  // Imagem frontal (obrigatória)
  angles: string[];
  // Estilo de apresentação: Ghost Mannequin ou Flat Lay
  presentationStyle?: ProductPresentationStyle;
  // Imagens de referência para cada ângulo (se disponíveis)
  referenceImages?: {
    back?: string;
    'side-left'?: string;
    'side-right'?: string;
    '45-left'?: string;
    '45-right'?: string;
    top?: string;
    detail?: string;
    folded?: string;
    front_detail?: string;
    back_detail?: string;
  };
  // Informações do produto para melhorar o prompt
  productInfo?: {
    name?: string;
    category?: string;
    description?: string;
  };
  // Acabamento do tecido: natural (amarrotadinho) ou pressed (passada)
  fabricFinish?: FabricFinish;
  // Cor de fundo do estúdio (cinza ou branco)
  studioBackground?: StudioBackground;
  // Sombra no produto (com ou sem)
  studioShadow?: StudioShadow;
  // Observações do produto (detalhes estruturais para a IA)
  productNotes?: string;
  // Resolução da imagem gerada
  resolution?: '2k' | '4k';
  // Foco do conjunto: full (inteiro), top (só cima), bottom (só baixo)
  setFocus?: 'full' | 'top' | 'bottom';
}

interface ProductStudioV2Result {
  angle: string;
  url: string;
  id: string;
}

export interface ProductStudioV2Response {
  success: boolean;
  results?: ProductStudioV2Result[];
  generation_id?: string;
  // v9: resposta imediata com status 'processing'
  status?: 'processing' | 'completed' | 'partial' | 'failed';
  angles?: string[];
  credits_used?: number;
  credits_remaining?: number;
  error?: string;
  message?: string;
  _serverTimeout?: boolean;
}

// Resultado do polling incremental por ângulo
export interface StudioAngleStatus {
  angle: string;
  url?: string;
  id?: string;
  status: 'completed' | 'failed';
  error?: string;
}

export interface StudioPollResult {
  generationStatus: 'processing' | 'completed' | 'partial' | 'failed' | 'unknown';
  completedAngles: StudioAngleStatus[];
  error_message?: string;
}

/**
 * Product Studio - Gera múltiplos ângulos do produto
 * Endpoint: /vizzu/studio/generate
 * Custo: 1 crédito por ângulo
 */
export async function generateProductStudioV2(params: ProductStudioV2Params): Promise<ProductStudioV2Response> {
  let response: Response;
  try {
    response = await fetch(`${N8N_BASE_URL}/vizzu/studio/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: params.productId,
        user_id: params.userId,
        image_id: params.imageId,
        angles: params.angles,
        // Estilo de apresentação (ghost-mannequin ou flat-lay)
        presentation_style: params.presentationStyle || 'ghost-mannequin',
        // Enviar todas as imagens de referência disponíveis
        reference_images: params.referenceImages || {},
        // Informações do produto (contexto útil para o n8n)
        product_name: params.productInfo?.name,
        product_category: params.productInfo?.category,
        product_description: params.productInfo?.description,
        // Acabamento do tecido (natural ou pressed, só para flat-lay)
        fabric_finish: params.fabricFinish || 'natural',
        // Cor de fundo do estúdio (gray ou white)
        studio_background: params.studioBackground || 'gray',
        // Sombra no produto (with-shadow ou no-shadow)
        studio_shadow: params.studioShadow || 'with-shadow',
        // Observações do produto (detalhes estruturais)
        product_notes: params.productNotes || '',
        // Resolução da imagem (2k ou 4k)
        resolution: params.resolution || '2k',
        // Foco do conjunto (full/top/bottom) — só para produtos conjunto
        set_focus: params.setFocus || undefined,
      }),
    });
  } catch (fetchError) {
    // Erro de rede (Failed to fetch, timeout, etc.) — workflow pode estar rodando
    console.warn('[Studio] Erro de rede — workflow pode estar rodando no servidor:', fetchError);
    throw fetchError;
  }

  // 502/504 = webhook timeout, mas o workflow CONTINUA rodando no N8N
  if (response.status === 502 || response.status === 504) {
    console.warn(`[Studio] Timeout do webhook (${response.status}) — workflow continua no servidor`);
    return { success: false, _serverTimeout: true } as ProductStudioV2Response;
  }

  const text = await response.text();

  if (!text) {
    console.error(`[Studio] Resposta vazia - status: ${response.status} ${response.statusText}`);
    throw new Error(`Servidor retornou resposta vazia (status ${response.status}). Tente novamente.`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error(`[Studio] Resposta não é JSON - status: ${response.status}, body: ${text.substring(0, 500)}`);
    throw new Error(`Resposta inválida do servidor (status ${response.status}). Tente novamente.`);
  }

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao gerar imagens');
  }

  return data;
}

/**
 * Polling incremental para Product Studio v9
 * Consulta generations.output_urls e status para acompanhar progresso por ângulo
 */
export async function pollStudioGeneration(generationId: string): Promise<StudioPollResult> {
  let result = await supabase
    .from('generations')
    .select('id, status, output_urls, error_message')
    .eq('id', generationId)
    .single();

  // Se erro de autenticação, tentar refresh do token
  if (result.error) {
    const errMsg = result.error.message || '';
    console.warn('[pollStudio] Erro na query:', result.error.code, errMsg);
    if (errMsg.includes('JWT') || errMsg.includes('expired') || (result.error as any).code === 'PGRST301') {
      console.log('[pollStudio] Tentando refresh do token...');
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error('[pollStudio] Refresh falhou:', refreshError);
        return { generationStatus: 'unknown', completedAngles: [], error_message: 'Sessão expirada. Faça login novamente.' };
      }
      // Retry após refresh
      result = await supabase
        .from('generations')
        .select('id, status, output_urls, error_message')
        .eq('id', generationId)
        .single();
    }
  }

  const generation = result.data;
  if (result.error || !generation) {
    console.warn('[pollStudio] Sem dados para generation', generationId, '| erro:', result.error?.code, result.error?.message);
    return { generationStatus: 'unknown', completedAngles: [] };
  }

  // output_urls é atualizado incrementalmente pelo v9
  // Pode vir como array (correto) ou string JSON (fallback se double-encoded)
  let outputUrls: StudioAngleStatus[] | string | null = generation.output_urls as any;
  if (typeof outputUrls === 'string') {
    try { outputUrls = JSON.parse(outputUrls) as StudioAngleStatus[]; } catch { outputUrls = null; }
  }
  const completedAngles: StudioAngleStatus[] = [];

  if (outputUrls && Array.isArray(outputUrls)) {
    for (const item of outputUrls) {
      completedAngles.push({
        angle: item.angle,
        url: item.url,
        id: item.id,
        status: item.status || 'completed',
        error: item.error,
      });
    }
  }

  // Mapear status da generation
  let generationStatus: StudioPollResult['generationStatus'] = 'processing';
  if (generation.status === 'completed') generationStatus = 'completed';
  else if (generation.status === 'partial') generationStatus = 'partial';
  else if (generation.status === 'failed' || generation.status === 'error') generationStatus = 'failed';
  else if (generation.status === 'processing') generationStatus = 'processing';

  if (completedAngles.length > 0 || generationStatus !== 'processing') {
    console.log('[pollStudio]', generationId.slice(0, 8), '| status:', generationStatus, '| ângulos:', completedAngles.length, completedAngles.map(a => a.angle + ':' + a.status).join(','));
  }

  return {
    generationStatus,
    completedAngles,
    error_message: generation.error_message || undefined,
  };
}

// ═══════════════════════════════════════════════════════════════
// RETRY INDIVIDUAL DE ÂNGULO (v9 Fase 3)
// ═══════════════════════════════════════════════════════════════

interface RetryStudioAngleParams {
  productId: string;
  userId: string;
  angle: string;
  generationId: string;
  frontStudioUrl: string;
  presentationStyle?: ProductPresentationStyle;
  fabricFinish?: FabricFinish;
  productInfo?: {
    name?: string;
    category?: string;
    description?: string;
  };
  resolution?: '2k' | '4k';
  studioBackground?: StudioBackground;
  studioShadow?: StudioShadow;
  productNotes?: string;
}

interface RetryStudioAngleResponse {
  success: boolean;
  url?: string;
  id?: string;
  error?: string;
  message?: string;
}

/**
 * Retry de um ângulo individual que falhou
 * Chama /vizzu/studio/angle diretamente
 * Custo: gratuito (créditos já debitados na geração original)
 */
export async function retryStudioAngle(params: RetryStudioAngleParams): Promise<RetryStudioAngleResponse> {
  try {
    const response = await fetch(`${N8N_BASE_URL}/vizzu/studio/angle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: params.productId,
        user_id: params.userId,
        angle: params.angle,
        generation_id: params.generationId,
        front_studio_url: params.frontStudioUrl,
        presentation_style: params.presentationStyle || 'ghost-mannequin',
        product_name: params.productInfo?.name,
        product_category: params.productInfo?.category,
        product_description: params.productInfo?.description,
        fabric_finish: params.fabricFinish || 'natural',
        resolution: params.resolution || '2k',
        studio_background: params.studioBackground || 'gray',
        studio_shadow: params.studioShadow || 'with-shadow',
        product_notes: params.productNotes || '',
      }),
    });

    if (response.status === 502 || response.status === 504) {
      return { success: false, error: 'Timeout do servidor. Tente novamente.' };
    }

    const text = await response.text();
    if (!text) {
      return { success: false, error: 'Resposta vazia do servidor.' };
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return { success: false, error: 'Resposta inválida do servidor.' };
    }

    if (!response.ok) {
      return { success: false, error: data.message || 'Erro ao regenerar ângulo.' };
    }

    return data;
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro de rede.' };
  }
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

  const text = await response.text();

  if (!text) {
    console.error(`[Cenario] Resposta vazia - status: ${response.status} ${response.statusText}`);
    throw new Error(`Servidor retornou resposta vazia (status ${response.status}). Tente novamente.`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error(`[Cenario] Resposta não é JSON - status: ${response.status}, body: ${text.substring(0, 500)}`);
    throw new Error(`Resposta inválida do servidor (status ${response.status}). Tente novamente.`);
  }

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
  detailImage?: string;           // URL da imagem de detalhe (logo, estampa, bordado)
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
  detailImageUrl?: string;             // URL da imagem de detalhe do produto principal
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
  // Enquadramento (framing) - como a câmera enquadra o modelo
  framing?: 'full-body' | 'upper-half' | 'lower-half' | 'face' | 'feet';
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
  // Resolução da imagem gerada
  resolution?: '2k' | '4k';
}

/**
 * Modelo IA - Gera modelo humano usando o produto
 * Custo: 1-2 créditos (composer = 2)
 */
export async function generateModeloIA(params: ModeloIAParams): Promise<StudioReadyResponse> {
  // Determinar modo: composer se tem lookItems, senão describe
  const isComposerMode = params.lookItems && params.lookItems.length > 0;
  const mode = isComposerMode ? 'composer' : 'describe';

  // Converter lookItems para lookComposition (formato do novo workflow)
  let lookComposition: Record<string, { name: string; sku: string; image: string; productId?: string; imageId?: string; detailImage?: string }> | null = null;

  if (isComposerMode && params.lookItems) {
    lookComposition = {};
    for (const item of params.lookItems) {
      lookComposition[item.slot] = {
        name: item.name,
        sku: item.sku || '',
        image: item.image,
        productId: item.productId,
        imageId: item.imageId,
        detailImage: item.detailImage || undefined,
      };
    }
  }

  // Extrair perfil do modelo do modelPrompt
  const modelProfile = parseModelPrompt(params.modelPrompt);

  const fullUrl = `${N8N_BASE_URL}/vizzu/modelo-ia-v2`;

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
      detailImageUrl: params.detailImageUrl || null,
      mode: mode,
      modelProfile: modelProfile,
      productCategory: params.productCategory,
      productAttributes: params.productAttributes || {},  // Atributos específicos (caimento, tamanho, etc.)
      productDescription: params.productDescription || '', // Nome/descrição do produto
      sceneDescription: params.clothingPrompt || params.productDescription || '',
      orientation: params.orientation?.type || 'vertical',
      lookComposition: lookComposition,
      modelReferenceUrl: params.referenceImage || null,  // URL da imagem do modelo para consistência
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
      // Enquadramento (framing)
      framing: params.framing || 'full-body',
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
      // Resolução da imagem (2k ou 4k)
      resolution: params.resolution || '2k',
    }),
  });

  const text = await response.text();

  if (!text) {
    console.error(`[ModeloIA] Resposta vazia - status: ${response.status} ${response.statusText}`);
    throw new Error(`Servidor retornou resposta vazia (status ${response.status}). Tente novamente.`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error(`[ModeloIA] Resposta não é JSON - status: ${response.status}, body: ${text.substring(0, 500)}`);
    throw new Error(`Resposta inválida do servidor (status ${response.status}). Tente novamente.`);
  }

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao gerar modelo');
  }

  // Se a resposta indica processamento assíncrono, fazer polling
  if (data.processing === true && data.generation?.id) {
    const generationId = data.generation.id;
    const startTime = Date.now();
    let consecutiveErrors = 0;
    let pendingTooLongChecks = 0;

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
        .select('id, status, output_image_url, type, error_message')
        .eq('id', generationId)
        .single();

      if (error) {
        consecutiveErrors++;
        console.warn(`[ModeloIA] Erro no polling (${consecutiveErrors}x):`, error.message);
        if (consecutiveErrors >= 5) {
          throw new Error('Erro ao consultar status da geração. Verifique sua conexão e tente novamente.');
        }
        continue;
      }

      // Reset error counter on successful query
      consecutiveErrors = 0;

      if (generation?.status === 'completed' && generation?.output_image_url) {
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
        const errorMsg = generation?.error_message || 'Falha na geração da imagem';
        throw new Error(errorMsg);
      }

      // Detectar n8n travado: se o status ainda é 'pending' após 30s, o n8n provavelmente falhou
      if (generation?.status === 'pending') {
        const elapsedMs = Date.now() - startTime;
        if (elapsedMs > 30000) {
          pendingTooLongChecks++;
          console.warn(`[ModeloIA] Geração ainda pending após ${Math.round(elapsedMs / 1000)}s (check ${pendingTooLongChecks})`);
          // Após 20 checks consecutivos em pending depois de 30s = ~90s total
          // (Gemini pode estar lento, dar tempo ao N8N para atualizar status)
          if (pendingTooLongChecks >= 20) {
            throw new Error('O servidor de geração não respondeu. Tente novamente.');
          }
        }
      } else {
        // Status é 'processing' ou outro - n8n está trabalhando, reset counter
        pendingTooLongChecks = 0;
      }
    }

    // Timeout de polling atingido — retornar flag para o frontend tratar como background
    console.warn('[ModeloIA] Polling timeout atingido — geração pode continuar no servidor');
    return { success: false, _timeout: true } as any;
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
  else if (lowerPrompt.includes('plus')) bodyType = 'plus';
  else if (lowerPrompt.includes('curvy')) bodyType = 'curvy';
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
  // Resolução da imagem gerada
  resolution?: '2k' | '4k';
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
      // Resolução da imagem (2k ou 4k)
      resolution: params.resolution || '2k',
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
  referenceImageUrls?: { front?: string; back?: string; face?: string };
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
 * Gera as imagens do modelo (frente e costas)
 * Custo: 2 créditos (debitados pelo workflow N8N)
 */
export async function generateModelImages(params: GenerateModelImagesParams): Promise<GenerateModelImagesResponse> {
  try {
    const response = await fetch(`${N8N_BASE_URL}/vizzu/generate-model-images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        modelId: params.modelId,
        userId: params.userId,
        modelProfile: params.modelProfile,
        prompt: params.prompt,
        referenceImageUrls: params.referenceImageUrls,
      }),
    });

    // 502/504 = webhook timeout, mas o workflow CONTINUA rodando no N8N
    if (response.status === 502 || response.status === 504) {
      console.warn(`[Models] Timeout do webhook (${response.status}) — workflow continua no servidor`);
      return { success: false, _serverTimeout: true } as any;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erro ao gerar imagens do modelo');
    }

    return data;
  } catch (fetchError) {
    // Erro de rede (Failed to fetch, timeout, etc.) — workflow pode estar rodando
    console.warn('[Models] Erro de rede — workflow pode estar rodando no servidor:', fetchError);
    return { success: false, _serverTimeout: true } as any;
  }
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
  fit?: string;           // Ex: "Slim", "Regular", "Oversized", "Skinny", "Wide Leg", "Flare"
  suggestedName?: string; // Ex: "Camiseta Básica Branca"
  confidence: number;     // 0-1

  // Atributos adicionais detectados pela IA
  length?: string;        // Ex: "Curto", "Regular", "Longo", "Mini", "Midi", "Maxi"
  waistHeight?: string;   // Ex: "Baixa", "Média", "Alta"
  neckline?: string;      // Ex: "V", "Redondo", "Quadrado", "Gola Alta"
  sleeveLength?: string;  // Ex: "Curta", "Longa", "Regata", "3/4"

  // Calçados
  heelType?: string;      // Ex: "Rasteira", "Salto Bloco", "Salto Fino", "Plataforma"
  bootShaft?: string;     // Ex: "Curto", "Médio", "Alto", "Over the Knee"
  sneakerStyle?: string;  // Ex: "Casual", "Corrida", "Skatista", "Chunky"

  // Acessórios
  bagSize?: string;       // Ex: "Mini", "Pequena", "Média", "Grande", "Maxi"
  hatStyle?: string;      // Ex: "Dad Hat", "Trucker", "Snapback", "Bucket", "Fedora"
  glassesShape?: string;  // Ex: "Aviador", "Redondo", "Quadrado", "Gatinho", "Oversized"
  beltWidth?: string;     // Ex: "Fino", "Médio", "Largo"
  watchSize?: string;     // Ex: "Pequeno", "Médio", "Grande"
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

// ═══════════════════════════════════════════════════════════════
// EDIÇÃO DE IMAGEM (Product Studio)
// ═══════════════════════════════════════════════════════════════

interface EditStudioImageParams {
  userId?: string;
  productId?: string;
  generationId?: string;
  angle?: string;
  currentImageUrl: string;
  correctionPrompt: string;
  referenceImageBase64?: string;
  resolution?: '2k' | '4k';
  productInfo?: { name?: string; category?: string; color?: string; description?: string };
  studioBackground?: StudioBackground;
  studioShadow?: StudioShadow;
  productNotes?: string;
  /** URL da foto original do produto — usada como referência de cor pelo Gemini */
  originalImageUrl?: string;
}

interface EditStudioImageResponse {
  success: boolean;
  new_image_url?: string;
  error?: string;
  message?: string;
  credits_deducted?: boolean;
  credit_source?: 'edit' | 'regular';
}

/**
 * Edita/corrige uma imagem gerada no Product Studio
 * Envia a imagem atual + prompt de correção + referência opcional ao Gemini
 * Custo: 1 crédito (2k) ou 2 créditos (4k) — debitado via deduct_edit_credits
 */
export async function editStudioImage(params: EditStudioImageParams): Promise<EditStudioImageResponse> {
  try {
    const response = await fetch(`${N8N_BASE_URL}/vizzu/studio/edit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: params.userId,
        product_id: params.productId,
        generation_id: params.generationId,
        angle: params.angle,
        current_image_url: params.currentImageUrl,
        correction_prompt: params.correctionPrompt,
        reference_image_base64: params.referenceImageBase64 || null,
        resolution: params.resolution || '2k',
        product_name: params.productInfo?.name,
        product_category: params.productInfo?.category,
        product_color: params.productInfo?.color || '',
        product_description: params.productInfo?.description || '',
        original_image_url: params.originalImageUrl || '',
        studio_background: params.studioBackground || 'gray',
        studio_shadow: params.studioShadow || 'with-shadow',
        product_notes: params.productNotes || '',
      }),
    });

    if (response.status === 502 || response.status === 504) {
      return { success: false, error: 'Timeout do servidor. Tente novamente.' };
    }

    const text = await response.text();
    if (!text) {
      return { success: false, error: 'Resposta vazia do servidor.' };
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return { success: false, error: 'Resposta inválida do servidor.' };
    }

    if (!response.ok) {
      return { success: false, error: data.message || 'Erro ao editar imagem.' };
    }

    return data;
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro de rede.' };
  }
}

/**
 * Salva a imagem editada no Supabase via N8N (service_role, bypass RLS)
 * Atualiza product_images.url para o ângulo correspondente
 */
export async function saveEditedImage(params: {
  productId: string;
  generationId: string;
  angle: string;
  newImageUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${N8N_BASE_URL}/vizzu/studio/edit/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: params.productId,
        generation_id: params.generationId,
        angle: params.angle,
        new_image_url: params.newImageUrl,
      }),
    });

    const text = await response.text();
    if (!text) return { success: false, error: 'Resposta vazia do servidor.' };

    try {
      return JSON.parse(text);
    } catch {
      return { success: false, error: 'Resposta inválida do servidor.' };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro de rede.' };
  }
}

/**
 * Salva edição de variação do Creative Still via N8N (service_role, bypass RLS)
 * Atualiza creative_still_generations.variation_urls[index]
 */
export async function saveCreativeStillEdit(params: {
  generationId: string;
  variationIndex: number;
  newImageUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${N8N_BASE_URL}/vizzu/still/edit/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generation_id: params.generationId,
        variation_index: params.variationIndex,
        new_image_url: params.newImageUrl,
      }),
    });

    const text = await response.text();
    if (!text) return { success: false, error: 'Resposta vazia do servidor.' };

    try {
      return JSON.parse(text);
    } catch {
      return { success: false, error: 'Resposta inválida do servidor.' };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro de rede.' };
  }
}

/**
 * Salva edição de imagem do Look Composer via N8N (service_role, bypass RLS)
 * Atualiza product_images.url WHERE type='modelo_ia'
 */
export async function saveLookComposerEdit(params: {
  productId: string;
  generationId: string;
  view: 'front' | 'back';
  newImageUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${N8N_BASE_URL}/vizzu/look-composer/edit/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: params.productId,
        generation_id: params.generationId,
        view: params.view,
        new_image_url: params.newImageUrl,
      }),
    });

    const text = await response.text();
    if (!text) return { success: false, error: 'Resposta vazia do servidor.' };

    try {
      return JSON.parse(text);
    } catch {
      return { success: false, error: 'Resposta inválida do servidor.' };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro de rede.' };
  }
}

/**
 * Salva edição como NOVA variação no Creative Still via N8N (append ao array)
 */
export async function saveCreativeStillSaveAsNew(params: {
  generationId: string;
  newImageUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${N8N_BASE_URL}/vizzu/still/edit/save-as-new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generation_id: params.generationId,
        new_image_url: params.newImageUrl,
      }),
    });

    const text = await response.text();
    if (!text) return { success: false, error: 'Resposta vazia do servidor.' };

    try {
      return JSON.parse(text);
    } catch {
      return { success: false, error: 'Resposta inválida do servidor.' };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro de rede.' };
  }
}

// ═══════════════════════════════════════════════════════════════
// ANÁLISE DE ÂNGULOS DO PRODUTO (Lazy — chamada on-demand)
// ═══════════════════════════════════════════════════════════════

interface AnalyzeProductAnglesParams {
  productId: string;
  userId: string;
  images: { id: string; url: string }[];
}

interface AnalyzeProductAnglesResponse {
  success: boolean;
  productType?: string;
  category?: string;
  angles?: { imageId: string; angle: string }[];
  error?: string;
}

/**
 * Analisa TODAS as imagens de um produto em 1 chamada ao Gemini Vision.
 * Detecta: tipo do produto, categoria PT-BR, e ângulo de cada imagem.
 * Atualiza products.category + product_images.angle no Supabase.
 * Chamada lazy — só quando o usuário abre um produto que precisa análise.
 */
export async function analyzeProductAngles(params: AnalyzeProductAnglesParams): Promise<AnalyzeProductAnglesResponse> {
  try {
    const response = await fetch(`${N8N_BASE_URL}/vizzu/analyze-product-angles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId: params.productId,
        userId: params.userId,
        images: params.images,
      }),
    });

    if (response.status === 502 || response.status === 504) {
      return { success: false, error: 'Timeout do servidor. Tente novamente.' };
    }

    const text = await response.text();
    if (!text) {
      return { success: false, error: 'Resposta vazia do servidor.' };
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return { success: false, error: 'Resposta inválida do servidor.' };
    }

    if (!response.ok) {
      return { success: false, error: data.message || 'Erro ao analisar produto.' };
    }

    return data;
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro de rede.' };
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
