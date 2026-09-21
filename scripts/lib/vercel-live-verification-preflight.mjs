import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const GOVERNANCE_REF_ENV = {
  organizationId: "INFINITY_VERCEL_ORGANIZATION_ID",
  ventureId: "INFINITY_VERCEL_VENTURE_ID",
  handoffId: "INFINITY_VERCEL_HANDOFF_ID",
  readinessId: "INFINITY_VERCEL_READINESS_ID",
  executionRequestId: "INFINITY_VERCEL_EXECUTION_REQUEST_ID",
  deploymentAuthorizationId: "INFINITY_VERCEL_DEPLOYMENT_AUTHORIZATION_ID",
  eagAuthorizationIds: "INFINITY_VERCEL_EAG_AUTHORIZATION_IDS",
  treasuryAuthorizationIds: "INFINITY_VERCEL_TREASURY_AUTHORIZATION_IDS",
};

export function loadEnvLocal() {
  try {
    const content = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator <= 0) continue;
      const key = trimmed.slice(0, separator);
      let val = trimmed.slice(separator + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] == null) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

function present(name, min = 1) {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length >= min;
}

function flag(name) {
  const value = process.env[name];
  return value === "true" || value === "1";
}

function envText(name) {
  const value = process.env[name];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function splitIds(raw) {
  if (!raw) return [];
  return [...new Set(raw.split(",").map((item) => item.trim()).filter(Boolean))];
}

function normalizeScope(raw) {
  if (!raw) return [];
  return [...new Set(raw.split(",").map((item) => item.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function loadGovernanceRefsFromEnv() {
  return {
    organizationId: envText(GOVERNANCE_REF_ENV.organizationId),
    ventureId: envText(GOVERNANCE_REF_ENV.ventureId),
    handoffId: envText(GOVERNANCE_REF_ENV.handoffId),
    readinessId: envText(GOVERNANCE_REF_ENV.readinessId),
    executionRequestId: envText(GOVERNANCE_REF_ENV.executionRequestId),
    deploymentAuthorizationId: envText(GOVERNANCE_REF_ENV.deploymentAuthorizationId),
    eagAuthorizationIds: splitIds(envText(GOVERNANCE_REF_ENV.eagAuthorizationIds)),
    treasuryAuthorizationIds: splitIds(envText(GOVERNANCE_REF_ENV.treasuryAuthorizationIds)),
  };
}

export function evaluateCurrentEnvironmentPreflight() {
  loadEnvLocal();

  const expectedScope = ["hosting.create_project", "hosting.deploy", "hosting.verify_deployment"].sort((a, b) =>
    a.localeCompare(b),
  );
  const scope = normalizeScope(process.env.VERCEL_TOKEN_SCOPE);
  const scopeExact = scope.length === expectedScope.length && expectedScope.every((item, i) => scope[i] === item);
  const scopeKind = (process.env.VERCEL_TOKEN_SCOPE_KIND ?? "").trim().toUpperCase();
  const repo = (process.env.INFINITY_VERCEL_TEST_REPO ?? "").trim();
  const sha = (process.env.INFINITY_VERCEL_TEST_SHA ?? "").trim();
  const artifact = (process.env.INFINITY_VERCEL_TEST_ARTIFACT_ID ?? "").trim();
  const team = (process.env.VERCEL_TEAM_ID ?? "").trim();
  const resource = (process.env.INFINITY_VERCEL_TEST_RESOURCE ?? "infinity-test-live-verification-gde").trim();
  const refs = loadGovernanceRefsFromEnv();

  const blockers = [];
  if (!present("VERCEL_TOKEN", 11)) blockers.push("VERCEL_TOKEN is missing");
  if (!scopeExact) blockers.push("VERCEL_TOKEN_SCOPE is missing or is not the exact Infinity-intended action set");
  if (scopeKind === "PROVIDER_ENFORCED") blockers.push("VERCEL_TOKEN_SCOPE_KIND=PROVIDER_ENFORCED is not allowed");
  if (scopeKind !== "INFINITY_INTENDED") blockers.push("VERCEL_TOKEN_SCOPE_KIND must be INFINITY_INTENDED");
  if (!team) blockers.push("VERCEL_TEAM_ID is missing");
  if (/(\bprod\b|production|customer|live-venture)/i.test(team)) blockers.push("VERCEL_TEAM_ID looks like a production team");
  if (!flag("INFINITY_VERCEL_TEST_TEAM_CONFIRMED")) blockers.push("INFINITY_VERCEL_TEST_TEAM_CONFIRMED is not true");
  if (!resource.startsWith("infinity-test-")) blockers.push("INFINITY_VERCEL_TEST_RESOURCE is not a disposable infinity-test resource");
  if (!repo) blockers.push("INFINITY_VERCEL_TEST_REPO is missing");
  else if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) blockers.push("INFINITY_VERCEL_TEST_REPO is not owner/repo");
  else if (!repo.split("/")[1]?.startsWith("infinity-test-")) {
    blockers.push("INFINITY_VERCEL_TEST_REPO is not a disposable infinity-test repository");
  }
  if (!sha) blockers.push("INFINITY_VERCEL_TEST_SHA is missing");
  else if (!/^[0-9a-f]{7,40}$/i.test(sha)) blockers.push("INFINITY_VERCEL_TEST_SHA is not a valid Git SHA");
  if (!artifact) blockers.push("INFINITY_VERCEL_TEST_ARTIFACT_ID is missing");
  else if (artifact !== "infinity-vercel-live-verification-artifact-v1") {
    blockers.push("INFINITY_VERCEL_TEST_ARTIFACT_ID does not match the canonical verification artifact");
  }
  if (!flag("INFINITY_VERCEL_LEFTOVER_RESOURCE_ACCEPTED")) {
    blockers.push("INFINITY_VERCEL_LEFTOVER_RESOURCE_ACCEPTED is not true");
  }
  if (!present("GITHUB_TOKEN", 11)) {
    blockers.push("GITHUB_TOKEN is required for the existing Vercel git-deploy adapter repository lookup (read-only)");
  }
  if (!flag("LIVE_PROVIDER_TEST_MODE")) blockers.push("LIVE_PROVIDER_TEST_MODE is not enabled");

  if (!refs.readinessId) blockers.push("canonical GovernedDeploymentReadiness is not supplied");
  else blockers.push("canonical readiness record ID was supplied but no matching GovernedDeploymentReadiness was resolved");
  if (!refs.handoffId) blockers.push("canonical production artifact handoff is not supplied");
  else blockers.push("canonical handoff record ID was supplied but no matching ProductionArtifactHandoff was resolved");
  if (!refs.deploymentAuthorizationId) blockers.push("canonical deployment authority is not supplied");
  else blockers.push("canonical deployment authority ID was supplied but no matching grant was resolved");
  if (refs.eagAuthorizationIds.length === 0) blockers.push("canonical EAG authorization IDs are not supplied");
  else {
    for (const id of refs.eagAuthorizationIds) blockers.push(`orphan EAG authorization: ${id}`);
  }
  if (refs.treasuryAuthorizationIds.length === 0) blockers.push("canonical Treasury authorization IDs are not supplied");
  else {
    for (const id of refs.treasuryAuthorizationIds) blockers.push(`orphan Treasury authorization: ${id}`);
  }
  blockers.push("idempotency context is missing because canonical readiness was not resolved");

  const unique = [...new Set(blockers)];
  return {
    credentialPresent: present("VERCEL_TOKEN", 11),
    scopeAttested: scopeExact && scopeKind === "INFINITY_INTENDED",
    scopeKind: scopeKind || "MISSING",
    teamConfigured: Boolean(team),
    testTeamConfirmed: flag("INFINITY_VERCEL_TEST_TEAM_CONFIRMED"),
    repositoryConfigured: Boolean(repo),
    shaConfigured: Boolean(sha),
    artifactMatched: artifact === "infinity-vercel-live-verification-artifact-v1",
    leftoverAccepted: flag("INFINITY_VERCEL_LEFTOVER_RESOURCE_ACCEPTED"),
    readinessSatisfied: false,
    deploymentAuthoritySatisfied: false,
    eagSatisfied: false,
    treasurySatisfied: false,
    costPolicySatisfied: false,
    idempotencySatisfied: false,
    publicLaunchDisabled: true,
    safeToExecuteLive: false,
    scopeAloneGrantsLive: false,
    secretPrinted: false,
    fabricated: false,
    envBooleansUsedAsAuthority: false,
    recordsResolved: false,
    governance: {
      typedInput: true,
      canonicalRecordsOnly: true,
      refsPresent: {
        organizationId: Boolean(refs.organizationId),
        ventureId: Boolean(refs.ventureId),
        handoffId: Boolean(refs.handoffId),
        readinessId: Boolean(refs.readinessId),
        executionRequestId: Boolean(refs.executionRequestId),
        deploymentAuthorizationId: Boolean(refs.deploymentAuthorizationId),
        eagAuthorizationIds: refs.eagAuthorizationIds.length,
        treasuryAuthorizationIds: refs.treasuryAuthorizationIds.length,
      },
    },
    operatorRequiredSteps: [
      "Produce a real GovernedDeploymentReadiness with evaluateGovernedDeploymentReadiness from a real ProductionArtifactHandoff. The disposable verification HTML is not a readiness record.",
      "There is no durable GDR table. Supply INFINITY_VERCEL_READINESS_ID and INFINITY_VERCEL_HANDOFF_ID only after those objects exist in a catalog/read model the preflight can resolve.",
      "Grant deployment authority through the existing GDE AuthorityGrant input (buildGovernedDeploymentExecutionRequest.deploymentAuthority). Env flags are not authority. Set INFINITY_VERCEL_DEPLOYMENT_AUTHORIZATION_ID to that grant id.",
      "Create action-specific EAG AUTO_AUTHORIZE grants for hosting.create_project, hosting.deploy, and hosting.verify_deployment via evaluateAutonomousExternalAuthorization / ActionAuthorityGrant. Do not reuse one grant across actions.",
      "Create bounded Treasury authorization via authorizeFinancialAction for CREATE_HOSTING_PROJECT and DEPLOY_APPLICATION with costActuality ESTIMATE or KNOWN and a positive hard ceiling. Unknown is not zero. Do not reserve or move money in preflight.",
      "Supply the resulting non-secret IDs. Preflight will not create, persist, or invent these records.",
    ],
    blockers: unique,
  };
}
