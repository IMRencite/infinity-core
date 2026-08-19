"use client";

import { HQOutputDetail, HQOutputDetailShell } from "./hq-output-detail";
import { useHqArtifactInspector } from "./hq-artifact-inspector-provider";

export function ArtifactInspectorModal() {
  const { selectedArtifactId, model, entityDetail, loading, error, closeInspector } = useHqArtifactInspector();
  const open = Boolean(selectedArtifactId);

  return (
    <HQOutputDetailShell open={open} onClose={closeInspector}>
      {model && entityDetail ? (
        <HQOutputDetail detail={entityDetail} artifact={model.artifact} loading={loading} error={error} />
      ) : open ? (
        <p className="px-4 py-4 text-sm text-zinc-500">Loading persisted detail…</p>
      ) : null}
    </HQOutputDetailShell>
  );
}
