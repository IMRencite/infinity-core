import type { GovernedDeploymentReadiness, GovernedDeploymentReadinessInput, DeploymentReadinessBlocker } from "./types";

function fail(blockers: DeploymentReadinessBlocker[], blocker: DeploymentReadinessBlocker): void {
  blockers.push(blocker);
}

export function validateGovernedDeploymentReadiness(
  readiness: GovernedDeploymentReadiness,
  input: GovernedDeploymentReadinessInput,
): GovernedDeploymentReadiness {
  const blockers: DeploymentReadinessBlocker[] = [];
  const warnings: DeploymentReadinessBlocker[] = [];

  if (!input.handoff) {
    fail(blockers, { code: "DEPLOYMENT_HANDOFF_NOT_VERIFIED", message: "ProductionArtifactHandoff is missing." });
  } else if (input.handoff.readiness !== "READY_FOR_COMMERCIALIZATION_REVIEW" || input.handoff.buildVerification.status !== "PASS" || input.handoff.testVerification.status !== "PASS") {
    fail(blockers, { code: "DEPLOYMENT_HANDOFF_NOT_VERIFIED", message: "ProductionArtifactHandoff is not technically verified." });
  }

  if (input.expectedVentureId && readiness.ventureId !== input.expectedVentureId) {
    fail(blockers, { code: "DEPLOYMENT_LINEAGE_MISMATCH", message: "Readiness ventureId does not match the expected venture." });
  }
  if (input.expectedHandoffId && readiness.productionArtifactHandoffId !== input.expectedHandoffId) {
    fail(blockers, { code: "DEPLOYMENT_LINEAGE_MISMATCH", message: "Readiness handoff lineage does not match the expected handoff." });
  }
  if (input.expectedBuildContractId && readiness.buildContractId && readiness.buildContractId !== input.expectedBuildContractId) {
    fail(blockers, { code: "DEPLOYMENT_LINEAGE_MISMATCH", message: "Readiness build-contract lineage does not match." });
  }
  if (input.handoff && readiness.traceability.ventureId !== input.handoff.ventureId) {
    fail(blockers, { code: "DEPLOYMENT_LINEAGE_MISMATCH", message: "Traceability ventureId does not match the handoff." });
  }

  if (readiness.runtimeReadiness === "MISSING") {
    fail(blockers, { code: "DEPLOYMENT_RUNTIME_UNRESOLVED", message: "Required runtime requirements are unresolved." });
  }

  if (readiness.securityComplianceReadiness === "BLOCKED") {
    fail(blockers, { code: "DEPLOYMENT_COMPLIANCE_BLOCKED", message: "Unresolved security or compliance requirement blocks deployment readiness." });
  }

  if (readiness.databaseReadiness.required && readiness.databaseReadiness.status !== "SATISFIED") {
    fail(blockers, { code: "DEPLOYMENT_MIGRATION_NOT_READY", message: "Required production migrations are missing or unverified as present." });
    fail(blockers, { code: "DEPLOYMENT_DATABASE_NOT_READY", message: "Database readiness is missing." });
  }

  if (readiness.paymentReadiness.required && readiness.paymentReadiness.status !== "SATISFIED") {
    fail(blockers, { code: "DEPLOYMENT_PAYMENT_NOT_READY", message: "Payment Architecture write readiness is not satisfied." });
  }

  if (readiness.domainReadiness.domainRequired && readiness.domainReadiness.status === "MISSING") {
    fail(blockers, { code: "DEPLOYMENT_DOMAIN_MISSING", message: "A domain is required and no owned or evidenced domain is present." });
  }

  if (readiness.dnsReadiness.status === "READ_ONLY_ONLY") {
    fail(blockers, { code: "DEPLOYMENT_DNS_NOT_READY", message: "DNS is READ_ONLY_VERIFIED and does not satisfy write authority.", capability: "DNS" });
    fail(blockers, { code: "DEPLOYMENT_PROVIDER_READ_ONLY", message: "Cloudflare/DNS READ_ONLY_VERIFIED is not write authority.", capability: "DNS" });
  } else if (readiness.dnsReadiness.status === "MISSING" && input.handoff?.deploymentRequirements.dnsRequired) {
    fail(blockers, { code: "DEPLOYMENT_DNS_NOT_READY", message: "DNS write authority is missing.", capability: "DNS" });
  }

  if (readiness.hostingReadiness.status === "READ_ONLY_ONLY") {
    fail(blockers, { code: "DEPLOYMENT_HOSTING_NOT_READY", message: "Hosting is read-only verified and is not write-authorized.", capability: "HOSTING" });
    fail(blockers, { code: "DEPLOYMENT_PROVIDER_READ_ONLY", message: "Hosting READ_ONLY_VERIFIED is not deployment write authority.", capability: "HOSTING" });
  } else if (readiness.hostingReadiness.status !== "SATISFIED") {
    fail(blockers, { code: "DEPLOYMENT_HOSTING_NOT_READY", message: "Hosting write authority is missing.", capability: "HOSTING" });
  }

  for (const row of readiness.providerRows) {
    if (row.blockingState !== "NOT_REQUIRED" && row.cost.actuality === "UNKNOWN" && row.cost.value === 0) {
      fail(blockers, { code: "DEPLOYMENT_UNKNOWN_COST", message: `Unknown paid cost for ${row.capability} was treated as $0.`, capability: row.capability });
    }
    if (row.verificationState === "READ_ONLY_VERIFIED" && row.writeAuthorityGranted) {
      fail(blockers, { code: "DEPLOYMENT_PROVIDER_READ_ONLY", message: `READ_ONLY_VERIFIED ${row.capability} was treated as WRITE_AUTHORIZED.`, capability: row.capability });
    }
    if (row.verificationState === "READ_ONLY_VERIFIED" && !row.writeAuthorityGranted && row.capability === "REGISTRAR") {
      fail(blockers, { code: "DEPLOYMENT_PROVIDER_READ_ONLY", message: "Registrar READ_ONLY_VERIFIED does not satisfy domain purchase authority.", capability: "REGISTRAR" });
    }
    if (row.verificationState === "READ_ONLY_VERIFIED" && !row.writeAuthorityGranted && row.capability === "PAYMENTS") {
      fail(blockers, { code: "DEPLOYMENT_PROVIDER_READ_ONLY", message: "Payments READ_ONLY_VERIFIED does not satisfy payment configuration write authority.", capability: "PAYMENTS" });
    }
    if (!row.providerSelected && !row.providerAvailable && row.blockingState !== "NOT_REQUIRED" && row.capability !== "HOSTING") {
      fail(blockers, { code: "DEPLOYMENT_PROVIDER_MISSING", message: `Required provider capability ${row.capability} is not selected.`, capability: row.capability });
    }
    if (!row.credentialAvailable && row.blockingState !== "NOT_REQUIRED" && (row.credentialWriteCapable || row.writeAuthorityGranted || row.verificationState === "READ_ONLY_VERIFIED")) {
      fail(blockers, { code: "DEPLOYMENT_WRITE_CREDENTIAL_MISSING", message: `Write credential for ${row.capability} is missing.`, capability: row.capability });
    }
    if (!row.credentialWriteCapable && !row.writeAuthorityGranted && row.blockingState !== "NOT_REQUIRED" && row.verificationState !== "NONE") {
      fail(blockers, { code: "DEPLOYMENT_WRITE_CREDENTIAL_MISSING", message: `Write-capable credential for ${row.capability} is missing.`, capability: row.capability });
    }
    if (!row.writeAuthorityGranted && row.blockingState !== "NOT_REQUIRED") {
      fail(blockers, { code: "DEPLOYMENT_WRITE_AUTHORITY_MISSING", message: `Write authority for ${row.capability} is not granted.`, capability: row.capability });
    }
  }

  const paidRows = readiness.providerRows.filter(
    (row) =>
      row.blockingState !== "NOT_REQUIRED" &&
      (row.procurementRequired || (row.costKnown && (row.cost.value ?? 0) > 0) || row.cost.actuality === "UNKNOWN"),
  );
  if (readiness.treasuryReadiness.status === "UNKNOWN_COST" || paidRows.some((row) => row.cost.actuality === "UNKNOWN")) {
    fail(blockers, { code: "DEPLOYMENT_UNKNOWN_COST", message: "Paid deployment cost is unknown and must not be treated as zero." });
  }
  if (
    readiness.treasuryReadiness.status === "MISSING_BUDGET" ||
    (paidRows.length > 0 && (!input.treasury?.budgetKnown || input.treasury.budgetAvailableUsd == null))
  ) {
    fail(blockers, { code: "DEPLOYMENT_BUDGET_MISSING", message: "Authorized Treasury budget is missing for paid deployment resources." });
  }
  if (readiness.treasuryReadiness.status === "REQUIRES_PROCUREMENT" || paidRows.some((row) => row.procurementRequired && !input.treasury?.authorizedForPaidResources)) {
    fail(blockers, { code: "DEPLOYMENT_PROCUREMENT_REQUIRED", message: "Procurement is required before deployment execution." });
  }

  if (readiness.externalActionReadiness === "EAG_AUTHORIZATION_MISSING") {
    fail(blockers, { code: "DEPLOYMENT_WRITE_AUTHORITY_MISSING", message: "EAG authorization is missing for required external actions." });
  }

  if (readiness.rollbackReadiness === "MISSING") {
    fail(blockers, { code: "DEPLOYMENT_ROLLBACK_NOT_READY", message: "Rollback is required but no rollback strategy is represented." });
  }
  if (readiness.healthCheckReadiness === "MISSING") {
    fail(blockers, { code: "DEPLOYMENT_HEALTHCHECK_NOT_READY", message: "A health-check path is required and was not declared." });
  }

  const unique = new Map<string, DeploymentReadinessBlocker>();
  for (const blocker of blockers) {
    unique.set(`${blocker.code}:${blocker.capability ?? ""}:${blocker.identifier ?? ""}`, blocker);
  }
  const merged = [...unique.values()];
  const readOnlyBlocks = merged.some((item) => item.code === "DEPLOYMENT_PROVIDER_READ_ONLY");
  const authBlocks = merged.some((item) => item.code === "DEPLOYMENT_WRITE_AUTHORITY_MISSING" || item.code === "DEPLOYMENT_WRITE_CREDENTIAL_MISSING");
  const procurementBlocks = merged.some((item) => item.code === "DEPLOYMENT_PROCUREMENT_REQUIRED" || item.code === "DEPLOYMENT_DOMAIN_MISSING");
  const technicalOk = readiness.technicalReadiness === "SATISFIED" && !merged.some((item) => item.code === "DEPLOYMENT_HANDOFF_NOT_VERIFIED" || item.code === "DEPLOYMENT_LINEAGE_MISMATCH" || item.code === "DEPLOYMENT_COMPLIANCE_BLOCKED");

  const readyForExecution = merged.length === 0 && technicalOk;
  const state = readyForExecution
    ? "READY_FOR_DEPLOYMENT_EXECUTION"
    : technicalOk && (authBlocks || readOnlyBlocks)
      ? "REQUIRES_AUTHORIZATION"
      : technicalOk && procurementBlocks
        ? "REQUIRES_PROCUREMENT"
        : technicalOk
          ? "TECHNICALLY_READY"
          : "BLOCKED";

  if (readiness.deploymentAuthorityGranted && !input.deploymentAuthority?.authorizationId) {
    fail(warnings, { code: "DEPLOYMENT_WRITE_AUTHORITY_MISSING", message: "Deployment authority cannot be fabricated without a canonical grant." });
  }

  return {
    ...readiness,
    blockers: merged,
    warnings,
    state,
    readyForDeploymentExecution: readyForExecution,
    deploymentAuthorityGranted: Boolean(input.deploymentAuthority?.granted && input.deploymentAuthority.authorizationId),
    publicLaunchAuthorityGranted: Boolean(input.publicLaunchAuthority?.granted && input.publicLaunchAuthority.authorizationId),
    executionDraft: {
      ...readiness.executionDraft,
      executable: false,
    },
  };
}
