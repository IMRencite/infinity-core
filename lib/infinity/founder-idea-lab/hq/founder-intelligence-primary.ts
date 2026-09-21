import type { InspectorSection } from "@/lib/infinity/operator-console/artifacts/inspector-types";
import { namedInspectorRow } from "@/lib/infinity/operator-console/details/insight-metrics";
import { commandDeckInspectorSection } from "@/lib/infinity/venture-intelligence/hq-sections";
import { fromFounderIdea } from "@/lib/infinity/venture-intelligence/adapters/from-founder-idea";
import { buildFounderFriendlyBrief, type FounderFriendlyBrief } from "../explainability/founder-brief";
import type { FounderIntelligenceFrontView } from "../explainability/view";
import { compactIntelligenceMoneySection } from "./founder-money-sections";
import { differentiatorTypeLabel } from "../product-advantage/language";
import { BUILD_PLAN_AUTHORITY } from "../build-plan/types";

export const FOUNDER_FRIENDLY_PRIMARY_SECTION_IDS = [
  "venture-command-deck",
  "infinity-take",
  "why-this-could-win",
  "customer-problems-product-advantage",
  "what-we-should-build-better",
  "what-market-gets-wrong",
  "what-infinity-should-do-differently",
  "how-infinity-could-build-this",
  "if-infinity-built-this-today",
  "market-vs-infinity",
  "customer-problem-evidence",
  "what-we-should-not-copy",
  "what-customers-expect",
  "what-looks-good",
  "what-holds-it-back",
  "what-to-research-next",
  "intelligence-money-summary",
  "similar-companies",
  "how-strong-is-this-idea",
  "founder-evidence",
  "founder-risks",
  "founder-sources",
] as const;

type Meta = Record<string, string | number | boolean | null>;

function commandDeckSection(view: FounderIntelligenceFrontView | null, metadata: Meta): InspectorSection {
  if (!view?.commandDeck) {
    return commandDeckInspectorSection(null, {
      name: String(metadata.ventureTitle ?? "This venture"),
    });
  }
  const canonical = fromFounderIdea({
    view,
    title: metadata.ventureTitle != null ? String(metadata.ventureTitle) : null,
    founderIdeaId: metadata.founderIdeaId != null ? String(metadata.founderIdeaId) : null,
  });
  return commandDeckInspectorSection(canonical.commandDeck, {
    name: String(metadata.ventureTitle ?? canonical.identity.name),
    sourceBadge: canonical.sourceContext.badge,
    buildReadinessReasonLabel: canonical.buildReadinessReasonLabel,
  });
}

function markPrimary(section: InspectorSection): InspectorSection {
  return { ...section, presentation: "primary" };
}

function scoreSection(brief: FounderFriendlyBrief): InspectorSection {
  const rows = [
    namedInspectorRow(
      "founder-opportunity-score",
      "Overall opportunity",
      brief.scores.opportunity ? `${brief.scores.opportunity} / 100` : "Not known yet",
    ),
    namedInspectorRow(
      "founder-decision-score",
      "Decision score",
      brief.scores.decision ? `${brief.scores.decision} / 100` : "Not known yet",
    ),
    namedInspectorRow(
      "founder-validate-needs",
      "Needs",
      brief.scores.validateThreshold ? `${brief.scores.validateThreshold} to move into validation` : "Not known yet",
    ),
    namedInspectorRow("founder-score-explanation", "Plain English", brief.scores.explanation),
    namedInspectorRow("founder-decision-explanation", "Why this decision", brief.scores.decisionExplanation),
    namedInspectorRow(
      "founder-build-ready",
      "Ready to build?",
      brief.build.ready,
      brief.build.ready === "YES" ? "pass" : "fail",
    ),
    namedInspectorRow("founder-build-why", "Why", brief.build.why),
  ];
  if (brief.build.modeledNote) {
    rows.push(namedInspectorRow("founder-build-modeled-note", "About estimates", brief.build.modeledNote));
  }
  if (brief.scores.decision && brief.scores.validateThreshold && brief.scores.rejectThreshold) {
    rows.push(
      namedInspectorRow("founder-decision-score-detail", "Decision score (detail)", brief.scores.decision),
      namedInspectorRow("founder-validate-threshold-detail", "Validation threshold", brief.scores.validateThreshold),
      namedInspectorRow("founder-reject-threshold-detail", "Reject threshold", brief.scores.rejectThreshold),
    );
  }
  const bullets = [
    ...brief.scores.helping.map((item) => `Helping the score: ${item.label} — ${item.status}`),
    ...brief.scores.hurting.map((item) => `Hurting the score: ${item.label} — ${item.status}`),
    brief.moveForward.gap
      ? `Gap to validation: ${brief.moveForward.gap} points. ${brief.moveForward.explanation}`
      : brief.moveForward.explanation,
  ];
  return markPrimary({
    id: "how-strong-is-this-idea",
    title: "How Strong Is This Idea?",
    rows,
    bullets,
  });
}

function comparableSection(brief: FounderFriendlyBrief): InspectorSection {
  if (!brief.comparables.length) {
    return markPrimary({
      id: "similar-companies",
      title: "What Similar Companies Are Doing",
      rows: [namedInspectorRow("founder-comparables-empty", "Comparables", "Not known yet")],
    });
  }
  return markPrimary({
    id: "similar-companies",
    title: "What Similar Companies Are Doing",
    rows: brief.comparables.map((item, index) =>
      namedInspectorRow(
        `founder-comparable-${index}`,
        item.name,
        `What it does: ${item.whatItDoes} What Infinity found: ${item.whatInfinityKnows} How it appears to make money: ${item.howItMakesMoney} What we still don't know: ${item.whatInfinityDoesNotKnow}`,
      ),
    ),
  });
}

function productAdvantageSections(view: FounderIntelligenceFrontView | null, brief: FounderFriendlyBrief): InspectorSection[] {
  const advantage = view?.productAdvantage;
  const pains = advantage?.summary.biggestPains?.length
    ? advantage.summary.biggestPains
    : ["Not enough complaint evidence yet."];
  const opportunities = advantage?.summary.bestOpportunities?.length
    ? advantage.summary.bestOpportunities
    : ["Not enough evidence to recommend a product change."];
  const clusters = advantage?.painClusters ?? [];
  const improvements = advantage?.recommendedImprovements ?? [];
  const moneyLink = improvements.find((item) => item.economicLink)?.economicLink ?? null;
  return [
    markPrimary({
      id: "customer-problems-product-advantage",
      title: "Customer Problems & Product Advantage",
      rows: [
        namedInspectorRow("advantage-pains", "Top customer problems", pains.slice(0, 3).join(" · ")),
        namedInspectorRow("advantage-opportunities", "Best product opportunities", opportunities.slice(0, 3).join(" · ")),
        namedInspectorRow("advantage-differentiator", "Strongest differentiator", advantage?.summary.strongestDifferentiator ?? "Not enough evidence yet"),
        namedInspectorRow("advantage-avoid", "Biggest thing to avoid", advantage?.summary.biggestThingToAvoid ?? "Not enough evidence yet"),
        namedInspectorRow("advantage-why-win", "Why it could win", brief.advantage.whyCouldThisWin),
        namedInspectorRow("advantage-hate", "What customers dislike today", brief.advantage.whatCustomersHate),
        namedInspectorRow("advantage-differently", "Recommended improvement", brief.advantage.whatInfinityShouldDoDifferently),
        namedInspectorRow("advantage-evidence", "Evidence strength", advantage?.summary.evidenceStrength ?? "Not enough evidence"),
        namedInspectorRow(
          "advantage-authority",
          "Authority",
          "Read-only intelligence. This does not prioritize the roadmap, assign work, or approve a build.",
        ),
        ...(moneyLink
          ? [namedInspectorRow("advantage-money-link", "Related money insight", moneyLink)]
          : []),
      ],
    }),
    markPrimary({
      id: "what-we-should-build-better",
      title: "What We Should Build Better",
      layout: "cards",
      rows: (advantage?.buildBetter ?? []).length
        ? advantage!.buildBetter.map((card, index) => ({
            ...namedInspectorRow(`build-better-${index}`, "Customer problem", card.problem),
            primaryValue: card.problem,
            value: card.recommendedImprovement,
            help: "A customer problem Infinity can respond to.",
            evidenceLabel: `${card.evidenceStrength} evidence`,
            detail: [
              `Infinity opportunity: ${card.infinityOpportunity}`,
              `Why it could win: ${card.whyItCouldWin}`,
              `Recommended improvement: ${card.recommendedImprovement}`,
            ].join(" "),
          }))
        : [namedInspectorRow("build-better-empty", "Improvements", "Not enough complaint evidence yet to recommend a product change.")],
    }),
    markPrimary({
      id: "customer-problem-evidence",
      title: "View evidence",
      collapsible: true,
      collapseLabel: "View evidence",
      rows: clusters.length
        ? clusters.slice(0, 4).map((cluster, index) =>
            namedInspectorRow(
              `advantage-evidence-${index}`,
              "Customer problem evidence",
              `${cluster.problem} Seen in ${cluster.evidenceCount} public item${cluster.evidenceCount === 1 ? "" : "s"}${
                cluster.affectedCompetitors.length ? ` at ${cluster.affectedCompetitors.join(", ")}` : ""
              }. ${cluster.sourceQuality === "LOW" ? "Weak complaint evidence." : "Public or competitor evidence."}`,
            ),
          )
        : [namedInspectorRow("advantage-evidence-empty", "Evidence", "Not enough complaint evidence yet.")],
    }),
    markPrimary({
      id: "what-we-should-not-copy",
      title: "What We Should Not Copy",
      rows: [],
      bullets: advantage?.doNotCopy?.length
        ? advantage.doNotCopy
        : ["Not enough evidence yet to name practices Infinity should avoid."],
    }),
    markPrimary({
      id: "what-customers-expect",
      title: "What Customers Already Expect",
      rows: (advantage?.tableStakes ?? []).length
        ? advantage!.tableStakes.map((item, index) =>
            namedInspectorRow(`table-stake-${index}`, "Table stakes", `${item}. This is expected, not a differentiator.`),
          )
        : [
            namedInspectorRow(
              "table-stakes-empty",
              "Table stakes",
              "Not enough evidence yet to list what customers already expect.",
            ),
          ],
      bullets: (advantage?.competitorStrengths ?? []).slice(0, 4).map(
        (item) =>
          `${item.competitor ? `${item.competitor}: ` : ""}${item.strength} — ${differentiatorTypeLabel(item.type)}`,
      ),
    }),
  ];
}

function evidenceSection(brief: FounderFriendlyBrief): InspectorSection {
  const bullets = brief.evidenceCards.map((card) => {
    if (card.status === "NO EVIDENCE YET") {
      return `${card.dimensionLabel} — ${card.status}. What Infinity needs: ${card.needs ?? "More evidence"}.`;
    }
    return `${card.dimensionLabel} — ${card.status}. What Infinity found: ${card.found} Sources: ${card.sources}.`;
  });
  const insightBullets = brief.insights.slice(0, 6).map((item) => `${item.claim} (${item.badge})`);
  return markPrimary({
    id: "founder-evidence",
    title: "Evidence",
    rows: brief.evidenceCards.map((card) =>
      namedInspectorRow(`founder-evidence-${card.dimension}`, card.dimensionLabel, card.status),
    ),
    bullets: [...bullets, ...insightBullets],
  });
}

function whyWinSections(view: FounderIntelligenceFrontView | null): InspectorSection[] {
  const brief = view?.ventureBrief;
  const plan = view?.buildPlan;
  const wins = brief?.whyThisCouldWin ?? [];
  return [
    markPrimary({
      id: "why-this-could-win",
      title: "Why This Could Win",
      layout: "cards",
      rows: wins.length
        ? wins.map((item, index) => ({
            ...namedInspectorRow(`why-win-${index}`, "Customer problem", item.problem),
            primaryValue: item.problem,
            value: item.response,
            evidenceLabel: item.evidence,
            detail: `Infinity response: ${item.response} Why that matters commercially: ${item.commercialWhy}`,
          }))
        : [namedInspectorRow("why-win-empty", "Why this could win", "Not enough complaint evidence yet.")],
    }),
    markPrimary({
      id: "what-market-gets-wrong",
      title: "What Current Options Get Wrong",
      rows: [],
      bullets: brief?.marketGetsWrong ?? ["Not enough complaint evidence yet."],
    }),
    markPrimary({
      id: "what-infinity-should-do-differently",
      title: "What Infinity Should Do Differently",
      rows: [],
      bullets: brief?.doDifferently ?? ["Keep researching competitor friction before changing the product."],
    }),
    markPrimary({
      id: "how-infinity-could-build-this",
      title: "How Infinity Could Build This",
      layout: "phase-list",
      badge: "RECOMMENDED PLAN",
      lead: plan?.summary,
      rows: [
        namedInspectorRow("build-path", "Estimated build path", plan?.estimatedPath ?? "Not enough evidence yet"),
        namedInspectorRow("build-coverage", "Existing Infinity capability coverage", plan?.existingCoverage ?? "Not enough evidence yet"),
        namedInspectorRow("build-new", "New capabilities required", plan?.newCapabilitiesRequired ?? "Not enough evidence yet"),
        namedInspectorRow("build-dep", "Main dependency", plan?.mainDependency ?? "Not enough evidence yet"),
        namedInspectorRow("build-first", "First validation", plan?.firstValidation ?? "Not enough evidence yet"),
        namedInspectorRow("build-effort", "Implementation effort", plan ? `${plan.effort} · ${plan.effortConfidence} confidence` : "Not enough evidence yet"),
        namedInspectorRow("build-position", "Current position", plan?.currentPosition ?? "Researching economics"),
        namedInspectorRow("build-mvp-problem", "Suggested MVP — core problem", plan?.mvp.coreProblem ?? "Not enough evidence yet"),
        namedInspectorRow("build-mvp-customer", "Suggested MVP — ideal customer", plan?.mvp.idealCustomer ?? "Not enough evidence yet"),
        namedInspectorRow("build-mvp-promise", "Suggested MVP — core promise", plan?.mvp.corePromise ?? "Not enough evidence yet"),
        namedInspectorRow("build-authority", "Authority", "Read-only plan. This does not create missions, change the roadmap, or authorize BUILD."),
        ...(plan?.path ?? []).map((item) => ({
          ...namedInspectorRow(`build-ztp-${item.id}`, item.id, item.current ? "Current" : item.complete ? "Complete" : "Later"),
          kind: "path" as const,
        })),
        ...(plan?.phases ?? []).map((item) => ({
          ...namedInspectorRow(`build-phase-${item.order}`, item.name, item.whatInfinityWouldDo),
          kind: "phase" as const,
          readiness: item.readinessLabel,
          detail: `Why: ${item.whyItMatters} Systems: ${item.systems.join(", ")}. Before moving forward: ${item.gate} Output: ${item.output}`,
          secondary: item.systems.join(" · "),
          emphasized: (plan?.next3Phases ?? []).some((next) => next.order === item.order),
        })),
        ...(plan?.sequence ?? []).map((item, index) =>
          namedInspectorRow(`build-seq-${index}`, `Suggested MVP sequence — ${item.sequence}`, `${item.feature} (${item.capabilityLabel})`),
        ),
        ...(plan?.economicChecks ?? []).map((item, index) => namedInspectorRow(`build-econ-${index}`, "Economic checkpoint", item)),
      ],
    }),
    markPrimary({
      id: "if-infinity-built-this-today",
      title: "If Infinity Built This Today",
      rows: plan
        ? [
            namedInspectorRow("built-today-what", "What it would likely build", plan.ifBuiltToday.whatItWouldBuild),
            namedInspectorRow("built-today-who", "Who it would sell to", plan.ifBuiltToday.whoItWouldSellTo),
            namedInspectorRow("built-today-charge", "How it would charge", plan.ifBuiltToday.howItWouldCharge),
            namedInspectorRow("built-today-diff", "What it would do differently", plan.ifBuiltToday.whatItWouldDoDifferently),
            namedInspectorRow("built-today-acquire", "How it would acquire initial customers", plan.ifBuiltToday.howItWouldAcquire),
            namedInspectorRow("built-today-measure", "What it would measure first", plan.ifBuiltToday.whatItWouldMeasure),
            namedInspectorRow("built-today-auth", "Authority", `Missions ${BUILD_PLAN_AUTHORITY.canCreateMissions ? "yes" : "no"}. Roadmap ${BUILD_PLAN_AUTHORITY.canMutateRoadmap ? "yes" : "no"}. BUILD ${BUILD_PLAN_AUTHORITY.canApproveBuild ? "yes" : "no"}.`),
          ]
        : [namedInspectorRow("built-today-empty", "Hypothetical", "Not enough intelligence to sketch a build-today story.")],
    }),
    markPrimary({
      id: "market-vs-infinity",
      title: "Market today vs what Infinity could do differently",
      layout: "comparison-table",
      rows: (brief?.marketVsInfinity ?? []).length
        ? brief!.marketVsInfinity.map((row, index) => ({
            ...namedInspectorRow(`market-vs-${index}`, row.dimension, row.infinityOpportunity),
            compareLeft: row.marketToday,
            compareRight: row.infinityOpportunity,
            evidenceLabel: row.evidence,
            kind: "compare" as const,
            secondary: row.evidence,
          }))
        : [namedInspectorRow("market-vs-empty", "Comparison", "Not enough complaint evidence yet.")],
    }),
  ];
}

export function founderFriendlyPrimarySections(
  view: FounderIntelligenceFrontView | null,
  metadata: Meta,
): InspectorSection[] {
  const brief = buildFounderFriendlyBrief(view, metadata);
  return [
    commandDeckSection(view, metadata),
    markPrimary({
      id: "infinity-take",
      title: "Infinity's Take",
      rows: [
        namedInspectorRow("founder-take-label", "Infinity's take", brief.takeLabel.toUpperCase()),
        namedInspectorRow("founder-take-explanation", "Plain-English explanation", brief.takeExplanation),
        namedInspectorRow("founder-take-win", "Why could this win?", brief.advantage.whyCouldThisWin),
        namedInspectorRow("founder-take-hate", "What do customers hate about current options?", brief.advantage.whatCustomersHate),
        namedInspectorRow("founder-take-differently", "What should Infinity do differently?", brief.advantage.whatInfinityShouldDoDifferently),
        namedInspectorRow("founder-take-pay", "What would customers likely pay?", brief.advantage.whatCustomersWouldLikelyPay),
        namedInspectorRow("founder-take-uncertainty", "What is the biggest economic uncertainty?", brief.advantage.biggestEconomicUncertainty),
      ],
    }),
    ...whyWinSections(view),
    ...productAdvantageSections(view, brief),
    markPrimary({
      id: "what-looks-good",
      title: "What Looks Good",
      rows: [],
      bullets: brief.looksGood.length ? brief.looksGood : ["No positive evidence has been recorded yet."],
    }),
    markPrimary({
      id: "what-holds-it-back",
      title: "What Is Holding It Back",
      rows: [],
      bullets: brief.holdingBack.length ? brief.holdingBack : ["No material blockers have been recorded yet."],
    }),
    markPrimary({
      id: "what-to-research-next",
      title: "What Infinity Should Do Next",
      rows: [],
      bullets: brief.nextResearch.map((item, index) => `${index + 1}. ${item}`),
    }),
    compactIntelligenceMoneySection(view, metadata),
    comparableSection(brief),
    scoreSection(brief),
    evidenceSection(brief),
    markPrimary({
      id: "founder-risks",
      title: "Risks",
      rows: [],
      bullets: brief.risks.length ? brief.risks : ["No persisted risks beyond the missing evidence above."],
    }),
    markPrimary({
      id: "founder-sources",
      title: "Sources",
      rows: [],
      bullets: brief.sources.length ? brief.sources : ["No source URLs were persisted on this artifact."],
    }),
  ];
}

export function primarySectionBlob(sections: InspectorSection[]): string {
  return sections
    .filter((section) => section.presentation === "primary")
    .map((section) => `${section.title}\n${section.rows.map((row) => `${row.label}: ${row.value}`).join("\n")}\n${(section.bullets ?? []).join("\n")}`)
    .join("\n");
}
