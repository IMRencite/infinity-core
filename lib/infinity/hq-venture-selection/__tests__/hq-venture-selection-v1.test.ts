import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { hqLiveSnapshotSlotKey } from "@/lib/infinity/operator-console/hq-client-snapshot-commit";
import type { OperatorVentureListItem, OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import {
  HQ_INSPECTION_HYDRATION_CONSISTENCY_GATE,
  HQ_VENTURE_ROUTE_SELECTOR_SYNC_CONTRACT,
  HQ_VENTURE_SELECTION_AUTHORITY_CONTRACT,
  evaluateHQInspectionHydrationConsistencyGate,
  evaluateHQVentureRouteSelectorSyncContract,
  evaluateHQVentureSelectionAuthorityContract,
  projectHqVentureRouteSelectorSync,
  resolveHqVentureSelectionAuthority,
  resolveSelectorValue,
  selectorOptionId,
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

describe("HQVentureSelectionAuthorityContract", () => {
  it("treats an OccupancyNPV click/route as complete selection over AskReview fallback", () => {
    const authority = resolveHqVentureSelectionAuthority({
      explicitRouteVentureId: OCC,
      dropdownVentureId: ASK,
      priorInspectionVentureId: ASK,
      defaultFallbackVentureId: ASK,
    });
    expect(authority.contract).toBe(HQ_VENTURE_SELECTION_AUTHORITY_CONTRACT);
    expect(authority.authoritativeVentureId).toBe(OCC);
    expect(authority.fallbackOverrodeRoute).toBe(false);
    expect(evaluateHQVentureSelectionAuthorityContract({
      explicitRouteVentureId: OCC,
      dropdownVentureId: ASK,
      defaultFallbackVentureId: ASK,
    }).result).toBe("PASS");
  });

  it("does not require a second dropdown selection when the route is OccupancyNPV", () => {
    const sync = projectHqVentureRouteSelectorSync({
      routeVentureId: OCC,
      selectorVentureId: resolveSelectorValue(
        [listItem(ASK, "AskReview"), listItem(OCC, "OccupancyNPV", "assembly-occ")],
        OCC,
      ),
    });
    expect(sync.contract).toBe(HQ_VENTURE_ROUTE_SELECTOR_SYNC_CONTRACT);
    expect(sync.synchronized).toBe(true);
    expect(evaluateHQVentureRouteSelectorSyncContract({
      routeVentureId: OCC,
      selectorVentureId: OCC,
    }).result).toBe("PASS");
  });

  it("keeps AskReview clicks on AskReview only", () => {
    const authority = resolveHqVentureSelectionAuthority({
      explicitRouteVentureId: ASK,
      dropdownVentureId: OCC,
      defaultFallbackVentureId: OCC,
    });
    expect(authority.authoritativeVentureId).toBe(ASK);
  });

  it("hydrates one venture identity on first render", () => {
    const gate = evaluateHQInspectionHydrationConsistencyGate({
      serverVentureId: OCC,
      clientVentureId: OCC,
      dropdownVentureId: OCC,
      renderedVentureId: OCC,
    });
    expect(gate.gate).toBe(HQ_INSPECTION_HYDRATION_CONSISTENCY_GATE);
    expect(gate.result).toBe("PASS");
    expect(evaluateHQInspectionHydrationConsistencyGate({
      serverVentureId: OCC,
      clientVentureId: ASK,
      dropdownVentureId: ASK,
      renderedVentureId: ASK,
    }).result).toBe("FAIL");
  });

  it("selector option uses canonical venture id so OccupancyNPV is not the first unmatched option", () => {
    const occ = listItem(OCC, "OccupancyNPV", "assembly-uuid");
    expect(selectorOptionId(occ)).toBe(OCC);
    expect(resolveSelectorValue([listItem(ASK, "AskReview"), occ], OCC)).toBe(OCC);
  });

  it("isolates poll snapshot slots per inspected venture", () => {
    const occSnap = { venture: { organizationId: "org", ventureAssemblyId: OCC } } as OperatorVentureSnapshot;
    const askSnap = { venture: { organizationId: "org", ventureAssemblyId: ASK } } as OperatorVentureSnapshot;
    expect(hqLiveSnapshotSlotKey(OCC, occSnap)).toBe(`org:org:venture:${OCC}`);
    expect(hqLiveSnapshotSlotKey(ASK, askSnap)).toBe(`org:org:venture:${ASK}`);
    expect(hqLiveSnapshotSlotKey(OCC, occSnap)).not.toBe(hqLiveSnapshotSlotKey(ASK, askSnap));
  });

  it("HQ click path uses push so browser back can restore the previous venture", () => {
    const files = [
      "components/dashboard/operator-console/hq-idle-shell.tsx",
      "components/dashboard/operator-console/hq-venture-inspection-link.tsx",
      "components/dashboard/operator-console/venture-selector.tsx",
      "components/dashboard/operator-console/venture-operator-console.tsx",
    ];
    for (const file of files) {
      const source = readFileSync(join(ROOT, file), "utf8");
      expect(source).toContain("router.push");
    }
    const provider = readFileSync(join(ROOT, "components/dashboard/operator-console/hq-inspection-provider.tsx"), "utf8");
    expect(provider).toContain("router.push");
    expect(provider).toContain("INSPECTION_QUERY_PARAM");
    expect(provider).toContain("buildHqVentureInspectionHref");
    expect(provider).not.toMatch(/const href = query \? `\?\$\{query\}` : "\?"/);
  });
});
