import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { durableLocalPersistEnabled } from "@/lib/infinity/hq-production-deployment/ephemeral-fs";
import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { listVentureOperationalRecords } from "@/lib/infinity/venture-operating-scale/persist";
import { buildAskReviewEconomics } from "./askreview";
import { buildOccupancynpvEconomics } from "./occupancynpv";
import { buildResearchRequiredEconomics } from "./research-required";
import type { EconomicsStoreFile, VentureEconomicsIntelligenceRecord } from "./types";

export const VENTURE_ECONOMICS_STORE_FILE =
  ".infinity/venture-operating-scale/venture-economics-intelligence.json" as const;

let memory: EconomicsStoreFile | null = null;

function persistEnabled(): boolean {
  if (!durableLocalPersistEnabled()) return false;
  if (process.env.VITEST && process.env.INFINITY_VENTURE_ECONOMICS_PERSIST !== "1") return false;
  return true;
}

function emptyStore(): EconomicsStoreFile {
  return { qcVersion: "GLOBAL_VENTURE_ECONOMICS_ASSURANCE_V1", current: [], history: [] };
}

function loadStore(): EconomicsStoreFile {
  if (memory) return memory;
  if (persistEnabled() && existsSync(VENTURE_ECONOMICS_STORE_FILE)) {
    try {
      memory = JSON.parse(readFileSync(VENTURE_ECONOMICS_STORE_FILE, "utf8")) as EconomicsStoreFile;
      return memory;
    } catch {
      memory = emptyStore();
      return memory;
    }
  }
  memory = emptyStore();
  return memory;
}

function saveStore(store: EconomicsStoreFile): void {
  memory = store;
  if (!persistEnabled()) return;
  mkdirSync(dirname(VENTURE_ECONOMICS_STORE_FILE), { recursive: true });
  writeFileSync(VENTURE_ECONOMICS_STORE_FILE, `${JSON.stringify(store, null, 2)}\n`);
}

export function resetVentureEconomicsStore(): void {
  memory = emptyStore();
}

export function readVentureEconomics(ventureId: string): VentureEconomicsIntelligenceRecord | null {
  const store = loadStore();
  const exact = store.current.find((row) => row.venture_id === ventureId);
  if (exact) return exact;
  const raw = ventureId.startsWith("candidate:") ? ventureId.slice("candidate:".length) : ventureId;
  const prefixed = ventureId.startsWith("candidate:") ? ventureId : `candidate:${ventureId}`;
  return (
    store.current.find(
      (row) =>
        row.venture_id === raw ||
        row.venture_id === prefixed ||
        row.opportunity_id === raw ||
        row.opportunity_id === ventureId,
    ) ?? null
  );
}

export function listVentureEconomics(): VentureEconomicsIntelligenceRecord[] {
  return [...loadStore().current];
}

export function countEconomicsHistory(ventureId: string): number {
  return loadStore().history.filter((row) => row.venture_id === ventureId).length;
}

export function persistVentureEconomics(record: VentureEconomicsIntelligenceRecord): VentureEconomicsIntelligenceRecord {
  const store = loadStore();
  const prior = store.current.find((row) => row.venture_id === record.venture_id);
  if (prior) {
    store.history = [...store.history, prior];
    store.current = store.current.map((row) => (row.venture_id === record.venture_id ? record : row));
  } else {
    store.current = [...store.current, record];
  }
  saveStore(store);
  return record;
}

export function ensureVentureEconomics(ventureId: string): VentureEconomicsIntelligenceRecord {
  const existing = readVentureEconomics(ventureId);
  if (existing?.research_ran) return existing;
  if (ventureId === CRE_VENTURE_ID) return persistVentureEconomics(buildOccupancynpvEconomics());
  if (ventureId === ASKREVIEW_VENTURE_ID) return persistVentureEconomics(buildAskReviewEconomics());
  const operational = listVentureOperationalRecords().find((row) => row.venture_id === ventureId);
  return persistVentureEconomics(
    buildResearchRequiredEconomics({
      venture_id: ventureId,
      venture_name: operational?.venture_name ?? ventureId,
      opportunity_id: ventureId.replace(/^candidate:/, ""),
    }),
  );
}

export function ensureAllCanonicalVentureEconomics(): VentureEconomicsIntelligenceRecord[] {
  const ids = new Set<string>([CRE_VENTURE_ID, ASKREVIEW_VENTURE_ID]);
  for (const record of listVentureOperationalRecords()) ids.add(record.venture_id);
  return [...ids].map((id) => ensureVentureEconomics(id));
}

export function enqueueEconomicsOnPromotion(input: {
  venture_id: string;
  opportunity_id?: string | null;
}): VentureEconomicsIntelligenceRecord {
  void input.opportunity_id;
  return ensureVentureEconomics(input.venture_id);
}
