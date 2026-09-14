import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MERCURY_STRIPE_FINANCIAL_TRUTH_WORK_ID } from "@/lib/infinity/canonical-work";

function source(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("HQ financial truth projection v1", () => {
  it("keeps four financial layers visible and inspectable in HQ", () => {
    const strip = source("components/dashboard/operator-console/hq-financial-truth-strip.tsx");
    const consoleUi = source("components/dashboard/operator-console/venture-operator-console.tsx");
    const liveState = source("app/api/operator-console/hq-live-state/route.ts");
    expect(consoleUi).toContain("HqFinancialTruthStrip");
    expect(consoleUi).toContain("financialTruth");
    expect(strip).toContain("data-hq-financial-truth");
    expect(strip).toContain("LIVE_CASH");
    expect(strip).toContain("PARENT");
    expect(strip).toContain("VENTURE");
    expect(strip).toContain("ACTUAL");
    expect(strip).toContain("MODELED");
    expect(strip).toContain("CAPITAL");
    expect(strip).toContain("settlement_destination");
    expect(strip).toContain("does not have to land in Mercury");
    expect(strip).not.toContain("must equal Mercury");
    expect(strip).toContain("provenance");
    expect(liveState).toContain("x-hq-catch-up");
    expect(liveState).toContain("loadCachedFinancialTruthView");
    expect(liveState).not.toContain("setInterval");
  });

  it("does not put Mercury or Stripe API URLs in HQ client surfaces", () => {
    const consoleUi = source("components/dashboard/operator-console/venture-operator-console.tsx");
    const strip = source("components/dashboard/operator-console/hq-financial-truth-strip.tsx");
    const hook = source("components/dashboard/operator-console/use-hq-live-projection.ts");
    expect(consoleUi).not.toMatch(/api\.stripe\.com|api\.mercury\.com|api-sandbox\.mercury/);
    expect(strip).not.toMatch(/api\.stripe\.com|api\.mercury\.com/);
    expect(hook).not.toMatch(/api\.stripe\.com|api\.mercury\.com/);
  });

  it("keeps OccupancyNPV commercial truths and HQ live-floor locks intact", () => {
    const constants = source("lib/infinity/venture-operating-scale/constants.ts");
    expect(constants).toContain("acct_18h5CjLdvXKx7R7G");
    const seed = source("lib/infinity/canonical-work/seed.ts");
    expect(seed).toContain(MERCURY_STRIPE_FINANCIAL_TRUTH_WORK_ID);
    expect(seed).toContain("work:infinity:live-treasury-control-center-v1");
    expect(seed).toContain("Infinity — Live Treasury Control Center + Bank-Linked Budgeting");
    expect(seed).toContain("Infinity — Mercury + Stripe Financial Truth");
    const workBlock = seed.slice(seed.indexOf("Infinity — Mercury + Stripe Financial Truth"));
    expect(workBlock).not.toContain("growth_department");
    expect(workBlock.slice(0, 1800)).not.toContain("launch_operations");
    expect(workBlock).toContain("strategy_finance");
    expect(workBlock).toContain("SYSTEM_INFRASTRUCTURE");
  });

  it("refreshes finance on catch-up when stale, never on 20s poll", () => {
    const cadence = source("lib/infinity/financial-truth/live-cadence.ts");
    const live = source("lib/infinity/financial-truth/live.ts");
    expect(cadence).toContain("if (input.reason === \"poll\") return false");
    expect(live).toContain("shouldRefreshMercury");
    expect(source("lib/infinity/operator-console/hq-live-policy.ts")).toContain("HQ_MERCURY_SYNC_INTERVAL_MS = 10 * 60 * 1000");
    expect(source("lib/infinity/operator-console/hq-live-policy.ts")).toContain("HQ_STRIPE_DASHBOARD_POLL = \"NONE\"");
    expect(source("lib/infinity/financial-truth/gates.ts")).toContain("HQLiveFinancialRefreshGate");
    expect(source("lib/infinity/financial-truth/live.ts")).toContain("connection: mercury.connection");
    expect(source("app/api/operator-console/hq-live-state/route.ts")).toContain("withFinancialTruthLiveState");
  });
});
