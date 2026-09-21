import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetInboundCommunicationRuntime } from "@/lib/infinity/inbound-communication-runtime/persist";
import {
  CRE_OCCUPANCYNPV_LEGAL_SURFACE_SUCCESSOR_ARTIFACT_ID,
  CRE_OCCUPANCYNPV_LEGAL_SURFACE_SUCCESSOR_SOURCE_DIGEST,
  LOCKED_CRE_EXPERIMENT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";
import { instrumentedRuntimeRegistry, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { setExperimentRuntimeState } from "@/lib/infinity/market-validation-experiment/runtime-state";
import { reconstructOccupancynpvLegalSurfaceSuccessor } from "@/lib/infinity/venture-website-architecture/cre-occupancynpv-legal-surface-successor";
import { SEO_GEO_REDIRECTS } from "@/lib/infinity/venture-website-architecture/digital-real-estate-catalog";
import {
  CRE_OCCUPANCYNPV_LEGAL_CONFIGURATION_V1,
  CRE_OCCUPANCYNPV_LEGAL_CONFIGURATION_V1_RUNTIME,
  CRE_VENTURE_ID,
  FOUNDER_CONFIRMED_OCCUPANCYNPV_LEGAL_FACTS,
  GOVERNED_CANONICAL_STRIPE_PRODUCT_PRICE_AUTHORIZATION,
  OCCUPANCYNPV_DOMAIN,
  backfillCreVentureOperationalRecord,
  evaluateLegalConfigurationGate,
  executeCreOccupancynpvLegalConfigurationV1Mission,
  resetVentureOperatingScaleStore,
  searchCanonicalLegalFacts,
  writeVentureOperationalRecord,
} from "..";

const FACTS = FOUNDER_CONFIRMED_OCCUPANCYNPV_LEGAL_FACTS;
const HOME = `<html><footer>
<a href="/privacy-policy/">Privacy Policy</a>
<a href="/terms-of-service/">Terms of Service</a>
<a href="/sitemap.xml">Sitemap</a>
<a href="https://imros.io">An Infinity OS Venture</a>
<a href="https://infinitemediaresources.com">By IMR</a>
</footer><link rel="canonical" href="https://occupancynpv.com/" /></html>`;
const BROKEN_TERMS = `<html><h1>Terms of Service</h1><p>Those terms are LEGAL_CONFIGURATION_REQUIRED until a later governed commercial offer exists.</p><p>Operator attribution: By IMR.</p></html>`;
const REPAIRED_PRIVACY = `<html><h1>Privacy Policy</h1>
<p>OccupancyNPV is operated by Infinite Media Resources LLC.</p>
<p>1896 Coventry Dr</p><p>Brunswick, OH 44212</p><p>United States</p>
<p>infinitemediaresources@gmail.com</p>
<p>https://occupancynpv.com</p>
</html>`;
const REPAIRED_TERMS = `<html><h1>Terms of Service</h1>
<p>OccupancyNPV is operated by Infinite Media Resources LLC.</p>
<p>1896 Coventry Dr, Brunswick, OH 44212, United States</p>
<p>infinitemediaresources@gmail.com</p>
<p>These terms are governed by the laws of the State of Ohio, United States.</p>
</html>`;

function seedBoundRecord() {
  const existing = backfillCreVentureOperationalRecord();
  return writeVentureOperationalRecord({
    ...existing,
    primary_domain: OCCUPANCYNPV_DOMAIN,
    domain_provider: "cloudflare.registrar_v1",
    dns_state: "CONFIGURED",
    ssl_state: "VERIFIED",
    canonical_url: "https://occupancynpv.com",
    public_url: "https://occupancynpv.com",
    payment_provider: "stripe",
    payment_account_binding: { kind: "PROVIDER_BINDING", key: "acct_18h5CjLdvXKx7R7G", rawSecretStored: false },
  });
}

function legalFetch(): typeof fetch {
  let published = false;
  const fetchImpl: typeof fetch = async (url, init) => {
    const path = String(url);
    const method = init?.method ?? "GET";
    if (path.includes("/v2/files") && method === "POST") return new Response(null, { status: 200 });
    if (path.includes("/v13/deployments") && method === "POST") {
      published = true;
      return new Response(JSON.stringify({ id: "dpl_legal1", url: "legal-successor.vercel.app", readyState: "READY" }), { status: 200 });
    }
    if (path.includes("/v13/deployments/dpl_legal1")) {
      return new Response(JSON.stringify({ id: "dpl_legal1", url: "legal-successor.vercel.app", readyState: "READY" }), { status: 200 });
    }
    if (path.includes("/v2/deployments/dpl_legal1/aliases") && method === "POST") {
      return new Response(JSON.stringify({ alias: "occupancynpv.com" }), { status: 200 });
    }
    if (path.includes("api.stripe.com") && method === "POST") {
      return new Response(JSON.stringify({ error: { message: "stripe write blocked in test" } }), { status: 403 });
    }
    if (path.startsWith("https://www.occupancynpv.com")) {
      return new Response(null, { status: 308, headers: { location: "https://occupancynpv.com/" } });
    }
    if (path.includes("occupancynpv.com")) {
      const parsed = new URL(path);
      if (SEO_GEO_REDIRECTS.some((row) => parsed.pathname === row.from || parsed.pathname === `${row.from}/`)) {
        return new Response(null, { status: 308, headers: { location: "https://occupancynpv.com/lease-comparison/" } });
      }
      if (parsed.pathname.includes("privacy")) {
        return new Response(published ? REPAIRED_PRIVACY : `<html><h1>Privacy Policy</h1><p>By IMR</p></html>`, { status: 200 });
      }
      if (parsed.pathname.includes("terms")) {
        return new Response(published ? REPAIRED_TERMS : BROKEN_TERMS, { status: 200 });
      }
      if (parsed.pathname.includes("sitemap")) return new Response("<urlset></urlset>", { status: 200 });
      return new Response(HOME, { status: 200 });
    }
    return new Response(JSON.stringify({ error: { message: "unmocked" } }), { status: 404 });
  };
  return fetchImpl;
}

describe("CRE_OCCUPANCYNPV_LEGAL_CONFIGURATION_V1", () => {
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
    expect(registry.runtimes.CreOccupancynpvLegalConfigurationV1Runtime.usesMissionWrapper).toBe(true);
    expect(registry.contracts[CRE_OCCUPANCYNPV_LEGAL_CONFIGURATION_V1_RUNTIME].missionType).toBe(
      CRE_OCCUPANCYNPV_LEGAL_CONFIGURATION_V1,
    );
  });

  it("does not treat brand labels as the legal operator", () => {
    const facts = searchCanonicalLegalFacts({
      extraRecords: [{ brand: "By IMR", venture_name: "CRE Lease NPV Validation", legal_entity: "OccupancyNPV" }],
    });
    expect(facts.legalEntity).toBe("UNKNOWN");
    expect(facts.configuration).toBe("FOUNDER_CONFIGURATION_REQUIRED");
    expect(evaluateLegalConfigurationGate().result).toBe("FAIL");
  });

  it("accepts founder-confirmed Ohio facts without inventing extras", () => {
    const record = writeVentureOperationalRecord({
      ...backfillCreVentureOperationalRecord(),
      legal_entity: FACTS.legal_entity,
      company_address: FACTS.company_address,
      jurisdiction: FACTS.jurisdiction,
      support_email: FACTS.support_email,
      privacy_operator: FACTS.privacy_operator,
      terms_operator: FACTS.terms_operator,
    });
    const facts = searchCanonicalLegalFacts({ record });
    const gate = evaluateLegalConfigurationGate({ record });
    expect(facts.legalEntity).toBe("Infinite Media Resources LLC");
    expect(facts.jurisdiction).toBe("Ohio, United States");
    expect(facts.supportEmail).toBe("infinitemediaresources@gmail.com");
    expect(facts.invented).toBe(false);
    expect(gate.result).toBe("PASS");
    expect(gate.fields.legal_entity).toBe("PASS");
    expect(gate.fields.privacy_operator).toBe("PASS");
    expect(gate.fields.terms_operator).toBe("PASS");
  });

  it("composes a legal-only successor from the accepted artifact", () => {
    const successor = reconstructOccupancynpvLegalSurfaceSuccessor();
    const privacy = successor.files.find((file) => file.path === "app/privacy-policy/page.tsx")?.content ?? "";
    const terms = successor.files.find((file) => file.path === "app/terms-of-service/page.tsx")?.content ?? "";
    expect(successor.artifactId).toBe(CRE_OCCUPANCYNPV_LEGAL_SURFACE_SUCCESSOR_ARTIFACT_ID);
    expect(successor.digest).toBe(CRE_OCCUPANCYNPV_LEGAL_SURFACE_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.changedPaths).toEqual(["app/privacy-policy/page.tsx", "app/terms-of-service/page.tsx"]);
    expect(privacy).toContain("Infinite Media Resources LLC");
    expect(privacy).toContain("infinitemediaresources@gmail.com");
    expect(privacy).toContain("1896 Coventry Dr");
    expect(terms).toContain("State of Ohio, United States");
    expect(terms).not.toContain("LEGAL_CONFIGURATION_REQUIRED");
    expect(privacy).not.toContain("LEGAL_CONFIGURATION_REQUIRED");
    expect(terms).not.toMatch(/arbitration|class-action|HIPAA|GDPR|CCPA/i);
  });

  it("persists facts, publishes legal surfaces, and keeps payments blocked", async () => {
    seedBoundRecord();
    const result = await executeCreOccupancynpvLegalConfigurationV1Mission({
      reloadEnv: false,
      pollAttempts: 1,
      pollDelayMs: 0,
      fetchImpl: legalFetch(),
    });
    expect(result.legalConfiguration.canonicalPersistence).toBe("PASS");
    expect(result.legalConfiguration.gate).toBe("PASS");
    expect(result.legalConfiguration.requiredRemoved).toBe("YES");
    expect(result.legalConfiguration.blockerCleared).toBe("YES");
    expect(result.privacy.result).toBe("PASS");
    expect(result.terms.result).toBe("PASS");
    expect(result.terms.governingLaw).toBe("State of Ohio, United States");
    expect(result.footer.privacy).toBe("PASS");
    expect(result.artifact.currentArtifact).toBe(CRE_OCCUPANCYNPV_LEGAL_SURFACE_SUCCESSOR_ARTIFACT_ID);
    expect(result.artifact.contentChanged).toBe("YES");
    expect(result.actions.stripeProductsCreated).toBe(0);
    expect(result.actions.stripePricesCreated).toBe(0);
    expect(result.actions.checkoutSessions).toBe(0);
    expect(result.actions.charges).toBe(0);
    expect(result.record.publiclyLaunched).toBe("NO");
    expect(result.commercialization.cleared).toContain("LEGAL_CONFIGURATION");
    expect(result.commercialization.remaining).toEqual(
      expect.arrayContaining([
        "PAYMENT_CONFIGURATION",
        "CHECKOUT_CONFIGURATION",
        "WEBHOOK_CONFIGURATION",
        "ANALYTICS_CONFIGURATION",
        "PAYMENT_ACTIVATION",
        "PUBLIC_LAUNCH",
      ]),
    );
    expect(result.commercialization.remaining).not.toContain("LEGAL_CONFIGURATION");
    expect(result.paymentReadiness.gate).toBe("BLOCKED");
    expect(result.nextState).toBe("CRE_LEGAL_CONFIGURATION_COMPLETE");
    expect(result.nextGovernedAction).toBe(GOVERNED_CANONICAL_STRIPE_PRODUCT_PRICE_AUTHORIZATION);
    expect(result.vercelWrites.deploymentCreates).toBe(1);
  });
});
