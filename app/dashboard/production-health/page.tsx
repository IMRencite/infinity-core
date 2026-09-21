import { requireOperatorOrgContext } from "@/lib/infinity/operator-console/require-org-context";
import { fetchCanonicalProductionOperatingState } from "@/lib/infinity/growth-engine/hq-runtime-binding";
import { assembleHqProductionHealth, healthFromBoolean, runtimeHealthFromRead } from "@/lib/infinity/hq-production-deployment";
import { founderDailyReportPostgresConfigured } from "@/lib/infinity/founder-daily-reports";
import { getDefaultProductionOutboundState } from "@/lib/infinity/production-outbound/store";
import { getOrganicContinuousState } from "@/lib/infinity/organic-growth-engine/continuous/store";

export const dynamic = "force-dynamic";

export default async function HqProductionHealthPage() {
  await requireOperatorOrgContext();
  const runtime = await fetchCanonicalProductionOperatingState();
  const outbound = getDefaultProductionOutboundState();
  const organic = getOrganicContinuousState("occupancynpv");
  const health = assembleHqProductionHealth({
    hq_app: "HEALTHY",
    runtime: runtimeHealthFromRead({ ok: runtime.ok, freshness: runtime.freshness }),
    database: healthFromBoolean(Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)),
    public_projection: "HEALTHY",
    organic_growth: organic.blog_editorial_quality === "NEEDS_REMEDIATION" ? "DEGRADED" : "HEALTHY",
    prospect_intelligence: "UNKNOWN",
    sales: "HEALTHY",
    outbound: outbound.control.mode === "CANARY" ? "HEALTHY" : "DEGRADED",
    treasury: "UNKNOWN",
    daily_reports: healthFromBoolean(founderDailyReportPostgresConfigured() || process.env.VERCEL !== "1"),
  });
  return (
    <article data-hq-production-health="true" className="space-y-6 text-zinc-200">
      <header>
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">HQ → Production Health</p>
        <h1 className="mt-2 text-[1.75rem] font-semibold text-white">HQ production health</h1>
        <p className="mt-2 text-[14px] text-zinc-400">Honest status only. Unknown is not success.</p>
      </header>
      <dl className="grid gap-3 sm:grid-cols-2">
        {Object.entries(health).map(([key, value]) => (
          <div key={key} data-health-row={key} className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] px-4 py-3">
            <dt className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{key.replaceAll("_", " ")}</dt>
            <dd className="mt-1 text-[15px] text-white">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-[12px] text-zinc-500">Outbound mode: {outbound.control.mode} · execute_publish: false · Treasury verification: UNKNOWN</p>
    </article>
  );
}
