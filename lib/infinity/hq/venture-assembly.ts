import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { VENTURE_ASSEMBLY_INTERNAL_LABEL } from "@/lib/infinity/venture-assembly/constants";

type InfinitySupabase = SupabaseClient<Database>;

export type HqVentureAssemblySummary = {
  ventureAssemblyId: string | null;
  assemblyVersion: number | null;
  status: string | null;
  readinessStatus: string | null;
  companyId: string | null;
  planExecutionId: string | null;
  buildId: string | null;
  buildJobId: string | null;
  dependencyCount: number;
  label: string;
};

export async function loadHqVentureAssemblySummary(
  supabase: InfinitySupabase,
  organizationId: string,
  missionId: string,
): Promise<HqVentureAssemblySummary> {
  const { data } = await supabase
    .from("venture_assemblies")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return {
      ventureAssemblyId: null,
      assemblyVersion: null,
      status: null,
      readinessStatus: null,
      companyId: null,
      planExecutionId: null,
      buildId: null,
      buildJobId: null,
      dependencyCount: 0,
      label: VENTURE_ASSEMBLY_INTERNAL_LABEL,
    };
  }

  const { count } = await supabase
    .from("venture_assembly_external_dependencies")
    .select("*", { count: "exact", head: true })
    .eq("venture_assembly_id", data.id);

  return {
    ventureAssemblyId: data.id,
    assemblyVersion: data.assembly_version,
    status: data.status,
    readinessStatus: data.readiness_status,
    companyId: data.company_id,
    planExecutionId: data.plan_execution_id,
    buildId: data.build_id,
    buildJobId: data.build_job_id,
    dependencyCount: count ?? 0,
    label: VENTURE_ASSEMBLY_INTERNAL_LABEL,
  };
}

export async function loadVentureAssemblyDiagnostics(
  supabase: InfinitySupabase,
  organizationId: string,
  limit = 25,
): Promise<
  Array<{
    ventureAssemblyId: string;
    missionId: string;
    status: string;
    readinessStatus: string | null;
    workingName: string | null;
    ventureType: string | null;
    companyId: string | null;
  }>
> {
  const { data } = await supabase
    .from("venture_assemblies")
    .select("id, mission_id, status, readiness_status, company_id, identity_package, manifest")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const identity = row.identity_package as Record<string, unknown> | null;
    const manifest = row.manifest as Record<string, unknown> | null;
    const ventureIdentity = manifest?.ventureIdentity as Record<string, unknown> | undefined;
    return {
      ventureAssemblyId: row.id,
      missionId: row.mission_id,
      status: row.status,
      readinessStatus: row.readiness_status,
      workingName:
        (identity?.workingName as string | undefined) ??
        (ventureIdentity?.workingName as string | undefined) ??
        null,
      ventureType: (ventureIdentity?.ventureType as string | undefined) ?? null,
      companyId: row.company_id,
    };
  });
}
