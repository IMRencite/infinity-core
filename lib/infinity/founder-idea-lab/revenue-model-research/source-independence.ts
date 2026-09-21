export type IndependenceState = "KNOWN" | "PARTIALLY_KNOWN" | "INDEPENDENCE_UNKNOWN";

export type SourceIndependenceInput = {
  url?: string | null;
  title?: string | null;
  publisher?: string | null;
  domain?: string | null;
  entity?: string | null;
};

const VERTEX = /vertexaisearch\.cloud\.google\.com/i;

export function isOpaqueVertexRedirect(url: string | null | undefined): boolean {
  return Boolean(url && VERTEX.test(url));
}

export function publisherIndependenceKey(source: SourceIndependenceInput): string {
  const publisher = source.publisher?.trim().toLowerCase();
  if (publisher) return `publisher:${publisher}`;
  if (source.url && VERTEX.test(source.url) && !publisher) return "opaque:vertex";
  const entity = source.entity?.trim().toLowerCase();
  if (entity) return `entity:${entity}`;
  const domain = source.domain?.trim().toLowerCase().replace(/^www\./, "");
  if (domain && !VERTEX.test(domain)) return `host:${domain}`;
  const title = source.title?.trim().toLowerCase();
  if (title && !VERTEX.test(title) && !(source.url && VERTEX.test(source.url))) return `title:${title}`;
  if (source.url && VERTEX.test(source.url)) return "opaque:vertex";
  return `url:${source.url ?? "unknown"}`;
}

export function assessSourceIndependence(sources: SourceIndependenceInput[]): {
  state: IndependenceState;
  independentCount: number;
  opaqueCount: number;
  resolvedPublisherCount: number;
  reason: string;
} {
  if (!sources.length) {
    return {
      state: "INDEPENDENCE_UNKNOWN",
      independentCount: 0,
      opaqueCount: 0,
      resolvedPublisherCount: 0,
      reason: "No sources recorded.",
    };
  }
  const keys = new Set(sources.map(publisherIndependenceKey));
  const opaqueCount = sources.filter((item) => isOpaqueVertexRedirect(item.url) && !item.publisher && !item.title).length;
  const resolvedPublisherCount = sources.filter((item) => Boolean(item.publisher?.trim() || (item.title && !isOpaqueVertexRedirect(item.url)))).length;
  if (opaqueCount === sources.length || (keys.size === 1 && keys.has("opaque:vertex"))) {
    return {
      state: "INDEPENDENCE_UNKNOWN",
      independentCount: 1,
      opaqueCount,
      resolvedPublisherCount,
      reason: "Opaque Vertex redirects cannot be counted as independent publishers.",
    };
  }
  if (opaqueCount > 0) {
    return {
      state: "PARTIALLY_KNOWN",
      independentCount: keys.size,
      opaqueCount,
      resolvedPublisherCount,
      reason: "Some publishers are known; remaining Vertex redirects are not independent.",
    };
  }
  return {
    state: "KNOWN",
    independentCount: keys.size,
    opaqueCount: 0,
    resolvedPublisherCount,
    reason: "Independence is based on publisher/original report, not unique redirect URLs.",
  };
}

export function confidenceAfterIndependence(
  confidence: "NONE" | "LOW" | "MEDIUM" | "HIGH",
  state: IndependenceState,
): "NONE" | "LOW" | "MEDIUM" | "HIGH" {
  if (confidence === "NONE") return "NONE";
  if (state === "INDEPENDENCE_UNKNOWN") return confidence === "HIGH" ? "LOW" : confidence === "MEDIUM" ? "LOW" : "LOW";
  if (state === "PARTIALLY_KNOWN" && confidence === "HIGH") return "MEDIUM";
  return confidence;
}

export function evidenceStrengthLabel(input: {
  coverage: "SUFFICIENT" | "PARTIAL" | "INSUFFICIENT" | "BENCHMARK_SUFFICIENT" | "BENCHMARK_PARTIAL" | "BENCHMARK_INSUFFICIENT" | string;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  observationCount?: number;
}): "Strong" | "Moderate" | "Weak" | "Not enough evidence" {
  const n = input.observationCount ?? input.highCount + input.mediumCount + input.lowCount;
  if (!n) return "Not enough evidence";
  if (input.coverage === "SUFFICIENT" || input.coverage === "BENCHMARK_SUFFICIENT") return "Strong";
  if (input.highCount + input.mediumCount >= 1 && input.coverage.includes("PARTIAL")) return "Moderate";
  if (input.lowCount > 0 || input.coverage.includes("PARTIAL")) return "Weak";
  return "Weak";
}

export function independenceDisplay(state: IndependenceState): "Known" | "Partially known" | "Unknown" {
  if (state === "KNOWN") return "Known";
  if (state === "PARTIALLY_KNOWN") return "Partially known";
  return "Unknown";
}
