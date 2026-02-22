import { useEffect, useRef } from 'react';

const REFERRAL_LS_KEY = 'vizzu_referral_code';

/**
 * Componente invisível que captura o parâmetro ?ref= da URL.
 * Montado no App.tsx (igual ShopifyConnectHandler).
 *
 * Fluxo:
 * 1. Usuário acessa vizzu.pro/?ref=AB12CD34
 * 2. Handler detecta o param, valida formato (8 chars alfanuméricos)
 * 3. Salva em localStorage
 * 4. Limpa param da URL via history.replaceState
 */
export const ReferralCaptureHandler: React.FC = () => {
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');

    if (!refCode) return;

    // Validar formato: 8 caracteres alfanuméricos
    if (!/^[A-Za-z0-9]{8}$/.test(refCode)) return;

    processedRef.current = true;

    // Salvar no localStorage
    localStorage.setItem(REFERRAL_LS_KEY, refCode.toUpperCase());

    // Limpar param da URL sem reload
    params.delete('ref');
    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}${window.location.hash}`
      : `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState(null, '', newUrl);
  }, []);

  return null;
};
