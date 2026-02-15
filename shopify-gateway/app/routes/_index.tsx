import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

// Redireciona a raiz para /app (onde o Shopify embarca o app)
export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Preservar query params (Shopify envia session tokens aqui)
  const url = new URL(request.url);
  const target = `/app${url.search}`;
  console.log(`[_index.tsx] Redirecting to: ${target.substring(0, 100)}`);
  console.log(`[_index.tsx] Query params: shop=${url.searchParams.get('shop')}, id_token=${url.searchParams.has('id_token') ? 'present' : 'missing'}, embedded=${url.searchParams.get('embedded')}`);
  return redirect(target);
};
