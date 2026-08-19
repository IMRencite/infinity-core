"use client";

import type { OperatorVentureSnapshot, DepartmentId } from "@/lib/infinity/operator-console/types";
import type { OperatorVentureListItem } from "@/lib/infinity/operator-console/types";
import { favc1CyclePollUrl, isFavc1PollingVentureId } from "./favc1-cycle-header";
import { VentureCommandBar } from "./venture-command-bar";
import { CurrentActivityBar } from "./current-activity-bar";
import { HqSpatialFloor } from "./hq-spatial-floor";
import { CommandChamber } from "./command-chamber";
import { ActivityFeedPanel } from "./activity-feed-panel";
import { SystemView } from "./system-view";
import { DepartmentDetailPanel } from "./department-detail-panel";
import { SystemHealthStrip } from "./system-health-strip";
import { CostBreakdownStrip } from "./cost-breakdown-strip";
import { OperationsSummaryStrip } from "./operations-summary-strip";
import { PortfolioExecutiveStrip } from "./portfolio-executive-strip";
import { TopEarnersPanel } from "./top-earners-panel";
import {
  TreasuryBudgetConstraintsPanel,
  TreasuryCapitalStrip,
  TreasuryCommitmentsPanel,
  TreasuryTransactionsPanel,
  TreasuryVentureAllocationsPanel,
} from "./treasury-capital-strip";
import type { PortfolioSummary } from "@/lib/infinity/operator-console/portfolio/portfolio-types";
import type { TreasuryHqReadModel } from "@/lib/infinity/treasury/hq/read-model";
import type { CodingHqReadModel } from "@/lib/infinity/coding-agents/hq/read-model";
import type { ZtpHqReadModel } from "@/lib/infinity/zero-to-production/hq/read-model";
import { CodingIntelligenceStrip } from "./coding-intelligence-strip";
import { ZtpIntelligenceStrip } from "./ztp-intelligence-strip";
import { CommercializationReadinessStrip } from "./commercialization-readiness-strip";
import {
  deriveCommandSystemReadiness,
  findRoomArtifact,
} from "@/lib/infinity/operator-console/hq-infrastructure-priority";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HqArtifactInspectorProvider } from "./artifacts/hq-artifact-inspector-provider";
import { ArtifactInspectorModal } from "./artifacts/artifact-inspector-modal";

type Props = {
  ventureId: string;
  initialSnapshot: OperatorVentureSnapshot;
  ventureOptions?: OperatorVentureListItem[];
  portfolioSummary: PortfolioSummary;
  treasurySummary?: TreasuryHqReadModel | null;
  codingSummary?: CodingHqReadModel | null;
  ztpSummary?: ZtpHqReadModel | null;
  favc1CycleMode?: boolean;
  followFavc1Cycle?: boolean;
};

export function VentureOperatorConsole({
  ventureId,
  initialSnapshot,
  ventureOptions = [],
  portfolioSummary,
  treasurySummary = null,
  codingSummary = null,
  ztpSummary = null,
  favc1CycleMode = false,
  followFavc1Cycle = false,
}: Props) {
  return (
    <Suspense fallback={null}>
      <VentureOperatorConsoleInner
        ventureId={ventureId}
        initialSnapshot={initialSnapshot}
        ventureOptions={ventureOptions}
        portfolioSummary={portfolioSummary}
        treasurySummary={treasurySummary}
        codingSummary={codingSummary}
        ztpSummary={ztpSummary}
        favc1CycleMode={favc1CycleMode}
        followFavc1Cycle={followFavc1Cycle}
      />
    </Suspense>
  );
}

function VentureOperatorConsoleInner({
  ventureId,
  initialSnapshot,
  ventureOptions = [],
  portfolioSummary,
  treasurySummary = null,
  codingSummary = null,
  ztpSummary = null,
  favc1CycleMode = false,
  followFavc1Cycle = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const detailFromUrl = searchParams.get("detail") ?? searchParams.get("artifact");
  const [view, setView] = useState<"hq" | "system">("hq");
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentId | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [live, setLive] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const endpoint = isFavc1PollingVentureId(ventureId)
        ? favc1CyclePollUrl(ventureId)
        : `/api/operator-console/ventures/${ventureId}`;
      const res = await fetch(endpoint, { cache: "no-store" });
      if (!res.ok) {
        setPollError(res.status === 404 ? "Venture not found" : "Refresh failed");
        setLive(false);
        return;
      }
      const payload = (await res.json()) as
        | OperatorVentureSnapshot
        | { snapshot: OperatorVentureSnapshot; followVentureAssemblyId?: string | null };
      const data = "snapshot" in payload ? payload.snapshot : payload;
      setSnapshot(data);
      setPollError(null);
      setLive(true);

      if (
        followFavc1Cycle &&
        "followVentureAssemblyId" in payload &&
        payload.followVentureAssemblyId &&
        payload.followVentureAssemblyId !== ventureId
      ) {
        router.push(`/dashboard/ventures/${payload.followVentureAssemblyId}`);
      }
    } catch {
      setPollError("Refresh failed");
      setLive(false);
    }
  }, [followFavc1Cycle, router, ventureId]);

  useEffect(() => {
    void refresh();
    const intervalMs = favc1CycleMode || isFavc1PollingVentureId(ventureId) ? 3000 : 4000;
    const interval = setInterval(refresh, intervalMs);
    return () => clearInterval(interval);
  }, [favc1CycleMode, refresh, ventureId]);

  useEffect(() => {
    setSnapshot(initialSnapshot);
  }, [initialSnapshot]);

  const handleVentureChange = (id: string) => {
    router.push(`/dashboard/ventures/${id}`);
  };

  const handleDetailQueryChange = useCallback(
    (detailQuery: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("artifact");
      if (detailQuery) params.set("detail", detailQuery);
      else params.delete("detail");
      const query = params.toString();
      router.replace(query ? `?${query}` : "?", { scroll: false });
    },
    [router, searchParams],
  );

  const selected = snapshot.departments.find((d) => d.id === selectedDepartment) ?? null;

  return (
    <HqArtifactInspectorProvider
      ventureId={ventureId}
      snapshot={snapshot}
      detailQueryParam={detailFromUrl}
      onDetailQueryChange={handleDetailQueryChange}
    >
    <div className="infinity-hq space-y-3 overflow-x-hidden">
      <VentureCommandBar
        snapshot={snapshot}
        view={view}
        onViewChange={setView}
        ventureOptions={ventureOptions}
        onVentureChange={handleVentureChange}
        live={live && !pollError}
      />

      {pollError ? (
        <p className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200" role="alert">
          {pollError} — showing last known state
        </p>
      ) : null}

      {view === "hq" ? (
        <>
          <div className="space-y-2.5" data-hq-region="executive">
            <div data-hq-region="command">
              <CommandChamber
                snapshot={snapshot.departments.find((d) => d.id === "executive_office")}
                workerNodes={snapshot.workerNodes ?? []}
                currentActivity={snapshot.currentActivity}
                closedLoopRoute={snapshot.closedLoopRoute}
                isSelected={selectedDepartment === "executive_office"}
                onSelect={() => setSelectedDepartment("executive_office")}
                cycleMeta={snapshot.favc1Cycle ?? null}
                systemReadiness={deriveCommandSystemReadiness({
                  snapshot,
                  treasury: treasurySummary,
                  coding: codingSummary,
                })}
              />
            </div>
            <PortfolioExecutiveStrip summary={portfolioSummary} />
            <HqSpatialFloor
              departments={snapshot.departments}
              workerNodes={snapshot.workerNodes ?? []}
              currentActivity={snapshot.currentActivity}
              activeDepartments={snapshot.currentDepartments}
              closedLoopRoute={snapshot.closedLoopRoute}
              selectedDepartment={selectedDepartment}
              onSelectDepartment={setSelectedDepartment}
              handoffStage={snapshot.handoffStage ?? null}
              handoffLineageColorKey={snapshot.handoffLineageColorKey ?? null}
              isTerminalCycle={
                Boolean(snapshot.favc1Cycle?.terminalOutcome) &&
                snapshot.favc1Cycle?.terminalOutcome !== "RUNNING"
              }
            />
          </div>

          <div className="space-y-3 border-t border-zinc-800/60 pt-4" data-hq-region="infrastructure">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-600">System Infrastructure</p>
            {treasurySummary ? (
              <TreasuryCapitalStrip
                model={treasurySummary}
                inspectArtifact={findRoomArtifact(snapshot, "treasury_state")}
              />
            ) : null}
            {codingSummary ? (
              <CodingIntelligenceStrip
                model={codingSummary}
                inspectArtifact={
                  findRoomArtifact(snapshot, "coding_agent_run") ?? findRoomArtifact(snapshot, "coding_provider")
                }
              />
            ) : null}
            <CommercializationReadinessStrip
              snapshot={snapshot}
              inspectArtifact={
                findRoomArtifact(snapshot, "commercial_domain") ??
                findRoomArtifact(snapshot, "commercial_payment") ??
                findRoomArtifact(snapshot, "commercial_treasury")
              }
            />
            {ztpSummary ? (
              <ZtpIntelligenceStrip
                model={ztpSummary}
                inspectArtifact={findRoomArtifact(snapshot, "ztp_run")}
              />
            ) : null}
            <SystemHealthStrip snapshot={snapshot} />
            <TopEarnersPanel summary={portfolioSummary} />
            {treasurySummary ? (
              <>
                <TreasuryBudgetConstraintsPanel model={treasurySummary} />
                <TreasuryVentureAllocationsPanel model={treasurySummary} />
                <TreasuryTransactionsPanel model={treasurySummary} />
                <TreasuryCommitmentsPanel model={treasurySummary} />
              </>
            ) : null}
            <OperationsSummaryStrip snapshot={snapshot} />

            <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
              <div className="space-y-4">
                <CostBreakdownStrip departments={snapshot.departments} costs={snapshot.costs} />
                <CurrentActivityBar activity={snapshot.currentActivity} />
                <ActivityFeedPanel events={snapshot.activityFeed} />
              </div>
              <DepartmentDetailPanel
                department={selected}
                providers={snapshot.providers}
                workerNodes={snapshot.workerNodes ?? []}
                costs={snapshot.costs}
              />
            </div>
          </div>
        </>
      ) : (
        <SystemView snapshot={snapshot} portfolioSummary={portfolioSummary} />
      )}
      <ArtifactInspectorModal />
    </div>
    </HqArtifactInspectorProvider>
  );
}
