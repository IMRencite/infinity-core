import type { NamedOutboundLoopGate } from "@/lib/infinity/production-outbound/closed-loop";
import { reloadGmailOAuthFromLocalFile } from "./load-local-env";
import {
  GMAIL_RUNTIME_CONFIG_READER_VERSION,
  fingerprintGmailRefreshToken,
  readGmailRuntimeConfig,
  type GmailConfigSource,
  type GmailRuntimeConfig,
} from "./gmail-runtime-config";
import {
  GMAIL_OAUTH_CLIENT_ID_ENV,
  GMAIL_OAUTH_CLIENT_SECRET_ENV,
  GMAIL_OAUTH_REFRESH_TOKEN_ENV,
} from "./constants";

export const GMAIL_INVOCATION_CONTEXT_VERSION = "gmail-invocation-context-v1" as const;
export const GMAIL_CONFIG_RESOLVER_VERSION = GMAIL_RUNTIME_CONFIG_READER_VERSION;

export type GmailInvocationEventName =
  | "CONFIG_RESOLUTION_STARTED"
  | "CONFIG_RESOLVED"
  | "TOKEN_EXCHANGE_STARTED"
  | "TOKEN_EXCHANGE_COMPLETED"
  | "GMAIL_OBSERVE_STARTED"
  | "GMAIL_OBSERVE_COMPLETED"
  | "JOB_EXECUTION_STARTED"
  | "JOB_EXECUTION_COMPLETED";

export type GmailInvocationEvent = {
  seq: number;
  name: GmailInvocationEventName;
  at: string;
};

export type GmailOAuthMaterial = {
  clientId: string | null;
  clientSecret: string | null;
  refreshToken: string | null;
};

export type GmailInvocationContext = {
  execution_id: string;
  trigger_source: string;
  deployment_id: string | null;
  config_source: GmailConfigSource;
  config_fingerprint: string | null;
  sender: string | null;
  oauth_material: GmailOAuthMaterial;
  resolved_at: string;
  reader_version: typeof GMAIL_RUNTIME_CONFIG_READER_VERSION;
  context_version: typeof GMAIL_INVOCATION_CONTEXT_VERSION;
  configured: boolean;
  conflict: boolean;
  fallback_used: boolean;
  client_present: boolean;
  secret_present: boolean;
  refresh_present: boolean;
  sender_present: boolean;
  events: GmailInvocationEvent[];
  exchange_input_fingerprint: string | null;
  token_exchange_result: "PASS" | "FAIL" | null;
};

function nextSeq(context: GmailInvocationContext): number {
  return context.events.length + 1;
}

export function recordGmailInvocationEvent(
  context: GmailInvocationContext,
  name: GmailInvocationEventName,
  at = new Date().toISOString(),
): GmailInvocationContext {
  context.events.push({ seq: nextSeq(context), name, at });
  return context;
}

export function eventIndex(context: GmailInvocationContext, name: GmailInvocationEventName): number {
  return context.events.findIndex((event) => event.name === name);
}

export function resolveGmailInvocationContext(input: {
  trigger_source: string;
  now?: string;
  execution_id?: string;
}): GmailInvocationContext {
  const now = input.now ?? new Date().toISOString();
  if (process.env.VERCEL !== "1" && !process.env.VITEST) {
    reloadGmailOAuthFromLocalFile();
  }
  const context: GmailInvocationContext = {
    execution_id: input.execution_id ?? `gmail-inv:${now}:${Math.random().toString(36).slice(2, 10)}`,
    trigger_source: input.trigger_source,
    deployment_id: process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    config_source: "UNAVAILABLE",
    config_fingerprint: null,
    sender: null,
    oauth_material: { clientId: null, clientSecret: null, refreshToken: null },
    resolved_at: now,
    reader_version: GMAIL_RUNTIME_CONFIG_READER_VERSION,
    context_version: GMAIL_INVOCATION_CONTEXT_VERSION,
    configured: false,
    conflict: false,
    fallback_used: false,
    client_present: false,
    secret_present: false,
    refresh_present: false,
    sender_present: false,
    events: [],
    exchange_input_fingerprint: null,
    token_exchange_result: null,
  };
  recordGmailInvocationEvent(context, "CONFIG_RESOLUTION_STARTED", now);
  const config = readGmailRuntimeConfig();
  context.config_source = config.source;
  context.config_fingerprint = config.fingerprint;
  context.sender = config.senderEmail;
  context.oauth_material = {
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    refreshToken: config.refreshToken,
  };
  context.configured = config.configured;
  context.conflict = config.conflict;
  context.fallback_used = config.fallback_used;
  context.client_present = config.client_present;
  context.secret_present = config.secret_present;
  context.refresh_present = config.refresh_present;
  context.sender_present = config.sender_present;
  context.resolved_at = now;
  recordGmailInvocationEvent(context, "CONFIG_RESOLVED", now);
  return context;
}

export function fingerprintGmailOAuthMaterial(material: GmailOAuthMaterial): string | null {
  return fingerprintGmailRefreshToken(material.refreshToken);
}

export function missingHydratedMaterialFields(material: GmailOAuthMaterial): string[] {
  const missing: string[] = [];
  if (!material.clientId) missing.push(GMAIL_OAUTH_CLIENT_ID_ENV);
  if (!material.clientSecret) missing.push(GMAIL_OAUTH_CLIENT_SECRET_ENV);
  if (!material.refreshToken) missing.push(GMAIL_OAUTH_REFRESH_TOKEN_ENV);
  return missing;
}

export function evaluateGmailConfigHydrationGate(input: {
  context?: GmailInvocationContext | null;
  events?: GmailInvocationEvent[];
  configured?: boolean;
  conflict?: boolean;
}): NamedOutboundLoopGate {
  const events = input.context?.events ?? input.events ?? [];
  const configured = input.context?.configured ?? input.configured ?? false;
  const conflict = input.context?.conflict ?? input.conflict ?? false;
  const resolvedAt = events.findIndex((event) => event.name === "CONFIG_RESOLVED");
  const exchangeAt = events.findIndex((event) => event.name === "TOKEN_EXCHANGE_STARTED");
  const observeAt = events.findIndex((event) => event.name === "GMAIL_OBSERVE_STARTED");
  if (resolvedAt < 0) {
    return { gate: "GmailConfigHydrationGate", result: "FAIL", reasons: ["CONFIG_NOT_RESOLVED"] };
  }
  if (exchangeAt >= 0 && exchangeAt < resolvedAt) {
    return { gate: "GmailConfigHydrationGate", result: "FAIL", reasons: ["EXCHANGE_BEFORE_HYDRATION"] };
  }
  if (observeAt >= 0 && observeAt < resolvedAt) {
    return { gate: "GmailConfigHydrationGate", result: "FAIL", reasons: ["OBSERVE_BEFORE_HYDRATION"] };
  }
  if (conflict) {
    return { gate: "GmailConfigHydrationGate", result: "FAIL", reasons: ["CONFIGURATION_CONFLICT"] };
  }
  if (!configured) {
    return { gate: "GmailConfigHydrationGate", result: "FAIL", reasons: ["CONFIG_UNAVAILABLE"] };
  }
  return { gate: "GmailConfigHydrationGate", result: "PASS", reasons: ["CONFIG_RESOLVED_BEFORE_GMAIL"] };
}

export function evaluateGmailTokenExchangeInputGate(input: {
  context_fingerprint: string | null;
  exchange_input_fingerprint: string | null;
}): NamedOutboundLoopGate {
  if (!input.context_fingerprint || !input.exchange_input_fingerprint) {
    return { gate: "GmailTokenExchangeInputGate", result: "FAIL", reasons: ["FINGERPRINT_MISSING"] };
  }
  if (input.context_fingerprint !== input.exchange_input_fingerprint) {
    return { gate: "GmailTokenExchangeInputGate", result: "FAIL", reasons: ["EXCHANGE_INPUT_MISMATCH"] };
  }
  return { gate: "GmailTokenExchangeInputGate", result: "PASS", reasons: ["EXCHANGE_USES_INVOCATION_CONTEXT"] };
}

export function evaluateGmailSameInvocationParityGate(input: {
  resolved_fingerprint: string | null;
  exchange_input_fingerprint: string | null;
}): NamedOutboundLoopGate {
  if (!input.resolved_fingerprint || !input.exchange_input_fingerprint) {
    return { gate: "GmailSameInvocationParityGate", result: "FAIL", reasons: ["FINGERPRINT_MISSING"] };
  }
  if (input.resolved_fingerprint !== input.exchange_input_fingerprint) {
    return { gate: "GmailSameInvocationParityGate", result: "FAIL", reasons: ["SAME_INVOCATION_MISMATCH"] };
  }
  return { gate: "GmailSameInvocationParityGate", result: "PASS", reasons: ["RESOLVED_EQUALS_EXCHANGE"] };
}

export function evaluateColdCronCredentialInitializationGate(input: {
  http_warmup: boolean;
  operating_state_warmup: boolean;
  config_resolved_before_gmail: boolean;
  token_exchange: boolean;
  same_invocation_parity: boolean;
}): NamedOutboundLoopGate {
  const reasons: string[] = [];
  if (input.http_warmup) reasons.push("HTTP_WARMUP_USED");
  if (input.operating_state_warmup) reasons.push("OPERATING_STATE_WARMUP_USED");
  if (!input.config_resolved_before_gmail) reasons.push("CONFIG_NOT_RESOLVED_BEFORE_GMAIL");
  if (!input.token_exchange) reasons.push("TOKEN_EXCHANGE_FAILED");
  if (!input.same_invocation_parity) reasons.push("SAME_INVOCATION_MISMATCH");
  return {
    gate: "ColdCronCredentialInitializationGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["COLD_CRON_INITIALIZED"],
  };
}

export function publicGmailInvocationSnapshot(context: GmailInvocationContext): {
  execution_id: string;
  trigger_source: string;
  deployment_id: string | null;
  config_source: GmailConfigSource;
  config_fingerprint: string | null;
  exchange_input_fingerprint: string | null;
  token_exchange_result: "PASS" | "FAIL" | null;
  configured: boolean;
  conflict: boolean;
  fallback_used: boolean;
  resolved_at: string;
  context_version: typeof GMAIL_INVOCATION_CONTEXT_VERSION;
  reader_version: typeof GMAIL_RUNTIME_CONFIG_READER_VERSION;
  events: GmailInvocationEvent[];
  hydration: NamedOutboundLoopGate;
  exchange_input: NamedOutboundLoopGate;
  same_invocation: NamedOutboundLoopGate;
} {
  return {
    execution_id: context.execution_id,
    trigger_source: context.trigger_source,
    deployment_id: context.deployment_id,
    config_source: context.config_source,
    config_fingerprint: context.config_fingerprint,
    exchange_input_fingerprint: context.exchange_input_fingerprint,
    token_exchange_result: context.token_exchange_result,
    configured: context.configured,
    conflict: context.conflict,
    fallback_used: context.fallback_used,
    resolved_at: context.resolved_at,
    context_version: context.context_version,
    reader_version: context.reader_version,
    events: [...context.events],
    hydration: evaluateGmailConfigHydrationGate({ context }),
    exchange_input: evaluateGmailTokenExchangeInputGate({
      context_fingerprint: context.config_fingerprint,
      exchange_input_fingerprint: context.exchange_input_fingerprint,
    }),
    same_invocation: evaluateGmailSameInvocationParityGate({
      resolved_fingerprint: context.config_fingerprint,
      exchange_input_fingerprint: context.exchange_input_fingerprint,
    }),
  };
}

export function configFromInvocationContext(context: GmailInvocationContext): Pick<
  GmailRuntimeConfig,
  | "source"
  | "fingerprint"
  | "configured"
  | "conflict"
  | "fallback_used"
  | "client_present"
  | "secret_present"
  | "refresh_present"
  | "sender_present"
  | "reader_version"
  | "senderEmail"
> {
  return {
    source: context.config_source,
    fingerprint: context.config_fingerprint,
    configured: context.configured,
    conflict: context.conflict,
    fallback_used: context.fallback_used,
    client_present: context.client_present,
    secret_present: context.secret_present,
    refresh_present: context.refresh_present,
    sender_present: context.sender_present,
    reader_version: context.reader_version,
    senderEmail: context.sender,
  };
}
