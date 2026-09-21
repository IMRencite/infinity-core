import { createHash } from "node:crypto";
import type { NamedGate } from "./types";
import { IMPROVEMENT_SUBMISSION_IDEMPOTENCY_GATE } from "./types";

export const INTAKE_MAX_BYTES = 8192;
export const INTAKE_MAX_MESSAGE = 2000;
export const INTAKE_RATE_LIMIT = 8;
export const INTAKE_RATE_WINDOW_MS = 10 * 60 * 1000;
export const ACCIDENTAL_DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const seenSubmissions = new Map<string, number>();
const recentFingerprints = new Map<string, number>();

const SENSITIVE_KEY = /password|passwd|secret|token|authorization|card|cvv|ssn|cookie|localstorage|sessionstorage/i;
const SENSITIVE_VALUE = /password=|secret=|token=|Bearer |sk_live|sk_test|card number|cvv\b|monthly_rent|discount_rate|npv\s+\d/i;

export function resetVentureImprovementIntakeSafeguards(): void {
  rateBuckets.clear();
  seenSubmissions.clear();
  recentFingerprints.clear();
}

export function hashIntakeFingerprint(input: { venture_id: string; identity: string; message: string }): string {
  return createHash("sha256").update(`${input.venture_id}|${input.identity.trim().toLowerCase()}|${input.message.trim()}`).digest("hex").slice(0, 24);
}

export function evaluateImprovementSubmissionIdempotencyGate(input: {
  submission_id: string;
  fingerprint: string;
  now?: number;
}): NamedGate {
  const now = input.now ?? Date.now();
  const priorId = seenSubmissions.get(input.submission_id);
  if (priorId != null) {
    return { gate: IMPROVEMENT_SUBMISSION_IDEMPOTENCY_GATE, result: "FAIL", reasons: ["DUPLICATE_SUBMISSION_ID"] };
  }
  const priorPrint = recentFingerprints.get(input.fingerprint);
  if (priorPrint != null && now - priorPrint < ACCIDENTAL_DUPLICATE_WINDOW_MS) {
    return { gate: IMPROVEMENT_SUBMISSION_IDEMPOTENCY_GATE, result: "FAIL", reasons: ["ACCIDENTAL_REPEAT_WINDOW"] };
  }
  return { gate: IMPROVEMENT_SUBMISSION_IDEMPOTENCY_GATE, result: "PASS", reasons: ["UNIQUE_SUBMISSION"] };
}

export function rememberIntakeSubmission(input: { submission_id: string; fingerprint: string; now?: number }): void {
  const now = input.now ?? Date.now();
  seenSubmissions.set(input.submission_id, now);
  recentFingerprints.set(input.fingerprint, now);
}

export function evaluateIntakeRateLimit(clientKey: string, now = Date.now()): NamedGate {
  const current = rateBuckets.get(clientKey);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(clientKey, { count: 1, resetAt: now + INTAKE_RATE_WINDOW_MS });
    return { gate: "VentureImprovementIntakeRateLimit", result: "PASS", reasons: [] };
  }
  if (current.count >= INTAKE_RATE_LIMIT) {
    return { gate: "VentureImprovementIntakeRateLimit", result: "FAIL", reasons: ["RATE_LIMITED"] };
  }
  current.count += 1;
  return { gate: "VentureImprovementIntakeRateLimit", result: "PASS", reasons: [] };
}

export function sanitizeIntakeContext(input: {
  page_url_or_route?: string | null;
  workflow_context?: string | null;
  product_area?: string | null;
  goal_or_context?: string | null;
}): { page_url_or_route: string | null; workflow_context: string | null; product_area: string | null; goal_or_context: string | null } {
  const clean = (value: string | null | undefined) => {
    if (!value) return null;
    const trimmed = value.trim().slice(0, 180);
    if (!trimmed || SENSITIVE_VALUE.test(trimmed)) return null;
    return trimmed;
  };
  return {
    page_url_or_route: clean(input.page_url_or_route),
    workflow_context: clean(input.workflow_context),
    product_area: clean(input.product_area),
    goal_or_context: clean(input.goal_or_context),
  };
}

export function looksLikeSensitiveCapture(payload: Record<string, unknown>): boolean {
  return Object.keys(payload).some((key) => SENSITIVE_KEY.test(key));
}
