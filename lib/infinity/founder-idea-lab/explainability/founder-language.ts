/**
 * Deterministic founder-language translations.
 * Presentation only — does not change scores, decisions, research, or persistence.
 */

export const DECISION_DISPLAY = {
  HOLD: "Hold for now",
  VALIDATE: "Worth testing",
  BUILD: "Ready to build",
  REJECT: "Do not pursue",
} as const;

export const STATUS_DISPLAY: Record<string, string> = {
  HOLD: DECISION_DISPLAY.HOLD,
  VALIDATE: DECISION_DISPLAY.VALIDATE,
  BUILD: DECISION_DISPLAY.BUILD,
  REJECT: DECISION_DISPLAY.REJECT,
  HELD: "Hold for now",
  VALIDATING: "Worth testing",
  REJECTED: "Do not pursue",
  REVENUE_MODEL_INSUFFICIENT: "We still need better money-model evidence",
  REVENUE_MODEL_PARTIAL: "We have some money-model evidence, but not a complete picture",
  REVENUE_MODEL_SUFFICIENT: "We have enough money-model evidence to describe how this could charge",
  INSUFFICIENT_DATA: "Not enough data yet",
  INSUFFICIENT_REVENUE_EVIDENCE: "Not enough money-model evidence yet",
  COMPARABLE_MODELED: "Estimated from similar businesses",
  CATEGORY_BENCHMARK: "Estimated from category benchmarks",
  COMPANY_COMPARABLE: "Estimated from a similar company",
  ADJACENT_BENCHMARK: "Estimated from a nearby category",
  VALIDATION_ESTIMATE: "Measured during a bounded test",
  SCENARIO_MODEL: "Scenario planning, not a forecast",
  FOUNDER_HYPOTHESIS: "Founder assumption",
  BENCHMARK_SUFFICIENT: "Enough benchmark evidence to estimate",
  BENCHMARK_PARTIAL: "Some benchmark evidence, but not a complete picture",
  BENCHMARK_INSUFFICIENT: "Not enough trustworthy benchmark evidence yet",
  PROMISING_BUT_UNVALIDATED: "Looks promising on paper, but not proven",
  ATTRACTIVE: "Looks economically attractive — not proven",
  MARGINAL: "The modeled economics look tight",
  UNATTRACTIVE: "The modeled economics look weak",
  OBSERVED: "Based on researched evidence",
  EVIDENCE_GROUNDED: "Based on researched evidence",
  UNKNOWN: "Not known yet",
  NONE: "Not known yet",
  SOURCE_BACKED_FINDING: "Source-backed",
  INFINITY_INFERENCE: "Infinity inference",
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  WEAK_EXCLUDED: "Weak",
  INDEPENDENCE_UNKNOWN: "We cannot verify how independent these sources are",
  DIRECT_COMPARABLE: "Estimated from a similar company",
  COMPONENT_MODEL: "Estimated from grounded cost or funnel parts",
  MODELED_ASSUMPTION: "Modeled assumption",
  TABLE_STAKES: "Table stakes — customers already expect this",
  INCREMENTAL_ADVANTAGE: "Incremental advantage",
  MEANINGFUL_DIFFERENTIATOR: "Meaningful differentiator",
  UNPROVEN_IDEA: "Unproven idea",
  ALREADY_PLANNED: "Already in the planned product",
  ALREADY_BUILT: "Already built",
  PARTIALLY_COVERED: "Partly covered by the current plan",
  NEW_OPPORTUNITY: "New opportunity",
  QUALITY_REPLACEMENT_EXHAUSTED: "Could not find a better source",
};

export const DIMENSION_DISPLAY: Record<string, string> = {
  demand: "Demand",
  market: "Market",
  competition: "Competition",
  monetization: "Monetization",
  pricing: "Pricing",
  distribution: "Distribution",
  buildability: "Buildability",
  capital_efficiency: "Capital efficiency",
  speed_to_revenue: "Speed to revenue",
};

export const REVENUE_MODEL_SENTENCE: Record<string, string> = {
  SUBSCRIPTION_SAAS: "Monthly software subscription",
  SUBSCRIPTION_PLUS_SETUP: "Monthly software subscription plus a setup fee",
  HYBRID_SOFTWARE_SERVICE: "Monthly software subscription + setup fee + optional SEO/content services",
  MANAGED_SERVICE_RETAINER: "Monthly managed service retainer",
  PER_SEAT: "Per-seat monthly subscription",
  PER_USER: "Per-user monthly subscription",
  PER_LOCATION: "Per-location monthly subscription",
  USAGE_BASED: "Usage-based charges",
  TRANSACTION_FEE: "Transaction fees",
  COMMISSION: "Commission on each sale",
  MARKETPLACE_TAKE_RATE: "Marketplace take-rate",
  ADVERTISING: "Advertising revenue",
  LEAD_GENERATION: "Lead-generation fees",
  LICENSING: "Licensing fees",
  FREEMIUM_UPSELL: "Free plan with paid upgrades",
  ONE_TIME_IMPLEMENTATION: "One-time implementation fee",
  PRODUCTIZED_SERVICE: "Packaged service sold at a set price",
  OTHER: "A mix of charges that does not match a standard software model",
  UNKNOWN: "Not known yet",
};

const EVIDENCE_NEED_BY_DIMENSION: Record<string, string> = {
  pricing: "Comparable public pricing",
  distribution: "A proven customer acquisition channel",
  capital_efficiency: "Realistic customer acquisition cost",
  speed_to_revenue: "Time-to-first-revenue evidence",
  buildability: "Proof this is straightforward to build",
  demand: "Proof customers want this",
  market: "A clearer picture of the market",
  competition: "A clearer picture of the competitive gap",
  monetization: "Proof this specific offer can charge money",
};

const HOLDING_BACK_BY_DIMENSION: Record<string, string> = {
  pricing: "We do not yet know what comparable platforms actually charge.",
  distribution: "We have not proven the best customer acquisition channel.",
  capital_efficiency: "We do not know realistic customer acquisition cost.",
  speed_to_revenue: "We do not know how quickly this could start earning money.",
  buildability: "We have not yet proven how straightforward this is to build.",
  demand: "We still need stronger proof that customers want this.",
  market: "We still need a clearer picture of the market.",
  competition: "We still need a clearer picture of the competitive gap.",
  monetization: "We still need proof that this specific offer can charge money.",
};

const NEXT_RESEARCH_BY_SIGNAL: Array<{ test: RegExp; sentence: string }> = [
  { test: /pric|monthly|package/i, sentence: "Find real pricing from comparable platforms." },
  { test: /setup|onboard|implement/i, sentence: "Find setup/onboarding fee benchmarks." },
  { test: /cac|acquisition cost|capital_efficiency|capital efficiency/i, sentence: "Find CAC benchmarks for this customer/channel." },
  { test: /churn|retention/i, sentence: "Find churn/retention benchmarks." },
  { test: /distribution|channel|acquisition channel/i, sentence: "Validate the best acquisition channel." },
  { test: /margin/i, sentence: "Find gross-margin benchmarks for similar platforms." },
];

const INLINE_TOKEN_DISPLAY: Record<string, string> = {
  PROMISING_BUT_UNVALIDATED: "promising but unvalidated",
  ATTRACTIVE: "attractive",
  MARGINAL: "marginal",
  UNATTRACTIVE: "unattractive",
  COMPARABLE_MODELED: "estimates from similar businesses",
  CATEGORY_BENCHMARK: "category benchmarks",
  COMPANY_COMPARABLE: "a similar company",
  ADJACENT_BENCHMARK: "a nearby category",
  SCENARIO_MODEL: "scenario planning",
  FOUNDER_HYPOTHESIS: "a founder assumption",
  OBSERVED: "observed results",
  HYBRID_SOFTWARE_SERVICE: "monthly software plus optional service",
};

export function founderFacingCopy(value: unknown): string {
  let out = String(value ?? "").trim();
  if (!out) return out;
  const whole = out.toUpperCase().replace(/\s+/g, "_");
  if (STATUS_DISPLAY[out]) return STATUS_DISPLAY[out];
  if (STATUS_DISPLAY[whole]) return STATUS_DISPLAY[whole];
  const tokens = [...Object.keys(STATUS_DISPLAY), ...Object.keys(REVENUE_MODEL_SENTENCE)]
    .filter((key) => key.includes("_") && key === key.toUpperCase())
    .sort((a, b) => b.length - a.length);
  for (const token of tokens) {
    const replacement = INLINE_TOKEN_DISPLAY[token] ?? STATUS_DISPLAY[token] ?? REVENUE_MODEL_SENTENCE[token];
    if (!replacement || replacement === token) continue;
    out = out.replace(new RegExp(`\\b${token}\\b`, "gi"), replacement);
  }
  return out;
}

export function translateStatus(value: unknown): string {
  if (value == null) return STATUS_DISPLAY.UNKNOWN;
  const raw = String(value).trim();
  if (!raw) return STATUS_DISPLAY.UNKNOWN;
  if (STATUS_DISPLAY[raw]) return STATUS_DISPLAY[raw];
  const upper = raw.toUpperCase().replace(/\s+/g, "_");
  if (STATUS_DISPLAY[upper]) return STATUS_DISPLAY[upper];
  if (raw.includes("_") && /[A-Z]/.test(raw)) return founderFacingCopy(raw);
  return raw.includes("_") ? humanizeToken(raw) : raw;
}

export function translateDecision(value: unknown): string {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "HOLD" || raw === "HELD") return DECISION_DISPLAY.HOLD;
  if (raw === "VALIDATE" || raw === "VALIDATING") return DECISION_DISPLAY.VALIDATE;
  if (raw === "BUILD") return DECISION_DISPLAY.BUILD;
  if (raw === "REJECT" || raw === "REJECTED") return DECISION_DISPLAY.REJECT;
  return translateStatus(value);
}

export function translateDimension(value: string): string {
  return DIMENSION_DISPLAY[value] ?? humanizeToken(value);
}

export function translateFindingKind(value: unknown): string {
  return translateStatus(value);
}

export function revenueModelSentence(value: unknown): string {
  const raw = String(value ?? "UNKNOWN").trim();
  if (!raw || raw === "UNKNOWN" || raw === "NONE") return REVENUE_MODEL_SENTENCE.UNKNOWN;
  return REVENUE_MODEL_SENTENCE[raw] ?? humanizeToken(raw);
}

export function confidenceDisplay(value: unknown): string {
  const raw = String(value ?? "NONE").trim().toUpperCase();
  if (!raw || raw === "NONE" || raw === "UNKNOWN") return "Not enough data";
  if (raw === "HIGH") return "High";
  if (raw === "MEDIUM") return "Medium";
  if (raw === "LOW") return "Low";
  return translateStatus(raw);
}

export function isUnknownToken(value: unknown): boolean {
  if (value == null) return true;
  const raw = String(value).trim().toUpperCase();
  return !raw || raw === "UNKNOWN" || raw === "NONE" || raw === "N/A";
}

export function founderKnownOr(value: unknown, fallback = "Not known yet"): string {
  if (isUnknownToken(value)) return fallback;
  const raw = String(value).trim();
  if (raw.includes("_") && raw === raw.toUpperCase()) return translateStatus(raw);
  return raw;
}

export function humanizeToken(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function holdingBackSentence(dimension: string): string {
  return HOLDING_BACK_BY_DIMENSION[dimension] ?? `We still need better evidence on ${translateDimension(dimension).toLowerCase()}.`;
}

export function evidenceNeed(dimension: string): string {
  return EVIDENCE_NEED_BY_DIMENSION[dimension] ?? `Better ${translateDimension(dimension).toLowerCase()} evidence`;
}

export function nextResearchSentences(signals: string[]): string[] {
  const ordered: string[] = [];
  const blob = signals.join(" | ");
  for (const rule of NEXT_RESEARCH_BY_SIGNAL) {
    if (rule.test.test(blob) && !ordered.includes(rule.sentence)) {
      ordered.push(rule.sentence);
    }
    if (ordered.length >= 5) break;
  }
  return ordered.slice(0, 5);
}

export function evidenceStatusLabel(strength: string, polarity: string): string {
  if (strength === "none") return "NO EVIDENCE YET";
  if (polarity === "negative") return "NEGATIVE EVIDENCE";
  if (polarity === "mixed") return "MIXED EVIDENCE";
  if (strength === "adequate" && polarity === "positive") return "GOOD EVIDENCE";
  if (strength === "partial" && polarity === "positive") return "SOME EVIDENCE";
  if (strength === "adequate") return "GOOD EVIDENCE";
  if (strength === "partial") return "SOME EVIDENCE";
  return "NO EVIDENCE YET";
}

export function driverStatus(strength: string, polarity: string): string {
  if (strength === "none" || polarity === "unknown") return "Missing";
  if (polarity === "negative") return "Weak";
  if (strength === "adequate" && polarity === "positive") return "Strong";
  if (polarity === "positive") return "Positive";
  if (polarity === "mixed") return "Mixed";
  return "Missing";
}

export function asSentence(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

export function formatScore(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export function parseNumeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "UNKNOWN" || trimmed === "NONE") return null;
    const match = trimmed.match(/-?\d+(?:\.\d+)?/);
    if (!match) return null;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
