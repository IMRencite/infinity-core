import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CANONICAL_EVIDENCE_START,
  CONTEXT_RICH_CONSULTATIVE_OUTREACH_OPTIMIZATION_V1,
  CRE_CONTEXT_RICH_OUTREACH_OPTIMIZATION_READY,
  CURRENT_PROCESS_QUESTION_LIBRARY,
  GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_REQUIRED,
  GROUNDED_CHALLENGER_FIXTURE,
  NO_LINK_FIRST_TOUCH,
  PRIMARY_FIRST_TOUCH_CTA,
  SUBJECT_CANDIDATES,
  challengerCohortDesign,
  consultativeReplyPolicyMap,
  contextRichChallengerVariants,
  evaluateConsultativeOutreachMessageQuality,
  evaluateConsultativeOutreachProspectEligibility,
  executeContextRichConsultativeOutreachOptimization,
  inspectHistoricalWave1Preservation,
} from "../context-rich-consultative-outreach-optimization";
import {
  CALEB_PROSPECT_ID,
  MICHAEL_PROSPECT_ID,
} from "@/lib/infinity/inbound-communication-runtime/constants";
import {
  CONSULTATIVE_OUTREACH_STRUCTURE_KEYS,
  inspectOutreachVariantSupport,
} from "@/lib/infinity/inbound-communication-runtime/outreach-variants";
import { forcedStageProgression, inferValidationSignals } from "@/lib/infinity/inbound-communication-runtime/conversation-stage";
import { routineEmailRequiresFounderApproval } from "@/lib/infinity/inbound-communication-runtime/autonomous-policy";
import { inspectExperimentClock } from "../experiment-clock";
import { inspectRealMarketEvidence } from "../real-market-evidence";
import { instrumentedRuntimeRegistry } from "@/lib/infinity/mission-activity/runtime-contract";
import { resetMissionActivityStore } from "@/lib/infinity/mission-activity/store";
import {
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  LOCKED_CRE_EXPERIMENT_ID,
} from "../constants";

describe("CONTEXT_RICH_CONSULTATIVE_OUTREACH_OPTIMIZATION_V1", () => {
  it("freezes a four-block challenger strategy, fail-closed eligibility, and HQ READY_BLOCKED without sending", async () => {
    resetMissionActivityStore();
    const wave1Before = readFileSync(".infinity/market-validation/cre-wave-1-outreach-state.json", "utf8");
    const inboundBefore = readFileSync(".infinity/communication/inbound-runtime-state.json", "utf8");
    const variants = contextRichChallengerVariants();
    const qualities = variants.map((variant) =>
      evaluateConsultativeOutreachMessageQuality({
        variant,
        company: GROUNDED_CHALLENGER_FIXTURE.verifiedCompany,
      }),
    );
    const fabricated = evaluateConsultativeOutreachMessageQuality({
      variant: {
        ...variants[0],
        reasonForContact: "I saw you lost the Acme deal last week.",
        fullMessage: `${variants[0].context}\nI saw you lost the Acme deal last week.\n${variants[0].currentProcessQuestion}`,
      },
      company: GROUNDED_CHALLENGER_FIXTURE.verifiedCompany,
    });
    const unsupported = evaluateConsultativeOutreachMessageQuality({
      variant: {
        ...variants[0],
        lightSolutionFrame: "We are the market leader and already used by customers.",
        fullMessage: `${variants[0].fullMessage}\nWe are the market leader and already used by customers.`,
      },
      company: GROUNDED_CHALLENGER_FIXTURE.verifiedCompany,
    });
    const eligible = evaluateConsultativeOutreachProspectEligibility({
      name: "Alex Rivera",
      company: "Harbor Occupier Advisors",
      role: "tenant-representation broker",
      email: "alex.rivera@harboroccupier.test",
      personaFit: true,
      identityConfidence: "PASS",
      emailEvidence: "PASS",
      currentRoleExplicit: "YES",
      suppressed: false,
      cooldownUntil: null,
      duplicate: false,
      existingConversation: false,
      historicalWave1Sent: false,
      inferredEmail: false,
    });
    const caleb = evaluateConsultativeOutreachProspectEligibility({
      name: "Caleb Struewing",
      company: "JLL",
      role: "tenant-representation broker",
      email: "caleb.struewing@jll.com",
      personaFit: true,
      identityConfidence: "PASS",
      emailEvidence: "PASS",
      currentRoleExplicit: "YES",
      suppressed: false,
      cooldownUntil: "2026-09-16T17:16:03.829Z",
      duplicate: true,
      existingConversation: true,
      historicalWave1Sent: true,
      inferredEmail: false,
    });
    const missing = evaluateConsultativeOutreachProspectEligibility({
      name: "",
      company: "",
      role: "",
      email: null,
      personaFit: false,
      identityConfidence: "FAIL",
      emailEvidence: "FAIL",
      currentRoleExplicit: "NO",
      suppressed: false,
      cooldownUntil: null,
      duplicate: false,
      existingConversation: false,
      historicalWave1Sent: false,
      inferredEmail: true,
    });
    const suppressed = evaluateConsultativeOutreachProspectEligibility({
      name: "Alex Rivera",
      company: "Harbor Occupier Advisors",
      role: "tenant-representation broker",
      email: "alex.rivera@harboroccupier.test",
      personaFit: true,
      identityConfidence: "PASS",
      emailEvidence: "PASS",
      currentRoleExplicit: "YES",
      suppressed: true,
      cooldownUntil: null,
      duplicate: false,
      existingConversation: false,
      historicalWave1Sent: false,
      inferredEmail: false,
    });

    expect(CONSULTATIVE_OUTREACH_STRUCTURE_KEYS).toEqual([
      "CONTEXT",
      "REASON_FOR_CONTACT",
      "LIGHT_SOLUTION_FRAME",
      "CURRENT_PROCESS_QUESTION",
    ]);
    expect(variants).toHaveLength(4);
    expect(new Set(variants.map((row) => row.strategicVariation)).size).toBe(4);
    expect(new Set(variants.map((row) => row.fullMessage)).size).toBe(4);
    expect(qualities.every((row) => row.overall === "PASS")).toBe(true);
    expect(qualities.every((row) => row.unsupportedClaims === 0)).toBe(true);
    expect(qualities.every((row) => row.fabricatedPersonalization === 0)).toBe(true);
    expect(qualities.every((row) => row.siteLinkPolicy === "PASS")).toBe(true);
    expect(qualities.every((row) => row.firstTouchCta === "PASS")).toBe(true);
    expect(qualities.every((row) => row.brevity === "PASS")).toBe(true);
    expect(fabricated.overall).toBe("FAIL");
    expect(fabricated.fabricatedPersonalization).toBe(1);
    expect(unsupported.overall).toBe("FAIL");
    expect(unsupported.unsupportedClaims).toBe(1);
    expect(CURRENT_PROCESS_QUESTION_LIBRARY.length).toBeGreaterThanOrEqual(6);
    expect(SUBJECT_CANDIDATES).toHaveLength(6);
    expect(NO_LINK_FIRST_TOUCH).toBe("NO_LINK_FIRST_TOUCH");
    expect(PRIMARY_FIRST_TOUCH_CTA).toBe("CURRENT_PROCESS_QUESTION");

    expect(eligible.overall).toBe("PASS");
    expect(eligible.failClosed).toBe(true);
    expect(caleb.overall).toBe("FAIL");
    expect(caleb.duplicatePrevention).toBe("FAIL");
    expect(caleb.existingConversation).toBe("FAIL");
    expect(caleb.cooldown).toBe("FAIL");
    expect(missing.overall).toBe("FAIL");
    expect(missing.missingCriticalEvidence).toBe("FAIL");
    expect(suppressed.suppression).toBe("FAIL");
    expect([CALEB_PROSPECT_ID, MICHAEL_PROSPECT_ID]).toHaveLength(2);

    const replies = consultativeReplyPolicyMap();
    expect(replies).toHaveLength(13);
    expect(replies.every((row) => row.founderApprovalRequired === false && row.sendInThisMilestone === false)).toBe(true);
    expect(replies.find((row) => row.intent === "MEETING_REQUEST")?.action).toBe("ROUTE_TO_GOVERNED_SYSTEM");
    expect(replies.find((row) => row.intent === "OPT_OUT")?.action).toBe("AUTO_EXECUTE");
    expect(replies.find((row) => row.intent === "BOUNCE")?.action).toBe("NO_REPLY");
    expect(routineEmailRequiresFounderApproval()).toBe(false);
    expect(forcedStageProgression()).toBe(false);
    expect(inferValidationSignals({ inboundText: "Today we build a spreadsheet model", stage: "CURRENT_PROCESS" })).toContain(
      "CURRENT_PROCESS_DISCLOSURE",
    );
    expect(challengerCohortDesign().statisticallyConclusive).toBe(false);
    expect(inspectOutreachVariantSupport().wave2ReadyToUseContextRichVariant).toBe(false);

    const result = await executeContextRichConsultativeOutreachOptimization();
    const historical = inspectHistoricalWave1Preservation();
    expect(result.mission).toBe(CONTEXT_RICH_CONSULTATIVE_OUTREACH_OPTIMIZATION_V1);
    expect(historical.strategy).toBe("MINIMAL_DISCOVERY");
    expect(historical.sent).toBe(2);
    expect(historical.attemptsPreserved).toBe("PASS");
    expect(historical.conversationsPreserved).toBe("PASS");
    expect(result.historicalUnchanged).toBe(true);
    expect(readFileSync(".infinity/market-validation/cre-wave-1-outreach-state.json", "utf8")).toBe(wave1Before);
    expect(readFileSync(".infinity/communication/inbound-runtime-state.json", "utf8")).toBe(inboundBefore);
    expect(result.record.messagesSentThisMission).toBe(0);
    expect(result.record.wave2Started).toBe(false);
    expect(result.record.executionStarted).toBe(false);
    expect(result.record.siteLinkPolicy).toBe("NO_LINK_FIRST_TOUCH");
    expect(result.record.passingVariants).toBe(4);
    expect(result.record.nextState).toBe(CRE_CONTEXT_RICH_OUTREACH_OPTIMIZATION_READY);
    expect(result.record.nextBlocker).toBe(GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_REQUIRED);
    expect(result.hq.projection).toBe("PASS");
    expect(result.hq.command).toBe("ACTIVE_WORK");
    expect(result.hq.growthNexus).toBe("ACTIVE_WORK");
    expect(result.hq.researchGrid).toBe("ACTIVE_WORK");
    expect(result.hq.systemsArchitect).toBe("ACTIVE_WORK");
    expect(result.hq.validationStation).toBe("ACTIVE_WORK");
    expect(result.hq.deploymentDepot).toBe("PRESENT_IDLE");
    expect(result.hq.creationLab).toBe("PRESENT_IDLE");
    expect(result.hq.endingState).toBe("READY_BLOCKED");
    expect(result.hq.authorizationRequired).toBe(GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_REQUIRED);
    expect(result.hq.active).toBe(0);
    expect(result.hq.infinityDecisionCore).toBe("READY_BLOCKED");
    expect(result.experiment.id).toBe(LOCKED_CRE_EXPERIMENT_ID);
    expect(result.experiment.state).toBe("COLLECTING");
    expect(result.experiment.evidenceStart).toBe(CANONICAL_EVIDENCE_START);
    expect(result.experiment.clockRestarted).toBe(false);
    expect(result.experiment.evidenceReset).toBe(false);
    expect(inspectExperimentClock().restarted).toBe(false);
    expect(inspectRealMarketEvidence().experiment.state).toBe("COLLECTING");
    expect(result.observer.status).toBe("RUNNING");
    expect(result.observer.tracked).toBe(2);
    expect(result.observer.duplicateProcessing).toBe(0);
    expect(result.observer.mailboxHistoryReset).toBe(false);
    expect(result.externalActions).toEqual({
      newOutreach: 0,
      realRecipientsContacted: 0,
      deployments: 0,
      activations: 0,
      wave2: 0,
      dns: 0,
      domains: 0,
      payments: 0,
    });
    expect(result.acceptedArtifactUnchanged).toBe(true);
    expect(result.record.artifactId).toBe(CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID);
    expect(result.publiclyLaunched).toBe(false);
    expect(instrumentedRuntimeRegistry().runtimes.ContextRichConsultativeOutreachOptimizationRuntime.usesMissionWrapper).toBe(true);
  });
});
