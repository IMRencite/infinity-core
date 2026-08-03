import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { recordEngineEvent } from "../events";
import {
  aggregateValidationScores,
  calculateValidationCategories,
  detectSparseSystemValidation,
  type ValidationContext,
} from "./categories";
import {
  buildValidationRunKey,
  selectActiveValidationModel,
} from "./models";
import {
  generateValidationRecommendation,
  isPlannerEligible,
} from "./recommend";
import type { RunValidationInput, RunValidationResult } from "./types";

async function loadValidationContext(
  admin: AdminSupabaseClient,
  organizationId: string,
  opportunityId: string,
): Promise<ValidationContext> {
  const { data: opportunity, error: opportunityError } = await admin
    .from("opportunities")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", opportunityId)
    .maybeSingle();

  if (opportunityError || !opportunity) {
    throw new Error(`Opportunity not found: ${opportunityError?.message ?? opportunityId}`);
  }

  const [
    { data: scores },
    { data: evidence },
    { data: evaluation },
    { data: claims },
    { data: knowledge },
  ] = await Promise.all([
    admin
      .from("opportunity_scores")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("opportunity_id", opportunityId)
      .order("scored_at", { ascending: false })
      .limit(1),
    admin
      .from("opportunity_evidence")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("opportunity_id", opportunityId),
    admin
      .from("opportunity_evaluations")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("opportunity_id", opportunityId)
      .eq("evaluation_status", "completed")
      .order("evaluated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("claims")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("subject_type", "opportunity")
      .eq("subject_id", opportunityId)
      .limit(20),
    admin
      .from("knowledge_records")
      .select("*")
      .eq("organization_id", organizationId)
      .limit(50),
  ]);

  const linkedKnowledge = (knowledge ?? []).filter((record) => {
    if (typeof record.scope !== "object" || record.scope === null || Array.isArray(record.scope)) {
      return false;
    }

    const scope = record.scope as Record<string, unknown>;
    return scope.opportunity_id === opportunityId || scope.entity_id === opportunityId;
  });

  if (!evaluation) {
    throw new Error("Validation requires a completed opportunity evaluation");
  }

  if (!scores?.[0] && (evidence?.length ?? 0) === 0) {
    throw new Error("Validation requires stored scores or evidence");
  }

  const isSparseSystemValidation = detectSparseSystemValidation(opportunity);

  return {
    opportunity,
    latestScore: scores?.[0] ?? null,
    evidence: evidence ?? [],
    evaluation,
    claims: claims ?? [],
    knowledge: linkedKnowledge,
    isSparseSystemValidation,
  };
}

export async function runValidation(
  admin: AdminSupabaseClient,
  input: RunValidationInput,
): Promise<RunValidationResult> {
  const model = await selectActiveValidationModel(
    admin,
    input.organizationId,
    input.validationModelId,
  );

  const runKey =
    input.runKey ??
    buildValidationRunKey(input.opportunityId, input.correlationId ?? model.id);

  const { data: existing, error: existingError } = await admin
    .from("validation_runs")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("run_key", runKey)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check existing validation run: ${existingError.message}`);
  }

  if (existing) {
    const { data: findings } = await admin
      .from("validation_findings")
      .select("*")
      .eq("organization_id", input.organizationId)
      .eq("validation_run_id", existing.id)
      .eq("is_blocking", true);

    return {
      alreadyRun: true,
      run: existing,
      recommendation: existing.recommendation,
      overallConfidence:
        existing.overall_confidence !== null ? Number(existing.overall_confidence) : null,
      overallScore: existing.overall_score !== null ? Number(existing.overall_score) : null,
      blockingFindings: findings ?? [],
      missingInformation: [],
      plannerEligible: isPlannerEligible(existing.recommendation),
    };
  }

  await recordEngineEvent(admin, {
    organizationId: input.organizationId,
    engineName: "validation_engine",
    eventType: "validation.started",
    entityType: "opportunity",
    entityId: input.opportunityId,
    message: "Opportunity validation started",
    correlationId: input.correlationId ?? undefined,
    payload: {
      opportunity_id: input.opportunityId,
      validation_model_id: model.id,
      model_version: model.version,
      run_key: runKey,
    },
  });

  const context = await loadValidationContext(
    admin,
    input.organizationId,
    input.opportunityId,
  );

  const evaluation = context.evaluation;
  if (!evaluation) {
    throw new Error("Validation requires a completed opportunity evaluation");
  }

  const { data: allocation } = await admin
    .from("allocation_proposals")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("opportunity_id", input.opportunityId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const categories = calculateValidationCategories(model, context);
  const aggregated = aggregateValidationScores(categories);

  const structuredFindings = categories.flatMap((category) =>
    [
      ...category.findings.map((text) => ({
        category: category.category,
        severity: "info" as const,
        finding_type: "observation",
        title: text.slice(0, 120),
        description: text,
        is_blocking: false,
      })),
      ...category.blockingIssues.map((text) => ({
        category: category.category,
        severity: "critical" as const,
        finding_type: "blocker",
        title: text.slice(0, 120),
        description: text,
        is_blocking: true,
      })),
    ],
  );

  if (context.isSparseSystemValidation) {
    structuredFindings.push({
      category: "evidence_strength",
      severity: "critical",
      finding_type: "blocker",
      title: "System validation only",
      description:
        "Opportunity is backed by system-validation or foundation stub data only. Planning approval blocked.",
      is_blocking: true,
    });
  }

  const hasCriticalBlockers = structuredFindings.some((f) => f.is_blocking);

  const recommendation = generateValidationRecommendation({
    model,
    overallScore: aggregated.overallScore,
    overallConfidence: aggregated.overallConfidence,
    categories,
    isSparseSystemValidation: context.isSparseSystemValidation,
    hasCriticalBlockers,
    evaluationRecommendation: evaluation.recommendation,
  });

  const runStatus =
    hasCriticalBlockers && recommendation !== "approved_for_planning"
      ? "blocked"
      : "completed";

  const { data: run, error: runError } = await admin
    .from("validation_runs")
    .insert({
      organization_id: input.organizationId,
      opportunity_id: input.opportunityId,
      validation_model_id: model.id,
      mission_id: input.missionId ?? evaluation.mission_id,
      evaluation_id: evaluation.id,
      allocation_proposal_id: allocation?.id ?? null,
      run_status: runStatus,
      recommendation,
      run_key: runKey,
      overall_score: aggregated.overallScore,
      overall_confidence: aggregated.overallConfidence,
      is_sparse_system_validation: context.isSparseSystemValidation,
      completed_at: new Date().toISOString(),
      summary: {
        missing_information: aggregated.missingInformation,
        blocking_issue_count: structuredFindings.filter((f) => f.is_blocking).length,
        category_count: categories.length,
        deterministic: true,
        no_llm: true,
      } as Json,
    })
    .select("*")
    .single();

  if (runError || !run) {
    await recordEngineEvent(admin, {
      organizationId: input.organizationId,
      engineName: "validation_engine",
      eventType: "validation.failed",
      entityType: "opportunity",
      entityId: input.opportunityId,
      message: `Validation failed: ${runError?.message ?? "unknown"}`,
      correlationId: input.correlationId ?? undefined,
      payload: { run_key: runKey },
    });

    throw new Error(`Failed to persist validation run: ${runError?.message ?? "unknown"}`);
  }

  await admin.from("validation_dimension_results").insert(
    categories.map((category) => ({
      organization_id: input.organizationId,
      validation_run_id: run.id,
      category: category.category,
      score: category.score,
      confidence: category.confidence,
      data_status: category.dataStatus,
      findings: category.findings as Json,
      missing_information: category.missingInformation as Json,
      blocking_issues: category.blockingIssues as Json,
    })),
  );

  if (structuredFindings.length > 0) {
    const { data: insertedFindings } = await admin
      .from("validation_findings")
      .insert(
        structuredFindings.map((finding) => ({
          organization_id: input.organizationId,
          validation_run_id: run.id,
          category: finding.category,
          severity: finding.severity,
          finding_type: finding.finding_type,
          title: finding.title,
          description: finding.description,
          is_blocking: finding.is_blocking,
        })),
      )
      .select("*");

    for (const finding of insertedFindings ?? []) {
      await recordEngineEvent(admin, {
        organizationId: input.organizationId,
        engineName: "validation_engine",
        eventType: "validation.finding_created",
        entityType: "validation_finding",
        entityId: finding.id,
        message: `Validation finding: ${finding.title}`,
        correlationId: input.correlationId ?? undefined,
        payload: {
          validation_run_id: run.id,
          category: finding.category,
          is_blocking: finding.is_blocking,
        },
      });
    }
  }

  const requirements = aggregated.missingInformation.map((item) => ({
    organization_id: input.organizationId,
    validation_run_id: run.id,
    requirement_key: item.replace(/[^a-z0-9_]+/gi, "_").slice(0, 80),
    status: "open",
    description: `Collect or prove: ${item}`,
  }));

  if (requirements.length > 0) {
    await admin.from("validation_requirements").insert(requirements);
  }

  await recordEngineEvent(admin, {
    organizationId: input.organizationId,
    engineName: "validation_engine",
    eventType: "validation.completed",
    entityType: "validation_run",
    entityId: run.id,
    message: `Validation completed: ${recommendation}`,
    correlationId: input.correlationId ?? undefined,
    payload: {
      validation_run_id: run.id,
      opportunity_id: input.opportunityId,
      mission_id: run.mission_id,
      recommendation,
      overall_confidence: aggregated.overallConfidence,
      findings_summary: {
        blocking: structuredFindings.filter((f) => f.is_blocking).length,
        total: structuredFindings.length,
      },
    },
  });

  if (hasCriticalBlockers) {
    await recordEngineEvent(admin, {
      organizationId: input.organizationId,
      engineName: "validation_engine",
      eventType: "validation.blocked",
      entityType: "validation_run",
      entityId: run.id,
      message: "Validation blocked by critical findings",
      correlationId: input.correlationId ?? undefined,
      payload: {
        validation_run_id: run.id,
        recommendation,
      },
    });
  }

  if (recommendation === "approved_for_planning") {
    await recordEngineEvent(admin, {
      organizationId: input.organizationId,
      engineName: "validation_engine",
      eventType: "validation.approved_for_planning",
      entityType: "validation_run",
      entityId: run.id,
      message: "Opportunity approved for planning (not building)",
      correlationId: input.correlationId ?? undefined,
      payload: {
        validation_run_id: run.id,
        opportunity_id: input.opportunityId,
        overall_confidence: aggregated.overallConfidence,
      },
    });
  }

  const { data: blockingFindings } = await admin
    .from("validation_findings")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("validation_run_id", run.id)
    .eq("is_blocking", true);

  return {
    alreadyRun: false,
    run,
    recommendation,
    overallConfidence: aggregated.overallConfidence,
    overallScore: aggregated.overallScore,
    blockingFindings: blockingFindings ?? [],
    missingInformation: aggregated.missingInformation,
    plannerEligible: isPlannerEligible(recommendation),
  };
}
