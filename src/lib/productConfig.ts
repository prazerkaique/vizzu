// Configuração centralizada de tipos de produto, categorias e slots de upload.
// Compartilhada entre ProductsPage (cadastro) e ProductStudioEditor (geração).

import type { ProductStudioAngle } from '../types';

export type ProductType = 'clothing' | 'footwear' | 'headwear' | 'bag' | 'accessory';

// ── Listas de categorias ──────────────────────────────────────────
export const CLOTHING_CATEGORIES = [
  'Camisetas', 'Blusas', 'Regatas', 'Tops', 'Camisas', 'Bodies',
  'Jaquetas', 'Casacos', 'Blazers', 'Moletons', 'Calças', 'Shorts',
  'Bermudas', 'Saias', 'Leggings', 'Vestidos', 'Macacões', 'Jardineiras',
  'Biquínis', 'Maiôs', 'Shorts Fitness'
];

export const FOOTWEAR_CATEGORIES = ['Calçados', 'Tênis', 'Sandálias', 'Botas', 'Sapatos', 'Chinelos'];

export const HEADWEAR_CATEGORIES = ['Bonés', 'Chapéus', 'Gorros', 'Viseiras'];

export const BAG_CATEGORIES = ['Bolsas', 'Mochilas', 'Pochetes', 'Necessaires'];

export const ACCESSORY_CATEGORIES = ['Óculos', 'Bijuterias', 'Relógios', 'Cintos', 'Acessórios', 'Tiaras', 'Lenços', 'Outros Acessórios'];

// ── Detecção de tipo ──────────────────────────────────────────────
export function getProductType(category: string | undefined | null): ProductType {
  const cat = category || '';
  if (CLOTHING_CATEGORIES.includes(cat)) return 'clothing';
  if (FOOTWEAR_CATEGORIES.includes(cat)) return 'footwear';
  if (HEADWEAR_CATEGORIES.includes(cat)) return 'headwear';
  if (BAG_CATEGORIES.includes(cat)) return 'bag';
  if (ACCESSORY_CATEGORIES.includes(cat)) return 'accessory';
  // Sem categoria = default roupa (cadastro). Com categoria desconhecida = accessory (seguro)
  return cat === '' ? 'clothing' : 'accessory';
}

// ── Upload slots por tipo ─────────────────────────────────────────
export interface UploadSlotConfig {
  angle: string;
  label: string;
  required: boolean;
  icon: string;
  accentColor: string;
  description?: string;
  group: 'main' | 'detail';
}

export const UPLOAD_SLOTS_CONFIG: Record<ProductType, UploadSlotConfig[]> = {
  clothing: [
    { angle: 'front', label: 'Frente', required: true, icon: 'fa-image', accentColor: '#FF6B6B', group: 'main' },
    { angle: 'back', label: 'Costas', required: false, icon: 'fa-image', accentColor: '#22c55e', group: 'main' },
    { angle: 'front_detail', label: 'Detalhe Frente', required: false, icon: 'fa-magnifying-glass-plus', accentColor: '#FF9F43', group: 'detail' },
    { angle: 'back_detail', label: 'Detalhe Costas', required: false, icon: 'fa-magnifying-glass-plus', accentColor: '#FF9F43', group: 'detail' },
  ],
  footwear: [
    { angle: 'front', label: 'Frente', required: true, icon: 'fa-shoe-prints', accentColor: '#FF6B6B', group: 'main' },
    { angle: 'back', label: 'Traseira', required: false, icon: 'fa-shoe-prints', accentColor: '#22c55e', group: 'main' },
    { angle: 'side-left', label: 'Lateral', required: false, icon: 'fa-arrows-left-right', accentColor: '#3b82f6', group: 'main' },
    { angle: 'top', label: 'Superior', required: false, icon: 'fa-arrow-up', accentColor: '#8b5cf6', group: 'main' },
    { angle: 'detail', label: 'Sola', required: false, icon: 'fa-arrow-down', accentColor: '#FF9F43', group: 'detail' },
  ],
  headwear: [
    { angle: 'front', label: 'Frente', required: true, icon: 'fa-hat-cowboy', accentColor: '#FF6B6B', group: 'main' },
    { angle: 'back', label: 'Traseira', required: false, icon: 'fa-hat-cowboy', accentColor: '#22c55e', group: 'main' },
    { angle: 'side-left', label: 'Lateral', required: false, icon: 'fa-arrows-left-right', accentColor: '#3b82f6', group: 'main' },
    { angle: 'top', label: 'Vista Superior', required: false, icon: 'fa-arrow-up', accentColor: '#8b5cf6', group: 'main' },
    { angle: 'front_detail', label: 'Detalhe', required: false, icon: 'fa-magnifying-glass-plus', accentColor: '#FF9F43', group: 'detail' },
  ],
  bag: [
    { angle: 'front', label: 'Frente', required: true, icon: 'fa-bag-shopping', accentColor: '#FF6B6B', group: 'main' },
    { angle: 'back', label: 'Traseira', required: false, icon: 'fa-bag-shopping', accentColor: '#22c55e', group: 'main' },
    { angle: 'side-left', label: 'Lateral', required: false, icon: 'fa-arrows-left-right', accentColor: '#3b82f6', group: 'main' },
    { angle: 'detail', label: 'Interior', required: false, icon: 'fa-magnifying-glass-plus', accentColor: '#FF9F43', group: 'detail' },
    { angle: 'front_detail', label: 'Detalhe', required: false, icon: 'fa-magnifying-glass-plus', accentColor: '#FF9F43', group: 'detail' },
  ],
  accessory: [
    { angle: 'front', label: 'Frente', required: true, icon: 'fa-glasses', accentColor: '#FF6B6B', group: 'main' },
    { angle: 'back', label: 'Costas', required: false, icon: 'fa-glasses', accentColor: '#22c55e', group: 'main' },
    { angle: 'side-left', label: 'Lateral', required: false, icon: 'fa-arrows-left-right', accentColor: '#3b82f6', group: 'main' },
    { angle: 'detail', label: 'Detalhe', required: false, icon: 'fa-magnifying-glass-plus', accentColor: '#FF9F43', group: 'detail' },
  ],
};

// Dica contextual para a seção de detalhe por tipo
export const DETAIL_TIPS: Record<ProductType, string> = {
  clothing: 'Close-up de logos, estampas ou costuras. Melhora a fidelidade da IA nesses detalhes.',
  footwear: 'Foto da sola do calçado. Ajuda a IA a reproduzir fielmente o solado e textura.',
  headwear: 'Close-up de logos, bordados ou texturas. Melhora a fidelidade da IA nesses detalhes.',
  bag: 'Fotos do interior e detalhes de acabamento (fechos, texturas). Melhora a fidelidade da IA.',
  accessory: 'Close-up de detalhes e texturas. Melhora a fidelidade da IA nesses detalhes.',
};

// Converte angle key para nome do campo da API N8N: 'side-left' → 'image_side_left_base64'
export function angleToApiField(angle: string): string {
  return `image_${angle.replace(/-/g, '_')}_base64`;
}

// Converte angle key para chave no originalImages: 'front_detail' → 'frontDetail', 'side-left' → 'side-left'
export function angleToOriginalImagesKey(angle: string): string {
  if (angle === 'front_detail') return 'frontDetail';
  if (angle === 'back_detail') return 'backDetail';
  return angle;
}
