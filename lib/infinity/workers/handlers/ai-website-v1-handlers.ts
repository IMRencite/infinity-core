import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { loadBuildById, openBuildWorkspace } from "@/lib/infinity/build-factory/workspace";
import { createPermissionEnforcer } from "../permissions";
import { requireStringField } from "../input-schema";
import type { WorkerExecutionContextBound, WorkerHandlerResult } from "../types";
import { buildAiWebsiteGenerationContext } from "@/lib/infinity/ai-website-generation/context";
import { executeAiWebsitePlanGeneration, evaluateAiWebsiteBudget } from "@/lib/infinity/ai-website-generation/execution";
import {
  findAiWebsitePlanByIdempotency,
  insertAiWebsitePlanRequest,
  loadAiWebsitePlanForBuild,
  updateAiWebsitePlan,
} from "@/lib/infinity/ai-website-generation/persistence";
import {
  buildAiWebsitePlanIdempotencyKey,
  hashPlanOutput,
  defaultPlanVersion,
  AI_WEBSITE_GENERATION_SCHEMA_VERSION,
  AI_WEBSITE_PROMPT_VERSION,
} from "@/lib/infinity/ai-website-generation/planner";
import { validateWebsiteGenerationPlanPayload } from "@/lib/infinity/ai-website-generation/plan-validation";
import { emitAiWebsiteEvent } from "@/lib/infinity/ai-website-generation/events";
import {
  loadAiWebsiteGenerationMode,
  modeAllowsTranslationToBuild,
  modeAllowsPlanApproval,
} from "@/lib/infinity/ai-website-generation/modes";
import { approveAiWebsitePlan } from "@/lib/infinity/ai-website-generation/approvals";
import { translateApprovedPlanToWebsiteModel } from "@/lib/infinity/ai-website-generation/translator";
import { verifyAiWebsiteBuildReproducibility } from "@/lib/infinity/ai-website-generation/reproducibility";
import { WEBSITE_STATE_DIR } from "@/lib/infinity/website-builder/constants";
import { parseWebsiteExtension } from "@/lib/infinity/website-builder/specifications";
import { loadWebsiteBuildState } from "@/lib/infinity/website-builder/state";
import { runQaVerifyInternalWebsite } from "./website-v1-handlers";

const AI_STATE_FILE = `${WEBSITE_STATE_DIR}/ai-build-state.json`;

async function loadBuild(admin: AdminSupabaseClient, context: WorkerExecutionContextBound) {
  const input = context.approvedInput as Record<string, unknown>;
  requireStringField(input, "organization_id");
  const buildId = requireStringField(input, "build_id");
  const build = await loadBuildById(admin, context.organizationId, buildId);
  if (!build) throw new Error("Build not found");
  return build;
}

async function readAiState(workspace: Awaited<ReturnType<typeof openBuildWorkspace>>) {
  try {
    return JSON.parse(await workspace.readTextFile(AI_STATE_FILE)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function writeAiState(
  workspace: Awaited<ReturnType<typeof openBuildWorkspace>>,
  state: Record<string, unknown>,
) {
  await workspace.createDirectory(WEBSITE_STATE_DIR);
  await workspace.writeTextFile(AI_STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
}

export async function dispatchAiWebsiteWorkerHandler(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult | null> {
  switch (context.capabilityKey) {
    case "ai_website.build_context":
      return runAiWebsiteBuildContext(admin, context);
    case "ai_website.generate_plan":
      return runAiWebsiteGeneratePlan(admin, context);
    case "ai_website.validate_plan":
      return runAiWebsiteValidatePlan(admin, context);
    case "ai_website.request_review":
      return runAiWebsiteRequestReview(admin, context);
    case "ai_website.translate_approved_plan":
      return runAiWebsiteTranslatePlan(admin, context);
    case "qa.verify_ai_generated_website":
      return runQaVerifyAiGeneratedWebsite(admin, context);
    default:
      return null;
  }
}

async function runAiWebsiteBuildContext(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const permissions = createPermissionEnforcer(context);
  permissions.require("build.read");
  const build = await loadBuild(admin, context);
  const mode = loadAiWebsiteGenerationMode();
  if (mode === "disabled" || !build.specification.aiWebsiteGeneration?.enabled) {
    return { structuredOutput: { valid: true, skipped: true, reason: "disabled" }, artifactType: "validation_report", artifactPayload: { skipped: true } };
  }

  const bundle = await buildAiWebsiteGenerationContext(admin, { organizationId: build.organizationId, build });
  const budget = evaluateAiWebsiteBudget(bundle);
  if (!budget.allowed) {
    await emitAiWebsiteEvent(admin, { organizationId: build.organizationId, eventType: "ai_website.policy_blocked", message: budget.reason ?? "blocked", buildId: build.id, correlationId: context.correlationId });
    throw new Error(budget.reason ?? "Policy blocked");
  }

  const workspace = openBuildWorkspace(build);
  await workspace.writeTextFile(
    `${WEBSITE_STATE_DIR}/ai-context-manifest.json`,
    `${JSON.stringify(bundle.manifest, null, 2)}\n`,
  );

  const idempotencyKey = buildAiWebsitePlanIdempotencyKey({
    organizationId: build.organizationId,
    missionId: build.missionId,
    ventureBlueprintId: build.ventureBlueprintId,
    buildId: build.id,
    buildSpecificationVersion: build.buildVersion,
    contextHash: bundle.contextHash,
    promptVersion: AI_WEBSITE_PROMPT_VERSION,
    schemaVersion: AI_WEBSITE_GENERATION_SCHEMA_VERSION,
    provider: mode === "mock" ? "mock" : "openai",
    model: mode === "mock" ? "mock-website-plan-v1" : "configured",
    mode,
  });

  let plan = await findAiWebsitePlanByIdempotency(admin, build.organizationId, idempotencyKey);
  if (plan) {
    await emitAiWebsiteEvent(admin, {
      organizationId: build.organizationId,
      eventType: "ai_website.execution_reused",
      message: "AI website plan context reused",
      buildId: build.id,
      planId: plan.id,
      correlationId: context.correlationId,
    });
  }
  if (!plan) {
    const { data: latestPlanRow } = await admin
      .from("ai_website_generation_plans")
      .select("plan_version")
      .eq("organization_id", build.organizationId)
      .eq("build_id", build.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { nextPlanVersion, defaultPlanVersion } = await import(
      "@/lib/infinity/ai-website-generation/planner"
    );
    const planVersion = latestPlanRow?.plan_version
      ? nextPlanVersion(String(latestPlanRow.plan_version))
      : defaultPlanVersion();

    plan = await insertAiWebsitePlanRequest(admin, {
      organizationId: build.organizationId,
      missionId: build.missionId,
      runtimeInstanceId: build.runtimeInstanceId,
      opportunityId: build.opportunityId,
      ventureBlueprintId: build.ventureBlueprintId,
      buildId: build.id,
      buildSpecificationId: build.id,
      provider: mode === "mock" ? "mock" : "openai",
      model: mode === "mock" ? "mock-website-plan-v1" : "configured",
      mode,
      planVersion,
      promptVersion: AI_WEBSITE_PROMPT_VERSION,
      schemaVersion: AI_WEBSITE_GENERATION_SCHEMA_VERSION,
      contextManifest: bundle.manifest,
      contextHash: bundle.contextHash,
      correlationId: context.correlationId,
      idempotencyKey,
    });
  }

  await writeAiState(workspace, { planId: plan.id, contextHash: bundle.contextHash, mode });
  await emitAiWebsiteEvent(admin, { organizationId: build.organizationId, eventType: "ai_website.context_built", message: "AI website context built", buildId: build.id, planId: plan.id, correlationId: context.correlationId });

  return {
    structuredOutput: {
      valid: true,
      plan_id: plan.id,
      context_hash: bundle.contextHash,
      context_record_count: bundle.manifest.length,
    },
    artifactType: "validation_report",
    artifactPayload: { plan_id: plan.id },
  };
}

async function runAiWebsiteGeneratePlan(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const permissions = createPermissionEnforcer(context);
  permissions.require("build.read");
  const build = await loadBuild(admin, context);
  const mode = loadAiWebsiteGenerationMode();
  if (mode === "disabled") {
    return { structuredOutput: { valid: true, skipped: true }, artifactType: "validation_report", artifactPayload: { skipped: true } };
  }

  const plan = await loadAiWebsitePlanForBuild(admin, build.organizationId, build.id);
  if (!plan) throw new Error("AI website plan not found");
  if (plan.status === "completed" || plan.status === "approved") {
    await emitAiWebsiteEvent(admin, { organizationId: build.organizationId, eventType: "ai_website.execution_reused", message: "Plan reused", buildId: build.id, planId: plan.id, correlationId: context.correlationId });
    return { structuredOutput: { valid: true, reused: true, plan_id: plan.id }, artifactType: "validation_report", artifactPayload: { reused: true } };
  }

  const bundle = await buildAiWebsiteGenerationContext(admin, { organizationId: build.organizationId, build });
  await updateAiWebsitePlan(admin, build.organizationId, plan.id, { status: "running", started_at: new Date().toISOString() });
  await emitAiWebsiteEvent(admin, { organizationId: build.organizationId, eventType: "ai_website.provider_started", message: "Provider started", buildId: build.id, planId: plan.id, correlationId: context.correlationId });

  const exec = await executeAiWebsitePlanGeneration({
    context: bundle,
    buildId: build.id,
    projectType: build.projectType,
    siteName: build.specification.name,
    modeOverride: mode,
  });

  const outputHash = hashPlanOutput(exec.payload);
  await updateAiWebsitePlan(admin, build.organizationId, plan.id, {
    status: "completed",
    structured_plan: exec.payload as Json,
    output_hash: outputHash,
    recommendation: exec.payload.recommendation,
    confidence: exec.payload.recommendationConfidence,
    usage: exec.usage as Json,
    estimated_cost: exec.estimatedCost,
    latency_ms: exec.latencyMs,
    completed_at: new Date().toISOString(),
    review_status: mode === "shadow" ? "pending" : "pending",
  });

  await emitAiWebsiteEvent(admin, { organizationId: build.organizationId, eventType: "ai_website.provider_completed", message: "Provider completed", buildId: build.id, planId: plan.id, correlationId: context.correlationId, payload: { provider: exec.provider, used_network: exec.usedNetwork } });

  return {
    structuredOutput: {
      valid: true,
      plan_id: plan.id,
      output_hash: outputHash,
      provider: exec.provider,
      used_network: exec.usedNetwork,
    },
    artifactType: "validation_report",
    artifactPayload: { plan_id: plan.id, output_hash: outputHash },
  };
}

async function runAiWebsiteValidatePlan(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const build = await loadBuild(admin, context);
  const plan = await loadAiWebsitePlanForBuild(admin, build.organizationId, build.id);
  if (!plan?.structuredPlan) throw new Error("Plan payload missing");
  if (plan.status === "approved" || plan.reviewStatus === "approved") {
    return {
      structuredOutput: { valid: true, plan_id: plan.id, reused: true },
      artifactType: "validation_report",
      artifactPayload: { valid: true, reused: true },
    };
  }
  const bundle = await buildAiWebsiteGenerationContext(admin, { organizationId: build.organizationId, build });
  const validation = validateWebsiteGenerationPlanPayload(plan.structuredPlan, {
    allowedEvidenceReferenceIds: bundle.allowedEvidenceReferenceIds,
  });
  await updateAiWebsitePlan(admin, build.organizationId, plan.id, {
    validation_results: { valid: validation.valid, issues: validation.issues } as Json,
    status: validation.valid ? "completed" : validation.permanent ? "rejected_schema" : "rejected_policy",
  });
  const eventType = validation.valid ? "ai_website.plan_validated" : "ai_website.plan_rejected";
  await emitAiWebsiteEvent(admin, { organizationId: build.organizationId, eventType, message: validation.valid ? "valid" : validation.issues.join("; "), buildId: build.id, planId: plan.id, correlationId: context.correlationId });
  if (!validation.valid) {
    throw new Error(validation.issues.join("; "));
  }
  return { structuredOutput: { valid: true, plan_id: plan.id }, artifactType: "validation_report", artifactPayload: { valid: true } };
}

async function runAiWebsiteRequestReview(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const build = await loadBuild(admin, context);
  const mode = loadAiWebsiteGenerationMode();
  const plan = await loadAiWebsitePlanForBuild(admin, build.organizationId, build.id);
  if (!plan) throw new Error("Plan missing");
  if (plan.reviewStatus === "approved" || plan.status === "approved") {
    return {
      structuredOutput: { valid: true, plan_id: plan.id, review_status: plan.reviewStatus, reused: true },
      artifactType: "validation_report",
      artifactPayload: { plan_id: plan.id, reused: true },
    };
  }
  await updateAiWebsitePlan(admin, build.organizationId, plan.id, { review_status: "pending", status: "needs_review" });
  await emitAiWebsiteEvent(admin, { organizationId: build.organizationId, eventType: "ai_website.review_requested", message: "Review requested", buildId: build.id, planId: plan.id, correlationId: context.correlationId });

  if (
    process.env.ALLOW_AI_WEBSITE_E2E_AUTO_APPROVE === "true" &&
    modeAllowsPlanApproval(mode)
  ) {
    await approveAiWebsitePlan(admin, {
      organizationId: build.organizationId,
      planId: plan.id,
      mode,
      correlationId: context.correlationId,
      approvedByLabel: "e2e_governed_auto_approve",
    });
  }

  return {
    structuredOutput: { valid: true, plan_id: plan.id, review_status: "pending", shadow: mode === "shadow" },
    artifactType: "validation_report",
    artifactPayload: { plan_id: plan.id },
  };
}

async function runAiWebsiteTranslatePlan(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const permissions = createPermissionEnforcer(context);
  permissions.require("build.workspace.write");
  const build = await loadBuild(admin, context);
  const mode = loadAiWebsiteGenerationMode();
  const plan = await loadAiWebsitePlanForBuild(admin, build.organizationId, build.id);
  if (!plan?.structuredPlan) throw new Error("Plan missing");

  if (mode === "shadow" || !modeAllowsTranslationToBuild(mode)) {
    return { structuredOutput: { valid: true, skipped: true, reason: "shadow_or_non_advisory" }, artifactType: "validation_report", artifactPayload: { skipped: true } };
  }

  if (plan.reviewStatus !== "approved" && plan.status !== "approved") {
    throw new Error("Approved plan required before translation");
  }

  if (plan.translationHash) {
    return {
      structuredOutput: {
        translation_hash: plan.translationHash,
        page_count: plan.structuredPlan.pagePlans?.length ?? 0,
        reused: true,
      },
      artifactType: "workspace_file_manifest",
      artifactPayload: { translation_hash: plan.translationHash, reused: true },
    };
  }

  const bundle = await buildAiWebsiteGenerationContext(admin, { organizationId: build.organizationId, build });
  if (bundle.contextHash !== plan.contextHash) {
    throw new Error("Context hash mismatch — new plan version required");
  }

  const translated = translateApprovedPlanToWebsiteModel({
    planId: plan.id,
    contextHash: plan.contextHash,
    outputHash: plan.outputHash ?? hashPlanOutput(plan.structuredPlan),
    payload: plan.structuredPlan,
  });

  const workspace = openBuildWorkspace(build);
  await workspace.writeTextFile(
    `${WEBSITE_STATE_DIR}/ai-translated-model.json`,
    `${JSON.stringify(translated, null, 2)}\n`,
  );
  await updateAiWebsitePlan(admin, build.organizationId, plan.id, { translation_hash: translated.translationHash });
  await emitAiWebsiteEvent(admin, { organizationId: build.organizationId, eventType: "ai_website.translation_completed", message: "Translation completed", buildId: build.id, planId: plan.id, correlationId: context.correlationId, payload: { translation_hash: translated.translationHash } });

  return {
    structuredOutput: { translation_hash: translated.translationHash, page_count: translated.pageDefinitions.length },
    artifactType: "workspace_file_manifest",
    artifactPayload: { translation_hash: translated.translationHash },
  };
}

async function runQaVerifyAiGeneratedWebsite(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const build = await loadBuild(admin, context);
  const plan = await loadAiWebsitePlanForBuild(admin, build.organizationId, build.id);
  const aiIssues: string[] = [];
  if (!plan || plan.reviewStatus !== "approved") {
    aiIssues.push("Approved AI generation plan required");
  }
  const workspace = openBuildWorkspace(build);
  try {
    await workspace.readTextFile(`${WEBSITE_STATE_DIR}/ai-translated-model.json`);
  } catch {
    aiIssues.push("Translated model missing");
  }

  const base = await runQaVerifyInternalWebsite(admin, context);
  const baseOut = base.structuredOutput as { verdict?: string; issues?: string[] };
  const repro = await verifyAiWebsiteBuildReproducibility(admin, build);
  if (repro.status === "mismatched") {
    aiIssues.push(...repro.issues);
    await emitAiWebsiteEvent(admin, {
      organizationId: build.organizationId,
      eventType: "ai_website.reproducibility_mismatch",
      message: "AI website reproducibility mismatch",
      buildId: build.id,
      planId: plan?.id,
      correlationId: context.correlationId,
      payload: { issues: repro.issues },
    });
  }
  const issues = [...aiIssues, ...(baseOut.issues ?? [])];
  const verdict = issues.length === 0 ? "pass" : "fail";

  const website = parseWebsiteExtension(build.specification);
  const state = await loadWebsiteBuildState(workspace);

  if (verdict === "pass") {
    await admin
      .from("builds")
      .update({ review_status: "passed" })
      .eq("id", build.id)
      .eq("organization_id", build.organizationId);
    if (website) {
      const { upsertWebsiteBuildMetadata } = await import("@/lib/infinity/website-builder/metadata");
      await upsertWebsiteBuildMetadata(admin, {
        organizationId: build.organizationId,
        buildId: build.id,
        projectType: website.projectType,
        framework: website.framework,
        state,
        qaStatus: "passed",
      });
    }
  } else if (website) {
    await admin
      .from("builds")
      .update({ review_status: "failed", status: "failed" })
      .eq("id", build.id)
      .eq("organization_id", build.organizationId);
    const { upsertWebsiteBuildMetadata } = await import("@/lib/infinity/website-builder/metadata");
    await upsertWebsiteBuildMetadata(admin, {
      organizationId: build.organizationId,
      buildId: build.id,
      projectType: website.projectType,
      framework: website.framework,
      state,
      qaStatus: "failed",
    });
  }

  return {
    ...base,
    structuredOutput: {
      verdict,
      issues,
      label: "AI-generated internal website — not deployed or published",
      ai_plan_id: plan?.id ?? null,
    },
    artifactPayload: {
      verdict,
      issues,
      build_id: build.id,
      ai_plan_id: plan?.id ?? null,
    },
  };
}
