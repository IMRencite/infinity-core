import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { authorizeRuntimeTickRequest } from "@/lib/infinity/mission-runtime/tick-auth";
import { resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import {
  invokeMarketValidationAcquisitionRuntime,
  mayTriggerIngestAcquisitionReevaluation,
  resetIngestAcquisitionGuard,
  resolveResearchBlocker,
} from "@/lib/infinity/market-validation-acquisition-runtime";
import {
  PUBLIC_WEB_CAPABILITIES,
  PUBLIC_WEB_RESEARCH_RUNTIME,
  PUBLIC_WEB_SEARCH_PROVIDER_CONFIGURATION_REQUIRED,
  assertPublicHttpUrl,
  auditPublicWebResearchProviders,
  buildBoundedQueryPlan,
  createDuckDuckGoHtmlSearchProvider,
  extractEvidenceFromPage,
  fetchPublicPage,
  inspectPublicWebSearchReadiness,
  isBlockedHostname,
  isBlockedIpv4,
  parseDuckDuckGoHtml,
  resetPublicWebResearchCheckpoints,
  runPublicWebResearch,
  reasonOverEvidenceAfterRetrieval,
} from "@/lib/infinity/research/public-web";
import { discoverCreProspectsViaPublicWeb } from "@/lib/infinity/research/public-web/cre-prospects";

const NOW = new Date("2026-08-29T16:00:00.000Z");
const ORG = "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
const FIRM_URL = "https://example.com/hale-occupier-advisors/team";
const FIRM_HTML = `<html><head><title>Hale Occupier Advisors</title></head><body>
<p>Jordan Hale is a tenant representation broker advising occupiers on commercial leases.</p>
</body></html>`;

function searchFixture() {
  return [
    {
      query: "tenant representation",
      title: "Hale Occupier Advisors — Tenant Representation",
      url: FIRM_URL,
      snippet: "Tenant representation and commercial lease advisory.",
      provider: "injected",
      rank: 1,
      observedAt: NOW.toISOString(),
      costState: "UNKNOWN" as const,
      traceId: "pws_fixture",
    },
  ];
}

function fetchFixture(input: RequestInfo | URL, _init?: RequestInit): Promise<Response> {
  const url = String(input);
  if (url.includes("127.0.0.1") || url.includes("10.0.0.1")) {
    return Promise.resolve(new Response("nope", { status: 200, headers: { "content-type": "text/html" } }));
  }
  if (url.includes("redirect-private")) {
    return Promise.resolve(new Response(null, { status: 302, headers: { location: "http://127.0.0.1/secret" } }));
  }
  return Promise.resolve(new Response(FIRM_HTML, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }));
}

describe("PUBLIC WEB RESEARCH CAPABILITY + PROVIDER-NEUTRAL PROSPECT DISCOVERY V1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetPublicWebResearchCheckpoints();
    resetIngestAcquisitionGuard();
  });

  afterEach(() => {
    resetPublicWebResearchCheckpoints();
    resetIngestAcquisitionGuard();
  });

  it("separates capabilities and keeps providers vendor-neutral", () => {
    expect(PUBLIC_WEB_CAPABILITIES).toEqual([
      "web.search",
      "web.fetch_public_page",
      "research.extract_evidence",
      "research.reason_over_evidence",
      "research.verify_claim",
    ]);
    const audit = auditPublicWebResearchProviders({ NODE_ENV: "test", RESEARCH_PROVIDER: "gemini", GEMINI_API_KEY: "x" });
    expect(audit.find((row) => row.providerId === "gemini")?.notes).toMatch(/Not a web.search/);
    expect(audit.some((row) => row.capabilities.includes("web.search"))).toBe(true);
    expect(inspectPublicWebSearchReadiness({ NODE_ENV: "test", PUBLIC_WEB_SEARCH_PROVIDER: "none" }).reason).toBe(
      PUBLIC_WEB_SEARCH_PROVIDER_CONFIGURATION_REQUIRED,
    );
    expect(buildBoundedQueryPlan({ maxQueries: 6 })).toHaveLength(6);
  });

  it("parses search HTML and fetches only public pages with SSRF guards", async () => {
    const parsed = parseDuckDuckGoHtml(
      `<a class="result__a" href="https://example.com/firm">Hale Occupier</a><a class="result__snippet">Tenant representation</a>`,
      "tenant representation",
      "duckduckgo_html",
      "t1",
      NOW.toISOString(),
    );
    expect(parsed[0]?.url).toBe("https://example.com/firm");
    expect(isBlockedIpv4("127.0.0.1")).toBe(true);
    expect(isBlockedIpv4("10.0.0.8")).toBe(true);
    expect(isBlockedIpv4("192.168.1.9")).toBe(true);
    expect(isBlockedHostname("localhost")).toBe(true);
    expect(() => assertPublicHttpUrl("file:///etc/passwd")).toThrow(/SSRF_BLOCKED/);
    expect(() => assertPublicHttpUrl("ftp://example.com")).toThrow(/SSRF_BLOCKED/);
    const local = await fetchPublicPage("http://127.0.0.1/", { fetchImpl: fetchFixture });
    expect(local.ok).toBe(false);
    expect(local.blockedReason).toMatch(/SSRF_BLOCKED/);
    const redirected = await fetchPublicPage("https://example.com/redirect-private", { fetchImpl: fetchFixture });
    expect(redirected.ok).toBe(false);
    expect(redirected.blockedReason).toMatch(/SSRF_BLOCKED|redirect/);
  });

  it("extracts claim-oriented evidence and reasons after retrieval", async () => {
    const page = await fetchPublicPage(FIRM_URL, { fetchImpl: fetchFixture });
    const evidence = extractEvidenceFromPage(page, "pws_fixture");
    expect(evidence.some((item) => item.claimType === "professional" && item.sourceUrl === FIRM_URL)).toBe(true);
    expect(evidence.every((item) => item.supportingExcerpt && item.sourceUrl)).toBe(true);
    const reasoned = await reasonOverEvidenceAfterRetrieval({ evidence, allowLlm: true });
    expect(reasoned.usedLlm).toBe(false);
    expect(reasoned.reasoningProvider).toBe("deterministic_after_retrieval");
  });

  it("runs the public web pipeline with checkpointing, freshness, and partial fetch survival", async () => {
    let searches = 0;
    const research = await runPublicWebResearch({
      objective: "find tenant-rep firms",
      queries: ["tenant representation commercial real estate broker"],
      missionId: "msn_test_pwr",
      search: async () => {
        searches += 1;
        return searchFixture();
      },
      fetchImpl: fetchFixture,
    });
    expect(research.runtime).toBe(PUBLIC_WEB_RESEARCH_RUNTIME);
    expect(research.results).toHaveLength(1);
    expect(research.fetches.length).toBeGreaterThanOrEqual(1);
    expect(research.fetches.length).toBeLessThanOrEqual(12);
    expect(research.evidence.length).toBeGreaterThan(0);
    expect(research.fabricated).toBe(false);
    const again = await runPublicWebResearch({
      objective: "find tenant-rep firms",
      queries: ["tenant representation commercial real estate broker"],
      missionId: "msn_test_pwr",
      search: async () => {
        searches += 1;
        return searchFixture();
      },
      fetchImpl: fetchFixture,
    });
    expect(searches).toBe(1);
    expect(again.results).toHaveLength(1);
  });

  it("discovers HIGH-confidence CRE prospects without guessed private data", async () => {
    const found = await discoverCreProspectsViaPublicWeb({
      missionId: "msn_mva_e72beb7b6d35e7b2",
      search: async () => searchFixture(),
      fetchImpl: fetchFixture,
    });
    expect(found.prospects.map((prospect) => prospect.name)).toEqual(["Jordan Hale"]);
    expect(found.prospects.every((prospect) => !/Service|Guide|Portal|Representation/i.test(prospect.name))).toBe(true);
    expect(found.prospects.length).toBeGreaterThanOrEqual(1);
    expect(found.prospects.length).toBeLessThanOrEqual(8);
    expect(found.prospects[0]?.qualification.confidence).toBe("HIGH");
    expect(found.prospects[0]?.qualification.status).toBe("PROSPECT_QUALIFIED");
    expect(found.prospects[0]?.lineage.fabricated).toBe(false);
    expect(found.prospects[0]?.publicContactChannel).not.toMatch(/@/);
    expect(found.blocker).toBe("ACQUISITION_PREPARATION_INCOMPLETE");
    expect(
      resolveResearchBlocker({
        prospectCount: 0,
        capabilityMissing: false,
        classification: "NO_RESULTS",
        pathsExhausted: true,
        founderChannelRequired: false,
        searchConfigurationMissing: true,
      }),
    ).toBe(PUBLIC_WEB_SEARCH_PROVIDER_CONFIGURATION_REQUIRED);
  });

  it("transitions the acquisition mission and keeps Command telemetry truthful", async () => {
    const result = await invokeMarketValidationAcquisitionRuntime({
      organizationId: ORG,
      now: NOW,
      liveDiscovery: true,
      search: async () => searchFixture(),
      fetchImpl: fetchFixture,
    });
    expect(["COMMUNICATION_PROVIDER_CAPABILITY_REQUIRED", "ACQUISITION_PREPARATION_INCOMPLETE"]).toContain(
      result.governance.blocker,
    );
    expect(result.nextMission.subtype).toBe("OUTREACH_PREPARATION");
    expect(result.unauthorizedActions.realOutreach).toBe(0);
    expect(result.discovery.publicWeb?.trace.searchProvider).toBeTruthy();
    expect(result.command.recentEvents.some((event) => event.stepType === "WEB_SEARCH")).toBe(true);
    expect(result.command.recentEvents.some((event) => event.stepType === "PROSPECT_QUALIFICATION")).toBe(true);
    expect(result.experiment.clock.restarted).toBe(false);
    expect(result.experiment.artifactId).toBe("art_d20f8a53a3ef1de20ebe");
    expect(result.performance.countsAsMarketEvidence).toBe(false);
    expect(result.counts.qualifiedSubmissions).toBe(0);
  });

  it("rejects unauthorized runtime ticks and accepts authorized cron", () => {
    expect(authorizeRuntimeTickRequest(new Request("https://example.com/api/runtime/tick"), { NODE_ENV: "test" }).ok).toBe(false);
    expect(
      authorizeRuntimeTickRequest(new Request("https://example.com/api/runtime/tick"), { NODE_ENV: "test", CRON_SECRET: "s3cret" }).ok,
    ).toBe(false);
    expect(
      authorizeRuntimeTickRequest(
        new Request("https://example.com/api/runtime/tick", { headers: { authorization: "Bearer s3cret" } }),
        { NODE_ENV: "test", CRON_SECRET: "s3cret" },
      ).ok,
    ).toBe(true);
    const first = mayTriggerIngestAcquisitionReevaluation({ clientKey: "1.1.1.1", now: NOW, cooldownMs: 60_000 });
    const second = mayTriggerIngestAcquisitionReevaluation({ clientKey: "1.1.1.1", now: NOW, cooldownMs: 60_000 });
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    const dashboard = readFileSync(join(process.cwd(), "app/dashboard/page.tsx"), "utf8");
    const money = readFileSync(join(process.cwd(), "components/dashboard/operator-console/artifacts/hq-output-detail.tsx"), "utf8");
    expect(dashboard).toContain("InfinityHqExperience");
    expect(money).toContain('money: "Money"');
    expect(readFileSync(join(process.cwd(), "app/api/runtime/tick/route.ts"), "utf8")).toContain("authorizeRuntimeTickRequest");
  });

  it("classifies DuckDuckGo HTML format drift separately from no results", async () => {
    const provider = createDuckDuckGoHtmlSearchProvider({
      fetchImpl: async () =>
        Promise.resolve(
          new Response(
            `<html><body><div class='results'>${"completely different markup ".repeat(20)}</div></body></html>`,
            {
            status: 200,
            headers: { "content-type": "text/html" },
          }),
        ),
    });
    await expect(provider.search({ query: "tenant representation", maxResults: 5, traceId: "pws_fmt" })).rejects.toThrow(
      "PROVIDER_FORMAT_CHANGED",
    );
    expect(parseDuckDuckGoHtml("<html></html>", "q", "duckduckgo_html", "t", NOW.toISOString())).toEqual([]);
    const drifted = await runPublicWebResearch({
      objective: "find tenant-rep firms",
      queries: ["tenant representation"],
      missionId: "msn_format_changed",
      search: async () => {
        throw new Error("PROVIDER_FORMAT_CHANGED");
      },
    });
    expect(drifted.blocker).toBe("PROVIDER_FORMAT_CHANGED");
    expect(drifted.blocker).not.toBe("NO_RESULTS");
    expect(drifted.results).toHaveLength(0);
  });
});
