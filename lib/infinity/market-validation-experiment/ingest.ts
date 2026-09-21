import { ingestExperimentEvents, makeEvent } from "./events";
import { getActivePublicValidationArtifactId } from "./active-public-artifact";
import { CRE_CANDIDATE_ID, LOCKED_CRE_EXPERIMENT_ID } from "./constants";
import { containsSensitiveField, qualifyProspect, submissionDedupeKey, validatePilotForm } from "./form";
import { parsePublicValidationIngest } from "./public-contract";
import { experimentAcceptsProductionEvidence } from "./runtime-state";
import type { ExperimentEventRecord } from "./types";
import { createIngestState, type IngestState } from "@/lib/infinity/performance-intelligence-engine/ingestion/observation-ingestor";

export const PUBLIC_INGEST_MAX_BYTES = 8192;
export const PUBLIC_INGEST_RATE_LIMIT = 30;
export const PUBLIC_INGEST_WINDOW_MS = 60_000;
export const PUBLIC_INGEST_ROUTE = "/api/public/market-validation";
export const PUBLIC_INGEST_ROUTE_FILE = "app/api/public/market-validation/[experimentId]/ingest/route.ts";

export type PublicIngestAllowlist = {
  candidateId: string;
  experimentId: string;
  artifactId: string;
};

export const CRE_VALIDATION_ALLOWLIST: PublicIngestAllowlist = {
  get candidateId() {
    return CRE_CANDIDATE_ID;
  },
  get experimentId() {
    return LOCKED_CRE_EXPERIMENT_ID;
  },
  get artifactId() {
    return getActivePublicValidationArtifactId();
  },
};

type RateBucket = { count: number; windowStart: number };

let ingestState: IngestState = createIngestState();
const rateBuckets = new Map<string, RateBucket>();
const submissionKeys = new Set<string>();

export function resetPublicIngestRuntime(): void {
  ingestState = createIngestState();
  rateBuckets.clear();
  submissionKeys.clear();
}

export function publicIngestState(): IngestState {
  return ingestState;
}

export function publicValidationIngestOrigin(raw?: string | null): string | null {
  const value = (raw ?? "").trim().replace(/\/$/, "");
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) return null;
    if (host === "example.com" || host.endsWith(".example.com")) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function corsOriginAllowed(origin: string | null | undefined): boolean {
  void origin;
  return false;
}

function forbiddenOriginInSource(blob: string): boolean {
  return /https?:\/\/(localhost|127\.0\.0\.1|example\.com)/i.test(blob);
}

export function evaluateFormBackendReadiness(input: {
  artifactFiles?: Array<{ path: string; content: string }>;
  experimentId?: string;
}): {
  handlerPresent: true;
  sameOrigin: true;
  publicOriginConfigured: boolean;
  localhost: boolean;
  artifactWired: boolean;
  readyForLiveDeploy: boolean;
  reason: string;
} {
  const files = input.artifactFiles ?? [];
  const blob = files.map((file) => file.content).join("\n");
  const experimentId = input.experimentId ?? LOCKED_CRE_EXPERIMENT_ID;
  const localhost = /https?:\/\/(localhost|127\.0\.0\.1)/i.test(blob);
  const forbidden = forbiddenOriginInSource(blob);
  const hasRoute = files.some((file) => file.path.replace(/\\/g, "/") === PUBLIC_INGEST_ROUTE_FILE);
  const relativeClient =
    blob.includes(PUBLIC_INGEST_ROUTE) &&
    blob.includes(experimentId) &&
    blob.includes("VALIDATION_INGEST_PATH") &&
    /fetch\(\s*VALIDATION_INGEST_PATH/.test(blob) &&
    !blob.includes("VALIDATION_INGEST_ORIGIN");
  const wired = hasRoute && relativeClient && !localhost && !forbidden;
  return {
    handlerPresent: true,
    sameOrigin: true,
    publicOriginConfigured: hasRoute,
    localhost,
    artifactWired: wired,
    readyForLiveDeploy: wired,
    reason: localhost
      ? "localhost_ingest_forbidden"
      : forbidden
        ? "placeholder_origin_forbidden"
        : wired
          ? "same_origin_ingest_ready"
          : "artifact_form_not_wired_to_same_origin_ingest",
  };
}

export function evaluateAnalyticsBackendReadiness(input: {
  artifactFiles?: Array<{ path: string; content: string }>;
  experimentId?: string;
} = {}): {
  canonicalIngestPath: true;
  publicRoute: true;
  lineageEnforced: true;
  testMemoryOnly: false;
  readyForLiveDeploy: boolean;
  reason: string;
} {
  const form = evaluateFormBackendReadiness(input);
  return {
    canonicalIngestPath: true,
    publicRoute: true,
    lineageEnforced: true,
    testMemoryOnly: false,
    readyForLiveDeploy: form.readyForLiveDeploy,
    reason: form.readyForLiveDeploy ? "same_origin_pi_contract_ready" : form.reason,
  };
}

export function allowlistFor(experimentId: string): PublicIngestAllowlist | null {
  if (experimentId === CRE_VALIDATION_ALLOWLIST.experimentId) return CRE_VALIDATION_ALLOWLIST;
  return null;
}

function rateLimitOk(key: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.windowStart >= PUBLIC_INGEST_WINDOW_MS) {
    rateBuckets.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (bucket.count >= PUBLIC_INGEST_RATE_LIMIT) return false;
  bucket.count += 1;
  return true;
}

export function handlePublicValidationIngest(input: {
  experimentId: string;
  body: unknown;
  byteLength: number;
  clientKey: string;
  allowlist?: PublicIngestAllowlist | null;
}): {
  ok: boolean;
  status: number;
  error?: string;
  accepted?: number;
  duplicates?: number;
  productionAccepted?: number;
} {
  const allowlist = input.allowlist === undefined ? allowlistFor(input.experimentId) : input.allowlist;
  if (!allowlist || allowlist.experimentId !== input.experimentId) {
    return { ok: false, status: 404, error: "unknown_experiment" };
  }
  if (input.byteLength > PUBLIC_INGEST_MAX_BYTES) {
    return { ok: false, status: 413, error: "payload_too_large" };
  }
  if (!rateLimitOk(input.clientKey)) {
    return { ok: false, status: 429, error: "rate_limited" };
  }
  const parsed = parsePublicValidationIngest(input.body);
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error };
  const request = parsed.request;
  if (request.kind === "form" && containsSensitiveField(request.form as unknown as Record<string, unknown>)) {
    return { ok: false, status: 400, error: "sensitive_fields_forbidden" };
  }
  if (!request.synthetic && !experimentAcceptsProductionEvidence(allowlist.experimentId)) {
    return { ok: false, status: 409, error: "experiment_not_collecting" };
  }

  const events: ExperimentEventRecord[] = [];
  if (request.kind === "form") {
    const valid = validatePilotForm(request.form);
    if (!valid.ok) return { ok: false, status: 400, error: "invalid_form" };
    const prospect = qualifyProspect(request.form);
    const dedupe = `form:${allowlist.experimentId}:${submissionDedupeKey(request.form.workEmail)}`;
    if (submissionKeys.has(dedupe)) {
      return { ok: true, status: 200, accepted: 0, duplicates: 1, productionAccepted: 0 };
    }
    submissionKeys.add(dedupe);
    events.push(
      makeEvent({
        type: prospect.qualified ? "QUALIFIED_PILOT_APPLICATION" : "PILOT_REQUEST",
        candidateId: allowlist.candidateId,
        experimentId: allowlist.experimentId,
        artifactId: allowlist.artifactId,
        occurredAt: request.occurredAt ?? new Date().toISOString(),
        synthetic: request.synthetic,
        prospectKey: submissionDedupeKey(request.form.workEmail),
        qualified: prospect.qualified,
        pricingOptionId: request.form.preferredPricing || null,
      }),
    );
    if (request.form.preferredPricing) {
      events.push(
        makeEvent({
          type: "PRICE_OPTION_SELECTED",
          candidateId: allowlist.candidateId,
          experimentId: allowlist.experimentId,
          artifactId: allowlist.artifactId,
          occurredAt: request.occurredAt ?? new Date().toISOString(),
          synthetic: request.synthetic,
          prospectKey: submissionDedupeKey(request.form.workEmail),
          qualified: prospect.qualified,
          pricingOptionId: request.form.preferredPricing,
        }),
      );
    }
  } else {
    events.push(
      makeEvent({
        type: request.eventType,
        candidateId: allowlist.candidateId,
        experimentId: allowlist.experimentId,
        artifactId: allowlist.artifactId,
        occurredAt: request.occurredAt ?? new Date().toISOString(),
        synthetic: request.synthetic,
        prospectKey: request.sessionId,
        qualified: false,
        pricingOptionId: request.pricingOption,
      }),
    );
  }

  const ingested = ingestExperimentEvents({ events, state: ingestState });
  ingestState = ingested.state;
  return {
    ok: true,
    status: 202,
    accepted: ingested.events.length,
    duplicates: ingested.duplicates,
    productionAccepted: ingested.productionEvents.length,
  };
}
