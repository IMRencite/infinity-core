"use client";

import { useRouter } from "next/navigation";
import type { OperatorVentureListItem } from "@/lib/infinity/operator-console/types";
import { groupVenturesForSelector } from "@/lib/infinity/operator-console/resolve-default-venture";
import { inspectionRefFromVentureId } from "@/lib/infinity/operator-console/inspection-ref";
import { buildHqVentureInspectionHref } from "@/lib/infinity/hq-venture-selection/navigate";
import { resolveSelectorValue, selectorOptionId } from "@/lib/infinity/hq-venture-selection/resolve";

type Props = {
  ventures: OperatorVentureListItem[];
  currentVentureId: string | null;
  onVentureChange?: (id: string) => void;
  hideStatus?: boolean;
};

export function VentureSelector({ ventures, currentVentureId, onVentureChange, hideStatus = false }: Props) {
  const router = useRouter();
  const groups = groupVenturesForSelector(ventures);
  const selectedValue = resolveSelectorValue(ventures, currentVentureId);
  const current = ventures.find((v) => selectorOptionId(v) === selectedValue || v.ventureAssemblyId === currentVentureId);

  function handleChange(id: string) {
    if (onVentureChange) {
      onVentureChange(id);
      return;
    }
    const ref = inspectionRefFromVentureId(id);
    if (ref) router.push(buildHqVentureInspectionHref(ref), { scroll: false });
  }

  return (
    <div className="inline-flex items-center gap-2 text-xs">
      <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Venture</span>
      <label className="relative inline-flex items-center">
        <span className="sr-only">Select venture</span>
        <select
          value={selectedValue}
          data-hq-selector-venture={selectedValue}
          onChange={(e) => e.target.value && handleChange(e.target.value)}
          className="max-w-[220px] appearance-none rounded-md border border-zinc-700/50 bg-zinc-950/70 py-1 pl-2 pr-7 text-[11px] text-zinc-200 focus:border-sky-500/40 focus:outline-none focus:ring-1 focus:ring-sky-500/25"
          aria-label="Current venture"
        >
          {!currentVentureId ? <option value="">Select…</option> : null}
          {groups.active.length ? (
            <optgroup label="Active">
              {groups.active.map((v) => (
                <option key={selectorOptionId(v)} value={selectorOptionId(v)}>{v.ventureName}</option>
              ))}
            </optgroup>
          ) : null}
          {groups.recent.length ? (
            <optgroup label="Recent">
              {groups.recent.map((v) => (
                <option key={selectorOptionId(v)} value={selectorOptionId(v)}>{v.ventureName}</option>
              ))}
            </optgroup>
          ) : null}
          {groups.paused.length ? (
            <optgroup label="Paused">
              {groups.paused.map((v) => (
                <option key={selectorOptionId(v)} value={selectorOptionId(v)}>{v.ventureName}</option>
              ))}
            </optgroup>
          ) : null}
          {groups.completed.length ? (
            <optgroup label="Completed">
              {groups.completed.map((v) => (
                <option key={selectorOptionId(v)} value={selectorOptionId(v)}>{v.ventureName}</option>
              ))}
            </optgroup>
          ) : null}
        </select>
        <span className="pointer-events-none absolute right-2 text-[10px] text-zinc-500" aria-hidden>▾</span>
      </label>
      {current && !hideStatus ? (
        <span className="hidden truncate text-[10px] text-zinc-600 sm:inline">{current.status}</span>
      ) : null}
    </div>
  );
}
