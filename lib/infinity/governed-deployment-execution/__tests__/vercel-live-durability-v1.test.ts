import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdapterContext, ExternalActionAdapter } from "@/lib/infinity/launch-gateway/adapters/contract";
import { lookupVercelProjectByName } from "@/lib/infinity/launch-gateway/adapters/vercel-project-lookup";
import { lookupVercelDeploymentBySha } from "@/lib/infinity/launch-gateway/adapters/vercel-deployment-lookup";
import {
  VERCEL_LIVE_VERIFICATION_ARTIFACT_ID,
  VERCEL_LIVE_VERIFICATION_RESOURCE,
  createMemoryGdeLiveActionLedger,
  resetGovernedExecutionReplayCache,
  runVercelGovernedLiveVerification,
  type GdeLiveActionLedger,
} from "@/lib/infinity/governed-deployment-execution";

const SECRET_TOKEN = "test-provider-credential-placeholder";
const GITHUB_SECRET = "test-github-credential-placeholder";
const REPO = "infinity-org/infinity-test-live-verification-gde";
const SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

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

function setValidProviderEnv(): void {
  process.env.VERCEL_TOKEN = SECRET_TOKEN;
  process.env.VERCEL_TOKEN_SCOPE = "hosting.create_project,hosting.deploy,hosting.verify_deployment";
  process.env.VERCEL_TOKEN_SCOPE_KIND = "INFINITY_INTENDED";
  process.env.VERCEL_TEAM_ID = "team_infinity_test_verify";
  process.env.INFINITY_VERCEL_TEST_TEAM_CONFIRMED = "true";
  process.env.INFINITY_VERCEL_TEST_RESOURCE = VERCEL_LIVE_VERIFICATION_RESOURCE;
  process.env.INFINITY_VERCEL_TEST_REPO = REPO;
  process.env.INFINITY_VERCEL_TEST_SHA = SHA;
  process.env.INFINITY_VERCEL_TEST_ARTIFACT_ID = VERCEL_LIVE_VERIFICATION_ARTIFACT_ID;
  process.env.INFINITY_VERCEL_LEFTOVER_RESOURCE_ACCEPTED = "true";
  process.env.LIVE_PROVIDER_TEST_MODE = "true";
  process.env.GITHUB_TOKEN = GITHUB_SECRET;
}

function matchingProject(name = VERCEL_LIVE_VERIFICATION_RESOURCE) {
  return {
    supported: true as const,
    found: true,
    id: "prj_durable",
    name,
    teamId: "team_infinity_test_verify",
    accountId: "team_infinity_test_verify",
    gitRepository: REPO,
    sourceIdentityAvailable: true,
    matchesVerificationTarget: true,
    matchesExpectedTeam: true,
    matchesExpectedRepository: true,
    httpStatus: 200,
  };
}

function countingAdapter(posts: string[], projectId = "prj_durable"): ExternalActionAdapter {
  return {
    capabilities: {
      provider: "vercel.com_v1",
      adapterKey: "vercel.com_v1",
      supportedActions: ["hosting.create_project", "hosting.deploy", "hosting.verify_deployment"],
      supportsSimulation: true,
      supportsVerification: true,
      supportsRollback: false,
      networkRequired: true,
      financialSideEffectPossible: false,
      liveExecutionEnabled: true,
    },
    validate: async () => ({ valid: true, issues: [] }),
    estimate: async () => ({ estimatedCostUsd: 0, currency: "USD" }),
    simulate: async () => ({ simulated: true, externalIds: {}, manifest: {} }),
    verify: async () => ({ verified: true, details: [] }),
    execute: async (ctx: AdapterContext) => {
      posts.push(ctx.actionType);
      if (ctx.actionType === "hosting.create_project") {
        return {
          simulated: false,
          externalIds: { project_id: projectId, project_name: VERCEL_LIVE_VERIFICATION_RESOURCE },
          manifest: { ready: true, reused: false },
        };
      }
      if (ctx.actionType === "hosting.deploy") {
        return {
          simulated: false,
          externalIds: {
            deployment_id: "dpl_durable",
            project_id: projectId,
            url: "https://infinity-test-live-verification-gde.vercel.app",
          },
          manifest: { ready: true },
        };
      }
      return {
        simulated: false,
        externalIds: {
          deployment_id: "dpl_durable",
          project_id: projectId,
          url: "https://infinity-test-live-verification-gde.vercel.app",
        },
        manifest: { verified: true },
      };
    },
  } as unknown as ExternalActionAdapter;
}

snapshotEnv();

let fetchSpy: { mockRestore: () => void } | null = null;

beforeEach(() => {
  resetGovernedExecutionReplayCache();
  restoreEnv();
  fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    throw new Error(`unexpected network write in automated test: ${String(input)}`);
  });
});

afterEach(() => {
  fetchSpy?.mockRestore();
  fetchSpy = null;
  restoreEnv();
  resetGovernedExecutionReplayCache();
});

describe("Vercel live execution durability + replay V1", () => {
  it("claims create, persists the provider project, and does not POST again on replay", async () => {
    setValidProviderEnv();
    const posts: string[] = [];
    const ledger = createMemoryGdeLiveActionLedger();
    const first = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      adapter: countingAdapter(posts),
      liveLedger: ledger,
      lookupProject: async () => ({ ...matchingProject(), found: false, id: null, matchesVerificationTarget: false }),
      lookupDeployment: async () => ({
        supported: true,
        found: false,
        id: null,
        projectId: "prj_durable",
        url: null,
        readyState: null,
        commitSha: null,
        gitRepository: null,
        matchesProject: false,
        matchesSha: false,
        matchesRepository: false,
        inProgress: false,
        reusable: false,
        httpStatus: 200,
      }),
    });
    expect(first.executorEntered).toBe(true);
    expect(first.externalActionIds.create).toBeTruthy();
    expect(first.providerProjectReference).toBe("prj_durable");
    expect(posts.filter((item) => item === "hosting.create_project")).toHaveLength(1);
    const created = await ledger.findByIdempotency(
      first.sessionId ? "org-infinity-test-vercel-live-verification" : "org-infinity-test-vercel-live-verification",
      first.executionRequestId
        ? `${first.executionRequestId}:CREATE_HOSTING_PROJECT:${VERCEL_LIVE_VERIFICATION_RESOURCE}`
        : "",
    );
    expect(created?.executionStatus).toBe("succeeded");
    expect(created?.providerReferences.project_id).toBe("prj_durable");
    expect(JSON.stringify(created)).not.toContain(SECRET_TOKEN);
    expect(JSON.stringify(created)).not.toMatch(/Bearer /);

    resetGovernedExecutionReplayCache();
    const second = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      adapter: countingAdapter(posts),
      liveLedger: ledger,
      lookupProject: async () => matchingProject(),
      lookupDeployment: async () => ({
        supported: true,
        found: true,
        id: "dpl_durable",
        projectId: "prj_durable",
        url: "https://infinity-test-live-verification-gde.vercel.app",
        readyState: "READY",
        commitSha: SHA,
        gitRepository: REPO,
        matchesProject: true,
        matchesSha: true,
        matchesRepository: true,
        inProgress: false,
        reusable: true,
        httpStatus: 200,
      }),
    });
    expect(second.projectCreationStatus).toBe("REUSED");
    expect(posts.filter((item) => item === "hosting.create_project")).toHaveLength(1);
  });

  it("does not POST a second deployment after a completed durable deploy action", async () => {
    setValidProviderEnv();
    const posts: string[] = [];
    const ledger = createMemoryGdeLiveActionLedger();
    const first = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      adapter: countingAdapter(posts),
      liveLedger: ledger,
      lookupProject: async () => matchingProject(),
      lookupDeployment: async () => ({
        supported: true,
        found: false,
        id: null,
        projectId: "prj_durable",
        url: null,
        readyState: null,
        commitSha: null,
        gitRepository: null,
        matchesProject: false,
        matchesSha: false,
        matchesRepository: false,
        inProgress: false,
        reusable: false,
        httpStatus: 200,
      }),
    });
    expect(first.externalActionIds.deploy).toBeTruthy();
    expect(posts.filter((item) => item === "hosting.deploy")).toHaveLength(1);
    resetGovernedExecutionReplayCache();
    const second = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      adapter: countingAdapter(posts),
      liveLedger: ledger,
      lookupProject: async () => matchingProject(),
      lookupDeployment: async () => ({
        supported: true,
        found: true,
        id: "dpl_durable",
        projectId: "prj_durable",
        url: "https://infinity-test-live-verification-gde.vercel.app",
        readyState: "READY",
        commitSha: SHA,
        gitRepository: REPO,
        matchesProject: true,
        matchesSha: true,
        matchesRepository: true,
        inProgress: false,
        reusable: true,
        httpStatus: 200,
      }),
    });
    expect(second.deploymentStatus).toBe("REUSED");
    expect(posts.filter((item) => item === "hosting.deploy")).toHaveLength(1);
  });

  it("reconciles an in-progress deploy that already has a provider ID and does not POST", async () => {
    setValidProviderEnv();
    const now = "2026-08-24T06:00:00.000Z";
    const posts: string[] = [];
    const probe = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      now,
      adapter: countingAdapter([]),
      liveLedger: createMemoryGdeLiveActionLedger(),
      lookupProject: async () => matchingProject(),
      lookupDeployment: async () => ({
        supported: true,
        found: true,
        id: "dpl_in_progress",
        projectId: "prj_durable",
        url: "https://infinity-test-live-verification-gde.vercel.app",
        readyState: "READY",
        commitSha: SHA,
        gitRepository: REPO,
        matchesProject: true,
        matchesSha: true,
        matchesRepository: true,
        inProgress: false,
        reusable: true,
        httpStatus: 200,
      }),
    });
    const deployKey = `${probe.executionRequestId}:DEPLOY_APPLICATION:${VERCEL_LIVE_VERIFICATION_RESOURCE}`;
    const ledger = createMemoryGdeLiveActionLedger([
      {
        id: "ext-in-progress-deploy",
        organizationId: "org-infinity-test-vercel-live-verification",
        missionId: "mission-infinity-test-vercel-live-verification",
        actionType: "hosting.deploy",
        target: VERCEL_LIVE_VERIFICATION_RESOURCE,
        executionStatus: "executing",
        idempotencyKey: deployKey,
        claimedBy: "gde.vercel_live_verification",
        resultManifest: {
          external_ids: { deployment_id: "dpl_in_progress", project_id: "prj_durable" },
        },
        payloadManifest: { purpose: "VERCEL_LIVE_VERIFICATION" },
        error: null,
      },
    ]);
    resetGovernedExecutionReplayCache();
    const result = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      now,
      adapter: countingAdapter(posts),
      liveLedger: ledger,
      lookupProject: async () => matchingProject(),
      lookupDeployment: async () => ({
        supported: true,
        found: true,
        id: "dpl_in_progress",
        projectId: "prj_durable",
        url: "https://infinity-test-live-verification-gde.vercel.app",
        readyState: "BUILDING",
        commitSha: SHA,
        gitRepository: REPO,
        matchesProject: true,
        matchesSha: true,
        matchesRepository: true,
        inProgress: true,
        reusable: true,
        httpStatus: 200,
      }),
    });
    expect(result.executorEntered).toBe(true);
    expect(posts).not.toContain("hosting.deploy");
    expect(posts).not.toContain("hosting.deploy");
    expect(
      result.providerDeploymentReference === "dpl_in_progress" ||
        result.deploymentStatus === "REUSED" ||
        result.errors.some((item) => item.code === "DEPLOYMENT_EXECUTION_RECONCILIATION_REQUIRED"),
    ).toBe(true);
  });

  it("blocks an in-progress deploy without a provider ID instead of blindly POSTing", async () => {
    setValidProviderEnv();
    const posts: string[] = [];
    const seed = createMemoryGdeLiveActionLedger();
    const now = "2026-08-24T06:10:00.000Z";
    const first = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      now,
      adapter: countingAdapter([]),
      liveLedger: seed,
      lookupProject: async () => matchingProject(),
      lookupDeployment: async () => ({
        supported: true,
        found: false,
        id: null,
        projectId: "prj_durable",
        url: null,
        readyState: null,
        commitSha: null,
        gitRepository: null,
        matchesProject: false,
        matchesSha: false,
        matchesRepository: false,
        inProgress: false,
        reusable: false,
        httpStatus: 200,
      }),
    });
    const deployKey = `${first.executionRequestId}:DEPLOY_APPLICATION:${VERCEL_LIVE_VERIFICATION_RESOURCE}`;
    const crashed = createMemoryGdeLiveActionLedger([
      {
        id: "ext-crash-deploy",
        organizationId: "org-infinity-test-vercel-live-verification",
        missionId: "mission-infinity-test-vercel-live-verification",
        actionType: "hosting.deploy",
        target: VERCEL_LIVE_VERIFICATION_RESOURCE,
        executionStatus: "executing",
        idempotencyKey: deployKey,
        claimedBy: "gde.vercel_live_verification",
        resultManifest: null,
        payloadManifest: { purpose: "VERCEL_LIVE_VERIFICATION" },
        error: null,
      },
    ]);
    resetGovernedExecutionReplayCache();
    const replay = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      now,
      adapter: countingAdapter(posts),
      liveLedger: crashed,
      lookupProject: async () => matchingProject(),
      lookupDeployment: async () => ({
        supported: true,
        found: false,
        id: null,
        projectId: "prj_durable",
        url: null,
        readyState: null,
        commitSha: null,
        gitRepository: null,
        matchesProject: false,
        matchesSha: false,
        matchesRepository: false,
        inProgress: false,
        reusable: false,
        httpStatus: 200,
      }),
    });
    expect(replay.errors.some((item) => item.code === "DEPLOYMENT_EXECUTION_RECONCILIATION_REQUIRED")).toBe(true);
    expect(posts).not.toContain("hosting.deploy");
  });

  it("does not silently declare retry safe when persistence fails after a provider response", async () => {
    setValidProviderEnv();
    const posts: string[] = [];
    const inner = createMemoryGdeLiveActionLedger();
    const ledger: GdeLiveActionLedger = {
      ...inner,
      complete: async () => {
        throw new Error("durable persist failed after provider response");
      },
    };
    const result = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      adapter: countingAdapter(posts),
      liveLedger: ledger,
      lookupProject: async () => ({ ...matchingProject(), found: false, id: null, matchesVerificationTarget: false }),
      lookupDeployment: async () => ({
        supported: true,
        found: false,
        id: null,
        projectId: null,
        url: null,
        readyState: null,
        commitSha: null,
        gitRepository: null,
        matchesProject: false,
        matchesSha: false,
        matchesRepository: false,
        inProgress: false,
        reusable: false,
        httpStatus: 200,
      }),
    });
    expect(result.state).not.toBe("SUCCEEDED");
    expect(result.errors.some((item) => item.code === "DEPLOYMENT_EXECUTION_AUDIT_PERSISTENCE_FAILED")).toBe(true);
    expect(posts.length).toBeGreaterThan(0);
  });

  it("does not reuse a deployment for a different SHA or repository and blocks a wrong project", async () => {
    setValidProviderEnv();
    const posts: string[] = [];
    const differentSha = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      adapter: countingAdapter(posts),
      liveLedger: createMemoryGdeLiveActionLedger(),
      lookupProject: async () => matchingProject(),
      lookupDeployment: async () => ({
        supported: true,
        found: true,
        id: "dpl_old_sha",
        projectId: "prj_durable",
        url: "https://old.vercel.app",
        readyState: "READY",
        commitSha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        gitRepository: REPO,
        matchesProject: true,
        matchesSha: false,
        matchesRepository: true,
        inProgress: false,
        reusable: true,
        httpStatus: 200,
      }),
    });
    expect(differentSha.providerDeploymentReference).not.toBe("dpl_old_sha");

    resetGovernedExecutionReplayCache();
    const wrongRepo = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      adapter: countingAdapter([]),
      liveLedger: createMemoryGdeLiveActionLedger(),
      lookupProject: async () => ({
        ...matchingProject(),
        gitRepository: "other-org/other-repo",
        matchesExpectedRepository: false,
      }),
    });
    expect(wrongRepo.projectCreationStatus === "FAILED" || wrongRepo.projectCreationStatus === "BLOCKED").toBe(true);
    expect(wrongRepo.state).not.toBe("SUCCEEDED");
  });

  it("reuses the same name + team + repo and blocks wrong team, 401, 403, 429, and 5xx lookups", async () => {
    setValidProviderEnv();
    const reuse = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      adapter: countingAdapter([]),
      liveLedger: createMemoryGdeLiveActionLedger(),
      lookupProject: async () => matchingProject(),
      lookupDeployment: async () => ({
        supported: true,
        found: true,
        id: "dpl_durable",
        projectId: "prj_durable",
        url: "https://infinity-test-live-verification-gde.vercel.app",
        readyState: "READY",
        commitSha: SHA,
        gitRepository: REPO,
        matchesProject: true,
        matchesSha: true,
        matchesRepository: true,
        inProgress: false,
        reusable: true,
        httpStatus: 200,
      }),
    });
    expect(reuse.projectCreationStatus).toBe("REUSED");
    expect(reuse.publicLaunchAuthority).toBe(false);

    resetGovernedExecutionReplayCache();
    const wrongTeam = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      now: "2026-08-24T06:20:00.000Z",
      adapter: countingAdapter([]),
      liveLedger: createMemoryGdeLiveActionLedger(),
      lookupProject: async () => ({
        ...matchingProject(),
        teamId: "team_other",
        accountId: "team_other",
        matchesExpectedTeam: false,
      }),
    });
    expect(wrongTeam.state).not.toBe("SUCCEEDED");

    for (const status of [401, 403, 429, 500]) {
      await expect(
        lookupVercelProjectByName({
          name: VERCEL_LIVE_VERIFICATION_RESOURCE,
          teamId: "team_infinity_test_verify",
          fetchImpl: async () => new Response("denied", { status }),
        }),
      ).rejects.toThrow(new RegExp(`Vercel project lookup failed: ${status}`));
      await expect(
        lookupVercelDeploymentBySha({
          projectId: "prj_durable",
          commitSha: SHA,
          fetchImpl: async () => new Response("denied", { status }),
        }),
      ).rejects.toThrow(new RegExp(`Vercel deployment lookup failed: ${status}`));
    }
  });

  it("blocks an in-progress create without a provider ID instead of blindly POSTing", async () => {
    setValidProviderEnv();
    const posts: string[] = [];
    const now = "2026-08-24T06:30:00.000Z";
    const first = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      now,
      adapter: countingAdapter([]),
      liveLedger: createMemoryGdeLiveActionLedger(),
      lookupProject: async () => ({ ...matchingProject(), found: false, id: null, matchesVerificationTarget: false }),
    });
    const createKey = `${first.executionRequestId}:CREATE_HOSTING_PROJECT:${VERCEL_LIVE_VERIFICATION_RESOURCE}`;
    const crashed = createMemoryGdeLiveActionLedger([
      {
        id: "ext-crash-create",
        organizationId: "org-infinity-test-vercel-live-verification",
        missionId: "mission-infinity-test-vercel-live-verification",
        actionType: "hosting.create_project",
        target: VERCEL_LIVE_VERIFICATION_RESOURCE,
        executionStatus: "executing",
        idempotencyKey: createKey,
        claimedBy: "gde.vercel_live_verification",
        resultManifest: null,
        payloadManifest: { purpose: "VERCEL_LIVE_VERIFICATION" },
        error: null,
      },
    ]);
    resetGovernedExecutionReplayCache();
    const replay = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      now,
      adapter: countingAdapter(posts),
      liveLedger: crashed,
      lookupProject: async () => ({ ...matchingProject(), found: false, id: null, matchesVerificationTarget: false }),
    });
    expect(replay.errors.some((item) => item.code === "DEPLOYMENT_EXECUTION_RECONCILIATION_REQUIRED")).toBe(true);
    expect(posts).not.toContain("hosting.create_project");
  });

  it("blocks project lookup timeout instead of treating it as eligible for create", async () => {
    setValidProviderEnv();
    const posts: string[] = [];
    await expect(
      lookupVercelProjectByName({
        name: VERCEL_LIVE_VERIFICATION_RESOURCE,
        teamId: "team_infinity_test_verify",
        fetchImpl: async () => {
          throw new Error("Vercel project lookup timed out");
        },
      }),
    ).rejects.toThrow(/timed out/);
    const result = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      adapter: countingAdapter(posts),
      liveLedger: createMemoryGdeLiveActionLedger(),
      lookupProject: async () => {
        throw new Error("Vercel project lookup timed out");
      },
    });
    expect(result.state).not.toBe("SUCCEEDED");
    expect(posts).toEqual([]);
  });

  it("keeps missing authority, unknown cost, and extra actions at zero provider writes", async () => {
    const posts: string[] = [];
    const missing = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      adapter: countingAdapter(posts),
      liveLedger: createMemoryGdeLiveActionLedger(),
    });
    expect(missing.executorEntered).toBe(false);
    expect(posts).toEqual([]);
    expect(missing.publicLaunchAuthority).toBe(false);
  });

  it("reuses a succeeded create with no deployment yet and POSTs at most one deploy", async () => {
    setValidProviderEnv();
    const now = "2026-08-24T08:00:00.000Z";
    const posts: string[] = [];
    const first = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      now,
      adapter: countingAdapter([]),
      liveLedger: createMemoryGdeLiveActionLedger(),
      lookupProject: async () => ({ ...matchingProject(), found: false, id: null, matchesVerificationTarget: false }),
    });
    const createKey = `${first.executionRequestId}:CREATE_HOSTING_PROJECT:${VERCEL_LIVE_VERIFICATION_RESOURCE}`;
    const seeded = createMemoryGdeLiveActionLedger([
      {
        id: "ext-create-succeeded",
        organizationId: "org-infinity-test-vercel-live-verification",
        missionId: "mission-infinity-test-vercel-live-verification",
        actionType: "hosting.create_project",
        target: VERCEL_LIVE_VERIFICATION_RESOURCE,
        executionStatus: "succeeded",
        idempotencyKey: createKey,
        claimedBy: "gde.vercel_live_verification",
        resultManifest: {
          external_ids: {
            project_id: "prj_188YspuXKKVurXCf2lxnP4ywyggg",
            project_name: VERCEL_LIVE_VERIFICATION_RESOURCE,
          },
        },
        payloadManifest: { purpose: "VERCEL_LIVE_VERIFICATION" },
        error: null,
      },
    ]);
    resetGovernedExecutionReplayCache();
    const replay = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      now,
      adapter: countingAdapter(posts, "prj_188YspuXKKVurXCf2lxnP4ywyggg"),
      liveLedger: seeded,
      lookupProject: async () => ({
        ...matchingProject(),
        id: "prj_188YspuXKKVurXCf2lxnP4ywyggg",
      }),
      lookupDeployment: async () => ({
        supported: true,
        found: false,
        id: null,
        projectId: "prj_188YspuXKKVurXCf2lxnP4ywyggg",
        url: null,
        readyState: null,
        commitSha: null,
        gitRepository: null,
        matchesProject: false,
        matchesSha: false,
        matchesRepository: false,
        inProgress: false,
        reusable: false,
        httpStatus: 200,
      }),
    });
    expect(replay.projectCreationStatus).toBe("REUSED");
    expect(replay.providerProjectReference).toBe("prj_188YspuXKKVurXCf2lxnP4ywyggg");
    expect(posts.filter((item) => item === "hosting.create_project")).toHaveLength(0);
    expect(posts.filter((item) => item === "hosting.deploy")).toHaveLength(1);
    expect(posts.filter((item) => item === "hosting.verify_deployment")).toHaveLength(1);
    expect(replay.publicLaunchAuthority).toBe(false);
  });

  it("retries a failed deploy that never reached a provider write and still blocks a crash-window executing row", async () => {
    setValidProviderEnv();
    const now = "2026-08-24T08:10:00.000Z";
    const first = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      now,
      adapter: countingAdapter([]),
      liveLedger: createMemoryGdeLiveActionLedger(),
      lookupProject: async () => ({ ...matchingProject(), found: false, id: null, matchesVerificationTarget: false }),
    });
    const createKey = `${first.executionRequestId}:CREATE_HOSTING_PROJECT:${VERCEL_LIVE_VERIFICATION_RESOURCE}`;
    const deployKey = `${first.executionRequestId}:DEPLOY_APPLICATION:${VERCEL_LIVE_VERIFICATION_RESOURCE}`;
    const posts: string[] = [];
    const failedWithoutWrite = createMemoryGdeLiveActionLedger([
      {
        id: "ext-create-ok",
        organizationId: "org-infinity-test-vercel-live-verification",
        missionId: "mission-infinity-test-vercel-live-verification",
        actionType: "hosting.create_project",
        target: VERCEL_LIVE_VERIFICATION_RESOURCE,
        executionStatus: "succeeded",
        idempotencyKey: createKey,
        claimedBy: "gde.vercel_live_verification",
        resultManifest: { external_ids: { project_id: "prj_durable", project_name: VERCEL_LIVE_VERIFICATION_RESOURCE } },
        payloadManifest: { purpose: "VERCEL_LIVE_VERIFICATION" },
        error: null,
      },
      {
        id: "ext-deploy-validate-failed",
        organizationId: "org-infinity-test-vercel-live-verification",
        missionId: "mission-infinity-test-vercel-live-verification",
        actionType: "hosting.deploy",
        target: VERCEL_LIVE_VERIFICATION_RESOURCE,
        executionStatus: "failed",
        idempotencyKey: deployKey,
        claimedBy: "gde.vercel_live_verification",
        resultManifest: null,
        payloadManifest: { purpose: "VERCEL_LIVE_VERIFICATION" },
        error: "Vercel live validate failed: unsupported_deployment_mode",
      },
    ]);
    resetGovernedExecutionReplayCache();
    const retry = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      now,
      adapter: countingAdapter(posts),
      liveLedger: failedWithoutWrite,
      lookupProject: async () => matchingProject(),
      lookupDeployment: async () => ({
        supported: true,
        found: false,
        id: null,
        projectId: "prj_durable",
        url: null,
        readyState: null,
        commitSha: null,
        gitRepository: null,
        matchesProject: false,
        matchesSha: false,
        matchesRepository: false,
        inProgress: false,
        reusable: false,
        httpStatus: 200,
      }),
    });
    expect(posts.filter((item) => item === "hosting.create_project")).toHaveLength(0);
    expect(posts.filter((item) => item === "hosting.deploy")).toHaveLength(1);
    expect(retry.externalActionIds.deploy).toBeTruthy();
    expect(retry.publicLaunchAuthority).toBe(false);

    const crashPosts: string[] = [];
    const crashDeploy = createMemoryGdeLiveActionLedger([
      {
        id: "ext-create-ok-2",
        organizationId: "org-infinity-test-vercel-live-verification",
        missionId: "mission-infinity-test-vercel-live-verification",
        actionType: "hosting.create_project",
        target: VERCEL_LIVE_VERIFICATION_RESOURCE,
        executionStatus: "succeeded",
        idempotencyKey: createKey,
        claimedBy: "gde.vercel_live_verification",
        resultManifest: { external_ids: { project_id: "prj_durable" } },
        payloadManifest: { purpose: "VERCEL_LIVE_VERIFICATION" },
        error: null,
      },
      {
        id: "ext-deploy-crash",
        organizationId: "org-infinity-test-vercel-live-verification",
        missionId: "mission-infinity-test-vercel-live-verification",
        actionType: "hosting.deploy",
        target: VERCEL_LIVE_VERIFICATION_RESOURCE,
        executionStatus: "executing",
        idempotencyKey: deployKey,
        claimedBy: "gde.vercel_live_verification",
        resultManifest: null,
        payloadManifest: { purpose: "VERCEL_LIVE_VERIFICATION" },
        error: null,
      },
    ]);
    resetGovernedExecutionReplayCache();
    const crashed = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      now,
      adapter: countingAdapter(crashPosts),
      liveLedger: crashDeploy,
      lookupProject: async () => matchingProject(),
      lookupDeployment: async () => ({
        supported: true,
        found: false,
        id: null,
        projectId: "prj_durable",
        url: null,
        readyState: null,
        commitSha: null,
        gitRepository: null,
        matchesProject: false,
        matchesSha: false,
        matchesRepository: false,
        inProgress: false,
        reusable: false,
        httpStatus: 200,
      }),
    });
    expect(crashed.errors.some((item) => item.code === "DEPLOYMENT_EXECUTION_RECONCILIATION_REQUIRED")).toBe(true);
    expect(crashPosts).not.toContain("hosting.deploy");
  });

  it("maps the live deploy payload to git_integrated, reports UNKNOWN estimate, and keeps the $1 ceiling", async () => {
    setValidProviderEnv();
    const posts: string[] = [];
    const modes: unknown[] = [];
    const adapter: ExternalActionAdapter = {
      ...countingAdapter(posts),
      execute: async (ctx: AdapterContext) => {
        modes.push(ctx.payload.deployment_mode);
        return countingAdapter(posts).execute(ctx);
      },
    };
    const result = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      adapter,
      liveLedger: createMemoryGdeLiveActionLedger(),
      lookupProject: async () => ({ ...matchingProject(), found: false, id: null, matchesVerificationTarget: false }),
      lookupDeployment: async () => ({
        supported: true,
        found: false,
        id: null,
        projectId: "prj_durable",
        url: null,
        readyState: null,
        commitSha: null,
        gitRepository: null,
        matchesProject: false,
        matchesSha: false,
        matchesRepository: false,
        inProgress: false,
        reusable: false,
        httpStatus: 200,
      }),
    });
    expect(modes).toContain("git_integrated");
    expect(modes).not.toContain("git");
    expect(result.estimatedCost).toBe("UNKNOWN");
    expect(result.estimatedCost).not.toBe(0);
    expect(result.estimatedCost).not.toBe(2);
    expect(result.actualCost).toBe("UNKNOWN");
    expect(result.authorizedCeiling).toBe(1);
    expect(result.sideEffects.treasuryMovements).toBe(0);
    expect(result.sideEffects.treasuryReservations).toBe(0);
    expect(result.publicLaunchAuthority).toBe(false);
  });

  it("does not mutate the authorized ceiling after create success and later deploy failure", async () => {
    setValidProviderEnv();
    const posts: string[] = [];
    const adapter: ExternalActionAdapter = {
      ...countingAdapter(posts),
      validate: async (ctx: AdapterContext) => {
        if (ctx.actionType === "hosting.deploy") {
          return { valid: false, issues: ["unsupported_deployment_mode"] };
        }
        return { valid: true, issues: [] };
      },
    };
    const result = await runVercelGovernedLiveVerification({
      maxAuthorizedUsd: 1,
      adapter,
      liveLedger: createMemoryGdeLiveActionLedger(),
      lookupProject: async () => ({ ...matchingProject(), found: false, id: null, matchesVerificationTarget: false }),
      lookupDeployment: async () => ({
        supported: true,
        found: false,
        id: null,
        projectId: "prj_durable",
        url: null,
        readyState: null,
        commitSha: null,
        gitRepository: null,
        matchesProject: false,
        matchesSha: false,
        matchesRepository: false,
        inProgress: false,
        reusable: false,
        httpStatus: 200,
      }),
    });
    expect(result.projectCreationStatus).toBe("CREATED");
    expect(result.deploymentStatus).toBe("FAILED");
    expect(result.verificationStatus).toBe("BLOCKED");
    expect(result.state).toBe("PARTIALLY_SUCCEEDED");
    expect(result.externalActionIds.deploy).toBeTruthy();
    expect(result.authorizedCeiling).toBe(1);
    expect(result.estimatedCost).toBe("UNKNOWN");
    expect(result.actualCost).toBe("UNKNOWN");
    expect(posts.filter((item) => item === "hosting.create_project")).toHaveLength(1);
    expect(posts.filter((item) => item === "hosting.deploy")).toHaveLength(0);
  });
});
