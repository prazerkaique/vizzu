/**
 * Helper para chamadas diretas ao Supabase via PostgREST (service role).
 * Não usa o SDK do Supabase — apenas fetch puro para manter o gateway leve.
 */

function getConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured");
  return { url, key };
}

function getHeaders() {
  const { key } = getConfig();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

/**
 * Executa query no Supabase PostgREST.
 * @param table - Nome da tabela
 * @param method - HTTP method
 * @param options.body - Body para POST/PATCH
 * @param options.filters - Query string PostgREST (ex: "id=eq.xxx&select=id,name")
 */
export async function supabaseQuery<T = unknown>(
  table: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  options?: {
    body?: Record<string, unknown>;
    filters?: string;
  }
): Promise<T | null> {
  const { url } = getConfig();
  const queryUrl = `${url}/rest/v1/${table}${options?.filters ? `?${options.filters}` : ""}`;

  const response = await fetch(queryUrl, {
    method,
    headers: getHeaders(),
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase ${method} ${table}: ${response.status} - ${text}`);
  }

  const text = await response.text();
  if (!text) return null;

  return JSON.parse(text) as T;
}

/**
 * Verifica um token de acesso Supabase chamando /auth/v1/user.
 * Retorna os dados do user se válido, null se inválido.
 */
export async function verifySupabaseUser(
  accessToken: string
): Promise<{ id: string; email: string } | null> {
  const { url, key } = getConfig();

  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) return null;

  const user = await response.json();
  return { id: user.id, email: user.email };
}
