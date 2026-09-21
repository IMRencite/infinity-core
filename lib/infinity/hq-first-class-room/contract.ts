import type { DepartmentId } from "@/lib/infinity/operator-console/types";

export const HQ_FIRST_CLASS_ROOM_CONTRACT = "HQFirstClassRoomContract" as const;
export const HQ_FIRST_CLASS_ROOM_REGISTRATION_GATE = "HQFirstClassRoomRegistrationGate" as const;
export const HQ_ROOM_SNAPSHOT_ENRICHMENT_GATE = "HQRoomSnapshotEnrichmentGate" as const;
export const HQ_ROOM_PARITY_CONTRACT = "HQRoomParityContract" as const;
export const HQ_ROOM_WORKER_PRESENCE_GATE = "HQRoomWorkerPresenceGate" as const;
export const HQ_ROOM_ACTIVITY_CONSISTENCY_GATE = "HQRoomActivityConsistencyGate" as const;

export const HQ_FIRST_CLASS_ROOM_PRINCIPLE =
  "A FIRST-CLASS HQ ROOM MUST SATISFY ITS FULL METADATA AND PROJECTION CONTRACT BEFORE REGISTRATION." as const;

export const HQ_ROOM_REGISTRATION_ORDER_PRINCIPLE =
  "ROOM REGISTRATION MUST NOT PRECEDE REQUIRED PRESENTATION/ENRICHMENT DATA." as const;

export type HQFirstClassRoomHeadlines = {
  active: string;
  idle: string;
  complete: string;
  blocked: string;
  failed: string;
};

export const HQ_FIRST_CLASS_ROOM_REQUIRED_FIELDS = [
  "id",
  "name",
  "headline",
  "purpose",
  "route",
  "floorOrder",
  "floorPosition",
  "statusResolver",
  "currentWorkResolver",
  "workerSource",
  "outputHistorySource",
  "detailNavigation",
  "traceability",
] as const;

export type HQFirstClassRoomRequiredField = (typeof HQ_FIRST_CLASS_ROOM_REQUIRED_FIELDS)[number];

export type HQFirstClassRoomDefinition = {
  id: DepartmentId;
  name: string;
  headline: string;
  headlines: HQFirstClassRoomHeadlines;
  purpose: string;
  route: string;
  floorOrder: number;
  floorPosition: string;
  statusResolver: string;
  currentWorkResolver: string;
  workerSource: string;
  outputHistorySource: string;
  detailNavigation: string;
  traceability: string;
};

export type HQFirstClassRoomInput = Partial<HQFirstClassRoomDefinition> & {
  headlines?: Partial<HQFirstClassRoomHeadlines>;
};

export type NamedGateResult = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};

export function missingFirstClassRoomFields(input: HQFirstClassRoomInput): string[] {
  const missing: string[] = [];
  for (const field of HQ_FIRST_CLASS_ROOM_REQUIRED_FIELDS) {
    const value = input[field];
    if (field === "floorOrder") {
      if (typeof value !== "number" || !Number.isFinite(value)) missing.push(field);
      continue;
    }
    if (typeof value !== "string" || value.trim().length === 0) missing.push(field);
  }
  const headlines = input.headlines;
  for (const key of ["active", "idle", "complete", "blocked", "failed"] as const) {
    if (!headlines || typeof headlines[key] !== "string" || headlines[key].trim().length === 0) {
      missing.push(`headlines.${key}`);
    }
  }
  if (
    typeof input.headline === "string"
    && headlines
    && typeof headlines.active === "string"
    && input.headline.trim() !== headlines.active.trim()
  ) {
    missing.push("headline.mismatch");
  }
  return missing;
}
