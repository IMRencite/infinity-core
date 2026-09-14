import type { DepartmentId } from "./types";

export type HqInspectionEntityType = "OPPORTUNITY_CANDIDATE" | "VENTURE";

export type HqInspectionRef = {
  entityType: HqInspectionEntityType;
  entityId: string;
};

export type HqInspectionContext = {
  status: "ACTIVE" | "UNAVAILABLE" | "NONE";
  entityType: HqInspectionEntityType | null;
  entityId: string | null;
  displayName: string | null;
  origin: string | null;
  stage: string | null;
  source: "EXPLICIT" | "VENTURE" | "CYCLE_SELECTED" | "NONE";
  explicit: boolean;
};

export const INSPECTION_QUERY_PARAM = "inspect";

export const OPPORTUNITY_INSPECTION_ROOMS: readonly DepartmentId[] = [
  "opportunity_lab",
  "research_department",
  "strategy_finance",
  "quality_control",
  "systems_architect",
] as const;

export const HQ_INSPECTION_WRITE_BOUNDARY = {
  validationWrites: 0,
  selectionWrites: 0,
  missionCreation: 0,
  treasuryMovements: 0,
  providerWrites: 0,
  eagActions: 0,
  buildAuthorizations: 0,
  deploymentActions: 0,
} as const;

export const EMPTY_INSPECTION_CONTEXT: HqInspectionContext = {
  status: "NONE",
  entityType: null,
  entityId: null,
  displayName: null,
  origin: null,
  stage: null,
  source: "NONE",
  explicit: false,
};

export function parseInspectionQuery(value: string | null | undefined): HqInspectionRef | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const separator = trimmed.indexOf(":");
  if (separator <= 0) return null;
  const rawType = trimmed.slice(0, separator).trim().toLowerCase();
  const entityId = trimmed.slice(separator + 1).trim();
  if (!entityId) return null;
  if (rawType === "opportunity_candidate") return { entityType: "OPPORTUNITY_CANDIDATE", entityId };
  if (rawType === "venture") return { entityType: "VENTURE", entityId };
  return null;
}

export function formatInspectionQuery(ref: HqInspectionRef): string {
  const type = ref.entityType === "VENTURE" ? "venture" : "opportunity_candidate";
  return `${type}:${ref.entityId}`;
}

export function hqDashboardInspectionPath(ref: HqInspectionRef): string {
  return `/dashboard?${INSPECTION_QUERY_PARAM}=${encodeURIComponent(formatInspectionQuery(ref))}`;
}
