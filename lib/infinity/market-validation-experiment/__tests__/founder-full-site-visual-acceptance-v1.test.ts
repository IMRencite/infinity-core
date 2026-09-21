import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
  DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_URL,
  LOCKED_CRE_EXPERIMENT_ID,
} from "../constants";
import { isCreValidationArtifactId } from "../current-cre-artifact";
import { inspectExperimentClock } from "../experiment-clock";
import {
  CONTEXT_RICH_CONSULTATIVE_OUTREACH_OPTIMIZATION_V1,
  CLOSED_VISUAL_REPAIR_CLASSES,
  executeFounderFullSiteVisualAcceptance,
  FOUNDER_FULL_SITE_VISUAL_REVIEW_ACCEPTED,
  FOUNDER_PHYSICAL_FULL_SITE_VISUAL_ACCEPTANCE_AND_OUTREACH_UNLOCK_V1,
  historicalFirstTouchSent,
  inspectAcceptedHqDecisionCoreBaseline,
  inspectFounderFullSiteVisualAcceptance,
  inspectOutreachOptimizationUnlock,
  PHYSICAL_BROWSER_VISUAL_REVIEW,
} from "../founder-full-site-visual-acceptance";
import { inspectOutreachVariantSupport } from "@/lib/infinity/inbound-communication-runtime/outreach-variants";
import { instrumentedRuntimeRegistry } from "@/lib/infinity/mission-activity/runtime-contract";
import { resetMissionActivityStore } from "@/lib/infinity/mission-activity/store";
import { VISUAL_EVIDENCE_PRECEDENCE } from "@/lib/infinity/venture-website-architecture/public-authority-standard/constants";

describe("FOUNDER PHYSICAL FULL-SITE VISUAL ACCEPTANCE + OUTREACH UNLOCK V1", () => {
  it("persists founder physical acceptance, closes the visual blocker, and unlocks outreach optimization without starting it", async () => {
    resetMissionActivityStore();
    const wave1Before = readFileSync(".infinity/market-validation/cre-wave-1-outreach-state.json", "utf8");
    const result = await executeFounderFullSiteVisualAcceptance();
    const acceptance = inspectFounderFullSiteVisualAcceptance();
    const unlock = inspectOutreachOptimizationUnlock();
    const hqCore = inspectAcceptedHqDecisionCoreBaseline();
    const variants = inspectOutreachVariantSupport();
    const registry = instrumentedRuntimeRegistry();

    expect(result.mission).toBe(FOUNDER_PHYSICAL_FULL_SITE_VISUAL_ACCEPTANCE_AND_OUTREACH_UNLOCK_V1);
    expect(acceptance.persisted).toBe(true);
    expect(acceptance.record?.founderReview).toBe("PASS");
    expect(acceptance.record?.acceptanceType).toBe(PHYSICAL_BROWSER_VISUAL_REVIEW);
    expect(acceptance.record?.artifactId).toBe(CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID);
    expect(acceptance.record?.digest).toBe(CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST);
    expect(acceptance.record?.deploymentId).toBe(DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_DEPLOYMENT_ID);
    expect(acceptance.record?.url).toBe(DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_URL);
    expect(acceptance.visualBlocker).toBe("CLEARED");
    expect(acceptance.canonicalReadback).toBe("PASS");
    expect(acceptance.publiclyLaunched).toBe(false);
    expect(acceptance.founderEvidencePrecedence).toBe("APPLY");
    expect(VISUAL_EVIDENCE_PRECEDENCE[0]).toBe("FOUNDER_PHYSICAL_BROWSER_EVIDENCE");
    expect(isCreValidationArtifactId(CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID)).toBe(true);

    expect(result.qualityBaseline.routes).toBe(93);
    expect(result.qualityBaseline.answerChunks).toBe(400);
    expect(result.qualityBaseline.RenderedLinkContrastGate).toBe("PASS");
    expect(result.qualityBaseline.RenderedTextContrastGate).toBe("PASS");
    expect(result.qualityBaseline.RenderedMutedTextContrastGate).toBe("PASS");
    expect(result.qualityBaseline.HubQuestionBoardLayoutGate).toBe("PASS");
    expect(result.qualityBaseline.SemanticNavigationBreakoutLayoutGate).toBe("PASS");
    expect(result.qualityBaseline.trustedSources).toBe("PASS");
    expect(result.qualityBaseline.pricing).toBe("PASS");
    expect(result.qualityBaseline.humanFirst).toBe("PASS");
    expect(result.qualityBaseline.seo).toBe("PASS");
    expect(result.qualityBaseline.geo).toBe("PASS");
    expect(acceptance.record?.closedVisualRepairClasses).toEqual([...CLOSED_VISUAL_REPAIR_CLASSES]);
    expect(acceptance.record?.howItWorks.fiveCards).toBe("3 + 2");
    expect(acceptance.record?.howItWorks.scrunched).toBe("ABSENT");

    expect(hqCore.pass).toBe(true);
    expect(hqCore.primaryShape).toBe("INFINITY_SYMBOL");
    expect(hqCore.circularCore).toBe(false);
    expect(result.hq.infinityDecisionCore).toBe("PASS");
    expect(result.hq.missionRuntimeBinding).toBe("PASS");
    expect(result.hq.active).toBe(0);
    expect(result.hq.currentExecution).toBe("NONE");

    expect(result.experiment.id).toBe(LOCKED_CRE_EXPERIMENT_ID);
    expect(result.experiment.state).toBe("COLLECTING");
    expect(result.experiment.clockRestarted).toBe(false);
    expect(result.experiment.evidenceChanged).toBe(false);
    expect(inspectExperimentClock().restarted).toBe(false);

    expect(result.observer.status).toBe("RUNNING");
    expect(result.observer.tracked).toBe(2);
    expect(result.observer.duplicateProcessing).toBe(0);

    expect(unlock.unlockedMilestone).toBe(CONTEXT_RICH_CONSULTATIVE_OUTREACH_OPTIMIZATION_V1);
    expect(unlock.unlocked).toBe(true);
    expect(unlock.started).toBe(false);
    expect(unlock.wave2Started).toBe(false);
    expect(unlock.domainCommercializationStarted).toBe(false);
    expect(unlock.historicalVariant).toBe("MINIMAL_DISCOVERY");
    expect(unlock.historicalSent).toBe(2);
    expect(historicalFirstTouchSent()).toBe(2);
    expect(unlock.structure).toEqual([
      "CONTEXT",
      "REASON FOR CONTACT",
      "LIGHT SOLUTION FRAME",
      "CURRENT-PROCESS QUESTION",
    ]);
    expect(unlock.messagesSentThisMission).toBe(0);
    expect(variants.wave2ReadyToUseContextRichVariant).toBe(false);
    expect(readFileSync(".infinity/market-validation/cre-wave-1-outreach-state.json", "utf8")).toBe(wave1Before);

    expect(result.externalActions).toEqual({
      deployments: 0,
      activations: 0,
      outreach: 0,
      wave2: 0,
      dns: 0,
      domains: 0,
      payments: 0,
    });
    expect(result.publiclyLaunched).toBe(false);
    expect(result.nextState).toBe(FOUNDER_FULL_SITE_VISUAL_REVIEW_ACCEPTED);
    expect(result.nextEngineeringMilestone).toBe(CONTEXT_RICH_CONSULTATIVE_OUTREACH_OPTIMIZATION_V1);
    expect(registry.runtimes.FounderFullSiteVisualAcceptanceRuntime.usesMissionWrapper).toBe(true);
    expect(registry.contracts.FounderFullSiteVisualAcceptanceRuntime.missionType).toBe(
      FOUNDER_PHYSICAL_FULL_SITE_VISUAL_ACCEPTANCE_AND_OUTREACH_UNLOCK_V1,
    );
  });
});
