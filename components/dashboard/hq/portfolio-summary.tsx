import Link from "next/link";
import type { HqPortfolioSummary } from "@/lib/infinity/hq/types";
import { HQ_ROUTES } from "@/lib/infinity/hq/constants";
import { HqSection } from "./empty-state";

export function PortfolioSummaryPanel({ portfolio }: { portfolio: HqPortfolioSummary }) {
  return (
    <HqSection
      id="financial-portfolio"
      title="Financial and Portfolio"
      subtitle="Real allocation and blueprint estimates only."
    >
      <dl className="divide-y divide-zinc-800/60 text-[12px]">
        {[
          ["Reserved / pools", portfolio.reservedCapital],
          ["Allocation proposals", portfolio.approvedAllocation],
          ["Blueprint budgets", portfolio.estimatedBlueprintBudgetTotal],
          ["Opportunity value signals", portfolio.estimatedOpportunityRoi],
          [
            "Active proposals (count)",
            portfolio.activeAllocationProposals === null
              ? "No data yet"
              : String(portfolio.activeAllocationProposals),
          ],
          ["Revenue", portfolio.revenueTracking],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-wrap justify-between gap-2 px-4 py-2">
            <dt className="text-zinc-500">{label}</dt>
            <dd className="max-w-[65%] text-right text-zinc-200">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-zinc-800/60 px-4 py-2 text-[11px] text-zinc-600">
        <Link href={HQ_ROUTES.allocations} className="text-sky-400 hover:underline">
          Allocations
        </Link>
      </p>
    </HqSection>
  );
}
