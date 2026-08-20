import { describe, expect, it } from "vitest";
import {
  buildCanonicalVentureAssemblyIdentity,
  candidateIdFromLineageSources,
  persistCanonicalVentureAssemblyIdentity,
} from "../identity";
import { buildAssemblyPackages } from "../packages";

const TITLE = "Mobile-First Change Order Authorization Tool";
const CANDIDATE_ID = "b541ad42-0c49-4ce1-bbfe-398b30d90f04";
const OPPORTUNITY_ID = "d934d5b1-e12e-4271-a134-c30be398e5d5";

describe("canonical venture assembly identity", () => {
  it("persists candidate title, candidate id, origin, and rank", () => {
    const identity = buildCanonicalVentureAssemblyIdentity({
      opportunityCandidateId: CANDIDATE_ID,
      opportunityId: OPPORTUNITY_ID,
      candidateTitle: TITLE,
      workingName: "executive_selection_e2e_v1 strong_in_policy",
      origin: "first_autonomous_venture_cycle_v1",
      rank: 1,
      blueprintId: "blueprint-1",
    });
    const persisted = persistCanonicalVentureAssemblyIdentity(identity);
    expect(identity.workingName).toBe(TITLE);
    expect(identity.displayName).toBe(TITLE);
    expect(identity.opportunityCandidateId).toBe(CANDIDATE_ID);
    expect(identity.origin).toBe("first_autonomous_venture_cycle_v1");
    expect(persisted.identityPackage.opportunityCandidateId).toBe(CANDIDATE_ID);
    expect(persisted.manifestLineage.opportunityCandidateId).toBe(CANDIDATE_ID);
    expect(persisted.manifestLineage.companyBuilderBlueprintId).toBe("blueprint-1");
  });

  it("reads candidate id from opportunity source_snapshot and mission constraints", () => {
    expect(
      candidateIdFromLineageSources([
        { opportunity_candidate_id: CANDIDATE_ID, discovery_run_id: "run" },
      ]),
    ).toBe(CANDIDATE_ID);
    expect(
      candidateIdFromLineageSources([
        {},
        [{ kind: "first_autonomous_venture_v1", opportunityCandidateId: CANDIDATE_ID }],
      ]),
    ).toBe(CANDIDATE_ID);
  });

  it("uses candidate title over fixture blueprint/opportunity names when assembling packages", () => {
    const packages = buildAssemblyPackages({
      organizationId: "org",
      missionId: "mission",
      opportunityId: OPPORTUNITY_ID,
      executiveDecisionId: "exec",
      planId: "plan",
      planVersion: 1,
      planExecutionId: "pe",
      ventureBlueprintId: "factory-bp",
      buildId: "build",
      buildJobId: "job",
      buildSnapshotId: "snap",
      workspaceReference: ".infinity/workspaces/x",
      projectType: "content_site",
      builderKey: "website.internal_content",
      blueprint: { name: "executive_selection_e2e_v1 strong_in_policy" } as never,
      opportunityName: "executive_selection_e2e_v1 strong_in_policy",
      opportunitySummary: "Summary",
      opportunityCandidateId: CANDIDATE_ID,
      candidateTitle: TITLE,
      candidateRank: 1,
      origin: "venture_assembly",
      companyBuilderBlueprintId: "cb-blueprint",
    });
    expect(packages.identityPackage.workingName).toBe(TITLE);
    expect(packages.identityPackage.displayName).toBe(TITLE);
    expect(packages.identityPackage.opportunityCandidateId).toBe(CANDIDATE_ID);
    expect(packages.identityPackage.origin).toBe("venture_assembly");
    expect(packages.manifest.opportunityCandidateId).toBe(CANDIDATE_ID);
    expect(packages.manifest.ventureIdentity.workingName).toBe(TITLE);
    expect(packages.manifest.rank).toBe(1);
  });
});
