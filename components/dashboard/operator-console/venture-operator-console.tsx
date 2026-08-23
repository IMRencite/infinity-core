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
import { SystemsArchitectDetail } from "./systems-architect-blueprint";
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
} from "./treasury-capital-strip";
import { TreasuryControlCenter } from "./treasury-control-center";
import type { PortfolioSummary } from "@/lib/infinity/operator-console/portfolio/portfolio-types";
import type { TreasuryHqReadModel } from "@/lib/infinity/treasury/hq/read-model";
import { buildTreasuryHqArtifacts, replaceTreasuryArtifacts } from "@/lib/infinity/treasury/hq/artifacts";
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
import { HqInspectionProvider, useHqInspection } from "./hq-inspection-provider";

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
  const [treasury, setTreasury] = useState(treasurySummary);
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

  useEffect(() => {
    setTreasury(treasurySummary);
  }, [treasurySummary]);

  const handleTreasuryChange = useCallback((model: TreasuryHqReadModel) => {
    setTreasury(model);
    const nextTreasuryArtifacts = buildTreasuryHqArtifacts(model);
    setSnapshot((prev) => ({
      ...prev,
      treasury: model,
      roomArtifacts: replaceTreasuryArtifacts(prev.roomArtifacts, nextTreasuryArtifacts),
    }));
  }, []);

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

  return (
    <HqInspectionProvider snapshot={snapshot}>
    <HqArtifactInspectorProvider
      ventureId={ventureId}
      snapshot={snapshot}
      detailQueryParam={detailFromUrl}
      onDetailQueryChange={handleDetailQueryChange}
    >
    <VentureOperatorConsoleBody
      snapshot={snapshot}
      view={view}
      setView={setView}
      ventureOptions={ventureOptions}
      onVentureChange={handleVentureChange}
      live={live && !pollError}
      pollError={pollError}
      selectedDepartment={selectedDepartment}
      setSelectedDepartment={setSelectedDepartment}
      portfolioSummary={portfolioSummary}
      treasury={treasury}
      codingSummary={codingSummary}
      ztpSummary={ztpSummary}
      onTreasuryChange={handleTreasuryChange}
    />
      <ArtifactInspectorModal />
    </HqArtifactInspectorProvider>
    </HqInspectionProvider>
  );
}

function VentureOperatorConsoleBody({
  snapshot,
  view,
  setView,
  ventureOptions,
  onVentureChange,
  live,
  pollError,
  selectedDepartment,
  setSelectedDepartment,
  portfolioSummary,
  treasury,
  codingSummary,
  ztpSummary,
  onTreasuryChange,
}: {
  snapshot: OperatorVentureSnapshot;
  view: "hq" | "system";
  setView: (view: "hq" | "system") => void;
  ventureOptions: OperatorVentureListItem[];
  onVentureChange: (id: string) => void;
  live: boolean;
  pollError: string | null;
  selectedDepartment: DepartmentId | null;
  setSelectedDepartment: (id: DepartmentId | null) => void;
  portfolioSummary: PortfolioSummary;
  treasury: TreasuryHqReadModel | null;
  codingSummary: CodingHqReadModel | null;
  ztpSummary: ZtpHqReadModel | null;
  onTreasuryChange: (model: TreasuryHqReadModel) => void;
}) {
  const inspection = useHqInspection();
  const selected = snapshot.departments.find((d) => d.id === selectedDepartment) ?? null;
  const systemsArchitectView = inspection.systemsArchitectView;

  useEffect(() => {
    if (selectedDepartment !== "systems_architect") return;
    document.getElementById("systems-architect-workspace")?.scrollIntoView({ block: "nearest" });
  }, [selectedDepartment]);

  return (
    <div className="infinity-hq space-y-3 overflow-x-hidden">
      <VentureCommandBar
        snapshot={snapshot}
        view={view}
        onViewChange={setView}
        ventureOptions={ventureOptions}
        onVentureChange={onVentureChange}
        live={live}
        currentRoom={selectedDepartment}
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
                ventureName={snapshot.venture.ventureName}
                systemReadiness={deriveCommandSystemReadiness({
                  snapshot,
                  treasury: treasury,
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
              ventureName={snapshot.venture.ventureName}
              isTerminalCycle={
                Boolean(snapshot.favc1Cycle?.terminalOutcome) &&
                snapshot.favc1Cycle?.terminalOutcome !== "RUNNING"
              }
            />
          </div>

          {selectedDepartment === "systems_architect" ? (
            <section
              id="systems-architect-workspace"
              data-systems-architect-workspace="true"
              className="systems-architect-workspace"
              aria-label="Systems Architect architecture workspace"
            >
              {systemsArchitectView ? (
                <SystemsArchitectDetail
                  view={systemsArchitectView}
                  onClose={() => setSelectedDepartment(null)}
                />
              ) : (
                <>
                  <button
                    type="button"
                    className="systems-architect-back"
                    data-systems-architect-back="true"
                    aria-label="Back to HQ floor"
                    onClick={() => setSelectedDepartment(null)}
                  >
                    ← Back to HQ
                  </button>
                  <p className="systems-architect-empty-copy">No architecture context is available for this room.</p>
                </>
              )}
            </section>
          ) : null}

          <div className="space-y-3 border-t border-zinc-800/60 pt-4" data-hq-region="infrastructure">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-600">System Infrastructure</p>
            {treasury ? (
              <TreasuryCapitalStrip
                model={treasury}
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
            {treasury ? (
              <>
                <TreasuryControlCenter
                  model={treasury}
                  ventureOptions={ventureOptions}
                  onModelChange={onTreasuryChange}
                />
                <TreasuryBudgetConstraintsPanel model={treasury} />
                <TreasuryTransactionsPanel model={treasury} />
                <TreasuryCommitmentsPanel model={treasury} />
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
                architectureWorkspaceOpen={selectedDepartment === "systems_architect"}
              />
            </div>
          </div>
        </>
      ) : (
        <SystemView snapshot={snapshot} portfolioSummary={portfolioSummary} />
      )}
    </div>
  );
}
