import { canonicalizeInspectionRef } from "@/lib/infinity/hq-inspection-identity/aliases";
import { rejectHarnessArchitectureId } from "@/lib/infinity/venture-systems-architecture/hq/identity-guards";
import type { HqInspectionRef } from "./inspection-model";

export type { HqInspectionRef };

export function inspectionRefFromVentureId(value: string | null | undefined): HqInspectionRef | null {
  const entityId = rejectHarnessArchitectureId(value);
  if (!entityId) return null;
  return canonicalizeInspectionRef({ entityType: "VENTURE", entityId }) ?? { entityType: "VENTURE", entityId };
}
