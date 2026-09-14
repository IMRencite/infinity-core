import { hqVentureIdentitiesMatch, isAskReviewIdentity, isOccupancynpvIdentity } from "@/lib/infinity/hq-inspection-identity/aliases";
import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { isFavc1CycleVentureId } from "@/lib/infinity/operator-console/favc1-cycle/types";
import { activityTimeMs } from "./rows";
import { listCanonicalWork } from "./store";
import type { CanonicalWorkExecutionContract, CanonicalWorkStatus } from "./types";
import {
  CANONICAL_WORK_CLASSIFICATIONS,
  SYSTEM_ONLY_CLASSIFICATIONS,
  SUBSTANTIVE_VENTURE_CLASSIFICATIONS,
  type CanonicalWorkClassificationKind,
} from "./types";

export const RECENT_VENTURE_WORK_HISTORY_LIMIT = 8;

const ACCOMPLISHED: CanonicalWorkStatus[] = ["COMPLETED", "SUPERSEDED", "FAILED"];

const DIAGNOSTIC_WORK_ID = /current-resolver-freshness|live-floor-wiring-proof|stale-state-physical-proof|freshness-proof|:proof:/i;
const SYSTEM_INFRA_WORK_ID =
  /live-operating-floor-wiring-repair|lightweight-live-hq|hq-live-work-projection-repair|mercury-stripe-financial-truth|live-treasury-control-center|hq-navigation-cleanup/i;

export type CanonicalWorkClassification = {
  work_id: string;
  mission_title: string;
  venture_id: string | null;
  classification: CanonicalWorkClassificationKind;
  is_substantive_venture_work: boolean;
  is_system_only: boolean;
  is_diagnostic: boolean;
  status: CanonicalWorkStatus;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
  latest_output: string;
  traceability_links: string[];
};

export type HqWorkHistoryItem = {
  workId: string;
  missionId: string;
  ventureId: string | null;
  title: string;
  classification: CanonicalWorkClassificationKind;
  status: CanonicalWorkStatus;
  completedAt: string | null;
  updatedAt: string;
  latestOutput: string;
  trace: string;
  substantiveVentureWork: boolean;
  systemOnly: boolean;
  diagnostic: boolean;
};

export type LatestSystemActivityProjection = HqWorkHistoryItem | null;

export type LatestVentureWorkScope = "VENTURE" | "PORTFOLIO";

export type LatestVentureWorkProjection = {
  venture_id: string | null;
  venture_name: string | null;
  work_id: string;
  mission_title: string;
  classification: CanonicalWorkClassificationKind;
  status: CanonicalWorkStatus;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
  latest_output: string;
  scope: LatestVentureWorkScope;
  label: "LATEST VENTURE WORK" | "LATEST PORTFOLIO VENTURE WORK";
} | null;

export type LatestVentureWorkContext = {
  explicit: boolean;
  venture_id: string | null;
  scope: LatestVentureWorkScope;
  label: "LATEST VENTURE WORK" | "LATEST PORTFOLIO VENTURE WORK";
  source: "occupancynpv" | "askreview" | "explicit_venture" | "portfolio_unselected";
};

function ventureNameForId(ventureId: string | null): string | null {
  if (!ventureId) return null;
  if (isOccupancynpvIdentity(ventureId)) return "OccupancyNPV";
  if (isAskReviewIdentity(ventureId)) return "AskReview";
  return ventureId;
}

export function resolveLatestVentureWorkContext(selectedVentureId?: string | null): LatestVentureWorkContext {
  const raw = selectedVentureId?.trim() || null;
  if (!raw || isFavc1CycleVentureId(raw) || /^favc1/i.test(raw)) {
    return {
      explicit: false,
      venture_id: null,
      scope: "PORTFOLIO",
      label: "LATEST PORTFOLIO VENTURE WORK",
      source: "portfolio_unselected",
    };
  }
  if (isOccupancynpvIdentity(raw)) {
    return {
      explicit: true,
      venture_id: CRE_VENTURE_ID,
      scope: "VENTURE",
      label: "LATEST VENTURE WORK",
      source: "occupancynpv",
    };
  }
  if (isAskReviewIdentity(raw)) {
    return {
      explicit: true,
      venture_id: ASKREVIEW_VENTURE_ID,
      scope: "VENTURE",
      label: "LATEST VENTURE WORK",
      source: "askreview",
    };
  }
  return {
    explicit: true,
    venture_id: raw,
    scope: "VENTURE",
    label: "LATEST VENTURE WORK",
    source: "explicit_venture",
  };
}

export function toLatestVentureWorkProjection(
  work: CanonicalWorkExecutionContract | null,
  context: LatestVentureWorkContext,
): LatestVentureWorkProjection {
  if (!work) return null;
  const classified = classifyCanonicalWork(work);
  return {
    venture_id: work.venture_id,
    venture_name: ventureNameForId(work.venture_id),
    work_id: work.work_id,
    mission_title: work.title,
    classification: classified.classification,
    status: work.status,
    started_at: work.started_at,
    updated_at: work.updated_at,
    completed_at: work.completed_at,
    latest_output: work.latest_output,
    scope: context.scope,
    label: context.label,
  };
}

function isKnownClassification(value: string | undefined): value is CanonicalWorkClassificationKind {
  return Boolean(value && (CANONICAL_WORK_CLASSIFICATIONS as readonly string[]).includes(value));
}

function fromWorkType(work: CanonicalWorkExecutionContract): CanonicalWorkClassificationKind {
  switch (work.work_type) {
    case "DESIGN":
      return "VENTURE_DESIGN";
    case "BUILD":
    case "PRODUCT_IMPROVEMENT":
      return "VENTURE_PRODUCT";
    case "QC":
    case "VALIDATION":
      return "VENTURE_QC";
    case "DEPLOYMENT":
      return "VENTURE_DEPLOYMENT";
    case "GROWTH":
    case "OPPORTUNITY_DISCOVERY":
      return "VENTURE_GROWTH";
    case "ECONOMICS":
    case "COMMERCIALIZATION":
      return "VENTURE_FINANCIAL";
    case "FULFILLMENT":
    case "OFFER_ARCHITECTURE":
      return "VENTURE_DELIVERY";
    case "SYSTEM_ARCHITECTURE":
      return "SYSTEM_INFRASTRUCTURE";
    case "INCIDENT_REPAIR":
    case "OPERATING":
      return "SYSTEM_MAINTENANCE";
    default:
      return work.venture_id ? "OTHER" : "SYSTEM_MAINTENANCE";
  }
}

export function classifyCanonicalWork(work: CanonicalWorkExecutionContract): CanonicalWorkClassification {
  let classification: CanonicalWorkClassificationKind = isKnownClassification(work.classification)
    ? work.classification
    : fromWorkType(work);
  if (DIAGNOSTIC_WORK_ID.test(work.work_id)) {
    classification = "SYSTEM_DIAGNOSTIC";
  } else if (/occupancynpv:governed-venture-spend-authority/i.test(work.work_id)) {
    classification = "VENTURE_FINANCIAL";
  } else if (SYSTEM_INFRA_WORK_ID.test(work.work_id)) {
    classification = "SYSTEM_INFRASTRUCTURE";
  } else if (work.work_type === "QC" && /^work:hq:/.test(work.work_id) && !work.classification) {
    classification = "SYSTEM_QC";
  }
  const is_diagnostic = classification === "SYSTEM_DIAGNOSTIC";
  const is_system_only = SYSTEM_ONLY_CLASSIFICATIONS.includes(classification);
  const is_substantive_venture_work = SUBSTANTIVE_VENTURE_CLASSIFICATIONS.includes(classification);
  return {
    work_id: work.work_id,
    mission_title: work.title,
    venture_id: work.venture_id,
    classification,
    is_substantive_venture_work,
    is_system_only,
    is_diagnostic,
    status: work.status,
    started_at: work.started_at,
    updated_at: work.updated_at,
    completed_at: work.completed_at,
    latest_output: work.latest_output,
    traceability_links: work.traceability_links,
  };
}

export function historyItemFromWork(work: CanonicalWorkExecutionContract): HqWorkHistoryItem {
  const classified = classifyCanonicalWork(work);
  return {
    workId: work.work_id,
    missionId: work.mission_id,
    ventureId: work.venture_id,
    title: work.title,
    classification: classified.classification,
    status: work.status,
    completedAt: work.completed_at,
    updatedAt: work.updated_at,
    latestOutput: work.latest_output,
    trace: work.traceability_links.join(" · ") || work.work_id,
    substantiveVentureWork: classified.is_substantive_venture_work,
    systemOnly: classified.is_system_only,
    diagnostic: classified.is_diagnostic,
  };
}

function accomplishmentTimeMs(work: CanonicalWorkExecutionContract): number {
  if (work.completed_at) return Date.parse(work.completed_at) || 0;
  return activityTimeMs(work);
}

function sameVenture(row: CanonicalWorkExecutionContract, ventureId: string): boolean {
  return hqVentureIdentitiesMatch(row.venture_id, ventureId);
}

export function pickLatestSystemActivity(
  rows: CanonicalWorkExecutionContract[] = listCanonicalWork(),
): CanonicalWorkExecutionContract | null {
  const accomplished = rows.filter((row) => ACCOMPLISHED.includes(row.status));
  return [...accomplished].sort((left, right) => activityTimeMs(right) - activityTimeMs(left))[0] ?? null;
}

export function pickLatestVentureWork(
  rows: CanonicalWorkExecutionContract[],
  ventureId?: string | null,
): CanonicalWorkExecutionContract | null {
  const scoped = rows.filter((row) => {
    if (!ACCOMPLISHED.includes(row.status)) return false;
    if (!classifyCanonicalWork(row).is_substantive_venture_work) return false;
    if (ventureId) return sameVenture(row, ventureId);
    return Boolean(row.venture_id);
  });
  return [...scoped].sort((left, right) => accomplishmentTimeMs(right) - accomplishmentTimeMs(left))[0] ?? null;
}

export function listRecentVentureWork(
  rows: CanonicalWorkExecutionContract[],
  ventureId?: string | null,
  limit = RECENT_VENTURE_WORK_HISTORY_LIMIT,
): CanonicalWorkExecutionContract[] {
  const scoped = rows.filter((row) => {
    if (!classifyCanonicalWork(row).is_substantive_venture_work) return false;
    if (ventureId) return sameVenture(row, ventureId);
    return Boolean(row.venture_id);
  });
  return [...scoped]
    .sort((left, right) => accomplishmentTimeMs(right) - accomplishmentTimeMs(left))
    .slice(0, limit);
}

export function listRecentSystemActivity(
  rows: CanonicalWorkExecutionContract[],
  limit = RECENT_VENTURE_WORK_HISTORY_LIMIT,
): CanonicalWorkExecutionContract[] {
  return [...rows]
    .filter((row) => classifyCanonicalWork(row).is_system_only)
    .sort((left, right) => activityTimeMs(right) - activityTimeMs(left))
    .slice(0, limit);
}

export function projectLatestSystemActivity(
  rows: CanonicalWorkExecutionContract[] = listCanonicalWork(),
): LatestSystemActivityProjection {
  const work = pickLatestSystemActivity(rows);
  return work ? historyItemFromWork(work) : null;
}

export function projectLatestVentureWork(
  rows: CanonicalWorkExecutionContract[] = listCanonicalWork(),
  ventureId?: string | null,
): LatestVentureWorkProjection {
  const context = resolveLatestVentureWorkContext(ventureId);
  return toLatestVentureWorkProjection(pickLatestVentureWork(rows, context.venture_id), context);
}

export function projectCanonicalLatestVentureWork(
  selectedVentureId?: string | null,
  rows: CanonicalWorkExecutionContract[] = listCanonicalWork(),
): LatestVentureWorkProjection {
  const context = resolveLatestVentureWorkContext(selectedVentureId);
  return toLatestVentureWorkProjection(pickLatestVentureWork(rows, context.venture_id), context);
}

export function projectRecentVentureWorkHistory(
  rows: CanonicalWorkExecutionContract[] = listCanonicalWork(),
  ventureId?: string | null,
  limit = RECENT_VENTURE_WORK_HISTORY_LIMIT,
): HqWorkHistoryItem[] {
  return listRecentVentureWork(rows, ventureId, limit).map(historyItemFromWork);
}

export function projectRecentSystemActivityHistory(
  rows: CanonicalWorkExecutionContract[] = listCanonicalWork(),
  limit = RECENT_VENTURE_WORK_HISTORY_LIMIT,
): HqWorkHistoryItem[] {
  return listRecentSystemActivity(rows, limit).map(historyItemFromWork);
}
