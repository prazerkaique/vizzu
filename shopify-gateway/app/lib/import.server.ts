/**
 * Lógica de importação: baixa JSONL da Shopify Bulk Operation,
 * parseia produtos e envia para o N8N processar.
 */
import { unauthenticated } from "../shopify.server";
import { supabaseQuery } from "./supabase.server";

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "";

interface BulkOperationNode {
  id: string;
  url: string | null;
  status: string;
  objectCount: string;
}

interface ConnectionRow {
  id: string;
  user_id: string;
}

/**
 * Busca a URL do JSONL resultante de uma Bulk Operation,
 * baixa o JSONL, parseia e agrupa por produto, envia para N8N.
 */
export async function handleBulkOperationFinish(shop: string) {
  console.log(`[Import] BULK_OPERATIONS_FINISH para ${shop}`);

  // 1. Buscar a admin API com sessão offline
  const { admin } = await unauthenticated.admin(shop);

  // 2. Consultar a bulk operation atual
  const response = await admin.graphql(`
    {
      currentBulkOperation {
        id
        url
        status
        objectCount
      }
    }
  `);

  const { data } = await response.json();
  const operation: BulkOperationNode = data.currentBulkOperation;

  if (!operation?.url) {
    console.warn(`[Import] Bulk operation sem URL (status: ${operation?.status})`);
    return;
  }

  console.log(
    `[Import] Bulk operation ${operation.id}: ${operation.objectCount} objetos`
  );

  // 3. Baixar o JSONL
  const jsonlResponse = await fetch(operation.url);
  const jsonlText = await jsonlResponse.text();

  // 4. Parsear JSONL (cada linha = 1 JSON)
  const lines = jsonlText
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));

  // 5. Agrupar por produto (variantes e imagens têm __parentId)
  const productsMap = new Map<string, any>();

  for (const line of lines) {
    if (!line.__parentId) {
      // É um produto raiz
      productsMap.set(line.id, {
        ...line,
        variants: [],
        media: [],
      });
    } else {
      // É um filho (variante ou imagem)
      const parent = productsMap.get(line.__parentId);
      if (!parent) continue;

      if (line.id?.includes("ProductVariant")) {
        parent.variants.push(line);
      } else if (line.id?.includes("MediaImage") || line.image) {
        parent.media.push(line);
      }
    }
  }

  const products = Array.from(productsMap.values());
  console.log(`[Import] ${products.length} produtos parseados do JSONL`);

  // 6. Buscar conexão ativa para esta loja
  const connections = await supabaseQuery<ConnectionRow[]>(
    "ecommerce_connections",
    "GET",
    {
      filters: `platform=eq.shopify&store_domain=eq.${encodeURIComponent(shop)}&status=eq.active&select=id,user_id`,
    }
  );

  if (!connections || connections.length === 0) {
    console.error(
      `[Import] Nenhuma conexão ativa para ${shop}. Produtos não serão importados.`
    );
    return;
  }

  const connection = connections[0];

  // 7. Enviar para o N8N processar
  const n8nPayload = {
    shop,
    user_id: connection.user_id,
    connection_id: connection.id,
    bulk_operation_id: operation.id,
    products: products.map((p) => ({
      shopify_id: p.id,
      title: p.title,
      handle: p.handle,
      description_html: p.descriptionHtml || "",
      product_type: p.productType || "",
      vendor: p.vendor || "",
      tags: p.tags || [],
      status: p.status,
      variants: p.variants.map((v: any) => ({
        id: v.id,
        title: v.title,
        sku: v.sku || "",
        price: v.price,
        compare_at_price: v.compareAtPrice,
        barcode: v.barcode || "",
      })),
      media: p.media
        .filter((m: any) => m.image?.url)
        .map((m: any, i: number) => ({
          id: m.id,
          url: m.image.url,
          alt_text: m.image.altText || "",
          width: m.image.width,
          height: m.image.height,
          position: i,
        })),
    })),
  };

  try {
    const n8nResponse = await fetch(`${N8N_WEBHOOK_URL}/vizzu/shopify/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(n8nPayload),
    });

    if (!n8nResponse.ok) {
      const errText = await n8nResponse.text();
      console.error(`[Import] N8N import failed: ${n8nResponse.status} ${errText}`);
    } else {
      console.log(`[Import] N8N import iniciado para ${products.length} produtos`);
    }
  } catch (err) {
    console.error(`[Import] Erro ao chamar N8N:`, err);
  }
}
