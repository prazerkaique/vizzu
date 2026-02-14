// ═══════════════════════════════════════════════════════════════
// VIZZU - Ecommerce Export Button
// Botão genérico de exportação para e-commerce (Shopify/Magento/VTEX)
// Só renderiza se o user tem uma conexão e-commerce ativa.
// Inclui o modal internamente — basta adicionar este componente.
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { useShopifyConnection } from '../../hooks/useShopifyConnection';
import { EcommerceExportModal, type ExportableImage } from './EcommerceExportModal';

// ─── Platform Config ────────────────────────────────────

const PLATFORM_CONFIG: Record<string, { icon: string; color: string; name: string }> = {
  shopify:  { icon: 'fab fa-shopify',  color: '#96BF48', name: 'Shopify' },
  magento:  { icon: 'fab fa-magento',  color: '#F46F25', name: 'Magento' },
  vtex:     { icon: 'fas fa-store',    color: '#F71963', name: 'VTEX' },
};

// ─── Props ──────────────────────────────────────────────

interface EcommerceExportButtonProps {
  /** Imagens disponíveis para exportar */
  images: ExportableImage[];
  /** ID do produto no Vizzu */
  productId: string;
  /** Feature que gerou as imagens */
  tool: string;
  /** Classes CSS adicionais para o botão */
  className?: string;
  /** Modo compacto (só ícone, sem texto) */
  compact?: boolean;
}

// ─── Component ──────────────────────────────────────────

export function EcommerceExportButton({
  images,
  productId,
  tool,
  className,
  compact = false,
}: EcommerceExportButtonProps) {
  const { user } = useAuth();
  const { theme } = useUI();
  const { isConnected, connection } = useShopifyConnection();
  const [showModal, setShowModal] = useState(false);

  // Não renderiza se não tem conexão ativa ou não tem imagens
  if (!isConnected || !connection || !user || images.length === 0) return null;

  const plat = PLATFORM_CONFIG[connection.platform] || PLATFORM_CONFIG.shopify;

  const defaultClassName = compact
    ? 'flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:opacity-80'
    : 'flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-xs text-white transition-all hover:opacity-90';

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={className || defaultClassName}
        style={
          className
            ? undefined
            : { background: plat.color }
        }
        title={`Exportar para ${plat.name}`}
      >
        <i className={`${plat.icon} ${compact ? 'text-sm' : 'text-xs'}`}
           style={className ? { color: plat.color } : undefined}
        />
        {!compact && <span>Exportar</span>}
      </button>

      <EcommerceExportModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        images={images}
        productId={productId}
        userId={user.id}
        tool={tool}
        platform={connection.platform}
        theme={theme}
      />
    </>
  );
}
