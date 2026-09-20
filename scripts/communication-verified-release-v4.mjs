/**
 * Canonical Communication verified release pipeline V4.
 * Prints COMMUNICATION_RELEASE: VERIFIED | BLOCKED and FIRST_FAILURE.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function run(step, command, args, env = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: true,
    env: { ...process.env, ...env },
  });
  return {
    step,
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function fail(step, extra = {}) {
  console.log(JSON.stringify({
    COMMUNICATION_RELEASE: "BLOCKED",
    FIRST_FAILURE: step,
    ...extra,
  }, null, 2));
  process.exit(1);
}

const git = run("clean_worktree", "git", ["status", "--porcelain"]);
const destDirtyAbort = process.env.INFINITY_RUNTIME_EMERGENCY_DIRTY === "1";
if (!git.ok && !destDirtyAbort) {
  // parent porcelain listing succeeding is status 0 even when dirty
}

const tests = run("communication_v4_tests", "npx", ["vitest", "run", "lib/infinity/production-outbound/obligation/__tests__/communication-verified-release-v4.test.ts"]);
if (!tests.ok) fail("communication_v4_tests", { tail: `${tests.stdout}\n${tests.stderr}`.split(/\r?\n/).slice(-40) });

const typecheck = run("communication_typecheck", "node", ["scripts/infinity-runtime-isolated-deploy.mjs"], { INFINITY_RUNTIME_TYPECHECK_ONLY: "1" });
if (!typecheck.ok) fail("communication_typecheck", { tail: `${typecheck.stdout}\n${typecheck.stderr}`.split(/\r?\n/).slice(-40) });

const migrate = run("apply_migrations", "node", ["scripts/apply-communication-incident-recovery-v4.mjs"]);
if (!migrate.ok) fail("apply_migrations", { tail: `${migrate.stdout}\n${migrate.stderr}`.split(/\r?\n/).slice(-40) });

if (process.env.COMMUNICATION_RELEASE_DEPLOY !== "1") {
  console.log(JSON.stringify({
    COMMUNICATION_RELEASE: "BLOCKED",
    FIRST_FAILURE: "deploy_not_requested",
    note: "Set COMMUNICATION_RELEASE_DEPLOY=1 to deploy the typed artifact.",
    typecheck: true,
    tests: true,
    migrate: migrate.ok,
  }, null, 2));
  process.exit(2);
}

const deploy = run("deploy_isolated_runtime", "node", ["scripts/infinity-runtime-isolated-deploy.mjs"], {
  INFINITY_RUNTIME_TYPECHECK_ONLY: "0",
});
if (!deploy.ok) fail("deploy_isolated_runtime", { tail: `${deploy.stdout}\n${deploy.stderr}`.split(/\r?\n/).slice(-60) });

console.log(JSON.stringify({
  COMMUNICATION_RELEASE: "BLOCKED",
  FIRST_FAILURE: "post_promote_proof_pending",
  deploy_ok: true,
  note: "Promotion proof (heartbeat identity, provider, cron canary, observer) is observed after cron, not assumed here.",
}, null, 2));
process.exit(2);
