import { createElement } from "react";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VentureIntelligencePanel } from "@/components/dashboard/operator-console/venture-intelligence-panel";
import { fromCanonicalVenture } from "@/lib/infinity/venture-intelligence";
import { buildVentureIntelligenceEntityDetail, ventureIntelligenceArtifact } from "@/lib/infinity/venture-intelligence/entity-detail";
import { emptyPerformanceInput } from "@/lib/infinity/venture-intelligence/adapters/from-performance-intelligence";
import type { CanonicalVentureAdapterInput } from "@/lib/infinity/venture-intelligence/types";

const ROOT = join(process.cwd());

function read(relative: string): string {
  return readFileSync(join(ROOT, relative), "utf8");
}

function sparseInput(): CanonicalVentureAdapterInput {
  return {
    ventureId: "240032f1-18c2-4fb4-8b63-60e013f9174c",
    organizationId: "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494",
    name: "240032f1-18c2-4fb4-8b63-60e013f9174c",
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
    candidate: {
      id: "candidate-1",
      title: "WorkflowPilot",
      summary: "Route work automatically.",
      problem: "Manual handoffs stall delivery",
      targetCustomer: "Operations managers",
      market: "B2B",
      businessModelCandidates: ["subscription"],
      revenueMechanismCandidates: [],
      demandEvidence: [],
      marketEvidence: [],
      monetizationEvidence: [],
      distributionEvidence: [],
      buildabilityEvidence: [],
      competitionEvidence: [],
      researchSources: [],
      researchRunIds: [],
      risks: [],
      unknowns: ["CAC"],
    },
    monetizationPlan: null,
    performance: emptyPerformanceInput(),
    departmentStates: [],
  };
}

describe("CANONICAL VENTURE INTELLIGENCE FRONT-END INTEGRATION V1", () => {
  it("mounts VentureIntelligencePanel from the real ventureId route and the HQ shell", () => {
    const page = read("app/dashboard/ventures/[ventureId]/page.tsx");
    const experience = read("components/dashboard/operator-console/infinity-hq-experience.tsx");
    const consoleSource = read("components/dashboard/operator-console/venture-operator-console.tsx");
    expect(page).toContain("presentCanonicalVentureIntelligence");
    expect(page).toContain("intelligenceDetail={intelligence.detail}");
    expect(page).toContain("const { ventureId } = await params");
    expect(page).not.toMatch(/FounderIdea/);
    expect(experience).toContain("presentCanonicalVentureIntelligence");
    expect(experience).toContain("intelligenceDetail={intelligence.detail}");
    expect(consoleSource).toContain("<VentureIntelligencePanel");
    expect(consoleSource.match(/<VentureIntelligencePanel/g)?.length).toBe(1);
    expect(page).not.toContain("<VentureIntelligencePanel");
    expect(consoleSource).not.toContain("intelligenceDetail && intelligenceArtifact");
    expect(consoleSource).toMatch(/<VentureIntelligencePanel[\s\S]{0,180}detail=\{intelligenceDetail\}/);
    expect(read("components/dashboard/operator-console/system-view.tsx")).toContain("intelligenceError");
  });

  it("renders the Command Deck by default for a non-Founder venture with sparse economics", () => {
    const view = fromCanonicalVenture(sparseInput());
    const detail = buildVentureIntelligenceEntityDetail(view);
    const artifact = ventureIntelligenceArtifact(view);
    const html = renderToStaticMarkup(createElement(VentureIntelligencePanel, { detail, artifact, error: null }));
    expect(html).toContain("data-testid=\"venture-intelligence-panel\"");
    expect(html).toContain("Venture Command Deck");
    expect(html).toContain("Current Position");
    expect(html).toContain("What Infinity Recommends Next");
    expect(html).toContain("Systems This Venture Needs");
    expect(html).toContain("What Infinity Already Has");
    expect(html).toContain("What This Venture Still Needs");
    expect(html).toContain("Market Advantage");
    expect(html).toContain("Economics");
    expect(html).toMatch(/No reliable estimate yet|Not applicable at this stage|Not measured yet/);
    expect(html).toContain("hq-output-detail--embedded");
    expect(html).toContain("infinity-holographic-surface");
    expect(html).toContain("infinity-command-deck");
    expect(html).toContain("infinity-data-grid");
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain(">Intelligence<");
    expect(html).not.toContain("h-full min-h-0 flex-col");
    expect(detail.availableTabs[0]).toBe("intelligence");
  });

  it("does not hide the panel when canonical intelligence is missing", () => {
    const html = renderToStaticMarkup(
      createElement(VentureIntelligencePanel, { detail: null, artifact: null, error: "LOAD_FAILED" }),
    );
    expect(html).toContain("data-testid=\"venture-intelligence-panel\"");
    expect(html).toContain("Venture intelligence is still being assembled.");
    expect(html).toContain("LOAD_FAILED");
  });

  it("uses a single HQOutputDetail Command Deck for Founder and non-Founder", () => {
    const ui = read("components/dashboard/operator-console/artifacts/hq-output-detail.tsx");
    expect(ui).toContain("function CommandDeckBody");
    expect(ui.match(/function CommandDeckBody/g)?.length).toBe(1);
    expect(read("components/dashboard/operator-console/venture-intelligence-panel.tsx")).toContain("HQOutputDetail");
    expect(read("lib/infinity/founder-idea-lab/hq/founder-intelligence-primary.ts")).toContain("commandDeckInspectorSection");
    expect(read("components/dashboard/founder-ideas/founder-idea-lab.tsx")).toContain("HQOutputDetail");
    expect(read("components/dashboard/founder-ideas/founder-idea-lab.tsx")).toContain("embedded");
  });

  it("keeps the venture route keyed by ventureId", () => {
    const page = read("app/dashboard/ventures/[ventureId]/page.tsx");
    expect(page).toContain("params: Promise<{ ventureId: string }>");
    expect(page).toContain("loadHqDashboardContext(admin, orgContext.organizationId, ventureId)");
    expect(page).toContain("snapshot?.venture.ventureAssemblyId !== ventureId");
    expect(page).toContain("loadOperatorVentureSnapshot(admin, orgContext.organizationId, ventureId)");
  });
});

const LIVE_ORG = "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
const LIVE_BUILT_ID = "240032f1-18c2-4fb4-8b63-60e013f9174c";
const LIVE_CMS_ID = "69d45f14-ca07-4a30-b601-54af6d05953f";

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

describe("CANONICAL VENTURE INTELLIGENCE FRONT-END INTEGRATION V1 — live DOM", () => {
  it(
    "renders the live non-Founder venture Command Deck into HTML",
    async () => {
      if (!loadEnvLocal() || !process.env.NEXT_PUBLIC_SUPABASE_URL) return;
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const { loadOperatorVentureSnapshot } = await import("@/lib/infinity/operator-console");
      const { presentCanonicalVentureIntelligence } = await import("@/lib/infinity/venture-intelligence/present");
      const admin = createAdminClient();
      const snapshot = await loadOperatorVentureSnapshot(admin, LIVE_ORG, LIVE_BUILT_ID);
      expect(snapshot).toBeTruthy();
      expect(snapshot!.venture.ventureAssemblyId).toBe(LIVE_BUILT_ID);
      const presented = await presentCanonicalVentureIntelligence(admin, snapshot!);
      expect(presented.error).toBeNull();
      expect(presented.detail).toBeTruthy();
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
      expect(html).toContain("Market Advantage");
      expect(html).toContain("hq-output-detail--embedded");
      writeFileSync("C:/Users/Antivist/AppData/Local/Temp/infinity-venture-intelligence-live.html", html);
      // eslint-disable-next-line no-console
      console.log(
        JSON.stringify({
          identity: presented.detail?.title,
          source: presented.detail?.subtitle,
          visibleCommandDeck: html.includes("Venture Command Deck"),
          visiblePosition: html.includes("Current Position"),
          visibleNext: html.includes("What Infinity Recommends Next"),
          visibleSystems: html.includes("Systems This Venture Needs"),
          visibleEconomics: html.includes("Economics"),
          visibleMarket: html.includes("Market Advantage"),
          holographic: html.includes("infinity-holographic-surface"),
          neonTable: html.includes("infinity-data-grid"),
          commandDeckClass: html.includes("infinity-command-deck"),
        }),
      );
    },
    30000,
  );

  it("keeps Founder Idea Command Deck labels on HQOutputDetail", () => {
    const ui = read("components/dashboard/operator-console/artifacts/hq-output-detail.tsx");
    const sections = read("lib/infinity/venture-intelligence/hq-sections.ts");
    const founder = read("lib/infinity/founder-idea-lab/hq/founder-intelligence-primary.ts");
    expect(sections).toContain('title: "Venture Command Deck"');
    expect(founder).toContain("commandDeckInspectorSection");
    expect(ui).toContain("Current Position");
    expect(ui).toContain("What Infinity Recommends Next");
    expect(LIVE_CMS_ID).toMatch(/^[0-9a-f-]{36}$/);
  });
});
