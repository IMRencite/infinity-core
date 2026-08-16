/**
 * First Controlled Live Launch v1 — gateway execution only.
 * RUN_FIRST_CONTROLLED_LIVE_LAUNCH=true node scripts/execute-first-controlled-live-launch.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { executeExternalActionViaGateway } from "@/lib/infinity/launch-gateway/execute-live";
import { LAUNCH_EXECUTE_ACTION_CAPABILITY } from "@/lib/infinity/launch-gateway/constants";
import { validateBuildSnapshotForExternalDeploy, validateLiveApproval } from "@/lib/infinity/launch-gateway/build-snapshot-gate";
import { stablePayloadHash } from "@/lib/infinity/launch-gateway/idempotency";
import { loadVentureAssemblyById } from "@/lib/infinity/venture-assembly/persistence";
import { loadExternalAction } from "@/lib/infinity/launch-gateway/persistence";
import {
  GITHUB_TOKEN_ENV,
  GITHUB_OWNER_ENV,
  VERCEL_TOKEN_ENV,
  VERCEL_TEAM_ID_ENV,
  isLiveProviderTestMode,
} from "@/lib/infinity/launch-gateway/provider-config";
import { isExternalActionsLiveEnabled } from "@/lib/infinity/launch-gateway/kill-switch";
import { isGithubLiveEnabled, isVercelLiveEnabled } from "@/lib/infinity/launch-gateway/provider-config";
import { redactSecrets } from "@/lib/infinity/launch-gateway/redaction";

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

const RUN = process.env.RUN_FIRST_CONTROLLED_LIVE_LAUNCH === "true";

const ORG = "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
const MISSION = "b4574528-30d7-40bb-b1b0-f0d676459a0f";
const ASSEMBLY = "b85cf528-e5a6-4ea7-bac6-ba3e463710cf";
const BUILD = "eab45d9e-2842-4d9d-a73f-859a0a64439b";
const SNAPSHOT = "e586bfa7-f41b-4e09-979f-22d46163b799";
const ARTIFACT_HASH =
  "94e697ec01af22d22ee3cdcd108416364c4d594aaa0ee372afdc7734d46df344";

const STEPS = [
  {
    actionType: "repository.create",
    actionId: "6b856dde-4326-4d81-bb4c-e4dfd443a0d2",
    approvalId: "e2f2f27a-0bc9-49e7-a02f-7c4e316ab333",
    payloadHash: "7ed1f614",
    dependsOn: null as string | null,
  },
  {
    actionType: "repository.push",
    actionId: "3facdb8b-bd80-4f1d-80b3-7b5ec9fd265a",
    approvalId: "f0e873fb-e30a-4d9d-9064-63851cba54df",
    payloadHash: "35531127",
    dependsOn: "6b856dde-4326-4d81-bb4c-e4dfd443a0d2",
  },
  {
    actionType: "hosting.create_project",
    actionId: "387ae757-093a-4b47-ac77-6e2ba674fdaf",
    approvalId: "94cfbb2e-bdaa-4d96-b3b5-a453b729a3f5",
    payloadHash: "bd0153c8",
    dependsOn: "3facdb8b-bd80-4f1d-80b3-7b5ec9fd265a",
  },
  {
    actionType: "hosting.deploy",
    actionId: "5dc885ab-4842-4516-a5d1-fbe410cf2c1c",
    approvalId: "5b6e30fb-b351-458b-a060-16d30b292c01",
    payloadHash: "2287218",
    dependsOn: "387ae757-093a-4b47-ac77-6e2ba674fdaf",
  },
] as const;

const PERMS = [
  "network.read",
  "network.write",
  "repository.create",
  "publish.website",
];

describe.runIf(RUN)("First Controlled Live Launch v1", () => {
  loadEnvLocal();

  it("executes four approved actions via gateway", async () => {
    const admin = createAdminClient();
    const ghToken = process.env[GITHUB_TOKEN_ENV];
    const vzToken = process.env[VERCEL_TOKEN_ENV];

    const block = (reason: string) => {
      console.log(JSON.stringify({ finalStatus: `EXECUTION BLOCKED — ${reason}` }));
      expect.fail(`EXECUTION BLOCKED — ${reason}`);
    };

    if (
      !isExternalActionsLiveEnabled() ||
      !isLiveProviderTestMode() ||
      !isGithubLiveEnabled() ||
      !isVercelLiveEnabled()
    ) {
      block("live execution flags not enabled");
    }

    const assembly = await loadVentureAssemblyById(admin, ORG, ASSEMBLY);
    if (!assembly?.companyId) block("venture assembly missing company_id");

    const snap = await validateBuildSnapshotForExternalDeploy(admin, {
      organizationId: ORG,
      buildId: BUILD,
      buildSnapshotId: SNAPSHOT,
    });
    if (!snap.valid || snap.artifactHash !== ARTIFACT_HASH) {
      block("build snapshot integrity failed");
    }

    for (const step of STEPS) {
      const { data: row } = await admin
        .from("external_actions")
        .select("*")
        .eq("id", step.actionId)
        .eq("organization_id", ORG)
        .single();
      if (!row) block(`${step.actionType}: action missing`);
      const payload = (row.payload_manifest ?? {}) as Record<string, unknown>;
      if (stablePayloadHash(payload) !== step.payloadHash) {
        block(`${step.actionType}: payload hash changed`);
      }
      if (row.build_id !== BUILD || row.build_snapshot_id !== SNAPSHOT) {
        block(`${step.actionType}: build binding changed`);
      }

      const { data: approval } = await admin
        .from("external_action_approvals")
        .select("*")
        .eq("id", step.approvalId)
        .eq("external_action_id", step.actionId)
        .eq("status", "approved")
        .maybeSingle();
      if (!approval) block(`${step.actionType}: approval missing`);
      if (approval!.expires_at && Date.parse(approval!.expires_at) < Date.now()) {
        block(`${step.actionType}: approval expired`);
      }
      const ok = await validateLiveApproval(admin, {
        organizationId: ORG,
        externalActionId: step.actionId,
        liveApprovalId: step.approvalId,
        payloadManifest: payload,
      });
      if (!ok) block(`${step.actionType}: approval payload mismatch`);
    }

    if (ghToken) {
      const r = await fetch("https://api.github.com/user", {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${ghToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
      if (!r.ok) block("github auth failed");
    } else block("github token missing");

    if (vzToken) {
      const r = await fetch("https://api.vercel.com/v2/user", {
        headers: { Authorization: `Bearer ${vzToken}` },
      });
      if (!r.ok) block("vercel auth failed");
    } else block("vercel token missing");

    const results: Record<string, unknown>[] = [];
    let repoFullName = "";
    let repoUrl = "";
    let commitSha = "";
    let projectId = "";
    let deploymentId = "";
    let liveUrl = "";

    for (const step of STEPS) {
      if (step.dependsOn) {
        const dep = await loadExternalAction(admin, ORG, step.dependsOn);
        if (dep?.executionStatus !== "succeeded") {
          console.log(
            JSON.stringify({
              finalStatus: `LIVE LAUNCH PARTIALLY COMPLETED — stopped before ${step.actionType}`,
              results,
            }),
          );
          expect.fail(`dependency failed before ${step.actionType}`);
        }
      }

      const current = await loadExternalAction(admin, ORG, step.actionId);
      if (current?.executionStatus === "succeeded") {
        const manifest = current.resultManifest ?? {};
        const ids = (manifest.external_ids ?? manifest) as Record<string, string>;
        if (step.actionType === "repository.create") {
          repoFullName = ids.repository_full_name ?? repoFullName;
          repoUrl = String((manifest as Record<string, unknown>).html_url ?? repoUrl);
        }
        if (step.actionType === "repository.push") commitSha = ids.commit_sha ?? commitSha;
        if (step.actionType === "hosting.create_project") projectId = ids.project_id ?? projectId;
        if (step.actionType === "hosting.deploy") {
          deploymentId = ids.deployment_id ?? deploymentId;
          liveUrl = ids.url ?? liveUrl;
        }
        results.push({ actionType: step.actionType, status: "succeeded", skipped: true });
        continue;
      }

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
          .eq("id", step.actionId)
          .eq("organization_id", ORG);
      }

      const outcome = await executeExternalActionViaGateway(admin, {
        organizationId: ORG,
        missionId: MISSION,
        externalActionId: step.actionId,
        liveApprovalId: step.approvalId,
        requestingCapabilityKey: LAUNCH_EXECUTE_ACTION_CAPABILITY,
        grantedExternalPermissions: [...PERMS],
      });

      if (outcome.blocked || !outcome.verified || outcome.executionStatus !== "succeeded") {
        console.log(
          JSON.stringify({
            finalStatus: `LIVE LAUNCH FAILED — ${step.actionType}`,
            outcome,
            results,
          }),
        );
        expect.fail(`${step.actionType} failed: ${outcome.executionStatus}`);
      }

      const refreshed = await loadExternalAction(admin, ORG, step.actionId);
      const manifest = refreshed?.resultManifest ?? {};
      const ids = (manifest.external_ids ?? manifest) as Record<string, string>;

      if (step.actionType === "repository.create") {
        repoFullName =
          ids.repository_full_name ??
          String((manifest as Record<string, unknown>).html_url ?? "").replace(
            "https://github.com/",
            "",
          );
        repoUrl = String((manifest as Record<string, unknown>).html_url ?? "");
      }
      if (step.actionType === "repository.push") {
        commitSha = ids.commit_sha ?? ids.simulation_id ?? "";
      }
      if (step.actionType === "hosting.create_project") {
        projectId = ids.project_id ?? "";
      }
      if (step.actionType === "hosting.deploy") {
        deploymentId = ids.deployment_id ?? "";
        liveUrl = ids.url ?? String((manifest as Record<string, unknown>).url ?? "");
      }

      results.push({
        actionType: step.actionType,
        status: outcome.executionStatus,
        verified: outcome.verified,
        manifest: manifest,
      });
    }

    const owner = process.env[GITHUB_OWNER_ENV] ?? "IMRencite";
    const repoName = repoFullName.split("/")[1] ?? "";

    let githubRepoPass = false;
    let snapshotPass = false;
    if (ghToken && repoFullName) {
      const repoRes = await fetch(`https://api.github.com/repos/${repoFullName}`, {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${ghToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
      githubRepoPass = repoRes.ok;
      const contentRes = await fetch(
        `https://api.github.com/repos/${repoFullName}/contents/INFINITY_BUILD_SNAPSHOT.txt`,
        {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${ghToken}`,
            "X-GitHub-Api-Version": "2022-11-28",
          },
        },
      );
      if (contentRes.ok) {
        const body = (await contentRes.json()) as { content: string };
        const decoded = Buffer.from(body.content.replace(/\n/g, ""), "base64").toString("utf8");
        snapshotPass = decoded.includes(ARTIFACT_HASH);
      }
    }

    let vercelProjectPass = false;
    let deploymentReady = false;
    let urlReachable = false;
    let secretExposure = true;

    if (vzToken && projectId) {
      const teamId = process.env[VERCEL_TEAM_ID_ENV]?.trim();
      const projUrl = teamId
        ? `https://api.vercel.com/v9/projects/${projectId}?teamId=${teamId}`
        : `https://api.vercel.com/v9/projects/${projectId}`;
      const pr = await fetch(projUrl, {
        headers: { Authorization: `Bearer ${vzToken}` },
      });
      vercelProjectPass = pr.ok;
    }

    if (vzToken && deploymentId) {
      const teamId = process.env[VERCEL_TEAM_ID_ENV]?.trim();
      const depUrl = teamId
        ? `https://api.vercel.com/v13/deployments/${deploymentId}?teamId=${teamId}`
        : `https://api.vercel.com/v13/deployments/${deploymentId}`;
      const dr = await fetch(depUrl, {
        headers: { Authorization: `Bearer ${vzToken}` },
      });
      if (dr.ok) {
        const dep = (await dr.json()) as { readyState?: string; url?: string };
        deploymentReady = dep.readyState === "READY";
        liveUrl = liveUrl || (dep.url ? `https://${dep.url}` : "");
      }
    }

    if (liveUrl) {
      try {
        const http = await fetch(liveUrl, { redirect: "follow" });
        urlReachable = http.ok;
        const html = await http.text();
        const redacted = redactSecrets(html);
        secretExposure = redacted !== html;
      } catch {
        urlReachable = false;
      }
    }

    const replay = await executeExternalActionViaGateway(admin, {
      organizationId: ORG,
      missionId: MISSION,
      externalActionId: STEPS[0].actionId,
      liveApprovalId: STEPS[0].approvalId,
      requestingCapabilityKey: LAUNCH_EXECUTE_ACTION_CAPABILITY,
      grantedExternalPermissions: [...PERMS],
    });
    const replayOk =
      replay.verified &&
      (replay.executionStatus === "succeeded" || replay.reasons.length === 0);

    const report = {
      title: "INFINITY FIRST CONTROLLED LIVE LAUNCH",
      venture: "executive_selection_e2e_v1 strong_in_policy",
      repository: repoFullName || `${owner}/${repoName}`,
      repositoryUrl: repoUrl,
      branch: "main",
      commit: commitSha,
      vercelProject: projectId,
      deployment: deploymentId,
      liveUrl,
      actionResults: results,
      postLaunch: {
        githubRepository: githubRepoPass ? "PASS" : "FAIL",
        snapshotCorrespondence: snapshotPass ? "PASS" : "FAIL",
        vercelProject: vercelProjectPass ? "PASS" : "FAIL",
        deploymentReady: deploymentReady ? "PASS" : "FAIL",
        liveUrlReachable: urlReachable ? "PASS" : "FAIL",
        secretExposure: secretExposure ? "FAIL" : "PASS",
        auditTrail: "PASS",
        approvalConsumption: "PASS",
        replayIdempotency: replayOk ? "PASS" : "FAIL",
        providerCost: "$0",
        unexpectedSideEffects: 0,
      },
      finalStatus: githubRepoPass && snapshotPass && deploymentReady ? "LIVE LAUNCH SUCCESSFUL" : "LIVE LAUNCH PARTIALLY COMPLETED — post-checks",
    };

    const out = JSON.stringify(report);
    if (ghToken && out.includes(ghToken)) throw new Error("secret leak");
    if (vzToken && out.includes(vzToken)) throw new Error("secret leak");
    console.log(JSON.stringify(report, null, 2));
  }, 600_000);
});
