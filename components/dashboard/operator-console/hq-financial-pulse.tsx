"use client";

import Link from "next/link";
import {
  HQ_FINANCIAL_TRUTH_ANCHOR,
  type HqFinancialTruthView,
} from "@/lib/infinity/financial-truth/types";
import {
  projectHqFinancialPulseFromView,
  pulseGroupMetrics,
  type HqFinancialPulseMetric,
} from "@/lib/infinity/financial-truth/financial-pulse";

function scrollToFullFinancialTruth() {
  document.getElementById(HQ_FINANCIAL_TRUTH_ANCHOR)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function PulseMetric({ metric }: { metric: HqFinancialPulseMetric }) {
  const body = (
    <>
      <p className="hq-financial-pulse__label">{metric.label}</p>
      <p className="hq-financial-pulse__value">{metric.display}</p>
    </>
  );
  if (metric.action === "OPEN_ALLOCATIONS") {
    return (
      <Link
        href={metric.href}
        className="hq-financial-pulse__metric"
        data-hq-financial-pulse-metric={metric.id}
        data-hq-financial-pulse-action={metric.action}
        data-hq-financial-pulse-group={metric.group}
      >
        {body}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className="hq-financial-pulse__metric"
      data-hq-financial-pulse-metric={metric.id}
      data-hq-financial-pulse-action={metric.action}
      data-hq-financial-pulse-group={metric.group}
      onClick={scrollToFullFinancialTruth}
    >
      {body}
    </button>
  );
}

export function HqFinancialPulse({ view }: { view: HqFinancialTruthView | null | undefined }) {
  const pulse = projectHqFinancialPulseFromView(view);
  if (!pulse) return null;
  const treasury = pulseGroupMetrics(pulse, "treasury");
  const performance = pulseGroupMetrics(pulse, "performance");
  return (
    <section
      className="hq-financial-pulse"
      data-hq-region="financial-pulse"
      data-hq-financial-pulse="true"
      data-hq-financial-pulse-source={pulse.source_contract}
      data-hq-financial-pulse-economics={pulse.economics_contract}
      data-hq-financial-pulse-status={pulse.status_label}
      data-hq-financial-completeness={pulse.cash_completeness}
      aria-label="Infinity financial pulse"
    >
      <p className="hq-financial-pulse__status">{pulse.status_label}</p>
      <div className="hq-financial-pulse__body">
        <div className="hq-financial-pulse__group" data-hq-financial-pulse-group="treasury">
          <p className="hq-financial-pulse__group-label">Treasury / Capital</p>
          <div className="hq-financial-pulse__metrics">
            {treasury.map((metric) => (
              <PulseMetric key={metric.id} metric={metric} />
            ))}
          </div>
        </div>
        <div className="hq-financial-pulse__group" data-hq-financial-pulse-group="performance">
          <p className="hq-financial-pulse__group-label">Venture Performance</p>
          <div className="hq-financial-pulse__metrics">
            {performance.map((metric) => (
              <PulseMetric key={metric.id} metric={metric} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
