import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { resolveActionType } from "@/lib/infinity/launch-gateway/action-registry";
import { LAUNCH_GATEWAY_EVENTS, LAUNCH_GATEWAY_POLICY_VERSION } from "@/lib/infinity/launch-gateway/constants";
import { emitLaunchGatewayEvent } from "@/lib/infinity/launch-gateway/events";
import {
  findExternalActionByIdempotency,
  insertExternalAction,
  updateExternalAction,
  type ExternalActionRecord,
} from "@/lib/infinity/launch-gateway/persistence";
import { PROVIDER_KEYS } from "@/lib/infinity/launch-gateway/provider-config";
import { redactUnknown } from "@/lib/infinity/launch-gateway/redaction";
import {
  resourceIdempotencyKey,
  upsertExternalResource,
} from "@/lib/infinity/launch-gateway/resource-registry";

export const GDE_LIVE_LEDGER_CLAIMER = "gde.vercel_live_verification";

export type GdeLiveDurableState =
  | "AUTHORIZED"
  | "EXECUTING"
  | "SUCCEEDED"
  | "FAILED"
  | "BLOCKED"
  | "RECONCILIATION_REQUIRED";

export type GdeLiveClaimDecision =
  | "proceed"
  | "reuse"
  | "reconcile"
  | "reconciliation_required"
  | "blocked";

export type GdeLiveActionRecord = {
  externalActionId: string;
  organizationId: string;
  missionId: string;
  actionType: string;
  target: string;
  executionStatus: string;
  durableState: GdeLiveDurableState;
  idempotencyKey: string;
  claimedBy: string | null;
  resultManifest: Record<string, unknown> | null;
  payloadManifest: Record<string, unknown>;
  providerReferences: Record<string, string>;
  error: string | null;
};

export type GdeLiveClaimInput = {
  organizationId: string;
  missionId: string;
  ventureId: string;
  sessionId: string;
  executionRequestId: string;
  actionId: string;
  gatewayActionType: string;
  target: string;
  idempotencyKey: string;
  eagAuthorizationId?: string | null;
  treasuryAuthorizationId?: string | null;
  maxAuthorizedUsd?: number | null;
  publicLaunchAuthority?: false;
};

export type GdeLiveClaimResult = {
  decision: GdeLiveClaimDecision;
  record: GdeLiveActionRecord;
};

export type GdeLiveActionLedger = {
  findByIdempotency(organizationId: string, idempotencyKey: string): Promise<GdeLiveActionRecord | null>;
  claim(input: GdeLiveClaimInput): Promise<GdeLiveClaimResult>;
  complete(input: {
    organizationId: string;
    externalActionId: string;
    providerReferences: Record<string, string>;
    result: Record<string, unknown>;
    verifiedUrl?: string | null;
    verificationStatus?: string | null;
  }): Promise<GdeLiveActionRecord>;
  fail(input: {
    organizationId: string;
    externalActionId: string;
    error: string;
    providerReferences?: Record<string, string>;
  }): Promise<GdeLiveActionRecord>;
  block(input: {
    organizationId: string;
    externalActionId: string;
    error: string;
  }): Promise<GdeLiveActionRecord>;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isDurableLedgerUuid(value: string | null | undefined): boolean {
  return Boolean(value && UUID_RE.test(value));
}

function providerRefsFromManifest(manifest: Record<string, unknown> | null): Record<string, string> {
  if (!manifest) return {};
  const ids = (manifest.external_ids ?? manifest.provider_references ?? {}) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(ids)) {
    if (typeof value === "string" && value.trim()) out[key] = value;
  }
  return out;
}

function hasProviderWriteRef(refs: Record<string, string>, actionType: string): boolean {
  if (actionType === "hosting.create_project") return Boolean(refs.project_id);
  if (actionType === "hosting.deploy" || actionType === "hosting.verify_deployment") {
    return Boolean(refs.deployment_id);
  }
  return Object.keys(refs).length > 0;
}

function durableStateFromRow(row: {
  executionStatus: string;
  providerReferences: Record<string, string>;
  actionType: string;
}): GdeLiveDurableState {
  if (row.executionStatus === "succeeded") return "SUCCEEDED";
  if (row.executionStatus === "blocked") return "BLOCKED";
  if (row.executionStatus === "failed") return "FAILED";
  if (row.executionStatus === "executing") {
    return hasProviderWriteRef(row.providerReferences, row.actionType)
      ? "EXECUTING"
      : "RECONCILIATION_REQUIRED";
  }
  if (row.executionStatus === "approved" || row.executionStatus === "execution_ready" || row.executionStatus === "requested") {
    return "AUTHORIZED";
  }
  return "AUTHORIZED";
}

function toRecord(input: {
  id: string;
  organizationId: string;
  missionId: string;
  actionType: string;
  target: string;
  executionStatus: string;
  idempotencyKey: string;
  claimedBy: string | null;
  resultManifest: Record<string, unknown> | null;
  payloadManifest: Record<string, unknown>;
  error: string | null;
}): GdeLiveActionRecord {
  const providerReferences = providerRefsFromManifest(input.resultManifest);
  return {
    externalActionId: input.id,
    organizationId: input.organizationId,
    missionId: input.missionId,
    actionType: input.actionType,
    target: input.target,
    executionStatus: input.executionStatus,
    durableState: durableStateFromRow({
      executionStatus: input.executionStatus,
      providerReferences,
      actionType: input.actionType,
    }),
    idempotencyKey: input.idempotencyKey,
    claimedBy: input.claimedBy,
    resultManifest: input.resultManifest,
    payloadManifest: input.payloadManifest,
    providerReferences,
    error: input.error,
  };
}

function decideClaim(record: GdeLiveActionRecord): GdeLiveClaimDecision {
  if (record.executionStatus === "succeeded" && hasProviderWriteRef(record.providerReferences, record.actionType)) {
    return "reuse";
  }
  if (record.executionStatus === "executing" && hasProviderWriteRef(record.providerReferences, record.actionType)) {
    return "reconcile";
  }
  if (record.executionStatus === "executing" && !hasProviderWriteRef(record.providerReferences, record.actionType)) {
    return "reconciliation_required";
  }
  if (record.executionStatus === "failed") return "reconciliation_required";
  if (record.executionStatus === "blocked") return "blocked";
  if (record.claimedBy && record.claimedBy !== GDE_LIVE_LEDGER_CLAIMER && record.executionStatus === "executing") {
    return "reconciliation_required";
  }
  return "proceed";
}

function auditPayload(input: GdeLiveClaimInput): Record<string, unknown> {
  return redactUnknown({
    purpose: "VERCEL_LIVE_VERIFICATION",
    session_id: input.sessionId,
    execution_request_id: input.executionRequestId,
    action_id: input.actionId,
    venture_id: input.ventureId,
    gde_organization_id: input.organizationId,
    provider: PROVIDER_KEYS.vercel,
    gateway_action_type: input.gatewayActionType,
    eag_authorization_id: input.eagAuthorizationId ?? null,
    treasury_authorization_id: input.treasuryAuthorizationId ?? null,
    max_authorized_usd: input.maxAuthorizedUsd ?? null,
    public_launch_authority: false,
    cost_state: "UNKNOWN",
  }) as Record<string, unknown>;
}

type MemoryRow = {
  id: string;
  organizationId: string;
  missionId: string;
  actionType: string;
  target: string;
  executionStatus: string;
  idempotencyKey: string;
  claimedBy: string | null;
  resultManifest: Record<string, unknown> | null;
  payloadManifest: Record<string, unknown>;
  error: string | null;
};

export function createMemoryGdeLiveActionLedger(seed: MemoryRow[] = []): GdeLiveActionLedger {
  const rows = new Map<string, MemoryRow>();
  for (const row of seed) rows.set(`${row.organizationId}:${row.idempotencyKey}`, row);

  const read = (organizationId: string, idempotencyKey: string) =>
    rows.get(`${organizationId}:${idempotencyKey}`) ?? null;

  return {
    async findByIdempotency(organizationId, idempotencyKey) {
      const row = read(organizationId, idempotencyKey);
      return row ? toRecord(row) : null;
    },
    async claim(input) {
      const existing = read(input.organizationId, input.idempotencyKey);
      if (existing) {
        const record = toRecord(existing);
        return { decision: decideClaim(record), record };
      }
      const row: MemoryRow = {
        id: crypto.randomUUID(),
        organizationId: input.organizationId,
        missionId: input.missionId,
        actionType: input.gatewayActionType,
        target: input.target,
        executionStatus: "executing",
        idempotencyKey: input.idempotencyKey,
        claimedBy: GDE_LIVE_LEDGER_CLAIMER,
        resultManifest: null,
        payloadManifest: auditPayload(input),
        error: null,
      };
      rows.set(`${input.organizationId}:${input.idempotencyKey}`, row);
      return { decision: "proceed", record: toRecord(row) };
    },
    async complete(input) {
      const row = [...rows.values()].find((item) => item.id === input.externalActionId);
      if (!row) throw new Error("external action not found");
      row.executionStatus = "succeeded";
      row.resultManifest = redactUnknown({
        ...input.result,
        external_ids: input.providerReferences,
        provider_references: input.providerReferences,
      }) as Record<string, unknown>;
      row.error = null;
      return toRecord(row);
    },
    async fail(input) {
      const row = [...rows.values()].find((item) => item.id === input.externalActionId);
      if (!row) throw new Error("external action not found");
      row.executionStatus = "failed";
      row.error = input.error.slice(0, 500);
      if (input.providerReferences) {
        row.resultManifest = redactUnknown({
          ...(row.resultManifest ?? {}),
          external_ids: input.providerReferences,
          provider_references: input.providerReferences,
        }) as Record<string, unknown>;
      }
      return toRecord(row);
    },
    async block(input) {
      const row = [...rows.values()].find((item) => item.id === input.externalActionId);
      if (!row) throw new Error("external action not found");
      row.executionStatus = "blocked";
      row.error = input.error.slice(0, 500);
      return toRecord(row);
    },
  };
}

function mapPersisted(
  row: ExternalActionRecord,
  extras: { missionId: string; claimedBy: string | null; payloadManifest: Record<string, unknown>; error: string | null },
): GdeLiveActionRecord {
  return toRecord({
    id: row.id,
    organizationId: row.organizationId,
    missionId: extras.missionId,
    actionType: row.actionType,
    target: row.target,
    executionStatus: row.executionStatus,
    idempotencyKey: row.idempotencyKey,
    claimedBy: extras.claimedBy,
    resultManifest: row.resultManifest,
    payloadManifest: extras.payloadManifest,
    error: extras.error,
  });
}

export function createLaunchGatewayGdeLiveActionLedger(
  admin: AdminSupabaseClient,
  binding: { organizationId: string; missionId: string; ventureId?: string | null },
): GdeLiveActionLedger {
  if (!isDurableLedgerUuid(binding.organizationId) || !isDurableLedgerUuid(binding.missionId)) {
    throw new Error("durable external_actions reuse requires organization and mission UUIDs");
  }

  async function loadFull(organizationId: string, idempotencyKey: string) {
    const { data } = await admin
      .from("external_actions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    return data as Record<string, unknown> | null;
  }

  return {
    async findByIdempotency(organizationId, idempotencyKey) {
      const mapped = await findExternalActionByIdempotency(admin, organizationId, idempotencyKey);
      if (!mapped) return null;
      const full = await loadFull(organizationId, idempotencyKey);
      return mapPersisted(mapped, {
        missionId: String(full?.mission_id ?? binding.missionId),
        claimedBy: full?.claimed_by ? String(full.claimed_by) : null,
        payloadManifest: (full?.payload_manifest as Record<string, unknown>) ?? {},
        error: full?.error ? String(full.error) : null,
      });
    },
    async claim(input) {
      const organizationId = binding.organizationId;
      const existing = await findExternalActionByIdempotency(admin, organizationId, input.idempotencyKey);
      if (existing) {
        const full = await loadFull(organizationId, input.idempotencyKey);
        const record = mapPersisted(existing, {
          missionId: String(full?.mission_id ?? binding.missionId),
          claimedBy: full?.claimed_by ? String(full.claimed_by) : null,
          payloadManifest: (full?.payload_manifest as Record<string, unknown>) ?? {},
          error: full?.error ? String(full.error) : null,
        });
        return { decision: decideClaim(record), record };
      }
      const def = resolveActionType(input.gatewayActionType);
      try {
        const inserted = await insertExternalAction(admin, {
          organization_id: organizationId,
          mission_id: binding.missionId,
          venture_id: isDurableLedgerUuid(binding.ventureId) ? binding.ventureId : null,
          action_type: input.gatewayActionType,
          provider: PROVIDER_KEYS.vercel,
          adapter_key: PROVIDER_KEYS.vercel,
          target: input.target,
          idempotency_key: input.idempotencyKey,
          execution_status: "executing",
          execution_mode: "live",
          provider_execution_mode: "live",
          approval_status: "approved",
          authorization_source: "gde_vercel_live_verification",
          claimed_by: GDE_LIVE_LEDGER_CLAIMER,
          claimed_at: new Date().toISOString(),
          risk_class: def?.defaultRisk ?? "moderate",
          side_effect_class: def?.sideEffectClass ?? "external_account_change",
          policy_version: LAUNCH_GATEWAY_POLICY_VERSION,
          cost_confidence: "unknown",
          estimated_cost: 0,
          correlation_id: isDurableLedgerUuid(input.executionRequestId) ? input.executionRequestId : null,
          payload_manifest: auditPayload(input) as Json,
          audit_snapshot: auditPayload(input) as Json,
        });
        await emitLaunchGatewayEvent(admin, {
          organizationId,
          eventType: LAUNCH_GATEWAY_EVENTS.externalActionExecutionStarted,
          message: "GDE Vercel live action claimed",
          externalActionId: inserted.id,
          correlationId: input.executionRequestId,
          payload: { action_type: input.gatewayActionType, idempotency_key: input.idempotencyKey },
        });
        return {
          decision: "proceed",
          record: mapPersisted(inserted, {
            missionId: binding.missionId,
            claimedBy: GDE_LIVE_LEDGER_CLAIMER,
            payloadManifest: auditPayload(input),
            error: null,
          }),
        };
      } catch {
        const raced = await findExternalActionByIdempotency(admin, organizationId, input.idempotencyKey);
        if (!raced) throw new Error("durable external action claim failed");
        const full = await loadFull(organizationId, input.idempotencyKey);
        const record = mapPersisted(raced, {
          missionId: String(full?.mission_id ?? binding.missionId),
          claimedBy: full?.claimed_by ? String(full.claimed_by) : null,
          payloadManifest: (full?.payload_manifest as Record<string, unknown>) ?? {},
          error: full?.error ? String(full.error) : null,
        });
        return { decision: decideClaim(record), record };
      }
    },
    async complete(input) {
      const safe = redactUnknown({
        ...input.result,
        external_ids: input.providerReferences,
        provider_references: input.providerReferences,
      }) as Record<string, unknown>;
      await updateExternalAction(admin, input.organizationId, input.externalActionId, {
        execution_status: "succeeded",
        executed_at: new Date().toISOString(),
        result_manifest: safe as Json,
        verification_status: input.verificationStatus ?? "verified",
        verified_url: input.verifiedUrl ?? null,
        error: null,
      });
      const providerResourceId =
        input.providerReferences.deployment_id ?? input.providerReferences.project_id ?? input.externalActionId;
      const resourceType = input.providerReferences.deployment_id ? "deployment" : "hosting_project";
      if (binding.ventureId) {
        try {
          await upsertExternalResource(admin, {
            organizationId: input.organizationId,
            ventureId: isDurableLedgerUuid(binding.ventureId) ? binding.ventureId : null,
            launchPlanId: null,
            externalActionId: input.externalActionId,
            resourceType,
            provider: PROVIDER_KEYS.vercel,
            providerResourceId,
            canonicalName: input.providerReferences.project_name ?? providerResourceId,
            externalUrl: input.verifiedUrl ?? input.providerReferences.url ?? null,
            executionMode: "live",
            createdByActionId: input.externalActionId,
            idempotencyKey: resourceIdempotencyKey({
              organizationId: input.organizationId,
              ventureId: binding.ventureId,
              resourceType,
              provider: PROVIDER_KEYS.vercel,
              canonicalName: providerResourceId,
            }),
            metadata: input.providerReferences,
          });
        } catch {
          /* resource registry is best-effort; the external_actions row is the ledger */
        }
      }
      await emitLaunchGatewayEvent(admin, {
        organizationId: input.organizationId,
        eventType: LAUNCH_GATEWAY_EVENTS.externalActionSucceeded,
        message: "GDE Vercel live action succeeded",
        externalActionId: input.externalActionId,
        payload: { provider_references: input.providerReferences },
      });
      return toRecord({
        id: input.externalActionId,
        organizationId: input.organizationId,
        missionId: binding.missionId,
        actionType: String(input.result.action_type ?? ""),
        target: "",
        executionStatus: "succeeded",
        idempotencyKey: "",
        claimedBy: GDE_LIVE_LEDGER_CLAIMER,
        resultManifest: safe,
        payloadManifest: safe,
        error: null,
      });
    },
    async fail(input) {
      await updateExternalAction(admin, input.organizationId, input.externalActionId, {
        execution_status: "failed",
        failed_at: new Date().toISOString(),
        error: input.error.slice(0, 500),
        result_manifest: input.providerReferences
          ? (redactUnknown({
              external_ids: input.providerReferences,
              provider_references: input.providerReferences,
            }) as Json)
          : undefined,
      });
      await emitLaunchGatewayEvent(admin, {
        organizationId: input.organizationId,
        eventType: LAUNCH_GATEWAY_EVENTS.externalActionFailed,
        message: "GDE Vercel live action failed",
        externalActionId: input.externalActionId,
      });
      return {
        externalActionId: input.externalActionId,
        organizationId: input.organizationId,
        missionId: binding.missionId,
        actionType: "",
        target: "",
        executionStatus: "failed",
        durableState: "FAILED",
        idempotencyKey: "",
        claimedBy: GDE_LIVE_LEDGER_CLAIMER,
        resultManifest: null,
        payloadManifest: {},
        providerReferences: input.providerReferences ?? {},
        error: input.error,
      };
    },
    async block(input) {
      await updateExternalAction(admin, input.organizationId, input.externalActionId, {
        execution_status: "blocked",
        error: input.error.slice(0, 500),
      });
      return {
        externalActionId: input.externalActionId,
        organizationId: input.organizationId,
        missionId: binding.missionId,
        actionType: "",
        target: "",
        executionStatus: "blocked",
        durableState: "BLOCKED",
        idempotencyKey: "",
        claimedBy: GDE_LIVE_LEDGER_CLAIMER,
        resultManifest: null,
        payloadManifest: {},
        providerReferences: {},
        error: input.error,
      };
    },
  };
}
