import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { runGroundedResearch } from "@/lib/infinity/research/run";
import type { OrganicGrowthEngineConfig } from "../config";
import type { VentureOrganicContext } from "../types";

export type GroundedEvidenceResult = {
  context: VentureOrganicContext;
  researchRunIds: string[];
  status: "ENRICHED" | "SKIPPED_DISABLED" | "SKIPPED_MISSING_CREDENTIALS" | "FAILED";
  message?: string;
};

function hasResearchCredentials(): boolean {
  return Boolean(
    process.env.GEMINI_API_KEY?.trim() ||
      process.env.GOOGLE_API_KEY?.trim() ||
      process.env.RESEARCH_PROVIDER === "mock",
  );
}

export async function enrichContextWithGroundedResearch(
  admin: AdminSupabaseClient,
  organizationId: string,
  context: VentureOrganicContext,
  config: OrganicGrowthEngineConfig,
  idempotencySuffix: string,
): Promise<GroundedEvidenceResult> {
  if (!config.enableGroundedResearch) {
    return { context, researchRunIds: [], status: "SKIPPED_DISABLED" };
  }

  if (!hasResearchCredentials()) {
    return {
      context,
      researchRunIds: [],
      status: "SKIPPED_MISSING_CREDENTIALS",
      message: "Grounded research credentials not configured",
    };
  }

  const needsLocalEvidence =
    /local|service|city|neighborhood/.test(context.ventureType.toLowerCase()) ||
    Boolean(context.contentArchitecture?.geography);

  if (!needsLocalEvidence) {
    return { context, researchRunIds: [], status: "SKIPPED_DISABLED", message: "No research-required signals" };
  }

  try {
    const result = await runGroundedResearch(admin, {
      organizationId,
      idempotencyKey: `organic-growth-evidence-${context.ventureId}-${idempotencySuffix}`,
      researchObjective: `Gather verifiable local and topical evidence for organic SEO architecture planning for ${context.ventureName}. Focus on ${context.targetCustomer} and ${context.solution}. Context: ${context.businessSummary}`,
      runPurpose: "organic_growth_evidence",
    });

    if (!result.ok) {
      return {
        context,
        researchRunIds: result.failure.researchRunId ? [result.failure.researchRunId] : [],
        status: "FAILED",
        message: result.failure.message ?? "Research failed",
      };
    }

    const evidenceSnippets = (result.result.evidence ?? [])
      .slice(0, 8)
      .map((e) => String(e.claim ?? ""))
      .filter(Boolean);

    const enriched: VentureOrganicContext = {
      ...context,
      contentArchitecture: {
        ...(context.contentArchitecture ?? {}),
        groundedResearch: {
          researchRunId: result.result.researchRunId,
          evidenceSnippets,
          sourceCount: result.result.sources?.length ?? 0,
        },
      },
    };

    if (evidenceSnippets.length > 0) {
      enriched.contentArchitecture = {
        ...enriched.contentArchitecture,
        evidenceAvailabilityBoost: Math.min(0.85, 0.45 + evidenceSnippets.length * 0.05),
      };
    }

    return {
      context: enriched,
      researchRunIds: [result.result.researchRunId],
      status: "ENRICHED",
    };
  } catch (error) {
    return {
      context,
      researchRunIds: [],
      status: "FAILED",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
