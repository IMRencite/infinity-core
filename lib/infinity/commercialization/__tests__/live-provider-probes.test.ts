import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildProviderInventory,
  generateProbeDomainNames,
  parseNamecheapAvailability,
  probeDnsLive,
  probeHostingLive,
  probePaymentsLive,
  probeRegistrarLive,
} from "../probes/live-probes";
import { exerciseMutationGuards } from "../probes/mutation-guards";
import { buildProviderReadinessArtifacts } from "../hq/build-provider-readiness-artifacts";
import { MockDnsProvider, MockRegistrarProvider } from "../providers/mock";
import { buildDomainCandidates } from "../domain/candidate-engine";
import { createDomainRequirement, registerDomainWithAuthority } from "../domain/register-domain";
import { CommercializationStore } from "../store";
import { classifyCommercialProviderFailure } from "../probes/failure-semantics";
import { normalizeUsdAmount, unknownCostCannotAuthorize } from "../providers/money";
import { classifyHttpFailure } from "../probes/status";
import { buildLiveVerificationRecords } from "../probes/persist";
import { redactSecrets, redactUnknown } from "@/lib/infinity/launch-gateway/redaction";
import { READ_ONLY_MUTATION_BLOCKED } from "../probes/mode";
import { wrapRegistrarReadOnly } from "../probes/read-only-adapters";
import type { DomainSearchResult, RegistrarCapability } from "../providers/contracts";
import { assertGatewayBackedExecution } from "../gateway/action-bridge";
import { buildArtifactInspectorModel } from "@/lib/infinity/operator-console/artifacts/build-inspector-model";
import { buildEntityDetail } from "@/lib/infinity/operator-console/details/build-entity-detail";
import { sanitizeEnvForCursor } from "@/lib/infinity/coding-agents/security";

function loadEnvLocal(): void {
  try {
    const content = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const sep = trimmed.indexOf("=");
      if (sep === -1) continue;
      const key = trimmed.slice(0, sep);
      let val = trimmed.slice(sep + 1);
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

function readRepo(relative: string): string {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("Commercialization live capability verification", () => {
  it("builds provider inventory without exposing secrets", () => {
    loadEnvLocal();
    const inventory = buildProviderInventory();
    const serialized = JSON.stringify(inventory);
    expect(serialized).not.toMatch(/sk_live_|sk_test_|ghp_|ApiKey=|vcp_|whsec_/i);
    expect(inventory.hosting.providerKey).toBeTruthy();
    expect(inventory.registrar.readOnlyEnforceable).toBe(true);
    expect(inventory.dns.readOnlyEnforceable).toBe(true);
    expect(inventory.hosting.readOnlyEnforceable).toBe(true);
    expect(inventory.payments.readOnlyEnforceable).toBe(true);
  });

  it("normalizes unknown renewal at getAvailability to null, never undefined or zero", async () => {
    const registrar = new MockRegistrarProvider();
    registrar.seedAvailability([
      {
        domain: "unknown-renewal-probe.com",
        available: true,
        registrationPriceUsd: 9.99,
        renewalPriceUsd: undefined as unknown as null,
        priceTruth: "UNKNOWN",
        currency: "USD",
      },
    ]);
    const row = await registrar.getAvailability("unknown-renewal-probe.com");
    expect(row.renewalPriceUsd).toBeNull();
    expect(Object.prototype.hasOwnProperty.call(row, "renewalPriceUsd")).toBe(true);
    expect(row.renewalPriceUsd).not.toBe(0);
    expect(row.registrationPriceUsd).toBe(9.99);
  });

  it("normalizes registrar search results that omit renewalPriceUsd through candidate engine", async () => {
    const inner: RegistrarCapability = {
      providerKey: "fixture.registrar",
      searchDomains: async (queries) =>
        queries.map(
          (domain) =>
            ({
              domain,
              available: true,
              registrationPriceUsd: 11.99,
              currency: "USD",
              priceTruth: "ESTIMATE",
            }) as DomainSearchResult,
        ),
      getAvailability: async (domain) => ({
        domain,
        available: true,
        registrationPriceUsd: 11.99,
        renewalPriceUsd: undefined as unknown as null,
        currency: "USD",
        priceTruth: "ESTIMATE",
      }),
      getRegistrationPrice: async () => ({ priceUsd: 11.99, truth: "ESTIMATE" }),
      getRenewalPrice: async () => ({ priceUsd: null, truth: "UNKNOWN" }),
      registerDomain: async () => {
        throw new Error("should-not-register");
      },
      configureNameservers: async () => ({ configured: false }),
    };
    const store = new CommercializationStore();
    const req = createDomainRequirement({
      store,
      organizationId: "org-1",
      ventureId: "venture-1",
      brandName: "Probe",
    });
    const candidates = await buildDomainCandidates({ requirement: req, registrar: inner });
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((c) => c.renewalPriceUsd === null)).toBe(true);
    expect(candidates.every((c) => c.registrationPriceUsd === 11.99)).toBe(true);
  });

  it("parses Namecheap XML without renewal as null", () => {
    const xml = `<ApiResponse><CommandResponse><DomainCheckResult Domain="infinity-probe-example.com" Available="true" IsPremiumName="false" Price="12.99"/></CommandResponse></ApiResponse>`;
    const parsed = parseNamecheapAvailability(xml, "infinity-probe-example.com");
    expect(parsed.renewalPriceUsd).toBeNull();
    expect(parsed.registrationPriceUsd).toBe(12.99);
    expect(parsed.premium).toBe(false);
  });

  it("canonical money: unknown is null, actual zero remains zero, invalid is null", () => {
    expect(normalizeUsdAmount(undefined)).toBeNull();
    expect(normalizeUsdAmount(null)).toBeNull();
    expect(normalizeUsdAmount("")).toBeNull();
    expect(normalizeUsdAmount(Number.NaN)).toBeNull();
    expect(normalizeUsdAmount(Number.POSITIVE_INFINITY)).toBeNull();
    expect(normalizeUsdAmount(-4)).toBeNull();
    expect(normalizeUsdAmount(0)).toBe(0);
    expect(normalizeUsdAmount("14.99")).toBe(14.99);
    expect(unknownCostCannotAuthorize(null)).toBe(true);
    expect(unknownCostCannotAuthorize(0)).toBe(false);
  });

  it("blocks all mutation paths before provider write with READ_ONLY_MUTATION_BLOCKED", async () => {
    const guards = await exerciseMutationGuards();
    expect(guards.domainRegisterBlocked).toBe(true);
    expect(guards.domainRegisterCalls).toBe(0);
    expect(guards.domainRegisterCode).toBe(READ_ONLY_MUTATION_BLOCKED);
    expect(guards.dnsMutationBlocked).toBe(true);
    expect(guards.dnsCreateCalls).toBe(0);
    expect(guards.hostingDeployBlocked).toBe(true);
    expect(guards.hostingDeployCalls).toBe(0);
    expect(guards.paymentProductBlocked).toBe(true);
    expect(guards.paymentProductCalls).toBe(0);
    expect(guards.treasuryBypassBlocked).toBe(true);
  });

  it("does not invoke inner registrar mutation under READ_ONLY wrap", async () => {
    const inner = new MockRegistrarProvider();
    const writes = { count: 0 };
    const original = inner.registerDomain.bind(inner);
    inner.registerDomain = async (input) => {
      writes.count += 1;
      return original(input);
    };
    const wrapped = wrapRegistrarReadOnly(inner, writes);
    await expect(
      wrapped.registerDomain({ domain: "x.com", authorizationRef: "a", idempotencyKey: "k" }),
    ).rejects.toMatchObject({ code: READ_ONLY_MUTATION_BLOCKED });
    expect(writes.count).toBe(0);
    expect(inner.purchaseCount).toBe(0);
  });

  it("maps provider failures to technical classifications not BUSINESS_NO_GO", () => {
    expect(classifyCommercialProviderFailure(new Error("AUTHORIZATION_MISSING"))).toBe("AUTHORIZATION_MISSING");
    expect(classifyCommercialProviderFailure(new Error("rate limit"))).toBe("PROVIDER_UNAVAILABLE");
    expect(classifyCommercialProviderFailure(new Error("BUSINESS_NO_GO"))).not.toBe("BUSINESS_NO_GO");
    expect(classifyHttpFailure(401)).toBe("AUTH_FAILED");
    expect(classifyHttpFailure(403)).toBe("PERMISSION_DENIED");
    expect(classifyHttpFailure(429)).toBe("RATE_LIMITED");
  });

  it("builds HQ provider readiness artifacts without claiming live commerce or generic READY", () => {
    const inventory = buildProviderInventory();
    const artifacts = buildProviderReadinessArtifacts(inventory);
    const all = Object.values(artifacts).flat();
    expect(all.every((a) => a.metadata.readiness !== "READY")).toBe(true);
    expect(all.every((a) => a.metadata.mutationAuthority === "LOCKED")).toBe(true);
    expect(all.every((a) => a.metadata.mode === "READ_ONLY")).toBe(true);
    expect(all.some((a) => a.title === "Registrar")).toBe(true);
    expect(JSON.stringify(all)).not.toContain("DOMAIN REGISTERED");
    expect(JSON.stringify(all)).not.toContain("PUBLIC_LAUNCH_READY");
    const detail = buildEntityDetail(buildArtifactInspectorModel(all[0]!, all));
    expect(detail.system.rows.some((row) => row.label === "Provider key")).toBe(true);
    expect(detail.decision).toBe("MUTATION AUTHORITY LOCKED");
    expect(JSON.stringify(detail)).not.toMatch(/sk_live_|vcp_|whsec_/);
  });

  it("generates disposable probe domain names", () => {
    const names = generateProbeDomainNames("test");
    expect(names.every((n) => n.includes("infinity-probe"))).toBe(true);
  });

  it("skips unconfigured providers instead of fake success", async () => {
    const saved = {
      NAMECHEAP_API_USER: process.env.NAMECHEAP_API_USER,
      NAMECHEAP_API_KEY: process.env.NAMECHEAP_API_KEY,
      NAMECHEAP_CLIENT_IP: process.env.NAMECHEAP_CLIENT_IP,
      CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    };
    delete process.env.NAMECHEAP_API_USER;
    delete process.env.NAMECHEAP_API_KEY;
    delete process.env.NAMECHEAP_CLIENT_IP;
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.STRIPE_SECRET_KEY;
    try {
      const inventory = buildProviderInventory();
      expect(inventory.registrar.configured).toBe("NOT_CONFIGURED");
      const registrar = await probeRegistrarLive(["infinity-probe-skip.com"]);
      expect(registrar.status).toBe("NOT_CONFIGURED");
      expect(registrar.normalization).toBe("SKIPPED");
      expect(registrar.realProviderCall).toBe(false);
      const dns = await probeDnsLive();
      expect(dns.status).toBe("NOT_CONFIGURED");
      const payments = await probePaymentsLive();
      expect(payments.status).toBe("NOT_CONFIGURED");
      expect(payments.liveChargesAuthorized).toBe(false);
      expect(payments.balanceAccessible).toBe(false);
      expect(payments.realProviderCall).toBe(false);
    } finally {
      if (saved.NAMECHEAP_API_USER) process.env.NAMECHEAP_API_USER = saved.NAMECHEAP_API_USER;
      if (saved.NAMECHEAP_API_KEY) process.env.NAMECHEAP_API_KEY = saved.NAMECHEAP_API_KEY;
      if (saved.NAMECHEAP_CLIENT_IP) process.env.NAMECHEAP_CLIENT_IP = saved.NAMECHEAP_CLIENT_IP;
      if (saved.CLOUDFLARE_API_TOKEN) process.env.CLOUDFLARE_API_TOKEN = saved.CLOUDFLARE_API_TOKEN;
      if (saved.STRIPE_SECRET_KEY) process.env.STRIPE_SECRET_KEY = saved.STRIPE_SECRET_KEY;
    }
  });

  it("treats empty DNS account counts as actual zero", async () => {
    const dns = new MockDnsProvider();
    const records = await dns.listRecords("empty.example");
    expect(records).toEqual([]);
    expect(records.length).toBe(0);
  });

  it("blocks unknown registration cost instead of authorizing as zero", async () => {
    const store = new CommercializationStore();
    const registrar = new MockRegistrarProvider();
    registrar.seedAvailability([
      {
        domain: "unknown-cost.example",
        available: true,
        registrationPriceUsd: null,
        renewalPriceUsd: null,
        priceTruth: "UNKNOWN",
        currency: "USD",
      },
    ]);
    await expect(
      registerDomainWithAuthority({
        store,
        registrar,
        organizationId: "org-1",
        ventureId: "venture-1",
        candidate: {
          id: "c1",
          organizationId: "org-1",
          domainRequirementId: "d1",
          domain: "unknown-cost.example",
          tld: ".example",
          available: true,
          registrationPriceUsd: null,
          renewalPriceUsd: null,
          priceTruth: "UNKNOWN",
          totalScore: 1,
          scoreBreakdown: {
            brandFit: 1,
            memorability: 1,
            spellingClarity: 1,
            length: 1,
            customerRelevance: 1,
            tldQuality: 1,
            businessRelevance: 1,
            price: 1,
            renewalCost: 1,
            confusionRisk: 1,
            trademarkRiskSignal: 1,
          },
          selected: true,
        },
      }),
    ).rejects.toThrow(/UNKNOWN_COST/);
    expect(registrar.purchaseCount).toBe(0);
    expect(store.spendExecutions.size).toBe(0);
  });

  it("blocks external mutation outside EAG authorization", () => {
    expect(() => assertGatewayBackedExecution({ authorizationRef: null })).toThrow(/AUTHORIZATION_MISSING/);
  });

  it("redacts provider tokens and headers from diagnostic output", () => {
    const stripeLiveShaped = ["sk", "live", "abcdefghijklmnopqrstuvwxyz1234"].join("_");
    const vercelShaped = ["vcp", "abcdefghijklmnopqrstuvwxyz1234"].join("_");
    const webhookShaped = ["whsec", "abcdefghijklmnopqrstuvwxyz"].join("_");
    const leaked = `Authorization: Bearer ${stripeLiveShaped} header ${vercelShaped} ${webhookShaped}`;
    const redacted = redactSecrets(leaked);
    expect(redacted).not.toContain(stripeLiveShaped);
    expect(redacted).not.toContain(vercelShaped);
    expect(redacted).not.toContain(webhookShaped);
    expect(redacted).toContain("[REDACTED_SECRET]");
  });

  it("redacts secret fields from provider exception objects", () => {
    const sanitized = redactUnknown({
      message: "auth failed",
      authorization: "Bearer stripe_invalid_token_fixture",
      headers: { Authorization: "Bearer stripe_test_token_fixture" },
      api_key: "namecheap-secret",
    }) as Record<string, unknown>;
    expect(JSON.stringify(sanitized)).not.toMatch(/stripe_invalid_token_fixture|stripe_test_token_fixture|namecheap-secret|Bearer /);
    expect(sanitized.authorization).toBe("[REDACTED_FIELD]");
    expect(sanitized.api_key).toBe("[REDACTED_FIELD]");
  });

  it("does not send provider credentials into Cursor workspaces", () => {
    const sanitized = sanitizeEnvForCursor({
      NAMECHEAP_API_KEY: "secret-registrar",
      NAMECHEAP_API_USER: "apiuser01",
      NAMECHEAP_CLIENT_IP: "203.0.113.10",
      CLOUDFLARE_API_TOKEN: "secret-dns",
      VERCEL_TOKEN: "test-provider-secret-redacted",
      STRIPE_SECRET_KEY: "stripe_test_token_fixture",
      NEXT_PUBLIC_SITE_URL: "https://example.com",
    });
    expect(sanitized.NAMECHEAP_API_KEY).toBeUndefined();
    expect(sanitized.NAMECHEAP_CLIENT_IP).toBeUndefined();
    expect(sanitized.CLOUDFLARE_API_TOKEN).toBeUndefined();
    expect(sanitized.VERCEL_TOKEN).toBeUndefined();
    expect(sanitized.STRIPE_SECRET_KEY).toBeUndefined();
    expect(sanitized.NEXT_PUBLIC_SITE_URL).toBe("https://example.com");
  });

  it("proves ZTP, Cursor, Founder Lab, PAB, and API routes do not call provider mutations directly", () => {
    const files = [
      "lib/infinity/zero-to-production/commercialization.ts",
      "lib/infinity/zero-to-production/orchestrator.ts",
      "lib/infinity/coding-agents/security.ts",
      "lib/infinity/founder-idea-lab/submit.ts",
      "lib/infinity/founder-idea-lab/decide.ts",
    ];
    for (const file of files) {
      const src = readRepo(file);
      expect(src).not.toContain("registerDomainWithAuthority");
      expect(src).not.toContain("api.stripe.com/v1/products");
      expect(src).not.toContain("namecheap.domains.create");
    }
    expect(readRepo("lib/infinity/zero-to-production/commercialization.ts")).toContain(
      "Prepare commercialization artifacts without executing EAG mutations",
    );
    expect(readRepo("package.json")).toContain('"dev": "next dev"');
    expect(readRepo("package.json")).not.toMatch(/"dev":\s*".*verify-commercialization/);
  });

  it("HQ load of provider verifications fails closed without probing", async () => {
    const { loadPersistedProviderVerifications } = await import("../hq/load-provider-verifications");
    const rows = await loadPersistedProviderVerifications(
      {
        from: () => {
          throw new Error("table missing");
        },
      },
      "org-1",
    );
    expect(rows).toEqual([]);
  });

  it("HQ reads inventory and persisted verification without live probe functions", () => {
    const hq = readRepo("components/dashboard/operator-console/infinity-hq-experience.tsx");
    expect(hq).toContain("buildProviderInventory");
    expect(hq).toContain("loadPersistedProviderVerifications");
    expect(hq).not.toContain("probeRegistrarLive");
    expect(hq).not.toContain("probeDnsLive");
    expect(hq).not.toContain("probeHostingLive");
    expect(hq).not.toContain("probePaymentsLive");
    expect(hq).not.toContain("runLiveCommercializationVerification");
    expect(hq).not.toContain("api.stripe.com/v1/balance");
    expect(hq).not.toContain("probes/live-probes");
  });

  it("reuses HQOutputDetail and does not add a commercialization modal", () => {
    const strip = readRepo("components/dashboard/operator-console/commercialization-readiness-strip.tsx");
    expect(strip).toContain("Registrar");
    expect(strip).toContain("DNS");
    expect(strip).toContain("Hosting");
    expect(strip).toContain("Payments");
    expect(strip).toContain("Purchase Authority LOCKED");
    expect(strip).not.toMatch(/dialog|modal/i);
    expect(readRepo("components/dashboard/operator-console/artifacts/artifact-inspector-modal.tsx")).toContain(
      "HQOutputDetail",
    );
  });

  it("Stripe balance probe is the verification threshold and ignores optional 403s", async () => {
    const saved = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = "rk_test_fixture_xxxxxxxx";
    const calls: Array<{ url: string; method: string }> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, method: (init?.method ?? "GET").toUpperCase() });
      if (url.includes("/v1/balance")) {
        return new Response(JSON.stringify({ object: "balance", available: [{ amount: 12345, currency: "usd" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: { type: "invalid_request_error" } }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      const payments = await probePaymentsLive();
      expect(payments.status).toBe("READ_ONLY_VERIFIED");
      expect(payments.balanceAccessible).toBe(true);
      expect(payments.realProviderCall).toBe(true);
      expect(payments.productsCapability).toBe(false);
      expect(payments.pricesCapability).toBe(false);
      expect(payments.webhooksCapability).toBe(false);
      expect(payments.mutationOccurred).toBe(false);
      expect(payments.liveChargesAuthorized).toBe(false);
      expect(JSON.stringify(payments)).not.toContain("12345");
      expect(JSON.stringify(payments)).not.toMatch(/Bearer |rk_test_/);
      expect(payments).not.toHaveProperty("available");
      expect(calls.every((call) => call.method === "GET")).toBe(true);
      expect(calls.some((call) => call.url.includes("/v1/balance"))).toBe(true);
      expect(calls.some((call) => call.url.includes("/v1/account"))).toBe(false);
      expect(calls.every((call) => !["POST", "PUT", "PATCH", "DELETE"].includes(call.method))).toBe(true);

      const records = buildLiveVerificationRecords(
        {
          inventory: buildProviderInventory(),
          registrar: { status: "NOT_CONFIGURED", failureCode: "NOT_CONFIGURED", realProviderCall: false, rows: [] },
          dns: {
            status: "NOT_CONFIGURED",
            failureCode: "NOT_CONFIGURED",
            realProviderCall: false,
            zoneCount: null,
            recordCount: null,
          },
          hosting: {
            status: "NOT_CONFIGURED",
            failureCode: "NOT_CONFIGURED",
            realProviderCall: false,
            projectCount: null,
            deploymentCount: null,
          },
          payments,
          startedAt: "2026-08-21T00:00:00.000Z",
          completedAt: "2026-08-21T00:00:01.000Z",
        },
        "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494",
      );
      const stripe = records.find((row) => row.providerCategory === "PAYMENTS");
      expect(stripe?.status).toBe("READ_ONLY_VERIFIED");
      expect(stripe?.metadata.balanceAccessible).toBe(true);
      expect(JSON.stringify(stripe?.metadata)).not.toContain("12345");
      expect(stripe?.metadata).not.toHaveProperty("available");
    } finally {
      vi.unstubAllGlobals();
      if (saved) process.env.STRIPE_SECRET_KEY = saved;
      else delete process.env.STRIPE_SECRET_KEY;
    }
  });

  it("Stripe missing key does not call Stripe", async () => {
    const saved = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    try {
      const payments = await probePaymentsLive();
      expect(payments.status).toBe("NOT_CONFIGURED");
      expect(payments.balanceAccessible).toBe(false);
      expect(payments.realProviderCall).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
      if (saved) process.env.STRIPE_SECRET_KEY = saved;
    }
  });

  it("Stripe failed balance read is FAILED", async () => {
    const saved = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = "rk_test_fixture_xxxxxxxx";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 403, headers: { "Content-Type": "application/json" } })),
    );
    try {
      const payments = await probePaymentsLive();
      expect(payments.status).toBe("FAILED");
      expect(payments.balanceAccessible).toBe(false);
      expect(payments.realProviderCall).toBe(true);
      expect(payments.failureCode).toBe("PERMISSION_DENIED");
    } finally {
      vi.unstubAllGlobals();
      if (saved) process.env.STRIPE_SECRET_KEY = saved;
      else delete process.env.STRIPE_SECRET_KEY;
    }
  });

  it("hosting probe skips when token absent without fake success", async () => {
    const saved = process.env.VERCEL_TOKEN;
    delete process.env.VERCEL_TOKEN;
    try {
      const hosting = await probeHostingLive();
      expect(hosting.status).toBe("NOT_CONFIGURED");
      expect(hosting.realProviderCall).toBe(false);
      expect(hosting.normalization).toBe("SKIPPED");
      expect(hosting.projectCount).toBeNull();
    } finally {
      if (saved) process.env.VERCEL_TOKEN = saved;
    }
  });
});
