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
  brand?: string;
  color?: string;
  fit?: string;
  images: ProductImage[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  plan: string;
}

export interface HistoryLog {
  id: string;
  action: string;
  details: string;
  status: 'success' | 'error' | 'pending';
  items: Product[];
  method: 'manual' | 'auto' | 'api';
  cost: number;
  createdAt: Date;
}
