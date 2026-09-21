/**
 * Read-only probe of the current opportunity universe.
 * Does not invent candidates. Does not print secrets.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const sep = trimmed.indexOf("=");
  if (sep === -1) continue;
  process.env[trimmed.slice(0, sep)] = trimmed.slice(sep + 1).replace(/^["']|["']$/g, "");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log(JSON.stringify({ ok: false, error: "SUPABASE_UNCONFIGURED" }));
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });
const orgId = process.env.RESEARCH_TEST_ORG_ID ?? "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";

const [candidates, discoveryRuns, selectionRuns, monetizationRuns] = await Promise.all([
  admin
    .from("opportunity_candidates")
    .select("id,title,summary,problem,target_customer,market,opportunity_score,rank_position,discovery_run_id,created_at,business_model_candidates,revenue_mechanism_candidates,risks,unknowns")
    .eq("organization_id", orgId)
    .order("opportunity_score", { ascending: false, nullsFirst: false })
    .limit(40),
  admin
    .from("opportunity_discovery_runs")
    .select("id,status,candidates_discovered,candidates_persisted,created_at,scanner_report")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(8),
  admin
    .from("venture_selection_runs")
    .select("id,status,build_count,validate_count,reject_count,created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(5),
  admin
    .from("monetization_runs")
    .select("id,status,created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(5),
]);

const slimDiscovery = (discoveryRuns.data ?? []).map((row) => ({
  id: row.id,
  status: row.status,
  candidates_discovered: row.candidates_discovered,
  candidates_persisted: row.candidates_persisted,
  created_at: row.created_at,
  candidateCount: row.scanner_report?.candidateCount ?? null,
  poolAdequacy: row.scanner_report?.poolAdequacy ?? null,
}));

console.log(
  JSON.stringify(
    {
      ok: !candidates.error && !discoveryRuns.error,
      orgId,
      candidateError: candidates.error?.message ?? null,
      discoveryError: discoveryRuns.error?.message ?? null,
      selectionError: selectionRuns.error?.message ?? null,
      monetizationError: monetizationRuns.error?.message ?? null,
      candidateCount: candidates.data?.length ?? 0,
      candidates: candidates.data ?? [],
      discoveryRuns: slimDiscovery,
      selectionRuns: selectionRuns.data ?? [],
      monetizationRuns: monetizationRuns.data ?? [],
    },
    null,
    2,
  ),
);
