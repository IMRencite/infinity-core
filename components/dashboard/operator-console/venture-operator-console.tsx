"use client";

import type { OperatorVentureSnapshot, DepartmentId } from "@/lib/infinity/operator-console/types";
import { departmentStateClasses, departmentStateLabel } from "@/lib/infinity/operator-console/status-derivation";
import { VentureCommandBar } from "./venture-command-bar";
import { CurrentActivityBar } from "./current-activity-bar";
import { HqFloor } from "./hq-floor";
import { ActivityFeedPanel } from "./activity-feed-panel";
import { SystemView } from "./system-view";
import { DepartmentDetailPanel } from "./department-detail-panel";
import { useState, useEffect } from "react";

type Props = {
  ventureId: string;
  initialSnapshot: OperatorVentureSnapshot;
};

export function VentureOperatorConsole({ ventureId, initialSnapshot }: Props) {
  const [view, setView] = useState<"hq" | "system">("hq");
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentId | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/operator-console/ventures/${ventureId}`, { cache: "no-store" });
        if (!res.ok) {
          setPollError(res.status === 404 ? "Venture not found" : "Refresh failed");
          return;
        }
        const data = (await res.json()) as OperatorVentureSnapshot;
        setSnapshot(data);
        setPollError(null);
      } catch {
        setPollError("Refresh failed");
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [ventureId]);

  const selected = snapshot.departments.find((d) => d.id === selectedDepartment) ?? null;

  return (
    <div className="space-y-4">
      <VentureCommandBar snapshot={snapshot} view={view} onViewChange={setView} />

      {pollError ? (
        <p className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {pollError} — showing last known state ({snapshot.generatedAt})
        </p>
      ) : (
        <p className="text-[10px] text-zinc-600">Last refreshed {new Date(snapshot.generatedAt).toLocaleTimeString()}</p>
      )}

      <CurrentActivityBar activity={snapshot.currentActivity} overallStatus={snapshot.overallStatus} />

      {view === "hq" ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <HqFloor
              departments={snapshot.departments}
              closedLoopRoute={snapshot.closedLoopRoute}
              onSelectDepartment={setSelectedDepartment}
              selectedDepartment={selectedDepartment}
            />
            <ActivityFeedPanel events={snapshot.activityFeed} />
          </div>
          <DepartmentDetailPanel department={selected} providers={snapshot.providers} costs={snapshot.costs} />
        </div>
      ) : (
        <SystemView snapshot={snapshot} />
      )}
    </div>
  );
}

export { departmentStateClasses, departmentStateLabel };
