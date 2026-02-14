import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export interface ShopifyConnection {
  id: string;
  platform: string;
  store_domain: string;
  store_name: string;
  status: string;
  last_sync_at: string | null;
  installed_at: string;
  auto_sync: boolean;
  scopes: string;
}

export function useShopifyConnection() {
  const { user } = useAuth();
  const [connection, setConnection] = useState<ShopifyConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setConnection(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('ecommerce_connections')
        .select('id, platform, store_domain, store_name, status, last_sync_at, installed_at, auto_sync, scopes')
        .eq('user_id', user.id)
        .eq('platform', 'shopify')
        .eq('status', 'active')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found (expected when not connected)
        console.error('[useShopifyConnection] Error:', error);
      }

      setConnection(data || null);
    } catch (err) {
      console.error('[useShopifyConnection] Unexpected error:', err);
      setConnection(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const disconnect = useCallback(async () => {
    if (!connection) return false;

    try {
      const { error } = await supabase
        .from('ecommerce_connections')
        .update({ status: 'uninstalled', uninstalled_at: new Date().toISOString() })
        .eq('id', connection.id);

      if (error) throw error;

      setConnection(null);
      return true;
    } catch (err) {
      console.error('[useShopifyConnection] Disconnect error:', err);
      return false;
    }
  }, [connection]);

  return {
    connection,
    isConnected: !!connection,
    isLoading,
    refresh,
    disconnect,
  };
}
