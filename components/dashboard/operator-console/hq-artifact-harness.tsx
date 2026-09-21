"use client";

import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import { sanitizeArtifactMetadata } from "@/lib/infinity/operator-console/artifacts/metadata-sanitize";
import { applyLineageFields } from "@/lib/infinity/operator-console/artifacts/resolve-artifact-lineage";
import { ArtifactStack } from "./artifacts/primitives";
import { WorkerNodeCluster } from "./worker-node";
import { useHqArtifactInspector } from "./artifacts/hq-artifact-inspector-provider";
import { LineageMarker, lineageClassForArtifact, lineageStyleForArtifact } from "./artifacts/lineage-accent";
import type { OperatorWorkerNode } from "@/lib/infinity/operator-console/types";

const C1 = "11111111-1111-1111-1111-111111111101";
const C2 = "22222222-2222-2222-2222-222222222202";
const C3 = "33333333-3333-3333-3333-333333333303";
const C4 = "44444444-4444-4444-4444-444444444404";
const SELECTED = C3;

const lineageContext = {
  candidateRankById: new Map([
    [C1, 1],
    [C2, 2],
    [C3, 3],
    [C4, 4],
  ]),
  candidateTitleById: new Map([
    [C1, "Affordable Google Review Response SaaS"],
    [C2, "Bank-Linked Tenant Income Verification"],
    [C3, "Subcontractor COI Compliance Utility"],
    [C4, "Specialized Tattoo Studio Booking Platform"],
  ]),
  selectedCandidateId: SELECTED,
};

function withLineage(partial: Partial<HqWorkArtifact> & Pick<HqWorkArtifact, "id" | "artifactType" | "title">): HqWorkArtifact {
  return applyLineageFields(
    {
      roomId: "opportunity_lab",
      subtitle: null,
      state: "READY",
      createdAt: null,
      sourceRecordType: "fixture",
      sourceRecordId: partial.id,
      metadata: {},
      ...partial,
    },
    lineageContext,
  );
}

export const HARNESS_ARTIFACT_FIXTURES: HqWorkArtifact[] = [
  withLineage({
    id: `opp:${C1}`,
    roomId: "opportunity_lab",
    artifactType: "opportunity_candidate",
    title: "Affordable Google Review Response SaaS",
    sourceRecordId: C1,
    metadata: sanitizeArtifactMetadata({ score: 85.8, rank: 1, candidateId: C1 }),
  }),
  withLineage({
    id: `opp:${C2}`,
    roomId: "opportunity_lab",
    artifactType: "opportunity_candidate",
    title: "Bank-Linked Tenant Income & Rent Verification",
    sourceRecordId: C2,
    metadata: sanitizeArtifactMetadata({ score: 84.8, rank: 2, candidateId: C2 }),
  }),
  withLineage({
    id: `opp:${C3}`,
    roomId: "opportunity_lab",
    artifactType: "opportunity_candidate",
    title: "Subcontractor COI Compliance Utility",
    sourceRecordId: C3,
    state: "SELECTED",
    metadata: sanitizeArtifactMetadata({ score: 80.7, rank: 3, candidateId: C3 }),
  }),
  withLineage({
    id: `opp:${C4}`,
    roomId: "opportunity_lab",
    artifactType: "opportunity_candidate",
    title: "Specialized Tattoo Studio Booking Platform",
    sourceRecordId: C4,
    metadata: sanitizeArtifactMetadata({ score: 74.8, rank: 4, candidateId: C4 }),
  }),
  {
    id: "fixture-research-1",
    roomId: "research_department",
    artifactType: "research_packet",
    title: "Discovery evidence packet",
    subtitle: "7 sources · grounded",
    state: "READY",
    createdAt: null,
    sourceRecordType: "fixture",
    sourceRecordId: "fixture-research-1",
    metadata: sanitizeArtifactMetadata({ sourceCount: 7, grounded: true, provider: "gemini" }),
  },
  withLineage({
    id: "fixture-mon-c3",
    roomId: "strategy_finance",
    artifactType: "monetization_plan",
    title: "SaaS",
    subtitle: "$149/mo",
    sourceRecordId: "fixture-mon-c3",
    metadata: sanitizeArtifactMetadata({ monetizationScore: 76.7, ltvCacRatio: 4.6, expectedRoi: 4.6, candidateId: C3 }),
  }),
  withLineage({
    id: "fixture-mon-c1",
    roomId: "strategy_finance",
    artifactType: "monetization_plan",
    title: "Subscription",
    subtitle: "$99/mo",
    sourceRecordId: "fixture-mon-c1",
    metadata: sanitizeArtifactMetadata({ monetizationScore: 72.1, candidateId: C1 }),
  }),
  withLineage({
    id: "fixture-blueprint-c3",
    roomId: "company_operations",
    artifactType: "selection_blueprint",
    title: "Subcontractor COI Compliance Utility",
    state: "SELECTED",
    sourceRecordId: "fixture-blueprint-c3",
    metadata: sanitizeArtifactMetadata({ decision: "VALIDATE", score: 74.0, candidateId: C3, selected: true }),
  }),
  withLineage({
    id: "fixture-assumption-c3",
    roomId: "quality_control",
    artifactType: "assumption",
    title: "Customer acquisition cost near $518",
    state: "SELECTED",
    sourceRecordId: "fixture-assumption-c3",
    metadata: sanitizeArtifactMetadata({ candidateId: C3, selected: true }),
  }),
  withLineage({
    id: "fixture-evidence-c3",
    roomId: "quality_control",
    artifactType: "validation_evidence",
    title: "CAC provider research",
    sourceRecordId: "fixture-evidence-c3",
    metadata: sanitizeArtifactMetadata({ validationResult: "DIRECT", newSourceCount: 3, candidateId: C3 }),
  }),
  withLineage({
    id: "fixture-evidence-creating",
    roomId: "quality_control",
    artifactType: "validation_evidence",
    title: "Provider acquisition",
    state: "CREATING",
    sourceRecordId: "fixture-evidence-creating",
    metadata: sanitizeArtifactMetadata({ relevance: "SUPPORTED", candidateId: C3 }),
  }),
  withLineage({
    id: "fixture-decision-c3",
    roomId: "quality_control",
    artifactType: "decision",
    title: "VALIDATE",
    subtitle: "Post-validation",
    sourceRecordId: "fixture-decision-c3",
    metadata: sanitizeArtifactMetadata({
      decision: "VALIDATE",
      fatalRiskBefore: 0.53,
      fatalRiskAfter: 0.51,
      candidateId: C3,
      selected: true,
    }),
  }),
  withLineage({
    id: "fixture-production-c3",
    roomId: "product_lab",
    artifactType: "production_artifact",
    title: "Subcontractor COI Compliance Utility",
    subtitle: "Deployable build package",
    state: "READY",
    sourceRecordId: "fixture-production-c3",
    metadata: sanitizeArtifactMetadata({ candidateId: C3, buildStatus: "MATERIALIZED", fileCount: 42 }),
  }),
];

export const INSPECTOR_DEMO_ARTIFACT_IDS = {
  candidate: `opp:${C3}`,
  monetization: "fixture-mon-c3",
  validation: "fixture-evidence-c3",
  production: "fixture-production-c3",
} as const;

export function harnessArtifactById(id: string): HqWorkArtifact | undefined {
  return HARNESS_ARTIFACT_FIXTURES.find((artifact) => artifact.id === id);
}

export const HARNESS_WORKER_FIXTURE: OperatorWorkerNode = {
  nodeId: "fixture-worker-1",
  departmentId: "quality_control",
  role: "RESEARCH_PROVIDER",
  displayRole: "Research",
  status: "RUNNING",
  task: "Acquiring grounded evidence",
  displayTask: "Acquiring grounded evidence",
  provider: "gemini",
  model: "gemini-3",
  isActive: true,
  isDormant: false,
  motionActive: true,
};

function RoomDemo({
  title,
  artifacts,
  overflowCount = 0,
  isActive = false,
  workerNodes = [] as OperatorWorkerNode[],
}: {
  title: string;
  artifacts: HqWorkArtifact[];
  overflowCount?: number;
  isActive?: boolean;
  workerNodes?: OperatorWorkerNode[];
}) {
  return (
    <div className={`rounded-lg border bg-[#070709] p-3 ${isActive ? "border-cyan-500/35 hq-room-active" : "border-zinc-800"}`}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">{title}</p>
      {workerNodes.length > 0 ? (
        <div className="mb-2">
          <WorkerNodeCluster nodes={workerNodes} compact />
        </div>
      ) : null}
      <ArtifactStack artifacts={artifacts} overflowCount={overflowCount} isActive={isActive} />
    </div>
  );
}

export function HqArtifactHarnessPreview() {
  const venture = HARNESS_ARTIFACT_FIXTURES.filter((a) => a.roomId === "opportunity_lab");
  const research = HARNESS_ARTIFACT_FIXTURES.filter((a) => a.roomId === "research_department");
  const profit = HARNESS_ARTIFACT_FIXTURES.filter((a) => a.roomId === "strategy_finance");
  const blueprint = HARNESS_ARTIFACT_FIXTURES.filter((a) => a.artifactType === "selection_blueprint");
  const validation = HARNESS_ARTIFACT_FIXTURES.filter(
    (a) => a.roomId === "quality_control" && a.artifactType !== "decision",
  );
  const decision = HARNESS_ARTIFACT_FIXTURES.filter((a) => a.artifactType === "decision");
  const selectedLineage = venture.find((a) => a.sourceRecordId === SELECTED)?.lineageColorKey;

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Large artifacts + candidate lineage preview</p>
      <p className="mt-1 text-sm text-zinc-400">
        Local fixture props only — Candidate #3 ({selectedLineage}) retains lineage across Venture Radar → Profit Lab → Blueprint → Validation.
      </p>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <RoomDemo title="Venture Radar — 4 lineage identities" artifacts={venture} isActive />
        <RoomDemo title="Research Grid — neutral shared packet" artifacts={research} />
        <RoomDemo title="Profit Lab — candidate-linked monetization" artifacts={profit} isActive />
        <RoomDemo title="Blueprint Lab — VALIDATE + lineage #3" artifacts={blueprint} isActive />
        <RoomDemo
          title="Validation Station — assumption + evidence + risk"
          artifacts={[...validation.filter((a) => a.state !== "CREATING"), ...decision]}
          isActive
        />
        <RoomDemo
          title="Provider agent + CREATING → READY"
          artifacts={validation.filter((a) => a.state === "CREATING")}
          workerNodes={[HARNESS_WORKER_FIXTURE]}
          isActive
        />
      </div>
    </section>
  );
}

function InspectorDemoTrigger({ artifact, label }: { artifact: HqWorkArtifact; label: string }) {
  const { openInspector } = useHqArtifactInspector();
  return (
    <button
      type="button"
      onClick={() => openInspector(artifact)}
      className={`rounded-lg border border-zinc-800 bg-zinc-950/80 p-3 text-left transition hover:border-cyan-500/35 hover:shadow-[0_0_16px_rgba(34,211,238,0.12)] ${lineageClassForArtifact(artifact)}`}
      style={lineageStyleForArtifact(artifact)}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <div className="mt-2 flex items-start gap-2">
        <LineageMarker artifact={artifact} compact />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-100">{artifact.title}</p>
          <p className="mt-0.5 text-xs text-zinc-500">{artifact.artifactType.replace(/_/g, " ")}</p>
        </div>
      </div>
    </button>
  );
}

export function HqInspectorHarnessPreview() {
  const candidate = harnessArtifactById(INSPECTOR_DEMO_ARTIFACT_IDS.candidate);
  const monetization = harnessArtifactById(INSPECTOR_DEMO_ARTIFACT_IDS.monetization);
  const validation = harnessArtifactById(INSPECTOR_DEMO_ARTIFACT_IDS.validation);
  const production = harnessArtifactById(INSPECTOR_DEMO_ARTIFACT_IDS.production);
  const demos = [
    candidate ? { label: "Candidate", artifact: candidate } : null,
    monetization ? { label: "Monetization", artifact: monetization } : null,
    validation ? { label: "Validation", artifact: validation } : null,
    production ? { label: "Production", artifact: production } : null,
  ].filter(Boolean) as { label: string; artifact: HqWorkArtifact }[];

  return (
    <section className="rounded-xl border border-cyan-500/20 bg-zinc-950 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-cyan-300/80">Centered holographic artifact inspector</p>
      <p className="mt-1 text-sm text-zinc-400">
        Click a fixture below to open the centered modal over the harness floor. Verify placement at ~1280px desktop width.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {demos.map(({ label, artifact }) => (
          <InspectorDemoTrigger key={artifact.id} label={label} artifact={artifact} />
        ))}
      </div>
    </section>
  );
}
