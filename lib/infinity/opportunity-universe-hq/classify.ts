import type { OpportunityClassification } from "./types";

const TEST_MARKERS = /\b(e2e_fixture|e2e candidate|vitest|dummy candidate|test candidate|simulated candidate|simulation fixture)\b/i;
const SIMULATION_MARKERS = /\b(simulation-only|simulated opportunity)\b/i;
const ARCHIVED_MARKERS = /\b(archived candidate)\b/i;

export function classifyOpportunityCandidate(input: {
  id?: string | null;
  title?: string | null;
  summary?: string | null;
  status?: string | null;
  archivedAt?: string | null;
}): OpportunityClassification {
  if (!input.id || !input.title?.trim()) return "INVALID";
  if (input.status === "ARCHIVED" || input.archivedAt) return "ARCHIVED";
  const blob = `${input.title} ${input.summary ?? ""}`;
  if (TEST_MARKERS.test(blob)) return /e2e/i.test(blob) ? "E2E_FIXTURE" : "TEST";
  if (SIMULATION_MARKERS.test(blob)) return "SIMULATION";
  if (ARCHIVED_MARKERS.test(blob)) return "ARCHIVED";
  return "REAL_CANONICAL";
}

export function isRealCanonicalOpportunity(classification: OpportunityClassification): boolean {
  return classification === "REAL_CANONICAL";
}
