import type { HqSystemHealth } from "@/lib/infinity/hq/types";
import { formatIsoTime } from "@/lib/infinity/hq/formatters";
import { HqSection } from "./empty-state";
import { StatusBadge } from "./status-badge";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/50 px-4 py-2.5 text-[13px] last:border-0">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-200">{value}</span>
    </div>
  );
}

export function HealthGrid({ health }: { health: HqSystemHealth }) {
  return (
    <HqSection
      id="system-health"
      title="System Health"
      subtitle="Statuses are derived from probes and counts — missing data is not treated as healthy."
    >
      <div>
        <Row label="Supabase" value={<StatusBadge status={health.supabase} />} />
        <Row label="Mission Runtime" value={<StatusBadge status={health.missionRuntime} />} />
        <Row label="AI provider mode" value={health.aiProviderMode} />
        <Row label="Provider configured" value={<StatusBadge status={health.aiProviderConfigured} />} />
        <Row label="Configured model" value={health.aiModel || "No data yet"} />
        <Row label="Queue health" value={<StatusBadge status={health.queueHealth} />} />
        <Row
          label="Failed / retrying jobs"
          value={`${health.failedJobCount ?? "—"} / ${health.retryingJobCount ?? "—"}`}
        />
        <Row
          label="Blocked / locked runtimes"
          value={`${health.blockedRuntimeCount ?? "—"} / ${health.lockedRuntimeCount ?? "—"}`}
        />
        <Row label="Last successful tick" value={formatIsoTime(health.lastSuccessfulTickAt)} />
        <Row label="Last failed tick" value={formatIsoTime(health.lastFailedTickAt)} />
      </div>
    </HqSection>
  );
}
