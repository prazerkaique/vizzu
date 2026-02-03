import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { HistoryLog, Product } from '../types';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';

interface HistoryContextType {
  historyLogs: HistoryLog[];
  setHistoryLogs: React.Dispatch<React.SetStateAction<HistoryLog[]>>;
  addHistoryLog: (action: string, details: string, status: 'success' | 'error' | 'pending', items: Product[], method: 'manual' | 'auto' | 'api' | 'ai' | 'bulk' | 'system', cost: number, imageUrl?: string) => void;
  loadUserHistory: (userId: string) => Promise<void>;
}

const HistoryContext = createContext<HistoryContextType | null>(null);

const saveHistoryToSupabase = async (log: HistoryLog, userId: string) => {
  try {
    const { error } = await supabase
      .from('history_logs')
      .upsert({
        id: log.id,
        user_id: userId,
        date: log.date || new Date().toISOString(),
        action: log.action,
        details: log.details,
        status: log.status,
        method: log.method,
        cost: log.cost || 0,
        items_count: log.itemsCount || log.items?.length || log.products?.length || 0,
        image_url: log.imageUrl || null,
        created_at: log.createdAt instanceof Date ? log.createdAt.toISOString() : (log.createdAt || new Date().toISOString()),
      }, { onConflict: 'id' });

    if (error) {
      // Silently ignore - table may not exist
    }
  } catch {
    // Silently ignore
  }
};

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>(() => {
    const saved = localStorage.getItem('vizzu_history');
    if (saved) {
      try { return JSON.parse(saved); } catch { }
    }
    return [];
  });

  // Persist history to localStorage
  useEffect(() => {
    localStorage.setItem('vizzu_history', JSON.stringify(historyLogs));
  }, [historyLogs]);

  const loadUserHistory = useCallback(async (userId: string) => {
    try {
      const { data: historyData, error } = await supabase
        .from('history_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        return;
      }

      const localHistory: HistoryLog[] = JSON.parse(localStorage.getItem('vizzu_history') || '[]');

      if (historyData && historyData.length > 0) {
        const formattedHistory: HistoryLog[] = historyData.map(h => ({
          id: h.id,
          date: h.date,
          action: h.action,
          details: h.details,
          status: h.status,
          method: h.method,
          cost: h.cost || 0,
          itemsCount: h.items_count || 0,
          imageUrl: h.image_url || undefined,
          createdAt: h.created_at ? new Date(h.created_at) : undefined,
        }));
        setHistoryLogs(formattedHistory);
      } else {
        if (localHistory.length > 0) {
          for (const log of localHistory.slice(0, 50)) {
            await saveHistoryToSupabase(log, userId);
          }
        } else {
          setHistoryLogs([]);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  }, []);

  const addHistoryLog = useCallback((action: string, details: string, status: 'success' | 'error' | 'pending', items: Product[], method: 'manual' | 'auto' | 'api' | 'ai' | 'bulk' | 'system', cost: number, imageUrl?: string) => {
    const newLog: HistoryLog = {
      id: `log-${Date.now()}`,
      date: new Date().toISOString(),
      action,
      details,
      status,
      items,
      method,
      cost,
      itemsCount: items.length,
      imageUrl,
      createdAt: new Date(),
    };
    setHistoryLogs(prev => [newLog, ...prev].slice(0, 100));

    if (user?.id) {
      saveHistoryToSupabase(newLog, user.id);
    }
  }, [user]);

  return (
    <HistoryContext.Provider value={{ historyLogs, setHistoryLogs, addHistoryLog, loadUserHistory }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory(): HistoryContextType {
  const context = useContext(HistoryContext);
  if (!context) throw new Error('useHistory must be used within HistoryProvider');
  return context;
}
