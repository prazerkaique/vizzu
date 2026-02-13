import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useActionData, useNavigation, Form } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // Buscar contagem de produtos da loja
  const response = await admin.graphql(`
    {
      productsCount { count }
    }
  `);

  const { data } = await response.json();

  return {
    productCount: data.productsCount.count,
    shop: session.shop,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "import_all") {
    // Disparar Bulk Operation para buscar TODOS os produtos
    const bulkResponse = await admin.graphql(`
      mutation {
        bulkOperationRunQuery(query: """
          {
            products {
              edges {
                node {
                  id
                  title
                  handle
                  descriptionHtml
                  productType
                  vendor
                  tags
                  status
                  variants(first: 50) {
                    edges {
                      node {
                        id
                        title
                        price
                        compareAtPrice
                        sku
                        barcode
                      }
                    }
                  }
                  media(first: 20) {
                    edges {
                      node {
                        mediaContentType
                        ... on MediaImage {
                          id
                          image {
                            url
                            altText
                            width
                            height
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        """) {
          bulkOperation {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `);

    const { data } = await bulkResponse.json();

    if (data.bulkOperationRunQuery.userErrors.length > 0) {
      return {
        success: false,
        error: data.bulkOperationRunQuery.userErrors[0].message,
      };
    }

    return {
      success: true,
      message: `Importação iniciada! A Shopify está processando seus produtos. Você será notificado quando terminar.`,
      bulkOperationId: data.bulkOperationRunQuery.bulkOperation.id,
    };
  }

  return { success: false, error: "Ação desconhecida" };
};

export default function ImportPage() {
  const { productCount, shop } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div style={{ padding: "20px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Importar Produtos</h1>

      <div style={{
        background: "#f9fafb",
        borderRadius: "12px",
        padding: "20px",
        marginTop: "16px",
      }}>
        <p style={{ fontSize: "18px", margin: "0 0 8px 0" }}>
          <strong>{shop}</strong> tem <strong>{productCount}</strong> produtos
        </p>
        <p style={{ color: "#6b7280", margin: 0 }}>
          Escolha como deseja importar seus produtos para o Vizzu.
        </p>
      </div>

      {actionData?.success && (
        <div style={{
          marginTop: "16px",
          padding: "16px",
          background: "#ecfdf5",
          borderRadius: "12px",
          border: "1px solid #a7f3d0",
          color: "#065f46",
        }}>
          {actionData.message}
        </div>
      )}

      {actionData?.error && (
        <div style={{
          marginTop: "16px",
          padding: "16px",
          background: "#fef2f2",
          borderRadius: "12px",
          border: "1px solid #fecaca",
          color: "#991b1b",
        }}>
          Erro: {actionData.error}
        </div>
      )}

      <div style={{
        display: "flex",
        gap: "16px",
        marginTop: "20px",
        flexWrap: "wrap",
      }}>
        {/* Importar Tudo */}
        <Form method="post" style={{
          flex: 1,
          minWidth: "280px",
          background: "white",
          borderRadius: "12px",
          padding: "24px",
          border: "2px solid #e5e7eb",
        }}>
          <input type="hidden" name="action" value="import_all" />
          <h3 style={{ margin: "0 0 8px 0" }}>Importar Tudo</h3>
          <p style={{ color: "#6b7280", margin: "0 0 16px 0" }}>
            Importa todos os {productCount} produtos do seu catálogo Shopify para o Vizzu.
            Ideal para quem quer otimizar todo o catálogo.
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              background: isSubmitting
                ? "#d1d5db"
                : "linear-gradient(135deg, #FF6B6B, #FF9F43)",
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: "12px",
              fontWeight: 600,
              cursor: isSubmitting ? "not-allowed" : "pointer",
              fontSize: "14px",
            }}
          >
            {isSubmitting ? "Importando..." : `Importar ${productCount} produtos`}
          </button>
        </Form>

        {/* Selecionar Produtos */}
        <div style={{
          flex: 1,
          minWidth: "280px",
          background: "white",
          borderRadius: "12px",
          padding: "24px",
          border: "2px solid #e5e7eb",
        }}>
          <h3 style={{ margin: "0 0 8px 0" }}>Selecionar Produtos</h3>
          <p style={{ color: "#6b7280", margin: "0 0 16px 0" }}>
            Escolha quais produtos importar usando o seletor da Shopify.
            Ideal para importar apenas o que precisa.
          </p>
          <button
            disabled
            style={{
              background: "#e5e7eb",
              color: "#9ca3af",
              border: "none",
              padding: "12px 24px",
              borderRadius: "12px",
              fontWeight: 600,
              cursor: "not-allowed",
              fontSize: "14px",
            }}
          >
            Em breve (Resource Picker)
          </button>
        </div>
      </div>

      <div style={{
        marginTop: "24px",
        padding: "16px",
        background: "#eff6ff",
        borderRadius: "12px",
        border: "1px solid #bfdbfe",
      }}>
        <p style={{ margin: 0, fontSize: "14px", color: "#1e40af" }}>
          <strong>Como funciona:</strong> A importação baixa as imagens dos seus produtos
          e cria uma cópia no Vizzu. Seus produtos no Shopify não são alterados.
          Após gerar imagens otimizadas com IA, você pode enviá-las de volta ao Shopify.
        </p>
      </div>
    </div>
  );
}
