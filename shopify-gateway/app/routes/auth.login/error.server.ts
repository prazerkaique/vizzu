import type { LoginError } from "@shopify/shopify-app-react-router/server";
import { LoginErrorType } from "@shopify/shopify-app-react-router/server";

interface LoginErrorMessage {
  shop?: string;
}

export function loginErrorMessage(loginErrors: LoginError): LoginErrorMessage {
  if (loginErrors?.shop === LoginErrorType.MissingShop) {
    return { shop: "Informe o domínio da sua loja para entrar" };
  } else if (loginErrors?.shop === LoginErrorType.InvalidShop) {
    return { shop: "Domínio de loja inválido" };
  }

  return {};
}
