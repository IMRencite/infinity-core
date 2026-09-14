import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { emptyFinancialTruthSnapshot } from "./empty-snapshot";
import type { FinancialTruthSnapshot } from "./types";

export { emptyFinancialTruthSnapshot };

export const FINANCIAL_TRUTH_CACHE_PATH = ".infinity/financial-truth/snapshot.json" as const;

let memory: FinancialTruthSnapshot | null = null;

function persistEnabled(): boolean {
  if (process.env.VITEST) return false;
  return true;
}

export function readFinancialTruthCache(): FinancialTruthSnapshot | null {
  if (memory) return JSON.parse(JSON.stringify(memory)) as FinancialTruthSnapshot;
  if (!persistEnabled() || !existsSync(FINANCIAL_TRUTH_CACHE_PATH)) return null;
  try {
    memory = JSON.parse(readFileSync(FINANCIAL_TRUTH_CACHE_PATH, "utf8")) as FinancialTruthSnapshot;
    return JSON.parse(JSON.stringify(memory)) as FinancialTruthSnapshot;
  } catch {
    return null;
  }
}

export function writeFinancialTruthCache(snapshot: FinancialTruthSnapshot): FinancialTruthSnapshot {
  memory = JSON.parse(JSON.stringify(snapshot)) as FinancialTruthSnapshot;
  if (persistEnabled()) {
    try {
      mkdirSync(dirname(FINANCIAL_TRUTH_CACHE_PATH), { recursive: true });
      writeFileSync(FINANCIAL_TRUTH_CACHE_PATH, `${JSON.stringify(memory)}\n`);
    } catch {
      /* read-only */
    }
  }
  return readFinancialTruthCache() ?? snapshot;
}

export function resetFinancialTruthCache(): void {
  memory = null;
}

export function cacheAgeMs(snapshot: FinancialTruthSnapshot | null, nowMs = Date.now()): number | null {
  if (!snapshot?.captured_at) return null;
  const ts = Date.parse(snapshot.captured_at);
  if (!Number.isFinite(ts)) return null;
  return nowMs - ts;
}
