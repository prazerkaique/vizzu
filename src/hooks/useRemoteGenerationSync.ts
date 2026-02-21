import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProducts } from '../contexts/ProductsContext';
import { useClients } from '../contexts/ClientsContext';
import { useGeneration, type FeatureType } from '../contexts/GenerationContext';
import { supabase } from '../services/supabaseClient';
import type { Product, Client } from '../types';

// ═══════════════════════════════════════════════════════════════
// Config
// ═══════════════════════════════════════════════════════════════

const SYNC_INTERVAL_MS = 15_000; // Polling a cada 15s (safety net)
const MAX_AGE_MS = 30 * 60 * 1000; // Só considerar gerações dos últimos 30 min

const FEATURE_LABELS: Record<string, string> = {
  'product-studio': 'Product Studio',
  'look-composer': 'Look Composer',
  'creative-still': 'Still Criativo',
  'provador': 'Provador',
  'models': 'Modelos',
};

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function getProductName(productId: string | null, products: Product[]): string {
  if (!productId) return 'Gerando...';
  return products.find(p => p.id === productId)?.name || 'Gerando...';
}

function getClientName(clientId: string | null, clients: Client[]): string {
  if (!clientId) return 'Gerando...';
  const c = clients.find(cl => cl.id === clientId);
  return c ? `${c.firstName} ${c.lastName || ''}`.trim() : 'Gerando...';
}

// ═══════════════════════════════════════════════════════════════
// Hook principal
// ═══════════════════════════════════════════════════════════════

/**
 * Sincroniza gerações em background entre dispositivos.
 *
 * Duas estratégias complementares:
 * 1. Polling periódico (15s): busca gerações ativas no Supabase — robusto, funciona sempre
 * 2. Realtime INSERT: detecção instantânea (~1-2s) quando outro dispositivo inicia
 *
 * O polling de STATUS (5s) em GenerationContext cuida do progresso/conclusão.
 */
export function useRemoteGenerationSync() {
  const { user } = useAuth();
  const { products } = useProducts();
  const { clients } = useClients();
  const { backgroundGenerations, addBackgroundGeneration } = useGeneration();

  // Refs para acesso atualizado dentro de callbacks assíncronos
  const productsRef = useRef(products);
  productsRef.current = products;
  const clientsRef = useRef(clients);
  clientsRef.current = clients;
  const bgRef = useRef(backgroundGenerations);
  bgRef.current = backgroundGenerations;
  const addBgRef = useRef(addBackgroundGeneration);
  addBgRef.current = addBackgroundGeneration;

  // ── Função de sincronização (reutilizada por polling e Realtime) ──
  const syncActiveGenerations = useCallback(async (userId: string) => {
    const cutoff = new Date(Date.now() - MAX_AGE_MS).toISOString();

    try {
      // Buscar em paralelo as 3 tabelas
      const [gensResult, csResult, modelsResult] = await Promise.all([
        supabase
          .from('generations')
          .select('id, type, product_id, client_id, status, created_at')
          .eq('user_id', userId)
          .in('status', ['pending', 'processing'])
          .gte('created_at', cutoff),
        supabase
          .from('creative_still_generations')
          .select('id, product_id, settings_snapshot, status, created_at, variations_requested')
          .eq('user_id', userId)
          .in('status', ['pending', 'processing'])
          .gte('created_at', cutoff),
        supabase
          .from('saved_models')
          .select('id, name, status, created_at')
          .eq('user_id', userId)
          .in('status', ['pending', 'processing'])
          .gte('created_at', cutoff),
      ]);

      let added = 0;

      // 1. Generations (PS, LC, Provador)
      for (const gen of gensResult.data || []) {
        const feature = gen.type as FeatureType;
        const displayName = feature === 'provador'
          ? getClientName(gen.client_id, clientsRef.current)
          : getProductName(gen.product_id, productsRef.current);

        const result = addBgRef.current({
          feature,
          featureLabel: FEATURE_LABELS[feature] || feature,
          productName: displayName,
          productId: gen.product_id || undefined,
          userId,
          generationId: gen.id,
          table: 'generations',
          progress: 0,
          startTime: new Date(gen.created_at).getTime(),
        }, { skipIfDuplicate: true });
        if (result) added++;
      }

      // 2. Creative Still
      for (const gen of csResult.data || []) {
        const productName = gen.settings_snapshot?.product_name
          || getProductName(gen.product_id, productsRef.current);

        const result = addBgRef.current({
          feature: 'creative-still',
          featureLabel: FEATURE_LABELS['creative-still'],
          productName,
          productId: gen.product_id || undefined,
          userId,
          generationId: gen.id,
          table: 'creative_still_generations',
          progress: 0,
          variationsCount: gen.variations_requested || 2,
          startTime: new Date(gen.created_at).getTime(),
        }, { skipIfDuplicate: true });
        if (result) added++;
      }

      // 3. Saved Models
      for (const model of modelsResult.data || []) {
        const result = addBgRef.current({
          feature: 'models',
          featureLabel: FEATURE_LABELS['models'],
          productName: model.name || 'Modelo',
          userId,
          generationId: model.id,
          table: 'saved_models',
          progress: 0,
          startTime: new Date(model.created_at).getTime(),
        }, { skipIfDuplicate: true });
        if (result) added++;
      }

      if (added > 0) {
        console.log('[RemoteSync] Sincronizadas', added, 'gerações remotas');
      }
    } catch (err) {
      console.warn('[RemoteSync] Erro na sincronização:', err);
    }
  }, []);

  // ── Polling periódico (15s) — safety net robusto ──
  useEffect(() => {
    if (!user?.id) return;

    // Executar imediatamente no mount
    syncActiveGenerations(user.id);

    // Repetir a cada 15s
    const interval = setInterval(() => {
      syncActiveGenerations(user.id);
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [user?.id, syncActiveGenerations]);

  // ── Realtime INSERT listener (instant sync, complementar ao polling) ──
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`remote-gen-sync-${user.id}`)

      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'generations',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const row = payload.new as Record<string, any>;
        if (!row?.id) return;
        console.log('[RemoteSync] Realtime INSERT generations:', row.id?.slice(0, 8));
        // Trigger sync imediato ao receber INSERT
        syncActiveGenerations(user.id);
      })

      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'creative_still_generations',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const row = payload.new as Record<string, any>;
        if (!row?.id) return;
        console.log('[RemoteSync] Realtime INSERT creative_still:', row.id?.slice(0, 8));
        syncActiveGenerations(user.id);
      })

      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'saved_models',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const row = payload.new as Record<string, any>;
        if (!row?.id) return;
        console.log('[RemoteSync] Realtime INSERT saved_models:', row.id?.slice(0, 8));
        syncActiveGenerations(user.id);
      })

      .subscribe((status) => {
        console.log('[RemoteSync] Realtime channel:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, syncActiveGenerations]);
}
