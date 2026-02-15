import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  console.log(`[app.tsx] loader called: ${url.pathname}${url.search ? '?' + url.search.substring(0, 100) : ''}`);
  console.log(`[app.tsx] has id_token: ${url.searchParams.has('id_token')}, has shop: ${url.searchParams.has('shop')}`);

  try {
    await authenticate.admin(request);
    console.log(`[app.tsx] authenticate.admin succeeded`);
  } catch (response) {
    if (response instanceof Response) {
      const location = response.headers.get('Location') || '(no location)';
      console.error(`[app.tsx] authenticate.admin redirected (${response.status}): ${location}`);
      console.error(`[app.tsx] Request URL was: ${request.url}`);
    } else {
      console.error(`[app.tsx] authenticate.admin threw:`, response);
    }
    throw response;
  }

  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function AppLayout() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Dashboard</s-link>
        <s-link href="/app/import">Importar Produtos</s-link>
        <s-link href="/app/history">Histórico</s-link>
        <s-link href="/app/settings">Configurações</s-link>
      </s-app-nav>
      <div className="vizzu-app-wrapper">
        <div className="vizzu-topbar">
          <img src="/logo-vizzu.png" alt="Vizzu" className="vizzu-topbar-logo" />
          <span className="vizzu-topbar-tagline">Estúdio de bolso</span>
        </div>
        <Outlet />
      </div>
    </AppProvider>
  );
}

// Obrigatório: boundary helpers do Shopify SDK
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
