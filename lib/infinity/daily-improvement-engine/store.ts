import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { DailyImprovementCycle } from "./types";

export function dailyImprovementDir(cwd = process.cwd()): string {
  return join(cwd, ".infinity", "daily-improvement");
}

export function persistDailyImprovementCycle(cycle: DailyImprovementCycle, cwd = process.cwd()): string {
  mkdirSync(dailyImprovementDir(cwd), { recursive: true });
  const path = join(dailyImprovementDir(cwd), `${cycle.report.date}.json`);
  writeFileSync(path, JSON.stringify(cycle, null, 2));
  writeFileSync(join(dailyImprovementDir(cwd), "latest.json"), JSON.stringify(cycle, null, 2));
  return path;
}

export function readLatestDailyImprovementCycle(cwd = process.cwd()): DailyImprovementCycle | null {
  const path = join(dailyImprovementDir(cwd), "latest.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as DailyImprovementCycle;
  } catch {
    return null;
  }
}
