import { randomUUID } from "node:crypto";
import { canonicalizeSourceUrl, dedupeSources, extractDomain } from "./dedupe";
import type {
  GroundingUsage,
  NormalizedEvidenceItem,
  NormalizedSource,
  ProviderResearchStructuredOutput,
  ResearchFinding,
  ResearchResult,
} from "../types";

type GroundingChunk = {
  web?: { uri?: string; title?: string; domain?: string };
};

type GroundingMetadata = {
  groundingChunks?: GroundingChunk[];
  groundingSupports?: unknown[];
  webSearchQueries?: string[];
};

function extractAllowedSourceUrls(groundingMetadata: GroundingMetadata | null): Map<string, NormalizedSource> {
  const retrievedAt = new Date().toISOString();
  const map = new Map<string, NormalizedSource>();

  for (const [index, chunk] of (groundingMetadata?.groundingChunks ?? []).entries()) {
    const uri = chunk.web?.uri?.trim();
    if (!uri || !/^https?:\/\//i.test(uri)) continue;

    const canonicalUrl = canonicalizeSourceUrl(uri);
    if (map.has(canonicalUrl)) continue;

    map.set(canonicalUrl, {
      sourceId: `src_${index + 1}`,
      url: uri,
      canonicalUrl,
      title: chunk.web?.title ?? null,
      domain: chunk.web?.domain ?? extractDomain(uri),
      retrievedAt,
      providerChunkIndex: index,
    });
  }

  return map;
}

function buildGroundingUsage(groundingMetadata: GroundingMetadata | null): GroundingUsage {
  const webSearchQueries = (groundingMetadata?.webSearchQueries ?? []).filter(
    (query) => typeof query === "string" && query.trim().length > 0,
  );
  const groundingChunkCount = groundingMetadata?.groundingChunks?.length ?? 0;
  const groundingSupportCount = groundingMetadata?.groundingSupports?.length ?? 0;

  return {
    webSearchQueries,
    searchQueryCount: webSearchQueries.length,
    groundingChunkCount,
    groundingSupportCount,
    groundingInvoked:
      webSearchQueries.length > 0 || groundingChunkCount > 0 || groundingSupportCount > 0,
    searchCostKnown: false,
  };
}

export function normalizeGroundedResearch(input: {
  researchRunId: string;
  organizationId: string;
  missionId: string | null;
  providerId: ResearchResult["providerId"];
  modelId: string;
  researchObjective: string;
  inputHash: string;
  structured: ProviderResearchStructuredOutput;
  groundingMetadata: GroundingMetadata | null;
  tokenUsage: ResearchResult["tokenUsage"];
  groundingUsage: GroundingUsage;
  estimatedCostUsd: number | null;
  costUncertainty: string | null;
  latencyMs: number;
  requestId: string | null;
  retryMetadata: ResearchResult["retryMetadata"];
  rawProviderResponseStored: boolean;
  runPurpose?: string;
}): ResearchResult {
  const allowedSourcesMap = extractAllowedSourceUrls(input.groundingMetadata);
  const sources = dedupeSources([...allowedSourcesMap.values()]);

  const sourceByCanonical = new Map(sources.map((source) => [source.canonicalUrl, source]));

  const evidence: NormalizedEvidenceItem[] = [];
  const findings: ResearchFinding[] = [];

  for (const finding of input.structured.findings) {
    const evidenceId = `evidence_${finding.findingId}`;
    const validatedUrls: string[] = [];
    const sourceIds: string[] = [];

    for (const url of finding.sourceUrls) {
      const canonical = canonicalizeSourceUrl(url);
      const matched = sourceByCanonical.get(canonical);
      if (!matched) {
        if (finding.grounded && !finding.inference) {
          throw new Error(
            `Grounded finding ${finding.findingId} references URL not present in grounding metadata: ${url}`,
          );
        }
        continue;
      }
      validatedUrls.push(matched.url);
      sourceIds.push(matched.sourceId);
    }

    if (finding.grounded && !finding.inference && validatedUrls.length === 0) {
      for (const matched of sources) {
        validatedUrls.push(matched.url);
        sourceIds.push(matched.sourceId);
      }
    }

    if (finding.grounded && !finding.inference && validatedUrls.length === 0) {
      throw new Error(`Grounded finding ${finding.findingId} lacks validated source URLs.`);
    }

    const evidenceType = finding.inference
      ? "inference_from_evidence"
      : finding.grounded
        ? "direct_grounded"
        : "ungrounded";

    evidence.push({
      evidenceId,
      findingId: finding.findingId,
      claim: finding.claim,
      observedSignal: finding.observedSignal,
      signalType: finding.signalType,
      evidenceType,
      grounded: finding.grounded && validatedUrls.length > 0,
      sourceIds,
      sourceUrls: validatedUrls,
      relevance: finding.relevance,
      confidence: null,
      sourceDate: null,
      limitations: finding.limitations,
      providerConfidence: finding.confidence,
    });

    findings.push({
      findingId: finding.findingId,
      summary: finding.claim,
      signalType: finding.signalType,
      evidenceIds: [evidenceId],
    });
  }

  if (evidence.length > input.structured.findings.length) {
    throw new Error("Evidence normalization produced unexpected item count.");
  }

  const groundingUsage = input.groundingUsage.groundingInvoked
    ? input.groundingUsage
    : buildGroundingUsage(input.groundingMetadata);

  if (!groundingUsage.groundingInvoked) {
    throw new Error("Google Search grounding was not invoked — no grounding metadata returned.");
  }

  return {
    researchRunId: input.researchRunId,
    organizationId: input.organizationId,
    missionId: input.missionId,
    providerId: input.providerId,
    modelId: input.modelId,
    researchObjective: input.researchObjective,
    inputHash: input.inputHash,
    generatedAt: new Date().toISOString(),
    summary: input.structured.summary,
    findings,
    evidence,
    sources,
    limitations: input.structured.limitations,
    requiresMoreResearch: input.structured.requiresMoreResearch,
    groundedStatus: true,
    validationStatus: "validated",
    tokenUsage: input.tokenUsage,
    groundingUsage,
    estimatedCostUsd: input.estimatedCostUsd,
    costUncertainty: input.costUncertainty,
    latencyMs: input.latencyMs,
    requestId: input.requestId,
    retryMetadata: input.retryMetadata,
    status: "completed",
    provenance: {
      schemaVersion: input.structured.schemaVersion,
      promptVersion: "grounded_research_prompt_v1",
      rawProviderResponseStored: input.rawProviderResponseStored,
      normalizationApplied: true,
      ...(input.runPurpose ? { purpose: input.runPurpose } : {}),
    },
    completedAt: new Date().toISOString(),
  };
}

export function extractGroundingMetadata(raw: Record<string, unknown>): GroundingMetadata | null {
  const candidates = raw.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return null;
  }
  const first = candidates[0];
  if (typeof first !== "object" || first === null) {
    return null;
  }
  const groundingMetadata = (first as Record<string, unknown>).groundingMetadata;
  if (typeof groundingMetadata !== "object" || groundingMetadata === null) {
    return null;
  }
  return groundingMetadata as GroundingMetadata;
}

export function buildGroundingUsageFromMetadata(
  groundingMetadata: GroundingMetadata | null,
): GroundingUsage {
  return buildGroundingUsage(groundingMetadata);
}

export { randomUUID };
