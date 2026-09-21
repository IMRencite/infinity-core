import { describe, expect, it, vi } from "vitest";
import {
  inspectPrerenderEvidence,
  inspectRouteBuildManifest,
} from "@/lib/infinity/venture-build-orchestration/provider-equivalent-artifact-build-gate";
import { isolatedArtifactEnv } from "@/lib/infinity/venture-build-orchestration/isolated-artifact-build";
import { searchDepthRouteManifest } from "@/lib/infinity/market-validation-experiment/cre-authority-expansion-routes";
import { HARD_PUBLISHABILITY_GATES } from "../public-authority-standard/constants";
import {
  evaluatePrerenderHookBoundaryGate,
  FOUNDER_PRERENDER_USEOPTIMISTIC_CLIENT_BOUNDARY_FIXTURE,
  FOUNDER_PRERENDER_USEOPTIMISTIC_NO_CLIENT_FIXTURE,
  hasUseClientDirective,
  stripUnnecessaryUseClient,
} from "../public-authority-standard/prerender-hook-boundary-gate";
import { evaluateHumanFirstPublicLanguageGate } from "../human-first-public-language-gate";
import { evaluateRenderedTextContrastFromFiles } from "../public-authority-standard/rendered-text-contrast-gate";
import { evaluateResponsiveGeometry } from "../public-authority-standard/publishability";
import { pageContent } from "../answer-authority/page-inspect";
import { reconstructCrePricingPrerenderRepairSuccessor } from "../cre-pricing-prerender-repair-successor";
import {
  CRE_PROVIDER_EQUIVALENT_PRICING_BUILD_REPAIR_MISSION_ID,
  CRE_PROVIDER_EQUIVALENT_PRICING_BUILD_REPAIR_V1,
  GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_REQUIRED,
  runCrePricingPrerenderRepairMission,
} from "../answer-authority/pricing-prerender-repair-mission";
import { instrumentedRuntimeRegistry } from "@/lib/infinity/mission-activity/runtime-contract";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { inspectMailboxObserverHealth } from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import {
  CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID,
  CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_SOURCE_DIGEST,
  SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";

const PRICING_PRERENDER_FAIL_LOG = `▲ Next.js 16.2.11 (Turbopack)
✓ Compiled successfully in 7.6s
Generating static pages using 19 workers (0/97)
Error occurred prerendering page "/pricing"
TypeError: Cannot read properties of null (reading 'useOptimistic')
Export encountered an error on /pricing/page: /pricing, exiting the build.
`;

const PRICING_PRERENDER_PASS_LOG = `▲ Next.js 16.2.11 (Turbopack)
✓ Compiled successfully in 7.6s
Generating static pages using 19 workers (97/97)
○ /
○ /pricing
○ /how-it-works
`;

describe("CRE provider-equivalent pricing prerender repair v1", () => {
  it("rejects useOptimistic without a client boundary and accepts a dedicated client island", () => {
    expect(evaluatePrerenderHookBoundaryGate([...FOUNDER_PRERENDER_USEOPTIMISTIC_NO_CLIENT_FIXTURE.files]).overall).toBe("FAIL");
    expect(evaluatePrerenderHookBoundaryGate([...FOUNDER_PRERENDER_USEOPTIMISTIC_CLIENT_BOUNDARY_FIXTURE.files]).overall).toBe("PASS");
    expect(
      stripUnnecessaryUseClient(`"use client";\nexport function PageShell({ children }: { children: unknown }) { return children; }\n`),
    ).not.toMatch(/use client/);
    expect(hasUseClientDirective(`"use client";\nimport { useState } from "react";`)).toBe(true);
  });

  it("fails closed when compile succeeds and prerender fails", () => {
    const evidence = inspectPrerenderEvidence({
      buildLog: PRICING_PRERENDER_FAIL_LOG,
      pageRoutes: ["/", "/pricing"],
      buildExitCode: 1,
    });
    expect(evidence.compileSucceeded).toBe(true);
    expect(evidence.prerender).toBe("FAIL");
    expect(evidence.staticGeneration).toBe("FAIL");
    expect(evidence.issues).toContain("compile_succeeded_prerender_failed");
    expect(evidence.issues).toContain("prerender_failed:/pricing");
  });

  it("fails closed when a successful compile has no /pricing prerender evidence", () => {
    const evidence = inspectPrerenderEvidence({
      buildLog: `▲ Next.js 16.2.11 (Turbopack)\n✓ Compiled successfully in 7.6s\nGenerating static pages using 19 workers (97/97)\n○ /\n○ /how-it-works\n`,
      pageRoutes: ["/", "/how-it-works"],
      buildExitCode: 0,
    });
    expect(evidence.prerender).toBe("FAIL");
    expect(evidence.issues).toContain("missing_prerender_evidence:/pricing");
  });

  it("accepts compile plus prerender evidence for required public routes", () => {
    const evidence = inspectPrerenderEvidence({
      buildLog: PRICING_PRERENDER_PASS_LOG,
      pageRoutes: ["/", "/pricing", "/how-it-works"],
      buildExitCode: 0,
      prerenderedRoutes: ["/", "/pricing", "/how-it-works"],
    });
    expect(evidence.compileSucceeded).toBe(true);
    expect(evidence.prerender).toBe("PASS");
    expect(evidence.missingPrerenderEvidence).toEqual([]);
  });

  it("treats isomorphic window guards as prerender-safe and rejects ungated browser access", () => {
    const isomorphic = evaluatePrerenderHookBoundaryGate([
      {
        path: "app/ingest-client.ts",
        content: `export function capture() {
  if (typeof window === "undefined") return null;
  return window.location.search;
}
`,
      },
    ]);
    const ungated = evaluatePrerenderHookBoundaryGate([
      {
        path: "app/pricing/page.tsx",
        content: `export default function Page() {
  return <p>{window.location.href}</p>;
}
`,
      },
    ]);
    expect(isomorphic.overall).toBe("PASS");
    expect(ungated.overall).toBe("FAIL");
    expect(ungated.findings[0]?.reason).toBe("browser_api_without_client");
  });

  it("forces production NODE_ENV in the isolated build room", () => {
    vi.stubEnv("NODE_ENV", "test");
    const build = isolatedArtifactEnv("C:/tmp/isolated", "build");
    const install = isolatedArtifactEnv("C:/tmp/isolated", "install");
    vi.unstubAllEnvs();
    expect(build.NODE_ENV).toBe("production");
    expect(install.NODE_ENV).toBeUndefined();
    expect(build.VITEST).toBeUndefined();
  });

  it("counts missing and failed routes fail-closed in the production manifest", () => {
    const routes = searchDepthRouteManifest();
    const missing = inspectRouteBuildManifest({
      expectedPageRoutes: [...routes.pageRoutes],
      generatedRoutes: [...routes.pageRoutes].slice(0, 10),
      prerenderedRoutes: [],
      prerenderFailedRoutes: [],
    });
    const failed = inspectRouteBuildManifest({
      expectedPageRoutes: ["/pricing"],
      generatedRoutes: ["/pricing"],
      prerenderedRoutes: [],
      prerenderFailedRoutes: ["/pricing"],
    });
    expect(missing.expected).toBe(93);
    expect(missing.missing).toBeGreaterThan(0);
    expect(failed.failed).toBe(1);
  });

  it("freezes a new successor that keeps /pricing server-renderable", async () => {
    const successor = await reconstructCrePricingPrerenderRepairSuccessor();
    const pricing = successor.files.find((file) => file.path.replace(/\\/g, "/") === "app/pricing/page.tsx")?.content ?? "";
    const shell = successor.files.find((file) => file.path.replace(/\\/g, "/") === "components/validation-grade.tsx")?.content ?? "";
    const footer = successor.files.find((file) => file.path.replace(/\\/g, "/") === "components/venture-footer.tsx")?.content ?? "";
    expect(successor.predecessorArtifactId).toBe(SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID);
    expect(successor.artifactId).not.toBe(SEO_GEO_SEARCH_DEPTH_SUCCESSOR_ARTIFACT_ID);
    expect(successor.immutable).toBe(true);
    expect(successor.deployed).toBe(false);
    expect(successor.routes).toBe(93);
    expect(successor.pageLoop.overall).toBe("PASS");
    expect(successor.pageLoop.missingEvidence).toBe(0);
    expect(successor.hookBoundary.overall).toBe("PASS");
    expect(hasUseClientDirective(shell)).toBe(false);
    expect(hasUseClientDirective(footer)).toBe(false);
    expect(hasUseClientDirective(pricing)).toBe(false);
    expect(pricing).toContain("Early validation pricing hypotheses");
    expect(pricing).toContain('canonical: "/pricing"');
    expect(pricing).toContain("JsonLdBlock");
    expect(pricing).toContain('SITE_SCHEMA["/pricing"]');
    expect(pricing).not.toMatch(/useOptimistic/);
    expect(pricing).not.toMatch(/force-dynamic|export const dynamic = ["']force-dynamic["']/);
    const schema = successor.files.find((file) => file.path.replace(/\\/g, "/") === "lib/site-schema.ts")?.content ?? "";
    expect(schema).toContain('"/pricing"');
    expect(schema).toMatch(/Offer|WebPage|FAQPage|BreadcrumbList/);
    expect(evaluateHumanFirstPublicLanguageGate(pricing).overall).toBe("PASS");
    expect(evaluateResponsiveGeometry({ overflowByViewport: { "1440": 0, "1280": 0, "1024": 0, "390": 0 } })).toBe("PASS");
    const interactive = successor.files.filter(
      (file) => file.encoding !== "base64" && /useState|useEffect|useOptimistic/.test(file.content),
    );
    expect(interactive.length).toBeGreaterThan(0);
    expect(interactive.every((file) => hasUseClientDirective(file.content))).toBe(true);
    const chunks = successor.files
      .filter((file) => file.encoding !== "base64")
      .reduce((sum, file) => sum + (file.content.match(/data-answer-chunk-id=/g) ?? []).length, 0);
    expect(chunks).toBeGreaterThanOrEqual(400);
    expect(successor.pageLoop.fullRoute.overall).toBe("PASS");
    const css = successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
    const cam = pageContent(successor.files, "/commercial-lease-npv/should-cam-be-in-lease-npv");
    const camRecord = successor.pageLoop.records.find((record) => record.route.includes("should-cam-be-in-lease-npv"));
    expect(evaluateRenderedTextContrastFromFiles(successor.files).overall).toBe("PASS");
    expect(cam).toMatch(/Trusted sources/i);
    expect(css).toMatch(/#1d4e89|#152033/);
    expect(camRecord?.gateResults.RenderedLinkContrastGate).toBe("PASS");
    expect(successor.pageLoop.trustedSourcesFailures).toBe(0);
    expect(successor.hard.ready).toBe("PREMIUM_AUTHORITY_VALIDATION_READY");
    expect(successor.founderVisualReviewReady).toBe("FOUNDER_VISUAL_REVIEW_READY");
    expect(successor.publishability.graph.orphans).toBe(0);
    expect(successor.publishability.graph.deadEnds).toBe(0);
    expect(HARD_PUBLISHABILITY_GATES).toContain("FullPublicRouteValidationGate");
    expect(successor.hookBoundary.gate).toBe("PrerenderHookBoundaryGate");
    const composedArtifactId: string = CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID;
    if (composedArtifactId !== "PENDING_COMPOSE") {
      expect(successor.artifactId).toBe(CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID);
      expect(successor.digest).toBe(CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_SOURCE_DIGEST);
    }
  }, 180000);

  it("projects the repair mission and does not write to a provider", async () => {
    process.env.INFINITY_INBOUND_PERSIST = "1";
    const observerBefore = inspectMailboxObserverHealth();
    const ran = await runCrePricingPrerenderRepairMission({
      organizationId: "org_pricing_prerender_repair_test",
      runIsolatedBuild: false,
    });
    expect(CRE_PROVIDER_EQUIVALENT_PRICING_BUILD_REPAIR_V1).toBe("CRE_PROVIDER_EQUIVALENT_PRICING_BUILD_REPAIR_V1");
    expect(CRE_PROVIDER_EQUIVALENT_PRICING_BUILD_REPAIR_MISSION_ID).toBe("msn_cre_pricing_prerender_build_repair_v1");
    expect(ran.command).toBe("ACTIVE_WORK");
    expect(ran.creationLab).toBe("ACTIVE_WORK");
    expect(ran.systemsArchitect).toBe("ACTIVE_WORK");
    expect(ran.validationStation).toBe("ACTIVE_WORK");
    expect(ran.deploymentDepot).toBe("PRESENT_IDLE");
    expect(ran.growthNexus).toBe("PRESENT_IDLE");
    expect(ran.deployed).toBe(false);
    expect(ran.providerWrites).toBe(0);
    expect(ran.view.nowInspecting.status).toBe("READY_BLOCKED");
    expect(ran.view.nowInspecting.authorizationRequired).toBe(GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_REQUIRED);
    expect(ran.result.successor.digest).toBeTruthy();
    expect(instrumentedRuntimeRegistry().runtimes.CrePricingPrerenderRepairRuntime.usesMissionWrapper).toBe(true);
    expect(GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_REQUIRED).toBe("GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_REQUIRED");
    expect(inspectRealMarketEvidence().experiment.state).toBe("COLLECTING");
    expect(inspectExperimentClock().restarted).toBe(false);
    expect(inspectMailboxObserverHealth().status).toBe(observerBefore.status);
    expect(inspectMailboxObserverHealth().trackedConversations).toBe(observerBefore.trackedConversations);
    expect(observerBefore.status).toBe("RUNNING");
    expect(observerBefore.trackedConversations).toBe(2);
  }, 180000);
});
