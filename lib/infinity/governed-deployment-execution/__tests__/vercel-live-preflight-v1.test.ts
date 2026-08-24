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
  VERCEL_LIVE_VERIFICATION_ARTIFACT_ID,
  VERCEL_LIVE_VERIFICATION_RESOURCE,
  buildGovernedDeploymentExecutionRequest,
  evaluateVercelLiveVerificationPreflight,
  executeGovernedDeployment,
  isValidGitSha,
  isValidVercelTestRepositoryName,
  loadVercelLiveVerificationConfig,
  type ActionAuthorityGrant,
  type ProviderWriteEvidence,
  type TreasuryActionGrant,
} from "@/lib/infinity/governed-deployment-execution";

const ENV_KEYS = [
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
] as const;

const saved: Record<string, string | undefined> = {};

function snapshotEnv(): void {
  for (const key of ENV_KEYS) saved[key] = process.env[key];
}

function restoreEnv(): void {
  for (const key of ENV_KEYS) {
    if (saved[key] == null) delete process.env[key];
    else process.env[key] = saved[key];
  }
}

function clearConfigEnv(): void {
  for (const key of ENV_KEYS) delete process.env[key];
}

function setValidConfigEnv(): void {
  process.env.VERCEL_TOKEN = "vercel_test_token_placeholder_value";
  process.env.VERCEL_TOKEN_SCOPE = "hosting.verify_deployment,hosting.create_project,hosting.deploy";
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

function planned() {
  const bound = bindVentureSystemsBuildInput({
    ventureId: SIMPLE_DIGITAL_PRODUCT_FIXTURE.ventureId ?? "simple-digital-product-v1",
    companyId: "company-gde-preflight",
    missionId: "mission-gde-preflight",
    buildContractId: "build-gde-preflight",
    contract: buildVentureSystemsContract(SIMPLE_DIGITAL_PRODUCT_FIXTURE),
  });
  const plan = planVentureSystemsBuildCoverage(bound);
  const validation = validateVentureSystemsBuildCoverage({ bound, plan, tasks: [] });
  return { bound, plan, validation };
}

function changeSet(migrations: string[] = []): CodeChangeSet {
  return {
    taskId: "task-gde-preflight",
    provider: "infinity-native",
    model: "test",
    reasoningSummary: "preflight fixture",
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

function readyReadiness() {
  const { plan, validation, bound } = planned();
  const dbRequired = plan.rows.some(
    (row) =>
      row.required &&
      row.disposition === "INTERNAL_BUILD" &&
      ["IDENTITY_AND_ACCOUNTS", "CRM", "ENTITLEMENTS", "COMMERCE_AND_FULFILLMENT"].includes(row.family),
  );
  const migrations = dbRequired ? ["supabase/migrations/0001_init.sql"] : [];
  const handoff = buildProductionArtifactHandoff({
    ventureId: plan.input.ventureId,
    companyId: plan.input.companyId,
    missionId: plan.input.missionId,
    buildContractId: plan.input.buildContractId,
    ventureSystemsBuildContractId: plan.input.ventureSystemsBuildContractId,
    pabBuildRunId: "pab-run-gde-preflight",
    pabArtifactId: "pab-artifact-gde-preflight",
    createdAt: "2026-08-23T00:00:00.000Z",
    architecturePlan: plan,
    architectureValidation: validation,
    codingTaskIds: ["task-gde-preflight"],
    codeChangeSets: [
      {
        codeChangeSetId: "changeset-gde-preflight",
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
      { artifactId: "app", kind: "APPLICATION_SOURCE", status: "PRESENT", path: "app/page.tsx", sourceRef: "changeset-gde-preflight" },
      { artifactId: "arch", kind: "ARCHITECTURE_EVIDENCE", status: "PRESENT", path: null, sourceRef: plan.input.ventureSystemsBuildContractId },
      { artifactId: "build", kind: "BUILD_EVIDENCE", status: "PRESENT", path: null, sourceRef: "gates" },
      { artifactId: "test", kind: "TEST_EVIDENCE", status: "PRESENT", path: null, sourceRef: "gates" },
      ...(dbRequired
        ? [
            { artifactId: "mig", kind: "DATABASE_MIGRATION" as const, status: "PRESENT" as const, path: "supabase/migrations/0001_init.sql", sourceRef: "changeset-gde-preflight" },
            { artifactId: "schema", kind: "DATABASE_SCHEMA" as const, status: "PRESENT" as const, path: "supabase/migrations/0001_init.sql", sourceRef: "changeset-gde-preflight" },
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
    buildVerification: { status: "PASS", timestamp: "2026-08-23T00:00:00.000Z", source: "gates", summary: "pass", counts: { passed: 1, failed: 0, total: 1 } },
    testVerification: { status: "PASS", timestamp: "2026-08-23T00:00:00.000Z", source: "gates", summary: "pass", counts: { passed: 3, failed: 0, total: 3 } },
    typecheckVerification: { status: "PASS", timestamp: "2026-08-23T00:00:00.000Z", source: "gates", summary: "pass", counts: { passed: 1, failed: 0, total: 1 } },
  });
  const actionsNeeded = [...DEPLOYMENT_ACTION_TYPES].filter((action) => action !== "PURCHASE_DOMAIN");
  const readiness = evaluateGovernedDeploymentReadiness({
    handoff: handoff.handoff,
    expectedVentureId: handoff.handoff.ventureId,
    expectedHandoffId: handoff.handoff.handoffId,
    expectedBuildContractId: handoff.handoff.buildContractId,
    companyId: handoff.handoff.companyId,
    createdAt: "2026-08-23T00:00:00.000Z",
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
  return { readiness };
}

function eagAll(): ActionAuthorityGrant[] {
  return (["CREATE_HOSTING_PROJECT", "DEPLOY_APPLICATION", "VERIFY_HEALTH"] as const).map((actionType) => ({
    actionType,
    authorizationId: `eag:${actionType}`,
    decision: "AUTO_AUTHORIZE" as const,
  }));
}

function treasuryAll(ventureId: string): TreasuryActionGrant[] {
  return (["CREATE_HOSTING_PROJECT", "DEPLOY_APPLICATION"] as const).map((actionType) => ({
    actionType,
    authorizationId: `treas:${actionType}`,
    decision: "AUTO_AUTHORIZE" as const,
    authorizedAmountUsd: 5,
    costActuality: "ESTIMATE" as const,
    reservationId: null,
    ventureId,
  }));
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

snapshotEnv();
afterEach(() => {
  restoreEnv();
});

describe("Vercel live verification preflight", () => {
  it("validates repository and SHA shape without network", () => {
    expect(isValidVercelTestRepositoryName("infinity-org/infinity-test-live-verification-gde")).toBe(true);
    expect(isValidVercelTestRepositoryName("not-a-repo")).toBe(false);
    expect(isValidGitSha("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")).toBe(true);
    expect(isValidGitSha("not-a-sha")).toBe(false);
  });

  it("blocks missing token", () => {
    clearConfigEnv();
    const report = evaluateVercelLiveVerificationPreflight();
    expect(report.safeToExecuteLive).toBe(false);
    expect(report.blockers.some((item) => item.includes("VERCEL_TOKEN"))).toBe(true);
  });

  it("blocks unattested scope", () => {
    clearConfigEnv();
    process.env.VERCEL_TOKEN = "vercel_test_token_placeholder_value";
    const report = evaluateVercelLiveVerificationPreflight();
    expect(report.scopeAttested).toBe(false);
    expect(report.safeToExecuteLive).toBe(false);
  });

  it("blocks wrong scope", () => {
    clearConfigEnv();
    process.env.VERCEL_TOKEN = "vercel_test_token_placeholder_value";
    process.env.VERCEL_TOKEN_SCOPE = "dns.configure";
    process.env.VERCEL_TOKEN_SCOPE_KIND = "INFINITY_INTENDED";
    const report = evaluateVercelLiveVerificationPreflight();
    expect(report.scopeAttested).toBe(false);
    expect(report.safeToExecuteLive).toBe(false);
  });

  it("blocks PROVIDER_ENFORCED claims", () => {
    clearConfigEnv();
    setValidConfigEnv();
    process.env.VERCEL_TOKEN_SCOPE_KIND = "PROVIDER_ENFORCED";
    const report = evaluateVercelLiveVerificationPreflight();
    expect(report.config.providerEnforcedClaimed).toBe(true);
    expect(report.safeToExecuteLive).toBe(false);
    expect(report.blockers.some((item) => item.includes("PROVIDER_ENFORCED"))).toBe(true);
  });

  it("blocks missing team", () => {
    clearConfigEnv();
    setValidConfigEnv();
    delete process.env.VERCEL_TEAM_ID;
    expect(evaluateVercelLiveVerificationPreflight().safeToExecuteLive).toBe(false);
  });

  it("blocks unconfirmed test team", () => {
    clearConfigEnv();
    setValidConfigEnv();
    delete process.env.INFINITY_VERCEL_TEST_TEAM_CONFIRMED;
    expect(evaluateVercelLiveVerificationPreflight().safeToExecuteLive).toBe(false);
  });

  it("blocks missing and invalid repo", () => {
    clearConfigEnv();
    setValidConfigEnv();
    delete process.env.INFINITY_VERCEL_TEST_REPO;
    expect(evaluateVercelLiveVerificationPreflight().safeToExecuteLive).toBe(false);
    process.env.INFINITY_VERCEL_TEST_REPO = "not valid";
    expect(evaluateVercelLiveVerificationPreflight().safeToExecuteLive).toBe(false);
  });

  it("blocks missing and invalid SHA", () => {
    clearConfigEnv();
    setValidConfigEnv();
    delete process.env.INFINITY_VERCEL_TEST_SHA;
    expect(evaluateVercelLiveVerificationPreflight().safeToExecuteLive).toBe(false);
    process.env.INFINITY_VERCEL_TEST_SHA = "xyz";
    expect(evaluateVercelLiveVerificationPreflight().safeToExecuteLive).toBe(false);
  });

  it("blocks artifact mismatch", () => {
    clearConfigEnv();
    setValidConfigEnv();
    process.env.INFINITY_VERCEL_TEST_ARTIFACT_ID = "some-other-artifact";
    const report = evaluateVercelLiveVerificationPreflight();
    expect(report.artifactMatched).toBe(false);
    expect(report.safeToExecuteLive).toBe(false);
  });

  it("blocks missing leftover acceptance", () => {
    clearConfigEnv();
    setValidConfigEnv();
    delete process.env.INFINITY_VERCEL_LEFTOVER_RESOURCE_ACCEPTED;
    expect(evaluateVercelLiveVerificationPreflight().leftoverAccepted).toBe(false);
    expect(evaluateVercelLiveVerificationPreflight().safeToExecuteLive).toBe(false);
  });

  it("blocks missing Treasury and unknown cost without a ceiling", () => {
    clearConfigEnv();
    setValidConfigEnv();
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "LIVE",
      deploymentAuthority: { granted: true, authorizationId: "deploy-auth-preflight", source: "test" },
      requestedActions: ["CREATE_HOSTING_PROJECT", "DEPLOY_APPLICATION", "VERIFY_HEALTH"],
    });
    const report = evaluateVercelLiveVerificationPreflight({
      request,
      readiness,
      eagAuthorizations: eagAll(),
      providerWrites: writes(),
    });
    expect(report.treasurySatisfied).toBe(false);
    expect(report.costPolicySatisfied).toBe(false);
    expect(report.safeToExecuteLive).toBe(false);
  });

  it("blocks missing EAG and does not reuse another action", () => {
    clearConfigEnv();
    setValidConfigEnv();
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "LIVE",
      deploymentAuthority: { granted: true, authorizationId: "deploy-auth-preflight", source: "test" },
      requestedActions: ["CREATE_HOSTING_PROJECT", "DEPLOY_APPLICATION", "VERIFY_HEALTH"],
    });
    const report = evaluateVercelLiveVerificationPreflight({
      request,
      readiness,
      eagAuthorizations: [{ actionType: "DEPLOY_APPLICATION", authorizationId: "eag:deploy", decision: "AUTO_AUTHORIZE" }],
      treasuryAuthorizations: treasuryAll(request.ventureId),
      providerWrites: writes(),
    });
    expect(report.eagSatisfied).toBe(false);
    expect(report.safeToExecuteLive).toBe(false);
  });

  it("blocks public launch authority for this verification flow", () => {
    clearConfigEnv();
    setValidConfigEnv();
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "LIVE",
      deploymentAuthority: { granted: true, authorizationId: "deploy-auth-preflight", source: "test" },
      publicLaunchAuthority: { granted: true, authorizationId: "launch-auth", source: "test" },
      requestedActions: ["CREATE_HOSTING_PROJECT", "DEPLOY_APPLICATION", "VERIFY_HEALTH"],
    });
    const report = evaluateVercelLiveVerificationPreflight({
      request,
      readiness,
      eagAuthorizations: eagAll(),
      treasuryAuthorizations: treasuryAll(request.ventureId),
      providerWrites: writes(),
    });
    expect(report.publicLaunchDisabled).toBe(false);
    expect(report.safeToExecuteLive).toBe(false);
  });

  it("passes only when every required precondition is present", () => {
    clearConfigEnv();
    setValidConfigEnv();
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "LIVE",
      deploymentAuthority: { granted: true, authorizationId: "deploy-auth-preflight", source: "test" },
      requestedActions: ["CREATE_HOSTING_PROJECT", "DEPLOY_APPLICATION", "VERIFY_HEALTH"],
    });
    const report = evaluateVercelLiveVerificationPreflight({
      request,
      readiness,
      eagAuthorizations: eagAll(),
      treasuryAuthorizations: treasuryAll(request.ventureId),
      providerWrites: writes(),
    });
    expect(report.config.scopeAloneGrantsLive).toBe(false);
    expect(JSON.stringify(report)).not.toMatch(/Bearer /);
    expect(report.safeToExecuteLive).toBe(true);
    expect(report.blockers).toEqual([]);
  });

  it("does not let the current incomplete environment execute LIVE", async () => {
    restoreEnv();
    const current = evaluateVercelLiveVerificationPreflight();
    expect(current.safeToExecuteLive).toBe(false);
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "LIVE",
      deploymentAuthority: { granted: true, authorizationId: "deploy-auth-preflight", source: "test" },
      requestedActions: ["CREATE_HOSTING_PROJECT", "DEPLOY_APPLICATION", "VERIFY_HEALTH"],
    });
    const result = await executeGovernedDeployment({
      request,
      readiness,
      allowVercelLive: true,
      eagAuthorizations: eagAll(),
      treasuryAuthorizations: treasuryAll(request.ventureId),
      providerWrites: writes(),
    });
    expect(result.blockers.map((item) => item.code)).toContain("DEPLOYMENT_EXECUTION_LIVE_PRECONDITION");
    expect(result.liveSideEffects.deployments).toBe(0);
    const config = loadVercelLiveVerificationConfig();
    expect(config.scopeAloneGrantsLive).toBe(false);
  });
});
