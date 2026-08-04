import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { createPermissionEnforcer } from "../permissions";
import { requireStringArrayField, requireStringField } from "../input-schema";
import type { WorkerExecutionContextBound, WorkerHandlerResult } from "../types";
import { validateVentureBlueprint } from "@/lib/infinity/venture-factory";
import type { VentureBlueprint } from "@/lib/infinity/venture-factory/types/blueprint";
import { VENTURE_TEMPLATE_TYPES } from "@/lib/infinity/venture-factory/constants";
import { dispatchBuildWorkerHandler } from "./build-v1-handlers";
import { dispatchAiWebsiteWorkerHandler } from "./ai-website-v1-handlers";
import { dispatchWebsiteWorkerHandler } from "./website-v1-handlers";

export async function runResearchSummarizeInternalEvidence(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const permissions = createPermissionEnforcer(context);
  permissions.require("evidence.read");
  permissions.require("worker_result.write");

  const input = context.approvedInput as Record<string, unknown>;
  requireStringField(input, "organization_id");
  if (input.organization_id !== context.organizationId) {
    throw new Error("Organization isolation violation");
  }

  const evidenceIds = requireStringArrayField(input, "evidence_record_ids");

  const { data: records, error } = await admin
    .from("evidence_records")
    .select("id, title, summary, source_id, credibility_score, created_at")
    .eq("organization_id", context.organizationId)
    .in("id", evidenceIds);

  if (error) {
    throw new Error(`Failed to load evidence: ${error.message}`);
  }

  const foundIds = new Set((records ?? []).map((r) => r.id));
  const missing = evidenceIds.filter((id) => !foundIds.has(id));

  const provenance = (records ?? []).map((r) => ({
    evidence_record_id: r.id,
    source_id: r.source_id,
    credibility_score: r.credibility_score,
    created_at: r.created_at,
  }));

  const summaryParts = (records ?? []).map(
    (r) => `${r.title ?? r.id}: ${r.summary ?? "No summary on record"}`,
  );

  return {
    structuredOutput: {
      summary: summaryParts.join("\n") || "No evidence records found for provided IDs.",
      missing_evidence: missing,
      provenance,
    },
    artifactType: "evidence_summary",
    artifactPayload: {
      summary: summaryParts.join("\n"),
      missing_evidence: missing,
      provenance,
    },
  };
}

export async function runAnalysisCompareOpportunities(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const permissions = createPermissionEnforcer(context);
  permissions.require("opportunity.read");

  const input = context.approvedInput as Record<string, unknown>;
  requireStringField(input, "organization_id");
  if (input.organization_id !== context.organizationId) {
    throw new Error("Organization isolation violation");
  }

  const opportunityIds = requireStringArrayField(input, "opportunity_ids");

  const { data: evaluations, error } = await admin
    .from("opportunity_evaluations")
    .select("opportunity_id, overall_score, expected_value_score, recommendation, created_at")
    .eq("organization_id", context.organizationId)
    .in("opportunity_id", opportunityIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load evaluations: ${error.message}`);
  }

  const latestByOpp = new Map<string, { opportunity_id: string; overall_score: number | null; expected_value_score: number | null; recommendation: string; created_at: string }>();
  for (const row of evaluations ?? []) {
    if (!latestByOpp.has(row.opportunity_id)) {
      latestByOpp.set(row.opportunity_id, row);
    }
  }

  const ranked = opportunityIds
    .map((id) => {
      const evaluation = latestByOpp.get(id);
      const score = evaluation?.overall_score ?? evaluation?.expected_value_score ?? 0;
      return {
        opportunity_id: id,
        score: Number(score),
        recommendation: evaluation?.recommendation ?? "unknown",
      };
    })
    .sort((a, b) => b.score - a.score);

  return {
    structuredOutput: { ranked },
    artifactType: "comparison_report",
    artifactPayload: { ranked },
  };
}

export async function runBlueprintValidate(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const permissions = createPermissionEnforcer(context);
  permissions.require("blueprint.read");

  const input = context.approvedInput as Record<string, unknown>;
  requireStringField(input, "organization_id");
  const blueprintId = requireStringField(input, "venture_blueprint_id");

  const { data: row, error } = await admin
    .from("venture_blueprints")
    .select("blueprint, venture_type, template_key, status, opportunity_id")
    .eq("organization_id", context.organizationId)
    .eq("id", blueprintId)
    .maybeSingle();

  if (error || !row) {
    return {
      structuredOutput: {
        valid: false,
        blockers: ["Venture blueprint not found"],
      },
      artifactType: "blueprint_validation_report",
      artifactPayload: { valid: false, blockers: ["not_found"] },
    };
  }

  const blueprintJson =
    typeof row.blueprint === "object" && row.blueprint !== null && !Array.isArray(row.blueprint)
      ? (row.blueprint as Record<string, unknown>)
      : {};

  const blockers: string[] = [];
  if (!(VENTURE_TEMPLATE_TYPES as readonly string[]).includes(row.venture_type as (typeof VENTURE_TEMPLATE_TYPES)[number])) {
    blockers.push(`Unsupported venture type: ${row.venture_type}`);
  }

  try {
    const asBlueprint = {
      ...blueprintJson,
      id: String(blueprintJson.id ?? blueprintId),
      ventureType: row.venture_type,
      status: row.status,
    } as VentureBlueprint;
    validateVentureBlueprint(asBlueprint);
  } catch (err) {
    blockers.push(err instanceof Error ? err.message : "Validation failed");
  }

  const valid = blockers.length === 0;

  return {
    structuredOutput: { valid, blockers },
    artifactType: "blueprint_validation_report",
    artifactPayload: { valid, blockers },
  };
}

export async function runQaVerifyPlanStepOutput(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const permissions = createPermissionEnforcer(context);
  permissions.require("worker_result.read");
  permissions.require("plan.read");

  const input = context.approvedInput as Record<string, unknown>;
  requireStringField(input, "organization_id");
  const planStepId = requireStringField(input, "plan_step_id");
  const workerResultId = requireStringField(input, "worker_result_id");

  const { data: target, error: targetError } = await admin
    .from("worker_results")
    .select(
      "id, capability_key, worker_run_id, structured_output, plan_step_id, organization_id, status",
    )
    .eq("organization_id", context.organizationId)
    .eq("id", workerResultId)
    .maybeSingle();

  if (targetError || !target) {
    return {
      structuredOutput: { verdict: "fail", issues: ["Target worker result not found"] },
      artifactType: "qa_report",
      artifactPayload: { verdict: "fail" },
    };
  }

  if (target.worker_run_id === context.workerRunId) {
    throw new Error("QA worker cannot review its own worker run output");
  }

  if (target.plan_step_id !== planStepId) {
    return {
      structuredOutput: {
        verdict: "fail",
        issues: ["Plan step ID does not match target worker result"],
      },
      artifactType: "qa_report",
      artifactPayload: { verdict: "fail" },
    };
  }

  const output =
    typeof target.structured_output === "object" &&
    target.structured_output !== null &&
    !Array.isArray(target.structured_output)
      ? (target.structured_output as Record<string, unknown>)
      : {};

  const issues: string[] = [];
  if (Object.keys(output).length === 0) {
    issues.push("Structured output is empty");
  }
  if (target.status !== "completed" && target.status !== "needs_review") {
    issues.push(`Target result status is ${target.status}`);
  }

  const verdict = issues.length === 0 ? "pass" : "needs_review";

  return {
    structuredOutput: { verdict, issues },
    artifactType: "qa_report",
    artifactPayload: { verdict, issues, reviewed_worker_result_id: workerResultId },
    metrics: { reviewed_worker_result_id: workerResultId },
  };
}

export async function dispatchWorkerHandler(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const buildResult = await dispatchBuildWorkerHandler(admin, context);
  if (buildResult) {
    return buildResult;
  }

  const aiWebsiteResult = await dispatchAiWebsiteWorkerHandler(admin, context);
  if (aiWebsiteResult) {
    return aiWebsiteResult;
  }

  const websiteResult = await dispatchWebsiteWorkerHandler(admin, context);
  if (websiteResult) {
    return websiteResult;
  }

  switch (context.capabilityKey) {
    case "research.summarize_internal_evidence":
      return runResearchSummarizeInternalEvidence(admin, context);
    case "analysis.compare_opportunities":
      return runAnalysisCompareOpportunities(admin, context);
    case "blueprint.validate":
      return runBlueprintValidate(admin, context);
    case "qa.verify_plan_step_output":
      return runQaVerifyPlanStepOutput(admin, context);
    default:
      throw new Error(`No handler registered for ${context.capabilityKey}`);
  }
}
