import Link from "next/link";
import type { HqAlert } from "@/lib/infinity/hq/types";
import { formatIsoTime } from "@/lib/infinity/hq/formatters";
import { EmptyState, HqSection } from "./empty-state";

const SEVERITY_CLASS: Record<HqAlert["severity"], string> = {
  critical: "text-red-300",
  warning: "text-amber-200",
  info: "text-sky-300",
};

export function AlertsPanel({ alerts }: { alerts: HqAlert[] }) {
  return (
    <HqSection
      id="alerts-blockers"
      title="Alerts and Blockers"
      subtitle="Prioritized from health probes and failure records only."
    >
      {alerts.length === 0 ? (
        <EmptyState message="No active alerts from current system state." />
      ) : (
        <ul className="divide-y divide-zinc-800/60">
          {alerts.map((alert) => (
            <li key={alert.id} className="px-4 py-3 text-[12px]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`font-medium uppercase ${SEVERITY_CLASS[alert.severity]}`}>
                  {alert.severity}
                </span>
                <span className="text-zinc-600">{formatIsoTime(alert.occurredAt)}</span>
              </div>
              <p className="mt-1 text-zinc-200">
                {alert.source}: {alert.reason}
              </p>
              <p className="mt-1 text-zinc-500">
                Related:{" "}
                {alert.relatedHref ? (
                  <Link href={alert.relatedHref} className="text-sky-400 hover:underline">
                    {alert.relatedLabel}
                  </Link>
                ) : (
                  alert.relatedLabel
                )}
              </p>
              <p className="mt-1 text-zinc-500">Action: {alert.recommendedAction}</p>
            </li>
          ))}
        </ul>
      )}
    </HqSection>
  );
}
