import { createElement } from "react";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InspectionContextBar } from "@/components/dashboard/operator-console/inspection-context-bar";
import { VentureIntelligencePanel } from "@/components/dashboard/operator-console/venture-intelligence-panel";
import { EMPTY_INSPECTION_CONTEXT, type HqInspectionContext } from "@/lib/infinity/operator-console/inspection-context";
import { HQ_DESKTOP_REGION_ORDER } from "@/lib/infinity/operator-console/hq-infrastructure-priority";
import { HQ_WELCOME_TITLE } from "@/lib/infinity/operator-console/room-naming";
import { fromCanonicalVenture } from "@/lib/infinity/venture-intelligence";
import { buildVentureIntelligenceEntityDetail, ventureIntelligenceArtifact } from "@/lib/infinity/venture-intelligence/entity-detail";
import { emptyPerformanceInput } from "@/lib/infinity/venture-intelligence/adapters/from-performance-intelligence";

const ROOT = join(process.cwd());

function read(relative: string): string {
  return readFileSync(join(ROOT, relative), "utf8");
}

const CANDIDATE: HqInspectionContext = {
  status: "ACTIVE",
  entityType: "OPPORTUNITY_CANDIDATE",
  entityId: "b541ad42-0c49-4ce1-bbfe-398b30d90f04",
  displayName: "Mobile-First Change Order Authorization Tool",
  origin: "Opportunity Discovery",
  stage: "Complete",
  source: "EXPLICIT",
  explicit: true,
};

describe("CANONICAL VENTURE INTELLIGENCE SHELL + HQ HIERARCHY V1", () => {
  it("keeps the verified mount path and embedded layout fix", () => {
    const page = read("app/dashboard/ventures/[ventureId]/page.tsx");
    const experience = read("components/dashboard/operator-console/infinity-hq-experience.tsx");
    const consoleSource = read("components/dashboard/operator-console/venture-operator-console.tsx");
    const panel = read("components/dashboard/operator-console/venture-intelligence-panel.tsx");
    const css = read("app/globals.css");
    expect(page).toContain("presentCanonicalVentureIntelligence");
    expect(experience).toContain("presentCanonicalVentureIntelligence");
    expect(consoleSource).toContain("<VentureIntelligencePanel");
    expect(consoleSource).not.toContain("intelligenceDetail && intelligenceArtifact");
    expect(consoleSource).not.toMatch(/view === "hq"[\s\S]{0,80}<VentureIntelligencePanel/);
    expect(panel).toContain("HQOutputDetail");
    expect(panel).toContain("embedded");
    expect(css).toContain(".hq-output-detail--embedded");
    expect(css).toContain("flex: 0 0 auto");
    expect(css).toContain("overflow: visible");
  });

  it("renders Infinity OS, Ask Infinity, HQ Command and Rooms, then venture intelligence", () => {
    const bar = read("components/dashboard/operator-console/venture-command-bar.tsx");
    const hero = read("components/dashboard/operator-console/infinity-os-hero.tsx");
    const consoleSource = read("components/dashboard/operator-console/venture-operator-console.tsx");
    expect(HQ_WELCOME_TITLE).toBe("Infinity OS");
    expect(hero).toContain('data-hq-region="welcome"');
    expect(hero).toContain('data-hq-region="ask-infinity"');
    expect(hero).toContain('data-hq-region="global-controls"');
    expect(bar).toContain("Submit Idea");
    expect(bar).toContain("HqCopilotDock");
    expect(bar).not.toContain("Welcome to Infinity OS");
    expect(bar).not.toContain("VentureSelector");
    expect(bar).not.toContain("InspectionContextBar");
    expect(bar).not.toContain("departmentStateLabel");
    const welcome = hero.indexOf('data-hq-region="welcome"');
    const ask = hero.indexOf('data-hq-region="ask-infinity"');
    const command = consoleSource.indexOf('data-hq-region="command"');
    const rooms = consoleSource.indexOf("<HqSpatialFloor");
    const inspect = consoleSource.indexOf("<InspectionContextBar");
    const intel = consoleSource.indexOf("<VentureIntelligencePanel");
    expect(welcome).toBeGreaterThan(-1);
    expect(ask).toBeGreaterThan(welcome);
    expect(command).toBeGreaterThan(consoleSource.indexOf("<VentureCommandBar"));
    expect(rooms).toBeGreaterThan(command);
    expect(inspect).toBeGreaterThan(rooms);
    expect(intel).toBeGreaterThan(inspect);
    expect(HQ_DESKTOP_REGION_ORDER[0]).toBe("welcome");
    expect(HQ_DESKTOP_REGION_ORDER[1]).toBe("ask-infinity");
    expect(HQ_DESKTOP_REGION_ORDER[2]).toBe("financial-pulse");
    expect(HQ_DESKTOP_REGION_ORDER[3]).toBe("command");
    expect(HQ_DESKTOP_REGION_ORDER[4]).toBe("compact-operating-summary");
    expect(HQ_DESKTOP_REGION_ORDER[5]).toBe("operating-floor");
    expect(HQ_DESKTOP_REGION_ORDER[6]).toBe("inspecting");
    expect(HQ_DESKTOP_REGION_ORDER[7]).toBe("venture-intelligence");
    expect(HQ_DESKTOP_REGION_ORDER[8]).toBe("financial-truth");
  });

  it("groups selector, status, and clear inspection with the local venture context", () => {
    const html = renderToStaticMarkup(
      createElement(InspectionContextBar, {
        context: CANDIDATE,
        onClear: () => undefined,
        overallStatus: "Complete",
        canonicalVenture: {
          name: "Autonomous Venture Cycle",
          id: "240032f1-18c2-4fb4-8b63-60e013f9174c",
          originLabel: "first_autonomous_venture_cycle_v1",
        },
        identity: {
          description: "Mobile-first change-order authorization software for contractors and field teams.",
          sourceLabel: "Opportunity candidate",
          businessCase: "Needs more evidence",
          stageLabel: "Complete",
          buildReadiness: "Not ready",
          candidateId: "b541ad42-0c49-4ce1-bbfe-398b30d90f04",
        },
        selector: createElement("div", { "data-testid": "venture-selector" }, "selector"),
      }),
    );
    expect(html).toContain("NOW INSPECTING");
    expect(html).toContain("<h2");
    expect(html).toContain("Mobile-First Change Order Authorization Tool");
    expect(html).toContain("Opportunity Candidate");
    expect(html).toContain("Mobile-first change-order authorization software for contractors and field teams.");
    expect(html).toContain("Business case");
    expect(html).toContain("Needs more evidence");
    expect(html).toContain("Clear inspection");
    expect(html).toContain('data-testid="venture-selector"');
    expect(html).toContain("Canonical venture");
    expect(html).toContain("Autonomous Venture Cycle");
    expect(html).toContain("Technical IDs");
    expect(html.indexOf("NOW INSPECTING")).toBeLessThan(html.indexOf("Canonical venture"));
    expect(html.indexOf("hq-venture-identity-banner")).toBeGreaterThan(-1);
    expect(html).toContain('data-hq-region="inspecting"');
  });

  it("does not duplicate canonical venture when the inspected object is that venture", () => {
    const html = renderToStaticMarkup(
      createElement(InspectionContextBar, {
        context: {
          status: "ACTIVE",
          entityType: "VENTURE",
          entityId: "240032f1-18c2-4fb4-8b63-60e013f9174c",
          displayName: "executive_selection_e2e_v1 strong_in_policy",
          origin: "Live venture",
          stage: "Complete",
          source: "VENTURE",
          explicit: false,
        },
        onClear: () => undefined,
        overallStatus: "Complete",
        canonicalVenture: {
          name: "executive_selection_e2e_v1 strong_in_policy",
          id: "240032f1-18c2-4fb4-8b63-60e013f9174c",
        },
      }),
    );
    expect(html).toContain("NOW INSPECTING");
    expect(html).not.toContain("Canonical venture");
    expect(html).not.toContain("Clear inspection");
  });

  it("uses NOW INSPECTING when intelligence is shown without a separate inspect query", () => {
    const html = renderToStaticMarkup(
      createElement(InspectionContextBar, {
        context: EMPTY_INSPECTION_CONTEXT,
        onClear: () => undefined,
        overallStatus: "In progress",
        canonicalVenture: {
          name: "executive_selection_e2e_v1 strong_in_policy",
          id: "240032f1-18c2-4fb4-8b63-60e013f9174c",
        },
      }),
    );
    expect(html).toContain("NOW INSPECTING");
    expect(html).toContain("executive_selection_e2e_v1 strong_in_policy");
    expect(html).not.toContain("CURRENT VENTURE");
  });

  it("keeps Command Deck after intelligence tabs and does not hide sparse ventures", () => {
    const view = fromCanonicalVenture({
      ventureId: "240032f1-18c2-4fb4-8b63-60e013f9174c",
      organizationId: "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494",
      name: "executive_selection_e2e_v1 strong_in_policy",
      origin: "first_autonomous_venture_cycle_v1",
      assemblyStatus: "internally_ready",
      readinessStatus: "internally_ready",
      launchStage: "live",
      opportunityId: "candidate-1",
      buildId: "build-1",
      productionArtifactId: "artifact-1",
      identityPackage: { workingName: "WorkflowPilot" },
      businessModelPackage: {},
      monetizationPackage: {},
      candidate: null,
      monetizationPlan: null,
      performance: emptyPerformanceInput(),
      departmentStates: [],
    });
    const html = renderToStaticMarkup(
      createElement(VentureIntelligencePanel, {
        detail: buildVentureIntelligenceEntityDetail(view),
        artifact: ventureIntelligenceArtifact(view),
        error: null,
      }),
    );
    expect(html.indexOf("Venture Intelligence")).toBeLessThan(html.indexOf("data-hq-intelligence-tabs"));
    expect(html.indexOf("data-hq-intelligence-tabs")).toBeLessThan(html.indexOf("Venture Command Deck"));
    expect(html).toContain("hq-output-detail--embedded");
    expect(html).not.toContain("h-full min-h-0 flex-col");
    expect(html).not.toContain("Welcome to Infinity OS");
    expect(html).not.toContain("NOW INSPECTING");
    expect(html).toContain("Current Position");
    expect(html).toContain("What Infinity Recommends Next");
    expect(html).toContain("Systems This Venture Needs");
    expect(html).toContain("Economics");
  });

  it("preserves dashboard inspect and ventureId routes on the same shell", () => {
    const page = read("app/dashboard/page.tsx");
    const venturePage = read("app/dashboard/ventures/[ventureId]/page.tsx");
    const experience = read("components/dashboard/operator-console/infinity-hq-experience.tsx");
    expect(page).toContain("InfinityHqExperience");
    expect(page).toContain("preferredVentureId");
    expect(venturePage).toContain("VentureOperatorConsole");
    expect(venturePage).toContain("alwaysShowVentureIntelligence");
    expect(experience).toContain("VentureOperatorConsole");
    expect(experience).toContain("intelligenceDetail={intelligence.detail}");
    expect(experience).not.toContain("alwaysShowVentureIntelligence");
  });

  it("preserves Founder CommandDeckBody without a second OS header or height collapse", () => {
    const founder = read("components/dashboard/founder-ideas/founder-idea-lab.tsx");
    const detail = read("components/dashboard/operator-console/artifacts/hq-output-detail.tsx");
    expect(founder).toContain("HQOutputDetail");
    expect(founder).toContain("embedded");
    expect(founder).not.toContain("HQ_WELCOME_TITLE");
    expect(founder).not.toContain("VentureCommandBar");
    expect(detail).toContain("function CommandDeckBody");
    expect(detail.match(/function CommandDeckBody/g)?.length).toBe(1);
  });

  it("does not reorder HQ below inspecting on mobile", () => {
    const consoleSource = read("components/dashboard/operator-console/venture-operator-console.tsx");
    const bar = read("components/dashboard/operator-console/venture-command-bar.tsx");
    expect(consoleSource).not.toMatch(/md:order-|order-\d/);
    expect(bar).not.toMatch(/md:order-|order-\d/);
    expect(consoleSource).toContain("overflow-x-hidden");
  });
});

const LIVE_ORG = "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
const LIVE_BUILT_ID = "240032f1-18c2-4fb4-8b63-60e013f9174c";

function loadEnvLocal(): boolean {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return false;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep <= 0) continue;
    const key = trimmed.slice(0, sep);
    if (process.env[key] == null) process.env[key] = trimmed.slice(sep + 1).trim().replace(/^["']|["']$/g, "");
  }
  return true;
}

describe("CANONICAL VENTURE INTELLIGENCE SHELL + HQ HIERARCHY V1 — live DOM", () => {
  it(
    "keeps the live non-Founder Command Deck in the production panel",
    async () => {
      if (!loadEnvLocal() || !process.env.NEXT_PUBLIC_SUPABASE_URL) return;
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const { loadOperatorVentureSnapshot } = await import("@/lib/infinity/operator-console");
      const { presentCanonicalVentureIntelligence } = await import("@/lib/infinity/venture-intelligence/present");
      const admin = createAdminClient();
      const snapshot = await loadOperatorVentureSnapshot(admin, LIVE_ORG, LIVE_BUILT_ID);
      expect(snapshot).toBeTruthy();
      const presented = await presentCanonicalVentureIntelligence(admin, snapshot!);
      const html = renderToStaticMarkup(
        createElement(VentureIntelligencePanel, {
          detail: presented.detail,
          artifact: presented.artifact,
          error: presented.error,
        }),
      );
      expect(html).toContain("Venture Command Deck");
      expect(html).toContain("Current Position");
      expect(html).toContain("What Infinity Recommends Next");
      expect(html).toContain("Systems This Venture Needs");
      expect(html).toContain("Economics");
      expect(html).toContain("hq-output-detail--embedded");
    },
    30000,
  );
});
