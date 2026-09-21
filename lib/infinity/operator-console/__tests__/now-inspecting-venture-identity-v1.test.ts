import { createElement } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InspectionContextBar } from "@/components/dashboard/operator-console/inspection-context-bar";
import type { HqInspectionContext } from "../inspection-context";
import {
  inspectedIdentityFromDetail,
  usefulVentureDescription,
  VENTURE_DESCRIPTION_FALLBACK,
} from "../inspected-venture-identity";
import { fromCanonicalVenture } from "@/lib/infinity/venture-intelligence";
import { buildVentureIntelligenceEntityDetail } from "@/lib/infinity/venture-intelligence/entity-detail";
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

describe("NOW INSPECTING VENTURE IDENTITY BANNER V1", () => {
  it("makes the venture name the dominant local heading and keeps HQ order", () => {
    const css = read("app/globals.css");
    const consoleSource = read("components/dashboard/operator-console/venture-operator-console.tsx");
    const hero = read("components/dashboard/operator-console/infinity-os-hero.tsx");
    expect(hero).toContain("<h1 className=\"hq-os-hero-title\">");
    expect(css).toContain(".hq-venture-identity-banner .hq-inspection-name");
    expect(css).toContain("clamp(1.35rem, 3.1vw, 1.85rem)");
    expect(css).toContain("clamp(1.7rem, 3.6vw, 2.4rem)");
    expect(consoleSource.indexOf("<HqSpatialFloor")).toBeLessThan(consoleSource.indexOf("<InspectionContextBar"));
    expect(consoleSource.indexOf("<InspectionContextBar")).toBeLessThan(consoleSource.indexOf("<VentureIntelligencePanel"));
    expect(consoleSource).toContain("inspectedIdentityFromDetail(intelligenceDetail)");
    expect(consoleSource).toContain("Select a venture from Command to inspect it.");
  });

  it("renders source, labeled statuses, description, grouped controls, and secondary IDs", () => {
    const html = renderToStaticMarkup(
      createElement(InspectionContextBar, {
        context: CANDIDATE,
        onClear: () => undefined,
        canonicalVenture: {
          name: "Autonomous Venture Cycle",
          id: "240032f1-18c2-4fb4-8b63-60e013f9174c",
        },
        identity: {
          description: "Mobile-first change-order authorization software for contractors and field teams.",
          sourceLabel: "Opportunity candidate",
          businessCase: "Needs more evidence",
          stageLabel: "Validate — evidence exists, economics still need proof",
          buildReadiness: "Validation first",
          candidateId: "b541ad42-0c49-4ce1-bbfe-398b30d90f04",
        },
        selector: createElement("div", { "data-testid": "venture-selector" }, "selector"),
      }),
    );
    expect(html).toContain('data-hq-venture-identity="true"');
    expect(html).toMatch(/<h2[^>]*>Mobile-First Change Order Authorization Tool<\/h2>/);
    expect(html).toContain("Opportunity candidate");
    expect(html).toContain("Business case");
    expect(html).toContain("Build readiness");
    expect(html).toContain("Stage");
    expect(html).toContain("Mobile-first change-order authorization software for contractors and field teams.");
    expect(html).toContain("Technical IDs");
    expect(html.indexOf("Mobile-First Change Order Authorization Tool")).toBeLessThan(html.indexOf("Technical IDs"));
    expect(html.indexOf("hq-inspection-bar-actions")).toBeGreaterThan(html.indexOf("hq-inspection-name"));
    expect(html).toContain('data-testid="venture-selector"');
    expect(html).toContain("Clear inspection");
    expect(html).toContain("Canonical venture");
    expect(html).toContain("related canonical venture");
  });

  it("does not fabricate a description and keeps compact empty-state copy on HQ", () => {
    expect(usefulVentureDescription("Not evidenced yet")).toBeNull();
    expect(usefulVentureDescription("Looks promising. Design — architecture. Next: validate pricing.")).toBeNull();
    expect(usefulVentureDescription("Mobile-first change-order authorization software for contractors.")).toMatch(/contractors/);
    const html = renderToStaticMarkup(
      createElement(InspectionContextBar, {
        context: CANDIDATE,
        onClear: () => undefined,
        identity: { description: "Not evidenced yet" },
      }),
    );
    expect(html).toContain(VENTURE_DESCRIPTION_FALLBACK);
    expect(html).not.toContain("Not evidenced yet");
    const consoleSource = read("components/dashboard/operator-console/venture-operator-console.tsx");
    expect(consoleSource).toContain("data-hq-venture-placeholder");
    expect(consoleSource).toContain("Select a venture from Command to inspect it.");
  });

  it("reads canonical intelligence into the banner without changing lineage meaning", () => {
    const view = fromCanonicalVenture({
      ventureId: "240032f1-18c2-4fb4-8b63-60e013f9174c",
      organizationId: "org",
      name: "WorkflowPilot",
      origin: "autonomous_discovery",
      assemblyStatus: "assembled",
      readinessStatus: "needs_review",
      launchStage: null,
      opportunityId: "opp",
      opportunityCandidateId: "candidate-1",
      buildId: null,
      productionArtifactId: null,
      identityPackage: { workingName: "WorkflowPilot", opportunityCandidateId: "candidate-1" },
      businessModelPackage: {},
      monetizationPackage: {},
      candidate: {
        id: "candidate-1",
        title: "WorkflowPilot",
        summary: "Route work automatically for operations teams.",
        problem: "Manual handoffs stall delivery",
        targetCustomer: "Operations managers",
        market: "B2B",
        businessModelCandidates: ["subscription"],
        revenueMechanismCandidates: [],
        demandEvidence: ["Teams pay for workflow routing today."],
        marketEvidence: [],
        monetizationEvidence: [],
        distributionEvidence: [],
        buildabilityEvidence: [],
        competitionEvidence: ["Current tools are rigid and slow to change."],
        researchSources: [],
        researchRunIds: [],
        risks: [],
        unknowns: [],
      },
      monetizationPlan: {
        estimatedPriceBase: 99,
        estimatedRevenuePerCustomer: 99,
        estimatedCAC: 250,
        estimatedLTV: 1200,
        estimatedGrossMarginPercent: 70,
        contributionMarginPerCustomer: 60,
        ltvCacRatio: 4.8,
        estimatedMonthsToBreakEven: 5,
        customerType: "Operations managers",
        valueProposition: "Automated workflow routing",
        offerDescription: "Monthly operations software",
        pricingModel: "Monthly software subscription",
        modelName: "SaaS subscription",
        risks: [],
      },
      performance: emptyPerformanceInput(),
      departmentStates: [],
    });
    const detail = buildVentureIntelligenceEntityDetail(view);
    const identity = inspectedIdentityFromDetail(detail);
    expect(detail.concept).toMatch(/operations|workflow/i);
    expect(identity.sourceLabel).toBe(view.sourceContext.badge);
    expect(identity.businessCase).toBe(view.businessCase.label);
    expect(identity.stageLabel).toBe(view.currentPosition.label);
    expect(identity.candidateId).toBe("candidate-1");
    const html = renderToStaticMarkup(
      createElement(InspectionContextBar, {
        context: {
          status: "ACTIVE",
          entityType: "VENTURE",
          entityId: view.identity.ventureId,
          displayName: view.identity.name,
          origin: view.sourceContext.badge,
          stage: view.currentPosition.step,
          source: "VENTURE",
          explicit: true,
        },
        onClear: () => undefined,
        identity,
      }),
    );
    expect(html).toContain(view.identity.name);
    expect(html).toContain(view.sourceContext.badge);
    expect(html).not.toContain("Canonical venture");
  });

  it("keeps mobile wrapping and does not make the full banner sticky", () => {
    const css = read("app/globals.css");
    expect(css).toContain("@media (max-width: 720px)");
    expect(css).toContain(".hq-venture-identity-banner .hq-inspection-bar-actions");
    expect(css).not.toMatch(/\.hq-venture-identity-banner[^{]*\{[^}]*position:\s*sticky/);
    expect(read("components/dashboard/operator-console/inspection-context-bar.tsx")).not.toContain("position: sticky");
  });
});
