/**
 * Gelato venture store provisioning (read + persist only):
 * A. resolveGelatoStoreForVenture reads persisted gelatoStoreId (registry / env override).
 * B. Verify via GET /v1/stores/{id}; if missing, GET /v1/stores and exact normalized name match.
 * C. Zero matches → GELATO_STORE_PROVISIONING_REQUIRED (founder creates manual store in dashboard).
 * D. Exactly one match → persist binding automatically; multiple → FOUNDER_STORE_SELECTION_REQUIRED.
 * E. Product creation / publish remain separate founder gates — store READY ≠ write authorized.
 */
import { loadGelatoConfig } from "./config";
import { GELATO_ECOMMERCE_API } from "./ecommerce-preflight";
import {
  gelatoStoreBindingForVenture,
  gelatoStoreIdFromEnv,
  persistVentureGelatoStoreBinding,
  type VentureGelatoStoreBinding,
} from "@/lib/infinity/commerce/venture-gelato-store-registry";

export type GelatoStoreResolveResult =
  | { status: "READY"; binding: VentureGelatoStoreBinding; verified: boolean }
  | { status: "GELATO_STORE_PROVISIONING_REQUIRED"; reason: string }
  | { status: "FOUNDER_STORE_SELECTION_REQUIRED"; candidates: GelatoStoreListRow[] };

export type GelatoStoreListRow = {
  id: string;
  name: string | null;
  type: string | null;
  status: string | null;
  platform: string | null;
  connectionSource: string | null;
  application: string | null;
  externalId: string | null;
};

export function normalizeGelatoStoreName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Venture display name used for exact API discovery match (no fuzzy). */
export function gelatoDiscoveryNameForVenture(ventureId: string): string | null {
  if (ventureId === "club-throttle") return "Club Throttle";
  return null;
}

export async function listGelatoStores(env: NodeJS.Dict<string> = process.env): Promise<{
  http_status: number;
  stores: GelatoStoreListRow[];
}> {
  const config = loadGelatoConfig(env);
  if (!config.credentials) return { http_status: 0, stores: [] };
  const res = await fetch(`${GELATO_ECOMMERCE_API}/v1/stores`, {
    headers: { "X-API-KEY": config.credentials.headerValue() },
  });
  const json = await res.json().catch(() => null);
  const list = Array.isArray(json?.stores) ? json.stores : Array.isArray(json) ? json : [];
  const stores: GelatoStoreListRow[] = list.map((row: Record<string, unknown>) => ({
    id: String(row.id ?? ""),
    name: row.name != null ? String(row.name) : null,
    type: row.type != null ? String(row.type) : null,
    status: row.status != null ? String(row.status) : null,
    platform: row.platform != null ? String(row.platform) : null,
    connectionSource: row.connectionSource != null ? String(row.connectionSource) : null,
    application: row.application != null ? String(row.application) : null,
    externalId: row.externalId != null ? String(row.externalId) : null,
  }));
  return { http_status: res.status, stores };
}

export async function getGelatoStoreById(storeId: string, env: NodeJS.Dict<string> = process.env): Promise<{
  http_status: number;
  store: Record<string, unknown> | null;
}> {
  const config = loadGelatoConfig(env);
  if (!config.credentials) return { http_status: 0, store: null };
  const res = await fetch(`${GELATO_ECOMMERCE_API}/v1/stores/${encodeURIComponent(storeId)}`, {
    headers: { "X-API-KEY": config.credentials.headerValue() },
  });
  const store = res.ok ? ((await res.json().catch(() => null)) as Record<string, unknown> | null) : null;
  return { http_status: res.status, store };
}

function matchStoresByVentureName(stores: GelatoStoreListRow[], ventureId: string): GelatoStoreListRow[] {
  const target = gelatoDiscoveryNameForVenture(ventureId);
  if (!target) return [];
  const normalized = normalizeGelatoStoreName(target);
  return stores.filter((s) => s.name && normalizeGelatoStoreName(s.name) === normalized);
}

export async function resolveGelatoStoreForVenture(
  ventureId: string,
  env: NodeJS.Dict<string> = process.env,
): Promise<GelatoStoreResolveResult> {
  const persisted = gelatoStoreBindingForVenture(ventureId);
  if (persisted?.gelatoStoreId) {
    const verify = await getGelatoStoreById(persisted.gelatoStoreId, env);
    if (verify.http_status === 200 && verify.store) {
      return { status: "READY", binding: persisted, verified: true };
    }
  }

  const { stores } = await listGelatoStores(env);
  const matches = matchStoresByVentureName(stores, ventureId);
  if (matches.length === 0) {
    return {
      status: "GELATO_STORE_PROVISIONING_REQUIRED",
      reason: "GET /v1/stores returned no exact name match for venture Gelato discovery name",
    };
  }
  if (matches.length > 1) {
    return { status: "FOUNDER_STORE_SELECTION_REQUIRED", candidates: matches };
  }
  const hit = matches[0]!;
  const binding = persistVentureGelatoStoreBinding({
    venture_id: ventureId,
    commerceProvider: "GELATO",
    gelatoStoreId: hit.id,
    gelatoStoreName: hit.name ?? gelatoDiscoveryNameForVenture(ventureId) ?? ventureId,
    gelatoStoreType: hit.type,
    discovered_at: new Date().toISOString(),
    discovery_source: "GET /v1/stores",
  });
  return { status: "READY", binding, verified: true };
}

export function clubThrottleGelatoStoreId(env: NodeJS.Dict<string> = process.env): string | null {
  return gelatoStoreBindingForVenture("club-throttle")?.gelatoStoreId ?? gelatoStoreIdFromEnv(env);
}
