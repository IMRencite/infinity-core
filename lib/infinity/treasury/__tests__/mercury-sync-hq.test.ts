import { describe, expect, it } from "vitest";
import { MERCURY_SANDBOX_BASE_URL } from "../constants";
import { buildTreasuryHqArtifacts } from "../hq/artifacts";
import { buildTreasuryInspectorPayload } from "../hq/inspector-payload";
import { buildTreasuryHqReadModel } from "../hq/read-model";
import { recordManualFunding } from "../operator/manual-control";
import { MercuryFinancialProvider } from "../providers/mercury";
import { assertNoCredentialFields } from "../security";
import { composeTreasuryState } from "../state/compose";
import { TreasuryStore } from "../store";
import { syncFinancialProvider } from "../sync/provider-sync";
import { ORG_A, ORG_B } from "./fixtures";

const TOKEN = "mercury-sandbox-test-token-DO-NOT-LOG";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function mockMercuryFetch(input: { accounts?: unknown[]; transactions?: unknown[]; status?: number }): typeof fetch {
  return (async (url: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method && init.method !== "GET") throw new Error(`UNEXPECTED_WRITE:${init.method}`);
    if (input.status && input.status !== 200) return jsonResponse({}, input.status);
    const href = String(url);
    if (href.includes("/transactions")) {
      return jsonResponse({ total: (input.transactions ?? []).length, transactions: input.transactions ?? [] });
    }
    return jsonResponse({ accounts: input.accounts ?? [] });
  }) as typeof fetch;
}

const mercuryAccount = {
  id: "acct-mercury-1",
  name: "Sandbox Operating",
  kind: "checking",
  status: "active",
  availableBalance: 880.25,
  currentBalance: 900,
};

const mercuryTxn = {
  id: "txn-mercury-1",
  amount: -12,
  status: "sent",
  postedAt: "2026-08-18T00:00:00.000Z",
  counterpartyName: "Vercel",
  mercuryCategory: "software",
};

function sandboxProvider(fetchImpl: typeof fetch, envName: "sandbox" | "production" = "sandbox") {
  return new MercuryFinancialProvider({
    env: {
      MERCURY_ENABLED: "true",
      MERCURY_ENV: envName,
      MERCURY_API_TOKEN: TOKEN,
      MERCURY_BASE_URL: MERCURY_SANDBOX_BASE_URL,
    },
    fetchImpl,
  });
}

describe("mercury treasury sync", () => {
  it("syncs accounts, sandbox balances, and transactions idempotently with provenance", async () => {
    const store = new TreasuryStore();
    const provider = sandboxProvider(mockMercuryFetch({ accounts: [mercuryAccount], transactions: [mercuryTxn] }));
    const first = await syncFinancialProvider(store, { organizationId: ORG_A, provider });
    const second = await syncFinancialProvider(store, { organizationId: ORG_A, provider });
    expect(first.accountsUpserted).toBe(1);
    expect(first.transactionsIngested).toBe(1);
    expect(second.transactionsDuplicate).toBe(1);
    expect(store.transactions.size).toBe(1);
    const snapshot = [...store.balanceSnapshots.values()].find((row) => row.accountId === "acct-mercury-1" && row.source === "PROVIDER_SANDBOX");
    expect(snapshot?.truthClass).toBe("PROVIDER_SANDBOX");
    expect(snapshot?.provenance?.actuality).toBe("SANDBOX_PROVIDER_DATA");
    expect(snapshot?.current.actuality).toBe("ESTIMATE");
    const connection = [...store.connections.values()].find((row) => row.provider === "mercury");
    expect(connection?.health).toBe("READ_ONLY_VERIFIED");
    expect(connection?.environment).toBe("SANDBOX");
    expect(provider.http.writeHttpCalls).toBe(0);
  });

  it("keeps sandbox provider transactions out of the internal manual ledger", async () => {
    const store = new TreasuryStore();
    const provider = sandboxProvider(mockMercuryFetch({ accounts: [mercuryAccount], transactions: [mercuryTxn] }));
    await syncFinancialProvider(store, { organizationId: ORG_A, provider });
    expect([...store.ledger.values()].some((entry) => entry.provider === "mercury")).toBe(false);
    expect([...store.transactions.values()][0]?.provider).toBe("mercury");
  });

  it("scopes provider data to organization", async () => {
    const store = new TreasuryStore();
    const provider = sandboxProvider(mockMercuryFetch({ accounts: [mercuryAccount], transactions: [mercuryTxn] }));
    await syncFinancialProvider(store, { organizationId: ORG_A, provider });
    expect(store.scoped(ORG_B, store.accounts)).toHaveLength(0);
    expect(store.scoped(ORG_B, store.transactions)).toHaveLength(0);
    expect(store.scoped(ORG_A, store.accounts)).toHaveLength(1);
  });

  it("separates manual internal capital from sandbox Mercury balances", async () => {
    const store = new TreasuryStore();
    const funded = recordManualFunding(store, {
      organizationId: ORG_A,
      amountUsd: 5000,
      source: "founder_contribution",
      memo: "Owner injection",
      idempotencyKey: "fund-mercury-sep",
    });
    expect(funded.ok).toBe(true);
    const provider = sandboxProvider(mockMercuryFetch({ accounts: [mercuryAccount], transactions: [mercuryTxn] }));
    await syncFinancialProvider(store, { organizationId: ORG_A, provider });
    const state = composeTreasuryState(store, { organizationId: ORG_A });
    expect(state.internalCapital.value).toBe(5000);
    expect(state.totalCash.actuality).toBe("UNKNOWN");
    expect(state.totalCash.value).not.toBe(900);
    const model = buildTreasuryHqReadModel(store, ORG_A, undefined, {
      mercury: provider.publicConfig,
    });
    expect(model.mercury.providerBalance.display).toContain("SANDBOX");
    expect(model.mercury.providerBalance.display).toContain("900");
    expect(model.cards.internalCapital.display).toContain("5,000");
    expect(model.treasurySource).toBe("Internal manual ledger");
  });

  it("maps auth and rate-limit failures onto provider health without leaking the token", async () => {
    const store = new TreasuryStore();
    const auth = await syncFinancialProvider(store, {
      organizationId: ORG_A,
      provider: sandboxProvider(mockMercuryFetch({ status: 401 })),
    });
    expect(auth.reason).toBe("AUTH_FAILED");
    expect(JSON.stringify(auth)).not.toContain(TOKEN);
    const limited = await syncFinancialProvider(store, {
      organizationId: ORG_B,
      provider: sandboxProvider(mockMercuryFetch({ status: 429 })),
    });
    expect(limited.reason).toBe("RATE_LIMITED");
    const connection = [...store.connections.values()].find((row) => row.organizationId === ORG_B);
    expect(connection?.health).toBe("RATE_LIMITED");
  });
});

describe("mercury HQ status", () => {
  it("shows Mercury connection state without the API token", async () => {
    const store = new TreasuryStore();
    const unconfigured = buildTreasuryHqReadModel(store, ORG_A);
    expect(unconfigured.mercury.provider).toBe("MERCURY");
    expect(unconfigured.mercury.statusLabel).toBe("NOT CONFIGURED");
    expect(unconfigured.mercury.tokenVisible).toBe(false);

    const provider = sandboxProvider(mockMercuryFetch({ accounts: [mercuryAccount], transactions: [mercuryTxn] }));
    await syncFinancialProvider(store, { organizationId: ORG_A, provider });
    const model = buildTreasuryHqReadModel(store, ORG_A, undefined, { mercury: provider.publicConfig });
    expect(model.mercury.statusLabel).toBe("SANDBOX CONNECTED");
    expect(model.mercury.environment).toBe("SANDBOX");
    expect(model.mercury.lastSuccessfulSync).toBeTruthy();
    expect(model.mercury.accountCount).toBe(1);
    expect(model.mercury.providerBalance.display).toMatch(/SANDBOX/);
    expect(model.mercury.tokenVisible).toBe(false);
    expect(JSON.stringify(model)).not.toContain(TOKEN);
    expect(JSON.stringify(model)).not.toMatch(/mercury-sandbox-test-token/i);
    expect("token" in model.mercury).toBe(false);
    expect("apiToken" in model.mercury).toBe(false);
    expect(assertNoCredentialFields(model.mercury).filter((path) => !path.endsWith(".tokenVisible"))).toEqual([]);
    expect(JSON.stringify(model)).not.toMatch(/Bearer /i);

    const artifacts = buildTreasuryHqArtifacts(model);
    const state = artifacts.executive_office?.find((row) => row.artifactType === "treasury_state");
    expect(state?.metadata.mercuryStatus).toBe("SANDBOX CONNECTED");
    expect(JSON.stringify(state?.metadata)).not.toContain(TOKEN);
    expect(state?.metadata).not.toHaveProperty("token");
    expect(state?.metadata).not.toHaveProperty("apiToken");
    expect(state?.metadata).not.toHaveProperty("MERCURY_API_TOKEN");

    const inspector = buildTreasuryInspectorPayload(store, ORG_A, "treasury_state", ORG_A, undefined, provider.publicConfig);
    expect(inspector.mercury.statusLabel).toBe("SANDBOX CONNECTED");
    expect(inspector.mercury.tokenVisible).toBe(false);
    expect(JSON.stringify(inspector)).not.toContain(TOKEN);
    expect("token" in inspector.mercury).toBe(false);
    expect(assertNoCredentialFields(inspector.mercury).filter((path) => !path.endsWith(".tokenVisible"))).toEqual([]);
  });

  it("does not show SANDBOX CONNECTED merely because a token exists", () => {
    const store = new TreasuryStore();
    const provider = sandboxProvider(mockMercuryFetch({ accounts: [mercuryAccount] }));
    const model = buildTreasuryHqReadModel(store, ORG_A, undefined, { mercury: provider.publicConfig });
    expect(provider.publicConfig.tokenConfigured).toBe(true);
    expect(model.mercury.statusLabel).toBe("CONFIGURED · NOT VERIFIED");
  });
});
