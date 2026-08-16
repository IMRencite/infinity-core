import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import type { Database } from "@/lib/supabase/database.types";
import type { VentureAssemblyManifestV1, VentureAssemblyRecord } from "./types";
import { VENTURE_ASSEMBLY_MANIFEST_SCHEMA_VERSION } from "./constants";

function rowToRecord(row: Record<string, unknown>): VentureAssemblyRecord {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    missionId: String(row.mission_id),
    opportunityId: String(row.opportunity_id),
    executiveDecisionId: String(row.executive_decision_id),
    planId: String(row.plan_id),
    planVersion: Number(row.plan_version ?? 1),
    planExecutionId: String(row.plan_execution_id),
    ventureBlueprintId: row.venture_blueprint_id ? String(row.venture_blueprint_id) : null,
    buildId: row.build_id ? String(row.build_id) : null,
    buildJobId: row.build_job_id ? String(row.build_job_id) : null,
    buildSnapshotId: row.build_snapshot_id ? String(row.build_snapshot_id) : null,
    productionArtifactId: row.production_artifact_id
      ? String(row.production_artifact_id)
      : null,
    launchStage: row.launch_stage ? String(row.launch_stage) : null,
    companyId: row.company_id ? String(row.company_id) : null,
    assemblyVersion: Number(row.assembly_version ?? 1),
    manifestSchemaVersion: String(row.manifest_schema_version),
    status: row.status as VentureAssemblyRecord["status"],
    readinessStatus: (row.readiness_status as VentureAssemblyRecord["readinessStatus"]) ?? null,
    manifest: row.manifest as VentureAssemblyManifestV1,
    identityPackage: (row.identity_package ?? {}) as Record<string, unknown>,
    businessModelPackage: (row.business_model_package ?? {}) as Record<string, unknown>,
    brandPackage: (row.brand_package ?? {}) as Record<string, unknown>,
    digitalPropertyPackage: (row.digital_property_package ?? {}) as Record<string, unknown>,
    monetizationPackage: (row.monetization_package ?? {}) as Record<string, unknown>,
    marketingPackage: (row.marketing_package ?? {}) as Record<string, unknown>,
    operationsPackage: (row.operations_package ?? {}) as Record<string, unknown>,
    legalCompliancePackage: (row.legal_compliance_package ?? {}) as Record<string, unknown>,
    readinessEvaluation: (row.readiness_evaluation ?? {}) as Record<string, unknown>,
    idempotencyKey: String(row.idempotency_key),
    correlationId: row.correlation_id ? String(row.correlation_id) : null,
    blockingReason: row.blocking_reason ? String(row.blocking_reason) : null,
    supersededBy: row.superseded_by ? String(row.superseded_by) : null,
    immutableAt: row.immutable_at ? String(row.immutable_at) : null,
  };
}

export async function findVentureAssemblyByIdempotencyKey(
  admin: AdminSupabaseClient,
  organizationId: string,
  idempotencyKey: string,
): Promise<VentureAssemblyRecord | null> {
  const { data } = await admin
    .from("venture_assemblies")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  return data ? rowToRecord(data as Record<string, unknown>) : null;
}

export async function loadVentureAssemblyById(
  admin: AdminSupabaseClient,
  organizationId: string,
  ventureAssemblyId: string,
): Promise<VentureAssemblyRecord | null> {
  const { data } = await admin
    .from("venture_assemblies")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", ventureAssemblyId)
    .maybeSingle();
  return data ? rowToRecord(data as Record<string, unknown>) : null;
}

export async function insertVentureAssembly(
  admin: AdminSupabaseClient,
  row: {
    organizationId: string;
    missionId: string;
    opportunityId: string;
    executiveDecisionId: string;
    planId: string;
    planVersion: number;
    planExecutionId: string;
    ventureBlueprintId: string | null;
    buildId: string | null;
    buildJobId: string | null;
    buildSnapshotId: string | null;
    idempotencyKey: string;
    correlationId?: string | null;
  },
): Promise<VentureAssemblyRecord> {
  const { data, error } = await admin
    .from("venture_assemblies")
    .insert({
      organization_id: row.organizationId,
      mission_id: row.missionId,
      opportunity_id: row.opportunityId,
      executive_decision_id: row.executiveDecisionId,
      plan_id: row.planId,
      plan_version: row.planVersion,
      plan_execution_id: row.planExecutionId,
      venture_blueprint_id: row.ventureBlueprintId,
      build_id: row.buildId,
      build_job_id: row.buildJobId,
      build_snapshot_id: row.buildSnapshotId,
      manifest_schema_version: VENTURE_ASSEMBLY_MANIFEST_SCHEMA_VERSION,
      status: "assembly_requested",
      idempotency_key: row.idempotencyKey,
      correlation_id: row.correlationId ?? null,
      manifest: { schemaVersion: VENTURE_ASSEMBLY_MANIFEST_SCHEMA_VERSION } as Json,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to insert venture assembly");
  }
  return rowToRecord(data as Record<string, unknown>);
}

export async function updateVentureAssembly(
  admin: AdminSupabaseClient,
  organizationId: string,
  ventureAssemblyId: string,
  patch: Database["public"]["Tables"]["venture_assemblies"]["Update"],
): Promise<VentureAssemblyRecord> {
  const { data, error } = await admin
    .from("venture_assemblies")
    .update(patch)
    .eq("organization_id", organizationId)
    .eq("id", ventureAssemblyId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update venture assembly");
  }
  return rowToRecord(data as Record<string, unknown>);
}

export async function replaceExternalDependencies(
  admin: AdminSupabaseClient,
  organizationId: string,
  ventureAssemblyId: string,
  deps: Array<{
    dependencyType: string;
    reason: string;
    requiredFor: string;
    blockingStage: string;
    estimatedCost: number | null;
    approvalRequirement: string;
    capabilityRequirement: string | null;
    status: string;
  }>,
): Promise<void> {
  await admin
    .from("venture_assembly_external_dependencies")
    .delete()
    .eq("organization_id", organizationId)
    .eq("venture_assembly_id", ventureAssemblyId);

  if (deps.length === 0) return;

  await admin.from("venture_assembly_external_dependencies").insert(
    deps.map((d) => ({
      organization_id: organizationId,
      venture_assembly_id: ventureAssemblyId,
      dependency_type: d.dependencyType,
      reason: d.reason,
      required_for: d.requiredFor,
      blocking_stage: d.blockingStage,
      estimated_cost: d.estimatedCost,
      approval_requirement: d.approvalRequirement,
      capability_requirement: d.capabilityRequirement,
      status: d.status,
    })),
  );
}

export async function countVentureAssembliesForIdempotencyPrefix(
  admin: AdminSupabaseClient,
  organizationId: string,
  idempotencyKey: string,
): Promise<number> {
  const { count } = await admin
    .from("venture_assemblies")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey);
  return count ?? 0;
}

export { rowToRecord as mapVentureAssemblyRow };
