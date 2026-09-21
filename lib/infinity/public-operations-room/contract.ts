export const PUBLIC_OPERATIONS_ROOM_ENDPOINT = "/api/public/operations" as const;
export const PUBLIC_OPERATIONS_ROOM_POLL_MS = 8_000;
export const PUBLIC_OPERATIONS_ROOM_ROUTE = "/public/operations-room" as const;
export const PUBLIC_OPERATIONS_HOMEPAGE_ROUTE = "/" as const;
export const FUTURE_IMROS_ROOT_CANDIDATE = "/" as const;

export const PUBLIC_STATE_PROPAGATION_BUDGET_MS = {
  runtime_to_projection: 2_000,
  projection_to_api: 5_000,
  api_to_client: PUBLIC_OPERATIONS_ROOM_POLL_MS,
} as const;

export const PUBLIC_OPERATIONS_ROOM_ALLOWED_FETCHES = [PUBLIC_OPERATIONS_ROOM_ENDPOINT] as const;

export const PUBLIC_OPERATIONS_ROOM_FORBIDDEN_FETCHES = [
  "/api/operator-console",
  "/api/hq",
  "/api/runtime",
  "/api/operator-console/treasury",
  "/api/operator-console/hq-events",
  "/api/operator-console/hq-live-state",
  "/api/hq-copilot",
] as const;

export const PUBLIC_UI_ALLOWED_IMPORT_PREFIXES = [
  "@/lib/infinity/public-operations-projection/types",
  "@/lib/infinity/public-operations-room",
  "@/components/public/operations-room",
] as const;

export const PUBLIC_UI_FORBIDDEN_IMPORTS = [
  "financial-truth",
  "treasury",
  "canonical-work",
  "operator-console",
  "autonomous-operating-loop",
  "growth-engine",
  "customer",
  "provider",
  "launch-gateway",
  "public-operations-projection/sources",
  "public-operations-projection/project",
  "public-operations-projection/persist",
  "public-operations-projection/persist-occupancy",
  "public-operations-projection/derive-occupancy",
] as const;
