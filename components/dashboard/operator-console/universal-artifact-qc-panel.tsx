import type { ReactNode } from "react";
import { projectUniversalArtifactQcHq } from "@/lib/infinity/universal-artifact-qc/hq-projection";

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="text-zinc-100">{value}</dd>
    </div>
  );
}

export function UniversalArtifactQcPanel({ ventureId }: { ventureId?: string | null }) {
  const projection = projectUniversalArtifactQcHq(ventureId);
  const latest = projection.all[0] ?? null;
  return (
    <section className="rounded-lg border border-white/10 p-4" data-hq-universal-artifact-qc="1">
      <h2 className="text-sm font-semibold text-white">Universal Artifact QC</h2>
      <p className="mt-1 text-xs text-zinc-500">
        HQ reports QC state. It does not become a runtime dependency.
      </p>
      <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <Row label="Waiting for QC" value={projection.waiting.map((row) => row.artifact).join(" · ") || "NONE"} />
        <Row label="Failed QC" value={projection.failed.map((row) => row.artifact).join(" · ") || "NONE"} />
        <Row label="Repairing" value={projection.repairing.map((row) => `${row.artifact} · ${row.repair_state}`).join(" · ") || "NONE"} />
        <Row label="Release-ready" value={projection.release_ready.map((row) => row.artifact).join(" · ") || "NONE"} />
        {latest ? (
          <>
            <Row label="Artifact" value={latest.artifact} />
            <Row label="Venture" value={latest.venture} />
            <Row label="Change" value={latest.change} />
            <Row label="Build State" value={latest.build_state} />
            <Row label="QC State" value={latest.qc_state} />
            <Row label="Required Layers" value={latest.required_layers.join(", ") || "NONE"} />
            <Row label="Passed Layers" value={latest.passed_layers.join(", ") || "NONE"} />
            <Row label="Failed Layers" value={latest.failed_layers.join(", ") || "NONE"} />
            <Row label="Latest Evidence" value={latest.latest_evidence} />
            <Row label="Repair State" value={latest.repair_state} />
            <Row label="Release Eligibility" value={latest.release_eligibility} />
          </>
        ) : (
          <Row label="Latest artifact" value="NONE — future material changes enter QC_PENDING after BUILD_COMPLETE" />
        )}
      </dl>
    </section>
  );
}
