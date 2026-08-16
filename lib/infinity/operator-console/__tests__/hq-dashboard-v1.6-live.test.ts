import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { loadPortfolioSummary } from "../portfolio/load-portfolio-summary";

const root = join(dirname(import.meta.url), "../../../..");

function loadEnv() {
  try {
    for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const sep = trimmed.indexOf("=");
      if (sep === -1) continue;
      let val = trimmed.slice(sep + 1);
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[trimmed.slice(0, sep)] = val;
    }
  } catch {
    // optional in CI
  }
}

loadEnv();

const LIVE = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

describe.skipIf(!LIVE)("HQ Dashboard V1.6 — live Supabase portfolio", () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const orgId = "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
  const E2E_ID = "0a696b50-e5d0-42f8-bf87-da1d836e350a";
  const LIVE_BUILT_ID = "240032f1-18c2-4fb4-8b63-60e013f9174c";

  it("loads live portfolio summary for operator org", async () => {
    const admin = createClient(url, key, { auth: { persistSession: false } });
    const summary = await loadPortfolioSummary(admin, orgId);

    expect(summary.excludedVentureIds).toContain(E2E_ID);
    expect(summary.includedVentureIds).toContain(LIVE_BUILT_ID);
    expect(summary.totalVenturesBuilt).toBe(1);

    const built = summary.ventures.filter((v) => !v.excludedFromPortfolio && v.isBuilt);
    expect(built.map((v) => v.ventureAssemblyId)).toEqual([LIVE_BUILT_ID]);

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        profitDisplayMode: summary.profitDisplayMode,
        totalProfitUsd: summary.totalProfitUsd,
        totalVenturesBuilt: summary.totalVenturesBuilt,
        activeVentures: summary.activeVentures,
        topVenture: summary.topVenture,
        qualifyingVentureCount: summary.qualifyingVentureCount,
        built,
      }),
    );
  });
});
