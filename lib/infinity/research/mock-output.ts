import type { ProviderResearchStructuredOutput } from "./types";

export function buildMockProviderResearchOutput(input?: {
  researchObjective?: string;
}): ProviderResearchStructuredOutput {
  return {
    schemaVersion: "grounded_research_v1",
    summary:
      "Mock grounded research identified three recurring problem signals with representative sources.",
    findings: [
      {
        findingId: "problem_1",
        claim:
          "Small businesses struggle with manual invoice follow-up and late-payment tracking.",
        signalType: "workflow_inefficiency",
        observedSignal: "Operators report spending hours chasing unpaid invoices manually.",
        relevance: "High for micro-SaaS automation opportunities.",
        confidence: 0.7,
        grounded: true,
        inference: false,
        sourceUrls: ["https://example.com/mock-invoice-pain"],
        limitations: ["Mock source for unit tests only."],
      },
      {
        findingId: "problem_2",
        claim: "Users complain about expensive all-in-one CRM tools for simple lead tracking.",
        signalType: "pricing_pain",
        observedSignal: "Forum threads cite $100+/month CRM costs for basic needs.",
        relevance: "Supports lightweight lead-management niches.",
        confidence: 0.65,
        grounded: true,
        inference: false,
        sourceUrls: ["https://example.com/mock-crm-pricing"],
        limitations: ["Mock source for unit tests only."],
      },
      {
        findingId: "problem_3",
        claim: "Teams lack affordable webhook monitoring for indie SaaS products.",
        signalType: "recurring_problem",
        observedSignal: "Developers report missed webhook failures causing silent data loss.",
        relevance: "Developer-tool niche with recurring monitoring need.",
        confidence: 0.68,
        grounded: true,
        inference: false,
        sourceUrls: ["https://example.com/mock-webhook-monitoring"],
        limitations: ["Mock source for unit tests only."],
      },
    ],
    limitations: ["Mock provider output — not real web research."],
    requiresMoreResearch: true,
  };
}

export function buildMockGroundingMetadata(): Record<string, unknown> {
  return {
    webSearchQueries: ["mock business workflow pain points"],
    groundingChunks: [
      {
        web: {
          uri: "https://example.com/mock-invoice-pain",
          title: "Mock Invoice Pain Article",
          domain: "example.com",
        },
      },
      {
        web: {
          uri: "https://example.com/mock-crm-pricing",
          title: "Mock CRM Pricing Complaints",
          domain: "example.com",
        },
      },
      {
        web: {
          uri: "https://example.com/mock-webhook-monitoring",
          title: "Mock Webhook Monitoring Gap",
          domain: "example.com",
        },
      },
    ],
    groundingSupports: [{ segment: { text: "mock" }, groundingChunkIndices: [0, 1, 2] }],
  };
}
