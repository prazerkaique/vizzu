import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  appUrl: process.env.SHOPIFY_APP_URL || "",
  apiVersion: ApiVersion.January26,
  scopes: process.env.SCOPES?.split(","),
  sessionStorage: new PrismaSessionStorage(prisma),
  isEmbeddedApp: true,
  future: {},
});

export default shopify;
export const authenticate = shopify.authenticate;
export const apiVersion = ApiVersion.January26;
