import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import nodeProcess from "node:process";
import {
  GMAIL_OAUTH_CLIENT_ID_ENV,
  GMAIL_OAUTH_CLIENT_SECRET_ENV,
  GMAIL_OAUTH_REFRESH_TOKEN_ENV,
  GMAIL_SENDER_EMAIL_ENV,
} from "./constants";
import type { NamedOutboundLoopGate } from "@/lib/infinity/production-outbound/closed-loop";

export const GMAIL_RUNTIME_CONFIG_READER_VERSION = "gmail-runtime-config-v1" as const;
export const EXPECTED_GMAIL_REFRESH_FINGERPRINT = "2c60da8a2c79" as const;
export const CRON_CREDENTIAL_STABILITY_REQUIRED = 5 as const;
export const STARTUP_GRACE_CRON_CYCLES = 2 as const;

export type GmailConfigSource = "PROCESS_ENV" | "OS_FALLBACK" | "UNAVAILABLE";
export type GmailExecutionType = "HTTP" | "VERCEL_CRON" | "WORKER";
export type GmailStartupState = "STABLE" | "INITIALIZING" | "DEGRADED";
export type CredentialHealth = "HEALTHY" | "DEGRADED";

const REQUIRED_FIELDS = [
  GMAIL_OAUTH_CLIENT_ID_ENV,
  GMAIL_OAUTH_CLIENT_SECRET_ENV,
  GMAIL_OAUTH_REFRESH_TOKEN_ENV,
  GMAIL_SENDER_EMAIL_ENV,
] as const;

function safeFieldName(name: string): string | null {
  return /^[A-Z][A-Z0-9_]*$/.test(name) ? name : null;
}

function trimEnv(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function nativeProcessEnv(name: string): string | null {
  const wanted = String(name);
  try {
    const bag = nodeProcess.env;
    const direct = Reflect.get(bag, wanted);
    const trimmed = trimEnv(direct);
    if (trimmed) return trimmed;
    for (const key of Object.keys(bag ?? {})) {
      if (key !== wanted) continue;
      return trimEnv(bag[key]);
    }
  } catch {
    /* bundler shims can throw */
  }
  return null;
}

function osFallbackEnv(name: string): string | null {
  if (process.env.VITEST) return null;
  if (process.env.NEXT_RUNTIME === "edge") return null;
  const ident = safeFieldName(name);
  if (!ident) return null;
  try {
    const printed = execFileSync(
      process.execPath,
      ["-e", `process.stdout.write(process.env[${JSON.stringify(ident)}]||"")`],
      {
        encoding: "utf8",
        timeout: 1500,
        windowsHide: true,
        maxBuffer: 8192,
        shell: false,
      },
    );
    return trimEnv(printed);
  } catch {
    return null;
  }
}

export function fingerprintGmailRefreshToken(token: string | null | undefined): string | null {
  if (!token || token.trim().length < 8) return null;
  return createHash("sha256").update(token.trim()).digest("hex").slice(0, 12);
}

export type GmailRuntimeFieldRead = {
  name: string;
  native: string | null;
  fallback: string | null;
  value: string | null;
  source: GmailConfigSource;
  conflict: boolean;
};

export type GmailRuntimeConfig = {
  reader_version: typeof GMAIL_RUNTIME_CONFIG_READER_VERSION;
  clientId: string | null;
  clientSecret: string | null;
  refreshToken: string | null;
  senderEmail: string | null;
  source: GmailConfigSource;
  fallback_used: boolean;
  fallback_required: boolean;
  fallback_supported: boolean;
  conflict: boolean;
  conflicted_fields: string[];
  read_time: "REQUEST_TIME";
  fingerprint: string | null;
  client_present: boolean;
  secret_present: boolean;
  refresh_present: boolean;
  sender_present: boolean;
  configured: boolean;
};

function readField(name: string): GmailRuntimeFieldRead {
  const native = nativeProcessEnv(name);
  const needFallback = !native;
  const fallback = needFallback ? osFallbackEnv(name) : null;
  if (native && fallback && native !== fallback) {
    return { name, native, fallback, value: null, source: "UNAVAILABLE", conflict: true };
  }
  if (native) return { name, native, fallback: null, value: native, source: "PROCESS_ENV", conflict: false };
  if (fallback) return { name, native: null, fallback, value: fallback, source: "OS_FALLBACK", conflict: false };
  return { name, native: null, fallback: null, value: null, source: "UNAVAILABLE", conflict: false };
}

export function evaluateGmailRuntimeConfigFallbackPolicy(input: {
  native_present: boolean;
  fallback_used: boolean;
  fallback_only_missing_fields: boolean;
  conflict: boolean;
}): NamedOutboundLoopGate {
  if (input.conflict) {
    return { gate: "GmailRuntimeConfigFallbackPolicy", result: "FAIL", reasons: ["CONFIGURATION_CONFLICT"] };
  }
  if (input.fallback_used && !input.fallback_only_missing_fields) {
    return { gate: "GmailRuntimeConfigFallbackPolicy", result: "FAIL", reasons: ["FALLBACK_USED_WHEN_NATIVE_PRESENT"] };
  }
  if (input.native_present && !input.fallback_used) {
    return { gate: "GmailRuntimeConfigFallbackPolicy", result: "PASS", reasons: ["NATIVE_PROCESS_ENV"] };
  }
  if (input.fallback_used && input.fallback_only_missing_fields) {
    return { gate: "GmailRuntimeConfigFallbackPolicy", result: "PASS", reasons: ["OS_FALLBACK_MISSING_FIELDS_ONLY"] };
  }
  return { gate: "GmailRuntimeConfigFallbackPolicy", result: "FAIL", reasons: ["CONFIGURATION_UNAVAILABLE"] };
}

export function evaluateGmailCredentialConflictGate(input: { conflict: boolean; conflicted_fields?: string[] }): NamedOutboundLoopGate {
  if (input.conflict) {
    return {
      gate: "GmailCredentialConflictGate",
      result: "FAIL",
      reasons: input.conflicted_fields?.length ? input.conflicted_fields.map((field) => `CONFLICT:${field}`) : ["CONFIGURATION_CONFLICT"],
    };
  }
  return { gate: "GmailCredentialConflictGate", result: "PASS", reasons: ["SOURCES_AGREE"] };
}

export function readGmailRuntimeConfig(): GmailRuntimeConfig {
  const fields = REQUIRED_FIELDS.map((name) => readField(name));
  const byName = Object.fromEntries(fields.map((field) => [field.name, field]));
  const client = byName[GMAIL_OAUTH_CLIENT_ID_ENV];
  const secret = byName[GMAIL_OAUTH_CLIENT_SECRET_ENV];
  const refresh = byName[GMAIL_OAUTH_REFRESH_TOKEN_ENV];
  const sender = byName[GMAIL_SENDER_EMAIL_ENV];
  const conflicted = fields.filter((field) => field.conflict);
  const fallbackUsed = fields.some((field) => field.source === "OS_FALLBACK");
  const nativeComplete = fields.every((field) => Boolean(field.native));
  const source: GmailConfigSource = conflicted.length
    ? "UNAVAILABLE"
    : fallbackUsed
      ? "OS_FALLBACK"
      : nativeComplete || fields.some((field) => field.source === "PROCESS_ENV")
        ? fields.every((field) => field.value) && !fallbackUsed
          ? "PROCESS_ENV"
          : fields.some((field) => field.value)
            ? fallbackUsed ? "OS_FALLBACK" : "PROCESS_ENV"
            : "UNAVAILABLE"
        : "UNAVAILABLE";
  const clientId = conflicted.length ? null : client?.value ?? null;
  const clientSecret = conflicted.length ? null : secret?.value ?? null;
  const refreshToken = conflicted.length ? null : refresh?.value ?? null;
  const senderEmail = conflicted.length ? null : sender?.value && sender.value.includes("@") ? sender.value.toLowerCase() : sender?.value ?? null;
  return {
    reader_version: GMAIL_RUNTIME_CONFIG_READER_VERSION,
    clientId,
    clientSecret,
    refreshToken,
    senderEmail,
    source: clientId && clientSecret && refreshToken ? source : "UNAVAILABLE",
    fallback_used: fallbackUsed,
    fallback_required: fallbackUsed,
    fallback_supported: process.env.NEXT_RUNTIME !== "edge" && !process.env.VITEST,
    conflict: conflicted.length > 0,
    conflicted_fields: conflicted.map((field) => field.name),
    read_time: "REQUEST_TIME",
    fingerprint: fingerprintGmailRefreshToken(refreshToken),
    client_present: Boolean(clientId && clientId.length >= 8),
    secret_present: Boolean(clientSecret && clientSecret.length >= 8),
    refresh_present: Boolean(refreshToken && refreshToken.length >= 8),
    sender_present: Boolean(senderEmail && senderEmail.includes("@")),
    configured: Boolean(clientId && clientSecret && refreshToken && !conflicted.length),
  };
}

export type GmailCredentialSourceAttestation = {
  execution_type: GmailExecutionType;
  source: GmailConfigSource;
  client_present: boolean;
  secret_present: boolean;
  refresh_present: boolean;
  sender_present: boolean;
  fingerprint: string | null;
  read_at: string;
  deployment_id: string | null;
  reader_version: typeof GMAIL_RUNTIME_CONFIG_READER_VERSION;
  fallback_used: boolean;
  conflict: boolean;
  region: string | null;
};

export function attestGmailCredentialSource(input: {
  execution_type: GmailExecutionType;
  config?: GmailRuntimeConfig;
  now?: string;
}): GmailCredentialSourceAttestation {
  const config = input.config ?? readGmailRuntimeConfig();
  return {
    execution_type: input.execution_type,
    source: config.source,
    client_present: config.client_present,
    secret_present: config.secret_present,
    refresh_present: config.refresh_present,
    sender_present: config.sender_present,
    fingerprint: config.fingerprint,
    read_at: input.now ?? new Date().toISOString(),
    deployment_id: process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    reader_version: GMAIL_RUNTIME_CONFIG_READER_VERSION,
    fallback_used: config.fallback_used,
    conflict: config.conflict,
    region: process.env.VERCEL_REGION ?? null,
  };
}

export function evaluateCronCredentialVisibilityStabilityGate(input: {
  consecutive_healthy: number;
  required?: number;
  last_error?: string | null;
}): NamedOutboundLoopGate {
  const required = input.required ?? CRON_CREDENTIAL_STABILITY_REQUIRED;
  if (input.last_error && /GRANT:NOT_CONFIGURED|NOT_CONFIGURED|CONFIGURATION_CONFLICT|HYDRATION_REQUIRED|EXCHANGE_BEFORE_HYDRATION|SAME_INVOCATION_MISMATCH|TOKEN_EXCHANGE_INPUT_MISMATCH/i.test(input.last_error)) {
    return { gate: "CronCredentialVisibilityStabilityGate", result: "FAIL", reasons: ["CREDENTIAL_VISIBILITY_FAILURE"] };
  }
  if (input.consecutive_healthy < required) {
    return {
      gate: "CronCredentialVisibilityStabilityGate",
      result: "NOT_PROVEN",
      reasons: [`CONSECUTIVE_HEALTHY:${input.consecutive_healthy}/${required}`],
    };
  }
  return { gate: "CronCredentialVisibilityStabilityGate", result: "PASS", reasons: [`CONSECUTIVE_HEALTHY:${required}/${required}`] };
}

export function evaluateCommunicationRuntimeStartupGracePolicy(input: {
  deployment_just_changed: boolean;
  cron_cycles_since_deploy: number;
  last_error: string | null;
  configured: boolean;
}): { state: GmailStartupState; grace_active: boolean } {
  const grantBlind = Boolean(input.last_error && /GRANT:NOT_CONFIGURED|NOT_CONFIGURED/i.test(input.last_error));
  const withinGrace = input.deployment_just_changed && input.cron_cycles_since_deploy < STARTUP_GRACE_CRON_CYCLES;
  if (withinGrace && (grantBlind || !input.configured)) {
    return { state: "INITIALIZING", grace_active: true };
  }
  if (grantBlind || !input.configured) return { state: "DEGRADED", grace_active: false };
  return { state: "STABLE", grace_active: false };
}

export function cronExecutionIsCredentialHealthy(input: {
  trigger: string;
  configured: boolean;
  client_present: boolean;
  secret_present: boolean;
  refresh_present: boolean;
  sender_present: boolean;
  token_exchange: boolean;
  gmail_readonly: boolean;
  gmail_send: boolean;
  last_error: string | null;
  conflict: boolean;
  hydration_pass?: boolean;
  same_invocation_parity?: boolean;
}): boolean {
  return input.trigger === "VERCEL_CRON"
    && input.configured
    && input.client_present
    && input.secret_present
    && input.refresh_present
    && input.sender_present
    && input.token_exchange
    && input.gmail_readonly
    && input.gmail_send
    && !input.conflict
    && !input.last_error
    && input.hydration_pass !== false
    && input.same_invocation_parity !== false;
}

export type CronCredentialVisibilityRecord = {
  at: string;
  source: GmailConfigSource;
  fingerprint: string | null;
  exchange_input_fingerprint?: string | null;
  token_exchange: boolean;
  gmail_readonly: boolean;
  gmail_send: boolean;
  last_error: string | null;
  healthy: boolean;
  same_invocation_parity?: "PASS" | "FAIL";
  hydration?: "PASS" | "FAIL";
};

export function inspectGmailRuntimeAudit(input: {
  route: string;
  runtime: "NODE" | "EDGE" | "OTHER";
  bundle: "WEBPACK" | "TURBOPACK" | "OTHER";
  execution_type: GmailExecutionType;
  source?: GmailConfigSource;
  fallback_used?: boolean;
}): {
  route: string;
  runtime: "NODE" | "EDGE" | "OTHER";
  bundle: "WEBPACK" | "TURBOPACK" | "OTHER";
  environment_read_function: "readGmailRuntimeConfig";
  credential_read_time: "REQUEST_TIME";
  process_env_native: "YES" | "NO";
  bundler_replacement_possible: "YES";
  child_process_used: "YES" | "NO";
  shell_used: "NO";
  execution_type: GmailExecutionType;
} {
  return {
    route: input.route,
    runtime: input.runtime,
    bundle: input.bundle,
    environment_read_function: "readGmailRuntimeConfig",
    credential_read_time: "REQUEST_TIME",
    process_env_native: input.source === "PROCESS_ENV" ? "YES" : "NO",
    bundler_replacement_possible: "YES",
    child_process_used: input.fallback_used ? "YES" : "NO",
    shell_used: "NO",
    execution_type: input.execution_type,
  };
}
