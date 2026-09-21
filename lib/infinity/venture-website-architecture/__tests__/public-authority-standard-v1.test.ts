import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import {
  LOCKED_CRE_EXPERIMENT_ID,
  SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import { reconstructCreAuthorityExpansionSuccessor } from "../cre-authority-expansion-successor";
import { evaluateHumanReadabilityGate } from "../human-readability-gate";
import {
  evaluateAuthorityVisualAssetCoverage,
  evaluateLongFormTextWall,
  evaluateRenderedCompositionQuality,
  evaluateRenderedTableQuality,
  evaluateVisualDeadSpace,
} from "../visual-quality-gates";
import {
  AUTHORITY_GENERATION_FLOW,
  COVERAGE_DECISIONS,
  HARD_PUBLISHABILITY_GATES,
  LOCKED_QUALITY_FLOORS,
  PUBLIC_PAGE_ARCHETYPES,
} from "../public-authority-standard/constants";
import {
  INFINITY_PUBLIC_AUTHORITY_STANDARD_PRINCIPLE,
  archetypeSpecializesGlobalContract,
  assignPrimaryTopic,
  buildAuthorityContentGap,
  buildPublicAuthorityPageContract,
  buildPublicAuthoritySiteProfile,
  classifyPublicSite,
  clusterSemanticQuestions,
  complianceStates,
  createStandardOverride,
  CRE_PUBLIC_AUTHORITY_REFERENCE,
  creReferenceCompatibility,
  emptySearchEvidence,
  evaluateAboveFoldVisualRequirement,
  evaluateBodyContextLinks,
  evaluateBoundedGeneration,
  evaluateConversionPath,
  evaluateCrossRouteConsistency,
  evaluateCssOnlyVisual,
  evaluateFactoryFlow,
  evaluateLegacyCompliance,
  evaluateLinkGraphRequirements,
  evaluateNewAuthorityLedVentureReadiness,
  evaluatePaddedWordCount,
  evaluatePublicAuthorityPublishability,
  evaluateQuestionCoverageRule,
  evaluateResearchBeforeScale,
  evaluateResponsiveGeometry,
  evaluateSemanticLinkDensity,
  evaluateSilentWeakening,
  evaluateSourcePolicy,
  evaluateStandaloneEligibility,
  evaluateTopicalCompleteness,
  infinityPublicAuthorityStandard,
  interpretUnknownVolume,
  normalizeQuestion,
  publicPageArchetype,
  publicPageArchetypeRegistry,
  rejectDirectWorkerBypass,
  rejectFabricatedSearchMetrics,
  resolveVisualEvidenceConflict,
  topicCoverageState,
  visualEvidencePrecedence,
} from "../public-authority-standard";

function observerState() {
  return JSON.parse(readFileSync(".infinity/communication/inbound-observer-state.json", "utf8")) as {
    status: string;
    trackedConversationIds: string[];
    historyCheckpointId: string;
    mode: string;
  };
}

function globalStandardSources(): string[] {
  const dir = path.join("lib/infinity/venture-website-architecture/public-authority-standard");
  return readdirSync(dir)
    .filter((file) => file.endsWith(".ts") && file !== "cre-reference.ts")
    .map((file) => readFileSync(path.join(dir, file), "utf8"));
}

describe("Infinity Public Authority & Digital Real Estate Standard V1", () => {
  it("creates the global standard, contracts, site profile, and archetype registry", () => {
    const standard = infinityPublicAuthorityStandard();
    expect(standard.model).toBe("InfinityPublicAuthorityStandard");
    expect(standard.version).toBe("V1");
    expect(standard.pageTemplatesAreArchetypes).toBe(true);
    expect(standard.researchRequirements.coverageIsNotPageCount).toBe(true);
    expect(standard.researchRequirements.minValidatedQuestionsPerCoreTopic).toBe(20);
    expect(standard.overrideRules.silentWeakening).toBe(false);
    expect(standard.requiredGates).toEqual([...HARD_PUBLISHABILITY_GATES]);
    const profile = buildPublicAuthoritySiteProfile({
      ventureId: "venture_example",
      industry: "professional services",
      market: "mid-market operators",
      audiences: ["advisor", "finance lead"],
      topicTaxonomy: ["topic-a", "topic-b"],
      hubArchitecture: [{ topic: "topic-a", hubRoute: "/topic-a" }],
      visualLanguage: "editorial photography plus diagrams",
    });
    expect(profile.model).toBe("PublicAuthoritySiteProfile");
    expect(profile.minimumValidatedQuestionsPerCoreTopic).toBe(20);
    const contract = buildPublicAuthorityPageContract({
      pageArchetype: "QUESTION_AUTHORITY",
      primaryTopic: "topic-a",
      primaryQuestion: "What does this metric mean?",
      targetPersona: "advisor",
    });
    expect(contract.model).toBe("PublicAuthorityPageContract");
    expect(contract.readabilityProfile.target).toBe("approximately 4th grade");
    expect(contract.pageDepthPolicy.minUsefulWords).toBe(2000);
    expect(contract.visualPlan.cssOnlyRejected).toBe(true);
    const registry = publicPageArchetypeRegistry();
    expect(registry.model).toBe("PublicPageArchetypeRegistry");
    expect(registry.templatesAreFixedLayouts).toBe(false);
    expect(registry.archetypes).toHaveLength(PUBLIC_PAGE_ARCHETYPES.length);
  });

  it("specializes archetypes while inheriting the global contract", () => {
    for (const archetype of PUBLIC_PAGE_ARCHETYPES) {
      expect(archetypeSpecializesGlobalContract(archetype)).toBe(true);
      expect(publicPageArchetype(archetype).inheritsGlobalContract).toBe(true);
    }
    expect(publicPageArchetype("QUESTION_AUTHORITY").contentDepth).toBe("DEEP");
    expect(publicPageArchetype("QUESTION_AUTHORITY").minAnswerSurfaces).toBeGreaterThanOrEqual(3);
    expect(publicPageArchetype("TOPIC_HUB").outcomes.some((item) => /20\+/.test(item))).toBe(true);
    expect(publicPageArchetype("COMPARISON").outcomes).toContain("A-vs-B comparison");
    expect(publicPageArchetype("HOW_TO").schema).toContain("HowTo");
    expect(publicPageArchetype("PRODUCT").conversionPath).toContain("mechanism");
    expect(publicPageArchetype("PRICING").defaultSearchIntent).toBe("TRANSACTIONAL");
    expect(publicPageArchetype("CALCULATOR_TOOL").archetype).toBe("CALCULATOR_TOOL");
    expect(publicPageArchetype("PERSONA").archetype).toBe("PERSONA");
    expect(publicPageArchetype("LOCATION").outcomes.some((item) => /thin/.test(item))).toBe(true);
    expect(publicPageArchetype("RESOURCE_LIBRARY").schema).toContain("CollectionPage");
    expect(publicPageArchetype("ABOUT").contentDepth).toBe("BRIEF");
    expect(publicPageArchetype("CONTACT").ctaStructure.length).toBeGreaterThan(0);
    expect(publicPageArchetype("LEGAL").ctaStructure).toEqual([]);
    expect(buildPublicAuthorityPageContract({
      pageArchetype: "LEGAL",
      primaryTopic: "legal",
      primaryQuestion: "What are the terms?",
      targetPersona: "visitor",
    }).pageDepthPolicy.minUsefulWords).toBeNull();
  });

  it("treats twenty validated questions as coverage, not page count", () => {
    expect(
      evaluateQuestionCoverageRule({
        coreTopics: ["alpha", "beta"],
        relationshipsByTopic: { alpha: 20, beta: 21 },
        standalonePagesByTopic: { alpha: 3, beta: 2 },
      }).overall,
    ).toBe("PASS");
    expect(
      evaluateQuestionCoverageRule({
        coreTopics: ["alpha"],
        relationshipsByTopic: { alpha: 8 },
        standalonePagesByTopic: { alpha: 20 },
      }).overall,
    ).toBe("FAIL");
    expect(evaluateQuestionCoverageRule({ coreTopics: ["alpha"], relationshipsByTopic: { alpha: 20 } }).coverageNotPageCount).toBe(true);
    expect(topicCoverageState({ researchedQuestions: 0, meaningfulRelationships: 0, contentSatisfied: 0 })).toBe("UNRESEARCHED");
    expect(topicCoverageState({ researchedQuestions: 12, meaningfulRelationships: 12, contentSatisfied: 4 })).toBe("RESEARCHED_INCOMPLETE");
    expect(topicCoverageState({ researchedQuestions: 22, meaningfulRelationships: 22, contentSatisfied: 8 })).toBe("SEARCH_COVERAGE_READY");
    expect(topicCoverageState({ researchedQuestions: 22, meaningfulRelationships: 22, contentSatisfied: 20 })).toBe("CONTENT_COVERAGE_PARTIAL");
    expect(topicCoverageState({ researchedQuestions: 20, meaningfulRelationships: 20, contentSatisfied: 20 })).toBe("TOPIC_AUTHORITY_READY");
  });

  it("models search evidence, unknown volume, clustering, and topic ownership", () => {
    const unknown = emptySearchEvidence("2026-09-03");
    expect(unknown.monthlyVolume).toBeNull();
    expect(unknown.unknownIsNotZero).toBe(true);
    expect(interpretUnknownVolume(unknown).unknown).toBe(true);
    expect(interpretUnknownVolume(unknown).treatedAsZero).toBe(false);
    expect(rejectFabricatedSearchMetrics({ monthlyVolume: 1200, claimedActual: false })).toBe("FAIL");
    expect(rejectFabricatedSearchMetrics({ monthlyVolume: null, claimedActual: false })).toBe("PASS");
    expect(normalizeQuestion("What is the core metric?")).toBe(normalizeQuestion("What does the core metric mean?"));
    const clusters = clusterSemanticQuestions([
      "What is the core metric?",
      "What does the core metric mean?",
      "What is core metric?",
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.alternatePhrasings.length).toBeGreaterThan(0);
    const owned = assignPrimaryTopic({ topicScores: [{ topic: "alpha", score: 8 }, { topic: "beta", score: 3 }] });
    expect(owned.primaryTopic).toBe("alpha");
    expect(owned.secondaryTopics).toEqual(["beta"]);
    const eligible = evaluateStandaloneEligibility({
      distinctIntent: true,
      independentSearchUsefulness: true,
      substantialAnswerDepth: true,
      canSupportTwoThousandWordsWithoutPadding: true,
      meaningfulGraphRelationships: true,
      geoUtility: true,
      decisionUsefulness: true,
    });
    expect(eligible.overall).toBe("PASS");
    expect(eligible.decision).toBe("BUILD_STANDALONE");
    expect(
      evaluateStandaloneEligibility({
        distinctIntent: false,
        independentSearchUsefulness: true,
        substantialAnswerDepth: false,
        canSupportTwoThousandWordsWithoutPadding: false,
        meaningfulGraphRelationships: true,
        geoUtility: false,
        decisionUsefulness: false,
      }).decision,
    ).not.toBe("BUILD_STANDALONE");
    for (const decision of COVERAGE_DECISIONS) {
      expect(buildAuthorityContentGap({
        question: "Sample question?",
        topic: "alpha",
        decision,
        reason: "coverage decision supported",
        searchEvidence: "QUESTION_PATTERN_OBSERVED",
      }).decision).toBe(decision);
    }
    expect(
      evaluateTopicalCompleteness({
        meaningfulRelationships: 20,
        coveredDimensions: [
          "definitions",
          "mechanics",
          "calculations",
          "how_to",
          "comparisons",
          "assumptions",
          "mistakes",
          "limitations",
          "decision_questions",
          "edge_cases",
          "cost_components",
          "persona_workflows",
          "commercial_relationships",
          "tool_workflow_relationships",
        ],
        standaloneUrlCount: 3,
      }).overall,
    ).toBe("PASS");
  });

  it("locks readability, GEO, linking, sources, visuals, and conversion", () => {
    const prose = "<h1>What is this number?</h1><p>This number is the price of a deal in today's dollars. You write the cash by year. Then you shrink later years. That sum is the answer.</p><p>NPV means net present value. The discount rate is the price of waiting. CAM is a shared building cost.</p>";
    const read = evaluateHumanReadabilityGate(prose);
    expect(read.fleschKincaidGrade).toBeLessThanOrEqual(7.2);
    expect(read.activeVoice).toBe("PASS");
    expect(read.paragraphLength).toBe("PASS");
    expect(LOCKED_QUALITY_FLOORS.maxParagraphWords).toBe(150);
    expect(evaluatePaddedWordCount({ usefulWords: 900, repeatedFillerRatio: 0.3 })).toBe("FAIL");
    expect(evaluateCssOnlyVisual({ hasRealImage: false, hasGradientOnly: true, hasIconOnly: false })).toBe("FAIL");
    expect(evaluateAboveFoldVisualRequirement({
      qualifyingArchetype: true,
      meaningfulVisualIntersectsFirstViewport: true,
      cssOnly: false,
    })).toBe("PASS");
    expect(evaluateLinkGraphRequirements({
      orphans: 0,
      deadEnds: 0,
      hubToSpoke: 2,
      spokeToHub: 2,
      sameTopicLateral: 2,
      crossTopic: 1,
      commercialPath: 1,
    }).overall).toBe("PASS");
    expect(evaluateLinkGraphRequirements({
      orphans: 1,
      deadEnds: 0,
      hubToSpoke: 2,
      spokeToHub: 2,
      sameTopicLateral: 2,
      crossTopic: 1,
      commercialPath: 1,
    }).orphanRejection).toBe("FAIL");
    expect(evaluateLinkGraphRequirements({
      orphans: 0,
      deadEnds: 1,
      hubToSpoke: 2,
      spokeToHub: 2,
      sameTopicLateral: 2,
      crossTopic: 1,
      commercialPath: 1,
    }).deadEndRejection).toBe("FAIL");
    expect(evaluateBodyContextLinks({ bodyContextualCount: 6, breadcrumbOnly: false })).toBe("PASS");
    expect(evaluateSemanticLinkDensity({ relevant: true, naturalPlacement: true, anchorNatural: true, stuffing: false })).toBe("PASS");
    expect(evaluateSourcePolicy({
      preferredUsed: true,
      competitorCitedAsAuthority: false,
      contextualPlacement: true,
      designedSourceSection: true,
    })).toBe("PASS");
    expect(evaluateSourcePolicy({
      preferredUsed: true,
      competitorCitedAsAuthority: true,
      contextualPlacement: true,
      designedSourceSection: true,
    })).toBe("FAIL");
    expect(evaluateConversionPath("INFORMATIONAL", ["Learn the related concept", "See a worked example"])).toBe("PASS");
    expect(evaluateConversionPath("INFORMATIONAL", ["Buy now"])).toBe("FAIL");
    expect(evaluateConversionPath("COMMERCIAL_INVESTIGATION", ["See the workflow", "View pilot pricing"])).toBe("PASS");
    expect(evaluateConversionPath("TRANSACTIONAL", ["Request Pilot Access"])).toBe("PASS");
    const html = `<header className="pv-hero"><img src="/media/hero.webp" alt="Editorial room." /><img src="/media/viz-cash-flow.svg" alt="Teaching diagram." /></header><div className="pv-analysis-board"><div className="pv-table-shell" data-visualization="true"><table className="pv-fin-table"><caption>Sample</caption><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><th>One</th><td>Two</td></tr></tbody></table></div></div><aside className="pv-callout">Note</aside><ul><li>One</li></ul>`;
    const css = ".vg-legal-footer, footer[data-infinity-footer] { margin: 0 40px 40px; padding: 2.5rem 24px; } @media (max-width: 640px) { .vg-legal-footer, footer[data-infinity-footer] { margin: 0 20px 24px; } }";
    expect(evaluateRenderedTableQuality(html).overall).toBe("PASS");
    expect(evaluateVisualDeadSpace(html).overall).toBe("PASS");
    expect(evaluateLongFormTextWall(html).overall).toBe("PASS");
    expect(evaluateAuthorityVisualAssetCoverage({ html, pageClass: "question" }).cssOnlyCountedAsImages).toBe(false);
    expect(evaluateAuthorityVisualAssetCoverage({ html, pageClass: "question" }).realImages).toBeGreaterThanOrEqual(2);
    expect(evaluateRenderedCompositionQuality({ html, css }).table.overall).toBe("PASS");
    expect(evaluateRenderedCompositionQuality({ html, css }).deadSpace.overall).toBe("PASS");
    expect(evaluateRenderedCompositionQuality({ html, css }).textWall.overall).toBe("PASS");
    expect(evaluateCrossRouteConsistency({ routeSignatures: ["gutter:40", "gutter:40"] })).toBe("PASS");
    expect(evaluateResponsiveGeometry({ overflowByViewport: { "1280": 0, "1440": 0, "390": 0 } })).toBe("PASS");
    const conflict = resolveVisualEvidenceConflict({
      founderPhysicalBrowser: "FAIL",
      servedScreenshot: "PASS",
      computedGeometry: "PASS",
      compiledCss: "PASS",
      sourceCss: "PASS",
    });
    expect(conflict.governingLayer).toBe("FOUNDER_PHYSICAL_BROWSER_EVIDENCE");
    expect(conflict.overall).toBe("FAIL");
    expect(conflict.automatedPassOverridden).toBe(true);
    expect(visualEvidencePrecedence()[0]).toBe("FOUNDER_PHYSICAL_BROWSER_EVIDENCE");
  });

  it("prevents silent weakening and enforces the Factory generation flow", () => {
    expect(
      evaluateSilentWeakening({
        floor: "topic coverage",
        original: 20,
        proposed: 10,
      }).overall,
    ).toBe("FAIL");
    const override = createStandardOverride({
      model: "PublicAuthorityStandardOverride",
      overrideId: "ovr_trace_1",
      ventureId: "venture_example",
      scope: { siteWide: true },
      standardOrGate: "topic coverage",
      originalRequirement: "20 validated relationships",
      replacementRequirement: "temporary 12 during migration",
      reason: "legacy migration window",
      authority: "governed override board",
      risk: "HIGH",
      traceability: "trace://overrides/ovr_trace_1",
      reviewState: "ACTIVE",
    });
    expect(override.traceability).toContain("ovr_trace_1");
    expect(
      evaluateSilentWeakening({
        floor: "topic coverage",
        original: 20,
        proposed: 12,
        override,
      }).overall,
    ).toBe("PASS");
    expect(evaluateFactoryFlow([]).next).toBe("GLOBAL_PUBLIC_AUTHORITY_STANDARD");
    expect(evaluateFactoryFlow([...AUTHORITY_GENERATION_FLOW]).next).toBe("COMPLETE");
    expect(rejectDirectWorkerBypass({ startAt: "GENERATION", prior: [] })).toBe("FAIL");
    expect(evaluateResearchBeforeScale({ researched: false, generatedPageCount: 12 })).toBe("FAIL");
    expect(evaluateBoundedGeneration({ waveSize: 24, stopOnQualityDrop: true })).toBe("PASS");
    const ready = evaluatePublicAuthorityPublishability({
      gateResults: Object.fromEntries(HARD_PUBLISHABILITY_GATES.map((gate) => [gate, "PASS" as const])),
    });
    expect(ready.ready).toBe("PREMIUM_AUTHORITY_VALIDATION_READY");
    expect(evaluateNewAuthorityLedVentureReadiness(buildPublicAuthoritySiteProfile({
      ventureId: "venture_example",
      industry: "services",
      market: "operators",
      audiences: ["advisor"],
      topicTaxonomy: ["topic-a"],
      hubArchitecture: [{ topic: "topic-a", hubRoute: "/topic-a" }],
      visualLanguage: "editorial",
    }))).toBe("PASS");
    expect(classifyPublicSite("PRODUCT_LED").requiresFullAuthorityStandard).toBe(false);
    expect(classifyPublicSite("AUTHORITY_LED").requiresFullAuthorityStandard).toBe(true);
    expect(evaluateLegacyCompliance({ assessed: false, hardGateFails: 0, premiumReady: false })).toBe("LEGACY_UNASSESSED");
    expect(evaluateLegacyCompliance({ assessed: true, hardGateFails: 2, premiumReady: false })).toBe("PARTIALLY_COMPLIANT");
    expect(evaluateLegacyCompliance({ assessed: true, hardGateFails: 0, premiumReady: false })).toBe("COMPLIANT");
    expect(evaluateLegacyCompliance({ assessed: true, hardGateFails: 0, premiumReady: true })).toBe("PREMIUM_AUTHORITY_VALIDATION_READY");
    expect(complianceStates()).toEqual(["LEGACY_UNASSESSED", "PARTIALLY_COMPLIANT", "COMPLIANT", "PREMIUM_AUTHORITY_VALIDATION_READY"]);
  });

  it("locks the global authority principles in canonical architecture docs", () => {
    const master = readFileSync("INFINITY_MASTER_ARCHITECTURE.md", "utf8");
    const locked = readFileSync("INFINITY_LOCKED_DECISIONS.md", "utf8");
    const build = readFileSync("INFINITY_BUILD_STATE.md", "utf8");
    for (const text of [master, locked, build]) {
      expect(text).toContain(INFINITY_PUBLIC_AUTHORITY_STANDARD_PRINCIPLE);
      expect(text).toMatch(/coverage rule, not a requirement to create 20 standalone URLs/);
      expect(text).toContain("Page templates are archetypes, not fixed layouts.");
      expect(text).toMatch(/Founder physical browser evidence outranks automated visual-quality claims/);
      expect(text).toContain("Privacy Policy | Terms of Service | Sitemap | An Infinity OS Venture | By IMR");
    }
  });

  it("keeps CRE as the reference implementation and does not hardcode CRE terms in global types", () => {
    const compatibility = creReferenceCompatibility();
    expect(compatibility.overall).toBe("PASS");
    expect(CRE_PUBLIC_AUTHORITY_REFERENCE.artifactId).toBe("art_00cd1821c5a178bf2487");
    expect(CRE_PUBLIC_AUTHORITY_REFERENCE.digest).toBe("09857789812df6bcba9f18a70ab35e03965373855bb3fa849e22e43d363f4823");
    expect(CRE_PUBLIC_AUTHORITY_REFERENCE.metricsAreUniversalMinimums).toBe(false);
    expect(SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID).toBe(CRE_PUBLIC_AUTHORITY_REFERENCE.lockedArtifactId);
    expect(SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_SOURCE_DIGEST).toBe(CRE_PUBLIC_AUTHORITY_REFERENCE.lockedDigest);
    const blob = globalStandardSources().join("\n").toLowerCase();
    expect(blob).not.toMatch(/\blease\b/);
    expect(blob).not.toMatch(/\bnpv\b/);
    expect(blob).not.toMatch(/\bcam\b/);
    expect(blob).not.toMatch(/tenant-rep|tenant rep/);
    expect(blob).not.toMatch(/effective rent/);
  });

  it("preserves the CRE successor digest, experiment, and Gmail observer", async () => {
    const clockBefore = inspectExperimentClock();
    const evidenceBefore = inspectRealMarketEvidence();
    const observerBefore = observerState();
    const successor = await reconstructCreAuthorityExpansionSuccessor();
    expect(successor.artifactId).toBe("art_00cd1821c5a178bf2487");
    expect(successor.digest).toBe("09857789812df6bcba9f18a70ab35e03965373855bb3fa849e22e43d363f4823");
    expect(successor.deployed).toBe(false);
    expect(successor.liveArtifactMutated).toBe(false);
    expect(LOCKED_CRE_EXPERIMENT_ID).toBe("exp_e72beb7b6d35e7b20acf");
    expect(inspectExperimentClock().restarted).toBe(false);
    expect(inspectExperimentClock().evidenceStart).toBe(clockBefore.evidenceStart);
    expect(inspectRealMarketEvidence().experiment.state).toBe("COLLECTING");
    expect(inspectRealMarketEvidence().counts).toEqual(evidenceBefore.counts);
    const observerAfter = observerState();
    expect(observerAfter.status).toBe("RUNNING");
    expect(observerAfter.mode).toBe("GMAIL_HISTORY_BOUNDED_POLL");
    expect(observerAfter.trackedConversationIds).toHaveLength(2);
    expect(observerAfter.historyCheckpointId).toBe(observerBefore.historyCheckpointId);
  }, 180000);
});
