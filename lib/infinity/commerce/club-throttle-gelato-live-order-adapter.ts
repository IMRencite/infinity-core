import {
  assertGelatoLiveProduction,
  GELATO_ORDER_API_BASE,
  loadGelatoConfig,
  type GelatoResolvedConfig,
} from "@/lib/infinity/commercialization/providers/gelato/config";
import { normalizeGelatoError } from "@/lib/infinity/commercialization/providers/gelato/normalize";
import type { GelatoProductionOrderPayload } from "./club-throttle-gelato-order-payload.ts";
import {
  parseGelatoProductionOrderResponse,
  type ParsedGelatoProductionOrder,
} from "./provider-fulfillment-reconciliation-v1.ts";

export type GelatoSubmitResult = {
  ok: boolean;
  provider_order_id: string | null;
  provider_status: string | null;
  uncertain: boolean;
  retryable: boolean;
  provider_response_code: number;
  safe_error: string | null;
};

export function classifyGelatoHttpError(status: number): { retryable: boolean; error_class: string } {
  if (status === 429 || status === 408 || status >= 500) {
    return { retryable: true, error_class: "RETRYABLE_PROVIDER" };
  }
  if (status === 401 || status === 403) {
    return { retryable: false, error_class: "AUTH_FAILURE" };
  }
  if (status >= 400 && status < 500) {
    return { retryable: false, error_class: "INVALID_PAYLOAD" };
  }
  return { retryable: true, error_class: "UNKNOWN" };
}

export class ClubThrottleGelatoLiveOrderAdapter {
  readonly config: GelatoResolvedConfig;
  private readonly fetchImpl: typeof fetch;
  writeHttpCalls = 0;
  postHttpCalls = 0;
  patchHttpCalls = 0;
  readHttpCalls = 0;

  constructor(options: { env?: NodeJS.Dict<string>; fetchImpl?: typeof fetch } = {}) {
    this.config = loadGelatoConfig(options.env ?? process.env);
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  productionEnabled(): boolean {
    return this.config.environment === "LIVE" && Boolean(this.config.credentials);
  }

  private redact(value: string): string {
    return this.config.credentials?.redact(value) ?? value;
  }

  private async request(
    method: "GET" | "POST" | "PATCH",
    path: string,
    body?: Record<string, unknown>,
  ): Promise<{ ok: boolean; status: number; json: Record<string, unknown>; uncertain: boolean; safeError: string | null }> {
    assertGelatoLiveProduction(this.config);
    const credentials = this.config.credentials!;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await this.fetchImpl(`${GELATO_ORDER_API_BASE}${path}`, {
        method,
        headers: {
          "X-API-KEY": credentials.headerValue(),
          Accept: "application/json",
          ...(method === "POST" || method === "PATCH" ? { "Content-Type": "application/json" } : {}),
        },
        body: method === "POST" || method === "PATCH" ? JSON.stringify(body ?? {}) : undefined,
        signal: controller.signal,
      });
      if (method === "POST") {
        this.writeHttpCalls += 1;
        this.postHttpCalls += 1;
      } else if (method === "PATCH") {
        this.writeHttpCalls += 1;
        this.patchHttpCalls += 1;
      } else this.readHttpCalls += 1;
      const text = await response.text();
      let json: Record<string, unknown> = {};
      try {
        json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
      } catch {
        json = {};
      }
      const message =
        typeof json.message === "string"
          ? json.message
          : typeof json.error === "string"
            ? json.error
            : `GELATO_HTTP_${response.status}`;
      const uncertain = response.status >= 500 || response.status === 408 || response.status === 429;
      return {
        ok: response.ok,
        status: response.status,
        json,
        uncertain,
        safeError: response.ok ? null : this.redact(`${response.status}:${message}`.slice(0, 180)),
      };
    } catch (error) {
      const normalized = normalizeGelatoError(error, (v) => this.redact(v));
      return {
        ok: false,
        status: normalized.httpStatus ?? 0,
        json: {},
        uncertain: true,
        safeError: normalized.safeMessage,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async submitProductionOrder(
    payload: GelatoProductionOrderPayload,
    opts?: { dryRun?: boolean },
  ): Promise<GelatoSubmitResult> {
    if (!this.productionEnabled()) {
      return {
        ok: false,
        provider_order_id: null,
        provider_status: null,
        uncertain: false,
        retryable: false,
        provider_response_code: 0,
        safe_error: "GELATO_LIVE_UNCONFIGURED",
      };
    }
    if (opts?.dryRun) {
      return {
        ok: true,
        provider_order_id: null,
        provider_status: "DRY_RUN",
        uncertain: false,
        retryable: false,
        provider_response_code: 0,
        safe_error: null,
      };
    }
    const created = await this.request("POST", "/v4/orders", payload as unknown as Record<string, unknown>);
    const classification = classifyGelatoHttpError(created.status);
    const id =
      (typeof created.json.id === "string" && created.json.id) ||
      (typeof created.json.orderId === "string" && created.json.orderId) ||
      null;
    const status =
      (typeof created.json.fulfillmentStatus === "string" && created.json.fulfillmentStatus) ||
      (typeof created.json.status === "string" && created.json.status) ||
      null;
    return {
      ok: created.ok,
      provider_order_id: id,
      provider_status: status,
      uncertain: created.uncertain,
      retryable: classification.retryable,
      provider_response_code: created.status,
      safe_error: created.safeError,
    };
  }

  async getProductionOrder(providerOrderId: string): Promise<GelatoSubmitResult> {
    const read = await this.request("GET", `/v4/orders/${encodeURIComponent(providerOrderId)}`);
    const classification = classifyGelatoHttpError(read.status);
    const status =
      (typeof read.json.fulfillmentStatus === "string" && read.json.fulfillmentStatus) ||
      (typeof read.json.status === "string" && read.json.status) ||
      null;
    return {
      ok: read.ok,
      provider_order_id: read.ok ? providerOrderId : null,
      provider_status: status,
      uncertain: read.uncertain,
      retryable: classification.retryable,
      provider_response_code: read.status,
      safe_error: read.safeError,
    };
  }

  async patchProductionOrder(
    providerOrderId: string,
    body: Record<string, unknown>,
  ): Promise<GelatoSubmitResult & { json: Record<string, unknown> }> {
    if (!this.productionEnabled()) {
      return {
        ok: false,
        provider_order_id: null,
        provider_status: null,
        uncertain: false,
        retryable: false,
        provider_response_code: 0,
        safe_error: "GELATO_LIVE_UNCONFIGURED",
        json: {},
      };
    }
    const patched = await this.request("PATCH", `/v4/orders/${encodeURIComponent(providerOrderId)}`, body);
    const classification = classifyGelatoHttpError(patched.status);
    const status =
      (typeof patched.json.fulfillmentStatus === "string" && patched.json.fulfillmentStatus) ||
      (typeof patched.json.status === "string" && patched.json.status) ||
      null;
    return {
      ok: patched.ok,
      provider_order_id: patched.ok ? providerOrderId : null,
      provider_status: status,
      uncertain: patched.uncertain,
      retryable: classification.retryable,
      provider_response_code: patched.status,
      safe_error: patched.safeError,
      json: patched.json,
    };
  }

  async convertValidatedDraftToOrder(providerOrderId: string): Promise<GelatoSubmitResult & { json: Record<string, unknown> }> {
    return this.patchProductionOrder(providerOrderId, { orderType: "order" });
  }

  async getProductionOrderRaw(providerOrderId: string): Promise<{
    ok: boolean;
    json: Record<string, unknown>;
    provider_response_code: number;
    safe_error: string | null;
  }> {
    const read = await this.request("GET", `/v4/orders/${encodeURIComponent(providerOrderId)}`);
    return {
      ok: read.ok,
      json: read.json,
      provider_response_code: read.status,
      safe_error: read.safeError,
    };
  }

  async getProductionOrderParsed(providerOrderId: string): Promise<{
    ok: boolean;
    parsed: ParsedGelatoProductionOrder | null;
    provider_response_code: number;
    safe_error: string | null;
  }> {
    const read = await this.request("GET", `/v4/orders/${encodeURIComponent(providerOrderId)}`);
    if (!read.ok) {
      return {
        ok: false,
        parsed: null,
        provider_response_code: read.status,
        safe_error: read.safeError,
      };
    }
    return {
      ok: true,
      parsed: parseGelatoProductionOrderResponse(read.json),
      provider_response_code: read.status,
      safe_error: null,
    };
  }
}
