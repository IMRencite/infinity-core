import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { durableLocalPersistEnabled } from "@/lib/infinity/hq-production-deployment/ephemeral-fs";
import { composeOccupancynpvPaymentReactivationFiles } from "./occupancynpv-payment-reactivation-surface";

export const OCCUPANCYNPV_ARTIFACT_LINEAGE_PATH =
  ".infinity/venture-operating-scale/occupancynpv-artifact-lineage.json" as const;

export const OCCUPANCYNPV_PACKAGE_ARTIFACT_ID = "art_5eb5eeb74bfd2a300b85" as const;
export const OCCUPANCYNPV_CURRENT_DIGEST =
  "9fdde8037346ed084c2effa436c6d87582c5aa792267b4e49b1e798c784e0eaa" as const;
export const OCCUPANCYNPV_CURRENT_DEPLOYMENT = "dpl_EJz4Awry75nD7HyXaDTrLqu86JYe" as const;
export const OCCUPANCYNPV_PREVIOUS_DIGEST =
  "0d050ae0f4bee3ac6d054efe6658982c8e5f080f282ea3476ae2bb05852944f4" as const;
export const OCCUPANCYNPV_PREVIOUS_DEPLOYMENT = "dpl_H2t9jNDBnN5ZpoPhHyb1qSGtkvaD" as const;

export type OccupancynpvArtifactLineage = {
  finding: "B";
  explanation: "premiumAuthorityArtifactIdFor hashes planId+packageId+version+contract, not file contents. The same package-derived artifact ID can therefore label multiple digests. Immutable production identity is digest + deployment_id.";
  packageDerivedArtifactId: typeof OCCUPANCYNPV_PACKAGE_ARTIFACT_ID;
  immutableIdentity: "digest_plus_deployment";
  previous: { artifactId: string; digest: string; deploymentId: string };
  current: { artifactId: string; digest: string; deploymentId: string };
  composeDigestMatchesCurrent: boolean;
  repairRequired: false;
};

export function auditOccupancynpvArtifactLineage(): OccupancynpvArtifactLineage {
  const composed = composeOccupancynpvPaymentReactivationFiles();
  return {
    finding: "B",
    explanation: "premiumAuthorityArtifactIdFor hashes planId+packageId+version+contract, not file contents. The same package-derived artifact ID can therefore label multiple digests. Immutable production identity is digest + deployment_id.",
    packageDerivedArtifactId: OCCUPANCYNPV_PACKAGE_ARTIFACT_ID,
    immutableIdentity: "digest_plus_deployment",
    previous: {
      artifactId: OCCUPANCYNPV_PACKAGE_ARTIFACT_ID,
      digest: OCCUPANCYNPV_PREVIOUS_DIGEST,
      deploymentId: OCCUPANCYNPV_PREVIOUS_DEPLOYMENT,
    },
    current: {
      artifactId: composed.artifactId,
      digest: composed.digest,
      deploymentId: OCCUPANCYNPV_CURRENT_DEPLOYMENT,
    },
    composeDigestMatchesCurrent: composed.digest === OCCUPANCYNPV_CURRENT_DIGEST && composed.artifactId === OCCUPANCYNPV_PACKAGE_ARTIFACT_ID,
    repairRequired: false,
  };
}

export function persistOccupancynpvArtifactLineage(
  lineage: OccupancynpvArtifactLineage = auditOccupancynpvArtifactLineage(),
): OccupancynpvArtifactLineage {
  if (!durableLocalPersistEnabled()) return lineage;
  mkdirSync(dirname(OCCUPANCYNPV_ARTIFACT_LINEAGE_PATH), { recursive: true });
  writeFileSync(OCCUPANCYNPV_ARTIFACT_LINEAGE_PATH, `${JSON.stringify(lineage, null, 2)}\n`);
  return lineage;
}

export function readOccupancynpvArtifactLineage(): OccupancynpvArtifactLineage | null {
  if (!existsSync(OCCUPANCYNPV_ARTIFACT_LINEAGE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(OCCUPANCYNPV_ARTIFACT_LINEAGE_PATH, "utf8")) as OccupancynpvArtifactLineage;
  } catch {
    return null;
  }
}

export function occupancynpvCurrentProductionIdentity() {
  const lineage = readOccupancynpvArtifactLineage();
  return {
    artifactId: lineage?.current.artifactId ?? OCCUPANCYNPV_PACKAGE_ARTIFACT_ID,
    digest: lineage?.current.digest ?? OCCUPANCYNPV_CURRENT_DIGEST,
    deploymentId: lineage?.current.deploymentId ?? OCCUPANCYNPV_CURRENT_DEPLOYMENT,
  };
}
