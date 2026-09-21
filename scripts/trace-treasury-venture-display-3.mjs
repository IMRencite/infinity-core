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
const ventureId = "0a696b50-e5d0-42f8-bf87-da1d836e350a";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function summarizeJson(value, depth = 0) {
  if (value == null) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return { _arrayLength: value.length, _first: value[0] ? summarizeJson(value[0], depth + 1) : null };
  }
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (depth >= 2) {
      out[k] = typeof v === "string" ? v.slice(0, 160) : typeof v;
      continue;
    }
    if (typeof v === "string") out[k] = v.slice(0, 240);
    else if (v && typeof v === "object") out[k] = summarizeJson(v, depth + 1);
    else out[k] = v;
  }
  return out;
}

const { data: assembly } = await admin
  .from("venture_assemblies")
  .select("*")
  .eq("organization_id", orgId)
  .eq("id", ventureId)
  .maybeSingle();

const identity = assembly?.identity_package ?? {};
const manifest = assembly?.manifest ?? {};
console.log("ASSEMBLY_CORE", {
  id: assembly?.id,
  organization_id: assembly?.organization_id,
  mission_id: assembly?.mission_id,
  opportunity_id: assembly?.opportunity_id,
  company_id: assembly?.company_id,
  venture_blueprint_id: assembly?.venture_blueprint_id,
  status: assembly?.status,
  identity: {
    workingName: identity.workingName ?? null,
    name: identity.name ?? null,
    title: identity.title ?? null,
    displayName: identity.displayName ?? null,
    primaryProblem: identity.primaryProblem ?? null,
    primaryPromise: identity.primaryPromise ?? null,
    ventureDescription: identity.ventureDescription ?? null,
    positioning: identity.positioning ?? null,
    category: identity.category ?? null,
  },
  ventureIdentity: summarizeJson(manifest.ventureIdentity),
  traceability: summarizeJson(manifest.traceability),
});

const { data: mission } = await admin
  .from("missions")
  .select("id, title, description, constraints, objectives, status")
  .eq("organization_id", orgId)
  .eq("id", assembly.mission_id)
  .maybeSingle();
console.log("MISSION", {
  id: mission?.id,
  title: mission?.title,
  description: mission?.description,
  constraints: summarizeJson(mission?.constraints),
  objectives: summarizeJson(mission?.objectives),
});

const { data: opportunity } = await admin
  .from("opportunities")
  .select("*")
  .eq("organization_id", orgId)
  .eq("id", assembly.opportunity_id)
  .maybeSingle();
console.log("OPPORTUNITY", {
  id: opportunity?.id,
  name: opportunity?.name,
  slug: opportunity?.slug,
  summary: opportunity?.summary,
  problem: opportunity?.problem,
  source_snapshot_keys: opportunity?.source_snapshot && typeof opportunity.source_snapshot === "object"
    ? Object.keys(opportunity.source_snapshot)
    : [],
  source_snapshot: summarizeJson(opportunity?.source_snapshot),
  extra_keys: Object.keys(opportunity ?? {}).filter((k) => !["id","name","slug","summary","problem","organization_id","source_snapshot"].includes(k)),
});

const { data: company } = await admin
  .from("companies")
  .select("id, name")
  .eq("organization_id", orgId)
  .eq("id", assembly.company_id)
  .maybeSingle();
console.log("COMPANY", company);

const { data: pe } = await admin
  .from("plan_executions")
  .select("id, mission_id, opportunity_id, venture_blueprint_id, status, current_phase")
  .eq("organization_id", orgId)
  .eq("mission_id", assembly.mission_id)
  .limit(5);
console.log("PLAN_EXECUTIONS", pe);

const { count: assemblyCount } = await admin
  .from("venture_assemblies")
  .select("id", { count: "exact", head: true })
  .eq("organization_id", orgId);
console.log("ASSEMBLY_COUNT", assemblyCount);

const { data: ranked } = await admin
  .from("opportunity_candidates")
  .select("id, title, rank_position, discovery_run_id")
  .eq("organization_id", orgId)
  .not("rank_position", "is", null)
  .order("rank_position", { ascending: true })
  .limit(5);
console.log("RANKED_CANDIDATES", ranked);

const { data: selectedEvals } = await admin
  .from("candidate_selection_evaluations")
  .select("opportunity_candidate_id, queue_rank, decision")
  .eq("organization_id", orgId)
  .order("queue_rank", { ascending: true, nullsFirst: false })
  .limit(5);
console.log("TOP_EVALS", selectedEvals);

const { data: cb } = await admin
  .from("company_builder_blueprints")
  .select("id, venture_name_working, opportunity_candidate_id, source_lineage")
  .eq("organization_id", orgId)
  .order("created_at", { ascending: false })
  .limit(8);
console.log("CB_BLUEPRINTS", (cb ?? []).map((row) => ({
  id: row.id,
  name: row.venture_name_working,
  candidateId: row.opportunity_candidate_id,
  lineage_keys: row.source_lineage && typeof row.source_lineage === "object" ? Object.keys(row.source_lineage) : [],
  lineage: summarizeJson(row.source_lineage),
})));

const { data: discovery } = await admin
  .from("opportunity_discovery_runs")
  .select("id, status, created_at")
  .eq("organization_id", orgId)
  .order("created_at", { ascending: false })
  .limit(5);
console.log("DISCOVERY_RUNS", discovery);
