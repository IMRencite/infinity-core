import type { ValidationEvidenceItem } from "@/lib/infinity/venture-selection/assumptions/register";

import type { AssumptionRecord, LoadedCandidateBundle } from "@/lib/infinity/venture-selection/types";

import {

  isAllowedValidationExperimentType,

  mapValidationMethodToAllowedExperiment,

} from "./constants";

import {

  classifyAssumptionKind,

  classifyEvidenceRelevance,

  classifySourceNovelty,

  deriveValidationCredit,

  extractPriorSourceUrls,

  resolveTruthfulExperimentType,

} from "./evidence-relevance";

import type { ValidationExperimentRecord } from "./types";



function extractSourceUrls(items: unknown[]): string[] {

  const urls: string[] = [];

  for (const item of items) {

    const record = item as Record<string, unknown>;

    if (Array.isArray(record.sourceUrls)) {

      for (const url of record.sourceUrls) {

        if (typeof url === "string" && url.startsWith("http")) {

          urls.push(url);

        }

      }

    }

  }

  return urls;

}



function collectClaimsForAssumption(

  candidate: LoadedCandidateBundle,

  assumption: AssumptionRecord,

): string[] {

  const kind = classifyAssumptionKind(assumption);

  const claims: string[] = [];



  const pushClaims = (items: unknown[]) => {

    for (const item of items) {

      const record = item as Record<string, unknown>;

      if (typeof record.claim === "string") claims.push(record.claim);

      else if (typeof record.summary === "string") claims.push(record.summary);

    }

  };



  if (kind === "quantitative_cac" || assumption.category === "acquisition") {

    pushClaims(candidate.distributionEvidence);

    pushClaims(candidate.monetizationEvidence);

  } else if (kind === "quantitative_customer_count" || assumption.category === "demand") {

    pushClaims(candidate.demandEvidence);

    pushClaims(candidate.competitionEvidence);

  } else {

    pushClaims(candidate.demandEvidence.slice(0, 2));

    pushClaims(candidate.competitionEvidence.slice(0, 1));

  }



  return claims.filter(Boolean);

}



function synthesizeEvidenceForExperiment(input: {

  candidate: LoadedCandidateBundle;

  assumption: AssumptionRecord;

  experimentType: string;

  priorSourceUrls: Set<string>;

  providerCalls: number;

}): ValidationExperimentRecord | null {

  const { candidate, assumption, providerCalls } = input;

  const requestedType = input.experimentType;

  const experimentType = resolveTruthfulExperimentType({

    requestedType,

    providerCalls,

    hadExternalExposure: false,

  });



  const sourceUrls = [

    ...assumption.sourceUrls,

    ...extractSourceUrls(candidate.demandEvidence),

    ...extractSourceUrls(candidate.monetizationEvidence),

    ...extractSourceUrls(candidate.competitionEvidence),

    ...extractSourceUrls(candidate.distributionEvidence),

    ...(candidate.monetization?.primaryPlan?.sourceUrls ?? []),

  ].filter((url, index, all) => all.indexOf(url) === index);



  if (sourceUrls.length === 0) {

    return null;

  }



  const claims = collectClaimsForAssumption(candidate, assumption);

  const actualEvidence =

    claims.length > 0

      ? claims.join(" | ")

      : `Grounded synthesis from ${sourceUrls.length} persisted public source(s) for ${assumption.category}.`;



  const relevance = classifyEvidenceRelevance({

    assumption,

    evidenceText: actualEvidence,

    experimentType,

  });

  const novelty = classifySourceNovelty(sourceUrls.slice(0, 5), input.priorSourceUrls);

  const hasQuantitativeClaim = /\$?\d[\d,]*|\d+\s*(customer|user|paying)/i.test(actualEvidence);

  const credit = deriveValidationCredit({

    relevance,

    newSourceCount: novelty.newSourceCount,

    reusedSourceCount: novelty.reusedSourceCount,

    hasQuantitativeClaim,

  });



  return {

    candidateId: candidate.candidateId,

    blockingAssumptionId: assumption.assumption,

    experimentType,

    requestedExperimentType: requestedType,

    question: `Can persisted evidence reduce uncertainty for: ${assumption.assumption}?`,

    expectedEvidence: "Public, verifiable sources supporting or refuting the blocking assumption.",

    actualEvidence,

    sourceUrls: sourceUrls.slice(0, 5),

    newSourceUrls: novelty.newSourceUrls,

    reusedSourceUrls: novelty.reusedSourceUrls,

    newSourceCount: novelty.newSourceCount,

    reusedSourceCount: novelty.reusedSourceCount,

    relevanceClass: relevance,

    costUsd: 0,

    executionStatus: "COMPLETED",

    validationResult: credit.validationResult,

    newEvidenceFound: credit.newEvidenceFound,

    uncertaintyReduction: credit.uncertaintyReduction,

    confidenceImpact: credit.confidenceImpact,

    assumptionImpact: credit.assumptionImpact,

    providerCalls,

    synthesisOnly: providerCalls === 0,

    validationStep: "synthesis",

  };

}



export function executeAllowedValidationExperiments(input: {

  candidate: LoadedCandidateBundle;

  assumptions: AssumptionRecord[];

  maxExperiments?: number;

  providerCalls?: number;

}): {

  experiments: ValidationExperimentRecord[];

  validationEvidence: ValidationEvidenceItem[];

  rejectedExperimentTypes: string[];

} {

  const maxExperiments = input.maxExperiments ?? 2;

  const providerCalls = input.providerCalls ?? 0;

  const priorSourceUrls = extractPriorSourceUrls(input.candidate);

  const sortedAssumptions = [...input.assumptions].sort(

    (a, b) => b.fatalRiskContribution - a.fatalRiskContribution,

  );



  const experiments: ValidationExperimentRecord[] = [];

  const validationEvidence: ValidationEvidenceItem[] = [];

  const rejectedExperimentTypes: string[] = [];



  for (const assumption of sortedAssumptions) {

    if (experiments.length >= maxExperiments) break;



    const rawType = assumption.validationMethod ?? assumption.category;

    if (

      rawType.includes("customer_interview") ||

      rawType.includes("survey") ||

      rawType.includes("fake_")

    ) {

      rejectedExperimentTypes.push(rawType);

    }



    const mappedType = mapValidationMethodToAllowedExperiment(assumption.validationMethod);

    if (!mappedType || !isAllowedValidationExperimentType(mappedType)) {

      if (assumption.validationMethod && !rejectedExperimentTypes.includes(assumption.validationMethod)) {

        rejectedExperimentTypes.push(assumption.validationMethod);

      }

      continue;

    }



    const record = synthesizeEvidenceForExperiment({

      candidate: input.candidate,

      assumption,

      experimentType: mappedType,

      priorSourceUrls,

      providerCalls,

    });

    if (!record) continue;



    experiments.push(record);

    validationEvidence.push({

      assumptionCategory: assumption.category,

      assumptionId: assumption.assumption,

      claim: record.actualEvidence,

      sourceUrls: record.sourceUrls,

      newSourceUrls: record.newSourceUrls,

      grounded: record.sourceUrls.length > 0,

      confidenceImpact: record.confidenceImpact,

      assumptionImpact: record.assumptionImpact,

      uncertaintyReduction: record.uncertaintyReduction,

      experimentType: record.experimentType,

      relevanceClass: record.relevanceClass,

      validationResult: record.validationResult,

      newEvidenceFound: record.newEvidenceFound,

      newSourceCount: record.newSourceCount,

      reusedSourceCount: record.reusedSourceCount,

    });

  }



  return { experiments, validationEvidence, rejectedExperimentTypes };

}


