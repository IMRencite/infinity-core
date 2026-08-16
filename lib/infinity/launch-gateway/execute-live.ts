import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { resolveActionType, classifyRisk } from "./action-registry";
import { evaluateActionCost, evaluateExternalActionPolicy } from "./policy";
import {
  claimExternalAction,
  loadExternalAction,
  updateExternalAction,
} from "./persistence";
import { emitLaunchGatewayEvent } from "./events";
import { LAUNCH_GATEWAY_EVENTS, LAUNCH_GATEWAY_POLICY_VERSION, MOCK_PROVIDER_KEY } from "./constants";
import { evaluateLiveProviderGates, resolveCredentialFromEnv, resolveProviderForAction } from "./provider-gates";
import { LIVE_PROVIDER_ACTIONS, type LiveProviderAction } from "./provider-config";
import { resolveAdapter, adapterSupportsAction } from "./adapters/registry";
import {
  validateBuildSnapshotForExternalDeploy,
  validateProductionArtifactForExternalDeploy,
} from "./build-snapshot-gate";
import { resolveExecutionAuthorization } from "./autonomous-authorization/resolve-authorization";
import { loadVentureAssemblyById } from "@/lib/infinity/venture-assembly/persistence";
import { redactUnknown, assertNoSecretsInPayload } from "./redaction";
import {
  prepareArtifactForExternalExecution,
  insertLaunchHandoffLink,
} from "@/lib/infinity/production-artifact/launch-readiness";
import { evaluateAndPersistVercelReadinessForArtifact } from "@/lib/infinity/production-artifact/inspect-vercel-deployment";
import { VERCEL_V1_DEPLOYMENT_MODE } from "@/lib/infinity/production-artifact/constants";
import { enrichExternalActionPayloadFromDependencies } from "./payload-enrichment";
import { verifyLiveHttp } from "@/lib/infinity/production-artifact/deployment-lifecycle";
import {
  resourceIdempotencyKey,
  upsertExternalResource,
  findResourceByIdempotency,
} from "./resource-registry";
import { incrementProviderMetric } from "./metrics";

const MAX_LIVE_BUDGET_USD = 100;

export type GatewayLiveExecuteResult = {
  externalActionId: string;
  executionStatus: string;
  executionMode: "live";
  verified: boolean;
  blocked: boolean;
  reasons: string[];
};

export async function executeExternalActionViaGateway(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string;
    externalActionId: string;
    liveApprovalId?: string | null;
    requestingCapabilityKey: string;
    grantedExternalPermissions: string[];
    workerResultId?: string | null;
    correlationId?: string | null;
  },
): Promise<GatewayLiveExecuteResult> {
  incrementProviderMetric("live_actions_requested");

  const action = await loadExternalAction(admin, input.organizationId, input.externalActionId);
  if (!action) throw new Error("External action not found");
  if (action.missionId !== input.missionId) {
    throw new Error("Organization isolation: mission mismatch");
  }

  if (!LIVE_PROVIDER_ACTIONS.includes(action.actionType as LiveProviderAction)) {
    incrementProviderMetric("live_actions_blocked");
    return {
      externalActionId: action.id,
      executionStatus: "blocked",
      executionMode: "live",
      verified: false,
      blocked: true,
      reasons: ["action_outside_v1_live_scope"],
    };
  }

  const adapterKey = resolveProviderForAction(action.actionType) ?? MOCK_PROVIDER_KEY;

  const { data: fullRow } = await admin
    .from("external_actions")
    .select("*")
    .eq("id", action.id)
    .single();

  const payload = (fullRow?.payload_manifest as Record<string, unknown>) ?? {};
  assertNoSecretsInPayload(payload);

  const assembly = action.ventureAssemblyId
    ? await loadVentureAssemblyById(admin, input.organizationId, action.ventureAssemblyId)
    : null;

  const buildId = fullRow?.build_id ?? assembly?.buildId ?? null;
  const buildSnapshotId = fullRow?.build_snapshot_id ?? assembly?.buildSnapshotId ?? null;

  let buildSnapshotValid = true;
  let productionArtifactValid = true;
  let vercelDeploymentReadinessValid = true;
  const productionArtifactId =
    (fullRow?.production_artifact_id as string | null) ??
    assembly?.productionArtifactId ??
    (payload.production_artifact_id as string | undefined) ??
    null;

  if (
    action.actionType === "repository.push" ||
    action.actionType === "hosting.deploy"
  ) {
    if (!buildId || !buildSnapshotId) {
      buildSnapshotValid = false;
      productionArtifactValid = false;
    } else {
      const snap = await validateBuildSnapshotForExternalDeploy(admin, {
        organizationId: input.organizationId,
        buildId,
        buildSnapshotId,
      });
      buildSnapshotValid = snap.valid;

      const approvedHash = String(
        payload.content_hash ?? payload.artifact_hash ?? payload.snapshot_hash ?? "",
      );
      const artifactGate = await validateProductionArtifactForExternalDeploy(admin, {
        organizationId: input.organizationId,
        ventureAssemblyId: action.ventureAssemblyId ?? assembly?.id ?? "",
        productionArtifactId,
        buildSnapshotId,
        approvedArtifactHash: approvedHash || null,
      });
      productionArtifactValid = artifactGate.valid;
      if (artifactGate.contentHash) {
        payload.content_hash = artifactGate.contentHash;
        payload.artifact_hash = artifactGate.contentHash;
      }
      if (productionArtifactId) {
        payload.production_artifact_id = productionArtifactId;
      }
    }
  }

  const def = resolveActionType(action.actionType);
  const permissionOk =
    !def?.requiredPermission ||
    input.grantedExternalPermissions.includes(def.requiredPermission);

  const costEval = evaluateActionCost({
    estimatedCost: null,
    registryDefault: def?.estimatedCostUsd ?? null,
    maxAuthorizedCost: MAX_LIVE_BUDGET_USD,
  });

  const policy = evaluateExternalActionPolicy({
    organizationId: input.organizationId,
    actionType: action.actionType,
    actionDef: def,
    sideEffectClass: def?.sideEffectClass ?? null,
    riskClass: def ? classifyRisk(def, costEval.estimatedCost) : null,
    estimatedCost: costEval.estimatedCost,
    maxAuthorizedCost: MAX_LIVE_BUDGET_USD,
    capabilityPermissionGranted: permissionOk,
    assemblyInternallyReady: assembly?.status === "internally_ready",
    intent: "execute",
  });

  const policyAllowsExecute = policy.outcome === "execution_eligible";

  const authResolution = await resolveExecutionAuthorization(admin, {
    organizationId: input.organizationId,
    externalActionId: action.id,
    liveApprovalId: input.liveApprovalId ?? null,
    payloadManifest: payload,
    approvalKind: "execute_external",
  });
  const approvalAllows = authResolution.authorized;

  if (action.dependsOnActionId) {
    await enrichExternalActionPayloadFromDependencies(admin, input.organizationId, action, payload);
    let depId: string | null = action.dependsOnActionId;
    while (depId) {
      const dep = await loadExternalAction(admin, input.organizationId, depId);
      if (!dep) break;
      const depManifest = dep.resultManifest ?? {};
      const depIds = (depManifest.external_ids ?? depManifest) as Record<string, string>;
      if (dep.executionStatus === "succeeded" && dep.actionType === "repository.push") {
        const pushIds = (dep.resultManifest?.external_ids ?? dep.resultManifest ?? {}) as Record<
          string,
          string
        >;
        if (pushIds.commit_sha) payload.commit_sha = pushIds.commit_sha;
      }
      if (dep.executionStatus === "succeeded" && dep.actionType === "repository.create") {
        if (depIds.repository_full_name) {
          payload.repository_full_name = depIds.repository_full_name;
        }
        if (action.actionType === "repository.push") break;
      }
      if (dep.executionStatus === "succeeded" && dep.actionType === "hosting.create_project") {
        if (depIds.project_id && action.actionType === "hosting.deploy") {
          payload.project_id = depIds.project_id;
        }
      }
      depId = dep.dependsOnActionId;
    }
    if (action.actionType === "hosting.deploy" && !payload.project_id && action.dependsOnActionId) {
      const direct = await loadExternalAction(admin, input.organizationId, action.dependsOnActionId);
      const directIds = (direct?.resultManifest?.external_ids ?? {}) as Record<string, string>;
      if (direct?.actionType === "hosting.create_project" && directIds.project_id) {
        payload.project_id = directIds.project_id;
      }
    }
    if (action.actionType === "hosting.verify_deployment" && action.dependsOnActionId) {
      let depId: string | null = action.dependsOnActionId;
      while (depId) {
        const dep = await loadExternalAction(admin, input.organizationId, depId);
        if (!dep) break;
        if (dep.executionStatus === "succeeded" && dep.actionType === "hosting.deploy") {
          const depIds = (dep.resultManifest?.external_ids ?? dep.resultManifest ?? {}) as Record<
            string,
            string
          >;
          if (depIds.deployment_id) payload.deployment_id = depIds.deployment_id;
          if (depIds.project_id) payload.project_id = depIds.project_id;
          if (depIds.url) payload.url = depIds.url;
          break;
        }
        depId = dep.dependsOnActionId;
      }
    }
  }

  if (
    (action.actionType === "hosting.deploy" || action.actionType === "hosting.create_project") &&
    productionArtifactId
  ) {
    const { data: artifactRow } = await admin
      .from("production_artifacts")
      .select("deployment_manifest, framework")
      .eq("organization_id", input.organizationId)
      .eq("id", productionArtifactId)
      .maybeSingle();
    if (artifactRow?.deployment_manifest) {
      payload.deployment_manifest = artifactRow.deployment_manifest;
    }
    payload.deployment_mode = VERCEL_V1_DEPLOYMENT_MODE;
  }

  if (
    action.actionType === "hosting.deploy" &&
    productionArtifactId &&
    productionArtifactValid
  ) {
    const readiness = await evaluateAndPersistVercelReadinessForArtifact(admin, {
      organizationId: input.organizationId,
      productionArtifactId,
      runCleanRoom: true,
      repositoryFullName: String(payload.repository_full_name ?? ""),
      commitSha: String(payload.commit_sha ?? ""),
    });
    vercelDeploymentReadinessValid = readiness.ready;
    if (readiness.manifest) {
      payload.deployment_manifest = readiness.manifest;
    }
    payload.deployment_source_fingerprint = readiness.sourceIdentity?.sourceFingerprint;
  }

  const cred = resolveCredentialFromEnv(adapterKey);

  const resourceName = action.target;
  const idempotencyResource = assembly?.companyId
    ? findResourceByIdempotency(
        admin,
        input.organizationId,
        resourceIdempotencyKey({
          organizationId: input.organizationId,
          ventureId: assembly.companyId,
          resourceType:
            action.actionType === "repository.create"
              ? "repository"
              : action.actionType === "hosting.create_project"
                ? "hosting_project"
                : "deployment",
          provider: adapterKey,
          canonicalName: resourceName,
        }),
      )
    : Promise.resolve(null);

  const existingResource = await idempotencyResource;

  const gates = evaluateLiveProviderGates({
    actionType: action.actionType as LiveProviderAction,
    providerKey: adapterKey,
    capabilityPermits: permissionOk,
    policyAllowsExecute,
    budgetAllows: costEval.withinBudget,
    approvalAllows,
    credentialValid: cred.valid,
    assemblyInternallyReady: assembly?.status === "internally_ready",
    launchPlanApproved: Boolean(action.launchPlanId),
    idempotencyValid: true,
    buildSnapshotValid,
    productionArtifactValid,
    vercelDeploymentReadinessValid:
      action.actionType === "hosting.deploy" ? vercelDeploymentReadinessValid : undefined,
    organizationValid: true,
    ventureValid: Boolean(assembly?.companyId),
    registeredAction: Boolean(def),
    providerSupportsAction: adapterSupportsAction(adapterKey, action.actionType),
  });

  if (!gates.allowed) {
    incrementProviderMetric("live_actions_blocked");
    await updateExternalAction(admin, input.organizationId, action.id, {
      execution_status: "blocked",
      execution_mode: "live",
      error: gates.reasons.join(";"),
    });
    return {
      externalActionId: action.id,
      executionStatus: "blocked",
      executionMode: "live",
      verified: false,
      blocked: true,
      reasons: gates.reasons,
    };
  }

  if (action.executionStatus === "succeeded" && action.resultManifest) {
    return {
      externalActionId: action.id,
      executionStatus: "succeeded",
      executionMode: "live",
      verified: action.verificationStatus === "verified",
      blocked: false,
      reasons: [],
    };
  }

  if (existingResource && action.actionType.endsWith(".create")) {
    await updateExternalAction(admin, input.organizationId, action.id, {
      execution_status: "succeeded",
      execution_mode: "live",
      result_manifest: redactUnknown({
        reused: true,
        resource_id: existingResource.id,
      }) as Json,
      verification_status: "verified",
    });
    return {
      externalActionId: action.id,
      executionStatus: "succeeded",
      executionMode: "live",
      verified: true,
      blocked: false,
      reasons: [],
    };
  }

  const claimed = await claimExternalAction(
    admin,
    input.organizationId,
    action.id,
    input.requestingCapabilityKey,
  );
  if (!claimed) {
    throw new Error("Could not claim external action for live execution");
  }

  await updateExternalAction(admin, input.organizationId, action.id, {
    execution_status: "executing",
    execution_mode: "live",
    provider_execution_mode: "live",
  });

  incrementProviderMetric("provider_calls");

  const adapter = resolveAdapter(adapterKey);
  const ctxPayload = { ...payload };

  if (
    (action.actionType === "repository.push" || action.actionType === "hosting.deploy") &&
    productionArtifactId &&
    ctxPayload.content_hash
  ) {
    const prepared = await prepareArtifactForExternalExecution(admin, {
      organizationId: input.organizationId,
      productionArtifactId,
      approvedArtifactHash: String(ctxPayload.content_hash),
    });
    ctxPayload._artifact_files = prepared.files.map((f) => ({
      relativePath: f.relativePath,
      contentHash: f.contentHash,
      byteSize: f.byteSize,
      fileMode: f.fileMode,
      contentText: f.contentText,
    }));
  }

  const ctx = {
    organizationId: input.organizationId,
    actionType: action.actionType,
    target: action.target,
    payload: ctxPayload,
    correlationId: input.correlationId ?? null,
  };

  let result;
  try {
    result = await adapter.execute(ctx);
  } catch (error) {
    incrementProviderMetric("provider_failures");
    const message = error instanceof Error ? error.message : String(error);
    await updateExternalAction(admin, input.organizationId, action.id, {
      execution_status: "failed",
      error: message.slice(0, 500),
      failed_at: new Date().toISOString(),
    });
    throw error;
  }

  const verification = await adapter.verify(ctx, result);
  if (!verification.verified) {
    incrementProviderMetric("verification_failures");
    await updateExternalAction(admin, input.organizationId, action.id, {
      execution_status: "failed",
      verification_status: "failed",
      result_manifest: redactUnknown({
        ...result.manifest,
        external_ids: result.externalIds,
      }) as Json,
      error: verification.details.join(";").slice(0, 500),
    });
    return {
      externalActionId: action.id,
      executionStatus: "failed",
      executionMode: "live",
      verified: false,
      blocked: false,
      reasons: verification.details,
    };
  }

  const resourceType =
    action.actionType === "hosting.deploy" || action.actionType === "hosting.verify_deployment"
      ? "deployment"
      : action.actionType === "hosting.create_project"
        ? "hosting_project"
        : "repository";

  const registryName =
    action.actionType === "hosting.deploy" || action.actionType === "hosting.verify_deployment"
      ? String(result.externalIds.deployment_id ?? action.target)
      : action.target;

  if (assembly?.companyId && (action.actionType.endsWith(".create") || action.actionType === "hosting.deploy")) {
    await upsertExternalResource(admin, {
      organizationId: input.organizationId,
      ventureId: assembly.companyId,
      launchPlanId: action.launchPlanId,
      externalActionId: action.id,
      resourceType,
      provider: adapterKey,
      providerResourceId:
        result.externalIds.repository_id ??
        result.externalIds.project_id ??
        result.externalIds.deployment_id ??
        result.externalIds.simulation_id,
      canonicalName: registryName,
      externalUrl: (result.manifest.html_url as string) ?? (result.externalIds.url ?? null),
      executionMode: "live",
      createdByActionId: action.id,
      idempotencyKey: resourceIdempotencyKey({
        organizationId: input.organizationId,
        ventureId: assembly.companyId,
        resourceType,
        provider: adapterKey,
        canonicalName: registryName,
      }),
      metadata: redactUnknown(result.externalIds) as Record<string, unknown>,
    });
    incrementProviderMetric("resources_created");
  }

  let httpVerification:
    | Awaited<ReturnType<typeof verifyLiveHttp>>
    | null = null;
  if (action.actionType === "hosting.deploy" && result.manifest.ready === true) {
    const deployUrl = String(result.externalIds.url ?? result.manifest.url ?? "");
    if (deployUrl) {
      httpVerification = await verifyLiveHttp({
        url: deployUrl,
        expectedArtifactHash: String(ctxPayload.content_hash ?? ""),
      });
      if (!httpVerification.verified) {
        incrementProviderMetric("verification_failures");
        await updateExternalAction(admin, input.organizationId, action.id, {
          execution_status: "failed",
          verification_status: "failed",
          provider_lifecycle_state: "ready",
          http_verification_status: "failed",
          verified_url: httpVerification.url,
          result_manifest: redactUnknown(result.manifest) as Json,
          error: "http_verification_failed",
        });
        return {
          externalActionId: action.id,
          executionStatus: "failed",
          executionMode: "live",
          verified: false,
          blocked: false,
          reasons: ["http_verification_failed"],
        };
      }
    }
  }

  const launchStageForAction =
    action.actionType === "repository.create"
      ? "repository_created"
      : action.actionType === "repository.push"
        ? "artifact_pushed"
        : action.actionType === "hosting.create_project"
          ? "hosting_project_created"
          : action.actionType === "hosting.deploy"
            ? httpVerification?.verified
              ? "externally_live"
              : "deployment_ready"
            : null;

  const providerLifecycleState =
    action.actionType === "hosting.deploy"
      ? String(result.manifest.provider_lifecycle_state ?? "submitted")
      : null;

  if (assembly?.id && launchStageForAction) {
    await admin
      .from("venture_assemblies")
      .update({ launch_stage: launchStageForAction })
      .eq("organization_id", input.organizationId)
      .eq("id", assembly.id);
  }

  if (assembly?.id && action.actionType === "repository.push") {
    await insertLaunchHandoffLink(admin, {
      organizationId: input.organizationId,
      ventureAssemblyId: assembly.id,
      productionArtifactId,
      externalActionId: action.id,
      linkType: "repository_push",
      provider: adapterKey,
      repositoryFullName: String(ctxPayload.repository_full_name ?? ""),
      commitSha: result.externalIds.commit_sha ?? null,
      branchName: String(ctxPayload.branch ?? "main"),
      artifactHash: String(ctxPayload.content_hash ?? ""),
      metadata: {
        file_count: result.manifest.file_count,
        verification: verification.details,
      },
    });
  }

  if (assembly?.id && action.actionType === "hosting.deploy") {
    await insertLaunchHandoffLink(admin, {
      organizationId: input.organizationId,
      ventureAssemblyId: assembly.id,
      productionArtifactId,
      externalActionId: action.id,
      linkType: "deployment",
      provider: adapterKey,
      vercelProjectId: String(ctxPayload.project_id ?? ""),
      deploymentId: result.externalIds.deployment_id ?? null,
      deploymentUrl: result.externalIds.url ?? null,
      artifactHash: String(ctxPayload.content_hash ?? ""),
      metadata: {
        provider_lifecycle_state: providerLifecycleState,
        http_verification: httpVerification,
      },
    });
  }

  await updateExternalAction(admin, input.organizationId, action.id, {
    execution_status: "succeeded",
    verification_status: "verified",
    production_artifact_id: productionArtifactId,
    launch_stage: launchStageForAction,
    provider_lifecycle_state: providerLifecycleState,
    http_verification_status: httpVerification?.verified ? "verified" : null,
    verified_url: httpVerification?.url ?? null,
    result_manifest: redactUnknown({
      ...result.manifest,
      external_ids: result.externalIds,
      http_verification: httpVerification,
    }) as Json,
    executed_at: new Date().toISOString(),
    audit_snapshot: redactUnknown({
      policy_version: LAUNCH_GATEWAY_POLICY_VERSION,
      execution_mode: "live",
      provider: adapterKey,
    }) as Json,
  });

  incrementProviderMetric("deployments_succeeded");

  await emitLaunchGatewayEvent(admin, {
    organizationId: input.organizationId,
    eventType: LAUNCH_GATEWAY_EVENTS.externalActionSucceeded,
    message: "Live provider action succeeded and verified",
    externalActionId: action.id,
    missionId: input.missionId,
  });

  return {
    externalActionId: action.id,
    executionStatus: "succeeded",
    executionMode: "live",
    verified: true,
    blocked: false,
    reasons: [],
  };
}
