import { formatRate, formatUsd, type ComparisonScenarioView } from "./comparison-result-presentation";
import { ResultMetric } from "./result-metric";

export function ComparisonSummaryCard({
  leaseLabel,
  scenario,
  highlighted,
}: {
  leaseLabel: string;
  scenario: ComparisonScenarioView;
  highlighted?: boolean;
}) {
  return (
    <article className={`onpv-card onpv-result-card${highlighted ? " onpv-result-card--lower" : ""}`} data-lease-card={leaseLabel}>
      <p className="onpv-kicker">{leaseLabel}</p>
      <h3>{scenario.scenario_name}</h3>
      <dl className="onpv-result-metrics">
        <ResultMetric label="NPV" value={formatUsd(scenario.npv)} />
        <ResultMetric label="Total nominal occupancy cost" value={formatUsd(scenario.total_nominal_occupancy_cost)} />
        <ResultMetric label="Lease term" value={String(scenario.term_months)} unit="months" />
        <ResultMetric label="Discount rate" value={formatRate(scenario.annual_discount_rate)} />
        {scenario.monthly_rent != null ? <ResultMetric label="Monthly rent" value={formatUsd(scenario.monthly_rent)} /> : null}
        {scenario.stepped_monthly_rent != null && scenario.stepped_monthly_rent !== scenario.monthly_rent
          ? <ResultMetric label="Stepped monthly rent" value={formatUsd(scenario.stepped_monthly_rent)} />
          : null}
        {scenario.free_rent_months ? <ResultMetric label="Free rent" value={String(scenario.free_rent_months)} unit="months" /> : null}
        {scenario.monthly_operating_expenses ? <ResultMetric label="Operating expense" value={formatUsd(scenario.monthly_operating_expenses)} /> : null}
        {scenario.allowance ? <ResultMetric label="Allowance" value={formatUsd(scenario.allowance)} /> : null}
      </dl>
    </article>
  );
}
