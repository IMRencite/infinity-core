import { afterEach, describe, expect, it } from "vitest";
import {
  SIMPLE_DIGITAL_PRODUCT_FIXTURE,
  buildVentureSystemsContract,
} from "@/lib/infinity/venture-systems-architecture";
import {
  bindVentureSystemsBuildInput,
  planVentureSystemsBuildCoverage,
  validateVentureSystemsBuildCoverage,
} from "@/lib/infinity/product-asset-builder/v2.1/systems-architecture";
import type { CodeChangeSet } from "@/lib/infinity/product-asset-builder/v2.1/types";
import { buildProductionArtifactHandoff } from "@/lib/infinity/production-artifact/handoff";
import {
  DEPLOYMENT_ACTION_TYPES,
  evaluateGovernedDeploymentReadiness,
} from "@/lib/infinity/governed-deployment-readiness";
import {
  VERCEL_LIVE_GOVERNANCE_REF_ENV,
  VERCEL_LIVE_VERIFICATION_ARTIFACT_ID,
  VERCEL_LIVE_VERIFICATION_RESOURCE,
  derivedGovernedReadinessId,
  evaluateVercelLiveVerificationPreflight,
  governedExecutionActionId,
  governedExecutionActionIdempotencyKey,
  loadVercelLiveVerificationGovernance,
  type CanonicalEagRecord,
  type CanonicalTreasuryRecord,
  type ProviderWriteEvidence,
  type VercelLiveGovernanceRecordCatalog,
} from "@/lib/infinity/governed-deployment-execution";

const CONFIG_KEYS = [
  "VERCEL_TOKEN",
  "VERCEL_TOKEN_SCOPE",
  "VERCEL_TOKEN_SCOPE_KIND",
  "VERCEL_TEAM_ID",
  "INFINITY_VERCEL_TEST_RESOURCE",
  "INFINITY_VERCEL_TEST_REPO",
  "INFINITY_VERCEL_TEST_SHA",
  "INFINITY_VERCEL_TEST_ARTIFACT_ID",
  "INFINITY_VERCEL_LEFTOVER_RESOURCE_ACCEPTED",
  "INFINITY_VERCEL_TEST_TEAM_CONFIRMED",
  "LIVE_PROVIDER_TEST_MODE",
  "GITHUB_TOKEN",
  ...Object.values(VERCEL_LIVE_GOVERNANCE_REF_ENV),
] as const;

const saved: Record<string, string | undefined> = {};

function snapshotEnv(): void {
  for (const key of CONFIG_KEYS) saved[key] = process.env[key];
}

function restoreEnv(): void {
  for (const key of CONFIG_KEYS) {
    if (saved[key] == null) delete process.env[key];
    else process.env[key] = saved[key];
  }
}

function clearEnv(): void {
  for (const key of CONFIG_KEYS) delete process.env[key];
}

function setValidConfigEnv(): void {
  process.env.VERCEL_TOKEN = "vercel_test_token_placeholder_value";
  process.env.VERCEL_TOKEN_SCOPE = "hosting.create_project,hosting.deploy,hosting.verify_deployment";
  process.env.VERCEL_TOKEN_SCOPE_KIND = "INFINITY_INTENDED";
  process.env.VERCEL_TEAM_ID = "team_infinity_test_verify";
  process.env.INFINITY_VERCEL_TEST_TEAM_CONFIRMED = "true";
  process.env.INFINITY_VERCEL_TEST_RESOURCE = VERCEL_LIVE_VERIFICATION_RESOURCE;
  process.env.INFINITY_VERCEL_TEST_REPO = "infinity-org/infinity-test-live-verification-gde";
  process.env.INFINITY_VERCEL_TEST_SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  process.env.INFINITY_VERCEL_TEST_ARTIFACT_ID = VERCEL_LIVE_VERIFICATION_ARTIFACT_ID;
  process.env.INFINITY_VERCEL_LEFTOVER_RESOURCE_ACCEPTED = "true";
  process.env.LIVE_PROVIDER_TEST_MODE = "true";
  process.env.GITHUB_TOKEN = "github_test_token_placeholder_value";
}

snapshotEnv();
afterEach(() => {
  restoreEnv();
});

function planned() {
  const bound = bindVentureSystemsBuildInput({
    ventureId: SIMPLE_DIGITAL_PRODUCT_FIXTURE.ventureId ?? "simple-digital-product-v1",
    companyId: "company-gde-governance",
    missionId: "mission-gde-governance",
    buildContractId: "build-gde-governance",
    contract: buildVentureSystemsContract(SIMPLE_DIGITAL_PRODUCT_FIXTURE),
  });
  const plan = planVentureSystemsBuildCoverage(bound);
  const validation = validateVentureSystemsBuildCoverage({ bound, plan, tasks: [] });
  return { bound, plan, validation };
}

function changeSet(migrations: string[] = []): CodeChangeSet {
  return {
    taskId: "task-gde-governance",
    provider: "infinity-native",
    model: "test",
    reasoningSummary: "governance fixture",
    changes: ["app/page.tsx", ...migrations].map((path) => ({
      operation: "create",
      path,
      content: "export const ok = true;\n",
      justification: "fixture",
    })),
    dependencyChanges: [],
    migrationChanges: migrations,
    testsAdded: [],
    expectedBehavior: [],
    assumptions: [],
  };
}

function realReadiness() {
  const { plan, validation, bound } = planned();
  const dbRequired = plan.rows.some(
    (row) =>
      row.required &&
      row.disposition === "INTERNAL_BUILD" &&
      ["IDENTITY_AND_ACCOUNTS", "CRM", "ENTITLEMENTS", "COMMERCE_AND_FULFILLMENT"].includes(row.family),
  );
  const migrations = dbRequired ? ["supabase/migrations/0001_init.sql"] : [];
  const produced = buildProductionArtifactHandoff({
    ventureId: plan.input.ventureId,
    companyId: plan.input.companyId,
    missionId: plan.input.missionId,
    buildContractId: plan.input.buildContractId,
    ventureSystemsBuildContractId: plan.input.ventureSystemsBuildContractId,
    pabBuildRunId: "pab-run-gde-governance",
    pabArtifactId: "pab-artifact-gde-governance",
    createdAt: "2026-08-24T00:00:00.000Z",
    architecturePlan: plan,
    architectureValidation: validation,
    codingTaskIds: ["task-gde-governance"],
    codeChangeSets: [
      {
        codeChangeSetId: "changeset-gde-governance",
        ventureId: plan.input.ventureId,
        companyId: plan.input.companyId,
        missionId: plan.input.missionId,
        buildContractId: plan.input.buildContractId,
        ventureSystemsBuildContractId: plan.input.ventureSystemsBuildContractId,
        validationState: "VALID",
        reviewState: "APPROVED",
        changeSet: changeSet(migrations),
      },
    ],
    artifacts: [
      { artifactId: "app", kind: "APPLICATION_SOURCE", status: "PRESENT", path: "app/page.tsx", sourceRef: "changeset-gde-governance" },
      { artifactId: "arch", kind: "ARCHITECTURE_EVIDENCE", status: "PRESENT", path: null, sourceRef: plan.input.ventureSystemsBuildContractId },
      { artifactId: "build", kind: "BUILD_EVIDENCE", status: "PRESENT", path: null, sourceRef: "gates" },
      { artifactId: "test", kind: "TEST_EVIDENCE", status: "PRESENT", path: null, sourceRef: "gates" },
      ...(dbRequired
        ? [
            { artifactId: "mig", kind: "DATABASE_MIGRATION" as const, status: "PRESENT" as const, path: "supabase/migrations/0001_init.sql", sourceRef: "changeset-gde-governance" },
            { artifactId: "schema", kind: "DATABASE_SCHEMA" as const, status: "PRESENT" as const, path: "supabase/migrations/0001_init.sql", sourceRef: "changeset-gde-governance" },
          ]
        : []),
    ],
    runtimeRequirements: [
      { key: "runtimeVersion", required: true, value: "node-20", status: "DECLARED", sourceCapability: null },
      { key: "framework", required: true, value: "nextjs", status: "DECLARED", sourceCapability: null },
      { key: "buildCommand", required: true, value: "npm run build", status: "DECLARED", sourceCapability: null },
      { key: "startCommand", required: true, value: "npm start", status: "DECLARED", sourceCapability: null },
      { key: "database", required: dbRequired, value: dbRequired ? "required" : null, status: dbRequired ? "DECLARED" : "NOT_REQUIRED", sourceCapability: null },
      { key: "storage", required: false, value: null, status: "NOT_REQUIRED", sourceCapability: null },
      { key: "queue", required: false, value: null, status: "NOT_REQUIRED", sourceCapability: null },
      { key: "scheduledJobs", required: false, value: null, status: "NOT_REQUIRED", sourceCapability: null },
      { key: "objectStorage", required: false, value: null, status: "NOT_REQUIRED", sourceCapability: null },
      { key: "email", required: false, value: null, status: "NOT_REQUIRED", sourceCapability: null },
      { key: "payments", required: true, value: "required", status: "DECLARED", sourceCapability: "PAYMENTS" },
      { key: "environmentVariables", required: true, value: null, status: "DECLARED", sourceCapability: "SECRET_MANAGEMENT" },
      { key: "secrets", required: true, value: null, status: "DECLARED", sourceCapability: "SECRET_MANAGEMENT" },
      { key: "providerAdapters", required: true, value: null, status: "DECLARED", sourceCapability: null },
    ],
    buildVerification: { status: "PASS", timestamp: "2026-08-24T00:00:00.000Z", source: "gates", summary: "pass", counts: { passed: 1, failed: 0, total: 1 } },
    testVerification: { status: "PASS", timestamp: "2026-08-24T00:00:00.000Z", source: "gates", summary: "pass", counts: { passed: 3, failed: 0, total: 3 } },
    typecheckVerification: { status: "PASS", timestamp: "2026-08-24T00:00:00.000Z", source: "gates", summary: "pass", counts: { passed: 1, failed: 0, total: 1 } },
  });
  const actionsNeeded = [...DEPLOYMENT_ACTION_TYPES].filter((action) => action !== "PURCHASE_DOMAIN");
  const readiness = evaluateGovernedDeploymentReadiness({
    handoff: produced.handoff,
    expectedVentureId: produced.handoff.ventureId,
    expectedHandoffId: produced.handoff.handoffId,
    expectedBuildContractId: produced.handoff.buildContractId,
    companyId: produced.handoff.companyId,
    createdAt: "2026-08-24T00:00:00.000Z",
    providers: [
      { capability: "HOSTING", providerSelected: true, credentialAvailable: true, credentialWriteCapable: true, writeAuthorityGranted: true, cost: { value: 0, actuality: "ESTIMATE", currency: "USD" } },
      { capability: "DNS", providerSelected: true, credentialAvailable: true, credentialWriteCapable: true, writeAuthorityGranted: true, cost: { value: 0, actuality: "ESTIMATE", currency: "USD" } },
      { capability: "PAYMENTS", providerSelected: true, credentialAvailable: true, credentialWriteCapable: true, writeAuthorityGranted: true, cost: { value: 0, actuality: "ESTIMATE", currency: "USD" } },
      { capability: "DATABASE", providerSelected: true, credentialAvailable: true, credentialWriteCapable: true, writeAuthorityGranted: true, cost: { value: 0, actuality: "ESTIMATE", currency: "USD" } },
      { capability: "EMAIL", providerSelected: true, credentialAvailable: true, credentialWriteCapable: true, writeAuthorityGranted: true, cost: { value: 0, actuality: "ESTIMATE", currency: "USD" } },
    ],
    domain: { owned: true, selected: true, registrarKnown: true, purchaseRequired: false, renewalCostKnown: true },
    dns: { providerKnown: true, zoneExists: true, zoneVerified: true, writeCredentialAvailable: true, writeAuthorityGranted: true, requiredRecordsKnown: true },
    hosting: { providerSelected: true, writeAuthorityGranted: true, rollbackCapable: true, cost: { value: 0, actuality: "ESTIMATE", currency: "USD" } },
    treasury: { budgetKnown: true, budgetAvailableUsd: 100, reservationPresent: true, authorizedForPaidResources: true },
    eag: { authorizationPresent: true, authorizedActionTypes: actionsNeeded },
    paymentArchitecture: bound.contract.paymentArchitecture,
    paymentWriteAuthorized: true,
    healthCheckPath: "/api/health",
    deploymentAuthority: { granted: false, authorizationId: null, source: null },
    publicLaunchAuthority: { granted: false, authorizationId: null, source: null },
  });
  return { readiness, handoff: produced.handoff };
}

function writes(): ProviderWriteEvidence[] {
  return [
    {
      capability: "HOSTING",
      verificationState: "WRITE_AUTHORIZED",
      credentialAvailable: true,
      credentialWriteCapable: true,
      writeAuthorityGranted: true,
    },
  ];
}

function eagRecords(ventureId: string, organizationId: string): CanonicalEagRecord[] {
  return (["CREATE_HOSTING_PROJECT", "DEPLOY_APPLICATION", "VERIFY_HEALTH"] as const).map((actionType) => ({
    actionType,
    authorizationId: `eag:${actionType}`,
    decision: "AUTO_AUTHORIZE" as const,
    organizationId,
    ventureId,
  }));
}

function treasuryRecords(ventureId: string, organizationId: string): CanonicalTreasuryRecord[] {
  return (["CREATE_HOSTING_PROJECT", "DEPLOY_APPLICATION"] as const).map((actionType) => ({
    actionType,
    authorizationId: `treas:${actionType}`,
    decision: "AUTO_AUTHORIZE" as const,
    authorizedAmountUsd: 5,
    costActuality: "ESTIMATE" as const,
    reservationId: null,
    organizationId,
    ventureId,
  }));
}

function validCatalog(): {
  refs: ReturnType<typeof loadVercelLiveVerificationGovernance>["refs"];
  catalog: VercelLiveGovernanceRecordCatalog;
} {
  const { readiness, handoff } = realReadiness();
  const organizationId = "org-gde-governance";
  const eag = eagRecords(readiness.ventureId, organizationId);
  const treasury = treasuryRecords(readiness.ventureId, organizationId);
  return {
    refs: {
      organizationId,
      ventureId: readiness.ventureId,
      handoffId: handoff.handoffId,
      readinessId: readiness.readinessId,
      executionRequestId: null,
      deploymentAuthorizationId: "deploy-auth-governance",
      eagAuthorizationIds: eag.map((row) => row.authorizationId),
      treasuryAuthorizationIds: treasury.map((row) => row.authorizationId),
    },
    catalog: {
      organizationId,
      readinessById: { [readiness.readinessId]: readiness },
      handoffById: { [handoff.handoffId]: handoff },
      deploymentAuthorityById: {
        "deploy-auth-governance": {
          granted: true,
          authorizationId: "deploy-auth-governance",
          source: "governed-deployment-execution",
          organizationId,
          ventureId: readiness.ventureId,
          readinessId: readiness.readinessId,
          handoffId: handoff.handoffId,
        },
      },
      eagById: Object.fromEntries(eag.map((row) => [row.authorizationId, row])),
      treasuryById: Object.fromEntries(treasury.map((row) => [row.authorizationId, row])),
      providerWrites: writes(),
    },
  };
}

describe("Vercel live verification governance input", () => {
  it("blocks a missing readiness record", () => {
    const { refs, catalog } = validCatalog();
    const loaded = loadVercelLiveVerificationGovernance({
      refs,
      catalog: { ...catalog, readinessById: {} },
    });
    expect(loaded.readiness).toBeNull();
    expect(loaded.blockers.some((item) => item.includes("GovernedDeploymentReadiness"))).toBe(true);
    expect(loaded.fabricated).toBe(false);
  });

  it("blocks wrong readiness lineage", () => {
    const { refs, catalog } = validCatalog();
    const loaded = loadVercelLiveVerificationGovernance({
      refs: { ...refs, readinessId: "gdr:other-venture:other-handoff" },
      catalog,
    });
    expect(loaded.blockers).toContain("wrong readiness lineage");
  });

  it("blocks missing deployment authority", () => {
    const { refs, catalog } = validCatalog();
    const loaded = loadVercelLiveVerificationGovernance({
      refs: { ...refs, deploymentAuthorizationId: null },
      catalog,
    });
    expect(loaded.deploymentAuthority).toBeNull();
    expect(loaded.blockers).toContain("canonical deployment authority is not supplied");
  });

  it("blocks a missing EAG action grant", () => {
    const { refs, catalog } = validCatalog();
    const loaded = loadVercelLiveVerificationGovernance({
      refs: { ...refs, eagAuthorizationIds: ["eag:DEPLOY_APPLICATION"] },
      catalog,
    });
    expect(loaded.blockers.some((item) => item.includes("EAG AUTO_AUTHORIZE missing for CREATE_HOSTING_PROJECT"))).toBe(true);
  });

  it("blocks cross-action EAG reuse", () => {
    const { refs, catalog } = validCatalog();
    const loaded = loadVercelLiveVerificationGovernance({
      refs: { ...refs, eagAuthorizationIds: ["eag:DEPLOY_APPLICATION"] },
      catalog,
    });
    expect(loaded.blockers).toContain("EAG grant cannot authorize a different action");
  });

  it("blocks missing Treasury authorization", () => {
    const { refs, catalog } = validCatalog();
    const loaded = loadVercelLiveVerificationGovernance({
      refs: { ...refs, treasuryAuthorizationIds: [] },
      catalog,
    });
    expect(loaded.blockers).toContain("canonical Treasury authorization IDs are not supplied");
  });

  it("blocks Treasury for the wrong venture", () => {
    const { refs, catalog } = validCatalog();
    const foreign = {
      ...catalog.treasuryById!["treas:CREATE_HOSTING_PROJECT"],
      ventureId: "venture-other",
    };
    const loaded = loadVercelLiveVerificationGovernance({
      refs,
      catalog: {
        ...catalog,
        treasuryById: {
          ...catalog.treasuryById,
          "treas:CREATE_HOSTING_PROJECT": foreign,
        },
      },
    });
    expect(loaded.blockers).toContain("Treasury authorization is for the wrong venture");
  });

  it("blocks Treasury unknown cost without a ceiling", () => {
    clearEnv();
    setValidConfigEnv();
    const { refs, catalog } = validCatalog();
    const unknown = {
      ...catalog.treasuryById!["treas:CREATE_HOSTING_PROJECT"],
      costActuality: "UNKNOWN" as const,
      authorizedAmountUsd: 0,
    };
    const governance = loadVercelLiveVerificationGovernance({
      refs,
      catalog: {
        ...catalog,
        treasuryById: {
          ...catalog.treasuryById,
          "treas:CREATE_HOSTING_PROJECT": unknown,
        },
      },
    });
    const report = evaluateVercelLiveVerificationPreflight({ governance });
    expect(report.treasurySatisfied).toBe(false);
    expect(report.safeToExecuteLive).toBe(false);
  });

  it("blocks a cross-org record", () => {
    const { refs, catalog } = validCatalog();
    const loaded = loadVercelLiveVerificationGovernance({
      refs,
      catalog: {
        ...catalog,
        eagById: {
          ...catalog.eagById,
          "eag:CREATE_HOSTING_PROJECT": {
            ...catalog.eagById!["eag:CREATE_HOSTING_PROJECT"],
            organizationId: "org-other",
          },
        },
      },
    });
    expect(loaded.blockers).toContain("cross-org record");
  });

  it("blocks missing idempotency context", () => {
    const loaded = loadVercelLiveVerificationGovernance({
      refs: {
        organizationId: null,
        ventureId: null,
        handoffId: null,
        readinessId: null,
        executionRequestId: null,
        deploymentAuthorizationId: null,
        eagAuthorizationIds: [],
        treasuryAuthorizationIds: [],
      },
      catalog: null,
    });
    expect(loaded.blockers).toContain("idempotency context is missing");
    expect(loaded.request).toBeNull();
  });

  it("does not treat env IDs as records and does not fabricate", () => {
    clearEnv();
    process.env.INFINITY_VERCEL_READINESS_ID = "gdr:example:handoff";
    process.env.INFINITY_VERCEL_DEPLOYMENT_AUTHORIZATION_ID = "deploy-auth-example";
    const loaded = loadVercelLiveVerificationGovernance();
    expect(loaded.fabricated).toBe(false);
    expect(loaded.envBooleansUsedAsAuthority).toBe(false);
    expect(loaded.recordsResolved).toBe(false);
    expect(loaded.readiness).toBeNull();
    expect(loaded.blockers.some((item) => item.includes("no matching GovernedDeploymentReadiness"))).toBe(true);
  });

  it("passes only when every canonical governance input is present and aligned", () => {
    clearEnv();
    setValidConfigEnv();
    const { refs, catalog } = validCatalog();
    const governance = loadVercelLiveVerificationGovernance({ refs, catalog });
    expect(governance.fabricated).toBe(false);
    expect(governance.readiness?.readyForDeploymentExecution).toBe(true);
    expect(governance.readiness?.readinessId).toBe(
      derivedGovernedReadinessId(governance.readiness!.ventureId, governance.readiness!.productionArtifactHandoffId),
    );
    expect(governance.request?.idempotencyKey).toBe(governance.request?.executionRequestId);
    expect(governance.request?.executionRequestId).toMatch(/^gde:/);
    expect(governedExecutionActionId(governance.request!.executionRequestId, "CREATE_HOSTING_PROJECT")).toBe(
      `gde-action:${governance.request!.executionRequestId}:CREATE_HOSTING_PROJECT`,
    );
    expect(
      governedExecutionActionIdempotencyKey(governance.request!.executionRequestId, "DEPLOY_APPLICATION", "hosting"),
    ).toBe(`${governance.request!.executionRequestId}:DEPLOY_APPLICATION:hosting`);
    const again = loadVercelLiveVerificationGovernance({ refs, catalog });
    expect(again.request?.executionRequestId).toBe(governance.request?.executionRequestId);
    const report = evaluateVercelLiveVerificationPreflight({ governance });
    expect(JSON.stringify(report)).not.toMatch(/Bearer /);
    expect(report.safeToExecuteLive).toBe(true);
    expect(report.blockers).toEqual([]);
    expect(governance.recordsResolved).toBe(true);
  });

  it("keeps the current environment fail-closed without inventing records", () => {
    restoreEnv();
    const current = loadVercelLiveVerificationGovernance();
    const report = evaluateVercelLiveVerificationPreflight({ governance: current });
    expect(current.fabricated).toBe(false);
    expect(report.safeToExecuteLive).toBe(false);
  });
});
