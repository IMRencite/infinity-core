import { describe, expect, it } from "vitest";
import { searchDepthRouteManifest } from "@/lib/infinity/market-validation-experiment/cre-authority-expansion-routes";
import { HARD_PUBLISHABILITY_GATES } from "../public-authority-standard/constants";
import {
  evaluateHubQuestionBoardLayout,
  FOUNDER_HUB_DISCOVERY_LEFTOVER_ROLE_FIXTURE,
  GOOD_HUB_DISCOVERY_LAYOUT_FIXTURE,
  HUB_QUESTION_BOARD_LAYOUT_GATE,
} from "../public-authority-standard/hub-discovery-rendered-quality";
import { evaluateHubQuestionDiscoveryCoverage } from "../search-demand-depth-gates";
import { evaluatePage, runDeterministicPerPageAdmission } from "../public-authority-standard/per-page-render-validate-repair";
import { evaluateFullPublicRouteValidationGate } from "../public-authority-standard/full-public-route-validation-gate";
import { evaluatePrerenderHookBoundaryGate } from "../public-authority-standard/prerender-hook-boundary-gate";
import { evaluateHumanFirstPublicLanguageGate } from "../human-first-public-language-gate";
import { evaluateRenderedTextContrastFromFiles } from "../public-authority-standard/rendered-text-contrast-gate";
import { pageContent } from "../answer-authority/page-inspect";
import { renderRepairedHubQuestionDiscovery } from "../hub-question-discovery";
import { HUB_DISCOVERY_LAYOUT_CSS } from "../authority-section-surface-css";
import { reconstructCreHubQuestionBoardLayoutSuccessor } from "../cre-hub-question-board-layout-successor";
import {
  CRE_HUB_QUESTION_BOARD_LAYOUT_REPAIR_MISSION_ID,
  CRE_HUB_QUESTION_BOARD_LAYOUT_REPAIR_V1,
  GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_REQUIRED,
  runCreHubQuestionBoardLayoutRepairMission,
} from "../answer-authority/hub-question-board-layout-repair-mission";
import { instrumentedRuntimeRegistry } from "@/lib/infinity/mission-activity/runtime-contract";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { inspectMailboxObserverHealth } from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import {
  CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID,
  CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_SOURCE_DIGEST,
  CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";
import { SEO_GEO_TOPIC_HUBS } from "../digital-real-estate-catalog";

describe("HubQuestionBoardLayoutGate", () => {
  it("fails the founder leftover For your role column on a 5-wide auto-fit grid", () => {
    const gate = evaluateHubQuestionBoardLayout(FOUNDER_HUB_DISCOVERY_LEFTOVER_ROLE_FIXTURE);
    expect(gate.gate).toBe(HUB_QUESTION_BOARD_LAYOUT_GATE);
    expect(gate.overall).toBe("FAIL");
    expect(gate.leftoverSingletonGroup).toBe(true);
    expect(gate.autoFitSparseColumns).toBe(true);
    expect(gate.founderLeftoverPattern).toBe(true);
    expect(gate.rolePresentation).toBe("GRID_CELL");
    expect(gate.failures).toContain("hub_discovery_leftover_singleton_group");
    expect(gate.failures).toContain("hub_discovery_autofit_sparse_columns");
    expect(gate.failures).toContain("hub_discovery_role_not_full_width_band");
  });

  it("passes a 3-column board with For your role as a full-width band", () => {
    const gate = evaluateHubQuestionBoardLayout(GOOD_HUB_DISCOVERY_LAYOUT_FIXTURE);
    expect(gate.overall).toBe("PASS");
    expect(gate.rolePresentation).toBe("FULL_WIDTH_BAND");
    expect(gate.founderLeftoverPattern).toBe(false);
  });

  it("fails closed when a hub board is present and geometry is missing", () => {
    const gate = evaluateHubQuestionBoardLayout({
      ...GOOD_HUB_DISCOVERY_LAYOUT_FIXTURE,
      requireGeometry: true,
      geometry: { captured: false },
    });
    expect(gate.overall).toBe("FAIL");
    expect(gate.missingGeometry).toBe(true);
    expect(gate.failures).toContain("hub_discovery_missing_board_geometry");
  });

  it("accepts responsive geometry at 1440, 1280, 1024, and 390", () => {
    const base = GOOD_HUB_DISCOVERY_LAYOUT_FIXTURE;
    expect(
      evaluateHubQuestionBoardLayout({
        ...base,
        geometry: { ...base.geometry, viewportWidth: 1440, columnCount: 3, captured: true },
      }).overall,
    ).toBe("PASS");
    expect(
      evaluateHubQuestionBoardLayout({
        ...base,
        geometry: { ...base.geometry, viewportWidth: 1280, columnCount: 3, captured: true },
      }).overall,
    ).toBe("PASS");
    expect(
      evaluateHubQuestionBoardLayout({
        ...base,
        geometry: { ...base.geometry, viewportWidth: 1024, columnCount: 2, captured: true },
      }).overall,
    ).toBe("PASS");
    expect(
      evaluateHubQuestionBoardLayout({
        ...base,
        geometry: { ...base.geometry, viewportWidth: 390, columnCount: 1, captured: true },
      }).overall,
    ).toBe("PASS");
  });

  it("fails leftover geometry at desktop even when markup is inspected", () => {
    expect(
      evaluateHubQuestionBoardLayout({
        ...FOUNDER_HUB_DISCOVERY_LEFTOVER_ROLE_FIXTURE,
        requireGeometry: true,
      }).overall,
    ).toBe("FAIL");
  });
});

describe("Hub question-board integrations", () => {
  it("requires rendered layout before hub coverage can pass", () => {
    const css = HUB_DISCOVERY_LAYOUT_CSS;
    const failFiles = [
      { path: "app/globals.css", content: css },
      {
        path: "app/commercial-lease-npv/page.tsx",
        content: FOUNDER_HUB_DISCOVERY_LEFTOVER_ROLE_FIXTURE.html,
      },
    ];
    const passFiles = [
      { path: "app/globals.css", content: css },
      {
        path: "app/commercial-lease-npv/page.tsx",
        content: GOOD_HUB_DISCOVERY_LAYOUT_FIXTURE.html,
      },
    ];
    expect(evaluateHubQuestionDiscoveryCoverage(failFiles).overall).toBe("FAIL");
    expect(HARD_PUBLISHABILITY_GATES).toContain("HubQuestionBoardLayoutGate");
    expect(HARD_PUBLISHABILITY_GATES).toContain("HubQuestionDiscoveryCoverageGate");
    void passFiles;
  });

  it("keeps leftover hub boards out of READY_FOR_ARTIFACT during per-page admission", () => {
    const leftover = evaluatePage(
      FOUNDER_HUB_DISCOVERY_LEFTOVER_ROLE_FIXTURE.html,
      HUB_DISCOVERY_LAYOUT_CSS,
      "/commercial-lease-npv",
    );
    expect(leftover.gateResults.HubQuestionBoardLayoutGate).toBe("FAIL");
    expect(leftover.failures).toContain("hub_discovery_layout");
    expect(leftover.families).toContain("GRID");
    const good = evaluatePage(
      GOOD_HUB_DISCOVERY_LAYOUT_FIXTURE.html,
      HUB_DISCOVERY_LAYOUT_CSS,
      "/commercial-lease-npv",
    );
    expect(good.gateResults.HubQuestionBoardLayoutGate).toBe("PASS");
    const loop = runDeterministicPerPageAdmission({
      files: [
        { path: "app/globals.css", content: HUB_DISCOVERY_LAYOUT_CSS },
        { path: "app/commercial-lease-npv/page.tsx", content: FOUNDER_HUB_DISCOVERY_LEFTOVER_ROLE_FIXTURE.html },
      ],
      routes: ["/commercial-lease-npv"],
    });
    expect(loop.requiredRepair).toBeGreaterThan(0);
    expect(loop.records[0]?.finalState).not.toBe("READY_FOR_ARTIFACT");
  });

  it("fails full-route validation when a hub board has no evidence", () => {
    const missing = evaluateFullPublicRouteValidationGate({
      expectedRoutes: ["/commercial-lease-npv"],
      records: [],
    });
    expect(missing.overall).toBe("FAIL");
    expect(missing.routesWithoutEvidence).toContain("/commercial-lease-npv");
  });
});

describe("CRE hub question-board layout repair successor", () => {
  it("repairs the shared generator and freezes a new unpublished successor", async () => {
    const successor = await reconstructCreHubQuestionBoardLayoutSuccessor();
    const css = successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
    const founder = pageContent(successor.files, "/commercial-lease-npv");
    const generated = renderRepairedHubQuestionDiscovery("/commercial-lease-npv");
    expect(successor.predecessorArtifactId).toBe(CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(successor.artifactId).not.toBe(CRE_PRICING_PRERENDER_REPAIR_SUCCESSOR_ARTIFACT_ID);
    expect(successor.immutable).toBe(true);
    expect(successor.deployed).toBe(false);
    expect(successor.routes).toBe(93);
    expect(css).toContain("--pv-discovery-layout");
    expect(css).not.toMatch(/repeat\(auto-fit,\s*minmax\(220px/);
    expect(founder).toContain("pv-discovery-grid--balanced");
    expect(founder).toContain("pv-discovery-band");
    expect(founder).toContain("data-hub-role-band");
    const beforeBand = founder.split("pv-discovery-band")[0] ?? founder;
    expect(beforeBand).not.toContain("FOR_YOUR_ROLE");
    expect(generated).toContain("data-hub-role-band");
    expect(evaluateHubQuestionBoardLayout({ html: founder, css }).overall).toBe("PASS");
    expect(evaluateHubQuestionBoardLayout({ html: founder, css }).rolePresentation).toBe("FULL_WIDTH_BAND");
    expect(successor.hubLayout.overall).toBe("PASS");
    expect(successor.discovery.overall).toBe("PASS");
    expect(successor.pageLoop.overall).toBe("PASS");
    expect(successor.pageLoop.finalFailed).toBe(0);
    expect(successor.pageLoop.missingEvidence).toBe(0);
    expect(successor.hookBoundary.overall).toBe("PASS");
    expect(successor.contrast.overall).toBe("PASS");
    expect(successor.humanFirst.overall).toBe("PASS");
    const pricing = pageContent(successor.files, "/pricing");
    expect(evaluatePrerenderHookBoundaryGate(successor.files).overall).toBe("PASS");
    expect(pricing).toContain("Early validation pricing hypotheses");
    expect(pricing).not.toMatch(/useOptimistic/);
    const cam = pageContent(successor.files, "/commercial-lease-npv/should-cam-be-in-lease-npv");
    expect(cam).toMatch(/Trusted sources/i);
    expect(evaluateHumanFirstPublicLanguageGate(founder).overall).toBe("PASS");
    expect(evaluateRenderedTextContrastFromFiles(successor.files).overall).toBe("PASS");
    expect(successor.hubRoutes.length).toBeGreaterThan(0);
    expect(successor.hubRoutes).toContain("/commercial-lease-npv");
    expect(SEO_GEO_TOPIC_HUBS.every((hub) => successor.hubRoutes.includes(hub.route) || !pageContent(successor.files, hub.route).includes("data-hub-question-discovery"))).toBe(true);
    for (const route of successor.hubRoutes) {
      const html = pageContent(successor.files, route);
      expect(evaluateHubQuestionBoardLayout({ html, css }).overall).toBe("PASS");
    }
    const chunks = successor.files
      .filter((file) => file.encoding !== "base64")
      .reduce((sum, file) => sum + (file.content.match(/data-answer-chunk-id=/g) ?? []).length, 0);
    expect(chunks).toBeGreaterThanOrEqual(400);
    expect(successor.publishability.graph.orphans).toBe(0);
    expect(successor.publishability.graph.deadEnds).toBe(0);
    expect(successor.hard.ready).toBe("PREMIUM_AUTHORITY_VALIDATION_READY");
    expect(successor.founderVisualReviewReady).toBe("FOUNDER_VISUAL_REVIEW_READY");
    expect(searchDepthRouteManifest().intendedCount).toBe(93);
    const composedArtifactId: string = CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID;
    if (composedArtifactId !== "PENDING_COMPOSE") {
      expect(successor.artifactId).toBe(CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_ARTIFACT_ID);
      expect(successor.digest).toBe(CRE_HUB_QUESTION_BOARD_LAYOUT_SUCCESSOR_SOURCE_DIGEST);
    }
  }, 180000);

  it("projects the repair mission and does not write to a provider", async () => {
    process.env.INFINITY_INBOUND_PERSIST = "1";
    const observerBefore = inspectMailboxObserverHealth();
    const ran = await runCreHubQuestionBoardLayoutRepairMission({
      organizationId: "org_hub_layout_repair_test",
      runIsolatedBuild: false,
    });
    expect(CRE_HUB_QUESTION_BOARD_LAYOUT_REPAIR_V1).toBe("CRE_HUB_QUESTION_BOARD_LAYOUT_REPAIR_V1");
    expect(CRE_HUB_QUESTION_BOARD_LAYOUT_REPAIR_MISSION_ID).toBe("msn_cre_hub_question_board_layout_repair_v1");
    expect(ran.command).toBe("ACTIVE_WORK");
    expect(ran.creationLab).toBe("ACTIVE_WORK");
    expect(ran.systemsArchitect).toBe("ACTIVE_WORK");
    expect(ran.validationStation).toBe("ACTIVE_WORK");
    expect(ran.deploymentDepot).toBe("PRESENT_IDLE");
    expect(ran.growthNexus).toBe("PRESENT_IDLE");
    expect(ran.deployed).toBe(false);
    expect(ran.providerWrites).toBe(0);
    expect(ran.view.nowInspecting.status).toBe("READY_BLOCKED");
    expect(ran.view.nowInspecting.authorizationRequired).toBe(GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_REQUIRED);
    expect(instrumentedRuntimeRegistry().runtimes.CreHubQuestionBoardLayoutRepairRuntime.usesMissionWrapper).toBe(true);
    expect(inspectRealMarketEvidence().experiment.state).toBe("COLLECTING");
    expect(inspectExperimentClock().restarted).toBe(false);
    expect(inspectMailboxObserverHealth().status).toBe(observerBefore.status);
    expect(inspectMailboxObserverHealth().trackedConversations).toBe(observerBefore.trackedConversations);
    expect(observerBefore.status).toBe("RUNNING");
    expect(observerBefore.trackedConversations).toBe(2);
  }, 180000);
});
