import { useState, useEffect, useCallback } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useActionData, useFetcher, Link } from "react-router";
import { createHmac } from "../lib/crypto.server";
import { supabaseQuery } from "../lib/supabase.server";

interface ConnectionStatus {
  id: string;
  user_id: string;
  status: string;
  store_name: string;
  last_sync_at: string | null;
  metadata: Record<string, unknown> | null;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // NÃO chamar authenticate.admin() aqui — o parent app.tsx já faz isso.
  // Em React Router v7, loaders pai/filho rodam em paralelo. Chamar
  // authenticate.admin() em ambos causa race condition com o id_token.
  // O shop vem pela URL (Shopify sempre inclui nos params do embedded app).
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "";

  if (!shop) {
    console.error("[settings] No shop in URL params");
    return {
      shop: "",
      vizzuUrl: "",
      isConnected: false,
      connection: null,
      autoSync: false,
    };
  }

  // Gerar HMAC para o linking flow
  const timestamp = Date.now().toString();
  const signature = createHmac(`${shop}:${timestamp}`);

  // Verificar se já existe conexão ativa
  let connection: ConnectionStatus | null = null;
  try {
    const results = await supabaseQuery<ConnectionStatus[]>(
      "ecommerce_connections",
      "GET",
      {
        filters: `platform=eq.shopify&store_domain=eq.${encodeURIComponent(shop)}&status=eq.active&select=id,user_id,status,store_name,last_sync_at,metadata`,
      }
    );
    if (results && results.length > 0) {
      connection = results[0];
    }
  } catch (e) {
    console.error("[settings] Error checking connection:", e);
  }

  // URL do Vizzu com params de conexão
  const vizzuUrl = `https://vizzu.pro/#connect-shopify?shop=${encodeURIComponent(shop)}&sig=${signature}&ts=${timestamp}`;

  // Auto-sync vem do metadata da conexão
  const autoSync = !!(connection?.metadata as any)?.auto_sync;

  return {
    shop,
    vizzuUrl,
    isConnected: !!connection,
    connection,
    autoSync,
  };
};

// ─── Action ──────────────────────────────────────────────

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const actionType = formData.get("action");

  if (actionType === "toggle_auto_sync") {
    const connectionId = formData.get("connectionId") as string;
    const enabled = formData.get("enabled") === "true";

    if (!connectionId) {
      return { success: false, error: "Conexão não encontrada." };
    }

    try {
      // Buscar metadata atual para fazer merge
      const connections = await supabaseQuery<{ metadata: Record<string, unknown> | null }[]>(
        "ecommerce_connections",
        "GET",
        { filters: `id=eq.${connectionId}&select=metadata` }
      );

      const currentMetadata = connections?.[0]?.metadata || {};

      await supabaseQuery(
        "ecommerce_connections",
        "PATCH",
        {
          filters: `id=eq.${connectionId}`,
          body: {
            metadata: { ...currentMetadata, auto_sync: enabled },
          },
        }
      );

      return { success: true, autoSync: enabled };
    } catch (e) {
      console.error("[settings] Error toggling auto_sync:", e);
      return { success: false, error: "Erro ao salvar configuração." };
    }
  }

  return { success: false, error: "Ação desconhecida." };
};

// ─── Component ───────────────────────────────────────────

export default function SettingsPage() {
  const { shop, vizzuUrl, isConnected: initialConnected, connection, autoSync: initialAutoSync } =
    useLoaderData<typeof loader>();
  const [isConnected, setIsConnected] = useState(initialConnected);
  const [isPolling, setIsPolling] = useState(false);
  const fetcher = useFetcher();

  // Derive auto_sync state from fetcher or initial
  const autoSync = fetcher.data?.success
    ? fetcher.data.autoSync
    : initialAutoSync;
  const isSaving = fetcher.state === "submitting";

  // Polling para detectar quando a vinculação é completada
  const checkConnection = useCallback(async () => {
    try {
      const response = await fetch(`/api/health`);
      if (!response.ok) return;
      window.location.reload();
    } catch {}
  }, []);

  useEffect(() => {
    if (isPolling && !isConnected) {
      const interval = setInterval(checkConnection, 5000);
      return () => clearInterval(interval);
    }
  }, [isPolling, isConnected, checkConnection]);

  const handleOpenVizzu = () => {
    setIsPolling(true);
    window.open(vizzuUrl, "_blank");
  };

  const handleToggleAutoSync = () => {
    if (!connection?.id) return;
    fetcher.submit(
      {
        action: "toggle_auto_sync",
        connectionId: connection.id,
        enabled: String(!autoSync),
      },
      { method: "post" }
    );
  };

  return (
    <div className="vizzu-page vizzu-animate-fade">
      <h1 className="vizzu-title">Configurações</h1>
      <p className="vizzu-subtitle">
        Gerencie a vinculação entre sua loja Shopify e o Vizzu
      </p>

      {/* Conexão Shopify */}
      <div className="vizzu-settings-section vizzu-mb-24 vizzu-animate-slide">
        <h2>
          <i className="fa-brands fa-shopify"></i>
          Conexão Shopify
        </h2>
        <div className="vizzu-settings-row">
          <strong>Loja:</strong>
          <span>{shop}</span>
        </div>
        <div className="vizzu-settings-row">
          <strong>Status:</strong>
          <span className="vizzu-badge vizzu-badge--connected">
            <span className="vizzu-dot vizzu-dot--green"></span>
            App instalado
          </span>
        </div>
      </div>

      {/* Conta Vizzu */}
      <div className="vizzu-settings-section vizzu-mb-24 vizzu-animate-slide">
        <h2>
          <i className="fa-solid fa-link"></i>
          Conta Vizzu
        </h2>

        {isConnected ? (
          <>
            <div className="vizzu-settings-row vizzu-mb-12">
              <span className="vizzu-badge vizzu-badge--connected">
                <span className="vizzu-dot vizzu-dot--green"></span>
                Vinculado ao Vizzu
              </span>
            </div>
            {connection?.last_sync_at && (
              <p className="vizzu-settings-description vizzu-mb-12">
                <i className="fa-regular fa-clock" style={{ marginRight: 6 }}></i>
                Última sincronização:{" "}
                {new Date(connection.last_sync_at).toLocaleString("pt-BR")}
              </p>
            )}
            <p className="vizzu-settings-description">
              Sua loja está conectada ao Vizzu. Importe produtos na aba{" "}
              <Link to="/app/import" className="vizzu-settings-link">
                Importar Produtos
              </Link>
              .
            </p>
          </>
        ) : (
          <>
            <p className="vizzu-settings-description vizzu-mb-16">
              Vincule sua conta Vizzu para importar produtos e gerar imagens
              profissionais com IA.
            </p>

            {isPolling && (
              <div className="vizzu-polling vizzu-mb-16">
                <span className="vizzu-spinner vizzu-spinner--dark"></span>
                Aguardando vinculação... Conclua o processo na aba do Vizzu que
                foi aberta.
              </div>
            )}

            <button
              onClick={handleOpenVizzu}
              className="vizzu-btn vizzu-btn--primary"
            >
              <i className="fa-solid fa-arrow-up-right-from-square"></i>
              {isPolling ? "Abrir Vizzu novamente" : "Vincular conta Vizzu"}
            </button>
          </>
        )}
      </div>

      {/* Sincronização */}
      <div className="vizzu-settings-section vizzu-animate-slide">
        <h2>
          <i className="fa-solid fa-arrows-rotate"></i>
          Sincronização Automática
        </h2>
        <p className="vizzu-settings-description vizzu-mb-16">
          Quando ativada, os produtos criados, editados ou excluídos no Shopify
          serão sincronizados automaticamente com o Vizzu.
        </p>

        {isConnected ? (
          <>
            <label className="vizzu-checkbox-label" style={{ cursor: isSaving ? "wait" : "pointer" }}>
              <input
                type="checkbox"
                checked={autoSync}
                onChange={handleToggleAutoSync}
                disabled={isSaving}
              />
              <span style={{ color: "var(--vizzu-text)" }}>
                {autoSync ? "Sincronização ativada" : "Sincronização desativada"}
              </span>
              {isSaving && <span className="vizzu-spinner vizzu-spinner--dark"></span>}
            </label>

            {autoSync && (
              <div className="vizzu-alert vizzu-alert--success vizzu-mt-16">
                <i className="fa-solid fa-circle-check"></i>
                <div>
                  Produtos novos e atualizações no Shopify serão refletidos
                  automaticamente no Vizzu.
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="vizzu-alert vizzu-alert--warning">
            <i className="fa-solid fa-circle-info"></i>
            <div>
              Vincule sua conta Vizzu para habilitar a sincronização automática.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
