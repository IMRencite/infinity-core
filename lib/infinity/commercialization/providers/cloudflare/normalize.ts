export type NormalizedCloudflareZone = {
  zoneId: string;
  zoneName: string;
  status: string | null;
  accountId: string | null;
  provider: "cloudflare.dns_v1";
  fetchedAt: string;
};

export type NormalizedCloudflareRecord = {
  recordId: string;
  zoneId: string;
  recordType: string;
  name: string;
  content: string | null;
  proxied: boolean | null;
  ttl: number | null;
  provider: "cloudflare.dns_v1";
  fetchedAt: string;
};

const SECRET_CONTENT = /(sk_live_|sk_test_|whsec_|Bearer |api[_-]?key|token=)/i;

export function nextCloudflarePage(currentPage: number, totalPages: number, maxPages: number): number | null {
  if (currentPage >= maxPages) return null;
  if (currentPage >= totalPages) return null;
  return currentPage + 1;
}

export function redactRecordContent(content: string | null): string | null {
  if (content == null) return null;
  if (SECRET_CONTENT.test(content)) return null;
  return content;
}

export function normalizeCloudflareZone(input: Record<string, unknown>, fetchedAt: string): NormalizedCloudflareZone | null {
  const zoneId = typeof input.id === "string" ? input.id : null;
  const zoneName = typeof input.name === "string" ? input.name : null;
  if (!zoneId || !zoneName) return null;
  const account = input.account && typeof input.account === "object" ? (input.account as Record<string, unknown>) : null;
  const accountId = typeof account?.id === "string" ? account.id : null;
  return {
    zoneId,
    zoneName,
    status: typeof input.status === "string" ? input.status : null,
    accountId,
    provider: "cloudflare.dns_v1",
    fetchedAt,
  };
}

export function normalizeCloudflareRecord(
  input: Record<string, unknown>,
  zoneId: string,
  fetchedAt: string,
): NormalizedCloudflareRecord | null {
  const recordId = typeof input.id === "string" ? input.id : null;
  const recordType = typeof input.type === "string" ? input.type : null;
  const name = typeof input.name === "string" ? input.name : null;
  if (!recordId || !recordType || !name) return null;
  const ttl = typeof input.ttl === "number" && Number.isFinite(input.ttl) ? input.ttl : null;
  return {
    recordId,
    zoneId,
    recordType,
    name,
    content: redactRecordContent(typeof input.content === "string" ? input.content : null),
    proxied: typeof input.proxied === "boolean" ? input.proxied : null,
    ttl,
    provider: "cloudflare.dns_v1",
    fetchedAt,
  };
}
