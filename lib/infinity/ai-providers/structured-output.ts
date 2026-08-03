import { STRUCTURED_OUTPUT_SCHEMA_VERSION } from "./constants";

export type StructuredAdvisoryPayload = {
  schemaVersion: typeof STRUCTURED_OUTPUT_SCHEMA_VERSION;
  summary: string;
  recommendations: string[];
  confidence: number;
  rationale: string[];
  advisoryOnly: true;
  binding: false;
  executiveReviewRequired: true;
};

export function validateStructuredAdvisoryPayload(
  value: unknown,
): StructuredAdvisoryPayload {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Structured output must be a JSON object.");
  }

  const record = value as Record<string, unknown>;

  if (record.schemaVersion !== STRUCTURED_OUTPUT_SCHEMA_VERSION) {
    throw new Error("Structured output schemaVersion mismatch.");
  }

  if (typeof record.summary !== "string" || record.summary.trim().length === 0) {
    throw new Error("Structured output summary is required.");
  }

  if (!Array.isArray(record.recommendations)) {
    throw new Error("Structured output recommendations must be an array.");
  }

  if (typeof record.confidence !== "number" || Number.isNaN(record.confidence)) {
    throw new Error("Structured output confidence must be a number.");
  }

  if (!Array.isArray(record.rationale)) {
    throw new Error("Structured output rationale must be an array.");
  }

  if (record.advisoryOnly !== true || record.binding !== false) {
    throw new Error("Structured output must remain advisory and non-binding.");
  }

  if (record.executiveReviewRequired !== true) {
    throw new Error("Structured output must require executive review.");
  }

  return record as StructuredAdvisoryPayload;
}

export function parseStructuredAdvisoryJson(raw: string): StructuredAdvisoryPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Malformed JSON response from provider.");
  }

  return validateStructuredAdvisoryPayload(parsed);
}
