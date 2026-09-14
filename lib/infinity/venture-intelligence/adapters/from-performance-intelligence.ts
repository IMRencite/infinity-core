import type {
  CanonicalPerformanceAssessment,
  CanonicalPerformanceInput,
  CanonicalPerformanceMetric,
  ExpectedVsActualRow,
} from "../types";
import { asNumber, asRecord, asString, asStringArray } from "../json";

function metricFromUnknown(value: unknown): CanonicalPerformanceMetric | null {
  const record = asRecord(value);
  if (!record) return null;
  const metric = asString(record.metric) ?? asString(record.name);
  const numeric = asNumber(record.value);
  if (!metric || numeric == null) return null;
  return {
    metric: metric.toLowerCase(),
    value: numeric,
    unit: asString(record.unit),
    sampleSize: asNumber(record.sample_size ?? record.sampleSize),
  };
}

function assessmentFromUnknown(value: unknown): CanonicalPerformanceAssessment | null {
  const record = asRecord(value);
  if (!record) return null;
  const metric = asString(record.metric);
  if (!metric) return null;
  const statusRaw = asString(record.status) ?? "insufficient_data";
  const status: CanonicalPerformanceAssessment["status"] =
    statusRaw === "above_plan" || statusRaw === "below_plan" || statusRaw === "on_plan" || statusRaw === "insufficient_data"
      ? statusRaw
      : "insufficient_data";
  return {
    metric: metric.toLowerCase(),
    expectedValue: asNumber(record.expected_value ?? record.expectedValue),
    actualValue: asNumber(record.actual_value ?? record.actualValue),
    variance: asNumber(record.variance),
    variancePercent: asNumber(record.variance_percent ?? record.variancePercent),
    status,
    expectationSource: asString(record.expectation_source ?? record.expectationSource) ?? "monetization_plan",
    actualSource: asString(record.actual_source ?? record.actualSource) ?? "performance_intelligence",
  };
}

function packageRecord(value: unknown): Record<string, unknown> | null {
  const record = asRecord(value);
  if (!record) return null;
  return asRecord(record.package_json) ?? asRecord(record.packageJson) ?? asRecord(record.build_package) ?? record;
}

export function emptyPerformanceInput(): CanonicalPerformanceInput {
  return {
    aggregates: [],
    assessments: [],
    diagnoses: [],
    hypotheses: [],
    experiments: [],
    learningDecisions: [],
    optimizationOpportunities: [],
  };
}

export function fromPerformanceIntelligence(input: {
  aggregates?: unknown[];
  packages?: unknown[];
  decisions?: unknown[];
}): CanonicalPerformanceInput {
  const aggregates: CanonicalPerformanceMetric[] = [];
  for (const row of input.aggregates ?? []) {
    const parsed = metricFromUnknown(row);
    if (parsed) aggregates.push(parsed);
  }

  const assessments: CanonicalPerformanceAssessment[] = [];
  const diagnoses: string[] = [];
  const hypotheses: string[] = [];
  const experiments: string[] = [];
  const learningDecisions: string[] = [];
  const optimizationOpportunities: string[] = [];

  for (const pkg of input.packages ?? []) {
    const record = packageRecord(pkg);
    if (!record) continue;
    const pkgAggregates = record.metricAggregates ?? record.metric_aggregates;
    if (Array.isArray(pkgAggregates)) {
      for (const row of pkgAggregates) {
        const parsed = metricFromUnknown(row);
        if (parsed) aggregates.push(parsed);
      }
    }
    const pkgAssessments = record.kpiAssessments ?? record.kpi_assessments;
    if (Array.isArray(pkgAssessments)) {
      for (const row of pkgAssessments) {
        const parsed = assessmentFromUnknown(row);
        if (parsed) assessments.push(parsed);
      }
    }
    if (Array.isArray(record.diagnoses)) {
      for (const row of record.diagnoses) {
        const item = asRecord(row);
        const text = asString(item?.observation) ?? asString(item?.category);
        if (text) diagnoses.push(text);
      }
    }
    if (Array.isArray(record.experiments)) {
      experiments.push(...asStringArray(record.experiments));
      for (const row of record.experiments) {
        const item = asRecord(row);
        const text = asString(item?.hypothesis);
        if (text) hypotheses.push(text);
      }
    }
    if (Array.isArray(record.optimizationOpportunities) || Array.isArray(record.optimization_opportunities)) {
      const rows = (record.optimizationOpportunities ?? record.optimization_opportunities) as unknown[];
      for (const row of rows) {
        const item = asRecord(row);
        const text = asString(item?.target) ?? asString(item?.actionType);
        if (text) optimizationOpportunities.push(text);
      }
    }
    if (Array.isArray(record.learningDecisions) || Array.isArray(record.learning_decisions)) {
      const rows = (record.learningDecisions ?? record.learning_decisions) as unknown[];
      for (const row of rows) {
        const item = asRecord(row);
        const text = asString(item?.decisionType) ?? asString(item?.expectedOutcome);
        if (text) learningDecisions.push(text);
      }
    }
  }

  for (const decision of input.decisions ?? []) {
    const record = asRecord(decision);
    const text = asString(record?.decision_type) ?? asString(record?.decisionType) ?? asString(record?.summary);
    if (text) learningDecisions.push(text);
  }

  return {
    aggregates,
    assessments,
    diagnoses,
    hypotheses,
    experiments,
    learningDecisions,
    optimizationOpportunities,
  };
}

export function happeningFrom(performance: CanonicalPerformanceInput): string[] {
  const lines: string[] = [];
  for (const row of performance.aggregates) {
    lines.push(`${row.metric}: ${row.value}${row.unit ? ` ${row.unit}` : ""}`);
  }
  lines.push(...performance.diagnoses);
  return lines;
}

export function learningFrom(performance: CanonicalPerformanceInput): string[] {
  return [
    ...performance.diagnoses.map((item) => `Diagnosis: ${item}`),
    ...performance.hypotheses.map((item) => `Hypothesis: ${item}`),
    ...performance.experiments.map((item) => `Experiment: ${item}`),
    ...performance.learningDecisions.map((item) => `Learning: ${item}`),
    ...performance.optimizationOpportunities.map((item) => `Optimize: ${item}`),
  ];
}

export function compactExpectedVsActual(rows: ExpectedVsActualRow[]): ExpectedVsActualRow[] {
  return rows.filter((row) => row.status !== "insufficient_data");
}
