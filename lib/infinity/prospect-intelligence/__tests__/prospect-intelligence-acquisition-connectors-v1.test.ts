import { describe, expect, it } from "vitest";
import {
  createSecEdgarConnector,
  parseSecCompanyTickers,
  SEC_COMPANY_TICKERS_URL,
  SEC_EDGAR_FIXTURE,
  SEC_EDGAR_SOURCE_ID,
  SEC_USER_AGENT,
} from "../acquisition/connectors/sec-edgar";
import {
  createInternalInfinityConnector,
  INTERNAL_INFINITY_FIXTURE,
  INTERNAL_INFINITY_SOURCE_ID,
} from "../acquisition/connectors/internal-infinity";
import { defaultAcquisitionRegistry, liveSecEdgarEnabled } from "../acquisition/registry";
import { INTERNAL_INFINITY_POLICY, SEC_EDGAR_POLICY, UNKNOWN_POLICY, policyAllowsContactUse } from "../acquisition/policy";

const LIVE = process.env.PI_ACQUISITION_LIVE_SEC_EDGAR === "1" || process.env.PI_LIVE_SEC_EDGAR === "1";

describe("Prospect Intelligence Acquisition connectors", () => {
  it("registers SEC EDGAR and Internal Infinity against the shared source registry", () => {
    const registry = defaultAcquisitionRegistry({ liveSec: false });
    expect(registry.map((row) => row.connector.id)).toEqual([SEC_EDGAR_SOURCE_ID, INTERNAL_INFINITY_SOURCE_ID]);
    expect(registry.every((row) => row.source.source_id === row.connector.id)).toBe(true);
    expect(registry[0]?.policy.policy_status).toBe("APPROVED");
    expect(registry[1]?.policy.contact_data_use_allowed).toBe(true);
    expect(policyAllowsContactUse(SEC_EDGAR_POLICY)).toBe(false);
    expect(policyAllowsContactUse(UNKNOWN_POLICY)).toBe(false);
    expect(INTERNAL_INFINITY_POLICY.policy_status).toBe("APPROVED");
  });

  it("paginates the SEC fixture without a live network call", async () => {
    const connector = createSecEdgarConnector({ live: false, fixture: SEC_EDGAR_FIXTURE });
    const first = await connector.discover({ now: "2026-09-16T06:00:00.000Z", batch_size: 1 });
    expect(first.records).toHaveLength(1);
    expect(first.records[0]?.raw_fields.ticker).toBe("AAPL");
    expect(first.next_cursor).toBe("1");
    expect(first.exhausted).toBe(false);
    const second = await connector.discover({ now: "2026-09-16T06:00:00.000Z", batch_size: 2, cursor: first.next_cursor });
    expect(second.records).toHaveLength(2);
    expect(second.exhausted).toBe(true);
    expect(second.next_cursor).toBeNull();
  });

  it("detects SEC schema drift from an empty or invalid payload", () => {
    expect(parseSecCompanyTickers({}).schema_changed).toBe(true);
    expect(parseSecCompanyTickers(null).schema_changed).toBe(true);
    expect(parseSecCompanyTickers(SEC_EDGAR_FIXTURE).schema_changed).toBe(false);
    expect(parseSecCompanyTickers(SEC_EDGAR_FIXTURE).rows.length).toBe(3);
  });

  it("surfaces live rate-limit and HTTP failures from the official endpoint", async () => {
    const limited = createSecEdgarConnector({
      live: true,
      fetchImpl: async () => new Response("rate", { status: 429 }),
    });
    await expect(limited.discover({ now: "2026-09-16T06:00:00.000Z", batch_size: 1 })).rejects.toThrow(/RATE_LIMITED/);
    const failed = createSecEdgarConnector({
      live: true,
      fetchImpl: async () => new Response("no", { status: 503 }),
    });
    await expect(failed.discover({ now: "2026-09-16T06:00:00.000Z", batch_size: 1 })).rejects.toThrow(/SEC_EDGAR_HTTP:503/);
  });

  it("keeps the internal catalog deterministic and overlapping Apple Inc. for cross-source resolution", async () => {
    const connector = createInternalInfinityConnector();
    const result = await connector.discover({ now: "2026-09-16T06:00:00.000Z", batch_size: 10 });
    expect(result.records.some((row) => row.source_record_id === "org-harborline")).toBe(true);
    expect(result.records.some((row) => row.raw_fields.email === "alex.rivera@harborline.invalid")).toBe(true);
    expect(result.records.some((row) => row.raw_fields.cik === 320193)).toBe(true);
    expect(INTERNAL_INFINITY_FIXTURE.length).toBeGreaterThanOrEqual(3);
    const health = await connector.health();
    expect(health.status).toBe("HEALTHY");
  });

  it("fails the internal connector independently when asked", async () => {
    const connector = createInternalInfinityConnector({ fail: true });
    await expect(connector.discover({ now: "2026-09-16T06:00:00.000Z", batch_size: 1 })).rejects.toThrow(/INTERNAL_SOURCE_UNAVAILABLE/);
    expect((await connector.health()).status).toBe("DEGRADED");
  });

  it("does not enable live SEC from CI defaults", () => {
    expect(liveSecEdgarEnabled({ NODE_ENV: "test" })).toBe(false);
    expect(liveSecEdgarEnabled({ PI_ACQUISITION_LIVE_SEC_EDGAR: "0", INFINITY_CLOUD_RUNTIME: "1" })).toBe(false);
    expect(liveSecEdgarEnabled({ PI_ACQUISITION_LIVE_SEC_EDGAR: "1" })).toBe(true);
    expect(SEC_COMPANY_TICKERS_URL).toBe("https://www.sec.gov/files/company_tickers.json");
    expect(SEC_USER_AGENT).toContain("InfinityOS");
  });

  it.skipIf(!LIVE)("live SEC EDGAR smoke fetches the official company tickers dataset", async () => {
    const connector = createSecEdgarConnector({ live: true, fetchImpl: fetch });
    const result = await connector.discover({ now: new Date().toISOString(), batch_size: 1 });
    expect(result.schema_changed).not.toBe(true);
    expect(result.records[0]?.source_record_id).toMatch(/^\d+$/);
    expect(result.records[0]?.raw_fields.title).toEqual(expect.any(String));
  });
});

if (!LIVE) {
  describe("SEC EDGAR live smoke", () => {
    it.skip("SKIPPED — LIVE_EXTERNAL_SOURCE_DISABLED", () => {
      expect.fail("LIVE_EXTERNAL_SOURCE_DISABLED");
    });
  });
}
