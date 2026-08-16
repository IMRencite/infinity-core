import { randomUUID } from "node:crypto";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type {
  CostLedgerEntry,
  ProductionArtifactDraft,
  ProductAssetBuilderReport,
  RepairAttemptRecord,
  TaskRunRecord,
  ValidationRunRecord,
} from "./types";
import { assembleVentureBlueprintFromPersisted } from "./load/load-build-package";

export async function findPabRunByIdempotencyKey(
  admin: AdminSupabaseClient,
  organizationId: string,
  idempotencyKey: string,
) {
  const { data, error } = await admin
    .from("product_asset_builder_runs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertPabRun(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    correlationId: string;
    idempotencyKey: string;
    simulationOnly: boolean;
    companyBuilderPackageId?: string | null;
    companyBuilderBlueprintId?: string | null;
    workspaceReference?: string;
    buildGraphHash?: string;
  },
) {
  const { data, error } = await admin
    .from("product_asset_builder_runs")
    .insert({
      organization_id: input.organizationId,
      status: "requested",
      engine_version: "product_asset_builder_v1",
      simulation_only: input.simulationOnly,
      company_builder_package_id: input.companyBuilderPackageId ?? null,
      company_builder_blueprint_id: input.companyBuilderBlueprintId ?? null,
      workspace_reference: input.workspaceReference ?? null,
      build_graph_hash: input.buildGraphHash ?? null,
      correlation_id: input.correlationId,
      idempotency_key: input.idempotencyKey,
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updatePabRun(
  admin: AdminSupabaseClient,
  organizationId: string,
  runId: string,
  patch: Database["public"]["Tables"]["product_asset_builder_runs"]["Update"],
) {
  const { error } = await admin
    .from("product_asset_builder_runs")
    .update(patch)
    .eq("organization_id", organizationId)
    .eq("id", runId);
  if (error) throw error;
}

export async function insertWorkspace(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    productAssetBuilderRunId: string;
    workspaceReference: string;
    ventureId: string;
    buildPackageId: string | null;
    state?: Record<string, unknown>;
  },
) {
  const { data, error } = await admin
    .from("product_asset_build_workspaces")
    .insert({
      organization_id: input.organizationId,
      product_asset_builder_run_id: input.productAssetBuilderRunId,
      workspace_reference: input.workspaceReference,
      venture_id: input.ventureId,
      build_package_id: input.buildPackageId,
      state: (input.state ?? {}) as never,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function upsertTaskRun(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    productAssetBuilderRunId: string;
    task: TaskRunRecord;
  },
) {
  const { error } = await admin.from("product_asset_build_task_runs").upsert(
    {
      organization_id: input.organizationId,
      product_asset_builder_run_id: input.productAssetBuilderRunId,
      task_id: input.task.taskId,
      task_name: input.task.taskName,
      category: input.task.category,
      status: input.task.status,
      dependencies: input.task.dependencies as never,
      output_hash: input.task.outputHash ?? null,
      error_message: input.task.errorMessage ?? null,
      completed_at: input.task.status === "completed" ? new Date().toISOString() : null,
    },
    { onConflict: "product_asset_builder_run_id,task_id" },
  );
  if (error) throw error;
}

export async function insertValidationRun(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    productAssetBuilderRunId: string;
    run: ValidationRunRecord;
  },
) {
  const { error } = await admin.from("product_asset_validation_runs").insert({
    organization_id: input.organizationId,
    product_asset_builder_run_id: input.productAssetBuilderRunId,
    validator_name: input.run.validatorName,
    status: input.run.status,
    details: input.run.details as never,
  });
  if (error) throw error;
}

export async function insertRepairAttempt(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    productAssetBuilderRunId: string;
    attempt: RepairAttemptRecord;
  },
) {
  const { error } = await admin.from("product_asset_repair_attempts").insert({
    organization_id: input.organizationId,
    product_asset_builder_run_id: input.productAssetBuilderRunId,
    attempt_number: input.attempt.attemptNumber,
    failure_classification: input.attempt.failureClassification,
    repair_action: input.attempt.repairAction as never,
    success: input.attempt.success,
  });
  if (error) throw error;
}

export async function insertCostLedgerEntries(
  admin: AdminSupabaseClient,
  organizationId: string,
  productAssetBuilderRunId: string,
  entries: CostLedgerEntry[],
) {
  if (entries.length === 0) return;
  const { error } = await admin.from("product_asset_cost_ledger").insert(
    entries.map((e) => ({
      organization_id: organizationId,
      product_asset_builder_run_id: productAssetBuilderRunId,
      provider: e.provider,
      model_id: e.modelId,
      task_type: e.taskType,
      input_tokens: e.inputTokens,
      output_tokens: e.outputTokens,
      estimated_cost_usd: e.estimatedCostUsd,
    })),
  );
  if (error) throw error;
}

export async function insertProductionArtifact(
  admin: AdminSupabaseClient,
  organizationId: string,
  artifact: ProductionArtifactDraft,
  productAssetBuilderRunId: string,
) {
  const { data, error } = await admin
    .from("product_asset_production_artifacts")
    .insert({
      organization_id: organizationId,
      product_asset_builder_run_id: productAssetBuilderRunId,
      company_builder_package_id: artifact.buildPackageId,
      workspace_id: artifact.workspaceId,
      status: artifact.status,
      artifact_manifest: artifact.artifactManifest as never,
      source_manifest: artifact.sourceManifest as never,
      technology_manifest: artifact.technologyManifest as never,
      database_manifest: artifact.databaseManifest as never,
      route_manifest: artifact.routeManifest as never,
      monetization_manifest: artifact.monetizationManifest as never,
      validation_manifest: artifact.validationManifest as never,
      dependency_manifest: artifact.dependencyManifest as never,
      build_hash: artifact.buildHash,
      file_count: artifact.fileCount,
      total_bytes: artifact.totalBytes,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export function buildPabReport(input: {
  buildRunId: string;
  workspaceReference: string;
  simulationOnly: boolean;
  taskRuns: TaskRunRecord[];
  validationPassed: boolean;
  repairAttempts: RepairAttemptRecord[];
  artifact: ProductionArtifactDraft | null;
  cumulativeCostUsd: number;
  tokenUsage: { inputTokens: number; outputTokens: number };
}): ProductAssetBuilderReport {
  return {
    engineVersion: "product_asset_builder_v1",
    simulationOnly: input.simulationOnly,
    buildRunId: input.buildRunId,
    workspaceReference: input.workspaceReference,
    tasksCompleted: input.taskRuns.filter((t) => t.status === "completed").length,
    tasksFailed: input.taskRuns.filter((t) => t.status === "failed").length,
    validationPassed: input.validationPassed,
    repairAttempts: input.repairAttempts.length,
    artifactStatus: input.artifact?.status ?? null,
    artifactId: input.artifact?.artifactId ?? null,
    buildHash: input.artifact?.buildHash ?? null,
    cumulativeCostUsd: input.cumulativeCostUsd,
    tokenUsage: {
      inputTokens: input.tokenUsage.inputTokens,
      outputTokens: input.tokenUsage.outputTokens,
      totalTokens: input.tokenUsage.inputTokens + input.tokenUsage.outputTokens,
    },
    completedAt: new Date().toISOString(),
  };
}

export async function loadCompletedTaskRuns(
  admin: AdminSupabaseClient,
  productAssetBuilderRunId: string,
): Promise<Map<string, TaskRunRecord>> {
  const { data, error } = await admin
    .from("product_asset_build_task_runs")
    .select("*")
    .eq("product_asset_builder_run_id", productAssetBuilderRunId);
  if (error) throw error;
  const map = new Map<string, TaskRunRecord>();
  for (const row of data ?? []) {
    if (row.status === "completed") {
      map.set(row.task_id, {
        taskId: row.task_id,
        taskName: row.task_name,
        category: row.category ?? "",
        status: "completed",
        dependencies: (row.dependencies as string[]) ?? [],
        outputHash: row.output_hash ?? undefined,
      });
    }
  }
  return map;
}

export async function loadBuildPackageFromDb(
  admin: AdminSupabaseClient,
  organizationId: string,
  packageId: string,
) {
  const { data: pkg, error: pkgError } = await admin
    .from("company_builder_packages")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", packageId)
    .maybeSingle();
  if (pkgError) throw pkgError;
  if (!pkg) return null;

  const { data: blueprint, error: bpError } = await admin
    .from("company_builder_blueprints")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", pkg.company_builder_blueprint_id)
    .maybeSingle();
  if (bpError) throw bpError;
  if (!blueprint) return null;

  return assembleVentureBlueprintFromPersisted(pkg as never, blueprint as never);
}

export function newCorrelationId(): string {
  return randomUUID();
}
