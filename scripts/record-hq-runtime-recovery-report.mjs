import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep === -1) continue;
    const key = trimmed.slice(0, sep);
    let val = trimmed.slice(sep + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (process.env[key] == null) process.env[key] = val;
  }
}

loadEnv();

const events = [
  "HQ Production Server Error Investigation",
  "HQ Server Runtime Recovery",
  "Rendered Visual QC Hardening",
  "Taxonomy Pill Standard",
  "Hydration Fix",
  "SSR/Client Parity Hardening",
  "Design Core Creative Hardening",
];
const deployment = { id: "dpl_HizvEusPYZETPmp1yTpcjVHaSfgF", target: "hq.imros.io", status: "READY" };

const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const existing = await client.from("founder_daily_reports").select("payload").eq("report_date", today).maybeSingle();
const report = existing.data?.payload;
if (!report) {
  console.log(JSON.stringify({ ok: false, reason: "TODAYS_REPORT_MISSING" }));
  process.exit(1);
}

const completed = report.sections.find((section) => section.id === "completed") ?? { id: "completed", title: "Completed", items: [] };
for (const title of events) {
  if (completed.items.some((item) => item.title === title)) continue;
  completed.items.push({
    item_id: `item:hq-recovery:${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    status: "COMPLETED",
    engine: "hq",
    title,
    source_ids: [`hq-recovery:${title}`],
  });
  report.source_event_ids = [...new Set([...(report.source_event_ids ?? []), `hq-recovery:${title}`])];
}
if (!report.source_event_ids.includes(deployment.id)) {
  completed.items.push({
    item_id: `item:deploy:${deployment.id}`,
    status: "COMPLETED",
    engine: "deploy",
    title: `Deployment ${deployment.id} → ${deployment.target} (${deployment.status})`,
    href: "/dashboard/builds",
    source_ids: [deployment.id],
  });
  report.source_event_ids.push(deployment.id);
}
report.sections = [completed, ...report.sections.filter((section) => section.id !== "completed")];
report.completed_count = completed.items.length;
report.deployments = (report.deployments ?? 0) + 1;
report.updated_at = new Date().toISOString();
report.summary = `Infinity recorded ${report.completed_count} completed items, ${report.in_progress_count} in progress, ${report.planned_count} planned, and ${report.blocked_count} blocked or founder-attention items.`;

const { error } = await client.from("founder_daily_reports").upsert({
  report_date: report.report_date,
  report_id: report.report_id,
  status: report.status,
  version: report.version,
  generated_at: report.generated_at,
  updated_at: report.updated_at,
  finalized_at: report.finalized_at,
  payload: report,
}, { onConflict: "report_date" });

console.log(JSON.stringify({
  ok: !error,
  report_id: report.report_id,
  status: report.status,
  completed_count: report.completed_count,
  deployments: report.deployments,
}, null, 2));
if (error) process.exit(1);
