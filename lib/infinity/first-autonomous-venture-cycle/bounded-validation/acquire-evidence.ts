import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { runGroundedResearch } from "@/lib/infinity/research/run";
import type { ResearchResult } from "@/lib/infinity/research/types";
import type { AssumptionRecord, LoadedCandidateBundle } from "@/lib/infinity/venture-selection/types";
import type { ValidationEvidenceItem } from "@/lib/infinity/venture-selection/assumptions/register";
import {
  classifyAssumptionKind,
  classifyEvidenceRelevance,
  classifySourceNovelty,
  deriveValidationCredit,
  extractPriorSourceUrls,
} from "./evidence-relevance";
import { canonicalValidationSourceKey, dedupeValidationClaims, dedupeValidationSourceUrls, summarizeValidationEvidenceText } from "./evidence-dedupe";
import type { ValidationExperimentRecord } from "./types";

export type ValidationResearchAcquisitionInput = {
  admin: AdminSupabaseClient;
  organizationId: string;
  candidate: LoadedCandidateBundle;
  assumption: AssumptionRecord;
  idempotencyKey: string;
  runPurpose?: string;
};

export type ValidationEvidenceItemDetail = {
  claim: string;
  sourceUrl: string;
  novelty: "NEW" | "REUSED";
  relevance: ReturnType<typeof classifyEvidenceRelevance>;
  quantitativeMatch: boolean;
  validationResult: ValidationExperimentRecord["validationResult"];
};

export type ValidationResearchAcquisitionResult =
  | {
      ok: true;
      experiment: ValidationExperimentRecord;
      validationEvidence: ValidationEvidenceItem;
      researchResult: ResearchResult;
      evidenceItems: ValidationEvidenceItemDetail[];
      preAssumptionUncertainty: number;
      postAssumptionUncertainty: number;
    }
  | {
      ok: false;
      technicalFailure: true;
      message: string;
      researchRunId: string | null;
    };

export function buildAssumptionValidationResearchObjective(input: {
  candidate: LoadedCandidateBundle;
  assumption: AssumptionRecord;
}): string {
  const kind = classifyAssumptionKind(input.assumption);
  const title = input.candidate.title;
  const customer = input.candidate.targetCustomer ?? "target customers";
  const cac = input.candidate.monetization?.primaryPlan?.estimatedCAC;
  const customersY1 = input.candidate.monetization?.primaryPlan?.estimatedCustomersYear1;

  if (kind === "quantitative_cac") {
    return [
      `Research public, verifiable acquisition economics for "${title}" serving ${customer}.`,
      `Evaluate whether customer acquisition cost near $${cac ?? input.assumption.value ?? "unknown"} is plausible.`,
      "Required evidence types: comparable SaaS/tool CAC benchmarks, SEO/organic acquisition cost ranges,",
      "relevant keyword CPC/CPM, landing-page conversion benchmarks, outbound response/conversion benchmarks,",
      "and public case studies with explicit acquisition spend or CAC figures.",
      "Do not rely on generic market pain statements alone.",
      "Cite only public sources with URLs.",
    ].join(" ");
  }

  if (kind === "quantitative_customer_count") {
    return [
      `Research public evidence for year-one customer acquisition feasibility for "${title}" serving ${customer}.`,
      `Evaluate whether acquiring ~${customersY1 ?? "the projected"} paying customers in year one is plausible.`,
      "Required evidence: addressable market size, comparable adoption rates, channel reach estimates,",
      "conversion benchmarks, and public traction examples — not generic demand pain alone.",
      "Cite only public sources with URLs.",
    ].join(" ");
  }

  return [
    `Research public evidence bearing on this venture assumption for "${title}": ${input.assumption.assumption}`,
    "Cite verifiable public sources with URLs.",
  ].join(" ");
}

function hasQuantitativeMatch(assumption: AssumptionRecord, evidenceText: string): boolean {
  const amount = assumption.assumption.match(/\$?\d[\d,]*/)?.[0]?.replace(/[$,]/g, "");
  if (!amount) return /\$?\d[\d,]*|\d+\s*(customer|user|paying)/i.test(evidenceText);
  return evidenceText.replace(/[$,]/g, "").includes(amount);
}

function buildEvidenceItems(input: {
  assumption: AssumptionRecord;
  researchResult: ResearchResult;
  priorSourceUrls: Set<string>;
}): ValidationEvidenceItemDetail[] {
  const items: ValidationEvidenceItemDetail[] = [];
  const seen = new Set<string>();

  const metadataByUrl = new Map(
    input.researchResult.sources.map((source) => [
      source.url,
      { sourceId: source.sourceId, destinationUrl: null },
    ]),
  );

  const dedupedSources = dedupeValidationSourceUrls(
    [
      ...input.researchResult.evidence.flatMap((evidence) => evidence.sourceUrls),
      ...input.researchResult.sources.map((source) => source.url),
    ],
    metadataByUrl,
  );

  const seenClaimKeys = new Set<string>();
  const claimTexts: string[] = [];

  const priorKeys = new Set([...input.priorSourceUrls].map((url) => canonicalValidationSourceKey(url)));

  function sourceNovelty(sourceUrl: string): "NEW" | "REUSED" {
    const key = canonicalValidationSourceKey(sourceUrl, metadataByUrl.get(sourceUrl));
    return input.priorSourceUrls.has(sourceUrl) || priorKeys.has(key) ? "REUSED" : "NEW";
  }

  for (const evidence of input.researchResult.evidence) {
    const claimKey = `${evidence.claim}`.replace(/\s+/g, " ").trim().toLowerCase();
    if (claimKey && !seenClaimKeys.has(claimKey)) {
      seenClaimKeys.add(claimKey);
      claimTexts.push(evidence.claim);
    }

    for (const sourceUrl of evidence.sourceUrls) {
      if (!dedupedSources.uniqueUrls.includes(sourceUrl)) continue;
      const key = `${sourceUrl}::${evidence.claim}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const novelty = sourceNovelty(sourceUrl);
      const relevance = classifyEvidenceRelevance({
        assumption: input.assumption,
        evidenceText: `${evidence.claim} ${evidence.observedSignal ?? ""}`,
        experimentType: "comparable_benchmark_research",
      });
      const credit = deriveValidationCredit({
        relevance,
        newSourceCount: novelty === "NEW" ? 1 : 0,
        reusedSourceCount: novelty === "REUSED" ? 1 : 0,
        hasQuantitativeClaim: hasQuantitativeMatch(input.assumption, evidence.claim),
      });
      items.push({
        claim: evidence.claim,
        sourceUrl,
        novelty,
        relevance,
        quantitativeMatch: hasQuantitativeMatch(input.assumption, evidence.claim),
        validationResult: credit.validationResult,
      });
    }
  }

  for (const sourceUrl of dedupedSources.uniqueUrls) {
    if (items.some((item) => item.sourceUrl === sourceUrl)) continue;
    const sourceMeta = input.researchResult.sources.find((s) => s.url === sourceUrl);
    const sourceTitle = sourceMeta?.title ?? input.researchResult.summary.slice(0, 200);
    const novelty = sourceNovelty(sourceUrl);
    items.push({
      claim: sourceTitle,
      sourceUrl,
      novelty,
      relevance: classifyEvidenceRelevance({
        assumption: input.assumption,
        evidenceText: sourceTitle,
        experimentType: "comparable_benchmark_research",
      }),
      quantitativeMatch: hasQuantitativeMatch(input.assumption, sourceTitle),
      validationResult: "INCONCLUSIVE",
    });
  }

  return items;
}

export async function acquireValidationEvidenceViaResearch(
  input: ValidationResearchAcquisitionInput,
): Promise<ValidationResearchAcquisitionResult> {
  const priorSourceUrls = extractPriorSourceUrls(input.candidate);
  const preAssumptionUncertainty = input.assumption.uncertaintyScore;
  const researchObjective = buildAssumptionValidationResearchObjective({
    candidate: input.candidate,
    assumption: input.assumption,
  });

  const researchOutput = await runGroundedResearch(input.admin, {
    organizationId: input.organizationId,
    candidateId: input.candidate.candidateId,
    researchObjective,
    idempotencyKey: input.idempotencyKey,
    providerId: "gemini",
    runPurpose: input.runPurpose ?? "favc1_bounded_validation_probe",
    requireSourceBackedFindings: true,
  });

  if (!researchOutput.ok) {
    return {
      ok: false,
      technicalFailure: true,
      message: researchOutput.failure.message,
      researchRunId: researchOutput.failure.researchRunId,
    };
  }

  const researchResult = researchOutput.result;
  const evidenceItems = buildEvidenceItems({
    assumption: input.assumption,
    researchResult,
    priorSourceUrls,
  });

  const metadataByUrl = new Map(
    researchResult.sources.map((source) => [
      source.url,
      { sourceId: source.sourceId, destinationUrl: null },
    ]),
  );

  const allSourceUrls = dedupeValidationSourceUrls(
    evidenceItems.map((item) => item.sourceUrl).filter(Boolean),
    metadataByUrl,
  ).uniqueUrls;
  const novelty = classifySourceNovelty(allSourceUrls, priorSourceUrls);
  const uniqueClaims = dedupeValidationClaims(
    evidenceItems.map((item) => item.claim).filter(Boolean),
  );
  const combinedEvidenceText =
    summarizeValidationEvidenceText(uniqueClaims.uniqueClaims) || researchResult.summary;
  const aggregateRelevance = classifyEvidenceRelevance({
    assumption: input.assumption,
    evidenceText: combinedEvidenceText,
    experimentType: "comparable_benchmark_research",
  });
  const hasQuantitativeClaim = evidenceItems.some((item) => item.quantitativeMatch);
  const credit = deriveValidationCredit({
    relevance: aggregateRelevance,
    newSourceCount: novelty.newSourceCount,
    reusedSourceCount: novelty.reusedSourceCount,
    hasQuantitativeClaim,
  });

  const postAssumptionUncertainty = Math.max(
    0,
    Math.min(1, preAssumptionUncertainty - credit.uncertaintyReduction),
  );

  const costKnown = researchResult.estimatedCostUsd != null;
  const experiment: ValidationExperimentRecord = {
    candidateId: input.candidate.candidateId,
    blockingAssumptionId: input.assumption.assumption,
    experimentType: "comparable_benchmark_research",
    requestedExperimentType: "distribution_economics_research",
    question: researchObjective,
    expectedEvidence:
      "Public CAC/channel/conversion benchmarks relevant to the blocking acquisition assumption.",
    actualEvidence: combinedEvidenceText.slice(0, 4000),
    sourceUrls: allSourceUrls.slice(0, 10),
    newSourceUrls: novelty.newSourceUrls,
    reusedSourceUrls: novelty.reusedSourceUrls,
    newSourceCount: novelty.newSourceCount,
    reusedSourceCount: novelty.reusedSourceCount,
    relevanceClass: aggregateRelevance,
    costUsd: researchResult.estimatedCostUsd ?? 0,
    executionStatus: "COMPLETED",
    validationResult: credit.validationResult,
    newEvidenceFound: novelty.newSourceCount > 0,
    uncertaintyReduction: credit.uncertaintyReduction,
    confidenceImpact: credit.confidenceImpact,
    assumptionImpact: credit.assumptionImpact,
    providerCalls: 1,
    synthesisOnly: false,
    provider: researchResult.providerId,
    model: researchResult.modelId,
    researchRunId: researchResult.researchRunId,
    tokenUsage: researchResult.tokenUsage,
    costKnown,
    validationStep: "acquisition",
  };

  const validationEvidence: ValidationEvidenceItem = {
    assumptionCategory: input.assumption.category,
    assumptionId: input.assumption.assumption,
    claim: combinedEvidenceText.slice(0, 4000),
    sourceUrls: allSourceUrls.slice(0, 10),
    newSourceUrls: novelty.newSourceUrls,
    grounded: allSourceUrls.length > 0,
    confidenceImpact: credit.confidenceImpact,
    assumptionImpact: credit.assumptionImpact,
    uncertaintyReduction: credit.uncertaintyReduction,
    experimentType: experiment.experimentType,
    relevanceClass: aggregateRelevance,
    validationResult: credit.validationResult,
    newEvidenceFound: novelty.newSourceCount > 0,
    newSourceCount: novelty.newSourceCount,
    reusedSourceCount: novelty.reusedSourceCount,
  };

  return {
    ok: true,
    experiment,
    validationEvidence,
    researchResult,
    evidenceItems,
    preAssumptionUncertainty,
    postAssumptionUncertainty,
  };
}

export function recordValidationResearchBudget(input: {
  budget: import("../budget-governor").CycleBudgetGovernor;
  experiment: ValidationExperimentRecord;
  note?: string;
}): void {
  input.budget.record({
    stage: "bounded_validation",
    provider: input.experiment.provider ?? "gemini",
    costUsd: input.experiment.costKnown ? input.experiment.costUsd : null,
    known: input.experiment.costKnown ?? input.experiment.costUsd != null,
    note:
      input.note ??
      `researchRunId=${input.experiment.researchRunId} providerCalls=${input.experiment.providerCalls}`,
  });
}
