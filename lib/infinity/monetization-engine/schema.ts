import {
  MONETIZATION_ARCHETYPE_TYPES,
  MONETIZATION_EXTRACTION_SCHEMA_VERSION,
  VALIDATION_EXPERIMENT_TYPES,
} from "./constants";
import type { ProviderMonetizationExtractionOutput } from "./types";

function clampScore(value: unknown): number {
  const num = Number(value);
  if (Number.isNaN(num)) return 0;
  return Math.max(0, Math.min(1, num));
}

function clampNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
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
      evidenceType: String(record.evidenceType ?? "other"),
      title: String(record.title ?? ""),
      claim: String(record.claim ?? ""),
      summary: String(record.summary ?? ""),
      sourceUrls: stringArray(record.sourceUrls),
      grounded: Boolean(record.grounded),
      limitations: stringArray(record.limitations),
    };
  });
}

function scoringAssessment(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("scoringAssessment must be an object.");
  }
  const record = value as Record<string, unknown>;
  return {
    revenuePotential: clampScore(record.revenuePotential),
    marginPotential: clampScore(record.marginPotential),
    speedToRevenue: clampScore(record.speedToRevenue),
    recurringRevenuePotential: clampScore(record.recurringRevenuePotential),
    automationPotential: clampScore(record.automationPotential),
    scalability: clampScore(record.scalability),
    customerAcquisitionFeasibility: clampScore(record.customerAcquisitionFeasibility),
    capitalEfficiency: clampScore(record.capitalEfficiency),
    competition: clampScore(record.competition),
    platformDependency: clampScore(record.platformDependency),
    operationalComplexity: clampScore(record.operationalComplexity),
    technicalComplexity: clampScore(record.technicalComplexity),
    evidenceConfidence: clampScore(record.evidenceConfidence),
  };
}

export function providerMonetizationExtractionJsonSchema(): Record<string, unknown> {
  const evidenceSchema = {
    type: "object",
    additionalProperties: false,
    required: ["evidenceType", "title", "claim", "summary", "sourceUrls", "grounded", "limitations"],
    properties: {
      evidenceType: { type: "string" },
      title: { type: "string" },
      claim: { type: "string" },
      summary: { type: "string" },
      sourceUrls: { type: "array", items: { type: "string" } },
      grounded: { type: "boolean" },
      limitations: { type: "array", items: { type: "string" } },
    },
  };

  const revenueStreamSchema = {
    type: "object",
    additionalProperties: false,
    required: [
      "streamRole",
      "streamName",
      "modelType",
      "description",
      "payer",
      "pricingModel",
      "estimatedPriceBase",
      "billingFrequency",
      "estimatedShareOfRevenuePercent",
      "estimatedCustomersYear1",
    ],
    properties: {
      streamRole: { type: "string", enum: ["primary", "secondary", "future"] },
      streamName: { type: "string" },
      modelType: { type: "string", enum: [...MONETIZATION_ARCHETYPE_TYPES] },
      description: { type: "string" },
      payer: { type: "string" },
      pricingModel: { type: "string" },
      estimatedPriceBase: { type: "number", nullable: true },
      billingFrequency: { type: "string" },
      estimatedShareOfRevenuePercent: { type: "number", nullable: true },
      estimatedCustomersYear1: { type: "number", nullable: true },
    },
  };

  const planSchema = {
    type: "object",
    additionalProperties: false,
    required: [
      "planRole",
      "modelType",
      "modelName",
      "customerType",
      "customerDescription",
      "payer",
      "beneficiary",
      "valueProposition",
      "purchaseTrigger",
      "offerDescription",
      "pricingModel",
      "estimatedPriceLow",
      "estimatedPriceBase",
      "estimatedPriceHigh",
      "billingFrequency",
      "estimatedCustomersYear1",
      "estimatedRevenuePerCustomer",
      "estimatedVariableCosts",
      "estimatedFixedCosts",
      "estimatedCAC",
      "estimatedLTV",
      "estimatedMonthsToFirstRevenue",
      "estimatedMonthsToBreakEven",
      "estimatedCapitalRequired",
      "automationPotential",
      "scalabilityScore",
      "marginScore",
      "speedToRevenueScore",
      "customerAcquisitionDifficulty",
      "technicalComplexity",
      "operationalComplexity",
      "regulatoryRisk",
      "platformDependencyRisk",
      "monetizationConfidence",
      "keyAssumptions",
      "risks",
      "evidence",
      "sourceUrls",
      "revenueStreams",
      "scoringAssessment",
    ],
    properties: {
      planRole: { type: "string", enum: ["primary", "secondary", "future"] },
      modelType: { type: "string", enum: [...MONETIZATION_ARCHETYPE_TYPES] },
      modelName: { type: "string" },
      customerType: { type: "string" },
      customerDescription: { type: "string" },
      payer: { type: "string" },
      beneficiary: { type: "string" },
      valueProposition: { type: "string" },
      purchaseTrigger: { type: "string" },
      offerDescription: { type: "string" },
      pricingModel: { type: "string" },
      estimatedPriceLow: { type: "number", nullable: true },
      estimatedPriceBase: { type: "number", nullable: true },
      estimatedPriceHigh: { type: "number", nullable: true },
      billingFrequency: { type: "string" },
      estimatedCustomersYear1: { type: "number", nullable: true },
      estimatedRevenuePerCustomer: { type: "number", nullable: true },
      estimatedVariableCosts: { type: "number", nullable: true },
      estimatedFixedCosts: { type: "number", nullable: true },
      estimatedCAC: { type: "number", nullable: true },
      estimatedLTV: { type: "number", nullable: true },
      estimatedMonthsToFirstRevenue: { type: "number", nullable: true },
      estimatedMonthsToBreakEven: { type: "number", nullable: true },
      estimatedCapitalRequired: { type: "number", nullable: true },
      automationPotential: { type: "number" },
      scalabilityScore: { type: "number" },
      marginScore: { type: "number" },
      speedToRevenueScore: { type: "number" },
      customerAcquisitionDifficulty: { type: "number" },
      technicalComplexity: { type: "number" },
      operationalComplexity: { type: "number" },
      regulatoryRisk: { type: "number" },
      platformDependencyRisk: { type: "number" },
      monetizationConfidence: { type: "number" },
      keyAssumptions: { type: "array", items: { type: "string" } },
      risks: { type: "array", items: { type: "string" } },
      evidence: { type: "array", items: evidenceSchema },
      sourceUrls: { type: "array", items: { type: "string" } },
      revenueStreams: { type: "array", items: revenueStreamSchema },
      scoringAssessment: {
        type: "object",
        additionalProperties: false,
        required: [
          "revenuePotential",
          "marginPotential",
          "speedToRevenue",
          "recurringRevenuePotential",
          "automationPotential",
          "scalability",
          "customerAcquisitionFeasibility",
          "capitalEfficiency",
          "competition",
          "platformDependency",
          "operationalComplexity",
          "technicalComplexity",
          "evidenceConfidence",
        ],
        properties: {
          revenuePotential: { type: "number" },
          marginPotential: { type: "number" },
          speedToRevenue: { type: "number" },
          recurringRevenuePotential: { type: "number" },
          automationPotential: { type: "number" },
          scalability: { type: "number" },
          customerAcquisitionFeasibility: { type: "number" },
          capitalEfficiency: { type: "number" },
          competition: { type: "number" },
          platformDependency: { type: "number" },
          operationalComplexity: { type: "number" },
          technicalComplexity: { type: "number" },
          evidenceConfidence: { type: "number" },
        },
      },
    },
  };

  return {
    type: "object",
    additionalProperties: false,
    required: [
      "schemaVersion",
      "opportunityCandidateId",
      "plans",
      "recommendation",
      "validationExperiments",
      "limitations",
    ],
    properties: {
      schemaVersion: {
        type: "string",
        enum: [MONETIZATION_EXTRACTION_SCHEMA_VERSION],
      },
      opportunityCandidateId: { type: "string" },
      plans: { type: "array", items: planSchema },
      recommendation: {
        type: "object",
        additionalProperties: false,
        required: [
          "recommendedPrimaryModel",
          "recommendedSecondaryModels",
          "recommendedPricingStrategy",
          "recommendedCustomer",
          "recommendedAcquisitionStrategy",
          "expectedRevenueMechanism",
          "expectedTimeToRevenue",
          "estimatedStartupCapital",
          "keyEconomicAssumptions",
          "largestEconomicRisks",
          "confidence",
        ],
        properties: {
          recommendedPrimaryModel: { type: "string" },
          recommendedSecondaryModels: { type: "array", items: { type: "string" } },
          recommendedPricingStrategy: { type: "string" },
          recommendedCustomer: { type: "string" },
          recommendedAcquisitionStrategy: { type: "string" },
          expectedRevenueMechanism: { type: "string" },
          expectedTimeToRevenue: { type: "string" },
          estimatedStartupCapital: { type: "number", nullable: true },
          keyEconomicAssumptions: { type: "array", items: { type: "string" } },
          largestEconomicRisks: { type: "array", items: { type: "string" } },
          confidence: { type: "number" },
        },
      },
      validationExperiments: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["experimentType", "title", "description", "estimatedCostUsd", "priority"],
          properties: {
            experimentType: { type: "string", enum: [...VALIDATION_EXPERIMENT_TYPES] },
            title: { type: "string" },
            description: { type: "string" },
            estimatedCostUsd: { type: "number", nullable: true },
            priority: { type: "number" },
          },
        },
      },
      limitations: { type: "array", items: { type: "string" } },
    },
  };
}

export function validateProviderMonetizationExtractionOutput(
  value: unknown,
): ProviderMonetizationExtractionOutput {
  return parseProviderMonetizationExtractionJson(JSON.stringify(value), "unknown");
}

export function parseProviderMonetizationExtractionJson(
  rawText: string,
  expectedCandidateId: string,
): ProviderMonetizationExtractionOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error("Monetization extraction output is not valid JSON.");
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Monetization extraction output must be an object.");
  }

  const record = parsed as Record<string, unknown>;
  if (record.schemaVersion !== MONETIZATION_EXTRACTION_SCHEMA_VERSION) {
    throw new Error("Unsupported monetization extraction schema version.");
  }

  if (!Array.isArray(record.plans) || record.plans.length === 0) {
    throw new Error("Monetization extraction must include at least one plan.");
  }

  const recommendation = record.recommendation;
  if (typeof recommendation !== "object" || recommendation === null || Array.isArray(recommendation)) {
    throw new Error("recommendation must be an object.");
  }

  const rec = recommendation as Record<string, unknown>;
  const plans = record.plans.map((entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error(`plans[${index}] must be an object.`);
    }
    const plan = entry as Record<string, unknown>;
    return {
      planRole: String(plan.planRole ?? "primary") as never,
      modelType: String(plan.modelType ?? "other") as never,
      modelName: String(plan.modelName ?? ""),
      customerType: String(plan.customerType ?? ""),
      customerDescription: String(plan.customerDescription ?? ""),
      payer: String(plan.payer ?? ""),
      beneficiary: String(plan.beneficiary ?? ""),
      valueProposition: String(plan.valueProposition ?? ""),
      purchaseTrigger: String(plan.purchaseTrigger ?? ""),
      offerDescription: String(plan.offerDescription ?? ""),
      pricingModel: String(plan.pricingModel ?? ""),
      estimatedPriceLow: clampNullableNumber(plan.estimatedPriceLow),
      estimatedPriceBase: clampNullableNumber(plan.estimatedPriceBase),
      estimatedPriceHigh: clampNullableNumber(plan.estimatedPriceHigh),
      billingFrequency: String(plan.billingFrequency ?? "monthly"),
      estimatedCustomersYear1: clampNullableNumber(plan.estimatedCustomersYear1),
      estimatedRevenuePerCustomer: clampNullableNumber(plan.estimatedRevenuePerCustomer),
      estimatedVariableCosts: clampNullableNumber(plan.estimatedVariableCosts),
      estimatedFixedCosts: clampNullableNumber(plan.estimatedFixedCosts),
      estimatedCAC: clampNullableNumber(plan.estimatedCAC),
      estimatedLTV: clampNullableNumber(plan.estimatedLTV),
      estimatedMonthsToFirstRevenue: clampNullableNumber(plan.estimatedMonthsToFirstRevenue),
      estimatedMonthsToBreakEven: clampNullableNumber(plan.estimatedMonthsToBreakEven),
      estimatedCapitalRequired: clampNullableNumber(plan.estimatedCapitalRequired),
      automationPotential: clampScore(plan.automationPotential),
      scalabilityScore: clampScore(plan.scalabilityScore) * 100,
      marginScore: clampScore(plan.marginScore) * 100,
      speedToRevenueScore: clampScore(plan.speedToRevenueScore) * 100,
      customerAcquisitionDifficulty: clampScore(plan.customerAcquisitionDifficulty),
      technicalComplexity: clampScore(plan.technicalComplexity),
      operationalComplexity: clampScore(plan.operationalComplexity),
      regulatoryRisk: clampScore(plan.regulatoryRisk),
      platformDependencyRisk: clampScore(plan.platformDependencyRisk),
      monetizationConfidence: clampScore(plan.monetizationConfidence),
      keyAssumptions: stringArray(plan.keyAssumptions),
      risks: stringArray(plan.risks),
      evidence: evidenceArray(plan.evidence, `plans[${index}].evidence`),
      sourceUrls: stringArray(plan.sourceUrls),
      revenueStreams: Array.isArray(plan.revenueStreams)
        ? plan.revenueStreams.map((stream, streamIndex) => {
            if (typeof stream !== "object" || stream === null || Array.isArray(stream)) {
              throw new Error(`plans[${index}].revenueStreams[${streamIndex}] must be an object.`);
            }
            const s = stream as Record<string, unknown>;
            return {
              streamRole: String(s.streamRole ?? "secondary") as never,
              streamName: String(s.streamName ?? ""),
              modelType: String(s.modelType ?? "other") as never,
              description: String(s.description ?? ""),
              payer: String(s.payer ?? ""),
              pricingModel: String(s.pricingModel ?? ""),
              estimatedPriceBase: clampNullableNumber(s.estimatedPriceBase),
              billingFrequency: String(s.billingFrequency ?? "monthly"),
              estimatedShareOfRevenuePercent: clampNullableNumber(s.estimatedShareOfRevenuePercent),
              estimatedCustomersYear1: clampNullableNumber(s.estimatedCustomersYear1),
            };
          })
        : [],
      scoringAssessment: scoringAssessment(plan.scoringAssessment),
    };
  });

  const validationExperiments = Array.isArray(record.validationExperiments)
    ? record.validationExperiments.map((entry, index) => {
        if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
          throw new Error(`validationExperiments[${index}] must be an object.`);
        }
        const exp = entry as Record<string, unknown>;
        return {
          experimentType: String(exp.experimentType ?? "landing_page_demand_test") as never,
          title: String(exp.title ?? ""),
          description: String(exp.description ?? ""),
          estimatedCostUsd: clampNullableNumber(exp.estimatedCostUsd),
          priority: Number(exp.priority ?? index + 1),
        };
      })
    : [];

  return {
    schemaVersion: MONETIZATION_EXTRACTION_SCHEMA_VERSION,
    opportunityCandidateId: String(record.opportunityCandidateId ?? expectedCandidateId),
    limitations: stringArray(record.limitations),
    plans,
    recommendation: {
      recommendedPrimaryModel: String(rec.recommendedPrimaryModel ?? ""),
      recommendedSecondaryModels: stringArray(rec.recommendedSecondaryModels),
      recommendedPricingStrategy: String(rec.recommendedPricingStrategy ?? ""),
      recommendedCustomer: String(rec.recommendedCustomer ?? ""),
      recommendedAcquisitionStrategy: String(rec.recommendedAcquisitionStrategy ?? ""),
      expectedRevenueMechanism: String(rec.expectedRevenueMechanism ?? ""),
      expectedTimeToRevenue: String(rec.expectedTimeToRevenue ?? ""),
      estimatedStartupCapital: clampNullableNumber(rec.estimatedStartupCapital),
      keyEconomicAssumptions: stringArray(rec.keyEconomicAssumptions),
      largestEconomicRisks: stringArray(rec.largestEconomicRisks),
      confidence: clampScore(rec.confidence),
    },
    validationExperiments,
  };
}
