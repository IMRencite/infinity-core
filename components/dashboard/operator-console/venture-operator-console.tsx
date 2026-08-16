"use client";

import type { OperatorVentureSnapshot, DepartmentId } from "@/lib/infinity/operator-console/types";
import type { OperatorVentureListItem } from "@/lib/infinity/operator-console/types";
import { VentureCommandBar } from "./venture-command-bar";
import { CurrentActivityBar } from "./current-activity-bar";
import { HqSpatialFloor } from "./hq-spatial-floor";
import { ActivityFeedPanel } from "./activity-feed-panel";
import { SystemView } from "./system-view";
import { DepartmentDetailPanel } from "./department-detail-panel";
import { SystemHealthStrip } from "./system-health-strip";
import { CostBreakdownStrip } from "./cost-breakdown-strip";
import { OperationsSummaryStrip } from "./operations-summary-strip";
import { PortfolioExecutiveStrip } from "./portfolio-executive-strip";
import { TopEarnersPanel } from "./top-earners-panel";
import type { PortfolioSummary } from "@/lib/infinity/operator-console/portfolio/portfolio-types";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type Props = {
  ventureId: string;
  initialSnapshot: OperatorVentureSnapshot;
  ventureOptions?: OperatorVentureListItem[];
  portfolioSummary: PortfolioSummary;
};

export function VentureOperatorConsole({
  ventureId,
  initialSnapshot,
  ventureOptions = [],
  portfolioSummary,
}: Props) {
  const router = useRouter();
  const [view, setView] = useState<"hq" | "system">("hq");
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentId | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [live, setLive] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/operator-console/ventures/${ventureId}`, { cache: "no-store" });
      if (!res.ok) {
        setPollError(res.status === 404 ? "Venture not found" : "Refresh failed");
        setLive(false);
        return;
      }
      const data = (await res.json()) as OperatorVentureSnapshot;
      setSnapshot(data);
      setPollError(null);
      setLive(true);
    } catch {
      setPollError("Refresh failed");
      setLive(false);
    }
  }, [ventureId]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    setSnapshot(initialSnapshot);
  }, [initialSnapshot]);

  const handleVentureChange = (id: string) => {
    router.push(`/dashboard/ventures/${id}`);
  };

  const selected = snapshot.departments.find((d) => d.id === selectedDepartment) ?? null;

  return (
    <div className="space-y-4">
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
          {/* Layer 1–2: HQ above the fold */}
          <div className="space-y-3">
            <PortfolioExecutiveStrip summary={portfolioSummary} />
            <CurrentActivityBar activity={snapshot.currentActivity} compact />
            <HqSpatialFloor
              departments={snapshot.departments}
              workerNodes={snapshot.workerNodes ?? []}
              currentActivity={snapshot.currentActivity}
              activeDepartments={snapshot.currentDepartments}
              closedLoopRoute={snapshot.closedLoopRoute}
              selectedDepartment={selectedDepartment}
              onSelectDepartment={setSelectedDepartment}
            />
          </div>

          {/* Layer 3 + technical detail */}
          <div className="space-y-4 border-t border-zinc-800/60 pt-6">
            <TopEarnersPanel summary={portfolioSummary} />
            <OperationsSummaryStrip snapshot={snapshot} />

            <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
              <div className="space-y-4">
                <SystemHealthStrip snapshot={snapshot} />
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
    </div>
  );
}
