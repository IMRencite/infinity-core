import type { Tables } from "@/lib/supabase/database.types";
import type { ValidationModel } from "./types";
import type { CategoryResult } from "./types";

type Opportunity = Tables<"opportunities">;
type OpportunityScore = Tables<"opportunity_scores">;
type OpportunityEvidence = Tables<"opportunity_evidence">;
type OpportunityEvaluation = Tables<"opportunity_evaluations">;
type Claim = Tables<"claims">;
type KnowledgeRecord = Tables<"knowledge_records">;

export type ValidationContext = {
  opportunity: Opportunity;
  latestScore: OpportunityScore | null;
  evidence: OpportunityEvidence[];
  evaluation: OpportunityEvaluation | null;
  claims: Claim[];
  knowledge: KnowledgeRecord[];
  isSparseSystemValidation: boolean;
};

function readJsonFlag(value: unknown, key: string): boolean {
  if (typeof value === "object" && value !== null && !Array.isArray(value) && key in value) {
    return Boolean((value as Record<string, unknown>)[key]);
  }

  return false;
}

function knownScore(value: number | null | undefined): {
  score: number | null;
  dataStatus: "known" | "unknown";
} {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return { score: null, dataStatus: "unknown" };
  }

  return {
    score: Math.max(0, Math.min(100, Number(value))),
    dataStatus: "known",
  };
}

export function detectSparseSystemValidation(opportunity: Opportunity): boolean {
  const snapshot = opportunity.source_snapshot;
  return (
    readJsonFlag(snapshot, "not_market_opportunity") ||
    readJsonFlag(snapshot, "validation_scope") ||
    readJsonFlag(snapshot, "not_market_signal") ||
    opportunity.industry === "system_validation" ||
    opportunity.category === "foundation_stub"
  );
}

export function hasMarketEvidence(evidence: OpportunityEvidence[]): boolean {
  return evidence.some(
    (item) =>
      item.evidence_type !== "other" ||
      (typeof item.metadata === "object" &&
        item.metadata !== null &&
        !Array.isArray(item.metadata) &&
        !("validation_scope" in item.metadata)),
  );
}

function categoryResult(
  category: string,
  score: number | null,
  confidence: number | null,
  dataStatus: "known" | "unknown" | "insufficient",
  options: {
    findings?: string[];
    missingInformation?: string[];
    blockingIssues?: string[];
  } = {},
): CategoryResult {
  return {
    category,
    score,
    confidence,
    dataStatus,
    findings: options.findings ?? [],
    missingInformation: options.missingInformation ?? [],
    blockingIssues: options.blockingIssues ?? [],
  };
}

export function calculateValidationCategories(
  _model: ValidationModel,
  context: ValidationContext,
): CategoryResult[] {
  const score = context.latestScore;
  const sparse = context.isSparseSystemValidation;
  const marketEvidence = hasMarketEvidence(context.evidence);

  const demandKnown = knownScore(score?.demand_score);
  const competitionKnown = knownScore(score?.competition_score);
  const financialKnown = knownScore(score?.profitability_score);
  const technicalKnown = knownScore(score?.automation_score);
  const strategicKnown = knownScore(context.opportunity.overall_score);
  const operationalKnown = knownScore(score?.operational_complexity_score);
  const legalEvidence = context.evidence.filter((e) => e.evidence_type === "regulation");

  const evidenceStrengthScore = sparse
    ? { score: 35, dataStatus: "insufficient" as const }
    : context.evidence.length > 0
      ? {
          score: Math.max(
            0,
            Math.min(
              100,
              context.evidence.reduce(
                (sum, item) =>
                  sum + Number(item.credibility_score ?? item.relevance_score ?? 0),
                0,
              ) / context.evidence.length,
            ),
          ),
          dataStatus: marketEvidence ? ("known" as const) : ("insufficient" as const),
        }
      : { score: null, dataStatus: "unknown" as const };

  const portfolioSynergy: CategoryResult = categoryResult(
    "portfolio_synergy",
    null,
    sparse ? 30 : context.claims.length > 0 ? 55 : null,
    "unknown",
    {
      missingInformation: ["portfolio_synergy_analysis"],
      findings: context.claims.length > 0 ? ["Limited portfolio claims available"] : [],
    },
  );

  const compoundingKnown = knownScore(score?.profitability_score);

  const results: CategoryResult[] = [
    categoryResult("demand", demandKnown.score, demandKnown.dataStatus === "known" ? 70 : null, demandKnown.dataStatus, {
      missingInformation: demandKnown.dataStatus === "unknown" ? ["demand_score"] : [],
    }),
    categoryResult(
      "competition",
      competitionKnown.score,
      competitionKnown.dataStatus === "known" ? 65 : null,
      competitionKnown.dataStatus,
      {
        missingInformation:
          competitionKnown.dataStatus === "unknown" ? ["competition_score"] : [],
      },
    ),
    categoryResult(
      "financial",
      financialKnown.score,
      financialKnown.dataStatus === "known" ? 68 : null,
      financialKnown.dataStatus,
      {
        missingInformation: financialKnown.dataStatus === "unknown" ? ["profitability_score"] : [],
      },
    ),
    categoryResult(
      "technical",
      technicalKnown.score,
      technicalKnown.dataStatus === "known" ? 60 : null,
      technicalKnown.dataStatus,
      {
        missingInformation: technicalKnown.dataStatus === "unknown" ? ["automation_score"] : [],
      },
    ),
    categoryResult(
      "strategic",
      strategicKnown.score,
      strategicKnown.dataStatus === "known" ? 72 : null,
      strategicKnown.dataStatus,
      {
        missingInformation: strategicKnown.dataStatus === "unknown" ? ["overall_score"] : [],
        blockingIssues:
          sparse && strategicKnown.dataStatus === "known"
            ? ["strategic_fit_based_on_stub_data"]
            : [],
      },
    ),
    categoryResult(
      "operational",
      operationalKnown.score,
      operationalKnown.dataStatus === "known" ? 58 : null,
      operationalKnown.dataStatus,
      {
        missingInformation:
          operationalKnown.dataStatus === "unknown" ? ["operational_complexity_score"] : [],
      },
    ),
    categoryResult(
      "legal",
      legalEvidence.length > 0 ? 60 : null,
      legalEvidence.length > 0 ? 50 : null,
      legalEvidence.length > 0 ? "known" : "unknown",
      {
        missingInformation: legalEvidence.length === 0 ? ["regulation_evidence"] : [],
      },
    ),
    portfolioSynergy,
    categoryResult(
      "compounding_potential",
      compoundingKnown.score,
      compoundingKnown.dataStatus === "known" ? 62 : null,
      compoundingKnown.dataStatus,
      {
        missingInformation:
          compoundingKnown.dataStatus === "unknown" ? ["compounding_signals"] : [],
      },
    ),
    categoryResult(
      "evidence_strength",
      evidenceStrengthScore.score,
      evidenceStrengthScore.score !== null ? evidenceStrengthScore.score : null,
      evidenceStrengthScore.dataStatus,
      {
        findings: sparse ? ["System-validation evidence is not market proof"] : [],
        missingInformation:
          evidenceStrengthScore.dataStatus === "unknown" ? ["opportunity_evidence"] : [],
        blockingIssues: sparse ? ["system_validation_only"] : [],
      },
    ),
  ];

  if (sparse) {
    for (const result of results) {
      if (result.category !== "evidence_strength") {
        result.blockingIssues = [
          ...result.blockingIssues,
          "sparse_system_validation_context",
        ];
      }
    }
  }

  if (context.knowledge.length === 0 && !sparse) {
    const evidenceCat = results.find((r) => r.category === "evidence_strength");
    if (evidenceCat) {
      evidenceCat.missingInformation.push("linked_knowledge_records");
      if (evidenceCat.confidence !== null) {
        evidenceCat.confidence = Math.max(0, evidenceCat.confidence - 10);
      }
    }
  }

  return results;
}

export function aggregateValidationScores(categories: CategoryResult[]): {
  overallScore: number | null;
  overallConfidence: number | null;
  missingInformation: string[];
  blockingIssues: string[];
} {
  const knownScores = categories.filter((c) => c.score !== null);
  const knownConfidences = categories.filter((c) => c.confidence !== null);

  const overallScore =
    knownScores.length > 0
      ? Math.round(
          (knownScores.reduce((sum, c) => sum + (c.score ?? 0), 0) / knownScores.length) * 100,
        ) / 100
      : null;

  let overallConfidence =
    knownConfidences.length > 0
      ? Math.round(
          (knownConfidences.reduce((sum, c) => sum + (c.confidence ?? 0), 0) /
            knownConfidences.length) *
            100,
        ) / 100
      : null;

  const unknownCount = categories.filter((c) => c.dataStatus === "unknown").length;
  if (overallConfidence !== null) {
    overallConfidence = Math.max(
      0,
      Math.min(100, overallConfidence - unknownCount * 4),
    );
  } else if (unknownCount > 0) {
    overallConfidence = Math.max(0, 60 - unknownCount * 8);
  }

  const missingInformation = [
    ...new Set(categories.flatMap((c) => c.missingInformation)),
  ];
  const blockingIssues = [...new Set(categories.flatMap((c) => c.blockingIssues))];

  return {
    overallScore,
    overallConfidence,
    missingInformation,
    blockingIssues,
  };
}
