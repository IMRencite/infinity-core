import { buildArtifactRenderId } from "@/lib/infinity/operator-console/artifacts/artifact-identity";
import type { HqRoomArtifactMap, HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import { formatCapabilityCard } from "./projection";
import type { CanonicalCapabilityProjection, CapabilityId } from "./types";

const CARD_MAP: Array<{ id: CapabilityId; title: string; roomId: DepartmentId; artifactType: HqWorkArtifact["artifactType"] }> = [
  { id: "DOMAIN_REGISTRAR", title: "Registrar", roomId: "launch_operations", artifactType: "commercial_domain" },
  { id: "DNS", title: "DNS", roomId: "launch_operations", artifactType: "commercial_dns" },
  { id: "HOSTING", title: "Hosting", roomId: "launch_operations", artifactType: "deployment" },
  { id: "PAYMENTS", title: "Payments", roomId: "strategy_finance", artifactType: "commercial_payment" },
];

export function buildCapabilityReadinessArtifacts(projection: CanonicalCapabilityProjection): HqRoomArtifactMap {
  const map: HqRoomArtifactMap = {};
  for (const card of CARD_MAP) {
    const row = projection.capabilities.find((item) => item.capability_id === card.id);
    if (!row) continue;
    const display = formatCapabilityCard(row);
    const artifact: HqWorkArtifact = {
      id: buildArtifactRenderId({
        artifactType: card.artifactType,
        sourceRecordType: "provider_readiness",
        sourceRecordId: card.id.toLowerCase(),
      }),
      roomId: card.roomId,
      artifactType: card.artifactType,
      title: card.title,
      subtitle: `${display.status} · ${display.detail}`,
      state: row.value === "FAILED" || row.value === "BLOCKED" ? "FAILED" : row.available ? "READY" : "CREATING",
      createdAt: row.last_verified_at,
      sourceRecordType: "provider_readiness",
      sourceRecordId: card.id.toLowerCase(),
      metadata: {
        provider: row.provider,
        displayStatus: display.status,
        mutationAuthority: row.mutation_authority,
        scope: row.scope,
        freshness: row.freshness,
        verificationStatus: row.verification_status,
        verificationSource: row.verification_source,
        lastVerifiedAt: row.last_verified_at,
        value: row.value,
        configured: row.configured,
        connected: row.connected,
        available: row.available,
        blockingReason: row.mutation_authority === "LOCKED" ? "MUTATION_NOT_AUTHORIZED" : null,
      },
    };
    map[card.roomId] = [...(map[card.roomId] ?? []), artifact];
  }
  return map;
}

export function replaceProviderReadinessArtifacts(
  base: HqRoomArtifactMap | undefined,
  next: HqRoomArtifactMap,
): HqRoomArtifactMap {
  const out: HqRoomArtifactMap = {};
  for (const [room, artifacts] of Object.entries(base ?? {})) {
    out[room as DepartmentId] = (artifacts ?? []).filter((item) => item.sourceRecordType !== "provider_readiness");
  }
  for (const [room, artifacts] of Object.entries(next)) {
    const key = room as DepartmentId;
    out[key] = [...(out[key] ?? []), ...(artifacts ?? [])];
  }
  return out;
}
