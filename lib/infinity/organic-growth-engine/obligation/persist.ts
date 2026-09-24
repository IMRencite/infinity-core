import { ORGANIC_HEALTH_SCOPE } from "@/lib/infinity/runtime-isolation/cross-system";
import { createOrganicRuntimeClient } from "@/lib/infinity/organic-growth-engine/runtime-principal";
import {
  CANONICAL_ORGANIC_HOLD_KEY,
  deriveEffectiveOrganicExecutionState,
  freezeSchedulerAuthorizationProjection,
  inMemoryHoldFromEffective,
  type EffectiveOrganicExecutionState,
} from "@/lib/infinity/organic-growth-engine/blog-os/durable/effective-execution-state";
import { getOrganicGrowthSchedulerState, replaceOrganicGrowthSchedulerState, type OrganicGrowthSchedulerState } from "./scheduler";
import { OrganicPersistError, assertOrganicPersistWrite, type OrganicPersistFailure } from "./tick-result";

function adminClient() {
  return createOrganicRuntimeClient();
}

let lastEffective: EffectiveOrganicExecutionState | null = null;

export function getLastOrganicEffectiveExecutionState(): EffectiveOrganicExecutionState | null {
  return lastEffective;
}

export function replaceLastOrganicEffectiveExecutionState(next: EffectiveOrganicExecutionState | null): void {
  lastEffective = next;
}

export async function persistOrganicGrowthSchedulerState(state: OrganicGrowthSchedulerState = getOrganicGrowthSchedulerState()): Promise<void> {
  const client = adminClient();
  let next = state;
  let prior: Record<string, unknown> | undefined;
  if (client) {
    const existing = await client.from("cloud_runtime_state").select("payload").eq("scope", ORGANIC_HEALTH_SCOPE).maybeSingle();
    prior = (existing.data?.payload ?? undefined) as Record<string, unknown> | undefined;
    next = freezeSchedulerAuthorizationProjection(prior, next);
  }
  replaceOrganicGrowthSchedulerState(next);
  if (!client) {
    if (process.env.VITEST) return;
    throw new OrganicPersistError({
      stage: "persist_scheduler",
      code: "RUNTIME_CLIENT_MISSING",
      message: "organic_runtime client was not created",
    });
  }
  const written = await client.from("cloud_runtime_state").update({
    payload: freezeSchedulerAuthorizationProjection(prior, next),
    updated_at: new Date().toISOString(),
  }).eq("scope", ORGANIC_HEALTH_SCOPE).select("scope");
  assertOrganicPersistWrite({
    error: written.error,
    rowCount: written.data?.length ?? 0,
    stage: "persist_scheduler",
  });
}

export async function recordOrganicTickFailure(input: {
  failure: OrganicPersistFailure;
  requestId?: string | null;
  deploymentId?: string | null;
  ventureId?: string;
}): Promise<void> {
  const client = adminClient();
  if (!client) return;
  const id = `organic-tick-fail:${input.requestId || input.deploymentId || Date.now()}`;
  await client.from("organic_workflow_records").insert({
    id,
    record_type: "runtime_event",
    venture_id: input.ventureId ?? "occupancynpv",
    operating_date: new Date().toISOString().slice(0, 10),
    execution_class: "PRODUCTION",
    is_test: false,
    test_run_id: null,
    payload: {
      result: "FAIL",
      route: "/api/runtime/organic-tick",
      stage: input.failure.stage,
      failure_class: "PERSIST",
      error_code: input.failure.code,
      error_message: input.failure.message,
      request_id: input.requestId ?? null,
      deployment_id: input.deploymentId ?? null,
      timestamp: new Date().toISOString(),
    },
  });
}

export async function hydrateOrganicGrowthSchedulerState(): Promise<OrganicGrowthSchedulerState> {
  const client = adminClient();
  if (!client) {
    lastEffective = deriveEffectiveOrganicExecutionState({
      canonical: null,
      scheduler: getOrganicGrowthSchedulerState(),
      canonical_readable: false,
    });
    return getOrganicGrowthSchedulerState();
  }
  const { data } = await client.from("cloud_runtime_state").select("payload").eq("scope", ORGANIC_HEALTH_SCOPE).maybeSingle();
  const payload = data?.payload as OrganicGrowthSchedulerState | undefined;
  const authorization = await client
    .from("organic_publication_authorization")
    .select("hold_state,execute_publish,hold_version,updated_at,authorized_decision_id,resolved_at")
    .eq("hold_key", CANONICAL_ORGANIC_HOLD_KEY)
    .maybeSingle();
  const effective = deriveEffectiveOrganicExecutionState({
    canonical: authorization.error ? null : authorization.data,
    scheduler: payload,
    canonical_readable: !authorization.error,
  });
  lastEffective = effective;
  const derivedHold = inMemoryHoldFromEffective(effective);
  if (payload?.version === 1 && payload.scope === ORGANIC_HEALTH_SCOPE) {
    replaceOrganicGrowthSchedulerState({
      ...payload,
      publishing_hold: derivedHold,
    });
  } else {
    replaceOrganicGrowthSchedulerState({
      ...getOrganicGrowthSchedulerState(),
      publishing_hold: derivedHold,
    });
  }
  return getOrganicGrowthSchedulerState();
}
