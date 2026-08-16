import {
  BUSINESS_MODEL_CANDIDATE_TYPES,
  OPPORTUNITY_SCANNER_EXTRACTION_SCHEMA_VERSION,
  type DiscoveryStrategyId,
} from "./constants";
import type { ProviderExtractionOutput } from "./types";

function clampScore(value: unknown): number {
  const num = Number(value);
  if (Number.isNaN(num)) return 0;
  return Math.max(0, Math.min(1, num));
}

function evidenceArray(value: unknown, field: string) {
  if (!Array.isArray(value)) {
    throw new Error(`${field} must be an array.`);
  }
  return value.map((entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error(`${field}[${index}] must be an object.`);
    }
    const record = entry as Record<string, unknown>;
    return {
      signalType: String(record.signalType ?? "unknown"),
      claim: String(record.claim ?? ""),
      observedSignal: String(record.observedSignal ?? ""),
      relevance: String(record.relevance ?? ""),
      sourceUrls: Array.isArray(record.sourceUrls)
        ? record.sourceUrls.filter((u): u is string => typeof u === "string")
        : [],
      grounded: Boolean(record.grounded),
      limitations: Array.isArray(record.limitations)
        ? record.limitations.filter((l): l is string => typeof l === "string")
        : [],
    };
  });
}

export function providerExtractionJsonSchema(): Record<string, unknown> {
  const evidenceSchema = {
    type: "object",
    additionalProperties: false,
    required: [
      "signalType",
      "claim",
      "observedSignal",
      "relevance",
      "sourceUrls",
      "grounded",
      "limitations",
    ],
    properties: {
      signalType: { type: "string" },
      claim: { type: "string" },
      observedSignal: { type: "string" },
      relevance: { type: "string" },
      sourceUrls: { type: "array", items: { type: "string" } },
      grounded: { type: "boolean" },
      limitations: { type: "array", items: { type: "string" } },
    },
  };

  return {
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "strategyId", "candidates", "limitations"],
    properties: {
      schemaVersion: {
        type: "string",
        enum: [OPPORTUNITY_SCANNER_EXTRACTION_SCHEMA_VERSION],
      },
      strategyId: { type: "string" },
      candidates: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "candidateId",
            "title",
            "summary",
            "problem",
            "targetCustomer",
            "market",
            "businessModelCandidates",
            "revenueMechanismCandidates",
            "demandEvidence",
            "marketEvidence",
            "competitionEvidence",
            "monetizationEvidence",
            "distributionEvidence",
            "buildabilityEvidence",
            "risks",
            "unknowns",
            "scoringAssessment",
          ],
          properties: {
            candidateId: { type: "string" },
            title: { type: "string" },
            summary: { type: "string" },
            problem: { type: "string" },
            targetCustomer: { type: "string" },
            market: { type: "string" },
            businessModelCandidates: {
              type: "array",
              items: { type: "string", enum: [...BUSINESS_MODEL_CANDIDATE_TYPES] },
            },
            revenueMechanismCandidates: { type: "array", items: { type: "string" } },
            demandEvidence: { type: "array", items: evidenceSchema },
            marketEvidence: { type: "array", items: evidenceSchema },
            competitionEvidence: { type: "array", items: evidenceSchema },
            monetizationEvidence: { type: "array", items: evidenceSchema },
            distributionEvidence: { type: "array", items: evidenceSchema },
            buildabilityEvidence: { type: "array", items: evidenceSchema },
            risks: { type: "array", items: { type: "string" } },
            unknowns: { type: "array", items: { type: "string" } },
            scoringAssessment: {
              type: "object",
              additionalProperties: false,
              required: [
                "demandStrength",
                "marketGrowth",
                "competitionWeakness",
                "monetizationPotential",
                "buildability",
                "automationPotential",
                "distributionStrength",
                "capitalEfficiency",
                "speedToRevenue",
                "evidenceConfidence",
              ],
              properties: {
                demandStrength: { type: "number", nullable: true },
                marketGrowth: { type: "number", nullable: true },
                competitionWeakness: { type: "number", nullable: true },
                monetizationPotential: { type: "number", nullable: true },
                buildability: { type: "number", nullable: true },
                automationPotential: { type: "number", nullable: true },
                distributionStrength: { type: "number", nullable: true },
                capitalEfficiency: { type: "number", nullable: true },
                speedToRevenue: { type: "number", nullable: true },
                evidenceConfidence: { type: "number", nullable: true },
              },
            },
          },
        },
      },
      limitations: { type: "array", items: { type: "string" } },
    },
  };
}

export function validateProviderExtractionOutput(
  value: unknown,
  expectedStrategyId: DiscoveryStrategyId,
): ProviderExtractionOutput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Extraction output must be an object.");
  }
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== OPPORTUNITY_SCANNER_EXTRACTION_SCHEMA_VERSION) {
    throw new Error("Extraction schemaVersion mismatch.");
  }
  if (record.strategyId !== expectedStrategyId) {
    throw new Error("Extraction strategyId mismatch.");
  }

  const candidatesRaw = Array.isArray(record.candidates) ? record.candidates : [];
  const candidates = candidatesRaw.map((entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error(`candidates[${index}] must be an object.`);
    }
    const c = entry as Record<string, unknown>;
    const assessment = c.scoringAssessment as Record<string, unknown>;
    return {
      candidateId: String(c.candidateId ?? `candidate_${index + 1}`),
      title: String(c.title ?? ""),
      summary: String(c.summary ?? ""),
      problem: String(c.problem ?? ""),
      targetCustomer: String(c.targetCustomer ?? ""),
      market: String(c.market ?? ""),
      businessModelCandidates: Array.isArray(c.businessModelCandidates)
        ? c.businessModelCandidates.map(String)
        : [],
      revenueMechanismCandidates: Array.isArray(c.revenueMechanismCandidates)
        ? c.revenueMechanismCandidates.map(String)
        : [],
      demandEvidence: evidenceArray(c.demandEvidence, `candidates[${index}].demandEvidence`),
      marketEvidence: evidenceArray(c.marketEvidence, `candidates[${index}].marketEvidence`),
      competitionEvidence: evidenceArray(
        c.competitionEvidence,
        `candidates[${index}].competitionEvidence`,
      ),
      monetizationEvidence: evidenceArray(
        c.monetizationEvidence,
        `candidates[${index}].monetizationEvidence`,
      ),
      distributionEvidence: evidenceArray(
        c.distributionEvidence,
        `candidates[${index}].distributionEvidence`,
      ),
      buildabilityEvidence: evidenceArray(
        c.buildabilityEvidence,
        `candidates[${index}].buildabilityEvidence`,
      ),
      risks: Array.isArray(c.risks) ? c.risks.map(String) : [],
      unknowns: Array.isArray(c.unknowns) ? c.unknowns.map(String) : [],
      scoringAssessment: {
        demandStrength: clampScore(assessment?.demandStrength),
        marketGrowth: clampScore(assessment?.marketGrowth),
        competitionWeakness: clampScore(assessment?.competitionWeakness),
        monetizationPotential: clampScore(assessment?.monetizationPotential),
        buildability: clampScore(assessment?.buildability),
        automationPotential: clampScore(assessment?.automationPotential),
        distributionStrength: clampScore(assessment?.distributionStrength),
        capitalEfficiency: clampScore(assessment?.capitalEfficiency),
        speedToRevenue: clampScore(assessment?.speedToRevenue),
        evidenceConfidence: clampScore(assessment?.evidenceConfidence),
      },
    };
  });

  return {
    schemaVersion: OPPORTUNITY_SCANNER_EXTRACTION_SCHEMA_VERSION,
    strategyId: expectedStrategyId,
    candidates,
    limitations: Array.isArray(record.limitations) ? record.limitations.map(String) : [],
  };
}

export function parseProviderExtractionJson(
  raw: string,
  expectedStrategyId: DiscoveryStrategyId,
): ProviderExtractionOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Malformed JSON extraction response from provider.");
  }
  return validateProviderExtractionOutput(parsed, expectedStrategyId);
}
