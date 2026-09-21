export function ResultMetric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="onpv-result-metric" data-result-metric="true">
      <dt>{label}</dt>
      <dd>
        <span>{value}</span>
        {unit ? <span className="onpv-muted"> {unit}</span> : null}
      </dd>
    </div>
  );
}
