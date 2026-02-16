import type { ActionFunctionArgs } from "react-router";

export const action = async (args: ActionFunctionArgs) => {
  const { handleWebhookAction } = await import("../lib/webhook-handler.server");
  return handleWebhookAction(args);
};
