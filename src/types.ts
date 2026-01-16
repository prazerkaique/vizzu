export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  plan: string;
}

export interface ProductImage {
  name: string;
  url?: string;
  base64?: string;
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
  productSku: string;
  productName: string;
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
  settings: { gender: 'woman' | 'man'; ethnicity: string; bodyType: string; ageRange: string; };
  modelPrompt: string;
  createdAt: string;
  usageCount: number;
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

export interface HistoryLog {
  id: string;
  date: string;
  action: string;
  details: string;
  status: 'success' | 'error';
  method: 'manual' | 'bulk' | 'system';
  cost: number;
}
