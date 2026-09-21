import { evaluateCommercialContentRedundancyGate as evaluateOccupancyRedundancy } from "@/lib/infinity/offer-architecture/pricing-page-quality";
import {
  BUYER_DECISION_SUPPORT_GATE,
  COMMERCIAL_CONTENT_REDUNDANCY_GATE,
  CUSTOMER_PAGE_THINNESS_GATE,
  PRODUCT_UNDERSTANDING_GATE,
  MATERIAL_QUESTION_COVERAGE_GATE,
  PAGE_INFORMATION_GAIN_GATE,
  type CustomerPageArchetype,
  type CustomerPageType,
  type NamedDepthGate,
  type PageInformationDepthContract,
} from "./types";
import { evaluateFAQCompletenessGate } from "./faq-completeness";
import { evaluateVentureQuestionClusterStandard } from "@/lib/infinity/organic-growth-engine/question-cluster/venture-content-standard";
import { asCustomerPageArchetype, classifyRoute, expectedDepthClass, materialQuestionsFor } from "./questions";

const PROPORTIONAL_TYPES: CustomerPageType[] = ["LOGIN", "NOT_FOUND", "UTILITY", "LEGAL"];
const PRODUCT_PAGE_TYPES: CustomerPageType[] = ["PRICING", "PRODUCT", "HOMEPAGE", "WORKFLOW", "COMPARISON", "ACCOUNT", "RESULT"];
const BUYER_PAGE_TYPES: CustomerPageType[] = ["PRICING", "PRODUCT", "SERVICE", "CONVERSION", "HOMEPAGE", "WORKFLOW", "COMPARISON"];

function visibleHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<JsonLdBlock[\s\S]*?\/>/g, "")
    .replace(/const PRICING_FAQ_SCHEMA[\s\S]*?export default function Page/g, "");
}

export function evaluateMaterialQuestionCoverageGate(input: {
  html: string;
  pageType: CustomerPageType;
  archetype?: CustomerPageArchetype | string;
}): NamedDepthGate {
  if (PROPORTIONAL_TYPES.includes(input.pageType)) {
    return { gate: MATERIAL_QUESTION_COVERAGE_GATE, result: "N/A", reasons: ["PAGE_TYPE_NOT_BUYER_DEPTH"] };
  }
  const missing = materialQuestionsFor({ pageType: input.pageType, html: input.html, archetype: input.archetype })
    .filter((row) => row.required && !row.answered)
    .map((row) => `MISSING_QUESTION:${row.id}`);
  return {
    gate: MATERIAL_QUESTION_COVERAGE_GATE,
    result: missing.length === 0 ? "PASS" : "FAIL",
    reasons: missing,
  };
}

export function evaluatePageInformationGainGate(html: string, pageType: CustomerPageType): NamedDepthGate {
  const visible = visibleHtml(html);
  const reasons: string[] = [];
  const headings = [...visible.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi)].map((row) => row[1]!.trim().toLowerCase());
  const dup = headings.filter((heading, index) => headings.indexOf(heading) !== index);
  if (dup.length) reasons.push(`DUPLICATE_SECTION:${dup[0]}`);
  if ((visible.match(/Why these prices exist/gi) ?? []).length > 1) reasons.push("REPEATED_PRICE_EXPLANATION");
  if ((visible.match(/Who OccupancyNPV is for/gi) ?? []).length > 1) reasons.push("REPEATED_AUDIENCE");
  if (/lorem ipsum|placeholder copy|coming soon page/i.test(visible)) reasons.push("PADDING_COPY");
  if (pageType === "PRICING" && /Start Free Trial/i.test(visible) && (visible.match(/Start Free Trial/gi) ?? []).length > 3) {
    reasons.push("REPEATED_CTA_WITHOUT_PURPOSE");
  }
  return { gate: PAGE_INFORMATION_GAIN_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateBuyerDecisionSupportGate(
  html: string,
  pageType: CustomerPageType,
  archetype?: CustomerPageArchetype,
): NamedDepthGate {
  if (!BUYER_PAGE_TYPES.includes(pageType)) {
    return { gate: BUYER_DECISION_SUPPORT_GATE, result: "N/A", reasons: ["NOT_COMMERCIAL_PAGE"] };
  }
  if (archetype === "ecommerce" || archetype === "merch") {
    const missing = ([
      [/buy|cart|checkout|order|price|\$/i, "COST"],
      [/product|item|what you get|includes|buy the/i, "WHAT_I_GET"],
      [/ship|return|size|variant/i, "TRADEOFFS"],
      [/add to|buy|checkout/i, "NEXT"],
    ] as Array<[RegExp, string]>).filter(([pattern]) => !pattern.test(html)).map(([, key]) => `DECISION_GAP:${key}`);
    return { gate: BUYER_DECISION_SUPPORT_GATE, result: missing.length === 0 ? "PASS" : "FAIL", reasons: missing };
  }
  if (archetype === "creator_media" || archetype === "youtube_channel" || archetype === "newsletter") {
    const missing = ([
      [/channel|newsletter|episode|for /i, "FOR_ME"],
      [/watch|read|subscribe|follow/i, "WHAT_IT_DOES"],
      [/subscribe|follow|join|next/i, "NEXT"],
    ] as Array<[RegExp, string]>).filter(([pattern]) => !pattern.test(html)).map(([, key]) => `DECISION_GAP:${key}`);
    return { gate: BUYER_DECISION_SUPPORT_GATE, result: missing.length === 0 ? "PASS" : "FAIL", reasons: missing };
  }
  if (pageType === "HOMEPAGE") {
    const missing = ([
      [/OccupancyNPV|the product|we help|for /i, "FOR_ME"],
      [/compare|workflow|helps|lease/i, "WHAT_IT_DOES"],
      [/Start|pricing|how-it-works|next/i, "NEXT"],
    ] as Array<[RegExp, string]>).filter(([pattern]) => !pattern.test(html)).map(([, key]) => `DECISION_GAP:${key}`);
    return { gate: BUYER_DECISION_SUPPORT_GATE, result: missing.length === 0 ? "PASS" : "FAIL", reasons: missing };
  }
  const checks: Array<[RegExp, string]> = [
    [/who .{0,40}is for|tenant-rep|for me| OccupancyNPV/i, "FOR_ME"],
    [/helps you|workflow|compare|service/i, "WHAT_IT_DOES"],
    [/included|DealWorkspace|you get|receives/i, "WHAT_I_GET"],
    [/\$290|\$149|price|pricing/i, "COST"],
    [/vs |not for|limitation|tradeoff/i, "TRADEOFFS"],
    [/Start Free Trial|Start Professional|next|how-it-works/i, "NEXT"],
  ];
  if (pageType === "PRICING" || pageType === "CONVERSION") {
    checks.push([/3-day|trial|offer|pilot/i, "OFFER"], [/cancel|stop|does not charge/i, "IF_STOP"]);
  }
  const missing = checks.filter(([pattern]) => !pattern.test(html)).map(([, key]) => `DECISION_GAP:${key}`);
  return { gate: BUYER_DECISION_SUPPORT_GATE, result: missing.length === 0 ? "PASS" : "FAIL", reasons: missing };
}

export function evaluateProductUnderstandingGate(
  html: string,
  pageType: CustomerPageType,
  archetype?: CustomerPageArchetype,
): NamedDepthGate {
  if (archetype === "ecommerce" || archetype === "merch") {
    const missing = ([
      [/product|item|what you buy/i, "WHAT_IT_IS"],
      [/order|ship|receive/i, "PROCESS"],
      [/price|\$/i, "OUTPUTS"],
    ] as Array<[RegExp, string]>).filter(([pattern]) => !pattern.test(html)).map(([, key]) => `PRODUCT_GAP:${key}`);
    return { gate: PRODUCT_UNDERSTANDING_GATE, result: missing.length === 0 ? "PASS" : "FAIL", reasons: missing };
  }
  if (archetype === "creator_media" || archetype === "youtube_channel" || archetype === "newsletter") {
    const missing = ([
      [/episode|issue|video|essay|channel/i, "WHAT_IT_IS"],
      [/publish|watch|read|subscribe/i, "PROCESS"],
    ] as Array<[RegExp, string]>).filter(([pattern]) => !pattern.test(html)).map(([, key]) => `PRODUCT_GAP:${key}`);
    return { gate: PRODUCT_UNDERSTANDING_GATE, result: missing.length === 0 ? "PASS" : "FAIL", reasons: missing };
  }
  if (!PRODUCT_PAGE_TYPES.includes(pageType)) {
    return { gate: PRODUCT_UNDERSTANDING_GATE, result: "N/A", reasons: ["NOT_SOFTWARE_PRODUCT_PAGE"] };
  }
  if (pageType === "HOMEPAGE") {
    const missing = ([
      [/OccupancyNPV|lease|compare/i, "WHAT_IT_IS"],
      [/workflow|how|steps|compare/i, "PROCESS"],
    ] as Array<[RegExp, string]>).filter(([pattern]) => !pattern.test(html)).map(([, key]) => `PRODUCT_GAP:${key}`);
    return { gate: PRODUCT_UNDERSTANDING_GATE, result: missing.length === 0 ? "PASS" : "FAIL", reasons: missing };
  }
  const missing = ([
    [/enter|input|scenario/i, "INPUTS"],
    [/compare|review|calculate|process|workflow/i, "PROCESS"],
    [/summary|NPV|cash-flow|output|result/i, "OUTPUTS"],
    [/DealWorkspace|save|archive/i, "SAVED_STATE"],
    [/not a CRM|limitation|is not/i, "LIMITATIONS"],
  ] as Array<[RegExp, string]>).filter(([pattern]) => !pattern.test(html)).map(([, key]) => `PRODUCT_GAP:${key}`);
  return { gate: PRODUCT_UNDERSTANDING_GATE, result: missing.length === 0 ? "PASS" : "FAIL", reasons: missing };
}

export function evaluateCustomerPageThinnessGate(input: {
  html: string;
  pageType: CustomerPageType;
  coverage: NamedDepthGate;
  understanding: NamedDepthGate;
  decision: NamedDepthGate;
}): NamedDepthGate {
  if (PROPORTIONAL_TYPES.includes(input.pageType)) {
    const redirectOnly = /redirect\(/.test(input.html) && !/<h1/i.test(input.html);
    const hasBody = /<h1|<p |<p>/i.test(input.html);
    return {
      gate: CUSTOMER_PAGE_THINNESS_GATE,
      result: hasBody || redirectOnly ? "PASS" : "FAIL",
      reasons: redirectOnly ? ["REDIRECT_UTILITY"] : hasBody ? ["PROPORTIONAL_SHORT_PAGE"] : ["UTILITY_PAGE_EMPTY"],
    };
  }
  if (input.pageType === "ACCOUNT" || input.pageType === "RESULT") {
    const hasTask = /DealWorkspace|workspace|scenario|NPV|sensitivity|Save Scenario|Compare NPV/i.test(input.html);
    return {
      gate: CUSTOMER_PAGE_THINNESS_GATE,
      result: hasTask && input.coverage.result !== "FAIL" ? "PASS" : "FAIL",
      reasons: hasTask ? ["TASK_ORIENTED_PRODUCT_UX"] : ["APP_PAGE_MISSING_TASK_ORIENTATION"],
    };
  }
  if (input.pageType === "FAQ") {
    const completeness = evaluateFAQCompletenessGate(input.html);
    const reasons = [
      ...(input.coverage.result === "FAIL" ? ["INSUFFICIENT_QUESTION_COVERAGE"] : []),
      ...completeness.reasons,
    ];
    if (/Pricing-page FAQ already covers/i.test(input.html)) reasons.push("FAQ_DEFERS_BASIC_INTENT");
    return {
      gate: CUSTOMER_PAGE_THINNESS_GATE,
      result: reasons.length === 0 ? "PASS" : "FAIL",
      reasons,
    };
  }
  if (input.pageType === "FEEDBACK") {
    const hasForm = /<form|OccupancynpvPublicImprovementForm|Suggest an Improvement/i.test(input.html);
    return {
      gate: CUSTOMER_PAGE_THINNESS_GATE,
      result: hasForm && input.coverage.result !== "FAIL" ? "PASS" : "FAIL",
      reasons: hasForm ? ["FEEDBACK_FORM_PRESENT"] : ["FEEDBACK_FORM_MISSING"],
    };
  }
  const reasons: string[] = [];
  if (input.coverage.result === "FAIL") reasons.push("INSUFFICIENT_QUESTION_COVERAGE");
  if (input.understanding.result === "FAIL") reasons.push("SUPERFICIAL_PRODUCT_EXPLANATION");
  if (input.decision.result === "FAIL") reasons.push("NO_DECISION_SUPPORT");
  if (/Start Free Trial|Start Professional/.test(input.html) && !/How the 3-day free trial works|What OccupancyNPV helps you do/.test(input.html) && input.pageType === "PRICING") {
    reasons.push("CTA_PLUS_SHORT_PARAGRAPH_ONLY");
  }
  if (/lorem ipsum|boilerplate welcome to/i.test(input.html)) reasons.push("BOILERPLATE_ONLY");
  return { gate: CUSTOMER_PAGE_THINNESS_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateGeneralContentRedundancyGate(html: string): NamedDepthGate {
  const occupancy = evaluateOccupancyRedundancy(html);
  return {
    gate: COMMERCIAL_CONTENT_REDUNDANCY_GATE,
    result: occupancy.result,
    reasons: occupancy.reasons,
  };
}

export function buildPageInformationDepthContract(input: {
  route: string;
  html: string;
  pageType?: CustomerPageType;
  archetype?: CustomerPageArchetype | string;
}): PageInformationDepthContract {
  const pageType = input.pageType ?? classifyRoute(input.route, input.html);
  const questions = materialQuestionsFor({ pageType, html: input.html, archetype: input.archetype });
  const dimensions = [...new Set(questions.map((row) => row.dimension))];
  const covered = questions.filter((row) => row.answered).map((row) => row.dimension);
  const missing = dimensions.filter((dimension) => !covered.includes(dimension));
  const coverage = evaluateMaterialQuestionCoverageGate({ html: input.html, pageType, archetype: input.archetype });
  const status: PageInformationDepthContract["status"] = PROPORTIONAL_TYPES.includes(pageType)
    ? "N/A"
    : coverage.result === "PASS" && missing.length === 0
      ? "PASS"
      : input.html.trim()
        ? "FAIL"
        : "UNVERIFIED";
  return {
    contract: "PageInformationDepthContract",
    page_type: pageType,
    route: input.route,
    primary_user_intent: primaryIntent(pageType),
    secondary_user_intents: secondaryIntents(pageType),
    material_questions: questions,
    required_information_dimensions: dimensions,
    decision_stage: decisionStage(pageType),
    product_capability_context: ["lease_comparison", "dealworkspace", "npv", "cash_flow"],
    trust_requirements: pageType === "LEGAL" ? ["complete_legal_copy"] : ["no_invented_testimonials"],
    transaction_requirements: pageType === "PRICING" || pageType === "CONVERSION" ? ["visible_offer_and_price"] : [],
    supporting_evidence_requirements: [],
    expected_depth_class: expectedDepthClass(pageType, input.route),
    actual_coverage: covered,
    missing_dimensions: missing,
    status,
    word_count_sole_metric: false,
  };
}

export function inferSourceVisualQuality(html: string, pageType: CustomerPageType): NamedDepthGate {
  if (PROPORTIONAL_TYPES.includes(pageType)) {
    const redirectOnly = /redirect\(/.test(html) && !/<h1/i.test(html);
    return {
      gate: "RenderedVisualQualityGate",
      result: redirectOnly || /<h1|<p |<main/i.test(html) ? "PASS" : "FAIL",
      reasons: ["PROPORTIONAL_VISUAL"],
    };
  }
  const reasons: string[] = [];
  if (/lorem ipsum|placeholder copy/i.test(html)) reasons.push("PLACEHOLDER_COPY");
  if (!/<h1/i.test(html)) reasons.push("MISSING_H1");
  if (!/className=|class=/.test(html)) reasons.push("UNSTYLED_MARKUP");
  return { gate: "RenderedVisualQualityGate", result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

function primaryIntent(pageType: CustomerPageType): string {
  if (pageType === "PRICING") return "Decide whether to start the trial or buy a plan";
  if (pageType === "PRODUCT" || pageType === "WORKFLOW") return "Understand the workflow and decide if the tool fits";
  if (pageType === "COMPARISON") return "Understand what OccupancyNPV compares and how to interpret results";
  if (pageType === "SERVICE") return "Understand the service, process, and next step";
  if (pageType === "RESOURCE") return "Get a direct answer and related next steps";
  if (pageType === "FAQ") return "Answer material buyer and product questions";
  if (pageType === "FEEDBACK") return "Submit a product suggestion with clear expectations";
  if (pageType === "ACCOUNT") return "Open or create a DealWorkspace and manage saved work";
  if (pageType === "RESULT") return "Enter scenarios, compare results, and interpret NPV";
  if (pageType === "HOMEPAGE") return "Understand the venture and choose a next path";
  if (pageType === "LEGAL") return "Read the governing legal terms";
  if (pageType === "LOGIN" || pageType === "UTILITY" || pageType === "NOT_FOUND") return "Complete a short utility task";
  return "Take the next conversion action with enough context";
}

function secondaryIntents(pageType: CustomerPageType): string[] {
  if (pageType === "PRICING") return ["Compare plans", "Understand trial mechanics", "Resolve purchase objections"];
  if (pageType === "PRODUCT") return ["See inputs and outputs", "Find pricing or trial"];
  return [];
}

function decisionStage(pageType: CustomerPageType): PageInformationDepthContract["decision_stage"] {
  if (pageType === "PRICING" || pageType === "CONVERSION") return "DECISION";
  if (pageType === "PRODUCT" || pageType === "SERVICE") return "CONSIDERATION";
  if (pageType === "LEGAL") return "LEGAL";
  if (pageType === "LOGIN" || pageType === "UTILITY" || pageType === "NOT_FOUND") return "UTILITY";
  if (pageType === "SUPPORT") return "TASK";
  return "AWARENESS";
}

export function evaluatePageDepthBundle(input: {
  route: string;
  html: string;
  pageType?: CustomerPageType;
  archetype?: CustomerPageArchetype | string;
}) {
  const pageType = input.pageType ?? classifyRoute(input.route, input.html);
  const archetype = asCustomerPageArchetype(input.archetype);
  const contract = buildPageInformationDepthContract({ ...input, pageType, archetype });
  const question = evaluateMaterialQuestionCoverageGate({ html: input.html, pageType, archetype });
  const gain = evaluatePageInformationGainGate(input.html, pageType);
  const decision = evaluateBuyerDecisionSupportGate(input.html, pageType, archetype);
  const understanding = evaluateProductUnderstandingGate(input.html, pageType, archetype);
  const redundancy = evaluateGeneralContentRedundancyGate(input.html);
  const thinness = evaluateCustomerPageThinnessGate({
    html: input.html,
    pageType,
    coverage: question,
    understanding,
    decision,
  });
  const visual = inferSourceVisualQuality(input.html, pageType);
  const cluster = evaluateVentureQuestionClusterStandard({
    venture_id: "any-venture",
    page_type: pageType,
    role: pageType,
    html: input.html,
    route: input.route,
  });
  return { contract, question, gain, decision, understanding, redundancy, thinness, visual, cluster };
}
