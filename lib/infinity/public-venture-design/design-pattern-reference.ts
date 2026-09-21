import { DESIGN_PATTERN_IDS } from "./constants";
import type { DesignPatternReference } from "./types";

const PRINCIPLES: DesignPatternReference[] = [
  { patternId: "CINEMATIC_HIERARCHY", category: "hierarchy", principle: "One dominant visual and headline, then supporting copy.", bestFor: "Premium product heroes", avoidWhen: "Dense operational dashboards as the first thing", accessibilityNotes: "Do not rely on motion to reveal the headline", conversionPurpose: "Immediate product understanding", copiedSourceHtml: false },
  { patternId: "FOCUSED_HERO", category: "hero", principle: "Value, audience, action, and product visual in one composition.", bestFor: "B2B software validation", avoidWhen: "Marketplace discovery feeds", accessibilityNotes: "Keep CTA keyboard reachable above the fold", conversionPurpose: "Action without scrolling for intent", copiedSourceHtml: false },
  { patternId: "PRODUCT_FIRST_VISUALIZATION", category: "visualization", principle: "Show the workflow, not lifestyle decoration.", bestFor: "Software and data products", avoidWhen: "Physical-goods catalogs that need photography", accessibilityNotes: "Label illustrative numbers", conversionPurpose: "Reduce 'what is this?' bounce", copiedSourceHtml: false },
  { patternId: "MODULAR_COMMERCE_STRUCTURE", category: "composition", principle: "Reusable section modules with a planned sequence.", bestFor: "Cross-venture reuse", avoidWhen: "One-off campaign microsites with no reuse", accessibilityNotes: "Each module keeps its heading", conversionPurpose: "Repeat proven structures", copiedSourceHtml: false },
  { patternId: "DATA_DENSITY_WITH_CLARITY", category: "data", principle: "Show enough numbers to be credible, hide the rest.", bestFor: "Analytical buyers", avoidWhen: "Consumer impulse products", accessibilityNotes: "Do not use tiny chart labels", conversionPurpose: "Informed pricing feedback", copiedSourceHtml: false },
  { patternId: "PROGRESSIVE_DISCLOSURE", category: "content", principle: "Explain complexity after the offer is clear.", bestFor: "Sophisticated B2B", avoidWhen: "Simple single-action pages", accessibilityNotes: "Disclosed content remains in the DOM", conversionPurpose: "Avoid overwhelm before CTA", copiedSourceHtml: false },
  { patternId: "STRONG_WHITESPACE", category: "spacing", principle: "Premium is rhythm, not empty luxury.", bestFor: "Institutional software", avoidWhen: "High-SKU catalogs", accessibilityNotes: "Line length stays readable", conversionPurpose: "Focus the CTA", copiedSourceHtml: false },
  { patternId: "PREMIUM_SURFACE_DEPTH", category: "surface", principle: "One elevated frame, otherwise hairline surfaces.", bestFor: "Product mockups", avoidWhen: "Glassmorphism as the whole page", accessibilityNotes: "Contrast on panels stays AA", conversionPurpose: "Make the product the object", copiedSourceHtml: false },
  { patternId: "REPEATED_CONVERSION_ANCHORS", category: "conversion", principle: "Primary action appears after each decision block.", bestFor: "Pilot and waitlist tests", avoidWhen: "Single-scroll stories with one footer button", accessibilityNotes: "Same accessible name for the same action", conversionPurpose: "Capture intent near pricing", copiedSourceHtml: false },
  { patternId: "MOBILE_FIRST_COMPOSITION", category: "responsive", principle: "Split heroes stack; charts remain readable.", bestFor: "All public artifacts", avoidWhen: "Interaction-only desktop widgets", accessibilityNotes: "No horizontal overflow", conversionPurpose: "Mobile evaluators can still act", copiedSourceHtml: false },
  { patternId: "TRUST_NEAR_DECISION", category: "trust", principle: "Put honest scope and disclosure next to pricing and form.", bestFor: "Early validation", avoidWhen: "Fake social proof", accessibilityNotes: "Disclosure is not color-only", conversionPurpose: "Reduce false-finished-product confusion", copiedSourceHtml: false },
];

export function designPatternReferenceLibrary(): DesignPatternReference[] {
  return PRINCIPLES;
}

export function designPatternReference(id: (typeof DESIGN_PATTERN_IDS)[number]): DesignPatternReference {
  const found = PRINCIPLES.find((item) => item.patternId === id);
  if (!found) throw new Error(`unknown_design_pattern:${id}`);
  return found;
}
