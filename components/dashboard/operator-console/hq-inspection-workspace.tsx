"use client";

import { useMemo, useState } from "react";
import type { DepartmentId, OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import type { HqInspectionContext } from "@/lib/infinity/operator-console/inspection-context";
import {
  HQ_INSPECTION_WRITE_BOUNDARY,
  filterArtifactsForInspection,
  isRoomCompatibleWithInspection,
} from "@/lib/infinity/operator-console/inspection-context";
import { getRoomDisplayNames } from "@/lib/infinity/operator-console/room-naming";
import { abbreviateCanonicalId } from "@/lib/infinity/venture-systems-architecture/hq/identity-guards";
import type { SystemsArchitectHqView } from "@/lib/infinity/venture-systems-architecture/hq/hq-view";
import { HQOutputDetailShell } from "./artifacts/hq-output-detail";
import { RoomArtifactSurface } from "./artifacts/room-artifact-surface";
import { SystemsArchitectDetail } from "./systems-architect-blueprint";

type WorkspaceTab = "overview" | "research_department" | "strategy_finance" | "quality_control" | "systems_architect";

const TAB_ORDER: WorkspaceTab[] = [
  "overview",
  "research_department",
  "strategy_finance",
  "quality_control",
  "systems_architect",
];

const TAB_LABELS: Record<WorkspaceTab, string> = {
  overview: "Overview",
  research_department: "Research",
  strategy_finance: "Profit",
  quality_control: "Validation",
  systems_architect: "Systems Architect",
};

function typeLabel(context: HqInspectionContext): string {
  if (context.entityType === "OPPORTUNITY_CANDIDATE") return "Opportunity Candidate";
  if (context.entityType === "VENTURE") return "Venture";
  return "Unknown";
}

function supportedTabs(context: HqInspectionContext): WorkspaceTab[] {
  return TAB_ORDER.filter((tab) => {
    if (tab === "overview") return true;
    return isRoomCompatibleWithInspection(tab, context);
  });
}

type Props = {
  snapshot: OperatorVentureSnapshot;
  context: HqInspectionContext;
  systemsView: SystemsArchitectHqView | null;
  open: boolean;
  onClose: () => void;
};

export function HqInspectionWorkspace({ snapshot, context, systemsView, open, onClose }: Props) {
  const tabs = useMemo(() => supportedTabs(context), [context]);
  const [tab, setTab] = useState<WorkspaceTab>("overview");
  const safeTab = tabs.includes(tab) ? tab : "overview";
  const name = context.displayName ?? (context.status === "UNAVAILABLE" ? "Inspection context unavailable." : "Selected entity");

  return (
    <HQOutputDetailShell
      open={open}
      onClose={onClose}
      variant="workspace"
      ariaLabel={`${typeLabel(context)} inspection workspace`}
    >
      <div className="hq-inspection-workspace" data-hq-inspection-workspace="true" data-inspection-type={context.entityType ?? "none"}>
        <header className="hq-inspection-workspace-header">
          <button
            type="button"
            className="hq-inspection-workspace-back"
            data-hq-inspection-workspace-back="true"
            aria-label="Back to HQ floor"
            onClick={onClose}
          >
            ← Back to HQ
          </button>
          <p className="hq-inspection-kicker">{context.status === "UNAVAILABLE" ? "UNAVAILABLE" : "INSPECTING"}</p>
          <h2 className="hq-inspection-workspace-title" data-inspection-workspace-name={name}>
            {name}
          </h2>
          <dl className="hq-inspection-meta">
            <div>
              <dt>Type</dt>
              <dd data-inspection-workspace-type>{typeLabel(context)}</dd>
            </div>
            {context.entityId ? (
              <div>
                <dt>ID</dt>
                <dd data-inspection-workspace-id={context.entityId}>{abbreviateCanonicalId(context.entityId)}</dd>
              </div>
            ) : null}
            {context.stage ? (
              <div>
                <dt>Stage</dt>
                <dd>{context.stage}</dd>
              </div>
            ) : null}
            {context.origin ? (
              <div>
                <dt>Origin</dt>
                <dd>{context.origin}</dd>
              </div>
            ) : null}
          </dl>
        </header>

        <div className="hq-inspection-workspace-tabs" role="tablist" aria-label="Inspection sections">
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={safeTab === item}
              data-hq-inspection-tab={item}
              className={`hq-inspection-workspace-tab ${safeTab === item ? "hq-inspection-workspace-tab--active" : ""}`}
              onClick={() => setTab(item)}
            >
              {TAB_LABELS[item]}
            </button>
          ))}
        </div>

        <div className="hq-inspection-workspace-body" role="tabpanel">
          {safeTab === "overview" ? (
            <section className="space-y-3">
              <p className="text-sm leading-relaxed text-zinc-300">
                {context.entityType === "VENTURE"
                  ? "Venture operating view. Compatible HQ rooms follow this read-only inspection context."
                  : "Opportunity Blueprint inspection. Compatible HQ rooms follow this read-only candidate context."}
              </p>
              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-600" data-hq-inspection-write-boundary="true">
                Writes {HQ_INSPECTION_WRITE_BOUNDARY.validationWrites + HQ_INSPECTION_WRITE_BOUNDARY.selectionWrites}
              </p>
            </section>
          ) : null}

          {safeTab === "systems_architect" ? (
            systemsView ? (
              <SystemsArchitectDetail view={systemsView} />
            ) : (
              <p className="text-sm text-zinc-500">No Systems Architect context is available for this entity.</p>
            )
          ) : null}

          {safeTab !== "overview" && safeTab !== "systems_architect" ? (
            <WorkspaceRoomArtifacts snapshot={snapshot} context={context} roomId={safeTab} />
          ) : null}
        </div>
      </div>
    </HQOutputDetailShell>
  );
}

function WorkspaceRoomArtifacts({
  snapshot,
  context,
  roomId,
}: {
  snapshot: OperatorVentureSnapshot;
  context: HqInspectionContext;
  roomId: DepartmentId;
}) {
  const department = snapshot.departments.find((dept) => dept.id === roomId);
  const artifacts = filterArtifactsForInspection(department?.workArtifacts ?? [], context, roomId);
  const names = getRoomDisplayNames(roomId);
  if (artifacts.length === 0) {
    return <p className="text-sm text-zinc-500">No {names.displayName} outputs for this inspection context.</p>;
  }
  return (
    <RoomArtifactSurface
      artifacts={artifacts}
      expectedCount={artifacts.length}
      roomName={names.displayName}
      compact
    />
  );
}
