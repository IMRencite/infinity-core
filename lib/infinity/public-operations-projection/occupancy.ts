import { PUBLIC_DEPARTMENT_IDS, PUBLIC_SALES_ROOM_IDS, type PublicDepartmentId, type PublicSalesRoomId } from "./types";

export const CANONICAL_PUBLIC_OCCUPANCY = "CanonicalPublicOccupancy" as const;
export const CANONICAL_PUBLIC_OCCUPANCY_VERSION = "occupancy-v1" as const;
export const PUBLIC_OCCUPANCY_SCOPE = "public-operations-occupancy" as const;

export const CANONICAL_OCCUPANCY_LEVELS = ["IDLE", "MONITORING", "ACTIVE"] as const;
export type CanonicalOccupancyLevel = (typeof CANONICAL_OCCUPANCY_LEVELS)[number];

export type CanonicalPublicOccupancy = {
  contract: typeof CANONICAL_PUBLIC_OCCUPANCY;
  version: typeof CANONICAL_PUBLIC_OCCUPANCY_VERSION;
  generated_at: string;
  summary: CanonicalOccupancyLevel;
  departments: Record<PublicDepartmentId, CanonicalOccupancyLevel>;
  sales_rooms: Record<PublicSalesRoomId, CanonicalOccupancyLevel>;
  agents: Record<string, CanonicalOccupancyLevel>;
};

export const PUBLIC_OCCUPANCY_AGENT_IDS = [
  "public-ops",
  "public-ops-2",
  "public-research",
  "public-growth",
  "public-growth-2",
  "public-validation",
  "public-systems",
  "public-finance",
  "public-product",
  "public-creative",
  "public-prospect-scout",
  "public-prospect-resolver",
  "public-sales-out",
  "public-sales-in",
  "public-sales-partner",
] as const;

const AGENT_DEPARTMENT: Record<(typeof PUBLIC_OCCUPANCY_AGENT_IDS)[number], PublicDepartmentId> = {
  "public-ops": "OPERATIONS",
  "public-ops-2": "OPERATIONS",
  "public-research": "RESEARCH",
  "public-growth": "GROWTH",
  "public-growth-2": "GROWTH",
  "public-validation": "VALIDATION",
  "public-systems": "SYSTEMS",
  "public-finance": "FINANCE",
  "public-product": "PRODUCT",
  "public-creative": "CREATIVE",
  "public-prospect-scout": "PROSPECT_INTELLIGENCE",
  "public-prospect-resolver": "PROSPECT_INTELLIGENCE",
  "public-sales-out": "GROWTH",
  "public-sales-in": "GROWTH",
  "public-sales-partner": "GROWTH",
};

export function emptyCanonicalOccupancy(now: string, fill: CanonicalOccupancyLevel = "IDLE"): CanonicalPublicOccupancy {
  const departments = Object.fromEntries(PUBLIC_DEPARTMENT_IDS.map((id) => [id, fill])) as Record<PublicDepartmentId, CanonicalOccupancyLevel>;
  const sales_rooms = Object.fromEntries(PUBLIC_SALES_ROOM_IDS.map((id) => [id, fill])) as Record<PublicSalesRoomId, CanonicalOccupancyLevel>;
  const agents = Object.fromEntries(PUBLIC_OCCUPANCY_AGENT_IDS.map((id) => [id, fill])) as Record<string, CanonicalOccupancyLevel>;
  return {
    contract: CANONICAL_PUBLIC_OCCUPANCY,
    version: CANONICAL_PUBLIC_OCCUPANCY_VERSION,
    generated_at: now,
    summary: fill,
    departments,
    sales_rooms,
    agents,
  };
}

export function rankOccupancy(level: CanonicalOccupancyLevel): number {
  if (level === "ACTIVE") return 2;
  if (level === "MONITORING") return 1;
  return 0;
}

export function maxOccupancy(...levels: CanonicalOccupancyLevel[]): CanonicalOccupancyLevel {
  return levels.reduce((best, row) => (rankOccupancy(row) > rankOccupancy(best) ? row : best), "IDLE");
}

export function occupancySummary(occupancy: Pick<CanonicalPublicOccupancy, "departments" | "sales_rooms">): CanonicalOccupancyLevel {
  return maxOccupancy(...PUBLIC_DEPARTMENT_IDS.map((id) => occupancy.departments[id]), ...PUBLIC_SALES_ROOM_IDS.map((id) => occupancy.sales_rooms[id]));
}

export function agentsFromDepartments(departments: Record<PublicDepartmentId, CanonicalOccupancyLevel>): Record<string, CanonicalOccupancyLevel> {
  return Object.fromEntries(PUBLIC_OCCUPANCY_AGENT_IDS.map((id) => [id, departments[AGENT_DEPARTMENT[id]]]));
}

export function isCanonicalPublicOccupancy(value: unknown): value is CanonicalPublicOccupancy {
  if (!value || typeof value !== "object") return false;
  const row = value as CanonicalPublicOccupancy;
  return row.contract === CANONICAL_PUBLIC_OCCUPANCY && row.version === CANONICAL_PUBLIC_OCCUPANCY_VERSION;
}
