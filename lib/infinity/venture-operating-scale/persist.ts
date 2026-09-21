import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { durableLocalPersistEnabled } from "@/lib/infinity/hq-production-deployment/ephemeral-fs";
import { VENTURE_OPERATING_SCALE_STATE_FILE } from "./constants";
import { recordContainsRawSecrets } from "./secrets";
import { UNCONFIGURED, type VentureOperationalRecord } from "./types";

function normalizeLegalFields(record: VentureOperationalRecord): VentureOperationalRecord {
  return {
    ...record,
    legal_entity: record.legal_entity ?? UNCONFIGURED,
    company_address: record.company_address ?? UNCONFIGURED,
    jurisdiction: record.jurisdiction ?? UNCONFIGURED,
    support_email: record.support_email ?? UNCONFIGURED,
    privacy_operator: record.privacy_operator ?? UNCONFIGURED,
    terms_operator: record.terms_operator ?? UNCONFIGURED,
    fulfillment_state: record.fulfillment_state ?? UNCONFIGURED,
  };
}

let memory = new Map<string, VentureOperationalRecord>();

function persistEnabled(): boolean {
  if (!durableLocalPersistEnabled()) return false;
  if (process.env.VITEST && process.env.INFINITY_VENTURE_OPERATING_SCALE_PERSIST !== "1") return false;
  return true;
}

export function resetVentureOperatingScaleStore(): void {
  memory = new Map();
}

export function readVentureOperationalRecord(ventureId: string): VentureOperationalRecord | null {
  if (memory.has(ventureId)) return memory.get(ventureId) ?? null;
  if (!persistEnabled() || !existsSync(VENTURE_OPERATING_SCALE_STATE_FILE)) return null;
  try {
    const parsed = JSON.parse(readFileSync(VENTURE_OPERATING_SCALE_STATE_FILE, "utf8")) as {
      records?: VentureOperationalRecord[];
    };
    for (const row of parsed.records ?? []) {
      if (recordContainsRawSecrets(row)) continue;
      memory.set(row.venture_id, normalizeLegalFields(row));
    }
    return memory.get(ventureId) ?? null;
  } catch {
    return null;
  }
}

export function listVentureOperationalRecords(): VentureOperationalRecord[] {
  if (memory.size === 0 && persistEnabled() && existsSync(VENTURE_OPERATING_SCALE_STATE_FILE)) {
    readVentureOperationalRecord("__hydrate__");
  }
  return [...memory.values()];
}

export function writeVentureOperationalRecord(record: VentureOperationalRecord): VentureOperationalRecord {
  if (recordContainsRawSecrets(record)) {
    throw new Error("Secret-like content blocked from VentureOperationalRecord");
  }
  const normalized = normalizeLegalFields(record);
  memory.set(normalized.venture_id, normalized);
  if (persistEnabled()) {
    mkdirSync(dirname(VENTURE_OPERATING_SCALE_STATE_FILE), { recursive: true });
    writeFileSync(
      VENTURE_OPERATING_SCALE_STATE_FILE,
      `${JSON.stringify({ records: listVentureOperationalRecords() }, null, 2)}\n`,
    );
  }
  return normalized;
}
