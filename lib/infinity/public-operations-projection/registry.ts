import { ASKREVIEW_VENTURE_ID, ASKREVIEW_CANDIDATE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { CRE_VENTURE_ID, OCCUPANCYNPV_DOMAIN } from "@/lib/infinity/venture-operating-scale/constants";
import type { PublicProjectionFieldSpec, PublicVentureVisibility } from "./types";

export const PUBLIC_OPERATIONS_FIELD_REGISTRY: PublicProjectionFieldSpec[] = [
  { field: "contract", source_class: "CONST", sanitization_rule: "LITERAL", aggregation_rule: "NONE", public_sensitivity: "PUBLIC_SAFE", fallback: "PublicOperationsProjection" },
  { field: "projection_version", source_class: "CONST", sanitization_rule: "LITERAL", aggregation_rule: "NONE", public_sensitivity: "PUBLIC_SAFE", fallback: "public-operations-projection-v1" },
  { field: "generated_at", source_class: "CLOCK", sanitization_rule: "ISO_TIMESTAMP", aggregation_rule: "NONE", public_sensitivity: "PUBLIC_SAFE", fallback: "NOW" },
  { field: "system_status", source_class: "LOOP_STATE", sanitization_rule: "MAP_COARSE_STATUS", aggregation_rule: "NONE", public_sensitivity: "PUBLIC_SAFE", fallback: "TEMPORARILY_UNAVAILABLE" },
  { field: "autonomous_mode", source_class: "LOOP_STATE", sanitization_rule: "MAP_AUTONOMOUS_MODE", aggregation_rule: "NONE", public_sensitivity: "PUBLIC_SAFE", fallback: "OBSERVING" },
  { field: "public_activity_summary", source_class: "LOOP_STATE", sanitization_rule: "MAP_ACTIVITY_LEVEL", aggregation_rule: "NONE", public_sensitivity: "PUBLIC_SAFE", fallback: "UPDATING" },
  { field: "public_activity_reason", source_class: "LOOP_DECISION", sanitization_rule: "GENERIC_ACTIVITY_CATEGORY", aggregation_rule: "NONE", public_sensitivity: "PUBLIC_SAFE", fallback: "Updating public operations" },
  { field: "active_public_agents", source_class: "LOOP_STATE", sanitization_rule: "ACTIVE_ONLY", aggregation_rule: "COUNT_ACTIVE_ROLES", public_sensitivity: "PUBLIC_AGGREGATED", fallback: "UNKNOWN" },
  { field: "idle_public_agents", source_class: "LOOP_STATE", sanitization_rule: "IDLE_ONLY", aggregation_rule: "COUNT_IDLE_ROLES", public_sensitivity: "PUBLIC_AGGREGATED", fallback: "UNKNOWN" },
  { field: "public_departments", source_class: "LOOP_STATE", sanitization_rule: "DEPARTMENT_ALLOWLIST", aggregation_rule: "FIXED_SET", public_sensitivity: "PUBLIC_SAFE", fallback: "IDLE_SET" },
  { field: "public_agents", source_class: "LOOP_STATE", sanitization_rule: "AGENT_ALLOWLIST", aggregation_rule: "FIXED_ROLES", public_sensitivity: "PUBLIC_SAFE", fallback: "IDLE_ROLES" },
  { field: "ventures_started_count", source_class: "VENTURE_RECORDS", sanitization_rule: "STARTED_RULE", aggregation_rule: "COUNT_STARTED", public_sensitivity: "PUBLIC_AGGREGATED", fallback: "UNKNOWN" },
  { field: "ventures_operating_count", source_class: "VENTURE_RECORDS", sanitization_rule: "OPERATING_RULE", aggregation_rule: "COUNT_OPERATING", public_sensitivity: "PUBLIC_AGGREGATED", fallback: "UNKNOWN" },
  { field: "public_ventures_count", source_class: "VISIBILITY_POLICY", sanitization_rule: "NON_HIDDEN", aggregation_rule: "COUNT_VISIBLE", public_sensitivity: "PUBLIC_AGGREGATED", fallback: "UNKNOWN" },
  { field: "missions_completed_count", source_class: "CANONICAL_WORK", sanitization_rule: "COMPLETED_NON_FIXTURE", aggregation_rule: "COUNT_COMPLETED", public_sensitivity: "PUBLIC_AGGREGATED", fallback: "UNKNOWN" },
  { field: "autonomous_operating_hours", source_class: "CANONICAL_WORK", sanitization_rule: "HOURS_SINCE_LOOP_ENABLED", aggregation_rule: "ELAPSED_HOURS", public_sensitivity: "PUBLIC_AGGREGATED", fallback: "UNKNOWN" },
  { field: "autonomous_operating_hours_label", source_class: "CONST", sanitization_rule: "LITERAL", aggregation_rule: "NONE", public_sensitivity: "PUBLIC_SAFE", fallback: "Hours since autonomous operations enabled" },
  { field: "deployments_completed_count", source_class: "CANONICAL_WORK", sanitization_rule: "COMPLETED_DEPLOYMENT", aggregation_rule: "COUNT_DEPLOYMENT", public_sensitivity: "PUBLIC_AGGREGATED", fallback: "UNKNOWN" },
  { field: "public_assets_created_count", source_class: "CANONICAL_WORK", sanitization_rule: "COMPLETED_BUILD", aggregation_rule: "COUNT_BUILD", public_sensitivity: "PUBLIC_AGGREGATED", fallback: "UNKNOWN" },
  { field: "research_cycles_completed_count", source_class: "CANONICAL_WORK", sanitization_rule: "COMPLETED_RESEARCH", aggregation_rule: "COUNT_RESEARCH", public_sensitivity: "PUBLIC_AGGREGATED", fallback: "UNKNOWN" },
  { field: "last_public_activity_at", source_class: "LOOP_STATE", sanitization_rule: "ISO_TIMESTAMP", aggregation_rule: "NONE", public_sensitivity: "PUBLIC_SAFE", fallback: "null" },
  { field: "public_ventures", source_class: "VISIBILITY_POLICY", sanitization_rule: "VISIBILITY_MODE_FIELDS", aggregation_rule: "FILTER_HIDDEN", public_sensitivity: "PUBLIC_SAFE", fallback: "[]" },
  { field: "stats", source_class: "COUNTERS", sanitization_rule: "APPROVED_STAT_KEYS", aggregation_rule: "COPY_COUNTS", public_sensitivity: "PUBLIC_AGGREGATED", fallback: "[]" },
];

export const PUBLIC_OPERATIONS_FIELD_ALLOWLIST = PUBLIC_OPERATIONS_FIELD_REGISTRY.map((row) => row.field);

export const DEFAULT_PUBLIC_VENTURE_VISIBILITY: PublicVentureVisibility = "HIDDEN";

export type PublicVentureAllowlistEntry = {
  match: (ventureId: string, name: string) => boolean;
  visibility: PublicVentureVisibility;
  public_name: string;
  public_url?: string;
  status_label: string;
  category?: string;
  sanitized_description?: string;
};

export const ASKREVIEW_PUBLIC_VISIBILITY: PublicVentureVisibility = "HIDDEN";

export const OCCUPANCYNPV_PUBLIC_ALLOWLIST: PublicVentureAllowlistEntry = {
  match: (ventureId, name) => {
    const id = ventureId.toLowerCase();
    const label = name.toLowerCase();
    return (
      id === CRE_VENTURE_ID.toLowerCase()
      || id === "occupancynpv"
      || id.includes("7e7e924e-0741-4155-a729-8d529da77ea9")
      || label === "occupancynpv"
      || label.includes(OCCUPANCYNPV_DOMAIN)
    );
  },
  visibility: "PUBLIC_STATS",
  public_name: "OccupancyNPV",
  public_url: "https://occupancynpv.com",
  status_label: "Live",
  category: "Commercial real estate",
  sanitized_description: "Lease-scenario analysis for commercial real estate teams",
};

export function isAskReviewIdentity(ventureId: string, name = ""): boolean {
  const id = ventureId.toLowerCase();
  const label = name.toLowerCase();
  return (
    id === ASKREVIEW_VENTURE_ID.toLowerCase()
    || id === ASKREVIEW_CANDIDATE_ID.toLowerCase()
    || id.includes("f1336945-3350-4d08-921e-4dcb5bc77b8e")
    || label.includes("askreview")
  );
}

export const PUBLIC_VENTURE_VISIBILITY_POLICY: PublicVentureAllowlistEntry[] = [
  {
    match: isAskReviewIdentity,
    visibility: ASKREVIEW_PUBLIC_VISIBILITY,
    public_name: "HIDDEN",
    status_label: "HIDDEN",
  },
  OCCUPANCYNPV_PUBLIC_ALLOWLIST,
];

export const AUTONOMOUS_HOURS_DEFINITION =
  "Elapsed whole hours since Autonomous Daily Operating Loop V1 was marked COMPLETED (autonomous mode enabled). Not process uptime and not a fabricated availability metric.";

export const VENTURES_STARTED_DEFINITION =
  "Count of valid canonical venture operational records that are not archived, not fixture/test ventures, and not research-only opportunities. Paused selected ventures count as started. Rejected or duplicate candidates without an operational record do not.";

export const VENTURES_OPERATING_DEFINITION =
  "Count of started ventures currently in an operating lifecycle (PUBLICLY_LAUNCHED, OPERATING, or SCALING) that are not paused, rejected, or shut down.";

export const MISSIONS_COMPLETED_DEFINITION =
  "Count of canonical work rows with status COMPLETED that are not identifiable test, fixture, debug, or QC-synthetic missions.";
