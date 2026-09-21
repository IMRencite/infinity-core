import type { PageOpportunity, ThinPageAssessment } from "./types";

export function assessThinPageOpportunity(opportunity: PageOpportunity): ThinPageAssessment {
  if (opportunity.recommendedPageType === "CONVERSION" || opportunity.recommendedPageType === "LEGAL") {
    return {
      route: opportunity.route,
      uniqueInformationalValue: "PASS",
      intentFulfillment: "PASS",
      contentDepth: "PASS",
      sourceGrounding: "PASS",
      semanticDifferentiation: "PASS",
      internalLinkRole: "PASS",
      decision: "PASS",
      reasons: [],
    };
  }
  const unique = opportunity.informationValue !== "LOW" && !/city|zip|near me|keyword permutation/i.test(opportunity.topic);
  const intent = Boolean(opportunity.primaryIntent && opportunity.recommendedPageType);
  const depth = opportunity.contentDepthRequirement !== "BRIEF" || opportunity.recommendedPageType === "PRICING";
  const sources = opportunity.evidenceRequirement !== "REQUIRED" || opportunity.informationValue === "HIGH";
  const distinct = opportunity.status !== "REJECTED_CANNIBALIZATION";
  const linkRole = Boolean(opportunity.internalLinkRole);
  const doorway = /doorway|service in .+ and|best \w+ in \w+ county/i.test(opportunity.topic);
  const programmatic = /every city|all neighborhoods|keyword permutation/i.test(opportunity.topic);
  const pass = unique && intent && depth && sources && distinct && linkRole && !doorway && !programmatic;
  const reasons: string[] = [];
  if (!unique) reasons.push("Low unique informational value");
  if (doorway || programmatic) reasons.push("Doorway or mass-permutation pattern");
  if (!depth) reasons.push("Depth requirement not justified for a standalone page");
  return {
    route: opportunity.route,
    uniqueInformationalValue: unique ? "PASS" : "FAIL",
    intentFulfillment: intent ? "PASS" : "FAIL",
    contentDepth: depth ? "PASS" : "FAIL",
    sourceGrounding: sources ? "PASS" : "FAIL",
    semanticDifferentiation: distinct ? "PASS" : "FAIL",
    internalLinkRole: linkRole ? "PASS" : "FAIL",
    decision: pass ? "PASS" : "REJECT",
    reasons,
  };
}

export function assessRenderedThinness(input: {
  route: string;
  purpose: string;
  wordCount: number;
  uniqueMarkers: string[];
  sharedBoilerplateRatio: number;
}): ThinPageAssessment {
  const unique = input.uniqueMarkers.length >= 3 && input.sharedBoilerplateRatio < 0.55;
  const depth = input.wordCount >= 180 || /privacy|terms|pricing/i.test(input.route);
  const pass = unique && depth && Boolean(input.purpose);
  return {
    route: input.route,
    uniqueInformationalValue: unique ? "PASS" : "FAIL",
    intentFulfillment: input.purpose ? "PASS" : "FAIL",
    contentDepth: depth ? "PASS" : "FAIL",
    sourceGrounding: "PASS",
    semanticDifferentiation: unique ? "PASS" : "FAIL",
    internalLinkRole: "PASS",
    decision: pass ? "PASS" : "REJECT",
    reasons: pass ? [] : ["Rendered page is thin or insufficiently distinct"],
  };
}
