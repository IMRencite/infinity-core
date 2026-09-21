import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ASKREVIEW_CANDIDATE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { classifyOpportunityCandidate } from "../classify";
import { evaluateOpportunityCollectionScale, paginateOpportunities, renderOpportunityCollectionFixture } from "../collection";
import {
  evaluateOpportunityHqVisibilityGate,
  evaluateOpportunityShortlistGovernanceGate,
  evaluateVentureSelectionTraceabilityGate,
  hiddenSelectableCandidateState,
} from "../gates";
import { makeCanonicalOpportunityRecord, projectCanonicalOpportunities, realCanonicalOpportunities } from "../project";
import { resetOpportunityUniverseStore, seedHistoricalShortlists } from "../persist";
import { appendOpportunityShortlist, createOpportunityShortlist, diffOpportunityShortlists } from "../shortlist";
import { OPPORTUNITY_COLLECTION_SCALE_FIXTURES } from "../types";

const ORIGINAL_TEN = [
  { candidateId: ASKREVIEW_CANDIDATE_ID, name: "AskReview", rank: 1, opportunityScore: 85.85, monetizationScore: 80.65 },
  { candidateId: "ba261b68-2511-49a8-832b-43174a14d569", name: "Landlord income", rank: 2, opportunityScore: 84.8, monetizationScore: 72.7 },
];

function fortyMembers() {
  return Array.from({ length: 40 }, (_, index) => ({
    candidateId: index === 0 ? ASKREVIEW_CANDIDATE_ID : `cand-${index}`,
    name: `Candidate ${index + 1}`,
    rank: index + 1,
    opportunityScore: 80 - index * 0.1,
    monetizationScore: 70,
  }));
}

describe("HQ opportunity universe transparency", () => {
  beforeEach(() => resetOpportunityUniverseStore());
  afterEach(() => resetOpportunityUniverseStore());

  it("does not treat ordinary product titles as test fixtures", () => {
    expect(classifyOpportunityCandidate({
      id: "248dbeca-bbcb-462e-bb0e-f487e5931fb4",
      title: "Pre-Publish YouTube Thumbnail Preview & Performance Tool",
    })).toBe("REAL_CANONICAL");
    expect(classifyOpportunityCandidate({
      id: "x",
      title: "e2e_fixture candidate",
    })).toBe("E2E_FIXTURE");
  });

  it("projects only real canonical rows as HQ-visible and selectable", () => {
    const records = projectCanonicalOpportunities({
      rows: [
        { id: ASKREVIEW_CANDIDATE_ID, title: "AskReview", problem: "Reviews", target_customer: "Shops", market: "Local SEO", opportunity_score: 85.85, discovery_run_id: "3fd82037-0f03-425a-9212-f683d7cbd41a" },
        { id: "fixture-1", title: "e2e_fixture candidate", opportunity_score: 10 },
      ],
    });
    const real = realCanonicalOpportunities(records);
    expect(real).toHaveLength(1);
    expect(real[0]!.hqVisible).toBe(true);
    expect(real[0]!.selectable).toBe(true);
    expect(records.find((row) => row.candidateId === "fixture-1")?.selectable).toBe(false);
    expect(hiddenSelectableCandidateState(records)).toBe("BLOCKED");
    expect(evaluateOpportunityHqVisibilityGate({ records }).result).toBe("PASS");
  });

  it("versions shortlists and refuses silent replacement", () => {
    const v1 = createOpportunityShortlist({
      shortlistId: "osl_askreview_discovery_v1",
      version: 1,
      createdAt: "2026-08-17T05:37:34.508Z",
      sourceDiscoveryRunId: "3fd82037-0f03-425a-9212-f683d7cbd41a",
      selectionCriteria: "run cap 10",
      status: "SUPERSEDED",
      members: ORIGINAL_TEN.map((row) => ({ ...row, reason: "cycle" })),
      evidenceSnapshot: "original 10",
    });
    const v2 = createOpportunityShortlist({
      shortlistId: "osl_second_venture_eval_v2",
      version: 2,
      createdAt: "2026-09-09T06:00:00.000Z",
      sourceDiscoveryRunId: null,
      selectionCriteria: "merged limit 40",
      status: "CURRENT",
      members: fortyMembers().map((row) => ({ ...row, reason: "eval" })),
      evidenceSnapshot: "forty",
    });
    const lists = appendOpportunityShortlist([v1], v2);
    expect(lists).toHaveLength(2);
    expect(() => appendOpportunityShortlist(lists, v2)).toThrow(/SILENT_SHORTLIST_REPLACEMENT_FORBIDDEN/);
    const diff = diffOpportunityShortlists(v1, v2);
    expect(diff.added.length).toBeGreaterThan(0);
    expect(evaluateOpportunityShortlistGovernanceGate({ shortlists: lists }).result).toBe("PASS");
  });

  it("traces AskReview selection to a visible candidate and shortlist", () => {
    const shortlists = seedHistoricalShortlists({ originalTen: ORIGINAL_TEN, selectionForty: fortyMembers() });
    const records = projectCanonicalOpportunities({
      rows: [
        { id: ASKREVIEW_CANDIDATE_ID, title: "AskReview", opportunity_score: 85.85, discovery_run_id: "3fd82037-0f03-425a-9212-f683d7cbd41a" },
      ],
      shortlists,
    });
    expect(evaluateVentureSelectionTraceabilityGate({
      selectedCandidateId: ASKREVIEW_CANDIDATE_ID,
      records,
      shortlists,
    }).result).toBe("PASS");
  });

  it("keeps All Opportunities bounded at 10/40/133/500", () => {
    expect(OPPORTUNITY_COLLECTION_SCALE_FIXTURES).toEqual([10, 40, 133, 500]);
    expect(renderOpportunityCollectionFixture(500).renderedItemCount).toBe(25);
    expect(evaluateOpportunityCollectionScale().result).toBe("PASS");
    const page = paginateOpportunities(
      Array.from({ length: 40 }, (_, index) => makeCanonicalOpportunityRecord({
        candidateId: `id-${index}`,
        name: `Name ${index}`,
        problem: "p",
        customer: "c",
        industry: "i",
        opportunityScore: 50,
        liveRank: index + 1,
        rank: index + 1,
      })),
      { page: 2, q: "Name 2" },
    );
    expect(page.total).toBeGreaterThan(0);
    expect(page.items.length).toBeLessThanOrEqual(25);
  });
});
