import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabaseClient';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (userData: { id?: string; email: string; name: string; avatar?: string }) => void;
  loginDemo: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const initialLoadDone = useRef(false);

  // Check for existing Supabase session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const userId = session.user.id;
        const userEmail = session.user.email;

        // Verificar se é um usuário diferente do último logado
        const lastUserId = localStorage.getItem('vizzu_last_user_id');
        if (lastUserId && lastUserId !== userId) {
          localStorage.removeItem('vizzu_clients');
          localStorage.removeItem('vizzu_history');
          localStorage.removeItem('vizzu_company_settings');
          localStorage.removeItem('vizzu_credits_data');
          localStorage.removeItem('vizzu_onboarding_completed');
        }
        localStorage.setItem('vizzu_last_user_id', userId);

        setUser({
          id: userId,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Usuário',
          email: userEmail || '',
          avatar: session.user.user_metadata?.avatar_url || '',
          plan: 'Free',
          tourEnabled: session.user.user_metadata?.tour_enabled !== false,
        });
        setIsAuthenticated(true);
      }
      initialLoadDone.current = true;
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const userId = session.user.id;
        const userEmail = session.user.email;

        const lastUserId = localStorage.getItem('vizzu_last_user_id');
        if (lastUserId && lastUserId !== userId) {
          localStorage.removeItem('vizzu_clients');
          localStorage.removeItem('vizzu_history');
          localStorage.removeItem('vizzu_company_settings');
          localStorage.removeItem('vizzu_credits_data');
          localStorage.removeItem('vizzu_onboarding_completed');
        }
        localStorage.setItem('vizzu_last_user_id', userId);

        setUser({
          id: userId,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Usuário',
          email: userEmail || '',
          avatar: session.user.user_metadata?.avatar_url || '',
          plan: 'Free',
          tourEnabled: session.user.user_metadata?.tour_enabled !== false,
        });
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback((userData: { id?: string; email: string; name: string; avatar?: string }) => {
    setUser({
      id: userData.id || '1',
      email: userData.email,
      name: userData.name,
      avatar: userData.avatar || '',
      plan: 'Free'
    } as User);
    setIsAuthenticated(true);
  }, []);

  const loginDemo = useCallback(() => {
    setUser({
      id: 'demo',
      email: 'demo@vizzu.com.br',
      name: 'Usuário Demo',
      avatar: '',
      plan: 'Free'
    } as User);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    // Limpar cache local para evitar dados de outra conta ao relogar
    localStorage.removeItem('vizzu_credits_data');
    localStorage.removeItem('vizzu_last_user_id');
    localStorage.removeItem('vizzu_clients');
    localStorage.removeItem('vizzu_history');
    localStorage.removeItem('vizzu_company_settings');
    localStorage.removeItem('vizzu_onboarding_completed');
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, loginDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
