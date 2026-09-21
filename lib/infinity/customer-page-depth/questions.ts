import { CUSTOMER_PAGE_ARCHETYPES, type CustomerPageArchetype, type CustomerPageType, type MaterialQuestion } from "./types";

export function asCustomerPageArchetype(value?: string): CustomerPageArchetype | undefined {
  if (!value) return undefined;
  if ((CUSTOMER_PAGE_ARCHETYPES as readonly string[]).includes(value)) return value as CustomerPageArchetype;
  if (/lead/i.test(value)) return "lead_gen";
  if (/ecommerce|store|shop/i.test(value)) return "ecommerce";
  if (/content|blog/i.test(value)) return "affiliate_content";
  if (/saas|subscription/i.test(value)) return "saas";
  return undefined;
}

type QuestionSeed = { id: string; question: string; dimension: string; pageTypes: CustomerPageType[]; archetypes?: CustomerPageArchetype[] };

const SEEDS: QuestionSeed[] = [
  { id: "cost", question: "What does the product cost?", dimension: "price", pageTypes: ["PRICING", "PRODUCT", "HOMEPAGE", "CONVERSION", "WORKFLOW", "COMPARISON", "FAQ"] },
  { id: "offer", question: "What is the acquisition offer?", dimension: "offer", pageTypes: ["PRICING", "CONVERSION", "HOMEPAGE", "FAQ"] },
  { id: "included", question: "What is included?", dimension: "included_value", pageTypes: ["PRICING", "PRODUCT", "SERVICE", "WORKFLOW", "COMPARISON"] },
  { id: "excluded", question: "What is excluded?", dimension: "limitations", pageTypes: ["PRICING", "PRODUCT", "SERVICE", "WORKFLOW", "COMPARISON"] },
  { id: "who_for", question: "Who is each plan or offer for?", dimension: "audience", pageTypes: ["PRICING", "PRODUCT", "SERVICE", "HOMEPAGE", "WORKFLOW", "COMPARISON", "FAQ"] },
  { id: "plan_diff", question: "How do plans differ?", dimension: "plan_comparison", pageTypes: ["PRICING", "FAQ"] },
  { id: "after_trial", question: "What happens after trial, pilot, or free use?", dimension: "post_trial", pageTypes: ["PRICING", "CONVERSION", "FAQ"], archetypes: ["saas", "calculator", "digital_product", "utility"] },
  { id: "auto_bill", question: "Does billing auto-start?", dimension: "billing", pageTypes: ["PRICING", "CONVERSION", "FAQ"], archetypes: ["saas", "calculator", "digital_product", "utility"] },
  { id: "cancel", question: "Can the user cancel?", dimension: "cancellation", pageTypes: ["PRICING", "CONVERSION", "FAQ"] },
  { id: "how_works", question: "How does the product work?", dimension: "workflow", pageTypes: ["PRICING", "PRODUCT", "HOMEPAGE", "SERVICE", "WORKFLOW", "COMPARISON"] },
  { id: "value", question: "What value does it provide?", dimension: "value", pageTypes: ["PRICING", "PRODUCT", "SERVICE", "HOMEPAGE", "WORKFLOW", "COMPARISON"] },
  { id: "limits", question: "What limitations exist?", dimension: "limitations", pageTypes: ["PRICING", "PRODUCT", "SERVICE", "RESOURCE", "WORKFLOW", "COMPARISON", "FAQ"] },
  { id: "saved_work", question: "What happens to saved work or data?", dimension: "saved_state", pageTypes: ["PRICING", "PRODUCT", "WORKFLOW", "COMPARISON", "FAQ", "ACCOUNT", "RESULT"], archetypes: ["saas", "calculator", "digital_product", "utility"] },
  { id: "support", question: "What support exists?", dimension: "support", pageTypes: ["PRICING", "PRODUCT", "SERVICE", "SUPPORT", "WORKFLOW", "COMPARISON", "FAQ"] },
  { id: "objections", question: "What are common purchase objections?", dimension: "objections", pageTypes: ["PRICING", "CONVERSION"] },
  { id: "next", question: "What are the next actions?", dimension: "next_action", pageTypes: ["PRICING", "PRODUCT", "SERVICE", "RESOURCE", "HOMEPAGE", "CONVERSION", "SUPPORT", "WORKFLOW", "COMPARISON", "FAQ", "FEEDBACK", "ACCOUNT", "RESULT"] },
  { id: "what_is", question: "What is the product or service?", dimension: "definition", pageTypes: ["PRODUCT", "SERVICE", "HOMEPAGE", "WORKFLOW", "COMPARISON"] },
  { id: "problem", question: "What problem does it solve?", dimension: "problem", pageTypes: ["PRODUCT", "SERVICE", "HOMEPAGE", "WORKFLOW", "COMPARISON"] },
  { id: "inputs", question: "What inputs does the customer provide?", dimension: "inputs", pageTypes: ["PRODUCT", "WORKFLOW", "COMPARISON", "ACCOUNT", "RESULT"] },
  { id: "outputs", question: "What outputs or results does the customer get?", dimension: "outputs", pageTypes: ["PRODUCT", "SERVICE", "WORKFLOW", "COMPARISON", "ACCOUNT", "RESULT"] },
  { id: "process", question: "What is the process?", dimension: "process", pageTypes: ["SERVICE", "PRODUCT", "WORKFLOW", "COMPARISON", "ACCOUNT", "RESULT"] },
  { id: "timing", question: "What is the timing?", dimension: "timing", pageTypes: ["SERVICE"] },
  { id: "direct_answer", question: "What is the direct answer?", dimension: "direct_answer", pageTypes: ["RESOURCE"] },
  { id: "distinctions", question: "What important distinctions exist?", dimension: "distinctions", pageTypes: ["RESOURCE"] },
  { id: "examples", question: "What workflow or examples exist?", dimension: "examples", pageTypes: ["RESOURCE"] },
  { id: "related", question: "What related concepts or paths exist?", dimension: "related_paths", pageTypes: ["RESOURCE", "PRICING", "PRODUCT", "WORKFLOW", "COMPARISON", "HOMEPAGE", "FAQ"] },
  { id: "faq_what_is", question: "What is OccupancyNPV?", dimension: "definition", pageTypes: ["FAQ"] },
  { id: "faq_inputs", question: "What data do I enter?", dimension: "inputs", pageTypes: ["FAQ"] },
  { id: "faq_outputs", question: "What results do I get?", dimension: "outputs", pageTypes: ["FAQ"] },
  { id: "faq_npv", question: "What is lease NPV?", dimension: "npv", pageTypes: ["FAQ"] },
  { id: "faq_sensitivity", question: "What is discount-rate sensitivity?", dimension: "sensitivity", pageTypes: ["FAQ"] },
  { id: "faq_workspace", question: "What is a DealWorkspace?", dimension: "saved_state", pageTypes: ["FAQ"] },
  { id: "faq_billing", question: "When am I charged?", dimension: "billing_when", pageTypes: ["FAQ"] },
  { id: "faq_not_advice", question: "Is this legal or investment advice?", dimension: "advice_limit", pageTypes: ["FAQ"] },
  { id: "feedback_purpose", question: "What are suggestions for?", dimension: "purpose", pageTypes: ["FEEDBACK"] },
  { id: "feedback_after", question: "What happens after submission?", dimension: "after_submit", pageTypes: ["FEEDBACK"] },
  { id: "feedback_promise", question: "Is every request guaranteed to be built?", dimension: "no_promise", pageTypes: ["FEEDBACK"] },
  { id: "feedback_privacy", question: "What privacy expectation applies?", dimension: "privacy", pageTypes: ["FEEDBACK"] },
];

const ANSWER_MARKERS: Record<string, RegExp> = {
  cost: /\$290|\$149|price|pricing|costs?/i,
  offer: /3-day|free trial|trial|pilot|no credit card/i,
  included: /what is included|includes?|DealWorkspace|cash-flow|NPV/i,
  excluded: /is not|not a CRM|not include|excluded|does not/i,
  who_for: /who .{0,40}is for|tenant-rep|best suited/i,
  plan_diff: /Professional vs Per-Deal|how do plans differ|annual subscription|one-time/i,
  after_trial: /after the trial|when 72 hours|does not charge you/i,
  auto_bill: /no automatic|does not automatically|auto-convert|auto-start/i,
  cancel: /cancel anytime|can stop|stop\./i,
  how_works: /how .{0,40}works|create a DealWorkspace|four steps|workflow/i,
  value: /helps you|compare|decision|value/i,
  limits: /limitation|is not|not for|not a public share/i,
  saved_work: /save|DealWorkspace|archive|rename/i,
  support: /infinitemediaresources@gmail.com|get help|Suggest an Improvement/i,
  objections: /automatically be charged|is OccupancyNPV a CRM|credit card/i,
  next: /Start Free Trial|Start Professional|how-it-works|\/pricing|Back to OccupancyNPV|open a workspace|Compare NPV/i,
  what_is: /OccupancyNPV is|service is|the product/i,
  problem: /rebuild|workbook|problem|scattered terms/i,
  inputs: /enter the lease|inputs?|scenarios/i,
  outputs: /comparison summary|NPV|cash-flow|results?/i,
  process: /process|steps|workflow|Create a DealWorkspace|create or open/i,
  timing: /72 hours|timing|days|when/i,
  direct_answer: /<h1|<p>|answer/i,
  distinctions: /vs |versus|not the same|distinction/i,
  examples: /example|workflow|steps/i,
  related: /Related product paths|related|compare-commercial-leases/i,
  feedback_purpose: /product feedback|suggestions are for|tell us what would make/i,
  feedback_after: /after you submit|we read each|does not create a ticket promise/i,
  feedback_promise: /not a promise|no promise|not guaranteed to be built/i,
  feedback_privacy: /optional|privacy|do not send SSNs|contact email/i,
  faq_what_is: /OccupancyNPV is a live lease comparison/i,
  faq_inputs: /term, rent steps|lease scenarios/i,
  faq_outputs: /cash-flow, occupancy cost, NPV/i,
  faq_npv: /net present value|today.s dollars/i,
  faq_sensitivity: /discount-rate sensitivity/i,
  faq_workspace: /DealWorkspace/i,
  faq_billing: /charged when you complete checkout|does not charge you/i,
  faq_not_advice: /not legal or investment advice/i,
};

export function materialQuestionsFor(input: {
  pageType: CustomerPageType;
  archetype?: CustomerPageArchetype | string;
  html?: string;
}): MaterialQuestion[] {
  const archetype = asCustomerPageArchetype(input.archetype);
  return SEEDS
    .filter((seed) => seed.pageTypes.includes(input.pageType))
    .filter((seed) => !seed.archetypes || !archetype || seed.archetypes.includes(archetype))
    .map((seed) => ({
      id: seed.id,
      question: seed.question,
      dimension: seed.dimension,
      required: true,
      answered: input.html ? ANSWER_MARKERS[seed.id]?.test(input.html) ?? false : false,
    }));
}

export function expectedDepthClass(pageType: CustomerPageType, route = ""): import("./types").DepthClass {
  if (pageType === "PRICING" || pageType === "PRODUCT" || pageType === "SERVICE" || pageType === "WORKFLOW" || pageType === "COMPARISON" || pageType === "FAQ") {
    return "DEEP_RESOURCE";
  }
  if (pageType === "RESOURCE" && /\/resources\/?$/.test(route)) return "DEFINITIVE_RESOURCE";
  if (pageType === "HOMEPAGE" || pageType === "RESOURCE" || pageType === "CONVERSION" || pageType === "SUPPORT") {
    return "STANDARD_RESOURCE";
  }
  return "DIRECT_RESPONSE";
}

export function displayPageType(pageType: CustomerPageType): string {
  if (pageType === "HOMEPAGE") return "HOME";
  if (pageType === "LOGIN") return "AUTH";
  if (pageType === "NOT_FOUND") return "ERROR";
  return pageType;
}

export function pageTypeDepthPolicy(pageType: CustomerPageType): "PASS" {
  expectedDepthClass(pageType);
  return "PASS";
}

export function isRedirectOnlyPage(html?: string): boolean {
  return Boolean(html && /redirect\(/.test(html) && !/<h1/i.test(html));
}

export function classifyRoute(route: string, html?: string): CustomerPageType {
  if (isRedirectOnlyPage(html)) return "UTILITY";
  const path = route.replace(/\/+$/, "") || "/";
  if (path === "/pricing") return "PRICING";
  if (path === "/") return "HOMEPAGE";
  if (/\/login|signin|sign-in/.test(path)) return "LOGIN";
  if (/404|not-found/.test(path)) return "NOT_FOUND";
  if (path === "/privacy-policy" || path === "/terms-of-service" || /^\/legal(\/|$)/.test(path)) return "LEGAL";
  if (path === "/sitemap" || path === "/sitemap.xml") return "UTILITY";
  if (path === "/faq") return "FAQ";
  if (path === "/suggest-improvement") return "FEEDBACK";
  if (path === "/how-it-works") return "WORKFLOW";
  if (path === "/compare-commercial-leases") return "COMPARISON";
  if (path === "/occupancynpv/app") return "ACCOUNT";
  if (/\/occupancynpv\/app\/workspaces\//.test(path)) return "RESULT";
  if (/checkout\/complete/.test(path)) return "UTILITY";
  if (/early-access|checkout/.test(path)) return "CONVERSION";
  if (/\/(support|help)(\/|$)/.test(path)) return "SUPPORT";
  if (
    /\/resources|\/occupancy-costs|\/commercial-lease-npv|\/lease-comparison|\/effective-rent|\/lease-sensitivity|\/tenant-rep-analysis|\/lease-financial-modeling|\/discount-rate|\/tenant-improvement|\/for\//.test(path)
  ) {
    return "RESOURCE";
  }
  return "RESOURCE";
}
