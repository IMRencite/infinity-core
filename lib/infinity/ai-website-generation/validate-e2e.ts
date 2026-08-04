import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { registerRuntimeWorkers } from "@/lib/infinity/runtime";
import { runBuildFactoryE2EValidation, runJobToCompletion } from "@/lib/infinity/build-factory/validate-e2e";
import {
  findAiWebsitePlanByIdempotency,
  loadAiWebsitePlanForBuild,
} from "./persistence";
import { websiteTaskGraphStepCount } from "@/lib/infinity/website-builder/task-graph";
import {
  loadAiWebsiteGenerationMode,
  modeAllowsPlanApproval,
  modeAllowsTranslationToBuild,
} from "./modes";
import { buildAiWebsitePlanIdempotencyKey, AI_WEBSITE_PROMPT_VERSION, AI_WEBSITE_GENERATION_SCHEMA_VERSION } from "./planner";
import { buildAiWebsiteGenerationContext } from "./context";
import { buildMockWebsiteGenerationPlan } from "./mock-output";
import { validateWebsiteGenerationPlanPayload } from "./plan-validation";
import { loadBuildById, openBuildWorkspace } from "@/lib/infinity/build-factory/workspace";
import { verifyAiWebsiteBuildReproducibility } from "./reproducibility";
import { WEBSITE_STATE_DIR } from "@/lib/infinity/website-builder/constants";
import { BUILD_E2E_LABEL } from "@/lib/infinity/build-factory/constants";

export type AiWebsiteArtifactCounts = {
  planCount: number;
  approvalEventCount: number;
  reviewRequestEventCount: number;
  translationEventCount: number;
  taskCount: number;
  engineJobCount: number;
  workerResultCount: number;
  workspaceFileCount: number;
  qaEngineJobCount: number;
  snapshotCount: number;
  packageArtifactCount: number;
  completionEventCount: number;
  reuseEventCount: number;
};

export type AiWebsiteGenerationE2EReport = Awaited<ReturnType<typeof runBuildFactoryE2EValidation>> & {
  aiPlanId: string;
  planVersion: string;
  provider: string;
  model: string;
  mode: string;
  contextHash: string;
  outputHash: string | null;
  pagePlanCount: number;
  contentRecordCount: number;
  translationHash: string | null;
  expectedTaskCount: number;
  initial: {
    planCount: number;
    approvalEventCount: number;
    translationEventCount: number;
    reviewRequestEventCount: number;
  };
  duplicate: AiWebsiteArtifactCounts & {
    samePlanId: boolean;
    planId: string;
  };
  contextRevision: {
    originalPlanId: string;
    originalContextHash: string;
    originalPlanVersion: string;
    originalPlanStructuredPlanUnchanged: boolean;
    revisedPlanId: string;
    revisedPlanVersion: string;
    revisedContextHash: string;
    priorBuildStatusUnchanged: boolean;
    priorBuildId: string;
  };
  prohibitedClaim: {
    rejected: boolean;
    issues: string[];
  };
  unsupportedEvidence: {
    rejected: boolean;
    issues: string[];
  };
  shadow: {
    mode: string;
    planPersisted: boolean;
    planId: string;
    approvalPossible: boolean;
    translationHash: string | null;
    translationSkipped: boolean;
    workspaceFileCountBefore: number;
    workspaceFileCountAfter: number;
    buildId: string;
  };
  advisory: {
    requiresApproval: boolean;
    translationBlockedWithoutApproval: boolean;
    translationAfterApproval: boolean;
  };
  reproducibility: {
    baselineStatus: string;
    mismatchDetected: boolean;
    mismatchIssues: string[];
    observeBlockedCompletion: boolean;
    buildId: string;
  };
  externalSideEffectsUnchanged: boolean;
  pass: boolean;
  errors: string[];
};

export function assertAiWebsiteGenerationE2EAllowed(): void {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_AI_WEBSITE_E2E !== "true") {
    throw new Error("AI Website Generation E2E is development-only.");
  }
}

async function countAiArtifacts(
  admin: AdminSupabaseClient,
  organizationId: string,
  buildId: string,
  missionPlanId: string,
): Promise<AiWebsiteArtifactCounts> {
  const { count: planCount } = await admin
    .from("ai_website_generation_plans")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("build_id", buildId);

  const { count: approvalEventCount } = await admin
    .from("engine_events")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("event_type", "ai_website.plan_approved")
    .contains("payload", { build_id: buildId } as Record<string, unknown>);

  const { count: reviewRequestEventCount } = await admin
    .from("engine_events")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("event_type", "ai_website.review_requested")
    .contains("payload", { build_id: buildId } as Record<string, unknown>);

  const { count: translationEventCount } = await admin
    .from("engine_events")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("event_type", "ai_website.translation_completed")
    .contains("payload", { build_id: buildId } as Record<string, unknown>);

  const { count: taskCount } = await admin
    .from("plan_steps")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("plan_id", missionPlanId)
    .filter("constraints->>build_id", "eq", buildId);

  const { count: engineJobCount } = await admin
    .from("engine_jobs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .contains("payload", { build_id: buildId } as Record<string, unknown>);

  const { data: buildRow } = await admin
    .from("builds")
    .select("workspace_reference")
    .eq("id", buildId)
    .maybeSingle();

  let workspaceFileCount = 0;
  if (buildRow?.workspace_reference) {
    const build = await loadBuildById(admin, organizationId, buildId);
    if (build) {
      const ws = openBuildWorkspace(build);
      workspaceFileCount = (await ws.listWorkspaceFiles()).length;
    }
  }

  const { count: qaEngineJobCount } = await admin
    .from("engine_jobs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("capability_key", "qa.verify_ai_generated_website")
    .contains("payload", { build_id: buildId } as Record<string, unknown>);

  const { count: snapshotCount } = await admin
    .from("build_snapshots")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("build_id", buildId);

  const { count: packageArtifactCount } = await admin
    .from("worker_artifacts")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("artifact_type", "internal_website_package");

  const { count: completionEventCount } = await admin
    .from("engine_events")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("event_type", "build.internally_completed")
    .contains("payload", { build_id: buildId } as Record<string, unknown>);

  const { count: reuseEventCount } = await admin
    .from("engine_events")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("event_type", "ai_website.execution_reused")
    .contains("payload", { build_id: buildId } as Record<string, unknown>);

  const { count: workerResultCount } = await admin
    .from("worker_results")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .in(
      "capability_key",
      [
        "ai_website.build_context",
        "ai_website.generate_plan",
        "ai_website.validate_plan",
        "ai_website.request_review",
        "ai_website.translate_approved_plan",
        "website.generate_ai_planned_pages",
        "website.generate_ai_planned_content",
        "qa.verify_ai_generated_website",
      ],
    );

  return {
    planCount: planCount ?? 0,
    approvalEventCount: approvalEventCount ?? 0,
    reviewRequestEventCount: reviewRequestEventCount ?? 0,
    translationEventCount: translationEventCount ?? 0,
    taskCount: taskCount ?? 0,
    engineJobCount: engineJobCount ?? 0,
    workerResultCount: workerResultCount ?? 0,
    workspaceFileCount,
    qaEngineJobCount: qaEngineJobCount ?? 0,
    snapshotCount: snapshotCount ?? 0,
    packageArtifactCount: packageArtifactCount ?? 0,
    completionEventCount: completionEventCount ?? 0,
    reuseEventCount: reuseEventCount ?? 0,
  };
}

async function reExecuteExistingAiJobs(
  admin: AdminSupabaseClient,
  organizationId: string,
  engineJobIds: string[],
): Promise<void> {
  registerRuntimeWorkers();
  for (const jobId of engineJobIds) {
    const { data: job } = await admin
      .from("engine_jobs")
      .select("capability_key")
      .eq("id", jobId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (
      job?.capability_key === "ai_website.build_context" ||
      job?.capability_key === "ai_website.generate_plan"
    ) {
      await runJobToCompletion(admin, jobId, organizationId, job.capability_key);
    }
  }
}

async function insertRevisedContextPlan(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string;
    build: NonNullable<Awaited<ReturnType<typeof loadBuildById>>>;
    ventureBlueprintId: string;
    correlationId: string | null;
  },
): Promise<{ planId: string; planVersion: string; contextHash: string }> {
  const bundle = await buildAiWebsiteGenerationContext(admin, {
    organizationId: input.organizationId,
    build: input.build,
  });
  const mode = loadAiWebsiteGenerationMode();
  const idempotencyKey = buildAiWebsitePlanIdempotencyKey({
    organizationId: input.organizationId,
    missionId: input.missionId,
    ventureBlueprintId: input.ventureBlueprintId,
    buildId: input.build.id,
    buildSpecificationVersion: input.build.buildVersion,
    contextHash: bundle.contextHash,
    promptVersion: AI_WEBSITE_PROMPT_VERSION,
    schemaVersion: AI_WEBSITE_GENERATION_SCHEMA_VERSION,
    provider: mode === "mock" ? "mock" : "openai",
    model: mode === "mock" ? "mock-website-plan-v1" : "configured",
    mode,
  });
  let plan = await findAiWebsitePlanByIdempotency(admin, input.organizationId, idempotencyKey);
  if (!plan) {
    const { insertAiWebsitePlanRequest } = await import("./persistence");
    const { data: latestPlanRow } = await admin
      .from("ai_website_generation_plans")
      .select("plan_version")
      .eq("organization_id", input.organizationId)
      .eq("build_id", input.build.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { nextPlanVersion, defaultPlanVersion } = await import("./planner");
    const planVersion = latestPlanRow?.plan_version
      ? nextPlanVersion(String(latestPlanRow.plan_version))
      : defaultPlanVersion();
    plan = await insertAiWebsitePlanRequest(admin, {
      organizationId: input.organizationId,
      missionId: input.missionId,
      runtimeInstanceId: input.build.runtimeInstanceId,
      opportunityId: input.build.opportunityId,
      ventureBlueprintId: input.ventureBlueprintId,
      buildId: input.build.id,
      buildSpecificationId: input.build.id,
      provider: mode === "mock" ? "mock" : "openai",
      model: mode === "mock" ? "mock-website-plan-v1" : "configured",
      mode,
      planVersion,
      promptVersion: AI_WEBSITE_PROMPT_VERSION,
      schemaVersion: AI_WEBSITE_GENERATION_SCHEMA_VERSION,
      contextManifest: bundle.manifest,
      contextHash: bundle.contextHash,
      correlationId: input.correlationId,
      idempotencyKey,
    });
  }
  return { planId: plan.id, planVersion: plan.planVersion, contextHash: plan.contextHash };
}

export async function runAiWebsiteGenerationE2EValidation(
  admin: AdminSupabaseClient,
): Promise<AiWebsiteGenerationE2EReport> {
  assertAiWebsiteGenerationE2EAllowed();
  process.env.AI_WEBSITE_GENERATION_MODE = process.env.AI_WEBSITE_GENERATION_MODE ?? "mock";
  process.env.ALLOW_AI_WEBSITE_E2E_AUTO_APPROVE = "true";

  const errors: string[] = [];
  const base = await runBuildFactoryE2EValidation(admin);

  const plan = await loadAiWebsitePlanForBuild(admin, base.organizationId, base.buildId);
  if (!plan) {
    errors.push("AI website generation plan missing");
  }

  const mode = loadAiWebsiteGenerationMode();
  const expected = websiteTaskGraphStepCount({ aiGenerationEnabled: mode !== "disabled" });
  if (base.taskCountBefore !== expected && mode !== "disabled") {
    errors.push(`Expected ${expected} tasks, got ${base.taskCountBefore}`);
  }

  if (plan && base.buildId) {
    if ((await countAiArtifacts(admin, base.organizationId, base.buildId, base.planId)).planCount !== 1) {
      errors.push("Initial flow must produce exactly one generation plan");
    }
  }

  const initialCounts = plan
    ? await countAiArtifacts(admin, base.organizationId, base.buildId, base.planId)
    : {
        planCount: 0,
        approvalEventCount: 0,
        reviewRequestEventCount: 0,
        translationEventCount: 0,
        taskCount: 0,
        engineJobCount: 0,
        workerResultCount: 0,
        workspaceFileCount: 0,
        qaEngineJobCount: 0,
        snapshotCount: 0,
        packageArtifactCount: 0,
        completionEventCount: 0,
        reuseEventCount: 0,
      };

  if (initialCounts.planCount !== 1) {
    errors.push(`Expected 1 plan, got ${initialCounts.planCount}`);
  }
  if (initialCounts.approvalEventCount !== 1) {
    errors.push(`Expected 1 approval event, got ${initialCounts.approvalEventCount}`);
  }
  if (initialCounts.translationEventCount !== 1) {
    errors.push(`Expected 1 translation event, got ${initialCounts.translationEventCount}`);
  }
  if (initialCounts.reviewRequestEventCount < 1) {
    errors.push("Expected at least one review request event");
  }
  if (base.completionEventCount !== 1) {
    errors.push(`Expected 1 completion event, got ${base.completionEventCount}`);
  }

  const beforeDuplicate = { ...initialCounts };
  let duplicateReport: AiWebsiteGenerationE2EReport["duplicate"] = {
    ...beforeDuplicate,
    samePlanId: false,
    planId: plan?.id ?? "",
  };

  if (plan && base.buildId) {
    await reExecuteExistingAiJobs(admin, base.organizationId, base.engineJobIds);
    const afterDuplicate = await countAiArtifacts(admin, base.organizationId, base.buildId, base.planId);
    const planAfter = await loadAiWebsitePlanForBuild(admin, base.organizationId, base.buildId);
    duplicateReport = {
      ...afterDuplicate,
      samePlanId: planAfter?.id === plan.id,
      planId: planAfter?.id ?? "",
    };
    if (!duplicateReport.samePlanId) {
      errors.push("Duplicate generation must return same plan ID");
    }
    if (afterDuplicate.planCount !== beforeDuplicate.planCount) {
      errors.push(`Duplicate changed plan count ${beforeDuplicate.planCount} -> ${afterDuplicate.planCount}`);
    }
    if (afterDuplicate.approvalEventCount !== beforeDuplicate.approvalEventCount) {
      errors.push("Duplicate changed approval event count");
    }
    if (afterDuplicate.translationEventCount !== beforeDuplicate.translationEventCount) {
      errors.push("Duplicate changed translation event count");
    }
    if (afterDuplicate.taskCount !== beforeDuplicate.taskCount) {
      errors.push("Duplicate changed task count");
    }
    if (afterDuplicate.snapshotCount !== beforeDuplicate.snapshotCount) {
      errors.push("Duplicate changed snapshot count");
    }
    if (afterDuplicate.completionEventCount !== beforeDuplicate.completionEventCount) {
      errors.push("Duplicate changed completion event count");
    }
    const deduplicationProven =
      duplicateReport.samePlanId &&
      afterDuplicate.planCount === beforeDuplicate.planCount &&
      afterDuplicate.approvalEventCount === beforeDuplicate.approvalEventCount &&
      afterDuplicate.translationEventCount === beforeDuplicate.translationEventCount &&
      afterDuplicate.taskCount === beforeDuplicate.taskCount &&
      afterDuplicate.snapshotCount === beforeDuplicate.snapshotCount &&
      afterDuplicate.completionEventCount === beforeDuplicate.completionEventCount;

    if (afterDuplicate.reuseEventCount < 1 && !deduplicationProven) {
      const { count: contextReuse } = await admin
        .from("engine_events")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", base.organizationId)
        .eq("event_type", "ai_website.execution_reused")
        .contains("payload", { build_id: base.buildId } as Record<string, unknown>);
      if ((contextReuse ?? 0) < 1) {
        errors.push("Expected ai_website.execution_reused event or proven deduplication on duplicate");
      }
    }
  }

  const reproReport: AiWebsiteGenerationE2EReport["reproducibility"] = {
    baselineStatus: "unknown",
    mismatchDetected: false,
    mismatchIssues: [],
    observeBlockedCompletion: false,
    buildId: base.buildId,
  };

  if (base.buildId) {
    const buildForRepro = await loadBuildById(admin, base.organizationId, base.buildId);
    if (buildForRepro) {
      const baseline = await verifyAiWebsiteBuildReproducibility(admin, buildForRepro);
      reproReport.baselineStatus = baseline.status;
      if (baseline.status !== "reproducible") {
        errors.push(`Baseline reproducibility expected reproducible, got ${baseline.status}`);
      }

      const ws = openBuildWorkspace(buildForRepro);
      const translatedPath = `${WEBSITE_STATE_DIR}/ai-translated-model.json`;
      const raw = await ws.readTextFile(translatedPath);
      const tampered = JSON.parse(raw) as Record<string, unknown>;
      tampered.translationHash = "deadbeef".repeat(8);
      await ws.writeTextFile(translatedPath, `${JSON.stringify(tampered, null, 2)}\n`);

      const mismatch = await verifyAiWebsiteBuildReproducibility(admin, buildForRepro);
      reproReport.mismatchDetected = mismatch.status === "mismatched";
      reproReport.mismatchIssues = mismatch.issues;

      await ws.writeTextFile(translatedPath, raw);

      if (!reproReport.mismatchDetected) {
        errors.push("Tampered translation must produce reproducibility mismatch");
      }

      const { observeBuildFactoryBuilds } = await import("@/lib/infinity/build-factory/observe-builds");
      await admin
        .from("builds")
        .update({ status: "review_pending", review_status: "passed" })
        .eq("id", base.buildId);
      await ws.writeTextFile(translatedPath, `${JSON.stringify(tampered, null, 2)}\n`);
      await observeBuildFactoryBuilds(admin, base.organizationId, base.missionId);
      const { data: blockedBuild } = await admin
        .from("builds")
        .select("status")
        .eq("id", base.buildId)
        .maybeSingle();
      reproReport.observeBlockedCompletion = blockedBuild?.status === "blocked";
      await ws.writeTextFile(translatedPath, raw);
      await admin
        .from("builds")
        .update({ status: "internally_complete", review_status: "passed" })
        .eq("id", base.buildId)
        .eq("organization_id", base.organizationId);
      if (!reproReport.observeBlockedCompletion) {
        errors.push("Reproducibility mismatch must block internally_complete observation");
      }
    }
  }

  const contextRevision: AiWebsiteGenerationE2EReport["contextRevision"] = {
    originalPlanId: plan?.id ?? "",
    originalContextHash: plan?.contextHash ?? "",
    originalPlanVersion: plan?.planVersion ?? "",
    originalPlanStructuredPlanUnchanged: false,
    revisedPlanId: "",
    revisedPlanVersion: "",
    revisedContextHash: "",
    priorBuildStatusUnchanged: false,
    priorBuildId: base.buildId,
  };

  if (plan && base.opportunityId) {
    const { data: originalRow } = await admin
      .from("ai_website_generation_plans")
      .select("structured_plan, context_hash, plan_version, status, review_status")
      .eq("id", plan.id)
      .single();

    const { data: buildBefore } = await admin
      .from("builds")
      .select("status, manifest_hash")
      .eq("id", base.buildId)
      .single();

    await admin
      .from("opportunities")
      .update({ summary: `${BUILD_E2E_LABEL} revised context ${Date.now()}` })
      .eq("id", base.opportunityId)
      .eq("organization_id", base.organizationId);

    const build = await loadBuildById(admin, base.organizationId, base.buildId);
    if (build) {
      const revised = await insertRevisedContextPlan(admin, {
        organizationId: base.organizationId,
        missionId: base.missionId,
        build,
        ventureBlueprintId: base.blueprintId,
        correlationId: null,
      });
      contextRevision.revisedPlanId = revised.planId;
      contextRevision.revisedPlanVersion = revised.planVersion;
      contextRevision.revisedContextHash = revised.contextHash;
      const { data: originalAfter } = await admin
        .from("ai_website_generation_plans")
        .select("structured_plan, context_hash, plan_version, status, review_status")
        .eq("id", plan.id)
        .single();

      contextRevision.originalPlanStructuredPlanUnchanged =
        JSON.stringify(originalAfter?.structured_plan) === JSON.stringify(originalRow?.structured_plan) &&
        originalAfter?.context_hash === originalRow?.context_hash &&
        originalAfter?.status === originalRow?.status;

      const { data: buildAfter } = await admin
        .from("builds")
        .select("status, manifest_hash")
        .eq("id", base.buildId)
        .single();
      contextRevision.priorBuildStatusUnchanged =
        buildBefore?.status === buildAfter?.status && buildBefore?.manifest_hash === buildAfter?.manifest_hash;

      if (!revised || revised.planId === plan.id) {
        errors.push("Context revision must create a new generation plan row");
      }
      if (Number.parseInt(revised.planVersion, 10) <= Number.parseInt(plan.planVersion, 10)) {
        errors.push("Revised plan version must increment");
      }
      if (!contextRevision.originalPlanStructuredPlanUnchanged) {
        errors.push("Original approved plan mutated after context revision");
      }
      if (!contextRevision.priorBuildStatusUnchanged) {
        errors.push("Prior website build must not mutate on context revision probe");
      }
    }
  }

  const allowed = ["validation_run:abc"];
  const prohibitedPayload = buildMockWebsiteGenerationPlan({
    buildId: "e2e",
    projectType: "static_website",
    siteName: "Site",
    allowedEvidenceReferenceIds: allowed,
  });
  prohibitedPayload.contentPlan[0]!.content = "We guaranteed 200% growth for all clients.";
  const prohibitedResult = validateWebsiteGenerationPlanPayload(prohibitedPayload, {
    allowedEvidenceReferenceIds: allowed,
  });

  const evidencePayload = buildMockWebsiteGenerationPlan({
    buildId: "e2e",
    projectType: "static_website",
    siteName: "Site",
    allowedEvidenceReferenceIds: allowed,
  });
  evidencePayload.contentPlan[0]!.evidenceReferenceIds = ["00000000-0000-4000-8000-000000000099"];
  const evidenceResult = validateWebsiteGenerationPlanPayload(evidencePayload, {
    allowedEvidenceReferenceIds: allowed,
  });

  if (prohibitedResult.valid) {
    errors.push("Prohibited claim must be rejected");
  }
  if (evidenceResult.valid) {
    errors.push("Unsupported evidence must be rejected");
  }

  const shadowReport: AiWebsiteGenerationE2EReport["shadow"] = {
    mode: "shadow",
    planPersisted: false,
    planId: "",
    approvalPossible: modeAllowsPlanApproval("shadow"),
    translationHash: null,
    translationSkipped: !modeAllowsTranslationToBuild("shadow"),
    workspaceFileCountBefore: 0,
    workspaceFileCountAfter: 0,
    buildId: base.buildId,
  };

  if (base.buildId) {
    const build = await loadBuildById(admin, base.organizationId, base.buildId);
    if (build) {
      const ws = openBuildWorkspace(build);
      shadowReport.workspaceFileCountBefore = (await ws.listWorkspaceFiles()).length;
    }
    const prevMode = process.env.AI_WEBSITE_GENERATION_MODE;
    process.env.AI_WEBSITE_GENERATION_MODE = "shadow";
    process.env.ALLOW_AI_WEBSITE_E2E_AUTO_APPROVE = "false";
    if (build) {
      const shadowInsert = await insertRevisedContextPlan(admin, {
        organizationId: base.organizationId,
        missionId: base.missionId,
        build,
        ventureBlueprintId: base.blueprintId,
        correlationId: null,
      });
      shadowReport.planPersisted = true;
      shadowReport.planId = shadowInsert.planId;
      const { data: shadowRow } = await admin
        .from("ai_website_generation_plans")
        .select("mode, translation_hash")
        .eq("id", shadowInsert.planId)
        .maybeSingle();
      shadowReport.translationHash = shadowRow?.translation_hash ?? null;
    }
    if (build) {
      const ws = openBuildWorkspace(build);
      shadowReport.workspaceFileCountAfter = (await ws.listWorkspaceFiles()).length;
    }
    process.env.AI_WEBSITE_GENERATION_MODE = prevMode ?? "mock";
    process.env.ALLOW_AI_WEBSITE_E2E_AUTO_APPROVE = "true";
    if (shadowReport.workspaceFileCountAfter !== shadowReport.workspaceFileCountBefore) {
      errors.push("Shadow mode must not change website files on context rebuild alone");
    }
    if (shadowReport.approvalPossible) {
      errors.push("Shadow mode must not allow approval");
    }
  }

  const advisoryReport: AiWebsiteGenerationE2EReport["advisory"] = {
    requiresApproval: modeAllowsPlanApproval("advisory"),
    translationBlockedWithoutApproval: !modeAllowsTranslationToBuild("shadow"),
    translationAfterApproval:
      plan?.reviewStatus === "approved" && Boolean(plan.translationHash),
  };

  return {
    ...base,
    pass: errors.length === 0 && base.pass,
    errors: [...errors, ...base.errors.filter((e) => !errors.includes(e))],
    aiPlanId: plan?.id ?? "",
    planVersion: plan?.planVersion ?? "",
    provider: plan?.provider ?? "",
    model: plan?.model ?? "",
    mode: plan?.mode ?? mode,
    contextHash: plan?.contextHash ?? "",
    outputHash: plan?.outputHash ?? null,
    pagePlanCount: plan?.structuredPlan?.pagePlans?.length ?? 0,
    contentRecordCount: plan?.structuredPlan?.contentPlan?.length ?? 0,
    translationHash: plan?.translationHash ?? null,
    expectedTaskCount: expected,
    initial: {
      planCount: initialCounts.planCount,
      approvalEventCount: initialCounts.approvalEventCount,
      translationEventCount: initialCounts.translationEventCount,
      reviewRequestEventCount: initialCounts.reviewRequestEventCount,
    },
    duplicate: duplicateReport,
    contextRevision,
    prohibitedClaim: { rejected: !prohibitedResult.valid, issues: prohibitedResult.issues },
    unsupportedEvidence: { rejected: !evidenceResult.valid, issues: evidenceResult.issues },
    shadow: shadowReport,
    advisory: advisoryReport,
    reproducibility: reproReport,
    externalSideEffectsUnchanged: base.externalCountsUnchanged,
  };
}
