import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ASKREVIEW_CANDIDATE_ID, ASKREVIEW_VENTURE_ID, OCCUPANCYNPV_CANDIDATE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { evaluateHQVentureSelectionAuthorityContract } from "@/lib/infinity/hq-venture-selection";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { buildLiveVentureRadarArtifacts } from "@/lib/infinity/opportunity-universe-hq/radar-artifacts";
import { makeCanonicalOpportunityRecord } from "@/lib/infinity/opportunity-universe-hq/project";
import {
  HQ_OPPORTUNITY_ORB,
  HQ_VISUAL_DESIGN_INTENT_GATE,
  VENTURE_RADAR_CIRCULAR_GEOMETRY_GATE,
  VENTURE_RADAR_OPPORTUNITY_CONTENT_GATE,
  VENTURE_RADAR_ORB_READABILITY_GATE,
  VENTURE_RADAR_SELECTION_VISIBILITY_GATE,
  buildOpportunityOrbPresentation,
  evaluateHQVisualDesignIntentGate,
  evaluateVentureRadarCircularGeometryGate,
  evaluateVentureRadarOpportunityContentGate,
  evaluateVentureRadarOrbReadabilityGate,
  evaluateVentureRadarResponsiveOrbGrid,
  evaluateVentureRadarSelectionVisibilityGate,
  hqPresentationClassName,
  shortOpportunityLabel,
  usesCircularFloorOutput,
} from "../index";

const ROOT = process.cwd();

function topRecord(input: {
  candidateId: string;
  name: string;
  rank: number;
  selectedVenture?: boolean;
  lifecycle?: "SELECTED" | "SHORTLISTED" | "SCORED";
  opportunityScore?: number | "UNKNOWN";
  monetizationScore?: number | "UNKNOWN";
}) {
  return makeCanonicalOpportunityRecord({
    candidateId: input.candidateId,
    name: input.name,
    liveRank: input.rank,
    rank: input.rank,
    opportunityScore: input.opportunityScore ?? 85.8,
    monetizationScore: input.monetizationScore ?? 80.7,
    lifecycle: input.lifecycle ?? (input.selectedVenture ? "SELECTED" : "SCORED"),
    selectedVenture: input.selectedVenture ?? false,
    inLiveTop10: true,
    eligibleForLiveRanking: true,
  });
}

describe("VentureRadar circular opportunity nodes", () => {
  it("keeps the universe summary as a non-circular control card", () => {
    const artifacts = buildLiveVentureRadarArtifacts({
      organizationId: "org",
      createdAt: "2026-09-10T00:00:00.000Z",
      discoveryState: "COMPLETE",
      universeCount: 133,
      liveTop10: [
        topRecord({ candidateId: OCCUPANCYNPV_CANDIDATE_ID, name: "OccupancyNPV", rank: 1, selectedVenture: true }),
        topRecord({ candidateId: ASKREVIEW_CANDIDATE_ID, name: "AskReview", rank: 2, selectedVenture: true }),
      ],
    });
    expect(artifacts[0]?.metadata.universe).toBe(true);
    expect(artifacts[0]?.title).toContain("133");
    expect(artifacts[0]?.subtitle).toMatch(/2 currently top-ranked/);
    expect(usesCircularFloorOutput(artifacts[0]!.artifactType, artifacts[0]!.sourceRecordType, artifacts[0]!.metadata)).toBe(false);
    expect(usesCircularFloorOutput(artifacts[1]!.artifactType, artifacts[1]!.sourceRecordType, artifacts[1]!.metadata)).toBe(true);
    expect(hqPresentationClassName(HQ_OPPORTUNITY_ORB)).toBe("hq-opportunity-orb");
  });

  it("exposes rank, score, title, monetization UNKNOWN, and selection state", () => {
    const presentation = buildOpportunityOrbPresentation({
      title: "Commercial Real Estate (CRE) Lease Comparison & NPV Calculator",
      rank: 1,
      opportunityScore: 85.8,
      monetizationScore: "UNKNOWN",
      selected: true,
      lifecycle: "SELECTED",
    });
    expect(presentation.rankLabel).toBe("#1");
    expect(presentation.scoreLabel).toBe("85.8");
    expect(presentation.fullTitle).toContain("Lease Comparison");
    expect(presentation.shortTitle.length).toBeLessThan(presentation.fullTitle.length);
    expect(presentation.monetizationLabel).toBe("Mon UNKNOWN");
    expect(presentation.stateLabel).toBe("SELECTED");
    expect(
      evaluateVentureRadarOpportunityContentGate({
        rankVisible: true,
        scoreVisible: true,
        titleVisible: true,
        selectionStateVisible: true,
        monetizationVisible: true,
        monetizationUnknownForcedToZero: false,
      }).result,
    ).toBe("PASS");
  });

  it("fails a rectangular opportunity node", () => {
    const gate = evaluateVentureRadarCircularGeometryGate({
      intended: "OPPORTUNITY_NODE",
      widthPx: 220,
      heightPx: 140,
      borderRadiusPx: 14,
      renderedForm: "CARD",
    });
    expect(gate.gate).toBe(VENTURE_RADAR_CIRCULAR_GEOMETRY_GATE);
    expect(gate.result).toBe("FAIL");
    expect(evaluateHQVisualDesignIntentGate({ intended: "CIRCULAR_OUTPUT", rendered: "CARD" }).gate).toBe(
      HQ_VISUAL_DESIGN_INTENT_GATE,
    );
    expect(evaluateHQVisualDesignIntentGate({ intended: "CIRCULAR_OUTPUT", rendered: "CARD" }).result).toBe("FAIL");
  });

  it("passes true circular opportunity geometry", () => {
    expect(
      evaluateVentureRadarCircularGeometryGate({
        intended: "OPPORTUNITY_NODE",
        widthPx: 176,
        heightPx: 176,
        borderRadiusPercent: 50,
        renderedForm: "CIRCULAR_OUTPUT",
      }).result,
    ).toBe("PASS");
  });

  it("fails cramped orb readability", () => {
    const gate = evaluateVentureRadarOrbReadabilityGate({
      titleReadable: false,
      rankReadable: true,
      scoreReadable: true,
      statusReadable: true,
      horizontalPaddingPx: 4,
      verticalPaddingPx: 4,
      textTouchesCircumference: true,
      overflow: false,
      fontSizePx: 8,
    });
    expect(gate.gate).toBe(VENTURE_RADAR_ORB_READABILITY_GATE);
    expect(gate.result).toBe("FAIL");
  });

  it("fails hidden ranking or UNKNOWN monetization", () => {
    const gate = evaluateVentureRadarOpportunityContentGate({
      rankVisible: false,
      scoreVisible: true,
      titleVisible: true,
      selectionStateVisible: false,
      monetizationVisible: false,
      monetizationUnknownForcedToZero: true,
    });
    expect(gate.gate).toBe(VENTURE_RADAR_OPPORTUNITY_CONTENT_GATE);
    expect(gate.result).toBe("FAIL");
    expect(gate.reasons).toEqual(
      expect.arrayContaining(["RANK_HIDDEN", "SELECTION_STATE_HIDDEN", "MONETIZATION_HIDDEN", "UNKNOWN_MONETIZATION_FORCED_TO_ZERO"]),
    );
  });

  it("fails selected vs shortlisted when only color differs", () => {
    const selected = buildOpportunityOrbPresentation({
      title: "OccupancyNPV",
      rank: 1,
      opportunityScore: 85.8,
      monetizationScore: 80.7,
      selected: true,
    });
    const shortlisted = buildOpportunityOrbPresentation({
      title: "Affordable Google Review Automation",
      rank: 4,
      opportunityScore: 70,
      monetizationScore: "UNKNOWN",
      shortlisted: true,
      lifecycle: "SHORTLISTED",
    });
    expect(selected.stateLabel).toBe("SELECTED");
    expect(shortlisted.stateLabel).toBe("SHORTLISTED");
    expect(
      evaluateVentureRadarSelectionVisibilityGate({
        selectedHasSelectedText: selected.stateLabel === "SELECTED",
        shortlistedHasShortlistedText: shortlisted.stateLabel === "SHORTLISTED",
        distinguishableWithoutColor: selected.stateLabel !== shortlisted.stateLabel,
      }).result,
    ).toBe("PASS");
    expect(
      evaluateVentureRadarSelectionVisibilityGate({
        selectedHasSelectedText: true,
        shortlistedHasShortlistedText: true,
        distinguishableWithoutColor: false,
      }).gate,
    ).toBe(VENTURE_RADAR_SELECTION_VISIBILITY_GATE);
    expect(
      evaluateVentureRadarSelectionVisibilityGate({
        selectedHasSelectedText: true,
        shortlistedHasShortlistedText: true,
        distinguishableWithoutColor: false,
      }).result,
    ).toBe("FAIL");
  });

  it("shortens long titles without dropping the full name", () => {
    const long = "Lightweight Certificate of Insurance (COI) Tracking SaaS";
    const short = shortOpportunityLabel(long);
    expect(short.length).toBeLessThanOrEqual(32);
    expect(short).not.toEqual(long);
    expect(buildOpportunityOrbPresentation({ title: long, rank: 3, opportunityScore: 72, monetizationScore: "UNKNOWN" }).fullTitle).toBe(long);
  });

  it("reduces columns instead of shrinking orbs into ellipses", () => {
    expect(
      evaluateVentureRadarResponsiveOrbGrid({
        viewportWidthPx: 700,
        columnCount: 5,
        circleDiameterPx: 90,
        elliptical: true,
      }).result,
    ).toBe("FAIL");
    expect(
      evaluateVentureRadarResponsiveOrbGrid({
        viewportWidthPx: 700,
        columnCount: 2,
        circleDiameterPx: 176,
        elliptical: false,
      }).result,
    ).toBe("PASS");
  });

  it("preserves OccupancyNPV and AskReview click-through authority", () => {
    expect(
      evaluateHQVentureSelectionAuthorityContract({
        explicitRouteVentureId: CRE_VENTURE_ID,
        dropdownVentureId: ASKREVIEW_VENTURE_ID,
        defaultFallbackVentureId: ASKREVIEW_VENTURE_ID,
      }).result,
    ).toBe("PASS");
    expect(
      evaluateHQVentureSelectionAuthorityContract({
        explicitRouteVentureId: ASKREVIEW_VENTURE_ID,
        dropdownVentureId: CRE_VENTURE_ID,
        defaultFallbackVentureId: CRE_VENTURE_ID,
      }).result,
    ).toBe("PASS");
    const primitives = readFileSync(join(ROOT, "components/dashboard/operator-console/artifacts/primitives.tsx"), "utf8");
    expect(primitives).toContain("HQOpportunityOrb");
    expect(primitives).toContain("inspectionRefFromOpportunityArtifact");
    expect(primitives).toContain("selectInspection");
    const orbFn = primitives.slice(
      primitives.indexOf("export function HQOpportunityOrb"),
      primitives.indexOf("export function HQCircularOutputNode"),
    );
    expect(orbFn).not.toContain("router.push");
    expect(orbFn).not.toContain("selectInspection");
    const css = readFileSync(join(ROOT, "app/globals.css"), "utf8");
    expect(css).toMatch(/\.hq-opportunity-orb \{[\s\S]*?aspect-ratio:\s*1\s*\/\s*1|hq-opportunity-orb \{[\s\S]*?min-width:\s*10\.5rem/);
    expect(css).toContain("hq-opportunity-orb--selected");
    expect(css).toContain("hq-opportunity-orb--shortlisted");
  });
});
