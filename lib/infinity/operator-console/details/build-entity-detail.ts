import type { HqArtifactInspectorModel } from "../artifacts/inspector-types";
import type { HQDetailTab, HQEntityDetail } from "./entity-detail-types";
import { collectInsightMetrics } from "./insight-metrics";
import { FOUNDER_INTELLIGENCE_SECTION_IDS } from "@/lib/infinity/founder-idea-lab/hq/intelligence-sections";

const EVIDENCE_SECTION_IDS = new Set([
  "why-work",
  "why-fail",
  "research",
  "evidence",
  "assumption",
  "validation",
  "build-output",
  "creative-output",
  "growth-output",
  "deployment-output",
  "performance-output",
  "treasury-evidence",
]);

const SYSTEM_SECTION_IDS = new Set(["system", "lineage"]);
const INTELLIGENCE_SECTION_IDS = new Set<string>(FOUNDER_INTELLIGENCE_SECTION_IDS);

export function buildEntityDetail(model: HqArtifactInspectorModel): HQEntityDetail {
  const { artifact } = model;
  const metrics = collectInsightMetrics(model.sections);
  const intelligenceSections = model.sections.filter((s) => INTELLIGENCE_SECTION_IDS.has(s.id));
  const overviewSections = model.sections.filter(
    (s) =>
      !EVIDENCE_SECTION_IDS.has(s.id) &&
      !SYSTEM_SECTION_IDS.has(s.id) &&
      !INTELLIGENCE_SECTION_IDS.has(s.id),
  );
  const evidenceSections = model.sections.filter((s) => EVIDENCE_SECTION_IDS.has(s.id));
  const systemSections = model.sections.filter((s) => SYSTEM_SECTION_IDS.has(s.id));

  const systemRows = [
    { label: "Entity type", value: artifact.artifactType },
    { label: "Entity ID", value: artifact.id },
    { label: "Source record", value: `${artifact.sourceRecordType}:${artifact.sourceRecordId}` },
    { label: "Room", value: artifact.roomId },
    { label: "State", value: artifact.state },
    ...(artifact.lineageLabel ? [{ label: "Lineage", value: artifact.lineageLabel }] : []),
    ...(artifact.createdAt ? [{ label: "Created", value: new Date(artifact.createdAt).toLocaleString() }] : []),
    ...systemSections.flatMap((s) => s.rows),
  ];

  const tabs: HQDetailTab[] = [];
  if (intelligenceSections.length > 0) tabs.push("intelligence");
  tabs.push("overview");
  if (model.hotTakes.length > 0 || metrics.length > 0) tabs.push("insights");
  if (evidenceSections.length > 0) tabs.push("evidence");
  if (model.journey.phases.some((p) => p.complete || p.current)) tabs.push("timeline");
  if (systemRows.length > 0) tabs.push("system");

  return {
    entityType: artifact.artifactType,
    entityId: artifact.id,
    title: artifact.title,
    subtitle: artifact.subtitle,
    status: artifact.state,
    summary: model.summary,
    decision: model.decision ?? null,
    decisionWhy: model.decisionWhy ?? null,
    overview: { sections: overviewSections.length > 0 ? overviewSections : model.sections.slice(0, 2) },
    intelligence: { sections: intelligenceSections },
    insights: {
      hotTakes: model.hotTakes,
      metrics,
    },
    evidence: { sections: evidenceSections },
    timeline: model.journey,
    system: { rows: systemRows },
    relatedWork: model.relatedWork,
    availableTabs: tabs,
  };
}

export function parseDetailQueryParam(value: string | null): { kind: string; id: string } | null {
  if (!value) return null;
  if (value.startsWith("artifact:")) {
    return { kind: "artifact", id: value.slice("artifact:".length) };
  }
  return { kind: "artifact", id: value };
}

export function formatDetailQueryParam(artifactId: string): string {
  return `artifact:${artifactId}`;
}
