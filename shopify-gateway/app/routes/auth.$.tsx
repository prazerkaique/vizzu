import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

// Rota catch-all para o fluxo de OAuth da Shopify
// Gerenciada automaticamente pelo @shopify/shopify-app-react-router
export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};
