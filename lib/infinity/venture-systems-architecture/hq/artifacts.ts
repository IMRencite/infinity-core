import { buildArtifactRenderId } from "@/lib/infinity/operator-console/artifacts/artifact-identity";
import type { HqRoomArtifactMap, HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import type { SystemsArchitectHqView } from "./hq-view";

export const SYSTEMS_ARCHITECT_ROOM_ID = "systems_architect" as const;

function push(map: HqRoomArtifactMap, artifact: HqWorkArtifact): void {
  const roomId = artifact.roomId;
  if (!map[roomId]) map[roomId] = [];
  map[roomId]!.push(artifact);
}

export function buildSystemsArchitectArtifacts(view: SystemsArchitectHqView, ventureId: string | null): HqRoomArtifactMap {
  const map: HqRoomArtifactMap = {};
  push(map, {
    id: buildArtifactRenderId({
      artifactType: "systems_blueprint",
      sourceRecordType: "systems_blueprint",
      sourceRecordId: ventureId ?? "unbound",
    }),
    roomId: SYSTEMS_ARCHITECT_ROOM_ID,
    artifactType: "systems_blueprint",
    title: `${view.businessModelLabel} operating blueprint`,
    subtitle: `${view.requiredCount} required systems · tenancy ${view.tenancyLabel}`,
    state: view.evidenceGrounded ? "READY" : "ARCHIVED",
    createdAt: null,
    sourceRecordType: "systems_blueprint",
    sourceRecordId: ventureId ?? "unbound",
    metadata: {
      businessModel: view.businessModel,
      paymentArchitecture: view.paymentArchitecture,
      tenancy: view.tenancy,
      requiredCount: view.requiredCount,
      deferredCount: view.deferredCount,
      procurement: view.procurementSummary,
      recurringCost: view.estimatedRecurringCostDisplay,
      liveProvisioningAuthority: false,
      livePurchaseAuthority: false,
      writeReady: false,
      modeledNotPurchased: true,
    },
  });
  return map;
}
