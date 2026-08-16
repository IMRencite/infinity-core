import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperatorOrgContext } from "@/lib/infinity/operator-console/auth";
import { loadHqDashboardContext } from "@/lib/infinity/operator-console/load-hq-dashboard";
import { loadPortfolioSummary } from "@/lib/infinity/operator-console/portfolio/load-portfolio-summary";
import { loadOperatorVentureSnapshot } from "@/lib/infinity/operator-console";
import { VentureOperatorConsole } from "@/components/dashboard/operator-console/venture-operator-console";

type Props = { params: Promise<{ ventureId: string }> };

export default async function VentureOperatorPage({ params }: Props) {
  const { ventureId } = await params;
  const orgContext = await getOperatorOrgContext();
  if (!orgContext) redirect("/login");

  const admin = createAdminClient();
  const [snapshot, ctx, portfolioSummary] = await Promise.all([
    loadOperatorVentureSnapshot(admin, orgContext.organizationId, ventureId),
    loadHqDashboardContext(admin, orgContext.organizationId, ventureId),
    loadPortfolioSummary(admin, orgContext.organizationId),
  ]);

  if (!snapshot) notFound();

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-3 text-zinc-200">
      <nav className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
        <Link href="/dashboard" className="hover:text-zinc-300">HQ</Link>
        <span aria-hidden>·</span>
        <Link href="/dashboard/ventures" className="hover:text-zinc-300">Ventures</Link>
      </nav>
      <VentureOperatorConsole
        ventureId={ventureId}
        initialSnapshot={snapshot}
        ventureOptions={ctx.ventureList}
        portfolioSummary={portfolioSummary}
      />
    </div>
  );
}
