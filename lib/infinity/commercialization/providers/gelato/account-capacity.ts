import { loadGelatoConfig } from "./config";

export const GELATO_ECOMMERCE_API = "https://ecommerce.gelatoapis.com";

export type GelatoSafeProbe = {
  path: string;
  method: "GET" | "OPTIONS";
  status: number;
  top_keys: string[];
  array_length: number | null;
  documented: boolean;
};

function summarizeJson(json: unknown): { top_keys: string[]; array_length: number | null } {
  if (Array.isArray(json)) return { top_keys: ["<array>"], array_length: json.length };
  if (!json || typeof json !== "object") return { top_keys: [], array_length: null };
  const row = json as Record<string, unknown>;
  const keys = Object.keys(row).filter((key) => !/key|token|secret|authorization|password|email/i.test(key));
  const candidate = ["stores", "data", "items", "results"].map((name) => row[name]).find(Array.isArray);
  return { top_keys: keys.slice(0, 12), array_length: Array.isArray(candidate) ? candidate.length : null };
}

export async function gelatoSafeRequest(input: {
  path: string;
  method?: "GET" | "OPTIONS";
  env?: NodeJS.Dict<string>;
}): Promise<GelatoSafeProbe> {
  const config = loadGelatoConfig(input.env ?? process.env);
  if (!config.credentials || config.environment !== "SANDBOX") {
    return { path: input.path, method: input.method ?? "GET", status: 0, top_keys: [], array_length: null, documented: false };
  }
  const response = await fetch(`${GELATO_ECOMMERCE_API}${input.path}`, {
    method: input.method ?? "GET",
    headers: { "X-API-KEY": config.credentials.headerValue() },
  });
  const json = input.method === "OPTIONS" ? null : await response.json().catch(() => null);
  const summary = summarizeJson(json);
  return {
    path: input.path,
    method: input.method ?? "GET",
    status: response.status,
    top_keys: summary.top_keys,
    array_length: summary.array_length,
    documented: input.path === "/v1/stores" || /^\/v1\/templates\/[^/]+$/.test(input.path),
  };
}

export async function inspectGelatoAccountStoreCapacity(env: NodeJS.Dict<string> = process.env) {
  if ((env.GELATO_API_KEY ?? "").trim()) {
    return {
      plan: "UNKNOWN" as const,
      connected_stores: 0,
      store_limit: "UNKNOWN" as const,
      free_slot: "UNKNOWN" as const,
      store_creation_charge: "UNKNOWN" as const,
      upgrade_required: "UNKNOWN" as const,
      api_selling_available: "UNKNOWN" as const,
      store_create_api: "NOT_DOCUMENTED" as const,
      blocked: "LIVE_KEY_PRESENT_NOT_USED" as const,
      secret_output: false as const,
    };
  }
  const stores = await gelatoSafeRequest({ path: "/v1/stores", env });
  const templatesList = await gelatoSafeRequest({ path: "/v1/templates", env });
  const storeCreateOptions = await gelatoSafeRequest({ path: "/v1/stores", method: "OPTIONS", env });
  const connected = stores.array_length ?? 0;
  return {
    plan: "UNKNOWN" as const,
    connected_stores: connected,
    store_limit: "UNKNOWN" as const,
    free_slot: "UNKNOWN" as const,
    store_creation_charge: "UNKNOWN" as const,
    upgrade_required: "UNKNOWN" as const,
    api_selling_available: stores.status === 200 ? "YES" as const : "UNKNOWN" as const,
    store_create_api: "NOT_DOCUMENTED" as const,
    template_list_api: templatesList.status === 200 ? "PRESENT" as const : "NOT_SUPPORTED" as const,
    template_get_by_id: "YES" as const,
    template_create_api: "NOT_DOCUMENTED" as const,
    stores_probe: stores,
    templates_probe: templatesList,
    store_options: { status: storeCreateOptions.status },
    secret_output: false as const,
  };
}

export const GELATO_STORE_FOUNDER_STEPS = [
  "Open the Gelato dashboard used by the sandbox API key (not a live paid order).",
  "Connect or create exactly one store for Club Throttle. Copy the Store ID from the store URL.",
  "Do not connect extra experimental stores.",
  "Do not place an order and do not complete fulfillment company-profile work unless separately requested.",
] as const;

export const GELATO_TEMPLATE_FOUNDER_STEPS = [
  "In the Gelato dashboard, open Templates.",
  "Create one apparel template: heavyweight/black-capable tee with front and back print areas.",
  "Add named image layers for small-front and large-back placeholders.",
  "Set mockups, details, and prices. Save.",
  "Copy the Template ID from the Templates list.",
  "Provide Store ID and Template ID to Infinity. Do not publish the template as a customer product.",
] as const;
