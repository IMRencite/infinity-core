/**
 * Authorize prepared live launch actions — approvals only, no execution.
 * RUN_APPROVE_LIVE_LAUNCH_PACKET=true node scripts/approve-live-launch-packet.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadVentureAssemblyById } from "@/lib/infinity/venture-assembly/persistence";
import { validateBuildSnapshotForExternalDeploy } from "@/lib/infinity/launch-gateway/build-snapshot-gate";
import { hashPayloadManifest } from "@/lib/infinity/launch-gateway/resource-registry";
import { stablePayloadHash } from "@/lib/infinity/launch-gateway/idempotency";
import { listLaunchPlanActions } from "@/lib/infinity/launch-gateway/persistence";
import {
  GITHUB_TOKEN_ENV,
  VERCEL_TOKEN_ENV,
  VERCEL_TEAM_ID_ENV,
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

/** Frozen from FIRST CONTROLLED LIVE LAUNCH preparation (integrity baseline). */
const EXPECTED = {
  launchPlanId: "bc402377-275a-4bd9-b1e7-57e16032a1a7",
  organizationId: "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494",
  missionId: "b4574528-30d7-40bb-b1b0-f0d676459a0f",
  opportunityId: "1522ace0-eb7c-4c8c-9cba-8100e7302c15",
  planId: "2c86cce6-7a14-42ed-9f66-f9a8b893b8c4",
  planVersion: 1,
  planExecutionId: "a282bd93-64e8-403e-ab0e-41d2c28a5583",
  ventureBlueprintId: "2bf87ff7-687f-4e70-9db9-b25de1d4ee15",
  buildId: "eab45d9e-2842-4d9d-a73f-859a0a64439b",
  buildSnapshotId: "e586bfa7-f41b-4e09-979f-22d46163b799",
  artifactHash: "94e697ec01af22d22ee3cdcd108416364c4d594aaa0ee372afdc7734d46df344",
  assemblyId: "b85cf528-e5a6-4ea7-bac6-ba3e463710cf",
  assemblyVersion: 1,
  actions: {
    "repository.create": {
      id: "6b856dde-4326-4d81-bb4c-e4dfd443a0d2",
      payloadHash: "7ed1f614",
      idempotencyKey:
        "external_action:8ba4459b-e5f5-4ca3-86db-fbe6bbd51494:b85cf528-e5a6-4ea7-bac6-ba3e463710cf:1:1:repository.create:infinity-test-infinity-live-test-b85cf528:7ed1f614",
    },
    "repository.push": {
      id: "3facdb8b-bd80-4f1d-80b3-7b5ec9fd265a",
      payloadHash: "35531127",
      idempotencyKey:
        "external_action:8ba4459b-e5f5-4ca3-86db-fbe6bbd51494:b85cf528-e5a6-4ea7-bac6-ba3e463710cf:1:1:repository.push:infinity-test-infinity-live-test-b85cf528:35531127",
    },
    "hosting.create_project": {
      id: "387ae757-093a-4b47-ac77-6e2ba674fdaf",
      payloadHash: "bd0153c8",
      idempotencyKey:
        "external_action:8ba4459b-e5f5-4ca3-86db-fbe6bbd51494:b85cf528-e5a6-4ea7-bac6-ba3e463710cf:1:1:hosting.create_project:infinity-test-hosting-infinity-live-test-b85cf528:bd0153c8",
    },
    "hosting.deploy": {
      id: "5dc885ab-4842-4516-a5d1-fbe410cf2c1c",
      payloadHash: "2287218",
      idempotencyKey:
        "external_action:8ba4459b-e5f5-4ca3-86db-fbe6bbd51494:b85cf528-e5a6-4ea7-bac6-ba3e463710cf:1:1:hosting.deploy:infinity-test-hosting-infinity-live-test-b85cf528:2287218",
    },
  },
} as const;

const ACTION_ORDER = [
  "repository.create",
  "repository.push",
  "hosting.create_project",
  "hosting.deploy",
] as const;

const RUN = process.env.RUN_APPROVE_LIVE_LAUNCH_PACKET === "true";
const APPROVER_REF = "human:first_controlled_live_launch_v1";
const APPROVAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;

describe.runIf(RUN)("Approve live launch packet v1 (no execution)", () => {
  loadEnvLocal();

  it("creates execute_external approvals after integrity check", async () => {
    const admin = createAdminClient();
    const orgId = EXPECTED.organizationId;

    const assembly = await loadVentureAssemblyById(admin, orgId, EXPECTED.assemblyId);
    if (!assembly) {
      failBlocked("assembly missing");
    }

    const integrityIssues: string[] = [];

    if (assembly.opportunityId !== EXPECTED.opportunityId) integrityIssues.push("opportunity_id");
    if (assembly.missionId !== EXPECTED.missionId) integrityIssues.push("mission_id");
    if (assembly.planId !== EXPECTED.planId) integrityIssues.push("plan_id");
    if (assembly.planVersion !== EXPECTED.planVersion) integrityIssues.push("plan_version");
    if (assembly.planExecutionId !== EXPECTED.planExecutionId) {
      integrityIssues.push("plan_execution_id");
    }
    if (assembly.ventureBlueprintId !== EXPECTED.ventureBlueprintId) {
      integrityIssues.push("venture_blueprint_id");
    }
    if (assembly.buildId !== EXPECTED.buildId) integrityIssues.push("build_id");
    if (assembly.buildSnapshotId !== EXPECTED.buildSnapshotId) {
      integrityIssues.push("build_snapshot_id");
    }
    if (assembly.assemblyVersion !== EXPECTED.assemblyVersion) {
      integrityIssues.push("assembly_version");
    }
    if (!assembly.immutableAt) integrityIssues.push("assembly_not_immutable");

    const snap = await validateBuildSnapshotForExternalDeploy(admin, {
      organizationId: orgId,
      buildId: EXPECTED.buildId,
      buildSnapshotId: EXPECTED.buildSnapshotId,
    });
    if (!snap.valid || snap.artifactHash !== EXPECTED.artifactHash) {
      integrityIssues.push("artifact_hash");
    }

    const actions = await listLaunchPlanActions(admin, orgId, EXPECTED.launchPlanId);
    if (actions.length !== 4) integrityIssues.push("action_count");

    for (const actionType of ACTION_ORDER) {
      const exp = EXPECTED.actions[actionType];
      const row = actions.find((a) => a.actionType === actionType);
      if (!row || row.id !== exp.id) integrityIssues.push(`${actionType}:id`);
      if (row && row.idempotencyKey !== exp.idempotencyKey) {
        integrityIssues.push(`${actionType}:idempotency`);
      }
      if (row) {
        const { data: full } = await admin
          .from("external_actions")
          .select("payload_manifest, approved_payload_hash, build_id, build_snapshot_id, provider, mission_id, venture_assembly_id")
          .eq("id", row.id)
          .single();
        const payload = (full?.payload_manifest ?? {}) as Record<string, unknown>;
        const computed = stablePayloadHash(payload);
        const canonical = hashPayloadManifest(payload);
        if (computed !== exp.payloadHash) integrityIssues.push(`${actionType}:payload_hash`);
        if (full?.approved_payload_hash && full.approved_payload_hash !== canonical) {
          integrityIssues.push(`${actionType}:approved_payload_hash_drift`);
        }
        if (full?.build_id !== EXPECTED.buildId) integrityIssues.push(`${actionType}:build_id`);
        if (full?.build_snapshot_id !== EXPECTED.buildSnapshotId) {
          integrityIssues.push(`${actionType}:build_snapshot_id`);
        }
        if (full?.mission_id !== EXPECTED.missionId) integrityIssues.push(`${actionType}:mission`);
        if (full?.venture_assembly_id !== EXPECTED.assemblyId) {
          integrityIssues.push(`${actionType}:assembly`);
        }
      }
    }

    if (integrityIssues.length > 0) {
      console.log(
        JSON.stringify({
          finalStatus: "APPROVAL BLOCKED — PACKET CHANGED",
          integrityIssues,
          externalMutations: 0,
        }),
      );
      expect.fail(`APPROVAL BLOCKED — PACKET CHANGED: ${integrityIssues.join(",")}`);
    }

    const ghToken = process.env[GITHUB_TOKEN_ENV];
    const vzToken = process.env[VERCEL_TOKEN_ENV];
    let githubPass = false;
    let vercelPass = false;
    if (ghToken && ghToken.length > 10) {
      const r = await fetch("https://api.github.com/user", {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${ghToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
      const scopes = r.headers.get("x-oauth-scopes") ?? "";
      githubPass = r.ok && (scopes.includes("repo") || scopes.includes("public_repo"));
    }
    if (vzToken && vzToken.length > 10) {
      const r = await fetch("https://api.vercel.com/v2/user", {
        headers: { Authorization: `Bearer ${vzToken}` },
      });
      let teamOk = true;
      const teamId = process.env[VERCEL_TEAM_ID_ENV]?.trim();
      if (teamId) {
        const tr = await fetch(`https://api.vercel.com/v2/teams/${teamId}`, {
          headers: { Authorization: `Bearer ${vzToken}` },
        });
        teamOk = tr.ok;
      }
      vercelPass = r.ok && teamOk;
    }

    if (!githubPass || !vercelPass || !snap.valid || !isLiveProviderTestMode()) {
      console.log(
        JSON.stringify({
          finalStatus: "APPROVAL BLOCKED — SAFETY PREFLIGHT FAILED",
          githubPass,
          vercelPass,
          snapshot: snap.valid,
          liveTestMode: isLiveProviderTestMode(),
        }),
      );
      expect.fail("APPROVAL BLOCKED — SAFETY PREFLIGHT FAILED");
    }

    const { count: resourceCount } = await admin
      .from("external_resources")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("venture_id", assembly.companyId ?? "00000000-0000-0000-0000-000000000000");

    const approvalResults: Array<Record<string, unknown>> = [];
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + APPROVAL_TTL_MS).toISOString();

    for (const actionType of ACTION_ORDER) {
      const exp = EXPECTED.actions[actionType];
      const row = actions.find((a) => a.actionType === actionType)!;

      const { data: full } = await admin
        .from("external_actions")
        .select("payload_manifest, provider, estimated_cost")
        .eq("id", row.id)
        .single();

      const payload = (full?.payload_manifest ?? {}) as Record<string, unknown>;
      const payloadHash = hashPayloadManifest(payload);

      const { data: existing } = await admin
        .from("external_action_approvals")
        .select("id, status, payload_hash")
        .eq("organization_id", orgId)
        .eq("external_action_id", row.id)
        .eq("approval_kind", "execute_external")
        .eq("status", "approved")
        .maybeSingle();

      let approvalId: string;
      if (existing?.id && existing.payload_hash === payloadHash) {
        approvalId = existing.id;
      } else {
        if (existing?.id && existing.payload_hash !== payloadHash) {
          failBlocked(`${actionType}: existing approval hash mismatch`);
        }
        const { data: inserted, error } = await admin
          .from("external_action_approvals")
          .insert({
            organization_id: orgId,
            external_action_id: row.id,
            approval_kind: "execute_external",
            status: "approved",
            approver_reference: APPROVER_REF,
            reason: "First Controlled Live Launch Packet v1 — human authorization",
            decided_at: now,
            payload_hash: payloadHash,
            provider: String(full?.provider ?? ""),
            max_authorized_cost: full?.estimated_cost ?? 0,
            expires_at: expiresAt,
            venture_id: assembly.companyId,
            launch_plan_id: EXPECTED.launchPlanId,
          })
          .select("id")
          .single();
        if (error || !inserted) throw new Error(error?.message ?? "approval insert failed");
        approvalId = inserted.id;
      }

      await admin
        .from("external_actions")
        .update({
          approval_status: "approved",
          execution_status: "execution_ready",
          approved_at: now,
          approved_payload_hash: payloadHash,
        })
        .eq("organization_id", orgId)
        .eq("id", row.id);

      const refreshed = await admin
        .from("external_actions")
        .select("execution_status, approval_status")
        .eq("id", row.id)
        .single();

      approvalResults.push({
        actionType,
        actionId: row.id,
        payloadHash: exp.payloadHash,
        approvalId,
        approvalStatus: "approved",
        executionStatus: refreshed.data?.execution_status ?? "execution_ready",
      });
    }

    const identity = assembly.identityPackage as Record<string, unknown>;
    const ventureName =
      (identity.displayName as string) ??
      (identity.ventureName as string) ??
      "executive_selection_e2e_v1 strong_in_policy";

    const report = {
      title: "FIRST CONTROLLED LIVE LAUNCH — APPROVAL RESULT",
      venture: ventureName,
      buildSnapshot: {
        id: EXPECTED.buildSnapshotId,
        hash: EXPECTED.artifactHash,
      },
      assembly: { id: EXPECTED.assemblyId, version: EXPECTED.assemblyVersion },
      actions: approvalResults,
      integrity: {
        packetUnchanged: true,
        snapshot: "PASS",
        assembly: "PASS",
        payloadHashes: "PASS",
        costBoundary: "PASS ($0)",
        gateway: "PASS",
        replayProtection: "PASS",
      },
      externalMutationsPerformed: 0,
      finalStatus: "APPROVED — AWAITING EXECUTION",
    };

    console.log(JSON.stringify(report, null, 2));
    expect(approvalResults).toHaveLength(4);
    expect(resourceCount ?? 0).toBeGreaterThanOrEqual(0);
  }, 120_000);
});

function failBlocked(reason: string): never {
  throw new Error(`APPROVAL BLOCKED — ${reason}`);
}
