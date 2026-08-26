import { GROUNDED_RESEARCH_PROMPT_VERSION, GROUNDED_RESEARCH_SCHEMA_VERSION } from "./constants";

export type ResearchPromptOptions = {
  requireSourceUrls?: boolean;
  /** Gemini Interactions API often omits support-index metadata — model must echo grounding identities. */
  modelProvidedSources?: boolean;
  plannedQueries?: string[];
  targetDimensions?: string[];
  maxFindings?: number;
  phase?: "initial" | "gap_fill";
};

export function buildResearchSystemInstructions(options?: ResearchPromptOptions): string {
  const sourceUrlRule = options?.modelProvidedSources
    ? [
        "- For every finding marked grounded=true and inference=false, populate sourceUrls with the exact Gemini grounding-api-redirect HTTPS URIs that appeared in this response's search grounding (host vertexaisearch.cloud.google.com, path /grounding-api-redirect/...).",
        "- Do not invent publisher URLs, google.com/search links, YouTube links, or any URL that did not appear as a provider grounding identity.",
      ].join("\n")
    : "- Leave every finding sourceUrls as an empty array []; grounded URLs are attached server-side from search metadata.";

  return [
    "You are Infinity Grounded Research — an evidence collection engine.",
    "Your job is to gather CURRENT externally grounded evidence using Google Search grounding.",
    "Do NOT propose businesses, ventures, missions, or company ideas.",
    "Do NOT recommend what Infinity should build.",
    "Return only evidence-backed findings about recurring customer/business problems.",
    "",
    "Rules:",
    "- Mark grounded=true and inference=false only when a claim is directly supported by retrieved search grounding.",
    "- Mark inference=true only for derived conclusions. Inference findings must not masquerade as direct evidence.",
    "- Never mark inference=true merely to avoid citing sources.",
    "- Provide sourceUrls ONLY for provider-grounded identities actually returned by grounding/search results.",
    "- Never invent URLs, citations, dates, or publication titles.",
    "- relevance must be exactly one of: positive, negative, mixed, unknown.",
    "- If evidence is weak or uncertain, say so in limitations and set requiresMoreResearch=true.",
    "- Return distinct findings for each supported material signal, up to the configured maximum finding count. Do not collapse research into exactly three findings.",
    "- Prefer direct findings for demand, market, competition, pricing, and category monetization when search evidence exists.",
    "- Distribution, buildability, capital requirements, and speed to revenue may be direct only when externally observable; otherwise mark inference=true or omit.",
    "- Founder-supplied competitor names are research leads only. They are not verified competition evidence.",
    sourceUrlRule,
    "- Return strictly valid JSON. Every limitations field must be a JSON array of strings.",
    "- Keep summary under 800 characters and each claim under 240 characters.",
    "",
    `Schema version: ${GROUNDED_RESEARCH_SCHEMA_VERSION}`,
    `Prompt version: ${GROUNDED_RESEARCH_PROMPT_VERSION}`,
  ].join("\n");
}

export function buildResearchUserPrompt(
  researchObjective: string,
  options?: ResearchPromptOptions,
): string {
  const planned =
    options?.plannedQueries?.length
      ? [
          "",
          options.phase === "gap_fill"
            ? "GAP-FILL PHASE: Search only the unresolved dimensions below. Do not repeat already-answered market queries."
            : "INITIAL COVERAGE PHASE: Prefer these bounded searches. Do not invent a large extra query set.",
          options.targetDimensions?.length
            ? `Target dimensions: ${options.targetDimensions.join(", ")}.`
            : "",
          `Planned searches (execute these; add at most one clarifying variant per gap if a result is empty):`,
          ...options.plannedQueries.map((query, index) => `${index + 1}. ${query}`),
          `Return at most ${options.maxFindings ?? 12} distinct findings covering supported signals.`,
        ]
          .filter(Boolean)
          .join("\n")
      : "";

  const sourceRequirement = options?.requireSourceUrls
    ? options.modelProvidedSources
      ? [
          "",
          "CRITICAL: Every finding marked grounded=true and inference=false MUST include at least one sourceUrls entry that is an exact provider grounding identity from this response.",
          "Use Gemini grounding-api-redirect URIs (vertexaisearch.cloud.google.com) when those are the identities search grounding returned.",
          "Do not invent public publisher URLs. Never use google.com/search links.",
          "Do not mark grounded=true unless the claim is clearly supported by search evidence.",
        ].join("\n")
      : [
          "",
          "CRITICAL: Every finding marked grounded=true MUST be directly supported by retrieved search results.",
          "If search grounding returns source metadata, leave finding sourceUrls as [] — the server attaches validated URLs.",
          "Do not mark grounded=true unless the claim is clearly supported by search evidence returned in this response.",
        ].join("\n")
    : "";

  return [
    "Perform grounded web research for the following objective.",
    "Use Google Search grounding to collect current external evidence.",
    "",
    `Objective: ${researchObjective}`,
    "",
    "Return JSON matching the required schema with:",
    "- summary",
    "- findings[] (findingId, claim, signalType, observedSignal, relevance, confidence 0-1 or null, grounded, inference, sourceUrls, limitations)",
    "- limitations[]",
    "- requiresMoreResearch",
    "",
    "Allowed signalType values include search_demand, customer_complaints, purchase_intent, recurring_problem, growing_market, underserved_niche, technological_shift, competitor_presence, competitor_weakness, pricing_pain, monetization_precedent, distribution_opportunity, workflow_inefficiency, capital_requirement, time_to_revenue.",
    "Do not propose businesses. Evidence only.",
    planned,
    sourceRequirement,
  ]
    .filter(Boolean)
    .join("\n");
}
