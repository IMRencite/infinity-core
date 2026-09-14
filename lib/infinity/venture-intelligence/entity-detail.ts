import type { HQDetailTab, HQEntityDetail } from "@/lib/infinity/operator-console/details/entity-detail-types";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import type { InspectorJourneyPhase } from "@/lib/infinity/operator-console/artifacts/inspector-types";
import { VENTURE_INTELLIGENCE_MONEY_SECTION_IDS, VENTURE_INTELLIGENCE_SECTION_IDS } from "./types";
import type { VentureIntelligenceView } from "./types";
import { ventureIntelligenceHqSections, ventureIntelligenceMoneySections } from "./hq-sections";

export function ventureIntelligenceArtifact(view: VentureIntelligenceView): HqWorkArtifact {
  return {
    id: `venture-intelligence:${view.identity.ventureId}`,
    roomId: "intelligence_center",
    artifactType: "venture_intelligence",
    title: view.identity.name,
    subtitle: view.sourceContext.badge,
    state: "READY",
    createdAt: null,
    sourceRecordType: view.identity.originEntityType,
    sourceRecordId: view.identity.originEntityId ?? view.identity.ventureId,
    metadata: {
      sourceContext: view.sourceContext.id,
      grantsBuild: false,
      readOnly: true,
    },
    lineageType: "venture",
    lineageId: view.sourceContext.ventureAssemblyId,
    lineageLabel: view.identity.name,
  };
}

export function buildVentureIntelligenceEntityDetail(view: VentureIntelligenceView): HQEntityDetail {
  const intelligence = ventureIntelligenceHqSections(view);
  const money = ventureIntelligenceMoneySections(view);
  const systemRows = [
    { label: "Venture ID", value: view.identity.ventureId },
    { label: "Origin type", value: view.identity.originEntityType },
    { label: "Source context", value: view.sourceContext.badge },
    { label: "Founder Idea ID", value: view.sourceContext.founderIdeaId ?? "none" },
    { label: "Opportunity candidate ID", value: view.sourceContext.opportunityCandidateId ?? "none" },
    { label: "Venture assembly ID", value: view.sourceContext.ventureAssemblyId ?? "none" },
    { label: "Can grant BUILD", value: "NO" },
    { label: "Can mutate", value: "NO" },
    ...view.provenance.map((item) => ({
      label: `Provenance · ${item.field}`,
      value: `${item.sourceType}${item.sourceId ? `:${item.sourceId}` : ""} — ${item.note}`,
    })),
  ];
  return {
    entityType: "venture_intelligence",
    entityId: view.identity.ventureId,
    title: view.identity.name,
    subtitle: view.sourceContext.badge,
    concept: view.identity.concept,
    status: "READ-ONLY",
    summary: view.commandDeck.synthesis,
    decision: view.businessCase.label,
    decisionWhy: view.nextMove.recommendation,
    overview: {
      sections: intelligence.filter((section) => section.id === "venture-command-deck" || section.id === "infinity-take"),
    },
    intelligence: { sections: intelligence },
    money: { sections: money },
    insights: {
      hotTakes: [view.businessCase.label, view.nextMove.recommendation],
      metrics: [
        { id: "business-case", label: "Business case", value: view.businessCase.label },
        { id: "build-readiness", label: "Build readiness", value: view.buildReadiness },
        { id: "current-position", label: "Current position", value: view.currentPosition.label },
      ],
    },
    evidence: {
      sections: intelligence.filter((section) => section.id === "venture-evidence"),
    },
    timeline: {
      phases: view.currentPosition.path.map((item) => {
        const phase: InspectorJourneyPhase =
          item.id === "IDEA" || item.id === "VALIDATE"
            ? "DISCOVERED"
            : item.id === "DESIGN"
              ? "RESEARCHED"
              : item.id === "BUILD"
                ? "BUILT"
                : item.id === "LAUNCH"
                  ? "LAUNCHED"
                  : "MEASURED";
        return { phase, complete: item.complete, current: item.current };
      }),
    },
    system: { rows: systemRows },
    relatedWork: [],
    availableTabs: (
      money.length
        ? ["intelligence", "money", "overview", "insights", "evidence", "system", "suggestions"]
        : ["intelligence", "overview", "insights", "evidence", "system", "suggestions"]
    ) as HQDetailTab[],
  };
}

export const VENTURE_DETAIL_SECTION_IDS = {
  intelligence: VENTURE_INTELLIGENCE_SECTION_IDS,
  money: VENTURE_INTELLIGENCE_MONEY_SECTION_IDS,
};
