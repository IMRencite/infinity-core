import { buildArtifactRenderId } from "@/lib/infinity/operator-console/artifacts/artifact-identity";
import type { HqArtifactState, HqArtifactType, HqRoomArtifactMap, HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import type { ProviderInventory, ProviderInventoryEntry } from "../probes/inventory";
import type { CommercialProviderVerification, ProviderCapabilityStatus } from "../probes/status";

export type ProviderHqDisplayStatus =
  | "NOT CONFIGURED"
  | "CONFIGURED UNVERIFIED"
  | "READ-ONLY VERIFIED"
  | "DEGRADED"
  | "STALE"
  | "FAILED";

function displayStatus(
  configured: ProviderInventoryEntry["configured"],
  verification?: CommercialProviderVerification | null,
): { display: ProviderHqDisplayStatus; readiness: ProviderCapabilityStatus; hqState: HqArtifactState } {
  if (configured !== "CONFIGURED") {
    return { display: "NOT CONFIGURED", readiness: "NOT_CONFIGURED", hqState: "ARCHIVED" };
  }
  if (!verification) {
    return { display: "CONFIGURED UNVERIFIED", readiness: "CONFIGURED_UNVERIFIED", hqState: "CREATING" };
  }
  if (verification.freshness === "VERIFIED_STALE") {
    return { display: "STALE", readiness: verification.status, hqState: "CREATING" };
  }
  if (verification.status === "READ_ONLY_VERIFIED") {
    return { display: "READ-ONLY VERIFIED", readiness: "READ_ONLY_VERIFIED", hqState: "READY" };
  }
  if (verification.status === "DEGRADED") {
    return { display: "DEGRADED", readiness: "DEGRADED", hqState: "CREATING" };
  }
  if (verification.status === "FAILED" || verification.status === "UNAVAILABLE") {
    return { display: "FAILED", readiness: verification.status, hqState: "FAILED" };
  }
  return { display: "CONFIGURED UNVERIFIED", readiness: "CONFIGURED_UNVERIFIED", hqState: "CREATING" };
}

function readinessArtifact(input: {
  id: string;
  roomId: DepartmentId;
  artifactType: HqArtifactType;
  title: string;
  entry: ProviderInventoryEntry;
  verification?: CommercialProviderVerification | null;
}): HqWorkArtifact {
  const status = displayStatus(input.entry.configured, input.verification ?? null);
  return {
    id: buildArtifactRenderId({
      artifactType: input.artifactType,
      sourceRecordType: "provider_readiness",
      sourceRecordId: input.id,
    }),
    roomId: input.roomId,
    artifactType: input.artifactType,
    title: input.title,
    subtitle: `${status.display} · PURCHASE AUTHORITY LOCKED`,
    state: status.hqState,
    createdAt: input.verification?.completedAt ?? null,
    sourceRecordType: "provider_readiness",
    sourceRecordId: input.verification?.id ?? input.id,
    metadata: {
      provider: input.entry.providerName,
      providerKey: input.entry.providerKey,
      environment: input.entry.environment,
      configured: input.entry.configured,
      credentialPresence: input.entry.credentialPresence,
      mode: "READ_ONLY",
      readiness: status.readiness,
      displayStatus: status.display,
      mutationAuthority: "LOCKED",
      engineStatus: "ENGINE VERIFIED",
      capabilities: input.entry.readCapabilities.join(","),
      writeCapabilities: input.entry.writeCapabilities.join(","),
      liveProbeSupport: input.entry.liveProbeSupport,
      readOnlyEnforceable: true,
      verificationId: input.verification?.id ?? null,
      freshness: input.verification?.freshness ?? "NOT_VERIFIED",
      verifiedAt: input.verification?.completedAt ?? null,
      failureCode: input.verification?.failureCode ?? null,
      blockingReason: status.readiness === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : "MUTATION_NOT_AUTHORIZED",
    },
  };
}

export function buildProviderReadinessArtifacts(
  inventory: ProviderInventory,
  verifications: CommercialProviderVerification[] = [],
): HqRoomArtifactMap {
  const byCategory = new Map(verifications.map((item) => [item.providerCategory, item]));
  const map: HqRoomArtifactMap = {};

  map.launch_operations = [
    readinessArtifact({
      id: "registrar",
      roomId: "launch_operations",
      artifactType: "commercial_domain",
      title: "Registrar",
      entry: inventory.registrar,
      verification: byCategory.get("REGISTRAR"),
    }),
    readinessArtifact({
      id: "dns",
      roomId: "launch_operations",
      artifactType: "commercial_dns",
      title: "DNS",
      entry: inventory.dns,
      verification: byCategory.get("DNS"),
    }),
    readinessArtifact({
      id: "hosting",
      roomId: "launch_operations",
      artifactType: "deployment",
      title: "Hosting",
      entry: inventory.hosting,
      verification: byCategory.get("HOSTING"),
    }),
  ];

  map.strategy_finance = [
    readinessArtifact({
      id: "payments",
      roomId: "strategy_finance",
      artifactType: "commercial_payment",
      title: "Payments",
      entry: inventory.payments,
      verification: byCategory.get("PAYMENTS"),
    }),
  ];

  return map;
}

export function providerReadinessArtifacts(map: HqRoomArtifactMap | undefined): HqWorkArtifact[] {
  return Object.values(map ?? {})
    .flat()
    .filter((artifact) => artifact.sourceRecordType === "provider_readiness");
}
