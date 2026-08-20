import { describe, expect, it } from "vitest";
import { loadNamecheapConfig, NAMECHEAP_SANDBOX_BASE_URL } from "../providers/namecheap/config";
import { NamecheapReadAdapter } from "../providers/namecheap/read-adapter";
import {
  earliestExpiration,
  nextNamecheapPage,
  parseNamecheapDomainInfo,
  parseNamecheapDomainList,
} from "../providers/namecheap/normalize";
import { loadCloudflareConfig } from "../providers/cloudflare/config";
import { CloudflareReadAdapter } from "../providers/cloudflare/read-adapter";
import { nextCloudflarePage, normalizeCloudflareRecord, normalizeCloudflareZone, redactRecordContent } from "../providers/cloudflare/normalize";
import { buildProviderInventory } from "../probes/inventory";
import { persistLiveVerification } from "../probes/persist";
import { CommercializationStore } from "../store";
import { buildProviderReadinessArtifacts } from "../hq/build-provider-readiness-artifacts";
import { loadPersistedProviderVerifications } from "../hq/load-provider-verifications";
import { buildArtifactInspectorModel } from "@/lib/infinity/operator-console/artifacts/build-inspector-model";
import { buildEntityDetail } from "@/lib/infinity/operator-console/details/build-entity-detail";
import { sanitizeEnvForCursor } from "@/lib/infinity/coding-agents/security";
import { evaluateLaunchReadiness } from "@/lib/infinity/zero-to-production/readiness";
import type { ZeroToProductionRun } from "@/lib/infinity/zero-to-production/types";
import { READ_ONLY_MUTATION_BLOCKED } from "../probes/mode";

const NAMECHEAP_LIST_XML = `
<ApiResponse Status="OK">
  <CommandResponse Type="namecheap.domains.getList">
    <DomainGetListResult>
      <Domain ID="101" Name="alpha.example" Status="Ok" Expires="01/15/2027" AutoRenew="true" IsLocked="true" IsExpired="false"/>
      <Domain ID="102" Name="beta.example" Status="Ok" Expires="03/01/2026" AutoRenew="false" IsLocked="false" IsExpired="false"/>
    </DomainGetListResult>
    <Paging><TotalItems>2</TotalItems><CurrentPage>1</CurrentPage><PageSize>20</PageSize></Paging>
  </CommandResponse>
</ApiResponse>`;

const NAMECHEAP_INFO_XML = `
<ApiResponse Status="OK">
  <DomainGetInfoResult Status="Ok" ID="101" DomainName="alpha.example" IsLocked="true">
    <DomainDetails><ExpiredDate>01/15/2027</ExpiredDate></DomainDetails>
    <DnsDetails>
      <Nameserver>ns1.cloudflare.com</Nameserver>
      <Nameserver>ns2.cloudflare.com</Nameserver>
    </DnsDetails>
  </DomainGetInfoResult>
</ApiResponse>`;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function xmlResponse(xml: string, status = 200): Response {
  return new Response(xml, { status, headers: { "content-type": "application/xml" } });
}

describe("Registrar + DNS read-only adapters", () => {
  it("treats Namecheap as NOT_CONFIGURED when disabled by default", () => {
    const config = loadNamecheapConfig({
      NAMECHEAP_API_USER: "apiuser01",
      NAMECHEAP_API_KEY: "namecheap-test-key-fixture",
      NAMECHEAP_CLIENT_IP: "203.0.113.10",
    });
    expect(config.public.enabled).toBe(false);
    expect(config.public.mode).toBe("DISABLED");
    expect(config.credentials).toBeNull();
    expect(config.public.clientIpWhitelistRequired).toBe(true);
  });

  it("uses sandbox URL when Namecheap is enabled without production env", () => {
    const config = loadNamecheapConfig({
      NAMECHEAP_ENABLED: "true",
      NAMECHEAP_ENV: "sandbox",
      NAMECHEAP_API_USER: "apiuser01",
      NAMECHEAP_API_KEY: "namecheap-test-key-fixture",
      NAMECHEAP_CLIENT_IP: "203.0.113.10",
    });
    expect(config.public.mode).toBe("SANDBOX");
    expect(config.public.baseUrl).toBe(NAMECHEAP_SANDBOX_BASE_URL);
    expect(config.credentials).not.toBeNull();
  });

  it("treats Cloudflare as NOT_CONFIGURED when disabled", () => {
    const config = loadCloudflareConfig({ CLOUDFLARE_API_TOKEN: "cloudflare-test-token-fixture" });
    expect(config.public.enabled).toBe(false);
    expect(config.credentials).toBeNull();
  });

  it("redacts Namecheap and Cloudflare credentials from Cursor env", () => {
    const sanitized = sanitizeEnvForCursor({
      NAMECHEAP_API_KEY: "namecheap-test-key-fixture",
      NAMECHEAP_API_USER: "apiuser01",
      NAMECHEAP_CLIENT_IP: "203.0.113.10",
      CLOUDFLARE_API_TOKEN: "cloudflare-test-token-fixture",
      NEXT_PUBLIC_SITE_URL: "https://example.com",
    });
    expect(sanitized.NAMECHEAP_API_KEY).toBeUndefined();
    expect(sanitized.NAMECHEAP_CLIENT_IP).toBeUndefined();
    expect(sanitized.CLOUDFLARE_API_TOKEN).toBeUndefined();
    expect(sanitized.NEXT_PUBLIC_SITE_URL).toBe("https://example.com");
  });

  it("does not serialize Namecheap credentials", () => {
    const config = loadNamecheapConfig({
      NAMECHEAP_ENABLED: "true",
      NAMECHEAP_API_USER: "apiuser01",
      NAMECHEAP_API_KEY: "namecheap-test-key-fixture",
      NAMECHEAP_CLIENT_IP: "203.0.113.10",
    });
    expect(JSON.stringify(config.credentials)).not.toContain("namecheap-test-key-fixture");
    expect(JSON.stringify(config.public)).not.toContain("namecheap-test-key-fixture");
  });

  it("normalizes Namecheap domain list without inventing nameservers", () => {
    const rows = parseNamecheapDomainList(NAMECHEAP_LIST_XML, "2026-08-20T00:00:00.000Z");
    expect(rows).toHaveLength(2);
    expect(rows[0]?.domain).toBe("alpha.example");
    expect(rows[0]?.providerDomainId).toBe("101");
    expect(rows[0]?.nameservers).toBeNull();
    expect(rows[0]?.provider).toBe("namecheap.com_v1");
    expect(earliestExpiration(rows)).toBe(new Date(Date.UTC(2026, 2, 1)).toISOString());
  });

  it("normalizes Namecheap domain detail nameservers and expiration", () => {
    const detail = parseNamecheapDomainInfo(NAMECHEAP_INFO_XML, "alpha.example", "2026-08-20T00:00:00.000Z");
    expect(detail?.nameservers).toEqual(["ns1.cloudflare.com", "ns2.cloudflare.com"]);
    expect(detail?.expirationDate).toBe(new Date(Date.UTC(2027, 0, 15)).toISOString());
    expect(detail?.registrarLock).toBe(true);
  });

  it("normalizes Cloudflare zones and records and redacts secret TXT content", () => {
    const zone = normalizeCloudflareZone(
      { id: "zone-1", name: "example.com", status: "active", account: { id: "acct-1" } },
      "2026-08-20T00:00:00.000Z",
    );
    expect(zone?.zoneId).toBe("zone-1");
    expect(zone?.accountId).toBe("acct-1");
    const safe = normalizeCloudflareRecord(
      { id: "rec-1", type: "A", name: "example.com", content: "192.0.2.1", proxied: true, ttl: 300 },
      "zone-1",
      "2026-08-20T00:00:00.000Z",
    );
    expect(safe?.content).toBe("192.0.2.1");
    expect(redactRecordContent("Bearer stripe_invalid_token_fixture")).toBeNull();
  });

  it("caps pagination", () => {
    expect(nextNamecheapPage(5, 1000, 20, 5)).toBeNull();
    expect(nextNamecheapPage(1, 40, 20, 5)).toBe(2);
    expect(nextCloudflarePage(5, 9, 5)).toBeNull();
    expect(nextCloudflarePage(1, 3, 5)).toBe(2);
  });

  it("skips live Namecheap/Cloudflare probes when not configured", async () => {
    const registrar = await new NamecheapReadAdapter({ env: {} }).verifyReadOnly();
    const dns = await new CloudflareReadAdapter({ env: {} }).verifyReadOnly();
    expect(registrar.status).toBe("NOT_CONFIGURED");
    expect(registrar.realProviderCall).toBe(false);
    expect(dns.status).toBe("NOT_CONFIGURED");
    expect(dns.realProviderCall).toBe(false);
    expect(buildProviderInventory().registrar.configured).toBe("NOT_CONFIGURED");
  });

  it("verifies Namecheap read-only list+detail and blocks write commands before HTTP", async () => {
    let writes = 0;
    const fetchImpl = (async (url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method && init.method !== "GET") {
        writes += 1;
        throw new Error(`UNEXPECTED_WRITE:${init.method}`);
      }
      const href = String(url);
      expect(href).toContain("api.sandbox.namecheap.com");
      expect(href).not.toMatch(/domains\.(create|renew|transfer)/i);
      if (href.includes("namecheap.domains.getInfo")) return xmlResponse(NAMECHEAP_INFO_XML);
      return xmlResponse(NAMECHEAP_LIST_XML);
    }) as typeof fetch;
    const adapter = new NamecheapReadAdapter({
      env: {
        NAMECHEAP_ENABLED: "true",
        NAMECHEAP_ENV: "sandbox",
        NAMECHEAP_API_USER: "apiuser01",
        NAMECHEAP_API_KEY: "namecheap-test-key-fixture",
        NAMECHEAP_CLIENT_IP: "203.0.113.10",
      },
      fetchImpl,
    });
    const report = await adapter.verifyReadOnly();
    expect(report.status).toBe("READ_ONLY_VERIFIED");
    expect(report.authRead).toBe(true);
    expect(report.domainListRead).toBe(true);
    expect(report.domainDetailRead).toBe(true);
    expect(report.writeHttpCalls).toBe(0);
    expect(writes).toBe(0);
    expect(report.domains[0]?.nameservers).toEqual(["ns1.cloudflare.com", "ns2.cloudflare.com"]);
    await expect(async () => adapter.denyWrite("namecheap.domains.create")).rejects.toMatchObject({
      code: READ_ONLY_MUTATION_BLOCKED,
    });
    expect(adapter.writeHttpCalls).toBe(0);
  });

  it("maps Namecheap auth, rate-limit, timeout, and whitelist failures", async () => {
    const env = {
      NAMECHEAP_ENABLED: "true",
      NAMECHEAP_API_USER: "apiuser01",
      NAMECHEAP_API_KEY: "namecheap-test-key-fixture",
      NAMECHEAP_CLIENT_IP: "203.0.113.10",
    };
    const auth = await new NamecheapReadAdapter({
      env,
      fetchImpl: (async () => xmlResponse(`<ApiResponse Status="ERROR"><Errors><Error Number="1011102">API Key is invalid</Error></Errors></ApiResponse>`)) as typeof fetch,
    }).verifyReadOnly();
    expect(auth.failureCode).toBe("AUTH_FAILED");
    expect(auth.status).not.toBe("READ_ONLY_VERIFIED");

    const limited = await new NamecheapReadAdapter({
      env,
      fetchImpl: (async () => xmlResponse("rate limited", 429)) as typeof fetch,
    }).verifyReadOnly();
    expect(limited.failureCode).toBe("RATE_LIMITED");

    const timeout = await new NamecheapReadAdapter({
      env,
      fetchImpl: (async (_url, init) => {
        const error = new Error("aborted");
        error.name = "AbortError";
        void init;
        throw error;
      }) as typeof fetch,
    }).verifyReadOnly();
    expect(timeout.failureCode).toBe("NETWORK_ERROR");

    const whitelist = await new NamecheapReadAdapter({
      env,
      fetchImpl: (async () =>
        xmlResponse(`<ApiResponse Status="ERROR"><Errors><Error Number="1011150">IP is not whitelisted</Error></Errors></ApiResponse>`)) as typeof fetch,
    }).verifyReadOnly();
    expect(whitelist.failureReason).toBe("NAMECHEAP_CLIENT_IP_WHITELIST_REQUIRED");
    expect(whitelist.clientIpWhitelistRequired).toBe(true);
  });

  it("verifies Cloudflare read-only zone and record inventory without writes", async () => {
    let writes = 0;
    const fetchImpl = (async (url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method && init.method !== "GET") {
        writes += 1;
        throw new Error(`UNEXPECTED_WRITE:${init.method}`);
      }
      const href = String(url);
      if (href.endsWith("/user/tokens/verify")) return jsonResponse({ success: true, result: { status: "active" } });
      if (href.includes("/zones?") && href.includes("page=1")) {
        return jsonResponse({
          success: true,
          result: [{ id: "zone-1", name: "example.com", status: "active", account: { id: "acct-1" } }],
          result_info: { page: 1, total_pages: 1, total_count: 1 },
        });
      }
      if (href.endsWith("/zones/zone-1")) {
        return jsonResponse({ success: true, result: { id: "zone-1", name: "example.com", status: "active" } });
      }
      if (href.includes("/dns_records?") ) {
        return jsonResponse({
          success: true,
          result: [{ id: "rec-1", type: "A", name: "example.com", content: "192.0.2.1", proxied: false, ttl: 300 }],
          result_info: { page: 1, total_pages: 1, total_count: 1 },
        });
      }
      if (href.endsWith("/dns_records/rec-1")) {
        return jsonResponse({ success: true, result: { id: "rec-1", type: "A", name: "example.com", content: "192.0.2.1" } });
      }
      return jsonResponse({ success: false }, 404);
    }) as typeof fetch;
    const adapter = new CloudflareReadAdapter({
      env: { CLOUDFLARE_ENABLED: "true", CLOUDFLARE_API_TOKEN: "cloudflare-test-token-fixture" },
      fetchImpl,
    });
    const report = await adapter.verifyReadOnly();
    expect(report.status).toBe("READ_ONLY_VERIFIED");
    expect(report.authRead).toBe(true);
    expect(report.zoneListRead).toBe(true);
    expect(report.dnsRecordRead).toBe(true);
    expect(report.zoneCount).toBe(1);
    expect(report.recordCount).toBe(1);
    expect(report.writeHttpCalls).toBe(0);
    expect(writes).toBe(0);
    expect(report.tokenScope).toBe("UNKNOWN");
    await expect(async () => adapter.denyWrite("dns_record.create")).rejects.toMatchObject({ code: READ_ONLY_MUTATION_BLOCKED });
  });

  it("maps Cloudflare auth failure and does not mark verified", async () => {
    const report = await new CloudflareReadAdapter({
      env: { CLOUDFLARE_ENABLED: "true", CLOUDFLARE_API_TOKEN: "cloudflare-test-token-fixture" },
      fetchImpl: (async () => jsonResponse({ success: false }, 401)) as typeof fetch,
    }).verifyReadOnly();
    expect(report.failureCode).toBe("AUTH_FAILED");
    expect(report.status).not.toBe("READ_ONLY_VERIFIED");
    expect(report.realProviderCall).toBe(true);
  });

  it("persists org-scoped verification metadata without secrets and surfaces HQ inventory", () => {
    const store = new CommercializationStore();
    const inventory = buildProviderInventory();
    const records = persistLiveVerification(
      store,
      {
        inventory,
        registrar: {
          status: "READ_ONLY_VERIFIED",
          failureCode: null,
          realProviderCall: true,
          rows: [],
          domainCount: 2,
          nextExpiration: "2026-03-01T00:00:00.000Z",
          authRead: true,
          domainListRead: true,
          domainDetailRead: true,
          clientIpWhitelistRequired: true,
          writeHttpCalls: 0,
        },
        dns: {
          status: "READ_ONLY_VERIFIED",
          failureCode: null,
          realProviderCall: true,
          zoneCount: 1,
          recordCount: 4,
          authRead: true,
          zoneListRead: true,
          dnsRecordRead: true,
          tokenScope: "UNKNOWN",
          writeHttpCalls: 0,
        },
        hosting: { status: "NOT_CONFIGURED", failureCode: "NOT_CONFIGURED", realProviderCall: false, projectCount: null, deploymentCount: null },
        payments: { status: "NOT_CONFIGURED", failureCode: "NOT_CONFIGURED", realProviderCall: false, productCount: null, priceCount: null },
        startedAt: "2026-08-20T00:00:00.000Z",
        completedAt: "2026-08-20T00:00:01.000Z",
      },
      "org-a",
    );
    expect(records.every((item) => item.organizationId === "org-a")).toBe(true);
    expect(JSON.stringify(records)).not.toContain("cloudflare-test-token-fixture");
    expect(JSON.stringify(records)).not.toContain("namecheap-test-key-fixture");
    const artifacts = buildProviderReadinessArtifacts(inventory, records);
    const registrar = artifacts.launch_operations?.find((item) => item.title === "Registrar");
    const dns = artifacts.launch_operations?.find((item) => item.title === "DNS");
    expect(registrar?.metadata.domainCount).toBe(2);
    expect(registrar?.metadata.nextExpiration).toBe("2026-03-01T00:00:00.000Z");
    expect(dns?.metadata.zoneCount).toBe(1);
    expect(dns?.subtitle).toContain("Cloudflare");
    const detail = buildEntityDetail(buildArtifactInspectorModel(registrar!, artifacts.launch_operations ?? []));
    const overviewRows = detail.overview.sections.flatMap((section) => section.rows);
    expect(overviewRows.some((row) => row.label === "Domain count" && row.value === "2")).toBe(true);
    expect(overviewRows.some((row) => row.label === "Next expiration")).toBe(true);
    expect(overviewRows.some((row) => row.label === "Last successful read")).toBe(true);
    const dnsDetail = buildEntityDetail(buildArtifactInspectorModel(dns!, artifacts.launch_operations ?? []));
    const dnsRows = dnsDetail.overview.sections.flatMap((section) => section.rows);
    expect(dnsRows.some((row) => row.label === "Zone count" && row.value === "1")).toBe(true);
    expect(dnsRows.some((row) => row.label === "Record count" && row.value === "4")).toBe(true);
    expect(JSON.stringify(detail)).not.toMatch(/namecheap-test-key-fixture|cloudflare-test-token-fixture/);
  });

  it("HQ load stays org-scoped and fail-closed", async () => {
    const rows = await loadPersistedProviderVerifications(
      {
        from: () => ({
          select: () => ({
            eq: (column: string, value: string) => {
              expect(column).toBe("organization_id");
              expect(value).toBe("org-a");
              return {
                order: async () => ({ data: [], error: null }),
              };
            },
          }),
        }),
      },
      "org-a",
    );
    expect(rows).toEqual([]);
  });

  it("ZTP registrar/DNS readiness never grants public launch", () => {
    const run = {
      businessOutcome: "BUILD_AUTHORIZED",
      ventureBlueprintId: "bp",
      buildGraphId: "bg",
      qaPassed: true,
      productionArtifactId: "pa",
      failureCode: null,
      stale: false,
      performanceHooksDeclared: ["hook"],
      publiclyLaunched: false,
    } as unknown as ZeroToProductionRun;
    const report = evaluateLaunchReadiness({
      run,
      buildPackage: { status: "READY" } as never,
      commercializationPlan: { paymentModel: "once", fulfillmentModel: "digital", hostingRequirements: "vercel" } as never,
      treasuryReady: true,
      domainRequirementReady: true,
      providerVerification: {
        registrar: "READ_ONLY_VERIFIED",
        dns: "READ_ONLY_VERIFIED",
        hosting: "READ_ONLY_VERIFIED",
        payments: "READ_ONLY_VERIFIED",
        freshness: "VERIFIED_FRESH",
      },
    });
    expect(report.providerReadinessVerified).toBe(true);
    expect(report.publiclyLaunched).toBe(false);
  });

  it("inventory write capabilities remain disabled in config surface", () => {
    const inventory = buildProviderInventory();
    expect(inventory.registrar.writeCapabilities).toEqual(expect.arrayContaining(["registerDomain", "renewDomain", "transferDomain"]));
    expect(inventory.dns.writeCapabilities).toEqual(expect.arrayContaining(["createRecord", "updateRecord", "deleteRecord"]));
    expect(inventory.registrar.readOnlyEnforceable).toBe(true);
    expect(inventory.dns.readOnlyEnforceable).toBe(true);
  });
});
