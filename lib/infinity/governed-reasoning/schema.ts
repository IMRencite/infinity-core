export {
  GOVERNED_REASONING_SCHEMA_VERSION,
  GOVERNED_RECOMMENDATIONS,
  type GovernedRecommendation,
} from "./constants";

import { GOVERNED_REASONING_SCHEMA_VERSION, GOVERNED_RECOMMENDATIONS, type GovernedRecommendation } from "./constants";

export type GovernedFinding = {
  title: string;
  statement: string;
  confidence: number;
  evidenceReferenceIds: string[];
  assumptions: string[];
  unknowns: string[];
};

export type GovernedRisk = {
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  rationale: string;
};

export type GovernedOpportunity = {
  title: string;
  potential: "low" | "medium" | "high";
  confidence: number;
  rationale: string;
};

export type GovernedReasoningStructuredOutput = {
  schemaVersion: typeof GOVERNED_REASONING_SCHEMA_VERSION;
  summary: string;
  findings: GovernedFinding[];
  risks: GovernedRisk[];
  opportunities: GovernedOpportunity[];
  recommendation: GovernedRecommendation;
  recommendationConfidence: number;
  missingInformation: string[];
  contradictions: string[];
  executiveQuestions: string[];
};

function isConfidence(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value) && value >= 0 && value <= 100;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

export function validateGovernedReasoningOutput(
  value: unknown,
  allowedEvidenceIds: Set<string>,
): GovernedReasoningStructuredOutput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Structured reasoning output must be an object.");
  }

  const record = value as Record<string, unknown>;

  if (record.schemaVersion !== GOVERNED_REASONING_SCHEMA_VERSION) {
    throw new Error("Structured reasoning schemaVersion mismatch.");
  }

  if (typeof record.summary !== "string" || record.summary.trim().length === 0) {
    throw new Error("Structured reasoning summary is required.");
  }

  if (!isConfidence(record.recommendationConfidence)) {
    throw new Error("recommendationConfidence must be between 0 and 100.");
  }

  if (
    typeof record.recommendation !== "string" ||
    !(GOVERNED_RECOMMENDATIONS as readonly string[]).includes(record.recommendation)
  ) {
    throw new Error("Unsupported recommendation value.");
  }

  const findingsRaw = Array.isArray(record.findings) ? record.findings : [];
  const findings: GovernedFinding[] = findingsRaw.map((entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error(`findings[${index}] must be an object.`);
    }

    const finding = entry as Record<string, unknown>;
    const evidenceReferenceIds = stringArray(finding.evidenceReferenceIds);

    for (const ref of evidenceReferenceIds) {
      if (!allowedEvidenceIds.has(ref)) {
        throw new Error(`Unsupported evidence reference ID: ${ref}`);
      }
    }

    if (!isConfidence(finding.confidence)) {
      throw new Error(`findings[${index}].confidence must be 0-100.`);
    }

    return {
      title: String(finding.title ?? ""),
      statement: String(finding.statement ?? ""),
      confidence: finding.confidence as number,
      evidenceReferenceIds,
      assumptions: stringArray(finding.assumptions),
      unknowns: stringArray(finding.unknowns),
    };
  });

  const risksRaw = Array.isArray(record.risks) ? record.risks : [];
  const risks: GovernedRisk[] = risksRaw.map((entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error(`risks[${index}] must be an object.`);
    }

    const risk = entry as Record<string, unknown>;
    const severity = risk.severity;

    if (
      severity !== "low" &&
      severity !== "medium" &&
      severity !== "high" &&
      severity !== "critical"
    ) {
      throw new Error(`risks[${index}].severity is invalid.`);
    }

    if (!isConfidence(risk.confidence)) {
      throw new Error(`risks[${index}].confidence must be 0-100.`);
    }

    return {
      title: String(risk.title ?? ""),
      severity,
      confidence: risk.confidence as number,
      rationale: String(risk.rationale ?? ""),
    };
  });

  const opportunitiesRaw = Array.isArray(record.opportunities) ? record.opportunities : [];
  const opportunities: GovernedOpportunity[] = opportunitiesRaw.map((entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error(`opportunities[${index}] must be an object.`);
    }

    const opp = entry as Record<string, unknown>;
    const potential = opp.potential;

    if (potential !== "low" && potential !== "medium" && potential !== "high") {
      throw new Error(`opportunities[${index}].potential is invalid.`);
    }

    if (!isConfidence(opp.confidence)) {
      throw new Error(`opportunities[${index}].confidence must be 0-100.`);
    }

    return {
      title: String(opp.title ?? ""),
      potential,
      confidence: opp.confidence as number,
      rationale: String(opp.rationale ?? ""),
    };
  });

  return {
    schemaVersion: GOVERNED_REASONING_SCHEMA_VERSION,
    summary: record.summary,
    findings,
    risks,
    opportunities,
    recommendation: record.recommendation as GovernedRecommendation,
    recommendationConfidence: record.recommendationConfidence,
    missingInformation: stringArray(record.missingInformation),
    contradictions: stringArray(record.contradictions),
    executiveQuestions: stringArray(record.executiveQuestions),
  };
}

export function parseGovernedReasoningJson(
  raw: string,
  allowedEvidenceIds: Set<string>,
): GovernedReasoningStructuredOutput {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Malformed JSON response from reasoning provider.");
  }

  return validateGovernedReasoningOutput(parsed, allowedEvidenceIds);
}

export function governedReasoningJsonSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "schemaVersion",
      "summary",
      "findings",
      "risks",
      "opportunities",
      "recommendation",
      "recommendationConfidence",
      "missingInformation",
      "contradictions",
      "executiveQuestions",
    ],
    properties: {
      schemaVersion: { type: "string", const: GOVERNED_REASONING_SCHEMA_VERSION },
      summary: { type: "string" },
      findings: { type: "array" },
      risks: { type: "array" },
      opportunities: { type: "array" },
      recommendation: { type: "string", enum: [...GOVERNED_RECOMMENDATIONS] },
      recommendationConfidence: { type: "number" },
      missingInformation: { type: "array", items: { type: "string" } },
      contradictions: { type: "array", items: { type: "string" } },
      executiveQuestions: { type: "array", items: { type: "string" } },
    },
  };
}
