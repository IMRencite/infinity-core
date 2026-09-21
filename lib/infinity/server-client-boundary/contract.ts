export const SERVER_CLIENT_BOUNDARY_INTEGRITY_GATE = "ServerClientBoundaryIntegrityGate" as const;
export const CLIENT_SAFE_BARREL_EXPORT_GATE = "ClientSafeBarrelExportGate" as const;

export const CLIENT_SERVER_BOUNDARY_PRINCIPLE =
  "CLIENT COMPONENTS MUST NEVER REACH SERVER-ONLY QC OR PLAYWRIGHT MODULES." as const;

export const CLIENT_SAFE_BARREL_PRINCIPLE =
  "BROAD BARREL EXPORTS MUST NOT ERASE SERVER/CLIENT BOUNDARIES." as const;

export const HQ_RUNTIME_MODULE_GRAPH_INTEGRITY_GATE = "HQRuntimeModuleGraphIntegrityGate" as const;

export const CLIENT_SAFE_BARRELS = [
  "lib/infinity/hq-information-architecture/index.ts",
  "lib/infinity/hq-information-architecture/contract.ts",
  "lib/infinity/hq-first-class-room/index.ts",
  "lib/infinity/hq-live-activity/index.ts",
  "lib/infinity/public-venture-design/index.ts",
  "lib/infinity/public-venture-design/rendered-layout/index.ts",
  "lib/infinity/hq-inspection-identity/index.ts",
  "lib/infinity/hq-inspection-identity/aliases.ts",
  "lib/infinity/hq-inspection-identity/types.ts",
  "lib/infinity/hq-venture-selection/index.ts",
] as const;

export const PROHIBITED_CLIENT_SPECIFIERS = [
  "@playwright/test",
  "playwright",
  "playwright-core",
  "async_hooks",
  "node:async_hooks",
  "child_process",
  "node:child_process",
  "server-only",
] as const;

export const PROHIBITED_CLIENT_FILE_MARKERS = [
  "served-production-browser.ts",
  "served-production-gate.ts",
  "served-production-server.ts",
  "served-production.ts",
  "operations-room.ts",
  "hq-inspection-identity/resolve.ts",
  "hq-inspection-identity/canonical-snapshot.ts",
] as const;

export const HEAVY_CANONICAL_ENGINE_MARKERS = [
  "hq-canonical-projection/load.ts",
  "hq-venture-registry.ts",
  "enrich-snapshot.ts",
  "operations-room.ts",
  "public-venture-design/rendered-layout/served-production",
  "hq-inspection-identity/resolve.ts",
  "hq-inspection-identity/canonical-snapshot.ts",
] as const;

export const HQ_RUNTIME_GRAPH_ENTRIES = [
  "lib/infinity/hq-inspection-identity/index.ts",
  "lib/infinity/hq-inspection-identity/aliases.ts",
  "lib/infinity/operator-console/inspection-model.ts",
  "lib/infinity/operator-console/inspection-ref.ts",
  "lib/infinity/hq-first-class-room/index.ts",
  "components/dashboard/operator-console/hq-idle-shell.tsx",
  "components/dashboard/operator-console/hq-inspection-provider.tsx",
] as const;

export const HQ_RUNTIME_GRAPH_PREFIXES = [
  "lib/infinity/hq-inspection-identity/",
  "lib/infinity/hq-first-class-room/",
  "lib/infinity/hq-canonical-projection/",
  "lib/infinity/operator-console/inspection-model.ts",
  "lib/infinity/operator-console/inspection-ref.ts",
] as const;

export type NamedGateResult = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};
