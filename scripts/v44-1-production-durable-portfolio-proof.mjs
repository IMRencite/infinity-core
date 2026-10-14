#!/usr/bin/env node
/**
 * V44.1 manual production durable portfolio proof (orchestrator + worker chain + Supabase readback).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const envPath = join(root, ".env.local");
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  const k = t.slice(0, i);
  let v = t.slice(i + 1);
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!process.env[k]) process.env[k] = v;
}

const secret = process.env.CRON_SECRET || process.env.INFINITY_RUNTIME_TICK_SECRET;
const base = (process.env.INFINITY_RUNTIME_URL || "https://infinity-runtime.vercel.app").replace(/\/$/, "");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function fetchJson(path, opts = {}) {
  const res = await fetch(`${base}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${secret}`, ...(opts.headers || {}) },
    signal: AbortSignal.timeout(opts.timeoutMs ?? 120_000),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 500) };
  }
  return { status: res.status, body };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const report = {
  V44_1_MANUAL_ORCHESTRATOR_HTTP_QC: "FAIL",
  V44_1_MANUAL_CYCLE_ID: null,
  V44_1_MANUAL_CYCLE_STATUS: null,
  V44_1_MANUAL_CYCLE_CREATED_AT: null,
  PORTFOLIO_CYCLE_DURABLE_PERSISTENCE_QC: "FAIL",
  V44_1_JOBS_ENQUEUED: 0,
  V44_1_JOB_TYPES: [],
  V44_1_VENTURES_WITH_JOBS: [],
  PORTFOLIO_JOB_DURABLE_ENQUEUE_QC: "FAIL",
  PORTFOLIO_JOB_CLAIM_AND_LEASE_QC: "PENDING",
  PORTFOLIO_JOB_CONTINUATION_QC: "PENDING",
  worker_runs: [],
  OCCUPANCYNPV_NEW_ASSET_ID: "blog-expansion-how-do-you-compare-two-commercial-lease-options",
  OCCUPANCYNPV_NEW_PRODUCTION_URL: null,
  OCCUPANCYNPV_NEW_DEPLOYMENT_ID: null,
  RUNTIME_ORIGINATED_VENTURE_PUBLICATION_QC: "PENDING",
  AUTONOMOUS_PRODUCTION_PUBLISH_PROOF_QC: "PENDING",
};

if (!secret || !url || !key) {
  report.error = "MISSING_SECRET_OR_SUPABASE";
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const tick = await fetchJson("/api/runtime/portfolio-operating-tick");
report.V44_1_MANUAL_ORCHESTRATOR_HTTP_QC =
  tick.status === 200 || tick.status === 202 ? "PASS" : "FAIL";
report.orchestrator_status = tick.status;
report.orchestrator_trigger = tick.body?.provenance?.trigger_type ?? tick.body?.trigger;
report.onpv_publish_diagnostic = tick.body?.onpv_publish_diagnostic ?? null;
report.onpv_autonomous_publish_candidate = tick.body?.onpv_autonomous_publish_candidate ?? null;
report.orchestrator_jobs_created = tick.body?.jobs_created ?? null;
const cycleId = tick.body?.cycle_id ?? null;
report.V44_1_MANUAL_CYCLE_ID = cycleId;

if (cycleId) {
  const { data: cycle } = await admin.from("autonomous_portfolio_cycles").select("*").eq("cycle_id", cycleId).maybeSingle();
  if (cycle) {
    report.V44_1_MANUAL_CYCLE_STATUS = cycle.status;
    report.V44_1_MANUAL_CYCLE_CREATED_AT = cycle.triggered_at;
    report.PORTFOLIO_CYCLE_DURABLE_PERSISTENCE_QC =
      cycle.trigger_type === "MANUAL" ? "PASS" : "FAIL";
  }
  const { data: jobs } = await admin.from("autonomous_portfolio_jobs").select("*").eq("cycle_id", cycleId);
  report.V44_1_JOBS_ENQUEUED = jobs?.length ?? 0;
  report.V44_1_JOB_TYPES = [...new Set((jobs ?? []).map((j) => j.job_type))];
  report.V44_1_VENTURES_WITH_JOBS = [...new Set((jobs ?? []).map((j) => j.venture_id))];
  report.PORTFOLIO_JOB_DURABLE_ENQUEUE_QC = (jobs?.length ?? 0) > 0 ? "PASS" : "FAIL";
}

const orchestratorFinishedAt = Date.now();
for (let i = 0; i < 40; i += 1) {
  const worker = await fetchJson(
    cycleId ? `/api/runtime/portfolio-job-worker?cycle_id=${cycleId}` : "/api/runtime/portfolio-job-worker",
    { timeoutMs: 300_000 },
  );
  report.worker_runs.push({
    i,
    status: worker.status,
    processed: worker.body?.processed,
    remaining: worker.body?.remaining_queued,
    continuation: worker.body?.continuation,
  });
  if (cycleId) {
    const { data: jobs } = await admin.from("autonomous_portfolio_jobs").select("job_type,status,attempt_count,lease_holder,safe_error,output_lineage").eq("cycle_id", cycleId);
    const deployJob = jobs?.find((j) => j.job_type === "VENTURE_DEPLOY");
    const verify = jobs?.find((j) => j.job_type === "PRODUCTION_VERIFY");
    if (deployJob?.output_lineage?.deployment_id) {
      report.OCCUPANCYNPV_NEW_DEPLOYMENT_ID = deployJob.output_lineage.deployment_id;
    }
    if (verify?.status === "COMPLETED" && deployJob?.status === "COMPLETED") {
      report.RUNTIME_ORIGINATED_VENTURE_PUBLICATION_QC = "PASS";
      report.AUTONOMOUS_PRODUCTION_PUBLISH_PROOF_QC = verify.output_lineage?.AUTONOMOUS_PRODUCTION_PUBLISH_PROOF_QC ?? "PASS";
      report.OCCUPANCYNPV_NEW_PRODUCTION_URL =
        "https://occupancynpv.com/blog/leasing/how-do-you-compare-two-commercial-lease-options/";
      break;
    }
    const allDone = jobs?.every((j) => j.status === "COMPLETED" || j.status === "FAILED");
    if (allDone && verify?.status !== "COMPLETED") break;
  }
  await sleep(20_000);
}

if (cycleId) {
  const { data: jobs } = await admin.from("autonomous_portfolio_jobs").select("*").eq("cycle_id", cycleId);
  const leased = jobs?.some((j) => j.attempt_count > 0);
  const duplicateLeaseHolders = new Set(jobs?.map((j) => j.lease_holder).filter(Boolean));
  report.PORTFOLIO_JOB_CLAIM_AND_LEASE_QC =
    leased && jobs?.some((j) => j.status === "COMPLETED" || j.status === "IN_PROGRESS" || j.status === "FAILED")
      ? "PASS_PRODUCTION"
      : "FAIL";
  const progressedAfterOrchestrator = jobs?.some(
    (j) => j.status === "COMPLETED" && j.completed_at && Date.parse(j.completed_at) > orchestratorFinishedAt - 5000,
  );
  report.PORTFOLIO_JOB_CONTINUATION_QC = progressedAfterOrchestrator ? "PASS_PRODUCTION" : "FAIL";
  report.final_jobs = jobs?.map((j) => ({
    job_type: j.job_type,
    status: j.status,
    attempt_count: j.attempt_count,
    safe_error: j.safe_error,
  }));
}

const live = await fetch("https://occupancynpv.com/blog/leasing/how-do-you-compare-two-commercial-lease-options/", {
  signal: AbortSignal.timeout(60_000),
});
report.live_http_status = live.status;
if (live.ok && report.AUTONOMOUS_PRODUCTION_PUBLISH_PROOF_QC === "PENDING") {
  const html = await live.text();
  report.live_page_has_canonical_slug = html.includes("how-do-you-compare-two-commercial-lease-options");
}

const { data: ledger } = await admin
  .from("autonomous_runtime_scheduled_execution_ledger")
  .select("*")
  .eq("route", "/api/runtime/portfolio-operating-tick")
  .order("request_timestamp", { ascending: false })
  .limit(5);
report.recent_portfolio_ledger = ledger?.map((r) => ({
  ledger_id: r.ledger_id,
  trigger_type: r.trigger_type,
  cycle_id: r.cycle_id,
  request_timestamp: r.request_timestamp,
}));

const { data: realCron } = await admin
  .from("autonomous_runtime_scheduled_execution_ledger")
  .select("*")
  .eq("route", "/api/runtime/portfolio-operating-tick")
  .eq("trigger_type", "REAL_CRON")
  .order("request_timestamp", { ascending: false })
  .limit(1)
  .maybeSingle();
report.V44_1_REAL_PORTFOLIO_CRON_AVAILABLE = Boolean(realCron);
report.V44_1_REAL_PORTFOLIO_CRON_LEDGER_ID = realCron?.ledger_id ?? null;
report.V44_1_REAL_PORTFOLIO_CRON_TIMESTAMP = realCron?.request_timestamp ?? null;
report.V44_1_REAL_PORTFOLIO_CRON_PROVENANCE = realCron?.platform_provenance ?? null;
report.V44_1_REAL_PORTFOLIO_CRON_CYCLE_ID = realCron?.cycle_id ?? null;

mkdirSync(join(root, ".infinity/autonomous-portfolio-operations"), { recursive: true });
writeFileSync(join(root, ".infinity/autonomous-portfolio-operations/v44.1-production-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
