import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildCanonicalVentureAssemblyIdentity,
  persistCanonicalVentureAssemblyIdentity,
} from "@/lib/infinity/venture-assembly/identity";

const TITLE = "Mobile-First Change Order Authorization Tool";
const CANDIDATE_ID = "b541ad42-0c49-4ce1-bbfe-398b30d90f04";

describe("FAVC1 venture identity handoff", () => {
  it("uses the shared canonical identity contract", () => {
    const source = readFileSync(
      join(process.cwd(), "lib/infinity/first-autonomous-venture-cycle/venture-bridge.ts"),
      "utf8",
    );
    expect(source).toContain("buildCanonicalVentureAssemblyIdentity");
    expect(source).toContain("persistCanonicalVentureAssemblyIdentity");
    expect(source).toContain("opportunityCandidateId: input.opportunityCandidateId");
    expect(source).toContain("candidateTitle: input.ventureName");
  });

  it("writes candidate title and candidate id onto assembly identity", () => {
    const identity = buildCanonicalVentureAssemblyIdentity({
      opportunityCandidateId: CANDIDATE_ID,
      opportunityId: "opp-1",
      candidateTitle: TITLE,
      origin: "first_autonomous_venture_cycle_v1",
      blueprintId: "cb-1",
    });
    const persisted = persistCanonicalVentureAssemblyIdentity(identity);
    expect(persisted.identityPackage.workingName).toBe(TITLE);
    expect(persisted.identityPackage.displayName).toBe(TITLE);
    expect(persisted.identityPackage.opportunityCandidateId).toBe(CANDIDATE_ID);
    expect(persisted.identityPackage.origin).toBe("first_autonomous_venture_cycle_v1");
    expect(persisted.manifestLineage.opportunityCandidateId).toBe(CANDIDATE_ID);
    expect(persisted.manifestLineage.companyBuilderBlueprintId).toBe("cb-1");
  });
});
