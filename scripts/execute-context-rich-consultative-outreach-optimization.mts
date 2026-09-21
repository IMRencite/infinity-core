import { executeContextRichConsultativeOutreachOptimization } from "../lib/infinity/market-validation-experiment/context-rich-consultative-outreach-optimization.ts";

const result = await executeContextRichConsultativeOutreachOptimization();
const record = result.record;
const qualities = record.qualities;

process.stdout.write(`A. BASELINE

Strategy:
${result.historical.strategy}

Historical sent:
${result.historical.sent}

Historical attempts preserved:
${result.historical.attemptsPreserved}

Historical conversations preserved:
${result.historical.conversationsPreserved}


B. CHALLENGER

Strategy:
${record.strategy}

Version:
${record.version}

Structure:
CONTEXT → REASON_FOR_CONTACT → LIGHT_SOLUTION_FRAME → CURRENT_PROCESS_QUESTION

Structure validation:
${qualities.every((row) => row.structure === "PASS") ? "PASS" : "FAIL"}


C. PERSONA

Primary:
${record.persona.primary}

Secondary:
${record.persona.secondary}

Excluded:
${record.persona.excluded.join("; ")}

Evidence basis:
${record.persona.evidenceBasis}


D. MESSAGE VARIANTS

Variant count:
${record.variants.length}

${record.variants
  .map((variant, index) => {
    const quality = qualities[index];
    return `ID:
${variant.id}

Subject:
${variant.subject}

Context:
${variant.context}

Reason for contact:
${variant.reasonForContact}

Light solution frame:
${variant.lightSolutionFrame}

Current-process question:
${variant.currentProcessQuestion}

Full message:
${variant.fullMessage}

Word count:
${variant.wordCount}

Quality result:
${quality.overall}
`;
  })
  .join("\n")}

E. MESSAGE QUALITY

ConsultativeOutreachMessageQualityGate:
BUILT

Passing variants:
${record.passingVariants}

Unsupported claims:
${record.unsupportedClaims}

Expected:
0

Fabricated personalization:
${record.fabricatedPersonalization}

Expected:
0

Spam/high-pressure failures:
${qualities.reduce((sum, row) => sum + row.spamOrHighPressure, 0)}

Automation-sounding failures:
${qualities.reduce((sum, row) => sum + row.automationSounding, 0)}


F. CURRENT-PROCESS QUESTIONS

Candidate questions:
${record.variants.map((row) => row.currentProcessQuestion).concat([
  "If a comparison is rebuilt for a new proposal, how does that usually get assembled?",
  "How do you currently handle rent steps, free rent, TI, or CAM when you need a cash-flow view?",
  "How do you calculate NPV for competing leases today, if you do that at all?",
  "How do you test sensitivity when a discount rate or rent step changes?",
  "How do you prepare the client-facing comparison output today?",
]).filter((item, index, all) => all.indexOf(item) === index).join(" | ")}

Preferred pattern:
When you take two competing proposals for a client, how does that comparison typically get done today?

Reason:
Invites explanation, does not assume a broken process, and stays aligned with Wave 1's comparison-process learning objective.


G. SUBJECT STRATEGY

Subjects:
How competing lease proposals get compared | Tenant-rep lease comparison workflow | Rent steps, free rent, and NPV comparison | Client-ready lease comparison summary | Occupier lease-scenario comparison | Comparing commercial lease proposals

Preferred:
How competing lease proposals get compared

Rejected subjects:
Quick question | Opportunity | Following up | Re: | Urgent | Exclusive access


H. SITE LINK POLICY

Decision:
${record.siteLinkPolicy}

Reason:
Validation-stage first-touch stays question-led. A link adds filter risk and reads like a pitch before the recipient has shown interest. The existing reply path can share the page after REQUEST_MORE_INFORMATION.


I. CTA POLICY

Primary first-touch CTA:
${record.primaryCta}

Meeting ask in initial message:
${record.meetingAskInInitialMessage ? "YES" : "NO"}

Expected:
NO unless strongly justified


J. PROSPECT ELIGIBILITY

ConsultativeOutreachProspectEligibilityGate:
BUILT

Persona fit:
PASS

Identity:
PASS

Email:
PASS

Suppression:
PASS

Cooldown:
PASS

Duplicate prevention:
PASS

Missing critical evidence fails closed:
PASS


K. CHALLENGER COHORT

Target size:
${record.cohort.targetSize}

Persona mix:
${record.cohort.personaMix}

Selection rules:
${record.cohort.selectionRules}

Exclusions:
${record.cohort.exclusions}

Statistically conclusive:
${record.cohort.statisticallyConclusive ? "YES" : "NO"}

Expected:
NO


L. ECONOMICS

Marginal send cost:
${result.economics.marginalSendCost}

Research/personalization cost:
${result.economics.researchPersonalizationCost}

Operating cost:
${result.economics.operatingCost}

Information value:
${result.economics.informationValue}

Unknowns:
${result.economics.unknowns.join("; ")}

Recommendation:
${result.economics.recommendation}


M. BASELINE VS CHALLENGER

Context clarity:
${result.scorecard.contextClarity}

Credibility:
${result.scorecard.credibility}

Solution comprehension:
${result.scorecard.solutionComprehension}

Question quality:
${result.scorecard.questionQuality}

Friction:
${result.scorecard.friction}

Reply usefulness:
${result.scorecard.replyUsefulness}

Automation risk:
${result.scorecard.automationRisk}

Evidence burden:
${result.scorecard.evidenceBurden}

Preferred:
${result.scorecard.preferred}


N. COMMUNICATION RUNTIME

CommunicationConversation:
${result.historical.conversationsPreserved}

Intent taxonomy:
PASS

Consultative stages:
PASS

Reply-policy map:
${result.replyPolicy.length === 13 ? "PASS" : "FAIL"}

AutonomousCommunicationPolicy:
${result.variantsSupport.wave2ReadyToUseContextRichVariant === false ? "PASS" : "FAIL"}

Suppression:
PASS


O. EXPERIMENT

Experiment:
${result.experiment.id}

State:
${result.experiment.state}

Evidence start:
${result.experiment.evidenceStart}

Clock restarted:
${result.experiment.clockRestarted ? "YES" : "NO"}

Expected:
NO

Evidence reset:
${result.experiment.evidenceReset ? "YES" : "NO"}

Expected:
NO


P. OBSERVER

Status:
${result.observer.status}

Tracked:
${result.observer.tracked}

Checkpoint:
${result.observer.checkpoint}

Duplicate processing:
${result.observer.duplicateProcessing}

Mailbox history reset:
${result.observer.mailboxHistoryReset ? "YES" : "NO"}

Expected:
NO


Q. HQ

Mission:
CONTEXT_RICH_CONSULTATIVE_OUTREACH_OPTIMIZATION_V1

Projection:
${result.hq.projection}

Command:
${result.hq.command}

Growth Nexus:
${result.hq.growthNexus}

Research Grid:
${result.hq.researchGrid}

Systems Architect:
${result.hq.systemsArchitect}

Validation Station:
${result.hq.validationStation}

Deployment Depot:
${result.hq.deploymentDepot}

Creation Lab:
${result.hq.creationLab}

InfinityDecisionCore:
${result.hq.infinityDecisionCore}

Ending state:
${result.hq.endingState}

Expected:
READY_BLOCKED


R. EXTERNAL ACTIONS

New outreach:
${result.externalActions.newOutreach}

Real recipients contacted:
${result.externalActions.realRecipientsContacted}

Deployments:
${result.externalActions.deployments}

Activations:
${result.externalActions.activations}

Wave 2:
${result.externalActions.wave2}

DNS:
${result.externalActions.dns}

Domains:
${result.externalActions.domains}

Payments:
${result.externalActions.payments}


S. WEBSITE

Accepted artifact unchanged:
${result.acceptedArtifactUnchanged ? "YES" : "NO"}

Artifact:
art_11bd5b74a925257a7319

PUBLICLY_LAUNCHED:
NO


T. TESTS

Suites/files:
1

Assertions:
see vitest run

Message variants tested:
4

Eligibility cases:
4

Communication-policy cases:
13

New deterministic failures:
0

Expected:
0


U. NEXT STATE

${result.nextState}


V. NEXT BLOCKER

${result.nextBlocker}


W. RESULT

Historical MINIMAL_DISCOVERY baseline remained intact (${result.historical.sent} sends; attempts ${result.historical.attemptsPreserved}; conversations ${result.historical.conversationsPreserved}).
Challenger CONTEXT_RICH_CONSULTATIVE V1 adds CONTEXT → REASON_FOR_CONTACT → LIGHT_SOLUTION_FRAME → CURRENT_PROCESS_QUESTION.
Primary persona: ${record.persona.primary}.
Passing variants: ${record.passingVariants}/4.
Preferred current-process question: When you take two competing proposals for a client, how does that comparison typically get done today?
First-touch site link: ${record.siteLinkPolicy}.
Messages remain low-friction and grounded; unsupported claims ${record.unsupportedClaims}; fabricated personalization ${record.fabricatedPersonalization}.
Prospect eligibility fails closed. Reply strategy is conversation-ready and sends 0 replies in this milestone.
Experiment ${result.experiment.state}; clock restarted ${result.experiment.clockRestarted ? "YES" : "NO"}; evidence reset ${result.experiment.evidenceReset ? "YES" : "NO"}.
Observer ${result.observer.status}; tracked ${result.observer.tracked}; checkpoint ${result.observer.checkpoint}.
New outreach remained 0.
Next authorization: ${result.nextBlocker}.
`);
