"use client";

import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import { deriveCommandSystemReadiness } from "@/lib/infinity/operator-console/hq-infrastructure-priority";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import { useOptionalHqArtifactInspector } from "./artifacts/hq-artifact-inspector-provider";

type Props = {
  snapshot: OperatorVentureSnapshot;
  inspectArtifact?: HqWorkArtifact | null;
};

const PROVIDER_ORDER = ["Registrar", "DNS", "Hosting", "Payments"] as const;

function providerArtifacts(snapshot: OperatorVentureSnapshot): HqWorkArtifact[] {
  return Object.values(snapshot.roomArtifacts ?? {})
    .flat()
    .filter((artifact) => artifact.sourceRecordType === "provider_readiness");
}

export function CommercializationReadinessStrip({ snapshot, inspectArtifact = null }: Props) {
  const inspector = useOptionalHqArtifactInspector();
  const commercialization = deriveCommandSystemReadiness({ snapshot }).find((item) => item.id === "commercialization");
  const providers = providerArtifacts(snapshot);
  const ordered = PROVIDER_ORDER.map(
    (title) => providers.find((artifact) => artifact.title === title) ?? null,
  );

  return (
    <section
      aria-label="Commercialization Readiness"
      data-infrastructure-presentation="COMPACT"
      className="relative overflow-hidden border border-zinc-700/35 bg-gradient-to-r from-zinc-950/80 via-[#070709] to-zinc-950/80"
    >
      <div className="relative flex flex-col gap-2 px-4 py-2">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300">Commercialization</h2>
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
              {commercialization?.status ?? "ENGINE VERIFIED"}
            </p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-amber-500/80">Purchase Authority LOCKED</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {PROVIDER_ORDER.map((title, index) => {
            const artifact = ordered[index];
            const status = artifact ? String(artifact.metadata.displayStatus ?? "NOT CONFIGURED") : "NOT CONFIGURED";
            const onInspect =
              artifact && inspector
                ? () => inspector.openInspector(artifact)
                : inspectArtifact && inspector
                  ? () => inspector.openInspector(inspectArtifact)
                  : undefined;
            return (
              <button
                key={title}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onInspect?.();
                }}
                disabled={!onInspect}
                className="rounded border border-zinc-800/80 bg-zinc-950/40 px-2 py-1.5 text-left disabled:opacity-70"
              >
                <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{title}</p>
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-200">{status}</p>
                <p className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">Not write enabled</p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
