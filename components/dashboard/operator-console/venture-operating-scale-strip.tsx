import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import { hqSelectedVentureIsOccupancynpv } from "@/lib/infinity/operator-console/hq-brand-context";
import { evaluateOccupancynpvHqBrandInventory } from "@/lib/infinity/venture-brand-identity/hq";
import { resolveCanonicalSelectedVenture } from "@/lib/infinity/capability-truth/selected-venture";

export function VentureOperatingScaleStrip({ snapshot }: { snapshot: OperatorVentureSnapshot }) {
  const scale = snapshot.ventureOperatingScale;
  if (!scale) return null;
  return (
    <section
      className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3"
      data-hq-region="venture-operating-scale"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-600">
        Venture operating scale
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-zinc-300 sm:grid-cols-4">
        <div>
          <dt className="text-zinc-500">Portfolio</dt>
          <dd>{scale.portfolioStatus}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Operating ventures</dt>
          <dd>{scale.operatingVentures}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Validation ventures</dt>
          <dd>{scale.validationVentures}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Commercialization</dt>
          <dd>{scale.commercializationScope ? `${scale.commercializationScope} · ${scale.commercializationReadiness}` : scale.commercializationReadiness}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Revenue</dt>
          <dd>{scale.revenueState}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Experiments</dt>
          <dd>{scale.activeExperiments.join(", ") || "NONE"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Communication</dt>
          <dd>{scale.communicationState}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Latest learning</dt>
          <dd>{scale.latestLearning}</dd>
        </div>
      </dl>
      {(() => {
        const selected = resolveCanonicalSelectedVenture({
          ventureId: snapshot.venture.ventureAssemblyId,
          ventureName: snapshot.venture.ventureName,
        });
        return (
          <p className="mt-3 text-xs text-zinc-400" data-hq-selected-venture-identity={selected.venture_name}>
            Selected venture: {selected.venture_name}
          </p>
        );
      })()}
      {hqSelectedVentureIsOccupancynpv(snapshot.venture) ? (
        <dl
          className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-800/80 pt-3 text-xs text-zinc-300 sm:grid-cols-4"
          data-hq-region="venture-brand-identity"
        >
          {(() => {
            const brand = evaluateOccupancynpvHqBrandInventory();
            return (
              <>
                <div>
                  <dt className="text-zinc-500">Brand Identity</dt>
                  <dd data-hq-brand-identity={brand.brand_identity}>{brand.brand_identity}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Logo</dt>
                  <dd data-hq-brand-logo={brand.logo}>{brand.logo}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Favicon</dt>
                  <dd data-hq-brand-favicon={brand.favicon}>{brand.favicon}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Brand Consistency</dt>
                  <dd data-hq-brand-consistency={brand.brand_consistency}>{brand.brand_consistency}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Metadata Identity</dt>
                  <dd data-hq-brand-metadata={brand.metadata_identity}>{brand.metadata_identity}</dd>
                </div>
              </>
            );
          })()}
        </dl>
      ) : null}
      {scale.authorityVisibility ? (
        <dl
          className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-800/80 pt-3 text-xs text-zinc-300 sm:grid-cols-4"
          data-hq-region="provider-mutation-authority"
        >
          <div>
            <dt className="text-zinc-500">Mutation class</dt>
            <dd>{scale.authorityVisibility.mutationClass ?? "UNCONFIGURED"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Decision</dt>
            <dd>{scale.authorityVisibility.decision ?? "NONE"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Authority source</dt>
            <dd>{scale.authorityVisibility.authoritySource ?? "UNCONFIGURED"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Risk</dt>
            <dd>{scale.authorityVisibility.riskState ?? "UNKNOWN"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Financial exposure</dt>
            <dd>{scale.authorityVisibility.financialExposure ?? "UNKNOWN"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Founder action</dt>
            <dd>{scale.authorityVisibility.founderActionRequired ? "REQUIRED" : "NOT_REQUIRED"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Payment activation policy</dt>
            <dd>{scale.authorityVisibility.paymentActivationPolicy}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Payment infrastructure</dt>
            <dd>{scale.authorityVisibility.paymentInfrastructure}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Payment activation</dt>
            <dd>{scale.authorityVisibility.paymentActivationState}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Fulfillment</dt>
            <dd>{scale.authorityVisibility.fulfillment}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Fulfillment readiness</dt>
            <dd>{scale.authorityVisibility.fulfillmentReadiness ?? "UNCONFIGURED"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Offer contracts</dt>
            <dd>{scale.authorityVisibility.offerContracts?.join(", ") || "NONE"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Active entitlements</dt>
            <dd>{scale.authorityVisibility.activeEntitlements ?? 0}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Fulfillment failures</dt>
            <dd>{scale.authorityVisibility.fulfillmentFailures ?? 0}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Recovery queue</dt>
            <dd>{scale.authorityVisibility.recoveryQueue ?? 0}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Orphaned paid customers</dt>
            <dd>{scale.authorityVisibility.orphanedPaidCustomerCount}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Public launch</dt>
            <dd>{scale.authorityVisibility.publicLaunchState}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">HQ decides</dt>
            <dd>NO</dd>
          </div>
        </dl>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2" data-hq-action="venture-improvement">
        <span className="rounded-full border border-zinc-700 px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-400">
          Suggest Improvement
        </span>
        <span className="rounded-full border border-zinc-700 px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-400">
          Ask Infinity to Review This Venture
        </span>
      </div>
    </section>
  );
}
