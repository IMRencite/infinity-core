import {
  AUTHORITY_GENERATION_FLOW,
  COMPLIANCE_STATES,
  HARD_PUBLISHABILITY_GATES,
  LOCKED_QUALITY_FLOORS,
} from "./constants";
import type {
  AuthorityGenerationStep,
  ComplianceState,
  Gate,
  PublicAuthoritySiteProfile,
  PublicAuthorityStandardOverride,
  PublicSiteClass,
} from "./types";

const WEAKENABLE_FLOORS = [
  "readability",
  "search grounding",
  "topic coverage",
  "citation standards",
  "internal linking",
  "visual quality",
  "rendered QC",
  "conversion integrity",
] as const;

export function createStandardOverride(input: PublicAuthorityStandardOverride): PublicAuthorityStandardOverride {
  if (!input.overrideId || !input.ventureId || !input.reason || !input.authority || !input.traceability) {
    throw new Error("override_requires_traceability");
  }
  return { ...input, model: "PublicAuthorityStandardOverride" };
}

export function evaluateSilentWeakening(input: {
  floor: (typeof WEAKENABLE_FLOORS)[number];
  original: string | number | boolean;
  proposed: string | number | boolean;
  override?: PublicAuthorityStandardOverride | null;
}): { overall: Gate; reason: string } {
  const weaker =
    (typeof input.original === "number" && typeof input.proposed === "number" && input.proposed < input.original) ||
    (input.original === true && input.proposed === false) ||
    (typeof input.original === "string" && input.original !== input.proposed);
  if (!weaker) return { overall: "PASS", reason: "no_weakening" };
  if (input.override && input.override.standardOrGate === input.floor && input.override.reviewState === "ACTIVE") {
    return { overall: "PASS", reason: "governed_override" };
  }
  return { overall: "FAIL", reason: "silent_quality_weakening" };
}

export function evaluateFactoryFlow(completed: AuthorityGenerationStep[]): {
  overall: Gate;
  next: AuthorityGenerationStep | "COMPLETE";
  bypassPrevented: true;
} {
  for (let index = 0; index < completed.length; index += 1) {
    if (completed[index] !== AUTHORITY_GENERATION_FLOW[index]) {
      return { overall: "FAIL", next: AUTHORITY_GENERATION_FLOW[index] ?? "COMPLETE", bypassPrevented: true };
    }
  }
  return {
    overall: "PASS",
    next: AUTHORITY_GENERATION_FLOW[completed.length] ?? "COMPLETE",
    bypassPrevented: true,
  };
}

export function rejectDirectWorkerBypass(input: { startAt: AuthorityGenerationStep; prior: AuthorityGenerationStep[] }): Gate {
  const startIndex = AUTHORITY_GENERATION_FLOW.indexOf(input.startAt);
  if (startIndex <= 0) return "PASS";
  const required = AUTHORITY_GENERATION_FLOW.slice(0, startIndex);
  return required.every((step, index) => input.prior[index] === step) ? "PASS" : "FAIL";
}

export function evaluateResearchBeforeScale(input: { researched: boolean; generatedPageCount: number }): Gate {
  if (!input.researched && input.generatedPageCount > 0) return "FAIL";
  return "PASS";
}

export function evaluateBoundedGeneration(input: { waveSize: number; stopOnQualityDrop: boolean }): Gate {
  if (input.waveSize > 40) return "FAIL";
  if (!input.stopOnQualityDrop) return "FAIL";
  return "PASS";
}

export function classifyPublicSite(siteClass: PublicSiteClass): {
  requiresFullAuthorityStandard: boolean;
  authoritySurfacesMayStillUseContracts: true;
} {
  return {
    requiresFullAuthorityStandard: siteClass === "AUTHORITY_LED",
    authoritySurfacesMayStillUseContracts: true,
  };
}

export function evaluateNewAuthorityLedVentureReadiness(profile: PublicAuthoritySiteProfile): Gate {
  const required =
    profile.siteClass === "AUTHORITY_LED" &&
    profile.topicTaxonomy.length > 0 &&
    profile.questionKnowledgeGraph.model === "QuestionKnowledgeGraph" &&
    profile.minimumValidatedQuestionsPerCoreTopic === 20 &&
    profile.searchResearchPolicy.researchBeforeScale &&
    profile.pageArchetypesEnabled.includes("TOPIC_HUB") &&
    profile.pageArchetypesEnabled.includes("QUESTION_AUTHORITY") &&
    profile.publishabilityRequirements.length === HARD_PUBLISHABILITY_GATES.length;
  return required ? "PASS" : "FAIL";
}

export function evaluateLegacyCompliance(input: {
  assessed: boolean;
  hardGateFails: number;
  premiumReady: boolean;
}): ComplianceState {
  if (!input.assessed) return "LEGACY_UNASSESSED";
  if (input.premiumReady) return "PREMIUM_AUTHORITY_VALIDATION_READY";
  if (input.hardGateFails === 0) return "COMPLIANT";
  return "PARTIALLY_COMPLIANT";
}

export function complianceStates(): readonly ComplianceState[] {
  return COMPLIANCE_STATES;
}

export function lockedFloors() {
  return LOCKED_QUALITY_FLOORS;
}
