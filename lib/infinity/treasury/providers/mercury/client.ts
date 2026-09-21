import {
  ProviderAuthFailedError,
  ProviderRateLimitedError,
  ProviderTimeoutError,
  ProviderUnavailableError,
  UnsupportedCapabilityError,
} from "../provider";
import type { MercuryAuthMode, MercuryCredentials, MercuryPublicConfig } from "./config";
import { mercurySafeErrorMessage, redactMercuryValue } from "./redact";
import { mercuryUnknownReadCost, type MercuryReadOperation, type MercuryReadTelemetry } from "./telemetry";

export type MercuryHttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type MercuryHttpClientOptions = {
  config: MercuryPublicConfig;
  credentials: MercuryCredentials | null;
  fetchImpl?: typeof fetch;
  now?: () => Date;
};

export class MercuryHttpClient {
  readonly config: MercuryPublicConfig;
  readonly credentials: MercuryCredentials | null;
  readonly getCallCount = { accounts: 0, account: 0, transactions: 0 };
  writeHttpCalls = 0;
  writeAttempts = 0;
  telemetry: MercuryReadTelemetry[] = [];
  lastAuthMode: MercuryAuthMode | null = null;
  lastVerifiedAt: string | null = null;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;

  constructor(options: MercuryHttpClientOptions) {
    this.config = options.config;
    this.credentials = options.credentials;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? (() => new Date());
  }

  get totalGetCalls(): number {
    return this.getCallCount.accounts + this.getCallCount.account + this.getCallCount.transactions;
  }

  denyWrite(capability: string): never {
    this.writeAttempts += 1;
    throw new UnsupportedCapabilityError("mercury", capability as never);
  }

  async requestWrite(method: Exclude<MercuryHttpMethod, "GET">, _path: string): Promise<never> {
    this.writeAttempts += 1;
    void method;
    void _path;
    throw new UnsupportedCapabilityError("mercury", "PAYMENT_CREATE");
  }

  async getJson(path: string, operation: MercuryReadOperation): Promise<unknown> {
    if (!this.credentials) {
      throw new ProviderUnavailableError("mercury", "PROVIDER_NOT_CONFIGURED");
    }
    const url = new URL(path.replace(/^\//, ""), this.config.baseUrl).toString();
    const bearer = await this.requestOnce(url, this.credentials.authorizationHeader("bearer"));
    this.recordGet(operation);
    this.telemetry.push(mercuryUnknownReadCost(operation, this.config.mode, path.split("?")[0] ?? path));
    if (bearer.status === 401 || bearer.status === 403) {
      const basic = await this.requestOnce(url, this.credentials.authorizationHeader("basic"));
      this.recordGet(operation);
      if (basic.ok) {
        this.lastAuthMode = "basic";
        this.lastVerifiedAt = this.now().toISOString();
        this.config.lastVerifiedAt = this.lastVerifiedAt;
        return basic.body;
      }
      throw new ProviderAuthFailedError("mercury");
    }
    this.classifyFailure(bearer.status);
    this.lastAuthMode = "bearer";
    this.lastVerifiedAt = this.now().toISOString();
    this.config.lastVerifiedAt = this.lastVerifiedAt;
    return bearer.body;
  }

  private classifyFailure(status: number): void {
    if (status === 429) throw new ProviderRateLimitedError("mercury");
    if (status >= 500) throw new ProviderUnavailableError("mercury", "UNAVAILABLE");
    if (status < 200 || status >= 300) throw new ProviderUnavailableError("mercury", `HTTP_${status}`);
  }

  private async requestOnce(url: string, authorization: string): Promise<{ status: number; ok: boolean; body: unknown }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await this.fetchImpl(url, {
        method: "GET",
        headers: {
          Authorization: authorization,
          Accept: "application/json",
        },
        signal: controller.signal,
      });
      const body = response.ok ? await response.json() : null;
      return { status: response.status, ok: response.ok, body };
    } catch (error) {
      if (error instanceof ProviderAuthFailedError || error instanceof ProviderRateLimitedError || error instanceof ProviderUnavailableError) {
        throw error;
      }
      if (error instanceof Error && (error.name === "AbortError" || error.message.toLowerCase().includes("timeout"))) {
        throw new ProviderTimeoutError("mercury");
      }
      throw new ProviderUnavailableError("mercury", mercurySafeErrorMessage(error, this.credentials));
    } finally {
      clearTimeout(timeout);
    }
  }

  private recordGet(operation: MercuryReadOperation): void {
    if (operation === "GET_ACCOUNTS") this.getCallCount.accounts += 1;
    else if (operation === "GET_ACCOUNT") this.getCallCount.account += 1;
    else this.getCallCount.transactions += 1;
  }

  inspect(): Record<string, unknown> {
    return {
      provider: "mercury",
      mode: this.config.mode,
      baseUrl: this.config.baseUrl,
      tokenConfigured: this.config.tokenConfigured,
      tokenSource: this.config.tokenSource,
      tokenFingerprint: this.config.tokenFingerprint,
      tokenConflict: this.config.tokenConflict,
      lastAuthMode: this.lastAuthMode,
      lastVerifiedAt: this.lastVerifiedAt,
      getCallCount: { ...this.getCallCount },
      writeHttpCalls: this.writeHttpCalls,
      writeAttempts: this.writeAttempts,
    };
  }

  toJSON(): Record<string, unknown> {
    return this.inspect();
  }

  toString(): string {
    return redactMercuryValue(JSON.stringify(this.inspect()), this.credentials);
  }
}
