import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// Handler de TODOS os webhooks da Shopify
// IMPORTANTE: esta rota NÃO está dentro de app.tsx (não tem sessão de admin)
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
      // TODO: Marcar ecommerce_connections.status = 'uninstalled'
      // via Supabase service role
      console.log(`[Webhook] App desinstalado de ${shop}`);
      break;

    // ─── Product Sync (se auto_sync habilitado) ──────────
    case "PRODUCTS_CREATE":
      // TODO: Chamar N8N /vizzu/shopify/sync com action: 'create'
      console.log(`[Webhook] Produto criado em ${shop}:`, payload?.id);
      break;

    case "PRODUCTS_UPDATE":
      // TODO: Chamar N8N /vizzu/shopify/sync com action: 'update'
      console.log(`[Webhook] Produto atualizado em ${shop}:`, payload?.id);
      break;

    case "PRODUCTS_DELETE":
      // TODO: Chamar N8N /vizzu/shopify/sync com action: 'delete'
      console.log(`[Webhook] Produto deletado em ${shop}:`, payload?.id);
      break;

    // ─── GDPR (obrigatórios) ─────────────────────────────
    case "CUSTOMERS_DATA_REQUEST":
      // Não armazenamos dados de clientes Shopify
      // Retornar 200 OK
      console.log(`[GDPR] Data request de ${shop}`);
      break;

    case "CUSTOMERS_REDACT":
      // Não armazenamos dados de clientes Shopify
      // Retornar 200 OK
      console.log(`[GDPR] Customer redact de ${shop}`);
      break;

    case "SHOP_REDACT":
      // 48h após desinstalação — deletar dados da loja
      // TODO: Deletar ecommerce_connections WHERE store_domain = shop
      // NÃO deletar produtos/imagens do Vizzu (pertencem ao user)
      console.log(`[GDPR] Shop redact de ${shop}`);
      break;

    default:
      console.warn(`[Webhook] Topic não tratado: ${topic}`);
      return new Response("Unhandled webhook topic", { status: 404 });
  }

  return new Response(null, { status: 200 });
};
