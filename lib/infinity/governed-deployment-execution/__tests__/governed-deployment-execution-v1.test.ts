import { beforeEach, describe, expect, it } from "vitest";
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
  askToExecuteGovernedDeployment,
  buildGovernedDeploymentExecutionRequest,
  executeGovernedDeployment,
  gatewayActionTypeFor,
  resetGovernedExecutionReplayCache,
  toGovernedDeploymentExecutionHqView,
  type ActionAuthorityGrant,
  type ProviderWriteEvidence,
  type TreasuryActionGrant,
} from "@/lib/infinity/governed-deployment-execution";

function planned() {
  const bound = bindVentureSystemsBuildInput({
    ventureId: SIMPLE_DIGITAL_PRODUCT_FIXTURE.ventureId ?? "simple-digital-product-v1",
    companyId: "company-gde",
    missionId: "mission-gde",
    buildContractId: "build-gde",
    contract: buildVentureSystemsContract(SIMPLE_DIGITAL_PRODUCT_FIXTURE),
  });
  const plan = planVentureSystemsBuildCoverage(bound);
  const validation = validateVentureSystemsBuildCoverage({ bound, plan, tasks: [] });
  return { bound, plan, validation };
}

function changeSet(migrations: string[] = []): CodeChangeSet {
  return {
    taskId: "task-gde",
    provider: "infinity-native",
    model: "test",
    reasoningSummary: "gde fixture",
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
    pabBuildRunId: "pab-run-gde",
    pabArtifactId: "pab-artifact-gde",
    createdAt: "2026-08-23T00:00:00.000Z",
    architecturePlan: plan,
    architectureValidation: validation,
    codingTaskIds: ["task-gde"],
    codeChangeSets: [
      {
        codeChangeSetId: "changeset-gde",
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
      { artifactId: "app", kind: "APPLICATION_SOURCE", status: "PRESENT", path: "app/page.tsx", sourceRef: "changeset-gde" },
      { artifactId: "arch", kind: "ARCHITECTURE_EVIDENCE", status: "PRESENT", path: null, sourceRef: plan.input.ventureSystemsBuildContractId },
      { artifactId: "build", kind: "BUILD_EVIDENCE", status: "PRESENT", path: null, sourceRef: "gates" },
      { artifactId: "test", kind: "TEST_EVIDENCE", status: "PRESENT", path: null, sourceRef: "gates" },
      ...(dbRequired
        ? [
            { artifactId: "mig", kind: "DATABASE_MIGRATION" as const, status: "PRESENT" as const, path: "supabase/migrations/0001_init.sql", sourceRef: "changeset-gde" },
            { artifactId: "schema", kind: "DATABASE_SCHEMA" as const, status: "PRESENT" as const, path: "supabase/migrations/0001_init.sql", sourceRef: "changeset-gde" },
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
  return { readiness, handoff: handoff.handoff };
}

function writeAuthorized(): ProviderWriteEvidence[] {
  return (["HOSTING", "DNS", "PAYMENTS", "DATABASE", "REGISTRAR"] as const).map((capability) => ({
    capability,
    verificationState: "WRITE_AUTHORIZED" as const,
    credentialAvailable: true,
    credentialWriteCapable: true,
    writeAuthorityGranted: true,
  }));
}

function eagFor(actions: ActionAuthorityGrant["actionType"][]): ActionAuthorityGrant[] {
  return actions.map((actionType) => ({
    actionType,
    authorizationId: `eag:${actionType}`,
    decision: "AUTO_AUTHORIZE" as const,
  }));
}

function deploymentGrant() {
  return { granted: true, authorizationId: "deploy-auth-gde-1", source: "canonical_test_grant" };
}

beforeEach(() => {
  resetGovernedExecutionReplayCache();
});

describe("Governed Deployment Execution V1", () => {
  it("maps approved actions onto existing Launch Gateway types and does not add a second executor", () => {
    expect(gatewayActionTypeFor("CREATE_HOSTING_PROJECT")).toBe("hosting.create_project");
    expect(gatewayActionTypeFor("DEPLOY_APPLICATION")).toBe("hosting.deploy");
    expect(gatewayActionTypeFor("UPSERT_DNS_RECORD")).toBe("dns.configure");
    expect(gatewayActionTypeFor("PURCHASE_DOMAIN")).toBe("domain.register");
    expect(gatewayActionTypeFor("VERIFY_HEALTH")).toBe("hosting.verify_deployment");
    expect(gatewayActionTypeFor("RUN_PRODUCTION_MIGRATION")).toBeNull();
  });

  it("blocks execution when readiness is not ready even if technical evidence exists", async () => {
    const { readiness } = readyReadiness();
    const notReady = { ...readiness, readyForDeploymentExecution: false, state: "TECHNICALLY_READY" as const };
    const request = buildGovernedDeploymentExecutionRequest({
      readiness: notReady,
      mode: "SIMULATION",
      deploymentAuthority: deploymentGrant(),
    });
    expect(request.executable).toBe(false);
    const result = await executeGovernedDeployment({ request, readiness: notReady, providerWrites: writeAuthorized(), eagAuthorizations: eagFor(request.requiredActions) });
    expect(result.state).toBe("BLOCKED");
    expect(result.blockers.map((item) => item.code)).toContain("DEPLOYMENT_EXECUTION_NOT_READY");
    expect(result.liveSideEffects.deployments).toBe(0);
  });

  it("blocks when canonical deployment authority is missing", () => {
    const { readiness } = readyReadiness();
    expect(readiness.readyForDeploymentExecution).toBe(true);
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "SIMULATION",
      deploymentAuthority: { granted: false, authorizationId: null, source: null },
    });
    expect(request.executable).toBe(false);
    expect(request.blockers.map((item) => item.code)).toContain("DEPLOYMENT_EXECUTION_AUTHORITY_MISSING");
  });

  it("does not require public launch authority for private deployment", () => {
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "DRY_RUN",
      deploymentAuthority: deploymentGrant(),
      publicLaunchAuthority: { granted: false, authorizationId: null, source: null },
    });
    expect(request.executable).toBe(true);
    expect(request.publicLaunchAuthorizationId).toBeNull();
  });

  it("blocks READ_ONLY_VERIFIED provider writes", async () => {
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "SIMULATION",
      deploymentAuthority: deploymentGrant(),
      requestedActions: ["DEPLOY_APPLICATION"],
    });
    const result = await executeGovernedDeployment({
      request,
      readiness,
      eagAuthorizations: eagFor(["DEPLOY_APPLICATION"]),
      providerWrites: [{ capability: "HOSTING", verificationState: "READ_ONLY_VERIFIED", credentialAvailable: true, credentialWriteCapable: false, writeAuthorityGranted: false }],
    });
    expect(result.blockers.map((item) => item.code)).toContain("DEPLOYMENT_EXECUTION_PROVIDER_READ_ONLY");
    expect(result.simulatedSideEffects.deployments).toBe(0);
  });

  it("blocks WRITE_CAPABLE_NOT_AUTHORIZED", async () => {
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "SIMULATION",
      deploymentAuthority: deploymentGrant(),
      requestedActions: ["DEPLOY_APPLICATION"],
    });
    const result = await executeGovernedDeployment({
      request,
      readiness,
      eagAuthorizations: eagFor(["DEPLOY_APPLICATION"]),
      providerWrites: [{ capability: "HOSTING", verificationState: "WRITE_CAPABLE_NOT_AUTHORIZED", credentialAvailable: true, credentialWriteCapable: true, writeAuthorityGranted: false }],
    });
    expect(result.blockers.map((item) => item.code)).toContain("DEPLOYMENT_EXECUTION_AUTHORITY_MISSING");
  });

  it("blocks missing EAG for a specific action and does not reuse another action grant", async () => {
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "SIMULATION",
      deploymentAuthority: deploymentGrant(),
      requestedActions: ["DEPLOY_APPLICATION", "UPSERT_DNS_RECORD"],
    });
    const result = await executeGovernedDeployment({
      request,
      readiness,
      eagAuthorizations: eagFor(["DEPLOY_APPLICATION"]),
      providerWrites: writeAuthorized(),
    });
    expect(result.actionsAttempted.find((item) => item.actionType === "DEPLOY_APPLICATION")?.specificActionAuthorized).toBe(true);
    expect(result.actionsAttempted.find((item) => item.actionType === "UPSERT_DNS_RECORD")?.specificActionAuthorized).toBe(false);
    expect(result.blockers.map((item) => item.code)).toContain("DEPLOYMENT_EXECUTION_EAG_DENIED");
    expect(result.state).not.toBe("SUCCEEDED");
  });

  it("blocks missing Treasury and unknown cost treated as zero", async () => {
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "SIMULATION",
      deploymentAuthority: deploymentGrant(),
      requestedActions: ["PURCHASE_DOMAIN"],
    });
    const missing = await executeGovernedDeployment({
      request,
      readiness,
      eagAuthorizations: eagFor(["PURCHASE_DOMAIN"]),
      providerWrites: writeAuthorized(),
    });
    expect(missing.blockers.map((item) => item.code)).toContain("DEPLOYMENT_EXECUTION_TREASURY_DENIED");
    const unknown: TreasuryActionGrant[] = [
      { actionType: "PURCHASE_DOMAIN", authorizationId: "treas-unknown", decision: "AUTO_AUTHORIZE", authorizedAmountUsd: 0, costActuality: "UNKNOWN", reservationId: null },
    ];
    const unknownResult = await executeGovernedDeployment({
      request,
      readiness,
      eagAuthorizations: eagFor(["PURCHASE_DOMAIN"]),
      treasuryAuthorizations: unknown,
      providerWrites: writeAuthorized(),
    });
    expect(unknownResult.blockers.map((item) => item.code)).toContain("DEPLOYMENT_EXECUTION_UNKNOWN_COST");
    expect(unknownResult.costsIncurred.unknown || unknownResult.blockers.some((item) => item.code === "DEPLOYMENT_EXECUTION_UNKNOWN_COST")).toBe(true);
  });

  it("blocks wrong venture and wrong readiness lineage", async () => {
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "SIMULATION",
      expectedVentureId: "venture-other",
      expectedReadinessId: "gdr:other",
      deploymentAuthority: deploymentGrant(),
    });
    expect(request.blockers.map((item) => item.code)).toContain("DEPLOYMENT_EXECUTION_LINEAGE_MISMATCH");
    const mismatched = await executeGovernedDeployment({
      request: { ...request, executable: true, blockers: [] },
      readiness: { ...readiness, ventureId: "venture-other-2" },
      eagAuthorizations: eagFor(request.requiredActions),
      providerWrites: writeAuthorized(),
    });
    expect(mismatched.blockers.map((item) => item.code)).toContain("DEPLOYMENT_EXECUTION_LINEAGE_MISMATCH");
  });

  it("never silently promotes DRY_RUN to LIVE even if a live port is present", async () => {
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "DRY_RUN",
      deploymentAuthority: deploymentGrant(),
      requestedActions: ["DEPLOY_APPLICATION"],
    });
    let liveCalls = 0;
    const result = await executeGovernedDeployment({
      request,
      readiness,
      eagAuthorizations: eagFor(["DEPLOY_APPLICATION"]),
      providerWrites: writeAuthorized(),
      liveGateway: {
        execute: async () => {
          liveCalls += 1;
          return { providerCallId: "should-not-run", externalIds: {}, actualCostUsd: 0 };
        },
      },
    });
    expect(result.mode).toBe("DRY_RUN");
    expect(result.state).toBe("AUTHORIZED");
    expect(liveCalls).toBe(0);
    expect(result.liveSideEffects.deployments).toBe(0);
    expect(result.simulatedSideEffects.deployments).toBe(0);
  });

  it("does not configure LIVE writes without an explicit Launch Gateway port", async () => {
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "LIVE",
      deploymentAuthority: deploymentGrant(),
      requestedActions: ["DEPLOY_APPLICATION"],
    });
    const result = await executeGovernedDeployment({
      request,
      readiness,
      eagAuthorizations: eagFor(["DEPLOY_APPLICATION"]),
      providerWrites: writeAuthorized(),
    });
    expect(result.blockers.map((item) => item.code)).toContain("DEPLOYMENT_EXECUTION_LIVE_NOT_CONFIGURED");
    expect(result.liveSideEffects.deployments).toBe(0);
  });

  it("replays the same action without duplicating simulated resources", async () => {
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "SIMULATION",
      deploymentAuthority: deploymentGrant(),
      requestedActions: ["CREATE_HOSTING_PROJECT", "DEPLOY_APPLICATION"],
    });
    const first = await executeGovernedDeployment({
      request,
      readiness,
      eagAuthorizations: eagFor(["CREATE_HOSTING_PROJECT", "DEPLOY_APPLICATION"]),
      providerWrites: writeAuthorized(),
    });
    const second = await executeGovernedDeployment({
      request,
      readiness,
      eagAuthorizations: eagFor(["CREATE_HOSTING_PROJECT", "DEPLOY_APPLICATION"]),
      providerWrites: writeAuthorized(),
    });
    expect(first.state).toBe("SUCCEEDED");
    expect(second.actionsAttempted.every((item) => item.reused)).toBe(true);
    expect(second.providerReferences).toEqual(first.providerReferences);
    expect(second.simulatedSideEffects.deployments).toBe(0);
    expect(first.simulatedSideEffects.deployments).toBe(1);
  });

  it("reports partial failure instead of full success", async () => {
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "SIMULATION",
      deploymentAuthority: deploymentGrant(),
      requestedActions: ["DEPLOY_APPLICATION", "UPSERT_DNS_RECORD"],
    });
    const result = await executeGovernedDeployment({
      request,
      readiness,
      eagAuthorizations: eagFor(["DEPLOY_APPLICATION", "UPSERT_DNS_RECORD"]),
      providerWrites: writeAuthorized(),
      simulateFailures: ["UPSERT_DNS_RECORD"],
    });
    expect(result.state).toBe("PARTIALLY_SUCCEEDED");
    expect(result.blockers.map((item) => item.code)).toEqual(expect.arrayContaining(["DEPLOYMENT_EXECUTION_DNS_FAILED", "DEPLOYMENT_EXECUTION_PARTIAL_FAILURE"]));
    expect(result.actionsSucceeded.length).toBeGreaterThan(0);
    expect(result.actionsFailed.length).toBeGreaterThan(0);
  });

  it("never marks public launch from a successful deployment", async () => {
    const { readiness } = readyReadiness();
    const actions = ["CREATE_HOSTING_PROJECT", "DEPLOY_APPLICATION", "VERIFY_HEALTH"] as const;
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "SIMULATION",
      deploymentAuthority: deploymentGrant(),
      requestedActions: [...actions],
    });
    const result = await executeGovernedDeployment({
      request,
      readiness,
      eagAuthorizations: eagFor([...actions]),
      providerWrites: writeAuthorized(),
    });
    expect(result.state).toBe("SUCCEEDED");
    expect(result.publicLaunchState).toBe("NOT_AUTHORIZED");
    expect(result.liveSideEffects.publicLaunches).toBe(0);
    expect(result.simulatedSideEffects.publicLaunches).toBe(0);
  });

  it("excludes secrets from results and models health plus rollback without live mutation", async () => {
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "SIMULATION",
      deploymentAuthority: deploymentGrant(),
      requestedActions: ["CONFIGURE_ENVIRONMENT", "VERIFY_HEALTH", "ROLLBACK_DEPLOYMENT"],
    });
    const synthetic = ["sk", "live", "x".repeat(24)].join("_");
    const result = await executeGovernedDeployment({
      request,
      readiness,
      eagAuthorizations: eagFor(["VERIFY_HEALTH", "ROLLBACK_DEPLOYMENT"]),
      providerWrites: writeAuthorized(),
      environmentVariableNames: ["PAYMENTS_PROVIDER_SECRET"],
      secretValuesForbidden: [synthetic],
    });
    expect(JSON.stringify(result)).not.toContain(synthetic);
    expect(result.blockers.map((item) => item.code)).not.toContain("DEPLOYMENT_EXECUTION_SECRET_LEAKAGE");
    expect(result.healthCheckState).toBe("PASS");
    expect(result.rollbackState).toBe("SIMULATED");
    expect(result.liveSideEffects.productionMigrations).toBe(0);
  });

  it("simulates hosting, DNS, domain, payment, webhook, and migration without live side effects", async () => {
    const { readiness } = readyReadiness();
    const actions = [
      "CREATE_HOSTING_PROJECT",
      "DEPLOY_APPLICATION",
      "UPSERT_DNS_RECORD",
      "PURCHASE_DOMAIN",
      "CONFIGURE_PAYMENT_RESOURCE",
      "CREATE_WEBHOOK",
      "RUN_PRODUCTION_MIGRATION",
      "VERIFY_HEALTH",
    ] as const;
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "SIMULATION",
      deploymentAuthority: deploymentGrant(),
      requestedActions: [...actions],
    });
    const treasury: TreasuryActionGrant[] = [
      { actionType: "PURCHASE_DOMAIN", authorizationId: "treas-domain", decision: "AUTO_AUTHORIZE", authorizedAmountUsd: 12, costActuality: "KNOWN", reservationId: "res-domain" },
    ];
    const result = await executeGovernedDeployment({
      request,
      readiness,
      eagAuthorizations: eagFor([...actions]),
      treasuryAuthorizations: treasury,
      providerWrites: writeAuthorized(),
    });
    expect(result.state).toBe("SUCCEEDED");
    expect(result.mode).toBe("SIMULATION");
    expect(result.simulatedSideEffects.deployments).toBe(1);
    expect(result.simulatedSideEffects.dnsWrites).toBe(1);
    expect(result.simulatedSideEffects.domainPurchases).toBe(1);
    expect(result.simulatedSideEffects.paymentWrites).toBe(1);
    expect(result.simulatedSideEffects.webhookWrites).toBe(1);
    expect(result.simulatedSideEffects.productionMigrations).toBe(1);
    expect(result.liveSideEffects).toEqual({
      treasuryMovements: 0,
      treasuryReservations: 0,
      providerAccountCreation: 0,
      providerWrites: 0,
      purchases: 0,
      eagActions: 0,
      deployments: 0,
      domainPurchases: 0,
      dnsWrites: 0,
      paymentWrites: 0,
      productionMigrations: 0,
      webhookWrites: 0,
      publicLaunches: 0,
    });
    expect(result.traceability.ventureId).toBe(readiness.ventureId);
    expect(result.traceability.handoffId).toBe(readiness.productionArtifactHandoffId);
    expect(result.traceability.readinessId).toBe(readiness.readinessId);
    expect(result.traceability.executionRequestId).toBe(request.executionRequestId);
    expect(result.traceability.actionIds.length).toBeGreaterThan(0);
    const hq = toGovernedDeploymentExecutionHqView(result);
    expect(hq.deployment).toBe("SUCCEEDED");
    expect(hq.publicLaunch).toBe("NOT AUTHORIZED");
    const gate = askToExecuteGovernedDeployment({ request, result });
    expect(gate.bypassesLaunchGateway).toBe(false);
    expect(gate.publicLaunchTriggered).toBe(false);
  });
});
