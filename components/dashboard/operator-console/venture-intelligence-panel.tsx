"use client";

import type { HQEntityDetail } from "@/lib/infinity/operator-console/details/entity-detail-types";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import { HQOutputDetail } from "./artifacts/hq-output-detail";

type Props = {
  detail: HQEntityDetail | null;
  artifact: HqWorkArtifact | null;
  error?: string | null;
};

export function VentureIntelligencePanel({ detail, artifact, error = null }: Props) {
  if (!detail || !artifact) {
    return (
      <section
        className="infinity-holographic-surface hq-venture-intelligence-panel px-4 py-4"
        data-hq-region="venture-intelligence"
        data-testid="venture-intelligence-panel"
        aria-label="Venture Intelligence"
      >
        <p className="hq-command-kicker">Venture Intelligence</p>
        {error?.includes("PROJECTION ERROR") || error?.includes("CANONICAL ECONOMICS UNAVAILABLE") ? (
          <p className="mt-2 text-sm text-amber-200" data-hq-projection-error="true" data-testid="venture-intelligence-error">
            {error}
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-zinc-200">Venture intelligence is still being assembled.</p>
            {error ? (
              <p className="mt-2 font-mono text-[11px] text-zinc-500" data-testid="venture-intelligence-error">
                Diagnostic: {error}
              </p>
            ) : null}
          </>
        )}
      </section>
    );
  }

  return (
    <section
      className="infinity-holographic-surface hq-venture-intelligence-panel overflow-visible"
      data-hq-region="venture-intelligence"
      data-testid="venture-intelligence-panel"
      aria-label="Venture Intelligence"
    >
      <HQOutputDetail detail={detail} artifact={artifact} embedded />
    </section>
  );
}
