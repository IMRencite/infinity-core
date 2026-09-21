import {
  CUSTOMER_PAGE_DEPTH_CANONICAL_PRINCIPLE,
  FAQ_COMPLETENESS_GATE,
  FOUNDER_RENDERED_COMMERCIAL_CONTRADICTION_GATE,
  H1_WIDTH_UTILIZATION_GATE,
  H1_WRAP_QUALITY_GATE,
  HERO_COMPOSITION_GATE,
  INTERACTIVE_TEXT_CONTRAST_GATE,
  PAGE_INFORMATION_DEPTH_CONTRACT,
  UNUSED_HERO_SPACE_BALANCE_GATE,
  PRIMARY_ACTION_DISCOVERABILITY_GATE,
  APP_ACTION_HIERARCHY_GATE,
  INTERACTIVE_CONTROL_VISUAL_HIERARCHY_GATE,
  FOUNDER_RENDERED_UX_CONTRADICTION_GATE,
  VENTURE_FAVICON_GATE,
  VENTURE_LOGO_GATE,
  VENTURE_BRAND_CONSISTENCY_GATE,
  VENTURE_BRAND_COMPLETENESS_GATE,
  BRAND_IDENTITY_DISCOVERABILITY_GATE,
  VENTURE_BRAND_IDENTITY_CONTRACT,
  APPLICATION_METADATA_IDENTITY_GATE,
} from "./types";
import { classifyRoute, expectedDepthClass, materialQuestionsFor } from "./questions";

export const CUSTOMER_PAGE_DEPTH_FACTORY_PLAN = "CustomerPageDepthFactoryPlan" as const;

export const INHERITED_VISUAL_AND_FAQ_QC_GATES = [
  HERO_COMPOSITION_GATE,
  INTERACTIVE_TEXT_CONTRAST_GATE,
  FAQ_COMPLETENESS_GATE,
  FOUNDER_RENDERED_COMMERCIAL_CONTRADICTION_GATE,
  H1_WIDTH_UTILIZATION_GATE,
  H1_WRAP_QUALITY_GATE,
  UNUSED_HERO_SPACE_BALANCE_GATE,
  PRIMARY_ACTION_DISCOVERABILITY_GATE,
  APP_ACTION_HIERARCHY_GATE,
  INTERACTIVE_CONTROL_VISUAL_HIERARCHY_GATE,
  FOUNDER_RENDERED_UX_CONTRADICTION_GATE,
  VENTURE_FAVICON_GATE,
  VENTURE_LOGO_GATE,
  VENTURE_BRAND_CONSISTENCY_GATE,
  VENTURE_BRAND_COMPLETENESS_GATE,
  BRAND_IDENTITY_DISCOVERABILITY_GATE,
  VENTURE_BRAND_IDENTITY_CONTRACT,
  APPLICATION_METADATA_IDENTITY_GATE,
] as const;

export function planCustomerPageDepthBeforeBuild(input: {
  routes: string[];
  archetype?: string;
}): {
  contract: typeof CUSTOMER_PAGE_DEPTH_FACTORY_PLAN;
  principle: typeof CUSTOMER_PAGE_DEPTH_CANONICAL_PRINCIPLE;
  word_count_sole_metric: false;
  copy_occupancynpv_layout: false;
  inherited_qc_gates: typeof INHERITED_VISUAL_AND_FAQ_QC_GATES;
  pages: Array<{
    route: string;
    depth_contract: typeof PAGE_INFORMATION_DEPTH_CONTRACT;
    page_type: string;
    expected_depth_class: string;
    material_question_plan: string[];
    buyer_question_map: string[];
    product_capability_map: string[];
    faq_objection_plan: string[];
  }>;
} {
  return {
    contract: CUSTOMER_PAGE_DEPTH_FACTORY_PLAN,
    principle: CUSTOMER_PAGE_DEPTH_CANONICAL_PRINCIPLE,
    word_count_sole_metric: false,
    copy_occupancynpv_layout: false,
    inherited_qc_gates: INHERITED_VISUAL_AND_FAQ_QC_GATES,
    pages: input.routes.map((route) => {
      const pageType = classifyRoute(route);
      const questions = materialQuestionsFor({
        pageType,
        archetype: input.archetype as import("./types").CustomerPageArchetype | undefined,
      });
      return {
        route,
        depth_contract: PAGE_INFORMATION_DEPTH_CONTRACT,
        page_type: pageType,
        expected_depth_class: expectedDepthClass(pageType, route),
        material_question_plan: questions.map((row) => row.question),
        buyer_question_map: questions.filter((row) => ["offer", "cost", "who_for", "next"].includes(row.id)).map((row) => row.question),
        product_capability_map: ["workflow", "inputs", "outputs", "limitations"].filter((dimension) =>
          questions.some((row) => row.dimension === dimension),
        ),
        faq_objection_plan: pageType === "PRICING" || pageType === "PRODUCT" || pageType === "FAQ" || pageType === "WORKFLOW"
          ? questions.filter((row) => ["objections", "cancel", "auto_bill", "support"].includes(row.id)).map((row) => row.question)
          : [],
      };
    }),
  };
}

export function factoryRequiresDepthPlanBeforePageBuild(): true {
  return true;
}
