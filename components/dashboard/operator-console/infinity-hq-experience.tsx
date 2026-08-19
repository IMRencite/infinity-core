import { createAdminClient } from "@/lib/supabase/admin";
import { getOperatorOrgContext } from "@/lib/infinity/operator-console/auth";
import { loadHqDashboardContext } from "@/lib/infinity/operator-console/load-hq-dashboard";
import { loadPortfolioSummary } from "@/lib/infinity/operator-console/portfolio/load-portfolio-summary";
import { loadOperatorVentureSnapshot } from "@/lib/infinity/operator-console";
import { emptyTreasuryHqReadModel } from "@/lib/infinity/treasury/hq/read-model";
import { loadTreasuryHqForOrg } from "@/lib/infinity/treasury/hq/load";
import { buildTreasuryHqArtifacts, mergeTreasuryArtifacts } from "@/lib/infinity/treasury/hq/artifacts";
import { loadFounderIdeaHqArtifacts } from "@/lib/infinity/founder-idea-lab/hq/load";
import { mergeRoomArtifacts } from "@/lib/infinity/founder-idea-lab/hq/merge";
import { emptyCodingHqReadModel, buildCodingHqArtifacts } from "@/lib/infinity/coding-agents/hq/read-model";
import { emptyZtpHqReadModel, buildZtpHqArtifacts } from "@/lib/infinity/zero-to-production/hq/read-model";
import { HqIdleShell } from "@/components/dashboard/operator-console/hq-idle-shell";
import { VentureOperatorConsole } from "@/components/dashboard/operator-console/venture-operator-console";

type Props = {
  ventureId?: string | null;
  showPortfolioLink?: boolean;
};

export async function InfinityHqExperience({ ventureId, showPortfolioLink = true }: Props) {
  const result = await getOperatorOrgContext();
  if (!result) return null;

  const orgContext = result;

  const admin = createAdminClient();
  const [ctx, portfolioSummary, founderArtifacts, loadedTreasury] = await Promise.all([
    loadHqDashboardContext(admin, orgContext.organizationId, ventureId ?? null),
    loadPortfolioSummary(admin, orgContext.organizationId),
    loadFounderIdeaHqArtifacts(admin as never, orgContext.organizationId),
    loadTreasuryHqForOrg(admin, orgContext.organizationId),
  ]);

  if (!ctx.defaultVentureId || !ctx.snapshot) {
    return <HqIdleShell ventures={ctx.ventureList} showPortfolioLink={showPortfolioLink} />;
  }

  const treasurySummary = loadedTreasury ?? emptyTreasuryHqReadModel(orgContext.organizationId);
  const treasuryArtifacts = buildTreasuryHqArtifacts(treasurySummary);
  const codingSummary = emptyCodingHqReadModel(orgContext.organizationId);
  const codingArtifacts = buildCodingHqArtifacts(codingSummary);
  const ztpSummary = emptyZtpHqReadModel(orgContext.organizationId);
  const ztpArtifacts = buildZtpHqArtifacts(ztpSummary);
  const mergedArtifacts = mergeRoomArtifacts(
    mergeRoomArtifacts(
      mergeRoomArtifacts(mergeTreasuryArtifacts(ctx.snapshot.roomArtifacts, treasuryArtifacts), founderArtifacts),
      codingArtifacts,
    ),
    ztpArtifacts,
  );
  const snapshot = {
    ...ctx.snapshot,
    treasury: treasurySummary,
    roomArtifacts: mergedArtifacts,
    departments: ctx.snapshot.departments.map((dept) => ({
      ...dept,
      workArtifacts: [
        ...(dept.workArtifacts ?? []),
        ...(treasuryArtifacts[dept.id] ?? []),
        ...(founderArtifacts[dept.id] ?? []),
        ...(codingArtifacts[dept.id] ?? []),
        ...(ztpArtifacts[dept.id] ?? []),
      ],
    })),
  };

  return (
    <VentureOperatorConsole
      ventureId={ctx.defaultVentureId}
      initialSnapshot={snapshot}
      ventureOptions={ctx.ventureList}
      portfolioSummary={portfolioSummary}
      treasurySummary={treasurySummary}
      codingSummary={codingSummary}
      ztpSummary={ztpSummary}
      favc1CycleMode={ctx.favc1CycleMode}
      followFavc1Cycle={ctx.followFavc1Cycle}
    />
  );
}

export async function loadVentureHqSnapshot(ventureId: string) {
  const result = await getOperatorOrgContext();
  if (!result) return null;

  const orgContext = result;
  const admin = createAdminClient();
  const [snapshot, ventureList] = await Promise.all([
    loadOperatorVentureSnapshot(admin, orgContext.organizationId, ventureId),
    loadHqDashboardContext(admin, orgContext.organizationId).then((c) => c.ventureList),
  ]);
  return snapshot ? { snapshot, ventureList, organizationId: orgContext.organizationId } : null;
}
