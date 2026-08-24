import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import {
  lookupVercelProjectByName,
  VERCEL_PROJECT_LOOKUP_SUPPORTED,
} from "@/lib/infinity/launch-gateway/adapters/vercel-project-lookup";
import type { ExternalActionAdapter } from "@/lib/infinity/launch-gateway/adapters/contract";
import {
  VERCEL_LIVE_VERIFICATION_ARTIFACT_ID,
  VERCEL_LIVE_VERIFICATION_RESOURCE,
  buildGovernedDeploymentExecutionRequest,
  executeGovernedDeployment,
  resetGovernedExecutionReplayCache,
  runVercelGovernedLiveVerification,
  createMemoryGdeLiveActionLedger,
  type LiveGatewayPort,
  type ProviderWriteEvidence,
} from "@/lib/infinity/governed-deployment-execution";
import type { GovernedExecutionActionType } from "@/lib/infinity/governed-deployment-execution/constants";

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
  "INFINITY_VERCEL_MAX_USD",
] as const;

const SECRET_TOKEN = "test-provider-credential-placeholder";
const GITHUB_SECRET = "test-github-credential-placeholder";
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

function setValidProviderEnv(): void {
  process.env.VERCEL_TOKEN = SECRET_TOKEN;
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
  process.env.GITHUB_TOKEN = GITHUB_SECRET;
}

function countingLivePort(calls: string[], options?: { fail?: string }): LiveGatewayPort {
  return {
    execute: async (input): ReturnType<LiveGatewayPort["execute"]> => {
      calls.push(input.gatewayActionType);
      if (options?.fail === input.gatewayActionType) {
        throw new Error(
          input.gatewayActionType === "hosting.create_project"
            ? "Vercel create project failed: 500"
            : input.gatewayActionType === "hosting.deploy"
              ? "Vercel deploy failed: 500"
              : "Vercel health verification failed",
        );
      }
      if (input.gatewayActionType === "hosting.create_project") {
        return {
          providerCallId: "vz-proj-1",
          externalIds: { project_id: "prj_test_activation", project_name: VERCEL_LIVE_VERIFICATION_RESOURCE },
          actualCostUsd: null,
          ready: true,
          verified: true,
        };
      }
      if (input.gatewayActionType === "hosting.deploy") {
        return {
          providerCallId: "vz-dep-1",
          externalIds: {
            deployment_id: "dpl_test_activation",
            url: "https://infinity-test-live-verification-gde.vercel.app",
          },
          actualCostUsd: null,
          ready: true,
          verified: true,
        };
      }
      return {
        providerCallId: "vz-ver-1",
        externalIds: {
          deployment_id: "dpl_test_activation",
          url: "https://infinity-test-live-verification-gde.vercel.app",
        },
        actualCostUsd: null,
        ready: true,
        verified: true,
      };
    },
  };
}

function writeAuthorized(): ProviderWriteEvidence[] {
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

function eagFor(actions: GovernedExecutionActionType[]) {
  return actions.map((actionType) => ({
    actionType,
    authorizationId: `eag-test-${actionType}`,
    decision: "AUTO_AUTHORIZE" as const,
  }));
}

function treasuryFor(actions: GovernedExecutionActionType[]) {
  return actions.map((actionType) => ({
    actionType,
    authorizationId: `treas-test-${actionType}`,
    decision: "AUTO_AUTHORIZE" as const,
    authorizedAmountUsd: 1,
    costActuality: "ESTIMATE" as const,
    reservationId: null,
  }));
}

snapshotEnv();

let fetchSpy: { mockRestore: () => void } | null = null;
let vercelExecuteSpy: { mock: { calls: unknown[] }; mockRestore: () => void } | null = null;

beforeEach(() => {
  resetGovernedExecutionReplayCache();
  restoreEnv();
  fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    throw new Error(`unexpected network write in automated test: ${String(input)}`);
  });
  vercelExecuteSpy = vi.spyOn(vercelAdapter, "execute").mockImplementation(async () => {
    throw new Error("vercelAdapter.execute must not be called from unit tests");
  });
});

afterEach(() => {
  fetchSpy?.mockRestore();
  fetchSpy = null;
  vercelExecuteSpy?.mockRestore();
  vercelExecuteSpy = null;
  restoreEnv();
  resetGovernedExecutionReplayCache();
});

describe("Vercel live execution activation V1", () => {
  it("enters the existing live executor after successful preflight", async () => {
    setValidProviderEnv();
    const calls: string[] = [];
    const result = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      liveGateway: countingLivePort(calls),
    });
    expect(result.executorEntered).toBe(true);
    expect(result.state).toBe("SUCCEEDED");
    expect(calls).toEqual(["hosting.create_project", "hosting.deploy", "hosting.verify_deployment"]);
    expect(result.projectCreationStatus).toBe("CREATED");
    expect(result.deploymentStatus).toBe("SUCCEEDED");
    expect(result.verificationStatus).toBe("SUCCEEDED");
    expect(result.providerProjectReference).toBe("prj_test_activation");
    expect(result.providerDeploymentReference).toBe("dpl_test_activation");
    expect(result.safeTestUrl).toBe("https://infinity-test-live-verification-gde.vercel.app");
    expect(result.authorizedCeiling).toBe(1);
    expect(result.actualCost).toBe("UNKNOWN");
    expect(result.publicLaunchAuthority).toBe(false);
    expect(result.publicLaunchState).toBe("NOT_AUTHORIZED");
    expect(result.durableReplayProtection).toBe(false);
    expect(result.providerProjectLookupSupported).toBe(true);
    expect(vercelExecuteSpy?.mock.calls.length ?? 0).toBe(0);
  });

  it("never enters the executor when preflight fails", async () => {
    const calls: string[] = [];
    const result = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      liveGateway: countingLivePort(calls),
    });
    expect(result.executorEntered).toBe(false);
    expect(result.state).toBe("BLOCKED");
    expect(calls).toEqual([]);
  });

  it("blocks a missing max ceiling and does not enter the executor", async () => {
    setValidProviderEnv();
    const calls: string[] = [];
    const result = await runVercelGovernedLiveVerification({
      argv: ["node", "script"],
      env: { NODE_ENV: "test" } as NodeJS.ProcessEnv,
      liveGateway: countingLivePort(calls),
    });
    expect(result.executorEntered).toBe(false);
    expect(result.blockers.some((item) => /max ceiling/i.test(item))).toBe(true);
    expect(calls).toEqual([]);
  });

  it("rebuilds the same deterministic session identities", async () => {
    setValidProviderEnv();
    const calls: string[] = [];
    const first = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      now: "2026-08-24T05:00:00.000Z",
      liveGateway: countingLivePort(calls),
    });
    resetGovernedExecutionReplayCache();
    const second = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      now: "2026-08-24T05:00:00.000Z",
      liveGateway: countingLivePort([]),
    });
    expect(first.sessionId).toBe(second.sessionId);
    expect(first.executionRequestId).toBe(second.executionRequestId);
    expect(first.authorizedCeiling).toBe(1);
    expect(second.authorizedCeiling).toBe(1);
  });

  it("blocks extra, DNS, domain, payment, migration, and public-launch actions", async () => {
    setValidProviderEnv();
    const extras: GovernedExecutionActionType[] = [
      "UPSERT_DNS_RECORD",
      "BIND_DOMAIN",
      "PURCHASE_DOMAIN",
      "CONFIGURE_PAYMENT_RESOURCE",
      "RUN_PRODUCTION_MIGRATION",
    ];
    const { buildVercelGovernedVerificationSession } = await import(
      "@/lib/infinity/governed-deployment-execution"
    );
    const session = buildVercelGovernedVerificationSession({
      maxAuthorizedUsd: 1,
      now: "2026-08-24T05:00:00.000Z",
    });
    expect(session.preflight.safeToExecuteLive).toBe(true);
    const request = buildGovernedDeploymentExecutionRequest({
      readiness: session.readiness!,
      mode: "LIVE",
      expectedVentureId: session.ventureId,
      expectedReadinessId: session.readiness!.readinessId,
      expectedHandoffId: session.handoff?.handoffId,
      deploymentAuthority: session.deploymentAuthority!,
      publicLaunchAuthority: { granted: false, authorizationId: null, source: null },
      eagAuthorizations: [
        ...session.eagAuthorizations,
        ...extras.map((actionType) => ({
          actionType,
          authorizationId: `eag-extra-${actionType}`,
          decision: "AUTO_AUTHORIZE" as const,
        })),
      ],
      treasuryAuthorizations: [
        ...session.treasuryAuthorizations,
        ...extras.map((actionType) => ({
          actionType,
          authorizationId: `treas-extra-${actionType}`,
          decision: "AUTO_AUTHORIZE" as const,
          authorizedAmountUsd: 12,
          costActuality: "ESTIMATE" as const,
          reservationId: null,
        })),
      ],
      providerWrites: [
        ...writeAuthorized(),
        {
          capability: "DNS",
          verificationState: "WRITE_AUTHORIZED",
          credentialAvailable: true,
          credentialWriteCapable: true,
          writeAuthorityGranted: true,
        },
        {
          capability: "REGISTRAR",
          verificationState: "WRITE_AUTHORIZED",
          credentialAvailable: true,
          credentialWriteCapable: true,
          writeAuthorityGranted: true,
        },
        {
          capability: "PAYMENTS",
          verificationState: "WRITE_AUTHORIZED",
          credentialAvailable: true,
          credentialWriteCapable: true,
          writeAuthorityGranted: true,
        },
        {
          capability: "DATABASE",
          verificationState: "WRITE_AUTHORIZED",
          credentialAvailable: true,
          credentialWriteCapable: true,
          writeAuthorityGranted: true,
        },
      ],
      requestedActions: ["CREATE_HOSTING_PROJECT", "DEPLOY_APPLICATION", "VERIFY_HEALTH", ...extras],
      createdAt: session.createdAt,
    });
    const calls: string[] = [];
    const result = await executeGovernedDeployment({
      request,
      readiness: session.readiness!,
      eagAuthorizations: request.eagAuthorizationRefs.map((row) => ({
        actionType: row.actionType,
        authorizationId: row.authorizationId,
        decision: "AUTO_AUTHORIZE",
      })),
      treasuryAuthorizations: [
        ...session.treasuryAuthorizations,
        ...extras.map((actionType) => ({
          actionType,
          authorizationId: `treas-extra-${actionType}`,
          decision: "AUTO_AUTHORIZE" as const,
          authorizedAmountUsd: 12,
          costActuality: "ESTIMATE" as const,
          reservationId: null,
        })),
      ],
      providerWrites: [
        ...writeAuthorized(),
        {
          capability: "DNS",
          verificationState: "WRITE_AUTHORIZED",
          credentialAvailable: true,
          credentialWriteCapable: true,
          writeAuthorityGranted: true,
        },
        {
          capability: "REGISTRAR",
          verificationState: "WRITE_AUTHORIZED",
          credentialAvailable: true,
          credentialWriteCapable: true,
          writeAuthorityGranted: true,
        },
        {
          capability: "PAYMENTS",
          verificationState: "WRITE_AUTHORIZED",
          credentialAvailable: true,
          credentialWriteCapable: true,
          writeAuthorityGranted: true,
        },
        {
          capability: "DATABASE",
          verificationState: "WRITE_AUTHORIZED",
          credentialAvailable: true,
          credentialWriteCapable: true,
          writeAuthorityGranted: true,
        },
      ],
      allowVercelLive: true,
      liveGateway: countingLivePort(calls),
      vercelLivePayload: {
        testResourceName: VERCEL_LIVE_VERIFICATION_RESOURCE,
        production_artifact_id: VERCEL_LIVE_VERIFICATION_ARTIFACT_ID,
        repository_full_name: process.env.INFINITY_VERCEL_TEST_REPO,
        commit_sha: process.env.INFINITY_VERCEL_TEST_SHA,
      },
    });
    expect(result.blockers.map((item) => item.code)).toContain("DEPLOYMENT_EXECUTION_PROVIDER_UNSUPPORTED");
    expect(result.liveSideEffects.dnsWrites).toBe(0);
    expect(result.liveSideEffects.domainPurchases).toBe(0);
    expect(result.liveSideEffects.paymentWrites).toBe(0);
    expect(result.liveSideEffects.productionMigrations).toBe(0);
    expect(result.publicLaunchState).toBe("NOT_AUTHORIZED");
    expect(calls).not.toContain("dns.configure");
    expect(calls).not.toContain("domain.register");
    expect(vercelExecuteSpy?.mock.calls.length ?? 0).toBe(0);
  });

  it("blocks a wrong provider and public launch", async () => {
    setValidProviderEnv();
    const { buildVercelGovernedVerificationSession } = await import(
      "@/lib/infinity/governed-deployment-execution"
    );
    const publicLaunchSession = buildVercelGovernedVerificationSession({
      maxAuthorizedUsd: 1,
      publicLaunchRequested: true,
    });
    expect(publicLaunchSession.preflight.safeToExecuteLive).toBe(false);
    const session = buildVercelGovernedVerificationSession({ maxAuthorizedUsd: 1 });
    const request = buildGovernedDeploymentExecutionRequest({
      readiness: session.readiness!,
      mode: "LIVE",
      expectedVentureId: session.ventureId,
      expectedReadinessId: session.readiness!.readinessId,
      expectedHandoffId: session.handoff?.handoffId,
      deploymentAuthority: session.deploymentAuthority!,
      publicLaunchAuthority: { granted: false, authorizationId: null, source: null },
      requestedActions: ["CREATE_WEBHOOK"],
      createdAt: session.createdAt,
    });
    const wrongProvider = await executeGovernedDeployment({
      request,
      readiness: session.readiness!,
      allowVercelLive: true,
      eagAuthorizations: eagFor(["CREATE_WEBHOOK"]),
      treasuryAuthorizations: treasuryFor(["CREATE_WEBHOOK"]),
      providerWrites: [
        ...writeAuthorized(),
        {
          capability: "PAYMENTS",
          verificationState: "WRITE_AUTHORIZED",
          credentialAvailable: true,
          credentialWriteCapable: true,
          writeAuthorityGranted: true,
        },
      ],
      liveGateway: countingLivePort([]),
    });
    expect(wrongProvider.blockers.map((item) => item.code)).toContain("DEPLOYMENT_EXECUTION_PROVIDER_UNSUPPORTED");
    expect(wrongProvider.publicLaunchState).toBe("NOT_AUTHORIZED");
    const live = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      liveGateway: countingLivePort([]),
    });
    expect(live.publicLaunchAuthority).toBe(false);
    expect(live.publicLaunchState).toBe("NOT_AUTHORIZED");
  });

  it("reuses a matching provider project and does not create a duplicate", async () => {
    setValidProviderEnv();
    const created: string[] = [];
    const adapter = {
      ...vercelAdapter,
      validate: async () => ({ valid: true, issues: [] }),
      execute: async (ctx: { actionType: string }) => {
        created.push(ctx.actionType);
        if (ctx.actionType === "hosting.create_project") {
          throw new Error("create must not run when lookup reuses the project");
        }
        if (ctx.actionType === "hosting.deploy") {
          return {
            simulated: false,
            externalIds: {
              deployment_id: "dpl_reuse",
              url: "https://infinity-test-live-verification-gde.vercel.app",
            },
            manifest: { ready: true },
          };
        }
        return {
          simulated: false,
          externalIds: {
            deployment_id: "dpl_reuse",
            url: "https://infinity-test-live-verification-gde.vercel.app",
          },
          manifest: { verified: true },
        };
      },
    } as unknown as ExternalActionAdapter;
    const result = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      adapter,
      liveLedger: createMemoryGdeLiveActionLedger(),
      lookupProject: async (name) => ({
        supported: true,
        found: true,
        id: "prj_existing_verify",
        name,
        teamId: "team_infinity_test_verify",
        httpStatus: 200,
        matchesVerificationTarget: true,
        matchesExpectedTeam: true,
        matchesExpectedRepository: true,
        sourceIdentityAvailable: true,
        gitRepository: "infinity-org/infinity-test-live-verification-gde",
      }),
    });
    expect(result.executorEntered).toBe(true);
    expect(result.projectCreationStatus).toBe("REUSED");
    expect(result.providerProjectReference).toBe("prj_existing_verify");
    expect(result.sideEffects.projectCreations).toBe(0);
    expect(created).not.toContain("hosting.create_project");
    expect(result.state).toBe("SUCCEEDED");
  });

  it("blocks LIVE when provider project lookup is not supported", async () => {
    setValidProviderEnv();
    const calls: string[] = [];
    const result = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      projectLookupSupported: false,
      liveGateway: countingLivePort(calls),
    });
    expect(result.executorEntered).toBe(false);
    expect(result.providerProjectLookupSupported).toBe(false);
    expect(result.blockers.some((item) => /lookup is not supported/i.test(item))).toBe(true);
    expect(calls).toEqual([]);
  });

  it("classifies provider create, deploy, and verify failures without fabricating cost", async () => {
    setValidProviderEnv();
    const createCalls: string[] = [];
    const createFail = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      liveGateway: countingLivePort(createCalls, { fail: "hosting.create_project" }),
    });
    expect(createFail.executorEntered).toBe(true);
    expect(createFail.state === "FAILED" || createFail.state === "PARTIALLY_SUCCEEDED").toBe(true);
    expect(createFail.state).not.toBe("SUCCEEDED");
    expect(createFail.projectCreationStatus).toBe("FAILED");
    expect(createFail.deploymentStatus === "BLOCKED" || createFail.deploymentStatus === "NOT_RUN").toBe(true);
    expect(createCalls).toEqual(["hosting.create_project"]);
    expect(createFail.actualCost).toBe("UNKNOWN");

    resetGovernedExecutionReplayCache();
    const deployFail = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      liveGateway: countingLivePort([], { fail: "hosting.deploy" }),
    });
    expect(deployFail.state === "FAILED" || deployFail.state === "PARTIALLY_SUCCEEDED").toBe(true);
    expect(deployFail.deploymentStatus).toBe("FAILED");
    expect(deployFail.state).not.toBe("SUCCEEDED");

    resetGovernedExecutionReplayCache();
    const verifyFail = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      liveGateway: countingLivePort([], { fail: "hosting.verify_deployment" }),
    });
    expect(verifyFail.verificationStatus).toBe("FAILED");
    expect(verifyFail.state).toBe("FAILED_VERIFICATION");
    expect(verifyFail.state).not.toBe("SUCCEEDED");
  });

  it("does not print or persist secrets", async () => {
    setValidProviderEnv();
    const result = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      liveGateway: countingLivePort([]),
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(SECRET_TOKEN);
    expect(serialized).not.toContain(GITHUB_SECRET);
    expect(serialized).not.toMatch(/Bearer /);
    expect(serialized).not.toMatch(/Authorization/);
    expect(result.secretPrinted).toBe(false);
    expect(result.secretPersisted).toBe(false);
  });

  it("blocks reuse when an existing project does not match the verification target", async () => {
    setValidProviderEnv();
    const created: string[] = [];
    const adapter = {
      ...vercelAdapter,
      validate: async () => ({ valid: true, issues: [] }),
      execute: async (ctx: { actionType: string }) => {
        created.push(ctx.actionType);
        throw new Error("create must not run for a mismatched project");
      },
    } as unknown as ExternalActionAdapter;
    const result = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      adapter,
      liveLedger: createMemoryGdeLiveActionLedger(),
      lookupProject: async () => ({
        supported: true,
        found: true,
        id: "prj_unrelated",
        name: "infinity-test-other-resource",
        teamId: "team_infinity_test_verify",
        matchesExpectedRepository: false,
        sourceIdentityAvailable: true,
        httpStatus: 200,
        matchesVerificationTarget: false,
      }),
    });
    expect(result.executorEntered).toBe(true);
    expect(result.projectCreationStatus).toBe("FAILED");
    expect(created).not.toContain("hosting.create_project");
    expect(result.state).not.toBe("SUCCEEDED");
  });

  it("blocks missing Treasury, missing EAG, and expired or mismatched deployment authority before any live provider call", async () => {
    setValidProviderEnv();
    const { buildVercelGovernedVerificationSession } = await import(
      "@/lib/infinity/governed-deployment-execution"
    );
    const deniedTreasurySession = buildVercelGovernedVerificationSession({
      maxAuthorizedUsd: 1,
      denyTreasuryActions: ["CREATE_HOSTING_PROJECT"],
    });
    expect(deniedTreasurySession.preflight.safeToExecuteLive).toBe(false);
    const deniedEagSession = buildVercelGovernedVerificationSession({
      maxAuthorizedUsd: 1,
      denyEagActions: ["hosting.create_project"],
    });
    expect(deniedEagSession.preflight.safeToExecuteLive).toBe(false);
    const expired = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      now: "2026-08-24T05:00:00.000Z",
      liveGateway: countingLivePort([]),
    });
    const expiredSession = buildVercelGovernedVerificationSession({
      maxAuthorizedUsd: 1,
      expireImmediately: true,
    });
    expect(expiredSession.preflight.safeToExecuteLive).toBe(false);
    const wrongVenture = buildVercelGovernedVerificationSession({
      maxAuthorizedUsd: 1,
      authorityVentureId: "venture-wrong",
    });
    expect(wrongVenture.preflight.safeToExecuteLive).toBe(false);
    const wrongHandoff = buildVercelGovernedVerificationSession({
      maxAuthorizedUsd: 1,
      authorityHandoffId: "handoff-wrong",
    });
    expect(wrongHandoff.preflight.safeToExecuteLive).toBe(false);

    const session = buildVercelGovernedVerificationSession({ maxAuthorizedUsd: 1 });
    const treasuryCalls: string[] = [];
    const missingTreasury = await executeGovernedDeployment({
      request: session.executionRequest!,
      readiness: session.readiness!,
      eagAuthorizations: session.eagAuthorizations,
      treasuryAuthorizations: [],
      providerWrites: session.providerWrites,
      allowVercelLive: true,
      liveGateway: countingLivePort(treasuryCalls),
      vercelLivePayload: {
        testResourceName: VERCEL_LIVE_VERIFICATION_RESOURCE,
        production_artifact_id: VERCEL_LIVE_VERIFICATION_ARTIFACT_ID,
        repository_full_name: process.env.INFINITY_VERCEL_TEST_REPO,
        commit_sha: process.env.INFINITY_VERCEL_TEST_SHA,
      },
    });
    expect(
      missingTreasury.blockers.some(
        (item) => item.code === "DEPLOYMENT_EXECUTION_TREASURY_DENIED" || item.code === "DEPLOYMENT_EXECUTION_UNKNOWN_COST",
      ),
    ).toBe(true);
    expect(treasuryCalls).toEqual([]);

    const deniedTreasuryCalls: string[] = [];
    const deniedTreasury = await executeGovernedDeployment({
      request: session.executionRequest!,
      readiness: session.readiness!,
      eagAuthorizations: session.eagAuthorizations,
      treasuryAuthorizations: [
        {
          actionType: "CREATE_HOSTING_PROJECT",
          authorizationId: "treas-block-create",
          decision: "BLOCK",
          authorizedAmountUsd: 1,
          costActuality: "ESTIMATE",
          reservationId: null,
        },
        {
          actionType: "DEPLOY_APPLICATION",
          authorizationId: "treas-block-deploy",
          decision: "BLOCK",
          authorizedAmountUsd: 1,
          costActuality: "ESTIMATE",
          reservationId: null,
        },
      ],
      providerWrites: session.providerWrites,
      allowVercelLive: true,
      liveGateway: countingLivePort(deniedTreasuryCalls),
      vercelLivePayload: {
        testResourceName: VERCEL_LIVE_VERIFICATION_RESOURCE,
        production_artifact_id: VERCEL_LIVE_VERIFICATION_ARTIFACT_ID,
        repository_full_name: process.env.INFINITY_VERCEL_TEST_REPO,
        commit_sha: process.env.INFINITY_VERCEL_TEST_SHA,
      },
    });
    expect(deniedTreasury.blockers.map((item) => item.code)).toContain("DEPLOYMENT_EXECUTION_TREASURY_DENIED");
    expect(deniedTreasuryCalls).toEqual([]);

    const eagCalls: string[] = [];
    const missingEag = await executeGovernedDeployment({
      request: session.executionRequest!,
      readiness: session.readiness!,
      eagAuthorizations: [],
      treasuryAuthorizations: session.treasuryAuthorizations,
      providerWrites: session.providerWrites,
      allowVercelLive: true,
      liveGateway: countingLivePort(eagCalls),
      vercelLivePayload: {
        testResourceName: VERCEL_LIVE_VERIFICATION_RESOURCE,
        production_artifact_id: VERCEL_LIVE_VERIFICATION_ARTIFACT_ID,
        repository_full_name: process.env.INFINITY_VERCEL_TEST_REPO,
        commit_sha: process.env.INFINITY_VERCEL_TEST_SHA,
      },
    });
    expect(missingEag.blockers.map((item) => item.code)).toContain("DEPLOYMENT_EXECUTION_EAG_DENIED");
    expect(eagCalls).toEqual([]);
    expect(expired.executorEntered).toBe(true);
    expect(expiredSession.blockers.some((item) => /expir/i.test(item)) || expiredSession.preflight.blockers.some((item) => /expir/i.test(item))).toBe(true);
  });

  it("reuses after 409 without a second create POST", async () => {
    vercelExecuteSpy?.mockRestore();
    vercelExecuteSpy = null;
    setValidProviderEnv();
    const methods: string[] = [];
    fetchSpy?.mockRestore();
    fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = String(init?.method ?? "GET").toUpperCase();
      if (method === "GET" && url.includes("/v9/projects")) {
        methods.push("GET lookup");
        if (methods.includes("POST create")) {
          return new Response(JSON.stringify({
          id: "prj_409",
          name: VERCEL_LIVE_VERIFICATION_RESOURCE,
          accountId: "team_infinity_test_verify",
          link: { type: "github", org: "infinity-org", repo: "infinity-test-live-verification-gde" },
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response("missing", { status: 404 });
      }
      if (method === "POST" && url.includes("/v10/projects")) {
        methods.push("POST create");
        return new Response("conflict", { status: 409 });
      }
      throw new Error(`unexpected network ${method} ${url}`);
    });
    const result = await vercelAdapter.execute({
      organizationId: "org-gde-vercel-live",
      actionType: "hosting.create_project",
      target: VERCEL_LIVE_VERIFICATION_RESOURCE,
      payload: {
        repository_full_name: "infinity-org/infinity-test-live-verification-gde",
        production_artifact_id: VERCEL_LIVE_VERIFICATION_ARTIFACT_ID,
      },
      correlationId: "req-409",
    });
    expect(result.externalIds.project_id).toBe("prj_409");
    expect(result.manifest.reused).toBe(true);
    expect(methods.filter((item) => item === "POST create")).toEqual(["POST create"]);
    expect(methods.filter((item) => item === "GET lookup")).toHaveLength(2);
  });

  it("looks up once after 409 and does not POST create again", async () => {
    const methods: string[] = [];
    const lookup = await lookupVercelProjectByName({
      name: VERCEL_LIVE_VERIFICATION_RESOURCE,
      teamId: "team_infinity_test_verify",
      fetchImpl: async (_url, init) => {
        methods.push(String(init?.method ?? "GET").toUpperCase());
        return new Response(JSON.stringify({ id: "prj_after_409", name: VERCEL_LIVE_VERIFICATION_RESOURCE }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    });
    expect(lookup.found).toBe(true);
    expect(lookup.matchesVerificationTarget).toBe(true);
    expect(methods).toEqual(["GET"]);
  });

  it("fails closed on 401, 403, and 429 project lookup", async () => {
    for (const status of [401, 403, 429, 500]) {
      await expect(
        lookupVercelProjectByName({
          name: VERCEL_LIVE_VERIFICATION_RESOURCE,
          teamId: "team_infinity_test_verify",
          fetchImpl: async () => new Response("denied", { status }),
        }),
      ).rejects.toThrow(new RegExp(`Vercel project lookup failed: ${status}`));
    }
  });

  it("looks up a project by name without mutating provider state", async () => {
    const methods: string[] = [];
    const existing = await lookupVercelProjectByName({
      name: VERCEL_LIVE_VERIFICATION_RESOURCE,
      teamId: "team_infinity_test_verify",
      fetchImpl: async (url, init) => {
        methods.push(String(init?.method ?? "GET"));
        expect(String(url)).toContain("/v9/projects/");
        expect(String(url)).toContain(VERCEL_LIVE_VERIFICATION_RESOURCE);
        expect(String(init?.method ?? "GET").toUpperCase()).toBe("GET");
        return new Response(JSON.stringify({ id: "prj_lookup", name: VERCEL_LIVE_VERIFICATION_RESOURCE }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    });
    expect(VERCEL_PROJECT_LOOKUP_SUPPORTED).toBe(true);
    expect(existing.found).toBe(true);
    expect(existing.matchesVerificationTarget).toBe(true);
    expect(methods).toEqual(["GET"]);
    expect(existing.id).toBe("prj_lookup");
  });
});
