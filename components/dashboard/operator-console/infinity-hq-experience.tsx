import { Suspense } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperatorOrgContext } from "@/lib/infinity/operator-console/auth";
import { loadHqDashboardContext, type HqDashboardContext } from "@/lib/infinity/operator-console/load-hq-dashboard";
import { loadPortfolioSummary } from "@/lib/infinity/operator-console/portfolio/load-portfolio-summary";
import { loadOperatorVentureList, loadOperatorVentureSnapshot } from "@/lib/infinity/operator-console";
import type { PortfolioSummary } from "@/lib/infinity/operator-console/portfolio/portfolio-types";
import { emptyTreasuryHqReadModel } from "@/lib/infinity/treasury/hq/read-model";
import { loadTreasuryHqForOrg } from "@/lib/infinity/treasury/hq/load";
import { buildTreasuryHqArtifacts, mergeTreasuryArtifacts } from "@/lib/infinity/treasury/hq/artifacts";
import { loadFounderIdeaHqArtifacts } from "@/lib/infinity/founder-idea-lab/hq/load";
import { mergeRoomArtifacts } from "@/lib/infinity/founder-idea-lab/hq/merge";
import { buildCodingHqArtifacts } from "@/lib/infinity/coding-agents/hq/read-model";
import { emptyZtpHqReadModel, buildZtpHqArtifacts } from "@/lib/infinity/zero-to-production/hq/read-model";
import { codingReadModelFromCapability } from "@/lib/infinity/capability-truth/coding";
import { projectCanonicalCapabilities } from "@/lib/infinity/capability-truth/projection";
import { buildCapabilityReadinessArtifacts, replaceProviderReadinessArtifacts } from "@/lib/infinity/capability-truth/artifacts";
import { HqIdleShell } from "@/components/dashboard/operator-console/hq-idle-shell";
import { VentureOperatorConsole } from "@/components/dashboard/operator-console/venture-operator-console";
import { presentCanonicalVentureIntelligence } from "@/lib/infinity/venture-intelligence";
import { loadHqCanonicalOperatingProjection } from "@/lib/infinity/hq-canonical-projection/load";
import { toHqHomeOperatingSummary } from "@/lib/infinity/hq-information-architecture/contract";

type Props = {
  ventureId?: string | null;
  showPortfolioLink?: boolean;
};

function pendingPortfolioSummary(): PortfolioSummary {
  return {
    generatedAt: new Date().toISOString(),
    totalVenturesBuilt: 0,
    activeVentures: 0,
    operatingVentures: 0,
    validatingVentures: 0,
    totalRevenueUsd: null,
    knownCostsUsd: null,
    totalProfitUsd: null,
    profitDataQuality: "INSUFFICIENT_DATA",
    profitDisplayMode: "unavailable",
    revenueDataQuality: "INSUFFICIENT_DATA",
    costDataQuality: "INSUFFICIENT_DATA",
    topVenture: null,
    topEarners: [],
    rankingMetric: null,
    qualifyingVentureCount: 0,
    ventures: [],
    includedVentureIds: [],
    excludedVentureIds: [],
  };
}

function LiveHqConsole({
  ctx,
  portfolioSummary,
  treasurySummary = null,
  codingSummary = null,
  ztpSummary = null,
  intelligenceDetail = null,
  intelligenceArtifact = null,
  intelligenceError = null,
}: {
  ctx: HqDashboardContext;
  portfolioSummary: PortfolioSummary;
  treasurySummary?: Parameters<typeof VentureOperatorConsole>[0]["treasurySummary"];
  codingSummary?: Parameters<typeof VentureOperatorConsole>[0]["codingSummary"];
  ztpSummary?: Parameters<typeof VentureOperatorConsole>[0]["ztpSummary"];
  intelligenceDetail?: Parameters<typeof VentureOperatorConsole>[0]["intelligenceDetail"];
  intelligenceArtifact?: Parameters<typeof VentureOperatorConsole>[0]["intelligenceArtifact"];
  intelligenceError?: Parameters<typeof VentureOperatorConsole>[0]["intelligenceError"];
}) {
  if (ctx.selectionError || !ctx.defaultVentureId || !ctx.snapshot) return null;
  return (
    <VentureOperatorConsole
      key={ctx.defaultVentureId}
      ventureId={ctx.defaultVentureId}
      initialSnapshot={ctx.snapshot}
      ventureOptions={ctx.ventureList}
      portfolioSummary={portfolioSummary}
      treasurySummary={treasurySummary}
      codingSummary={codingSummary}
      ztpSummary={ztpSummary}
      favc1CycleMode={ctx.favc1CycleMode}
      followFavc1Cycle={false}
      intelligenceDetail={intelligenceDetail}
      intelligenceArtifact={intelligenceArtifact}
      intelligenceError={intelligenceError}
    />
  );
}

export async function InfinityHqExperience({ ventureId, showPortfolioLink = true }: Props) {
  const result = await getOperatorOrgContext();
  if (result.status !== "ok") return null;

  const orgContext = result.context;
  const admin = createAdminClient();
  const ctx = await loadHqDashboardContext(admin, orgContext.organizationId, ventureId ?? null);

  if (ctx.selectionError) {
    const projection = await loadHqCanonicalOperatingProjection(admin, orgContext.organizationId);
    return (
      <div className="space-y-4">
        <div
          role="alert"
          data-hq-venture-selection-error={ctx.selectionError}
          className="rounded border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
        >
          <p className="font-semibold tracking-wide">{ctx.selectionError}</p>
          <p className="mt-1 text-xs text-amber-200/80">
            The clicked venture could not be resolved. HQ did not substitute another venture.
          </p>
        </div>
        <HqIdleShell
          ventures={ctx.ventureList}
          showPortfolioLink={showPortfolioLink}
          operatingSummary={toHqHomeOperatingSummary(projection)}
        />
      </div>
    );
  }

  if (!ctx.defaultVentureId || !ctx.snapshot) {
    const projection = await loadHqCanonicalOperatingProjection(admin, orgContext.organizationId);
    return (
      <HqIdleShell
        ventures={ctx.ventureList}
        showPortfolioLink={showPortfolioLink}
        operatingSummary={toHqHomeOperatingSummary(projection)}
      />
    );
  }

  return (
    <Suspense
      fallback={<LiveHqConsole ctx={ctx} portfolioSummary={pendingPortfolioSummary()} />}
    >
      <InfinityHqExperienceEnriched ctx={ctx} organizationId={orgContext.organizationId} />
    </Suspense>
  );
}

async function InfinityHqExperienceEnriched({
  ctx,
  organizationId,
}: {
  ctx: HqDashboardContext;
  organizationId: string;
}) {
  const admin = createAdminClient();
  const [portfolioSummary, founderArtifacts, loadedTreasury, operatingProjection] = await Promise.all([
    loadPortfolioSummary(admin, organizationId),
    loadFounderIdeaHqArtifacts(admin as never, organizationId),
    loadTreasuryHqForOrg(admin, organizationId),
    loadHqCanonicalOperatingProjection(admin, organizationId),
  ]);

  const intelligence = ctx.snapshot
    ? await presentCanonicalVentureIntelligence(admin, ctx.snapshot)
    : { detail: null, artifact: null, error: null };

  const treasurySummary = loadedTreasury ?? emptyTreasuryHqReadModel(organizationId);
  const treasuryArtifacts = buildTreasuryHqArtifacts(treasurySummary);
  const codingSummary = codingReadModelFromCapability(organizationId);
  const codingArtifacts = buildCodingHqArtifacts(codingSummary);
  const ztpSummary = emptyZtpHqReadModel(organizationId);
  const ztpArtifacts = buildZtpHqArtifacts(ztpSummary);
  const capabilityProjection = projectCanonicalCapabilities();
  const providerArtifacts = replaceProviderReadinessArtifacts(
    {},
    buildCapabilityReadinessArtifacts(capabilityProjection),
  );
  const mergedArtifacts = mergeRoomArtifacts(
    mergeRoomArtifacts(
      mergeRoomArtifacts(
        mergeRoomArtifacts(mergeTreasuryArtifacts(ctx.snapshot?.roomArtifacts, treasuryArtifacts), founderArtifacts),
        codingArtifacts,
      ),
      ztpArtifacts,
    ),
    providerArtifacts,
  );
  const snapshot = ctx.snapshot
    ? {
        ...ctx.snapshot,
        treasury: treasurySummary,
        coding: codingSummary,
        capabilities: capabilityProjection,
        roomArtifacts: mergedArtifacts,
        departments: ctx.snapshot.departments.map((dept) => ({
          ...dept,
          workArtifacts: [
            ...(dept.workArtifacts ?? []),
            ...(treasuryArtifacts[dept.id] ?? []),
            ...(founderArtifacts[dept.id] ?? []),
            ...(codingArtifacts[dept.id] ?? []),
            ...(ztpArtifacts[dept.id] ?? []),
            ...(providerArtifacts[dept.id] ?? []),
          ],
        })),
      }
    : null;

  if (ctx.selectionError || !ctx.defaultVentureId || !snapshot) return null;

  return (
    <VentureOperatorConsole
      key={ctx.defaultVentureId}
      ventureId={ctx.defaultVentureId}
      initialSnapshot={snapshot}
      ventureOptions={ctx.ventureList}
      portfolioSummary={portfolioSummary}
      treasurySummary={treasurySummary}
      codingSummary={codingSummary}
      ztpSummary={ztpSummary}
      favc1CycleMode={ctx.favc1CycleMode}
      followFavc1Cycle={false}
      intelligenceDetail={intelligence.detail}
      intelligenceArtifact={intelligence.artifact}
      intelligenceError={intelligence.error}
      operatingSummary={toHqHomeOperatingSummary(operatingProjection)}
    />
  );
}

export async function loadVentureHqSnapshot(ventureId: string) {
  const result = await getOperatorOrgContext();
  if (result.status !== "ok") return null;

  const orgContext = result.context;
  const admin = createAdminClient();
  const [snapshot, ventureList] = await Promise.all([
    loadOperatorVentureSnapshot(admin, orgContext.organizationId, ventureId),
    loadOperatorVentureList(admin, orgContext.organizationId, 40),
  ]);
  return snapshot ? { snapshot, ventureList, organizationId: orgContext.organizationId } : null;
}
