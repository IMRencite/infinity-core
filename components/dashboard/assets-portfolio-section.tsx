import Link from "next/link";
import type { Asset, AssetSummary } from "@/lib/infinity/assets";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function SummaryMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold tracking-tight text-white">{value}</p>
    </div>
  );
}

function AssetRow({ asset }: { asset: Asset }) {
  return (
    <li className="flex items-center justify-between gap-3 border-t border-white/[0.04] py-2 first:border-t-0 first:pt-0">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-zinc-200">{asset.name}</p>
        <p className="mt-0.5 text-[11px] text-zinc-600">
          {asset.asset_type.replaceAll("_", " ")} · {asset.status}
        </p>
      </div>
      <p className="shrink-0 text-[12px] text-zinc-500">
        {asset.estimated_value !== null
          ? formatCurrency(Number(asset.estimated_value))
          : "—"}
      </p>
    </li>
  );
}

export function AssetsPortfolioSection({
  summary,
  recentAssets,
  showViewAllLink = false,
}: {
  summary: AssetSummary;
  recentAssets: Asset[];
  showViewAllLink?: boolean;
}) {
  const isEmpty = summary.totalCount === 0;

  return (
    <section aria-label="Assets" className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Portfolio assets
        </h2>
        {showViewAllLink ? (
          <Link
            href="/dashboard/assets"
            className="text-[11px] font-medium text-zinc-500 transition hover:text-zinc-300"
          >
            View all
          </Link>
        ) : null}
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] px-4 py-4">
        {isEmpty ? (
          <p className="text-[13px] leading-relaxed text-zinc-500">
            No assets yet. Infinity will create portfolio assets autonomously through
            its Build Factory and acquisition systems when those engines are enabled.
            Manual asset entry is not required.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <SummaryMetric label="Total assets" value={String(summary.totalCount)} />
              <SummaryMetric label="Active assets" value={String(summary.activeCount)} />
              <SummaryMetric
                label="Estimated value"
                value={formatCurrency(summary.totalEstimatedValue)}
              />
              <SummaryMetric
                label="Monthly revenue"
                value={formatCurrency(summary.totalMonthlyRevenue)}
              />
            </div>

            {recentAssets.length > 0 ? (
              <ul className="mt-4 border-t border-white/[0.06] pt-4">
                {recentAssets.slice(0, 5).map((asset) => (
                  <AssetRow key={asset.id} asset={asset} />
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
