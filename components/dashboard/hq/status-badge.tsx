import type { HealthStatus } from "@/lib/infinity/hq/constants";

const STATUS_STYLES: Record<HealthStatus, string> = {
  healthy: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  degraded: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  blocked: "border-red-500/30 bg-red-500/10 text-red-300",
  offline: "border-red-500/40 bg-red-500/15 text-red-200",
  not_configured: "border-zinc-600/50 bg-zinc-800/40 text-zinc-400",
};

type StatusBadgeProps = {
  status: HealthStatus | string;
  label?: string;
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const key = status in STATUS_STYLES ? (status as HealthStatus) : "not_configured";
  const style = STATUS_STYLES[key];
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${style}`}
    >
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}
