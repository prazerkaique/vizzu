import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { authenticate } from "../shopify.server";
import { supabaseQuery } from "../lib/supabase.server";

// ─── Types ───────────────────────────────────────────────

interface ConnectionCheck {
  id: string;
  user_id: string;
}

interface ImageExport {
  id: string;
  vizzu_image_url: string;
  vizzu_tool: string;
  export_type: string;
  status: string;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

interface SyncLogEntry {
  id: string;
  event_type: string;
  products_affected: number;
  status: string;
  details: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
}

// ─── Loader ──────────────────────────────────────────────

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Usar authenticate.admin() para obter o shop de forma confiável
  // (url.searchParams.get("shop") não funciona com navegação via <Link>)
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  if (!shop) {
    return { exports: [], syncLogs: [], isConnected: false };
  }

  // Buscar conexão ativa
  let connectionId: string | null = null;
  try {
    const connections = await supabaseQuery<ConnectionCheck[]>(
      "ecommerce_connections",
      "GET",
      {
        filters: `platform=eq.shopify&store_domain=eq.${encodeURIComponent(shop)}&status=eq.active&select=id,user_id`,
      }
    );
    if (connections && connections.length > 0) {
      connectionId = connections[0].id;
    }
  } catch (e) {
    console.error("[history] Error checking connection:", e);
  }

  if (!connectionId) {
    return { exports: [], syncLogs: [], isConnected: false };
  }

  // Últimos 50 exports de imagens
  let exports: ImageExport[] = [];
  try {
    const result = await supabaseQuery<ImageExport[]>(
      "ecommerce_image_exports",
      "GET",
      {
        filters: `connection_id=eq.${connectionId}&select=id,vizzu_image_url,vizzu_tool,export_type,status,error_message,created_at,completed_at&order=created_at.desc&limit=50`,
      }
    );
    exports = result || [];
  } catch (e) {
    console.error("[history] Error fetching exports:", e);
  }

  // Últimos 20 sync logs
  let syncLogs: SyncLogEntry[] = [];
  try {
    const result = await supabaseQuery<SyncLogEntry[]>(
      "ecommerce_sync_log",
      "GET",
      {
        filters: `connection_id=eq.${connectionId}&select=id,event_type,products_affected,status,details,created_at,completed_at&order=created_at.desc&limit=20`,
      }
    );
    syncLogs = result || [];
  } catch (e) {
    console.error("[history] Error fetching sync logs:", e);
  }

  return { exports, syncLogs, isConnected: true };
};

// ─── Helpers ─────────────────────────────────────────────

function toolLabel(tool: string): string {
  const map: Record<string, string> = {
    ps: "Product Studio",
    creative_still: "Creative Still",
    cs: "Creative Still",
    provador: "Provador",
    lc: "Look Composer",
    model: "Modelo IA",
    edit: "Edição",
  };
  return map[tool] || tool || "—";
}

function exportTypeLabel(type: string): string {
  const map: Record<string, string> = {
    add: "Adicionar",
    replace: "Substituir",
    set_primary: "Principal",
  };
  return map[type] || type || "—";
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    done: "Concluído",
    completed: "Concluído",
    uploading: "Enviando...",
    failed: "Erro",
    partial: "Parcial",
  };
  return map[status] || status;
}

function statusBadgeClass(status: string): string {
  if (status === "done" || status === "completed") return "vizzu-badge--connected";
  if (status === "failed") return "vizzu-badge--error";
  return "vizzu-badge--disconnected";
}

function statusDotClass(status: string): string {
  if (status === "done" || status === "completed") return "vizzu-dot--green";
  if (status === "failed") return "vizzu-dot--red";
  return "vizzu-dot--orange";
}

function eventTypeLabel(type: string): string {
  const map: Record<string, string> = {
    import_all: "Importação completa",
    import_selected: "Importação seletiva",
    export_image: "Exportação de imagem",
    bulk_import: "Importação em massa",
    product_create: "Produto criado (auto-sync)",
    product_update: "Produto atualizado (auto-sync)",
    product_delete: "Produto removido (auto-sync)",
  };
  return map[type] || type;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Component ───────────────────────────────────────────

export default function HistoryPage() {
  const { exports, syncLogs, isConnected } = useLoaderData<typeof loader>();

  return (
    <div className="vizzu-page vizzu-animate-fade">
      <h1 className="vizzu-title">Histórico</h1>
      <p className="vizzu-subtitle">
        Acompanhe suas importações e exportações de imagens
      </p>

      {/* Not connected */}
      {!isConnected && (
        <div className="vizzu-alert vizzu-alert--warning vizzu-mb-24">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <div>
            Vincule sua conta Vizzu nas{" "}
            <Link to="/app/settings" className="vizzu-settings-link">
              Configurações
            </Link>{" "}
            para ver o histórico.
          </div>
        </div>
      )}

      {/* Image Exports */}
      {isConnected && (
        <div className="vizzu-card vizzu-mb-24 vizzu-animate-slide">
          <h2 className="vizzu-section-title">
            <i className="fa-solid fa-image"></i>
            Imagens Exportadas
          </h2>

          {exports.length === 0 ? (
            <div className="vizzu-empty">
              <i className="fa-regular fa-images"></i>
              <p>Nenhuma imagem exportada ainda</p>
              <p>
                Gere imagens no Vizzu Studio e exporte para sua loja Shopify
              </p>
            </div>
          ) : (
            <div className="vizzu-table-wrap">
              <table className="vizzu-table">
                <thead>
                  <tr>
                    <th>Imagem</th>
                    <th>Ferramenta</th>
                    <th>Tipo</th>
                    <th>Status</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {exports.map((exp) => (
                    <tr key={exp.id}>
                      <td>
                        {exp.vizzu_image_url ? (
                          <img
                            src={exp.vizzu_image_url}
                            alt=""
                            className="vizzu-table-thumb"
                            loading="lazy"
                          />
                        ) : (
                          <div className="vizzu-table-thumb-placeholder">
                            <i className="fa-solid fa-image"></i>
                          </div>
                        )}
                      </td>
                      <td>{toolLabel(exp.vizzu_tool)}</td>
                      <td>{exportTypeLabel(exp.export_type)}</td>
                      <td>
                        <span className={`vizzu-badge ${statusBadgeClass(exp.status)}`}>
                          <span className={`vizzu-dot ${statusDotClass(exp.status)}`}></span>
                          {statusLabel(exp.status)}
                        </span>
                      </td>
                      <td className="vizzu-table-date">
                        {formatDate(exp.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sync Log */}
      {isConnected && syncLogs.length > 0 && (
        <div className="vizzu-card vizzu-animate-slide">
          <h2 className="vizzu-section-title">
            <i className="fa-solid fa-list-check"></i>
            Log de Sincronização
          </h2>
          <div className="vizzu-table-wrap">
            <table className="vizzu-table">
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Produtos</th>
                  <th>Status</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {syncLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{eventTypeLabel(log.event_type)}</td>
                    <td>{log.products_affected}</td>
                    <td>
                      <span className={`vizzu-badge ${statusBadgeClass(log.status)}`}>
                        <span className={`vizzu-dot ${statusDotClass(log.status)}`}></span>
                        {statusLabel(log.status)}
                      </span>
                    </td>
                    <td className="vizzu-table-date">
                      {formatDate(log.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sync log empty state */}
      {isConnected && syncLogs.length === 0 && exports.length > 0 && (
        <div className="vizzu-card vizzu-animate-slide">
          <h2 className="vizzu-section-title">
            <i className="fa-solid fa-list-check"></i>
            Log de Sincronização
          </h2>
          <div className="vizzu-empty">
            <i className="fa-regular fa-rectangle-list"></i>
            <p>Nenhum evento de sincronização registrado</p>
          </div>
        </div>
      )}
    </div>
  );
}
