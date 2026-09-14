import type { InspectorSection, InspectorSectionRow } from "@/lib/infinity/operator-console/artifacts/inspector-types";
import { namedInspectorRow } from "@/lib/infinity/operator-console/details/insight-metrics";
import { BUILD_PLAN_AUTHORITY } from "@/lib/infinity/founder-idea-lab/build-plan/types";
import type { VentureCommandDeckView, VentureIntelligenceView } from "./types";
import { VENTURE_INTELLIGENCE_MONEY_SECTION_IDS, VENTURE_INTELLIGENCE_SECTION_IDS } from "./types";
import { MISSING_COPY } from "./missing-data";

function markPrimary(section: InspectorSection): InspectorSection {
  return { ...section, presentation: "primary" };
}

function metricish(id: string, label: string, value: string): InspectorSectionRow {
  return {
    ...namedInspectorRow(id, label, value),
    primaryValue: value,
    numeric: true,
  };
}

export function commandDeckInspectorSection(
  deck: VentureCommandDeckView | null | undefined,
  input: { name: string; sourceBadge?: string; buildReadinessReasonLabel?: string },
): InspectorSection {
  if (!deck) {
    return markPrimary({
      id: "venture-command-deck",
      title: "Venture Command Deck",
      layout: "command-deck",
      rows: [namedInspectorRow("deck-empty", "Command deck", "Not enough persisted intelligence to assemble a command deck.")],
    });
  }
  const name = input.name || deck.identity.name;
  const reasonLabel = input.buildReadinessReasonLabel ?? "Why not ready to build";
  return markPrimary({
    id: "venture-command-deck",
    title: "Venture Command Deck",
    layout: "command-deck",
    badge: "READ-ONLY",
    lead: deck.synthesis,
    rows: [
      namedInspectorRow("deck-name", "Venture", name),
      ...(input.sourceBadge
        ? [namedInspectorRow("deck-source", "Source", input.sourceBadge)]
        : []),
      namedInspectorRow("deck-concept", "Venture concept", deck.identity.concept),
      namedInspectorRow("deck-customer", "Target customer", deck.identity.customer),
      namedInspectorRow("deck-problem", "Core problem", deck.identity.problem),
      namedInspectorRow("deck-solution", "Solution", deck.identity.solution),
      namedInspectorRow("deck-model", "Business model", deck.identity.businessModel),
      namedInspectorRow("deck-thesis", "Infinity's venture thesis", deck.thesis),
      namedInspectorRow("deck-why-business", "Why this could be a business", deck.whyThisCouldBeABusiness),
      namedInspectorRow("deck-business-case", "Business case", deck.businessCase, "pass"),
      namedInspectorRow("deck-build-readiness", "Build readiness", deck.buildReadiness, "fail"),
      namedInspectorRow("deck-build-reason", reasonLabel, deck.buildReadinessReason),
      {
        ...namedInspectorRow("deck-confidence", "Economic confidence", deck.economicConfidence),
        help: "How much evidence supports the modeled unit economics. Weak estimates can still be shown.",
      },
      namedInspectorRow("deck-position", "Current position", deck.currentPosition),
      namedInspectorRow("deck-next", "What Infinity recommends next", deck.nextMove.recommendation),
      namedInspectorRow("deck-next-why", "Why", deck.nextMove.why),
      namedInspectorRow("deck-next-test", "What Infinity would test", deck.nextMove.whatInfinityWouldTest),
      namedInspectorRow("deck-next-success", "What success would look like", deck.nextMove.successLooksLike),
      ...deck.metrics.map((item) => ({
        ...namedInspectorRow(`deck-${item.id}`, item.label, item.value),
        primaryValue: item.value,
        numeric: true,
        help: item.help,
        evidenceLabel: `${item.confidence} evidence`,
        kind: item.id === "contribution" || item.id === "cac" || item.id === "ltv" ? ("hero" as const) : ("secondary" as const),
      })),
      metricish("deck-fy-contribution", "First-year contribution profit / customer", deck.profit.firstYearContribution),
      metricish("deck-lifetime-contribution", "Lifetime contribution / customer", deck.profit.lifetimeContribution),
      namedInspectorRow("deck-advantage", "Biggest advantage", deck.biggestAdvantage),
      namedInspectorRow("deck-risk", "Biggest risk", deck.biggestRisk),
      namedInspectorRow("deck-pain", "Primary customer pain", deck.primaryPain),
      namedInspectorRow("deck-solve", "How Infinity would solve it", deck.howInfinityWouldSolve),
      namedInspectorRow("deck-coverage", "Infinity OS system coverage", deck.coverageSummary),
      namedInspectorRow("deck-complexity", "Build complexity", deck.buildComplexity),
      namedInspectorRow("deck-already", "What Infinity OS already has", deck.alreadyAvailable.join(" · ") || "Not mapped yet"),
      namedInspectorRow("deck-new", "New things Infinity would need to build", deck.productSpecificWork.join(" · ")),
      namedInspectorRow(
        "deck-os-note",
        "Infinity OS vs venture product",
        "Already available means Infinity OS has the internal system to help build this venture. It does not mean the customer-facing product already has that feature.",
      ),
      namedInspectorRow("deck-synthesis", "Command deck summary", deck.synthesis),
      ...(deck.scaleAt100
        ? [namedInspectorRow("deck-scale-100", "At 100 customers (scenario, not forecast)", `MRR ${deck.scaleAt100.mrr} · Monthly contribution ${deck.scaleAt100.contribution} · ARR ${deck.scaleAt100.arr}`)]
        : []),
      ...deck.requiredSystems.map((item) => ({
        ...namedInspectorRow(`deck-system-${item.stripId}`, item.stripLabel, item.coverageLabel),
        kind: "system" as const,
        readiness: item.coverageLabel,
        detail: `Infinity OS system: ${item.system}. Why needed: ${item.whyNeeded} What remains: ${item.remains}`,
        secondary: item.system,
      })),
      ...deck.marketEdge.map((row, index) => ({
        ...namedInspectorRow(`deck-edge-${index}`, row.dimension, row.infinityOpportunity),
        kind: "compare" as const,
        compareLeft: row.marketToday,
        compareRight: row.infinityOpportunity,
        evidenceLabel: row.evidence,
      })),
      ...deck.next3Phases.map((item) => ({
        ...namedInspectorRow(`deck-next-phase-${item.order}`, item.name, item.whatInfinityWouldDo),
        kind: "phase" as const,
        readiness: item.readinessLabel,
        emphasized: true,
        detail: `Why: ${item.whyItMatters} Output: ${item.output}`,
        secondary: item.systems.join(" · "),
      })),
    ],
  });
}

function includeSection(section: InspectorSection): boolean {
  if (section.rows.some((row) => row.value && row.value !== MISSING_COPY.notMeasured && row.value !== "UNKNOWN")) {
    return true;
  }
  return Boolean(section.bullets?.length);
}

export function ventureIntelligenceHqSections(view: VentureIntelligenceView): InspectorSection[] {
  const deck = commandDeckInspectorSection(view.commandDeck, {
    name: view.identity.name,
    sourceBadge: view.sourceContext.badge,
    buildReadinessReasonLabel: view.buildReadinessReasonLabel,
  });
  const sections: InspectorSection[] = [
    deck,
    markPrimary({
      id: "infinity-take",
      title: "Infinity's Take",
      rows: [
        namedInspectorRow("take-label", "Infinity's take", view.businessCase.label),
        namedInspectorRow("take-thesis", "Venture thesis", view.thesis.thesis),
        namedInspectorRow("take-win", "Why this could win", view.thesis.whyThisCouldWin),
        namedInspectorRow("take-next", "What Infinity recommends next", view.nextMove.recommendation),
      ],
    }),
    markPrimary({
      id: "why-this-could-win",
      title: "Why This Could Win",
      rows: [
        namedInspectorRow("win-pain", "Primary customer pain", view.marketAdvantage.primaryCustomerPain),
        namedInspectorRow("win-weakness", "Biggest market weakness", view.marketAdvantage.biggestMarketWeakness),
        namedInspectorRow("win-diff", "Strongest differentiator", view.marketAdvantage.strongestDifferentiator),
        namedInspectorRow("win-better", "What Infinity could do better", view.marketAdvantage.whatInfinityCouldDoBetter),
        namedInspectorRow("win-why", "Why this could win", view.marketAdvantage.whyThisCouldWin),
      ],
    }),
    markPrimary({
      id: "customer-problems-product-advantage",
      title: "Customer Problems & Product Advantage",
      rows: [],
      bullets: view.customerProblems.problems.length
        ? view.customerProblems.problems
        : ["Not enough complaint evidence yet."],
    }),
    markPrimary({
      id: "what-we-should-build-better",
      title: "What Infinity Could Do Better",
      rows: [],
      bullets: view.productAdvantages.length ? view.productAdvantages : ["Not enough evidence to name a product advantage yet."],
    }),
    markPrimary({
      id: "how-infinity-could-build-this",
      title: view.buildPlan.heading,
      layout: "phase-list",
      rows: [
        namedInspectorRow("build-heading", "Plan", view.buildPlan.heading),
        namedInspectorRow("build-position", "Current position", view.currentPosition.label),
        namedInspectorRow("build-auth", "Authority", `Missions ${BUILD_PLAN_AUTHORITY.canCreateMissions ? "yes" : "no"}. BUILD ${BUILD_PLAN_AUTHORITY.canApproveBuild ? "yes" : "no"}.`),
        ...view.buildPlan.next3Phases.map((item) => ({
          ...namedInspectorRow(`build-phase-${item.order}`, item.name, item.whatInfinityWouldDo),
          kind: "phase" as const,
          readiness: item.readinessLabel,
          detail: item.whyItMatters,
        })),
      ],
    }),
    markPrimary({
      id: "market-vs-infinity",
      title: "Market today vs what Infinity could do differently",
      layout: "comparison-table",
      rows: view.marketAdvantage.marketEdge.length
        ? view.marketAdvantage.marketEdge.map((row, index) => ({
            ...namedInspectorRow(`market-vs-${index}`, row.dimension, row.infinityOpportunity),
            compareLeft: row.marketToday,
            compareRight: row.infinityOpportunity,
            evidenceLabel: row.evidence,
            kind: "compare" as const,
          }))
        : [namedInspectorRow("market-vs-empty", "Comparison", "Not enough complaint evidence yet.")],
    }),
    markPrimary({
      id: "venture-systems",
      title: "Systems this venture needs",
      layout: "system-table",
      rows: view.systemRequirements.map((item) => ({
        ...namedInspectorRow(`system-${item.stripId}`, item.stripLabel, item.coverageLabel),
        kind: "system" as const,
        readiness: item.coverageLabel,
        detail: item.whyNeeded,
        secondary: item.system,
      })),
    }),
    markPrimary({
      id: "venture-next-move",
      title: "What Infinity recommends next",
      rows: [
        namedInspectorRow("next-rec", "Recommendation", view.nextMove.recommendation),
        namedInspectorRow("next-why", "Why", view.nextMove.why),
        namedInspectorRow("next-test", "What Infinity would test", view.nextMove.whatInfinityWouldTest),
        namedInspectorRow("next-success", "Success looks like", view.nextMove.successLooksLike),
      ],
    }),
    markPrimary({
      id: "venture-risks",
      title: "Risks",
      rows: [
        namedInspectorRow("risk-biggest", "Biggest risk", view.risks.biggest),
        namedInspectorRow("risk-economic", "Economic risk", view.risks.economic),
        namedInspectorRow("risk-product", "Product risk", view.risks.product),
        namedInspectorRow("risk-market", "Market risk", view.risks.market),
        namedInspectorRow("risk-ops", "Operational risk", view.risks.operational),
      ],
    }),
  ];

  if (view.performance.available) {
    sections.splice(2, 0, markPrimary({
      id: "venture-performance-actuals",
      title: "What is actually happening",
      rows: view.performance.whatIsActuallyHappening.length
        ? view.performance.whatIsActuallyHappening.map((line, index) => namedInspectorRow(`perf-${index}`, "Observed", line))
        : [namedInspectorRow("perf-empty", "Observed", MISSING_COPY.notMeasured)],
    }));
    if (view.performance.learning.length) {
      sections.push(markPrimary({
        id: "venture-learning-loop",
        title: "What Infinity has learned",
        rows: [],
        bullets: view.performance.learning,
      }));
    }
  }

  sections.push({
    id: "venture-evidence",
    title: "Evidence",
    presentation: "advanced",
    rows: [
      ...view.evidence.summary.map((line, index) => namedInspectorRow(`evidence-${index}`, "Evidence", line)),
      ...view.evidence.missing.map((line, index) => namedInspectorRow(`missing-${index}`, "Still unknown", line)),
    ],
  });

  return sections.filter((section) => section.id === "venture-command-deck" || includeSection(section));
}

export function ventureIntelligenceMoneySections(view: VentureIntelligenceView): InspectorSection[] {
  const econ = view.economics;
  const actualRows = [econ.cac, econ.monthlyRevenuePerCustomer, econ.conversion, econ.margin, econ.retention, econ.ltv]
    .filter((item) => item.origin === "OBSERVED")
    .map((item) => ({
      ...namedInspectorRow(`money-actual-${item.id}`, item.label, item.display),
      numeric: true,
      primaryValue: item.display,
      estimateKind: "actual" as const,
      evidenceLabel: "Observed",
    }));
  const estimatedRows = [
    econ.monthlyRevenuePerCustomer,
    econ.contributionProfitPerCustomer,
    econ.cac,
    econ.lifetime,
    econ.ltv,
    econ.ltvCac,
    econ.payback,
    econ.firstYearRevenuePerCustomer,
    econ.firstYearContribution,
    econ.lifetimeContribution,
  ].map((item) => ({
    ...namedInspectorRow(`money-est-${item.id}`, item.label, item.expectedDisplay),
    numeric: true,
    primaryValue: item.display,
    estimateKind: item.origin === "OBSERVED" ? ("actual" as const) : ("estimated" as const),
    actualLabel: item.actualDisplay,
    evidenceLabel: `${item.confidence} evidence`,
    help: item.help,
  }));
  const compareRows = view.performance.expectedVsActual
    .filter((row) => row.status !== "insufficient_data")
    .map((row, index) => ({
      ...namedInspectorRow(`money-var-${index}`, row.metric, `Expected ${row.expected} · Actual ${row.actual}`),
      compareLeft: row.expected,
      compareRight: row.actual,
      kind: "compare" as const,
      evidenceLabel: row.variance,
    }));

  const sections: InspectorSection[] = [
    markPrimary({
      id: "money-customer-economics",
      title: "Customer economics",
      layout: "metric-hero",
      toneGroup: actualRows.length ? "actual" : "estimated",
      badge: actualRows.length ? "ACTUAL PREFERRED" : "MODELED",
      lead: econ.evidenceStrength,
      rows: estimatedRows,
    }),
  ];
  if (actualRows.length) {
    sections.push(markPrimary({
      id: "money-actual",
      title: "Actual operating data",
      layout: "cards",
      toneGroup: "actual",
      rows: actualRows,
    }));
  }
  if (compareRows.length) {
    sections.push(markPrimary({
      id: "money-expected-vs-actual",
      title: "Expected vs actual",
      layout: "comparison-table",
      rows: compareRows,
    }));
  }
  sections.push({
    id: "money-estimated",
    title: "Modeled / expected",
    presentation: "advanced",
    toneGroup: "estimated",
    rows: estimatedRows.map((row) => ({ ...row, id: `${row.id}-modeled` })),
  });
  return sections;
}

export { VENTURE_INTELLIGENCE_SECTION_IDS, VENTURE_INTELLIGENCE_MONEY_SECTION_IDS };
