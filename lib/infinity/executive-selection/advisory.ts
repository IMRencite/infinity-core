import { randomUUID } from "node:crypto";
import type { ExecutiveAiAdvisoryMode } from "./constants";
import type { ExecutiveContextManifest } from "./types";

export function loadExecutiveAiAdvisoryMode(): ExecutiveAiAdvisoryMode {
  const raw = process.env.EXECUTIVE_AI_ADVISORY_MODE ?? "mock";
  if (raw === "shadow" || raw === "advisory" || raw === "disabled" || raw === "mock") {
    return raw;
  }
  return "mock";
}

export function runMockExecutiveAdvisory(input: {
  manifest: ExecutiveContextManifest;
  mode: ExecutiveAiAdvisoryMode;
}): { advisoryId: string; summary: Record<string, unknown>; recommendedOpportunityId: string | null } {
  const advisoryId = randomUUID();
  const ranked = input.manifest.rankedOpportunityIds ?? [];
  const recommendedOpportunityId = ranked[0] ?? null;

  return {
    advisoryId,
    summary: {
      mode: input.mode,
      recommended_opportunity_id: recommendedOpportunityId,
      comparison_notes: "Mock advisory — deterministic policy remains authoritative.",
      contradictions: [],
      hidden_risks: [],
      missing_information: [],
      tradeoffs: [],
    },
    recommendedOpportunityId,
  };
}
