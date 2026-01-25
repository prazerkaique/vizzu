// ═══════════════════════════════════════════════════════════════
// VIZZU - TypeScript Types (VERSÃO COMPLETA + MULTI-FOTO PRODUTO)
// ═══════════════════════════════════════════════════════════════

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  plan: string;
}

// ═══════════════════════════════════════════════════════════════
// Configurações da Empresa (para geração de legendas IA)
// ═══════════════════════════════════════════════════════════════

export interface CompanySettings {
  name: string;
  cnpj?: string;
  instagram?: string;
  targetAudience: string;
  voiceTone: 'formal' | 'casual' | 'divertido' | 'luxo' | 'jovem';
  voiceExamples?: string;
  hashtags: string[];
  emojisEnabled: boolean;
  captionStyle: 'curta' | 'media' | 'longa';
  callToAction?: string;
}

export interface ProductImage {
  id?: string;
  name: string;
  base64?: string;
  url?: string;
  type?: 'front' | 'back' | 'generated';  // NOVO: tipo da imagem
}

// ═══════════════════════════════════════════════════════════════
// NOVO: Estrutura de Imagens Originais (Múltiplos Ângulos)
// ═══════════════════════════════════════════════════════════════

export interface ProductOriginalImages {
  front: ProductImage;        // Obrigatório - foto de frente
  back?: ProductImage;        // Opcional - foto de costas
  'side-left'?: ProductImage; // Opcional - lateral esquerda
  'side-right'?: ProductImage;// Opcional - lateral direita
  top?: ProductImage;         // Opcional - vista de cima
  detail?: ProductImage;      // Opcional - foto de detalhe
  '45-left'?: ProductImage;   // Opcional - 45 graus esquerda
  '45-right'?: ProductImage;  // Opcional - 45 graus direita
}

// ═══════════════════════════════════════════════════════════════
// NOVO: Imagens Geradas organizadas por ferramenta
// ═══════════════════════════════════════════════════════════════

export interface GeneratedImageSet {
  id: string;
  createdAt: string;
  tool: 'studio' | 'cenario' | 'lifestyle';
  images: {
    front: string;            // URL ou base64 da imagem gerada (frente)
    back?: string;            // URL ou base64 da imagem gerada (costas) - se tinha costas
  };
  metadata?: {
    prompt?: string;
    orientation?: string;
    modelProfileId?: string;
    exportFormat?: string;
    viewsMode?: 'front' | 'front-back';  // Modo de ângulos (só frente ou frente+costas)
    lookItems?: Array<{       // Itens do look (para análise de combinações)
      slot: string;
      image?: string;
      name?: string;
      sku?: string;
      productId?: string;
      imageId?: string;
    }>;
  };
}

export interface ProductGeneratedImages {
  studioReady: GeneratedImageSet[];
  cenarioCriativo: GeneratedImageSet[];
  modeloIA: GeneratedImageSet[];
  productStudio: ProductStudioSession[];
}

// ═══════════════════════════════════════════════════════════════
// Product Studio - Fotos profissionais de produto (sem modelo)
// ═══════════════════════════════════════════════════════════════

export type ProductStudioAngle = 'front' | 'back' | 'side-left' | 'side-right' | '45-left' | '45-right' | 'top' | 'detail';

export interface ProductStudioImage {
  id: string;
  url: string;
  angle: ProductStudioAngle;
  createdAt: string;
}

export interface ProductStudioSession {
  id: string;
  productId: string;
  images: ProductStudioImage[];
  status: 'generating' | 'ready' | 'error';
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════
// Product Interface (ATUALIZADO)
// ═══════════════════════════════════════════════════════════════

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  collection?: string;
  brand?: string;
  color?: string;
  fit?: string;

  // Atributos específicos por categoria (ex: caimento, comprimento, modelagem)
  attributes?: ProductAttributes;

  // LEGADO: Array simples de imagens (manter para compatibilidade)
  images: ProductImage[];

  // NOVO: Imagens originais organizadas (frente/costas)
  originalImages?: ProductOriginalImages;

  // NOVO: Imagens geradas organizadas por ferramenta
  generatedImages?: ProductGeneratedImages;

  // NOVO: Flag para saber se tem foto de costas
  hasBackImage?: boolean;

  createdAt?: string;
  updatedAt?: string;
}

// ═══════════════════════════════════════════════════════════════
// AI Visual Studio Types
// ═══════════════════════════════════════════════════════════════

export interface VisualStudioGeneration {
  id: string;
  productId: string;
  productSku?: string;
  productName?: string;
  type: 'studio' | 'cenario' | 'lifestyle' | 'provador' | 'refine';
  prompt?: string;
  originalImage: string;
  generatedImage: string;
  // NOVO: Suporte a múltiplas imagens geradas (frente/costas)
  generatedImages?: {
    front: string;
    back?: string;
  };
  credits: number;
  createdAt: string;
  saved: boolean;
}

export interface SavedModelProfile {
  id: string;
  name: string;
  referenceImage: string;
  settings: {
    gender: string;
    ethnicity: string;
    bodyType: string;
    ageRange: string;
  };
  modelPrompt: string;
  usageCount: number;
  createdAt: string;
}

export interface LookCompositionItem {
  image: string;
  name: string;
  sku?: string;
  productId?: string;
  imageId?: string;
}

export interface LookComposition {
  head?: LookCompositionItem;
  top?: LookCompositionItem;
  bottom?: LookCompositionItem;
  feet?: LookCompositionItem;
  accessory1?: LookCompositionItem;
  accessory2?: LookCompositionItem;
}

// ═══════════════════════════════════════════════════════════════
// History & Credits
// ═══════════════════════════════════════════════════════════════

export interface HistoryLog {
  id: string;
  date?: string;
  action: string;
  details: string;
  status: 'success' | 'error' | 'pending';
  items?: Product[];
  products?: Product[];
  method: 'manual' | 'auto' | 'api' | 'ai' | 'bulk' | 'system';
  cost: number;
  itemsCount?: number;
  createdAt?: Date;
}

export interface CreditHistoryItem {
  id: string;
  date: string;
  action: string;
  operation?: string;
  amount?: number;
  credits?: number;
  balance?: number;
}

// ═══════════════════════════════════════════════════════════════
// Client Types (ATUALIZADO - Múltiplas Fotos)
// ═══════════════════════════════════════════════════════════════

export interface ClientPhoto {
  type: 'frente' | 'costas' | 'rosto';
  base64: string;
  createdAt: string;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  whatsapp: string;
  email?: string;
  gender?: 'male' | 'female';  // Gênero do cliente
  photo?: string;             // Foto principal (compatibilidade) - usar photos preferencialmente
  photos?: ClientPhoto[];     // NOVO: Array de fotos (frente, costas, rosto)
  hasProvadorIA: boolean;     // true se tiver pelo menos 1 foto
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
  lastContactAt?: string;
  totalOrders?: number;
  status: 'active' | 'inactive' | 'vip';
  looks?: ClientLook[];       // Looks gerados no Provador IA
}

// ═══════════════════════════════════════════════════════════════
// Client Look - Looks salvos do Provador IA
// ═══════════════════════════════════════════════════════════════

export interface ClientLook {
  id: string;
  clientId: string;
  userId: string;
  imageUrl: string;
  storagePath?: string;
  lookItems: LookComposition;
  notes?: string;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════
// Saved Model - Modelos IA salvos pelo usuário
// ═══════════════════════════════════════════════════════════════

export interface SavedModelImages {
  front?: string;
  back?: string;
  face?: string;
}

export interface SavedModel {
  id: string;
  userId: string;
  name: string;
  gender: 'woman' | 'man';

  // Características físicas
  ethnicity: string;
  skinTone: string;
  bodyType: string;
  ageRange: string;
  height: string;

  // Detalhes
  hairColor: string;
  hairStyle: string;
  eyeColor: string;
  expression: string;

  // Proporções (opcionais - só para mulher)
  bustSize?: string;
  waistType?: string;

  // Imagem de referência (opcional)
  referenceImageUrl?: string;
  referenceStoragePath?: string;

  // Imagens geradas pela IA
  images: SavedModelImages;

  // Status
  status: 'draft' | 'generating' | 'ready' | 'error';

  createdAt: string;
  updatedAt?: string;
}

// Opções para os selects do modelo
export const MODEL_OPTIONS = {
  gender: [
    { id: 'woman', label: 'Feminino' },
    { id: 'man', label: 'Masculino' },
  ],
  ethnicity: [
    { id: 'caucasian', label: 'Caucasiana' },
    { id: 'black', label: 'Negra' },
    { id: 'asian', label: 'Asiática' },
    { id: 'latin', label: 'Latina' },
    { id: 'brazilian', label: 'Brasileira' },
    { id: 'mixed', label: 'Mista' },
  ],
  skinTone: [
    { id: 'light', label: 'Clara' },
    { id: 'medium', label: 'Média' },
    { id: 'tan', label: 'Morena' },
    { id: 'dark', label: 'Escura' },
  ],
  bodyType: [
    { id: 'slim', label: 'Magro' },
    { id: 'athletic', label: 'Atlético' },
    { id: 'average', label: 'Médio' },
    { id: 'curvy', label: 'Curvilíneo' },
    { id: 'plus', label: 'Plus Size' },
  ],
  ageRange: [
    { id: 'baby', label: 'Bebê (0-2)' },
    { id: 'child', label: 'Infantil (3-12)' },
    { id: 'teen', label: 'Adolescente (13-19)' },
    { id: 'young', label: 'Jovem (20-25)' },
    { id: 'adult', label: 'Adulto (25-35)' },
    { id: 'mature', label: 'Maduro (35-50)' },
    { id: 'senior', label: 'Sênior (50-60)' },
    { id: 'elderly', label: '+60' },
  ],
  height: [
    { id: 'short', label: 'Baixa' },
    { id: 'medium', label: 'Média' },
    { id: 'tall', label: 'Alta' },
  ],
  hairColor: [
    { id: 'black', label: 'Preto' },
    { id: 'brown', label: 'Castanho' },
    { id: 'blonde', label: 'Loiro' },
    { id: 'red', label: 'Ruivo' },
    { id: 'gray', label: 'Grisalho' },
    { id: 'white', label: 'Branco' },
  ],
  hairStyle: [
    { id: 'straight', label: 'Liso' },
    { id: 'wavy', label: 'Ondulado' },
    { id: 'curly', label: 'Cacheado' },
    { id: 'coily', label: 'Crespo' },
    { id: 'bald', label: 'Careca' },
  ],
  hairLength: [
    { id: 'bald', label: 'Careca' },
    { id: 'very-short', label: 'Muito curto' },
    { id: 'short', label: 'Curto' },
    { id: 'medium', label: 'Médio' },
    { id: 'long', label: 'Longo' },
    { id: 'very-long', label: 'Muito longo' },
  ],
  eyeColor: [
    { id: 'brown', label: 'Castanhos' },
    { id: 'black', label: 'Pretos' },
    { id: 'blue', label: 'Azuis' },
    { id: 'green', label: 'Verdes' },
    { id: 'hazel', label: 'Mel' },
  ],
  expression: [
    { id: 'natural-smile', label: 'Sorriso natural' },
    { id: 'open-smile', label: 'Sorriso aberto' },
    { id: 'serious', label: 'Séria' },
    { id: 'neutral', label: 'Neutra' },
    { id: 'confident', label: 'Confiante' },
  ],
  bustSize: [
    { id: 'small', label: 'Pequeno' },
    { id: 'medium', label: 'Médio' },
    { id: 'large', label: 'Grande' },
  ],
  waistType: [
    { id: 'thin', label: 'Fina' },
    { id: 'medium', label: 'Média' },
    { id: 'wide', label: 'Larga' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// Collection Types
// ═══════════════════════════════════════════════════════════════

export interface Collection {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════
// Provador IA Types
// ═══════════════════════════════════════════════════════════════

export interface ProvadorSession {
  id: string;
  clientId: string;
  clientName: string;
  clientPhoto: string;
  photoType: 'frente' | 'costas' | 'rosto';
  lookComposition: LookComposition;
  generatedImage?: string;
  whatsappMessage?: string;
  status: 'draft' | 'generated' | 'sent';
  createdAt: string;
  sentAt?: string;
}

export interface ProvadorProduct {
  productId: string;
  productName: string;
  productSku: string;
  productImage: string;
  slot: 'head' | 'top' | 'bottom' | 'feet' | 'accessory1' | 'accessory2';
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  message: string;
  isDefault?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Atributos de Produto por Categoria
// ═══════════════════════════════════════════════════════════════

export interface ProductAttributes {
  [key: string]: string;
}

export interface CategoryAttributeOption {
  id: string;
  label: string;
}

export interface CategoryAttributeConfig {
  id: string;
  label: string;
  options: CategoryAttributeOption[];
}

export interface CategoryAttributesMap {
  [category: string]: CategoryAttributeConfig[];
}

// Estrutura de atributos por categoria
export const CATEGORY_ATTRIBUTES: CategoryAttributesMap = {
  'Camisetas': [
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'slim', label: 'Slim (justa)' },
        { id: 'regular', label: 'Regular' },
        { id: 'relaxed', label: 'Relaxed' },
        { id: 'oversized', label: 'Oversized' },
        { id: 'boxy', label: 'Boxy' },
        { id: 'cropped', label: 'Cropped' },
      ]
    },
    {
      id: 'comprimento',
      label: 'Comprimento',
      options: [
        { id: 'curta', label: 'Curta' },
        { id: 'regular', label: 'Regular' },
        { id: 'longline', label: 'Longline' },
      ]
    }
  ],
  'Blusas': [
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'justa', label: 'Justa' },
        { id: 'regular', label: 'Regular' },
        { id: 'solta', label: 'Solta' },
        { id: 'oversized', label: 'Oversized' },
        { id: 'cropped', label: 'Cropped' },
      ]
    },
    {
      id: 'comprimento',
      label: 'Comprimento',
      options: [
        { id: 'cropped', label: 'Cropped (acima do umbigo)' },
        { id: 'curta', label: 'Curta (na cintura)' },
        { id: 'regular', label: 'Regular (abaixo da cintura)' },
      ]
    }
  ],
  'Regatas': [
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'justa', label: 'Justa' },
        { id: 'regular', label: 'Regular' },
        { id: 'solta', label: 'Solta' },
        { id: 'oversized', label: 'Oversized' },
        { id: 'cropped', label: 'Cropped' },
      ]
    },
    {
      id: 'comprimento',
      label: 'Comprimento',
      options: [
        { id: 'cropped', label: 'Cropped (acima do umbigo)' },
        { id: 'curta', label: 'Curta (na cintura)' },
        { id: 'regular', label: 'Regular (abaixo da cintura)' },
      ]
    }
  ],
  'Tops': [
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'justa', label: 'Justa' },
        { id: 'regular', label: 'Regular' },
        { id: 'solta', label: 'Solta' },
        { id: 'oversized', label: 'Oversized' },
        { id: 'cropped', label: 'Cropped' },
      ]
    },
    {
      id: 'comprimento',
      label: 'Comprimento',
      options: [
        { id: 'cropped', label: 'Cropped (acima do umbigo)' },
        { id: 'curta', label: 'Curta (na cintura)' },
        { id: 'regular', label: 'Regular (abaixo da cintura)' },
      ]
    }
  ],
  'Camisas': [
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'slim', label: 'Slim' },
        { id: 'regular', label: 'Regular' },
        { id: 'oversized', label: 'Oversized' },
        { id: 'boxy', label: 'Boxy' },
      ]
    }
  ],
  'Vestidos': [
    {
      id: 'comprimento',
      label: 'Comprimento',
      options: [
        { id: 'mini', label: 'Mini (acima do joelho)' },
        { id: 'midi', label: 'Midi (no joelho)' },
        { id: 'midi-longo', label: 'Midi-longo (abaixo do joelho)' },
        { id: 'longo', label: 'Longo (canela)' },
        { id: 'maxi', label: 'Maxi (chão)' },
      ]
    },
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'justo', label: 'Justo' },
        { id: 'evase', label: 'Evasê' },
        { id: 'reto', label: 'Reto' },
        { id: 'amplo', label: 'Amplo/Solto' },
      ]
    }
  ],
  'Saias': [
    {
      id: 'comprimento',
      label: 'Comprimento',
      options: [
        { id: 'mini', label: 'Mini' },
        { id: 'midi', label: 'Midi' },
        { id: 'longa', label: 'Longa' },
      ]
    },
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'justa', label: 'Justa' },
        { id: 'evase', label: 'Evasê' },
        { id: 'reta', label: 'Reta' },
        { id: 'gode', label: 'Godê' },
      ]
    }
  ],
  'Calças': [
    {
      id: 'modelagem',
      label: 'Modelagem',
      options: [
        { id: 'skinny', label: 'Skinny' },
        { id: 'slim', label: 'Slim' },
        { id: 'reta', label: 'Reta' },
        { id: 'wide-leg', label: 'Wide leg' },
        { id: 'flare', label: 'Flare' },
        { id: 'pantalona', label: 'Pantalona' },
        { id: 'jogger', label: 'Jogger' },
        { id: 'cargo', label: 'Cargo' },
      ]
    },
    {
      id: 'cintura',
      label: 'Cintura',
      options: [
        { id: 'baixa', label: 'Baixa' },
        { id: 'media', label: 'Média' },
        { id: 'alta', label: 'Alta' },
      ]
    }
  ],
  'Shorts': [
    {
      id: 'comprimento',
      label: 'Comprimento',
      options: [
        { id: 'curto', label: 'Curto (meio da coxa)' },
        { id: 'medio', label: 'Médio (acima do joelho)' },
        { id: 'bermuda', label: 'Bermuda (no joelho)' },
      ]
    },
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'justo', label: 'Justo' },
        { id: 'regular', label: 'Regular' },
        { id: 'solto', label: 'Solto' },
        { id: 'mom', label: 'Mom' },
      ]
    }
  ],
  'Bermudas': [
    {
      id: 'comprimento',
      label: 'Comprimento',
      options: [
        { id: 'curto', label: 'Curto (meio da coxa)' },
        { id: 'medio', label: 'Médio (acima do joelho)' },
        { id: 'bermuda', label: 'Bermuda (no joelho)' },
      ]
    },
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'justo', label: 'Justo' },
        { id: 'regular', label: 'Regular' },
        { id: 'solto', label: 'Solto' },
        { id: 'mom', label: 'Mom' },
      ]
    }
  ],
  'Jaquetas': [
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'slim', label: 'Slim' },
        { id: 'regular', label: 'Regular' },
        { id: 'oversized', label: 'Oversized' },
        { id: 'cropped', label: 'Cropped' },
      ]
    },
    {
      id: 'comprimento',
      label: 'Comprimento',
      options: [
        { id: 'cropped', label: 'Cropped' },
        { id: 'regular', label: 'Regular' },
        { id: 'alongado', label: 'Alongado' },
      ]
    }
  ],
  'Casacos': [
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'slim', label: 'Slim' },
        { id: 'regular', label: 'Regular' },
        { id: 'oversized', label: 'Oversized' },
        { id: 'cropped', label: 'Cropped' },
      ]
    },
    {
      id: 'comprimento',
      label: 'Comprimento',
      options: [
        { id: 'cropped', label: 'Cropped' },
        { id: 'regular', label: 'Regular' },
        { id: 'alongado', label: 'Alongado' },
      ]
    }
  ],
  'Blazers': [
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'slim', label: 'Slim' },
        { id: 'regular', label: 'Regular' },
        { id: 'oversized', label: 'Oversized' },
        { id: 'cropped', label: 'Cropped' },
      ]
    },
    {
      id: 'comprimento',
      label: 'Comprimento',
      options: [
        { id: 'cropped', label: 'Cropped' },
        { id: 'regular', label: 'Regular' },
        { id: 'alongado', label: 'Alongado' },
      ]
    }
  ],
  'Moletons': [
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'slim', label: 'Slim' },
        { id: 'regular', label: 'Regular' },
        { id: 'oversized', label: 'Oversized' },
        { id: 'cropped', label: 'Cropped' },
      ]
    },
    {
      id: 'comprimento',
      label: 'Comprimento',
      options: [
        { id: 'cropped', label: 'Cropped' },
        { id: 'regular', label: 'Regular' },
        { id: 'alongado', label: 'Alongado' },
      ]
    }
  ],
  'Macacões': [
    {
      id: 'comprimento',
      label: 'Comprimento',
      options: [
        { id: 'curto', label: 'Curto' },
        { id: 'pantacourt', label: 'Pantacourt' },
        { id: 'longo', label: 'Longo' },
      ]
    },
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'justo', label: 'Justo' },
        { id: 'regular', label: 'Regular' },
        { id: 'amplo', label: 'Amplo' },
      ]
    }
  ],
  'Jardineiras': [
    {
      id: 'comprimento',
      label: 'Comprimento',
      options: [
        { id: 'curto', label: 'Curto' },
        { id: 'pantacourt', label: 'Pantacourt' },
        { id: 'longo', label: 'Longo' },
      ]
    },
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'justo', label: 'Justo' },
        { id: 'regular', label: 'Regular' },
        { id: 'amplo', label: 'Amplo' },
      ]
    }
  ],
  'Bodies': [
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'justo', label: 'Justo' },
        { id: 'regular', label: 'Regular' },
        { id: 'solto', label: 'Solto' },
      ]
    },
    {
      id: 'decote',
      label: 'Decote',
      options: [
        { id: 'fechado', label: 'Fechado' },
        { id: 'moderado', label: 'Moderado' },
        { id: 'decotado', label: 'Decotado' },
      ]
    }
  ],
  'Biquínis': [
    {
      id: 'cobertura',
      label: 'Cobertura inferior',
      options: [
        { id: 'fio-dental', label: 'Fio dental' },
        { id: 'asa-delta', label: 'Asa delta' },
        { id: 'tradicional', label: 'Tradicional' },
        { id: 'hot-pants', label: 'Hot pants' },
      ]
    },
    {
      id: 'bojo',
      label: 'Bojo',
      options: [
        { id: 'com-bojo', label: 'Com bojo' },
        { id: 'sem-bojo', label: 'Sem bojo' },
        { id: 'bojo-removivel', label: 'Bojo removível' },
      ]
    }
  ],
  'Maiôs': [
    {
      id: 'cobertura',
      label: 'Cobertura inferior',
      options: [
        { id: 'fio-dental', label: 'Fio dental' },
        { id: 'asa-delta', label: 'Asa delta' },
        { id: 'tradicional', label: 'Tradicional' },
        { id: 'hot-pants', label: 'Hot pants' },
      ]
    },
    {
      id: 'bojo',
      label: 'Bojo',
      options: [
        { id: 'com-bojo', label: 'Com bojo' },
        { id: 'sem-bojo', label: 'Sem bojo' },
        { id: 'bojo-removivel', label: 'Bojo removível' },
      ]
    }
  ],
  'Leggings': [
    {
      id: 'cintura',
      label: 'Cintura',
      options: [
        { id: 'media', label: 'Média' },
        { id: 'alta', label: 'Alta' },
        { id: 'super-alta', label: 'Super alta' },
      ]
    },
    {
      id: 'compressao',
      label: 'Compressão',
      options: [
        { id: 'leve', label: 'Leve' },
        { id: 'media', label: 'Média' },
        { id: 'alta', label: 'Alta' },
      ]
    }
  ],
  'Shorts Fitness': [
    {
      id: 'cintura',
      label: 'Cintura',
      options: [
        { id: 'media', label: 'Média' },
        { id: 'alta', label: 'Alta' },
        { id: 'super-alta', label: 'Super alta' },
      ]
    },
    {
      id: 'compressao',
      label: 'Compressão',
      options: [
        { id: 'leve', label: 'Leve' },
        { id: 'media', label: 'Média' },
        { id: 'alta', label: 'Alta' },
      ]
    }
  ],
  'Calçados': [
    {
      id: 'altura',
      label: 'Altura',
      options: [
        { id: 'rasteiro', label: 'Rasteiro' },
        { id: 'salto-baixo', label: 'Salto baixo (3-5cm)' },
        { id: 'salto-medio', label: 'Salto médio (5-8cm)' },
        { id: 'salto-alto', label: 'Salto alto (8cm+)' },
        { id: 'plataforma', label: 'Plataforma' },
      ]
    }
  ],
  'Bolsas': [
    {
      id: 'tamanho',
      label: 'Tamanho',
      options: [
        { id: 'mini', label: 'Mini' },
        { id: 'pequena', label: 'Pequena' },
        { id: 'media', label: 'Média' },
        { id: 'grande', label: 'Grande' },
        { id: 'maxi', label: 'Maxi' },
      ]
    }
  ],
  'Acessórios': [
    {
      id: 'tamanho',
      label: 'Tamanho',
      options: [
        { id: 'unico', label: 'Único' },
        { id: 'pequeno', label: 'Pequeno' },
        { id: 'medio', label: 'Médio' },
        { id: 'grande', label: 'Grande' },
      ]
    }
  ],
  // Novas categorias - Cabeça
  'Bonés': [
    {
      id: 'modelo',
      label: 'Modelo',
      options: [
        { id: 'dad-hat', label: 'Dad Hat' },
        { id: 'trucker', label: 'Trucker' },
        { id: 'snapback', label: 'Snapback' },
        { id: 'aba-reta', label: 'Aba Reta' },
        { id: 'five-panel', label: 'Five Panel' },
      ]
    }
  ],
  'Chapéus': [
    {
      id: 'modelo',
      label: 'Modelo',
      options: [
        { id: 'bucket', label: 'Bucket' },
        { id: 'fedora', label: 'Fedora' },
        { id: 'panama', label: 'Panamá' },
        { id: 'palha', label: 'Palha' },
        { id: 'pescador', label: 'Pescador' },
      ]
    }
  ],
  'Tiaras': [
    {
      id: 'largura',
      label: 'Largura',
      options: [
        { id: 'fina', label: 'Fina' },
        { id: 'media', label: 'Média' },
        { id: 'larga', label: 'Larga' },
      ]
    }
  ],
  'Lenços': [
    {
      id: 'tamanho',
      label: 'Tamanho',
      options: [
        { id: 'pequeno', label: 'Pequeno (bandana)' },
        { id: 'medio', label: 'Médio' },
        { id: 'grande', label: 'Grande (echarpe)' },
      ]
    }
  ],
  // Novas categorias - Pés
  'Tênis': [
    {
      id: 'tipo',
      label: 'Tipo',
      options: [
        { id: 'casual', label: 'Casual' },
        { id: 'corrida', label: 'Corrida' },
        { id: 'skatista', label: 'Skatista' },
        { id: 'chunky', label: 'Chunky/Dad Sneaker' },
        { id: 'slip-on', label: 'Slip-on' },
      ]
    }
  ],
  'Sandálias': [
    {
      id: 'tipo',
      label: 'Tipo',
      options: [
        { id: 'rasteira', label: 'Rasteira' },
        { id: 'plataforma', label: 'Plataforma' },
        { id: 'salto-bloco', label: 'Salto Bloco' },
        { id: 'salto-fino', label: 'Salto Fino' },
        { id: 'chinelo', label: 'Chinelo/Slide' },
      ]
    }
  ],
  'Botas': [
    {
      id: 'cano',
      label: 'Cano',
      options: [
        { id: 'curto', label: 'Curto (tornozelo)' },
        { id: 'medio', label: 'Médio (panturrilha)' },
        { id: 'alto', label: 'Alto (joelho)' },
        { id: 'over-knee', label: 'Over the Knee' },
      ]
    },
    {
      id: 'salto',
      label: 'Salto',
      options: [
        { id: 'rasteiro', label: 'Rasteiro' },
        { id: 'baixo', label: 'Baixo' },
        { id: 'medio', label: 'Médio' },
        { id: 'alto', label: 'Alto' },
      ]
    }
  ],
  // Novas categorias - Acessórios específicos
  'Cintos': [
    {
      id: 'largura',
      label: 'Largura',
      options: [
        { id: 'fino', label: 'Fino' },
        { id: 'medio', label: 'Médio' },
        { id: 'largo', label: 'Largo' },
      ]
    }
  ],
  'Relógios': [
    {
      id: 'tamanho',
      label: 'Tamanho do Mostrador',
      options: [
        { id: 'pequeno', label: 'Pequeno' },
        { id: 'medio', label: 'Médio' },
        { id: 'grande', label: 'Grande (oversized)' },
      ]
    }
  ],
  'Óculos': [
    {
      id: 'formato',
      label: 'Formato',
      options: [
        { id: 'aviador', label: 'Aviador' },
        { id: 'redondo', label: 'Redondo' },
        { id: 'quadrado', label: 'Quadrado' },
        { id: 'gatinho', label: 'Gatinho' },
        { id: 'oversized', label: 'Oversized' },
      ]
    }
  ],
  'Bijuterias': [
    {
      id: 'tipo',
      label: 'Tipo',
      options: [
        { id: 'colar', label: 'Colar' },
        { id: 'brinco', label: 'Brinco' },
        { id: 'pulseira', label: 'Pulseira' },
        { id: 'anel', label: 'Anel' },
        { id: 'conjunto', label: 'Conjunto' },
      ]
    }
  ],
};
