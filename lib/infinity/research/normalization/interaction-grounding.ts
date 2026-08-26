import { canonicalizeSourceUrl } from "./dedupe";

type GroundingChunk = {
  web?: { uri?: string; title?: string; domain?: string };
  retrievedContext?: { uri?: string; title?: string };
};

export type ExtractedGroundingMetadata = {
  groundingChunks?: GroundingChunk[];
  groundingSupports?: unknown[];
  webSearchQueries?: string[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function isGeminiGroundingRedirectUri(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    return (
      host === "vertexaisearch.cloud.google.com" &&
      /^\/grounding-api-redirect(?:\/|$)/i.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

function isExcludedProviderUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "w3.org") return true;
    if (host.endsWith("generativelanguage.googleapis.com")) return true;
    if (host.endsWith("google.com") && parsed.pathname.startsWith("/search")) return true;
    return false;
  } catch {
    return true;
  }
}

function addChunk(
  chunks: GroundingChunk[],
  seenIdentities: Set<string>,
  url: string,
  title?: string,
): void {
  const trimmed = url.trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed) || isExcludedProviderUrl(trimmed)) {
    return;
  }
  const identity = canonicalizeSourceUrl(trimmed);
  if (seenIdentities.has(identity)) {
    return;
  }
  seenIdentities.add(identity);
  chunks.push({
    web: {
      uri: trimmed,
      title,
    },
  });
}

function collectGroundingMetadataFromRecord(record: Record<string, unknown>): ExtractedGroundingMetadata | null {
  const direct = record.groundingMetadata ?? record.grounding_metadata;
  if (typeof direct === "object" && direct !== null) {
    return direct as ExtractedGroundingMetadata;
  }
  return null;
}

function collectChunkLikeUris(
  record: Record<string, unknown>,
  chunks: GroundingChunk[],
  seenIdentities: Set<string>,
): void {
  const web = asRecord(record.web);
  const retrieved = asRecord(record.retrievedContext) ?? asRecord(record.retrieved_context);
  const webUri = typeof web?.uri === "string" ? web.uri : typeof web?.url === "string" ? web.url : null;
  const retrievedUri =
    typeof retrieved?.uri === "string" ? retrieved.uri : typeof retrieved?.url === "string" ? retrieved.url : null;
  if (webUri) {
    addChunk(chunks, seenIdentities, webUri, typeof web?.title === "string" ? web.title : undefined);
  }
  if (retrievedUri) {
    addChunk(chunks, seenIdentities, retrievedUri, typeof retrieved?.title === "string" ? retrieved.title : undefined);
  }
}

function collectProviderCitations(
  value: unknown,
  chunks: GroundingChunk[],
  seenIdentities: Set<string>,
  depth = 0,
): void {
  if (depth > 14 || value == null) return;

  if (typeof value === "string") {
    const redirects = value.match(/https:\/\/vertexaisearch\.cloud\.google\.com\/[^\s"'<>\\]+/gi) ?? [];
    for (const match of redirects) {
      const cleaned = match.replace(/[),.;]+$/g, "");
      if (isGeminiGroundingRedirectUri(cleaned)) {
        addChunk(chunks, seenIdentities, cleaned);
      }
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      collectProviderCitations(entry, chunks, seenIdentities, depth + 1);
    }
    return;
  }

  const record = asRecord(value);
  if (!record) return;

  if (record.type === "url_citation") {
    const url =
      (typeof record.url === "string" && record.url) ||
      (typeof record.uri === "string" && record.uri) ||
      "";
    if (url) {
      addChunk(chunks, seenIdentities, url, typeof record.title === "string" ? record.title : undefined);
    }
  }

  collectChunkLikeUris(record, chunks, seenIdentities);

  const embedded = collectGroundingMetadataFromRecord(record);
  if (embedded?.groundingChunks) {
    for (const chunk of embedded.groundingChunks) {
      const uri = chunk.web?.uri ?? chunk.retrievedContext?.uri;
      if (uri) {
        addChunk(chunks, seenIdentities, uri, chunk.web?.title ?? chunk.retrievedContext?.title);
      }
    }
  }

  for (const [key, nested] of Object.entries(record)) {
    if (key === "sdkHttpResponse" || key === "signature" || key === "headers") continue;
    collectProviderCitations(nested, chunks, seenIdentities, depth + 1);
  }
}

function collectSearchQueries(steps: unknown[]): string[] {
  const webSearchQueries: string[] = [];
  for (const step of steps) {
    const record = asRecord(step);
    if (!record) continue;
    if (record.type !== "google_search_call" && record.type !== "google_search_result") continue;
    const args = asRecord(record.arguments) ?? asRecord(record.input);
    const queries = args?.queries;
    if (!Array.isArray(queries)) continue;
    for (const query of queries) {
      if (typeof query === "string" && query.trim()) {
        webSearchQueries.push(query.trim());
      }
    }
  }
  return [...new Set(webSearchQueries)];
}

/**
 * Build grounding metadata from Gemini Interactions API responses.
 * Only provider-grounded identities are admitted: groundingChunks,
 * url_citation annotations, and Gemini grounding-api-redirect URIs.
 * Model-written public URLs are not treated as grounding.
 */
export function buildGroundingMetadataFromInteractionSteps(
  steps: unknown[],
  interaction: Record<string, unknown>,
): ExtractedGroundingMetadata | null {
  const groundingChunks: GroundingChunk[] = [];
  const seenIdentities = new Set<string>();
  const webSearchQueries = collectSearchQueries(steps);

  collectProviderCitations(steps, groundingChunks, seenIdentities);
  collectProviderCitations(interaction, groundingChunks, seenIdentities);

  const interactionGrounding = collectGroundingMetadataFromRecord(interaction);
  if (interactionGrounding?.webSearchQueries?.length) {
    for (const query of interactionGrounding.webSearchQueries) {
      if (typeof query === "string" && query.trim()) {
        webSearchQueries.push(query.trim());
      }
    }
  }

  const uniqueQueries = [...new Set(webSearchQueries)];

  if (uniqueQueries.length === 0 && groundingChunks.length === 0) {
    return null;
  }

  return {
    webSearchQueries: uniqueQueries,
    groundingChunks,
    groundingSupports: interactionGrounding?.groundingSupports ?? [],
  };
}

export function mergeGroundingMetadata(
  ...layers: Array<ExtractedGroundingMetadata | null | undefined>
): ExtractedGroundingMetadata | null {
  const chunks: GroundingChunk[] = [];
  const seen = new Set<string>();
  const queries: string[] = [];
  let supports: unknown[] = [];

  for (const layer of layers) {
    if (!layer) continue;
    for (const chunk of layer.groundingChunks ?? []) {
      const uri = chunk.web?.uri ?? chunk.retrievedContext?.uri;
      if (uri) addChunk(chunks, seen, uri, chunk.web?.title ?? chunk.retrievedContext?.title);
    }
    for (const query of layer.webSearchQueries ?? []) {
      if (typeof query === "string" && query.trim()) queries.push(query.trim());
    }
    if ((layer.groundingSupports?.length ?? 0) > 0) {
      supports = layer.groundingSupports ?? [];
    }
  }

  const uniqueQueries = [...new Set(queries)];
  if (uniqueQueries.length === 0 && chunks.length === 0) return null;
  return {
    webSearchQueries: uniqueQueries,
    groundingChunks: chunks,
    groundingSupports: supports,
  };
}
