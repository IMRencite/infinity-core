import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetInboundCommunicationRuntime } from "@/lib/infinity/inbound-communication-runtime/persist";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { instrumentedRuntimeRegistry, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { setExperimentRuntimeState } from "@/lib/infinity/market-validation-experiment/runtime-state";
import { SEO_GEO_REDIRECTS } from "@/lib/infinity/venture-website-architecture/digital-real-estate-catalog";
import {
  CRE_OCCUPANCYNPV_VERCEL_DEPLOYMENT_BINDING_REPAIR_V1,
  CRE_OCCUPANCYNPV_VERCEL_DEPLOYMENT_BINDING_REPAIR_V1_RUNTIME,
  OCCUPANCYNPV_DOMAIN,
  backfillCreVentureOperationalRecord,
  executeCreOccupancynpvVercelDeploymentBindingRepairV1Mission,
  resetVentureOperatingScaleStore,
  writeVentureOperationalRecord,
} from "..";

const PROJECT_ID = "prj_vSCXLOYDoExYUAR8ypnYz2W1Lu7d";
const PROJECT_NAME = "infinity-validation-cre-lease-npv-e72beb7b";
const ACCEPTED = "dpl_4gmigcyVLKS1X6HxZDCupdd3Ti7H";
const STALE_PROD = "dpl_4yVgtVZ1LU8HqrgJa4oyMCasVWK7";
const PREVIEW = "infinity-validation-cre-lease-npv-e72beb7b-br9xupk59.vercel.app";
const HOME = `<html data-dpl-id="${ACCEPTED}"><footer>
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

function repairFetch(input: { historical?: boolean; reboundOk?: boolean; leak?: boolean } = {}): typeof fetch {
  const historical = input.historical ?? true;
  let rebound = false;
  const fetchImpl: typeof fetch = async (url, init) => {
    const path = String(url);
    const method = init?.method ?? "GET";
    if (path.includes(`/v13/deployments/${ACCEPTED}`)) {
      return historical
        ? new Response(
            JSON.stringify({
              id: ACCEPTED,
              projectId: PROJECT_ID,
              name: PROJECT_NAME,
              url: PREVIEW,
              readyState: "READY",
              alias: [PREVIEW],
            }),
            { status: 200 },
          )
        : new Response(JSON.stringify({ error: { code: "not_found", message: "Deployment not found." } }), { status: 404 });
    }
    if (path.includes("/v9/projects/infinity-validation-cre-lease-npv") && !path.includes(PROJECT_ID) && !path.includes("/domains")) {
      return new Response(JSON.stringify({ error: { code: "not_found", message: "Project not found." } }), { status: 404 });
    }
    if (path.includes(`/v9/projects/${PROJECT_ID}`) && path.includes("/domains/")) {
      return new Response(
        JSON.stringify({
          name: path.includes("www.") ? "www.occupancynpv.com" : OCCUPANCYNPV_DOMAIN,
          verified: true,
          redirect: path.includes("www.") ? OCCUPANCYNPV_DOMAIN : null,
        }),
        { status: 200 },
      );
    }
    if (path.includes(`/v9/projects/${PROJECT_ID}`) && !path.includes("/domains")) {
      return new Response(
        JSON.stringify({
          id: PROJECT_ID,
          name: PROJECT_NAME,
          targets: { production: { id: STALE_PROD, readyState: "ERROR", url: "stale.vercel.app", alias: [] } },
        }),
        { status: 200 },
      );
    }
    if (path.includes("/v6/deployments")) {
      return new Response(
        JSON.stringify({
          deployments: historical
            ? [{ uid: ACCEPTED, url: PREVIEW, readyState: "READY", target: "staging", aliases: [PREVIEW] }]
            : [],
        }),
        { status: 200 },
      );
    }
    if (path.includes("/v2/aliases/occupancynpv.com") && method === "GET") {
      return new Response(null, { status: 204 });
    }
    if (path.includes(`/v2/deployments/${ACCEPTED}/aliases`) && method === "POST") {
      rebound = true;
      return new Response(JSON.stringify({ alias: OCCUPANCYNPV_DOMAIN }), { status: 200 });
    }
    if (path.includes("/promote/")) {
      return new Response(JSON.stringify({}), { status: 200 });
    }
    if (path.includes(PREVIEW)) {
      return historical ? new Response(HOME, { status: 200 }) : new Response("missing", { status: 404 });
    }
    if (path.startsWith("https://www.occupancynpv.com")) {
      return rebound && input.reboundOk !== false
        ? new Response(null, { status: 308, headers: { location: "https://occupancynpv.com/" } })
        : new Response("The deployment could not be found on Vercel.\n\nDEPLOYMENT_NOT_FOUND", { status: 404 });
    }
    if (path.includes("occupancynpv.com")) {
      if (!rebound || input.reboundOk === false) {
        return new Response("The deployment could not be found on Vercel.\n\nDEPLOYMENT_NOT_FOUND", { status: 404 });
      }
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
    return new Response(JSON.stringify({ error: { message: "unmocked" } }), { status: 404 });
  };
  return fetchImpl;
}

describe("CRE_OCCUPANCYNPV_VERCEL_DEPLOYMENT_BINDING_REPAIR_V1", () => {
  beforeEach(() => {
    resetVentureOperatingScaleStore();
    resetMissionActivityStore();
    resetInboundCommunicationRuntime();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
    delete process.env.INFINITY_LOAD_LOCAL_ENV;
    process.env.VERCEL_TOKEN = "vercel_fixture_token_not_real";
    process.env.VERCEL_TEAM_ID = "team_fixture";
  });

  afterEach(() => {
    resetVentureOperatingScaleStore();
    resetInboundCommunicationRuntime();
    delete process.env.VERCEL_TOKEN;
    delete process.env.VERCEL_TEAM_ID;
  });

  it("registers the HQ wrapper", () => {
    const registry = instrumentedRuntimeRegistry();
    expect(registry.runtimes.CreOccupancynpvVercelDeploymentBindingRepairV1Runtime.usesMissionWrapper).toBe(true);
    expect(registry.contracts[CRE_OCCUPANCYNPV_VERCEL_DEPLOYMENT_BINDING_REPAIR_V1_RUNTIME].missionType).toBe(
      CRE_OCCUPANCYNPV_VERCEL_DEPLOYMENT_BINDING_REPAIR_V1,
    );
  });

  it("rebinds the stale production alias to the accepted READY deployment", async () => {
    seedBoundRecord();
    const result = await executeCreOccupancynpvVercelDeploymentBindingRepairV1Mission({
      reloadEnv: false,
      fetchImpl: repairFetch(),
    });
    expect(result.rootCause.cause).toBe("STALE_DEPLOYMENT_ALIAS");
    expect(result.historical.exists).toBe("YES");
    expect(result.historical.state).toBe("READY");
    expect(result.repair.attempted).toBe("YES");
    expect(result.repair.domainRebound).toBe("YES");
    expect(result.repair.deployment).toBe(ACCEPTED);
    expect(result.repair.cloudflareDnsChanged).toBe("NO");
    expect(result.https.apex).toBe("PASS");
    expect(result.https.httpStatus).toBe(200);
    expect(result.https.wwwRedirect).toBe("PASS");
    expect(result.https.vercel404).toBe("NO");
    expect(result.routes.notFound).toBe(0);
    expect(result.routes.runtimeFailures).toBe(0);
    expect(result.routes.unexpectedRedirects).toBe(0);
    expect(result.routes.missingRoutes).toBe(0);
    expect(result.artifact.contentChanged).toBe("NO");
    expect(result.artifact.regenerated).toBe("NO");
    expect(result.actions.dnsWrites).toBe(0);
    expect(result.actions.deployments).toBe(0);
    expect(result.actions.publiclyLaunched).toBe("NO");
    expect(result.nextState).toBe("CRE_VERCEL_BINDING_REPAIRED");
  });

  it("stops without regenerating when no equivalent deployment exists", async () => {
    seedBoundRecord();
    const result = await executeCreOccupancynpvVercelDeploymentBindingRepairV1Mission({
      reloadEnv: false,
      persistRecord: false,
      fetchImpl: repairFetch({ historical: false }),
    });
    expect(result.nextState).toBe("ACCEPTED_ARTIFACT_REDEPLOYMENT_REQUIRED");
    expect(result.historical.exists).toBe("NO");
    expect(result.repair.attempted).toBe("NO");
    expect(result.artifact.regenerated).toBe("NO");
    expect(result.actions.dnsWrites).toBe(0);
    expect(result.equivalent.exactRedeploySupported).toBe("NO");
  });

  it("stops for host leakage without changing the artifact", async () => {
    seedBoundRecord();
    const result = await executeCreOccupancynpvVercelDeploymentBindingRepairV1Mission({
      reloadEnv: false,
      persistRecord: false,
      fetchImpl: repairFetch({ leak: true }),
    });
    expect(result.nextState).toBe("CRE_PRODUCTION_HOST_ARTIFACT_UPDATE_REQUIRED");
    expect(result.productionHost.leakage).toBe("YES");
    expect(result.artifact.regenerated).toBe("NO");
    expect(result.actions.dnsWrites).toBe(0);
  });
});
