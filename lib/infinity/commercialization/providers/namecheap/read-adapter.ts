import { ReadOnlyMutationBlockedError } from "../../probes/mode";
import type { ProviderCapabilityStatus, ProviderProbeFailureCode } from "../../probes/status";
import { classifyHttpFailure } from "../../probes/status";
import {
  NAMECHEAP_DETAIL_CAP,
  NAMECHEAP_MAX_PAGES,
  NAMECHEAP_PAGE_SIZE,
  NAMECHEAP_READ_COMMANDS,
  NAMECHEAP_WRITE_COMMANDS,
  loadNamecheapConfig,
  type NamecheapCredentials,
  type NamecheapPublicConfig,
  type NamecheapResolvedConfig,
} from "./config";
import {
  earliestExpiration,
  namecheapXmlError,
  namecheapXmlStatus,
  nextNamecheapPage,
  parseNamecheapDomainInfo,
  parseNamecheapDomainList,
  parseNamecheapPaging,
  type NormalizedRegistrarDomain,
} from "./normalize";

const READ_COMMAND_SET = new Set(NAMECHEAP_READ_COMMANDS.map((command) => command.toLowerCase()));
const WRITE_COMMAND_SET = new Set(NAMECHEAP_WRITE_COMMANDS.map((command) => command.toLowerCase()));

export type NamecheapReadReport = {
  provider: "namecheap.com_v1";
  environment: NamecheapPublicConfig["mode"];
  authRead: boolean;
  domainListRead: boolean;
  domainDetailRead: boolean;
  domains: NormalizedRegistrarDomain[];
  domainCount: number | null;
  nextExpiration: string | null;
  clientIpWhitelistRequired: true;
  mutationOccurred: false;
  writeHttpCalls: 0;
  readHttpCalls: number;
  normalization: "PASS" | "FAIL" | "SKIPPED";
  status: ProviderCapabilityStatus;
  realProviderCall: boolean;
  failureCode: ProviderProbeFailureCode | null;
  failureReason: string | null;
};

export class NamecheapReadAdapter {
  readonly config: NamecheapResolvedConfig;
  readHttpCalls = 0;
  writeHttpCalls = 0;
  writeAttempts = 0;
  private readonly fetchImpl: typeof fetch;

  constructor(options: { env?: NodeJS.Dict<string>; fetchImpl?: typeof fetch } = {}) {
    this.config = loadNamecheapConfig(options.env ?? process.env);
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  denyWrite(command: string): never {
    this.writeAttempts += 1;
    throw new ReadOnlyMutationBlockedError(command);
  }

  private assertReadCommand(command: string): void {
    const normalized = command.trim().toLowerCase();
    if (WRITE_COMMAND_SET.has(normalized) || !READ_COMMAND_SET.has(normalized)) {
      this.denyWrite(command);
    }
  }

  private async getXml(credentials: NamecheapCredentials, command: string, extra: Record<string, string> = {}): Promise<string> {
    this.assertReadCommand(command);
    const params = new URLSearchParams({
      ...credentials.toQuery(),
      Command: command,
      ...extra,
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.public.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.config.public.baseUrl}?${params.toString()}`, {
        method: "GET",
        signal: controller.signal,
      });
      this.readHttpCalls += 1;
      if (!response.ok) {
        throw Object.assign(new Error(`NAMECHEAP_HTTP_${response.status}`), { status: response.status });
      }
      const xml = credentials.redact(await response.text());
      if (namecheapXmlStatus(xml) === "ERROR") {
        const parsed = namecheapXmlError(xml);
        throw Object.assign(new Error(parsed.message), { namecheapCode: parsed.code });
      }
      return xml;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw Object.assign(new Error("NAMECHEAP_TIMEOUT"), { failureCode: "NETWORK_ERROR" as const });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  classifyError(error: unknown): { status: ProviderCapabilityStatus; failureCode: ProviderProbeFailureCode; reason: string } {
    const message = error instanceof Error ? this.config.credentials?.redact(error.message) ?? error.message : String(error);
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : null;
    const code = typeof error === "object" && error && "namecheapCode" in error ? String((error as { namecheapCode?: string }).namecheapCode ?? "") : "";
    if (/not whitelisted|IP is not|1011150/i.test(message) || code === "1011150") {
      return { status: "FAILED", failureCode: "PERMISSION_DENIED", reason: "NAMECHEAP_CLIENT_IP_WHITELIST_REQUIRED" };
    }
    if (/API Key is invalid|1011102|1011101|Authentication|AUTH/i.test(message) || status === 401 || status === 403) {
      return { status: "FAILED", failureCode: status ? classifyHttpFailure(status) : "AUTH_FAILED", reason: "AUTH_FAILED" };
    }
    if (/429|rate limit/i.test(message) || status === 429) {
      return { status: "UNAVAILABLE", failureCode: "RATE_LIMITED", reason: "RATE_LIMITED" };
    }
    if (/TIMEOUT|ECONN|ETIMEDOUT|network|AbortError/i.test(message) || (error instanceof Error && error.name === "AbortError")) {
      return { status: "UNAVAILABLE", failureCode: "NETWORK_ERROR", reason: "NETWORK_ERROR" };
    }
    if (status && status >= 500) return { status: "UNAVAILABLE", failureCode: "PROVIDER_ERROR", reason: "PROVIDER_ERROR" };
    if (/INVALID_RESPONSE|malformed/i.test(message)) {
      return { status: "FAILED", failureCode: "INVALID_RESPONSE", reason: "INVALID_RESPONSE" };
    }
    return { status: "FAILED", failureCode: "PROVIDER_ERROR", reason: message.slice(0, 80) };
  }

  async verifyReadOnly(): Promise<NamecheapReadReport> {
    const skipped: NamecheapReadReport = {
      provider: "namecheap.com_v1",
      environment: this.config.public.mode,
      authRead: false,
      domainListRead: false,
      domainDetailRead: false,
      domains: [],
      domainCount: null,
      nextExpiration: null,
      clientIpWhitelistRequired: true,
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
    const domains: NormalizedRegistrarDomain[] = [];
    try {
      let page: number | null = 1;
      let totalItems = 0;
      while (page !== null) {
        const xml = await this.getXml(this.config.credentials, "namecheap.domains.getList", {
          Page: String(page),
          PageSize: String(NAMECHEAP_PAGE_SIZE),
        });
        const paging = parseNamecheapPaging(xml);
        totalItems = paging.totalItems;
        domains.push(...parseNamecheapDomainList(xml, fetchedAt));
        page = nextNamecheapPage(page, paging.totalItems, paging.pageSize || NAMECHEAP_PAGE_SIZE, NAMECHEAP_MAX_PAGES);
      }

      let domainDetailRead = domains.length === 0;
      const detailTargets = domains.slice(0, NAMECHEAP_DETAIL_CAP);
      for (const item of detailTargets) {
        const infoXml = await this.getXml(this.config.credentials, "namecheap.domains.getInfo", {
          DomainName: item.domain,
        });
        const detail = parseNamecheapDomainInfo(infoXml, item.domain, fetchedAt);
        if (!detail) continue;
        domainDetailRead = true;
        Object.assign(item, {
          providerDomainId: detail.providerDomainId ?? item.providerDomainId,
          status: detail.status ?? item.status,
          expirationDate: detail.expirationDate ?? item.expirationDate,
          autoRenew: detail.autoRenew ?? item.autoRenew,
          nameservers: detail.nameservers ?? item.nameservers,
          registrarLock: detail.registrarLock ?? item.registrarLock,
        });
      }

      return {
        provider: "namecheap.com_v1",
        environment: this.config.public.mode,
        authRead: true,
        domainListRead: true,
        domainDetailRead,
        domains,
        domainCount: totalItems || domains.length,
        nextExpiration: earliestExpiration(domains),
        clientIpWhitelistRequired: true,
        mutationOccurred: false,
        writeHttpCalls: 0,
        readHttpCalls: this.readHttpCalls,
        normalization: "PASS",
        status: domainDetailRead || domains.length === 0 ? "READ_ONLY_VERIFIED" : "DEGRADED",
        realProviderCall: true,
        failureCode: null,
        failureReason: null,
      };
    } catch (error) {
      const classified = this.classifyError(error);
      return {
        ...skipped,
        environment: this.config.public.mode,
        authRead: this.readHttpCalls > 0 && classified.failureCode !== "AUTH_FAILED",
        domainListRead: domains.length > 0,
        domains,
        domainCount: domains.length > 0 ? domains.length : null,
        nextExpiration: earliestExpiration(domains),
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
