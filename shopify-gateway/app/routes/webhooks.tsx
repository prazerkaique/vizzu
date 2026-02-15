import type { ActionFunctionArgs } from "react-router";
import { authenticate, unauthenticated } from "../shopify.server";
import { supabaseQuery } from "../lib/supabase.server";
import { handleBulkOperationFinish } from "../lib/import.server";

// ─── GraphQL fragment (mesmo do app.import.tsx) ─────────
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
import db from "../db.server";

// ─── Types ───────────────────────────────────────────────

interface ConnectionForSync {
  id: string;
  user_id: string;
  metadata: { auto_sync?: boolean } | null;
}

interface ProductMapEntry {
  id: string;
  vizzu_product_id: string;
}

// ─── Helper: verifica se auto_sync está ativo ────────────

async function getAutoSyncConnection(shop: string): Promise<ConnectionForSync | null> {
  try {
    const connections = await supabaseQuery<ConnectionForSync[]>(
      "ecommerce_connections",
      "GET",
      {
        filters: `platform=eq.shopify&store_domain=eq.${encodeURIComponent(shop)}&status=eq.active&select=id,user_id,metadata`,
      }
    );

    if (!connections || connections.length === 0) return null;

    const conn = connections[0];
    if (!conn.metadata?.auto_sync) return null;

    return conn;
  } catch (e) {
    console.error("[webhook] Error checking auto_sync:", e);
    return null;
  }
}

// ─── Helper: normaliza payload REST do webhook p/ formato do import ──

function normalizeWebhookProduct(payload: any) {
  const shopifyGid = `gid://shopify/Product/${payload.id}`;
  const tags = typeof payload.tags === "string"
    ? payload.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
    : payload.tags || [];

  return {
    shopify_id: shopifyGid,
    title: payload.title || "",
    handle: payload.handle || "",
    description_html: payload.body_html || "",
    product_type: payload.product_type || "",
    vendor: payload.vendor || "",
    tags,
    status: (payload.status || "active").toUpperCase(),
    variants: (payload.variants || []).map((v: any) => ({
      id: `gid://shopify/ProductVariant/${v.id}`,
      title: v.title || "",
      sku: v.sku || "",
      price: v.price,
      compare_at_price: v.compare_at_price,
      barcode: v.barcode || "",
    })),
    media: (payload.images || []).map((img: any, idx: number) => ({
      id: `gid://shopify/MediaImage/${img.id}`,
      url: img.src,
      alt_text: img.alt || "",
      width: img.width || null,
      height: img.height || null,
      position: idx,
    })),
  };
}

// ─── Helper: registra no sync_log + atualiza last_sync_at ──

async function logSync(
  connection: ConnectionForSync,
  eventType: string,
  status: "completed" | "failed",
  details: Record<string, unknown>
) {
  try {
    await supabaseQuery("ecommerce_sync_log", "POST", {
      body: {
        connection_id: connection.id,
        user_id: connection.user_id,
        event_type: `product_${eventType}`,
        products_affected: 1,
        status,
        details: { ...details, trigger: "auto_sync" },
        completed_at: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.error("[webhook] Error writing sync_log:", e);
  }

  try {
    await supabaseQuery("ecommerce_connections", "PATCH", {
      filters: `id=eq.${connection.id}`,
      body: { last_sync_at: new Date().toISOString() },
    });
  } catch (e) {
    console.error("[webhook] Error updating last_sync_at:", e);
  }
}

// ─── Helper: normaliza produto GraphQL p/ formato do N8N ──

function normalizeGraphQLProduct(p: any) {
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

// ─── Helper: espera N ms ────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── PRODUCT CREATE: busca via GraphQL (dados completos) ──

async function handleProductCreate(
  shop: string,
  connection: ConnectionForSync,
  payload: any
) {
  const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "";
  if (!N8N_WEBHOOK_URL) {
    console.error("[webhook] N8N_WEBHOOK_URL not configured");
    return;
  }

  const shopifyGid = `gid://shopify/Product/${payload.id}`;

  // Esperar 15s para Shopify processar TODAS as imagens antes de buscar via GraphQL
  await sleep(15000);

  // Dedup: checar se outro webhook já importou enquanto dormíamos
  try {
    const existing = await supabaseQuery<{ id: string }[]>(
      "ecommerce_product_map",
      "GET",
      {
        filters: `connection_id=eq.${connection.id}&external_product_id=eq.${encodeURIComponent(shopifyGid)}&select=id`,
      }
    );
    if (existing && existing.length > 0) {
      console.log(`[webhook] Product ${shopifyGid} already imported, skipping`);
      return;
    }
  } catch (e) {
    // Se falhar o check, continua (melhor importar duplicado que não importar)
    console.warn("[webhook] Dedup check failed:", e);
  }

  try {
    const { admin } = await unauthenticated.admin(shop);

    const gqlResponse = await admin.graphql(
      `query getProduct($id: ID!) {
        product(id: $id) {
          ${PRODUCT_FIELDS}
        }
      }`,
      { variables: { id: shopifyGid } }
    );

    const { data } = await gqlResponse.json();

    if (!data?.product) {
      console.error(`[webhook] Produto ${shopifyGid} não encontrado via GraphQL`);
      await logSync(connection, "create", "failed", {
        shopify_product_id: shopifyGid,
        error: "Product not found via GraphQL",
      });
      return;
    }

    const normalized = normalizeGraphQLProduct(data.product);
    console.log(`[webhook] Product fetched via GraphQL: ${normalized.title} (${normalized.media.length} images)`);

    const response = await fetch(
      `${N8N_WEBHOOK_URL}/vizzu/shopify/import`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          user_id: connection.user_id,
          connection_id: connection.id,
          import_type: "auto_sync",
          products: [normalized],
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error(`[webhook] Import error (${response.status}):`, text);
    }

    await logSync(connection, "create", response.ok ? "completed" : "failed", {
      shopify_product_id: normalized.shopify_id,
      title: normalized.title,
      images_count: normalized.media.length,
    });

    console.log(`[webhook] Product created: ${normalized.title} (${shop})`);
  } catch (e) {
    console.error("[webhook] Error creating product:", e);
    await logSync(connection, "create", "failed", {
      shopify_product_id: shopifyGid,
      error: String(e),
    });
  }
}

// ─── PRODUCT UPDATE: busca no product_map → PATCH no Supabase ──

async function handleProductUpdate(
  shop: string,
  connection: ConnectionForSync,
  payload: any
) {
  const shopifyGid = `gid://shopify/Product/${payload.id}`;

  try {
    // Buscar produto no Vizzu via product_map
    const maps = await supabaseQuery<ProductMapEntry[]>(
      "ecommerce_product_map",
      "GET",
      {
        filters: `connection_id=eq.${connection.id}&external_product_id=eq.${encodeURIComponent(shopifyGid)}&select=id,vizzu_product_id`,
      }
    );

    if (!maps || maps.length === 0) {
      // Produto não existe no Vizzu — importar como novo
      console.log(`[webhook] Product ${shopifyGid} not in Vizzu, importing as new`);
      await handleProductCreate(shop, connection, payload);
      return;
    }

    const vizzuProductId = maps[0].vizzu_product_id;
    const firstVariant = payload.variants?.[0];

    // Mapear preços
    const compareAt = firstVariant?.compare_at_price ? parseFloat(firstVariant.compare_at_price) : null;
    const price = firstVariant?.price ? parseFloat(firstVariant.price) : null;
    const productPrice = compareAt || price;
    const productPriceSale = compareAt && price && price < compareAt ? price : null;

    // Atualizar dados do produto
    await supabaseQuery("products", "PATCH", {
      filters: `id=eq.${vizzuProductId}`,
      body: {
        name: payload.title,
        description: (payload.body_html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || null,
        brand: payload.vendor || null,
        price: productPrice,
        price_sale: productPriceSale,
        is_for_sale: (payload.status || "active").toLowerCase() === "active",
      },
    });

    // Atualizar sync_status no map
    await supabaseQuery("ecommerce_product_map", "PATCH", {
      filters: `id=eq.${maps[0].id}`,
      body: { sync_status: "synced", last_synced_at: new Date().toISOString() },
    });

    await logSync(connection, "update", "completed", {
      shopify_product_id: shopifyGid,
      vizzu_product_id: vizzuProductId,
      title: payload.title,
    });

    console.log(`[webhook] Product updated: ${payload.title} (${shop})`);
  } catch (e) {
    console.error("[webhook] Error updating product:", e);
    await logSync(connection, "update", "failed", {
      shopify_product_id: shopifyGid,
      error: String(e),
    });
  }
}

// ─── PRODUCT DELETE: remove do product_map ──────────────────

async function handleProductDelete(
  shop: string,
  connection: ConnectionForSync,
  payload: any
) {
  const shopifyGid = `gid://shopify/Product/${payload.id}`;

  try {
    // Buscar mapeamento
    const maps = await supabaseQuery<ProductMapEntry[]>(
      "ecommerce_product_map",
      "GET",
      {
        filters: `connection_id=eq.${connection.id}&external_product_id=eq.${encodeURIComponent(shopifyGid)}&select=id,vizzu_product_id`,
      }
    );

    if (!maps || maps.length === 0) {
      console.log(`[webhook] Product ${shopifyGid} not mapped, nothing to delete`);
      return;
    }

    // Deletar o mapeamento (produto Vizzu fica, mas sem link com Shopify)
    await supabaseQuery("ecommerce_product_map", "DELETE", {
      filters: `id=eq.${maps[0].id}`,
    });

    await logSync(connection, "delete", "completed", {
      shopify_product_id: shopifyGid,
      vizzu_product_id: maps[0].vizzu_product_id,
    });

    console.log(`[webhook] Product mapping deleted: ${shopifyGid} (${shop})`);
  } catch (e) {
    console.error("[webhook] Error deleting product mapping:", e);
    await logSync(connection, "delete", "failed", {
      shopify_product_id: shopifyGid,
      error: String(e),
    });
  }
}

// ─── Webhook Handler ─────────────────────────────────────

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, payload } =
    await authenticate.webhook(request);

  console.log(`[Webhook] ${topic} de ${shop}`);

  switch (topic) {
    // ─── Lifecycle ────────────────────────────────────────
    case "APP_UNINSTALLED":
      // Limpar sessões da loja
      if (session) {
        await db.session.deleteMany({ where: { shop } });
      }
      // Marcar conexão como desinstalada
      try {
        await supabaseQuery("ecommerce_connections", "PATCH", {
          filters: `platform=eq.shopify&store_domain=eq.${encodeURIComponent(shop)}`,
          body: {
            status: "uninstalled",
            uninstalled_at: new Date().toISOString(),
          },
        });
      } catch (e) {
        console.error("[Webhook] Erro ao marcar conexão:", e);
      }
      console.log(`[Webhook] App desinstalado de ${shop}`);
      break;

    // ─── Bulk Operations ────────────────────────────────
    case "BULK_OPERATIONS_FINISH":
      try {
        await handleBulkOperationFinish(shop);
      } catch (err) {
        console.error("[Webhook] Erro no BULK_OPERATIONS_FINISH:", err);
      }
      break;

    // ─── Product Sync (auto_sync) ────────────────────────
    case "PRODUCTS_CREATE": {
      const conn = await getAutoSyncConnection(shop);
      if (conn) {
        await handleProductCreate(shop, conn, payload);
      } else {
        console.log(`[Webhook] Produto criado em ${shop} (auto_sync OFF)`);
      }
      break;
    }

    case "PRODUCTS_UPDATE": {
      const conn = await getAutoSyncConnection(shop);
      if (conn) {
        await handleProductUpdate(shop, conn, payload);
      } else {
        console.log(`[Webhook] Produto atualizado em ${shop} (auto_sync OFF)`);
      }
      break;
    }

    case "PRODUCTS_DELETE": {
      const conn = await getAutoSyncConnection(shop);
      if (conn) {
        await handleProductDelete(shop, conn, payload);
      } else {
        console.log(`[Webhook] Produto deletado em ${shop} (auto_sync OFF)`);
      }
      break;
    }

    // ─── GDPR (obrigatórios) ─────────────────────────────
    case "CUSTOMERS_DATA_REQUEST":
      console.log(`[GDPR] Data request de ${shop}`);
      break;

    case "CUSTOMERS_REDACT":
      console.log(`[GDPR] Customer redact de ${shop}`);
      break;

    case "SHOP_REDACT":
      // 48h após desinstalação — deletar dados da loja
      try {
        await supabaseQuery("ecommerce_connections", "DELETE", {
          filters: `platform=eq.shopify&store_domain=eq.${encodeURIComponent(shop)}`,
        });
        console.log(`[GDPR] Dados de ${shop} deletados`);
      } catch (e) {
        console.error("[GDPR] Erro ao deletar dados:", e);
      }
      break;

    default:
      console.warn(`[Webhook] Topic não tratado: ${topic}`);
      return new Response("Unhandled webhook topic", { status: 404 });
  }

  return new Response(null, { status: 200 });
};
