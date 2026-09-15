import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { constructPublicOperationsProjection, idleTruthObservation } from "@/lib/infinity/public-operations-projection";
import {
  PUBLIC_OPERATIONS_ROOM_ENDPOINT,
  PUBLIC_OPERATIONS_ROOM_FORBIDDEN_FETCHES,
  PUBLIC_OPERATIONS_ROOM_ROUTE,
  agentMotion,
  evaluatePublicAgentAnimationTruthGate,
  evaluatePublicOperationsAccessibilityGate,
  evaluatePublicOperationsBrowserRuntimeGate,
  evaluatePublicOperationsResponsiveGate,
  evaluatePublicOperationsRoomDOMPrivacyGate,
  evaluatePublicOperationsRoomDataBoundaryGate,
  evaluatePublicOperationsRoomNetworkBoundaryGate,
  evaluatePublicOperationsRoomPrivacyBundle,
  evaluatePublicOperationsRoomTruthGate,
  formatPublicCount,
  publicOperationsRoomUiFiles,
} from "..";

const ROOM = "components/public/operations-room/live-operations-room.tsx";
const PAGE = "app/public/operations-room/page.tsx";
const CSS = "components/public/operations-room/operations-room.module.css";
const FOOTER = "components/public/operations-room/public-operations-footer.tsx";

function uiSources(): string[] {
  return publicOperationsRoomUiFiles().map((path) => readFileSync(path, "utf8"));
}

function renderMarkup(observation = idleTruthObservation()) {
  const projection = constructPublicOperationsProjection(observation);
  return {
    projection,
    markup: [
      projection.system_status,
      ...projection.public_departments.map((row) => `${row.public_name} ${row.generic_activity_label}`),
      ...projection.public_ventures.map((row) => `${row.public_name} ${row.public_url ?? ""}`),
      `Agents Active ${formatPublicCount(projection.active_public_agents)}`,
      `Autonomous Hours ${formatPublicCount(projection.autonomous_operating_hours)}`,
    ].join("\n"),
  };
}

describe("IMROS Live Operations Room V1", () => {
  it("1-5. room consumes public endpoint only and never private HQ/treasury/runtime/SSE", () => {
    const joined = uiSources().join("\n");
    expect(joined).toContain("PUBLIC_OPERATIONS_ROOM_ENDPOINT");
    for (const forbidden of PUBLIC_OPERATIONS_ROOM_FORBIDDEN_FETCHES) {
      expect(joined).not.toContain(forbidden);
    }
    expect(joined).not.toContain("EventSource");
    expect(evaluatePublicOperationsRoomNetworkBoundaryGate({ sources: uiSources() }).result).toBe("PASS");
  });

  it("6-8. hidden ventures and AskReview stay absent; OccupancyNPV follows public policy", () => {
    const { projection, markup } = renderMarkup();
    expect(projection.public_ventures.some((row) => row.public_name === "OccupancyNPV")).toBe(true);
    expect(markup).not.toMatch(/AskReview/i);
    expect(markup).not.toContain("Horizon");
    expect(evaluatePublicOperationsRoomPrivacyBundle(projection).every((row) => row.result === "PASS")).toBe(true);
  });

  it("9. UNKNOWN stats do not render zero", () => {
    const observation = idleTruthObservation();
    observation.loop = { ...observation.loop!, autonomous_enabled_at: null };
    observation.work = observation.work.filter((row) => row.work_id !== "work:infinity:autonomous-daily-operating-loop-v1");
    const projection = constructPublicOperationsProjection(observation);
    expect(formatPublicCount(projection.autonomous_operating_hours)).toBe("UNKNOWN");
    expect(formatPublicCount(projection.autonomous_operating_hours)).not.toBe("0");
  });

  it("10-12. public statuses map correctly and idle agents do not work-animate", () => {
    expect(agentMotion("ACTIVE")).toBe("working");
    expect(agentMotion("IDLE")).toBe("idle");
    expect(evaluatePublicAgentAnimationTruthGate({ agentStatus: "IDLE", motion: "idle" }).result).toBe("PASS");
    expect(evaluatePublicAgentAnimationTruthGate({ agentStatus: "IDLE", motion: "working" }).result).toBe("FAIL");
    expect(evaluatePublicAgentAnimationTruthGate({ agentStatus: "ACTIVE", motion: "working" }).result).toBe("PASS");
  });

  it("13-14. failure and loading states stay sanitized without fake metrics", () => {
    const loading = readFileSync(ROOM, "utf8");
    expect(loading).toContain("Loading public operations");
    expect(loading).not.toMatch(/Agents Active<\/p>\s*<p[^>]*>0/);
    const degraded = readFileSync("components/public/operations-room/public-degraded-state.tsx", "utf8");
    expect(degraded).toContain("Operations are updating");
    expect(degraded).not.toMatch(/stack|ENOENT|ECONNREFUSED/i);
  });

  it("15-20. public activity is generic and private/customer/financial/provider/infra text never renders", () => {
    const { markup } = renderMarkup();
    expect(markup).toContain("Monitoring active campaigns");
    expect(evaluatePublicOperationsRoomDOMPrivacyGate(markup).result).toBe("PASS");
    expect(markup).not.toContain("First Outbound Validation");
    expect(markup).not.toContain("john@example.com");
    expect(markup).not.toContain("$50");
    expect(markup).not.toContain("sk_live");
    expect(markup).not.toContain("BUILD_ID");
  });

  it("21-22. mobile layout is separate and reduced motion is supported", () => {
    const css = readFileSync(CSS, "utf8");
    const floor = readFileSync("components/public/operations-room/operations-floor.tsx", "utf8");
    expect(floor).toContain('data-room-layout="mobile"');
    expect(floor).toContain('data-room-layout="desktop"');
    expect(css).toContain("prefers-reduced-motion");
    expect(evaluatePublicOperationsResponsiveGate({
      desktopFloor: true,
      tabletSpatial: true,
      mobileCards: true,
      mobileUsesDesktopFloor: false,
    }).result).toBe("PASS");
  });

  it("23. public route has no mutation controls", () => {
    const page = readFileSync(PAGE, "utf8") + readFileSync(ROOM, "utf8");
    expect(page).not.toMatch(/create mission|trigger tick|deploy|send outreach/i);
    expect(page).not.toContain("method=\"post\"");
  });

  it("24. public venture links only from approved projection", () => {
    const { projection } = renderMarkup();
    const occupancy = projection.public_ventures.find((row) => row.public_name === "OccupancyNPV");
    expect(occupancy?.public_url).toBe("https://occupancynpv.com");
    expect(readFileSync("components/public/operations-room/public-venture-grid.tsx", "utf8")).toContain("venture.public_url");
  });

  it("25. footer links are valid public paths", () => {
    const footer = readFileSync(FOOTER, "utf8");
    expect(footer).toContain("/public/privacy");
    expect(footer).toContain("/public/terms");
    expect(footer).toContain("/public/sitemap.xml");
    expect(footer).toContain("By IMR");
  });

  it("26-29. public page is independent of HQ auth and does not change HQ/runtime/loop", () => {
    const joined = `${readFileSync(PAGE, "utf8")}\n${readFileSync(ROOM, "utf8")}`;
    expect(joined).not.toContain("createClient");
    expect(joined).not.toContain("getOperatorOrgContext");
    expect(joined).not.toContain("executeAutonomousDailyOperatingLoop");
    expect(joined).not.toContain("/dashboard");
    expect(evaluatePublicOperationsRoomDataBoundaryGate({ sources: uiSources() }).result).toBe("PASS");
  });

  it("30. tests do not mutate production state", () => {
    expect(process.env.INFINITY_CANONICAL_WORK_PERSIST).not.toBe("1");
    expect(process.env.INFINITY_AUTONOMOUS_LOOP_PERSIST).not.toBe("1");
    expect(PUBLIC_OPERATIONS_ROOM_ROUTE).toBe("/public/operations-room");
  });

  it("evaluates accessibility and browser runtime contracts", () => {
    expect(evaluatePublicOperationsAccessibilityGate({
      hasHeadings: true,
      hasTextEquivalents: true,
      reducedMotion: true,
      ariaLive: true,
    }).result).toBe("PASS");
    expect(evaluatePublicOperationsBrowserRuntimeGate({
      overflow: false,
      consoleErrors: [],
      privateRequests: [],
    }).result).toBe("PASS");
    const { projection } = renderMarkup();
    expect(evaluatePublicOperationsRoomTruthGate({
      renderedActive: String(projection.active_public_agents),
      renderedIdle: String(projection.idle_public_agents),
      projection,
      loadingHasNumericFake: false,
    }).result).toBe("PASS");
  });
});
