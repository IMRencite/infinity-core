import type { SystemFamily } from "@/lib/infinity/venture-systems-architecture/constants";
import type { VentureSystemsBuildCoveragePlan } from "@/lib/infinity/product-asset-builder/v2.1/systems-architecture/types";
import { coverageHqView } from "@/lib/infinity/product-asset-builder/v2.1/systems-architecture/plan-coverage";
import {
  DATABASE_INTERNAL_FAMILIES,
  DEPLOYMENT_AUTHORITY,
  LIVE_PROVISIONING_POLICY_CODES,
  PRODUCTION_HANDOFF_SCHEMA_VERSION,
  PRODUCTION_HANDOFF_WRITE_BOUNDARY,
} from "./constants";
import type {
  ArchitectureCoverageHandoff,
  CodeChangeSetHandoffRef,
  CollectedCodeChangeSet,
  DatabaseRequirement,
  EnvironmentRequirement,
  ExternalDependency,
  ProductionArtifactHandoff,
  ProductionHandoffArtifact,
  ProductionHandoffCollectInput,
  ProductionHandoffFailure,
  RuntimeRequirement,
  VerificationEvidence,
} from "./types";
import { accountCompleteness, architectureCompletenessItems, artifactCompletenessItems, requirementCompletenessItems } from "./completeness";
import { validateHandoffArtifactPath } from "./paths";

function stableHandoffId(input: ProductionHandoffCollectInput): string {
  return `pah:${input.ventureId}:${input.pabBuildRunId}:${input.ventureSystemsBuildContractId ?? "none"}`;
}

function unknownEvidence(source: string, summary: string): VerificationEvidence {
  return {
    status: "UNKNOWN",
    timestamp: null,
    source,
    summary,
    counts: { passed: null, failed: null, total: null },
  };
}

function mergeEvidence(partial: Partial<VerificationEvidence> | undefined, fallback: VerificationEvidence): VerificationEvidence {
  if (!partial) return fallback;
  return {
    status: partial.status ?? fallback.status,
    timestamp: partial.timestamp ?? fallback.timestamp,
    source: partial.source ?? fallback.source,
    summary: partial.summary ?? fallback.summary,
    counts: {
      passed: partial.counts?.passed ?? fallback.counts.passed,
      failed: partial.counts?.failed ?? fallback.counts.failed,
      total: partial.counts?.total ?? fallback.counts.total,
    },
  };
}

function internalFamilies(plan: VentureSystemsBuildCoveragePlan | null | undefined): SystemFamily[] {
  return (plan?.rows ?? []).filter((row) => row.required && row.disposition === "INTERNAL_BUILD").map((row) => row.family);
}

function databaseRequired(plan: VentureSystemsBuildCoveragePlan | null | undefined): boolean {
  return internalFamilies(plan).some((family) => (DATABASE_INTERNAL_FAMILIES as readonly string[]).includes(family));
}

function collectChangeSetRefs(
  input: ProductionHandoffCollectInput,
  lineage: {
    ventureId: string;
    companyId: string | null;
    missionId: string | null;
    buildContractId: string | null;
    ventureSystemsBuildContractId: string | null;
  },
): CodeChangeSetHandoffRef[] {
  return (input.codeChangeSets ?? []).map((item: CollectedCodeChangeSet) => ({
    codeChangeSetId: item.codeChangeSetId,
    codingTaskId: item.changeSet.taskId,
    ventureId: item.ventureId,
    companyId: item.companyId ?? lineage.companyId,
    missionId: item.missionId ?? lineage.missionId,
    buildContractId: item.buildContractId ?? lineage.buildContractId,
    ventureSystemsBuildContractId: item.ventureSystemsBuildContractId ?? lineage.ventureSystemsBuildContractId,
    provider: item.changeSet.provider,
    model: item.changeSet.model,
    affectedFiles: item.changeSet.changes.map((change) => change.path),
    validationState: item.validationState ?? "UNVALIDATED",
    reviewState: item.reviewState ?? "UNREVIEWED",
    productionReady: false,
  }));
}

function collectSuppliedArtifacts(
  input: ProductionHandoffCollectInput,
  lineage: {
    ventureId: string;
    companyId: string | null;
    missionId: string | null;
    buildContractId: string | null;
    ventureSystemsBuildContractId: string | null;
  },
): ProductionHandoffArtifact[] {
  return (input.artifacts ?? []).map((item) => ({
    artifactId: item.artifactId,
    kind: item.kind,
    status: item.status ?? "PRESENT",
    path: item.path ?? null,
    sourceRef: item.sourceRef ?? item.artifactId,
    ventureId: item.ventureId ?? lineage.ventureId,
    buildContractId: item.buildContractId ?? lineage.buildContractId,
    ventureSystemsBuildContractId: item.ventureSystemsBuildContractId ?? lineage.ventureSystemsBuildContractId,
    codingTaskId: item.codingTaskId ?? null,
    codeChangeSetId: item.codeChangeSetId ?? null,
    missionId: item.missionId ?? lineage.missionId,
    providerCallId: item.providerCallId ?? null,
    assetId: item.assetId ?? null,
  }));
}

function missingArtifact(
  kind: ProductionHandoffArtifact["kind"],
  lineage: { ventureId: string; buildContractId: string | null; ventureSystemsBuildContractId: string | null; missionId: string | null },
): ProductionHandoffArtifact {
  return {
    artifactId: `missing:${kind}`,
    kind,
    status: "MISSING",
    path: null,
    sourceRef: "collector:expected-missing",
    ventureId: lineage.ventureId,
    buildContractId: lineage.buildContractId,
    ventureSystemsBuildContractId: lineage.ventureSystemsBuildContractId,
    codingTaskId: null,
    codeChangeSetId: null,
    missionId: lineage.missionId,
    providerCallId: null,
    assetId: null,
  };
}

function ensureExpectedArtifacts(
  supplied: ProductionHandoffArtifact[],
  changeSets: CodeChangeSetHandoffRef[],
  plan: VentureSystemsBuildCoveragePlan | null | undefined,
  lineage: { ventureId: string; buildContractId: string | null; ventureSystemsBuildContractId: string | null; missionId: string | null },
): ProductionHandoffArtifact[] {
  const inventory = [...supplied];
  const has = (kind: ProductionHandoffArtifact["kind"]) => inventory.some((item) => item.kind === kind && item.status !== "MISSING");

  if (changeSets.length > 0 && !has("CODE_CHANGE_SET")) {
    for (const ref of changeSets) {
      inventory.push({
        artifactId: `changeset:${ref.codeChangeSetId}`,
        kind: "CODE_CHANGE_SET",
        status: "PRESENT",
        path: null,
        sourceRef: ref.codeChangeSetId,
        ventureId: ref.ventureId,
        buildContractId: ref.buildContractId,
        ventureSystemsBuildContractId: ref.ventureSystemsBuildContractId,
        codingTaskId: ref.codingTaskId,
        codeChangeSetId: ref.codeChangeSetId,
        missionId: ref.missionId,
        providerCallId: null,
        assetId: null,
      });
    }
  }

  const expected: ProductionHandoffArtifact["kind"][] = [
    "APPLICATION_SOURCE",
    "ARCHITECTURE_EVIDENCE",
    "BUILD_EVIDENCE",
    "TEST_EVIDENCE",
  ];
  if (internalFamilies(plan).length > 0 && changeSets.length === 0 && !has("CODE_CHANGE_SET")) {
    expected.unshift("CODE_CHANGE_SET");
  }
  if (databaseRequired(plan)) {
    expected.push("DATABASE_MIGRATION", "DATABASE_SCHEMA");
  }

  for (const kind of expected) {
    if (!has(kind) && !inventory.some((item) => item.kind === kind)) {
      inventory.push(missingArtifact(kind, lineage));
    }
  }
  return inventory;
}

function deriveRuntime(plan: VentureSystemsBuildCoveragePlan | null | undefined, supplied: RuntimeRequirement[] | undefined): RuntimeRequirement[] {
  if (supplied) return supplied;
  const families = new Set((plan?.rows ?? []).filter((row) => row.required).map((row) => row.family));
  const scheduling = plan?.rows.find((row) => row.family === "SCHEDULING");
  const dbRequired = databaseRequired(plan);
  const req = (
    key: RuntimeRequirement["key"],
    required: boolean,
    value: string | null,
    status: RuntimeRequirement["status"],
    sourceCapability: RuntimeRequirement["sourceCapability"],
  ): RuntimeRequirement => ({ key, required, value, status, sourceCapability });

  return [
    req("runtimeVersion", true, null, "MISSING", null),
    req("framework", true, null, "MISSING", null),
    req("buildCommand", true, null, "MISSING", null),
    req("startCommand", true, null, "MISSING", null),
    req("database", dbRequired, dbRequired ? "required" : null, dbRequired ? "DECLARED" : "NOT_REQUIRED", "IDENTITY_AND_ACCOUNTS"),
    req("storage", false, null, "NOT_REQUIRED", null),
    req("queue", false, null, "NOT_REQUIRED", null),
    req(
      "scheduledJobs",
      Boolean(families.has("SCHEDULING") && scheduling?.disposition === "INTERNAL_BUILD"),
      null,
      scheduling?.disposition === "DEFERRED" ? "DEFERRED" : families.has("SCHEDULING") ? "DECLARED" : "NOT_REQUIRED",
      "SCHEDULING",
    ),
    req("objectStorage", false, null, "NOT_REQUIRED", null),
    req("email", families.has("TRANSACTIONAL_EMAIL"), "external", families.has("TRANSACTIONAL_EMAIL") ? "DECLARED" : "NOT_REQUIRED", "TRANSACTIONAL_EMAIL"),
    req("payments", families.has("PAYMENTS"), families.has("PAYMENTS") ? "required" : null, families.has("PAYMENTS") ? "DECLARED" : "NOT_REQUIRED", "PAYMENTS"),
    req("environmentVariables", true, null, "DECLARED", "SECRET_MANAGEMENT"),
    req("secrets", true, null, "DECLARED", "SECRET_MANAGEMENT"),
    req("providerAdapters", true, null, "DECLARED", null),
  ];
}

function deriveEnvironment(
  plan: VentureSystemsBuildCoveragePlan | null | undefined,
  supplied: EnvironmentRequirement[] | undefined,
): EnvironmentRequirement[] {
  if (supplied) return supplied;
  const env: EnvironmentRequirement[] = [];
  const rows = plan?.rows ?? [];
  if (rows.some((row) => row.required && row.family === "PAYMENTS")) {
    env.push({
      key: "PAYMENTS_PROVIDER_SECRET",
      required: true,
      secret: true,
      sourceCapability: "PAYMENTS",
      provider: null,
      scope: "RUNTIME",
      status: "REQUIRES_EXTERNAL_AUTHORIZATION",
    });
  }
  if (databaseRequired(plan)) {
    env.push({
      key: "DATABASE_URL",
      required: true,
      secret: true,
      sourceCapability: "IDENTITY_AND_ACCOUNTS",
      provider: null,
      scope: "RUNTIME",
      status: "REQUIRES_EXTERNAL_AUTHORIZATION",
    });
  }
  if (rows.some((row) => row.required && row.family === "TRANSACTIONAL_EMAIL")) {
    env.push({
      key: "TRANSACTIONAL_EMAIL_PROVIDER_KEY",
      required: true,
      secret: true,
      sourceCapability: "TRANSACTIONAL_EMAIL",
      provider: null,
      scope: "RUNTIME",
      status: "REQUIRES_EXTERNAL_AUTHORIZATION",
    });
  }
  return env;
}

function deriveDatabase(
  plan: VentureSystemsBuildCoveragePlan | null | undefined,
  changeSets: CollectedCodeChangeSet[],
  supplied: Partial<DatabaseRequirement> | undefined,
): DatabaseRequirement {
  if (supplied?.migrations || supplied?.schemaRequired != null) {
    return {
      schemaRequired: supplied.schemaRequired ?? databaseRequired(plan),
      migrations: supplied.migrations ?? [],
      requiredCapabilities: supplied.requiredCapabilities ?? [],
      verificationStatus: supplied.verificationStatus ?? (supplied.migrations?.length ? "UNVERIFIED" : databaseRequired(plan) ? "MISSING" : "NOT_REQUIRED"),
    };
  }
  const migrations = changeSets.flatMap((item) =>
    (item.changeSet.migrationChanges ?? []).map((path, index) => ({
      migrationId: `${item.codeChangeSetId}:${path}`,
      path,
      order: index,
      verificationStatus: "UNVERIFIED" as const,
    })),
  );
  const required = databaseRequired(plan);
  return {
    schemaRequired: required,
    migrations,
    requiredCapabilities: required ? ["relational_schema"] : [],
    verificationStatus: !required ? "NOT_REQUIRED" : migrations.length > 0 ? "UNVERIFIED" : "MISSING",
  };
}

function deriveExternalDependencies(
  plan: VentureSystemsBuildCoveragePlan | null | undefined,
  verifications: ProductionHandoffCollectInput["providerVerifications"],
): ExternalDependency[] {
  return (plan?.rows ?? [])
    .filter((row) => row.required && row.externalDependency)
    .map((row) => {
      const dep = row.externalDependency!;
      const verification = verifications?.find((item) => item.capability === row.family)?.state ?? "NONE";
      return {
        capability: row.family,
        requiredCapabilities: dep.requiredCapabilities,
        providerSelectionState: dep.providerStatus,
        tenancy: dep.tenancyRequirement,
        credentialState: dep.credentialRequired ? "REQUIRES_EXTERNAL_AUTHORIZATION" : "NOT_REQUIRED",
        procurementRequired: dep.procurementRequired,
        writeAuthorityRequired: false as const,
        cost: dep.estimatedCost,
        costKnown: dep.costKnown,
        blockingStatus: dep.blockingStatus,
        providerVerificationState: verification,
        writeAuthorized: false as const,
      };
    });
}

function architectureCoverage(
  plan: VentureSystemsBuildCoveragePlan | null | undefined,
  validation: ProductionHandoffCollectInput["architectureValidation"],
): ArchitectureCoverageHandoff {
  if (!plan) {
    return {
      present: false,
      requiredSystemsAccounted: false,
      coverage: null,
      blockedFamilies: [],
      deferredFamilies: [],
      externalFamilies: [],
      internalFamilies: [],
      validationOk: false,
    };
  }
  const coverage = coverageHqView(plan);
  const accounted =
    coverage.plannedInternally + coverage.externalDependencies + coverage.deferred + coverage.blocked === coverage.requiredSystems;
  return {
    present: true,
    requiredSystemsAccounted: accounted,
    coverage,
    blockedFamilies: plan.rows.filter((row) => row.required && row.disposition === "BLOCKED").map((row) => row.family),
    deferredFamilies: plan.rows.filter((row) => row.required && row.disposition === "DEFERRED").map((row) => row.family),
    externalFamilies: plan.rows.filter((row) => row.required && row.disposition === "EXTERNAL_PROVIDER_DEPENDENCY").map((row) => row.family),
    internalFamilies: plan.rows.filter((row) => row.required && row.disposition === "INTERNAL_BUILD").map((row) => row.family),
    validationOk: validation?.ok ?? accounted,
  };
}

function livePolicyUnresolved(plan: VentureSystemsBuildCoveragePlan | null | undefined): ProductionHandoffFailure[] {
  if (!plan) return [];
  return plan.input.contract.unresolvedPolicies
    .filter(
      (policy) =>
        (LIVE_PROVISIONING_POLICY_CODES as readonly string[]).includes(policy.code) ||
        policy.code === "REGULATED_INDUSTRY_COMPLIANCE",
    )
    .map((policy) => ({
      code: "PRODUCTION_HANDOFF_ARCHITECTURE_BLOCKED" as const,
      message: policy.question,
      systemFamily: policy.code === "REGULATED_INDUSTRY_COMPLIANCE" ? "LEGAL_AND_COMPLIANCE" : null,
      identifier: policy.code,
    }));
}

export function collectProductionArtifactHandoff(input: ProductionHandoffCollectInput): ProductionArtifactHandoff {
  const lineage = {
    ventureId: input.ventureId,
    companyId: input.companyId ?? null,
    missionId: input.missionId ?? null,
    buildContractId: input.buildContractId ?? null,
    ventureSystemsBuildContractId: input.ventureSystemsBuildContractId ?? null,
  };
  const changeSets = collectChangeSetRefs(input, lineage);
  const artifacts = ensureExpectedArtifacts(collectSuppliedArtifacts(input, lineage), changeSets, input.architecturePlan, lineage);
  const runtime = deriveRuntime(input.architecturePlan, input.runtimeRequirements);
  const environment = deriveEnvironment(input.architecturePlan, input.environmentRequirements);
  const database = deriveDatabase(input.architecturePlan, input.codeChangeSets ?? [], input.databaseRequirements);
  const external = deriveExternalDependencies(input.architecturePlan, input.providerVerifications);
  const coverage = architectureCoverage(input.architecturePlan, input.architectureValidation);
  const completeness = accountCompleteness([
    ...architectureCompletenessItems(input.architecturePlan),
    ...artifactCompletenessItems(artifacts),
    ...requirementCompletenessItems({ runtime, environment }),
  ]);

  const providerArtifacts: ProductionHandoffArtifact[] = external.map((dep) => ({
    artifactId: `provider:${dep.capability}`,
    kind: "PROVIDER_DEPENDENCY" as const,
    status: dep.blockingStatus === "NONE" ? ("PRESENT" as const) : ("BLOCKED" as const),
    path: null,
    sourceRef: `architecture:${dep.capability}`,
    ventureId: lineage.ventureId,
    buildContractId: lineage.buildContractId,
    ventureSystemsBuildContractId: lineage.ventureSystemsBuildContractId,
    codingTaskId: null,
    codeChangeSetId: null,
    missionId: lineage.missionId,
    providerCallId: null,
    assetId: null,
  }));

  const inventory = [...artifacts.filter((item) => item.kind !== "PROVIDER_DEPENDENCY"), ...providerArtifacts];
  const envArtifacts: ProductionHandoffArtifact[] = environment.map((req) => ({
    artifactId: `env:${req.key}`,
    kind: "ENV_REQUIREMENT" as const,
    status: req.status === "NOT_REQUIRED" ? ("UNVERIFIED" as const) : ("PRESENT" as const),
    path: null,
    sourceRef: `env:${req.key}`,
    ventureId: lineage.ventureId,
    buildContractId: lineage.buildContractId,
    ventureSystemsBuildContractId: lineage.ventureSystemsBuildContractId,
    codingTaskId: null,
    codeChangeSetId: null,
    missionId: lineage.missionId,
    providerCallId: null,
    assetId: null,
  }));
  const withEnv = inventory.some((item) => item.kind === "ENV_REQUIREMENT") ? inventory : [...inventory, ...envArtifacts];

  const deployment: ProductionArtifactHandoff["deploymentRequirements"] = {
    targetRuntimeCapability: runtime.find((item) => item.key === "runtimeVersion")?.value ?? null,
    hostingCapability: null,
    domainRequired: true,
    dnsRequired: true,
    tlsRequired: true,
    databaseRequired: database.schemaRequired,
    providerBindings: external.map((item) => item.capability),
    environmentVariableKeys: environment.map((item) => item.key),
    buildArtifactRef: input.pabArtifactId ?? withEnv.find((item) => item.kind === "APPLICATION_SOURCE")?.artifactId ?? null,
    healthCheckPath: null,
    rollbackRequired: true,
    providerChosen: false,
    deploymentAuthority: DEPLOYMENT_AUTHORITY,
  };

  const knownUnresolved = livePolicyUnresolved(input.architecturePlan);
  const pathBlockers: ProductionHandoffFailure[] = [];
  for (const artifact of withEnv) {
    const pathCheck = validateHandoffArtifactPath(artifact.path);
    if (!pathCheck.ok) {
      pathBlockers.push({
        code: "PRODUCTION_HANDOFF_PATH_UNSAFE",
        message: pathCheck.reason ?? "unsafe artifact path",
        artifactKind: artifact.kind,
        path: artifact.path,
        identifier: artifact.artifactId,
      });
    } else if (pathCheck.normalized) {
      artifact.path = pathCheck.normalized;
    }
  }
  for (const ref of changeSets) {
    for (const file of ref.affectedFiles) {
      const pathCheck = validateHandoffArtifactPath(file);
      if (!pathCheck.ok) {
        pathBlockers.push({
          code: "PRODUCTION_HANDOFF_PATH_UNSAFE",
          message: pathCheck.reason ?? "unsafe change-set path",
          artifactKind: "CODE_CHANGE_SET",
          path: file,
          identifier: ref.codeChangeSetId,
        });
      }
    }
  }

  const handoff: ProductionArtifactHandoff = {
    schemaVersion: PRODUCTION_HANDOFF_SCHEMA_VERSION,
    handoffId: stableHandoffId(input),
    ventureId: lineage.ventureId,
    companyId: lineage.companyId,
    missionId: lineage.missionId,
    buildContractId: lineage.buildContractId,
    ventureSystemsBuildContractId: lineage.ventureSystemsBuildContractId,
    pabBuildRunId: input.pabBuildRunId,
    pabArtifactId: input.pabArtifactId ?? null,
    codeChangeSetIds: changeSets.map((item) => item.codeChangeSetId),
    artifactInventory: withEnv,
    codeChangeSets: changeSets,
    runtimeRequirements: runtime,
    environmentRequirements: environment,
    databaseRequirements: database,
    externalDependencies: external,
    providerRequirements: external,
    deploymentRequirements: deployment,
    architectureCoverage: coverage,
    buildVerification: mergeEvidence(input.buildVerification, unknownEvidence("pab", "Build evidence was not supplied.")),
    testVerification: mergeEvidence(input.testVerification, unknownEvidence("pab", "Test evidence was not supplied.")),
    typecheckVerification: mergeEvidence(input.typecheckVerification, unknownEvidence("pab", "Typecheck evidence was not supplied.")),
    architectureVerification: {
      status: coverage.present && coverage.requiredSystemsAccounted ? "PASS" : "FAIL",
      timestamp: null,
      source: "venture-systems-build-coverage",
      summary: coverage.present
        ? `Required systems ${coverage.coverage?.requiredSystems ?? 0} accounted=${coverage.requiredSystemsAccounted}`
        : "Architecture coverage was not supplied.",
      counts: {
        passed: coverage.coverage?.plannedInternally ?? null,
        failed: coverage.coverage?.blocked ?? null,
        total: coverage.coverage?.requiredSystems ?? null,
      },
    },
    knownBlockers: pathBlockers,
    knownUnresolvedItems: knownUnresolved,
    readiness: "DRAFT",
    completeness,
    createdAt: input.createdAt ?? "1970-01-01T00:00:00.000Z",
    traceability: {
      ventureId: lineage.ventureId,
      companyId: lineage.companyId,
      missionId: lineage.missionId,
      buildContractId: lineage.buildContractId,
      ventureSystemsBuildContractId: lineage.ventureSystemsBuildContractId,
      pabBuildRunId: input.pabBuildRunId,
      codingTaskIds: input.codingTaskIds ?? [...new Set(changeSets.map((item) => item.codingTaskId))],
      codeChangeSetIds: changeSets.map((item) => item.codeChangeSetId),
      providerCallIds: withEnv.map((item) => item.providerCallId).filter((item): item is string => Boolean(item)),
      assetIds: withEnv.map((item) => item.assetId).filter((item): item is string => Boolean(item)),
    },
    deploymentAuthority: DEPLOYMENT_AUTHORITY,
    writeBoundary: PRODUCTION_HANDOFF_WRITE_BOUNDARY,
  };

  return handoff;
}
