import type { HqWorkArtifact } from "./types";

export type InspectorSectionRow = {
  id?: string;
  label: string;
  value: string;
  tone?: "pass" | "fail" | "neutral" | "warn";
  /** When true, this row is a canonical insight metric and owns React/detail identity. */
  insightMetric?: boolean;
  help?: string;
  primaryValue?: string;
  actualLabel?: string;
  estimateKind?: "actual" | "estimated" | "modeled";
  evidenceLabel?: string;
  detail?: string;
  kind?: "hero" | "secondary" | "conclusion" | "methodology" | "outlook" | "phase" | "compare" | "path" | "system" | "status";
  compareLeft?: string;
  compareRight?: string;
  secondary?: string;
  numeric?: boolean;
  readiness?: string;
  emphasized?: boolean;
};

export type InspectorSection = {
  id: string;
  title: string;
  emptyMessage?: string;
  rows: InspectorSectionRow[];
  bullets?: string[];
  presentation?: "primary" | "advanced";
  collapsible?: boolean;
  collapseLabel?: string;
  layout?: "stack" | "cards" | "split" | "metric-hero" | "waterfall" | "comparison-table" | "phase-list" | "path" | "command-deck" | "system-table";
  toneGroup?: "actual" | "estimated" | "scenario" | "summary";
  badge?: string;
  lead?: string;
};

export type InspectorJourneyPhase =
  | "DISCOVERED"
  | "RESEARCHED"
  | "MONETIZED"
  | "SELECTED"
  | "VALIDATED"
  | "BUILT"
  | "LAUNCHED"
  | "MEASURED";

export type InspectorJourney = {
  phases: Array<{ phase: InspectorJourneyPhase; complete: boolean; current: boolean }>;
};

export type InspectorRelatedItem = {
  artifactId: string;
  title: string;
  artifactType: string;
  roomLabel: string;
  count?: number;
};

export type HqArtifactInspectorModel = {
  artifact: HqWorkArtifact;
  summary: string;
  hotTakes: string[];
  sections: InspectorSection[];
  journey: InspectorJourney;
  relatedWork: InspectorRelatedItem[];
  decision?: string | null;
  decisionWhy?: string | null;
};
