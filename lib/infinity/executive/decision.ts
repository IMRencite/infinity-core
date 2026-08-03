import { REASONING_TO_EXECUTIVE_HINT } from "./constants";
import { assessCapital } from "./capital";
import { assessPortfolioDiversity } from "./portfolio";
import type {
  ExecutiveDecision,
  ExecutiveDecisionInput,
  ExecutiveDecisionRecord,
  ExecutiveDecisionStrategy,
  ExecutivePolicy,
} from "./types";
import { extractSignalsFromReasoning } from "./types";

function scoreAtLeast(value: number | null, minimum: number): boolean {
  return value !== null && value >= minimum;
}

function riskAcceptable(risk: number | null, maxRisk: number): boolean {
  if (risk === null) {
    return true;
  }
  return risk <= maxRisk;
}

export function decideExecutiveAction(
  input: ExecutiveDecisionInput,
  policy: ExecutivePolicy,
): ExecutiveDecisionRecord {
  const { reasoning, portfolio, capital, workload, industry, category } = input;
  const rationale: string[] = [];
  const decidedAt = new Date().toISOString();

  const signals = extractSignalsFromReasoning(
    reasoning,
    portfolio,
    capital,
    workload,
    industry,
    policy,
  );

  const hint = REASONING_TO_EXECUTIVE_HINT[reasoning.outcome] ?? null;

  if (reasoning.overallScore < policy.rejectBelowReasoningScore) {
    rationale.push(
      `Reasoning score ${reasoning.overallScore} is below executive floor ${policy.rejectBelowReasoningScore}.`,
    );
    return buildRecord(input, "REJECT", signals, rationale, decidedAt);
  }

  if (hint === "REJECT") {
    rationale.push(`Reasoning outcome ${reasoning.outcome} maps to executive REJECT.`);
    return buildRecord(input, "REJECT", signals, rationale, decidedAt);
  }

  if (hint === "RESEARCH_MORE") {
    rationale.push(`Reasoning outcome ${reasoning.outcome} requires additional research.`);
    return buildRecord(input, "RESEARCH_MORE", signals, rationale, decidedAt);
  }

  const capitalCheck = assessCapital(capital, policy);
  rationale.push(...capitalCheck.rationale);

  const diversity = assessPortfolioDiversity(
    portfolio,
    industry,
    category,
    policy.maxPortfolioConcentration,
  );
  rationale.push(...diversity.notes);

  if (!scoreAtLeast(signals.expectedRoiScore, policy.minExpectedRoiScore)) {
    rationale.push(
      `Expected ROI signal ${signals.expectedRoiScore ?? "unknown"} below minimum ${policy.minExpectedRoiScore}.`,
    );
    return buildRecord(input, "RESEARCH_MORE", signals, rationale, decidedAt);
  }

  if (!scoreAtLeast(signals.timeToValueScore, policy.minTimeToValueScore)) {
    rationale.push(
      `Time-to-value signal ${signals.timeToValueScore ?? "unknown"} below minimum ${policy.minTimeToValueScore}.`,
    );
    return buildRecord(input, "DEFER", signals, rationale, decidedAt);
  }

  if (!scoreAtLeast(signals.strategicAlignmentScore, policy.minStrategicAlignmentScore)) {
    rationale.push(
      `Strategic alignment ${signals.strategicAlignmentScore ?? "unknown"} below minimum ${policy.minStrategicAlignmentScore}.`,
    );
    return buildRecord(input, "DEFER", signals, rationale, decidedAt);
  }

  if (!scoreAtLeast(signals.enterpriseValueScore, policy.minEnterpriseValueScore)) {
    rationale.push(
      `Enterprise value ${signals.enterpriseValueScore ?? "unknown"} below minimum ${policy.minEnterpriseValueScore}.`,
    );
    return buildRecord(input, "QUEUE", signals, rationale, decidedAt);
  }

  if (!riskAcceptable(signals.riskScore, policy.maxRiskScoreForApprove)) {
    rationale.push(
      `Risk score ${signals.riskScore ?? "unknown"} exceeds approve threshold ${policy.maxRiskScoreForApprove}.`,
    );
    return buildRecord(input, "DEFER", signals, rationale, decidedAt);
  }

  if (!diversity.diverseEnough) {
    return buildRecord(input, "DEFER", signals, rationale, decidedAt);
  }

  if (!capitalCheck.sufficient) {
    return buildRecord(input, policy.deferWhenAtCapacity ? "DEFER" : "QUEUE", signals, rationale, decidedAt);
  }

  if (!signals.capacityAvailable) {
    rationale.push(
      `Active builds ${workload.activeBuilds} at concurrent limit ${policy.maxConcurrentBuilds}.`,
    );
    const atCapacityDecision: ExecutiveDecision = policy.deferWhenAtCapacity ? "DEFER" : "QUEUE";
    return buildRecord(input, atCapacityDecision, signals, rationale, decidedAt);
  }

  if (!signals.workloadWithinLimits) {
    rationale.push("Combined active and queued workload exceeds configured limits.");
    return buildRecord(input, "QUEUE", signals, rationale, decidedAt);
  }

  if (reasoning.outcome === "APPROVE_FOR_BUILD") {
    rationale.push("Reasoning approved for build; executive gates satisfied.");
    return buildRecord(input, "APPROVE", signals, rationale, decidedAt);
  }

  if (hint === "QUEUE" || reasoning.outcome === "QUEUE") {
    rationale.push("Held in enterprise build queue pending capacity or sequencing.");
    return buildRecord(input, "QUEUE", signals, rationale, decidedAt);
  }

  rationale.push("Default sequencing: enterprise build queue.");
  return buildRecord(input, "QUEUE", signals, rationale, decidedAt);
}

function buildRecord(
  input: ExecutiveDecisionInput,
  decision: ExecutiveDecision,
  signals: ExecutiveDecisionRecord["signals"],
  rationale: string[],
  decidedAt: string,
): ExecutiveDecisionRecord {
  const { reasoning } = input;
  return {
    organizationId: reasoning.organizationId,
    opportunityId: reasoning.opportunityId,
    opportunityName: reasoning.opportunityName,
    decision,
    reasoningOutcome: reasoning.outcome,
    reasoningScore: reasoning.overallScore,
    reasoningRank: reasoning.rank,
    signals,
    rationale,
    decidedAt,
  };
}

export const ruleBasedExecutiveDecisionStrategy: ExecutiveDecisionStrategy = {
  decide: decideExecutiveAction,
};
