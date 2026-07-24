export const ALLOCATION_TYPES = [
  "research",
  "validation",
  "initiative",
  "build",
  "acquisition",
  "growth",
  "optimization",
  "recovery",
  "other",
] as const;

export const ALLOCATION_STATUSES = [
  "proposed",
  "policy_blocked",
  "awaiting_approval",
  "approved",
  "partially_approved",
  "rejected",
  "reserved",
  "consumed",
  "released",
  "expired",
  "cancelled",
] as const;

export const RESOURCE_TYPES = [
  "capital",
  "compute_budget",
  "api_budget",
  "worker_hours",
  "build_slots",
  "validation_slots",
  "research_slots",
  "deployment_slots",
  "other",
] as const;

export const RESERVATION_STATUSES = [
  "reserved",
  "consumed",
  "released",
  "expired",
  "cancelled",
] as const;

export const DEFAULT_RESOURCE_POOLS = [
  { resourceType: "research_slots", name: "Research capacity", totalCapacity: 0 },
  { resourceType: "validation_slots", name: "Validation capacity", totalCapacity: 0 },
  { resourceType: "build_slots", name: "Build capacity", totalCapacity: 0 },
  { resourceType: "capital", name: "Capital reserve", totalCapacity: 0, currency: "USD" },
] as const;

export function isAllocationType(value: string): boolean {
  return (ALLOCATION_TYPES as readonly string[]).includes(value);
}

export function isAllocationStatus(value: string): boolean {
  return (ALLOCATION_STATUSES as readonly string[]).includes(value);
}
