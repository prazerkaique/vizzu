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
  tool: 'studio' | 'cenario' | 'lifestyle' | 'creative-still';
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
    modelId?: string;         // ID do modelo usado na geração
    modelName?: string;       // Nome do modelo usado na geração
    modelThumbnail?: string;  // Thumbnail do modelo (para exibição)
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

  // NOVO: Flag para saber se tem foto de detalhe
  hasDetailImage?: boolean;

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
  description?: string; // Descrição detalhada para a IA identificar o caimento/fit
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
        { id: 'slim', label: 'Slim', description: 'Justa ao corpo, acompanha silhueta. Mangas coladas ao braço, tecido esticado sobre peito/abdômen.' },
        { id: 'regular', label: 'Regular', description: 'Corte reto tradicional. Pequena folga entre tecido e corpo (1-2cm). Não marca silhueta nem flutua.' },
        { id: 'relaxed', label: 'Relaxed', description: 'Levemente folgada mas não exagerada. Caimento natural, não marca corpo. Folga moderada nos ombros.' },
        { id: 'oversized', label: 'Oversized', description: 'Grande e ampla. Mangas caem além dos ombros, tecido forma volume no tronco. Aparência 1-2 tamanhos acima.' },
        { id: 'boxy', label: 'Boxy', description: 'Corte quadrado/retangular. Largura igual do ombro à barra. Não afina na cintura, forma caixa.' },
        { id: 'cropped', label: 'Cropped', description: 'Curta acima da cintura. Mostra abdômen ou cintura alta da calça. Pode ser justa ou solta.' },
      ]
    },
    {
      id: 'comprimento',
      label: 'Comprimento',
      options: [
        { id: 'curta', label: 'Curta', description: 'Termina na linha da cintura ou logo abaixo.' },
        { id: 'regular', label: 'Regular', description: 'Cobre quadril, termina no meio da braguilha.' },
        { id: 'longline', label: 'Longline', description: 'Alongada, cobre parcialmente o quadril/coxa, estilo streetwear.' },
      ]
    }
  ],
  'Blusas': [
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'justa', label: 'Justa', description: 'Colada ao corpo, marca silhueta e curvas. Tecido esticado, sem folga visível.' },
        { id: 'regular', label: 'Regular', description: 'Leve folga, caimento natural. Acompanha corpo sem apertar nem flutuar.' },
        { id: 'solta', label: 'Solta', description: 'Tecido flui sem tocar corpo. Caimento leve e arejado. Folga moderada.' },
        { id: 'oversized', label: 'Oversized', description: 'Muito ampla, aparência de peça maior. Ombros caídos, muito volume no tronco.' },
        { id: 'cropped', label: 'Cropped', description: 'Curta, termina acima da cintura. Mostra parte do abdômen.' },
      ]
    },
    {
      id: 'comprimento',
      label: 'Comprimento',
      options: [
        { id: 'cropped', label: 'Cropped', description: 'Acima do umbigo, mostra abdômen.' },
        { id: 'curta', label: 'Curta', description: 'Na linha da cintura ou logo abaixo.' },
        { id: 'regular', label: 'Regular', description: 'Abaixo da cintura, cobre quadril parcialmente.' },
      ]
    }
  ],
  'Regatas': [
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'justa', label: 'Justa', description: 'Colada ao corpo, marca silhueta. Tecido esticado sobre peito/abdômen.' },
        { id: 'regular', label: 'Regular', description: 'Caimento reto natural. Leve folga, não marca corpo excessivamente.' },
        { id: 'solta', label: 'Solta', description: 'Tecido flui livremente. Cavas amplas, caimento arejado.' },
        { id: 'oversized', label: 'Oversized', description: 'Muito ampla, aparência de peça maior. Grande volume no tronco.' },
        { id: 'cropped', label: 'Cropped', description: 'Curta acima da cintura, mostra abdômen.' },
      ]
    },
    {
      id: 'comprimento',
      label: 'Comprimento',
      options: [
        { id: 'cropped', label: 'Cropped', description: 'Acima do umbigo, mostra abdômen.' },
        { id: 'curta', label: 'Curta', description: 'Na linha da cintura.' },
        { id: 'regular', label: 'Regular', description: 'Abaixo da cintura, cobre quadril.' },
      ]
    }
  ],
  'Tops': [
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'justa', label: 'Justa', description: 'Colada ao corpo tipo segunda pele. Marca silhueta, sem folga.' },
        { id: 'regular', label: 'Regular', description: 'Ajustada mas não apertada. Leve folga confortável.' },
        { id: 'solta', label: 'Solta', description: 'Tecido flui, não marca corpo. Caimento leve e arejado.' },
        { id: 'oversized', label: 'Oversized', description: 'Grande e ampla, aparência de peça muito maior.' },
        { id: 'cropped', label: 'Cropped', description: 'Muito curta, termina acima ou na altura do busto/peito.' },
      ]
    },
    {
      id: 'comprimento',
      label: 'Comprimento',
      options: [
        { id: 'cropped', label: 'Cropped', description: 'Acima do umbigo ou na linha do busto.' },
        { id: 'curta', label: 'Curta', description: 'Na linha da cintura.' },
        { id: 'regular', label: 'Regular', description: 'Abaixo da cintura.' },
      ]
    }
  ],
  'Camisas': [
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'slim', label: 'Slim', description: 'Justa ao tronco, acompanha silhueta. Mangas ajustadas, sem sobra de tecido.' },
        { id: 'regular', label: 'Regular', description: 'Corte tradicional com leve folga. Permite movimento sem apertar.' },
        { id: 'oversized', label: 'Oversized', description: 'Grande e ampla, ombros caídos. Muito volume, aparência despojada.' },
        { id: 'boxy', label: 'Boxy', description: 'Corte quadrado/retangular. Largura uniforme do ombro à barra.' },
      ]
    }
  ],
  'Vestidos': [
    {
      id: 'comprimento',
      label: 'Comprimento',
      options: [
        { id: 'mini', label: 'Mini', description: 'Acima do joelho, entre 10-15cm acima. Mostra coxas.' },
        { id: 'midi', label: 'Midi', description: 'Na altura do joelho ou logo abaixo. Cobre joelho.' },
        { id: 'midi-longo', label: 'Midi-longo', description: 'Abaixo do joelho até metade da canela.' },
        { id: 'longo', label: 'Longo', description: 'Na altura da canela/tornozelo.' },
        { id: 'maxi', label: 'Maxi', description: 'Toca ou arrasta no chão. Comprimento máximo.' },
      ]
    },
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'justo', label: 'Justo', description: 'Colado ao corpo inteiro, marca silhueta e curvas. Tecido esticado.' },
        { id: 'evase', label: 'Evasê', description: 'Justo em cima, abre gradualmente da cintura para baixo. Forma A.' },
        { id: 'reto', label: 'Reto', description: 'Caimento reto e uniforme do ombro à barra. Sem afinar na cintura.' },
        { id: 'amplo', label: 'Amplo', description: 'Solto e fluido por todo corpo. Muito tecido, não marca silhueta.' },
      ]
    }
  ],
  'Saias': [
    {
      id: 'comprimento',
      label: 'Comprimento',
      options: [
        { id: 'mini', label: 'Mini', description: 'Acima do joelho, mostra coxas.' },
        { id: 'midi', label: 'Midi', description: 'Na altura do joelho até metade da canela.' },
        { id: 'longa', label: 'Longa', description: 'Abaixo da canela até o chão.' },
      ]
    },
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'justa', label: 'Justa', description: 'Colada ao corpo, marca quadril e coxas. Geralmente com fenda para caminhar.' },
        { id: 'evase', label: 'Evasê', description: 'Abre gradualmente do quadril para baixo. Forma A suave.' },
        { id: 'reta', label: 'Reta', description: 'Caimento reto sem abertura. Largura uniforme do quadril à barra.' },
        { id: 'gode', label: 'Godê', description: 'Muito rodada, amplo volume. Tecido forma círculo ou semicírculo quando estendido.' },
      ]
    }
  ],
  'Calças': [
    {
      id: 'modelagem',
      label: 'Modelagem',
      options: [
        { id: 'skinny', label: 'Skinny', description: 'Muito justa da coxa ao tornozelo. Segunda pele, marca toda silhueta das pernas.' },
        { id: 'slim', label: 'Slim', description: 'Ajustada mas não apertada. Acompanha perna com leve folga, não marca excessivamente.' },
        { id: 'reta', label: 'Reta', description: 'Largura uniforme do quadril ao tornozelo. Não afunila nem alarga.' },
        { id: 'wide-leg', label: 'Wide leg', description: 'Pernas amplas e retas do quadril ao tornozelo. Muito volume, caimento fluido.' },
        { id: 'flare', label: 'Flare', description: 'Justa na coxa, abre gradualmente do joelho para baixo. Formato sino.' },
        { id: 'pantalona', label: 'Pantalona', description: 'Pernas muito largas desde o quadril. Máximo volume, estilo palazzo.' },
        { id: 'jogger', label: 'Jogger', description: 'Folgada no corpo, afunila no tornozelo com elástico. Estilo esportivo.' },
        { id: 'cargo', label: 'Cargo', description: 'Bolsos laterais volumosos nas coxas. Geralmente caimento reto ou folgado.' },
      ]
    },
    {
      id: 'cintura',
      label: 'Cintura',
      options: [
        { id: 'baixa', label: 'Baixa', description: 'Abaixo do umbigo, na linha do quadril.' },
        { id: 'media', label: 'Média', description: 'Na altura do umbigo.' },
        { id: 'alta', label: 'Alta', description: 'Acima do umbigo, cobre cintura natural.' },
      ]
    }
  ],
  'Shorts': [
    {
      id: 'comprimento',
      label: 'Comprimento',
      options: [
        { id: 'curto', label: 'Curto', description: 'Meio da coxa ou mais curto.' },
        { id: 'medio', label: 'Médio', description: 'Acima do joelho, cobre maior parte da coxa.' },
        { id: 'bermuda', label: 'Bermuda', description: 'Na altura do joelho ou logo acima.' },
      ]
    },
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'justo', label: 'Justo', description: 'Colado às coxas, marca silhueta. Pouca ou nenhuma folga.' },
        { id: 'regular', label: 'Regular', description: 'Leve folga confortável, não aperta nem flutua.' },
        { id: 'solto', label: 'Solto', description: 'Pernas amplas com bastante folga. Caimento fluido.' },
        { id: 'mom', label: 'Mom', description: 'Cintura alta, folgado no quadril e coxas. Estilo vintage anos 90.' },
      ]
    }
  ],
  'Bermudas': [
    {
      id: 'comprimento',
      label: 'Comprimento',
      options: [
        { id: 'curto', label: 'Curto', description: 'Meio da coxa.' },
        { id: 'medio', label: 'Médio', description: 'Acima do joelho.' },
        { id: 'bermuda', label: 'Bermuda', description: 'Na altura do joelho.' },
      ]
    },
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'justo', label: 'Justo', description: 'Colado às coxas, marca silhueta.' },
        { id: 'regular', label: 'Regular', description: 'Leve folga confortável.' },
        { id: 'solto', label: 'Solto', description: 'Pernas amplas com folga.' },
        { id: 'mom', label: 'Mom', description: 'Cintura alta, folgado no quadril. Estilo vintage.' },
      ]
    }
  ],
  'Jaquetas': [
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'slim', label: 'Slim', description: 'Justa ao tronco, acompanha silhueta. Pouca folga para camadas por baixo.' },
        { id: 'regular', label: 'Regular', description: 'Caimento tradicional com folga moderada. Permite camadas por baixo.' },
        { id: 'oversized', label: 'Oversized', description: 'Grande e ampla, ombros caídos. Aparência 1-2 tamanhos acima.' },
        { id: 'cropped', label: 'Cropped', description: 'Curta, termina na cintura ou acima. Mostra parte da blusa por baixo.' },
      ]
    },
    {
      id: 'comprimento',
      label: 'Comprimento',
      options: [
        { id: 'cropped', label: 'Cropped', description: 'Termina na linha da cintura.' },
        { id: 'regular', label: 'Regular', description: 'Cobre quadril parcialmente.' },
        { id: 'alongado', label: 'Alongado', description: 'Cobre quadril inteiro, próximo às coxas.' },
      ]
    }
  ],
  'Casacos': [
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'slim', label: 'Slim', description: 'Ajustado ao corpo, acompanha silhueta.' },
        { id: 'regular', label: 'Regular', description: 'Caimento tradicional, permite camadas.' },
        { id: 'oversized', label: 'Oversized', description: 'Grande e envolvente, muito volume.' },
        { id: 'cropped', label: 'Cropped', description: 'Curto, termina na cintura.' },
      ]
    },
    {
      id: 'comprimento',
      label: 'Comprimento',
      options: [
        { id: 'cropped', label: 'Cropped', description: 'Na cintura.' },
        { id: 'regular', label: 'Regular', description: 'Cobre quadril.' },
        { id: 'alongado', label: 'Alongado', description: 'Até as coxas ou joelhos.' },
      ]
    }
  ],
  'Blazers': [
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'slim', label: 'Slim', description: 'Justa ao tronco, estruturada. Ombros definidos, cintura marcada.' },
        { id: 'regular', label: 'Regular', description: 'Corte tradicional com leve folga. Ombros estruturados.' },
        { id: 'oversized', label: 'Oversized', description: 'Grande e despojado, ombros caídos. Estilo boyfriend.' },
        { id: 'cropped', label: 'Cropped', description: 'Curto, termina na cintura ou acima.' },
      ]
    },
    {
      id: 'comprimento',
      label: 'Comprimento',
      options: [
        { id: 'cropped', label: 'Cropped', description: 'Na linha da cintura.' },
        { id: 'regular', label: 'Regular', description: 'Cobre quadril parcialmente, comprimento clássico.' },
        { id: 'alongado', label: 'Alongado', description: 'Estilo longline, cobre quadril inteiro.' },
      ]
    }
  ],
  'Moletons': [
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'slim', label: 'Slim', description: 'Ajustado ao corpo, silhueta definida.' },
        { id: 'regular', label: 'Regular', description: 'Caimento confortável com folga moderada.' },
        { id: 'oversized', label: 'Oversized', description: 'Grande e folgado, aparência despojada. Muito popular.' },
        { id: 'cropped', label: 'Cropped', description: 'Curto, termina na cintura. Mostra cintura da calça.' },
      ]
    },
    {
      id: 'comprimento',
      label: 'Comprimento',
      options: [
        { id: 'cropped', label: 'Cropped', description: 'Na linha da cintura.' },
        { id: 'regular', label: 'Regular', description: 'Cobre quadril.' },
        { id: 'alongado', label: 'Alongado', description: 'Estilo longline, cobre parte das coxas.' },
      ]
    }
  ],
  'Macacões': [
    {
      id: 'comprimento',
      label: 'Comprimento',
      options: [
        { id: 'curto', label: 'Curto', description: 'Pernas curtas tipo shorts.' },
        { id: 'pantacourt', label: 'Pantacourt', description: 'Pernas até metade da canela.' },
        { id: 'longo', label: 'Longo', description: 'Pernas compridas até o tornozelo.' },
      ]
    },
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'justo', label: 'Justo', description: 'Colado ao corpo inteiro, marca silhueta.' },
        { id: 'regular', label: 'Regular', description: 'Leve folga confortável no tronco e pernas.' },
        { id: 'amplo', label: 'Amplo', description: 'Solto e fluido, pernas largas tipo pantalona.' },
      ]
    }
  ],
  'Jardineiras': [
    {
      id: 'comprimento',
      label: 'Comprimento',
      options: [
        { id: 'curto', label: 'Curto', description: 'Pernas curtas tipo shorts.' },
        { id: 'pantacourt', label: 'Pantacourt', description: 'Pernas até metade da canela.' },
        { id: 'longo', label: 'Longo', description: 'Pernas compridas até o tornozelo.' },
      ]
    },
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'justo', label: 'Justo', description: 'Ajustado ao corpo.' },
        { id: 'regular', label: 'Regular', description: 'Folga confortável.' },
        { id: 'amplo', label: 'Amplo', description: 'Solto e folgado, estilo boyfriend.' },
      ]
    }
  ],
  'Bodies': [
    {
      id: 'caimento',
      label: 'Caimento',
      options: [
        { id: 'justo', label: 'Justo', description: 'Colado ao corpo tipo segunda pele. Marca silhueta.' },
        { id: 'regular', label: 'Regular', description: 'Ajustado mas confortável, não aperta.' },
        { id: 'solto', label: 'Solto', description: 'Tecido flui, não marca corpo. Geralmente com amarração.' },
      ]
    },
    {
      id: 'decote',
      label: 'Decote',
      options: [
        { id: 'fechado', label: 'Fechado', description: 'Gola alta ou fechada, sem decote.' },
        { id: 'moderado', label: 'Moderado', description: 'Decote discreto.' },
        { id: 'decotado', label: 'Decotado', description: 'Decote profundo ou amplo.' },
      ]
    }
  ],
  'Biquínis': [
    {
      id: 'cobertura',
      label: 'Cobertura inferior',
      options: [
        { id: 'fio-dental', label: 'Fio dental', description: 'Mínima cobertura, tira fina atrás. Lateral estreita.' },
        { id: 'asa-delta', label: 'Asa delta', description: 'Cobertura moderada, formato triangular. Lateral média.' },
        { id: 'tradicional', label: 'Tradicional', description: 'Cobertura confortável, cobre bumbum inteiro. Lateral larga.' },
        { id: 'hot-pants', label: 'Hot pants', description: 'Modelo shorts, cobertura total. Cintura mais alta.' },
      ]
    },
    {
      id: 'bojo',
      label: 'Bojo',
      options: [
        { id: 'com-bojo', label: 'Com bojo', description: 'Estrutura rígida que modela e sustenta. Formato definido.' },
        { id: 'sem-bojo', label: 'Sem bojo', description: 'Tecido flexível sem estrutura. Caimento natural.' },
        { id: 'bojo-removivel', label: 'Bojo removível', description: 'Bojo encaixado que pode ser retirado.' },
      ]
    }
  ],
  'Maiôs': [
    {
      id: 'cobertura',
      label: 'Cobertura inferior',
      options: [
        { id: 'fio-dental', label: 'Fio dental', description: 'Mínima cobertura atrás, tira fina.' },
        { id: 'asa-delta', label: 'Asa delta', description: 'Cobertura moderada, formato triangular.' },
        { id: 'tradicional', label: 'Tradicional', description: 'Cobertura confortável e completa.' },
        { id: 'hot-pants', label: 'Hot pants', description: 'Modelo com pernas tipo shorts.' },
      ]
    },
    {
      id: 'bojo',
      label: 'Bojo',
      options: [
        { id: 'com-bojo', label: 'Com bojo', description: 'Estrutura que modela e sustenta o busto.' },
        { id: 'sem-bojo', label: 'Sem bojo', description: 'Sem estrutura, caimento natural.' },
        { id: 'bojo-removivel', label: 'Bojo removível', description: 'Bojo que pode ser retirado.' },
      ]
    }
  ],
  'Leggings': [
    {
      id: 'cintura',
      label: 'Cintura',
      options: [
        { id: 'media', label: 'Média', description: 'Cós na altura do umbigo.' },
        { id: 'alta', label: 'Alta', description: 'Cós acima do umbigo, cobre barriga.' },
        { id: 'super-alta', label: 'Super alta', description: 'Cós bem alto, quase no busto. Máxima compressão abdominal.' },
      ]
    },
    {
      id: 'compressao',
      label: 'Compressão',
      options: [
        { id: 'leve', label: 'Leve', description: 'Tecido flexível, sem apertar. Conforto para uso casual.' },
        { id: 'media', label: 'Média', description: 'Compressão moderada, sustenta sem apertar demais.' },
        { id: 'alta', label: 'Alta', description: 'Tecido firme que modela e comprime. Para treinos intensos.' },
      ]
    }
  ],
  'Shorts Fitness': [
    {
      id: 'cintura',
      label: 'Cintura',
      options: [
        { id: 'media', label: 'Média', description: 'Cós na altura do umbigo.' },
        { id: 'alta', label: 'Alta', description: 'Cós acima do umbigo.' },
        { id: 'super-alta', label: 'Super alta', description: 'Cós bem alto, máxima sustentação.' },
      ]
    },
    {
      id: 'compressao',
      label: 'Compressão',
      options: [
        { id: 'leve', label: 'Leve', description: 'Tecido flexível e confortável.' },
        { id: 'media', label: 'Média', description: 'Compressão moderada.' },
        { id: 'alta', label: 'Alta', description: 'Tecido firme, máxima sustentação.' },
      ]
    }
  ],
  'Calçados': [
    {
      id: 'altura',
      label: 'Altura',
      options: [
        { id: 'rasteiro', label: 'Rasteiro', description: 'Sem salto, sola rente ao chão. Máximo conforto.' },
        { id: 'salto-baixo', label: 'Salto baixo (3-5cm)', description: 'Salto discreto de 3-5cm. Confortável para uso prolongado.' },
        { id: 'salto-medio', label: 'Salto médio (5-8cm)', description: 'Salto moderado de 5-8cm. Elegante e ainda confortável.' },
        { id: 'salto-alto', label: 'Salto alto (8cm+)', description: 'Salto acima de 8cm. Elegância máxima, uso para eventos.' },
        { id: 'plataforma', label: 'Plataforma', description: 'Sola elevada por inteiro, não apenas calcanhar. Estabilidade maior que salto.' },
      ]
    }
  ],
  'Bolsas': [
    {
      id: 'tamanho',
      label: 'Tamanho',
      options: [
        { id: 'mini', label: 'Mini', description: 'Cabe apenas celular e cartão. Menos de 15cm.' },
        { id: 'pequena', label: 'Pequena', description: 'Cabe celular, carteira e itens básicos. 15-20cm.' },
        { id: 'media', label: 'Média', description: 'Uso diário, cabe itens essenciais. 20-30cm.' },
        { id: 'grande', label: 'Grande', description: 'Cabe notebook pequeno, muitos itens. 30-40cm.' },
        { id: 'maxi', label: 'Maxi', description: 'Bolsa grande tipo sacola. Acima de 40cm.' },
      ]
    }
  ],
  'Acessórios': [
    {
      id: 'tamanho',
      label: 'Tamanho',
      options: [
        { id: 'unico', label: 'Único', description: 'Tamanho padrão universal.' },
        { id: 'pequeno', label: 'Pequeno', description: 'Versão compacta/delicada.' },
        { id: 'medio', label: 'Médio', description: 'Tamanho padrão.' },
        { id: 'grande', label: 'Grande', description: 'Versão statement/destaque.' },
      ]
    }
  ],
  // Novas categorias - Cabeça
  'Bonés': [
    {
      id: 'modelo',
      label: 'Modelo',
      options: [
        { id: 'dad-hat', label: 'Dad Hat', description: 'Aba curva, copa macia e desestruturada. Estilo casual e vintage.' },
        { id: 'trucker', label: 'Trucker', description: 'Parte traseira em tela/rede. Frente estruturada, aba curva ou reta.' },
        { id: 'snapback', label: 'Snapback', description: 'Aba reta, copa estruturada alta. Fecho traseiro ajustável de pressão.' },
        { id: 'aba-reta', label: 'Aba Reta', description: 'Aba completamente plana/reta. Estilo urbano/streetwear.' },
        { id: 'five-panel', label: 'Five Panel', description: 'Copa formada por 5 painéis. Visual minimalista e moderno.' },
      ]
    }
  ],
  'Chapéus': [
    {
      id: 'modelo',
      label: 'Modelo',
      options: [
        { id: 'bucket', label: 'Bucket', description: 'Formato balde, aba caída em volta. Estilo anos 90, casual.' },
        { id: 'fedora', label: 'Fedora', description: 'Copa vincada no topo, aba média. Estilo clássico elegante.' },
        { id: 'panama', label: 'Panamá', description: 'Palha fina trançada, aba larga. Elegante para verão.' },
        { id: 'palha', label: 'Palha', description: 'Material natural trançado, aba larga. Proteção solar, estilo praia.' },
        { id: 'pescador', label: 'Pescador', description: 'Similar ao bucket mas mais estruturado. Proteção lateral.' },
      ]
    }
  ],
  'Tiaras': [
    {
      id: 'largura',
      label: 'Largura',
      options: [
        { id: 'fina', label: 'Fina', description: 'Menos de 1cm de largura. Delicada e discreta.' },
        { id: 'media', label: 'Média', description: '1-3cm de largura. Versátil para uso diário.' },
        { id: 'larga', label: 'Larga', description: 'Acima de 3cm. Statement piece, visual retrô.' },
      ]
    }
  ],
  'Lenços': [
    {
      id: 'tamanho',
      label: 'Tamanho',
      options: [
        { id: 'pequeno', label: 'Pequeno (bandana)', description: 'Quadrado pequeno ~50cm. Para cabelo ou pescoço.' },
        { id: 'medio', label: 'Médio', description: 'Quadrado ~70cm. Versátil, várias amarrações.' },
        { id: 'grande', label: 'Grande (echarpe)', description: 'Retangular ou quadrado grande. Funciona como xale.' },
      ]
    }
  ],
  // Novas categorias - Pés
  'Tênis': [
    {
      id: 'tipo',
      label: 'Tipo',
      options: [
        { id: 'casual', label: 'Casual', description: 'Uso diário, design clean. Sola fina a média, sem tecnologia esportiva.' },
        { id: 'corrida', label: 'Corrida', description: 'Sola com amortecimento visível, cabedal respirável. Design aerodinâmico.' },
        { id: 'skatista', label: 'Skatista', description: 'Sola plana e grossa, reforço no bico. Design robusto, costuras reforçadas.' },
        { id: 'chunky', label: 'Chunky/Dad Sneaker', description: 'Sola muito grossa e volumosa. Visual robusto e retrô anos 90.' },
        { id: 'slip-on', label: 'Slip-on', description: 'Sem cadarços, elástico lateral. Fácil de calçar, design minimalista.' },
      ]
    }
  ],
  'Sandálias': [
    {
      id: 'tipo',
      label: 'Tipo',
      options: [
        { id: 'rasteira', label: 'Rasteira', description: 'Sem salto, sola fina rente ao chão. Confortável para uso diário.' },
        { id: 'plataforma', label: 'Plataforma', description: 'Sola alta e grossa por inteiro. Estável, altura sem desconforto.' },
        { id: 'salto-bloco', label: 'Salto Bloco', description: 'Salto grosso e estável. Mais confortável que salto fino.' },
        { id: 'salto-fino', label: 'Salto Fino', description: 'Salto delgado e elegante. Para ocasiões especiais.' },
        { id: 'chinelo', label: 'Chinelo/Slide', description: 'Uma tira larga sobre o peito do pé. Fácil de calçar/tirar.' },
      ]
    }
  ],
  'Botas': [
    {
      id: 'cano',
      label: 'Cano',
      options: [
        { id: 'curto', label: 'Curto', description: 'Cobre apenas tornozelo. Versátil, combina com tudo.' },
        { id: 'medio', label: 'Médio', description: 'Até metade da panturrilha. Proteção moderada.' },
        { id: 'alto', label: 'Alto', description: 'Até o joelho. Elegante, protege toda perna.' },
        { id: 'over-knee', label: 'Over the Knee', description: 'Acima do joelho, cobre parte da coxa. Statement piece.' },
      ]
    },
    {
      id: 'salto',
      label: 'Salto',
      options: [
        { id: 'rasteiro', label: 'Rasteiro', description: 'Sem salto, sola plana. Máximo conforto.' },
        { id: 'baixo', label: 'Baixo', description: 'Salto até 5cm. Confortável para uso prolongado.' },
        { id: 'medio', label: 'Médio', description: 'Salto 5-8cm. Elegância com conforto.' },
        { id: 'alto', label: 'Alto', description: 'Salto acima de 8cm. Para ocasiões especiais.' },
      ]
    }
  ],
  // Novas categorias - Acessórios específicos
  'Cintos': [
    {
      id: 'largura',
      label: 'Largura',
      options: [
        { id: 'fino', label: 'Fino', description: 'Até 2cm. Delicado, para passantes pequenos.' },
        { id: 'medio', label: 'Médio', description: '2-4cm. Versátil, passantes padrão.' },
        { id: 'largo', label: 'Largo', description: 'Acima de 4cm. Statement, marca cintura.' },
      ]
    }
  ],
  'Relógios': [
    {
      id: 'tamanho',
      label: 'Tamanho do Mostrador',
      options: [
        { id: 'pequeno', label: 'Pequeno', description: 'Mostrador até 36mm. Delicado, discreto.' },
        { id: 'medio', label: 'Médio', description: 'Mostrador 36-42mm. Tamanho clássico unissex.' },
        { id: 'grande', label: 'Grande (oversized)', description: 'Mostrador acima de 42mm. Statement, esportivo.' },
      ]
    }
  ],
  'Óculos': [
    {
      id: 'formato',
      label: 'Formato',
      options: [
        { id: 'aviador', label: 'Aviador', description: 'Lentes em gota, ponte dupla metálica. Clássico atemporal.' },
        { id: 'redondo', label: 'Redondo', description: 'Armação circular. Estilo vintage, intelectual.' },
        { id: 'quadrado', label: 'Quadrado', description: 'Linhas retas e angulares. Moderno, marcante.' },
        { id: 'gatinho', label: 'Gatinho', description: 'Cantos superiores elevados. Feminino, retrô glam.' },
        { id: 'oversized', label: 'Oversized', description: 'Lentes grandes que cobrem sobrancelhas. Statement, proteção extra.' },
      ]
    }
  ],
  'Bijuterias': [
    {
      id: 'tipo',
      label: 'Tipo',
      options: [
        { id: 'colar', label: 'Colar', description: 'Peça para pescoço. Corrente, choker, ou pingente.' },
        { id: 'brinco', label: 'Brinco', description: 'Peça para orelhas. Argola, gota, ou stud.' },
        { id: 'pulseira', label: 'Pulseira', description: 'Peça para pulso. Bracelete, corrente, ou bangles.' },
        { id: 'anel', label: 'Anel', description: 'Peça para dedos. Fino, statement, ou midi ring.' },
        { id: 'conjunto', label: 'Conjunto', description: 'Kit com peças combinando. Colar + brinco, por exemplo.' },
      ]
    }
  ],
  'Outros Acessórios': [
    {
      id: 'tipo',
      label: 'Tipo',
      options: [
        { id: 'carteira', label: 'Carteira', description: 'Porta-cartões, documentos e dinheiro.' },
        { id: 'porta-celular', label: 'Porta Celular', description: 'Capinha ou bolsa para celular.' },
        { id: 'necessaire', label: 'Necessaire', description: 'Bolsa pequena para cosméticos ou itens pessoais.' },
        { id: 'chaveiro', label: 'Chaveiro', description: 'Acessório decorativo para chaves.' },
        { id: 'outro', label: 'Outro', description: 'Outros tipos de acessórios não listados.' },
      ]
    }
  ],
};

// ═══════════════════════════════════════════════════════════════
// Descrições visuais de fit/caimento para identificação por IA
// Usado para analisar produtos em fotos (com ou sem modelo)
// ═══════════════════════════════════════════════════════════════

export const FIT_DESCRIPTIONS_FOR_AI = {
  // TOPS (Camisetas, Blusas, etc.)
  tops: {
    slim: {
      label: 'Slim',
      visualCues: [
        'Costuras laterais retas sem excesso de tecido',
        'Largura dos ombros próxima à medida real',
        'Pouco volume de tecido quando peça está esticada',
        'Mangas justas que seguem linha do braço'
      ],
      aiPrompt: 'Peça estreita e ajustada. Quando estendida plana, apresenta silhueta alongada e pouca sobra de tecido nas laterais.'
    },
    regular: {
      label: 'Regular',
      visualCues: [
        'Costuras laterais com leve curvatura',
        'Largura moderada no tronco',
        'Tecido forma leve caimento quando pendurado',
        'Mangas com folga moderada'
      ],
      aiPrompt: 'Corte tradicional. Quando estendida, apresenta proporções balanceadas com leve folga nas laterais.'
    },
    oversized: {
      label: 'Oversized',
      visualCues: [
        'Costuras dos ombros caem além da linha natural',
        'Grande largura no tronco e mangas',
        'Muito tecido/volume visível',
        'Barra larga e ampla'
      ],
      aiPrompt: 'Peça grande e ampla. Quando estendida, apresenta largura excessiva em relação ao comprimento, ombros largos.'
    },
    cropped: {
      label: 'Cropped',
      visualCues: [
        'Comprimento visivelmente curto',
        'Barra termina muito antes do esperado',
        'Proporção altura/largura diferente do normal'
      ],
      aiPrompt: 'Peça curta. Comprimento notavelmente menor que o padrão da categoria.'
    },
    boxy: {
      label: 'Boxy',
      visualCues: [
        'Formato retangular/quadrado quando estendida',
        'Largura uniforme do ombro à barra',
        'Sem afunilamento na cintura',
        'Costuras laterais retas e paralelas'
      ],
      aiPrompt: 'Formato de caixa. Quando estendida, a peça forma retângulo quase perfeito sem curvas nas laterais.'
    }
  },

  // CALÇAS
  pants: {
    skinny: {
      label: 'Skinny',
      visualCues: [
        'Pernas muito estreitas',
        'Abertura de barra pequena (12-14cm)',
        'Costuras internas próximas uma da outra',
        'Tecido com elastano visível no toque/brilho'
      ],
      aiPrompt: 'Pernas muito estreitas da coxa ao tornozelo. Abertura de barra pequena, geralmente em tecido com elasticidade.'
    },
    slim: {
      label: 'Slim',
      visualCues: [
        'Pernas estreitas mas não coladas',
        'Abertura de barra moderada (15-17cm)',
        'Leve afunilamento do joelho para baixo'
      ],
      aiPrompt: 'Pernas estreitas com leve folga. Afunila suavemente em direção ao tornozelo.'
    },
    reta: {
      label: 'Reta',
      visualCues: [
        'Largura uniforme da coxa ao tornozelo',
        'Costuras laterais paralelas',
        'Abertura de barra igual à largura da coxa'
      ],
      aiPrompt: 'Pernas com largura uniforme. Costuras laterais formam linhas paralelas do quadril ao tornozelo.'
    },
    wide_leg: {
      label: 'Wide Leg',
      visualCues: [
        'Pernas largas e retas',
        'Grande abertura de barra (22cm+)',
        'Muito volume de tecido nas pernas',
        'Costuras laterais afastadas'
      ],
      aiPrompt: 'Pernas largas e amplas. Grande volume de tecido, abertura de barra larga.'
    },
    flare: {
      label: 'Flare',
      visualCues: [
        'Estreita na coxa, larga embaixo',
        'Formato de sino visível',
        'Alargamento começa no joelho'
      ],
      aiPrompt: 'Formato sino. Justa até o joelho, depois alarga significativamente até a barra.'
    },
    jogger: {
      label: 'Jogger',
      visualCues: [
        'Elástico visível na barra',
        'Franzido no tornozelo',
        'Corpo folgado afunilando no final'
      ],
      aiPrompt: 'Elástico na barra criando franzido. Corpo folgado que afunila drasticamente no tornozelo.'
    }
  },

  // VESTIDOS/SAIAS
  dresses_skirts: {
    justo: {
      label: 'Justo',
      visualCues: [
        'Peça estreita sem volume',
        'Costuras laterais retas e próximas',
        'Pode ter fenda para mobilidade'
      ],
      aiPrompt: 'Silhueta estreita e alongada. Pouco tecido, formato tubular quando estendida.'
    },
    evase: {
      label: 'Evasê',
      visualCues: [
        'Mais estreito em cima, alarga embaixo',
        'Formato A quando estendida',
        'Costuras laterais em diagonal'
      ],
      aiPrompt: 'Formato A. Mais estreita na parte superior, gradualmente mais larga na barra.'
    },
    reto: {
      label: 'Reto',
      visualCues: [
        'Largura uniforme de cima a baixo',
        'Costuras laterais paralelas',
        'Sem volume ou abertura'
      ],
      aiPrompt: 'Corte reto. Largura uniforme do início ao fim, sem alargamento.'
    },
    amplo: {
      label: 'Amplo',
      visualCues: [
        'Muito tecido e volume',
        'Franzidos ou pregas visíveis',
        'Barra muito larga'
      ],
      aiPrompt: 'Muito volume de tecido. Pode ter franzidos, pregas ou godês que criam amplitude.'
    },
    gode: {
      label: 'Godê',
      visualCues: [
        'Formato circular quando estendido',
        'Barra forma ondas naturais',
        'Muito mais largo embaixo que em cima'
      ],
      aiPrompt: 'Corte circular. Quando estendida plana, forma semicírculo ou círculo completo.'
    }
  },

  // TÊNIS
  sneakers: {
    casual: {
      label: 'Casual',
      visualCues: [
        'Sola fina a média, sem tecnologia visível',
        'Design limpo e minimalista',
        'Cabedal liso ou com poucos detalhes',
        'Cores neutras ou básicas'
      ],
      aiPrompt: 'Tênis básico para uso diário. Sola simples, design clean sem elementos esportivos técnicos.'
    },
    corrida: {
      label: 'Corrida',
      visualCues: [
        'Sola com câmaras de ar ou amortecimento visível',
        'Cabedal em mesh/tela respirável',
        'Design aerodinâmico com linhas fluidas',
        'Reforços no calcanhar'
      ],
      aiPrompt: 'Tênis esportivo com tecnologia. Sola com amortecimento visível, cabedal respirável, design performance.'
    },
    skatista: {
      label: 'Skatista',
      visualCues: [
        'Sola plana e grossa de borracha',
        'Bico reforçado com costura tripla',
        'Cabedal em camurça ou lona grossa',
        'Design robusto e durável'
      ],
      aiPrompt: 'Tênis de skate. Sola vulcanizada plana, bico reforçado, construção robusta e durável.'
    },
    chunky: {
      label: 'Chunky/Dad Sneaker',
      visualCues: [
        'Sola muito grossa e volumosa',
        'Múltiplas camadas visíveis na sola',
        'Design exagerado e retrô',
        'Aparência pesada e robusta'
      ],
      aiPrompt: 'Tênis volumoso estilo anos 90. Sola muito grossa com múltiplas camadas, visual exagerado.'
    },
    slip_on: {
      label: 'Slip-on',
      visualCues: [
        'Sem cadarços ou fechos visíveis',
        'Elástico lateral ou abertura ampla',
        'Design minimalista',
        'Fácil de calçar'
      ],
      aiPrompt: 'Tênis sem cadarços. Abertura elástica para calçar facilmente, design limpo e prático.'
    }
  },

  // SANDÁLIAS
  sandals: {
    rasteira: {
      label: 'Rasteira',
      visualCues: [
        'Sola completamente plana, rente ao chão',
        'Altura máxima de 1-2cm',
        'Tiras finas ou médias'
      ],
      aiPrompt: 'Sandália sem salto. Sola plana, confortável para uso prolongado.'
    },
    plataforma: {
      label: 'Plataforma',
      visualCues: [
        'Sola grossa e uniforme',
        'Altura igual em toda extensão',
        'Base sólida e estável'
      ],
      aiPrompt: 'Sandália com sola alta por inteiro. Plataforma uniforme que não forma salto.'
    },
    salto_bloco: {
      label: 'Salto Bloco',
      visualCues: [
        'Salto grosso e quadrado',
        'Base larga oferecendo estabilidade',
        'Formato geométrico'
      ],
      aiPrompt: 'Sandália com salto grosso. Formato quadrado/retangular, mais estável que salto fino.'
    },
    salto_fino: {
      label: 'Salto Fino',
      visualCues: [
        'Salto delgado tipo agulha',
        'Base de apoio pequena',
        'Visual elegante e alongado'
      ],
      aiPrompt: 'Sandália com salto fino/agulha. Elegante, para ocasiões especiais.'
    }
  },

  // BOTAS
  boots: {
    cano_curto: {
      label: 'Cano Curto',
      visualCues: [
        'Altura até tornozelo',
        'Cobre apenas o pé e tornozelo',
        'Abertura próxima ao início da perna'
      ],
      aiPrompt: 'Bota que cobre até o tornozelo. Também chamada de ankle boot ou botinha.'
    },
    cano_medio: {
      label: 'Cano Médio',
      visualCues: [
        'Altura até metade da panturrilha',
        'Cobre tornozelo e parte da perna',
        'Abertura na altura da panturrilha'
      ],
      aiPrompt: 'Bota até a panturrilha. Proteção moderada, versátil.'
    },
    cano_alto: {
      label: 'Cano Alto',
      visualCues: [
        'Altura até o joelho',
        'Cobre toda a panturrilha',
        'Abertura na linha do joelho'
      ],
      aiPrompt: 'Bota até o joelho. Elegante, cobre toda a perna abaixo do joelho.'
    },
    over_knee: {
      label: 'Over the Knee',
      visualCues: [
        'Ultrapassa o joelho',
        'Cobre parte da coxa',
        'Visual dramático e fashion'
      ],
      aiPrompt: 'Bota acima do joelho. Cobre parte da coxa, peça statement.'
    }
  },

  // BONÉS E CHAPÉUS
  headwear: {
    dad_hat: {
      label: 'Dad Hat',
      visualCues: [
        'Aba curva',
        'Copa macia e desestruturada',
        'Visual casual e vintage',
        'Fecho traseiro com fivela ou velcro'
      ],
      aiPrompt: 'Boné com aba curva, copa macia sem estrutura. Estilo casual, relaxado.'
    },
    trucker: {
      label: 'Trucker',
      visualCues: [
        'Parte traseira em tela/rede',
        'Frente estruturada em espuma',
        'Aba geralmente reta',
        'Fecho de pressão traseiro'
      ],
      aiPrompt: 'Boné com traseira em rede para ventilação. Frente estruturada, estilo americano.'
    },
    snapback: {
      label: 'Snapback',
      visualCues: [
        'Aba completamente reta',
        'Copa alta e estruturada',
        'Fecho traseiro de pressão ajustável',
        'Visual urbano/streetwear'
      ],
      aiPrompt: 'Boné de aba reta com fecho de pressão. Copa alta estruturada, estilo urbano.'
    },
    bucket: {
      label: 'Bucket',
      visualCues: [
        'Formato de balde invertido',
        'Aba curta caindo em volta',
        'Sem estrutura rígida',
        'Estilo anos 90'
      ],
      aiPrompt: 'Chapéu formato balde. Aba curta ao redor, sem estrutura, estilo casual.'
    },
    fedora: {
      label: 'Fedora',
      visualCues: [
        'Copa com vinco central no topo',
        'Aba média estruturada',
        'Fita decorativa na base da copa',
        'Visual clássico elegante'
      ],
      aiPrompt: 'Chapéu clássico com vinco na copa. Aba média, fita decorativa, elegante.'
    }
  },

  // BOLSAS
  bags: {
    mini: {
      label: 'Mini',
      visualCues: [
        'Tamanho muito pequeno',
        'Cabe na palma da mão',
        'Geralmente decorativa',
        'Alça curta ou corrente'
      ],
      aiPrompt: 'Bolsa muito pequena, menos de 15cm. Decorativa, cabe poucos itens.'
    },
    pequena: {
      label: 'Pequena',
      visualCues: [
        'Tamanho compacto',
        'Maior que celular, menor que A5',
        'Para itens essenciais'
      ],
      aiPrompt: 'Bolsa compacta 15-20cm. Para celular, carteira e itens básicos.'
    },
    media: {
      label: 'Média',
      visualCues: [
        'Tamanho padrão para uso diário',
        'Comporta itens do dia a dia',
        'Proporção equilibrada'
      ],
      aiPrompt: 'Bolsa de tamanho padrão 20-30cm. Uso diário, boa capacidade.'
    },
    grande: {
      label: 'Grande',
      visualCues: [
        'Tamanho amplo',
        'Cabe itens grandes',
        'Alças reforçadas',
        'Boa capacidade'
      ],
      aiPrompt: 'Bolsa grande 30-40cm. Alta capacidade, para trabalho ou viagem.'
    },
    maxi: {
      label: 'Maxi/Tote',
      visualCues: [
        'Tamanho muito grande',
        'Formato sacola',
        'Alças longas para ombro',
        'Capacidade máxima'
      ],
      aiPrompt: 'Bolsa muito grande, tipo sacola. Acima de 40cm, máxima capacidade.'
    }
  },

  // ÓCULOS
  eyewear: {
    aviador: {
      label: 'Aviador',
      visualCues: [
        'Lentes em formato de gota/lágrima',
        'Ponte dupla metálica',
        'Hastes finas metálicas',
        'Design clássico militar'
      ],
      aiPrompt: 'Óculos aviador. Lentes em gota, ponte dupla metálica, clássico atemporal.'
    },
    redondo: {
      label: 'Redondo',
      visualCues: [
        'Armação perfeitamente circular',
        'Visual intelectual/artístico',
        'Hastes finas',
        'Estilo vintage'
      ],
      aiPrompt: 'Óculos redondos. Armação circular, estilo John Lennon, vintage.'
    },
    quadrado: {
      label: 'Quadrado',
      visualCues: [
        'Linhas retas e angulares',
        'Cantos definidos',
        'Armação marcante',
        'Visual moderno'
      ],
      aiPrompt: 'Óculos quadrados. Linhas retas, cantos angulares, moderno e marcante.'
    },
    gatinho: {
      label: 'Gatinho',
      visualCues: [
        'Cantos superiores elevados/pontudos',
        'Formato que sobe nos cantos',
        'Visual feminino retrô',
        'Estilo anos 50-60'
      ],
      aiPrompt: 'Óculos gatinho. Cantos superiores elevados, feminino, estilo vintage glam.'
    },
    oversized: {
      label: 'Oversized',
      visualCues: [
        'Lentes muito grandes',
        'Cobrem parte das sobrancelhas',
        'Cobrem parte das bochechas',
        'Visual dramático'
      ],
      aiPrompt: 'Óculos grandes. Lentes que cobrem grande área do rosto, statement piece.'
    }
  }
};

// ═══════════════════════════════════════════════════════════════
// STILL CRIATIVO - Templates e Gerações
// ═══════════════════════════════════════════════════════════════

export interface CreativeStillTemplate {
  id: string;
  user_id: string;
  name: string;
  thumbnail_url?: string;

  // Cena
  surface_description: string;
  environment_description: string | null;
  elements_description: string | null;
  elements_images: { url: string; description: string }[];
  mood_season: string | null;

  // Apresentação
  product_presentation: string | null;
  product_scale: string | null;

  // Configurações
  lighting: string;
  lens_model: string;
  camera_angle: string;
  depth_of_field: number;
  visual_style: string;
  frame_ratio: string;
  resolution: string;
  default_variations: number;

  created_at: string;
  updated_at: string;
}

export interface CreativeStillAdditionalProduct {
  product_id: string;
  product_name: string;
  product_image_url: string;
  position_description: string;
  source: 'catalog' | 'upload' | 'prompt';
  upload_base64?: string;
  upload_mime_type?: string;
}

export interface CreativeStillGeneration {
  id: string;
  user_id: string;
  template_id: string | null;
  product_id: string;
  additional_products: CreativeStillAdditionalProduct[];
  settings_snapshot: Record<string, unknown>;
  variation_urls: string[];               // array dinâmico de variações
  variation_1_url: string | null;         // retrocompat
  variation_2_url: string | null;         // retrocompat
  variations_requested: number;
  selected_variation: number | null;
  reference_image_url: string | null;
  resolution: string;
  credits_used: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  is_favorite?: boolean;
  created_at: string;
  completed_at: string | null;
}

export interface CreativeStillWizardState {
  // Step 1 - Produtos
  mainProduct: Product | null;
  mainProductView: 'front' | 'back' | 'both';
  mainProductHighlight: 'front' | 'back';       // só quando 'both'
  productPresentation: string;
  customPresentationText: string;
  productScale: 'close-up' | 'medium' | 'full' | 'ai_choose';
  additionalProducts: CreativeStillAdditionalProduct[];

  // Step 2 - Cenário
  surfaceDescription: string;
  surfaceReference: { base64: string; mimeType: string } | null;
  environmentDescription: string;
  environmentReference: { base64: string; mimeType: string } | null;
  compositionElements: { description: string; image?: { base64: string; mimeType: string } }[];
  compositionReference: { base64: string; mimeType: string } | null;
  moodSeason: string;
  customMoodSeason: string;

  // Step 3 - Estética Fotográfica
  lighting: string;
  customLighting: string;
  lightingReference: { base64: string; mimeType: string } | null;
  lensModel: string;
  cameraAngle: string;
  depthOfField: number;
  visualStyle: string;
  customVisualStyle: string;
  visualStyleReference: { base64: string; mimeType: string } | null;

  // Step 4 - Frame & Configs
  frameRatio: string;
  resolution: '2k' | '4k';
  variationsCount: number;          // 1 a 10
  saveAsTemplate: boolean;
  templateName: string;
}
