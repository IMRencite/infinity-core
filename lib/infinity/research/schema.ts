import { createHash } from "node:crypto";
import {
  EVIDENCE_SIGNAL_TYPES,
  GROUNDED_RESEARCH_SCHEMA_VERSION,
  RESEARCH_LIMITS,
} from "./constants";
import type { ProviderResearchStructuredOutput } from "./types";

function stringArray(value: unknown, max: number, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${field} must be an array.`);
  }
  if (value.length > max) {
    throw new Error(`${field} exceeds maximum length (${max}).`);
  }
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function optionalConfidence(value: unknown, field: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${field} must be a number or null.`);
  }
  if (value < 0 || value > 1) {
    throw new Error(`${field} must be between 0 and 1 when using provider confidence scale.`);
  }
  return value;
}

export function validateProviderResearchStructuredOutput(
  value: unknown,
): ProviderResearchStructuredOutput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Structured research output must be an object.");
  }

  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== GROUNDED_RESEARCH_SCHEMA_VERSION) {
    throw new Error("Structured research schemaVersion mismatch.");
  }

  const summary = String(record.summary ?? "");
  if (summary.trim().length === 0 || summary.length > RESEARCH_LIMITS.maxSummaryLength) {
    throw new Error("summary is required and must be within size limits.");
  }

  const findingsRaw = Array.isArray(record.findings) ? record.findings : [];
  if (findingsRaw.length === 0) {
    throw new Error("findings must contain at least one item.");
  }
  if (findingsRaw.length > RESEARCH_LIMITS.maxFindings) {
    throw new Error("findings exceeds maximum length.");
  }

  const findings = findingsRaw.map((entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error(`findings[${index}] must be an object.`);
    }
    const finding = entry as Record<string, unknown>;
    const signalType = finding.signalType;
    if (
      typeof signalType !== "string" ||
      !(EVIDENCE_SIGNAL_TYPES as readonly string[]).includes(signalType)
    ) {
      throw new Error(`findings[${index}].signalType is invalid.`);
    }

    const grounded = finding.grounded;
    const inference = finding.inference;
    if (typeof grounded !== "boolean" || typeof inference !== "boolean") {
      throw new Error(`findings[${index}] grounded/inference must be boolean.`);
    }

    const sourceUrls = stringArray(
      finding.sourceUrls ?? [],
      RESEARCH_LIMITS.maxSources,
      `findings[${index}].sourceUrls`,
    );

    if (grounded && !inference && sourceUrls.length === 0) {
      // sourceUrls may be empty when the provider attaches grounding URLs server-side.
    }

    for (const url of sourceUrls) {
      if (!/^https?:\/\//i.test(url)) {
        throw new Error(`findings[${index}] contains invalid source URL.`);
      }
    }

    const claim = String(finding.claim ?? "");
    if (claim.trim().length === 0 || claim.length > RESEARCH_LIMITS.maxClaimLength) {
      throw new Error(`findings[${index}].claim is required and within limits.`);
    }

    return {
      findingId: String(finding.findingId ?? `finding_${index + 1}`),
      claim,
      signalType: signalType as ProviderResearchStructuredOutput["findings"][number]["signalType"],
      observedSignal: String(finding.observedSignal ?? ""),
      relevance: String(finding.relevance ?? ""),
      confidence: optionalConfidence(finding.confidence, `findings[${index}].confidence`),
      grounded,
      inference,
      sourceUrls,
      limitations: stringArray(
        finding.limitations ?? [],
        RESEARCH_LIMITS.maxLimitations,
        `findings[${index}].limitations`,
      ),
    };
  });

  return {
    schemaVersion: GROUNDED_RESEARCH_SCHEMA_VERSION,
    summary,
    findings,
    limitations: stringArray(
      record.limitations ?? [],
      RESEARCH_LIMITS.maxLimitations,
      "limitations",
    ),
    requiresMoreResearch: Boolean(record.requiresMoreResearch),
  };
}

export function parseProviderResearchJson(raw: string): ProviderResearchStructuredOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Malformed JSON response from research provider.");
  }
  return validateProviderResearchStructuredOutput(parsed);
}

export function hashResearchInput(input: {
  researchObjective: string;
  systemInstructions: string;
  providerId: string;
  modelId: string;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        researchObjective: input.researchObjective,
        systemInstructions: input.systemInstructions,
        providerId: input.providerId,
        modelId: input.modelId,
        schemaVersion: GROUNDED_RESEARCH_SCHEMA_VERSION,
      }),
    )
    .digest("hex");
}

export function providerResearchJsonSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "summary", "findings", "limitations", "requiresMoreResearch"],
    properties: {
      schemaVersion: { type: "string", enum: [GROUNDED_RESEARCH_SCHEMA_VERSION] },
      summary: { type: "string" },
      findings: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "findingId",
            "claim",
            "signalType",
            "observedSignal",
            "relevance",
            "confidence",
            "grounded",
            "inference",
            "sourceUrls",
            "limitations",
          ],
          properties: {
            findingId: { type: "string" },
            claim: { type: "string" },
            signalType: { type: "string", enum: [...EVIDENCE_SIGNAL_TYPES] },
            observedSignal: { type: "string" },
            relevance: { type: "string" },
            confidence: { type: "number", nullable: true },
            grounded: { type: "boolean" },
            inference: { type: "boolean" },
            sourceUrls: { type: "array", items: { type: "string" } },
            limitations: { type: "array", items: { type: "string" } },
          },
        },
      },
      limitations: { type: "array", items: { type: "string" } },
      requiresMoreResearch: { type: "boolean" },
    },
  };
}
