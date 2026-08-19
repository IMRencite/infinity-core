"use client";

import { HQOutputDetail, HQOutputDetailShell } from "./hq-output-detail";
import { useHqArtifactInspector } from "./hq-artifact-inspector-provider";
import { RoomArtifactInventory } from "./room-artifact-inventory";

export function ArtifactInspectorModal() {
  const { selectedArtifactId, model, entityDetail, loading, error, closeInspector, inventory } = useHqArtifactInspector();
  const open = Boolean(selectedArtifactId) || Boolean(inventory);

  return (
    <HQOutputDetailShell open={open} onClose={closeInspector}>
      {selectedArtifactId && model && entityDetail ? (
        <HQOutputDetail detail={entityDetail} artifact={model.artifact} loading={loading} error={error} />
      ) : inventory ? (
        <RoomArtifactInventory roomName={inventory.roomName} artifacts={inventory.artifacts} />
      ) : open ? (
        <p className="px-4 py-4 text-sm text-zinc-500">Loading persisted detail…</p>
      ) : null}
    </HQOutputDetailShell>
  );
}
