// ═══════════════════════════════════════════════════════════════
// VIZZU - TypeScript Types
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
  category?: string;
  images: ProductImage[];
}

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

export interface LookComposition {
  head?: { image: string; name: string };
  top?: { image: string; name: string };
  bottom?: { image: string; name: string };
  feet?: { image: string; name: string };
  accessory1?: { image: string; name: string };
  accessory2?: { image: string; name: string };
}

export interface HistoryLog {
  id: string;
  date: string;
  action: string;
  details: string;
  status: 'success' | 'error' | 'pending';
  method: 'manual' | 'ai' | 'bulk' | 'system';
  cost: number;
  itemsCount: number;
  products: Product[];
}

export interface CreditHistoryItem {
  id: string;
  date: string;
  action: string;
  amount: number;
  balance: number;
}
