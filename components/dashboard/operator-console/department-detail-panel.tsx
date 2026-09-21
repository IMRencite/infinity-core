"use client";

import type {
  OperatorCostSummary,
  OperatorDepartmentSnapshot,
  OperatorProviderSession,
  OperatorWorkerNode,
} from "@/lib/infinity/operator-console/types";
import { departmentStateLabel } from "@/lib/infinity/operator-console/status-derivation";
import { getRoomDisplayNames } from "@/lib/infinity/operator-console/room-naming";
import { LineageMarker, lineageStyleForKey } from "./artifacts/lineage-accent";
import { WorkerNodeCluster } from "./worker-node";
import { useOptionalHqArtifactInspector } from "./artifacts/hq-artifact-inspector-provider";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import { buildRoomActivityExplanation } from "@/lib/infinity/operator-console/room-activity";
import { RoomCurrentActivity } from "./room-current-activity";
import { SystemsArchitectDetail } from "./systems-architect-blueprint";
import type { SystemsArchitectHqView } from "@/lib/infinity/venture-systems-architecture/hq/hq-view";
import type { ProfitLabHqView } from "@/lib/infinity/venture-economics/types";
import type { HqFinancialTruthView } from "@/lib/infinity/financial-truth/types";
import { HqFinancialTruthStrip } from "./hq-financial-truth-strip";
import { economicsPresentationKind, presentationClassName } from "@/lib/infinity/venture-economics/presentation";
import type { GrowthNexusFloorView, GrowthNexusHqView } from "@/lib/infinity/growth-engine/contract";
import type { SalesFloorHqView } from "@/lib/infinity/venture-sales-floor/types";
import { HqSalesFloor } from "./hq-sales-floor";
import { useOptionalHqInspection } from "./hq-inspection-provider";
import { EMPTY_INSPECTION_CONTEXT } from "@/lib/infinity/operator-console/inspection-model";
import {
  filterArtifactsForInspection,
  isRoomCompatibleWithInspection,
  LEGACY_RESEARCH_LINEAGE_NOTICE,
  shouldShowLegacyResearchLineageNotice,
} from "@/lib/infinity/operator-console/inspection-filter";

type Props = {
  department: OperatorDepartmentSnapshot | null;
  providers: OperatorProviderSession[];
  workerNodes: OperatorWorkerNode[];
  costs: OperatorCostSummary;
  architectureWorkspaceOpen?: boolean;
};

function ProfitLabPresented({ value }: { value: string }) {
  const kind = economicsPresentationKind(value);
  return <span className={presentationClassName(kind, value)}>{value}</span>;
}

function ProfitLabLine({ label, value, extra }: { label: string; value: string; extra?: string }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[11rem_1fr] sm:items-start sm:gap-4">
      <dt className="pt-1 text-zinc-500">{label}</dt>
      <dd className="min-w-0 space-y-2 text-zinc-200">
        <ProfitLabPresented value={value} />
        {extra ? <ProfitLabPresented value={extra} /> : null}
      </dd>
    </div>
  );
}

function ProfitLabLayerPanel({
  title,
  layer,
  lines,
}: {
  title: string;
  layer: "MODELED" | "ACTUAL" | "FORECAST" | "BUDGET";
  lines: Array<{ label: string; value: string; layer: string }>;
}) {
  return (
    <div className="hq-econ-value-card space-y-2" data-hq-profit-lab-layer={layer}>
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{title}</p>
      <dl className="space-y-1.5 text-sm">
        {lines.map((line) => (
          <ProfitLabLine key={`${layer}-${line.label}`} label={line.label} value={line.value} />
        ))}
      </dl>
    </div>
  );
}

function ProfitLabFounderView({ view }: { view: ProfitLabHqView }) {
  return (
    <section data-hq-profit-lab="true" className="space-y-5">
      {view.projection_error ? (
        <p className="text-sm text-amber-200" data-hq-projection-error="true">
          {view.projection_error}
        </p>
      ) : null}
      {view.portfolio_capital ? (
        <article className="hq-econ-value-card space-y-3" data-hq-portfolio-capital="true">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Portfolio capital</p>
          <dl className="space-y-1.5 text-sm">
            <ProfitLabLine label="Authorized capital" value={view.portfolio_capital.authorized_capital} />
            <ProfitLabLine label="Allocated" value={view.portfolio_capital.allocated} />
            <ProfitLabLine label="Spent" value={view.portfolio_capital.spent} />
            <ProfitLabLine label="Committed" value={view.portfolio_capital.committed} />
            <ProfitLabLine label="Reserved" value={view.portfolio_capital.reserved} />
            <ProfitLabLine label="Remaining" value={view.portfolio_capital.remaining} />
            <ProfitLabLine label="Known monthly burn" value={view.portfolio_capital.known_monthly_burn ?? "$0"} />
            <ProfitLabLine label="Estimated monthly burn" value={view.portfolio_capital.estimated_monthly_burn ?? "UNKNOWN"} />
            <ProfitLabLine label="Total monthly burn" value={`${view.portfolio_capital.monthly_burn} · ${view.portfolio_capital.monthly_burn_state ?? view.portfolio_capital.monthly_burn}`} />
            <ProfitLabLine label="Burn completeness" value={view.portfolio_capital.monthly_burn_completeness ?? "UNKNOWN"} />
            <ProfitLabLine label="Missing cost categories" value={view.portfolio_capital.missing_cost_categories ?? "UNKNOWN"} />
            <ProfitLabLine label="Monthly burn cap" value={view.portfolio_capital.monthly_burn_cap} />
            <ProfitLabLine label="Revenue" value={view.portfolio_capital.revenue} />
            <ProfitLabLine label="Operating contribution" value={view.portfolio_capital.operating_contribution} />
            <ProfitLabLine label="New venture creation" value={view.portfolio_capital.new_venture_creation_state} />
          </dl>
        </article>
      ) : null}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Current economic summary</p>
        <p className="mt-1.5 text-sm text-zinc-300">
          {view.room_state_label}
          {view.empty_canonical_rooms > 0 ? ` · ${view.empty_canonical_rooms} venture${view.empty_canonical_rooms === 1 ? "" : "s"} still need research` : ""}
        </p>
      </div>

      {view.ventures.map((card) => (
        <article key={card.venture_id} className="hq-econ-value-card space-y-4" data-hq-profit-lab-venture={card.venture_name}>
          <header>
            <p className="text-sm font-medium text-zinc-100">{card.venture_name}</p>
            <p className="text-sm text-zinc-400">
              {card.research_required ? "Research required" : card.room_state_label}
              {card.production_note ? ` · ${card.production_note}` : ""}
              {` · ${card.freshness}`}
            </p>
          </header>

          {card.research_required ? (
            <p className="text-sm text-amber-200/90">Research required. This is not a blank room and not a zero-cost model.</p>
          ) : null}

          {view.financials?.find((row) => row.venture_id === card.venture_id) ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2" data-hq-profit-lab-financial-layers="true">
              <ProfitLabLayerPanel title="Modeled economics" layer="MODELED" lines={view.financials.find((row) => row.venture_id === card.venture_id)!.modeled} />
              <ProfitLabLayerPanel title="Actual economics" layer="ACTUAL" lines={view.financials.find((row) => row.venture_id === card.venture_id)!.actual} />
              <ProfitLabLayerPanel title="Forecast" layer="FORECAST" lines={view.financials.find((row) => row.venture_id === card.venture_id)!.forecast} />
              <ProfitLabLayerPanel title="Budget" layer="BUDGET" lines={view.financials.find((row) => row.venture_id === card.venture_id)!.budget} />
            </div>
          ) : null}

          {view.financials?.find((row) => row.venture_id === card.venture_id)?.freshness ? (
            <p className="text-xs text-zinc-500" data-hq-financial-freshness="true">
              Freshness: payment {view.financials.find((row) => row.venture_id === card.venture_id)!.freshness.last_payment_sync ?? "NEVER"}
              {" · "}cost {view.financials.find((row) => row.venture_id === card.venture_id)!.freshness.last_cost_sync ?? "NEVER"}
              {" · "}ledger {view.financials.find((row) => row.venture_id === card.venture_id)!.freshness.last_ledger_calc ?? "NEVER"}
              {view.financials.find((row) => row.venture_id === card.venture_id)!.freshness.stale ? " · STALE / missing sync" : ""}
            </p>
          ) : null}

          <dl className="space-y-1.5 text-sm">
            <ProfitLabLine label="How we monetize" value={card.monetization_model} />
            <ProfitLabLine label="Why this model" value={card.monetization_why} />
            <ProfitLabLine label="Current price" value={card.current_price} />
            {view.offer_architecture?.find((row) => row.venture_id === card.venture_id) ? (
              <>
                <ProfitLabLine label="Pricing" value={view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.pricing_architecture} />
                <ProfitLabLine label="Purchase Model" value={view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.purchase_model} />
                <ProfitLabLine label="Acquisition Offer" value={view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.promotional_offer} />
                <ProfitLabLine label="Promotional Offer" value={view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.promotional_offer} />
                <ProfitLabLine label="Offer Optimization" value={view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.offer_optimization} />
                <ProfitLabLine label="Conversion UX" value={view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.conversion_ux} />
                <ProfitLabLine label="Above-Fold CTA" value={view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.above_fold_cta} />
                <ProfitLabLine label="Panel Spacing" value={view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.panel_spacing} />
                <ProfitLabLine label="Card Required" value={view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.card_required} />
                <ProfitLabLine label="Auto Convert" value={view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.auto_convert} />
                <ProfitLabLine label="Pricing Content Depth" value={view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.pricing_content_depth} />
                <ProfitLabLine label="Page" value={view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.page} />
                <ProfitLabLine label="Information Depth" value={view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.information_depth} />
                <ProfitLabLine label="Question Coverage" value={view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.question_coverage} />
                <ProfitLabLine label="Product Understanding" value={view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.product_understanding} />
                <ProfitLabLine label="Buyer Decision Support" value={view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.buyer_decision_support} />
                <ProfitLabLine label="Information Gain" value={view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.information_gain} />
                <ProfitLabLine label="Thinness" value={view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.thinness} />
                <ProfitLabLine label="Missing Material Questions" value={String(view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.missing_material_questions)} />
                <ProfitLabLine label="Page Depth Summary" value={view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.page_depth_summary ?? "N/A"} />
                <ProfitLabLine label="Thin Pages" value={view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.page_depth_thin_pages ?? "NONE"} />
                <ProfitLabLine label="Missing Material Questions By Page" value={view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.page_depth_missing_questions ?? "NONE"} />
                <ProfitLabLine label="Whitespace" value={view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.whitespace} />
                <ProfitLabLine label="Offer Experiment" value={view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.current_experiment ?? "NONE"} />
                <ProfitLabLine label="Current Offer" value={view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.current_offer} />
                <ProfitLabLine label="Offer Type" value={view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.offer_type} />
                <ProfitLabLine label="Trial / Pilot" value={view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.trial_pilot} />
                <ProfitLabLine label="Purchase Friction" value={view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.purchase_friction} />
                <ProfitLabLine label="Time to Value" value={view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.time_to_value} />
                <ProfitLabLine label="Customer Suggestion Signals" value={view.offer_architecture.find((row) => row.venture_id === card.venture_id)!.customer_suggestion_signals} />
              </>
            ) : null}
            <ProfitLabLine label="CAC" value={card.cac} />
            <ProfitLabLine label="LTV" value={card.ltv} />
            <ProfitLabLine label="LTV:CAC" value={card.ltv_cac} />
            <ProfitLabLine label="Payback" value={card.payback} />
            <ProfitLabLine label="Break-even" value={card.break_even} />
            <ProfitLabLine label="Confidence" value={card.confidence_overall} />
            <ProfitLabLine label="Last research" value={card.last_research} />
            <ProfitLabLine label="Next refresh" value={card.next_refresh} />
            <ProfitLabLine label="History" value={`Version ${card.current_version} · ${card.prior_snapshots} prior snapshot${card.prior_snapshots === 1 ? "" : "s"}`} />
          </dl>

          {card.monetization_options.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Monetization options</p>
              <ul className="mt-1.5 space-y-1.5 text-sm text-zinc-300">
                {card.monetization_options.map((option) => (
                  <li key={option.model}>
                    <span className="text-zinc-100">{option.model}</span>
                    {` · ${option.fit} · ${option.rationale}`}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Unit economics</p>
            <dl className="mt-1.5 space-y-1.5 text-sm">
              {card.unit_economics.map((line) => (
                <ProfitLabLine key={line.label} label={line.label} value={line.value} extra={line.classification} />
              ))}
            </dl>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Low / base / high scenarios</p>
            <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
              {card.scenarios.map((scenario) => (
                <div key={scenario.name} className="hq-econ-value-card">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{scenario.name}</p>
                  <dl className="mt-1.5 space-y-1 text-sm">
                    {scenario.lines.map((line) => (
                      <ProfitLabLine key={line.label} label={line.label} value={line.value} extra={line.classification} />
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Expected vs actual</p>
            <ul className="mt-1.5 space-y-2 text-sm text-zinc-300">
              {card.expected_vs_actual.map((row) => (
                <li key={row.metric}>
                  <p className="text-zinc-100">{row.metric}</p>
                  <p>Expected: {row.expected}</p>
                  <p>Actual: {row.actual}</p>
                  <p>Variance: {row.variance}</p>
                  <p className="text-zinc-500">{row.evidence_status}</p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Unknowns and risks</p>
            <p className="mt-1.5 text-sm text-zinc-300">
              {card.unknowns.length ? card.unknowns.join(" · ") : "None recorded after research"}
            </p>
            {card.risks.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-zinc-400">
                {card.risks.map((risk) => (
                  <li key={risk}>{risk}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Confidence by dimension</p>
            <dl className="mt-1.5 space-y-1.5 text-sm">
              {card.confidence_dimensions.map((line) => (
                <ProfitLabLine key={line.label} label={line.label} value={line.value} />
              ))}
            </dl>
          </div>
        </article>
      ))}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Competitor landscape</p>
        <ul className="mt-1.5 space-y-3 text-sm text-zinc-300">
          {view.competitors.map((item) => (
            <li key={`${item.venture_name}-${item.name}`}>
              <p className="text-zinc-100">
                {item.venture_name}: {item.name}
              </p>
              <p>
                {item.type_label} · {item.observed_pricing} · confidence {item.confidence}
              </p>
              <p>{item.positioning}</p>
              <p>Differentiation: {item.differentiation}</p>
              <p className="text-zinc-500">
                Source: {item.source} · Retrieved {item.last_checked}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Pricing benchmarks</p>
        <ul className="mt-1.5 space-y-2 text-sm text-zinc-300">
          {view.pricing_benchmarks.map((row) => (
            <li key={`${row.venture_name}-${row.name}`}>
              <span className="text-zinc-100">{row.venture_name}: {row.name}</span>
              {` · ${row.amount} · ${row.classification} · ${row.source}`}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Evidence</p>
        <ul className="mt-1.5 space-y-2 text-sm text-zinc-300">
          {view.evidence.map((item) => (
            <li key={`${item.venture_name}-${item.id}`}>
              <p className="text-zinc-100">{item.venture_name}: {item.claim}</p>
              <p>
                {item.url ?? "Internal live offer record"} · {humanizeEvidenceClass(item.classification)} · retrieved {item.retrieved_at}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function GrowthNexusLine({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[12rem_1fr] sm:items-start sm:gap-3">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="min-w-0 text-zinc-200">{value == null ? "none" : String(value)}</dd>
    </div>
  );
}

function GrowthNexusVentureView({ view }: { view: GrowthNexusHqView }) {
  return (
    <article className="hq-econ-value-card space-y-3" data-hq-growth-nexus-venture={view.strategy.venture_id}>
      <header className="hq-circular-output">
        <div className="hq-circular-orb" data-hq-circular-orb="true">
          {view.strategy.current_status.replace(/_/g, " ")}
        </div>
        <div className="hq-circular-output-detail">
          <p className="text-sm font-medium text-zinc-100">{view.strategy.positioning}</p>
          <p className="text-sm text-zinc-400">
            execution {view.strategy.authorized_to_execute ? "authorized" : "designed only"}
          </p>
        </div>
      </header>
      <dl className="space-y-1.5 text-sm">
        <GrowthNexusLine label="Growth Strategy" value={view.strategy.conversion_strategy} />
        <GrowthNexusLine label="Target Segments" value={view.strategy.target_segments.join(" · ") || "Not selected"} />
        <GrowthNexusLine label="Acquisition Channels" value={view.channels.join(" · ") || "Not selected"} />
        <GrowthNexusLine label="Current Campaigns" value={`${view.campaign.campaignId} · ${view.campaign.status}`} />
        <GrowthNexusLine label="Selected Segment" value={view.campaign.selectedSegment} />
        <GrowthNexusLine label="New Prospects Today" value={String(view.campaign.newProspectsToday)} />
        <GrowthNexusLine label="Daily Target" value={String(view.campaign.dailyTarget)} />
        <GrowthNexusLine label="Campaign Target" value={String(view.campaign.prospectTarget)} />
        <GrowthNexusLine label="Contacts Sourced" value={String(view.campaign.sourced)} />
        <GrowthNexusLine label="Contacts Sent" value={String(view.campaign.sent)} />
        <GrowthNexusLine label="Delivered" value={String(view.campaign.delivered)} />
        <GrowthNexusLine label="Sequence Volume" value={String(view.campaign.sequenceVolume)} />
        <GrowthNexusLine label="Replies" value={String(view.campaign.replies)} />
        <GrowthNexusLine label="Qualified Replies" value={String(view.campaign.qualifiedReplies)} />
        <GrowthNexusLine label="Qualified Conversations" value={String(view.campaign.qualifiedConversations)} />
        <GrowthNexusLine label="Send-Time Experiment" value={view.campaign.sendTimeExperiment} />
        <GrowthNexusLine label="Current Best Window" value={view.campaign.currentBestWindow} />
        <GrowthNexusLine label="Next Send Window" value={view.campaign.nextSendWindow} />
        <GrowthNexusLine label="Message Variant" value={view.campaign.messageVariant} />
        <GrowthNexusLine label="Follow-up State" value={view.campaign.followUpState} />
        <GrowthNexusLine label="Trial / Entry Strategy" value={view.trial.strategy} />
        <GrowthNexusLine label="Trial Starts" value={String(view.trial.starts)} />
        <GrowthNexusLine label="Activation" value={String(view.trial.activation)} />
        <GrowthNexusLine label="Value Events" value={String(view.trial.valueEvents)} />
        <GrowthNexusLine label="Conversions" value={String(view.trial.conversions)} />
        <GrowthNexusLine label="Retention" value={view.retention} />
        <GrowthNexusLine label="Deliverability" value={view.deliverability} />
        <GrowthNexusLine label="Best Send Windows" value={view.timing.bestSendWindows.join(" · ")} />
        <GrowthNexusLine label="Response Pacing" value={view.timing.responsePacing} />
        <GrowthNexusLine label="Current Experiments" value={view.currentExperiments.join(" · ") || "None"} />
        <GrowthNexusLine label="Next Tactic" value={view.nextTactic} />
        <GrowthNexusLine label="Next Learning Objective" value={view.nextLearningObjective} />
        {(() => {
          const production = (view as { production?: Record<string, string | number | null | undefined> }).production;
          if (!production) return null;
          return (
          <>
            <GrowthNexusLine label="Production source" value={String(production.source ?? "local")} />
            <GrowthNexusLine label="Runtime host" value={String(production.runtime ?? "UNBOUND")} />
            <GrowthNexusLine label="Provider" value={String(production.provider ?? "UNKNOWN")} />
            <GrowthNexusLine label="Tactic" value={String(production.tactic ?? "UNKNOWN")} />
            <GrowthNexusLine label="Raw discovered" value={String(production.rawDiscovered ?? "0")} />
            <GrowthNexusLine label="Relevant" value={String(production.relevant ?? "0")} />
            <GrowthNexusLine label="Qualified / contactable" value={String(production.qualifiedContactable ?? "0")} />
            <GrowthNexusLine label="DISCOVERED_NOT_CONTACTABLE" value={String(production.discoveredNotContactable ?? "0")} />
            <GrowthNexusLine label="Queue state" value={String(production.queueState ?? "NONE")} />
            <GrowthNexusLine label="Durable queue depth" value={String(production.durableQueueDepth ?? "MISSING")} />
            <GrowthNexusLine label="Waiting for window" value={String(production.waitingForWindow ?? "MISSING")} />
            <GrowthNexusLine label="Sent today" value={String(production.sentToday ?? "MISSING")} />
            <GrowthNexusLine label="Daily cap" value={String(production.dailyCap ?? "5")} />
            <GrowthNexusLine label="Next send" value={String(production.nextSend ?? "MISSING")} />
            <GrowthNexusLine label="Replies" value={String(production.replies ?? "MISSING")} />
            <GrowthNexusLine label="Follow-ups due" value={String(production.followUpsDue ?? "MISSING")} />
            <GrowthNexusLine label="Last source cycle" value={String(production.lastSourceCycle ?? "MISSING")} />
            <GrowthNexusLine label="Next source decision" value={String(production.nextSourceDecision ?? "MISSING")} />
            <GrowthNexusLine label="Current experiment" value={String(production.currentExperiment ?? "MISSING")} />
            <GrowthNexusLine label="Automation completeness" value={String(production.automation ?? "MISSING")} />
            <GrowthNexusLine label="Sourcing" value={String(production.sourcing ?? "UNKNOWN")} />
            <GrowthNexusLine label="Sending" value={String(production.sending ?? "UNKNOWN")} />
            <GrowthNexusLine label="Reply retrieval" value={String(production.replyRetrieval ?? "UNKNOWN")} />
            <GrowthNexusLine label="Classification" value={String(production.classification ?? "UNKNOWN")} />
            <GrowthNexusLine label="Low-risk replies" value={String(production.lowRiskReplies ?? "UNKNOWN")} />
            <GrowthNexusLine label="Follow-up" value={String(production.followUp ?? "UNKNOWN")} />
            <GrowthNexusLine label="Suppression" value={String(production.suppression ?? "UNKNOWN")} />
            <GrowthNexusLine label="Optimization" value={String(production.optimization ?? "UNKNOWN")} />
            <GrowthNexusLine label="Qualified prospect" value={String(production.prospect ?? "NONE")} />
            <GrowthNexusLine label="Prospect status" value={String(production.prospectStatus ?? "NONE")} />
            <GrowthNexusLine label="Source provenance" value={String(production.prospectSource ?? "NONE")} />
            <GrowthNexusLine label="Contact provenance" value={String(production.prospectContact ?? "NONE")} />
            <GrowthNexusLine label="Timezone" value={String(production.prospectTimezone ?? "NONE")} />
            <GrowthNexusLine label="Qualification reason" value={String(production.prospectReason ?? "NONE")} />
            <GrowthNexusLine label="Next system gap" value={String(production.nextSystemGap ?? "NONE")} />
          </>
          );
        })()}
      </dl>
    </article>
  );
}

function GrowthNexusFounderView({ view }: { view: GrowthNexusFloorView }) {
  return (
    <section data-hq-growth-nexus="true" className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Communication status</p>
        <dl className="mt-1.5 space-y-1.5 text-sm">
          <GrowthNexusLine label="Sender identity" value={view.senderIdentity} />
          <GrowthNexusLine label="Identity policy" value={view.identityPolicy} />
          <GrowthNexusLine label="Human impersonation" value={view.humanImpersonation} />
        </dl>
      </div>
      {view.organic ? (
        <article data-hq-organic-growth="true" className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Organic growth</p>
          <dl className="mt-1.5 grid min-w-0 gap-2 text-sm md:grid-cols-2">
            <GrowthNexusLine label="Organic Growth" value={view.organicRuntime?.organic_growth ?? "ACTIVE"} />
            <GrowthNexusLine label="Publishing" value={String(view.organicRuntime?.publishing ?? "LIVE")} />
            <GrowthNexusLine label="First Autonomous Canary" value={String(view.organicRuntime?.first_autonomous_canary ?? "NONE")} />
            <GrowthNexusLine label="QC Escapes" value={String(view.organicRuntime?.qc_escapes ?? 0)} />
            <GrowthNexusLine label="Current Repair" value={String(view.organicRuntime?.current_repair ?? "NONE")} />
            <GrowthNexusLine label="Screenshot Capture" value={String(view.organicRuntime?.screenshot_capture ?? "NOT_RUN")} />
            <GrowthNexusLine label="Visual Inspection" value={String(view.organicRuntime?.visual_inspection ?? "NOT_RUN")} />
            <GrowthNexusLine label="Element Contrast" value={String(view.organicRuntime?.element_contrast ?? "NOT_RUN")} />
            <GrowthNexusLine label="Text Visibility" value={String(view.organicRuntime?.rendered_text_visibility ?? "NOT_RUN")} />
            <GrowthNexusLine label="Layout" value={String(view.organicRuntime?.layout ?? "NOT_RUN")} />
            <GrowthNexusLine label="Content Density" value={String(view.organicRuntime?.content_density_visual ?? "NOT_RUN")} />
            <GrowthNexusLine label="Intent Coverage" value={String(view.organicRuntime?.intent_coverage ?? "NOT_RUN")} />
            <GrowthNexusLine label="Human Resource Depth" value={String(view.organicRuntime?.human_resource_depth ?? "NOT_RUN")} />
            <GrowthNexusLine label="Thin Content" value={String(view.organicRuntime?.thin_content ?? "NOT_RUN")} />
            <GrowthNexusLine label="Contrast" value={String(view.organicRuntime?.contrast ?? "NOT_RUN")} />
            <GrowthNexusLine label="Metadata" value={String(view.organicRuntime?.metadata ?? "NOT_RUN")} />
            <GrowthNexusLine label="Public Internal Language" value={String(view.organicRuntime?.public_internal_language ?? "NOT_RUN")} />
            <GrowthNexusLine label="Product Truth" value={String(view.organicRuntime?.product_maturity_truth ?? "NOT_RUN")} />
            <GrowthNexusLine label="Post-Publish Verification" value={String(view.organicRuntime?.post_publish ?? "NOT_RUN")} />
            <GrowthNexusLine label="Browser QC" value={String(view.organicRuntime?.browser_qc ?? "NOT_RUN")} />
            <GrowthNexusLine label="Desktop" value={String(view.organicRuntime?.desktop ?? "NOT_RUN")} />
            <GrowthNexusLine label="Tablet" value={String(view.organicRuntime?.tablet ?? "NOT_RUN")} />
            <GrowthNexusLine label="Mobile" value={String(view.organicRuntime?.mobile ?? "NOT_RUN")} />
            <GrowthNexusLine label="Next Candidate" value={String(view.organicRuntime?.next_candidate ?? "NONE")} />
            <GrowthNexusLine label="Next Publish" value={String(view.organicRuntime?.next_publish ?? view.organicRuntime?.next_run ?? "NONE")} />
            <GrowthNexusLine label="Ventures active" value={String(view.organic.ventures_active)} />
            <GrowthNexusLine label="Today target" value={view.organic.today_target} />
            <GrowthNexusLine label="Published today" value={String(view.organic.published_today)} />
            <GrowthNexusLine label="Live URL" value={view.organic.live_url ?? "none"} />
            <GrowthNexusLine label="Content type" value={view.organic.content_type ?? "none"} />
            <GrowthNexusLine label="Topic" value={view.organic.topic ?? "none"} />
            <GrowthNexusLine label="Queue state" value={view.organic.queue_state} />
            <GrowthNexusLine label="Quality state" value={view.organic.quality_state} />
            <GrowthNexusLine label="Blog readiness" value={view.organic.blog_readiness} />
            <GrowthNexusLine label="Blog editorial quality" value={view.organic.blog_editorial_quality} />
            <GrowthNexusLine label="Blog index readiness" value={view.organic.blog_index_readiness} />
            <GrowthNexusLine label="BlogValueFirst failures" value={String(view.organic.blog_value_first_failures)} />
            <GrowthNexusLine label="Blog depth" value={view.organic.blog_depth_completeness} />
            <GrowthNexusLine label="Question cluster" value={view.organic.blog_question_cluster} />
            <GrowthNexusLine label="Blog sidebar UX" value={view.organic.blog_sidebar_ux} />
            <GrowthNexusLine label="Sequential navigation" value={view.organic.blog_sequential_navigation} />
            <GrowthNexusLine label="Latest blogs carousel" value={view.organic.blog_latest_carousel} />
            <GrowthNexusLine label="Article discovery" value={view.organic.blog_article_discovery} />
            <GrowthNexusLine label="Carousel controls" value={view.organic.blog_carousel_controls} />
            <GrowthNexusLine label="Content quality" value={view.organic.content_quality_state} />
            <GrowthNexusLine label="Thin-content queue" value={String(view.organic.thin_content_queue)} />
            <GrowthNexusLine label="Completeness failures" value={String(view.organic.completeness_failures)} />
            <GrowthNexusLine label="Refresh priority" value={view.organic.refresh_priority} />
            <GrowthNexusLine label="Queued today" value={String(view.organic.queued_today)} />
            <GrowthNexusLine label="Researching" value={String(view.organic.researching)} />
            <GrowthNexusLine label="Writing" value={String(view.organic.writing)} />
            <GrowthNexusLine label="Validating" value={String(view.organic.validating)} />
            <GrowthNexusLine label="Publishing" value={String(view.organic.publishing)} />
            <GrowthNexusLine label="Refreshing" value={String(view.organic.refreshing)} />
            <GrowthNexusLine label="Topic coverage" value={String(view.organic.topic_coverage)} />
            <GrowthNexusLine label="Content gaps" value={String(view.organic.content_gaps)} />
            <GrowthNexusLine label="Question demand" value={String(view.organic.question_demand)} />
            <GrowthNexusLine label="Voice-of-Customer signals" value={String(view.organic.voc_signals)} />
            <GrowthNexusLine label="Indexation health" value={view.organic.indexation_health} />
            <GrowthNexusLine label="Organic impressions" value={String(view.organic.organic_impressions)} />
            <GrowthNexusLine label="Organic leads" value={String(view.organic.organic_leads)} />
            <GrowthNexusLine label="GEO visibility" value={String(view.organic.geo_visibility)} />
            <GrowthNexusLine label="Sales-used content" value={String(view.organic.sales_used_content)} />
            <GrowthNexusLine label="Content velocity" value={view.organic.content_velocity} />
            <GrowthNexusLine label="Quality rejects" value={String(view.organic.quality_rejects)} />
            <GrowthNexusLine label="Duplicate-intent rejects" value={String(view.organic.duplicate_intent_rejects)} />
          </dl>
        </article>
      ) : null}
      {view.views.map((item) => (
        <GrowthNexusVentureView key={item.strategy.venture_id} view={item} />
      ))}
    </section>
  );
}

function humanizeEvidenceClass(value: string): string {
  if (value === "OBSERVED") return "Observed";
  if (value === "DERIVED") return "Derived";
  if (value === "ESTIMATED") return "Estimated";
  if (value === "HYPOTHESIS") return "Hypothesis";
  if (value === "UNKNOWN") return "Unknown";
  return value;
}

function ArtifactDetailTrigger({ artifact }: { artifact: HqWorkArtifact }) {
  const inspector = useOptionalHqArtifactInspector();
  return (
    <button
      type="button"
      onClick={() => inspector?.openInspector(artifact)}
      className="w-full rounded border border-zinc-800/60 bg-black/20 p-3 text-left transition hover:border-cyan-500/30 hover:bg-black/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
    >
      <div className="flex items-start gap-2">
        {artifact.lineageColorKey ? (
          <span className="mt-0.5 h-3 w-3 shrink-0 rounded-sm border border-white/20" style={lineageStyleForKey(artifact.lineageColorKey)} />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <LineageMarker artifact={artifact} />
            <p className="text-base font-medium text-zinc-100">{artifact.title}</p>
          </div>
          {artifact.subtitle ? <p className="text-sm text-zinc-400">{artifact.subtitle}</p> : null}
          <p className="mt-1.5 font-mono text-xs text-zinc-600">
            {artifact.artifactType} · {artifact.sourceRecordType} · {artifact.state}
          </p>
        </div>
      </div>
    </button>
  );
}

export function DepartmentDetailPanel({
  department,
  providers,
  workerNodes,
  costs,
  architectureWorkspaceOpen = false,
}: Props) {
  if (!department) {
    return (
      <aside className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 text-sm text-zinc-500">
        Select a department room to inspect operational data.
      </aside>
    );
  }

  const deptProviders = providers.filter((p) => p.departmentId === department.id);
  const deptNodes = workerNodes.filter((n) => n.departmentId === department.id);
  const names = getRoomDisplayNames(department.id);
  const activity =
    department.activityExplanation ??
    buildRoomActivityExplanation({
      departmentId: department.id,
      department,
      workerNodes: deptNodes,
      providers: deptProviders,
    });
  const inspection = useOptionalHqInspection();
  const inspectionContext = inspection?.context ?? EMPTY_INSPECTION_CONTEXT;
  const roomCompatible = isRoomCompatibleWithInspection(department.id, inspectionContext);
  const rawWorkArtifacts = department.workArtifacts ?? [];
  const workArtifacts = filterArtifactsForInspection(
    rawWorkArtifacts,
    inspectionContext,
    department.id,
  );
  const showLegacyResearchNotice = shouldShowLegacyResearchLineageNotice(
    rawWorkArtifacts,
    inspectionContext,
    department.id,
  );
  const systemsView =
    department.id === "systems_architect"
      ? (inspection?.systemsArchitectView ??
        ((department.detail.systemsArchitectView as SystemsArchitectHqView | undefined) ?? null))
      : null;

  return (
    <aside className="overflow-hidden rounded-xl border border-zinc-800/80 bg-gradient-to-b from-zinc-950/90 to-[#0a0a0c] shadow-xl shadow-black/10">
      <div className="border-b border-zinc-800/80 bg-black/20 px-4 py-3">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
          {department.displayName ?? names.displayName}
        </h2>
        <p className="hq-room-job mt-1">{names.shortDescription}</p>
        <p className="mt-2 text-sm text-[var(--hq-text-muted)]">
          {activity.presence} · {departmentStateLabel(department.state)} · {department.recordCount} records
        </p>
      </div>

      <div className="space-y-4 p-4 text-sm">
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Room purpose</p>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-300">{names.expandedDescription}</p>
        </section>

        {!roomCompatible ? (
          <section>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Room context</p>
            <p className="mt-1.5 text-sm text-zinc-400" data-hq-room-incompatible="true">
              This room requires a promoted venture.
            </p>
          </section>
        ) : null}

        {department.id === "strategy_finance" && (department.detail.financialTruth as HqFinancialTruthView | undefined) ? (
          <HqFinancialTruthStrip view={department.detail.financialTruth as HqFinancialTruthView} />
        ) : null}

        {department.id === "strategy_finance" && (department.detail.profitLabView as ProfitLabHqView | undefined) ? (
          <ProfitLabFounderView view={department.detail.profitLabView as ProfitLabHqView} />
        ) : null}

        {department.id === "growth_department" && (department.detail.growthNexusView as GrowthNexusFloorView | undefined) ? (
          <GrowthNexusFounderView view={department.detail.growthNexusView as GrowthNexusFloorView} />
        ) : null}

        {department.id === "sales_floor" && (department.detail.salesFloorView as SalesFloorHqView | undefined) ? (
          <HqSalesFloor snapshot={department} selected />
        ) : null}

        {roomCompatible && systemsView && !architectureWorkspaceOpen ? (
          <section>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Operating blueprint</p>
            <div className="mt-2">
              <SystemsArchitectDetail view={systemsView} />
            </div>
          </section>
        ) : null}
        {roomCompatible && systemsView && architectureWorkspaceOpen ? (
          <section>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Operating blueprint</p>
            <p className="mt-1.5 text-sm text-zinc-400">
              Architecture workspace is open above. Concrete systems are selectable there.
            </p>
          </section>
        ) : null}

        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Current activity</p>
          <RoomCurrentActivity explanation={activity} className="mt-1.5" />
          {activity.why ? <p className="mt-1.5 text-sm text-zinc-400">{activity.why}</p> : null}
        </section>

        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Current venture</p>
          <p className="mt-1.5 text-sm text-zinc-200">{activity.ventureName ?? "No current production venture in this room."}</p>
        </section>

        {activity.activeArtifactTitle || department.displayTask ? (
          <section>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Active work</p>
            {activity.activeArtifactTitle ? (
              <p className="mt-1.5 text-sm text-zinc-200">{activity.activeArtifactTitle}</p>
            ) : null}
            {department.displayTask ? <p className="mt-1.5 text-sm text-zinc-400">{department.displayTask}</p> : null}
          </section>
        ) : null}

        {deptNodes.length > 0 ? (
          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Agents in room</p>
            <div className="rounded-lg border border-zinc-800/60 bg-black/20 p-3">
              <WorkerNodeCluster nodes={deptNodes} />
              <ul className="mt-3 space-y-2">
                {deptNodes.map((node) => (
                  <li key={node.nodeId} className="flex items-start justify-between gap-2 text-sm">
                    <span className="text-zinc-300">{node.displayRole}</span>
                    <span className="text-right text-zinc-500">
                      {[node.provider, node.model].filter(Boolean).join(" / ") || node.displayTask || "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {roomCompatible && showLegacyResearchNotice ? (
          <p className="text-sm text-zinc-400" data-hq-legacy-research-lineage="true">
            {LEGACY_RESEARCH_LINEAGE_NOTICE}
          </p>
        ) : null}

        {roomCompatible && workArtifacts.length > 0 ? (
          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Persisted outputs</p>
            <ul className="space-y-2">
              {workArtifacts.slice(0, 8).map((artifact) => (
                <li key={artifact.id}>
                  <ArtifactDetailTrigger artifact={artifact} />
                </li>
              ))}
            </ul>
          </section>
        ) : department.artifacts && department.artifacts.length > 0 ? (
          <section>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Current outputs</p>
            <ul className="space-y-1">
              {department.artifacts.map((artifact) => (
                <li key={artifact.id} className="text-zinc-300">· {artifact.label}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {deptProviders.length > 0 ? (
          <section>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">AI sessions</p>
            <ul className="space-y-2">
              {deptProviders.slice(0, 5).map((s) => (
                <li key={s.sessionId} className="rounded border border-zinc-800/60 p-2">
                  <p className="font-medium text-zinc-300">{s.displayRole ?? s.role.replace(/_/g, " ")}</p>
                  <p className="text-zinc-400">{[s.provider, s.model].filter(Boolean).join(" · ") || "—"}</p>
                  <p className="text-zinc-500">{s.displayTask ?? s.task ?? s.status}</p>
                  {s.filesChanged.length > 0 ? (
                    <ul className="mt-1 font-mono text-[10px] text-emerald-300/80">
                      {s.filesChanged.slice(0, 6).map((f) => (
                        <li key={f}>+ {f}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section>
          <p className="text-zinc-500">Operational state</p>
          <p className="text-zinc-200">{departmentStateLabel(department.state)}</p>
          {department.failureSemantics && department.failureSemantics !== "UNKNOWN" ? (
            <p className="text-zinc-400">Failure context: {department.failureSemantics.replace(/_/g, " ").toLowerCase()}</p>
          ) : null}
          {department.latestRawStatus ? (
            <p className="font-mono text-[10px] text-zinc-500">Latest raw status: {department.latestRawStatus}</p>
          ) : null}
        </section>

        <section>
          <p className="text-zinc-200">
            {department.costKnown && department.costUsd != null
              ? `$${department.costUsd.toFixed(4)}`
              : department.costKnown
                ? "$0.00"
                : "Unknown"}
          </p>
        </section>

        <details className="rounded border border-zinc-800/60">
          <summary className="cursor-pointer px-2 py-1.5 text-zinc-400">Technical details</summary>
          <div className="space-y-2 border-t border-zinc-800/40 p-2 text-[10px] text-zinc-500">
            {department.currentTask ? <p>Task: {department.currentTask}</p> : null}
            {department.summary ? <p>Summary: {department.summary}</p> : null}
            <pre className="max-h-48 overflow-auto">
              {JSON.stringify(
                Object.fromEntries(Object.entries(department.detail).filter(([key]) => key !== "profitLabView")),
                null,
                2,
              )}
            </pre>
          </div>
        </details>

        <p className="text-[10px] text-zinc-600">
          Org spend (partial): ${costs.knownSpendUsd.toFixed(4)} · {costs.unpricedProviderCalls} unpriced
        </p>
      </div>
    </aside>
  );
}
