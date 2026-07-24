import Link from "next/link";
import type { AllocationProposal, AllocationSummary, ResourcePool } from "@/lib/infinity/allocation";

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

function ProposalRow({ proposal }: { proposal: AllocationProposal }) {
  return (
    <li className="border-t border-white/[0.04] py-2 first:border-t-0 first:pt-0">
      <p className="text-[13px] font-medium text-zinc-200">
        {proposal.allocation_type.replaceAll("_", " ")} ·{" "}
        {proposal.status.replaceAll("_", " ")}
      </p>
      <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-600">
        {proposal.expected_outcome}
      </p>
    </li>
  );
}

function PoolRow({ pool }: { pool: ResourcePool }) {
  const available =
    Number(pool.total_capacity) -
    Number(pool.reserved_capacity) -
    Number(pool.consumed_capacity);

  return (
    <li className="flex items-center justify-between gap-3 border-t border-white/[0.04] py-2 first:border-t-0 first:pt-0">
      <div>
        <p className="text-[13px] font-medium text-zinc-200">{pool.name}</p>
        <p className="mt-0.5 text-[11px] text-zinc-600">
          {pool.resource_type.replaceAll("_", " ")}
        </p>
      </div>
      <p className="text-[12px] text-zinc-400">
        {available}/{pool.total_capacity} available
      </p>
    </li>
  );
}

export function AllocationsPortfolioSection({
  summary,
  proposals,
  pools,
}: {
  summary: AllocationSummary;
  proposals: AllocationProposal[];
  pools: ResourcePool[];
}) {
  const isEmpty = summary.poolCount === 0 && proposals.length === 0;

  return (
    <section aria-label="Allocations" className="space-y-6">
      <div className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] px-4 py-4">
        {isEmpty ? (
          <p className="text-[13px] leading-relaxed text-zinc-500">
            No allocation proposals yet. Evaluations that recommend validate or
            approve_initiative may create proposals. Resource pools bootstrap with
            zero capacity until policy and funding are configured.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <SummaryMetric label="Proposed" value={String(summary.proposedCount)} />
              <SummaryMetric
                label="Awaiting approval"
                value={String(summary.awaitingApprovalCount)}
              />
              <SummaryMetric
                label="Policy blocked"
                value={String(summary.policyBlockedCount)}
              />
              <SummaryMetric
                label="Reserved/approved"
                value={String(summary.approvedOrReservedCount)}
              />
            </div>

            {proposals.length > 0 ? (
              <ul className="mt-4 border-t border-white/[0.06] pt-4">
                {proposals.slice(0, 8).map((proposal) => (
                  <ProposalRow key={proposal.id} proposal={proposal} />
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] px-4 py-4">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Resource pools
        </h2>
        {pools.length === 0 ? (
          <p className="mt-3 text-[13px] text-zinc-500">No resource pools configured.</p>
        ) : (
          <ul className="mt-3">
            {pools.map((pool) => (
              <PoolRow key={pool.id} pool={pool} />
            ))}
          </ul>
        )}
        <p className="mt-4 text-[11px] text-zinc-600">
          Read-only view. No unrestricted approval or spending controls are exposed here.
        </p>
        <Link
          href="/dashboard/opportunities"
          className="mt-3 inline-block text-[11px] font-medium text-zinc-500 transition hover:text-zinc-300"
        >
          View opportunities
        </Link>
      </div>
    </section>
  );
}
