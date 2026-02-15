import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { verifyHmac, encrypt } from "../lib/crypto.server";
import { supabaseQuery, verifySupabaseUser } from "../lib/supabase.server";
import db from "../db.server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://www.vizzu.pro",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const LINKING_WINDOW_MS = 10 * 60 * 1000; // 10 minutos

interface EcommerceConnection {
  id: string;
  user_id: string;
  status: string;
}

/**
 * POST /api/connect-vizzu
 *
 * Chamado pelo frontend do Vizzu (vizzu.pro) para vincular
 * uma loja Shopify a uma conta Vizzu.
 *
 * Body: { shop, signature, timestamp, supabase_access_token }
 *
 * - signature = HMAC-SHA256(shop:timestamp, SHOPIFY_API_SECRET)
 * - supabase_access_token = JWT do user logado no Vizzu
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const body = await request.json();
    const { shop, signature, timestamp, supabase_access_token } = body;

    // 1. Validar campos obrigatórios
    if (!shop || !signature || !timestamp || !supabase_access_token) {
      return Response.json(
        { error: "Campos obrigatórios: shop, signature, timestamp, supabase_access_token" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 2. Validar timestamp (janela de 10 minutos)
    const ts = parseInt(timestamp, 10);
    const now = Date.now();
    if (isNaN(ts) || Math.abs(now - ts) > LINKING_WINDOW_MS) {
      return Response.json(
        { error: "Token expirado. Tente novamente nas Configurações do app Shopify." },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    // 3. Verificar HMAC (prova que veio do gateway autêntico)
    const hmacData = `${shop}:${timestamp}`;
    if (!verifyHmac(hmacData, signature)) {
      return Response.json(
        { error: "Assinatura inválida" },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    // 4. Verificar token Supabase (prova que o user é autêntico)
    const user = await verifySupabaseUser(supabase_access_token);
    if (!user) {
      return Response.json(
        { error: "Token Supabase inválido. Faça login novamente no Vizzu." },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    // 5. Buscar sessão offline Shopify (contém o access token)
    const sessions = await db.session.findMany({
      where: { shop, isOnline: false },
      orderBy: { id: "desc" },
      take: 1,
    });

    if (sessions.length === 0) {
      return Response.json(
        { error: "Sessão Shopify não encontrada. Reinstale o app na Shopify." },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const session = sessions[0];

    // 6. Criptografar o access token (+ salvar plain pro N8N)
    const accessTokenEncrypted = encrypt(session.accessToken);
    const accessTokenPlain = session.accessToken;

    // 7. Verificar se já existe conexão para esta loja
    const existing = await supabaseQuery<EcommerceConnection[]>(
      "ecommerce_connections",
      "GET",
      {
        filters: `platform=eq.shopify&store_domain=eq.${encodeURIComponent(shop)}&select=id,user_id,status`,
      }
    );

    if (existing && existing.length > 0) {
      const conn = existing[0];

      // Já conectada ao mesmo user e ativa — atualizar tokens
      if (conn.user_id === user.id && conn.status === "active") {
        await supabaseQuery("ecommerce_connections", "PATCH", {
          filters: `id=eq.${conn.id}`,
          body: {
            access_token_encrypted: accessTokenEncrypted,
            access_token_plain: accessTokenPlain,
            scopes: session.scope || "",
          },
        });

        console.log(`[connect-vizzu] Updated tokens for active connection ${conn.id} (${shop})`);
        return Response.json(
          { success: true, connection_id: conn.id, message: "Já conectado" },
          { headers: CORS_HEADERS }
        );
      }

      // Conectada a outro user
      if (conn.user_id !== user.id) {
        return Response.json(
          { error: "Esta loja já está vinculada a outra conta Vizzu" },
          { status: 409, headers: CORS_HEADERS }
        );
      }

      // Mesmo user mas inativa — reativar
      await supabaseQuery("ecommerce_connections", "PATCH", {
        filters: `id=eq.${conn.id}`,
        body: {
          status: "active",
          access_token_encrypted: accessTokenEncrypted,
          access_token_plain: accessTokenPlain,
          scopes: session.scope || "",
          uninstalled_at: null,
        },
      });

      console.log(`[connect-vizzu] Reactivated connection ${conn.id} for ${shop}`);
      return Response.json(
        { success: true, connection_id: conn.id, message: "Conexão reativada" },
        { headers: CORS_HEADERS }
      );
    }

    // 8. Criar nova conexão
    const result = await supabaseQuery<EcommerceConnection[]>(
      "ecommerce_connections",
      "POST",
      {
        body: {
          user_id: user.id,
          platform: "shopify",
          store_domain: shop,
          store_name: shop.replace(".myshopify.com", ""),
          access_token_encrypted: accessTokenEncrypted,
          access_token_plain: accessTokenPlain,
          scopes: session.scope || "",
          status: "active",
          metadata: {
            api_version: "2026-01",
          },
        },
      }
    );

    const connectionId = result?.[0]?.id;
    console.log(`[connect-vizzu] Created connection ${connectionId} for ${shop} → user ${user.id}`);

    return Response.json(
      { success: true, connection_id: connectionId, message: "Conectado com sucesso!" },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("[connect-vizzu] Error:", error);
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
};

// GET retorna info sobre o endpoint
export const loader = async ({ request }: LoaderFunctionArgs) => {
  return Response.json(
    { endpoint: "POST /api/connect-vizzu", status: "ok" },
    { headers: CORS_HEADERS }
  );
};
