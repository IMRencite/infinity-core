import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOperatorOrgContext } from "@/lib/infinity/operator-console/require-org-context";
import { loadCanonicalOpportunityUniverse } from "@/lib/infinity/opportunity-universe-hq/load";
import { ASKREVIEW_CANDIDATE_ID, ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { OCCUPANCYNPV_CANDIDATE_ID, OCCUPANCYNPV_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { HISTORICAL_SCORE_DATA_UNAVAILABLE } from "@/lib/infinity/opportunity-universe-hq/types";

type Props = { params: Promise<{ candidateId: string }> };

function score(value: number | "UNKNOWN"): string {
  return value === "UNKNOWN" ? "UNKNOWN" : value.toFixed(2);
}

export default async function OpportunityCandidatePage({ params }: Props) {
  const { candidateId } = await params;
  const org = await requireOperatorOrgContext();
  const universe = await loadCanonicalOpportunityUniverse(createAdminClient(), org.organizationId);
  const record = universe.real.find((row) => row.candidateId === candidateId);
  if (!record) notFound();
  const original = universe.shortlists.find((row) => row.shortlistId === "osl_askreview_discovery_v1");
  const v2 = universe.shortlists.find((row) => row.shortlistId === "osl_second_venture_eval_v2");
  const originalMember = original?.members.find((row) => row.candidateId === record.candidateId);
  const v2Member = v2?.members.find((row) => row.candidateId === record.candidateId);
  const askreview = record.candidateId === ASKREVIEW_CANDIDATE_ID;
  const occupancy = record.candidateId === OCCUPANCYNPV_CANDIDATE_ID;

  return (
    <article data-opportunity-detail="true" className="space-y-6 text-zinc-200">
      <Link href="/dashboard/opportunities" className="text-[13px] text-zinc-500">← Opportunity universe</Link>
      <header>
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
          Live rank {record.liveRank != null ? `#${record.liveRank}` : "INELIGIBLE"}
          {record.inLiveTop10 ? " · LIVE TOP 10" : ""}
          {record.selectedVenture ? " · SELECTED VENTURE" : ""}
        </p>
        <h1 className="mt-2 text-[1.75rem] font-semibold text-white">{record.name}</h1>
        <p className="mt-1 text-[13px] text-zinc-500">{record.candidateId}</p>
      </header>

      <section>
        <h2 className="text-[12px] uppercase tracking-[0.16em] text-zinc-500">Opportunity overview</h2>
        <p className="mt-2 text-[14px] text-zinc-300">{record.reason}</p>
        <p className="mt-2 text-[13px] text-zinc-400">Problem: {record.problem}</p>
        <p className="text-[13px] text-zinc-400">Customer: {record.customer}</p>
        <p className="text-[13px] text-zinc-400">Industry / category: {record.industry}</p>
      </section>

      <section>
        <h2 className="text-[12px] uppercase tracking-[0.16em] text-zinc-500">Scores</h2>
        <p className="mt-2 text-[13px]">Current live rank: {record.liveRank != null ? `#${record.liveRank}` : "INELIGIBLE"}</p>
        <p className="text-[13px]">Opportunity score: {score(record.opportunityScore)} · model {record.scoringModel}</p>
        <p className="text-[13px]">Monetization score: {score(record.monetizationScore)} · viability {record.viability}</p>
        <p className="text-[13px]">Composite ranking score: {score(record.rankingScore)} · 55% opportunity / 45% monetization when both known</p>
        <p className="text-[13px]">Confidence: {record.confidence}</p>
      </section>

      <section>
        <h2 className="text-[12px] uppercase tracking-[0.16em] text-zinc-500">Score history</h2>
        {record.scoreHistoryStatus === HISTORICAL_SCORE_DATA_UNAVAILABLE && record.scoreHistory.length === 0 ? (
          <p className="mt-2 text-[13px]">{HISTORICAL_SCORE_DATA_UNAVAILABLE}. Future score changes will be snapshotted.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-[13px]">
            {record.scoreHistory.map((entry, index) => (
              <li key={`${entry.field}-${entry.timestamp}-${index}`}>
                {entry.field}: {score(entry.previous)} → {score(entry.current)} · {entry.timestamp} · {entry.reason} · {entry.scoringVersion}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-[12px] uppercase tracking-[0.16em] text-zinc-500">Research / evidence</h2>
        <p className="mt-2 text-[13px]">Evidence count: {String(record.evidenceCount)}</p>
        <p className="text-[13px]">Grounded source count: {String(record.groundedSourceCount)}</p>
        <p className="text-[13px]">Research status: {record.researchStatus}</p>
        <p className="text-[13px]">Latest evidence: {record.evidenceTimestamp ?? "UNKNOWN"}</p>
        <p className="text-[13px]">Freshness: {record.evidenceFreshness}</p>
        <p className="text-[13px]">Discovery run: {record.discoveryRunId ?? "UNKNOWN"}</p>
        <p className="text-[13px]">Demand / competition detail remains on linked research packets when present. Not invented here.</p>
      </section>

      <section>
        <h2 className="text-[12px] uppercase tracking-[0.16em] text-zinc-500">Monetization</h2>
        <p className="mt-2 text-[13px]">Business model: {record.businessModel}</p>
        <p className="text-[13px]">Hypothesized price / price model: {record.hypothesizedPrice}</p>
        <p className="text-[13px]">Viability classification: {record.viability}</p>
        <p className="text-[13px]">Known cost: {record.knownCost === "UNKNOWN" ? "UNKNOWN" : `$${record.knownCost}`}</p>
        <p className="text-[13px]">Unknown economics: {record.unknownEconomics ? "YES" : "NO"}</p>
      </section>

      <section>
        <h2 className="text-[12px] uppercase tracking-[0.16em] text-zinc-500">Decision and validation</h2>
        <p className="mt-2 text-[13px]">Status: {record.lifecycle}</p>
        <p className="text-[13px]">Current decision: {record.currentDecision}</p>
        <p className="text-[13px]">Validation state: {record.validationState}</p>
        <p className="text-[13px]">Selection state: {record.selectionState}</p>
        <p className="text-[13px]">Current blocker: {record.currentBlocker}</p>
      </section>

      <section>
        <h2 className="text-[12px] uppercase tracking-[0.16em] text-zinc-500">Selection lineage / ranking history</h2>
        <p className="mt-2 text-[13px]">Original 10 rank: {originalMember ? `#${originalMember.rank}` : "not in original 10"}</p>
        <p className="text-[13px]">V2 evaluation rank: {v2Member ? `#${v2Member.rank}` : "not in V2 40"}</p>
        <p className="text-[13px]">Historical shortlists: {record.shortlistIds.join(", ") || "none"}</p>
        <p className="text-[13px]">Related venture: {record.relatedVentureId ?? "none"}</p>
        <p className="text-[13px]">Live ranking snapshots: {universe.rankingSnapshots.length}</p>
      </section>

      <section>
        <h2 className="text-[12px] uppercase tracking-[0.16em] text-zinc-500">Backend / fulfillment / acquisition / missions</h2>
        <p className="mt-2 text-[13px]">
          Implications remain on the venture record when selected. This candidate view does not invent operating contracts.
        </p>
        <p className="text-[13px]">Traceability: candidate {record.candidateId} · discovery {record.discoveryRunId ?? "UNKNOWN"} · scoring {record.scoringModel}</p>
      </section>

      {askreview ? (
        <section data-askreview-lineage="true">
          <h2 className="text-[12px] uppercase tracking-[0.16em] text-zinc-500">AskReview selection</h2>
          <p className="mt-2 text-[13px]">Current live rank: {record.liveRank != null ? `#${record.liveRank}` : "INELIGIBLE"}</p>
          <p className="text-[13px]">Current score: {score(record.opportunityScore)} · monetization {score(record.monetizationScore)}</p>
          <p className="text-[13px]">Original ranking: {originalMember ? `#${originalMember.rank}` : "UNKNOWN"}</p>
          <p className="text-[13px]">V2 ranking: {v2Member ? `#${v2Member.rank}` : "UNKNOWN"}</p>
          <p className="text-[13px]">Venture: {ASKREVIEW_VENTURE_ID}</p>
          <p className="text-[13px]">Selection state: SELECTION_UNDER_REVIEW · production advancement PAUSED</p>
        </section>
      ) : null}

      {occupancy ? (
        <section data-occupancynpv-lineage="true">
          <h2 className="text-[12px] uppercase tracking-[0.16em] text-zinc-500">OccupancyNPV</h2>
          <p className="mt-2 text-[13px]">Status: {record.selectionState}</p>
          <p className="text-[13px]">Venture: {OCCUPANCYNPV_VENTURE_ID}</p>
          <p className="text-[13px]">This is a selected / publicly launched venture, not an unselected new opportunity.</p>
        </section>
      ) : null}
    </article>
  );
}
