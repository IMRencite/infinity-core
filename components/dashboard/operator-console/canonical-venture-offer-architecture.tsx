import type { OfferArchitectureHqView } from "@/lib/infinity/offer-architecture/types";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="text-zinc-100">{value}</dd>
    </div>
  );
}

export function CanonicalVentureOfferArchitecture({ view }: { view: OfferArchitectureHqView }) {
  return (
    <section
      className="rounded-lg border border-white/10 p-4"
      data-hq-region="offer-deal-architecture"
      data-hq-offer-architecture="true"
    >
      <h2 className="text-sm font-semibold text-white">Offer + Deal Architecture</h2>
      <p className="mt-1 text-xs text-zinc-500">Read-only projection. Base price and purchase model are not a promotional offer.</p>
      <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <Row label="Pricing" value={view.pricing_architecture} />
        <Row label="Purchase Model" value={view.purchase_model} />
        <Row label="Acquisition Offer" value={view.promotional_offer} />
        <Row label="Promotional Offer" value={view.promotional_offer} />
        <Row label="Offer Optimization" value={view.offer_optimization} />
        <Row label="Conversion UX" value={view.conversion_ux} />
        <Row label="Above-Fold CTA" value={view.above_fold_cta} />
        <Row label="Panel Spacing" value={view.panel_spacing} />
        <Row label="Card Required" value={view.card_required} />
        <Row label="Auto Convert" value={view.auto_convert} />
        <Row label="Pricing Content Depth" value={view.pricing_content_depth} />
        <Row label="Page" value={view.page} />
        <Row label="Information Depth" value={view.information_depth} />
        <Row label="Question Coverage" value={view.question_coverage} />
        <Row label="Product Understanding" value={view.product_understanding} />
        <Row label="Buyer Decision Support" value={view.buyer_decision_support} />
        <Row label="Information Gain" value={view.information_gain} />
        <Row label="Thinness" value={view.thinness} />
        <Row label="Missing Material Questions" value={String(view.missing_material_questions)} />
        <Row label="Page Depth Summary" value={view.page_depth_summary} />
        <Row label="Page Depth Total" value={String(view.page_depth_total)} />
        <Row label="Page Depth Passed" value={String(view.page_depth_passed)} />
        <Row label="Page Depth Failed" value={String(view.page_depth_failed)} />
        <Row label="Page Depth Thin" value={String(view.page_depth_thin)} />
        <Row label="Page Depth Unverified" value={String(view.page_depth_unverified)} />
        <Row label="Thin Pages" value={view.page_depth_thin_pages} />
        <Row label="Missing Material Questions By Page" value={view.page_depth_missing_questions} />
        <Row label="Whitespace" value={view.whitespace} />
        <Row label="Offer Experiment" value={view.current_experiment} />
        <Row label="Current Offer" value={view.current_offer} />
        <Row label="Offer Type" value={String(view.offer_type)} />
        <Row label="Offer Status" value={String(view.offer_status)} />
        <Row label="Price" value={view.price} />
        <Row label="Billing" value={view.billing} />
        <Row label="Trial / Pilot" value={view.trial_pilot} />
        <Row label="Purchase Friction" value={String(view.purchase_friction)} />
        <Row label="Time to Value" value={String(view.time_to_value)} />
        <Row label="Primary CTA" value={view.primary_cta} />
        <Row label="Offer Exposure" value={view.offer_exposure} />
        <Row label="Starts" value={view.offer_starts} />
        <Row label="Meaningful Uses" value={view.meaningful_uses} />
        <Row label="Checkout Starts" value={view.checkout_starts} />
        <Row label="Paid Conversions" value={view.paid_conversions} />
        <Row label="Conversion Rate" value={view.conversion_rate} />
        <Row label="Offer Cost" value={view.offer_cost} />
        <Row label="Contribution Impact" value={view.contribution_impact} />
        <Row label="Evidence Sufficiency" value={view.evidence_sufficiency} />
        <Row label="Experiment Status" value={view.experiment_status} />
        <Row label="Offer Confidence" value={view.offer_confidence} />
        <Row label="Expected Conversion Impact" value={view.expected_conversion_impact} />
        <Row label="Margin Impact" value={view.margin_impact} />
        <Row label="Support Cost Impact" value={view.support_cost_impact} />
        <Row label="Abuse Risk" value={view.abuse_risk} />
        <Row label="Current Experiment" value={view.current_experiment} />
        <Row label="Winning Variant" value={view.winning_variant} />
        <Row label="Customer Suggestion Signals" value={view.customer_suggestion_signals} />
        <Row label="Last Updated" value={view.last_updated} />
        <Row label="Evidence" value={view.evidence.join(" · ") || "NONE"} />
        <Row
          label="History"
          value={view.history.map((row) => `v${row.version} ${row.offer_name} (${row.status})`).join(" · ") || "NONE"}
        />
      </dl>
      {view.page_depth_rows.length ? (
        <div className="mt-4" data-hq-region="page-depth-summary">
          <h3 className="text-sm font-semibold text-white">Page Depth Summary</h3>
          <p className="mt-1 text-xs text-zinc-500">Per-page QC by question coverage and user intent, not word count.</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead>
                <tr className="text-zinc-500">
                  <th className="py-1 pr-2">Route</th>
                  <th className="py-1 pr-2">Page Type</th>
                  <th className="py-1 pr-2">Depth Class</th>
                  <th className="py-1 pr-2">Question Coverage</th>
                  <th className="py-1 pr-2">Product Understanding</th>
                  <th className="py-1 pr-2">Buyer Decision Support</th>
                  <th className="py-1 pr-2">Information Gain</th>
                  <th className="py-1 pr-2">Thinness</th>
                  <th className="py-1 pr-2">Visual Quality</th>
                </tr>
              </thead>
              <tbody>
                {view.page_depth_rows.map((row) => (
                  <tr key={row.route}>
                    <td className="py-1 pr-2">{row.route}</td>
                    <td className="py-1 pr-2">{row.page_type}</td>
                    <td className="py-1 pr-2">{row.depth_class}</td>
                    <td className="py-1 pr-2">{row.question_coverage}</td>
                    <td className="py-1 pr-2">{row.product_understanding}</td>
                    <td className="py-1 pr-2">{row.buyer_decision_support}</td>
                    <td className="py-1 pr-2">{row.information_gain}</td>
                    <td className="py-1 pr-2">{row.thinness}</td>
                    <td className="py-1 pr-2">{row.visual_quality}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
