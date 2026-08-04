import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { BuildFactoryRequestInput, BuildFactoryRequestResult, PersistedBuild } from "./types";
import { evaluateBuildFactoryGates, persistBlockedBuildAttempt } from "./policies";
import { buildIdempotencyKey, createBuildSpecification, deriveDeterministicBuildId } from "./specifications";
import { buildManifestForSpecification } from "./manifests";
import { buildTaskGraph } from "./task-graph";
import { deriveWorkspaceReferenceForBuild, mapBuildRow } from "./workspace";
import { emitBuildFactoryEvent } from "./events";
import { assertZeroCostBuild } from "./budgets";
import { createBuildPlanSteps } from "./tasks";

export async function findBuildByIdempotencyKey(
  admin: AdminSupabaseClient,
  organizationId: string,
  idempotencyKey: string,
): Promise<PersistedBuild | null> {
  const { data, error } = await admin
    .from("builds")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapBuildRow(data as Record<string, unknown>);
}

async function loadBlueprint(
  admin: AdminSupabaseClient,
  organizationId: string,
  ventureBlueprintId: string,
) {
  const { data, error } = await admin
    .from("venture_blueprints")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", ventureBlueprintId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: String(data.id),
    organizationId: String(data.organization_id),
    opportunityId: String(data.opportunity_id),
    ventureType: String(data.venture_type),
    templateKey: String(data.template_key),
    templateVersion: String(data.template_version),
    schemaVersion: String(data.schema_version),
    status: String(data.status),
    blueprint: data.blueprint,
    idempotencyKey: String(data.idempotency_key),
    createdAt: String(data.created_at),
  } as import("@/lib/infinity/venture-factory/types/blueprint").PersistedVentureBlueprint;
}

export async function requestBuildFactory(
  admin: AdminSupabaseClient,
  input: BuildFactoryRequestInput,
): Promise<BuildFactoryRequestResult> {
  assertZeroCostBuild();

  const gates = await evaluateBuildFactoryGates(admin, input);
  if (!gates.allowed) {
    const buildId = await persistBlockedBuildAttempt(admin, {
      ...input,
      reason: gates.reason,
      classification: gates.classification,
    });
    return {
      status: "blocked",
      reason: gates.reason,
      classification: gates.classification,
      buildId,
    };
  }

  const blueprint = await loadBlueprint(admin, input.organizationId, input.ventureBlueprintId);
  if (!blueprint) {
    return {
      status: "blocked",
      reason: "Venture blueprint not found.",
      classification: "blueprint_missing",
    };
  }

  const buildVersion = "1";
  const buildId = deriveDeterministicBuildId({
    organizationId: input.organizationId,
    missionId: input.missionId,
    ventureBlueprintId: input.ventureBlueprintId,
    planId: input.planId,
    buildVersion,
  });

  const specification = createBuildSpecification({
    request: input,
    blueprint,
    buildId,
    buildVersion,
  });

  if (specification.status === "unsupported_for_build_v1") {
    const blockedId = await persistBlockedBuildAttempt(admin, {
      ...input,
      reason: `Project type ${specification.projectType} is unsupported_for_build_v1`,
      classification: "unsupported_project_type",
    });
    return {
      status: "blocked",
      reason: `Unsupported project type for build v1: ${specification.projectType}`,
      classification: "unsupported_project_type",
      buildId: blockedId,
    };
  }

  const idempotencyKey = buildIdempotencyKey({
    organizationId: input.organizationId,
    missionId: input.missionId,
    ventureBlueprintId: input.ventureBlueprintId,
    planId: input.planId,
    buildVersion: specification.buildVersion,
    specificationHash: specification.specificationHash,
  });

  const existing = await findBuildByIdempotencyKey(
    admin,
    input.organizationId,
    idempotencyKey,
  );
  if (existing) {
    const tasks = buildTaskGraph(
      existing.id,
      input.organizationId,
      input.missionId,
      existing.projectType,
      existing.specification.aiWebsiteGeneration?.enabled ?? false,
    );
    return { status: "reused", build: existing, tasks };
  }

  const workspaceReference = deriveWorkspaceReferenceForBuild(
    input.organizationId,
    input.missionId,
    buildId,
  );

  const tasks = buildTaskGraph(
    buildId,
    input.organizationId,
    input.missionId,
    specification.projectType,
    specification.aiWebsiteGeneration?.enabled ?? false,
  );
  const manifest = buildManifestForSpecification(specification, buildId, workspaceReference);

  const { data: inserted, error } = await admin
    .from("builds")
    .insert({
      id: buildId,
      organization_id: input.organizationId,
      mission_id: input.missionId,
      runtime_instance_id: input.runtimeInstanceId,
      opportunity_id: input.opportunityId,
      venture_blueprint_id: input.ventureBlueprintId,
      plan_id: input.planId,
      allocation_proposal_id: input.allocationProposalId,
      project_type: specification.projectType,
      template_key: specification.templateKey,
      template_version: specification.templateVersion,
      build_version: specification.buildVersion,
      specification_version: specification.buildVersion,
      status: "manifest_ready",
      specification: specification as unknown as Json,
      specification_hash: specification.specificationHash,
      manifest: manifest as unknown as Json,
      manifest_hash: manifest.manifestHash,
      workspace_reference: workspaceReference,
      review_status: "pending",
      idempotency_key: idempotencyKey,
      correlation_id: input.correlationId,
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !inserted) {
    if (error?.code === "23505") {
      const retry = await findBuildByIdempotencyKey(
        admin,
        input.organizationId,
        idempotencyKey,
      );
      if (retry) {
        return { status: "reused", build: retry, tasks };
      }
    }
    throw new Error(error?.message ?? "Failed to create build record");
  }

  const build = mapBuildRow(inserted as Record<string, unknown>);

  await emitBuildFactoryEvent(admin, {
    organizationId: input.organizationId,
    eventType: "build.requested",
    message: "Build factory request accepted",
    correlationId: input.correlationId,
    buildId: build.id,
  });

  await emitBuildFactoryEvent(admin, {
    organizationId: input.organizationId,
    eventType: "build.specification_created",
    message: "Build specification created",
    correlationId: input.correlationId,
    buildId: build.id,
    payload: {
      specification_hash: specification.specificationHash,
      template_key: specification.templateKey,
      template_version: specification.templateVersion,
    },
  });

  await emitBuildFactoryEvent(admin, {
    organizationId: input.organizationId,
    eventType: "build.manifest_created",
    message: "Build manifest created",
    correlationId: input.correlationId,
    buildId: build.id,
    payload: { manifest_hash: manifest.manifestHash },
  });

  await createBuildPlanSteps(admin, {
    organizationId: input.organizationId,
    planId: input.planId,
    build,
    tasks,
    opportunityId: input.opportunityId,
    missionId: input.missionId,
  });

  return { status: "created", build, tasks };
}
