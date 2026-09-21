import Link from "next/link";
import { requireOperatorOrgContext } from "@/lib/infinity/operator-console/require-org-context";
import { listCanonicalHqMissions } from "@/lib/infinity/hq-canonical-projection/load";
import { HQ_ROUTES } from "@/lib/infinity/hq/constants";

export default async function HqMissionsPage() {
  await requireOperatorOrgContext();
  const missions = listCanonicalHqMissions();
  return (
    <article data-hq-missions="true" className="space-y-6 text-zinc-200">
      <header>
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">HQ → Missions</p>
        <h1 className="mt-2 text-[1.75rem] font-semibold text-white">Canonical missions</h1>
        <p className="mt-2 text-[14px] text-zinc-400">
          Founder-visible mission list from canonical mission activity. Runtime scheduling remains at{" "}
          <Link href={HQ_ROUTES.runtime} className="text-zinc-200 underline-offset-2 hover:underline">
            /dashboard/runtime
          </Link>
          .
        </p>
      </header>
      <p className="text-[13px] text-zinc-500">{missions.length} missions</p>
      {missions.length === 0 ? (
        <p className="text-zinc-500">No canonical missions projected yet.</p>
      ) : (
        <ul className="space-y-3">
          {missions.map((row) => (
            <li key={row.missionId} data-mission-row="true" className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] px-4 py-3">
              <Link href={row.href} className="text-zinc-100 underline-offset-2 hover:underline">
                {row.missionType}
              </Link>
              <p className="mt-1 text-[12px] text-zinc-500">
                {row.status} · {row.eventType} · {row.timestamp}
              </p>
              <p className="text-[11px] text-zinc-600">
                {row.missionId} · venture {row.ventureId ?? "UNKNOWN"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
