import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { ASKREVIEW_CANDIDATE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { applyLiveOpportunityRanking, compositeRankingScore, liveTop10 } from "../live-ranking";
import { createOpportunityRankingSnapshot, isMaterialRankingChange } from "../ranking-snapshot";
import { makeCanonicalOpportunityRecord, projectCanonicalOpportunities } from "../project";
import { paginateOpportunities, renderOpportunityCollectionFixture, evaluateOpportunityCollectionScale } from "../collection";
import {
  evaluateHQOpportunityIntelligenceQualityGate,
  evaluateLiveOpportunityRankingGate,
  evaluateOpportunityHqVisibilityGate,
  evaluateOpportunityUniverseDetailGate,
  evaluateVentureSelectionTraceabilityGate,
} from "../gates";
import { resetOpportunityUniverseStore, seedHistoricalShortlists } from "../persist";
import { buildLiveVentureRadarArtifacts } from "../radar-artifacts";
import { OPPORTUNITIES_ROUTE, OPPORTUNITY_COLLECTION_PAGE_SIZE, OPPORTUNITY_COLLECTION_SCALE_FIXTURES } from "../types";

function tenCandidates() {
  return Array.from({ length: 10 }, (_, index) => makeCanonicalOpportunityRecord({
    candidateId: `cand-${index + 1}`,
    name: `Candidate ${index + 1}`,
    opportunityScore: 90 - index,
    monetizationScore: 80 - index,
    lifecycle: "DISCOVERED",
    hqVisible: true,
    selectable: true,
  }));
}

describe("HQ live opportunity ranking v2", () => {
  beforeEach(() => resetOpportunityUniverseStore());
  afterEach(() => resetOpportunityUniverseStore());

  it("does not treat historical shortlist membership as current SHORTLISTED before live ranking", () => {
    const shortlists = seedHistoricalShortlists({
      originalTen: [{ candidateId: "cand-1", name: "A", rank: 1, opportunityScore: 90, monetizationScore: 80 }],
      selectionForty: [{ candidateId: "cand-1", name: "A", rank: 1, opportunityScore: 90, monetizationScore: 80 }],
    });
    const projected = projectCanonicalOpportunities({
      rows: [{ id: "cand-1", title: "A", opportunity_score: 90 }],
      shortlists,
    });
    expect(projected[0]!.lifecycle).toBe("DISCOVERED");
    expect(projected[0]!.shortlistIds.length).toBeGreaterThan(0);
  });

  it("lets a stronger 11th candidate enter the live Top 10 without changing the historical snapshot", () => {
    const current = applyLiveOpportunityRanking({ records: tenCandidates() });
    const prior = createOpportunityRankingSnapshot({ records: current, timestamp: "2026-09-01T00:00:00.000Z" });
    const nextRecords = [
      ...tenCandidates(),
      makeCanonicalOpportunityRecord({
        candidateId: "cand-11",
        name: "Stronger K",
        opportunityScore: 88,
        monetizationScore: 82,
      }),
    ];
    const reranked = applyLiveOpportunityRanking({ records: nextRecords, previousSnapshot: prior });
    const top = liveTop10(reranked);
    expect(top[1]!.candidateId).toBe("cand-11");
    expect(top[1]!.liveRank).toBe(2);
    expect(top.some((row) => row.candidateId === "cand-10")).toBe(false);
    expect(reranked.find((row) => row.candidateId === "cand-10")?.liveRank).toBe(11);
    expect(prior.members[1]!.candidateId).toBe("cand-2");
    expect(top[1]!.movement?.kind).toBe("NEW TO TOP 10");
  });

  it("moves a candidate from #8 to #2 when its score improves and preserves the prior snapshot", () => {
    const current = applyLiveOpportunityRanking({ records: tenCandidates() });
    const prior = createOpportunityRankingSnapshot({ records: current, timestamp: "2026-09-01T00:00:00.000Z" });
    const improved = tenCandidates().map((row) => (
      row.candidateId === "cand-8"
        ? { ...row, opportunityScore: 89.2, monetizationScore: 80 }
        : row
    ));
    const reranked = applyLiveOpportunityRanking({ records: improved, previousSnapshot: prior });
    const moved = reranked.find((row) => row.candidateId === "cand-8");
    expect(moved?.liveRank).toBe(2);
    expect(moved?.movement?.label).toBe("UP 6");
    expect(prior.members.find((row) => row.candidateId === "cand-8")?.rank).toBe(8);
  });

  it("downranks and exits live Top 10 when eligibility is lost while remaining canonical", () => {
    const current = applyLiveOpportunityRanking({ records: tenCandidates() });
    const prior = createOpportunityRankingSnapshot({ records: current });
    const rejected = tenCandidates().map((row) => (
      row.candidateId === "cand-3"
        ? { ...row, lifecycle: "REJECTED" as const }
        : row
    ));
    const reranked = applyLiveOpportunityRanking({ records: rejected, previousSnapshot: prior });
    const departed = reranked.find((row) => row.candidateId === "cand-3");
    expect(departed?.inLiveTop10).toBe(false);
    expect(departed?.eligibleForLiveRanking).toBe(false);
    expect(departed?.hqVisible).toBe(true);
    expect(liveTop10(reranked)).toHaveLength(9);
    expect(prior.members.find((row) => row.candidateId === "cand-3")?.rank).toBe(3);
  });

  it("excludes test/fixture candidates and keeps UNKNOWN monetization as UNKNOWN", () => {
    const records = applyLiveOpportunityRanking({
      records: [
        ...tenCandidates(),
        makeCanonicalOpportunityRecord({
          candidateId: "fixture-1",
          name: "e2e_fixture candidate",
          classification: "E2E_FIXTURE",
          hqVisible: false,
          selectable: false,
          opportunityScore: 99,
          monetizationScore: 99,
        }),
        makeCanonicalOpportunityRecord({
          candidateId: "unknown-mon",
          name: "Unknown economics",
          opportunityScore: 70,
          monetizationScore: "UNKNOWN",
        }),
      ],
    });
    expect(records.find((row) => row.candidateId === "fixture-1")?.inLiveTop10).toBe(false);
    expect(records.find((row) => row.candidateId === "unknown-mon")?.monetizationScore).toBe("UNKNOWN");
    expect(compositeRankingScore(70, "UNKNOWN")).toBe(70);
  });

  it("passes live ranking, intelligence, universe detail, visibility, and selection gates", () => {
    const shortlists = seedHistoricalShortlists({
      originalTen: [{ candidateId: ASKREVIEW_CANDIDATE_ID, name: "AskReview", rank: 1, opportunityScore: 85.85, monetizationScore: 80.65 }],
      selectionForty: [{ candidateId: ASKREVIEW_CANDIDATE_ID, name: "AskReview", rank: 1, opportunityScore: 85.85, monetizationScore: 80.65 }],
    });
    const records = applyLiveOpportunityRanking({
      records: [
        makeCanonicalOpportunityRecord({
          candidateId: ASKREVIEW_CANDIDATE_ID,
          name: "AskReview",
          opportunityScore: 85.85,
          monetizationScore: 80.65,
          discoveryRunId: "3fd82037-0f03-425a-9212-f683d7cbd41a",
          shortlistIds: ["osl_askreview_discovery_v1", "osl_second_venture_eval_v2"],
        }),
        ...tenCandidates().slice(1),
      ],
    });
    const top = liveTop10(records);
    expect(evaluateLiveOpportunityRankingGate({ records, historicalShortlist: shortlists[0] }).result).toBe("PASS");
    expect(evaluateHQOpportunityIntelligenceQualityGate({
      records,
      liveTop10: top,
      historicalShortlist: shortlists[0],
      universeCardHref: OPPORTUNITIES_ROUTE,
      pageSize: OPPORTUNITY_COLLECTION_PAGE_SIZE,
    }).result).toBe("PASS");
    expect(evaluateOpportunityUniverseDetailGate({ records }).result).toBe("PASS");
    expect(evaluateOpportunityHqVisibilityGate({ records }).result).toBe("PASS");
    expect(evaluateVentureSelectionTraceabilityGate({
      selectedCandidateId: ASKREVIEW_CANDIDATE_ID,
      records,
      shortlists,
    }).result).toBe("PASS");
  });

  it("builds a clickable canonical universe card and live Top 10 radar cards", () => {
    const records = applyLiveOpportunityRanking({ records: tenCandidates() });
    const artifacts = buildLiveVentureRadarArtifacts({
      organizationId: "org-1",
      createdAt: "2026-09-09T00:00:00.000Z",
      discoveryState: "COMPLETE",
      universeCount: 133,
      liveTop10: liveTop10(records),
    });
    expect(artifacts[0]!.metadata.href).toBe(OPPORTUNITIES_ROUTE);
    expect(artifacts[0]!.metadata.universe).toBe(true);
    expect(artifacts[0]!.title).toContain("133 canonical opportunities");
    expect(artifacts[0]!.subtitle).toContain("View all");
    expect(artifacts).toHaveLength(11);
    expect(String(artifacts[1]!.subtitle)).toContain("#1");
    expect(String(artifacts[1]!.subtitle)).toMatch(/Opp|Mon/);
  });

  it("does not treat an unchanged snapshot as material", () => {
    const ranked = applyLiveOpportunityRanking({ records: tenCandidates() });
    const first = createOpportunityRankingSnapshot({ records: ranked, timestamp: "2026-09-01T00:00:00.000Z" });
    const second = createOpportunityRankingSnapshot({ records: ranked, timestamp: "2026-09-02T00:00:00.000Z" });
    expect(isMaterialRankingChange(first, second)).toBe(false);
  });

  it("keeps full-universe pagination usable at 10/40/133/500", () => {
    expect(OPPORTUNITY_COLLECTION_SCALE_FIXTURES).toEqual([10, 40, 133, 500]);
    for (const count of OPPORTUNITY_COLLECTION_SCALE_FIXTURES) {
      const rendered = renderOpportunityCollectionFixture(count);
      expect(rendered.renderedItemCount).toBeLessThanOrEqual(25);
      expect(rendered.pageSize).toBe(25);
      const page = paginateOpportunities(
        Array.from({ length: count }, (_, index) => makeCanonicalOpportunityRecord({
          candidateId: `scale-${index}`,
          name: `Scale ${index}`,
          liveRank: index + 1,
          rank: index + 1,
          opportunityScore: 80 - index * 0.01,
        })),
        { page: 1 },
      );
      expect(page.items.length).toBeLessThanOrEqual(25);
      expect(page.pageCount).toBe(Math.max(1, Math.ceil(count / 25)));
      expect(page.items[0]?.liveRank).toBe(1);
    }
    expect(evaluateOpportunityCollectionScale().result).toBe("PASS");
  });
});
