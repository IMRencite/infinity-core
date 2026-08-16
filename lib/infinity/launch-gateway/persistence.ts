import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { LAUNCH_PLAN_SCHEMA_VERSION } from "./constants";

export type LaunchPlanRecord = {
  id: string;
  organizationId: string;
  missionId: string;
  ventureAssemblyId: string;
  companyId: string | null;
  planVersion: number;
  assemblyVersion: number;
  status: string;
  launchReadiness: string | null;
  idempotencyKey: string;
  simulationCompletedAt: string | null;
};

export type ExternalActionRecord = {
  id: string;
  organizationId: string;
  missionId: string;
  launchPlanId: string | null;
  ventureAssemblyId: string | null;
  actionType: string;
  target: string;
  executionStatus: string;
  idempotencyKey: string;
  sequenceOrder: number;
  dependsOnActionId: string | null;
  resultManifest: Record<string, unknown> | null;
  verificationStatus: string | null;
};

function mapLaunchPlan(row: Record<string, unknown>): LaunchPlanRecord {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    missionId: String(row.mission_id),
    ventureAssemblyId: String(row.venture_assembly_id),
    companyId: row.company_id ? String(row.company_id) : null,
    planVersion: Number(row.plan_version ?? 1),
    assemblyVersion: Number(row.assembly_version ?? 1),
    status: String(row.status),
    launchReadiness: row.launch_readiness ? String(row.launch_readiness) : null,
    idempotencyKey: String(row.idempotency_key),
    simulationCompletedAt: row.simulation_completed_at
      ? String(row.simulation_completed_at)
      : null,
  };
}

function mapAction(row: Record<string, unknown>): ExternalActionRecord {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    missionId: String(row.mission_id),
    launchPlanId: row.launch_plan_id ? String(row.launch_plan_id) : null,
    ventureAssemblyId: row.venture_assembly_id ? String(row.venture_assembly_id) : null,
    actionType: String(row.action_type),
    target: String(row.target),
    executionStatus: String(row.execution_status),
    idempotencyKey: String(row.idempotency_key),
    sequenceOrder: Number(row.sequence_order ?? 0),
    dependsOnActionId: row.depends_on_action_id ? String(row.depends_on_action_id) : null,
    resultManifest: (row.result_manifest as Record<string, unknown>) ?? null,
    verificationStatus: row.verification_status ? String(row.verification_status) : null,
  };
}

export async function findLaunchPlanByIdempotency(
  admin: AdminSupabaseClient,
  organizationId: string,
  idempotencyKey: string,
): Promise<LaunchPlanRecord | null> {
  const { data } = await admin
    .from("launch_plans")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  return data ? mapLaunchPlan(data as Record<string, unknown>) : null;
}

export async function insertLaunchPlan(
  admin: AdminSupabaseClient,
  row: Database["public"]["Tables"]["launch_plans"]["Insert"],
): Promise<LaunchPlanRecord> {
  const { data, error } = await admin.from("launch_plans").insert(row).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "launch plan insert failed");
  return mapLaunchPlan(data as Record<string, unknown>);
}

export async function updateLaunchPlan(
  admin: AdminSupabaseClient,
  organizationId: string,
  launchPlanId: string,
  patch: Database["public"]["Tables"]["launch_plans"]["Update"],
): Promise<void> {
  const { error } = await admin
    .from("launch_plans")
    .update(patch)
    .eq("organization_id", organizationId)
    .eq("id", launchPlanId);
  if (error) throw new Error(error.message);
}

export async function findExternalActionByIdempotency(
  admin: AdminSupabaseClient,
  organizationId: string,
  idempotencyKey: string,
): Promise<ExternalActionRecord | null> {
  const { data } = await admin
    .from("external_actions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  return data ? mapAction(data as Record<string, unknown>) : null;
}

export async function loadExternalAction(
  admin: AdminSupabaseClient,
  organizationId: string,
  externalActionId: string,
): Promise<ExternalActionRecord | null> {
  const { data } = await admin
    .from("external_actions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", externalActionId)
    .maybeSingle();
  return data ? mapAction(data as Record<string, unknown>) : null;
}

export async function insertExternalAction(
  admin: AdminSupabaseClient,
  row: Database["public"]["Tables"]["external_actions"]["Insert"],
): Promise<ExternalActionRecord> {
  const { data, error } = await admin.from("external_actions").insert(row).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "external action insert failed");
  return mapAction(data as Record<string, unknown>);
}

export async function updateExternalAction(
  admin: AdminSupabaseClient,
  organizationId: string,
  externalActionId: string,
  patch: Database["public"]["Tables"]["external_actions"]["Update"],
): Promise<void> {
  const { error } = await admin
    .from("external_actions")
    .update(patch)
    .eq("organization_id", organizationId)
    .eq("id", externalActionId);
  if (error) throw new Error(error.message);
}

export async function listLaunchPlanActions(
  admin: AdminSupabaseClient,
  organizationId: string,
  launchPlanId: string,
): Promise<ExternalActionRecord[]> {
  const { data } = await admin
    .from("external_actions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("launch_plan_id", launchPlanId)
    .order("sequence_order", { ascending: true });
  return (data ?? []).map((r) => mapAction(r as Record<string, unknown>));
}

export async function claimExternalAction(
  admin: AdminSupabaseClient,
  organizationId: string,
  externalActionId: string,
  claimer: string,
): Promise<boolean> {
  const now = new Date().toISOString();
  const { data } = await admin
    .from("external_actions")
    .update({ claimed_by: claimer, claimed_at: now })
    .eq("organization_id", organizationId)
    .eq("id", externalActionId)
    .is("claimed_by", null)
    .in("execution_status", [
      "simulation_ready",
      "approved",
      "requested",
      "execution_ready",
      "awaiting_approval",
      "failed",
    ])
    .select("id")
    .maybeSingle();
  return Boolean(data?.id);
}

export { LAUNCH_PLAN_SCHEMA_VERSION };
