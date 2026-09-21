import { evaluateBuildAuthorization } from "@/lib/infinity/venture-build-orchestration/authorization";
import { hasProductAdvantageEvidence } from "@/lib/infinity/venture-intelligence/engines";
import type { VentureIntelligenceView } from "@/lib/infinity/venture-intelligence/types";
import type { CompileInput } from "@/lib/infinity/venture-build-orchestration/types";
import type { PreRunCandidateState, ValidationBlocker } from "./types";

function blocker(
  order: number,
  partial: Omit<ValidationBlocker, "order">,
): ValidationBlocker {
  return { order, ...partial };
}

export function extractBuildBlockers(input: {
  compile: CompileInput;
  view?: VentureIntelligenceView | null;
  preRun?: PreRunCandidateState | null;
}): ValidationBlocker[] {
  const auth = evaluateBuildAuthorization(input.compile);
  if (auth.result === "AUTHORIZED_BUILD") return [];

  const view = input.view ?? null;
  const pre = input.preRun ?? null;
  const advantageOk = hasProductAdvantageEvidence(input.preRun?.candidate ?? null);

  const items: ValidationBlocker[] = [];

  if (!input.compile.evidence.customerPain || !advantageOk) {
    items.push(
      blocker(items.length + 1, {
        dimension: "CUSTOMER_PROBLEM",
        currentEvidence: input.compile.product.problem,
        requiredEvidence: "Complaint-shaped pain: who feels it, how often, cost of the current workaround, and why alternatives fail.",
        gap: "Title or summary alone cannot close customer-pain validation.",
        validationAction: "Collect public broker/tenant-rep complaints and workflow evidence. Do not invent firsthand interviews.",
        successCriterion: "Pain evidence names frequency, cost, and failed alternatives — not just the product title.",
        mode: "RESEARCH_VALIDATION",
      }),
    );
  }

  if (!input.compile.evidence.competition) {
    items.push(
      blocker(items.length + 1, {
        dimension: "COMPETITION",
        currentEvidence: "Competition evidence is missing or title-only.",
        requiredEvidence: "Named alternatives: CRE analytics, lease admin tools, spreadsheet templates, calculators, brokerage software.",
        gap: "Differentiation cannot be validated without current alternatives.",
        validationAction: "Research current public alternatives and their weaknesses for smaller brokers.",
        successCriterion: "At least two named alternatives with evidenced weaknesses.",
        mode: "RESEARCH_VALIDATION",
      }),
    );
  }

  items.push(
    blocker(items.length + 1, {
      dimension: "WILLINGNESS_TO_PAY",
      currentEvidence: pre?.pricing ?? input.compile.monetization.pricing,
      requiredEvidence: "Observed purchase behavior or a designed WTP experiment. Comparable list prices are anchors only.",
      gap: "A competitor or modeled price does not prove customers will pay Infinity that amount.",
      validationAction: "Research pricing anchors and comparable spend. Compile an EXTERNAL experiment for actual WTP.",
      successCriterion: "Either observed WTP evidence exists, or an exact experiment design is compiled and WTP remains open.",
      mode: "MARKET_EXPERIMENT",
    }),
  );

  items.push(
    blocker(items.length + 1, {
      dimension: "RETENTION",
      currentEvidence: "Current model assumes recurring monthly SaaS use.",
      requiredEvidence: "Usage cadence for a deal calculator: per-deal, episodic, seat, or always-on.",
      gap: "A lease NPV tool may be episodic; monthly churn assumptions may be wrong.",
      validationAction: "Research CRE broker workflow cadence and challenge saas_subscription $79/month.",
      successCriterion: "A recommended model matches evidenced usage, not inherited SaaS defaults.",
      mode: "RESEARCH_VALIDATION",
    }),
  );

  items.push(
    blocker(items.length + 1, {
      dimension: "CAC",
      currentEvidence: pre?.cac ?? "Modeled CAC",
      requiredEvidence: "Direct comparable, category benchmark, or component model. Actual CAC remains UNKNOWN until acquisition.",
      gap: "Industry CAC benchmark is not our actual CAC.",
      validationAction: "Refresh modeled CAC via existing benchmark/educated-estimate engines. Do not claim observed CAC.",
      successCriterion: "Modeled CAC has a provenance class other than invented zero. Actual CAC = UNKNOWN.",
      mode: "RESEARCH_VALIDATION",
    }),
  );

  items.push(
    blocker(items.length + 1, {
      dimension: "MARGIN",
      currentEvidence: pre?.margin ?? "Modeled margin",
      requiredEvidence: "Component costs: hosting, calc infrastructure, storage, support, payments, reports, any AI, sales burden.",
      gap: "Unknown costs are not zero. Extreme modeled margins require scrutiny.",
      validationAction: "Rebuild margin from component model using existing educated-estimate engines.",
      successCriterion: "Margin reflects named cost components; unknown costs stay unknown.",
      mode: "RESEARCH_VALIDATION",
    }),
  );

  items.push(
    blocker(items.length + 1, {
      dimension: "BUILDABILITY",
      currentEvidence: "MVP is defined as lease compare, NPV, shareable summary.",
      requiredEvidence: "MVP boundary vs later complexity (CAM, TI, percentage rent, multi-user).",
      gap: "Scope creep into full lease administration would change buildability.",
      validationAction: "Confirm MVP stays inside cash-flow compare + NPV + summary.",
      successCriterion: "MVP excludes lease-admin complexity unless evidenced as must-have.",
      mode: "RESEARCH_VALIDATION",
    }),
  );

  items.push(
    blocker(items.length + 1, {
      dimension: "LEGAL_COMPLIANCE",
      currentEvidence: "Financial/lease calculations may be mistaken for advice.",
      requiredEvidence: "Disclaimer requirements; flag specialist review if needed. Do not overstate legal conclusions.",
      gap: "Calculation tools can imply investment or legal advice.",
      validationAction: "Flag disclaimer needs. Specialist review if the product interprets leases.",
      successCriterion: "Legal risk is flagged without a fabricated legal opinion.",
      mode: "RESEARCH_VALIDATION",
    }),
  );

  if (auth.result === "ECONOMICS_BLOCKED") {
    items.unshift(
      blocker(0, {
        dimension: "LTV",
        currentEvidence: auth.blocker ?? "Economics blocked",
        requiredEvidence: "Numerically known, non-placeholder unit economics.",
        gap: auth.blocker ?? "Unit economics unknown.",
        validationAction: "Rerun revenue-model, benchmark, and educated-estimate engines.",
        successCriterion: "CAC, LTV, and LTV/CAC are known numbers, not placeholder zeros.",
        mode: "RESEARCH_VALIDATION",
      }),
    );
  }

  if (view?.nextMove.recommendation) {
    void view;
  }

  return items
    .map((item, index) => ({ ...item, order: index + 1 }))
    .slice(0, 10);
}
