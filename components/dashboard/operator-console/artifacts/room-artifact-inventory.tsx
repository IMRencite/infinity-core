"use client";

import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import { ArtifactCard, DecisionToken } from "./primitives";
import { artifactRenderId } from "@/lib/infinity/operator-console/artifacts/artifact-identity";

export function RoomArtifactInventory({
  roomName,
  artifacts,
}: {
  roomName: string;
  artifacts: HqWorkArtifact[];
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="hq-inspector-header shrink-0 px-4 py-4 md:px-5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Room inventory</p>
        <h2 className="mt-1 text-lg font-bold text-zinc-50 md:text-xl">{roomName}</h2>
        <p className="mt-1 text-sm text-zinc-400">
          {artifacts.length} output{artifacts.length === 1 ? "" : "s"}
        </p>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5">
        <div className="flex flex-wrap gap-2.5">
          {artifacts.map((artifact) =>
            artifact.artifactType === "decision" ? (
              <DecisionToken key={artifactRenderId(artifact)} artifact={artifact} large />
            ) : (
              <ArtifactCard key={artifactRenderId(artifact)} artifact={artifact} />
            ),
          )}
        </div>
      </div>
    </div>
  );
}
