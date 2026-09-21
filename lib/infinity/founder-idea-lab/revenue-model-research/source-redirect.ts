/**
 * Vertex grounding identities are opaque redirects.
 * Read-only metadata extraction is allowed; HTTP follow is off by default
 * so we do not scrape around provider access controls.
 */
export type VertexRedirectResolutionCapability = {
  supported: boolean;
  method: "none" | "provider_metadata";
  reason: string;
};

export function vertexRedirectResolutionCapability(
  env: Record<string, string | undefined> = process.env,
): VertexRedirectResolutionCapability {
  if (env.VERTEX_REDIRECT_RESOLUTION === "head") {
    return {
      supported: false,
      method: "none",
      reason: "HTTP HEAD/GET follow of Vertex redirects is not enabled in this architecture.",
    };
  }
  return {
    supported: false,
    method: "provider_metadata",
    reason: "Destination URLs stay as provider identities. Title/publisher/domain are persisted only when the provider supplies them.",
  };
}

export type ExtractedSourceMetadata = {
  url: string;
  title: string | null;
  publisher: string | null;
  domain: string | null;
  hostname: string | null;
};

export function extractProviderSourceMetadata(input: {
  url: string;
  title?: string | null;
  publisher?: string | null;
  domain?: string | null;
  groundingTitle?: string | null;
  groundingPublisher?: string | null;
  webTitle?: string | null;
  webUri?: string | null;
}): ExtractedSourceMetadata {
  const title = input.title?.trim() || input.groundingTitle?.trim() || input.webTitle?.trim() || null;
  const publisher = input.publisher?.trim() || input.groundingPublisher?.trim() || null;
  let domain = input.domain?.trim() || null;
  let hostname: string | null = null;
  try {
    hostname = new URL(input.url).hostname;
    domain = domain || hostname;
  } catch {
    hostname = null;
  }
  return {
    url: input.url,
    title,
    publisher,
    domain,
    hostname,
  };
}
