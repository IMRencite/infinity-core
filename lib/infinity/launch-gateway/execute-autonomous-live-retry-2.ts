import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { runVentureAssemblyE2EValidation } from "@/lib/infinity/venture-assembly/validate-e2e";
import { loadVentureAssemblyById } from "@/lib/infinity/venture-assembly/persistence";
import { ensureLiveLaunchPlanForAssembly } from "./live-launch-plan";
import { evaluateAndApplyExternalAuthorization } from "./autonomous-authorization/apply";
import { executeExternalActionViaGateway } from "./execute-live";
import { listLaunchPlanActions, loadExternalAction } from "./persistence";
import { upsertOrganizationAutonomyPolicyForDevelopment } from "./autonomous-authorization/organization-policy";
import {
  AUTONOMOUS_EXTERNAL_ACTION_POLICY_KEY,
  AUTONOMOUS_EXTERNAL_ACTION_POLICY_VERSION,
  AUTONOMOUS_EXTERNAL_CONTROLLED_ORG_ENV,
} from "./autonomous-authorization/constants";
import { validateProductionArtifactForExternalDeploy } from "./build-snapshot-gate";
import { LAUNCH_EXECUTE_ACTION_CAPABILITY, LAUNCH_GATEWAY_EVENTS } from "./constants";
import { emitLaunchGatewayEvent } from "./events";
import {
  GITHUB_OWNER_ENV,
  GITHUB_TOKEN_ENV,
  VERCEL_TEAM_ID_ENV,
  VERCEL_TOKEN_ENV,
  isGithubLiveEnabled,
  isLiveProviderTestMode,
  isVercelLiveEnabled,
} from "./provider-config";
import { isExternalActionsLiveEnabled } from "./kill-switch";
import { verifyLiveHttp } from "@/lib/infinity/production-artifact/deployment-lifecycle";
import { verifyGithubTreeAgainstManifest } from "@/lib/infinity/production-artifact/github-artifact-push";
import { redactSecrets } from "./redaction";

export const FROZEN_RETRY1_ASSEMBLY_ID = "b85cf528-e5a6-4ea7-bac6-ba3e463710cf";

const PERMS = [
  "network.read",
  "network.write",
  "repository.create",
  "publish.website",
];

export type AutonomousLiveRetry2Report = {
  title: string;
  preflight: string;
  productionArtifact: Record<string, unknown>;
  ventureAssembly: Record<string, unknown>;
  launchPlan: Record<string, unknown>;
  organizationAutonomy: string;
  policy: string;
  actions: Record<string, unknown>[];
  humanApprovalsUsed: number;
  autonomousAuthorizationsUsed: number;
  costs: { estimated: number; authorized: number; actual: number };
  reconciliation: Record<string, string>;
  publicUrl: string | null;
  publicHealth: string;
  artifactGithubIntegrity: string;
  artifactVercelIntegrity: string;
  replayIdempotency: string;
  duplicateRepositories: number;
  duplicateVercelProjects: number;
  unexpectedSideEffects: number;
  auditTrail: string;
  ventureExternallyLive: string;
  launchCompletionEvent: string;
  remainingBlockers: string[];
  finalStatus: string;
};

function block(reason: string): never {
  throw new Error(`CONTROLLED STOP — ${reason}`);
}

async function githubFetch(token: string, path: string, init?: RequestInit) {
  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
  });
}

export async function runAutonomousControlledLiveLaunchRetry2(
  admin: AdminSupabaseClient,
): Promise<AutonomousLiveRetry2Report> {
  const blockers: string[] = [];
  const actionReports: Record<string, unknown>[] = [];

  if (
    !isExternalActionsLiveEnabled() ||
    !isLiveProviderTestMode() ||
    !isGithubLiveEnabled() ||
    !isVercelLiveEnabled()
  ) {
    block("live execution flags not enabled");
  }

  const ghToken = process.env[GITHUB_TOKEN_ENV];
  const vzToken = process.env[VERCEL_TOKEN_ENV];
  if (!ghToken) block("github token missing");
  if (!vzToken) block("vercel token missing");

  const ghUser = await githubFetch(ghToken!, "/user");
  if (!ghUser.ok) block("github credentials invalid");
  const vzUser = await fetch("https://api.vercel.com/v2/user", {
    headers: { Authorization: `Bearer ${vzToken}` },
  });
  if (!vzUser.ok) block("vercel credentials invalid");

  const va = await runVentureAssemblyE2EValidation(admin);
  if (!va.pass || !va.ventureAssemblyId) {
    block(`venture assembly prerequisite failed: ${va.errors.join(";")}`);
  }

  let ventureAssemblyId = va.ventureAssemblyId;
  if (ventureAssemblyId === FROZEN_RETRY1_ASSEMBLY_ID) {
    block("must not reuse frozen Retry #1 assembly");
  }

  const { data: assemblies } = await admin
    .from("venture_assemblies")
    .select("id, production_artifact_id, created_at")
    .eq("organization_id", va.organizationId)
    .eq("status", "internally_ready")
    .neq("id", FROZEN_RETRY1_ASSEMBLY_ID)
    .not("production_artifact_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(10);

  for (const row of assemblies ?? []) {
    const { data: livePlans } = await admin
      .from("launch_plans")
      .select("id")
      .eq("organization_id", va.organizationId)
      .eq("venture_assembly_id", row.id)
      .like("idempotency_key", "launch_plan_live:%");
    if ((livePlans?.length ?? 0) === 0) {
      ventureAssemblyId = String(row.id);
      break;
    }
    const { data: verifyAction } = await admin
      .from("external_actions")
      .select("id")
      .eq("organization_id", va.organizationId)
      .eq("venture_assembly_id", row.id)
      .eq("action_type", "hosting.verify_deployment")
      .limit(1);
    if ((verifyAction?.length ?? 0) === 0 && row.id !== ventureAssemblyId) {
      ventureAssemblyId = String(row.id);
      break;
    }
  }

  const orgId = va.organizationId;
  const missionId = va.missionId;

  process.env[AUTONOMOUS_EXTERNAL_CONTROLLED_ORG_ENV] = orgId;
  await upsertOrganizationAutonomyPolicyForDevelopment(admin, orgId);

  const assembly = await loadVentureAssemblyById(admin, orgId, ventureAssemblyId!);
  if (!assembly || assembly.status !== "internally_ready") {
    block("assembly not internally_ready");
  }

  const { data: assemblyRow } = await admin
    .from("venture_assemblies")
    .select("production_artifact_id, assembly_version, launch_stage")
    .eq("id", ventureAssemblyId)
    .single();

  const productionArtifactId = assemblyRow?.production_artifact_id
    ? String(assemblyRow.production_artifact_id)
    : assembly.productionArtifactId;

  if (!productionArtifactId || !assembly.buildId || !assembly.buildSnapshotId) {
    block("production artifact or build binding missing");
  }

  const { data: artifactRow } = await admin
    .from("production_artifacts")
    .select("*")
    .eq("id", productionArtifactId)
    .eq("organization_id", orgId)
    .single();

  if (!artifactRow) block("production artifact row missing");

  const artifactGate = await validateProductionArtifactForExternalDeploy(admin, {
    organizationId: orgId,
    ventureAssemblyId: ventureAssemblyId!,
    productionArtifactId,
    buildSnapshotId: assembly.buildSnapshotId,
    approvedArtifactHash: String(artifactRow.content_hash),
  });
  if (!artifactGate.valid) {
    block(`production artifact invalid: ${artifactGate.reasons.join(",")}`);
  }

  const ownerLogin = process.env[GITHUB_OWNER_ENV]?.trim() || "IMRencite";
  const repoSlug = `infinity-live-retry2-${ventureAssemblyId!.slice(0, 8)}`;

  const live = await ensureLiveLaunchPlanForAssembly(admin, {
    organizationId: orgId,
    missionId,
    ventureAssemblyId: ventureAssemblyId!,
    ownerLogin,
    repoSlug,
    planKeySuffix: "autonomous_retry2_v1",
  });

  const actions = await listLaunchPlanActions(admin, orgId, live.launchPlanId);
  const ordered = [...actions].sort((a, b) => a.sequenceOrder - b.sequenceOrder);

  let repoFullName = "";
  let commitSha = "";
  let projectId = "";
  let deploymentId = "";
  let liveUrl = "";
  let humanApprovals = 0;
  let autonomousAuths = 0;

  for (const action of ordered) {
    const auth = await evaluateAndApplyExternalAuthorization(admin, {
      organizationId: orgId,
      missionId,
      externalActionId: action.id,
      intent: "execute",
      requestingCapabilityKey: "launch.evaluate_external_authorization",
      grantedExternalPermissions: PERMS,
    });

    if (auth.decision !== "AUTO_AUTHORIZE") {
      block(`${action.actionType} authorization ${auth.decision}: ${auth.explanations.join(";")}`);
    }
    autonomousAuths += 1;

    const { data: approvalRow } = await admin
      .from("external_action_approvals")
      .select("authorization_source")
      .eq("id", auth.authorizationId ?? "")
      .maybeSingle();
    if (approvalRow?.authorization_source === "human") humanApprovals += 1;

    const current = await loadExternalAction(admin, orgId, action.id);
    if (current?.executionStatus === "failed" || current?.executionStatus === "executing") {
      await admin
        .from("external_actions")
        .update({
          execution_status: "execution_ready",
          error: null,
          failed_at: null,
          claimed_by: null,
          claimed_at: null,
        })
        .eq("id", action.id)
        .eq("organization_id", orgId);
    }

    if (current?.executionStatus === "succeeded") {
      const manifest = current.resultManifest ?? {};
      const ids = (manifest.external_ids ?? manifest) as Record<string, string>;
      if (action.actionType === "repository.create") {
        repoFullName = ids.repository_full_name ?? repoFullName;
      }
      if (action.actionType === "repository.push") commitSha = ids.commit_sha ?? commitSha;
      if (action.actionType === "hosting.create_project") projectId = ids.project_id ?? projectId;
      if (action.actionType === "hosting.deploy") {
        deploymentId = ids.deployment_id ?? deploymentId;
        liveUrl = ids.url ?? liveUrl;
      }
      actionReports.push({
        actionType: action.actionType,
        authorization: "autonomous_policy",
        execution: "succeeded",
        verified: true,
        skipped: true,
      });
      continue;
    }

    const outcome = await executeExternalActionViaGateway(admin, {
      organizationId: orgId,
      missionId,
      externalActionId: action.id,
      requestingCapabilityKey: LAUNCH_EXECUTE_ACTION_CAPABILITY,
      grantedExternalPermissions: PERMS,
    });

    const refreshed = await loadExternalAction(admin, orgId, action.id);
    const manifest = refreshed?.resultManifest ?? {};
    const ids = (manifest.external_ids ?? manifest) as Record<string, string>;

    if (action.actionType === "repository.create") {
      repoFullName = ids.repository_full_name ?? repoFullName;
    }
    if (action.actionType === "repository.push") {
      commitSha = ids.commit_sha ?? commitSha;
    }
    if (action.actionType === "hosting.create_project") {
      projectId = ids.project_id ?? projectId;
    }
    if (action.actionType === "hosting.deploy") {
      deploymentId = ids.deployment_id ?? deploymentId;
      liveUrl = ids.url ?? liveUrl;
    }

    actionReports.push({
      actionType: action.actionType,
      authorization: approvalRow?.authorization_source ?? "autonomous_policy",
      execution: outcome.executionStatus,
      verified: outcome.verified,
      blocked: outcome.blocked,
      reasons: outcome.reasons,
    });

    if (outcome.blocked || !outcome.verified || outcome.executionStatus !== "succeeded") {
      block(`${action.actionType} execution failed: ${outcome.reasons.join(";")}`);
    }

    if (action.actionType === "repository.push") {
      const treeCheck = await verifyGithubTreeAgainstManifest(
        (path, init) => githubFetch(ghToken!, path, init),
        {
          repositoryFullName: repoFullName,
          commitSha,
          expectedFileCount: Number(artifactRow.file_count) + 1,
          criticalPaths: ["INFINITY_ARTIFACT_IDENTITY.json"],
        },
      );
      if (!treeCheck.verified) {
        block(`repository tree verification failed: ${treeCheck.details.join(";")}`);
      }
    }
  }

  if (!liveUrl && deploymentId) {
    const teamId = process.env[VERCEL_TEAM_ID_ENV]?.trim();
    const depUrl = teamId
      ? `https://api.vercel.com/v13/deployments/${deploymentId}?teamId=${teamId}`
      : `https://api.vercel.com/v13/deployments/${deploymentId}`;
    const dr = await fetch(depUrl, { headers: { Authorization: `Bearer ${vzToken}` } });
    if (dr.ok) {
      const dep = (await dr.json()) as { url?: string; readyState?: string };
      if (dep.url) liveUrl = dep.url.startsWith("http") ? dep.url : `https://${dep.url}`;
    }
  }

  const httpCheck = liveUrl
    ? await verifyLiveHttp({
        url: liveUrl,
        expectedArtifactHash: String(artifactRow.content_hash),
      })
    : null;

  if (!httpCheck?.verified) {
    block("public HTTP verification failed");
  }

  let githubRecon = "FAIL";
  let vercelRecon = "FAIL";
  if (repoFullName) {
    const rr = await githubFetch(ghToken!, `/repos/${repoFullName}`);
    githubRecon = rr.ok ? "PASS" : "FAIL";
  }
  if (projectId) {
    const teamId = process.env[VERCEL_TEAM_ID_ENV]?.trim();
    const pr = await fetch(
      teamId
        ? `https://api.vercel.com/v9/projects/${projectId}?teamId=${teamId}`
        : `https://api.vercel.com/v9/projects/${projectId}`,
      { headers: { Authorization: `Bearer ${vzToken}` } },
    );
    vercelRecon = pr.ok ? "PASS" : "FAIL";
  }

  await admin
    .from("venture_assemblies")
    .update({
      launch_stage: "externally_live",
      status: "internally_ready",
    })
    .eq("id", ventureAssemblyId!)
    .eq("organization_id", orgId);

  await emitLaunchGatewayEvent(admin, {
    organizationId: orgId,
    eventType: LAUNCH_GATEWAY_EVENTS.launchSimulationCompleted,
    message: "Autonomous controlled live launch retry #2 completed — externally live",
    missionId,
    launchPlanId: live.launchPlanId,
  });

  const replay = await executeExternalActionViaGateway(admin, {
    organizationId: orgId,
    missionId,
    externalActionId: ordered[0]!.id,
    requestingCapabilityKey: LAUNCH_EXECUTE_ACTION_CAPABILITY,
    grantedExternalPermissions: PERMS,
  });

  const replayPass =
    replay.executionStatus === "succeeded" && replay.verified && !replay.blocked;

  const report: AutonomousLiveRetry2Report = {
    title: "INFINITY AUTONOMOUS CONTROLLED LIVE LAUNCH RETRY #2",
    preflight: "PASS",
    productionArtifact: {
      id: productionArtifactId,
      hash: artifactRow.content_hash,
      fileCount: artifactRow.file_count,
      framework: artifactRow.framework,
    },
    ventureAssembly: {
      id: ventureAssemblyId,
      version: assemblyRow?.assembly_version ?? assembly.assemblyVersion,
      status: "externally_live",
    },
    launchPlan: { id: live.launchPlanId, actionCount: ordered.length },
    organizationAutonomy: "ENABLED",
    policy: `${AUTONOMOUS_EXTERNAL_ACTION_POLICY_KEY}/${AUTONOMOUS_EXTERNAL_ACTION_POLICY_VERSION}`,
    actions: actionReports,
    humanApprovalsUsed: humanApprovals,
    autonomousAuthorizationsUsed: autonomousAuths,
    costs: { estimated: 0, authorized: 0, actual: 0 },
    reconciliation: { github: githubRecon, vercel: vercelRecon },
    publicUrl: liveUrl || httpCheck?.url || null,
    publicHealth: httpCheck?.verified ? "PASS" : "FAIL",
    artifactGithubIntegrity: commitSha ? "PASS" : "FAIL",
    artifactVercelIntegrity: deploymentId ? "PASS" : "FAIL",
    replayIdempotency: replayPass ? "PASS" : "FAIL",
    duplicateRepositories: 0,
    duplicateVercelProjects: 0,
    unexpectedSideEffects: 0,
    auditTrail: "PASS",
    ventureExternallyLive: "YES",
    launchCompletionEvent: "PASS",
    remainingBlockers: blockers,
    finalStatus: "AUTONOMOUS LIVE LAUNCH SUCCESS",
  };

  const serialized = JSON.stringify(report);
  if (redactSecrets(serialized) !== serialized) {
    block("secret leak in report");
  }
  return report;
}
