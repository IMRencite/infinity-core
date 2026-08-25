"use client";

import type { SystemsArchitectHqView } from "@/lib/infinity/venture-systems-architecture/hq/hq-view";
import { HQOutputDetailShell } from "./artifacts/hq-output-detail";
import { SystemsArchitectDetail } from "./systems-architect-blueprint";

type Props = {
  open: boolean;
  view: SystemsArchitectHqView | null;
  onClose: () => void;
};

export function SystemsArchitectWorkspace({ open, view, onClose }: Props) {
  return (
    <HQOutputDetailShell
      open={open}
      onClose={onClose}
      variant="workspace"
      ariaLabel="Systems Architect architecture workspace"
    >
      <section
        id="systems-architect-workspace"
        data-systems-architect-workspace="true"
        className="systems-architect-workspace"
        aria-label="Systems Architect architecture workspace"
      >
        {view ? (
          <SystemsArchitectDetail view={view} onClose={onClose} />
        ) : (
          <>
            <button
              type="button"
              className="systems-architect-back"
              data-systems-architect-back="true"
              aria-label="Back to HQ floor"
              onClick={onClose}
            >
              ← Back to HQ
            </button>
            <p className="systems-architect-empty-copy">No architecture context is available for this room.</p>
          </>
        )}
      </section>
    </HQOutputDetailShell>
  );
}
