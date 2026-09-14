import { projectCanonicalCapabilities } from "@/lib/infinity/capability-truth/projection";
import { projectCodingCapability } from "@/lib/infinity/capability-truth/coding";
import { resolveCanonicalSelectedVenture } from "@/lib/infinity/capability-truth/selected-venture";
import { projectCanonicalActiveWork, resolveCurrentCanonicalWork } from "@/lib/infinity/canonical-work";
import { projectPortfolioActualEconomics } from "@/lib/infinity/financial-truth/portfolio-actual-economics";
import type { HqFinancialTruthView } from "@/lib/infinity/financial-truth/types";
import { projectVentureOperatingScaleHq } from "@/lib/infinity/venture-operating-scale/hq";
import { resolveHqDatumFreshness } from "./freshness";
import {
  CANONICAL_HQ_LIVE_PROJECTION,
  LIVE_HQ_DATUM_CONTRACT,
  type CanonicalHQLiveProjection,
  type HqDatumSourceKind,
  type LiveHQDatum,
} from "./types";

const DEFAULT_STALE_MS = 6 * 60 * 60 * 1000;

function datum(input: Omit<LiveHQDatum, "contract">): LiveHQDatum {
  return { contract: LIVE_HQ_DATUM_CONTRACT, ...input };
}

function sourced(input: {
  id: string;
  category: string;
  value: string | number | boolean | null;
  scope: string;
  source: string;
  source_kind: HqDatumSourceKind;
  at: string | null;
  reference: string;
  thresholdMs?: number;
  error?: string | null;
}): LiveHQDatum {
  const freshness = resolveHqDatumFreshness({
    lastVerifiedAt: input.at,
    thresholdMs: input.thresholdMs ?? DEFAULT_STALE_MS,
    errorState: input.error,
  });
  return datum({
    datum_id: input.id,
    category: input.category,
    value: input.value,
    scope: input.scope,
    source: input.source,
    source_kind: input.source_kind,
    verification_status: freshness === "STALE" ? "STALE" : input.at ? "VERIFIED" : "UNKNOWN",
    last_verified_at: input.at,
    last_changed_at: input.at,
    freshness_state: freshness,
    staleness_threshold_ms: input.thresholdMs ?? DEFAULT_STALE_MS,
    confidence: input.at ? 1 : null,
    error_state: input.error ?? null,
    canonical_reference: input.reference,
  });
}

export function projectCanonicalHQLive(input: {
  generatedAt?: string;
  financialTruth?: HqFinancialTruthView | null;
  selectedVentureId?: string | null;
  selectedVentureName?: string | null;
} = {}): CanonicalHQLiveProjection {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const capabilities = projectCanonicalCapabilities(generatedAt);
  const coding = projectCodingCapability(generatedAt);
  const vos = projectVentureOperatingScaleHq();
  const economics = projectPortfolioActualEconomics(generatedAt);
  const work = projectCanonicalActiveWork(resolveCurrentCanonicalWork(generatedAt).work, generatedAt);
  const selected = resolveCanonicalSelectedVenture({
    ventureId: input.selectedVentureId,
    ventureName: input.selectedVentureName,
  });
  const capital = input.financialTruth?.capital ?? null;
  const treasury = input.financialTruth?.treasury_control ?? null;
  const datums: LiveHQDatum[] = [
    sourced({
      id: "treasury_cash",
      category: "TREASURY",
      value: capital?.verified_liquid_cash ?? treasury?.verified_treasury_cash.value ?? null,
      scope: "PARENT_IMR",
      source: "mercury_live_api",
      source_kind: "LIVE_PROVIDER",
      at: input.financialTruth?.last_financial_sync ?? generatedAt,
      reference: "CanonicalTreasuryProjection.verified_treasury_cash",
    }),
    sourced({
      id: "authorized_capital",
      category: "TREASURY",
      value: capital?.authorized_capital ?? treasury?.authorized_capital.value ?? null,
      scope: "PORTFOLIO",
      source: "founder_capital_policy",
      source_kind: "CANONICAL_PERSISTED",
      at: generatedAt,
      reference: "CANONICAL_FOUNDER_CAPITAL_POLICY",
    }),
    sourced({
      id: "allocated_capital",
      category: "TREASURY",
      value: capital?.allocated_capital ?? treasury?.allocated_capital.value ?? null,
      scope: "PORTFOLIO",
      source: "capital_allocation_ledger",
      source_kind: "CURRENT_TREASURY",
      at: generatedAt,
      reference: "capital-ledger.json",
    }),
    sourced({
      id: "unallocated_capital",
      category: "TREASURY",
      value: capital?.unallocated_authorized_capital ?? treasury?.unallocated_authorized_capital.value ?? null,
      scope: "PORTFOLIO",
      source: "capital_allocation_ledger",
      source_kind: "CURRENT_TREASURY",
      at: generatedAt,
      reference: "capital-ledger.json",
    }),
    sourced({
      id: "committed_capital",
      category: "TREASURY",
      value: capital?.committed_capital ?? treasury?.committed_capital.value ?? 0,
      scope: "PORTFOLIO",
      source: "capital_allocation_ledger",
      source_kind: "CURRENT_TREASURY",
      at: generatedAt,
      reference: "CanonicalTreasuryProjection.committed_capital",
    }),
    sourced({
      id: "actual_spend",
      category: "TREASURY",
      value: capital?.spent_capital ?? treasury?.actual_spend.value ?? 0,
      scope: "PORTFOLIO",
      source: "capital_allocation_ledger",
      source_kind: "CURRENT_TREASURY",
      at: generatedAt,
      reference: "CanonicalTreasuryProjection.actual_spend",
    }),
    sourced({
      id: "lifetime_revenue",
      category: "ECONOMICS",
      value: economics.lifetime_gross_revenue,
      scope: "PORTFOLIO",
      source: "portfolio_actual_economics",
      source_kind: "CURRENT_ECONOMIC",
      at: economics.last_updated_at,
      reference: "PortfolioActualEconomicsProjection",
    }),
    sourced({
      id: "current_month_revenue",
      category: "ECONOMICS",
      value: economics.current_month_gross_revenue,
      scope: "PORTFOLIO",
      source: "portfolio_actual_economics",
      source_kind: "CURRENT_ECONOMIC",
      at: economics.last_updated_at,
      reference: "PortfolioActualEconomicsProjection",
    }),
    sourced({
      id: "actual_contribution",
      category: "ECONOMICS",
      value: economics.contribution_display,
      scope: "PORTFOLIO",
      source: "portfolio_actual_economics",
      source_kind: "CURRENT_ECONOMIC",
      at: economics.last_updated_at,
      reference: "PortfolioActualEconomicsProjection",
    }),
    sourced({
      id: "top_venture",
      category: "ECONOMICS",
      value: economics.top_revenue_venture.display,
      scope: "PORTFOLIO",
      source: "portfolio_actual_economics",
      source_kind: "CURRENT_ECONOMIC",
      at: economics.last_updated_at,
      reference: "PortfolioActualEconomicsProjection.top_revenue_venture",
    }),
    sourced({
      id: "selected_venture",
      category: "VENTURE",
      value: selected.venture_name,
      scope: selected.scope,
      source: "canonical_selected_venture",
      source_kind: "CURRENT_VENTURE",
      at: generatedAt,
      reference: "CanonicalSelectedVentureGate",
    }),
    sourced({
      id: "operating_ventures",
      category: "VENTURE",
      value: vos.operatingVentures,
      scope: "PORTFOLIO",
      source: "venture_operating_scale",
      source_kind: "CURRENT_VENTURE",
      at: generatedAt,
      reference: "VentureOperatingScaleHqProjection",
    }),
    sourced({
      id: "validation_ventures",
      category: "VENTURE",
      value: vos.validationVentures,
      scope: "PORTFOLIO",
      source: "venture_operating_scale",
      source_kind: "CURRENT_VENTURE",
      at: generatedAt,
      reference: "VentureOperatingScaleHqProjection",
    }),
    sourced({
      id: "current_mission",
      category: "WORK",
      value: work.mission_title,
      scope: "HQ",
      source: "canonical_current_work",
      source_kind: "CURRENT_WORK",
      at: work.updated_at,
      reference: work.work_id ?? "CanonicalActiveWorkProjection",
    }),
    sourced({
      id: "native_coder",
      category: "CODING",
      value: coding.native_coder.value,
      scope: "HQ",
      source: coding.native_coder.source,
      source_kind: "CURRENT_RUNTIME",
      at: generatedAt,
      reference: "CodingCapabilityProjection.native_coder",
    }),
    sourced({
      id: "external_implementation_agent",
      category: "CODING",
      value: coding.external_implementation_agent.value,
      scope: "HQ",
      source: coding.external_implementation_agent.source,
      source_kind: "CURRENT_WORK",
      at: coding.external_implementation_agent.last_activity_at,
      reference: "CodingCapabilityProjection.external_implementation_agent",
      thresholdMs: 15_000,
    }),
    sourced({
      id: "cursor_connector",
      category: "CODING",
      value: coding.connector_status,
      scope: "HQ",
      source: "cursor_connector_env",
      source_kind: "CURRENT_RUNTIME",
      at: generatedAt,
      reference: "CodingCapabilityProjection.connector_status",
    }),
    sourced({
      id: "latest_learning",
      category: "LEARNING",
      value: vos.latestLearning,
      scope: "PORTFOLIO",
      source: "venture_operating_scale",
      source_kind: "CURRENT_VENTURE",
      at: generatedAt,
      reference: "VentureOperatingScaleHqProjection.latestLearning",
    }),
    sourced({
      id: "communication",
      category: "COMMUNICATION",
      value: vos.communicationState,
      scope: "PORTFOLIO",
      source: "mailbox_observer",
      source_kind: "LIVE_PROVIDER",
      at: generatedAt,
      reference: "inspectMailboxObserverHealth",
    }),
    sourced({
      id: "revenue_state",
      category: "ECONOMICS",
      value: vos.revenueState,
      scope: "PORTFOLIO",
      source: "portfolio_actual_economics",
      source_kind: "CURRENT_ECONOMIC",
      at: economics.last_updated_at,
      reference: "VentureOperatingScaleHqProjection.revenueState",
    }),
    ...capabilities.capabilities.map((row) =>
      sourced({
        id: `capability_${row.capability_id.toLowerCase()}`,
        category: "CAPABILITY",
        value: row.value,
        scope: row.scope,
        source: row.verification_source,
        source_kind: row.connected ? "LIVE_PROVIDER" : "CANONICAL_PERSISTED",
        at: row.last_verified_at,
        reference: `CanonicalCapabilityProjection.${row.capability_id}`,
        thresholdMs: row.staleness_threshold_ms,
        error: row.error_state,
      }),
    ),
  ];
  return {
    contract: CANONICAL_HQ_LIVE_PROJECTION,
    generated_at: generatedAt,
    connection_status: "CURRENT_CANONICAL",
    datums,
  };
}
