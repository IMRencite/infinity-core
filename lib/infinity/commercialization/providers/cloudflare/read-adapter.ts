import { ReadOnlyMutationBlockedError } from "../../probes/mode";
import type { ProviderCapabilityStatus, ProviderProbeFailureCode } from "../../probes/status";
import { classifyHttpFailure } from "../../probes/status";
import {
  CLOUDFLARE_API_BASE_URL,
  CLOUDFLARE_MAX_PAGES,
  CLOUDFLARE_PAGE_SIZE,
  CLOUDFLARE_RECORD_DETAIL_CAP,
  loadCloudflareConfig,
  type CloudflareCredentials,
  type CloudflareResolvedConfig,
  type CloudflareTokenScope,
} from "./config";
import {
  nextCloudflarePage,
  normalizeCloudflareRecord,
  normalizeCloudflareZone,
  type NormalizedCloudflareRecord,
  type NormalizedCloudflareZone,
} from "./normalize";

export type CloudflareReadReport = {
  provider: "cloudflare.dns_v1";
  authRead: boolean;
  zoneListRead: boolean;
  zoneDetailRead: boolean;
  dnsRecordRead: boolean;
  zones: NormalizedCloudflareZone[];
  records: NormalizedCloudflareRecord[];
  zoneCount: number | null;
  recordCount: number | null;
  tokenScope: CloudflareTokenScope;
  mutationOccurred: false;
  writeHttpCalls: 0;
  readHttpCalls: number;
  normalization: "PASS" | "FAIL" | "SKIPPED";
  status: ProviderCapabilityStatus;
  realProviderCall: boolean;
  failureCode: ProviderProbeFailureCode | null;
  failureReason: string | null;
};

type CloudflareEnvelope = {
  success?: boolean;
  result?: unknown;
  result_info?: { page?: number; total_pages?: number; count?: number; total_count?: number };
  errors?: Array<{ message?: string; code?: number }>;
};

export class CloudflareReadAdapter {
  readonly config: CloudflareResolvedConfig;
  readHttpCalls = 0;
  writeHttpCalls = 0;
  writeAttempts = 0;
  private readonly fetchImpl: typeof fetch;

  constructor(options: { env?: NodeJS.Dict<string>; fetchImpl?: typeof fetch } = {}) {
    this.config = loadCloudflareConfig(options.env ?? process.env);
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  denyWrite(capability: string): never {
    this.writeAttempts += 1;
    throw new ReadOnlyMutationBlockedError(capability);
  }

  private async getJson(credentials: CloudflareCredentials, path: string): Promise<CloudflareEnvelope> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.public.timeoutMs);
    try {
      const response = await this.fetchImpl(`${CLOUDFLARE_API_BASE_URL}${path}`, {
        method: "GET",
        headers: { Authorization: credentials.authorizationHeader(), Accept: "application/json" },
        signal: controller.signal,
      });
      this.readHttpCalls += 1;
      if (!response.ok) {
        throw Object.assign(new Error(`CLOUDFLARE_HTTP_${response.status}`), { status: response.status });
      }
      const body = (await response.json()) as CloudflareEnvelope;
      if (body.success === false) {
        throw Object.assign(new Error(body.errors?.[0]?.message ?? "CLOUDFLARE_PROVIDER_ERROR"), {
          status: response.status,
        });
      }
      return body;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw Object.assign(new Error("CLOUDFLARE_TIMEOUT"), { failureCode: "NETWORK_ERROR" as const });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  classifyError(error: unknown): { status: ProviderCapabilityStatus; failureCode: ProviderProbeFailureCode; reason: string } {
    const message = error instanceof Error ? this.config.credentials?.redact(error.message) ?? error.message : String(error);
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : null;
    if (status === 401 || /AUTH/i.test(message)) return { status: "FAILED", failureCode: "AUTH_FAILED", reason: "AUTH_FAILED" };
    if (status === 403) return { status: "FAILED", failureCode: "PERMISSION_DENIED", reason: "PERMISSION_DENIED" };
    if (status === 429 || /rate limit/i.test(message)) return { status: "UNAVAILABLE", failureCode: "RATE_LIMITED", reason: "RATE_LIMITED" };
    if (/TIMEOUT|ECONN|ETIMEDOUT|network/i.test(message) || (error instanceof Error && error.name === "AbortError")) {
      return { status: "UNAVAILABLE", failureCode: "NETWORK_ERROR", reason: "NETWORK_ERROR" };
    }
    if (status && status >= 500) return { status: "UNAVAILABLE", failureCode: "PROVIDER_ERROR", reason: "PROVIDER_ERROR" };
    return { status: "FAILED", failureCode: "PROVIDER_ERROR", reason: message.slice(0, 80) };
  }

  async verifyReadOnly(): Promise<CloudflareReadReport> {
    const skipped: CloudflareReadReport = {
      provider: "cloudflare.dns_v1",
      authRead: false,
      zoneListRead: false,
      zoneDetailRead: false,
      dnsRecordRead: false,
      zones: [],
      records: [],
      zoneCount: null,
      recordCount: null,
      tokenScope: "UNKNOWN",
      mutationOccurred: false,
      writeHttpCalls: 0,
      readHttpCalls: 0,
      normalization: "SKIPPED",
      status: "NOT_CONFIGURED",
      realProviderCall: false,
      failureCode: "NOT_CONFIGURED",
      failureReason: "NOT_CONFIGURED",
    };
    if (!this.config.credentials) return skipped;

    const fetchedAt = new Date().toISOString();
    const zones: NormalizedCloudflareZone[] = [];
    const records: NormalizedCloudflareRecord[] = [];
    try {
      await this.getJson(this.config.credentials, "/user/tokens/verify");

      let page = 1;
      let totalCount: number | null = null;
      const accountQuery = this.config.public.accountId ? `&account.id=${encodeURIComponent(this.config.public.accountId)}` : "";
      while (page !== null) {
        const envelope = await this.getJson(
          this.config.credentials,
          `/zones?per_page=${CLOUDFLARE_PAGE_SIZE}&page=${page}${accountQuery}`,
        );
        const rows = Array.isArray(envelope.result) ? envelope.result : [];
        for (const row of rows) {
          const zone = normalizeCloudflareZone((row ?? {}) as Record<string, unknown>, fetchedAt);
          if (zone) zones.push(zone);
        }
        const totalPages = envelope.result_info?.total_pages ?? 1;
        totalCount = envelope.result_info?.total_count ?? totalCount;
        const next = nextCloudflarePage(page, totalPages, CLOUDFLARE_MAX_PAGES);
        if (next == null) break;
        page = next;
      }

      const selected =
        zones.find((zone) => zone.zoneId === this.config.public.zoneId) ??
        zones.find((zone) => zone.zoneName === this.config.public.probeZone) ??
        zones[0] ??
        null;

      let zoneDetailRead = selected == null;
      let dnsRecordRead = selected == null;
      let recordTotal: number | null = selected == null ? 0 : null;
      if (selected) {
        const detail = await this.getJson(this.config.credentials, `/zones/${selected.zoneId}`);
        const normalized = normalizeCloudflareZone((detail.result ?? {}) as Record<string, unknown>, fetchedAt);
        zoneDetailRead = Boolean(normalized);
        let recordPage = 1;
        while (recordPage !== null) {
          const recordEnvelope = await this.getJson(
            this.config.credentials,
            `/zones/${selected.zoneId}/dns_records?per_page=${CLOUDFLARE_PAGE_SIZE}&page=${recordPage}`,
          );
          const rows = Array.isArray(recordEnvelope.result) ? recordEnvelope.result : [];
          for (const row of rows) {
            const record = normalizeCloudflareRecord((row ?? {}) as Record<string, unknown>, selected.zoneId, fetchedAt);
            if (record) records.push(record);
          }
          recordTotal = recordEnvelope.result_info?.total_count ?? recordTotal;
          const next = nextCloudflarePage(recordPage, recordEnvelope.result_info?.total_pages ?? 1, CLOUDFLARE_MAX_PAGES);
          if (next == null) break;
          recordPage = next;
        }
        dnsRecordRead = true;
        for (const record of records.slice(0, CLOUDFLARE_RECORD_DETAIL_CAP)) {
          await this.getJson(this.config.credentials, `/zones/${selected.zoneId}/dns_records/${record.recordId}`);
        }
      }

      return {
        provider: "cloudflare.dns_v1",
        authRead: true,
        zoneListRead: true,
        zoneDetailRead,
        dnsRecordRead,
        zones,
        records,
        zoneCount: totalCount ?? zones.length,
        recordCount: recordTotal ?? records.length,
        tokenScope: "UNKNOWN",
        mutationOccurred: false,
        writeHttpCalls: 0,
        readHttpCalls: this.readHttpCalls,
        normalization: "PASS",
        status: zoneDetailRead && dnsRecordRead ? "READ_ONLY_VERIFIED" : "DEGRADED",
        realProviderCall: true,
        failureCode: null,
        failureReason: null,
      };
    } catch (error) {
      const classified = this.classifyError(error);
      return {
        ...skipped,
        authRead: this.readHttpCalls > 0 && classified.failureCode !== "AUTH_FAILED",
        zoneListRead: zones.length > 0,
        zones,
        records,
        zoneCount: zones.length > 0 ? zones.length : null,
        recordCount: records.length > 0 ? records.length : null,
        writeHttpCalls: 0,
        readHttpCalls: this.readHttpCalls,
        normalization: "FAIL",
        status: classified.status,
        realProviderCall: this.readHttpCalls > 0,
        failureCode: classified.failureCode,
        failureReason: classified.reason,
      };
    }
  }
}
