import type { ArchitectureCost } from "@/lib/infinity/venture-systems-architecture/types";
import { resolveConnectWriteReadiness } from "@/lib/infinity/payment-architecture/readiness";
import type { ProductionArtifactHandoff } from "@/lib/infinity/production-artifact/handoff";
import {
  DEPLOYMENT_ACTION_TYPES,
  GOVERNED_DEPLOYMENT_READINESS_SCHEMA,
  GOVERNED_DEPLOYMENT_WRITE_BOUNDARY,
  type DeploymentActionType,
  type DeploymentProviderCapability,
} from "./constants";
import type {
  AuthorizationMatrixRow,
  DatabaseReadiness,
  DeploymentExecutionRequestDraft,
  DnsReadiness,
  DomainReadiness,
  GovernedDeploymentReadiness,
  GovernedDeploymentReadinessInput,
  HostingReadiness,
  PaymentReadiness,
  ProviderReadinessRow,
  TreasuryReadiness,
} from "./types";
import { validateGovernedDeploymentReadiness } from "./validate";

const unknownCost = (): ArchitectureCost => ({ value: null, actuality: "UNKNOWN", currency: "USD" });

function capabilityFromFamily(family: string): DeploymentProviderCapability | null {
  if (family === "PAYMENTS") return "PAYMENTS";
  if (family === "TRANSACTIONAL_EMAIL" || family === "MARKETING_EMAIL") return "EMAIL";
  if (family === "CRM") return "CRM";
  return null;
}

function paymentsRequired(handoff: ProductionArtifactHandoff | null): boolean {
  if (!handoff) return false;
  return (
    handoff.runtimeRequirements.some((item) => item.key === "payments" && item.required) ||
    handoff.externalDependencies.some((item) => item.capability === "PAYMENTS") ||
    Boolean(handoff.architectureCoverage.coverage && handoff.architectureCoverage.externalFamilies.includes("PAYMENTS"))
  );
}

function databaseRequired(handoff: ProductionArtifactHandoff | null): boolean {
  return Boolean(handoff?.deploymentRequirements.databaseRequired || handoff?.databaseRequirements.schemaRequired);
}

function buildProviderRows(input: GovernedDeploymentReadinessInput): ProviderReadinessRow[] {
  const byCapability = new Map<DeploymentProviderCapability, ProviderReadinessRow>();
  const handoff = input.handoff;
  const domainRequired = Boolean(handoff?.deploymentRequirements.domainRequired);
  const dnsRequired = Boolean(handoff?.deploymentRequirements.dnsRequired);
  const hostingRequired = true;

  const seed = (capability: DeploymentProviderCapability, required: boolean): ProviderReadinessRow => ({
    capability,
    providerSelected: false,
    verificationState: "NONE",
    providerAvailable: false,
    providerVerified: false,
    credentialAvailable: false,
    credentialWriteCapable: false,
    writeAuthorityGranted: false,
    tenancy: null,
    procurementRequired: false,
    cost: unknownCost(),
    costKnown: false,
    blockingState: required ? "MISSING" : "NOT_REQUIRED",
  });

  if (hostingRequired) byCapability.set("HOSTING", seed("HOSTING", true));
  if (dnsRequired) byCapability.set("DNS", seed("DNS", true));
  if (domainRequired) byCapability.set("REGISTRAR", seed("REGISTRAR", true));
  if (databaseRequired(handoff)) byCapability.set("DATABASE", seed("DATABASE", true));
  if (paymentsRequired(handoff)) byCapability.set("PAYMENTS", seed("PAYMENTS", true));

  for (const family of [
    ...handoff?.architectureCoverage.externalFamilies ?? [],
    ...handoff?.architectureCoverage.blockedFamilies ?? [],
    ...handoff?.architectureCoverage.deferredFamilies ?? [],
  ]) {
    const capability = capabilityFromFamily(family);
    if (capability && !byCapability.has(capability)) {
      byCapability.set(capability, seed(capability, true));
    }
  }
  for (const family of handoff?.architectureCoverage.internalFamilies ?? []) {
    const capability = capabilityFromFamily(family);
    if (!capability || byCapability.has(capability)) continue;
    const internal = seed(capability, false);
    internal.blockingState = "NOT_REQUIRED";
    byCapability.set(capability, internal);
  }

  for (const dep of handoff?.externalDependencies ?? []) {
    const capability = capabilityFromFamily(dep.capability);
    if (!capability) continue;
    const existing = byCapability.get(capability) ?? seed(capability, true);
    existing.providerSelected = dep.providerSelectionState === "CANDIDATE" || dep.providerSelectionState === "REQUIRED";
    existing.verificationState = dep.providerVerificationState === "READ_ONLY_VERIFIED" ? "READ_ONLY_VERIFIED" : dep.providerVerificationState === "FAILED" ? "FAILED" : "NONE";
    existing.providerAvailable = existing.providerSelected || existing.verificationState === "READ_ONLY_VERIFIED";
    existing.providerVerified = existing.verificationState === "READ_ONLY_VERIFIED";
    existing.credentialAvailable = dep.credentialState !== "REQUIRED_MISSING";
    existing.credentialWriteCapable = false;
    existing.writeAuthorityGranted = false;
    existing.tenancy = dep.tenancy;
    existing.procurementRequired = dep.procurementRequired;
    existing.cost = dep.cost;
    existing.costKnown = dep.costKnown;
    existing.blockingState = dep.blockingStatus === "NONE" && existing.providerSelected ? "REQUIRES_AUTHORIZATION" : dep.blockingStatus === "UNKNOWN_COST" ? "BLOCKED" : "REQUIRES_AUTHORIZATION";
    byCapability.set(capability, existing);
  }

  for (const evidence of input.providers ?? []) {
    const existing = byCapability.get(evidence.capability) ?? seed(evidence.capability, true);
    if (evidence.providerSelected != null) existing.providerSelected = evidence.providerSelected;
    if (evidence.verificationState) existing.verificationState = evidence.verificationState;
    if (evidence.credentialAvailable != null) existing.credentialAvailable = evidence.credentialAvailable;
    if (evidence.credentialWriteCapable != null) existing.credentialWriteCapable = evidence.credentialWriteCapable;
    if (evidence.writeAuthorityGranted != null) existing.writeAuthorityGranted = evidence.writeAuthorityGranted;
    if (evidence.tenancy !== undefined) existing.tenancy = evidence.tenancy ?? null;
    if (evidence.procurementRequired != null) existing.procurementRequired = evidence.procurementRequired;
    if (evidence.cost) {
      existing.cost = evidence.cost;
      existing.costKnown = evidence.cost.actuality !== "UNKNOWN" && evidence.cost.value != null;
    }
    existing.providerAvailable = existing.providerSelected || existing.verificationState === "READ_ONLY_VERIFIED";
    existing.providerVerified = existing.verificationState === "READ_ONLY_VERIFIED";
    if (existing.writeAuthorityGranted && existing.verificationState === "READ_ONLY_VERIFIED" && !existing.credentialWriteCapable) {
      existing.writeAuthorityGranted = false;
    }
    if (existing.verificationState === "READ_ONLY_VERIFIED" && !existing.writeAuthorityGranted) {
      existing.blockingState = "READ_ONLY_ONLY";
    }
    byCapability.set(evidence.capability, existing);
  }

  if (input.hosting) {
    const hosting = byCapability.get("HOSTING") ?? seed("HOSTING", true);
    if (input.hosting.providerSelected != null) hosting.providerSelected = input.hosting.providerSelected;
    if (input.hosting.writeAuthorityGranted != null) hosting.writeAuthorityGranted = input.hosting.writeAuthorityGranted;
    if (input.hosting.cost) {
      hosting.cost = input.hosting.cost;
      hosting.costKnown = input.hosting.cost.actuality !== "UNKNOWN" && input.hosting.cost.value != null;
    }
    hosting.providerAvailable = hosting.providerSelected || hosting.verificationState === "READ_ONLY_VERIFIED";
    if (hosting.writeAuthorityGranted && hosting.verificationState === "READ_ONLY_VERIFIED" && !hosting.credentialWriteCapable) {
      hosting.writeAuthorityGranted = false;
    }
    if (hosting.verificationState === "READ_ONLY_VERIFIED" && !hosting.writeAuthorityGranted) {
      hosting.blockingState = "READ_ONLY_ONLY";
    }
    byCapability.set("HOSTING", hosting);
  }

  if (input.domain?.owned) {
    const registrar = byCapability.get("REGISTRAR");
    if (registrar) {
      registrar.blockingState = "NOT_REQUIRED";
      registrar.procurementRequired = false;
    }
  }

  return [...byCapability.values()];
}

function buildTreasury(input: GovernedDeploymentReadinessInput, rows: ProviderReadinessRow[]): TreasuryReadiness {
  const relevant = rows.filter((row) => row.blockingState !== "NOT_REQUIRED");
  const paid = relevant.filter((row) => row.procurementRequired || (row.costKnown && (row.cost.value ?? 0) > 0) || (!row.costKnown && row.cost.actuality === "UNKNOWN"));
  if (paid.length === 0 && !relevant.some((row) => row.procurementRequired)) {
    const anyUnknown = relevant.some((row) => row.cost.actuality === "UNKNOWN" && row.cost.value === 0);
    if (!anyUnknown) {
      return {
        status: "NOT_REQUIRED",
        costKnown: true,
        expectedCostUsd: 0,
        oneTimeCostUsd: 0,
        recurringCostUsd: 0,
        budgetRequired: false,
        budgetAvailableUsd: input.treasury?.budgetAvailableUsd ?? null,
        reservationRequired: false,
        procurementRequired: false,
        renewalImplications: null,
      };
    }
  }
  const unknown = relevant.some((row) => !row.costKnown && (row.procurementRequired || row.cost.actuality === "UNKNOWN"));
  const treatedAsZero = relevant.some((row) => !row.costKnown && row.cost.actuality === "UNKNOWN" && row.cost.value === 0);
  const expected = relevant.reduce((sum, row) => sum + (row.costKnown ? row.cost.value ?? 0 : 0), 0);
  const procurementRequired = relevant.some((row) => row.procurementRequired);
  const budgetKnown = Boolean(input.treasury?.budgetKnown);
  const budgetAvailable = input.treasury?.budgetAvailableUsd ?? null;
  if (treatedAsZero || unknown) {
    return {
      status: "UNKNOWN_COST",
      costKnown: false,
      expectedCostUsd: null,
      oneTimeCostUsd: null,
      recurringCostUsd: null,
      budgetRequired: true,
      budgetAvailableUsd: budgetAvailable,
      reservationRequired: true,
      procurementRequired,
      renewalImplications: "Renewal cannot be evaluated while cost is unknown.",
    };
  }
  if (procurementRequired && !input.treasury?.authorizedForPaidResources) {
    return {
      status: "REQUIRES_PROCUREMENT",
      costKnown: true,
      expectedCostUsd: expected,
      oneTimeCostUsd: expected,
      recurringCostUsd: expected,
      budgetRequired: true,
      budgetAvailableUsd: budgetAvailable,
      reservationRequired: true,
      procurementRequired: true,
      renewalImplications: "Paid provider renewal remains a future Treasury decision.",
    };
  }
  if (!budgetKnown || budgetAvailable == null || (expected > 0 && budgetAvailable < expected)) {
    return {
      status: "MISSING_BUDGET",
      costKnown: true,
      expectedCostUsd: expected,
      oneTimeCostUsd: expected,
      recurringCostUsd: expected,
      budgetRequired: true,
      budgetAvailableUsd: budgetAvailable,
      reservationRequired: true,
      procurementRequired,
      renewalImplications: "Paid resources require an authorized venture budget.",
    };
  }
  if (!input.treasury?.reservationPresent && expected > 0) {
    return {
      status: "REQUIRES_RESERVATION",
      costKnown: true,
      expectedCostUsd: expected,
      oneTimeCostUsd: expected,
      recurringCostUsd: expected,
      budgetRequired: true,
      budgetAvailableUsd: budgetAvailable,
      reservationRequired: true,
      procurementRequired,
      renewalImplications: "Reservation is required before spend; this milestone does not reserve.",
    };
  }
  return {
    status: "SATISFIED",
    costKnown: true,
    expectedCostUsd: expected,
    oneTimeCostUsd: expected,
    recurringCostUsd: expected,
    budgetRequired: expected > 0,
    budgetAvailableUsd: budgetAvailable,
    reservationRequired: false,
    procurementRequired,
    renewalImplications: expected > 0 ? "Recurring provider cost remains descriptive only." : null,
  };
}

function buildDomain(input: GovernedDeploymentReadinessInput): DomainReadiness {
  const required = Boolean(input.handoff?.deploymentRequirements.domainRequired);
  if (!required) {
    return {
      status: "NOT_REQUIRED",
      domainRequired: false,
      alreadyOwned: false,
      selected: false,
      registrarKnown: false,
      purchaseRequired: false,
      renewalCostKnown: false,
      dnsProviderKnown: Boolean(input.dns?.providerKnown),
      writeAuthorityKnown: false,
      availabilityClaimedWithoutEvidence: false,
    };
  }
  const owned = Boolean(input.domain?.owned);
  const selected = Boolean(input.domain?.selected);
  const registrarKnown = Boolean(input.domain?.registrarKnown);
  const purchaseRequired = input.domain?.purchaseRequired ?? !owned;
  return {
    status: owned ? "SATISFIED" : selected || registrarKnown ? "REQUIRES_PROCUREMENT" : "MISSING",
    domainRequired: true,
    alreadyOwned: owned,
    selected,
    registrarKnown,
    purchaseRequired,
    renewalCostKnown: Boolean(input.domain?.renewalCostKnown),
    dnsProviderKnown: Boolean(input.dns?.providerKnown),
    writeAuthorityKnown: Boolean(input.dns?.writeAuthorityGranted),
    availabilityClaimedWithoutEvidence: false,
  };
}

function buildDns(input: GovernedDeploymentReadinessInput): DnsReadiness {
  const required = Boolean(input.handoff?.deploymentRequirements.dnsRequired);
  const writeAuthority = Boolean(input.dns?.writeAuthorityGranted);
  const readOnly = Boolean(input.providers?.some((item) => item.capability === "DNS" && item.verificationState === "READ_ONLY_VERIFIED") || input.dns?.zoneVerified);
  if (!required) {
    return {
      status: "NOT_REQUIRED",
      providerKnown: false,
      zoneExists: false,
      zoneVerified: false,
      writeCredentialAvailable: false,
      writeAuthorityGranted: false,
      requiredRecordsKnown: false,
      tlsDependency: Boolean(input.handoff?.deploymentRequirements.tlsRequired),
      readOnlyOnly: false,
    };
  }
  return {
    status: writeAuthority ? "SATISFIED" : readOnly ? "READ_ONLY_ONLY" : "MISSING",
    providerKnown: Boolean(input.dns?.providerKnown),
    zoneExists: Boolean(input.dns?.zoneExists),
    zoneVerified: Boolean(input.dns?.zoneVerified),
    writeCredentialAvailable: Boolean(input.dns?.writeCredentialAvailable),
    writeAuthorityGranted: writeAuthority,
    requiredRecordsKnown: Boolean(input.dns?.requiredRecordsKnown),
    tlsDependency: Boolean(input.handoff?.deploymentRequirements.tlsRequired),
    readOnlyOnly: readOnly && !writeAuthority,
  };
}

function buildHosting(input: GovernedDeploymentReadinessInput, rows: ProviderReadinessRow[]): HostingReadiness {
  const hosting = rows.find((row) => row.capability === "HOSTING");
  const write = Boolean(input.hosting?.writeAuthorityGranted || hosting?.writeAuthorityGranted);
  return {
    status: write ? "SATISFIED" : hosting?.verificationState === "READ_ONLY_VERIFIED" ? "READ_ONLY_ONLY" : "REQUIRES_AUTHORIZATION",
    capability: input.handoff?.deploymentRequirements.hostingCapability ?? "HOSTING",
    providerSelected: Boolean(input.hosting?.providerSelected || hosting?.providerSelected),
    writeAuthorityGranted: write,
    rollbackCapable: Boolean(input.hosting?.rollbackCapable ?? input.handoff?.deploymentRequirements.rollbackRequired),
    cost: input.hosting?.cost ?? hosting?.cost ?? unknownCost(),
    providerNeutralCapability: "HOSTING",
  };
}

function buildDatabase(handoff: ProductionArtifactHandoff | null): DatabaseReadiness {
  const required = databaseRequired(handoff);
  if (!required) {
    return {
      status: "NOT_REQUIRED",
      required: false,
      migrationsPresent: false,
      migrationVerification: "NOT_REQUIRED",
      writeAuthorityNeeded: false,
      backupRollbackRequired: false,
      cost: unknownCost(),
    };
  }
  const present = (handoff?.databaseRequirements.migrations.length ?? 0) > 0;
  const verification = handoff?.databaseRequirements.verificationStatus ?? "MISSING";
  return {
    status: present && verification !== "MISSING" && verification !== "NOT_REQUIRED" ? "SATISFIED" : "MISSING",
    required: true,
    migrationsPresent: present,
    migrationVerification: verification,
    writeAuthorityNeeded: true,
    backupRollbackRequired: Boolean(handoff?.deploymentRequirements.rollbackRequired),
    cost: unknownCost(),
  };
}

function buildPayment(input: GovernedDeploymentReadinessInput): PaymentReadiness {
  const required = paymentsRequired(input.handoff);
  const architecture = input.paymentArchitecture ?? null;
  const connect = resolveConnectWriteReadiness({
    stripeVerification: input.providers?.find((item) => item.capability === "PAYMENTS")?.verificationState === "READ_ONLY_VERIFIED" ? "READ_ONLY_VERIFIED" : null,
    stripeEnvironment: "TEST",
  });
  if (!required) {
    return {
      status: "NOT_REQUIRED",
      required: false,
      architectureKind: architecture?.architectureKind ?? null,
      connectRequired: false,
      webhookRequired: false,
      writeCredentialRequired: false,
      writeAuthorized: false,
      liveWriteAuthority: false,
      readOnlyVerificationGrantsWrites: false,
    };
  }
  const connectRequired = architecture?.architecture === "STRIPE_CONNECT_MARKETPLACE" || architecture?.architectureKind === "MARKETPLACE_MULTI_PARTY";
  const writeAuthorized = Boolean(input.paymentWriteAuthorized);
  return {
    status: architecture && writeAuthorized ? "SATISFIED" : architecture ? "REQUIRES_AUTHORIZATION" : "MISSING",
    required: true,
    architectureKind: architecture?.architectureKind ?? architecture?.architecture ?? null,
    connectRequired,
    webhookRequired: true,
    writeCredentialRequired: true,
    writeAuthorized,
    liveWriteAuthority: false,
    readOnlyVerificationGrantsWrites: connect.readOnlyVerificationGrantsConnectWrites,
  };
}

function complianceBlocked(handoff: ProductionArtifactHandoff | null): boolean {
  if (!handoff) return false;
  const items = [...handoff.knownUnresolvedItems, ...handoff.knownBlockers];
  return items.some((item) => item.identifier === "REGULATED_INDUSTRY_COMPLIANCE");
}

function buildMatrix(input: GovernedDeploymentReadinessInput, rows: ProviderReadinessRow[]): AuthorizationMatrixRow[] {
  const authorized = new Set(input.eag?.authorizedActionTypes ?? []);
  const eagPresent = Boolean(input.eag?.authorizationPresent);
  const required: DeploymentActionType[] = ["CREATE_HOSTING_PROJECT", "DEPLOY_APPLICATION"];
  if (input.handoff?.deploymentRequirements.domainRequired && input.domain?.purchaseRequired !== false && !input.domain?.owned) {
    required.push("PURCHASE_DOMAIN");
  }
  if (input.handoff?.deploymentRequirements.dnsRequired) required.push("UPSERT_DNS_RECORD");
  if (paymentsRequired(input.handoff)) {
    required.push("CONFIGURE_PAYMENT_RESOURCE", "CREATE_WEBHOOK");
  }
  if (databaseRequired(input.handoff)) required.push("RUN_PRODUCTION_MIGRATION");

  const capabilityFor = (action: DeploymentActionType): DeploymentProviderCapability => {
    if (action === "PURCHASE_DOMAIN") return "REGISTRAR";
    if (action === "UPSERT_DNS_RECORD") return "DNS";
    if (action === "CONFIGURE_PAYMENT_RESOURCE" || action === "CREATE_WEBHOOK") return "PAYMENTS";
    if (action === "RUN_PRODUCTION_MIGRATION") return "DATABASE";
    return "HOSTING";
  };

  return DEPLOYMENT_ACTION_TYPES.filter((action) => required.includes(action)).map((action) => {
    const capability = capabilityFor(action);
    const row = rows.find((item) => item.capability === capability);
    const requiresTreasury = action === "PURCHASE_DOMAIN" || Boolean(row?.procurementRequired);
    const write = Boolean(row?.writeAuthorityGranted || (capability === "PAYMENTS" && input.paymentWriteAuthorized) || (capability === "HOSTING" && input.hosting?.writeAuthorityGranted) || (capability === "DNS" && input.dns?.writeAuthorityGranted));
    const currentlyAuthorized = eagPresent && authorized.has(action) && write;
    return {
      actionType: action,
      capability,
      requiresTreasury,
      requiresEag: true,
      requiresWriteCredential: true,
      requiresProcurement: Boolean(row?.procurementRequired || action === "PURCHASE_DOMAIN"),
      costKnown: row?.costKnown ?? action !== "PURCHASE_DOMAIN",
      currentlyAuthorized,
      blockingReason: currentlyAuthorized
        ? null
        : !write
          ? row?.verificationState === "READ_ONLY_VERIFIED"
            ? "DEPLOYMENT_PROVIDER_READ_ONLY"
            : "DEPLOYMENT_WRITE_AUTHORITY_MISSING"
          : !eagPresent || !authorized.has(action)
            ? "DEPLOYMENT_WRITE_AUTHORITY_MISSING"
            : null,
    };
  });
}

function technicalSatisfied(handoff: ProductionArtifactHandoff | null): boolean {
  if (!handoff) return false;
  return (
    handoff.readiness === "READY_FOR_COMMERCIALIZATION_REVIEW" &&
    handoff.buildVerification.status === "PASS" &&
    handoff.testVerification.status === "PASS" &&
    handoff.architectureCoverage.requiredSystemsAccounted
  );
}

export function evaluateGovernedDeploymentReadiness(input: GovernedDeploymentReadinessInput): GovernedDeploymentReadiness {
  const handoff = input.handoff;
  const ventureId = handoff?.ventureId ?? input.expectedVentureId ?? "venture-missing";
  const handoffId = handoff?.handoffId ?? null;
  const readinessId = `gdr:${ventureId}:${handoffId ?? "none"}`;
  const rows = buildProviderRows(input);
  const treasury = buildTreasury(input, rows);
  const domain = buildDomain(input);
  const dns = buildDns(input);
  const hosting = buildHosting(input, rows);
  const database = buildDatabase(handoff);
  const payment = buildPayment(input);
  const matrix = buildMatrix(input, rows);
  const technical = technicalSatisfied(handoff);
  const rollbackRequired = Boolean(handoff?.deploymentRequirements.rollbackRequired);
  const rollbackKnown = Boolean(input.hosting?.rollbackCapable ?? rollbackRequired);
  const healthPath = input.healthCheckPath ?? handoff?.deploymentRequirements.healthCheckPath ?? null;

  const draft: DeploymentExecutionRequestDraft = {
    status: "DRAFT",
    executable: false,
    ventureId,
    readinessId,
    handoffId,
    requiredActions: matrix.map((row) => row.actionType),
    requiredAuthorities: [
      { kind: "TREASURY", present: treasury.status === "SATISFIED" || treasury.status === "NOT_REQUIRED" },
      { kind: "EAG", present: Boolean(input.eag?.authorizationPresent) },
      { kind: "WRITE_CREDENTIAL", present: rows.every((row) => row.writeAuthorityGranted || row.blockingState === "NOT_REQUIRED") },
      { kind: "DEPLOYMENT", present: Boolean(input.deploymentAuthority?.granted && input.deploymentAuthority.authorizationId) },
      { kind: "PUBLIC_LAUNCH", present: Boolean(input.publicLaunchAuthority?.granted && input.publicLaunchAuthority.authorizationId) },
    ],
    providerBindings: handoff?.deploymentRequirements.providerBindings ?? [],
    deploymentRequirements: handoff?.deploymentRequirements ?? null,
    rollbackRequirements: { required: rollbackRequired, strategyKnown: rollbackKnown },
    healthCheckRequirements: { required: true, path: healthPath },
  };

  const assembled: GovernedDeploymentReadiness = {
    schemaVersion: GOVERNED_DEPLOYMENT_READINESS_SCHEMA,
    readinessId,
    ventureId,
    companyId: input.companyId ?? handoff?.companyId ?? null,
    productionArtifactHandoffId: handoffId,
    buildContractId: handoff?.buildContractId ?? null,
    ventureSystemsBuildContractId: handoff?.ventureSystemsBuildContractId ?? null,
    state: "NOT_EVALUATED",
    technicalReadiness: technical ? "SATISFIED" : "BLOCKED",
    artifactReadiness: technical ? "SATISFIED" : "BLOCKED",
    runtimeReadiness: handoff?.runtimeRequirements.every((item) => !item.required || item.status === "DECLARED" || item.status === "NOT_REQUIRED") ? "SATISFIED" : "MISSING",
    providerReadiness: rows.some((row) => row.blockingState === "READ_ONLY_ONLY") ? "READ_ONLY_ONLY" : "REQUIRES_AUTHORIZATION",
    credentialReadiness: rows.some((row) => !row.credentialAvailable && row.blockingState !== "NOT_REQUIRED") ? "MISSING" : "REQUIRES_AUTHORIZATION",
    economicReadiness: treasury.status === "SATISFIED" || treasury.status === "NOT_REQUIRED" ? "SATISFIED" : treasury.status === "UNKNOWN_COST" ? "BLOCKED" : "REQUIRES_PROCUREMENT",
    treasuryReadiness: treasury,
    externalActionReadiness: input.eag?.authorizationPresent ? "SATISFIED" : "EAG_AUTHORIZATION_MISSING",
    domainReadiness: domain,
    dnsReadiness: dns,
    hostingReadiness: hosting,
    databaseReadiness: database,
    paymentReadiness: payment,
    securityComplianceReadiness: complianceBlocked(handoff) ? "BLOCKED" : "SATISFIED",
    rollbackReadiness: !rollbackRequired || rollbackKnown ? "SATISFIED" : "MISSING",
    healthCheckReadiness: healthPath ? "SATISFIED" : "MISSING",
    providerRows: rows,
    blockers: [],
    warnings: [],
    requiredAuthorizations: matrix,
    readyForDeploymentExecution: false,
    deploymentAuthorityGranted: Boolean(input.deploymentAuthority?.granted && input.deploymentAuthority.authorizationId),
    publicLaunchAuthorityGranted: Boolean(input.publicLaunchAuthority?.granted && input.publicLaunchAuthority.authorizationId),
    createdAt: input.createdAt ?? "1970-01-01T00:00:00.000Z",
    traceability: {
      ventureId,
      companyId: input.companyId ?? handoff?.companyId ?? null,
      handoffId,
      buildContractId: handoff?.buildContractId ?? null,
      ventureSystemsBuildContractId: handoff?.ventureSystemsBuildContractId ?? null,
    },
    executionDraft: draft,
    writeBoundary: GOVERNED_DEPLOYMENT_WRITE_BOUNDARY,
  };

  return validateGovernedDeploymentReadiness(assembled, input);
}
