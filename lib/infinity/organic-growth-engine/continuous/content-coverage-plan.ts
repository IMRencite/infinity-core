import {
  buildBlogQuestionClusterPlan,
  occupancynpvInterestRateQuestionCluster,
  type BlogQuestionClusterPlan,
  type BlogClusterQuestion,
} from "./blog-ux";
import { OCCUPANCYNPV_CAM_FIRST_YEAR_PATH, OCCUPANCYNPV_CAM_FIRST_YEAR_QUESTION } from "./occupancynpv-cam-first-year-page";
import type { OrganicDraft } from "./quality";

export const CONTENT_COVERAGE_PLAN_CONTRACT = "ContentCoveragePlan" as const;

export type CoverageEvidenceSource =
  | "TOPIC_GRAPH"
  | "VOICE_OF_CUSTOMER"
  | "SEARCH_DEMAND"
  | "SITE_SEARCH"
  | "PROSPECT_QUESTION"
  | "SALES_QUESTION"
  | "SUPPORT_QUESTION"
  | "EXISTING_GAP"
  | "AUTHORITATIVE_RESEARCH";

export type ContentCoveragePlan = {
  plan_id: string;
  asset_id: string;
  canonical_url: string;
  primary_reader_question: string;
  primary_intent: string;
  audience: string[];
  related_questions: string[];
  follow_up_questions: string[];
  definitions_needed: string[];
  decisions: string[];
  examples_needed: string[];
  calculations_needed: string[];
  tables_needed: string[];
  common_mistakes: string[];
  edge_cases: string[];
  limitations: string[];
  practical_next_steps: string[];
  internal_link_opportunities: string[];
  related_site_assets: string[];
  evidence_needs: string[];
  faq_opportunities: string[];
  cluster: BlogQuestionClusterPlan;
  sources: CoverageEvidenceSource[];
  learning_outcomes?: string[];
};

export function occupancynpvCamFirstYearCoveragePlan(): ContentCoveragePlan {
  const questions: BlogClusterQuestion[] = [
    {
      question: OCCUPANCYNPV_CAM_FIRST_YEAR_QUESTION,
      role: "PRIMARY",
      coverage_tokens: ["occupancy-cost timeline", "projected versus reconciled", "not a finished bill"],
    },
    {
      question: "Is first-year CAM the same as the final CAM bill?",
      role: "MUST_ANSWER",
      coverage_tokens: ["estimate or a stop", "reconcile later", "label it as projected"],
    },
    {
      question: "What is the difference between a CAM estimate, an expense stop, and a base year?",
      role: "MUST_ANSWER",
      coverage_tokens: ["expense stop versus", "base-year comparison", "estimate is a budget"],
    },
    {
      question: "How do you compare two leases when first-year CAM differs?",
      role: "MUST_ANSWER",
      coverage_tokens: ["occupancy-cost table", "year-one occupancy cash", "lower rent did not win"],
    },
    {
      question: "How should a stub year or mid-year occupancy change first-year CAM cash?",
      role: "MUST_ANSWER",
      coverage_tokens: ["stub-year cash", "mid-year occupancy", "not twelve months"],
    },
    {
      question: "What happens at CAM reconciliation, and who pays a deficit?",
      role: "MUST_ANSWER",
      coverage_tokens: ["reconciliation deficit", "who pays a deficit", "demand the backup"],
    },
    {
      question: "When should a tenant accept the estimate versus demand more detail?",
      role: "MUST_ANSWER",
      coverage_tokens: ["accept the estimate", "demand the backup", "leave the cell blank"],
    },
    {
      question: "How does a CAM cap or a vacant-building gross-up change year one?",
      role: "HIGH_VALUE_SECONDARY",
      coverage_tokens: ["gross-up", "CAM cap", "vacant-building"],
    },
    {
      question: "What does first-year CAM typically include versus exclude?",
      role: "MUST_ANSWER",
      coverage_tokens: ["typically includes", "typically excludes", "janitorial"],
    },
    {
      question: "How do landlords estimate first-year CAM?",
      role: "MUST_ANSWER",
      coverage_tokens: ["prior-year actuals", "landlord estimates"],
    },
    {
      question: "What is controllable versus uncontrollable CAM?",
      role: "MUST_ANSWER",
      coverage_tokens: ["controllable", "uncontrollable"],
    },
    {
      question: "How does first-year CAM change occupancy-cost NPV?",
      role: "MUST_ANSWER",
      coverage_tokens: ["occupancy-cost NPV", "discounted"],
    },
    {
      question: "What CAM documents should a tenant inspect?",
      role: "MUST_ANSWER",
      coverage_tokens: ["prior-year reconciliation statement", "included-expenses list"],
    },
    {
      question: "What red flags mean the CAM estimate is not usable?",
      role: "MUST_ANSWER",
      coverage_tokens: ["red flag"],
    },
    {
      question: "What expenses typically sit in CAM versus separately billed?",
      role: "HIGH_VALUE_SECONDARY",
      coverage_tokens: ["separately billed", "included expenses", "utilities versus CAM"],
    },
    {
      question: "What if the landlord will not give a first-year CAM budget?",
      role: "HIGH_VALUE_SECONDARY",
      coverage_tokens: ["no CAM budget", "leave the cell blank", "do not invent"],
    },
    {
      question: "What CAM audit rights should a tenant look for?",
      role: "HIGH_VALUE_SECONDARY",
      coverage_tokens: ["audit right", "supporting invoices", "challenge window"],
    },
    {
      question: "What is CAM in a commercial lease?",
      role: "SEPARATE_PAGE",
      coverage_tokens: ["common-area maintenance"],
      dedicated_url: "/occupancy-costs/what-is-cam-in-a-commercial-lease/",
    },
    {
      question: "What numbers do you need to compare two commercial leases?",
      role: "SEPARATE_PAGE",
      coverage_tokens: ["lease input"],
      dedicated_url: "/lease-comparison/what-numbers-do-you-need-to-compare-two-commercial-leases/",
    },
  ];
  return {
    plan_id: "coverage:occupancynpv:cam-first-year:v3",
    asset_id: "blog-cam-first-year",
    canonical_url: OCCUPANCYNPV_CAM_FIRST_YEAR_PATH,
    primary_reader_question: OCCUPANCYNPV_CAM_FIRST_YEAR_QUESTION,
    primary_intent: "Help a tenant put first-year CAM on the same occupancy-cost timeline as rent and decide whether the quoted figure is usable.",
    audience: ["commercial tenants", "tenant-rep brokers", "owners comparing occupancy extras", "investors reading a first-year CAM line"],
    related_questions: questions.filter((row) => row.role === "MUST_ANSWER").map((row) => row.question),
    follow_up_questions: questions.filter((row) => row.role === "HIGH_VALUE_SECONDARY").map((row) => row.question),
    definitions_needed: ["CAM", "CAM estimate", "expense stop", "base year", "stub year", "reconciliation", "gross-up", "CAM cap"],
    decisions: [
      "accept the estimate as a labeled projection",
      "demand the backup budget",
      "leave the cell blank",
      "walk from a lease that hides CAM",
    ],
    examples_needed: ["two-lease year-one cash", "stub-year cash", "reconciliation deficit"],
    calculations_needed: ["CAM = PSF × rentable SF", "stub-year cash", "10 percent overrun"],
    tables_needed: ["estimate vs stop vs base year", "Lease A vs Lease B occupancy cash"],
    common_mistakes: [
      "compare face rent and ignore CAM",
      "treat an estimate as a final bill",
      "invent a market-average CAM",
      "use a cap rate as the tenant CAM number",
    ],
    edge_cases: ["mid-year occupancy", "vacant-building gross-up", "no CAM budget", "CAM audit right"],
    limitations: ["not a final bill", "not second-year CAM", "not NOI", "not legal advice", "OccupancyNPV does not invent CAM"],
    practical_next_steps: ["copy the clause onto the worksheet", "stress-test a 10 percent overrun", "ask for the backup"],
    internal_link_opportunities: [
      "/occupancy-costs/what-is-cam-in-a-commercial-lease/",
      "/lease-comparison/what-numbers-do-you-need-to-compare-two-commercial-leases/",
      "/lease-comparison/how-do-you-compare-two-commercial-lease-options/",
      "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/",
      "/pricing",
    ],
    related_site_assets: ["/occupancy-costs", "/compare-commercial-leases", "/resources"],
    evidence_needs: ["lease document is the source of the number", "authoritative occupancy-cost guidance"],
    faq_opportunities: [
      "Is first-year CAM the same as the final CAM bill?",
      "Can OccupancyNPV invent a missing CAM number?",
      "What if the first year is not twelve months?",
      "Who pays a CAM reconciliation deficit?",
    ],
    cluster: buildBlogQuestionClusterPlan({
      primary_question: OCCUPANCYNPV_CAM_FIRST_YEAR_QUESTION,
      topic: "CAM first operating year occupancy costs expense stop base year",
      voc: [
        "Is the first-year CAM number a bill or a budget?",
        "How do I compare two leases when CAM is estimated?",
        "What if the landlord will not give a CAM budget?",
      ],
      sales_objections: ["OccupancyNPV will invent a market-average CAM"],
      existing_urls: [
        "/occupancy-costs/what-is-cam-in-a-commercial-lease/",
        "/lease-comparison/what-numbers-do-you-need-to-compare-two-commercial-leases/",
      ],
      questions,
    }),
    sources: ["TOPIC_GRAPH", "VOICE_OF_CUSTOMER", "SALES_QUESTION", "EXISTING_GAP", "AUTHORITATIVE_RESEARCH"],
    learning_outcomes: [
      "explain first-year CAM as a projection",
      "identify estimate stop and base year",
      "apply occupancy-cost table",
      "avoid treating the estimate as a finished bill",
      "request prior-year actuals next",
    ],
  };
}

export function occupancynpvInterestRateCoveragePlan(): ContentCoveragePlan {
  const cluster = occupancynpvInterestRateQuestionCluster();
  return {
    plan_id: "coverage:occupancynpv:interest-rates:v1",
    asset_id: "blog-interest-rate",
    canonical_url: "/blog/valuation/how-interest-rates-affect-commercial-property-values/",
    primary_reader_question: cluster.primary_question,
    primary_intent: "Explain how financing costs change required yield and indicated value for owners and buyers.",
    audience: ["owners", "buyers", "sellers", "refinancing sponsors"],
    related_questions: cluster.must_answer_questions,
    follow_up_questions: cluster.secondary_questions,
    definitions_needed: ["required yield", "cap rate", "NOI", "LTV", "DSCR", "debt yield"],
    decisions: ["hold vs sell", "refinance", "buyer pool"],
    examples_needed: ["same NOI at a higher cap rate", "NOI growth", "debt-service coverage"],
    calculations_needed: ["indicated value", "debt service", "dscr"],
    tables_needed: ["scenario analysis"],
    common_mistakes: ["same percentage", "one-for-one"],
    edge_cases: ["interest-only", "floating-rate", "balloon"],
    limitations: ["not a tenant", "not automatically"],
    practical_next_steps: ["debt maturity", "checklist", "indicated value"],
    internal_link_opportunities: cluster.defer_to_dedicated_resource.map((row) => row.url),
    related_site_assets: ["/commercial-lease-npv/how-is-cap-rate-calculated/", "/compare-commercial-leases"],
    evidence_needs: ["financing and valuation identity"],
    faq_opportunities: cluster.must_answer_questions.slice(0, 6),
    cluster,
    sources: ["TOPIC_GRAPH", "VOICE_OF_CUSTOMER", "SALES_QUESTION", "AUTHORITATIVE_RESEARCH"],
    learning_outcomes: [
      "explain required yield and indicated value",
      "identify cap rate and NOI",
      "apply same NOI scenario",
      "avoid one-for-one automatic cut",
      "request debt maturity next",
    ],
  };
}

export function resolveContentCoveragePlan(draft: OrganicDraft): ContentCoveragePlan {
  if (draft.canonical.includes("/journal/")) {
    try {
      const { clubThrottleJournalCoveragePlans } = require("./club-throttle-journal") as typeof import("./club-throttle-journal");
      const match = clubThrottleJournalCoveragePlans().find((plan) => plan.canonical_url === draft.canonical);
      if (match) return match;
    } catch {
      // Cycle-safe: journal plans are passed explicitly at publish time.
    }
  }
  if (draft.canonical.includes("/blog/") && !draft.canonical.includes("interest-rates") && !draft.canonical.includes("cam-first-year")) {
    try {
      const { occupancynpvExpansionCoveragePlans } = require("./occupancynpv-blog-expansion") as typeof import("./occupancynpv-blog-expansion");
      const match = occupancynpvExpansionCoveragePlans().find((plan) => plan.canonical_url === draft.canonical);
      if (match) return match;
    } catch {
      // Cycle-safe: expansion plans are passed explicitly at publish time.
    }
  }
  if (draft.canonical.includes("/cam-first-year") || /first operating year|first-year CAM/i.test(`${draft.h1} ${draft.title}`)) {
    return occupancynpvCamFirstYearCoveragePlan();
  }
  if (draft.canonical.includes("interest-rates") || /interest rates affect commercial property/i.test(`${draft.h1} ${draft.title}`)) {
    return occupancynpvInterestRateCoveragePlan();
  }
  return {
    plan_id: `coverage:generic:${draft.canonical}`,
    asset_id: draft.canonical,
    canonical_url: draft.canonical,
    primary_reader_question: draft.h1,
    primary_intent: draft.direct_answer ?? draft.h1,
    audience: ["readers"],
    related_questions: [],
    follow_up_questions: [],
    definitions_needed: [],
    decisions: [],
    examples_needed: [],
    calculations_needed: [],
    tables_needed: [],
    common_mistakes: [],
    edge_cases: [],
    limitations: [],
    practical_next_steps: [],
    internal_link_opportunities: draft.internal_links,
    related_site_assets: [],
    evidence_needs: [],
    faq_opportunities: (draft.visible_faqs ?? []).map((row) => row.question),
    cluster: buildBlogQuestionClusterPlan({ primary_question: draft.h1 }),
    sources: ["EXISTING_GAP"],
  };
}
