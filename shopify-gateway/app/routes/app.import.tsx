import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  useLoaderData,
  useActionData,
  useNavigation,
  useSubmit,
  Form,
  Link,
} from "react-router";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import { supabaseQuery } from "../lib/supabase.server";

interface ConnectionCheck {
  id: string;
  user_id: string;
  status: string;
}

// ─── Loader ──────────────────────────────────────────────

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  // Verificar se a conta Vizzu está vinculada
  let isLinked = false;
  try {
    const connections = await supabaseQuery<ConnectionCheck[]>(
      "ecommerce_connections",
      "GET",
      {
        filters: `platform=eq.shopify&store_domain=eq.${encodeURIComponent(shop)}&status=eq.active&select=id,user_id,status`,
      }
    );
    isLinked = !!(connections && connections.length > 0);
  } catch (e) {
    console.error("[import] Error checking connection:", e);
  }

  // Buscar contagem de produtos da loja
  const response = await admin.graphql(`
    {
      productsCount { count }
    }
  `);

  const { data } = await response.json();

  return {
    productCount: data.productsCount.count,
    shop,
    isLinked,
  };
};

// ─── Helpers ─────────────────────────────────────────────

/** Verifica vinculação e retorna conexão ou erro */
async function getActiveConnection(shop: string) {
  const connections = await supabaseQuery<ConnectionCheck[]>(
    "ecommerce_connections",
    "GET",
    {
      filters: `platform=eq.shopify&store_domain=eq.${encodeURIComponent(shop)}&status=eq.active&select=id,user_id`,
    }
  );

  if (!connections || connections.length === 0) {
    return null;
  }
  return connections[0];
}

/** Normaliza produto do GraphQL edges para formato do N8N */
function normalizeProduct(p: any) {
  return {
    shopify_id: p.id,
    title: p.title,
    handle: p.handle,
    description_html: p.descriptionHtml || "",
    product_type: p.productType || "",
    vendor: p.vendor || "",
    tags: p.tags || [],
    status: p.status,
    variants: (p.variants?.edges || []).map(({ node: v }: any) => ({
      id: v.id,
      title: v.title,
      sku: v.sku || "",
      price: v.price,
      compare_at_price: v.compareAtPrice,
      barcode: v.barcode || "",
    })),
    media: (p.media?.edges || [])
      .filter(({ node: m }: any) => m.image?.url)
      .map(({ node: m }: any, idx: number) => ({
        id: m.id,
        url: m.image.url,
        alt_text: m.image.altText || "",
        width: m.image.width,
        height: m.image.height,
        position: idx,
      })),
  };
}

// GraphQL fragment para buscar dados completos de um produto
const PRODUCT_FIELDS = `
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
`;

// ─── Action ──────────────────────────────────────────────

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("action");

  // Verificar vinculação (comum a ambas ações)
  const connection = await getActiveConnection(session.shop);
  if (!connection) {
    return {
      success: false,
      error: "Vincule sua conta Vizzu primeiro na página de Configurações.",
    };
  }

  const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "";

  // ── Importar Tudo (Bulk Operation — assíncrono) ──────
  if (actionType === "import_all") {
    const bulkResponse = await admin.graphql(`
      mutation {
        bulkOperationRunQuery(query: """
          {
            products {
              edges {
                node {
                  ${PRODUCT_FIELDS}
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
      message:
        "Importação iniciada! A Shopify está processando seus produtos. Quando terminar, eles aparecerão no Vizzu automaticamente.",
    };
  }

  // ── Selecionar Produtos (GraphQL direto — síncrono) ──
  if (actionType === "import_selected") {
    const selectedIdsJson = formData.get("selectedIds") as string;

    let selectedIds: string[];
    try {
      selectedIds = JSON.parse(selectedIdsJson);
    } catch {
      return { success: false, error: "IDs de produtos inválidos." };
    }

    if (!selectedIds || selectedIds.length === 0) {
      return { success: false, error: "Nenhum produto selecionado." };
    }

    // Buscar detalhes completos via nodes query (max 250 por query)
    const allProducts: any[] = [];

    for (let i = 0; i < selectedIds.length; i += 250) {
      const chunk = selectedIds.slice(i, i + 250);

      const response = await admin.graphql(
        `query getProducts($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Product {
              ${PRODUCT_FIELDS}
            }
          }
        }`,
        { variables: { ids: chunk } }
      );

      const { data } = await response.json();

      if (data?.nodes) {
        allProducts.push(
          ...data.nodes.filter((node: any) => node !== null && node.id)
        );
      }
    }

    if (allProducts.length === 0) {
      return { success: false, error: "Nenhum produto encontrado na Shopify." };
    }

    // Normalizar para mesmo formato do bulk import
    const normalizedProducts = allProducts.map(normalizeProduct);

    // Enviar ao N8N (mesmo endpoint do bulk import)
    try {
      const n8nResponse = await fetch(
        `${N8N_WEBHOOK_URL}/vizzu/shopify/import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shop: session.shop,
            user_id: connection.user_id,
            connection_id: connection.id,
            import_type: "selected",
            products: normalizedProducts,
          }),
        }
      );

      if (!n8nResponse.ok) {
        const errText = await n8nResponse.text();
        console.error("[import_selected] N8N error:", n8nResponse.status, errText);
        return {
          success: false,
          error: `Erro ao processar importação (${n8nResponse.status}).`,
        };
      }

      const result = await n8nResponse.json();

      const imported = result.products_imported || 0;
      const skipped = result.products_skipped || 0;
      const parts: string[] = [];

      if (imported > 0) {
        parts.push(
          `${imported} produto${imported !== 1 ? "s" : ""} importado${imported !== 1 ? "s" : ""}`
        );
      }
      if (skipped > 0) {
        parts.push(
          `${skipped} já existia${skipped !== 1 ? "m" : ""} no Vizzu`
        );
      }

      return {
        success: true,
        message: parts.length > 0
          ? `Importação concluída! ${parts.join(", ")}.`
          : "Nenhum produto novo para importar.",
      };
    } catch (err: any) {
      console.error("[import_selected] Fetch error:", err);
      return {
        success: false,
        error: `Erro de conexão com o servidor de importação.`,
      };
    }
  }

  return { success: false, error: "Ação desconhecida" };
};

// ─── Component ───────────────────────────────────────────

export default function ImportPage() {
  const { productCount, shop, isLinked } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const isSubmitting = navigation.state === "submitting";
  const [selectCount, setSelectCount] = useState(0);

  const handleSelectProducts = async () => {
    try {
      const shopify = (window as any).shopify;
      if (!shopify?.resourcePicker) {
        console.error("Resource Picker não disponível");
        return;
      }

      const selected = await shopify.resourcePicker({
        type: "product",
        multiple: true,
      });

      if (selected && selected.length > 0) {
        setSelectCount(selected.length);
        const ids = selected.map((p: any) => p.id);
        const formData = new FormData();
        formData.append("action", "import_selected");
        formData.append("selectedIds", JSON.stringify(ids));
        submit(formData, { method: "post" });
      }
    } catch (err) {
      console.error("Resource Picker error:", err);
    }
  };

  const disabled = isSubmitting || !isLinked;

  return (
    <div className="vizzu-page vizzu-animate-fade">
      {/* Header */}
      <h1 className="vizzu-title">Importar Produtos</h1>
      <p className="vizzu-subtitle">
        Escolha como deseja importar seus produtos para o Vizzu
      </p>

      {/* Shop info */}
      <div className="vizzu-shop-banner vizzu-mb-24 vizzu-animate-slide">
        <div className="vizzu-icon-box vizzu-icon-box--gradient">
          <i className="fa-solid fa-store"></i>
        </div>
        <div className="vizzu-shop-banner-info">
          <div className="vizzu-shop-name">{shop}</div>
          <div className="vizzu-shop-count">
            <i className="fa-solid fa-box" style={{ marginRight: 6, fontSize: 13 }}></i>
            {productCount} produto{productCount !== 1 ? "s" : ""} no catálogo
          </div>
        </div>
      </div>

      {/* Alert: not linked */}
      {!isLinked && (
        <div className="vizzu-alert vizzu-alert--warning vizzu-mb-24">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <div>
            <strong>Atenção:</strong> Vincule sua conta Vizzu antes de importar.{" "}
            <Link to="/app/settings" className="vizzu-settings-link">
              Ir para Configurações
            </Link>
          </div>
        </div>
      )}

      {/* Success message */}
      {!isSubmitting && actionData?.success && (
        <div className="vizzu-alert vizzu-alert--success vizzu-mb-24 vizzu-animate-slide">
          <i className="fa-solid fa-circle-check"></i>
          <div>{actionData.message}</div>
        </div>
      )}

      {/* Error message */}
      {!isSubmitting && actionData && !actionData.success && actionData.error && (
        <div className="vizzu-alert vizzu-alert--error vizzu-mb-24 vizzu-animate-slide">
          <i className="fa-solid fa-circle-xmark"></i>
          <div>Erro: {actionData.error}</div>
        </div>
      )}

      {/* Import cards */}
      <div className="vizzu-import-grid vizzu-mb-24 vizzu-stagger">
        {/* Card: Importar Tudo */}
        <Form method="post" className="vizzu-import-card">
          <input type="hidden" name="action" value="import_all" />
          <h3>
            <i className="fa-solid fa-layer-group"></i>
            Importar Tudo
          </h3>
          <p>
            Importa todos os {productCount} produtos do seu catálogo Shopify
            para o Vizzu. Processo em segundo plano — pode levar alguns minutos
            para catálogos grandes.
          </p>
          <button
            type="submit"
            disabled={disabled}
            className={`vizzu-btn vizzu-btn--full ${disabled ? "" : "vizzu-btn--primary"}`}
          >
            {isSubmitting ? (
              <>
                <span className="vizzu-spinner"></span>
                Processando...
              </>
            ) : (
              <>
                <i className="fa-solid fa-download"></i>
                Importar {productCount} produtos
              </>
            )}
          </button>
        </Form>

        {/* Card: Selecionar Produtos */}
        <div className="vizzu-import-card">
          <h3>
            <i className="fa-solid fa-hand-pointer"></i>
            Selecionar Produtos
          </h3>
          <p>
            Escolha quais produtos importar usando o seletor da Shopify. Ideal
            para importar apenas o que precisa — resultado na hora.
          </p>
          <button
            type="button"
            onClick={handleSelectProducts}
            disabled={disabled}
            className={`vizzu-btn vizzu-btn--full ${disabled ? "" : "vizzu-btn--primary"}`}
          >
            {isSubmitting && selectCount > 0 ? (
              <>
                <span className="vizzu-spinner"></span>
                Importando {selectCount} produto{selectCount !== 1 ? "s" : ""}...
              </>
            ) : (
              <>
                <i className="fa-solid fa-list-check"></i>
                Selecionar Produtos
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info box */}
      <div className="vizzu-alert vizzu-alert--info">
        <i className="fa-solid fa-circle-info"></i>
        <div>
          <strong>Como funciona:</strong> A importação copia os dados dos seus
          produtos para o Vizzu. Seus produtos no Shopify não são alterados.
          Após gerar imagens otimizadas com IA, você pode enviá-las de volta ao
          Shopify.
        </div>
      </div>
    </div>
  );
}
