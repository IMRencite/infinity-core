/**
 * Non-building probe: verify explicit discovery candidate scope excludes historical org candidates.
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

const orgId = process.argv[2] ?? "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
const discoveryRunId = process.argv[3] ?? "7979f49f-fb61-480f-8369-5f7b924d83ae";
const monetizationRunId = process.argv[4] ?? "7c6c99b9-9f38-4738-8ab4-4977dd010d05";
const candidateIds = [
  "a4991a36-b09c-4830-aafb-ecc23eeb1708",
  "d4b28960-e88a-4b96-b6db-90433bb2bafe",
  "63c40e03-2c8e-47f2-9788-d41aae260dd8",
];

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

async function loadExplicitPool() {
  const { data: candidates } = await admin
    .from("opportunity_candidates")
    .select("id, title, discovery_run_id")
    .eq("organization_id", orgId)
    .eq("discovery_run_id", discoveryRunId)
    .in("id", candidateIds);

  const rows = [];
  for (const candidate of candidates ?? []) {
    const { data: analyses } = await admin
      .from("monetization_candidate_analyses")
      .select("monetization_run_id")
      .eq("organization_id", orgId)
      .eq("opportunity_candidate_id", candidate.id)
      .eq("monetization_run_id", monetizationRunId)
      .limit(1);
    rows.push({
      candidateId: candidate.id,
      title: candidate.title,
      discoveryRunId: candidate.discovery_run_id,
      monetizationRunId: analyses?.[0]?.monetization_run_id ?? null,
    });
  }
  return rows;
}

async function loadBroadPool(limit = 5) {
  const { data: candidates } = await admin
    .from("opportunity_candidates")
    .select("id, title, discovery_run_id")
    .eq("organization_id", orgId)
    .order("opportunity_score", { ascending: false, nullsFirst: false })
    .limit(limit);

  return candidates ?? [];
}

console.log("=== EXPLICIT POOL (FAVC1 contract) ===");
const explicit = await loadExplicitPool();
console.log(JSON.stringify(explicit, null, 2));

const missing = candidateIds.filter((id) => !explicit.some((row) => row.candidateId === id));
const wrongDiscovery = explicit.filter((row) => row.discoveryRunId !== discoveryRunId);
const wrongMonetization = explicit.filter((row) => row.monetizationRunId !== monetizationRunId);

if (missing.length || wrongDiscovery.length || wrongMonetization.length) {
  console.error("LINEAGE VALIDATION: FAIL", { missing, wrongDiscovery, wrongMonetization });
  process.exit(1);
}
console.log("LINEAGE VALIDATION: PASS");

console.log("\n=== LEGACY BROAD POOL (org top score, no IDs) ===");
const broad = await loadBroadPool();
console.log(JSON.stringify(broad, null, 2));

const contamination = broad.filter((row) => !candidateIds.includes(row.id));
console.log("\ncontaminationCount:", contamination.length);
console.log(
  "legacyBroadPoolWouldContaminate:",
  contamination.length > 0 ? "YES" : "NO",
);

process.exit(0);
