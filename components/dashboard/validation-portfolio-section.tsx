"use client";

import type { ValidationRunWithDetails } from "@/lib/infinity/validation";

function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }

  return String(Math.round(Number(value)));
}

function formatRecommendation(value: string): string {
  return value.replaceAll("_", " ");
}

export function ValidationPortfolioSection({
  summary,
  runs,
}: {
  summary: {
    totalRuns: number;
    pendingCount: number;
    completedCount: number;
    approvedForPlanningCount: number;
    blockedCount: number;
  };
  runs: ValidationRunWithDetails[];
}) {
  return (
    <section aria-label="Validation portfolio" className="mt-8">
      <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
        Validation
      </h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Total runs", value: String(summary.totalRuns) },
          { label: "Pending", value: String(summary.pendingCount) },
          { label: "Completed", value: String(summary.completedCount) },
          { label: "Approved for planning", value: String(summary.approvedForPlanningCount) },
          { label: "Blocked", value: String(summary.blockedCount) },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] px-3 py-3"
          >
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">
              {item.label}
            </p>
            <p className="mt-2 text-xl font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-white/[0.06] bg-[#0b0b0b]">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <p className="text-[13px] font-medium text-zinc-200">Recent validation runs</p>
          <p className="mt-1 text-[12px] text-zinc-500">
            Deterministic validation only. AI Reasoning Layer not implemented. Validation never
            approves building or creates ventures.
          </p>
        </div>

        {runs.length === 0 ? (
          <p className="px-4 py-6 text-[13px] text-zinc-500">No validation runs yet.</p>
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {runs.map((run) => (
              <li key={run.id} className="px-4 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[14px] font-medium text-zinc-100">
                      {run.opportunityName ?? "Opportunity"}
                    </p>
                    <p className="mt-1 text-[12px] text-zinc-500">
                      Status: {run.run_status} · Recommendation:{" "}
                      {formatRecommendation(run.recommendation)}
                    </p>
                  </div>
                  <div className="text-[12px] text-zinc-400 sm:text-right">
                    <p>Confidence: {formatScore(run.overall_confidence)}</p>
                    <p>Score: {formatScore(run.overall_score)}</p>
                    <p>
                      Planner eligible:{" "}
                      {run.recommendation === "approved_for_planning" ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-zinc-600">
                  {run.dimensionCount} dimensions · {run.blockingFindingCount} blocking findings
                  {run.is_sparse_system_validation ? " · system-validation context" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-3 text-[11px] text-zinc-600">
        Only <span className="text-zinc-500">approved_for_planning</span> may continue to Planner
        initiative work. Build Factory remains future work.
      </p>
    </section>
  );
}
