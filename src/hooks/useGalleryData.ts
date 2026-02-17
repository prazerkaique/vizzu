import { useState, useEffect, useMemo } from 'react';
import { useProducts } from '../contexts/ProductsContext';
import { useClients } from '../contexts/ClientsContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import type { Product } from '../types';

// ═══════════════════════════════════════════════════════════════
// Tipos da Galeria
// ═══════════════════════════════════════════════════════════════

// Cenário Criativo → mesclado em Still Criativo
// Studio Ready / Modelo IA → mesclado em Product Studio
export type FeatureType =
  | 'product-studio'
  | 'creative-still'
  | 'look-composer'
  | 'provador';

export interface GalleryItem {
  id: string;
  imageUrl: string;
  featureType: FeatureType;
  productId?: string;
  productName?: string;
  originalImageUrl?: string;
  clientName?: string;
  createdAt: string;
  metadata?: {
    angle?: string;
    sessionId?: string;
    generationId?: string;
    variationIndex?: number;
    resolution?: string;
    view?: string;
  };
}

export interface GalleryStats {
  total: number;
  byFeature: Record<FeatureType, number>;
}

// ═══════════════════════════════════════════════════════════════
// Config por feature (ícone + label)
// ═══════════════════════════════════════════════════════════════

export const FEATURE_CONFIG: Record<FeatureType, { label: string; icon: string }> = {
  'product-studio': { label: 'Product Studio', icon: 'fa-camera' },
  'creative-still': { label: 'Still Criativo', icon: 'fa-gem' },
  'look-composer': { label: 'Look Composer', icon: 'fa-layer-group' },
  'provador': { label: 'Provador', icon: 'fa-shirt' },
};

// ═══════════════════════════════════════════════════════════════
// Helpers de extração
// ═══════════════════════════════════════════════════════════════

function getOriginalFrontUrl(product: Product): string | undefined {
  return product.originalImages?.front?.url || product.images?.[0]?.url;
}

function extractFromProducts(products: Product[]): GalleryItem[] {
  const items: GalleryItem[] = [];

  for (const product of products) {
    const gen = product.generatedImages;
    if (!gen) continue;

    const originalUrl = getOriginalFrontUrl(product);

    // Product Studio (sessions com múltiplos ângulos)
    for (const session of gen.productStudio || []) {
      if (session.status !== 'ready') continue;
      for (const img of session.images) {
        items.push({
          id: `ps-${img.id}`,
          imageUrl: img.url,
          featureType: 'product-studio',
          productId: product.id,
          productName: product.name,
          originalImageUrl: originalUrl,
          createdAt: img.createdAt || session.createdAt,
          metadata: { angle: img.angle, sessionId: session.id },
        });
      }
    }

    // Studio Ready (antigo "Modelo IA") → mescla em Product Studio
    for (const set of gen.studioReady || []) {
      items.push({
        id: `sr-${set.id}`,
        imageUrl: set.images.front,
        featureType: 'product-studio',
        productId: product.id,
        productName: product.name,
        originalImageUrl: originalUrl,
        createdAt: set.createdAt,
        metadata: { generationId: set.id, view: 'front' },
      });
      if (set.images.back) {
        items.push({
          id: `sr-${set.id}-back`,
          imageUrl: set.images.back,
          featureType: 'product-studio',
          productId: product.id,
          productName: product.name,
          originalImageUrl: originalUrl,
          createdAt: set.createdAt,
          metadata: { generationId: set.id, view: 'back' },
        });
      }
    }

    // Look Composer (modeloIA)
    for (const set of gen.modeloIA || []) {
      items.push({
        id: `lc-${set.id}`,
        imageUrl: set.images.front,
        featureType: 'look-composer',
        productId: product.id,
        productName: product.name,
        originalImageUrl: originalUrl,
        createdAt: set.createdAt,
        metadata: { generationId: set.id, view: 'front' },
      });
      if (set.images.back) {
        items.push({
          id: `lc-${set.id}-back`,
          imageUrl: set.images.back,
          featureType: 'look-composer',
          productId: product.id,
          productName: product.name,
          originalImageUrl: originalUrl,
          createdAt: set.createdAt,
          metadata: { generationId: set.id, view: 'back' },
        });
      }
    }

    // Cenário Criativo → mescla em Still Criativo
    for (const set of gen.cenarioCriativo || []) {
      items.push({
        id: `cc-${set.id}`,
        imageUrl: set.images.front,
        featureType: 'creative-still',
        productId: product.id,
        productName: product.name,
        originalImageUrl: originalUrl,
        createdAt: set.createdAt,
        metadata: { generationId: set.id, view: 'front' },
      });
      if (set.images.back) {
        items.push({
          id: `cc-${set.id}-back`,
          imageUrl: set.images.back,
          featureType: 'creative-still',
          productId: product.id,
          productName: product.name,
          originalImageUrl: originalUrl,
          createdAt: set.createdAt,
          metadata: { generationId: set.id, view: 'back' },
        });
      }
    }
  }

  return items;
}

// ═══════════════════════════════════════════════════════════════
// Hook principal
// ═══════════════════════════════════════════════════════════════

export function useGalleryData() {
  const { products } = useProducts();
  const { clients, clientLooks } = useClients();
  const { user } = useAuth();

  const [csItems, setCsItems] = useState<GalleryItem[]>([]);
  const [isLoadingCS, setIsLoadingCS] = useState(true);

  // Buscar Creative Still do Supabase (não está em ProductsContext)
  useEffect(() => {
    if (!user?.id) {
      setIsLoadingCS(false);
      return;
    }

    setIsLoadingCS(true);

    supabase
      .from('creative_still_generations')
      .select('id, variation_urls, variation_1_url, variation_2_url, status, created_at, settings_snapshot, product_id')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          const items: GalleryItem[] = [];
          for (const gen of data) {
            const urls: string[] = gen.variation_urls?.length
              ? gen.variation_urls
              : [gen.variation_1_url, gen.variation_2_url].filter(Boolean);

            const productName = gen.settings_snapshot?.product_name || 'Still Criativo';
            const productId = gen.product_id || undefined;

            const matchProduct = productId ? products.find(p => p.id === productId) : undefined;
            const originalUrl = matchProduct ? getOriginalFrontUrl(matchProduct) : undefined;

            urls.forEach((url: string, idx: number) => {
              if (!url) return;
              items.push({
                id: `cs-${gen.id}-${idx}`,
                imageUrl: url,
                featureType: 'creative-still',
                productId,
                productName,
                originalImageUrl: originalUrl,
                createdAt: gen.created_at,
                metadata: { generationId: gen.id, variationIndex: idx },
              });
            });
          }
          setCsItems(items);
        }
        setIsLoadingCS(false);
      });
  }, [user?.id, products]);

  // Itens de produtos (PS + SR mesclados, LC, CC mesclado em CS)
  const productItems = useMemo(() => extractFromProducts(products), [products]);

  // Itens do Provador
  const provadorItems = useMemo<GalleryItem[]>(() => {
    return clientLooks.map((look): GalleryItem => {
      const client = clients.find(c => c.id === look.clientId);
      return {
        id: `pv-${look.id}`,
        imageUrl: look.imageUrl,
        featureType: 'provador',
        clientName: client ? `${client.firstName} ${client.lastName || ''}`.trim() : undefined,
        createdAt: look.createdAt,
      };
    });
  }, [clientLooks, clients]);

  // Merge e sort
  const allItems = useMemo(() => {
    const merged = [...productItems, ...csItems, ...provadorItems];
    merged.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return merged;
  }, [productItems, csItems, provadorItems]);

  // Stats
  const stats = useMemo<GalleryStats>(() => {
    const byFeature: Record<FeatureType, number> = {
      'product-studio': 0,
      'creative-still': 0,
      'look-composer': 0,
      'provador': 0,
    };

    for (const item of allItems) {
      byFeature[item.featureType]++;
    }

    return { total: allItems.length, byFeature };
  }, [allItems]);

  return {
    allItems,
    stats,
    isLoading: isLoadingCS,
  };
}
