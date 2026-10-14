#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const envPath = join(process.cwd(), ".env.local");
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
const url = `${(process.env.INFINITY_RUNTIME_URL || "https://infinity-runtime.vercel.app").replace(/\/$/, "")}/api/runtime/portfolio-operating-tick`;
const res = await fetch(url, { headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(600_000) });
const text = await res.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  body = { raw: text.slice(0, 500) };
}
const out = {
  PORTFOLIO_OPERATING_TICK_HTTP_QC: res.status === 200 ? "PASS" : "FAIL",
  PORTFOLIO_OPERATING_TICK_RUNTIME_QC:
    res.status === 200 && body.SCHEDULED_AUTONOMOUS_PUBLISH_POLICY_QC === "PASS" ? "PASS" : "PARTIAL",
  status: res.status,
  trigger: body.trigger,
  PORTFOLIO_OPERATING_SCHEDULER_QC: body.PORTFOLIO_OPERATING_SCHEDULER_QC ?? "PENDING_NEXT_REAL_CRON",
  publish_policy: body.publish_policy,
  content: body.cycle?.content,
  self_heal: body.cycle?.self_heal,
  V43_1_PRODUCTION_OPERATING_CYCLE_ID: body.cycle?.version ?? null,
  AUTONOMOUS_PRODUCTION_PUBLISH_CAPABILITY_QC: body.AUTONOMOUS_PRODUCTION_PUBLISH_CAPABILITY_QC,
  AUTONOMOUS_PRODUCTION_PUBLISH_PROOF_QC: body.AUTONOMOUS_PRODUCTION_PUBLISH_PROOF_QC,
  AUTONOMOUS_PRODUCTION_PUBLICATION_EXECUTION_QC: body.AUTONOMOUS_PRODUCTION_PUBLICATION_EXECUTION_QC,
  occupancynpv_production_urls: body.cycle?.occupancynpv?.OCCUPANCYNPV_PRODUCTION_URLS ?? [],
  V43_2_INFINITY_RUNTIME_DEPLOYMENT_ID: "dpl_9NTC4E3BNGxUZ2aeEqbNiS1wPcj8",
};
mkdirSync(join(process.cwd(), ".infinity/autonomous-portfolio-operations"), { recursive: true });
writeFileSync(join(process.cwd(), ".infinity/autonomous-portfolio-operations/v43.1-production-report.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
