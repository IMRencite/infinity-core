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

const orgId = "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: changeOrder } = await admin
  .from("opportunity_candidates")
  .select("id, title, rank_position, discovery_run_id, created_at")
  .eq("organization_id", orgId)
  .ilike("title", "%Change Order%");
console.log("CHANGE_ORDER_CANDIDATES", changeOrder);

const { data: latestRun } = await admin
  .from("opportunity_discovery_runs")
  .select("id, created_at, status")
  .eq("organization_id", orgId)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();
console.log("LATEST_DISCOVERY", latestRun);

if (latestRun?.id) {
  const { data: cards } = await admin
    .from("opportunity_candidates")
    .select("id, title, rank_position, opportunity_score")
    .eq("organization_id", orgId)
    .eq("discovery_run_id", latestRun.id)
    .order("opportunity_score", { ascending: false, nullsFirst: false })
    .limit(5);
  console.log("LATEST_RUN_CARDS", cards);
}

const { data: assemblies } = await admin
  .from("venture_assemblies")
  .select("id, identity_package, opportunity_id, status, updated_at")
  .eq("organization_id", orgId)
  .order("updated_at", { ascending: false });
console.log(
  "ALL_ASSEMBLIES",
  (assemblies ?? []).map((row, i) => ({
    n: i + 1,
    id: row.id,
    status: row.status,
    workingName: row.identity_package?.workingName ?? null,
  })),
);
