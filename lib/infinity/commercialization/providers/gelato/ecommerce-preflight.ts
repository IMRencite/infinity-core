import { readFileSync, existsSync } from "node:fs";
import { loadGelatoConfig } from "./config";
import { auditGelatoCreateProductFromTemplateHistory, classifyCreateProductFromTemplateSideEffect } from "./template-visualization";

export const GELATO_ECOMMERCE_API = "https://ecommerce.gelatoapis.com";

function sourceMentionsCreateFromTemplate(cwd = process.cwd()): boolean {
  const files = [
    "lib/infinity/commercialization/providers/gelato/template-visualization.ts",
    "lib/infinity/commercialization/providers/gelato/ecommerce-preflight.ts",
    "scripts/club-throttle-gelato-sandbox-canary.ts",
    "scripts/gelato-sandbox-canary-tee.mjs",
  ];
  return files.some((file) => {
    const path = `${cwd}/${file}`.replace(/\\/g, "/");
    if (!existsSync(path)) return false;
    const text = readFileSync(path, "utf8");
    return /products:create-from-template/.test(text) && !file.endsWith("ecommerce-preflight.ts");
  });
}

export async function gelatoEcommerceGet(path: string, env: NodeJS.Dict<string> = process.env): Promise<{
  status: number;
  ok: boolean;
  count: number;
}> {
  const config = loadGelatoConfig(env);
  if (!config.credentials || config.environment !== "SANDBOX") {
    return { status: 0, ok: false, count: 0 };
  }
  const response = await fetch(`${GELATO_ECOMMERCE_API}${path}`, {
    headers: { "X-API-KEY": config.credentials.headerValue() },
  });
  const json = await response.json().catch(() => null);
  const rows = Array.isArray(json) ? json : Array.isArray((json as { stores?: unknown[] } | null)?.stores)
    ? (json as { stores: unknown[] }).stores
    : Array.isArray((json as { data?: unknown[] } | null)?.data)
      ? (json as { data: unknown[] }).data
      : [];
  return { status: response.status, ok: response.ok, count: rows.length };
}

export async function reconcileGelatoCreateProductPreflight(env: NodeJS.Dict<string> = process.env) {
  const history = auditGelatoCreateProductFromTemplateHistory();
  const side = classifyCreateProductFromTemplateSideEffect();
  const stores = await gelatoEcommerceGet("/v1/stores", env);
  const calledInSource = sourceMentionsCreateFromTemplate();
  return {
    create_product_previously_called: history.create_product_from_template_called || calledInSource,
    provider_product_existing: false,
    side_effect_state: "UNPROVEN_PREFLIGHT" as const,
    digital_product_record: "NO" as const,
    public_listing: "NO" as const,
    financial_charge_risk: side.financial_charge_risk,
    fulfillment: "NO" as const,
    manufacture: "NO" as const,
    real_charge: "NO" as const,
    stores_readable: stores.ok,
    store_count: stores.count,
    template_id: null,
    hidden_create_allowed: side.action === "SAFE_HIDDEN_ALLOWED" && stores.ok && stores.count > 0,
    hidden_create_blocked_reason: !stores.ok
      ? "STORES_UNREADABLE"
      : stores.count === 0
        ? "NO_GELATO_STORE"
        : "NO_ACCOUNT_TEMPLATE_ID",
    secret_output: false as const,
  };
}
