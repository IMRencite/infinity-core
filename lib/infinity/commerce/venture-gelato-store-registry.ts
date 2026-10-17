import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

export type GelatoStoreProvisioningStatus = "READY" | "PROVISIONING_REQUIRED" | "FOUNDER_SELECTION_REQUIRED";

export type VentureGelatoStoreBinding = {
  venture_id: string;
  commerceProvider: "GELATO";
  gelatoStoreId: string;
  gelatoStoreName: string;
  gelatoStoreType: string | null;
  provisioningStatus: "READY";
  discovered_at: string;
  discovery_source: "persisted_registry" | "GET /v1/stores" | "env_override";
};

export type VentureGelatoStoreRegistry = {
  schema_version: 1;
  updated_at: string;
  ventures: Record<string, VentureGelatoStoreBinding>;
};

const REGISTRY_REL = ".infinity/commerce/venture-gelato-store-registry.json";

export function ventureGelatoStoreRegistryPath(cwd = process.cwd()): string {
  return join(cwd, REGISTRY_REL);
}

export function readVentureGelatoStoreRegistry(cwd = process.cwd()): VentureGelatoStoreRegistry | null {
  const path = ventureGelatoStoreRegistryPath(cwd);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as VentureGelatoStoreRegistry;
}

export function writeVentureGelatoStoreRegistry(registry: VentureGelatoStoreRegistry, cwd = process.cwd()): void {
  const path = ventureGelatoStoreRegistryPath(cwd);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(registry, null, 2)}\n`);
}

export function persistVentureGelatoStoreBinding(binding: Omit<VentureGelatoStoreBinding, "provisioningStatus"> & { provisioningStatus?: "READY" }): VentureGelatoStoreBinding {
  const prior = readVentureGelatoStoreRegistry() ?? {
    schema_version: 1 as const,
    updated_at: new Date().toISOString(),
    ventures: {},
  };
  const row: VentureGelatoStoreBinding = {
    ...binding,
    provisioningStatus: "READY",
  };
  prior.ventures[binding.venture_id] = row;
  prior.updated_at = new Date().toISOString();
  writeVentureGelatoStoreRegistry(prior);
  return row;
}

export function gelatoStoreIdFromEnv(env: NodeJS.Dict<string> = process.env): string | null {
  const id = (env.GELATO_STORE_ID ?? "").trim();
  return id.length >= 8 ? id : null;
}

export function gelatoStoreBindingForVenture(ventureId: string, cwd = process.cwd()): VentureGelatoStoreBinding | null {
  const envId = gelatoStoreIdFromEnv();
  const registry = readVentureGelatoStoreRegistry(cwd);
  const row = registry?.ventures[ventureId] ?? null;
  if (envId && row && envId !== row.gelatoStoreId) {
    return { ...row, gelatoStoreId: envId, discovery_source: "env_override" };
  }
  if (envId && !row) {
    return {
      venture_id: ventureId,
      commerceProvider: "GELATO",
      gelatoStoreId: envId,
      gelatoStoreName: "env_override",
      gelatoStoreType: null,
      provisioningStatus: "READY",
      discovered_at: new Date().toISOString(),
      discovery_source: "env_override",
    };
  }
  return row;
}
