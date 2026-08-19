import type { HqWorkArtifact } from "./types";

export type ArtifactPrimaryDisplay = {
  title: string;
  subtitle: string | null;
  metric: string | null;
  badge: string | null;
  detailTitle: string;
};

export function formatArtifactPrimaryDisplay(artifact: HqWorkArtifact): ArtifactPrimaryDisplay {
  const meta = artifact.metadata;
  const detailTitle = [artifact.title, artifact.subtitle, artifact.sourceRecordId].filter(Boolean).join(" · ");

  switch (artifact.artifactType) {
    case "opportunity_candidate": {
      const score = meta.score != null ? Number(meta.score).toFixed(1) : null;
      const rank = meta.rank != null ? `#${meta.rank}` : null;
      return {
        title: artifact.title,
        subtitle: rank,
        metric: score,
        badge: null,
        detailTitle,
      };
    }
    case "research_packet":
    case "source_cluster": {
      const sources = meta.sourceCount != null ? `${meta.sourceCount} sources` : artifact.subtitle;
      const grounded = meta.grounded === true ? "Grounded" : meta.grounded === false ? "Unverified" : null;
      return {
        title: artifact.title,
        subtitle: sources ?? null,
        metric: grounded,
        badge: null,
        detailTitle,
      };
    }
    case "monetization_plan":
    case "unit_economics": {
      const score = meta.monetizationScore != null ? Number(meta.monetizationScore).toFixed(1) : null;
      const roi = meta.expectedRoi != null ? `ROI ${Number(meta.expectedRoi).toFixed(1)}x` : null;
      const ltv = meta.ltvCacRatio != null ? `LTV:CAC ${Number(meta.ltvCacRatio).toFixed(1)}` : null;
      return {
        title: artifact.title,
        subtitle: artifact.subtitle ?? meta.modelType?.toString() ?? null,
        metric: score ?? roi ?? ltv,
        badge: null,
        detailTitle,
      };
    }
    case "selection_blueprint": {
      const score = meta.score != null ? Number(meta.score).toFixed(1) : null;
      const decision = meta.decision?.toString() ?? null;
      return {
        title: artifact.title,
        subtitle: decision ? `${decision}${score ? ` · ${score}` : ""}` : artifact.subtitle,
        metric: score,
        badge: decision,
        detailTitle,
      };
    }
    case "assumption":
      return {
        title: artifact.title,
        subtitle: "Blocking assumption",
        metric: null,
        badge: null,
        detailTitle,
      };
    case "validation_evidence": {
      const result = meta.validationResult?.toString() ?? meta.relevance?.toString() ?? null;
      const sources = meta.newSourceCount != null ? `${meta.newSourceCount} new` : null;
      return {
        title: artifact.title,
        subtitle: sources,
        metric: null,
        badge: result,
        detailTitle,
      };
    }
    case "validation_experiment":
      return {
        title: artifact.title,
        subtitle: artifact.subtitle,
        metric: meta.synthesisOnly === true ? "Synthesis" : "Acquisition",
        badge: null,
        detailTitle,
      };
    default:
      return {
        title: artifact.title,
        subtitle: artifact.subtitle,
        metric: null,
        badge: null,
        detailTitle,
      };
  }
}

export function formatFatalRiskDelta(artifact: HqWorkArtifact): string | null {
  const before = artifact.metadata.fatalRiskBefore;
  const after = artifact.metadata.fatalRiskAfter;
  if (before == null || after == null) return null;
  return `${Number(before).toFixed(2)} → ${Number(after).toFixed(2)}`;
}
