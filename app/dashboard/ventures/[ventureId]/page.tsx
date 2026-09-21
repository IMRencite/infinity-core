import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOperatorOrgContext } from "@/lib/infinity/operator-console/require-org-context";
import { loadHqDashboardContext } from "@/lib/infinity/operator-console/load-hq-dashboard";
import { loadPortfolioSummary } from "@/lib/infinity/operator-console/portfolio/load-portfolio-summary";
import { loadOperatorVentureSnapshot } from "@/lib/infinity/operator-console";
import { isFavc1CycleVentureId } from "@/lib/infinity/operator-console/favc1-cycle/types";
import { CanonicalVentureHqDetail } from "@/components/dashboard/operator-console/canonical-venture-hq-detail";
import { VentureOperatorConsole } from "@/components/dashboard/operator-console/venture-operator-console";
import { presentCanonicalVentureIntelligence } from "@/lib/infinity/venture-intelligence";
import {
  projectCanonicalVentureForHq,
  resolveCanonicalRecordForHqVenture,
} from "@/lib/infinity/venture-operating-scale/hq-venture-registry";

type Props = { params: Promise<{ ventureId: string }> };

export default async function VentureOperatorPage({ params }: Props) {
  const { ventureId } = await params;
  const orgContext = await requireOperatorOrgContext();

  const admin = createAdminClient();
  const [ctx, portfolioSummary] = await Promise.all([
    loadHqDashboardContext(admin, orgContext.organizationId, ventureId),
    loadPortfolioSummary(admin, orgContext.organizationId),
  ]);

  let snapshot = ctx.snapshot;
  if (
    !isFavc1CycleVentureId(ventureId) &&
    snapshot?.venture.ventureAssemblyId !== ventureId
  ) {
    snapshot =
      (await loadOperatorVentureSnapshot(admin, orgContext.organizationId, ventureId)) ?? ctx.snapshot;
  }

  const canonical = resolveCanonicalRecordForHqVenture({
    ventureId,
    name: snapshot?.venture.ventureName ?? null,
  });
  if (
    canonical
    && snapshot
    && snapshot.venture.ventureAssemblyId !== decodeURIComponent(ventureId)
    && snapshot.venture.ventureAssemblyId !== canonical.venture_id
  ) {
    snapshot = null;
  }
  if (!snapshot && !canonical) notFound();
  const projection = canonical ? projectCanonicalVentureForHq(canonical) : null;

  const intelligence = snapshot ? await presentCanonicalVentureIntelligence(admin, snapshot) : null;

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-3 text-zinc-200">
      <nav className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
        <Link href="/dashboard" className="hover:text-zinc-300">HQ</Link>
        <span aria-hidden>·</span>
        <Link href="/dashboard/ventures" className="hover:text-zinc-300">Ventures</Link>
      </nav>
      {projection ? <CanonicalVentureHqDetail ventureId={ventureId} projection={projection} /> : null}
      {snapshot ? (
        <VentureOperatorConsole
          ventureId={ventureId}
          initialSnapshot={snapshot}
          ventureOptions={ctx.ventureList}
          portfolioSummary={portfolioSummary}
          favc1CycleMode={ctx.favc1CycleMode}
          followFavc1Cycle={ctx.followFavc1Cycle}
          intelligenceDetail={intelligence?.detail}
          intelligenceArtifact={intelligence?.artifact}
          intelligenceError={intelligence?.error}
          alwaysShowVentureIntelligence
        />
      ) : null}
    </div>
  );
}
