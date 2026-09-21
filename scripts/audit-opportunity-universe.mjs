/**
 * Read-only audit of opportunity_candidates + discovery runs.
 * Does not invent candidates. Does not write Stripe/domain/AskReview schema.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep === -1) continue;
    const key = trimmed.slice(0, sep);
    let val = trimmed.slice(sep + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const orgId = process.env.RESEARCH_TEST_ORG_ID ?? "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";

function classify(row) {
  const blob = `${row.title ?? ""} ${row.summary ?? ""} ${row.organization_id ?? ""}`.toLowerCase();
  if (/\be2e\b|e2e_fixture|playwright/.test(blob)) return "E2E_FIXTURE";
  if (/\bsimulation\b|simulated candidate/.test(blob)) return "SIMULATION";
  if (/\btest\b|vitest|fixture|dummy candidate/.test(blob)) return "TEST";
  if (row.status === "ARCHIVED" || row.archived_at) return "ARCHIVED";
  if (!row.title || !row.id) return "INVALID";
  return "REAL_CANONICAL";
}

const [candidates, runs, monetization, selections, legacy] = await Promise.all([
  admin.from("opportunity_candidates").select("*").eq("organization_id", orgId).order("opportunity_score", { ascending: false, nullsFirst: false }),
  admin.from("opportunity_discovery_runs").select("id,status,candidates_discovered,candidates_persisted,created_at,completed_at,scanner_report,scanner_version").eq("organization_id", orgId).order("created_at", { ascending: false }),
  admin.from("monetization_candidate_analyses").select("opportunity_candidate_id,economic_viability,monetization_score,created_at").limit(200),
  admin.from("venture_selection_runs").select("id,status,build_count,validate_count,reject_count,created_at,selected_candidate_ids,decision_summary").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(10),
  admin.from("opportunities").select("id,name,status,decision,overall_score,created_at").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50),
]);

const monById = new Map();
for (const row of monetization.data ?? []) {
  if (!monById.has(row.opportunity_candidate_id)) monById.set(row.opportunity_candidate_id, row);
}

const classified = (candidates.data ?? []).map((row, index) => ({
  rank: index + 1,
  id: row.id,
  title: row.title,
  classification: classify(row),
  opportunityScore: row.opportunity_score,
  monetizationScore: monById.get(row.id)?.monetization_score ?? null,
  viability: monById.get(row.id)?.economic_viability ?? null,
  discoveryRunId: row.discovery_run_id,
  createdAt: row.created_at,
  rankPosition: row.rank_position,
  orgId: row.organization_id,
}));

const counts = classified.reduce((acc, row) => {
  acc[row.classification] = (acc[row.classification] ?? 0) + 1;
  return acc;
}, {});

const report = {
  orgId,
  candidateError: candidates.error?.message ?? null,
  discoveryError: runs.error?.message ?? null,
  rawCount: classified.length,
  counts,
  discoveryRuns: (runs.data ?? []).map((row) => ({
    id: row.id,
    status: row.status,
    discovered: row.candidates_discovered,
    persisted: row.candidates_persisted,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    candidateCount: row.scanner_report?.candidateCount ?? null,
    poolAdequacy: row.scanner_report?.poolAdequacy ?? null,
    scannerVersion: row.scanner_version ?? row.scanner_report?.scannerVersion ?? null,
  })),
  selectionRuns: selections.data ?? [],
  selectionError: selections.error?.message ?? null,
  legacyOpportunities: (legacy.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    decision: row.decision,
    score: row.overall_score,
    createdAt: row.created_at,
  })),
  legacyError: legacy.error?.message ?? null,
  candidates: classified,
};

mkdirSync(".infinity/opportunity-universe", { recursive: true });
writeFileSync(".infinity/opportunity-universe/audit.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  rawCount: report.rawCount,
  counts,
  discoveryRuns: report.discoveryRuns,
  legacyCount: report.legacyOpportunities.length,
  selectionRuns: (report.selectionRuns ?? []).map((row) => ({ id: row.id, status: row.status, created_at: row.created_at })),
}, null, 2));
