import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { FounderDailyOperationsReport } from "./types";

export function founderDailyReportDir(cwd = process.cwd()): string {
  return join(cwd, ".infinity", "founder-daily-reports");
}

export function founderDailyReportPath(date: string, cwd = process.cwd()): string {
  return join(founderDailyReportDir(cwd), `${date}.json`);
}

export function readFounderDailyReport(date: string, cwd = process.cwd()): FounderDailyOperationsReport | null {
  const path = founderDailyReportPath(date, cwd);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as FounderDailyOperationsReport;
  } catch {
    return null;
  }
}

export function writeFounderDailyReport(report: FounderDailyOperationsReport, cwd = process.cwd()): string {
  mkdirSync(founderDailyReportDir(cwd), { recursive: true });
  const path = founderDailyReportPath(report.report_date, cwd);
  writeFileSync(path, JSON.stringify(report, null, 2));
  return path;
}

export function listFounderDailyReports(cwd = process.cwd()): FounderDailyOperationsReport[] {
  const dir = founderDailyReportDir(cwd);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => readFounderDailyReport(name.replace(/\.json$/, ""), cwd))
    .filter((row): row is FounderDailyOperationsReport => Boolean(row))
    .sort((left, right) => right.report_date.localeCompare(left.report_date));
}
