import { FOUNDER_DAILY_REPORT_PRODUCTION_PERSISTENCE_GATE, type DailyNamedGate, type FounderDailyOperationsReport } from "./types";
import { listFounderDailyReports, readFounderDailyReport, writeFounderDailyReport } from "./persist";
import { createPostgresFounderDailyReportStore, founderDailyReportPostgresConfigured } from "./persist-postgres";

function isHqProductionRuntime(): boolean {
  return process.env.VERCEL === "1" || process.env.INFINITY_HQ_SURFACE === "1";
}

export type FounderDailyReportStoreKind = "FILESYSTEM" | "POSTGRES";

export function founderDailyReportStoreKind(env: NodeJS.Dict<string> = process.env): FounderDailyReportStoreKind {
  const forced = (env.FOUNDER_DAILY_REPORT_STORE ?? "").trim().toLowerCase();
  if (forced === "filesystem") return "FILESYSTEM";
  if (forced === "postgres") return "POSTGRES";
  if (env.VERCEL === "1" || env.INFINITY_HQ_SURFACE === "1") return "POSTGRES";
  return "FILESYSTEM";
}

export async function readFounderDailyReportDurable(
  date: string,
  cwd = process.cwd(),
): Promise<FounderDailyOperationsReport | null> {
  if (founderDailyReportStoreKind() === "POSTGRES") {
    const store = createPostgresFounderDailyReportStore();
    const row = await store.read(date);
    if (row || isHqProductionRuntime()) return row;
    return readFounderDailyReport(date, cwd);
  }
  return readFounderDailyReport(date, cwd);
}

export async function writeFounderDailyReportDurable(
  report: FounderDailyOperationsReport,
  cwd = process.cwd(),
): Promise<void> {
  if (founderDailyReportStoreKind() === "POSTGRES") {
    const store = createPostgresFounderDailyReportStore();
    if (!store.configured()) {
      throw new Error("FOUNDER_DAILY_REPORT_PRODUCTION_REQUIRES_POSTGRES");
    }
    await store.write(report);
    return;
  }
  writeFounderDailyReport(report, cwd);
  if (process.env.FOUNDER_DAILY_REPORT_DUAL_WRITE === "1" && founderDailyReportPostgresConfigured()) {
    await createPostgresFounderDailyReportStore().write(report);
  }
}

export async function listFounderDailyReportsDurable(cwd = process.cwd()): Promise<FounderDailyOperationsReport[]> {
  if (founderDailyReportStoreKind() === "POSTGRES") {
    const store = createPostgresFounderDailyReportStore();
    const rows = await store.list();
    if (rows.length || isHqProductionRuntime()) return rows;
    return listFounderDailyReports(cwd);
  }
  return listFounderDailyReports(cwd);
}

export function evaluateFounderDailyReportProductionPersistenceGate(input: {
  storeKind: FounderDailyReportStoreKind;
  productionRuntime: boolean;
  usesLocalFile: boolean;
  todayPersisted: boolean;
  historicalPersisted: boolean;
  redeploySafe: boolean;
  idempotent: boolean;
}): DailyNamedGate {
  const reasons: string[] = [];
  if (input.productionRuntime && input.storeKind !== "POSTGRES") reasons.push("PRODUCTION_USES_FILESYSTEM");
  if (input.productionRuntime && input.usesLocalFile) reasons.push("EPHEMERAL_FILESYSTEM");
  if (!input.todayPersisted) reasons.push("TODAY_LIVE_MISSING");
  if (!input.historicalPersisted) reasons.push("HISTORICAL_MISSING");
  if (!input.redeploySafe) reasons.push("REDEPLOY_NOT_DURABLE");
  if (!input.idempotent) reasons.push("IDEMPOTENCY_FAILED");
  return {
    gate: FOUNDER_DAILY_REPORT_PRODUCTION_PERSISTENCE_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons,
  };
}
