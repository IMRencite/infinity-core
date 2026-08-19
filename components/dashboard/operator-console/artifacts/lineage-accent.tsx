"use client";

import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";

type Props = {
  artifact: HqWorkArtifact;
  compact?: boolean;
};

export function lineageStyleForKey(colorKey: string | null | undefined): React.CSSProperties | undefined {
  if (!colorKey) return undefined;
  return { "--hq-lineage-color": `var(--hq-lineage-${colorKey})` } as React.CSSProperties;
}

export function LineageMarker({ artifact, compact = false }: Props) {
  const colorKey = artifact.lineageColorKey;
  const label = artifact.lineageLabel;
  const founder =
    label === "FOUNDER" ||
    artifact.metadata.founderBadge === "FOUNDER" ||
    String(artifact.metadata.origin ?? "").includes("FOUNDER");

  if (founder) {
    return (
      <span
        className={`hq-lineage-marker hq-lineage-marker--founder ${compact ? "hq-lineage-marker--compact" : ""}`}
        title="Founder-submitted idea"
      >
        FOUNDER
      </span>
    );
  }

  if (!colorKey) return null;

  return (
    <span
      className={`hq-lineage-marker ${compact ? "hq-lineage-marker--compact" : ""}`}
      style={lineageStyleForKey(colorKey)}
      title={label ? `Candidate ${label}` : "Candidate lineage"}
    >
      {label ?? "C"}
    </span>
  );
}

export function lineageClassForArtifact(artifact: HqWorkArtifact): string {
  if (!artifact.lineageColorKey) return "";
  return `hq-lineage-accent hq-lineage-accent--${artifact.lineageColorKey}`;
}

export function lineageStyleForArtifact(artifact: HqWorkArtifact): React.CSSProperties | undefined {
  return lineageStyleForKey(artifact.lineageColorKey);
}
