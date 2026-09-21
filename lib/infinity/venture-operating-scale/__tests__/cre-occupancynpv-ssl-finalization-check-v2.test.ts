import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetInboundCommunicationRuntime } from "@/lib/infinity/inbound-communication-runtime/persist";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { instrumentedRuntimeRegistry, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { setExperimentRuntimeState } from "@/lib/infinity/market-validation-experiment/runtime-state";
import { SEO_GEO_REDIRECTS } from "@/lib/infinity/venture-website-architecture/digital-real-estate-catalog";
import {
  CRE_OCCUPANCYNPV_SSL_FINALIZATION_CHECK_V2,
  CRE_OCCUPANCYNPV_SSL_FINALIZATION_CHECK_V2_RUNTIME,
  OCCUPANCYNPV_DOMAIN,
  backfillCreVentureOperationalRecord,
  executeCreOccupancynpvSslFinalizationCheckV2Mission,
  resetVentureOperatingScaleStore,
  writeVentureOperationalRecord,
} from "..";
type SslCheckView = {
  nextState: string;
  nextGovernedAction?: string;
  productionHost: { leakage: string };
  artifact: { rebuilt: string };
  dns: { writes: number; apex?: string; www?: string };
  ssl: { apexHttps: string; wwwToApex: string };
  routes: { notFound: number; runtimeFailures: number };
  record: { sslConfigured: string; publiclyLaunched: string };
  actions: { dnsWrites: number };
};

async function runSslCheck(
  input: Parameters<typeof executeCreOccupancynpvSslFinalizationCheckV2Mission>[0],
): Promise<SslCheckView> {
  return (await executeCreOccupancynpvSslFinalizationCheckV2Mission(input)) as unknown as SslCheckView;
}

const ACCOUNT = "cfacct00000000000000000000000000";
const ZONE = "dbc6bd7446d67b25699aa62c88d9e5a5";
const TARGET = "d98a9119cef50aca.vercel-dns-016.com.";
const HOME = `<html><footer>
<a href="/privacy-policy/">Privacy Policy</a>
<a href="/terms-of-service/">Terms of Service</a>
<a href="/sitemap.xml">Sitemap</a>
<a href="https://imros.io">An Infinity OS Venture</a>
<a href="https://infinitemediaresources.com">By IMR</a>
</footer><link rel="canonical" href="https://occupancynpv.com/" /></html>`;

function seedBoundRecord() {
  const existing = backfillCreVentureOperationalRecord();
  return writeVentureOperationalRecord({
    ...existing,
    primary_domain: OCCUPANCYNPV_DOMAIN,
    domain_provider: "cloudflare.registrar_v1",
    dns_state: "CONFIGURED",
    ssl_state: "UNCONFIGURED",
    canonical_url: "https://occupancynpv.com",
    public_url: "https://occupancynpv.com",
  });
}

function checkFetch(input: { httpsReady?: boolean; leak?: boolean } = {}): typeof fetch {
  const fetchImpl: typeof fetch = async (url) => {
    const path = String(url);
    if (path.includes("/tokens/verify")) {
      return new Response(JSON.stringify({ success: true, result: { status: "active", id: "tok_user" } }), { status: 200 });
    }
    if (path.includes("/zones?name=")) {
      return new Response(
        JSON.stringify({ success: true, result: [{ id: ZONE, name: OCCUPANCYNPV_DOMAIN, status: "active", account: { id: ACCOUNT } }] }),
        { status: 200 },
      );
    }
    if (path.includes("/dns_records") && path.includes("/zones/")) {
      return new Response(
        JSON.stringify({
          success: true,
          result: [
            { id: "1", type: "CNAME", name: "occupancynpv.com", content: TARGET, proxied: false, ttl: 1 },
            { id: "2", type: "CNAME", name: "www.occupancynpv.com", content: TARGET, proxied: false, ttl: 1 },
          ],
        }),
        { status: 200 },
      );
    }
    if (path.includes("/v6/domains/") && path.includes("/config")) {
      return new Response(JSON.stringify({ recommendedCNAME: [{ value: TARGET }], misconfigured: false }), { status: 200 });
    }
    if (path.includes("/v9/projects/") && path.includes("/domains/")) {
      return new Response(
        JSON.stringify({
          name: path.includes("www.") ? "www.occupancynpv.com" : OCCUPANCYNPV_DOMAIN,
          verified: true,
          redirect: path.includes("www.") ? OCCUPANCYNPV_DOMAIN : null,
        }),
        { status: 200 },
      );
    }
    if (path.startsWith("http://occupancynpv.com")) {
      return input.httpsReady
        ? new Response(null, { status: 308, headers: { location: "https://occupancynpv.com/" } })
        : new Response("pending", { status: 525 });
    }
    if (path.startsWith("https://www.occupancynpv.com")) {
      return input.httpsReady
        ? new Response(null, { status: 308, headers: { location: "https://occupancynpv.com/" } })
        : new Response("pending", { status: 525 });
    }
    if (path.includes("occupancynpv.com")) {
      if (!input.httpsReady) return new Response("pending", { status: 525 });
      const parsed = new URL(path);
      if (SEO_GEO_REDIRECTS.some((row) => parsed.pathname === row.from || parsed.pathname === `${row.from}/`)) {
        return new Response(null, { status: 308, headers: { location: "https://occupancynpv.com/lease-comparison/" } });
      }
      if (parsed.pathname === "/sitemap.xml") {
        const loc = input.leak
          ? "https://infinity-validation-cre-lease-npv-e72beb7b-br9xupk59.vercel.app/"
          : "https://occupancynpv.com/";
        return new Response(`<urlset><url><loc>${loc}</loc></url></urlset>`, { status: 200 });
      }
      return new Response(HOME, { status: 200 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  };
  return fetchImpl;
}

describe("CRE_OCCUPANCYNPV_SSL_FINALIZATION_CHECK_V2", () => {
  beforeEach(() => {
    resetVentureOperatingScaleStore();
    resetMissionActivityStore();
    resetInboundCommunicationRuntime();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
    delete process.env.INFINITY_LOAD_LOCAL_ENV;
    process.env.CLOUDFLARE_ACCOUNT_ID = ACCOUNT;
    process.env.CLOUDFLARE_ENABLED = "true";
    process.env.CLOUDFLARE_API_TOKEN = "cfut_fixture_user_token_not_real_000000000000";
    process.env.VERCEL_TOKEN = "vercel_fixture_token_not_real";
    process.env.VERCEL_TEAM_ID = "team_fixture";
  });

  afterEach(() => {
    resetVentureOperatingScaleStore();
    resetInboundCommunicationRuntime();
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_ENABLED;
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.VERCEL_TOKEN;
    delete process.env.VERCEL_TEAM_ID;
  });

  it("registers the HQ wrapper", () => {
    const registry = instrumentedRuntimeRegistry();
    expect(registry.runtimes.CreOccupancynpvSslFinalizationCheckV2Runtime.usesMissionWrapper).toBe(true);
    expect(registry.contracts[CRE_OCCUPANCYNPV_SSL_FINALIZATION_CHECK_V2_RUNTIME].missionType).toBe(
      CRE_OCCUPANCYNPV_SSL_FINALIZATION_CHECK_V2,
    );
  });

  it("returns CRE_SSL_PENDING without writing DNS when HTTPS is not ready", async () => {
    seedBoundRecord();
    const result = await runSslCheck({
      reloadEnv: false,
      persistRecord: false,
      fetchImpl: checkFetch({ httpsReady: false }),
    });
    expect(result.nextState).toBe("CRE_SSL_PENDING");
    expect(result.nextGovernedAction).toBe("WAIT_FOR_PROVIDER_SSL_AND_REVERIFY");
    expect(result.dns.apex).toBe("PASS");
    expect(result.dns.www).toBe("PASS");
    expect(result.dns.writes).toBe(0);
    expect(result.ssl.apexHttps).toBe("PENDING");
    expect(result.actions.dnsWrites).toBe(0);
    expect(result.artifact.rebuilt).toBe("NO");
  });

  it("stops for host leakage without changing the artifact", async () => {
    seedBoundRecord();
    const result = await runSslCheck({
      reloadEnv: false,
      persistRecord: false,
      fetchImpl: checkFetch({ httpsReady: true, leak: true }),
    });
    expect(result.nextState).toBe("CRE_PRODUCTION_HOST_ARTIFACT_UPDATE_REQUIRED");
    expect(result.productionHost.leakage).toBe("YES");
    expect(result.artifact.rebuilt).toBe("NO");
    expect(result.dns.writes).toBe(0);
  });

  it("marks the production domain technically ready when SSL and routes pass", async () => {
    seedBoundRecord();
    const result = await runSslCheck({
      reloadEnv: false,
      fetchImpl: checkFetch({ httpsReady: true }),
    });
    expect(result.nextState).toBe("CRE_PRODUCTION_DOMAIN_TECHNICALLY_READY");
    expect(result.ssl.apexHttps).toBe("PASS");
    expect(result.ssl.wwwToApex).toBe("PASS");
    expect(result.routes.notFound).toBe(0);
    expect(result.routes.runtimeFailures).toBe(0);
    expect(result.record.sslConfigured).toBe("YES");
    expect(result.record.publiclyLaunched).toBe("NO");
    expect(result.dns.writes).toBe(0);
  });
});
