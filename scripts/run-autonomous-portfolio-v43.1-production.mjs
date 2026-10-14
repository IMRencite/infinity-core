#!/usr/bin/env node
/**
 * V43.1 — Deploy infinity-runtime portfolio tick + authenticated health probe + optional production cycle.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const OUT = join(process.cwd(), ".infinity/autonomous-portfolio-operations/v43.1-production-report.json");

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();

const runtimeUrl = (process.env.INFINITY_RUNTIME_URL ?? process.env.INFINITY_CLOUD_RUNTIME_URL ?? "").replace(/\/$/, "");
const cronSecret = process.env.CRON_SECRET ?? process.env.INFINITY_CRON_SECRET ?? "";

const deploy = spawnSync("node", ["scripts/infinity-runtime-isolated-deploy.mjs"], {
  cwd: process.cwd(),
  encoding: "utf8",
  env: process.env,
});

const deployId =
  deploy.stdout.match(/deployment[_\s]+id[:\s]+([a-zA-Z0-9_]+)/i)?.[1] ??
  deploy.stdout.match(/dpl_[a-zA-Z0-9]+/)?.[0] ??
  null;

let httpQc = "FAIL";
let runtimeQc = "FAIL";
let cycleId = null;
let cyclePayload = null;

if (runtimeUrl && cronSecret) {
  const res = await fetch(`${runtimeUrl}/api/runtime/portfolio-operating-tick`, {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  httpQc = res.status === 200 ? "PASS" : "FAIL";
  if (res.ok) {
    cyclePayload = await res.json();
    runtimeQc =
      cyclePayload.OPERATING_VENTURE_INVENTORY_QC === "PASS" &&
      cyclePayload.SCHEDULED_AUTONOMOUS_PUBLISH_POLICY_QC === "PASS"
        ? "PASS"
        : "PARTIAL";
    cycleId = cyclePayload.cycle?.version ?? "portfolio-operating-tick";
  }
} else {
  httpQc = "SKIPPED_NO_RUNTIME_URL_OR_SECRET";
  runtimeQc = "SKIPPED_NO_RUNTIME_URL_OR_SECRET";
}

const report = {
  mission: "V43_1_PRODUCTION_AUTONOMOUS_PORTFOLIO_OPERATIONS",
  generated_at: new Date().toISOString(),
  V43_1_INFINITY_RUNTIME_DEPLOYMENT_ID: deployId,
  V43_1_PORTFOLIO_RUNTIME_DEPLOYMENT_QC: deploy.status === 0 ? "PASS" : "FAIL",
  PORTFOLIO_OPERATING_TICK_HTTP_QC: httpQc,
  PORTFOLIO_OPERATING_TICK_RUNTIME_QC: runtimeQc,
  PORTFOLIO_OPERATING_SCHEDULER_QC: "PENDING_NEXT_REAL_CRON",
  V43_1_PRODUCTION_OPERATING_CYCLE_ID: cycleId,
  deploy_stdout_tail: deploy.stdout?.slice(-4000) ?? "",
  deploy_stderr_tail: deploy.stderr?.slice(-2000) ?? "",
  cycle_summary: cyclePayload
    ? {
        publish_policy: cyclePayload.publish_policy,
        content: cyclePayload.cycle?.content,
        self_heal: cyclePayload.cycle?.self_heal,
      }
    : null,
};

mkdirSync(join(process.cwd(), ".infinity/autonomous-portfolio-operations"), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exit(deploy.status === 0 && httpQc !== "FAIL" ? 0 : 1);
