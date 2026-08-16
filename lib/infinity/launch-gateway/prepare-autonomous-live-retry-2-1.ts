import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { registerRuntimeWorkers } from "@/lib/infinity/runtime";
import { runAutonomousPlanExecutionE2EValidation } from "@/lib/infinity/plan-execution/validate-e2e";
import {
  requestVentureAssembly,
} from "@/lib/infinity/venture-assembly/orchestrator";
import {
  VENTURE_ASSEMBLY_CAPABILITY,
  VENTURE_ASSEMBLY_QA_CAPABILITY,
} from "@/lib/infinity/venture-assembly/constants";
import { loadVentureAssemblyById } from "@/lib/infinity/venture-assembly/persistence";
import { schedulePlanStep } from "@/lib/infinity/scheduler";
import { runJobToCompletion } from "@/lib/infinity/build-factory/validate-e2e";
import { ensureLiveLaunchPlanForAssembly } from "./live-launch-plan";
import { evaluateAndApplyExternalAuthorization } from "./autonomous-authorization/apply";
import { upsertOrganizationAutonomyPolicyForDevelopment } from "./autonomous-authorization/organization-policy";
import {
  AUTONOMOUS_EXTERNAL_ACTION_POLICY_KEY,
  AUTONOMOUS_EXTERNAL_ACTION_POLICY_VERSION,
  AUTONOMOUS_EXTERNAL_CONTROLLED_ORG_ENV,
} from "./autonomous-authorization/constants";
import { FROZEN_RETRY1_ASSEMBLY_ID } from "./execute-autonomous-live-retry-2";
import {
  reconcileExternalResourcesReadOnly,
  resolveRetry2ReconciliationFromDb,
} from "./external-reconciliation";
import { listLaunchPlanActions } from "./persistence";
import { hashPayloadManifest } from "./resource-registry";
import { GITHUB_OWNER_ENV } from "./provider-config";
import { resolveApprovedRepositoryName } from "@/lib/infinity/production-artifact/repository-naming";
import {
  reconstructProductionArtifact,
  verifyProductionArtifactIntegrity,
} from "@/lib/infinity/production-artifact/materialize";
import { evaluateAndPersistVercelReadinessForArtifact } from "@/lib/infinity/production-artifact/inspect-vercel-deployment";
import { evaluateVercelDeploymentReadiness } from "@/lib/infinity/production-artifact/vercel-deployment-readiness";
import { VERCEL_V1_DEPLOYMENT_MODE } from "@/lib/infinity/production-artifact/constants";
import type { Plan } from "@/lib/infinity/types";
import { isExternalActionsLiveEnabled } from "./kill-switch";

export const RETRY_21_PLAN_SUFFIX = "autonomous_retry2_1_v1";
export const RETRY_22_PLAN_SUFFIX = "autonomous_retry2_2_v1";

const PERMS = ["network.read", "network.write", "repository.create", "publish.website"];

export type PrepareAutonomousLiveRetryReport = {
  historicalPreserved: boolean;
  finalStatus: string;
  blockers: string[];
  source: Record<string, string | null>;
  productionArtifact: Record<string, unknown>;
  assembly: Record<string, unknown>;
  reconciliation: Record<string, unknown>;
  launchPlan: Record<string, unknown>;
  actions: Record<string, unknown>[];
  vercelReadiness: Record<string, unknown>;
  repositoryPushPrecheck: Record<string, unknown>;
  humanApprovalsRequired: number;
  autonomousAuthorizations: number;
  externalMutationsPerformed: number;
};

async function loadExternalActionDetails(
  admin: AdminSupabaseClient,
  organizationId: string,
  externalActionId: string,
): Promise<{
  payload: Record<string, unknown>;
  riskClass: string | null;
  estimatedCost: number | null;
  executionStatus: string;
} | null> {
  const { data } = await admin
    .from("external_actions")
    .select("payload_manifest, risk_class, estimated_cost, execution_status")
    .eq("organization_id", organizationId)
    .eq("id", externalActionId)
    .maybeSingle();
  if (!data) return null;
  return {
    payload: (data.payload_manifest ?? {}) as Record<string, unknown>,
    riskClass: data.risk_class ? String(data.risk_class) : null,
    estimatedCost: data.estimated_cost != null ? Number(data.estimated_cost) : null,
    executionStatus: String(data.execution_status),
  };
}

function stop(reason: string): never {
  throw new Error(`CONTROLLED STOP — ${reason}`);
}

async function ensurePlanStep(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    planId: string;
    capabilityKey: string;
    constraints: Record<string, unknown>;
    stepOrder: number;
  },
) {
  const { data: existing } = await admin
    .from("plan_steps")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("plan_id", input.planId)
    .eq("capability_key", input.capabilityKey)
    .maybeSingle();
  if (existing) {
    await admin
      .from("plan_steps")
      .update({ constraints: input.constraints as Json, status: "pending" })
      .eq("id", existing.id);
    return existing.id as string;
  }
  const { data: inserted, error } = await admin
    .from("plan_steps")
    .insert({
      organization_id: input.organizationId,
      plan_id: input.planId,
      capability_key: input.capabilityKey,
      title: input.capabilityKey,
      step_order: input.stepOrder,
      status: "pending",
      constraints: input.constraints as Json,
    })
    .select("id")
    .single();
  if (error || !inserted) throw new Error(error?.message ?? "plan step insert failed");
  return String(inserted.id);
}

export async function prepareAutonomousLiveLaunchRetry(
  admin: AdminSupabaseClient,
  options: { planKeySuffix: string; readyStatusLabel?: string },
): Promise<PrepareAutonomousLiveRetryReport> {
  if (isExternalActionsLiveEnabled()) {
    stop("EXTERNAL_ACTIONS_LIVE_ENABLED must be false during preparation");
  }

  registerRuntimeWorkers();
  const blockers: string[] = [];

  const apeReport = await runAutonomousPlanExecutionE2EValidation(admin, {
    skipDuplicateProof: true,
    skipRepairProof: true,
    skipExternalStepProof: true,
    ventureTemplateKey: "controlled_nextjs_website",
  });

  if (!apeReport.pass || !apeReport.planExecutionId || !apeReport.buildId) {
    stop(`plan execution pipeline failed: ${apeReport.errors.join(";")}`);
  }

  const orgId = apeReport.organizationId;
  const missionId = apeReport.missionId;
  process.env[AUTONOMOUS_EXTERNAL_CONTROLLED_ORG_ENV] = orgId;
  await upsertOrganizationAutonomyPolicyForDevelopment(admin, orgId);

  const requested = await requestVentureAssembly(admin, {
    organizationId: orgId,
    missionId,
    planExecutionId: apeReport.planExecutionId,
  });
  if (requested.status === "blocked") {
    stop(`venture assembly blocked: ${requested.reason}`);
  }
  const ventureAssemblyId = requested.ventureAssemblyId;
  if (ventureAssemblyId === FROZEN_RETRY1_ASSEMBLY_ID) {
    stop("must not reuse frozen Retry #1 assembly");
  }

  const { data: plan } = await admin.from("plans").select("*").eq("id", apeReport.planId!).single();
  const { data: cycle } = await admin
    .from("command_cycles")
    .select("*")
    .eq("id", plan!.command_cycle_id)
    .single();
  const { data: mission } = await admin.from("missions").select("*").eq("id", missionId).single();

  const { data: peRow } = await admin
    .from("plan_executions")
    .select("opportunity_id")
    .eq("id", apeReport.planExecutionId)
    .single();
  const opportunityId = peRow?.opportunity_id ?? "";
  if (!opportunityId) {
    stop("plan execution missing opportunity_id");
  }

  const assembleStepId = await ensurePlanStep(admin, {
    organizationId: orgId,
    planId: apeReport.planId!,
    capabilityKey: VENTURE_ASSEMBLY_CAPABILITY,
    stepOrder: 960,
    constraints: {
      organization_id: orgId,
      mission_id: missionId,
      plan_execution_id: apeReport.planExecutionId,
      venture_assembly_id: ventureAssemblyId,
      opportunity_id: opportunityId,
    },
  });
  const { data: assembleStep } = await admin.from("plan_steps").select("*").eq("id", assembleStepId).single();
  const assembleJob = await schedulePlanStep(admin, orgId, cycle!, mission!, plan as Plan, assembleStep!);
  const assembleExec = await runJobToCompletion(admin, assembleJob.id, orgId, VENTURE_ASSEMBLY_CAPABILITY);
  if (assembleExec.status !== "completed") {
    stop("venture assembly worker did not complete");
  }

  const qaStepId = await ensurePlanStep(admin, {
    organizationId: orgId,
    planId: apeReport.planId!,
    capabilityKey: VENTURE_ASSEMBLY_QA_CAPABILITY,
    stepOrder: 961,
    constraints: {
      organization_id: orgId,
      mission_id: missionId,
      venture_assembly_id: ventureAssemblyId,
      opportunity_id: opportunityId,
    },
  });
  const { data: qaStep } = await admin.from("plan_steps").select("*").eq("id", qaStepId).single();
  const qaJob = await schedulePlanStep(admin, orgId, cycle!, mission!, plan as Plan, qaStep!);
  const qaExec = await runJobToCompletion(admin, qaJob.id, orgId, VENTURE_ASSEMBLY_QA_CAPABILITY);
  if (qaExec.status !== "completed") {
    stop("venture assembly QA did not complete");
  }
  const qaOut = qaExec.output as Record<string, unknown>;
  if (qaOut.verdict !== "pass") {
    stop(`venture assembly QA failed: ${JSON.stringify(qaOut.issues ?? [])}`);
  }

  const assembly = await loadVentureAssemblyById(admin, orgId, ventureAssemblyId);
  if (!assembly || assembly.status !== "internally_ready" || !assembly.productionArtifactId) {
    stop(`assembly not internally_ready or missing artifact: ${assembly?.status}`);
  }

  const { data: artifactRow } = await admin
    .from("production_artifacts")
    .select("*")
    .eq("id", assembly.productionArtifactId)
    .single();

  if (!artifactRow || artifactRow.framework !== "nextjs") {
    stop(`production artifact must be nextjs (got ${artifactRow?.framework})`);
  }

  const { record, files } = await reconstructProductionArtifact(
    admin,
    orgId,
    assembly.productionArtifactId,
  );
  const integrity = await verifyProductionArtifactIntegrity(admin, {
    organizationId: orgId,
    productionArtifactId: assembly.productionArtifactId,
    expectedContentHash: record.contentHash,
  });
  if (!integrity.valid) {
    stop(`ARTIFACT RECONSTRUCTION MISMATCH: ${integrity.reasons.join(",")}`);
  }

  const readiness = await evaluateAndPersistVercelReadinessForArtifact(admin, {
    organizationId: orgId,
    productionArtifactId: assembly.productionArtifactId,
    runCleanRoom: true,
  });

  if (!readiness.cleanRoomInstall || !readiness.cleanRoomBuild) {
    stop("CLEAN ROOM INSTALL/BUILD FAILED");
  }

  const manifest = readiness.manifest;
  const requiredEnvKeys = manifest?.requiredEnvironmentKeys ?? [];

  await admin
    .from("venture_assemblies")
    .update({
      readiness_evaluation: {
        ...(assembly.readinessEvaluation ?? {}),
        productionArtifactValid: true,
        cleanRoomInstallPassed: readiness.cleanRoomInstall,
        cleanRoomBuildPassed: readiness.cleanRoomBuild,
        deploymentManifestValid: readiness.deploymentManifest,
        vercelReadinessStatus: readiness.ready ? "ready" : "blocked",
      } as Json,
    })
    .eq("id", ventureAssemblyId)
    .eq("organization_id", orgId);

  const prior = await resolveRetry2ReconciliationFromDb(admin, orgId);
  const ownerLogin = process.env[GITHUB_OWNER_ENV]?.trim() || "IMRencite";
  let repoSlug = prior.repositoryFullName
    ? (prior.repositoryFullName.split("/")[1] ?? `infinity-live-retry2-1-${ventureAssemblyId.slice(0, 8)}`)
    : `infinity-live-retry2-1-${ventureAssemblyId.slice(0, 8)}`;
  if (process.env.LIVE_PROVIDER_TEST_MODE === "true" && !repoSlug.startsWith("infinity-test-")) {
    repoSlug = resolveApprovedRepositoryName(repoSlug).repoName.replace(/^infinity-test-/, "");
  }

  const reconciliationReadonly = await reconcileExternalResourcesReadOnly({
    repositoryFullName: prior.repositoryFullName,
    projectName: prior.projectName,
  });
  blockers.push(...reconciliationReadonly.blockers);

  const omitRepoCreate = reconciliationReadonly.github.mode === "REUSE";
  const needsGitLink =
    reconciliationReadonly.linkage !== "PASS" &&
    Boolean(reconciliationReadonly.vercel.projectId) &&
    Boolean(reconciliationReadonly.github.repositoryFullName);
  const omitProjectCreate = reconciliationReadonly.linkage === "PASS";

  const live = await ensureLiveLaunchPlanForAssembly(admin, {
    organizationId: orgId,
    missionId,
    ventureAssemblyId,
    ownerLogin,
    repoSlug,
    planKeySuffix: options.planKeySuffix,
    launchReconciliation: {
      repositoryFullName: prior.repositoryFullName ?? undefined,
      existingProjectId: reconciliationReadonly.vercel.projectId ?? undefined,
      omitRepositoryCreate: omitRepoCreate,
      omitHostingCreateProject: omitProjectCreate,
      linkExistingVercelProjectId: needsGitLink
        ? (reconciliationReadonly.vercel.projectId ?? undefined)
        : undefined,
    },
  });

  const actions = await listLaunchPlanActions(admin, orgId, live.launchPlanId);
  const ordered = [...actions].sort((a, b) => a.sequenceOrder - b.sequenceOrder);

  let humanApprovals = 0;
  let autonomousAuths = 0;
  const actionReports: Record<string, unknown>[] = [];

  for (const action of ordered) {
    const auth = await evaluateAndApplyExternalAuthorization(admin, {
      organizationId: orgId,
      missionId,
      externalActionId: action.id,
      intent: "simulate",
      requestingCapabilityKey: "launch.evaluate_external_authorization",
      grantedExternalPermissions: PERMS,
    });
    if (auth.decision !== "AUTO_AUTHORIZE") {
      stop(`${action.actionType} authorization ${auth.decision}: ${auth.explanations.join(";")}`);
    }
    autonomousAuths += 1;
    const row = await loadExternalActionDetails(admin, orgId, action.id);
    const payload = row?.payload ?? {};
    actionReports.push({
      action: action.actionType,
      actionId: action.id,
      authorization: "autonomous_policy",
      policy: `${AUTONOMOUS_EXTERNAL_ACTION_POLICY_KEY}/${AUTONOMOUS_EXTERNAL_ACTION_POLICY_VERSION}`,
      risk: row?.riskClass,
      cost: row?.estimatedCost ?? 0,
      payloadHash: hashPayloadManifest(payload),
      artifactHash: record.contentHash,
      executionStatus: row?.executionStatus ?? action.executionStatus,
    });
  }

  const pushAction = ordered.find((a) => a.actionType === "repository.push");
  const pushRow = pushAction ? await loadExternalActionDetails(admin, orgId, pushAction.id) : null;
  const pushPayload = pushRow?.payload ?? {};

  const pushPrecheck = {
    artifactFileCount: record.fileCount,
    expectedRepositoryFileCount: record.fileCount + 1,
    artifactHash: record.contentHash,
    expectedBranch: String(pushPayload.branch ?? "main"),
    payloadHash: hashPayloadManifest(pushPayload),
  };

  const preflightReadiness = await evaluateVercelDeploymentReadiness({
    record,
    files,
    options: {
      runCleanRoom: false,
      deploymentMode: VERCEL_V1_DEPLOYMENT_MODE,
      repositoryFullName: prior.repositoryFullName,
    },
  });

  const providerReady =
    preflightReadiness.credentialsReadReady && preflightReadiness.vercelTranslation;

  const linkageReadyForExecute =
    reconciliationReadonly.linkage === "PASS" ||
    ordered.some((a) => a.actionType === "hosting.create_project");

  if (
    !readiness.ready ||
    !preflightReadiness.deploymentManifest ||
    !providerReady ||
    !preflightReadiness.nextJsSecurityVersion ||
    !linkageReadyForExecute
  ) {
    const reasons = [
      ...readiness.reasons,
      ...reconciliationReadonly.blockers,
      !linkageReadyForExecute ? "vercel_github_linkage_not_prepared" : "",
    ].filter(Boolean);
    stop(`preflight incomplete: ${reasons.join(";")}`);
  }

  return {
    historicalPreserved: true,
    finalStatus: options.readyStatusLabel ?? "READY FOR AUTONOMOUS LIVE EXECUTION",
    blockers,
    source: {
      venture: assembly.companyId,
      mission: missionId,
      planExecution: apeReport.planExecutionId,
      build: apeReport.buildId,
      buildSnapshot: apeReport.snapshotId,
      opportunity: opportunityId,
    },
    productionArtifact: {
      artifactId: record.artifactId,
      version: record.artifactVersion,
      framework: record.framework,
      rootDirectory: record.rootDirectory,
      packageManager: artifactRow.package_manager,
      fileCount: record.fileCount,
      totalBytes: record.totalBytes,
      contentHash: record.contentHash,
      reconstruction: "PASS",
      secretExclusion: "PASS",
      packageValidation: readiness.packageJson ? "PASS" : "FAIL",
      cleanRoomInstall: readiness.cleanRoomInstall ? "PASS" : "FAIL",
      cleanRoomBuild: readiness.cleanRoomBuild ? "PASS" : "FAIL",
      deploymentManifest: readiness.deploymentManifest ? "PASS" : "FAIL",
      requiredEnvironmentKeys: requiredEnvKeys,
    },
    assembly: {
      assemblyId: ventureAssemblyId,
      version: assembly.assemblyVersion,
      status: assembly.status,
      qa: "pass",
      deploymentReadiness: readiness.ready ? "PASS" : "FAIL",
    },
    reconciliation: {
      github: reconciliationReadonly.github.mode,
      githubRepo: reconciliationReadonly.github.repositoryFullName,
      vercel: reconciliationReadonly.vercel.mode,
      vercelProject: reconciliationReadonly.vercel.projectName,
      vercelProjectId: reconciliationReadonly.vercel.projectId,
      linkage: linkageReadyForExecute
        ? needsGitLink
          ? "PASS_AFTER_HOSTING_CREATE_PROJECT"
          : reconciliationReadonly.linkage
        : reconciliationReadonly.linkage,
      gitLinkPrepared: needsGitLink,
      priorRetry2AssemblyId: prior.priorAssemblyId,
    },
    launchPlan: {
      launchPlanId: live.launchPlanId,
      version: 1,
      requiredActions: ordered.map((a) => a.actionType),
    },
    actions: actionReports,
    vercelReadiness: {
      productionArtifact: readiness.ready ? "PASS" : "FAIL",
      cleanRoom: readiness.cleanRoomBuild ? "PASS" : "FAIL",
      vercelTranslation: preflightReadiness.vercelTranslation ? "PASS" : "FAIL",
      sourceCorrespondence: preflightReadiness.artifactSourceCorrespondence ? "PASS" : "FAIL",
      providerReadiness: providerReady ? "PASS" : "FAIL",
      vulnerabilityGate: preflightReadiness.nextJsSecurityVersion ? "PASS" : "FAIL",
      expectedCostUsd: 0,
    },
    repositoryPushPrecheck: pushPrecheck,
    humanApprovalsRequired: humanApprovals,
    autonomousAuthorizations: autonomousAuths,
    externalMutationsPerformed: 0,
  };
}

export type PrepareAutonomousLiveRetry21Report = PrepareAutonomousLiveRetryReport;

export async function prepareAutonomousLiveLaunchRetry21(
  admin: AdminSupabaseClient,
): Promise<PrepareAutonomousLiveRetryReport> {
  return prepareAutonomousLiveLaunchRetry(admin, {
    planKeySuffix: RETRY_21_PLAN_SUFFIX,
    readyStatusLabel: "READY FOR AUTONOMOUS LIVE EXECUTION #2.1",
  });
}

export async function prepareAutonomousLiveLaunchRetry22(
  admin: AdminSupabaseClient,
): Promise<PrepareAutonomousLiveRetryReport> {
  return prepareAutonomousLiveLaunchRetry(admin, {
    planKeySuffix: RETRY_22_PLAN_SUFFIX,
    readyStatusLabel: "READY FOR AUTONOMOUS LIVE EXECUTION #2.2",
  });
}
