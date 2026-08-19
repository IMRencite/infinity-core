import type { HqArtifactInspectorModel } from "../artifacts/inspector-types";
import type { HQDetailTab, HQEntityDetail, HQEntityDetailMetric } from "./entity-detail-types";

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

function metricsFromSections(sections: HqArtifactInspectorModel["sections"]): HQEntityDetailMetric[] {
  const metrics: HQEntityDetailMetric[] = [];
  for (const section of sections) {
    for (const row of section.rows.slice(0, 8)) {
      if (/score|risk|roi|ltv|cac|revenue|cost|confidence/i.test(row.label)) {
        metrics.push({ label: row.label, value: row.value, tone: row.tone });
      }
    }
  }
  return metrics.slice(0, 12);
}

export function buildEntityDetail(model: HqArtifactInspectorModel): HQEntityDetail {
  const { artifact } = model;
  const overviewSections = model.sections.filter(
    (s) => !EVIDENCE_SECTION_IDS.has(s.id) && !SYSTEM_SECTION_IDS.has(s.id),
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

  const tabs: HQDetailTab[] = ["overview"];
  if (model.hotTakes.length > 0 || metricsFromSections(model.sections).length > 0) tabs.push("insights");
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
    insights: {
      hotTakes: model.hotTakes,
      metrics: metricsFromSections(model.sections),
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
