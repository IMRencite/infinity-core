import type { HqWorkArtifact } from "./types";

export type InspectorSection = {
  id: string;
  title: string;
  emptyMessage?: string;
  rows: Array<{ label: string; value: string; tone?: "pass" | "fail" | "neutral" | "warn" }>;
  bullets?: string[];
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
