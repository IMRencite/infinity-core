import { randomUUID } from "node:crypto";
import { ResearchError } from "../failures";
import { canonicalizeSourceUrl, dedupeSources, extractDomain, sourceIdentityKey } from "./dedupe";
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
  retrievedContext?: { uri?: string; title?: string };
};

type GroundingMetadata = {
  groundingChunks?: GroundingChunk[];
  groundingSupports?: unknown[];
  webSearchQueries?: string[];
};

function chunkUri(chunk: GroundingChunk): { uri: string; title: string | null; domain: string | null } | null {
  const webUri = chunk.web?.uri?.trim();
  if (webUri && /^https?:\/\//i.test(webUri)) {
    return {
      uri: webUri,
      title: chunk.web?.title ?? null,
      domain: chunk.web?.domain ?? extractDomain(webUri),
    };
  }
  const retrievedUri = chunk.retrievedContext?.uri?.trim();
  if (retrievedUri && /^https?:\/\//i.test(retrievedUri)) {
    return {
      uri: retrievedUri,
      title: chunk.retrievedContext?.title ?? null,
      domain: extractDomain(retrievedUri),
    };
  }
  return null;
}

function extractAllowedSourceUrls(groundingMetadata: GroundingMetadata | null): {
  sourcesByCanonical: Map<string, NormalizedSource>;
  sourceByChunkIndex: Map<number, NormalizedSource>;
} {
  const retrievedAt = new Date().toISOString();
  const sourcesByCanonical = new Map<string, NormalizedSource>();
  const sourceByChunkIndex = new Map<number, NormalizedSource>();

  for (const [index, chunk] of (groundingMetadata?.groundingChunks ?? []).entries()) {
    const extracted = chunkUri(chunk);
    if (!extracted) continue;

    const canonicalUrl = canonicalizeSourceUrl(extracted.uri);
    const existing = sourcesByCanonical.get(canonicalUrl);
    if (existing) {
      sourceByChunkIndex.set(index, existing);
      continue;
    }

    const source: NormalizedSource = {
      sourceId: `src_${index + 1}`,
      url: extracted.uri,
      canonicalUrl,
      title: extracted.title,
      domain: extracted.domain,
      retrievedAt,
      providerChunkIndex: index,
    };
    sourcesByCanonical.set(canonicalUrl, source);
    sourceByChunkIndex.set(index, source);
  }

  return { sourcesByCanonical, sourceByChunkIndex };
}

function readGroundingChunkIndices(support: unknown): number[] {
  const record = typeof support === "object" && support !== null ? (support as Record<string, unknown>) : null;
  if (!record) return [];
  const raw = record.groundingChunkIndices ?? record.grounding_chunk_indices;
  if (!Array.isArray(raw)) return [];
  return raw.filter((index): index is number => typeof index === "number");
}

function resolveSupportBackedSources(
  groundingSupports: unknown[] | undefined,
  sourceByChunkIndex: Map<number, NormalizedSource>,
  chunkCount: number,
): { urls: string[]; sourceIds: string[] } {
  if (!groundingSupports?.length) {
    return { urls: [], sourceIds: [] };
  }

  const urls: string[] = [];
  const sourceIds: string[] = [];
  const seen = new Set<string>();

  for (const support of groundingSupports) {
    for (const index of readGroundingChunkIndices(support)) {
      if (!Number.isInteger(index) || index < 0 || index >= chunkCount) {
        throw new ResearchError(
          `Grounding support references out-of-bounds chunk index: ${index}`,
          "evidence_validation_failure",
        );
      }
      const matched = sourceByChunkIndex.get(index);
      if (!matched) {
        throw new ResearchError(
          `Grounding support references missing chunk metadata at index: ${index}`,
          "evidence_validation_failure",
        );
      }
      if (seen.has(matched.sourceId)) continue;
      seen.add(matched.sourceId);
      urls.push(matched.url);
      sourceIds.push(matched.sourceId);
    }
  }

  return { urls, sourceIds };
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
  candidateId?: string | null;
}): ResearchResult {
  const extractedSources = extractAllowedSourceUrls(input.groundingMetadata);
  const sources = dedupeSources([...extractedSources.sourcesByCanonical.values()]);
  const sourceByIdentity = new Map(sources.map((source) => [sourceIdentityKey(source.canonicalUrl), source]));
  const supportBacked = resolveSupportBackedSources(
    input.groundingMetadata?.groundingSupports,
    extractedSources.sourceByChunkIndex,
    input.groundingMetadata?.groundingChunks?.length ?? 0,
  );

  const evidence: NormalizedEvidenceItem[] = [];
  const findings: ResearchFinding[] = [];

  for (const finding of input.structured.findings) {
    const evidenceId = `evidence_${finding.findingId}`;
    const validatedUrls: string[] = [];
    const sourceIds: string[] = [];

    for (const url of finding.sourceUrls) {
      const matched = sourceByIdentity.get(sourceIdentityKey(url));
      if (!matched) {
        if (finding.grounded && !finding.inference) {
          throw new ResearchError(
            `Grounded finding ${finding.findingId} references URL not present in grounding metadata: ${url}`,
            "evidence_validation_failure",
          );
        }
        continue;
      }
      validatedUrls.push(matched.url);
      sourceIds.push(matched.sourceId);
    }

    if (finding.grounded && !finding.inference && validatedUrls.length === 0 && finding.sourceUrls.length === 0) {
      validatedUrls.push(...supportBacked.urls);
      sourceIds.push(...supportBacked.sourceIds);
    }

    if (finding.grounded && !finding.inference && validatedUrls.length === 0) {
      throw new ResearchError(
        `Grounded finding ${finding.findingId} lacks validated source URLs.`,
        "evidence_validation_failure",
      );
    }

    const evidenceType = finding.inference
      ? "inference_from_evidence"
      : finding.grounded && validatedUrls.length > 0
        ? "direct_grounded"
        : "ungrounded";

    evidence.push({
      evidenceId,
      findingId: finding.findingId,
      claim: finding.claim,
      observedSignal: finding.observedSignal,
      signalType: finding.signalType,
      evidenceType,
      grounded: evidenceType === "direct_grounded",
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
    candidateId: input.candidateId ?? null,
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
  const topLevel = raw.groundingMetadata ?? raw.grounding_metadata;
  if (typeof topLevel === "object" && topLevel !== null) {
    return topLevel as GroundingMetadata;
  }

  const candidates = raw.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return null;
  }
  const first = candidates[0];
  if (typeof first !== "object" || first === null) {
    return null;
  }
  const candidate = first as Record<string, unknown>;
  const groundingMetadata = candidate.groundingMetadata ?? candidate.grounding_metadata;
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
