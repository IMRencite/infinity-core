import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { FeatureContract } from "../v2/types";
import type { CodeChangeSet, CodingTask, ProviderUsageRecord, ReviewFinding, WorkspaceMutationRecord } from "./types";
import type { RepositoryMapEntry } from "../v2/types";
import type { TraceabilityLink } from "../v2/types";

export async function persistFeatureContracts(
  admin: AdminSupabaseClient,
  organizationId: string,
  buildRunId: string,
  contracts: FeatureContract[],
) {
  if (contracts.length === 0) return;
  const { error } = await admin.from("product_asset_feature_contracts").upsert(
    contracts.map((c) => ({
      organization_id: organizationId,
      product_asset_builder_run_id: buildRunId,
      feature_id: c.featureId,
      feature_name: c.featureName,
      business_purpose: c.businessPurpose,
      user_roles: c.userRoles,
      functional_requirements: c.functionalRequirements,
      non_functional_requirements: c.nonFunctionalRequirements,
      dependencies: c.dependencies,
      required_routes: c.requiredRoutes,
      required_data_entities: c.requiredDataEntities,
      required_apis: c.requiredAPIs,
      required_ui_states: c.requiredUIStates,
      required_error_states: c.requiredErrorStates,
      required_analytics_events: c.requiredAnalyticsEvents,
      required_tests: c.requiredTests,
      acceptance_criteria: c.acceptanceCriteria,
      revenue_relationship: c.revenueRelationship,
      status: c.status,
    })),
    { onConflict: "product_asset_builder_run_id,feature_id" },
  );
  if (error) throw error;
}

export async function persistTraceabilityLinks(
  admin: AdminSupabaseClient,
  organizationId: string,
  buildRunId: string,
  links: TraceabilityLink[],
) {
  if (links.length === 0) return;
  const { error } = await admin.from("product_asset_traceability_links").insert(
    links.map((l) => ({
      organization_id: organizationId,
      product_asset_builder_run_id: buildRunId,
      link_type: l.linkType,
      source_ref: l.sourceRef,
      target_ref: l.targetRef,
      metadata: (l.metadata ?? {}) as never,
    })),
  );
  if (error) throw error;
}

export async function persistRepositoryMap(
  admin: AdminSupabaseClient,
  organizationId: string,
  buildRunId: string,
  entries: RepositoryMapEntry[],
) {
  if (entries.length === 0) return;
  const { error } = await admin.from("product_asset_repository_map").upsert(
    entries.map((e) => ({
      organization_id: organizationId,
      product_asset_builder_run_id: buildRunId,
      relative_path: e.relativePath,
      module_kind: e.moduleKind,
      exports: e.exports,
      routes: e.routes,
      entities: e.entities,
      feature_ids: e.featureIds,
      dependencies: e.dependencies,
      content_hash: e.contentHash ?? null,
    })),
    { onConflict: "product_asset_builder_run_id,relative_path" },
  );
  if (error) throw error;
}

export async function persistCodingTask(
  admin: AdminSupabaseClient,
  organizationId: string,
  buildRunId: string,
  task: CodingTask,
) {
  const { error } = await admin.from("product_asset_coding_tasks").upsert({
    id: task.id,
    organization_id: organizationId,
    product_asset_builder_run_id: buildRunId,
    venture_id: task.ventureId,
    feature_contract_ids: task.featureContractIds,
    objective: task.objective,
    task_type: task.taskType,
    complexity: task.complexity,
    repository_context: task.repositoryContext as never,
    relevant_files: task.relevantFiles,
    allowed_paths: task.allowedPaths,
    forbidden_paths: task.forbiddenPaths,
    requirements: task.requirements,
    acceptance_criteria: task.acceptanceCriteria,
    dependencies: task.dependencies,
    preferred_capabilities: task.preferredCapabilities,
    max_files_changed: task.maxFilesChanged,
    max_tokens: task.maxTokens ?? null,
    max_cost_usd: task.maxCostUsd ?? null,
    retry_limit: task.retryLimit,
    status: task.status,
    parent_task_id: task.parentTaskId ?? null,
  });
  if (error) throw error;
}

export async function persistCodeChangeSet(
  admin: AdminSupabaseClient,
  organizationId: string,
  buildRunId: string,
  changeSetId: string,
  changeSet: CodeChangeSet,
  applied: boolean,
) {
  const { error } = await admin.from("product_asset_code_change_sets").insert({
    id: changeSetId,
    organization_id: organizationId,
    product_asset_builder_run_id: buildRunId,
    coding_task_id: changeSet.taskId,
    provider: changeSet.provider,
    model_id: changeSet.model,
    reasoning_summary: changeSet.reasoningSummary,
    changes: changeSet.changes as never,
    dependency_changes: changeSet.dependencyChanges,
    migration_changes: changeSet.migrationChanges,
    tests_added: changeSet.testsAdded,
    expected_behavior: changeSet.expectedBehavior,
    assumptions: changeSet.assumptions,
    validation_passed: true,
    applied,
  });
  if (error) throw error;
}

export async function persistWorkspaceMutations(
  admin: AdminSupabaseClient,
  organizationId: string,
  buildRunId: string,
  mutations: WorkspaceMutationRecord[],
) {
  if (mutations.length === 0) return;
  const { error } = await admin.from("product_asset_workspace_mutations").insert(
    mutations.map((m) => ({
      organization_id: organizationId,
      product_asset_builder_run_id: buildRunId,
      coding_task_id: m.codingTaskId,
      code_change_set_id: m.codeChangeSetId,
      feature_contract_ids: m.featureContractIds,
      provider: m.provider,
      model_id: m.model,
      relative_path: m.relativePath,
      operation: m.operation,
      content_hash_before: m.contentHashBefore ?? null,
      content_hash_after: m.contentHashAfter ?? null,
      byte_size_before: m.byteSizeBefore ?? null,
      byte_size_after: m.byteSizeAfter ?? null,
      rolled_back: m.rolledBack,
    })),
  );
  if (error) throw error;
}

export async function persistProviderCall(
  admin: AdminSupabaseClient,
  organizationId: string,
  buildRunId: string,
  usage: ProviderUsageRecord,
) {
  const { error } = await admin.from("product_asset_provider_calls").insert({
    organization_id: organizationId,
    product_asset_builder_run_id: buildRunId,
    coding_task_id: usage.codingTaskId ?? null,
    provider: usage.provider,
    model_id: usage.modelId,
    role: usage.role,
    task_type: usage.taskType,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    cached_tokens: usage.cachedTokens,
    reasoning_tokens: usage.reasoningTokens,
    total_tokens: usage.totalTokens,
    estimated_cost_usd: usage.estimatedCostUsd,
    latency_ms: usage.latencyMs,
    usage_source: usage.usageSource,
    success: usage.success,
    error_message: usage.error ?? null,
  });
  if (error) throw error;
}

export async function persistReviewFindings(
  admin: AdminSupabaseClient,
  organizationId: string,
  buildRunId: string,
  findings: ReviewFinding[],
) {
  if (findings.length === 0) return;
  const { error } = await admin.from("product_asset_review_defects").insert(
    findings.map((f) => ({
      organization_id: organizationId,
      product_asset_builder_run_id: buildRunId,
      feature_id: f.featureId ?? null,
      defect_type: f.defectType,
      severity: f.severity,
      description: f.description,
      provider: f.provider,
      model_id: f.model,
      resolved: f.resolved,
      metadata: { filePath: f.filePath ?? null } as never,
    })),
  );
  if (error) throw error;
}
