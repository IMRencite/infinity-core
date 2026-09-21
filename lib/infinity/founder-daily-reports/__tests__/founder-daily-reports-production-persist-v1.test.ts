import { describe, expect, it } from "vitest";
import {
  evaluateFounderDailyReportIdempotencyGate,
  evaluateFounderDailyReportProductionPersistenceGate,
  founderDailyReportStoreKind,
  generateAndPersistFounderDailyReport,
  upsertDailyReport,
} from "../index";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("Founder daily report production persistence", () => {
  it("selects postgres on HQ production runtime", () => {
    expect(founderDailyReportStoreKind({ VERCEL: "1" })).toBe("POSTGRES");
    expect(founderDailyReportStoreKind({ INFINITY_HQ_SURFACE: "1" })).toBe("POSTGRES");
    expect(founderDailyReportStoreKind({})).toBe("FILESYSTEM");
    expect(founderDailyReportStoreKind({ VERCEL: "1", FOUNDER_DAILY_REPORT_STORE: "filesystem" })).toBe("FILESYSTEM");
  });

  it("keeps local filesystem idempotent and does not duplicate", () => {
    const cwd = mkdtempSync(join(tmpdir(), "daily-prod-"));
    const first = generateAndPersistFounderDailyReport({
      now: "2026-09-17T16:00:00.000Z",
      deployments: [{ id: "dpl_hq", target: "hq.imros.io", status: "READY" }],
    }, cwd);
    const second = generateAndPersistFounderDailyReport({
      now: "2026-09-17T16:00:00.000Z",
      deployments: [{ id: "dpl_hq", target: "hq.imros.io", status: "READY" }],
    }, cwd);
    expect(first.report_id).toBe(second.report_id);
    expect(evaluateFounderDailyReportIdempotencyGate(first, upsertDailyReport(first, second)).result).toBe("PASS");
  });

  it("fails production readiness when filesystem is used on Vercel", () => {
    expect(evaluateFounderDailyReportProductionPersistenceGate({
      storeKind: "FILESYSTEM",
      productionRuntime: true,
      usesLocalFile: true,
      todayPersisted: true,
      historicalPersisted: true,
      redeploySafe: false,
      idempotent: true,
    }).reasons).toContain("PRODUCTION_USES_FILESYSTEM");
  });
});
