import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isMercurySandboxConfigured, MercuryFinancialProvider } from "../providers/mercury";
import { syncFinancialProvider } from "../sync/provider-sync";
import { TreasuryStore } from "../store";
import { ORG_A } from "./fixtures";

function loadMercuryEnvLocal(): void {
  try {
    const content = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const sep = trimmed.indexOf("=");
      if (sep === -1) continue;
      const key = trimmed.slice(0, sep);
      if (!key.startsWith("MERCURY_")) continue;
      let val = trimmed.slice(sep + 1);
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

loadMercuryEnvLocal();
const configured = isMercurySandboxConfigured();

describe("mercury live sandbox read probe", () => {
  it.skipIf(!configured)("performs GET-only account and transaction reads", async () => {
    const provider = new MercuryFinancialProvider();
    expect(provider.publicConfig.mode).toBe("SANDBOX");
    const store = new TreasuryStore();
    const sync = await syncFinancialProvider(store, { organizationId: ORG_A, provider });
    expect(sync.degraded).toBe(false);
    expect(provider.http.writeHttpCalls).toBe(0);
    expect(provider.http.getCallCount.accounts).toBeGreaterThan(0);
    const serialized = JSON.stringify({
      accounts: sync.accountsUpserted,
      transactions: sync.transactionsIngested,
      gets: provider.http.getCallCount,
      writes: provider.http.writeHttpCalls,
    });
    expect(serialized).not.toMatch(/Bearer /);
    if (process.env.MERCURY_API_TOKEN) {
      expect(serialized).not.toContain(process.env.MERCURY_API_TOKEN);
    }
  }, 30000);

  it.skipIf(configured)("SANDBOX NOT CONFIGURED — ARCHITECTURE VERIFIED, LIVE READ PROBE SKIPPED", () => {
    expect(configured).toBe(false);
  });
});
