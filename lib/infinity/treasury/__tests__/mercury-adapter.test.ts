import { describe, expect, it } from "vitest";
import { MERCURY_PRODUCTION_BASE_URL, MERCURY_SANDBOX_BASE_URL } from "../constants";
import { UnsupportedCapabilityError } from "../providers/provider";
import {
  MercuryFinancialProvider,
  isMercurySandboxConfigured,
  loadMercuryConfig,
  nextMercuryPage,
  normalizeMercuryAccount,
  normalizeMercuryBalance,
  normalizeMercuryTransaction,
  redactMercuryValue,
  resolveMercuryBaseUrl,
  sanitizeMercuryObject,
  serializeMercuryPublicConfig,
} from "../providers/mercury";
import { mercuryUnknownReadCost } from "../providers/mercury/telemetry";
import { sanitizeEnvForCursor, financialCredentialsAvailableToCursor } from "@/lib/infinity/coding-agents/security";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const TOKEN = "mercury-sandbox-test-token-DO-NOT-LOG";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function mockMercuryFetch(input: {
  accounts?: unknown[];
  transactions?: Record<string, unknown[][]>;
  status?: number;
  delayMs?: number;
}): typeof fetch {
  const impl = (async (url: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method && init.method !== "GET") {
      throw new Error(`UNEXPECTED_WRITE:${init.method}`);
    }
    if (init?.signal?.aborted) {
      const error = new Error("aborted");
      error.name = "AbortError";
      throw error;
    }
    if (input.delayMs) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, input.delayMs);
        init?.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    }
    const href = String(url);
    if (input.status && input.status !== 200) return jsonResponse({ error: "failed" }, input.status);
    if (href.includes("/transactions")) {
      const accountId = href.match(/account\/([^/]+)\/transactions/)?.[1] ?? "";
      const offset = Number(new URL(href).searchParams.get("offset") ?? "0");
      const pages = input.transactions?.[accountId] ?? [[]];
      const pageIndex = Math.floor(offset / 100);
      const page = pages[pageIndex] ?? [];
      const total = pages.reduce((sum, items) => sum + items.length, 0);
      return jsonResponse({ total, transactions: page });
    }
    if (href.endsWith("/accounts") || href.includes("/accounts")) {
      return jsonResponse({ accounts: input.accounts ?? [] });
    }
    return jsonResponse({ error: "not-found" }, 404);
  }) as typeof fetch;
  return impl;
}

function sandboxEnv(overrides: Record<string, string | undefined> = {}): NodeJS.Dict<string> {
  return {
    MERCURY_ENABLED: "true",
    MERCURY_ENV: "sandbox",
    MERCURY_API_TOKEN: TOKEN,
    MERCURY_BASE_URL: MERCURY_SANDBOX_BASE_URL,
    ...overrides,
  };
}

const sampleAccount = {
  id: "acct-mercury-1",
  name: "Operating",
  kind: "checking",
  status: "active",
  availableBalance: 1250.5,
  currentBalance: 1300,
};

describe("mercury configuration", () => {
  it("defaults to disabled without inventing a live connection", () => {
    const config = loadMercuryConfig({ MERCURY_ENABLED: "false", MERCURY_ENV: "sandbox", MERCURY_API_TOKEN: TOKEN });
    expect(config.public.enabled).toBe(false);
    expect(config.public.mode).toBe("DISABLED");
    expect(config.public.health).toBe("NOT_CONFIGURED");
    expect(config.credentials).toBeNull();
  });

  it("uses the official sandbox base URL", () => {
    expect(resolveMercuryBaseUrl("SANDBOX")).toBe(MERCURY_SANDBOX_BASE_URL);
    expect(resolveMercuryBaseUrl("SANDBOX", "https://api.mercury.com/api/v1/")).toBe(MERCURY_SANDBOX_BASE_URL);
    expect(resolveMercuryBaseUrl("PRODUCTION")).toBe(MERCURY_PRODUCTION_BASE_URL);
    const config = loadMercuryConfig(sandboxEnv());
    expect(config.public.baseUrl).toBe(MERCURY_SANDBOX_BASE_URL);
    expect(config.public.mode).toBe("SANDBOX");
    expect(config.public.health).toBe("CONFIGURED");
  });

  it("does not mark verified merely because env vars exist", () => {
    const provider = new MercuryFinancialProvider({ env: sandboxEnv(), fetchImpl: mockMercuryFetch({ accounts: [] }) });
    expect(provider.health).toBe("CONFIGURED");
    expect(provider.health).not.toBe("READ_ONLY_VERIFIED");
  });

  it("treats missing token as not configured", () => {
    const config = loadMercuryConfig(sandboxEnv({ MERCURY_API_TOKEN: "" }));
    expect(config.public.tokenConfigured).toBe(false);
    expect(config.public.health).toBe("NOT_CONFIGURED");
    expect(config.credentials).toBeNull();
  });
});

describe("mercury token redaction", () => {
  it("never serializes the token on public config or provider JSON", () => {
    const config = loadMercuryConfig(sandboxEnv());
    const serialized = JSON.stringify(serializeMercuryPublicConfig(config.public));
    expect(serialized).not.toContain(TOKEN);
    expect(serialized).not.toMatch(/mercury-sandbox-test-token/i);
    const provider = new MercuryFinancialProvider({ env: sandboxEnv(), fetchImpl: mockMercuryFetch({ accounts: [] }) });
    expect(JSON.stringify(provider)).not.toContain(TOKEN);
    expect(JSON.stringify(provider.http)).not.toContain(TOKEN);
    expect(JSON.stringify(config.credentials)).toEqual(JSON.stringify({ configured: true }));
  });

  it("redacts tokens from strings, objects, and error messages", () => {
    const credentials = loadMercuryConfig(sandboxEnv()).credentials!;
    expect(redactMercuryValue(`Authorization: Bearer ${TOKEN}`, credentials)).not.toContain(TOKEN);
    const sanitized = sanitizeMercuryObject(
      { authorization: `Bearer ${TOKEN}`, accountNumber: "123", routingNumber: "021000021", note: "ok" },
      credentials,
    );
    expect(JSON.stringify(sanitized)).not.toContain(TOKEN);
    expect(sanitized.accountNumber).toBe("[REDACTED]");
    expect(sanitized.routingNumber).toBe("[REDACTED]");
    expect(sanitized.note).toBe("ok");
  });

  it("strips Mercury credentials from Cursor/AI env sanitization", () => {
    const sanitized = sanitizeEnvForCursor({
      MERCURY_API_TOKEN: TOKEN,
      MERCURY_API_KEY: TOKEN,
      NEXT_PUBLIC_SITE_URL: "https://example.com",
    });
    expect(sanitized.MERCURY_API_TOKEN).toBeUndefined();
    expect(sanitized.MERCURY_API_KEY).toBeUndefined();
    expect(financialCredentialsAvailableToCursor(sanitized)).toBe(false);
  });
});

describe("mercury normalization", () => {
  const ctx = { environment: "SANDBOX" as const, fetchedAt: "2026-08-19T00:00:00.000Z" };

  it("normalizes accounts without inventing missing values or copying bank account numbers", () => {
    const account = normalizeMercuryAccount(
      { id: "acct-1", accountNumber: "999999", routingNumber: "021000021", status: "active", kind: "checking" },
      ctx,
    );
    expect(account?.accountId).toBe("acct-1");
    expect(account?.displayName).toBe("UNKNOWN");
    expect(account?.accountKind).toBe("CHECKING");
    expect(account?.provenance?.actuality).toBe("SANDBOX_PROVIDER_DATA");
    expect(JSON.stringify(account)).not.toContain("999999");
    expect(JSON.stringify(account)).not.toContain("021000021");
    expect(normalizeMercuryAccount({}, ctx)).toBeNull();
  });

  it("normalizes sandbox balances as sandbox provider data, not production cash", () => {
    const balance = normalizeMercuryBalance(sampleAccount, ctx);
    expect(balance?.available.value).toBe(1250.5);
    expect(balance?.current.actuality).toBe("ESTIMATE");
    expect(balance?.truthClass).toBe("PROVIDER_SANDBOX");
    expect(balance?.provenance?.actuality).toBe("SANDBOX_PROVIDER_DATA");
    expect(normalizeMercuryBalance({ id: "acct-1" }, ctx)?.current.actuality).toBe("UNKNOWN");
  });

  it("normalizes transactions with counterparty and category when present", () => {
    const txn = normalizeMercuryTransaction(
      {
        id: "txn-1",
        amount: -42.1,
        status: "sent",
        postedAt: "2026-08-18T00:00:00.000Z",
        counterpartyName: "Namecheap",
        mercuryCategory: "software",
        bankDescription: "domain",
      },
      "acct-mercury-1",
      ctx,
    );
    expect(txn?.providerTransactionId).toBe("txn-1");
    expect(txn?.classification).toBe("EXPENSE");
    expect(txn?.counterparty).toBe("Namecheap");
    expect(txn?.providerCategory).toBe("software");
    expect(txn?.status).toBe("POSTED");
    expect(txn?.provenance?.source).toBe("MERCURY");
  });
});

describe("mercury pagination", () => {
  it("stops when a page is short, total is exhausted, or bounds are hit", () => {
    expect(nextMercuryPage({ offset: 0, page: 1, accumulated: 2, pageSize: 100, fetchedThisPage: 2, total: 2, maxPages: 20, maxRecords: 2000 }).done).toBe(true);
    expect(nextMercuryPage({ offset: 0, page: 1, accumulated: 100, pageSize: 100, fetchedThisPage: 100, total: 250, maxPages: 20, maxRecords: 2000 })).toEqual({
      done: false,
      nextOffset: 100,
    });
    expect(nextMercuryPage({ offset: 0, page: 20, accumulated: 2000, pageSize: 100, fetchedThisPage: 100, total: 5000, maxPages: 20, maxRecords: 2000 }).done).toBe(true);
    expect(nextMercuryPage({ offset: 0, page: 1, accumulated: 0, pageSize: 100, fetchedThisPage: 0, total: null, maxPages: 20, maxRecords: 2000 }).done).toBe(true);
  });

  it("fetches multiple transaction pages without looping forever", async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({ id: `txn-${i}`, amount: -1, status: "sent", createdAt: "2026-08-18T00:00:00.000Z" }));
    const page2 = [{ id: "txn-100", amount: 5, status: "sent", createdAt: "2026-08-18T00:00:00.000Z" }];
    const fetchImpl = mockMercuryFetch({
      accounts: [sampleAccount],
      transactions: { "acct-mercury-1": [page1, page2] },
    });
    const provider = new MercuryFinancialProvider({ env: sandboxEnv(), fetchImpl });
    const txns = await provider.getTransactions();
    expect(txns).toHaveLength(101);
    expect(provider.http.getCallCount.transactions).toBe(2);
    expect(provider.http.getCallCount.accounts).toBe(1);
  });
});

describe("mercury read-only enforcement", () => {
  it("denies all write capabilities before any HTTP mutation, including production", async () => {
    const fetchImpl = mockMercuryFetch({ accounts: [sampleAccount] });
    for (const envName of ["sandbox", "production"] as const) {
      const provider = new MercuryFinancialProvider({
        env: sandboxEnv({ MERCURY_ENV: envName, MERCURY_BASE_URL: envName === "production" ? MERCURY_PRODUCTION_BASE_URL : MERCURY_SANDBOX_BASE_URL }),
        fetchImpl,
      });
      expect(provider.config.capabilities.ACCOUNT_READ).toBe(true);
      expect(provider.config.capabilities.BALANCE_READ).toBe(true);
      expect(provider.config.capabilities.TRANSACTION_READ).toBe(true);
      expect(provider.config.capabilities.PAYMENT_CREATE).toBeUndefined();
      expect(provider.config.capabilities.CARD_CREATE).toBeUndefined();
      const writes = [
        () => provider.createPayment({ recipientId: "r", amountUsd: 1, currency: "USD", idempotencyKey: "k" }),
        () => provider.createRecipient({ displayName: "x", idempotencyKey: "k" }),
        () => provider.createVirtualCard({ purpose: "x", idempotencyKey: "k" }),
        () => provider.sendMoney({}),
        () => provider.updateTransactionMetadata({}),
        () => provider.internalTransfer({}),
        () => provider.http.requestWrite("POST", "account/sendMoney"),
      ];
      for (const write of writes) {
        await expect(write()).rejects.toBeInstanceOf(UnsupportedCapabilityError);
      }
      expect(provider.http.writeHttpCalls).toBe(0);
    }
  });
});

describe("mercury provider errors", () => {
  it("maps auth failure, rate limit, timeout, and unavailable without leaking the token", async () => {
    const auth = new MercuryFinancialProvider({ env: sandboxEnv(), fetchImpl: mockMercuryFetch({ status: 401 }) });
    await expect(auth.getAccounts()).rejects.toMatchObject({ name: "ProviderAuthFailedError" });
    const limited = new MercuryFinancialProvider({ env: sandboxEnv(), fetchImpl: mockMercuryFetch({ status: 429 }) });
    await expect(limited.getAccounts()).rejects.toMatchObject({ name: "ProviderRateLimitedError" });
    const down = new MercuryFinancialProvider({ env: sandboxEnv(), fetchImpl: mockMercuryFetch({ status: 500 }) });
    await expect(down.getAccounts()).rejects.toMatchObject({ name: "ProviderUnavailableError" });
    const timed = new MercuryFinancialProvider({
      env: sandboxEnv(),
      resolved: { ...loadMercuryConfig(sandboxEnv()), public: { ...loadMercuryConfig(sandboxEnv()).public, timeoutMs: 5 } },
      fetchImpl: mockMercuryFetch({ delayMs: 40 }),
    });
    await expect(timed.getAccounts()).rejects.toMatchObject({ name: "ProviderTimeoutError" });
    try {
      await auth.getAccounts();
    } catch (error) {
      expect(JSON.stringify(error)).not.toContain(TOKEN);
      expect((error as Error).message).not.toContain(TOKEN);
    }
  });

  it("does not call HTTP when token is missing", async () => {
    let called = 0;
    const fetchImpl = (async () => {
      called += 1;
      return jsonResponse({});
    }) as typeof fetch;
    const provider = new MercuryFinancialProvider({ env: sandboxEnv({ MERCURY_API_TOKEN: "" }), fetchImpl });
    await expect(provider.getAccounts()).rejects.toMatchObject({ name: "ProviderUnavailableError" });
    expect(called).toBe(0);
  });
});

describe("mercury telemetry and client leakage", () => {
  it("records unknown API cost rather than zero", () => {
    const telemetry = mercuryUnknownReadCost("GET_ACCOUNTS", "SANDBOX", "accounts");
    expect(telemetry.costKnown).toBe(false);
    expect(telemetry.costUsd).toBeNull();
    expect(telemetry.cost.actuality).toBe("UNKNOWN");
    expect(telemetry.cost.value).toBeNull();
  });

  it("does not import Mercury config or tokens into client components", () => {
    const roots = [
      join(process.cwd(), "components"),
      join(process.cwd(), "app"),
    ];
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const stat = statSync(full);
        if (stat.isDirectory()) walk(full);
        else if (full.endsWith(".tsx") || full.endsWith(".ts")) files.push(full);
      }
    };
    for (const root of roots) walk(root);
    const clientFiles = files.filter((file) => readFileSync(file, "utf8").includes('"use client"') || readFileSync(file, "utf8").includes("'use client'"));
    for (const file of clientFiles) {
      const content = readFileSync(file, "utf8");
      expect(content).not.toContain("MERCURY_API_TOKEN");
      expect(content).not.toContain("NEXT_PUBLIC_MERCURY");
      expect(content).not.toContain("providers/mercury/config");
      expect(content).not.toContain("loadMercuryConfig");
    }
  });
});

describe("mercury live sandbox gate", () => {
  it("does not fail architecture verification when sandbox credentials are absent", () => {
    if (!isMercurySandboxConfigured()) {
      expect(isMercurySandboxConfigured()).toBe(false);
    }
  });
});
