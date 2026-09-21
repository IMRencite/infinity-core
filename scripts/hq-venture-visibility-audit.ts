import { loadServerEnvFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";
import { createAdminClient } from "../lib/supabase/admin";
import { LIVE_ORG } from "../lib/infinity/market-validation-experiment/constants";
import { loadOperatorVentureList } from "../lib/infinity/operator-console/operator-read-model";
import { auditHqVentureRegistry, listCanonicalVenturesForHq } from "../lib/infinity/venture-operating-scale/hq-venture-registry";
import { CRE_VENTURE_ID } from "../lib/infinity/venture-operating-scale/constants";

loadServerEnvFromLocalFile();

async function main() {
  const admin = createAdminClient();
  const { count } = await admin.from("venture_assemblies").select("id", { count: "exact", head: true }).eq("organization_id", LIVE_ORG);
  const assembliesOnly = await admin
    .from("venture_assemblies")
    .select("id, identity_package, manifest, mission_id, status, launch_stage, updated_at, idempotency_key")
    .eq("organization_id", LIVE_ORG)
    .order("updated_at", { ascending: false })
    .limit(40);
  const names = (assembliesOnly.data ?? []).map((row) => {
    const identity = (row.identity_package ?? {}) as Record<string, unknown>;
    return typeof identity.workingName === "string" ? identity.workingName : row.id;
  });
  const occupancynpvInAssemblies = names.some((name) => /occupancynpv|cre lease npv/i.test(name));
  const merged = await loadOperatorVentureList(admin, LIVE_ORG, 40);
  const canonical = listCanonicalVenturesForHq();
  const audit = auditHqVentureRegistry({
    assemblyItems: (assembliesOnly.data ?? []).map((row) => ({
      ventureAssemblyId: row.id,
      ventureName: typeof ((row.identity_package as Record<string, unknown> | null)?.workingName) === "string"
        ? String((row.identity_package as Record<string, unknown>).workingName)
        : row.id,
      status: row.status,
      activeDepartment: null,
      latestActivity: null,
      latestActivityAt: row.updated_at,
      launchState: row.launch_stage,
      knownSpendUsd: null,
      latestDecision: null,
      missionId: row.mission_id,
      canonicalSource: "venture_assembly" as const,
    })),
    mergedItems: merged,
  });
  const occupancynpv = merged.find((row) => row.ventureName === "OccupancyNPV" || row.canonicalVentureId === CRE_VENTURE_ID || row.ventureAssemblyId === CRE_VENTURE_ID);
  console.log(JSON.stringify({
    assemblyCount: count ?? assembliesOnly.data?.length ?? 0,
    occupancynpvInAssemblies,
    assemblyNames: names.slice(0, 20),
    canonicalIds: canonical.map((row) => row.venture_id),
    mergedNames: merged.map((row) => row.ventureName),
    occupancynpvVisible: Boolean(occupancynpv),
    occupancynpvCard: occupancynpv ? {
      id: occupancynpv.ventureAssemblyId,
      domain: occupancynpv.domain,
      productionUrl: occupancynpv.productionUrl,
      paidAppUrl: occupancynpv.paidAppUrl,
      payment: occupancynpv.paymentState,
      fulfillment: occupancynpv.fulfillmentState,
      publicLaunch: occupancynpv.publicLaunch,
      blockers: occupancynpv.blockers,
    } : null,
    audit,
  }, null, 2));
}

main().catch((error) => {
  console.log("audit_failed:", error instanceof Error ? error.message : "UNKNOWN");
  process.exit(1);
});
