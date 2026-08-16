import type {
  GeneratedOrganicPageArtifact,
  OrganicContentContract,
  PostGenerationGateOutcome,
  PostGenerationGateResult,
} from "../types";

const FABRICATED_PATTERNS = [
  /in our experience/i,
  /we have seen/i,
  /our customers typically/i,
  /our customers say/i,
  /our team has found/i,
  /our doctor recommends/i,
  /certified expert/i,
  /verified reviewer/i,
  /we have served the area for \d+ years/i,
  /rated \d+(\.\d+)? stars/i,
  /prices start at/i,
  /located at \d+/i,
];

export function validateGeneratedOrganicArtifact(input: {
  artifact: GeneratedOrganicPageArtifact;
  contentContract: OrganicContentContract;
  canonicalUrl: string;
  schemaTypes: string[];
  registryUrls: Set<string>;
}): PostGenerationGateResult {
  const failures: string[] = [];

  if (input.artifact.canonicalUrl !== input.canonicalUrl) {
    failures.push("Canonical URL mismatch between artifact and registry");
  }

  for (const section of input.contentContract.sections) {
    if (!input.artifact.sections.some((s) => s.heading === section.heading)) {
      failures.push(`Missing required section: ${section.heading}`);
    }
  }

  if (input.contentContract.questionsAnswered.length > 2) {
    const body = input.artifact.bodyText.toLowerCase();
    const gainHits = input.contentContract.questionsAnswered.filter((g) =>
      body.includes(g.toLowerCase().slice(0, Math.min(20, g.length))),
    );
    if (gainHits.length === 0) {
      failures.push("Required information gain not reflected in generated content");
    }
  }

  for (const link of input.artifact.internalLinks) {
    if (!input.registryUrls.has(link.targetUrl)) {
      failures.push(`Internal link target not in canonical registry: ${link.targetUrl}`);
    }
  }

  if (FABRICATED_PATTERNS.some((p) => p.test(input.artifact.bodyText))) {
    failures.push("Fabricated first-person experience or credentials detected");
  }

  for (const claim of input.artifact.claims) {
    if (claim.fabricated) {
      failures.push(`Fabricated claim: ${claim.statement}`);
    }
  }

  if (
    input.schemaTypes.includes("LocalBusiness") &&
    !input.contentContract.schemaRequirements.some((s) => /verified location/i.test(s))
  ) {
    failures.push("LocalBusiness schema without verified physical location");
  }

  if (input.schemaTypes.includes("AggregateRating") || input.schemaTypes.includes("Review")) {
    failures.push("Unsupported review/rating schema in generated artifact");
  }

  if (input.artifact.bodyText.length < 120 && input.contentContract.resourceDepth !== "DIRECT_RESPONSE") {
    failures.push("Thin generated content below standalone value threshold");
  }

  let outcome: PostGenerationGateOutcome = "PASS";
  if (failures.some((f) => /Fabricated|LocalBusiness|Unsupported review|rated \d|prices start at|located at/i.test(f))) {
    outcome = "BLOCK_ARTIFACT";
  } else if (failures.length > 0) {
    outcome = "REPAIR";
  }

  return {
    pageOpportunityId: input.artifact.pageOpportunityId,
    outcome,
    failures,
  };
}

export function summarizePostGenerationGate(
  results: PostGenerationGateResult[],
): { passed: number; repair: number; blocked: number } {
  return {
    passed: results.filter((r) => r.outcome === "PASS").length,
    repair: results.filter((r) => r.outcome === "REPAIR").length,
    blocked: results.filter((r) => r.outcome === "BLOCK_ARTIFACT").length,
  };
}
