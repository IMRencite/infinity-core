import type { CustomerPageDepthScorecard, CustomerPageType, VenturePageDepthInventoryRow } from "./types";
import { evaluatePageDepthBundle } from "./gates";
import { classifyRoute } from "./questions";

export const OCCUPANCYNPV_MATERIAL_PUBLIC_PAGES = [
  "/",
  "/pricing",
  "/how-it-works",
  "/compare-commercial-leases",
  "/resources",
  "/faq",
  "/privacy-policy",
  "/terms-of-service",
  "/early-access",
  "/occupancynpv/app/login",
] as const;

export function scorecardFromBundle(
  route: string,
  bundle: ReturnType<typeof evaluatePageDepthBundle>,
): CustomerPageDepthScorecard {
  return {
    page: route,
    information_depth: bundle.contract.status === "UNVERIFIED" ? "FAIL" : bundle.contract.status,
    question_coverage: bundle.question.result,
    product_understanding: bundle.understanding.result,
    buyer_decision_support: bundle.decision.result,
    information_gain: bundle.gain.result,
    redundancy: bundle.redundancy.result,
    thinness: bundle.thinness.result,
    visual_quality: bundle.visual.result,
    missing_material_questions: bundle.question.reasons.filter((row) => row.startsWith("MISSING_QUESTION")).length,
  };
}

export function inventoryVentureCustomerPages(input: {
  pages: Array<{ route: string; html?: string; pageType?: CustomerPageType }>;
}): VenturePageDepthInventoryRow[] {
  return input.pages.map((page) => {
    const pageType = page.pageType ?? classifyRoute(page.route, page.html);
    if (!page.html) {
      return { route: page.route, page_type: pageType, status: "UNVERIFIED", missing_material_questions: 0 };
    }
    const bundle = evaluatePageDepthBundle({ route: page.route, html: page.html, pageType });
    const failing = [
      bundle.question.result,
      bundle.gain.result,
      bundle.thinness.result,
      bundle.visual.result,
      bundle.decision.result === "N/A" ? "PASS" : bundle.decision.result,
      bundle.understanding.result === "N/A" ? "PASS" : bundle.understanding.result,
      bundle.redundancy.result === "N/A" ? "PASS" : bundle.redundancy.result,
    ].some((result) => result === "FAIL");
    const status = bundle.contract.status === "N/A"
      ? "N/A"
      : bundle.contract.status === "UNVERIFIED"
        ? "UNVERIFIED"
        : failing
          ? "FAIL"
          : "PASS";
    return {
      route: page.route,
      page_type: pageType,
      depth_class: bundle.contract.expected_depth_class,
      status,
      missing_material_questions: bundle.question.reasons.filter((row) => row.startsWith("MISSING_QUESTION")).length,
      question_coverage: bundle.question.result,
      product_understanding: bundle.understanding.result,
      buyer_decision_support: bundle.decision.result,
      information_gain: bundle.gain.result,
      thinness: bundle.thinness.result,
      visual_quality: bundle.visual.result,
    };
  });
}

export function invalidateDepthOnRewrite(input: {
  previous_signature: string | null;
  current_signature: string;
  previous_status: "PASS" | "FAIL" | "N/A" | "UNVERIFIED";
}): "PASS" | "FAIL" | "N/A" | "UNVERIFIED" {
  if (!input.previous_signature || input.previous_signature !== input.current_signature) return "UNVERIFIED";
  return input.previous_status;
}
