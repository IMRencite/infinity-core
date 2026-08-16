import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { loadVentureAssemblyById } from "@/lib/infinity/venture-assembly/persistence";
import { resolveActionType, classifyRisk } from "./action-registry";
import { credentialRequirementForScope } from "./credentials";
import {
  externalActionIdempotencyKey,
  stablePayloadHash,
} from "./idempotency";
import {
  findExternalActionByIdempotency,
  findLaunchPlanByIdempotency,
  insertExternalAction,
  insertLaunchPlan,
  listLaunchPlanActions,
} from "./persistence";
import { emitLaunchGatewayEvent } from "./events";
import { LAUNCH_GATEWAY_EVENTS, LAUNCH_PLAN_SCHEMA_VERSION } from "./constants";
import { PROVIDER_KEYS } from "./provider-config";
import { resolveApprovedRepositoryName } from "@/lib/infinity/production-artifact/repository-naming";
import {
  validateBuildSnapshotForExternalDeploy,
  validateProductionArtifactForExternalDeploy,
} from "./build-snapshot-gate";
import { hashPayloadManifest } from "./resource-registry";

export function liveLaunchPlanIdempotencyKey(input: {
  organizationId: string;
  ventureAssemblyId: string;
  assemblyVersion: number;
}): string {
  return [
    "launch_plan_live",
    input.organizationId,
    input.ventureAssemblyId,
    String(input.assemblyVersion),
  ].join(":");
}

export type LiveLaunchPlanStep = {
  actionType: string;
  provider: string;
  adapterKey: string;
  target: string;
  sequenceOrder: number;
  dependsOnSequence: number | null;
  payload: Record<string, unknown>;
  payloadHash: string;
  idempotencyKey: string;
};

export function buildLiveLaunchPlanSteps(input: {
  organizationId: string;
  ventureAssemblyId: string;
  assemblyVersion: number;
  launchPlanVersion: number;
  repoSlug: string;
  buildId: string;
  buildSnapshotId: string;
  productionArtifactId: string;
  artifactHash: string;
  ownerLogin: string;
  reconciliation?: {
    repositoryFullName?: string;
    existingProjectId?: string;
    omitRepositoryCreate?: boolean;
    omitHostingCreateProject?: boolean;
    linkExistingVercelProjectId?: string;
  };
}): LiveLaunchPlanStep[] {
  const repoName = resolveApprovedRepositoryName(input.repoSlug).repoName;
  const projectName = resolveApprovedRepositoryName(`hosting-${input.repoSlug}`).repoName;
  const repositoryFullName =
    input.reconciliation?.repositoryFullName ?? `${input.ownerLogin}/${repoName}`;

  type Spec = {
    actionType: string;
    provider: string;
    adapterKey: string;
    target: string;
    sequenceOrder: number;
    dependsOnSequence: number | null;
    payload: Record<string, unknown>;
  };

  const specs: Spec[] = [];
  let seq = 0;
  const nextSeq = () => {
    seq += 1;
    return seq;
  };

  if (!input.reconciliation?.omitRepositoryCreate) {
    specs.push({
      actionType: "repository.create",
      provider: PROVIDER_KEYS.github,
      adapterKey: PROVIDER_KEYS.github,
      target: repoName,
      sequenceOrder: nextSeq(),
      dependsOnSequence: null,
      payload: {
        build_id: input.buildId,
        build_snapshot_id: input.buildSnapshotId,
        production_artifact_id: input.productionArtifactId,
        artifact_hash: input.artifactHash,
        content_hash: input.artifactHash,
        venture_assembly_id: input.ventureAssemblyId,
      },
    });
  }

  const pushDepends = input.reconciliation?.omitRepositoryCreate ? null : 1;
  specs.push({
    actionType: "repository.push",
    provider: PROVIDER_KEYS.github,
    adapterKey: PROVIDER_KEYS.github,
    target: repoName,
    sequenceOrder: nextSeq(),
    dependsOnSequence: pushDepends,
    payload: {
      repository_full_name: repositoryFullName,
      build_id: input.buildId,
      build_snapshot_id: input.buildSnapshotId,
      production_artifact_id: input.productionArtifactId,
      artifact_hash: input.artifactHash,
      content_hash: input.artifactHash,
      branch: "main",
    },
  });

  const pushSeq = specs.find((s) => s.actionType === "repository.push")!.sequenceOrder;

  if (!input.reconciliation?.omitHostingCreateProject) {
    const createPayload: Record<string, unknown> = {
      repository_full_name: repositoryFullName,
      build_id: input.buildId,
      build_snapshot_id: input.buildSnapshotId,
      production_artifact_id: input.productionArtifactId,
      artifact_hash: input.artifactHash,
      deployment_mode: "git_integrated",
    };
    if (input.reconciliation?.linkExistingVercelProjectId) {
      createPayload.link_existing_project_id = input.reconciliation.linkExistingVercelProjectId;
      createPayload.configure_git_link = true;
    }
    specs.push({
      actionType: "hosting.create_project",
      provider: PROVIDER_KEYS.vercel,
      adapterKey: PROVIDER_KEYS.vercel,
      target: projectName,
      sequenceOrder: nextSeq(),
      dependsOnSequence: pushSeq,
      payload: createPayload,
    });
  }

  const deployDepends =
    input.reconciliation?.omitHostingCreateProject
      ? pushSeq
      : specs.find((s) => s.actionType === "hosting.create_project")!.sequenceOrder;

  const deployPayload: Record<string, unknown> = {
    project_name: projectName,
    repository_full_name: repositoryFullName,
    build_id: input.buildId,
    build_snapshot_id: input.buildSnapshotId,
    production_artifact_id: input.productionArtifactId,
    artifact_hash: input.artifactHash,
    content_hash: input.artifactHash,
    deployment_mode: "git_integrated",
    branch: "main",
    target: "production",
  };
  if (input.reconciliation?.existingProjectId) {
    deployPayload.project_id = input.reconciliation.existingProjectId;
  }

  specs.push({
    actionType: "hosting.deploy",
    provider: PROVIDER_KEYS.vercel,
    adapterKey: PROVIDER_KEYS.vercel,
    target: projectName,
    sequenceOrder: nextSeq(),
    dependsOnSequence: deployDepends,
    payload: deployPayload,
  });

  const deploySeq = specs.find((s) => s.actionType === "hosting.deploy")!.sequenceOrder;

  specs.push({
    actionType: "hosting.verify_deployment",
    provider: PROVIDER_KEYS.vercel,
    adapterKey: PROVIDER_KEYS.vercel,
    target: projectName,
    sequenceOrder: nextSeq(),
    dependsOnSequence: deploySeq,
    payload: {
      project_name: projectName,
      repository_full_name: repositoryFullName,
      build_id: input.buildId,
      build_snapshot_id: input.buildSnapshotId,
      production_artifact_id: input.productionArtifactId,
      artifact_hash: input.artifactHash,
      content_hash: input.artifactHash,
    },
  });

  return specs.map((s) => {
    const payloadHash = stablePayloadHash(s.payload);
    return {
      ...s,
      payloadHash,
      idempotencyKey: externalActionIdempotencyKey({
        organizationId: input.organizationId,
        ventureAssemblyId: input.ventureAssemblyId,
        assemblyVersion: input.assemblyVersion,
        launchPlanVersion: input.launchPlanVersion,
        actionType: s.actionType,
        target: s.target,
        payloadHash,
      }),
    };
  });
}

export async function ensureLiveLaunchPlanForAssembly(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string;
    ventureAssemblyId: string;
    ownerLogin: string;
    repoSlug: string;
    correlationId?: string | null;
    planKeySuffix?: string;
    launchReconciliation?: {
      repositoryFullName?: string;
      existingProjectId?: string;
      omitRepositoryCreate?: boolean;
      omitHostingCreateProject?: boolean;
      linkExistingVercelProjectId?: string;
    };
  },
): Promise<{
  launchPlanId: string;
  reused: boolean;
  steps: LiveLaunchPlanStep[];
  actionIds: string[];
}> {
  const assembly = await loadVentureAssemblyById(
    admin,
    input.organizationId,
    input.ventureAssemblyId,
  );
  if (!assembly) throw new Error("Venture assembly not found");
  if (assembly.status !== "internally_ready") {
    throw new Error("Assembly not internally_ready");
  }
  if (!assembly.buildId || !assembly.buildSnapshotId) {
    throw new Error("Assembly missing build snapshot");
  }

  const { data: assemblyRow } = await admin
    .from("venture_assemblies")
    .select("production_artifact_id")
    .eq("id", input.ventureAssemblyId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  const productionArtifactId = assemblyRow?.production_artifact_id
    ? String(assemblyRow.production_artifact_id)
    : assembly.productionArtifactId;

  const artifactGate = await validateProductionArtifactForExternalDeploy(admin, {
    organizationId: input.organizationId,
    ventureAssemblyId: input.ventureAssemblyId,
    productionArtifactId,
    buildSnapshotId: assembly.buildSnapshotId,
  });
  if (!artifactGate.valid || !artifactGate.contentHash) {
    throw new Error(`Production artifact invalid: ${artifactGate.reasons.join(",")}`);
  }

  const snap = await validateBuildSnapshotForExternalDeploy(admin, {
    organizationId: input.organizationId,
    buildId: assembly.buildId,
    buildSnapshotId: assembly.buildSnapshotId,
  });
  if (!snap.valid) {
    throw new Error(`Build snapshot invalid: ${snap.reasons.join(",")}`);
  }

  const planKey = [
    liveLaunchPlanIdempotencyKey({
      organizationId: input.organizationId,
      ventureAssemblyId: input.ventureAssemblyId,
      assemblyVersion: assembly.assemblyVersion,
    }),
    input.planKeySuffix,
  ]
    .filter(Boolean)
    .join(":");

  const existing = await findLaunchPlanByIdempotency(admin, input.organizationId, planKey);
  const planVersion = 1;

  const steps = buildLiveLaunchPlanSteps({
    organizationId: input.organizationId,
    ventureAssemblyId: input.ventureAssemblyId,
    assemblyVersion: assembly.assemblyVersion,
    launchPlanVersion: planVersion,
    repoSlug: input.repoSlug,
    buildId: assembly.buildId,
    buildSnapshotId: assembly.buildSnapshotId,
    productionArtifactId: productionArtifactId!,
    artifactHash: artifactGate.contentHash,
    ownerLogin: input.ownerLogin,
    reconciliation: input.launchReconciliation,
  });

  let launchPlanId: string;
  if (existing) {
    launchPlanId = existing.id;
    const actions = await listLaunchPlanActions(admin, input.organizationId, launchPlanId);
    return {
      launchPlanId,
      reused: true,
      steps,
      actionIds: actions.map((a) => a.id),
    };
  }

  const plan = await insertLaunchPlan(admin, {
    organization_id: input.organizationId,
    mission_id: input.missionId,
    venture_assembly_id: input.ventureAssemblyId,
    company_id: assembly.companyId,
    plan_version: planVersion,
    assembly_version: assembly.assemblyVersion,
    schema_version: LAUNCH_PLAN_SCHEMA_VERSION,
    status: "awaiting_approval",
    launch_readiness: "awaiting_external_approval",
    estimated_total_cost: 0,
    idempotency_key: planKey,
    correlation_id: input.correlationId ?? null,
    dependency_graph: { steps: steps.length, mode: "live_provider_v1" } as Json,
  });
  launchPlanId = plan.id;

  await emitLaunchGatewayEvent(admin, {
    organizationId: input.organizationId,
    eventType: LAUNCH_GATEWAY_EVENTS.launchPlanCreated,
    message: "Live provider launch plan prepared (awaiting approval)",
    missionId: input.missionId,
    launchPlanId,
  });

  const actionIds: string[] = [];
  const sequenceToId = new Map<number, string>();

  for (const step of steps) {
    const def = resolveActionType(step.actionType);
    if (!def) throw new Error(`Unknown action ${step.actionType}`);

    const dup = await findExternalActionByIdempotency(
      admin,
      input.organizationId,
      step.idempotencyKey,
    );
    if (dup) {
      actionIds.push(dup.id);
      sequenceToId.set(step.sequenceOrder, dup.id);
      continue;
    }

    const dependsOn =
      step.dependsOnSequence != null
        ? sequenceToId.get(step.dependsOnSequence) ?? null
        : null;

    const row = await insertExternalAction(admin, {
      organization_id: input.organizationId,
      mission_id: input.missionId,
      venture_id: assembly.companyId,
      venture_assembly_id: input.ventureAssemblyId,
      launch_plan_id: launchPlanId,
      plan_execution_id: assembly.planExecutionId,
      action_type: step.actionType,
      provider: step.provider,
      adapter_key: step.adapterKey,
      target: step.target,
      payload_manifest: step.payload as Json,
      side_effect_class: def.sideEffectClass,
      risk_class: classifyRisk(def, def.estimatedCostUsd),
      estimated_cost: def.estimatedCostUsd ?? 0,
      credential_requirement: credentialRequirementForScope(def.credentialScope) as Json,
      credential_status: "env_reference",
      execution_status: "awaiting_approval",
      execution_mode: "live",
      approval_status: "pending",
      approval_policy: "autonomous_or_human_v1",
      build_id: assembly.buildId,
      build_snapshot_id: assembly.buildSnapshotId,
      approved_payload_hash: hashPayloadManifest(step.payload),
      idempotency_key: step.idempotencyKey,
      correlation_id: input.correlationId ?? null,
      sequence_order: step.sequenceOrder,
      depends_on_action_id: dependsOn,
      rollback_supported: def.supportsRollback,
      policy_version: "launch_gateway_policy_v1",
    });

    actionIds.push(row.id);
    sequenceToId.set(step.sequenceOrder, row.id);

    await emitLaunchGatewayEvent(admin, {
      organizationId: input.organizationId,
      eventType: LAUNCH_GATEWAY_EVENTS.externalActionAwaitingApproval,
      message: `Live action awaiting approval: ${step.actionType}`,
      missionId: input.missionId,
      launchPlanId,
      externalActionId: row.id,
    });
  }

  return { launchPlanId, reused: false, steps, actionIds };
}
