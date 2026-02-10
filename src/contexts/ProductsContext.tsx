import React, { createContext, useContext, useState, useCallback } from 'react';
import { Product } from '../types';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';
import { useHistory } from './HistoryContext';
import { type ImageSize } from '../utils/imageUrl';

interface ProductsContextType {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  loadUserProducts: (userId: string) => Promise<void>;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  deleteProduct: (product: Product) => Promise<void>;
  deleteSelectedProducts: (selectedIds: string[], onDone?: () => void) => Promise<void>;
  isProductOptimized: (product: Product) => boolean;
  getProductDisplayImage: (product: Product, size?: ImageSize) => string | undefined;
  getOptimizedImages: (product: Product) => { url: string; angle: string }[];
  getOriginalImages: (product: Product) => { url: string; label: string }[];
}

const ProductsContext = createContext<ProductsContextType | null>(null);

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { showToast } = useUI();
  const { addHistoryLog } = useHistory();

  const [products, setProducts] = useState<Product[]>([]);

  const loadUserProducts = useCallback(async (userId: string) => {
    try {
      console.log('[Products] Carregando produtos para userId:', userId);
      const { data: productsData, error } = await supabase
        .from('products')
        .select(`
          *,
          product_images (*)
        `)
        .eq('user_id', userId);

      if (error) throw error;

      console.log('[Products] Supabase retornou', productsData?.length ?? 0, 'produtos');

      if (productsData && productsData.length > 0) {
        const formattedProducts: Product[] = productsData.map(p => {
          const allImages = p.product_images || [];

          const generatedTypes = ['studio_ready', 'cenario_criativo', 'modelo_ia', 'product_studio'];
          const originalImages = allImages.filter((img: any) =>
            !generatedTypes.includes(img.type)
          );

          const generatedStudio = allImages.filter((img: any) => img.type === 'studio_ready');
          const generatedCenario = allImages.filter((img: any) => img.type === 'cenario_criativo');
          const generatedModelo = allImages.filter((img: any) => img.type === 'modelo_ia');
          const generatedProductStudio = allImages.filter((img: any) => img.type === 'product_studio');

          const formattedOriginalImages = originalImages.map((img: any) => ({
            id: img.id,
            name: img.file_name,
            url: img.url,
            base64: img.url,
            type: img.type === 'original' ? 'front' : img.type
          }));

          const originalImagesObj: any = {};
          originalImages.forEach((img: any) => {
            let angle = img.angle || (img.type === 'original' ? 'front' : img.type);
            // Mapear angles do Supabase para camelCase do TypeScript
            if (angle === 'front_detail') angle = 'frontDetail';
            else if (angle === 'back_detail') angle = 'backDetail';
            // Compatibilidade: detail genérico → frontDetail
            else if (angle === 'detail' && !originalImagesObj.frontDetail) angle = 'frontDetail';
            if (angle && !originalImagesObj[angle]) {
              originalImagesObj[angle] = {
                id: img.id,
                url: img.url,
                storagePath: img.storage_path
              };
            }
          });

          if (!originalImagesObj.front && formattedOriginalImages.length > 0) {
            originalImagesObj.front = {
              id: formattedOriginalImages[0].id,
              url: formattedOriginalImages[0].url
            };
          }

          const productStudioSessions: Record<string, any[]> = {};
          generatedProductStudio.forEach((img: any) => {
            const sessionId = img.generation_id || `session-${img.created_at?.split('T')[0] || 'unknown'}`;
            if (!productStudioSessions[sessionId]) {
              productStudioSessions[sessionId] = [];
            }
            productStudioSessions[sessionId].push(img);
          });

          const formattedProductStudio = Object.entries(productStudioSessions).map(([sessionId, images]) => ({
            id: sessionId,
            productId: p.id,
            images: images.map((img: any) => ({
              id: img.id,
              url: img.url,
              angle: img.angle || 'front',
              createdAt: img.created_at
            })),
            status: 'ready' as const,
            createdAt: images[0]?.created_at || new Date().toISOString()
          }));

          const generatedImages = {
            studioReady: generatedStudio.map((img: any) => ({
              id: img.id,
              createdAt: img.created_at,
              tool: 'studio' as const,
              images: { front: img.url, back: undefined },
              metadata: img.metadata || {}
            })),
            cenarioCriativo: generatedCenario.map((img: any) => ({
              id: img.id,
              createdAt: img.created_at,
              tool: 'cenario' as const,
              images: { front: img.url, back: undefined },
              metadata: img.metadata || {}
            })),
            // Agrupar modelo_ia por generation_id (mesmo padrão do productStudio)
            // Isso evita duplicatas quando um look tem front+back (2 rows no Supabase)
            // e garante que o id seja o generation_id (correto para save/delete)
            modeloIA: (() => {
              const modeloIAGroups: Record<string, any[]> = {};
              generatedModelo.forEach((img: any) => {
                const groupId = img.generation_id || img.id;
                if (!modeloIAGroups[groupId]) modeloIAGroups[groupId] = [];
                modeloIAGroups[groupId].push(img);
              });
              return Object.entries(modeloIAGroups).map(([groupId, images]) => {
                const frontImg = images.find((i: any) => i.angle === 'front') || images[0];
                const backImg = images.find((i: any) => i.angle === 'back');
                const metadata = typeof frontImg.metadata === 'string'
                  ? JSON.parse(frontImg.metadata)
                  : (frontImg.metadata || {});
                return {
                  id: groupId,
                  createdAt: frontImg.created_at,
                  tool: 'lifestyle' as const,
                  images: {
                    front: frontImg.url,
                    back: backImg?.url || metadata?.backImageUrl || undefined
                  },
                  metadata: metadata
                };
              });
            })(),
            productStudio: formattedProductStudio
          };

          return {
            id: p.id,
            sku: p.sku,
            name: p.name,
            description: p.description,
            category: p.category,
            brand: p.brand,
            color: p.color,
            fit: p.fit,
            collection: p.collection,
            attributes: p.attributes || {},
            images: formattedOriginalImages,
            originalImages: originalImagesObj,
            generatedImages: generatedImages,
            createdAt: p.created_at,
            updatedAt: p.updated_at
          };
        });

        setProducts(formattedProducts);
      } else {
        console.warn('[Products] Nenhum produto encontrado para este usuário');
        setProducts([]);
      }
    } catch (error) {
      console.error('[Products] Erro ao carregar produtos:', error);
    }
  }, []);

  const updateProduct = useCallback((productId: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...updates } : p));
  }, []);

  const deleteProduct = useCallback(async (product: Product) => {
    setProducts(prev => prev.filter(p => p.id !== product.id));

    try {
      const { error: imagesError } = await supabase
        .from('product_images')
        .delete()
        .eq('product_id', product.id);

      if (imagesError) {
        console.error('Erro ao deletar imagens:', imagesError);
      }

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (error) {
        console.error('Erro ao deletar produto:', error);
        showToast('Erro ao excluir produto do servidor', 'error');
        if (user?.id) {
          loadUserProducts(user.id);
        }
        return;
      }

      showToast(`"${product.name}" foi excluído`, 'success');
      addHistoryLog('Produto excluído', `"${product.name}" foi removido do catálogo`, 'success', [product], 'manual', 0);
    } catch (e) {
      console.error('Erro ao deletar produto:', e);
      showToast('Erro ao excluir produto', 'error');
    }
  }, [user, showToast, addHistoryLog, loadUserProducts]);

  const deleteSelectedProducts = useCallback(async (selectedIds: string[], onDone?: () => void) => {
    const count = selectedIds.length;
    const productsToDelete = products.filter(p => selectedIds.includes(p.id));

    setProducts(prev => prev.filter(p => !selectedIds.includes(p.id)));
    onDone?.();

    try {
      const { error: imagesError } = await supabase
        .from('product_images')
        .delete()
        .in('product_id', selectedIds);

      if (imagesError) {
        console.error('Erro ao deletar imagens:', imagesError);
      }

      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', selectedIds);

      if (error) {
        console.error('Erro ao deletar produtos:', error);
        showToast('Erro ao excluir produtos do servidor', 'error');
        if (user?.id) {
          loadUserProducts(user.id);
        }
        return;
      }

      showToast(`${count} produto${count > 1 ? 's' : ''} excluído${count > 1 ? 's' : ''}`, 'success');
      addHistoryLog('Produtos excluídos', `${count} produto${count > 1 ? 's foram removidos' : ' foi removido'} do catálogo`, 'success', productsToDelete, 'manual', 0);
    } catch (e) {
      console.error('Erro ao deletar produtos:', e);
      showToast('Erro ao excluir produtos', 'error');
    }
  }, [products, user, showToast, addHistoryLog, loadUserProducts]);

  const isProductOptimized = useCallback((product: Product): boolean => {
    const sessions = product.generatedImages?.productStudio || [];
    return sessions.some(session => session.images && session.images.length > 0);
  }, []);

  const getProductDisplayImage = useCallback((product: Product): string | undefined => {
    const sessions = product.generatedImages?.productStudio || [];

    if (sessions.length > 0) {
      for (const session of sessions) {
        if (session.images) {
          const frontImage = session.images.find(img => img.angle === 'front');
          if (frontImage?.url) return frontImage.url;
        }
      }
      for (const session of sessions) {
        if (session.images?.[0]?.url) return session.images[0].url;
      }
    }

    if (product.originalImages?.front?.url) return product.originalImages.front.url;
    if (product.images?.[0]?.url) return product.images[0].url;
    if (product.images?.[0]?.base64) return product.images[0].base64;
    return undefined;
  }, []);

  const getOptimizedImages = useCallback((product: Product): { url: string; angle: string }[] => {
    const sessions = product.generatedImages?.productStudio || [];
    const images: { url: string; angle: string }[] = [];

    sessions.forEach(session => {
      if (session.images) {
        session.images.forEach(img => {
          if (img.url) {
            images.push({ url: img.url, angle: img.angle });
          }
        });
      }
    });

    return images;
  }, []);

  const getOriginalImages = useCallback((product: Product): { url: string; label: string }[] => {
    const images: { url: string; label: string }[] = [];

    if (product.originalImages?.front?.url) {
      images.push({ url: product.originalImages.front.url, label: 'Frente' });
    }
    if (product.originalImages?.back?.url) {
      images.push({ url: product.originalImages.back.url, label: 'Costas' });
    }
    if (product.originalImages?.detail?.url) {
      images.push({ url: product.originalImages.detail.url, label: 'Detalhe' });
    }

    if (images.length === 0 && product.images) {
      product.images.forEach((img, idx) => {
        const url = img.url || img.base64;
        if (url) {
          images.push({ url, label: idx === 0 ? 'Frente' : `Imagem ${idx + 1}` });
        }
      });
    }

    return images;
  }, []);

  return (
    <ProductsContext.Provider value={{
      products, setProducts,
      loadUserProducts, updateProduct,
      deleteProduct, deleteSelectedProducts,
      isProductOptimized, getProductDisplayImage,
      getOptimizedImages, getOriginalImages,
    }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts(): ProductsContextType {
  const context = useContext(ProductsContext);
  if (!context) throw new Error('useProducts must be used within ProductsProvider');
  return context;
}
