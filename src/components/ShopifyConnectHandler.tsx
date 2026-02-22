import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { supabase } from '../services/supabaseClient';

const GATEWAY_URL = 'https://vizzu-shopify-gateway.vercel.app';

/**
 * Componente invisível que detecta deep links #connect-shopify na URL.
 * Montado no App.tsx, processa a vinculação Shopify ↔ Vizzu automaticamente.
 *
 * Fluxo:
 * 1. Gateway Shopify abre vizzu.pro/#connect-shopify?shop=xxx&sig=xxx&ts=xxx
 * 2. Este handler detecta o hash, extrai os params
 * 3. Se o user está logado, chama POST /api/connect-vizzu no gateway
 * 4. Mostra overlay com resultado
 * 5. Limpa o hash e navega para Settings → Integrações
 */
export const ShopifyConnectHandler: React.FC = () => {
  const { user } = useAuth();
  const { navigateTo, setSettingsTab, showToast } = useUI();
  const [status, setStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [shopName, setShopName] = useState('');
  const processedRef = useRef(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#connect-shopify') || processedRef.current) return;

    // Parse params do hash
    const queryString = hash.replace('#connect-shopify', '').replace('?', '');
    const params = new URLSearchParams(queryString);
    const shop = params.get('shop');
    const sig = params.get('sig');
    const ts = params.get('ts');

    if (!shop || !sig || !ts) return;

    // Validar formato do dominio Shopify
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop)) {
      console.warn('[ShopifyConnect] Dominio invalido:', shop);
      return;
    }

    processedRef.current = true;
    setShopName(shop.replace('.myshopify.com', ''));

    // Aguardar user estar logado
    if (!user?.id) {
      // Mantém o hash — quando o user logar, o handler vai rodar novamente
      return;
    }

    connectToShopify(shop, sig, ts);
  }, [user?.id]);

  const connectToShopify = async (shop: string, sig: string, ts: string) => {
    setStatus('connecting');

    try {
      // Buscar token Supabase do user atual
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setStatus('error');
        setErrorMessage('Sessão expirada. Faça login novamente.');
        return;
      }

      const response = await fetch(`${GATEWAY_URL}/api/connect-vizzu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop,
          signature: sig,
          timestamp: ts,
          supabase_access_token: session.access_token,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setStatus('error');
        setErrorMessage(result.error || 'Erro ao vincular conta');
        return;
      }

      setStatus('success');

      // Limpar hash da URL
      window.history.replaceState(null, '', window.location.pathname);

      // Navegar para Settings → Integrações após 2s
      setTimeout(() => {
        setStatus('idle');
        navigateTo('settings');
        setSettingsTab('integrations');
        showToast('Shopify conectado com sucesso!', 'success');
      }, 2000);
    } catch (err) {
      setStatus('error');
      setErrorMessage('Erro de conexão. Verifique sua internet e tente novamente.');
    }
  };

  if (status === 'idle') return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '400px',
          width: '90%',
          textAlign: 'center',
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        }}
      >
        {status === 'connecting' && (
          <>
            <div
              style={{
                width: '48px',
                height: '48px',
                border: '3px solid #e5e7eb',
                borderTopColor: '#FF6B6B',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px',
              }}
            />
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#111827' }}>
              Conectando Shopify
            </h3>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
              Vinculando <strong>{shopName}</strong> ao Vizzu...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div
              style={{
                width: '48px',
                height: '48px',
                background: '#ecfdf5',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '24px',
              }}
            >
              <i className="fas fa-check" style={{ color: '#22c55e' }} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#111827' }}>
              Conectado!
            </h3>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
              <strong>{shopName}</strong> foi vinculado ao Vizzu. Redirecionando...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div
              style={{
                width: '48px',
                height: '48px',
                background: '#fef2f2',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '24px',
              }}
            >
              <i className="fas fa-exclamation-triangle" style={{ color: '#ef4444' }} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#111827' }}>
              Erro na vinculação
            </h3>
            <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: '14px' }}>
              {errorMessage}
            </p>
            <button
              onClick={() => {
                setStatus('idle');
                processedRef.current = false;
                window.history.replaceState(null, '', window.location.pathname);
              }}
              style={{
                background: '#f3f4f6',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              Fechar
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
