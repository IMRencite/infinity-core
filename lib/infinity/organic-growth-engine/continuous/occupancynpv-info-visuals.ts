/** Deterministic informational visuals for OccupancyNPV blog articles (HTML/CSS, not generated images). */

export type OccupancyInfoVisualSlug =
  | "how-is-cap-rate-calculated-for-a-building"
  | "how-do-you-compare-two-commercial-lease-options"
  | "what-numbers-do-you-need-to-compare-two-leases"
  | "what-is-occupancy-cost-versus-rent"
  | "gross-lease-vs-net-lease-for-tenants"
  | "expense-stop-vs-base-year-for-tenants"
  | "how-free-rent-affects-occupancy-cost-for-tenants"
  | "how-ti-amortization-affects-occupancy-cost-for-tenants"
  | "cam-first-year"
  | "how-interest-rates-affect-commercial-property-values";

export function occupancyInfoVisualHtml(slug: OccupancyInfoVisualSlug): string {
  switch (slug) {
    case "how-is-cap-rate-calculated-for-a-building":
      return `<div className="onpv-info-visual" data-onpv-info-visual="formula" role="region" aria-label="Cap rate formula">
  <p className="onpv-formula-label">Cap rate identity</p>
  <p className="onpv-formula-eq"><strong>Cap Rate</strong> = Net Operating Income ÷ Property Value (or Purchase Price)</p>
  <p className="onpv-formula-note">Express as a decimal or percentage. Label whether NOI is trailing or stabilized.</p>
</div>
<div className="onpv-info-visual" data-onpv-info-visual="worked-example" role="region" aria-label="Hypothetical cap rate example">
  <p className="onpv-example-label">Hypothetical example (not market data)</p>
  <table className="onpv-info-table">
    <thead><tr><th scope="col">Input</th><th scope="col">Value</th></tr></thead>
    <tbody>
      <tr><td>Stabilized NOI</td><td>$120,000</td></tr>
      <tr><td>Going-in cap rate</td><td>6.0%</td></tr>
      <tr><td>Indicated value</td><td>$120,000 ÷ 0.06 = $2,000,000</td></tr>
    </tbody>
  </table>
</div>`;
    case "how-ti-amortization-affects-occupancy-cost-for-tenants":
      return `<div className="onpv-info-visual" data-onpv-info-visual="table" role="region" aria-label="TI amortization on occupancy-cost timeline">
  <p className="onpv-table-label">Illustrative amortization month (hypothetical)</p>
  <table className="onpv-info-table">
    <thead><tr><th scope="col">Line</th><th scope="col">Monthly amount</th><th scope="col">Notes</th></tr></thead>
    <tbody>
      <tr><td>Base rent</td><td>$8,500</td><td>Face rent per schedule</td></tr>
      <tr><td>TI amortization</td><td>$1,200</td><td>Allowance spread per lease</td></tr>
      <tr><td>CAM / recoveries</td><td>$950</td><td>Often separate from TI line</td></tr>
      <tr><td>Occupancy-cost total</td><td>$10,650</td><td>Compare paths on this row</td></tr>
    </tbody>
  </table>
</div>`;
    case "how-free-rent-affects-occupancy-cost-for-tenants":
      return `<div className="onpv-info-visual" data-onpv-info-visual="table" role="region" aria-label="Free rent versus CAM during abatement">
  <p className="onpv-table-label">Illustrative abatement month (hypothetical)</p>
  <table className="onpv-info-table">
    <thead><tr><th scope="col">Line</th><th scope="col">Month with free base rent</th><th scope="col">Typical billing note</th></tr></thead>
    <tbody>
      <tr><td>Base rent</td><td>$0 (abated)</td><td>Per rent schedule</td></tr>
      <tr><td>CAM / recoveries</td><td>Still estimated</td><td>Often not abated unless lease says so</td></tr>
      <tr><td>Occupancy-cost row</td><td>CAM + other pass-throughs</td><td>Do not budget abatement headline only</td></tr>
    </tbody>
  </table>
</div>`;
    case "expense-stop-vs-base-year-for-tenants":
      return `<div className="onpv-info-visual" data-onpv-info-visual="table" role="region" aria-label="Expense stop versus base year">
  <p className="onpv-table-label">Illustrative recovery mechanics (hypothetical)</p>
  <table className="onpv-info-table">
    <thead><tr><th scope="col">Mechanism</th><th scope="col">What moves</th><th scope="col">Tenant risk note</th></tr></thead>
    <tbody>
      <tr><td>Expense stop</td><td>Recoveries capped at stop level in lease</td><td>Landlord may absorb overruns above stop</td></tr>
      <tr><td>Base year</td><td>Bill share of expenses above documented base year</td><td>Year-one CAM can understate later steps</td></tr>
      <tr><td>Occupancy-cost row</td><td>Label stop or base year beside CAM estimate</td><td>Face rent alone misleads</td></tr>
    </tbody>
  </table>
</div>`;
    case "gross-lease-vs-net-lease-for-tenants":
      return `<div className="onpv-info-visual" data-onpv-info-visual="table" role="region" aria-label="Gross versus net lease lines">
  <p className="onpv-table-label">Illustrative structure comparison (hypothetical)</p>
  <table className="onpv-info-table">
    <thead><tr><th scope="col">Line</th><th scope="col">Gross-style quote</th><th scope="col">Net-style quote</th></tr></thead>
    <tbody>
      <tr><td>Headline rent</td><td>$34 / sf (bundled)</td><td>$28 / sf base</td></tr>
      <tr><td>CAM / recoveries</td><td>Often inside bundle</td><td>$6 / sf itemized</td></tr>
      <tr><td>Year-one occupancy cash</td><td>Unpack bundle</td><td>$34 / sf illustrative</td></tr>
    </tbody>
  </table>
  <p className="onpv-table-note">Compare occupancy cost on one timeline—not headline rent alone.</p>
</div>`;
    case "how-do-you-compare-two-commercial-lease-options":
      return `<div className="onpv-info-visual" data-onpv-info-visual="table" role="region" aria-label="Lease comparison fields">
  <p className="onpv-table-label">Compare on one timeline — example fields (hypothetical)</p>
  <table className="onpv-info-table">
    <thead>
      <tr>
        <th scope="col">Line item</th>
        <th scope="col">Lease A (example)</th>
        <th scope="col">Lease B (example)</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Base rent (Yr 1)</td><td>$32 / sf</td><td>$28 / sf</td></tr>
      <tr><td>CAM / recoveries (Yr 1)</td><td>$4 / sf</td><td>$6 / sf</td></tr>
      <tr><td>Free rent</td><td>1 month</td><td>3 months</td></tr>
      <tr><td>TI allowance</td><td>$40 / sf</td><td>$15 / sf</td></tr>
      <tr><td>Term</td><td>5 years</td><td>5 years</td></tr>
      <tr><td>Year-one occupancy cash (illustrative)</td><td>$36 / sf</td><td>$34 / sf</td></tr>
    </tbody>
  </table>
  <p className="onpv-table-note">Replace with your packet numbers; face rent alone can invert the winner.</p>
</div>`;
    case "what-numbers-do-you-need-to-compare-two-leases":
      return `<div className="onpv-info-visual" data-onpv-info-visual="checklist" role="region" aria-label="Lease comparison checklist">
  <p className="onpv-checklist-label">Minimum packet before you compare two leases</p>
  <ul className="onpv-info-checklist">
    <li>Base rent and escalation schedule</li>
    <li>CAM estimate and recovery mechanism (NNN, base year, gross)</li>
    <li>Tax, insurance, and other pass-throughs on the same timeline</li>
    <li>Free rent and tenant improvement allowance</li>
    <li>Commencement, term, options, and early termination rights</li>
  </ul>
</div>`;
    case "what-is-occupancy-cost-versus-rent":
      return `<div className="onpv-info-visual" data-onpv-info-visual="table" role="region" aria-label="Rent versus occupancy cost">
  <table className="onpv-info-table">
    <thead><tr><th scope="col">Concept</th><th scope="col">Typically includes</th></tr></thead>
    <tbody>
      <tr><td>Base rent</td><td>Contract rent for premises (fixed or % rent per lease)</td></tr>
      <tr><td>Total occupancy cost</td><td>Rent plus recoveries, tenant-paid operating lines, and timing items (free rent, TI) on the same timeline</td></tr>
    </tbody>
  </table>
</div>`;
    case "cam-first-year":
      return `<div className="onpv-info-visual" data-onpv-info-visual="step-flow" role="region" aria-label="First-year CAM treatment">
  <ol className="onpv-info-steps">
    <li>Request the landlord’s CAM estimate and expense definition for year one.</li>
    <li>Label it as an estimate—not a final reconciliation bill.</li>
    <li>Place CAM on the same occupancy-cost timeline as base rent.</li>
    <li>Stress-test (+10%) before you treat the estimate as done.</li>
    <li>Compare against prior-year reconciliation when the packet allows.</li>
  </ol>
</div>`;
    case "how-interest-rates-affect-commercial-property-values":
      return `<div className="onpv-info-visual" data-onpv-info-visual="flow" role="region" aria-label="Rates to valuation pressure">
  <ol className="onpv-info-flow">
    <li>Financing and credit conditions shift buyer cost of capital.</li>
    <li>Underwriting adjusts required going-in yields on stabilized NOI.</li>
    <li>Higher required yield, holding NOI constant, lowers indicated value (NOI ÷ cap rate).</li>
    <li>NOI paths can move independently—do not assume rate moves apply uniformly.</li>
  </ol>
  <p className="onpv-flow-note">Illustrative cause chain—not a forecast of market cap rates.</p>
</div>`;
    default:
      return "";
  }
}

export function slugFromOccupancyPath(path: string): OccupancyInfoVisualSlug | null {
  const slug = path.replace(/\/+$/, "").split("/").pop() ?? "";
  const allowed: OccupancyInfoVisualSlug[] = [
    "how-is-cap-rate-calculated-for-a-building",
    "gross-lease-vs-net-lease-for-tenants",
    "expense-stop-vs-base-year-for-tenants",
    "how-free-rent-affects-occupancy-cost-for-tenants",
    "how-ti-amortization-affects-occupancy-cost-for-tenants",
    "how-do-you-compare-two-commercial-lease-options",
    "what-numbers-do-you-need-to-compare-two-leases",
    "what-is-occupancy-cost-versus-rent",
    "cam-first-year",
    "how-interest-rates-affect-commercial-property-values",
  ];
  return allowed.includes(slug as OccupancyInfoVisualSlug) ? (slug as OccupancyInfoVisualSlug) : null;
}
