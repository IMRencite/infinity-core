import Link from "next/link";
import type {
  OpportunitySummary,
  OpportunityWithEvaluation,
} from "@/lib/infinity/opportunities";

function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }

  return String(Math.round(Number(value)));
}

function formatDecision(decision: string): string {
  return decision.replaceAll("_", " ");
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold tracking-tight text-white">{value}</p>
    </div>
  );
}

function OpportunityRow({ opportunity }: { opportunity: OpportunityWithEvaluation }) {
  const evaluation = opportunity.latestEvaluation;
  const allocation = opportunity.latestAllocation;
  const uncertainty =
    evaluation?.uncertainty &&
    typeof evaluation.uncertainty === "object" &&
    !Array.isArray(evaluation.uncertainty) &&
    "missing_dimensions" in evaluation.uncertainty
      ? (evaluation.uncertainty as { missing_dimensions?: string[] }).missing_dimensions ?? []
      : [];

  return (
    <li className="flex items-start justify-between gap-3 border-t border-white/[0.04] py-3 first:border-t-0 first:pt-0">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-zinc-200">
          {opportunity.name}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-600">
          {opportunity.summary ?? "No summary recorded."}
        </p>
        <p className="mt-1 text-[11px] text-zinc-600">
          {opportunity.status.replaceAll("_", " ")} ·{" "}
          {formatDecision(opportunity.decision)}
        </p>
        {evaluation ? (
          <div className="mt-2 space-y-1 text-[11px] text-zinc-500">
            <p>
              Evaluation: {evaluation.evaluation_status} ·{" "}
              {evaluation.recommendation.replaceAll("_", " ")}
            </p>
            {uncertainty.length > 0 ? (
              <p>Missing: {uncertainty.slice(0, 3).join(", ")}</p>
            ) : null}
            {allocation ? (
              <p>Allocation: {allocation.status.replaceAll("_", " ")}</p>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-[11px] text-zinc-600">Not evaluated yet</p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[12px] font-medium text-zinc-300">
          {formatScore(evaluation?.overall_score ?? opportunity.overall_score)}
        </p>
        <p className="mt-0.5 text-[10px] text-zinc-600">
          conf {formatScore(evaluation?.confidence_score ?? opportunity.confidence_score)}
        </p>
      </div>
    </li>
  );
}

export function OpportunitiesPortfolioSection({
  summary,
  opportunities,
  showViewAllLink = false,
}: {
  summary: OpportunitySummary;
  opportunities: OpportunityWithEvaluation[];
  showViewAllLink?: boolean;
}) {
  const isEmpty = summary.totalCount === 0;

  return (
    <section aria-label="Opportunities" className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Discovered opportunities
        </h2>
        {showViewAllLink ? (
          <Link
            href="/dashboard/opportunities"
            className="text-[11px] font-medium text-zinc-500 transition hover:text-zinc-300"
          >
            View all
          </Link>
        ) : null}
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] px-4 py-4">
        {isEmpty ? (
          <p className="text-[13px] leading-relaxed text-zinc-500">
            No discovered opportunities yet. Run a Command discovery cycle to
            execute the deterministic foundation provider. Results are labeled
            stub data until external observation and research adapters are
            enabled. Venture creation remains disabled.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <SummaryMetric label="Total" value={String(summary.totalCount)} />
              <SummaryMetric
                label="Recommended"
                value={String(summary.recommendedCount)}
              />
              <SummaryMetric
                label="Avg score"
                value={formatScore(summary.averageOverallScore)}
              />
              <SummaryMetric
                label="Pending decision"
                value={String(summary.pendingDecisionCount)}
              />
            </div>

            {opportunities.length > 0 ? (
              <ul className="mt-4 border-t border-white/[0.06] pt-4">
                {opportunities.slice(0, 5).map((opportunity) => (
                  <OpportunityRow key={opportunity.id} opportunity={opportunity} />
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
