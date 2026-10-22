export type NormalizedGelatoCatalog = {
  provider: "GELATO";
  catalogUid: string;
  title: string | null;
};

export type NormalizedGelatoProduct = {
  provider: "GELATO";
  productUid: string;
  title: string | null;
  attributes: Record<string, string>;
};

export type GelatoSafeError = {
  code: string;
  safeMessage: string;
  httpStatus: number | null;
};

export function normalizeGelatoCatalog(row: Record<string, unknown>): NormalizedGelatoCatalog | null {
  const catalogUid = typeof row.catalogUid === "string" ? row.catalogUid : typeof row.uid === "string" ? row.uid : null;
  if (!catalogUid) return null;
  return {
    provider: "GELATO",
    catalogUid,
    title: typeof row.title === "string" ? row.title : typeof row.name === "string" ? row.name : null,
  };
}

export function normalizeGelatoProduct(row: Record<string, unknown>): NormalizedGelatoProduct | null {
  const productUid = typeof row.productUid === "string" ? row.productUid : typeof row.uid === "string" ? row.uid : null;
  if (!productUid) return null;
  const rawAttributes = row.attributes && typeof row.attributes === "object" ? (row.attributes as Record<string, unknown>) : {};
  const attributes: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawAttributes)) {
    if (typeof value === "string") attributes[key] = value;
  }
  return {
    provider: "GELATO",
    productUid,
    title: typeof row.title === "string" ? row.title : null,
    attributes,
  };
}

export function normalizeGelatoError(error: unknown, redact: (value: string) => string): GelatoSafeError {
  const message = error instanceof Error ? redact(error.message) : redact(String(error));
  const httpStatus = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : null;
  if (httpStatus === 401 || httpStatus === 403) {
    return { code: "AUTH_FAILED", safeMessage: "GELATO_SANDBOX_AUTH_REJECTED", httpStatus };
  }
  if (httpStatus === 429) return { code: "RATE_LIMITED", safeMessage: "GELATO_RATE_LIMITED", httpStatus };
  if (httpStatus && httpStatus >= 500) return { code: "PROVIDER_ERROR", safeMessage: "GELATO_PROVIDER_ERROR", httpStatus };
  if (/TIMEOUT|ECONN|ETIMEDOUT|network/i.test(message)) {
    return { code: "NETWORK_ERROR", safeMessage: "GELATO_NETWORK_ERROR", httpStatus };
  }
  return { code: "PROVIDER_ERROR", safeMessage: message.slice(0, 120), httpStatus };
}
