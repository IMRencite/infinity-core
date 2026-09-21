import type { FeedbackType, NamedGate } from "./types";
import { CUSTOMER_FEEDBACK_PROMPT_INJECTION_GATE } from "./types";

const INJECTION = /ignore (all |your |previous )?(rules|instructions|policies)|deploy this code|override (system |capital |deployment |security )?policy|you are now|jailbreak|execute the following (code|command)/i;

export function evaluateCustomerFeedbackPromptInjectionGate(text: string): NamedGate {
  const hit = INJECTION.test(text);
  return {
    gate: CUSTOMER_FEEDBACK_PROMPT_INJECTION_GATE,
    result: "PASS",
    reasons: hit ? ["UNTRUSTED_INJECTION_LANGUAGE", "NO_COMMAND_EXECUTION", "NO_POLICY_OVERRIDE"] : ["UNTRUSTED_CONTENT"],
  };
}

export function detectPromptInjection(text: string): boolean {
  return INJECTION.test(text);
}

export function classifyFeedbackTypes(text: string): FeedbackType[] {
  const body = text.toLowerCase();
  const types = new Set<FeedbackType>();
  if (/broken|doesn't work|does not work|bug|error|can't (save|export|login|open)|failed when/.test(body)) types.add("BUG");
  if (/add|wish|should (have|add|allow)|need to be able|feature|can you (add|build|make|store|save)|it would help if|save (this |my |the )?(comparison|scenario|lease)|store (my |the )?scenario/.test(body)) types.add("FEATURE_REQUEST");
  if (/confusing|hard to (use|find|understand)|unclear|i don't understand/.test(body)) types.add("USABILITY_PROBLEM");
  if (/workflow|too many steps|slows me|save time|come back to|start over|save (my |the )?(comparison|scenario)|store scenario|persist/.test(body)) types.add("WORKFLOW_FRICTION");
  if (/why can't i|where is|how do i/.test(body)) types.add("CONFUSION");
  if (/integrat|connect (to|with)|api|export to|quickbooks|salesforce/.test(body)) types.add("MISSING_INTEGRATION");
  if (/slow|timeout|performance|takes forever/.test(body)) types.add("PERFORMANCE_ISSUE");
  if (/screen reader|contrast|keyboard|accessible|wcag/.test(body)) types.add("ACCESSIBILITY_ISSUE");
  if (/price|pricing|too expensive|\$290|\$149|discount/.test(body)) types.add("PRICING_FEEDBACK");
  if (/cancel|refund|churn|leaving/.test(body)) types.add("CANCELLATION_REASON");
  if (/help|support|can't login|reset password/.test(body)) types.add("SUPPORT_REQUEST");
  if (/love|great|thank you|works well/.test(body)) types.add("COMPLIMENT");
  if (/hack|breach|security|vulnerability|inject/.test(body) || detectPromptInjection(text)) types.add("SECURITY_CONCERN");
  if (/privacy|gdpr|delete my data|pii/.test(body)) types.add("PRIVACY_CONCERN");
  if (/legal|lawsuit|terms|attorney|regulated/.test(body)) types.add("LEGAL_CONCERN");
  if (/are you (an? )?(ai|bot)|who are you/.test(body)) types.add("IDENTITY_QUESTION");
  if (types.size === 0) types.add("OTHER");
  return [...types];
}

export function looksLikeProductSuggestion(text: string): boolean {
  return /it would be better if|i wish (it )?could|can you (add|build|make|store|save)|i need to be able to|this is confusing|why can't i|it would save me time if|you should add|this doesn't work when|save (my |the )?(comparison|scenario)|store scenario|persist|export|filter|sort|remember|come back to/i.test(text)
    || classifyFeedbackTypes(text).some((type) => type === "FEATURE_REQUEST" || type === "BUG" || type === "USABILITY_PROBLEM" || type === "WORKFLOW_FRICTION" || type === "ACCESSIBILITY_ISSUE");
}

export function clusterKey(text: string): string {
  const body = text.toLowerCase();
  if (/export|pdf|download (a )?report/.test(body)) return "EXPORT";
  if (/save (my |the |this )?(comparison|scenario|deal|lease)|come back to (an )?old|store (my |the )?scenario|persistent|history|old lease/.test(body)) return "SAVED_SCENARIOS";
  if (/concession|tenant improvement field|ti field/.test(body)) return "TENANT_CONCESSION_FIELD";
  if (/interpret|what (does|do) (this|these) (mean|number)|next step|actionable/.test(body)) return "RESULT_INTERPRETATION";
  if (/login|sign in|password/.test(body)) return "AUTH_ACCESS";
  if (/mobile|phone|responsive|small screen/.test(body)) return "MOBILE_UX";
  if (/filter|sort/.test(body)) return "FILTER_SORT";
  if (/broken|doesn't work|error/.test(body)) return "BUG_GENERIC";
  const words = body.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 4).slice(0, 6);
  return words.join("_") || "OTHER";
}

export function requestedCapability(text: string, key: string): string {
  if (key === "SAVED_SCENARIOS") return "Saved scenarios / persistent comparison history";
  if (key === "EXPORT") return "Export";
  if (key === "TENANT_CONCESSION_FIELD") return "Tenant concession comparison field";
  if (key === "RESULT_INTERPRETATION") return "Result interpretation and next steps";
  if (key === "MOBILE_UX") return "Mobile / responsive usability";
  if (key === "FILTER_SORT") return "Filter or sort";
  return text.slice(0, 120);
}

export function implementationClass(types: FeedbackType[], key: string): "COPY" | "UX_REPAIR" | "WORKFLOW" | "EXPORT" | "PERSISTENCE" | "FEATURE" | "BUGFIX" | "SECURITY" | "LEGAL" | "PRICING" {
  if (types.includes("SECURITY_CONCERN") || types.includes("PRIVACY_CONCERN")) return "SECURITY";
  if (types.includes("LEGAL_CONCERN") || types.includes("PRICING_FEEDBACK")) return types.includes("PRICING_FEEDBACK") ? "PRICING" : "LEGAL";
  if (types.includes("BUG")) return "BUGFIX";
  if (key === "EXPORT") return "EXPORT";
  if (key === "SAVED_SCENARIOS") return "PERSISTENCE";
  if (key === "MOBILE_UX" || types.includes("USABILITY_PROBLEM") || types.includes("ACCESSIBILITY_ISSUE")) return "UX_REPAIR";
  if (key === "RESULT_INTERPRETATION") return "COPY";
  if (types.includes("WORKFLOW_FRICTION")) return "WORKFLOW";
  return "FEATURE";
}
