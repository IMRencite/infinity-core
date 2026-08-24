import { afterEach, describe, expect, it } from "vitest";
import {
  VERCEL_LIVE_VERIFICATION_ARTIFACT_ID,
  VERCEL_LIVE_VERIFICATION_RESOURCE,
  buildVercelGovernedVerificationSession,
  governedExecutionActionId,
  parseMaxUsd,
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
  "INFINITY_VERCEL_MAX_USD",
  "INFINITY_VERCEL_READINESS_ID",
  "INFINITY_VERCEL_DEPLOYMENT_AUTHORIZATION_ID",
  "INFINITY_VERCEL_EAG_AUTHORIZATION_IDS",
  "INFINITY_VERCEL_TREASURY_AUTHORIZATION_IDS",
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

describe("Vercel governed live verification session", () => {
  it("blocks a missing max ceiling", () => {
    const session = buildVercelGovernedVerificationSession({});
    expect(session.blockers).toContain("operator max ceiling is missing");
    expect(session.preflight.safeToExecuteLive).toBe(false);
  });

  it("blocks a zero max ceiling", () => {
    const session = buildVercelGovernedVerificationSession({ maxAuthorizedUsd: 0 });
    expect(session.blockers).toContain("operator max ceiling must be a positive amount");
    expect(session.preflight.safeToExecuteLive).toBe(false);
  });

  it("blocks a negative max ceiling", () => {
    const session = buildVercelGovernedVerificationSession({ maxAuthorizedUsd: -1 });
    expect(session.blockers).toContain("operator max ceiling must be a positive amount");
  });

  it("blocks a missing handoff", () => {
    const session = buildVercelGovernedVerificationSession({ maxAuthorizedUsd: 3, omitHandoff: true });
    expect(session.handoff).toBeNull();
    expect(session.blockers).toContain("canonical production artifact handoff is missing");
  });

  it("blocks when readiness fails", () => {
    const session = buildVercelGovernedVerificationSession({ maxAuthorizedUsd: 3, failReadiness: true });
    expect(session.readiness?.readyForDeploymentExecution).toBe(false);
    expect(session.blockers).toContain("governed readiness is not readyForDeploymentExecution");
  });

  it("blocks denied EAG create", () => {
    const session = buildVercelGovernedVerificationSession({
      maxAuthorizedUsd: 3,
      denyEagActions: ["hosting.create_project"],
    });
    expect(session.blockers).toContain("EAG hosting.create_project denied");
  });

  it("blocks denied EAG deploy", () => {
    const session = buildVercelGovernedVerificationSession({
      maxAuthorizedUsd: 3,
      denyEagActions: ["hosting.deploy"],
    });
    expect(session.blockers).toContain("EAG hosting.deploy denied");
  });

  it("blocks denied EAG verify", () => {
    const session = buildVercelGovernedVerificationSession({
      maxAuthorizedUsd: 3,
      denyEagActions: ["hosting.verify_deployment"],
    });
    expect(session.blockers).toContain("EAG hosting.verify_deployment denied");
  });

  it("blocks denied Treasury create", () => {
    const session = buildVercelGovernedVerificationSession({
      maxAuthorizedUsd: 3,
      denyTreasuryActions: ["CREATE_HOSTING_PROJECT"],
    });
    expect(session.blockers).toContain("Treasury CREATE_HOSTING_PROJECT denied");
  });

  it("blocks denied Treasury deploy", () => {
    const session = buildVercelGovernedVerificationSession({
      maxAuthorizedUsd: 3,
      denyTreasuryActions: ["DEPLOY_APPLICATION"],
    });
    expect(session.blockers).toContain("Treasury DEPLOY_APPLICATION denied");
  });

  it("blocks authority for the wrong venture", () => {
    const session = buildVercelGovernedVerificationSession({
      maxAuthorizedUsd: 3,
      authorityVentureId: "venture-other",
    });
    expect(session.blockers).toContain("deployment authority is for the wrong venture");
  });

  it("blocks authority for the wrong handoff", () => {
    const session = buildVercelGovernedVerificationSession({
      maxAuthorizedUsd: 3,
      authorityHandoffId: "pah:other:handoff",
    });
    expect(session.blockers).toContain("deployment authority is for the wrong handoff");
  });

  it("blocks expired authority", () => {
    const session = buildVercelGovernedVerificationSession({
      maxAuthorizedUsd: 3,
      expireImmediately: true,
    });
    expect(session.blockers).toContain("deployment authority is expired");
  });

  it("blocks a public launch request", () => {
    const session = buildVercelGovernedVerificationSession({
      maxAuthorizedUsd: 3,
      publicLaunchRequested: true,
    });
    expect(session.blockers).toContain("public launch authority must be false");
  });

  it("repeats preflight with stable ids", () => {
    const first = buildVercelGovernedVerificationSession({ maxAuthorizedUsd: 3 });
    const second = buildVercelGovernedVerificationSession({ maxAuthorizedUsd: 3 });
    expect(first.sessionId).toBe(second.sessionId);
    expect(first.handoff?.handoffId).toBe(second.handoff?.handoffId);
    expect(first.readiness?.readinessId).toBe(second.readiness?.readinessId);
    expect(first.executionRequest?.executionRequestId).toBe(second.executionRequest?.executionRequestId);
    expect(first.executionRequest?.idempotencyKey).toBe(second.executionRequest?.idempotencyKey);
    expect(first.actionIds).toEqual(second.actionIds);
  });

  it("passes a fully valid bounded verification session", () => {
    setValidProviderEnv();
    const session = buildVercelGovernedVerificationSession({ maxAuthorizedUsd: 3 });
    expect(session.handoff?.schemaVersion).toBe("production_artifact_handoff_v1");
    expect(session.handoff?.ventureId).toBe(VERCEL_LIVE_VERIFICATION_RESOURCE);
    expect(session.readiness?.readyForDeploymentExecution).toBe(true);
    expect(session.readiness?.readinessId).toBe(`gdr:${session.ventureId}:${session.handoff?.handoffId}`);
    expect(session.deploymentAuthority?.granted).toBe(true);
    expect(session.eagAuthorizations.map((row) => row.actionType).sort()).toEqual([
      "CREATE_HOSTING_PROJECT",
      "DEPLOY_APPLICATION",
      "VERIFY_HEALTH",
    ]);
    expect(new Set(session.eagAuthorizations.map((row) => row.authorizationId)).size).toBe(3);
    expect(session.treasuryAuthorizations).toHaveLength(2);
    expect(session.treasuryAuthorizations.every((row) => (row.authorizedAmountUsd ?? 0) > 0)).toBe(true);
    expect(session.treasuryAuthorizations.every((row) => row.reservationId == null)).toBe(true);
    expect(session.executionRequest?.idempotencyKey).toBe(session.executionRequest?.executionRequestId);
    expect(session.actionIds.CREATE_HOSTING_PROJECT).toBe(
      governedExecutionActionId(session.executionRequest!.executionRequestId, "CREATE_HOSTING_PROJECT"),
    );
    expect(session.preflight.publicLaunchDisabled).toBe(true);
    expect(JSON.stringify(sessionPublicSafe(session))).not.toMatch(/Bearer /);
    expect(session.preflight.safeToExecuteLive).toBe(true);
    expect(session.blockers).toEqual([]);
  });

  it("parses --max-usd and does not invent an amount", () => {
    expect(parseMaxUsd(["node", "script"], {})).toBeNull();
    expect(parseMaxUsd(["node", "script", "--max-usd", "4"], {})).toBe(4);
    expect(parseMaxUsd(["node", "script", "--max-usd=7"], {})).toBe(7);
  });
});

function sessionPublicSafe(session: ReturnType<typeof buildVercelGovernedVerificationSession>) {
  return {
    sessionId: session.sessionId,
    blockers: session.blockers,
    preflight: session.preflight,
    ids: session.actionIds,
  };
}
