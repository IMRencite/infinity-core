import type { DepartmentId } from "../types";

export type HqArtifactType =
  | "opportunity_candidate"
  | "research_packet"
  | "source_cluster"
  | "monetization_plan"
  | "unit_economics"
  | "selection_blueprint"
  | "assumption"
  | "adversarial_review"
  | "validation_experiment"
  | "validation_evidence"
  | "decision"
  | "company_blueprint"
  | "content_artifact"
  | "creative_asset"
  | "code_change"
  | "production_artifact"
  | "deployment"
  | "performance_signal"
  | "learning_decision"
  | "mission"
  | "commercial_domain"
  | "commercial_dns"
  | "commercial_payment"
  | "commercial_checkout"
  | "commercial_revenue"
  | "commercial_treasury"
  | "treasury_state"
  | "treasury_budget"
  | "venture_capital_allocation"
  | "financial_action"
  | "financial_authorization"
  | "treasury_transaction"
  | "recurring_commitment"
  | "founder_idea"
  | "coding_agent_run"
  | "coding_task"
  | "coding_provider"
  | "ztp_run"
  | "systems_blueprint";

export type HqArtifactState =
  | "CREATING"
  | "READY"
  | "SELECTED"
  | "REJECTED"
  | "ARCHIVED"
  | "FAILED";

/** Persisted-output work object rendered inside HQ rooms. */
export type HqWorkArtifact = {
  id: string;
  roomId: DepartmentId;
  artifactType: HqArtifactType;
  title: string;
  subtitle: string | null;
  state: HqArtifactState;
  createdAt: string | null;
  sourceRecordType: string;
  sourceRecordId: string;
  metadata: Record<string, string | number | boolean | null>;
  thumbnailUrl?: string | null;
  /** Canonical lineage identity when provable from persisted linkage. */
  lineageId?: string | null;
  lineageType?: "candidate" | "venture" | null;
  lineageColorKey?: string | null;
  lineageLabel?: string | null;
  lineageIndex?: number | null;
};

export type HqArtifactDisplayGroup = {
  visible: HqWorkArtifact[];
  overflowCount: number;
  totalCount: number;
  artifactLoaded: number;
  artifactVisible: number;
  artifactOverflow: number;
  expectedCount: number | null;
  missingCount: number;
};

export type HqRoomArtifactMap = Partial<Record<DepartmentId, HqWorkArtifact[]>>;

/** Desktop/tablet show the full loaded set; this is the extreme-count expand threshold. */
export const HQ_ARTIFACT_EXTREME_DISPLAY_LIMIT = 48;
export const HQ_ARTIFACT_MOBILE_DISPLAY_LIMIT = 8;
/** Alias: rooms no longer use a 3-card floor cap. */
export const HQ_ARTIFACT_DISPLAY_LIMIT = HQ_ARTIFACT_EXTREME_DISPLAY_LIMIT;
