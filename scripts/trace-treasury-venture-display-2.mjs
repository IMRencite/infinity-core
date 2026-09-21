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

const bpIds = [
  "a7837be5-f806-4473-96ce-7b0ebdc6bb0e",
  "c1792046-11d5-4250-8aad-8e64080a096e",
];

const { data: factory, error: fe } = await admin
  .from("venture_blueprints")
  .select("id, opportunity_id, venture_type, status, blueprint, executive_selection_decision_id")
  .eq("organization_id", orgId)
  .in("id", bpIds);
console.log("FACTORY_BP_ERROR", fe?.message ?? null);
for (const row of factory ?? []) {
  const bp = row.blueprint ?? {};
  console.log({
    id: row.id,
    opportunity_id: row.opportunity_id,
    venture_type: row.venture_type,
    executive_selection_decision_id: row.executive_selection_decision_id,
    blueprint_keys: Object.keys(bp),
    blueprint_name: bp.name ?? null,
    blueprint_title: bp.title ?? null,
    blueprint_displayName: bp.displayName ?? null,
    blueprint_ventureName: bp.ventureName ?? null,
    blueprint_description: typeof bp.description === "string" ? bp.description.slice(0, 120) : null,
  });
}

const { data: favc1 } = await admin
  .from("venture_assemblies")
  .select("id, identity_package, manifest, opportunity_id, venture_blueprint_id, updated_at")
  .eq("organization_id", orgId)
  .filter("manifest->>firstAutonomousVentureCycleV1", "eq", "true")
  .limit(10);
console.log("FAVC1_ASSEMBLIES", (favc1 ?? []).map((row) => ({
  id: row.id,
  workingName: row.identity_package?.workingName ?? null,
  candidateId: row.manifest?.opportunityCandidateId ?? null,
  blueprintId: row.manifest?.companyBuilderBlueprintId ?? row.venture_blueprint_id ?? null,
})));

const { data: byManifestCandidate } = await admin
  .from("venture_assemblies")
  .select("id, manifest, identity_package, updated_at")
  .eq("organization_id", orgId)
  .not("manifest->>opportunityCandidateId", "is", null)
  .limit(10);
console.log("ASSEMBLIES_WITH_CANDIDATE_ID", (byManifestCandidate ?? []).length, (byManifestCandidate ?? []).map((row) => ({
  id: row.id,
  candidateId: row.manifest?.opportunityCandidateId,
  workingName: row.identity_package?.workingName,
})));

const { data: decisions } = await admin
  .from("executive_selection_decisions")
  .select("id, opportunity_id, selected_opportunity_id, decision, created_at")
  .eq("organization_id", orgId)
  .order("created_at", { ascending: false })
  .limit(5);
console.log("EXEC_DECISIONS", decisions);

const { data: handoffs } = await admin
  .from("venture_selection_handoffs")
  .select("id, opportunity_candidate_id, candidate_title, business_concept, created_at")
  .eq("organization_id", orgId)
  .order("created_at", { ascending: false })
  .limit(10);
console.log("HANDOFFS", handoffs);

const { data: cbForFactory } = await admin
  .from("company_builder_blueprints")
  .select("id, venture_name_working, opportunity_candidate_id")
  .eq("organization_id", orgId)
  .in("id", bpIds);
console.log("CB_FOR_FACTORY_IDS", cbForFactory);
