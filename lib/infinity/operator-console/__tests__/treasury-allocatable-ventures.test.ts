import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { filterTreasuryAllocatableVentures } from "../allocatable-ventures";
import { isOperatorAllocatableVenture } from "../portfolio/venture-classification";
import { resolveVentureDisplay } from "../resolve-venture-display-name";
import type { OperatorVentureListItem } from "../types";

const E2E_ID = "0a696b50-e5d0-42f8-bf87-da1d836e350a";
const REAL_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const TITLE = "Mobile-First Change Order Authorization Tool";
const CANDIDATE_ID = "b541ad42-0c49-4ce1-bbfe-398b30d90f04";

function item(overrides: Partial<OperatorVentureListItem>): OperatorVentureListItem {
  return {
    ventureAssemblyId: REAL_ID,
    ventureName: TITLE,
    status: "internally_ready",
    activeDepartment: null,
    latestActivity: null,
    latestActivityAt: null,
    launchState: null,
    knownSpendUsd: null,
    latestDecision: null,
    missionId: "mission-1",
    ...overrides,
  };
}

describe("Treasury allocatable venture filter", () => {
  it("excludes HQ verification_or_test_venture assemblies from allocation selectors", () => {
    expect(
      isOperatorAllocatableVenture({
        id: E2E_ID,
        mission_id: "15abb72c-8541-46bb-84c2-d07f00bf273f",
        status: "internally_ready",
        venture_blueprint_id: "a7837be5-f806-4473-96ce-7b0ebdc6bb0e",
        identity_package: { workingName: "executive_selection_e2e_v1 strong_in_policy" },
        manifest: { schemaVersion: "venture_assembly_manifest_v1" },
        idempotency_key: "venture_assembly:org:e2e:venture_assembly_v1",
      }),
    ).toBe(false);

    const filtered = filterTreasuryAllocatableVentures([
      item({
        ventureAssemblyId: E2E_ID,
        ventureName: "executive_selection_e2e_v1 strong_in_policy",
        ventureDisplayLabel: "#1 — Unnamed Venture",
        operatorAllocatable: false,
        exclusionReason: "verification_or_test_venture",
      }),
    ]);
    expect(filtered).toEqual([]);
  });

  it("keeps a real candidate assembly and resolves the human Treasury label", () => {
    const identity = {
      workingName: TITLE,
      displayName: TITLE,
      opportunityCandidateId: CANDIDATE_ID,
      origin: "first_autonomous_venture_cycle_v1",
    };
    const resolved = resolveVentureDisplay({
      id: REAL_ID,
      index: 0,
      identity,
      manifest: { opportunityCandidateId: CANDIDATE_ID, origin: "first_autonomous_venture_cycle_v1" },
      candidateTitle: TITLE,
      rank: 1,
      workingName: TITLE,
    });
    expect(resolved.label).toBe(`#1 — ${TITLE}`);

    const filtered = filterTreasuryAllocatableVentures([
      item({
        ventureAssemblyId: E2E_ID,
        ventureName: "executive_selection_e2e_v1 strong_in_policy",
        operatorAllocatable: false,
        exclusionReason: "verification_or_test_venture",
      }),
      item({
        ventureAssemblyId: REAL_ID,
        ventureName: TITLE,
        ventureDisplayName: TITLE,
        ventureDisplayNumber: 1,
        ventureDisplayLabel: `#1 — ${TITLE}`,
        candidateId: CANDIDATE_ID,
        operatorAllocatable: true,
        exclusionReason: null,
      }),
    ]);
    expect(filtered.map((row) => row.ventureAssemblyId)).toEqual([REAL_ID]);
    expect(filtered[0]?.ventureDisplayLabel).toBe(`#1 — ${TITLE}`);
  });

  it("does not insert a fixture venture when the allocatable list is empty", () => {
    expect(
      filterTreasuryAllocatableVentures([
        item({
          ventureAssemblyId: E2E_ID,
          ventureName: "executive_selection_e2e_v1 strong_in_policy",
          operatorAllocatable: false,
        }),
      ]),
    ).toEqual([]);
  });

  it("Treasury UI uses eligibility filtering and a truthful empty state", () => {
    const center = readFileSync(
      join(process.cwd(), "components/dashboard/operator-console/treasury-control-center.tsx"),
      "utf8",
    );
    expect(center).toContain("filterTreasuryAllocatableVentures");
    expect(center).toContain("No allocatable ventures yet.");
    expect(center).not.toContain("No UUID ventures");
  });
});
