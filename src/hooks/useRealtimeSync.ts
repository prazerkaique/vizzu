import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeSyncOptions {
  userId: string | undefined;
  refreshProducts: () => void;
  refreshCredits: () => void;
  refreshClients: () => void;
  bumpGallery: () => void;
  refreshModels: () => void;
  refreshShopify: () => void;
}

/**
 * Hook centralizado de Supabase Realtime.
 * Cria 1 canal com subscriptions para 11 tabelas.
 * Callbacks são armazenados em refs para evitar recrear o canal a cada render.
 */
export function useRealtimeSync(options: RealtimeSyncOptions) {
  const {
    userId,
    refreshProducts,
    refreshCredits,
    refreshClients,
    bumpGallery,
    refreshModels,
    refreshShopify,
  } = options;

  // Refs para callbacks — evita recrear canal quando callbacks mudam
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  // Ref para debounce timers
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Debounce helper: agrupa eventos rápidos em uma única chamada
  const debouncedCall = useCallback((key: string, fn: () => void, delayMs = 1000) => {
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }
    debounceTimers.current[key] = setTimeout(() => {
      fn();
      delete debounceTimers.current[key];
    }, delayMs);
  }, []);

  useEffect(() => {
    if (!userId) return;

    console.log('[Realtime] Criando canal para userId:', userId.slice(0, 8));

    const channel: RealtimeChannel = supabase
      .channel(`user-sync-${userId}`)

      // ── Products (INSERT/UPDATE/DELETE) ──
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'products',
        filter: `user_id=eq.${userId}`,
      }, () => {
        console.log('[Realtime] products change');
        debouncedCall('products', () => callbacksRef.current.refreshProducts(), 1000);
      })

      // ── Product Images (INSERT) — sem user_id, debounce maior ──
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'product_images',
      }, () => {
        console.log('[Realtime] product_images INSERT');
        debouncedCall('products', () => callbacksRef.current.refreshProducts(), 2000);
      })

      // ── Generations (UPDATE → completed) ──
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'generations',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const newRow = payload.new as Record<string, unknown>;
        if (newRow.status === 'completed' || newRow.status === 'partial') {
          console.log('[Realtime] generation completed/partial');
          debouncedCall('products', () => callbacksRef.current.refreshProducts(), 1500);
          debouncedCall('gallery', () => callbacksRef.current.bumpGallery(), 1500);
        }
      })

      // ── Creative Still Generations (UPDATE → completed) ──
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'creative_still_generations',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const newRow = payload.new as Record<string, unknown>;
        if (newRow.status === 'completed') {
          console.log('[Realtime] creative_still completed');
          debouncedCall('gallery', () => callbacksRef.current.bumpGallery(), 1500);
        }
      })

      // ── User Credits (UPDATE) ──
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_credits',
        filter: `user_id=eq.${userId}`,
      }, () => {
        console.log('[Realtime] credits change');
        debouncedCall('credits', () => callbacksRef.current.refreshCredits(), 500);
      })

      // ── User Subscriptions (UPDATE) ──
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_subscriptions',
        filter: `user_id=eq.${userId}`,
      }, () => {
        console.log('[Realtime] subscription change');
        debouncedCall('credits', () => callbacksRef.current.refreshCredits(), 500);
      })

      // ── Clients (INSERT/UPDATE/DELETE) ──
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'clients',
        filter: `user_id=eq.${userId}`,
      }, () => {
        console.log('[Realtime] clients change');
        debouncedCall('clients', () => callbacksRef.current.refreshClients(), 1000);
      })

      // ── Client Looks (INSERT) ──
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'client_looks',
        filter: `user_id=eq.${userId}`,
      }, () => {
        console.log('[Realtime] client_looks INSERT');
        debouncedCall('gallery', () => callbacksRef.current.bumpGallery(), 1500);
        debouncedCall('clients', () => callbacksRef.current.refreshClients(), 1000);
      })

      // ── Saved Models (INSERT/UPDATE/DELETE) ──
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'saved_models',
        filter: `user_id=eq.${userId}`,
      }, () => {
        console.log('[Realtime] saved_models change');
        debouncedCall('models', () => callbacksRef.current.refreshModels(), 1000);
      })

      // ── Ecommerce Connections (INSERT/UPDATE) ──
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ecommerce_connections',
        filter: `user_id=eq.${userId}`,
      }, () => {
        console.log('[Realtime] ecommerce_connections change');
        debouncedCall('shopify', () => callbacksRef.current.refreshShopify(), 1000);
      })

      // ── Ecommerce Product Map — sem user_id ──
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ecommerce_product_map',
      }, () => {
        console.log('[Realtime] ecommerce_product_map change');
        debouncedCall('gallery', () => callbacksRef.current.bumpGallery(), 1500);
      })

      .subscribe((status) => {
        console.log('[Realtime] Status:', status);
      });

    // Cleanup
    return () => {
      console.log('[Realtime] Removendo canal');
      Object.values(debounceTimers.current).forEach(clearTimeout);
      debounceTimers.current = {};
      supabase.removeChannel(channel);
    };
  }, [userId, debouncedCall]);
}
