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
      const numericScore = meta.score != null ? Number(meta.score) : Number.NaN;
      const score = Number.isFinite(numericScore)
        ? numericScore.toFixed(1)
        : meta.score == null
          ? null
          : String(meta.score);
      const rank = meta.rank != null ? `#${meta.rank}` : null;
      if (meta.universe === true) {
        return {
          title: artifact.title,
          subtitle: artifact.subtitle ?? `${meta.topCount ?? 10} currently top-ranked · View all →`,
          metric: meta.score != null ? String(meta.score) : score,
          badge: String(meta.viewAll ?? "View all →"),
          detailTitle,
        };
      }
      return {
        title: artifact.title,
        subtitle: artifact.subtitle ?? rank,
        metric: score,
        badge: meta.movement ? String(meta.movement) : meta.status ? String(meta.status) : null,
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
    case "learning_decision":
      return {
        title: artifact.title,
        subtitle: artifact.subtitle,
        metric: typeof meta.status === "string" && String(meta.status).length <= 36 ? String(meta.status) : null,
        badge: typeof meta.next_tactic === "string" ? String(meta.next_tactic) : null,
        detailTitle,
      };
    case "venture_economics":
    case "competitor_intelligence":
      return {
        title: artifact.title,
        subtitle: artifact.subtitle,
        metric: typeof meta.confidence === "string" ? meta.confidence : typeof meta.observed_pricing === "string" ? meta.observed_pricing : null,
        badge: typeof meta.current_price === "string" ? meta.current_price : typeof meta.type === "string" ? meta.type : null,
        detailTitle,
      };
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
