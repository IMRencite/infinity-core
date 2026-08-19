import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  formatVentureIdPreview,
  isInternalVentureLabel,
  resolveTreasuryVentureLabel,
  resolveVentureDisplay,
  resolveVentureDisplayName,
} from "../resolve-venture-display-name";
import { buildTreasuryHqArtifacts } from "@/lib/infinity/treasury/hq/artifacts";
import { buildTreasuryHqReadModel } from "@/lib/infinity/treasury/hq/read-model";
import { createGovernedStore, ORG_A, VENTURE_A } from "@/lib/infinity/treasury/__tests__/fixtures";
import { buildArtifactInspectorModel } from "../artifacts/build-inspector-model";

const TITLE = "Mobile-First Change Order Authorization Platform";
const BLUEPRINT = "Commercial Lease Intelligence Platform";
const FIXTURE = "executive_selection_e2e_v1 strong_in_policy";
const UUID = "240032f1-18c2-4fb4-8b63-60e013f9174c";

describe("resolveVentureDisplay", () => {
  it("15. uses candidate rank + title over an internal workingName", () => {
    const resolved = resolveVentureDisplay({
      id: UUID,
      workingName: FIXTURE,
      candidateTitle: TITLE,
      rank: 1,
    });
    expect(resolved.label).toBe(`#1 — ${TITLE}`);
    expect(resolved.name).toBe(TITLE);
    expect(resolved.number).toBe(1);
    expect(resolved.source).toBe("candidate_title");
    expect(resolved.label).not.toContain("executive_selection");
  });

  it("16. falls back to blueprint name with rank", () => {
    expect(
      resolveVentureDisplayName({
        id: UUID,
        rank: 3,
        blueprintName: BLUEPRINT,
      }),
    ).toBe(`#3 — ${BLUEPRINT}`);
  });

  it("17. uses #N — Unnamed Venture when no readable name exists", () => {
    expect(resolveVentureDisplayName({ id: UUID, rank: 4 })).toBe("#4 — Unnamed Venture");
    expect(resolveVentureDisplayName({ id: UUID, index: 3 })).toBe("#4 — Unnamed Venture");
  });

  it("18. never displays a raw internal workingName as the primary label", () => {
    const resolved = resolveVentureDisplay({
      id: UUID,
      workingName: "executive_selection_e2e_v1",
      rank: 1,
    });
    expect(isInternalVentureLabel("executive_selection_e2e_v1")).toBe(true);
    expect(resolved.name).toBe("Unnamed Venture");
    expect(resolved.label).toBe("#1 — Unnamed Venture");
    expect(resolved.label).not.toMatch(/executive_selection|strong_in_policy|e2e|240032f1/i);
    expect(formatVentureIdPreview(UUID)).toBe("240032f1…");
  });

  it("prefers candidate title over identity workingName and does not emit Venture #N", () => {
    const resolved = resolveVentureDisplay({
      id: UUID,
      index: 0,
      identity: { workingName: FIXTURE },
      candidateTitle: TITLE,
      rank: 1,
    });
    expect(resolved.label).toBe(`#1 — ${TITLE}`);
    expect(resolved.label).not.toMatch(/^Venture #/);
  });

  it("keeps a canonical HQ working name when it is already human-readable", () => {
    expect(
      resolveVentureDisplay({
        identity: { workingName: "WorkflowPilot" },
        rank: 2,
      }).label,
    ).toBe("#2 — WorkflowPilot");
  });
});

describe("Treasury UI uses the same numbered display resolver", () => {
  const center = readFileSync(
    join(process.cwd(), "components/dashboard/operator-console/treasury-control-center.tsx"),
    "utf8",
  );
  const strip = readFileSync(
    join(process.cwd(), "components/dashboard/operator-console/treasury-capital-strip.tsx"),
    "utf8",
  );

  it("19. Allocate Capital, Budget Controls, allocations, and inspector share resolveTreasuryVentureLabel", () => {
    expect(center).toContain("resolveTreasuryVentureLabel");
    expect(center).toContain("function VentureSelect");
    expect(center.match(/<VentureSelect/g)?.length).toBe(2);
    expect(center).toContain("displayNameForVenture(row.ventureId)");
    expect(center).not.toMatch(/\{venture\.ventureName\}/);
    expect(strip).toContain("resolveTreasuryVentureLabel");
  });

  it("inspector heading uses #N — name, with IDs only secondarily", () => {
    const { store } = createGovernedStore();
    const model = buildTreasuryHqReadModel(store, ORG_A);
    const options = [
      {
        ventureAssemblyId: VENTURE_A,
        ventureName: FIXTURE,
        ventureDisplayName: TITLE,
        ventureDisplayNumber: 1,
        ventureDisplayLabel: `#1 — ${TITLE}`,
      },
    ];
    const expected = `#1 — ${TITLE}`;
    expect(resolveTreasuryVentureLabel(options, VENTURE_A)).toBe(expected);
    const artifacts = buildTreasuryHqArtifacts(model, {
      displayNameForVenture: (id) => resolveTreasuryVentureLabel(options, id),
    });
    const allocation = Object.values(artifacts)
      .flat()
      .find((artifact) => artifact.artifactType === "venture_capital_allocation");
    expect(allocation?.title).toBe(expected);
    expect(allocation?.title).not.toMatch(/executive_selection|Venture #|aaaaaaaa/i);
    expect(allocation?.metadata.ventureId).toBe(VENTURE_A);

    const inspector = buildArtifactInspectorModel(allocation!, Object.values(artifacts).flat());
    expect(inspector.sections[0]?.rows.find((row) => row.label === "Venture")?.value).toBe(expected);
    expect(inspector.sections[0]?.rows.find((row) => row.label === "Venture ID")?.value).toBe(VENTURE_A);
  });
});
