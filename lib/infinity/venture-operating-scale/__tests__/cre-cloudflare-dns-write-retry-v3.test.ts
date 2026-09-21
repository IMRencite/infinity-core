import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetInboundCommunicationRuntime } from "@/lib/infinity/inbound-communication-runtime/persist";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { instrumentedRuntimeRegistry, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { setExperimentRuntimeState } from "@/lib/infinity/market-validation-experiment/runtime-state";
import { SEO_GEO_REDIRECTS } from "@/lib/infinity/venture-website-architecture/digital-real-estate-catalog";
import {
  CRE_CLOUDFLARE_DNS_WRITE_RETRY_AFTER_TOKEN_EXPANSION_V3,
  CRE_CLOUDFLARE_DNS_WRITE_RETRY_AFTER_TOKEN_EXPANSION_V3_RUNTIME,
  OCCUPANCYNPV_DOMAIN,
  backfillCreVentureOperationalRecord,
  executeCreCloudflareDnsWriteRetryAfterTokenExpansionV3Mission,
  resetVentureOperatingScaleStore,
  writeVentureOperationalRecord,
} from "..";

const ACCOUNT = "cfacct00000000000000000000000000";
const ZONE = "cfzone00000000000000000000000000";
const HOME = `<html><footer data-footer-format="Privacy Policy | Terms of Service | Sitemap | An Infinity OS Venture | By IMR">
<a href="/privacy-policy/">Privacy Policy</a>
<a href="/terms-of-service/">Terms of Service</a>
<a href="/sitemap.xml">Sitemap</a>
<a href="https://imros.io">An Infinity OS Venture</a>
<a href="https://infinitemediaresources.com">By IMR</a>
</footer><link rel="canonical" href="/" /></html>`;

function seedOwnedRecord() {
  const existing = backfillCreVentureOperationalRecord();
  return writeVentureOperationalRecord({
    ...existing,
    primary_domain: OCCUPANCYNPV_DOMAIN,
    domain_provider: "cloudflare.registrar_v1",
    domain_registration_state: "ACTIVE",
    dns_state: "UNCONFIGURED",
    ssl_state: "UNCONFIGURED",
    canonical_url: "UNCONFIGURED",
  });
}

function retryFetch(input: { writeForbidden?: boolean } = {}): typeof fetch {
  const records: Array<{ type: string; name: string; content: string; proxied: boolean; id: string }> = [];
  const fetchImpl: typeof fetch = async (url, init) => {
    const path = String(url);
    const method = init?.method ?? "GET";
    if (path.endsWith("/tokens/verify")) {
      return new Response(JSON.stringify({ success: true, result: { status: "active", id: "tok_fixture" } }), { status: 200 });
    }
    if (path.includes("/user/tokens/tok_fixture") || path.includes("/tokens/tok_fixture")) {
      return new Response(
        JSON.stringify({
          success: true,
          result: { id: "tok_fixture", policies: [{ resources: { "com.cloudflare.api.account.zone.*": "*" } }] },
        }),
        { status: 200 },
      );
    }
    if (path.includes(`/registrar/registrations/${OCCUPANCYNPV_DOMAIN}`)) {
      return new Response(
        JSON.stringify({ success: true, result: { domain_name: OCCUPANCYNPV_DOMAIN, status: "active", name_servers: ["a.ns.cloudflare.com", "b.ns.cloudflare.com"] } }),
        { status: 200 },
      );
    }
    if (path.includes("/zones?name=") && method === "GET") {
      return new Response(
        JSON.stringify({
          success: true,
          result: [{ id: ZONE, name: OCCUPANCYNPV_DOMAIN, status: "active", account: { id: ACCOUNT }, name_servers: ["a.ns.cloudflare.com", "b.ns.cloudflare.com"] }],
        }),
        { status: 200 },
      );
    }
    if (path.includes(`/zones/${ZONE}/dns_records`) && method === "GET") {
      return new Response(JSON.stringify({ success: true, result: records }), { status: 200 });
    }
    if (path.includes(`/zones/${ZONE}/dns_records`) && method === "POST") {
      if (input.writeForbidden) return new Response(JSON.stringify({ success: false, errors: [{ message: "forbidden" }] }), { status: 403 });
      const body = JSON.parse(String(init?.body ?? "{}")) as { type: string; name: string; content: string; proxied: boolean };
      records.push({ ...body, id: `rec_${records.length + 1}` });
      return new Response(JSON.stringify({ success: true, result: { id: `rec_${records.length}`, ...body } }), { status: 200 });
    }
    if (path.includes("/v9/projects/infinity-validation-cre-lease-npv") && !path.includes("/domains")) {
      return new Response(JSON.stringify({ id: "prj_fixture", name: "infinity-validation-cre-lease-npv" }), { status: 200 });
    }
    if (path.includes("/v13/deployments/")) {
      return new Response(JSON.stringify({ id: "dpl_4gmigcyVLKS1X6HxZDCupdd3Ti7H", projectId: "prj_fixture", readyState: "READY" }), { status: 200 });
    }
    if (path.includes("/v10/projects/") && path.includes("/domains") && method === "POST") {
      return new Response(JSON.stringify({ name: OCCUPANCYNPV_DOMAIN, verified: true, verification: [] }), { status: 200 });
    }
    if (path.includes("/v6/domains/") && path.includes("/config")) {
      return new Response(JSON.stringify({ recommendedCNAME: [{ rank: 1, value: "cname.vercel-dns.com" }], misconfigured: false }), { status: 200 });
    }
    if (path.includes("/v9/projects/") && path.includes("/domains/")) {
      return new Response(JSON.stringify({ name: OCCUPANCYNPV_DOMAIN, verified: true, redirect: path.includes("www.") ? OCCUPANCYNPV_DOMAIN : null }), { status: 200 });
    }
    if (path.startsWith("http://occupancynpv.com")) {
      return new Response(null, { status: 308, headers: { location: "https://occupancynpv.com/" } });
    }
    if (path.startsWith("https://www.occupancynpv.com")) {
      return new Response(null, { status: 308, headers: { location: "https://occupancynpv.com/" } });
    }
    if (path.includes("occupancynpv.com")) {
      const parsed = new URL(path);
      if (SEO_GEO_REDIRECTS.some((row) => parsed.pathname === row.from || parsed.pathname === `${row.from}/`)) {
        return new Response(null, { status: 308, headers: { location: "https://occupancynpv.com/lease-comparison/" } });
      }
      if (parsed.pathname === "/sitemap.xml") {
        return new Response("<urlset><url><loc>https://occupancynpv.com/</loc></url></urlset>", { status: 200 });
      }
      return new Response(HOME, { status: 200 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  };
  return fetchImpl;
}

describe("CRE_CLOUDFLARE_DNS_WRITE_RETRY_AFTER_TOKEN_EXPANSION_V3", () => {
  beforeEach(() => {
    resetVentureOperatingScaleStore();
    resetMissionActivityStore();
    resetInboundCommunicationRuntime();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
    process.env.CLOUDFLARE_ACCOUNT_ID = ACCOUNT;
    process.env.CLOUDFLARE_ENABLED = "true";
    process.env.CLOUDFLARE_API_TOKEN = "cf_general_fixture_token_not_real";
    process.env.CLOUDFLARE_REGISTRAR_API_TOKEN = "cf_registrar_fixture_token_not_real";
    process.env.VERCEL_TOKEN = "vercel_fixture_token_not_real";
    process.env.VERCEL_TEAM_ID = "team_fixture";
  });

  afterEach(() => {
    resetVentureOperatingScaleStore();
    resetInboundCommunicationRuntime();
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_ENABLED;
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_REGISTRAR_API_TOKEN;
    delete process.env.VERCEL_TOKEN;
    delete process.env.VERCEL_TEAM_ID;
  });

  it("registers the HQ wrapper", () => {
    const registry = instrumentedRuntimeRegistry();
    expect(registry.runtimes.CreCloudflareDnsWriteRetryAfterTokenExpansionV3Runtime.usesMissionWrapper).toBe(true);
    expect(registry.contracts[CRE_CLOUDFLARE_DNS_WRITE_RETRY_AFTER_TOKEN_EXPANSION_V3_RUNTIME].missionType).toBe(
      CRE_CLOUDFLARE_DNS_WRITE_RETRY_AFTER_TOKEN_EXPANSION_V3,
    );
  });

  it("stops when DNS write is still forbidden", async () => {
    seedOwnedRecord();
    const result = await executeCreCloudflareDnsWriteRetryAfterTokenExpansionV3Mission({
      reloadEnv: false,
      fetchImpl: retryFetch({ writeForbidden: true }),
    });
    expect(result.nextState).toBe("CRE_CLOUDFLARE_DNS_WRITE_VERIFICATION_REQUIRED");
    expect(result.tokenCapability.currentZoneWritable).toBe("NO");
    expect(result.record.dns_state).toBe("UNCONFIGURED");
  });

  it("writes apex and www after token expansion and does not rebuild", async () => {
    seedOwnedRecord();
    const result = await executeCreCloudflareDnsWriteRetryAfterTokenExpansionV3Mission({
      reloadEnv: false,
      fetchImpl: retryFetch(),
    });
    expect(result.mission).toBe(CRE_CLOUDFLARE_DNS_WRITE_RETRY_AFTER_TOKEN_EXPANSION_V3);
    expect(result.tokenCapability.dnsWrite).toBe("LIVE_WRITE_VERIFIED");
    expect(result.tokenCapability.currentZoneWritable).toBe("YES");
    expect(result.tokenCapability.futureAccountZonesCovered).toBe("YES");
    expect(result.tokenCapability.futureDomainPurchaseAuthority).toBe("NO");
    expect(result.dnsRecords.length).toBeGreaterThan(0);
    expect(result.artifact.rebuilt).toBe("NO");
    expect(result.record.dns_state).toBe("CONFIGURED");
    expect(result.record.ssl_state).toBe("VERIFIED");
    expect(result.record.public_launch_state).toBe("NO");
    expect(result.nextState).toBe("CRE_PRODUCTION_DOMAIN_TECHNICALLY_READY");
    expect(JSON.stringify(result)).not.toMatch(/cf_general_fixture_token_not_real|Bearer\s+/);
  });
});
