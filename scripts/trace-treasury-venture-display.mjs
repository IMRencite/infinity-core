/**
 * Read-only diagnostic: trace Treasury venture display lineage from live HQ data.
 * Prints no secrets. Does not mutate.
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
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function keysOf(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.keys(value);
}

function pick(obj, keys) {
  const out = {};
  for (const key of keys) out[key] = obj?.[key] ?? null;
  return out;
}

const { data: assemblies, error: assemblyError } = await admin
  .from("venture_assemblies")
  .select(
    "id, organization_id, mission_id, opportunity_id, company_id, venture_blueprint_id, status, identity_package, manifest, idempotency_key, updated_at",
  )
  .eq("organization_id", orgId)
  .order("updated_at", { ascending: false })
  .limit(20);

if (assemblyError) {
  console.log("ASSEMBLY_ERROR", assemblyError.message);
  process.exit(1);
}

console.log("ASSEMBLIES", assemblies?.length ?? 0);
for (const row of assemblies ?? []) {
  const identity = row.identity_package ?? {};
  const manifest = row.manifest ?? {};
  console.log("\n=== ASSEMBLY", row.id);
  console.log(
    JSON.stringify(
      {
        organization_id: row.organization_id,
        mission_id: row.mission_id,
        opportunity_id: row.opportunity_id,
        company_id: row.company_id,
        venture_blueprint_id: row.venture_blueprint_id,
        status: row.status,
        idempotency_key: row.idempotency_key,
        identity_keys: keysOf(identity),
        identity_workingName: identity.workingName ?? null,
        identity_name: identity.name ?? null,
        identity_title: identity.title ?? null,
        identity_candidate: identity.opportunityCandidateId ?? identity.opportunity_candidate_id ?? identity.candidateId ?? null,
        manifest_keys: keysOf(manifest),
        manifest_workingName: manifest.ventureIdentity?.workingName ?? null,
        manifest_opportunityCandidateId: manifest.opportunityCandidateId ?? manifest.opportunity_candidate_id ?? null,
        manifest_companyBuilderBlueprintId: manifest.companyBuilderBlueprintId ?? null,
        manifest_favc1: manifest.firstAutonomousVentureCycleV1 ?? null,
      },
      null,
      2,
    ),
  );
}

const opportunityIds = [...new Set((assemblies ?? []).map((row) => row.opportunity_id).filter(Boolean))];
const blueprintIds = [...new Set((assemblies ?? []).map((row) => row.venture_blueprint_id).filter(Boolean))];
const companyIds = [...new Set((assemblies ?? []).map((row) => row.company_id).filter(Boolean))];
const candidateIds = [
  ...new Set(
    (assemblies ?? []).flatMap((row) =>
      [
        row.opportunity_id,
        row.identity_package?.opportunityCandidateId,
        row.identity_package?.opportunity_candidate_id,
        row.manifest?.opportunityCandidateId,
        row.manifest?.opportunity_candidate_id,
        row.manifest?.companyBuilderBlueprintId,
      ].filter((value) => typeof value === "string"),
    ),
  ),
];

const { data: opportunities, error: oppError } = await admin
  .from("opportunities")
  .select("id, name, slug, summary")
  .eq("organization_id", orgId)
  .in("id", opportunityIds.length ? opportunityIds : ["00000000-0000-0000-0000-000000000000"]);
console.log("\nOPPORTUNITIES", oppError?.message ?? opportunities?.length, opportunities?.map((row) => pick(row, ["id", "name", "slug"])));

const { data: candidates, error: candError } = await admin
  .from("opportunity_candidates")
  .select("id, title, rank_position, discovery_run_id, created_at")
  .eq("organization_id", orgId)
  .order("created_at", { ascending: false })
  .limit(30);
console.log("\nCANDIDATES_ORG", candError?.message ?? candidates?.length);
for (const row of candidates ?? []) {
  console.log(pick(row, ["id", "title", "rank_position", "discovery_run_id"]));
}

const { data: evals, error: evalError } = await admin
  .from("candidate_selection_evaluations")
  .select("id, opportunity_candidate_id, queue_rank, decision, created_at")
  .eq("organization_id", orgId)
  .order("created_at", { ascending: false })
  .limit(20);
console.log("\nEVALUATIONS", evalError?.message ?? evals?.length);
for (const row of evals ?? []) {
  console.log(pick(row, ["id", "opportunity_candidate_id", "queue_rank", "decision"]));
}

const { data: cbBlueprints, error: bpError } = await admin
  .from("company_builder_blueprints")
  .select("id, venture_name_working, opportunity_candidate_id, company_builder_run_id")
  .eq("organization_id", orgId)
  .order("created_at", { ascending: false })
  .limit(20);
console.log("\nCOMPANY_BLUEPRINTS", bpError?.message ?? cbBlueprints?.length);
for (const row of cbBlueprints ?? []) {
  console.log(pick(row, ["id", "venture_name_working", "opportunity_candidate_id"]));
}

const { data: companies, error: coError } = await admin
  .from("companies")
  .select("id, name")
  .eq("organization_id", orgId)
  .in("id", companyIds.length ? companyIds : ["00000000-0000-0000-0000-000000000000"]);
console.log("\nCOMPANIES", coError?.message ?? companies);

const { data: allocations, error: allocError } = await admin
  .from("venture_capital_allocations")
  .select("venture_id, stage, capital_allocated, updated_at")
  .eq("organization_id", orgId)
  .order("updated_at", { ascending: false })
  .limit(20);
console.log("\nALLOCATIONS", allocError?.message ?? allocations?.length, allocations);

const { data: missions } = await admin
  .from("missions")
  .select("id, objective, title, cycle_key, created_at")
  .eq("organization_id", orgId)
  .order("created_at", { ascending: false })
  .limit(10);
console.log("\nMISSIONS", missions?.map((row) => pick(row, ["id", "objective", "title", "cycle_key"])));

console.log("\nLOOKUP_IDS", { opportunityIds, blueprintIds, companyIds, candidateIdsFromAssemblies: candidateIds });
