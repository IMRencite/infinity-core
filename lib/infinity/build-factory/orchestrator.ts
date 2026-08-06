import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { requestBuildFactory } from "./factory";
import type { BuildFactoryRequestInput, BuildFactoryRequestResult } from "./types";
import { evaluateBuildFactoryRuntimeV2Gates, loadExecutiveDecisionIdForBuild } from "./runtime-gates-v2";
import { resolveBuilderForBuildRequest } from "./builder-resolution";
import {
  buildJobIdempotencyKey,
  findBuildJobByIdempotencyKey,
  insertBuildJob,
  buildJobInsertPayload,
  loadBuildJobByBuildId,
  updateBuildJobStatus,
} from "./persistence-v2";
import type { GenericBuildJob } from "./build-job";
import { BUILD_FACTORY_V2_EVENTS } from "./build-job";
import { emitBuildFactoryEvent } from "./events";
import { assertZeroCostBuild } from "./budgets";
import { persistBlockedBuildAttempt } from "./policies";
import { BUILD_SPECIFICATION_SCHEMA_VERSION } from "./constants";
import type { BuildTaskNode } from "./types";
import { appendGenericQaPlanStep } from "./runtime-v2-tasks";
import { verifyBuildReproducibility } from "./reproducibility";

export type BuildFactoryRuntimeV2Result =
  | {
      status: "created" | "reused";
      buildJob: GenericBuildJob;
      buildId: string;
      builderKey: string;
      builderVersion: string;
      tasks: BuildTaskNode[];
      factory: BuildFactoryRequestResult;
    }
  | { status: "blocked"; reason: string; classification: string; buildJobId?: string };

async function emitV2(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    eventType: string;
    message: string;
    correlationId: string;
    buildId: string;
    buildJobId?: string;
    payload?: Record<string, unknown>;
  },
) {
  await emitBuildFactoryEvent(admin, {
    organizationId: input.organizationId,
    eventType: input.eventType,
    message: input.message,
    correlationId: input.correlationId,
    buildId: input.buildId,
    payload: {
      build_job_id: input.buildJobId,
      ...input.payload,
    },
  });
}

/**
 * Generic Build Factory Runtime v2 orchestrator.
 * Does not execute tasks, generate source, or advance Mission Runtime.
 */
export async function requestBuildFactoryRuntimeV2(
  admin: AdminSupabaseClient,
  input: BuildFactoryRequestInput,
): Promise<BuildFactoryRuntimeV2Result> {
  assertZeroCostBuild();

  const gates = await evaluateBuildFactoryRuntimeV2Gates(admin, input);
  if (!gates.allowed) {
    const blockedBuildId = await persistBlockedBuildAttempt(admin, {
      ...input,
      reason: gates.reason,
      classification: gates.classification,
    });
    await emitBuildFactoryEvent(admin, {
      organizationId: input.organizationId,
      eventType: BUILD_FACTORY_V2_EVENTS.jobBlocked,
      message: gates.reason,
      correlationId: input.correlationId,
      buildId: blockedBuildId,
      payload: { classification: gates.classification },
      severity: "warning",
    });
    return {
      status: "blocked",
      reason: gates.reason,
      classification: gates.classification,
    };
  }

  const executiveDecisionId = await loadExecutiveDecisionIdForBuild(
    admin,
    input.organizationId,
    input.missionId,
  );
  if (!executiveDecisionId) {
    return {
      status: "blocked",
      reason: "Executive decision ID required.",
      classification: "executive_ineligible",
    };
  }

  const factoryResult = await requestBuildFactory(admin, input);
  if (factoryResult.status === "blocked") {
    return {
      status: "blocked",
      reason: factoryResult.reason,
      classification: factoryResult.classification,
    };
  }

  const build = factoryResult.build;
  const resolution = await resolveBuilderForBuildRequest(admin, {
    projectType: build.projectType,
    specificationVersion: BUILD_SPECIFICATION_SCHEMA_VERSION,
    approvedCapabilities: build.specification.approvedCapabilities ?? [],
  });

  if (resolution.status !== "resolved") {
    await emitV2(admin, {
      organizationId: input.organizationId,
      eventType: BUILD_FACTORY_V2_EVENTS.builderUnsupported,
      message: resolution.explanation,
      correlationId: input.correlationId,
      buildId: build.id,
      payload: { blockers: resolution.policyBlockers },
    });
    return {
      status: "blocked",
      reason: resolution.explanation,
      classification: resolution.status,
    };
  }

  const idempotencyKey = buildJobIdempotencyKey({
    organizationId: input.organizationId,
    missionId: input.missionId,
    executiveDecisionId,
    planId: input.planId,
    ventureBlueprintId: input.ventureBlueprintId,
    specificationHash: build.specificationHash,
    builderKey: resolution.builderKey,
    builderVersion: resolution.builderVersion,
  });

  const existingJob = await findBuildJobByIdempotencyKey(
    admin,
    input.organizationId,
    idempotencyKey,
  );

  const tasks = resolution.plugin.describeLifecycleTasks({
    buildId: build.id,
    buildJobId: existingJob?.id ?? "pending",
    organizationId: input.organizationId,
    missionId: input.missionId,
    projectType: build.projectType,
    aiGenerationEnabled: build.specification.aiWebsiteGeneration?.enabled ?? false,
  });

  if (existingJob) {
    await emitV2(admin, {
      organizationId: input.organizationId,
      eventType: BUILD_FACTORY_V2_EVENTS.executionReused,
      message: "Build Factory v2 job reused",
      correlationId: input.correlationId,
      buildId: existingJob.buildId ?? build.id,
      buildJobId: existingJob.id,
    });
    return {
      status: "reused",
      buildJob: existingJob,
      buildId: existingJob.buildId ?? build.id,
      builderKey: resolution.builderKey,
      builderVersion: resolution.builderVersion,
      tasks,
      factory: factoryResult,
    };
  }

  const linked = await loadBuildJobByBuildId(admin, input.organizationId, build.id);
  if (linked) {
    return {
      status: "reused",
      buildJob: linked,
      buildId: build.id,
      builderKey: linked.builderKey,
      builderVersion: linked.builderVersion,
      tasks,
      factory: factoryResult,
    };
  }

  const buildJob = await insertBuildJob(
    admin,
    buildJobInsertPayload({
      organizationId: input.organizationId,
      missionId: input.missionId,
      runtimeInstanceId: input.runtimeInstanceId,
      opportunityId: input.opportunityId,
      ventureBlueprintId: input.ventureBlueprintId,
      executiveDecisionId,
      planId: input.planId,
      allocationProposalId: input.allocationProposalId,
      buildId: build.id,
      builderKey: resolution.builderKey,
      builderVersion: resolution.builderVersion,
      projectType: build.projectType,
      specificationHash: build.specificationHash,
      manifestHash: build.manifestHash,
      workspaceReference: build.workspaceReference,
      idempotencyKey,
      correlationId: input.correlationId,
      approvedCapabilities: build.specification.approvedCapabilities ?? [],
    }),
  );

  await appendGenericQaPlanStep(admin, {
    organizationId: input.organizationId,
    planId: input.planId,
    buildId: build.id,
    buildJobId: buildJob.id,
    missionId: input.missionId,
    opportunityId: input.opportunityId,
  });

  const repro = await verifyBuildReproducibility(build).catch(() => ({
    status: "incomplete" as const,
    details: [],
  }));

  await updateBuildJobStatus(admin, input.organizationId, buildJob.id, "review_pending", {
    lifecycle_stage: "review_pending",
    reproducibility_status: repro.status,
    workspace_id: build.workspaceReference,
  });

  await emitV2(admin, {
    organizationId: input.organizationId,
    eventType: BUILD_FACTORY_V2_EVENTS.jobRequested,
    message: "Build Factory v2 job requested",
    correlationId: input.correlationId,
    buildId: build.id,
    buildJobId: buildJob.id,
  });

  await emitV2(admin, {
    organizationId: input.organizationId,
    eventType: BUILD_FACTORY_V2_EVENTS.builderResolved,
    message: resolution.explanation,
    correlationId: input.correlationId,
    buildId: build.id,
    buildJobId: buildJob.id,
    payload: {
      builder_key: resolution.builderKey,
      builder_version: resolution.builderVersion,
    },
  });

  await emitV2(admin, {
    organizationId: input.organizationId,
    eventType: BUILD_FACTORY_V2_EVENTS.workspaceReady,
    message: "Workspace reference assigned",
    correlationId: input.correlationId,
    buildId: build.id,
    buildJobId: buildJob.id,
    payload: { workspace_id: build.workspaceReference },
  });

  await emitV2(admin, {
    organizationId: input.organizationId,
    eventType: BUILD_FACTORY_V2_EVENTS.lifecycleStarted,
    message: "Builder lifecycle task graph persisted via Scheduler",
    correlationId: input.correlationId,
    buildId: build.id,
    buildJobId: buildJob.id,
    payload: { task_count: tasks.length },
  });

  return {
    status: factoryResult.status === "reused" ? "reused" : "created",
    buildJob,
    buildId: build.id,
    builderKey: resolution.builderKey,
    builderVersion: resolution.builderVersion,
    tasks,
    factory: factoryResult,
  };
}
