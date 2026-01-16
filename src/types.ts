// ═══════════════════════════════════════════════════════════════
// VIZZU - TypeScript Types (VERSÃO COMPLETA)
// ═══════════════════════════════════════════════════════════════

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  plan: string;
}

export interface ProductImage {
  name: string;
  base64?: string;
  url?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  collection?: string;        // NOVO: Coleção do produto
  brand?: string;
  color?: string;
  fit?: string;
  images: ProductImage[];
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
  type: 'studio' | 'cenario' | 'lifestyle' | 'refine';
  prompt?: string;
  originalImage: string;
  generatedImage: string;
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
// Client Types
// ═══════════════════════════════════════════════════════════════

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  whatsapp: string;
  email?: string;
  photo?: string;             // Base64 da foto para Provador IA
  hasProvadorIA: boolean;     // Flag indicando se tem foto para Provador
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
  products: ProvadorProduct[];
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
  slot: 'top' | 'bottom' | 'shoes' | 'accessory' | 'fullbody';
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  message: string;
  isDefault?: boolean;
}
