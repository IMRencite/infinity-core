import { MOCK_PROVIDER_KEY } from "@/lib/infinity/launch-gateway/constants";
import { resolveAdapter } from "@/lib/infinity/launch-gateway/adapters/registry";
import { resolveActionType } from "@/lib/infinity/launch-gateway/action-registry";
import { scanHandoffObjectForSecrets } from "@/lib/infinity/production-artifact/handoff/secrets";
import { authorizeExecutionAction } from "./authorize-action";
import { EMPTY_SIDE_EFFECTS, GOVERNED_DEPLOYMENT_EXECUTION_SCHEMA } from "./constants";
import type { ExecutionSideEffectCounts, GovernedExecutionActionType, GovernedExecutionState } from "./constants";
import { bindGatewayAction } from "./map-actions";
import type {
  ActionExecutionRecord,
  ExecuteGovernedDeploymentInput,
  ExecutionFailure,
  GovernedDeploymentExecutionResult,
  LiveGatewayPort,
} from "./types";
import {
  createVercelLiveGatewayPort,
  emptyVercelLiveAccounting,
  inspectVercelLivePreconditions,
  isVercelLiveGatewayAction,
  resolveVercelLiveTestPayload,
  VercelLiveExecutionError,
  type VercelLiveAccounting,
} from "./vercel-live";

const replayCache = new Map<string, ActionExecutionRecord>();

function cloneCounts(): ExecutionSideEffectCounts {
  return { ...EMPTY_SIDE_EFFECTS };
}

function incrementSimulated(counts: ExecutionSideEffectCounts, action: GovernedExecutionActionType): void {
  if (action === "CREATE_HOSTING_PROJECT") {
    counts.providerWrites += 1;
    counts.providerAccountCreation += 1;
  } else if (action === "DEPLOY_APPLICATION") {
    counts.providerWrites += 1;
    counts.deployments += 1;
  } else if (action === "UPSERT_DNS_RECORD" || action === "BIND_DOMAIN") {
    counts.providerWrites += 1;
    counts.dnsWrites += 1;
  } else if (action === "PURCHASE_DOMAIN") {
    counts.purchases += 1;
    counts.domainPurchases += 1;
  } else if (action === "CONFIGURE_PAYMENT_RESOURCE") {
    counts.paymentWrites += 1;
  } else if (action === "CREATE_WEBHOOK") {
    counts.webhookWrites += 1;
  } else if (action === "RUN_PRODUCTION_MIGRATION") {
    counts.productionMigrations += 1;
  }
}

function incrementLive(
  counts: ExecutionSideEffectCounts,
  accounting: VercelLiveAccounting,
  action: GovernedExecutionActionType,
  eagAuthorized: boolean,
  options?: { reused?: boolean; portOwnsAccounting?: boolean },
): void {
  const reused = options?.reused === true;
  const portOwnsAccounting = options?.portOwnsAccounting === true;
  if (action === "CREATE_HOSTING_PROJECT" && !reused) {
    counts.providerWrites += 1;
    counts.providerAccountCreation += 1;
    if (!portOwnsAccounting) accounting.projectCreations += 1;
  } else if (action === "DEPLOY_APPLICATION" && !reused) {
    counts.providerWrites += 1;
    counts.deployments += 1;
    if (!portOwnsAccounting) accounting.deployments += 1;
  } else if (action === "VERIFY_HEALTH") {
    if (!portOwnsAccounting) accounting.verificationReads += 1;
  }
  if (eagAuthorized) counts.eagActions += 1;
}

function failureFromLiveError(action: GovernedExecutionActionType, error: unknown): ExecutionFailure {
  if (error instanceof VercelLiveExecutionError) {
    if (error.classification === "credential_failure" || error.classification === "missing_credential") {
      return { code: "DEPLOYMENT_EXECUTION_WRITE_CREDENTIAL_MISSING", message: error.message, actionType: action };
    }
    if (error.classification === "healthcheck_failure") {
      return { code: "DEPLOYMENT_EXECUTION_HEALTHCHECK_FAILED", message: error.message, actionType: action };
    }
    if (error.classification === "unsupported_action") {
      return { code: "DEPLOYMENT_EXECUTION_PROVIDER_UNSUPPORTED", message: error.message, actionType: action };
    }
    if (error.classification === "scope_blocked" || error.classification === "unsafe_target") {
      return { code: "DEPLOYMENT_EXECUTION_LIVE_PRECONDITION", message: error.message, actionType: action };
    }
    if (error.classification === "rate_limit" || error.classification === "timeout" || error.classification === "conflict") {
      return { code: "DEPLOYMENT_EXECUTION_PROVIDER_FAILURE", message: error.message, actionType: action };
    }
    if (error.classification === "reconciliation_required") {
      return { code: "DEPLOYMENT_EXECUTION_RECONCILIATION_REQUIRED", message: error.message, actionType: action };
    }
    if (error.classification === "persistence_failure") {
      return { code: "DEPLOYMENT_EXECUTION_AUDIT_PERSISTENCE_FAILED", message: error.message, actionType: action };
    }
    return { code: "DEPLOYMENT_EXECUTION_PROVIDER_FAILURE", message: error.message, actionType: action };
  }
  const message = error instanceof Error ? error.message : "Live provider failure";
  return { code: "DEPLOYMENT_EXECUTION_PROVIDER_FAILURE", message, actionType: action };
}

function actionIdempotencyKey(requestId: string, actionType: GovernedExecutionActionType, target: string): string {
  return `${requestId}:${actionType}:${target}`;
}

function actionId(requestId: string, actionType: GovernedExecutionActionType): string {
  return `gde-action:${requestId}:${actionType}`;
}

function targetFor(action: GovernedExecutionActionType, ventureId: string, healthPath: string | null): string {
  if (action === "PURCHASE_DOMAIN") return `${ventureId}.example.test`;
  if (action === "UPSERT_DNS_RECORD" || action === "BIND_DOMAIN") return `dns:${ventureId}`;
  if (action === "VERIFY_HEALTH") return healthPath ?? `/health:${ventureId}`;
  if (action === "RUN_PRODUCTION_MIGRATION") return `migration:${ventureId}`;
  if (action === "CONFIGURE_PAYMENT_RESOURCE") return `payments:${ventureId}`;
  if (action === "CREATE_WEBHOOK") return `webhook:${ventureId}`;
  if (action === "CONFIGURE_ENVIRONMENT") return `env:${ventureId}`;
  if (action === "ROLLBACK_DEPLOYMENT") return `rollback:${ventureId}`;
  return ventureId;
}

function failureForSimulatedAction(action: GovernedExecutionActionType): ExecutionFailure {
  if (action === "UPSERT_DNS_RECORD" || action === "BIND_DOMAIN") {
    return { code: "DEPLOYMENT_EXECUTION_DNS_FAILED", message: "Simulated DNS write failed.", actionType: action };
  }
  if (action === "RUN_PRODUCTION_MIGRATION") {
    return { code: "DEPLOYMENT_EXECUTION_MIGRATION_FAILED", message: "Simulated production migration failed.", actionType: action };
  }
  if (action === "VERIFY_HEALTH") {
    return { code: "DEPLOYMENT_EXECUTION_HEALTHCHECK_FAILED", message: "Simulated health check failed.", actionType: action };
  }
  return { code: "DEPLOYMENT_EXECUTION_PROVIDER_FAILURE", message: `Simulated provider failure for ${action}.`, actionType: action };
}

async function simulateAction(
  action: GovernedExecutionActionType,
  ventureId: string,
  healthPath: string | null,
  environmentVariableNames: string[],
): Promise<{ externalIds: Record<string, string>; providerCallId: string; actualUsd: number | null }> {
  const binding = bindGatewayAction(action);
  const target = targetFor(action, ventureId, healthPath);
  if (binding.gatewayActionType && resolveActionType(binding.gatewayActionType)) {
    const adapter = resolveAdapter(MOCK_PROVIDER_KEY);
    const ctx = {
      organizationId: "org-gde-sim",
      actionType: binding.gatewayActionType,
      target,
      payload: { ventureId, environmentVariableNames, secret: null },
      correlationId: `sim:${ventureId}:${action}`,
    };
    const result = await adapter.simulate(ctx);
    return {
      externalIds: result.externalIds,
      providerCallId: result.externalIds.simulation_id ?? `sim-call:${action}:${target}`,
      actualUsd: action === "PURCHASE_DOMAIN" ? 12 : 0,
    };
  }
  return {
    externalIds: { simulation_id: `sim_${action}_${ventureId}` },
    providerCallId: `sim-call:${action}:${target}`,
    actualUsd: 0,
  };
}

export function resetGovernedExecutionReplayCache(): void {
  replayCache.clear();
}

export async function executeGovernedDeployment(
  input: ExecuteGovernedDeploymentInput,
): Promise<GovernedDeploymentExecutionResult> {
  const request = input.request;
  const readiness = input.readiness;
  const startedAt = input.startedAt ?? "2026-08-23T00:00:00.000Z";
  const blockers: ExecutionFailure[] = [...request.blockers];
  const simulated = cloneCounts();
  const live = cloneCounts();
  const liveAccounting = emptyVercelLiveAccounting();
  const vercelLivePayload = input.vercelLivePayload ?? (input.allowVercelLive ? resolveVercelLiveTestPayload(null) : null);

  if (request.ventureId !== readiness.ventureId || request.readinessId !== readiness.readinessId) {
    blockers.push({ code: "DEPLOYMENT_EXECUTION_LINEAGE_MISMATCH", message: "Execution request lineage does not match readiness." });
  }
  if (request.productionArtifactHandoffId !== readiness.productionArtifactHandoffId) {
    blockers.push({ code: "DEPLOYMENT_EXECUTION_LINEAGE_MISMATCH", message: "Execution handoff lineage does not match readiness." });
  }

  let resolvedLivePort: LiveGatewayPort | null = input.liveGateway ?? null;
  const portOwnsAccounting = Boolean(input.allowVercelLive && !input.liveGateway);
  if (request.mode === "LIVE" && input.allowVercelLive && !resolvedLivePort) {
    const preconditions = inspectVercelLivePreconditions({
      request,
      readiness,
      eagAuthorizations: input.eagAuthorizations,
      treasuryAuthorizations: input.treasuryAuthorizations,
      providerWrites: input.providerWrites,
      payload: vercelLivePayload,
      now: input.now,
    });
    if (!preconditions.canExecuteLive) {
      blockers.push({
        code: "DEPLOYMENT_EXECUTION_LIVE_PRECONDITION",
        message: preconditions.skipReason ?? "Vercel live preconditions failed.",
      });
    } else if (!input.liveLedger) {
      blockers.push({
        code: "DEPLOYMENT_EXECUTION_LIVE_PRECONDITION",
        message: "durable external action ledger is required before a Vercel write",
      });
    } else {
      resolvedLivePort = createVercelLiveGatewayPort({
        adapter: input.liveAdapter,
        testResourceName: vercelLivePayload?.testResourceName ?? "",
        organizationId: input.organizationId,
        missionId: input.missionId,
        sessionId: input.sessionId ?? request.executionRequestId,
        ventureId: request.ventureId,
        expectedRepository: vercelLivePayload?.repository_full_name,
        expectedSha: vercelLivePayload?.commit_sha,
        expectedTeamId: process.env.VERCEL_TEAM_ID ?? null,
        accounting: liveAccounting,
        ledger: input.liveLedger,
        lookupProject: input.lookupProject,
        lookupDeployment: input.lookupDeployment,
        projectLookupSupported: input.projectLookupSupported,
      });
    }
  }
  if (request.mode === "LIVE" && request.executable && !resolvedLivePort && !input.allowVercelLive) {
    blockers.push({ code: "DEPLOYMENT_EXECUTION_LIVE_NOT_CONFIGURED", message: "LIVE mode requires an explicit Launch Gateway live port." });
  }

  const attempted: ActionExecutionRecord[] = [];
  const succeeded: string[] = [];
  const failed: string[] = [];
  const blocked: string[] = [];
  const providerReferences: Record<string, string> = {};
  const providerCallIds: string[] = [];
  let estimated: number | null = null;
  let authorized: number | null = null;
  let actual: number | null = 0;
  let unknownCost = false;

  const canRun = request.executable && !blockers.some((item) => item.code === "DEPLOYMENT_EXECUTION_LINEAGE_MISMATCH");

  for (const actionType of request.requiredActions) {
    const id = actionId(request.executionRequestId, actionType);
    const binding = bindGatewayAction(actionType);
    const target =
      request.mode === "LIVE" && vercelLivePayload?.testResourceName && isVercelLiveGatewayAction(binding.gatewayActionType)
        ? vercelLivePayload.testResourceName
        : targetFor(actionType, request.ventureId, request.healthCheckRequirements.path);
    const idempotencyKey = actionIdempotencyKey(request.idempotencyKey, actionType, target);
    const auth = authorizeExecutionAction({
      actionType,
      readiness,
      eagAuthorizations: input.eagAuthorizations ?? [],
      treasuryAuthorizations: input.treasuryAuthorizations ?? [],
      providerWrites: input.providerWrites ?? [],
      mode: request.mode,
    });

    if (auth.unknownCost) unknownCost = true;
    if (auth.estimatedUsd != null) estimated = (estimated ?? 0) + auth.estimatedUsd;
    if (auth.authorizedUsd != null) {
      authorized = authorized == null ? auth.authorizedUsd : Math.max(authorized, auth.authorizedUsd);
    }

    const cached = replayCache.get(idempotencyKey);
    if (cached && canRun && !auth.failure) {
      attempted.push({ ...cached, reused: true });
      if (cached.state === "SUCCEEDED") succeeded.push(id);
      else if (cached.state === "FAILED") failed.push(id);
      else blocked.push(id);
      Object.assign(providerReferences, cached.providerReferences);
      if (cached.providerCallId) providerCallIds.push(cached.providerCallId);
      continue;
    }

    if (request.mode === "LIVE" && failed.length > 0) {
      const record: ActionExecutionRecord = {
        actionId: id,
        actionType,
        gatewayActionType: binding.gatewayActionType,
        capability: binding.capability,
        state: "BLOCKED",
        requiresTreasury: auth.requiresTreasury,
        requiresEag: auth.requiresEag,
        requiresWriteCredential: auth.requiresWriteCredential,
        requiresProcurement: auth.requiresProcurement,
        writeAuthority: auth.writeAuthority,
        costKnown: auth.costKnown,
        budgetAuthorized: auth.budgetAuthorized,
        specificActionAuthorized: auth.specificActionAuthorized,
        cost: { estimatedUsd: auth.estimatedUsd, authorizedUsd: auth.authorizedUsd, actualUsd: null, unknown: auth.unknownCost },
        providerReferences: {},
        providerCallId: null,
        idempotencyKey,
        reused: false,
        simulated: false,
        live: false,
        failure: {
          code: "DEPLOYMENT_EXECUTION_PARTIAL_FAILURE",
          message: "Prior live action failed; later writes are not attempted.",
          actionType,
          actionId: id,
        },
      };
      attempted.push(record);
      blocked.push(id);
      continue;
    }

    if (!canRun || !request.executable) {
      const record: ActionExecutionRecord = {
        actionId: id,
        actionType,
        gatewayActionType: binding.gatewayActionType,
        capability: binding.capability,
        state: "BLOCKED",
        requiresTreasury: auth.requiresTreasury,
        requiresEag: auth.requiresEag,
        requiresWriteCredential: auth.requiresWriteCredential,
        requiresProcurement: auth.requiresProcurement,
        writeAuthority: auth.writeAuthority,
        costKnown: auth.costKnown,
        budgetAuthorized: auth.budgetAuthorized,
        specificActionAuthorized: auth.specificActionAuthorized,
        cost: { estimatedUsd: auth.estimatedUsd, authorizedUsd: auth.authorizedUsd, actualUsd: null, unknown: auth.unknownCost },
        providerReferences: {},
        providerCallId: null,
        idempotencyKey,
        reused: false,
        simulated: false,
        live: false,
        failure: request.blockers[0] ?? { code: "DEPLOYMENT_EXECUTION_NOT_READY", message: "Execution request is not executable.", actionType },
      };
      attempted.push(record);
      blocked.push(id);
      continue;
    }

    if (auth.failure) {
      const record: ActionExecutionRecord = {
        actionId: id,
        actionType,
        gatewayActionType: binding.gatewayActionType,
        capability: binding.capability,
        state: "BLOCKED",
        requiresTreasury: auth.requiresTreasury,
        requiresEag: auth.requiresEag,
        requiresWriteCredential: auth.requiresWriteCredential,
        requiresProcurement: auth.requiresProcurement,
        writeAuthority: auth.writeAuthority,
        costKnown: auth.costKnown,
        budgetAuthorized: auth.budgetAuthorized,
        specificActionAuthorized: auth.specificActionAuthorized,
        cost: { estimatedUsd: auth.estimatedUsd, authorizedUsd: auth.authorizedUsd, actualUsd: null, unknown: auth.unknownCost },
        providerReferences: {},
        providerCallId: null,
        idempotencyKey,
        reused: false,
        simulated: false,
        live: false,
        failure: { ...auth.failure, actionId: id },
      };
      attempted.push(record);
      blocked.push(id);
      blockers.push(record.failure!);
      continue;
    }

    if (request.mode === "DRY_RUN") {
      const record: ActionExecutionRecord = {
        actionId: id,
        actionType,
        gatewayActionType: binding.gatewayActionType,
        capability: binding.capability,
        state: "AUTHORIZED",
        requiresTreasury: auth.requiresTreasury,
        requiresEag: auth.requiresEag,
        requiresWriteCredential: auth.requiresWriteCredential,
        requiresProcurement: auth.requiresProcurement,
        writeAuthority: auth.writeAuthority,
        costKnown: auth.costKnown,
        budgetAuthorized: auth.budgetAuthorized,
        specificActionAuthorized: auth.specificActionAuthorized,
        cost: { estimatedUsd: auth.estimatedUsd, authorizedUsd: auth.authorizedUsd, actualUsd: null, unknown: auth.unknownCost },
        providerReferences: {},
        providerCallId: null,
        idempotencyKey,
        reused: false,
        simulated: false,
        live: false,
        failure: null,
      };
      attempted.push(record);
      succeeded.push(id);
      continue;
    }

    if (request.mode === "LIVE") {
      const vercelScoped = isVercelLiveGatewayAction(binding.gatewayActionType) && binding.adapterKey === "vercel.com_v1";
      if (input.allowVercelLive && !vercelScoped) {
        const record: ActionExecutionRecord = {
          actionId: id,
          actionType,
          gatewayActionType: binding.gatewayActionType,
          capability: binding.capability,
          state: "BLOCKED",
          requiresTreasury: auth.requiresTreasury,
          requiresEag: auth.requiresEag,
          requiresWriteCredential: auth.requiresWriteCredential,
          requiresProcurement: auth.requiresProcurement,
          writeAuthority: auth.writeAuthority,
          costKnown: auth.costKnown,
          budgetAuthorized: auth.budgetAuthorized,
          specificActionAuthorized: auth.specificActionAuthorized,
          cost: { estimatedUsd: auth.estimatedUsd, authorizedUsd: auth.authorizedUsd, actualUsd: null, unknown: auth.unknownCost },
          providerReferences: {},
          providerCallId: null,
          idempotencyKey,
          reused: false,
          simulated: false,
          live: false,
          failure: {
            code: "DEPLOYMENT_EXECUTION_PROVIDER_UNSUPPORTED",
            message: `LIVE Vercel enablement does not authorize ${actionType}.`,
            actionType,
            actionId: id,
          },
        };
        attempted.push(record);
        blocked.push(id);
        blockers.push(record.failure!);
        continue;
      }
      if (!resolvedLivePort || !binding.liveAdapterExists) {
        const record: ActionExecutionRecord = {
          actionId: id,
          actionType,
          gatewayActionType: binding.gatewayActionType,
          capability: binding.capability,
          state: "BLOCKED",
          requiresTreasury: auth.requiresTreasury,
          requiresEag: auth.requiresEag,
          requiresWriteCredential: auth.requiresWriteCredential,
          requiresProcurement: auth.requiresProcurement,
          writeAuthority: auth.writeAuthority,
          costKnown: auth.costKnown,
          budgetAuthorized: auth.budgetAuthorized,
          specificActionAuthorized: auth.specificActionAuthorized,
          cost: { estimatedUsd: auth.estimatedUsd, authorizedUsd: auth.authorizedUsd, actualUsd: null, unknown: auth.unknownCost },
          providerReferences: {},
          providerCallId: null,
          idempotencyKey,
          reused: false,
          simulated: false,
          live: false,
          failure: {
            code: input.allowVercelLive && blockers.some((item) => item.code === "DEPLOYMENT_EXECUTION_LIVE_PRECONDITION")
              ? "DEPLOYMENT_EXECUTION_LIVE_PRECONDITION"
              : "DEPLOYMENT_EXECUTION_LIVE_NOT_CONFIGURED",
            message: binding.liveAdapterExists
              ? input.allowVercelLive
                ? (blockers.find((item) => item.code === "DEPLOYMENT_EXECUTION_LIVE_PRECONDITION")?.message ?? "Vercel live preconditions failed.")
                : "LIVE Launch Gateway port was not provided."
              : `No live Launch Gateway adapter exists for ${actionType}.`,
            actionType,
            actionId: id,
          },
        };
        attempted.push(record);
        blocked.push(id);
        blockers.push(record.failure!);
        continue;
      }
      try {
        const liveResult = await resolvedLivePort.execute({
          gatewayActionType: binding.gatewayActionType ?? "",
          target,
          payload: {
            ventureId: request.ventureId,
            environmentVariableNames: input.environmentVariableNames ?? [],
            production_artifact_id: vercelLivePayload?.production_artifact_id ?? request.buildContractId,
            artifact_hash: vercelLivePayload?.artifact_hash,
            repository_full_name: vercelLivePayload?.repository_full_name,
            commit_sha: vercelLivePayload?.commit_sha,
            project_id: providerReferences.project_id ?? vercelLivePayload?.project_id,
            deployment_id: providerReferences.deployment_id ?? vercelLivePayload?.deployment_id,
            github_repository_id: vercelLivePayload?.github_repository_id,
          },
          idempotencyKey,
          executionRequestId: request.executionRequestId,
          actionId: id,
        });
        if (liveResult.ready === false || liveResult.verified === false) {
          throw new VercelLiveExecutionError({
            message: liveResult.verified === false ? "Vercel health verification failed" : "Vercel deployment was not provider-confirmed ready",
            classification: liveResult.verified === false ? "healthcheck_failure" : "deployment_build_failure",
            gatewayActionType: binding.gatewayActionType ?? "",
          });
        }
        if (liveResult.actualCostUsd == null) {
          unknownCost = true;
          actual = null;
        } else if (actual != null) {
          actual += liveResult.actualCostUsd;
        }
        const record: ActionExecutionRecord = {
          actionId: id,
          actionType,
          gatewayActionType: binding.gatewayActionType,
          capability: binding.capability,
          state: "SUCCEEDED",
          requiresTreasury: auth.requiresTreasury,
          requiresEag: auth.requiresEag,
          requiresWriteCredential: auth.requiresWriteCredential,
          requiresProcurement: auth.requiresProcurement,
          writeAuthority: auth.writeAuthority,
          costKnown: auth.costKnown,
          budgetAuthorized: auth.budgetAuthorized,
          specificActionAuthorized: auth.specificActionAuthorized,
          cost: { estimatedUsd: auth.estimatedUsd, authorizedUsd: auth.authorizedUsd, actualUsd: liveResult.actualCostUsd, unknown: liveResult.actualCostUsd == null },
          providerReferences: liveResult.externalIds,
          providerCallId: liveResult.providerCallId,
          externalActionId: liveResult.externalActionId ?? null,
          durableState: liveResult.durableState ?? "SUCCEEDED",
          idempotencyKey,
          reused: liveResult.reused === true,
          simulated: false,
          live: true,
          failure: null,
        };
        attempted.push(record);
        succeeded.push(id);
        providerCallIds.push(liveResult.providerCallId);
        Object.assign(providerReferences, liveResult.externalIds);
        incrementLive(live, liveAccounting, actionType, auth.specificActionAuthorized, {
          reused: liveResult.reused === true,
          portOwnsAccounting,
        });
        replayCache.set(idempotencyKey, record);
        continue;
      } catch (error) {
        unknownCost = true;
        actual = null;
        const failure = { ...failureFromLiveError(actionType, error), actionId: id };
        const record: ActionExecutionRecord = {
          actionId: id,
          actionType,
          gatewayActionType: binding.gatewayActionType,
          capability: binding.capability,
          state: "FAILED",
          requiresTreasury: auth.requiresTreasury,
          requiresEag: auth.requiresEag,
          requiresWriteCredential: auth.requiresWriteCredential,
          requiresProcurement: auth.requiresProcurement,
          writeAuthority: auth.writeAuthority,
          costKnown: auth.costKnown,
          budgetAuthorized: auth.budgetAuthorized,
          specificActionAuthorized: auth.specificActionAuthorized,
          cost: { estimatedUsd: auth.estimatedUsd, authorizedUsd: auth.authorizedUsd, actualUsd: null, unknown: true },
          providerReferences: {},
          providerCallId: null,
          externalActionId: error instanceof VercelLiveExecutionError ? error.externalActionId ?? null : null,
          durableState: error instanceof VercelLiveExecutionError ? error.durableState ?? "FAILED" : "FAILED",
          idempotencyKey,
          reused: false,
          simulated: false,
          live: false,
          failure,
        };
        attempted.push(record);
        failed.push(id);
        blockers.push(failure);
        replayCache.set(idempotencyKey, record);
        continue;
      }
    }

    if (input.simulateFailures?.includes(actionType)) {
      const failure = { ...failureForSimulatedAction(actionType), actionId: id };
      const record: ActionExecutionRecord = {
        actionId: id,
        actionType,
        gatewayActionType: binding.gatewayActionType,
        capability: binding.capability,
        state: "FAILED",
        requiresTreasury: auth.requiresTreasury,
        requiresEag: auth.requiresEag,
        requiresWriteCredential: auth.requiresWriteCredential,
        requiresProcurement: auth.requiresProcurement,
        writeAuthority: auth.writeAuthority,
        costKnown: auth.costKnown,
        budgetAuthorized: auth.budgetAuthorized,
        specificActionAuthorized: auth.specificActionAuthorized,
        cost: { estimatedUsd: auth.estimatedUsd, authorizedUsd: auth.authorizedUsd, actualUsd: null, unknown: auth.unknownCost },
        providerReferences: {},
        providerCallId: null,
        idempotencyKey,
        reused: false,
        simulated: true,
        live: false,
        failure,
      };
      attempted.push(record);
      failed.push(id);
      blockers.push(failure);
      replayCache.set(idempotencyKey, record);
      continue;
    }

    const simulation = await simulateAction(actionType, request.ventureId, request.healthCheckRequirements.path, input.environmentVariableNames ?? []);
    if (simulation.actualUsd == null) {
      unknownCost = true;
      actual = null;
    } else if (actual != null) {
      actual += simulation.actualUsd;
    }
    const record: ActionExecutionRecord = {
      actionId: id,
      actionType,
      gatewayActionType: binding.gatewayActionType,
      capability: binding.capability,
      state: "SUCCEEDED",
      requiresTreasury: auth.requiresTreasury,
      requiresEag: auth.requiresEag,
      requiresWriteCredential: auth.requiresWriteCredential,
      requiresProcurement: auth.requiresProcurement,
      writeAuthority: auth.writeAuthority,
      costKnown: auth.costKnown,
      budgetAuthorized: auth.budgetAuthorized,
      specificActionAuthorized: auth.specificActionAuthorized,
      cost: { estimatedUsd: auth.estimatedUsd, authorizedUsd: auth.authorizedUsd, actualUsd: simulation.actualUsd, unknown: simulation.actualUsd == null },
      providerReferences: simulation.externalIds,
      providerCallId: simulation.providerCallId,
      idempotencyKey,
      reused: false,
      simulated: true,
      live: false,
      failure: null,
    };
    attempted.push(record);
    succeeded.push(id);
    providerCallIds.push(simulation.providerCallId);
    Object.assign(providerReferences, simulation.externalIds);
    incrementSimulated(simulated, actionType);
    replayCache.set(idempotencyKey, record);
  }

  const secretHits = [
    ...scanHandoffObjectForSecrets({ actions: attempted, providerReferences }),
    ...(input.secretValuesForbidden ?? []).flatMap((secret) =>
      JSON.stringify({ attempted, providerReferences }).includes(secret) ? [`forbidden_secret:${secret.slice(0, 4)}`] : [],
    ),
  ];
  if (secretHits.length > 0) {
    blockers.push({ code: "DEPLOYMENT_EXECUTION_SECRET_LEAKAGE", message: "Secret material appeared in the execution result." });
  }

  const hasSuccess = succeeded.length > 0 && attempted.some((item) => item.state === "SUCCEEDED");
  const hasFailure = failed.length > 0;
  const hasBlocked = blocked.length > 0;
  let state: GovernedExecutionState = "BLOCKED";
  if (!request.executable || blockers.some((item) => item.code === "DEPLOYMENT_EXECUTION_LINEAGE_MISMATCH" || item.code === "DEPLOYMENT_EXECUTION_NOT_READY")) {
    state = "BLOCKED";
  } else if (request.mode === "DRY_RUN" && !hasFailure && !hasBlocked) {
    state = "AUTHORIZED";
  } else if (hasSuccess && (hasFailure || hasBlocked)) {
    state = "PARTIALLY_SUCCEEDED";
    if (!blockers.some((item) => item.code === "DEPLOYMENT_EXECUTION_PARTIAL_FAILURE")) {
      blockers.push({ code: "DEPLOYMENT_EXECUTION_PARTIAL_FAILURE", message: "Some governed deployment actions succeeded and others did not." });
    }
  } else if (hasFailure && !hasSuccess) {
    state = "FAILED";
  } else if (hasSuccess && !hasFailure && !hasBlocked) {
    state = "SUCCEEDED";
  } else if (hasBlocked) {
    state = "BLOCKED";
  }

  const healthRecord = attempted.find((item) => item.actionType === "VERIFY_HEALTH");
  const rollbackRecord = attempted.find((item) => item.actionType === "ROLLBACK_DEPLOYMENT");
  const rollbackState = !request.rollbackRequirements.required
    ? "NOT_REQUIRED"
    : rollbackRecord?.state === "SUCCEEDED" && request.mode === "SIMULATION"
      ? "SIMULATED"
      : rollbackRecord?.specificActionAuthorized || request.rollbackRequirements.authorized
        ? "AUTHORIZED_NOT_EXECUTED"
        : "REQUIRED_NOT_AUTHORIZED";

  return {
    schemaVersion: GOVERNED_DEPLOYMENT_EXECUTION_SCHEMA,
    executionId: `gdx:${request.executionRequestId}`,
    requestId: request.executionRequestId,
    ventureId: request.ventureId,
    mode: request.mode,
    state,
    actionsAttempted: attempted,
    actionsSucceeded: succeeded,
    actionsFailed: failed,
    actionsBlocked: blocked,
    providerReferences,
    costsIncurred: {
      estimatedUsd: unknownCost ? null : (estimated ?? 0),
      authorizedUsd: authorized,
      actualUsd: unknownCost ? null : actual,
      unknown: unknownCost,
    },
    treasuryReferences: request.treasuryAuthorizationRefs.map((item) => item.authorizationId),
    eagReferences: request.eagAuthorizationRefs.map((item) => item.authorizationId),
    rollbackState,
    healthCheckState: !request.healthCheckRequirements.required
      ? "NOT_REQUIRED"
      : !healthRecord
        ? "NOT_RUN"
        : healthRecord.state === "SUCCEEDED" || healthRecord.state === "AUTHORIZED"
          ? "PASS"
          : "FAIL",
    publicLaunchState: request.publicLaunchAuthorizationId ? "AUTHORIZED_NOT_EXECUTED" : "NOT_AUTHORIZED",
    startedAt,
    completedAt: startedAt,
    blockers: uniqueFailures(blockers),
    traceability: {
      ventureId: request.ventureId,
      handoffId: request.productionArtifactHandoffId,
      readinessId: request.readinessId,
      executionRequestId: request.executionRequestId,
      actionIds: attempted.map((item) => item.actionId),
      providerCallIds,
    },
    simulatedSideEffects: simulated,
    liveSideEffects: live,
    liveProviderAccounting: liveAccounting,
  };
}

function uniqueFailures(failures: ExecutionFailure[]): ExecutionFailure[] {
  const seen = new Map<string, ExecutionFailure>();
  for (const failure of failures) {
    seen.set(`${failure.code}:${failure.actionType ?? ""}:${failure.actionId ?? ""}`, failure);
  }
  return [...seen.values()];
}
