import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  return {
    shop: session.shop,
    scope: session.scope,
  };
};

export default function SettingsPage() {
  const { shop, scope } = useLoaderData<typeof loader>();

  return (
    <div style={{ padding: "20px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Configurações</h1>

      <div style={{
        background: "#f9fafb",
        borderRadius: "12px",
        padding: "20px",
        marginTop: "16px",
      }}>
        <h2 style={{ margin: "0 0 16px 0" }}>Conexão Shopify</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <p><strong>Loja:</strong> {shop}</p>
          <p><strong>Escopos:</strong> {scope}</p>
          <p>
            <strong>Status:</strong>{" "}
            <span style={{
              background: "#ecfdf5",
              color: "#065f46",
              padding: "2px 8px",
              borderRadius: "9999px",
              fontSize: "13px",
              fontWeight: 600,
            }}>
              Conectado
            </span>
          </p>
        </div>
      </div>

      <div style={{
        background: "#f9fafb",
        borderRadius: "12px",
        padding: "20px",
        marginTop: "16px",
      }}>
        <h2 style={{ margin: "0 0 16px 0" }}>Sincronização</h2>
        <p style={{ color: "#6b7280" }}>
          Configure se os produtos devem ser sincronizados automaticamente
          quando você criar, editar ou excluir produtos no Shopify.
        </p>
        <label style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          cursor: "pointer",
          marginTop: "12px",
        }}>
          <input type="checkbox" disabled />
          <span>Sincronização automática (em breve)</span>
        </label>
      </div>

      <div style={{
        background: "#f9fafb",
        borderRadius: "12px",
        padding: "20px",
        marginTop: "16px",
      }}>
        <h2 style={{ margin: "0 0 16px 0" }}>Conta Vizzu</h2>
        <p style={{ color: "#6b7280" }}>
          Vincule sua conta Vizzu para acessar as ferramentas de geração de imagem por IA.
        </p>
        <button
          disabled
          style={{
            background: "linear-gradient(135deg, #FF6B6B, #FF9F43)",
            color: "white",
            border: "none",
            padding: "12px 24px",
            borderRadius: "12px",
            fontWeight: 600,
            cursor: "not-allowed",
            opacity: 0.6,
            fontSize: "14px",
          }}
        >
          Vincular conta Vizzu (em breve)
        </button>
      </div>
    </div>
  );
}
