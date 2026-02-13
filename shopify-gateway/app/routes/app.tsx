import { Outlet } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { NavMenu } from "@shopify/app-bridge-react";

export default function AppLayout() {
  return (
    <AppProvider>
      <NavMenu>
        <a href="/app" rel="home">Dashboard</a>
        <a href="/app/import">Importar Produtos</a>
        <a href="/app/settings">Configurações</a>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Obrigatório: boundary helpers para headers e errors
export const headers = boundary.headers;
export const ErrorBoundary = boundary.error;
