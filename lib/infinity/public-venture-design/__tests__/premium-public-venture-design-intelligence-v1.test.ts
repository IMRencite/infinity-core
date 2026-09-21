import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import { resetExperimentRuntime } from "@/lib/infinity/market-validation-experiment/execute";
import { resetCurrentCreValidationArtifactIdCache } from "@/lib/infinity/market-validation-experiment/current-cre-artifact";
import { activateValidationGradeSuccessorPublicArtifact } from "@/lib/infinity/market-validation-experiment/active-public-artifact";
import { executeMarketValidationExperiment } from "@/lib/infinity/market-validation-experiment/execute";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { CANONICAL_EVIDENCE_START } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";
import { evaluateSecretSafety } from "@/lib/infinity/market-validation-experiment/secret-safety";
import {
  PUBLIC_VENTURE_DESIGN_INTELLIGENCE,
  SECTION_TYPES,
  VISUALIZATION_TYPES,
  INTERACTION_TYPES,
  DESIGN_PATTERN_IDS,
  auditPremiumValidation,
  composePremiumValidationArtifact,
  creDesignContext,
  defaultPublicValidationQualityTarget,
  designPatternReferenceLibrary,
  emptyPatternPerformanceProfile,
  evaluateVisualNecessity,
  generateCrePremiumSuccessor,
  validateCrePremiumSuccessorIsolated,
  inspectCreativeImageGenerateCapability,
  mayClaimPatternSuperiority,
  planCreativeAssets,
  planPublicVentureComposition,
  produceVentureDesignDirection,
  produceVentureDesignTokens,
  publicVentureInteractionRegistry,
  publicVentureSectionRegistry,
  publicVentureVisualizationRegistry,
  selectDesignArchetype,
} from "../index";

const ROOT = join(process.cwd());

describe("PREMIUM PUBLIC VENTURE DESIGN INTELLIGENCE + REUSABLE FRAMEWORK V1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetExecutableBuildRuntime();
    resetExperimentRuntime();
    resetCurrentCreValidationArtifactIdCache();
    activateValidationGradeSuccessorPublicArtifact();
  });

  it("adds PREMIUM_VALIDATION_READY as a global quality state with a structural gate", () => {
    expect(PUBLIC_VENTURE_DESIGN_INTELLIGENCE).toBe("PublicVentureDesignIntelligence");
    expect(defaultPublicValidationQualityTarget()).toBe("PREMIUM_AUTHORITY_VALIDATION_READY");
    expect(defaultPublicValidationQualityTarget(true)).toBe("VALIDATION_GRADE_READY");
    expect(SECTION_TYPES).toEqual(expect.arrayContaining(["HERO", "PRODUCT_PREVIEW", "PRICING", "FORM", "FOOTER"]));
    expect(VISUALIZATION_TYPES.length).toBeGreaterThanOrEqual(8);
    expect(INTERACTION_TYPES).toContain("CTA_HOVER");
    expect(DESIGN_PATTERN_IDS).toContain("PRODUCT_FIRST_VISUALIZATION");
    expect(designPatternReferenceLibrary().every((item) => item.copiedSourceHtml === false)).toBe(true);
  });

  it("produces market-appropriate design direction and tokens", () => {
    const cre = creDesignContext();
    expect(selectDesignArchetype(cre)).toBe("FINANCIAL_B2B_ANALYTICAL");
    const direction = produceVentureDesignDirection(cre);
    expect(direction.visualTone).toMatch(/analytical|restrained|premium/i);
    expect(direction.visualTone).not.toMatch(/neon|holographic|mission-control/i);
    const tokens = produceVentureDesignTokens(cre);
    expect(tokens.color.accent).toBe("#1d4e78");
    expect(produceVentureDesignDirection({ ...cre, ventureCategory: "healthcare clinic software" }).designArchetype).toBe(
      "HEALTHCARE_CALM_CREDIBLE",
    );
    expect(produceVentureDesignTokens({ ...cre, ventureCategory: "healthcare clinic software" }).color.bg).not.toBe(tokens.color.bg);
    expect(publicVentureSectionRegistry().HERO.reusable).toBe(true);
    expect(publicVentureVisualizationRegistry().PRODUCT_UI_FRAME.preferredMedium).toBe("DETERMINISTIC_UI");
    expect(publicVentureInteractionRegistry().SCROLL_REVEAL.reducedMotionSafe).toBe(true);
  });

  it("plans composition without random order and prefers product visualization", () => {
    const composition = planPublicVentureComposition(creDesignContext());
    expect(composition.random).toBe(false);
    expect(composition.heroVariant).toBe("PRODUCT_SPLIT_HERO");
    expect(composition.sections.map((item) => item.sectionType).slice(0, 3)).toEqual(["HERO", "WORKFLOW", "PRODUCT_PREVIEW"]);
    expect(composition.aboveFold).toEqual(expect.arrayContaining(["what this is", "product visualization"]));
    expect(composition.visualizations).toContain("PRODUCT_UI_FRAME");
    const assets = planCreativeAssets({ context: creDesignContext(), composition });
    expect(evaluateVisualNecessity(creDesignContext()).visualNecessity).toBe("USEFUL");
    expect(assets.items.some((item) => item.generationMethod === "DETERMINISTIC_UI")).toBe(true);
    expect(assets.items.some((item) => item.generationMethod === "NO_EXTERNAL_IMAGE_REQUIRED")).toBe(true);
    expect(inspectCreativeImageGenerateCapability().capability).toBe("creative.image.generate");
    const profile = emptyPatternPerformanceProfile("FOCUSED_HERO", "HERO");
    expect(profile.confidence).toBe("INSUFFICIENT");
    expect(mayClaimPatternSuperiority(profile)).toBe(false);
  });

  it("fails the current CRE validation-grade artifact on premium and does not mutate it", async () => {
    const current = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    expect(current.artifact?.artifactId).toBe(VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID);
    const grade = auditPremiumValidation(current.artifact?.files ?? []);
    expect(grade.validationGrade).toBe("PASS");
    expect(grade.premiumOverall).toBe("FAIL");
    expect(grade.classification).toBe("VALIDATION_GRADE_READY");
    expect((current.artifact?.files ?? []).some((file) => /vg-hero|<Hero/.test(file.content))).toBe(true);
  });

  it("generates an immutable CRE premium successor that preserves experiment contracts", async () => {
    const successor = await generateCrePremiumSuccessor();
    expect(successor.artifactId).not.toBe(VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID);
    expect(successor.predecessorArtifactId).toBe(VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID);
    expect(successor.repairReason).toBe("PREMIUM_PUBLIC_VENTURE_DESIGN_AND_CREATIVE_MEDIA_UPGRADE");
    expect(successor.immutable).toBe(true);
    expect(successor.oldArtifact.mutated).toBe(false);
    expect(successor.oldArtifact.premiumValidation).toBe("FAIL");
    expect(successor.quality.premiumOverall).toBe("PASS");
    expect(successor.quality.classification).toBe("PREMIUM_VALIDATION_READY");
    expect(successor.quality.copiedSourceDesigns).toBe("NO");
    expect(successor.quality.fakeCustomers).toBe("NO");
    expect(successor.quality.fakeProductState).toBe("NO");
    expect(successor.quality.premiumLooksBooleanPresent).toBe("NO");
    const landing = successor.files.find((file) => file.path === "app/page.tsx")?.content ?? "";
    expect(landing).toContain("$290 / year");
    expect(landing).toContain("$149 / deal");
    expect(landing).toContain("Request Pilot Access");
    expect(landing).toContain("Illustrative sample");
    expect(landing).toContain("not generally available");
    expect(landing).toContain("data-section-type");
    expect(landing).not.toMatch(/testimonial|trusted by|customers already/i);
    expect(successor.files.some((file) => file.path === "app/early-access/page.tsx" && file.content.includes("workEmail"))).toBe(true);
    expect(successor.files.some((file) => file.path === "components/venture-footer.tsx" && file.content.includes("An Infinity OS Venture"))).toBe(true);
    expect(evaluateSecretSafety(successor.files).status).toBe("PASS");
    expect(successor.secretScan).toBe("PASS");
    expect(successor.deployed).toBe(false);
    expect(successor.nextExternalRequirement).toBe("NEW_FOUNDER_PREMIUM_SUCCESSOR_DEPLOYMENT_AUTHORIZATION_REQUIRED");
    expect(successor.command.recentEvents.some((event) => event.schema === "MISSION_ACTIVITY_EVENT_V1")).toBe(true);
    expect(successor.command.recentEvents.some((event) => event.stepType === "DESIGN_INTELLIGENCE")).toBe(true);
    expect(successor.command.recentEvents.some((event) => event.stepType === "GENERATE_PREMIUM_ARTIFACT")).toBe(true);
    expect(successor.command.recentEvents.every((event) => event.executionClass === "VENTURE_EXECUTION")).toBe(true);
    const evidence = inspectRealMarketEvidence({ now: new Date("2026-08-29T16:00:00.000Z") });
    expect(evidence.experiment.artifactId).toBe(VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID);
    expect(evidence.experiment.state).toBe("COLLECTING");
    expect(evidence.clock.evidenceStart).toBe(CANONICAL_EVIDENCE_START);
    expect(evidence.clock.deadline).toBe("2026-09-12T15:18:52.131Z");
    expect(evidence.clock.restarted).toBe(false);
    expect(evidence.decision.currentDecision).toBe("VALIDATE");
    expect(evidence.decision.buildReady).toBe(false);
    expect(evidence.experiment.experimentId).toBe(LOCKED_CRE_EXPERIMENT_ID);
    const dashboard = readFileSync(join(ROOT, "app/dashboard/page.tsx"), "utf8");
    const money = readFileSync(join(ROOT, "components/dashboard/operator-console/artifacts/hq-output-detail.tsx"), "utf8");
    expect(dashboard).toContain("InfinityHqExperience");
    expect(money).toContain('money: "Money"');
    const composed = composePremiumValidationArtifact({
      context: creDesignContext(),
      files: successor.files,
      artifactId: successor.artifactId,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      ventureId: "candidate:" + CRE_CANDIDATE_ID,
      candidateId: CRE_CANDIDATE_ID,
      predecessorArtifactId: VALIDATION_GRADE_SUCCESSOR_ARTIFACT_ID,
    });
    expect(composed.files.some((file) => file.path === "components/premium-venture.tsx")).toBe(true);
  });

  it("runs isolated install and production build for the premium successor", async () => {
    const isolated = await validateCrePremiumSuccessorIsolated();
    expect(isolated.npmCi).toBe("PASS");
    expect(isolated.typescript === "PASS" || isolated.typescript === "NOT_APPLICABLE").toBe(true);
    expect(isolated.productionBuild).toBe("PASS");
    expect(isolated.successor.quality.premiumOverall).toBe("PASS");
  }, 180_000);
});
