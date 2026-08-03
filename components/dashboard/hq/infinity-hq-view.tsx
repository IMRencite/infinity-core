import type { HqDashboardSnapshot } from "@/lib/infinity/hq/types";
import type { ExecutiveQueueSort } from "@/lib/infinity/hq/queries";
import { ExecutiveOverview } from "./executive-overview";
import { HealthGrid } from "./health-grid";
import { PipelineBoard } from "./pipeline-board";
import { MissionStageBoard } from "./mission-stage-board";
import { ExecutiveQueuePanel } from "./executive-queue";
import { BlueprintTable } from "./blueprint-table";
import { WorkerHealthPanel } from "./worker-health";
import { ReasoningStatusPanel } from "./reasoning-status";
import { ActivityFeed } from "./activity-feed";
import { AlertsPanel } from "./alerts-panel";
import { PortfolioSummaryPanel } from "./portfolio-summary";
import { WorkerCapabilityDiagnosticsPanel } from "./worker-capability-diagnostics";
import type { WorkerCapabilityDiagnosticsRow } from "@/lib/infinity/workers/types";

export function InfinityHqView({
  snapshot,
  queueSort,
  eventSeverity,
  missionStage,
  workerDiagnostics,
}: {
  snapshot: HqDashboardSnapshot;
  queueSort: ExecutiveQueueSort;
  eventSeverity?: string | null;
  missionStage?: string | null;
  workerDiagnostics?: WorkerCapabilityDiagnosticsRow[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <ExecutiveOverview overview={snapshot.executiveOverview} />
        <HealthGrid health={snapshot.systemHealth} />
      </div>
      <PipelineBoard stages={snapshot.opportunityPipeline} />
      {missionStage ? (
        <p className="text-[12px] text-zinc-500">
          Mission stage filter: <span className="text-zinc-300">{missionStage}</span>{" "}
          <a href="/dashboard" className="text-sky-400 hover:underline">
            Clear
          </a>
        </p>
      ) : null}
      <MissionStageBoard missions={snapshot.missions} />
      <div className="grid gap-4 xl:grid-cols-2">
        <ExecutiveQueuePanel items={snapshot.executiveQueue} activeSort={queueSort} />
        <AlertsPanel alerts={snapshot.alerts} />
      </div>
      <BlueprintTable rows={snapshot.blueprints} />
      <div className="grid gap-4 xl:grid-cols-2">
        <WorkerHealthPanel worker={snapshot.workerHealth} />
        <ReasoningStatusPanel reasoning={snapshot.reasoningStatus} />
      </div>
      {workerDiagnostics ? (
        <WorkerCapabilityDiagnosticsPanel rows={workerDiagnostics} />
      ) : null}
      <div className="grid gap-4 xl:grid-cols-2">
        <ActivityFeed items={snapshot.activity} activeSeverity={eventSeverity} />
        <PortfolioSummaryPanel portfolio={snapshot.portfolio} />
      </div>
      <p className="text-[11px] text-zinc-600">
        Snapshot generated {new Date(snapshot.generatedAt).toLocaleString()} · Build Factory not
        implemented · HQ is read-only observability
      </p>
    </div>
  );
}
