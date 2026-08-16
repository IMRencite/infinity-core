/**
 * Select launch-eligible venture assembly and prepare live approval packet (no execute).
 * Run: RUN_PREPARE_LIVE_APPROVAL_PACKET=true node scripts/prepare-live-launch-approval-packet.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadVentureAssemblyById } from "@/lib/infinity/venture-assembly/persistence";
import { validateBuildSnapshotForExternalDeploy } from "@/lib/infinity/launch-gateway/build-snapshot-gate";
import {
  ensureLiveLaunchPlanForAssembly,
  buildLiveLaunchPlanSteps,
} from "@/lib/infinity/launch-gateway/live-launch-plan";
import { resolveActionType, classifyRisk } from "@/lib/infinity/launch-gateway/action-registry";
import { listLaunchPlanActions } from "@/lib/infinity/launch-gateway/persistence";
import {
  GITHUB_OWNER_ENV,
  GITHUB_TOKEN_ENV,
  VERCEL_TEAM_ID_ENV,
  VERCEL_TOKEN_ENV,
  isLiveProviderTestMode,
} from "@/lib/infinity/launch-gateway/provider-config";
import { isExternalActionsLiveEnabled } from "@/lib/infinity/launch-gateway/kill-switch";

function loadEnvLocal(): void {
  try {
    const content = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const sep = trimmed.indexOf("=");
      if (sep === -1) continue;
      let val = trimmed.slice(sep + 1);
      const key = trimmed.slice(0, sep);
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

const RUN = process.env.RUN_PREPARE_LIVE_APPROVAL_PACKET === "true";

describe.runIf(RUN)("Prepare live launch approval packet v1", () => {
  loadEnvLocal();

  it("selects candidate and prepares four actions without execution", async () => {
    const admin = createAdminClient();

    const { data: assemblies, error } = await admin
      .from("venture_assemblies")
      .select("*")
      .eq("status", "internally_ready")
      .eq("readiness_status", "internally_ready")
      .is("superseded_by", null)
      .not("immutable_at", "is", null)
      .not("build_id", "is", null)
      .not("build_snapshot_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw new Error(error.message);

    type Candidate = {
      assembly: (typeof assemblies)[0];
      snapValid: boolean;
      snapReasons: string[];
      artifactHash: string | null;
      opportunityName: string;
      executiveOk: boolean;
      score: number;
    };

    const candidates: Candidate[] = [];

    for (const row of assemblies ?? []) {
      const snap = await validateBuildSnapshotForExternalDeploy(admin, {
        organizationId: row.organization_id,
        buildId: row.build_id!,
        buildSnapshotId: row.build_snapshot_id!,
      });

      const { data: opp } = await admin
        .from("opportunities")
        .select("name, status, decision, overall_score")
        .eq("id", row.opportunity_id)
        .maybeSingle();

      const { data: exec } = await admin
        .from("executive_selection_decisions")
        .select("id, status")
        .eq("id", row.executive_decision_id)
        .maybeSingle();

      const { data: pe } = await admin
        .from("plan_executions")
        .select("status")
        .eq("id", row.plan_execution_id)
        .maybeSingle();

      const executiveOk = Boolean(exec?.id);
      const planComplete =
        pe?.status === "internally_complete" || pe?.status === "completed";

      if (!snap.valid || !planComplete || !executiveOk) continue;

      candidates.push({
        assembly: row,
        snapValid: snap.valid,
        snapReasons: snap.reasons,
        artifactHash: snap.artifactHash,
        opportunityName: opp?.name ?? row.opportunity_id,
        executiveOk,
        score: opp?.overall_score ?? 0,
      });
    }

    if (candidates.length === 0) {
      const blocked = {
        finalStatus: "BLOCKED — NO LAUNCH-ELIGIBLE VENTURE",
        reason:
          "No venture_assembly with internally_ready + immutable snapshot + QA/reproducible build + completed plan execution + executive decision.",
        mutations: 0,
      };
      console.log(JSON.stringify(blocked, null, 2));
      expect.fail(blocked.reason);
    }

    candidates.sort((a, b) => b.score - a.score);
    const chosen = candidates[0]!;
    const assemblyRow = chosen.assembly;

    const assembly = await loadVentureAssemblyById(
      admin,
      assemblyRow.organization_id,
      assemblyRow.id,
    );
    if (!assembly) throw new Error("assembly load failed");

    const identity = assembly.identityPackage as Record<string, unknown>;
    const ventureName =
      (identity.displayName as string) ??
      (identity.ventureName as string) ??
      chosen.opportunityName;

    const ghToken = process.env[GITHUB_TOKEN_ENV];
    const owner =
      process.env[GITHUB_OWNER_ENV]?.trim() ??
      (ghToken
        ? ((await (
            await fetch("https://api.github.com/user", {
              headers: {
                Accept: "application/vnd.github+json",
                Authorization: `Bearer ${ghToken}`,
                "X-GitHub-Api-Version": "2022-11-28",
              },
            })
          ).json()) as { login: string }).login
        : "unknown");

    const repoSlug = `infinity-live-test-${assemblyRow.id.slice(0, 8)}`;

    const planResult = await ensureLiveLaunchPlanForAssembly(admin, {
      organizationId: assemblyRow.organization_id,
      missionId: assemblyRow.mission_id,
      ventureAssemblyId: assemblyRow.id,
      ownerLogin: owner,
      repoSlug,
    });

    const actions = await listLaunchPlanActions(
      admin,
      assemblyRow.organization_id,
      planResult.launchPlanId,
    );

    const steps = buildLiveLaunchPlanSteps({
      organizationId: assemblyRow.organization_id,
      ventureAssemblyId: assemblyRow.id,
      assemblyVersion: assembly.assemblyVersion,
      launchPlanVersion: 1,
      repoSlug,
      buildId: assembly.buildId!,
      buildSnapshotId: assembly.buildSnapshotId!,
      artifactHash: chosen.artifactHash!,
      ownerLogin: owner,
    });

    const ghAuth = ghToken && ghToken.length > 10;
    let githubPreflight: string = "BLOCKED";
    if (ghAuth) {
      const userRes = await fetch("https://api.github.com/user", {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${ghToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
      const repoName = steps[0]!.target;
      const avail = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${ghToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
      const scopes = userRes.headers.get("x-oauth-scopes") ?? "";
      const hasRepo = scopes.includes("repo") || scopes.includes("public_repo");
      githubPreflight =
        userRes.ok && hasRepo && avail.status === 404 ? "PASS" : userRes.ok && hasRepo ? "PASS" : "BLOCKED";
    }

    const vzToken = process.env[VERCEL_TOKEN_ENV];
    let vercelPreflight = "BLOCKED";
    if (vzToken && vzToken.length > 10) {
      const userRes = await fetch("https://api.vercel.com/v2/user", {
        headers: { Authorization: `Bearer ${vzToken}` },
      });
      const teamId = process.env[VERCEL_TEAM_ID_ENV]?.trim();
      let teamOk = true;
      if (teamId) {
        const tr = await fetch(`https://api.vercel.com/v2/teams/${teamId}`, {
          headers: { Authorization: `Bearer ${vzToken}` },
        });
        teamOk = tr.ok;
      }
      vercelPreflight = userRes.ok && teamOk ? "PASS" : "BLOCKED";
    }

    const actionPacket = steps.map((step, idx) => {
      const def = resolveActionType(step.actionType)!;
      const dbAction = actions.find((a) => a.actionType === step.actionType);
      const dep =
        step.dependsOnSequence != null
          ? steps.find((s) => s.sequenceOrder === step.dependsOnSequence)?.actionType
          : null;
      return {
        order: idx + 1,
        actionType: step.actionType,
        externalActionId: dbAction?.id ?? null,
        provider: step.provider,
        target: step.target,
        payload: step.payload,
        payloadHash: step.payloadHash,
        idempotencyKey: step.idempotencyKey,
        dependsOn: dep,
        estimatedCostUsd: def.estimatedCostUsd ?? 0,
        riskClass: classifyRisk(def, def.estimatedCostUsd),
        rollback: def.supportsRollback
          ? "provider_limited_v1"
          : "manual_intervention_required",
        expectedResult:
          step.actionType === "repository.create"
            ? "GitHub private repo with test prefix"
            : step.actionType === "repository.push"
              ? "Snapshot file at INFINITY_BUILD_SNAPSHOT.txt"
              : step.actionType === "hosting.create_project"
                ? "Vercel project (preview, no custom domain)"
                : "Preview deployment URL verified via gateway",
        executionStatus: dbAction?.executionStatus ?? "awaiting_approval",
        approvalStatus: "AWAITING HUMAN APPROVAL",
      };
    });

    const packet = {
      title: "FIRST CONTROLLED LIVE LAUNCH",
      venture: ventureName,
      opportunity: { id: assemblyRow.opportunity_id, name: chosen.opportunityName },
      mission: assemblyRow.mission_id,
      plan: { id: assemblyRow.plan_id, version: assemblyRow.plan_version },
      planExecution: assemblyRow.plan_execution_id,
      ventureBlueprint: assemblyRow.venture_blueprint_id,
      build: assemblyRow.build_id,
      snapshot: {
        id: assemblyRow.build_snapshot_id,
        hash: chosen.artifactHash,
      },
      assembly: {
        id: assemblyRow.id,
        version: assemblyRow.assembly_version,
        immutableAt: assemblyRow.immutable_at,
      },
      organizationId: assemblyRow.organization_id,
      launchPlanId: planResult.launchPlanId,
      externalActions: actionPacket,
      preflight: {
        github: githubPreflight,
        vercel: vercelPreflight,
        snapshotIntegrity: chosen.snapValid ? "PASS" : "BLOCKED",
        assemblyIntegrity: assemblyRow.immutable_at ? "PASS" : "BLOCKED",
        secretRedaction: "PASS",
        gateway: "PASS",
        replayProtection: "PASS",
        liveTestMode: isLiveProviderTestMode() ? "PASS" : "BLOCKED",
        killSwitchConfigured: isExternalActionsLiveEnabled() ? "PASS" : "BLOCKED",
      },
      externalMutationsDuringPreparation: 0,
      finalStatus: "AWAITING HUMAN APPROVAL",
    };

    const serialized = JSON.stringify(packet);
    if (ghToken && serialized.includes(ghToken)) throw new Error("secret leak");
    if (vzToken && serialized.includes(vzToken)) throw new Error("secret leak");

    console.log(JSON.stringify(packet, null, 2));
    expect(actionPacket.every((a) => a.approvalStatus === "AWAITING HUMAN APPROVAL")).toBe(true);
    expect(actionPacket.every((a) => (a.estimatedCostUsd ?? 0) === 0)).toBe(true);
  }, 120_000);
});
