import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // Buscar info básica da loja
  const response = await admin.graphql(`
    {
      shop {
        name
        myshopifyDomain
        plan { displayName }
        productCount: productsCount { count }
      }
    }
  `);

  const { data } = await response.json();

  return {
    shop: data.shop,
    session: {
      shop: session.shop,
      scope: session.scope,
    },
  };
};

export default function AppDashboard() {
  const { shop } = useLoaderData<typeof loader>();

  return (
    <div style={{ padding: "20px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Vizzu - Dashboard</h1>

      <div style={{
        background: "#f9fafb",
        borderRadius: "12px",
        padding: "20px",
        marginTop: "16px",
      }}>
        <h2 style={{ margin: "0 0 12px 0" }}>Loja conectada</h2>
        <p><strong>Nome:</strong> {shop.name}</p>
        <p><strong>Domínio:</strong> {shop.myshopifyDomain}</p>
        <p><strong>Plano:</strong> {shop.plan.displayName}</p>
        <p><strong>Produtos:</strong> {shop.productCount.count}</p>
      </div>

      <div style={{
        display: "flex",
        gap: "12px",
        marginTop: "20px",
      }}>
        <a
          href="/app/import"
          style={{
            display: "inline-block",
            background: "linear-gradient(135deg, #FF6B6B, #FF9F43)",
            color: "white",
            padding: "12px 24px",
            borderRadius: "12px",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Importar Produtos
        </a>

        <a
          href="/app/settings"
          style={{
            display: "inline-block",
            background: "#e5e7eb",
            color: "#374151",
            padding: "12px 24px",
            borderRadius: "12px",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Configurações
        </a>
      </div>

      <div style={{
        marginTop: "24px",
        padding: "16px",
        background: "#fff7ed",
        borderRadius: "12px",
        border: "1px solid #fed7aa",
      }}>
        <p style={{ margin: 0 }}>
          <strong>Próximo passo:</strong> Importe seus produtos para o Vizzu e gere
          imagens profissionais com IA. As imagens otimizadas podem ser enviadas
          de volta ao Shopify com um clique.
        </p>
      </div>
    </div>
  );
}
