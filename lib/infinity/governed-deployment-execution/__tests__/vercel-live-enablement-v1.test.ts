import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import type { ExternalActionAdapter } from "@/lib/infinity/launch-gateway/adapters/contract";
import {
  buildGovernedDeploymentExecutionRequest,
  createVercelLiveGatewayPort,
  createMemoryGdeLiveActionLedger,
  executeGovernedDeployment,
  classifyVercelLiveCost,
  inspectVercelLiveCredentialAttestation,
  inspectVercelLiveCredentialSafety,
  inspectVercelLivePreconditions,
  isDisposableVercelTestResource,
  resetGovernedExecutionReplayCache,
  vercelCleanupSupported,
  VERCEL_LIVE_ALLOWED_ACTIONS,
  VERCEL_LIVE_PROVIDER,
  VERCEL_LIVE_SCOPE_CONTRACT,
  VERCEL_LIVE_VERIFICATION_ARTIFACT_PATH,
  VERCEL_LIVE_VERIFICATION_RESOURCE,
  type ActionAuthorityGrant,
  type LiveGatewayPort,
  type ProviderWriteEvidence,
  type TreasuryActionGrant,
} from "@/lib/infinity/governed-deployment-execution";

const TEST_RESOURCE = "infinity-test-gde-live-verify";
const HOSTING_ACTIONS = ["CREATE_HOSTING_PROJECT", "DEPLOY_APPLICATION", "VERIFY_HEALTH"] as const;

function planned() {
  const bound = bindVentureSystemsBuildInput({
    ventureId: SIMPLE_DIGITAL_PRODUCT_FIXTURE.ventureId ?? "simple-digital-product-v1",
    companyId: "company-gde-live",
    missionId: "mission-gde-live",
    buildContractId: "build-gde-live",
    contract: buildVentureSystemsContract(SIMPLE_DIGITAL_PRODUCT_FIXTURE),
  });
  const plan = planVentureSystemsBuildCoverage(bound);
  const validation = validateVentureSystemsBuildCoverage({ bound, plan, tasks: [] });
  return { bound, plan, validation };
}

function changeSet(migrations: string[] = []): CodeChangeSet {
  return {
    taskId: "task-gde-live",
    provider: "infinity-native",
    model: "test",
    reasoningSummary: "vercel live fixture",
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
    pabBuildRunId: "pab-run-gde-live",
    pabArtifactId: "pab-artifact-gde-live",
    createdAt: "2026-08-23T00:00:00.000Z",
    architecturePlan: plan,
    architectureValidation: validation,
    codingTaskIds: ["task-gde-live"],
    codeChangeSets: [
      {
        codeChangeSetId: "changeset-gde-live",
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
      { artifactId: "app", kind: "APPLICATION_SOURCE", status: "PRESENT", path: "app/page.tsx", sourceRef: "changeset-gde-live" },
      { artifactId: "arch", kind: "ARCHITECTURE_EVIDENCE", status: "PRESENT", path: null, sourceRef: plan.input.ventureSystemsBuildContractId },
      { artifactId: "build", kind: "BUILD_EVIDENCE", status: "PRESENT", path: null, sourceRef: "gates" },
      { artifactId: "test", kind: "TEST_EVIDENCE", status: "PRESENT", path: null, sourceRef: "gates" },
      ...(dbRequired
        ? [
            { artifactId: "mig", kind: "DATABASE_MIGRATION" as const, status: "PRESENT" as const, path: "supabase/migrations/0001_init.sql", sourceRef: "changeset-gde-live" },
            { artifactId: "schema", kind: "DATABASE_SCHEMA" as const, status: "PRESENT" as const, path: "supabase/migrations/0001_init.sql", sourceRef: "changeset-gde-live" },
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

function writeAuthorized(state: ProviderWriteEvidence["verificationState"] = "WRITE_AUTHORIZED"): ProviderWriteEvidence[] {
  return [
    {
      capability: "HOSTING",
      verificationState: state,
      credentialAvailable: true,
      credentialWriteCapable: state !== "READ_ONLY_VERIFIED",
      writeAuthorityGranted: state === "WRITE_AUTHORIZED",
    },
  ];
}

function eagFor(actions: ActionAuthorityGrant["actionType"][]): ActionAuthorityGrant[] {
  return actions.map((actionType) => ({
    actionType,
    authorizationId: `eag:${actionType}`,
    decision: "AUTO_AUTHORIZE" as const,
  }));
}

function treasuryFor(actions: Array<"CREATE_HOSTING_PROJECT" | "DEPLOY_APPLICATION">): TreasuryActionGrant[] {
  return actions.map((actionType) => ({
    actionType,
    authorizationId: `treas:${actionType}`,
    decision: "AUTO_AUTHORIZE" as const,
    authorizedAmountUsd: 1,
    costActuality: "ESTIMATE" as const,
    reservationId: null,
  }));
}

function deploymentGrant() {
  return { granted: true, authorizationId: "deploy-auth-gde-live-1", source: "canonical_test_grant" };
}

function vercelPayload() {
  return {
    testResourceName: TEST_RESOURCE,
    production_artifact_id: "artifact-gde-live",
    artifact_hash: "hash-gde-live",
    repository_full_name: "infinity-test/gde-live-verify",
    commit_sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  };
}

function countingLivePort(calls: string[]): LiveGatewayPort {
  return {
    execute: async (input): ReturnType<LiveGatewayPort["execute"]> => {
      calls.push(input.gatewayActionType);
      if (input.gatewayActionType === "hosting.create_project") {
        return {
          providerCallId: "vz-proj-1",
          externalIds: { project_id: "prj_test_gde", project_name: TEST_RESOURCE },
          actualCostUsd: null,
          ready: true,
        };
      }
      if (input.gatewayActionType === "hosting.deploy") {
        return {
          providerCallId: "vz-dep-1",
          externalIds: { deployment_id: "dpl_test_gde", url: "https://infinity-test-gde-live-verify.vercel.app" },
          actualCostUsd: null,
          ready: true,
        };
      }
      return {
        providerCallId: "vz-ver-1",
        externalIds: { deployment_id: "dpl_test_gde", url: "https://infinity-test-gde-live-verify.vercel.app" },
        actualCostUsd: null,
        verified: true,
      };
    },
  } satisfies LiveGatewayPort;
}

let vercelExecuteSpy: { mock: { calls: unknown[] }; mockRestore: () => void } | null = null;

beforeEach(() => {
  resetGovernedExecutionReplayCache();
  vercelExecuteSpy = vi.spyOn(vercelAdapter, "execute").mockImplementation(async () => {
    throw new Error("vercelAdapter.execute must not be called from unit tests");
  });
});

afterEach(() => {
  vercelExecuteSpy?.mockRestore();
  vercelExecuteSpy = null;
});

describe("Live Deployment Provider Enablement V1 — Vercel", () => {
  it("reuses the existing Vercel adapter and does not create a parallel executor", () => {
    expect(VERCEL_LIVE_PROVIDER).toBe("vercel.com_v1");
    expect([...VERCEL_LIVE_ALLOWED_ACTIONS]).toEqual([
      "hosting.create_project",
      "hosting.deploy",
      "hosting.verify_deployment",
    ]);
    expect(vercelAdapter.capabilities.supportedActions).toEqual([...VERCEL_LIVE_ALLOWED_ACTIONS]);
    expect(vercelCleanupSupported()).toBe(false);
    expect(isDisposableVercelTestResource(TEST_RESOURCE)).toBe(true);
    expect(isDisposableVercelTestResource("customer-prod")).toBe(false);
  });

  it("inspects credential metadata without exposing secret material", () => {
    const safety = inspectVercelLiveCredentialSafety();
    expect(safety.serverOnly).toBe(true);
    expect(safety.secretPrinted).toBe(false);
    expect(safety.secretPersisted).toBe(false);
    const serialized = JSON.stringify(safety);
    expect(serialized).not.toMatch(/Bearer /i);
    expect(serialized).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}/);
    expect(Object.values(safety).every((value) => typeof value === "boolean")).toBe(true);
    if (!safety.writeScopeAdequate) {
      expect(safety.broadUnrestricted || !safety.credentialPresent).toBe(true);
    }
  });

  it("does not treat VERCEL_TOKEN_SCOPE as provider-enforced LIVE authority", () => {
    const previousScope = process.env.VERCEL_TOKEN_SCOPE;
    const previousKind = process.env.VERCEL_TOKEN_SCOPE_KIND;
    try {
      process.env.VERCEL_TOKEN_SCOPE = "hosting.create_project,hosting.deploy,hosting.verify_deployment";
      process.env.VERCEL_TOKEN_SCOPE_KIND = "INFINITY_INTENDED";
      const attestation = inspectVercelLiveCredentialAttestation();
      expect(attestation.oneMetadataStringGrantsLive).toBe(false);
      expect(attestation.actionLevelGovernanceStillRequired).toBe(true);
      expect(attestation.providerEnforcedActionScope).toBe(false);
      expect(VERCEL_LIVE_SCOPE_CONTRACT.providerEnforcedActionScopeSupported).toBe(false);
      expect(attestation.writeScopeAdequate).toBe(false);
      expect(attestation.classification).not.toBe("SCOPED");
      expect(["MISSING", "UNATTESTED", "BROAD", "UNKNOWN"]).toContain(attestation.classification);
      expect(classifyVercelLiveCost()).toBe("UNKNOWN");
    } finally {
      if (previousScope == null) delete process.env.VERCEL_TOKEN_SCOPE;
      else process.env.VERCEL_TOKEN_SCOPE = previousScope;
      if (previousKind == null) delete process.env.VERCEL_TOKEN_SCOPE_KIND;
      else process.env.VERCEL_TOKEN_SCOPE_KIND = previousKind;
    }
  });

  it("keeps the disposable verification artifact free of production systems and secrets", () => {
    expect(isDisposableVercelTestResource(VERCEL_LIVE_VERIFICATION_RESOURCE)).toBe(true);
    const html = readFileSync(resolve(process.cwd(), VERCEL_LIVE_VERIFICATION_ARTIFACT_PATH), "utf8");
    expect(html).toContain("Infinity deployment verification");
    expect(html).not.toMatch(/Bearer /i);
    expect(html).not.toMatch(/sk_live_|sk_test_|whsec_|ghp_/);
    expect(html).not.toMatch(/stripe|postgres|customer|production domain/i);
  });

  it("blocks READ_ONLY_VERIFIED live deploy before any provider call", async () => {
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "LIVE",
      deploymentAuthority: deploymentGrant(),
      requestedActions: ["DEPLOY_APPLICATION"],
    });
    const calls: string[] = [];
    const result = await executeGovernedDeployment({
      request,
      readiness,
      eagAuthorizations: eagFor(["DEPLOY_APPLICATION"]),
      treasuryAuthorizations: treasuryFor(["DEPLOY_APPLICATION"]),
      providerWrites: writeAuthorized("READ_ONLY_VERIFIED"),
      liveGateway: countingLivePort(calls),
      vercelLivePayload: vercelPayload(),
    });
    expect(result.blockers.map((item) => item.code)).toContain("DEPLOYMENT_EXECUTION_PROVIDER_READ_ONLY");
    expect(calls).toEqual([]);
    expect(vercelExecuteSpy?.mock.calls.length ?? 0).toBe(0);
    expect(result.liveSideEffects.deployments).toBe(0);
  });

  it("blocks WRITE_CAPABLE_NOT_AUTHORIZED live deploy", async () => {
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "LIVE",
      deploymentAuthority: deploymentGrant(),
      requestedActions: ["DEPLOY_APPLICATION"],
    });
    const calls: string[] = [];
    const result = await executeGovernedDeployment({
      request,
      readiness,
      eagAuthorizations: eagFor(["DEPLOY_APPLICATION"]),
      treasuryAuthorizations: treasuryFor(["DEPLOY_APPLICATION"]),
      providerWrites: writeAuthorized("WRITE_CAPABLE_NOT_AUTHORIZED"),
      liveGateway: countingLivePort(calls),
      vercelLivePayload: vercelPayload(),
    });
    expect(result.blockers.map((item) => item.code)).toContain("DEPLOYMENT_EXECUTION_AUTHORITY_MISSING");
    expect(calls).toEqual([]);
  });

  it("blocks missing EAG on live deploy", async () => {
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "LIVE",
      deploymentAuthority: deploymentGrant(),
      requestedActions: ["DEPLOY_APPLICATION"],
    });
    const calls: string[] = [];
    const result = await executeGovernedDeployment({
      request,
      readiness,
      eagAuthorizations: [],
      treasuryAuthorizations: treasuryFor(["DEPLOY_APPLICATION"]),
      providerWrites: writeAuthorized(),
      liveGateway: countingLivePort(calls),
      vercelLivePayload: vercelPayload(),
    });
    expect(result.blockers.map((item) => item.code)).toContain("DEPLOYMENT_EXECUTION_EAG_DENIED");
    expect(calls).toEqual([]);
  });

  it("blocks wrong venture and wrong handoff lineage", async () => {
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "LIVE",
      deploymentAuthority: deploymentGrant(),
      requestedActions: ["DEPLOY_APPLICATION"],
    });
    const calls: string[] = [];
    const wrongVenture = await executeGovernedDeployment({
      request: { ...request, executable: true, blockers: [] },
      readiness: { ...readiness, ventureId: "venture-other" },
      eagAuthorizations: eagFor(["DEPLOY_APPLICATION"]),
      treasuryAuthorizations: treasuryFor(["DEPLOY_APPLICATION"]),
      providerWrites: writeAuthorized(),
      liveGateway: countingLivePort(calls),
      vercelLivePayload: vercelPayload(),
    });
    const wrongHandoff = await executeGovernedDeployment({
      request: { ...request, executable: true, blockers: [], productionArtifactHandoffId: "handoff-other" },
      readiness,
      eagAuthorizations: eagFor(["DEPLOY_APPLICATION"]),
      treasuryAuthorizations: treasuryFor(["DEPLOY_APPLICATION"]),
      providerWrites: writeAuthorized(),
      liveGateway: countingLivePort(calls),
      vercelLivePayload: vercelPayload(),
    });
    expect(wrongVenture.blockers.map((item) => item.code)).toContain("DEPLOYMENT_EXECUTION_LINEAGE_MISMATCH");
    expect(wrongHandoff.blockers.map((item) => item.code)).toContain("DEPLOYMENT_EXECUTION_LINEAGE_MISMATCH");
    expect(calls).toEqual([]);
  });

  it("blocks a non-Vercel live action and does not reuse deploy authority for DNS", async () => {
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "LIVE",
      deploymentAuthority: deploymentGrant(),
      requestedActions: ["DEPLOY_APPLICATION", "UPSERT_DNS_RECORD"],
    });
    const calls: string[] = [];
    const providerWrites: ProviderWriteEvidence[] = [
      ...writeAuthorized(),
      {
        capability: "DNS",
        verificationState: "WRITE_AUTHORIZED",
        credentialAvailable: true,
        credentialWriteCapable: true,
        writeAuthorityGranted: true,
      },
    ];
    const result = await executeGovernedDeployment({
      request,
      readiness,
      allowVercelLive: true,
      eagAuthorizations: eagFor(["DEPLOY_APPLICATION"]),
      treasuryAuthorizations: treasuryFor(["DEPLOY_APPLICATION"]),
      providerWrites,
      liveGateway: countingLivePort(calls),
      vercelLivePayload: vercelPayload(),
    });
    expect(result.actionsAttempted.find((item) => item.actionType === "UPSERT_DNS_RECORD")?.specificActionAuthorized).toBe(false);
    expect(result.blockers.map((item) => item.code)).toContain("DEPLOYMENT_EXECUTION_EAG_DENIED");
    const withDnsGrant = await executeGovernedDeployment({
      request,
      readiness,
      allowVercelLive: true,
      eagAuthorizations: eagFor(["DEPLOY_APPLICATION", "UPSERT_DNS_RECORD"]),
      treasuryAuthorizations: treasuryFor(["DEPLOY_APPLICATION"]),
      providerWrites,
      liveGateway: countingLivePort(calls),
      vercelLivePayload: vercelPayload(),
    });
    expect(withDnsGrant.blockers.map((item) => item.code)).toContain("DEPLOYMENT_EXECUTION_PROVIDER_UNSUPPORTED");
    expect(result.liveSideEffects.dnsWrites).toBe(0);
    expect(withDnsGrant.liveSideEffects.dnsWrites).toBe(0);
    expect(calls).not.toContain("dns.configure");
  });

  it("blocks LIVE unknown Vercel cost without Treasury attestation", async () => {
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "LIVE",
      deploymentAuthority: deploymentGrant(),
      requestedActions: ["DEPLOY_APPLICATION"],
    });
    const calls: string[] = [];
    const result = await executeGovernedDeployment({
      request,
      readiness,
      eagAuthorizations: eagFor(["DEPLOY_APPLICATION"]),
      providerWrites: writeAuthorized(),
      liveGateway: countingLivePort(calls),
      vercelLivePayload: vercelPayload(),
    });
    expect(result.blockers.map((item) => item.code)).toContain("DEPLOYMENT_EXECUTION_UNKNOWN_COST");
    expect(result.costsIncurred.unknown || result.blockers.some((item) => item.code === "DEPLOYMENT_EXECUTION_UNKNOWN_COST")).toBe(true);
    expect(calls).toEqual([]);
  });

  it("blocks LIVE when the write credential is missing", async () => {
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "LIVE",
      deploymentAuthority: deploymentGrant(),
      requestedActions: ["DEPLOY_APPLICATION"],
    });
    const calls: string[] = [];
    const result = await executeGovernedDeployment({
      request,
      readiness,
      eagAuthorizations: eagFor(["DEPLOY_APPLICATION"]),
      treasuryAuthorizations: treasuryFor(["DEPLOY_APPLICATION"]),
      providerWrites: [
        {
          capability: "HOSTING",
          verificationState: "WRITE_AUTHORIZED",
          credentialAvailable: false,
          credentialWriteCapable: false,
          writeAuthorityGranted: true,
        },
      ],
      liveGateway: countingLivePort(calls),
      vercelLivePayload: vercelPayload(),
    });
    expect(result.blockers.map((item) => item.code)).toContain("DEPLOYMENT_EXECUTION_WRITE_CREDENTIAL_MISSING");
    expect(calls).toEqual([]);
  });

  it("never lets DRY_RUN or SIMULATION hit the Vercel adapter", async () => {
    const { readiness } = readyReadiness();
    for (const mode of ["DRY_RUN", "SIMULATION"] as const) {
      const request = buildGovernedDeploymentExecutionRequest({
        readiness,
        mode,
        deploymentAuthority: deploymentGrant(),
        requestedActions: [...HOSTING_ACTIONS],
      });
      await executeGovernedDeployment({
        request,
        readiness,
        eagAuthorizations: eagFor([...HOSTING_ACTIONS]),
        providerWrites: writeAuthorized(),
        liveGateway: {
          execute: async () => {
            throw new Error("live port must not run");
          },
        },
        vercelLivePayload: vercelPayload(),
      });
    }
    expect(vercelExecuteSpy?.mock.calls.length ?? 0).toBe(0);
  });

  it("does not implicitly promote into LIVE", async () => {
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "DRY_RUN",
      deploymentAuthority: deploymentGrant(),
      requestedActions: ["DEPLOY_APPLICATION"],
    });
    const result = await executeGovernedDeployment({
      request,
      readiness,
      allowVercelLive: true,
      eagAuthorizations: eagFor(["DEPLOY_APPLICATION"]),
      treasuryAuthorizations: treasuryFor(["DEPLOY_APPLICATION"]),
      providerWrites: writeAuthorized(),
      vercelLivePayload: vercelPayload(),
    });
    expect(result.mode).toBe("DRY_RUN");
    expect(result.state).toBe("AUTHORIZED");
    expect(result.liveSideEffects.deployments).toBe(0);
    expect(vercelExecuteSpy?.mock.calls.length ?? 0).toBe(0);
  });

  it("blocks allowVercelLive when preconditions fail and does not call Vercel", async () => {
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "LIVE",
      deploymentAuthority: deploymentGrant(),
      requestedActions: [...HOSTING_ACTIONS],
    });
    const result = await executeGovernedDeployment({
      request,
      readiness,
      allowVercelLive: true,
      eagAuthorizations: eagFor([...HOSTING_ACTIONS]),
      treasuryAuthorizations: treasuryFor(["CREATE_HOSTING_PROJECT", "DEPLOY_APPLICATION"]),
      providerWrites: writeAuthorized(),
      vercelLivePayload: vercelPayload(),
    });
    expect(result.blockers.map((item) => item.code)).toContain("DEPLOYMENT_EXECUTION_LIVE_PRECONDITION");
    expect(vercelExecuteSpy?.mock.calls.length ?? 0).toBe(0);
    expect(result.liveSideEffects.deployments).toBe(0);
  });

  it("executes the scoped Vercel sequence through an injected Launch Gateway port without public launch", async () => {
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "LIVE",
      deploymentAuthority: deploymentGrant(),
      publicLaunchAuthority: { granted: false, authorizationId: null, source: null },
      requestedActions: [...HOSTING_ACTIONS],
    });
    const calls: string[] = [];
    const result = await executeGovernedDeployment({
      request,
      readiness,
      allowVercelLive: true,
      eagAuthorizations: eagFor([...HOSTING_ACTIONS]),
      treasuryAuthorizations: treasuryFor(["CREATE_HOSTING_PROJECT", "DEPLOY_APPLICATION"]),
      providerWrites: writeAuthorized(),
      liveGateway: countingLivePort(calls),
      vercelLivePayload: vercelPayload(),
    });
    expect(result.state).toBe("SUCCEEDED");
    expect(calls).toEqual(["hosting.create_project", "hosting.deploy", "hosting.verify_deployment"]);
    expect(result.providerReferences.project_id).toBe("prj_test_gde");
    expect(result.providerReferences.deployment_id).toBe("dpl_test_gde");
    expect(result.publicLaunchState).toBe("NOT_AUTHORIZED");
    expect(result.liveSideEffects.publicLaunches).toBe(0);
    expect(result.liveSideEffects.dnsWrites).toBe(0);
    expect(result.liveSideEffects.domainPurchases).toBe(0);
    expect(result.liveSideEffects.paymentWrites).toBe(0);
    expect(result.liveSideEffects.productionMigrations).toBe(0);
    expect(result.liveSideEffects.treasuryMovements).toBe(0);
    expect(result.liveProviderAccounting?.projectCreations).toBe(1);
    expect(result.liveProviderAccounting?.deployments).toBe(1);
    expect(result.liveProviderAccounting?.verificationReads).toBeGreaterThanOrEqual(1);
    expect(result.liveProviderAccounting?.cleanupWrites).toBe(0);
    expect(result.costsIncurred.unknown).toBe(true);
    expect(result.costsIncurred.actualUsd).toBeNull();
    expect(JSON.stringify(result)).not.toMatch(/Bearer /);
    expect(vercelExecuteSpy?.mock.calls.length ?? 0).toBe(0);
  });

  it("replays create-project without duplicating the live write", async () => {
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "LIVE",
      deploymentAuthority: deploymentGrant(),
      requestedActions: ["CREATE_HOSTING_PROJECT"],
    });
    const calls: string[] = [];
    const first = await executeGovernedDeployment({
      request,
      readiness,
      eagAuthorizations: eagFor(["CREATE_HOSTING_PROJECT"]),
      treasuryAuthorizations: treasuryFor(["CREATE_HOSTING_PROJECT"]),
      providerWrites: writeAuthorized(),
      liveGateway: countingLivePort(calls),
      vercelLivePayload: vercelPayload(),
    });
    const second = await executeGovernedDeployment({
      request,
      readiness,
      eagAuthorizations: eagFor(["CREATE_HOSTING_PROJECT"]),
      treasuryAuthorizations: treasuryFor(["CREATE_HOSTING_PROJECT"]),
      providerWrites: writeAuthorized(),
      liveGateway: countingLivePort(calls),
      vercelLivePayload: vercelPayload(),
    });
    expect(first.state).toBe("SUCCEEDED");
    expect(second.actionsAttempted.every((item) => item.reused)).toBe(true);
    expect(calls.filter((item) => item === "hosting.create_project")).toHaveLength(1);
    expect(second.liveProviderAccounting?.projectCreations).toBe(0);
  });

  it("rejects non-hosting actions and unsafe targets on the Vercel live port", async () => {
    const adapter = {
      ...vercelAdapter,
      validate: async () => ({ valid: true, issues: [] }),
      execute: async () => {
        throw new Error("injected adapter execute must not run for rejected actions");
      },
    } as unknown as ExternalActionAdapter;
    const port = createVercelLiveGatewayPort({
      adapter,
      testResourceName: TEST_RESOURCE,
      ledger: createMemoryGdeLiveActionLedger(),
    });
    await expect(
      port.execute({
        gatewayActionType: "dns.configure",
        target: TEST_RESOURCE,
        payload: {},
        idempotencyKey: "k",
        executionRequestId: "req",
        actionId: "act",
      }),
    ).rejects.toThrow(/rejects dns.configure/);
    await expect(
      port.execute({
        gatewayActionType: "hosting.create_project",
        target: "customer-prod",
        payload: {},
        idempotencyKey: "k",
        executionRequestId: "req",
        actionId: "act",
      }),
    ).rejects.toThrow(/non-disposable/);
    expect(vercelExecuteSpy?.mock.calls.length ?? 0).toBe(0);
  });

  it("classifies provider HTTP failures as technical failures, not business rejections", async () => {
    const adapter = {
      ...vercelAdapter,
      validate: async () => ({ valid: true, issues: [] }),
      execute: async () => {
        throw new Error("Vercel create project failed: 429");
      },
    } as unknown as ExternalActionAdapter;
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "LIVE",
      deploymentAuthority: deploymentGrant(),
      requestedActions: ["CREATE_HOSTING_PROJECT"],
    });
    const result = await executeGovernedDeployment({
      request,
      readiness,
      eagAuthorizations: eagFor(["CREATE_HOSTING_PROJECT"]),
      treasuryAuthorizations: treasuryFor(["CREATE_HOSTING_PROJECT"]),
      providerWrites: writeAuthorized(),
      liveGateway: createVercelLiveGatewayPort({
        adapter,
        testResourceName: TEST_RESOURCE,
        ledger: createMemoryGdeLiveActionLedger(),
      }),
      vercelLivePayload: vercelPayload(),
    });
    expect(result.state).toBe("FAILED");
    expect(result.blockers.map((item) => item.code)).toContain("DEPLOYMENT_EXECUTION_PROVIDER_FAILURE");
    expect(result.blockers.map((item) => item.code)).not.toContain("DEPLOYMENT_EXECUTION_EAG_DENIED");
    expect(result.blockers.map((item) => item.code)).not.toContain("DEPLOYMENT_EXECUTION_TREASURY_DENIED");
  });

  it("reports live preconditions as booleans and skips an unsafe real write", () => {
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "LIVE",
      deploymentAuthority: deploymentGrant(),
      requestedActions: [...HOSTING_ACTIONS],
    });
    const report = inspectVercelLivePreconditions({
      request,
      readiness,
      eagAuthorizations: eagFor([...HOSTING_ACTIONS]),
      treasuryAuthorizations: treasuryFor(["CREATE_HOSTING_PROJECT", "DEPLOY_APPLICATION"]),
      providerWrites: writeAuthorized(),
      payload: vercelPayload(),
    });
    expect(report.publicLaunchAuthority).toBe("NO");
    expect(report.publicLaunchDisabled).toBe("PASS");
    expect(report.scope).toBe("FAIL");
    expect(["YES", "NO"]).toContain(report.testResourceConfirmed);
    expect(["YES", "NO"]).toContain(report.vercelCredentialPresent);
    expect(report.serverOnly).toBe("YES");
    expect(JSON.stringify(report)).not.toMatch(/Bearer /);
    if (report.writeScopeAdequate !== "YES" || report.canExecuteLive !== true) {
      expect(report.canExecuteLive).toBe(false);
      expect(report.skipReason).toBeTruthy();
    }
  });

  it("does not execute a real Vercel write unless every live precondition passes", async () => {
    const { readiness } = readyReadiness();
    const request = buildGovernedDeploymentExecutionRequest({
      readiness,
      mode: "LIVE",
      deploymentAuthority: deploymentGrant(),
      requestedActions: [...HOSTING_ACTIONS],
    });
    const report = inspectVercelLivePreconditions({
      request,
      readiness,
      eagAuthorizations: eagFor([...HOSTING_ACTIONS]),
      treasuryAuthorizations: treasuryFor(["CREATE_HOSTING_PROJECT", "DEPLOY_APPLICATION"]),
      providerWrites: writeAuthorized(),
      payload: vercelPayload(),
    });
    if (!report.canExecuteLive) {
      const result = await executeGovernedDeployment({
        request,
        readiness,
        allowVercelLive: true,
        eagAuthorizations: eagFor([...HOSTING_ACTIONS]),
        treasuryAuthorizations: treasuryFor(["CREATE_HOSTING_PROJECT", "DEPLOY_APPLICATION"]),
        providerWrites: writeAuthorized(),
        vercelLivePayload: vercelPayload(),
      });
      expect(result.liveSideEffects.deployments).toBe(0);
      expect(result.liveProviderAccounting?.projectCreations).toBe(0);
      expect(vercelExecuteSpy?.mock.calls.length ?? 0).toBe(0);
      return;
    }
    vercelExecuteSpy?.mockRestore();
    const result = await executeGovernedDeployment({
      request,
      readiness,
      allowVercelLive: true,
      eagAuthorizations: eagFor([...HOSTING_ACTIONS]),
      treasuryAuthorizations: treasuryFor(["CREATE_HOSTING_PROJECT", "DEPLOY_APPLICATION"]),
      providerWrites: writeAuthorized(),
      vercelLivePayload: vercelPayload(),
    });
    expect(result.publicLaunchState).toBe("NOT_AUTHORIZED");
    expect(result.liveSideEffects.dnsWrites).toBe(0);
    expect(result.liveSideEffects.publicLaunches).toBe(0);
  });
});
