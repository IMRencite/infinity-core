import { randomUUID } from "node:crypto";
import type { DiagnosisCategory } from "../constants";
import type {
  KPIAssessment,
  MetricAggregate,
  NormalizedPerformanceEvent,
  PerformanceDiagnosis,
  PerformanceHypothesis,
} from "../types";
import { hasSufficientEvidence } from "../analysis/data-quality";

export function diagnosePerformance(input: {
  ventureId: string;
  aggregates: MetricAggregate[];
  assessments: KPIAssessment[];
  events: NormalizedPerformanceEvent[];
  minSampleSize?: number;
}): PerformanceDiagnosis[] {
  const diagnoses: PerformanceDiagnosis[] = [];
  const minSample = input.minSampleSize ?? 1;

  const ctrAgg = input.aggregates.find((a) => a.metric === "ctr");
  if (ctrAgg && ctrAgg.value < 0.02) {
    diagnoses.push(
      buildDiagnosis({
        ventureId: input.ventureId,
        category: "CREATIVE_PERFORMANCE",
        observation: `CTR is ${(ctrAgg.value * 100).toFixed(1)}%, below typical threshold`,
        eventIds: input.events.filter((e) => e.metric === "ctr" || e.metric === "clicks").map((e) => e.id),
        hypotheses: [
          hypothesis("Thumbnail or creative fatigue may be reducing click-through rate", 0.6),
          hypothesis("Audience targeting mismatch may reduce relevance", 0.4),
        ],
        severity: "MEDIUM",
        sampleSize: ctrAgg.sampleSize,
        minSample,
      }),
    );
  }

  const convAssessment = input.assessments.find((a) => a.metric === "conversion_rate");
  if (convAssessment?.status === "below_plan") {
    diagnoses.push(
      buildDiagnosis({
        ventureId: input.ventureId,
        category: "LANDING_PAGE_CONVERSION",
        observation: `Conversion rate ${convAssessment.actualValue} is below expected ${convAssessment.expectedValue}`,
        eventIds: input.events.filter((e) => e.metric === "conversions" || e.metric === "sessions").map((e) => e.id),
        hypotheses: [hypothesis("Landing page messaging may not match visitor intent", 0.55)],
        severity: "HIGH",
        sampleSize: input.events.filter((e) => e.metric === "sessions").length,
        minSample,
      }),
    );
  }

  const cacAssessment = input.assessments.find((a) => a.metric === "cac");
  if (cacAssessment?.status === "above_plan" && cacAssessment.actualValue != null) {
    diagnoses.push(
      buildDiagnosis({
        ventureId: input.ventureId,
        category: "ACQUISITION_COST",
        observation: `CAC ${cacAssessment.actualValue} exceeds expected ${cacAssessment.expectedValue}`,
        eventIds: [],
        hypotheses: [hypothesis("Acquisition spend efficiency has degraded", 0.7)],
        severity: "HIGH",
        sampleSize: 5,
        minSample,
      }),
    );
  }

  const sessionsAgg = input.aggregates.find((a) => a.metric === "sessions");
  if (sessionsAgg && sessionsAgg.value < 10) {
    diagnoses.push(
      buildDiagnosis({
        ventureId: input.ventureId,
        category: "ACQUISITION_VOLUME",
        observation: `Session volume ${sessionsAgg.value} is critically low`,
        eventIds: input.events.filter((e) => e.metric === "sessions").map((e) => e.id),
        hypotheses: [hypothesis("Organic or paid acquisition volume is insufficient", 0.65)],
        severity: "MEDIUM",
        sampleSize: sessionsAgg.sampleSize,
        minSample,
      }),
    );
  }

  const repairAgg = input.aggregates.find((a) => a.metric === "repair_count");
  if (repairAgg && repairAgg.value >= 1) {
    diagnoses.push(
      buildDiagnosis({
        ventureId: input.ventureId,
        category: "EXECUTION_RELIABILITY",
        observation: `Repair count ${repairAgg.value} indicates execution quality issues`,
        eventIds: input.events.filter((e) => e.metric === "repair_count").map((e) => e.id),
        hypotheses: [hypothesis("Quality gates are catching defects requiring repair", 0.8)],
        severity: repairAgg.value >= 2 ? "MEDIUM" : "LOW",
        sampleSize: repairAgg.sampleSize,
        minSample,
      }),
    );
  }

  const execAgg = input.aggregates.find((a) => a.metric === "execution_success_rate");
  if (execAgg && execAgg.value < 1 && execAgg.sampleSize >= 1) {
    diagnoses.push(
      buildDiagnosis({
        ventureId: input.ventureId,
        category: "TECHNICAL_FAILURE",
        observation: `Execution success rate ${(execAgg.value * 100).toFixed(0)}% below full success`,
        eventIds: input.events
          .filter((e) => e.metric === "execution_successes" || e.metric === "execution_attempts")
          .map((e) => e.id),
        hypotheses: [hypothesis("External or production execution failures may be impacting outcomes", 0.65)],
        severity: execAgg.value < 0.5 ? "HIGH" : "MEDIUM",
        sampleSize: execAgg.sampleSize,
        minSample,
      }),
    );
  }

  const providerCostAgg = input.aggregates.find((a) => a.metric === "provider_cost");
  if (providerCostAgg && providerCostAgg.value > 0) {
    diagnoses.push(
      buildDiagnosis({
        ventureId: input.ventureId,
        category: "ECONOMIC_MODEL",
        observation: `Provider spend observed: $${providerCostAgg.value.toFixed(2)}`,
        eventIds: input.events.filter((e) => e.metric === "provider_cost").map((e) => e.id),
        hypotheses: [hypothesis("Media/build provider costs should be weighed against observed outcomes", 0.7)],
        severity: "INFO",
        sampleSize: providerCostAgg.sampleSize,
        minSample: 1,
      }),
    );
  }

  if (input.events.length === 0) {
    diagnoses.push(
      buildDiagnosis({
        ventureId: input.ventureId,
        category: "DATA_QUALITY",
        observation: "No performance events available for analysis",
        eventIds: [],
        hypotheses: [],
        severity: "INFO",
        sampleSize: 0,
        minSample: 3,
        forceInsufficient: true,
      }),
    );
  }

  return diagnoses;
}

function buildDiagnosis(input: {
  ventureId: string;
  category: DiagnosisCategory;
  observation: string;
  eventIds: string[];
  hypotheses: PerformanceHypothesis[];
  severity: PerformanceDiagnosis["severity"];
  sampleSize: number;
  minSample: number;
  forceInsufficient?: boolean;
}): PerformanceDiagnosis {
  const sufficient = input.forceInsufficient
    ? false
    : hasSufficientEvidence("COMPLETE", input.sampleSize, input.minSample);

  return {
    diagnosisId: randomUUID(),
    ventureId: input.ventureId,
    category: input.category,
    observation: input.observation,
    hypotheses: input.hypotheses,
    confidence: sufficient ? 0.75 : 0.3,
    dataQuality: sufficient ? "COMPLETE" : "LOW_CONFIDENCE",
    supportingEventIds: input.eventIds,
    severity: input.severity,
    sufficientEvidence: sufficient,
  };
}

function hypothesis(statement: string, confidence: number): PerformanceHypothesis {
  return {
    hypothesisId: randomUUID(),
    statement,
    confidence,
    supportingEvidenceIds: [],
    counterEvidence: [],
    status: "proposed",
  };
}

export function detectAnomalies(input: {
  metric: string;
  currentValue: number;
  baselineValue: number;
  thresholdPercent?: number;
}): { anomalous: boolean; direction: "spike" | "drop" | "none"; deltaPercent: number } {
  const threshold = input.thresholdPercent ?? 40;
  if (input.baselineValue === 0) {
    return { anomalous: false, direction: "none", deltaPercent: 0 };
  }
  const deltaPercent = ((input.currentValue - input.baselineValue) / Math.abs(input.baselineValue)) * 100;
  if (Math.abs(deltaPercent) < threshold) {
    return { anomalous: false, direction: "none", deltaPercent };
  }
  return {
    anomalous: true,
    direction: deltaPercent > 0 ? "spike" : "drop",
    deltaPercent,
  };
}

export function shouldShutdownForLosses(input: {
  cumulativeLossUsd: number;
  sampleDays: number;
  minSampleDays?: number;
  lossThresholdUsd?: number;
}): boolean {
  const minDays = input.minSampleDays ?? 30;
  const threshold = input.lossThresholdUsd ?? 10_000;
  if (input.sampleDays < minDays) return false;
  return input.cumulativeLossUsd >= threshold;
}
