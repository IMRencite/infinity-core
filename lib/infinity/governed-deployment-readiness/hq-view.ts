import type { GovernedDeploymentHqView, GovernedDeploymentReadiness } from "./types";

export function toGovernedDeploymentHqView(readiness: GovernedDeploymentReadiness): GovernedDeploymentHqView {
  return {
    deploymentReadiness: readiness.readyForDeploymentExecution ? "READY" : "BLOCKED",
    technical: readiness.technicalReadiness === "SATISFIED" ? "PASS" : "FAIL",
    artifacts: readiness.artifactReadiness === "SATISFIED" ? "PASS" : "FAIL",
    providerWrites: readiness.providerRows.every((row) => row.blockingState === "NOT_REQUIRED" || row.writeAuthorityGranted)
      ? "GRANTED"
      : readiness.providerRows.some((row) => row.blockingState !== "NOT_REQUIRED")
        ? "MISSING"
        : "NOT_REQUIRED",
    budget:
      readiness.treasuryReadiness.status === "NOT_REQUIRED"
        ? "NOT_REQUIRED"
        : readiness.treasuryReadiness.status === "SATISFIED"
          ? "READY"
          : readiness.treasuryReadiness.status === "UNKNOWN_COST"
            ? "UNKNOWN"
            : "MISSING",
    domain: !readiness.domainReadiness.domainRequired
      ? "NOT_REQUIRED"
      : readiness.domainReadiness.alreadyOwned
        ? "OWNED"
        : readiness.domainReadiness.status === "MISSING"
          ? "MISSING"
          : "REQUIRED",
    dns: readiness.dnsReadiness.status === "NOT_REQUIRED"
      ? "NOT_REQUIRED"
      : readiness.dnsReadiness.writeAuthorityGranted
        ? "WRITE_READY"
        : readiness.dnsReadiness.readOnlyOnly
          ? "READ_ONLY_ONLY"
          : "MISSING",
    deploymentAuthority: readiness.deploymentAuthorityGranted ? "GRANTED" : "NONE",
    publicLaunchAuthority: readiness.publicLaunchAuthorityGranted ? "GRANTED" : "NONE",
  };
}
