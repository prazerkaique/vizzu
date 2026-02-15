import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { authenticate } from "../shopify.server";
import { supabaseQuery } from "../lib/supabase.server";

// ─── Types ───────────────────────────────────────────────

interface ConnectionData {
  id: string;
  user_id: string;
  status: string;
  store_name: string;
  last_sync_at: string | null;
}

// ─── Loader ──────────────────────────────────────────────

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  // Dados da loja via GraphQL
  const response = await admin.graphql(`
    {
      shop {
        name
        myshopifyDomain
        plan { displayName }
      }
    }
  `);
  const { data } = await response.json();

  // Conexão Vizzu — dados REAIS do Supabase
  let connection: ConnectionData | null = null;
  try {
    const results = await supabaseQuery<ConnectionData[]>(
      "ecommerce_connections",
      "GET",
      {
        filters: `platform=eq.shopify&store_domain=eq.${encodeURIComponent(shop)}&status=eq.active&select=id,user_id,status,store_name,last_sync_at`,
      }
    );
    if (results && results.length > 0) {
      connection = results[0];
    }
  } catch (e) {
    console.error("[dashboard] Error checking connection:", e);
  }

  // Stats reais — contagens
  let productsImported = 0;
  let imagesExported = 0;

  if (connection) {
    try {
      const maps = await supabaseQuery<{ id: string }[]>(
        "ecommerce_product_map",
        "GET",
        { filters: `connection_id=eq.${connection.id}&select=id` }
      );
      productsImported = maps?.length || 0;
    } catch (e) {
      console.error("[dashboard] Error counting products:", e);
    }

    try {
      const exports = await supabaseQuery<{ id: string }[]>(
        "ecommerce_image_exports",
        "GET",
        { filters: `connection_id=eq.${connection.id}&select=id` }
      );
      imagesExported = exports?.length || 0;
    } catch (e) {
      console.error("[dashboard] Error counting exports:", e);
    }
  }

  return {
    shop: data.shop,
    shopDomain: shop,
    isConnected: !!connection,
    connection,
    productsImported,
    imagesExported,
  };
};

// ─── Component ───────────────────────────────────────────

export default function AppDashboard() {
  const {
    shop,
    shopDomain,
    isConnected,
    connection,
    productsImported,
    imagesExported,
  } = useLoaderData<typeof loader>();

  return (
    <div className="vizzu-page vizzu-animate-fade">
      {/* Header */}
      <h1 className="vizzu-title">Seja bem-vindo!</h1>
      <p className="vizzu-subtitle">
        Transforme as fotos dos seus produtos em imagens profissionais com IA
      </p>

      {/* Connection Status */}
      <div className="vizzu-card vizzu-mb-24 vizzu-animate-slide">
        <div className="vizzu-connection">
          <div className="vizzu-icon-box vizzu-icon-box--gradient">
            <i className="fa-solid fa-store"></i>
          </div>
          <div className="vizzu-connection-info">
            <div className="vizzu-label">Loja Shopify</div>
            <strong>{shop.name}</strong>
            <div className="vizzu-domain">{shopDomain}</div>
          </div>
          {isConnected ? (
            <span className="vizzu-badge vizzu-badge--connected">
              <span className="vizzu-dot vizzu-dot--green"></span>
              Vinculado ao Vizzu
            </span>
          ) : (
            <Link to="/app/settings" className="vizzu-btn vizzu-btn--primary vizzu-btn--sm">
              <i className="fa-solid fa-link"></i>
              Vincular conta
            </Link>
          )}
        </div>
        {isConnected && connection?.last_sync_at && (
          <div className="vizzu-connection-meta">
            <i className="fa-regular fa-clock" style={{ marginRight: 6 }}></i>
            Última sincronização: {new Date(connection.last_sync_at).toLocaleString("pt-BR")}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="vizzu-stats vizzu-mb-32 vizzu-stagger">
        <div className="vizzu-stat">
          <div className="vizzu-stat-value">{productsImported}</div>
          <div className="vizzu-stat-label">
            <i className="fa-solid fa-box"></i>
            Produtos importados
          </div>
        </div>
        <div className="vizzu-stat">
          <div className="vizzu-stat-value">{imagesExported}</div>
          <div className="vizzu-stat-label">
            <i className="fa-solid fa-image"></i>
            Imagens exportadas
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <h2 className="vizzu-section-title">
        <i className="fa-solid fa-bolt"></i>
        Ações rápidas
      </h2>
      <div className="vizzu-actions vizzu-mb-24 vizzu-stagger">
        <Link to="/app/import" className="vizzu-action-card">
          <div className="vizzu-icon-box vizzu-icon-box--gradient">
            <i className="fa-solid fa-download"></i>
          </div>
          <strong>
            Importar Produtos
            <span className="vizzu-arrow"><i className="fa-solid fa-arrow-right"></i></span>
          </strong>
          <p>Traga seus produtos da Shopify para o Vizzu</p>
        </Link>

        <Link to="/app/history" className="vizzu-action-card">
          <div className="vizzu-icon-box vizzu-icon-box--gradient">
            <i className="fa-solid fa-clock-rotate-left"></i>
          </div>
          <strong>
            Histórico
            <span className="vizzu-arrow"><i className="fa-solid fa-arrow-right"></i></span>
          </strong>
          <p>Acompanhe importações e exports de imagens</p>
        </Link>

        <Link to="/app/settings" className="vizzu-action-card">
          <div className="vizzu-icon-box vizzu-icon-box--gradient">
            <i className="fa-solid fa-gear"></i>
          </div>
          <strong>
            Configurações
            <span className="vizzu-arrow"><i className="fa-solid fa-arrow-right"></i></span>
          </strong>
          <p>Gerencie a vinculação com o Vizzu</p>
        </Link>

        <a
          href="https://vizzu.pro"
          target="_blank"
          rel="noopener noreferrer"
          className="vizzu-action-card"
        >
          <div className="vizzu-icon-box vizzu-icon-box--gradient">
            <i className="fa-solid fa-arrow-up-right-from-square"></i>
          </div>
          <strong>
            Abrir Vizzu Studio
            <span className="vizzu-arrow"><i className="fa-solid fa-arrow-right"></i></span>
          </strong>
          <p>Gere imagens profissionais com IA</p>
        </a>
      </div>

      {/* Tip when not connected */}
      {!isConnected && (
        <div className="vizzu-alert vizzu-alert--warning vizzu-animate-slide">
          <i className="fa-solid fa-circle-info"></i>
          <div>
            <strong>Próximo passo:</strong> Vincule sua conta Vizzu nas{" "}
            <Link to="/app/settings" className="vizzu-settings-link">
              Configurações
            </Link>{" "}
            para começar a importar produtos e gerar imagens com IA.
          </div>
        </div>
      )}

      {/* Info when connected */}
      {isConnected && (
        <div className="vizzu-alert vizzu-alert--info vizzu-animate-slide">
          <i className="fa-solid fa-lightbulb"></i>
          <div>
            <strong>Dica:</strong> Importe seus produtos, gere imagens
            otimizadas no{" "}
            <a
              href="https://vizzu.pro"
              target="_blank"
              rel="noopener noreferrer"
              className="vizzu-settings-link"
            >
              Vizzu Studio
            </a>{" "}
            e envie de volta ao Shopify com um clique.
          </div>
        </div>
      )}
    </div>
  );
}
