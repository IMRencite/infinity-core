import { CUSTOMER_IMPROVEMENT_CTA } from "@/lib/infinity/venture-improvement-intake/types";

export function htmlContainsVisibleImprovementCta(html: string | null | undefined): boolean {
  if (!html) return false;
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  return text.includes(CUSTOMER_IMPROVEMENT_CTA);
}

export function classifySourceOnlyClaim(input: {
  component_exists: boolean;
  imported: boolean;
  rendered_html_contains_cta: boolean;
}): "SOURCE_ONLY_FALSE_POSITIVE" | "RENDERED" | "MISSING" {
  if (input.rendered_html_contains_cta) return "RENDERED";
  if (input.component_exists || input.imported) return "SOURCE_ONLY_FALSE_POSITIVE";
  return "MISSING";
}
