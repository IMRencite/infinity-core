type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_LIMIT = 10;
const GENERATE_WINDOW_MS = 60 * 1000;
const GENERATE_LIMIT = 20;

function take(key: string, limit: number, windowMs: number): { ok: true } | { ok: false; reason: "RATE_LIMITED"; retryAfterSec: number } {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (current.count >= limit) {
    return { ok: false, reason: "RATE_LIMITED", retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  current.count += 1;
  return { ok: true };
}

export function limitAskReviewAuth(identity: string) {
  return take(`auth:${identity.toLowerCase()}`, AUTH_LIMIT, AUTH_WINDOW_MS);
}

export function limitAskReviewGenerate(accountId: string) {
  return take(`generate:${accountId}`, GENERATE_LIMIT, GENERATE_WINDOW_MS);
}

export function limitAskReviewLocationCreate(accountId: string) {
  return take(`location:${accountId}`, GENERATE_LIMIT, GENERATE_WINDOW_MS);
}

export function resetAskReviewRateLimits(): void {
  buckets.clear();
}

export function askReviewRateLimitConfigured(): boolean {
  return true;
}
