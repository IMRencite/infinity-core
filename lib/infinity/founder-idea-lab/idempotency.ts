export function founderDiscoveryIdempotencyKey(submissionId: string): string {
  return `founder-idea-discovery:${submissionId}`;
}

export function founderResearchAttemptKey(input: {
  submissionId: string;
  candidateId: string;
  attempt: number;
}): string {
  return `founder-idea-research:${input.submissionId}:${input.candidateId}:v${input.attempt}`;
}

export function derivedFounderReanalysisAttempt(persistedHistoryLength: number): number {
  return Math.max(1, persistedHistoryLength + 1);
}

export function resolveFounderReanalysisAttempt(input: {
  formAttempt?: number | null;
  persistedHistoryLength: number;
}): { ok: true; attempt: number } | { ok: false; error: string } {
  const derived = derivedFounderReanalysisAttempt(input.persistedHistoryLength);
  if (input.formAttempt == null) {
    return { ok: true, attempt: derived };
  }
  if (!Number.isInteger(input.formAttempt) || input.formAttempt < 1) {
    return { ok: false, error: "INVALID_REANALYSIS_ATTEMPT" };
  }
  if (input.formAttempt > derived) {
    return { ok: false, error: "FOUNDER_REANALYSIS_ATTEMPT_AHEAD" };
  }
  return { ok: true, attempt: input.formAttempt };
}

export function parseFounderReanalysisAttemptField(
  value: unknown,
): { ok: true; attempt?: number } | { ok: false; error: string } {
  if (value == null || value === "") return { ok: true };
  const raw = typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
  if (!raw) return { ok: true };
  if (!/^[0-9]+$/.test(raw)) return { ok: false, error: "INVALID_REANALYSIS_ATTEMPT" };
  const attempt = Number(raw);
  if (!Number.isInteger(attempt) || attempt < 1) {
    return { ok: false, error: "INVALID_REANALYSIS_ATTEMPT" };
  }
  return { ok: true, attempt };
}

export function founderDiscoveryLineageId(row: {
  correlation_id?: unknown;
  search_scope?: unknown;
}): string | null {
  const scope = row.search_scope;
  if (scope && typeof scope === "object" && "founderIdeaSubmissionId" in scope) {
    const value = (scope as { founderIdeaSubmissionId?: unknown }).founderIdeaSubmissionId;
    if (typeof value === "string" && value.trim()) return value;
  }
  if (typeof row.correlation_id === "string" && row.correlation_id.trim()) {
    return row.correlation_id;
  }
  return null;
}
