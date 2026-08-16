import { createAdminClient } from "@/lib/supabase/admin";
import { getOperatorOrgContext } from "@/lib/infinity/operator-console/auth";
import { loadHqDashboardContext } from "@/lib/infinity/operator-console/load-hq-dashboard";
import { loadPortfolioSummary } from "@/lib/infinity/operator-console/portfolio/load-portfolio-summary";
import { loadOperatorVentureSnapshot } from "@/lib/infinity/operator-console";
import { HqIdleShell } from "@/components/dashboard/operator-console/hq-idle-shell";
import { VentureOperatorConsole } from "@/components/dashboard/operator-console/venture-operator-console";

type Props = {
  ventureId?: string | null;
  showPortfolioLink?: boolean;
};

export async function InfinityHqExperience({ ventureId, showPortfolioLink = true }: Props) {
  const orgContext = await getOperatorOrgContext();
  if (!orgContext) return null;

  const admin = createAdminClient();
  const [ctx, portfolioSummary] = await Promise.all([
    loadHqDashboardContext(admin, orgContext.organizationId, ventureId ?? null),
    loadPortfolioSummary(admin, orgContext.organizationId),
  ]);

  if (!ctx.defaultVentureId || !ctx.snapshot) {
    return <HqIdleShell ventures={ctx.ventureList} showPortfolioLink={showPortfolioLink} />;
  }

  return (
    <VentureOperatorConsole
      ventureId={ctx.defaultVentureId}
      initialSnapshot={ctx.snapshot}
      ventureOptions={ctx.ventureList}
      portfolioSummary={portfolioSummary}
    />
  );
}

export async function loadVentureHqSnapshot(ventureId: string) {
  const orgContext = await getOperatorOrgContext();
  if (!orgContext) return null;
  const admin = createAdminClient();
  const [snapshot, ventureList] = await Promise.all([
    loadOperatorVentureSnapshot(admin, orgContext.organizationId, ventureId),
    loadHqDashboardContext(admin, orgContext.organizationId).then((c) => c.ventureList),
  ]);
  return snapshot ? { snapshot, ventureList, organizationId: orgContext.organizationId } : null;
}
