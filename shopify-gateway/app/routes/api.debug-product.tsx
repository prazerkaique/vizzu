/**
 * DEBUG: Testa busca de produto via GraphQL
 * GET /api/debug-product?shop=xxx&product_id=123
 * Retorna exatamente o que o GraphQL retorna + normalizado
 * REMOVER APÓS DEBUG
 */
import type { LoaderFunctionArgs } from "react-router";
import { unauthenticated } from "../shopify.server";

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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const productId = url.searchParams.get("product_id");

  if (!shop || !productId) {
    return Response.json({ error: "Missing shop or product_id param" }, { status: 400 });
  }

  try {
    const { admin } = await unauthenticated.admin(shop);

    const shopifyGid = productId.startsWith("gid://")
      ? productId
      : `gid://shopify/Product/${productId}`;

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
      return Response.json({ error: "Product not found", shopifyGid }, { status: 404 });
    }

    const p = data.product;

    // Raw media edges
    const rawMediaEdges = p.media?.edges || [];

    // Normalized media (same logic as webhooks.tsx)
    const normalizedMedia = rawMediaEdges
      .filter(({ node: m }: any) => m.image?.url)
      .map(({ node: m }: any, idx: number) => ({
        id: m.id,
        url: m.image.url,
        alt_text: m.image.altText || "",
        width: m.image.width,
        height: m.image.height,
        position: idx,
      }));

    return Response.json({
      product_title: p.title,
      product_type: p.productType,
      status: p.status,
      tags: p.tags,
      raw_media_count: rawMediaEdges.length,
      raw_media_edges: rawMediaEdges.map(({ node: m }: any) => ({
        mediaContentType: m.mediaContentType,
        id: m.id,
        hasImage: !!m.image,
        imageUrl: m.image?.url || null,
      })),
      normalized_media_count: normalizedMedia.length,
      normalized_media: normalizedMedia,
      variants_count: p.variants?.edges?.length || 0,
    });
  } catch (e: any) {
    return Response.json({ error: e.message || String(e) }, { status: 500 });
  }
};
