#!/usr/bin/env node
/**
 * HQ detail completeness diagnostic — read-only venture lineage report.
 * Usage: node scripts/hq-detail-completeness-diagnostic.mjs <ventureAssemblyId>
 */
import { createClient } from "@supabase/supabase-js";

const ventureId = process.argv[2];
if (!ventureId) {
  console.error("Usage: node scripts/hq-detail-completeness-diagnostic.mjs <ventureAssemblyId>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const { data: assembly } = await admin
    .from("venture_assemblies")
    .select("id, organization_id, venture_name")
    .eq("id", ventureId)
    .maybeSingle();

  if (!assembly) {
    console.log(JSON.stringify({ ventureId, status: "NOT FOUND" }, null, 2));
    return;
  }

  const orgId = assembly.organization_id;
  const slots = {
    Candidate: false,
    Discovery: false,
    Research: false,
    Monetization: false,
    Selection: false,
    Validation: false,
    Product: false,
    Deployment: false,
    Performance: false,
    Learning: false,
    Mission: false,
  };

  const [{ data: candidates }, { data: selections }, { data: plans }, { data: research }, { data: artifacts }] =
    await Promise.all([
      admin.from("opportunity_candidates").select("id").eq("organization_id", orgId).limit(20),
      admin.from("candidate_selection_evaluations").select("id, opportunity_candidate_id").eq("organization_id", orgId).limit(20),
      admin.from("monetization_plans").select("id").eq("organization_id", orgId).limit(20),
      admin.from("research_runs").select("id").eq("organization_id", orgId).limit(20),
      admin.from("production_artifacts").select("id").eq("organization_id", orgId).eq("venture_assembly_id", ventureId).limit(5),
    ]);

  slots.Candidate = (candidates?.length ?? 0) > 0;
  slots.Discovery = slots.Candidate;
  slots.Research = (research?.length ?? 0) > 0;
  slots.Monetization = (plans?.length ?? 0) > 0;
  slots.Selection = (selections?.length ?? 0) > 0;
  slots.Validation = slots.Selection;
  slots.Product = (artifacts?.length ?? 0) > 0;

  const report = Object.fromEntries(
    Object.entries(slots).map(([key, found]) => [key, found ? "FOUND" : "NOT_YET_CREATED"]),
  );

  console.log(
    JSON.stringify(
      {
        ventureId,
        ventureName: assembly.venture_name,
        organizationId: orgId,
        lineage: report,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
