import type { HqArtifactType } from "../artifacts/types";
import type { InspectorJourney, InspectorRelatedItem, InspectorSection } from "../artifacts/inspector-types";

export type HQDetailTab = "overview" | "insights" | "evidence" | "timeline" | "system";

export type HQEntityDetailMetric = {
  /** Stable semantic identity. Never a human label, UUID, timestamp, or array index. */
  id: string;
  label: string;
  value: string;
  tone?: "pass" | "fail" | "neutral" | "warn";
  kind?: "insight-metric" | "harvested" | "metric";
};

export type HQEntityDetail = {
  entityType: HqArtifactType | "mission";
  entityId: string;
  title: string;
  subtitle: string | null;
  status: string;
  summary: string;
  decision: string | null;
  decisionWhy: string | null;
  overview: {
    sections: InspectorSection[];
  };
  insights: {
    hotTakes: string[];
    metrics: HQEntityDetailMetric[];
  };
  evidence: {
    sections: InspectorSection[];
  };
  timeline: InspectorJourney;
  system: {
    rows: Array<{ label: string; value: string }>;
  };
  relatedWork: InspectorRelatedItem[];
  availableTabs: HQDetailTab[];
};
