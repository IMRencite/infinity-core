const METRIC_STOP = new Set([
  "CPC",
  "CAC",
  "LTV",
  "ARR",
  "MRR",
  "NRR",
  "GRR",
  "JSON",
  "LLM",
  "LLMS",
  "SEO",
  "AEO",
  "GEO",
  "AI",
  "SMB",
  "CMS",
  "API",
]);

const GENERIC_SPANS =
  /^(Business|Businesses|Bundled|Traditional|Modern CMS|Customer Acquisition Cost|Cost Per Click|Average Google Ads|Typical B2B SaaS|Owners|Industry|Category|Comparable|Platforms?|Vendors|Customers|Operators|Software|Digital|Website|Market|Tools|Spend|B2B SaaS|Generative Engine Optimization)$/i;

const KNOWN_PLATFORMS_NOT_COMPARABLE = /^(ChatGPT|Gemini|Perplexity|Google|Google Ads)$/i;

const COMMERCIAL_CONTEXT =
  /\b(charges?|sells?|operates?|pricing|plans?|subscription|retainer|packages?|vendor|competitor|platform|cms|website builder|website-as-a-service)\b/i;

export type ComparableEntityQualification = {
  name: string;
  validEntity: boolean;
  comparableCandidate: boolean;
  reason: string;
};

export function qualifyComparableEntity(name: string, claim: string, verifiedCompetitor?: string | null): ComparableEntityQualification {
  const trimmed = name.trim();
  if (!trimmed) return { name: trimmed, validEntity: false, comparableCandidate: false, reason: "Empty name." };
  const first = trimmed.split(/\s+/)[0] ?? trimmed;
  if (METRIC_STOP.has(first.toUpperCase()) || METRIC_STOP.has(trimmed.toUpperCase())) {
    return { name: trimmed, validEntity: false, comparableCandidate: false, reason: "Metric or technical token, not a company." };
  }
  if (GENERIC_SPANS.test(trimmed)) {
    return { name: trimmed, validEntity: false, comparableCandidate: false, reason: "Generic capitalized noun phrase." };
  }
  if (trimmed.length < 3) {
    return { name: trimmed, validEntity: false, comparableCandidate: false, reason: "Name too short to be an entity." };
  }
  if (KNOWN_PLATFORMS_NOT_COMPARABLE.test(trimmed)) {
    return {
      name: trimmed,
      validEntity: true,
      comparableCandidate: false,
      reason: "Known product/platform is a real entity but not a CMS pricing comparable.",
    };
  }
  const verified = verifiedCompetitor?.trim().toLowerCase() === trimmed.toLowerCase();
  const commercial = COMMERCIAL_CONTEXT.test(claim) || verified;
  if (!commercial) {
    return {
      name: trimmed,
      validEntity: /^[A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,2}$/.test(trimmed),
      comparableCandidate: false,
      reason: "No commercial offering context for this name.",
    };
  }
  return {
    name: trimmed,
    validEntity: true,
    comparableCandidate: true,
    reason: verified ? "Founder-verified competitor with commercial context." : "Named organization/product with commercial offering context.",
  };
}

export function extractQualifiedComparableNames(text: string, verifiedCompetitors: string[] = []): string[] {
  const names: string[] = [];
  for (const match of text.matchAll(/\b([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,2})\b/g)) {
    const name = match[1]!;
    const verified = verifiedCompetitors.find((item) => item.toLowerCase() === name.toLowerCase()) ?? null;
    const qualified = qualifyComparableEntity(name, text, verified);
    if (qualified.comparableCandidate) names.push(name);
  }
  return [...new Set(names)];
}
