"use client";

import type { DepartmentId, OperatorDepartmentSnapshot } from "@/lib/infinity/operator-console/types";
import { departmentStateClasses, departmentStateLabel } from "@/lib/infinity/operator-console/status-derivation";
import { DEPARTMENTS } from "@/lib/infinity/operator-console/department-registry";

type Props = {
  departments: OperatorDepartmentSnapshot[];
  closedLoopRoute: {
    active: boolean;
    toDepartmentId: DepartmentId | null;
    decisionType: string | null;
  };
  selectedDepartment: DepartmentId | null;
  onSelectDepartment: (id: DepartmentId) => void;
};

const GRID_LAYOUT: Record<DepartmentId, string> = {
  opportunity_lab: "md:col-start-1 md:row-start-1",
  research_department: "md:col-start-2 md:row-start-1",
  strategy_finance: "md:col-start-1 md:row-start-2",
  company_operations: "md:col-start-2 md:row-start-2",
  systems_architect: "md:col-start-1 md:row-start-3",
  growth_department: "md:col-start-2 md:row-start-3",
  creative_studio: "md:col-start-1 md:row-start-4",
  product_lab: "md:col-start-2 md:row-start-4",
  quality_control: "md:col-start-1 md:row-start-5",
  launch_operations: "md:col-start-2 md:row-start-5",
  intelligence_center: "md:col-start-1 md:row-start-6",
  executive_office: "md:col-span-2 md:row-start-7",
};

export function HqFloor({ departments, closedLoopRoute, selectedDepartment, onSelectDepartment }: Props) {
  const deptMap = new Map(departments.map((d) => [d.id, d]));

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-[#080808] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-zinc-200">INFINITY HQ — Operations Floor</h2>
          <p className="text-[11px] text-zinc-500">Departments reflect persisted engine state — not simulation</p>
        </div>
        {closedLoopRoute.active && closedLoopRoute.toDepartmentId ? (
          <p className="rounded border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-[10px] text-violet-200">
            Loop: Intelligence → Executive → {closedLoopRoute.toDepartmentId.replace(/_/g, " ")}
            {closedLoopRoute.decisionType ? ` (${closedLoopRoute.decisionType})` : ""}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {DEPARTMENTS.map((def) => {
          const dept = deptMap.get(def.id);
          const state = dept?.state ?? "NOT_STARTED";
          const isSelected = selectedDepartment === def.id;
          const isTarget = dept?.isNextMissionTarget;
          return (
            <button
              key={def.id}
              type="button"
              onClick={() => onSelectDepartment(def.id)}
              className={`relative rounded-lg border p-3 text-left transition ${departmentStateClasses(state)} ${GRID_LAYOUT[def.id]} ${isSelected ? "ring-2 ring-sky-400/50" : ""} ${isTarget ? "outline outline-1 outline-violet-400/40" : ""}`}
            >
              {state === "RUNNING" ? (
                <span className="absolute right-2 top-2 h-2 w-2 animate-pulse rounded-full bg-sky-400" aria-hidden />
              ) : null}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">{def.shortLabel}</p>
                  <p className="text-sm font-medium text-zinc-100">{def.label}</p>
                </div>
                <span className="rounded border border-current/20 px-1.5 py-0.5 text-[9px] font-medium uppercase">
                  {departmentStateLabel(state)}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-[11px] text-zinc-400">
                {dept?.summary ?? dept?.currentTask ?? (dept?.recordCount ? `${dept.recordCount} record(s)` : "No records")}
              </p>
              {(dept?.provider || dept?.model) && (
                <p className="mt-1 text-[10px] text-zinc-500">
                  {[dept.provider, dept.model].filter(Boolean).join(" / ")}
                </p>
              )}
              {dept?.costKnown && dept.costUsd != null ? (
                <p className="mt-1 text-[10px] text-emerald-300/80">${dept.costUsd.toFixed(4)}</p>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
