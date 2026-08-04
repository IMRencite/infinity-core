import {
  AI_WEBSITE_GENERATION_SCHEMA_VERSION,
  HONEST_CONTENT_MARKERS,
} from "./constants";
import type { WebsiteGenerationPlanPayload } from "./types";

export function buildMockWebsiteGenerationPlan(input: {
  buildId: string;
  projectType: string;
  siteName: string;
  allowedEvidenceReferenceIds: string[];
}): WebsiteGenerationPlanPayload {
  const evidence = input.allowedEvidenceReferenceIds[0] ?? "validation_run:mock";
  return {
    schemaVersion: AI_WEBSITE_GENERATION_SCHEMA_VERSION,
    siteStrategy: "Internal advisory website plan (mock, no network).",
    audienceSummary: "[CONTENT REQUIRED]",
    positioning: input.siteName,
    brandDirection: "Foundation design system — refinement pending.",
    designDirection: "Accessible baseline, system fonts only.",
    informationArchitecture: "Home, about, contact, and spec-derived pages.",
    navigationPlan: [
      { label: "Home", href: "/" },
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
    pagePlans: [
      {
        pageKey: "home",
        slug: "",
        pageType: "home",
        titleRecommendation: input.siteName,
        purpose: "Primary entry",
        primaryAudience: "[CONTENT REQUIRED]",
        searchIntent: "informational",
        primaryKeyword: input.siteName.toLowerCase(),
        secondaryKeywords: [],
        primaryCTA: HONEST_CONTENT_MARKERS[0]!,
        sectionPlan: [
          {
            sectionKey: "hero",
            sectionType: "Hero",
            purpose: "Introduce site",
            headingRecommendation: input.siteName,
            contentBrief: HONEST_CONTENT_MARKERS[0]!,
            requiredFacts: [],
            approvedEvidenceReferenceIds: [evidence],
            componentType: "Hero",
            designNotes: "Foundation layout",
            accessibilityNotes: "Single H1",
            SEORequirements: ["unique title"],
            missingInformation: [HONEST_CONTENT_MARKERS[0]!],
            prohibitedClaims: [],
          },
        ],
        requiredComponents: ["Header", "Hero", "Footer"],
        internalLinkTargets: ["/about", "/contact"],
        metadataRecommendation: { description: HONEST_CONTENT_MARKERS[0]! },
        schemaTypes: ["WebPage"],
        trustElements: [],
        evidenceRequirements: [evidence],
        missingContentMarkers: [HONEST_CONTENT_MARKERS[0]!],
        prohibitedClaims: [],
        validationRequirements: ["single_h1"],
      },
    ],
    componentPlan: ["Header", "Navigation", "Footer", "Hero", "ContentSection"],
    contentPlan: [
      {
        contentKey: "home-hero",
        pageKey: "home",
        sectionKey: "hero",
        contentType: "paragraph",
        content: HONEST_CONTENT_MARKERS[0]!,
        evidenceReferenceIds: [evidence],
        confidence: 70,
        assumptions: ["Mock provider — advisory only."],
        missingInformation: [HONEST_CONTENT_MARKERS[0]!],
        requiresHumanReview: true,
        policyFlags: [],
      },
    ],
    conversionPlan: "[FORM INTEGRATION NOT CONFIGURED]",
    SEOPlan: "Use https://example.invalid canonical placeholders.",
    schemaPlan: "WebSite and WebPage placeholders only.",
    accessibilityPlan: "Single H1, labels on forms, landmarks.",
    trustRequirements: ["No fabricated social proof"],
    missingInformation: [HONEST_CONTENT_MARKERS[0]!],
    assumptions: ["Mock mode — deterministic output."],
    prohibitedClaims: [],
    requiredPlaceholders: [...HONEST_CONTENT_MARKERS],
    executiveQuestions: ["Approve advisory plan before file generation?"],
    risks: [
      {
        title: "Incomplete content",
        severity: "medium",
        rationale: "Markers must remain until approved data exists.",
      },
    ],
    recommendation: "review_plan",
    recommendationConfidence: 65,
    conciseRationale: [
      "Mock plan generated without provider network.",
      "Honest-content markers preserved.",
    ],
  };
}
