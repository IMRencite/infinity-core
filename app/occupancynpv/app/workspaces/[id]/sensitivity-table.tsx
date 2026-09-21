import { formatRate, formatUsd } from "./comparison-result-presentation";

export function SensitivityTable({
  leaseName,
  rows,
}: {
  leaseName: string;
  rows: Array<{ annual_discount_rate: number; npv: number }>;
}) {
  if (!rows.length) return null;
  return (
    <section className="onpv-sensitivity" data-sensitivity-table="true">
      <h3>Discount-rate sensitivity</h3>
      <p className="onpv-muted">{leaseName} NPV at selected annual discount rates. Sensitivity is shown for the first entered scenario only.</p>
      <div className="onpv-table-wrap">
        <table>
          <caption className="onpv-sr-only">Discount rate and {leaseName} NPV</caption>
          <thead>
            <tr>
              <th scope="col">Discount rate</th>
              <th scope="col">{leaseName} NPV</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.annual_discount_rate}>
                <td>{formatRate(row.annual_discount_rate)}</td>
                <td>{formatUsd(row.npv)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
