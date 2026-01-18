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

export interface ProductImage {
  id?: string;
  name: string;
  base64?: string;
  url?: string;
  type?: 'front' | 'back' | 'generated';  // NOVO: tipo da imagem
}

// ═══════════════════════════════════════════════════════════════
// NOVO: Estrutura de Imagens Originais (Frente/Costas)
// ═══════════════════════════════════════════════════════════════

export interface ProductOriginalImages {
  front: ProductImage;        // Obrigatório - foto de frente
  back?: ProductImage;        // Opcional - foto de costas
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
  };
}

export interface ProductGeneratedImages {
  studioReady: GeneratedImageSet[];
  cenarioCriativo: GeneratedImageSet[];
  modeloIA: GeneratedImageSet[];
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
}

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
