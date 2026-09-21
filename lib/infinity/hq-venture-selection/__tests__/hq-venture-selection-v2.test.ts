import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { OCCUPANCYNPV_CANDIDATE_ID } from "@/lib/infinity/hq-inspection-identity/aliases";
import { hqLiveSnapshotSlotKey } from "@/lib/infinity/operator-console/hq-client-snapshot-commit";
import type { OperatorVentureListItem, OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import {
  FOUNDER_VENTURE_CLICK_THROUGH_ACCEPTANCE_GATE,
  HQ_VENTURE_CLICK_THROUGH_CONTRACT,
  HQ_VENTURE_LINK_INTEGRITY_GATE,
  HQ_VENTURE_POLL_IDENTITY_GATE,
  HQ_VENTURE_ROUTE_SELECTOR_SYNC_CONTRACT,
  HQ_VENTURE_SELECTION_FALLBACK_MASKING_GATE,
  HQ_VENTURE_SNAPSHOT_ISOLATION_GATE,
  VENTURE_SELECTION_RESOLUTION_FAILED,
  buildHqClearInspectionHref,
  buildHqVentureInspectionHref,
  evaluateFounderVentureClickThroughAcceptanceGate,
  evaluateHQInspectionHydrationConsistencyGate,
  evaluateHQVentureClickThroughContract,
  evaluateHQVentureLinkIntegrityGate,
  evaluateHQVenturePollIdentityGate,
  evaluateHQVentureRouteOptionPresence,
  evaluateHQVentureRouteSelectorSyncContract,
  evaluateHQVentureSelectionAuthorityContract,
  evaluateHQVentureSelectionFallbackMaskingGate,
  evaluateHQVentureSnapshotIsolationGate,
  hqVenturePollPath,
  resolveHqVentureClick,
  resolveHqVentureSelectionAuthority,
  resolveSelectorValue,
  selectorOptionId,
  snapshotMatchesRequestedVenture,
} from "../index";

const ROOT = process.cwd();
const OCC = CRE_VENTURE_ID;
const ASK = ASKREVIEW_VENTURE_ID;

function listItem(id: string, name: string, assembly = id): OperatorVentureListItem {
  return {
    ventureAssemblyId: assembly,
    ventureName: name,
    organizationId: "org",
    status: "ACTIVE",
    canonicalVentureId: id,
    candidateId: id.replace("candidate:", ""),
  } as unknown as OperatorVentureListItem;
}

function snap(id: string, name: string): OperatorVentureSnapshot {
  return {
    venture: {
      organizationId: "org",
      ventureAssemblyId: id,
      opportunityId: id.replace("candidate:", ""),
      ventureName: name,
      correlationIds: [id],
    },
  } as OperatorVentureSnapshot;
}

describe("HQ clicked venture authority v2", () => {
  it("explicit OccupancyNPV click wins over default AskReview", () => {
    const authority = resolveHqVentureSelectionAuthority({
      explicitRouteVentureId: OCC,
      dropdownVentureId: null,
      priorInspectionVentureId: ASK,
      defaultFallbackVentureId: ASK,
    });
    expect(authority.authoritativeVentureId).toBe(OCC);
    expect(authority.source).toBe("explicit_route");
    expect(
      evaluateHQVentureSelectionAuthorityContract({
        explicitRouteVentureId: OCC,
        defaultFallbackVentureId: ASK,
      }).result,
    ).toBe("PASS");
    expect(
      evaluateHQVentureClickThroughContract({
        sourceEntityType: "OPPORTUNITY_CANDIDATE",
        sourceEntityId: OCCUPANCYNPV_CANDIDATE_ID,
        renderedInspectionId: OCC,
      }).result,
    ).toBe("PASS");
    expect(
      evaluateHQVentureClickThroughContract({
        sourceEntityType: "OPPORTUNITY_CANDIDATE",
        sourceEntityId: OCCUPANCYNPV_CANDIDATE_ID,
        renderedInspectionId: ASK,
      }).result,
    ).toBe("FAIL");
  });

  it("clicked AskReview stays AskReview", () => {
    const click = resolveHqVentureClick({
      sourceEntityType: "VENTURE",
      sourceEntityId: ASK,
    });
    expect(click.resolvedCanonicalVentureId).toBe(ASK);
    expect(click.targetInspectionPath).toContain("inspect=");
    expect(click.targetInspectionPath).not.toContain(OCC);
    expect(
      evaluateHQVentureClickThroughContract({
        sourceEntityType: "VENTURE",
        sourceEntityId: ASK,
        renderedInspectionId: ASK,
      }).result,
    ).toBe("PASS");
  });

  it("fails HQVentureRouteSelectorSyncContract when the route id is missing from option values", () => {
    const gate = evaluateHQVentureRouteOptionPresence({
      routeVentureId: OCC,
      optionValues: [ASK, "assembly-unrelated"],
    });
    expect(gate.gate).toBe(HQ_VENTURE_ROUTE_SELECTOR_SYNC_CONTRACT);
    expect(gate.result).toBe("FAIL");
    expect(evaluateHQVentureRouteSelectorSyncContract({ routeVentureId: OCC, selectorVentureId: ASK }).result).toBe(
      "FAIL",
    );
    const options = [listItem(ASK, "AskReview"), listItem(OCC, "OccupancyNPV", "assembly-occ")];
    expect(resolveSelectorValue(options, OCC)).toBe(OCC);
    expect(selectorOptionId(options[1]!)).toBe(OCC);
  });

  it("normalizes OccupancyNPV candidate clicks to the canonical venture id", () => {
    const click = resolveHqVentureClick({
      sourceEntityType: "OPPORTUNITY_CANDIDATE",
      sourceEntityId: OCCUPANCYNPV_CANDIDATE_ID,
    });
    expect(click.resolution).toBe("canonical_venture");
    expect(click.resolvedCanonicalVentureId).toBe(OCC);
    expect(click.inspectionRef).toEqual({ entityType: "VENTURE", entityId: OCC });
    expect(click.targetInspectionPath).toBe(buildHqVentureInspectionHref(click.inspectionRef));
  });

  it("keeps unknown candidates on candidate inspection instead of mapping to AskReview", () => {
    const click = resolveHqVentureClick({
      sourceEntityType: "OPPORTUNITY_CANDIDATE",
      sourceEntityId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    });
    expect(click.resolution).toBe("candidate_only");
    expect(click.resolvedCanonicalVentureId).toBeNull();
    expect(click.inspectionRef.entityType).toBe("OPPORTUNITY_CANDIDATE");
    expect(click.targetInspectionPath).not.toContain(ASK);
  });

  it("isolates snapshot cache slots by requested canonical venture id", () => {
    const occSnap = snap(OCC, "OccupancyNPV");
    const askSnap = snap(ASK, "AskReview");
    expect(hqLiveSnapshotSlotKey(OCC, occSnap)).toBe(`org:org:venture:${OCC}`);
    expect(hqLiveSnapshotSlotKey(OCC, askSnap)).toBe(`org:org:venture:${OCC}`);
    expect(hqLiveSnapshotSlotKey(ASK, askSnap)).toBe(`org:org:venture:${ASK}`);
    expect(hqLiveSnapshotSlotKey(OCC, askSnap)).not.toBe(hqLiveSnapshotSlotKey(ASK, askSnap));
    expect(snapshotMatchesRequestedVenture(askSnap, OCC)).toBe(false);
    expect(
      evaluateHQVentureSnapshotIsolationGate({
        requestedVentureId: OCC,
        snapshotVentureId: ASK,
        cacheKey: hqLiveSnapshotSlotKey("org-wide", askSnap),
      }).result,
    ).toBe("FAIL");
    expect(
      evaluateHQVentureSnapshotIsolationGate({
        requestedVentureId: OCC,
        snapshotVentureId: OCC,
        cacheKey: hqLiveSnapshotSlotKey(OCC, occSnap),
      }).gate,
    ).toBe(HQ_VENTURE_SNAPSHOT_ISOLATION_GATE);
    expect(
      evaluateHQVentureSnapshotIsolationGate({
        requestedVentureId: OCC,
        snapshotVentureId: OCC,
        cacheKey: hqLiveSnapshotSlotKey(OCC, occSnap),
      }).result,
    ).toBe("PASS");
  });

  it("rejects poll responses that return a different venture", () => {
    expect(
      evaluateHQVenturePollIdentityGate({
        requestedVentureId: OCC,
        responseVentureId: ASK,
      }).result,
    ).toBe("FAIL");
    expect(
      evaluateHQVenturePollIdentityGate({
        requestedVentureId: OCC,
        responseVentureId: OCC,
      }).gate,
    ).toBe(HQ_VENTURE_POLL_IDENTITY_GATE);
    expect(
      evaluateHQVenturePollIdentityGate({
        requestedVentureId: OCC,
        responseVentureId: OCC,
      }).result,
    ).toBe("PASS");
    expect(hqVenturePollPath(OCC)).toBe(`/api/operator-console/ventures/${encodeURIComponent(OCC)}`);
  });

  it("hydrates one identity and treats a first-render AskReview flash as a fail", () => {
    expect(
      evaluateHQInspectionHydrationConsistencyGate({
        serverVentureId: OCC,
        clientVentureId: OCC,
        dropdownVentureId: OCC,
        renderedVentureId: OCC,
      }).result,
    ).toBe("PASS");
    expect(
      evaluateHQInspectionHydrationConsistencyGate({
        serverVentureId: OCC,
        clientVentureId: ASK,
        dropdownVentureId: ASK,
        renderedVentureId: ASK,
      }).result,
    ).toBe("FAIL");
  });

  it("masks silent AskReview fallback when OccupancyNPV was explicit", () => {
    expect(
      evaluateHQVentureSelectionFallbackMaskingGate({
        explicitVentureId: OCC,
        renderedVentureId: ASK,
        usedFallback: true,
      }).result,
    ).toBe("FAIL");
    expect(
      evaluateHQVentureSelectionFallbackMaskingGate({
        explicitVentureId: OCC,
        renderedVentureId: OCC,
        usedFallback: false,
      }).gate,
    ).toBe(HQ_VENTURE_SELECTION_FALLBACK_MASKING_GATE);
    expect(
      evaluateHQVentureSelectionFallbackMaskingGate({
        explicitVentureId: OCC,
        renderedVentureId: OCC,
        usedFallback: false,
      }).result,
    ).toBe("PASS");
    expect(
      evaluateHQVentureSelectionFallbackMaskingGate({
        explicitVentureId: OCC,
        renderedVentureId: ASK,
        usedFallback: false,
      }).reasons,
    ).toContain(VENTURE_SELECTION_RESOLUTION_FAILED);
  });

  it("browser history and clear inspection keep the route as the selector", () => {
    const occHref = buildHqVentureInspectionHref({ entityType: "VENTURE", entityId: OCC });
    const askHref = buildHqVentureInspectionHref({ entityType: "VENTURE", entityId: ASK });
    expect(occHref).toContain("/dashboard?");
    expect(occHref).toContain("inspect=");
    expect(askHref).not.toBe(occHref);
    expect(buildHqClearInspectionHref("inspect=venture%3A" + encodeURIComponent(OCC))).toBe("/dashboard");
    expect(evaluateHQVentureRouteSelectorSyncContract({ routeVentureId: OCC, selectorVentureId: OCC }).result).toBe(
      "PASS",
    );
    expect(evaluateHQVentureRouteSelectorSyncContract({ routeVentureId: ASK, selectorVentureId: ASK }).result).toBe(
      "PASS",
    );
    expect(evaluateHQVentureRouteSelectorSyncContract({ routeVentureId: null, selectorVentureId: ASK }).result).toBe(
      "FAIL",
    );
  });

  it("requires the shared navigator and keeps Venture Radar orbs on that path", () => {
    expect(
      evaluateHQVentureLinkIntegrityGate({ usesSharedNavigator: true, adHocInspectHref: false }).gate,
    ).toBe(HQ_VENTURE_LINK_INTEGRITY_GATE);
    expect(
      evaluateHQVentureLinkIntegrityGate({ usesSharedNavigator: true, adHocInspectHref: false }).result,
    ).toBe("PASS");
    expect(
      evaluateHQVentureLinkIntegrityGate({ usesSharedNavigator: false, adHocInspectHref: true }).result,
    ).toBe("FAIL");
    const primitives = readFileSync(join(ROOT, "components/dashboard/operator-console/artifacts/primitives.tsx"), "utf8");
    expect(primitives).toContain("HQOpportunityOrb");
    expect(primitives).toContain("inspectionRefFromOpportunityArtifact");
    expect(primitives).toContain("selectInspection");
    const orbFn = primitives.slice(
      primitives.indexOf("export function HQOpportunityOrb"),
      primitives.indexOf("export function HQCircularOutputNode"),
    );
    expect(orbFn).toContain("hq-opportunity-orb");
    expect(orbFn).not.toContain("router.push");
    expect(orbFn).not.toContain("selectInspection");
    const provider = readFileSync(join(ROOT, "components/dashboard/operator-console/hq-inspection-provider.tsx"), "utf8");
    expect(provider).toContain("buildHqVentureInspectionHref");
    const load = readFileSync(join(ROOT, "lib/infinity/operator-console/load-hq-dashboard.ts"), "utf8");
    expect(load).toContain("VENTURE_SELECTION_RESOLUTION_FAILED");
    expect(load).toContain("resolveSnapshotLoadId");
    expect(load).not.toMatch(/resolvedId = resolveDefaultVentureId[\s\S]{0,80}preferredVentureId/);
    const poll = readFileSync(join(ROOT, "app/api/operator-console/ventures/[ventureId]/route.ts"), "utf8");
    expect(poll).toContain("snapshotMatchesRequestedVenture");
    expect(poll).toContain("evaluateHQVenturePollIdentityGate");
    expect(evaluateHQVentureClickThroughContract).toBeTypeOf("function");
    expect(HQ_VENTURE_CLICK_THROUGH_CONTRACT).toBe("HQVentureClickThroughContract");
  });

  it("does not treat automated tests as founder physical acceptance", () => {
    const gate = evaluateFounderVentureClickThroughAcceptanceGate({
      founderVerifiedOccupancynpv: false,
      founderVerifiedAskReview: false,
      requiredManualDropdown: false,
    });
    expect(gate.gate).toBe(FOUNDER_VENTURE_CLICK_THROUGH_ACCEPTANCE_GATE);
    expect(gate.result).toBe("FAIL");
    expect(gate.reasons).toContain("FOUNDER_PHYSICAL_VERIFICATION_REQUIRED");
  });
});
