import { createAdminClient } from "@/lib/supabase/admin";
import { buildFavc1CycleSnapshot } from "@/lib/infinity/operator-console/favc1-cycle/build-cycle-snapshot";
import { resolveLatestFavc1Cycle } from "@/lib/infinity/operator-console/favc1-cycle/resolve-active-cycle";
import { VentureOperatorConsole } from "@/components/dashboard/operator-console/venture-operator-console";
import {
  emptyHqHarnessPortfolio,
  FOUNDER_HQ_INSPECTION_CYCLE_KEY,
  FOUNDER_HQ_INSPECTION_VENTURE_ID,
  idleFavc1HarnessSnapshot,
} from "@/lib/infinity/operator-console/hq-live-projection-harness";
import { LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";

export const dynamic = "force-dynamic";

export default async function HqLiveProjectionHarnessPage() {
  if (process.env.NODE_ENV === "production") {
    return (
      <main className="mx-auto max-w-3xl p-8 text-zinc-300">
        <h1 className="text-lg font-medium text-white">HQ live projection harness unavailable</h1>
        <p className="mt-2 text-sm">This development preview is disabled in production builds.</p>
      </main>
    );
  }

  let snapshot: OperatorVentureSnapshot = idleFavc1HarnessSnapshot();
  try {
    const admin = createAdminClient();
    const cycle = await resolveLatestFavc1Cycle(admin, LIVE_ORG, FOUNDER_HQ_INSPECTION_CYCLE_KEY);
    if (cycle) {
      snapshot = (await buildFavc1CycleSnapshot(admin, cycle)).snapshot;
    }
  } catch {
    snapshot = idleFavc1HarnessSnapshot();
  }

  return (
    <main className="mx-auto w-full max-w-[100rem] space-y-3 p-4 text-zinc-200" data-hq-live-projection-harness="true">
      <h1 className="text-lg font-medium text-white">HQ live projection harness</h1>
      <VentureOperatorConsole
        ventureId={FOUNDER_HQ_INSPECTION_VENTURE_ID}
        initialSnapshot={snapshot}
        portfolioSummary={emptyHqHarnessPortfolio()}
        favc1CycleMode
        followFavc1Cycle={false}
      />
    </main>
  );
}
