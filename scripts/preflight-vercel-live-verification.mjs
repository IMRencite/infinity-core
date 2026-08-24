import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
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

function normalizeScope(raw) {
  if (!raw) return [];
  return [...new Set(raw.split(",").map((item) => item.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

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
blockers.push("governed readiness is not supplied to this read-only script");
blockers.push("canonical deployment authority is not supplied to this read-only script");
blockers.push("EAG AUTO_AUTHORIZE grants are not supplied to this read-only script");
blockers.push("Treasury bounded authorization is not supplied to this read-only script");

const report = {
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
  blockers,
};

console.log(JSON.stringify(report, null, 2));
process.exit(report.safeToExecuteLive ? 0 : 1);
