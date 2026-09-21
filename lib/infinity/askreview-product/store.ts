import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { ASKREVIEW_JSON_STORE_CLASSIFICATION, type AskReviewStore } from "./types";

export const ASKREVIEW_STORE_PATH = ".infinity/askreview/product-store.json" as const;
export { ASKREVIEW_JSON_STORE_CLASSIFICATION };

let memory: AskReviewStore | null = null;

function emptyStore(): AskReviewStore {
  return { accounts: [], locations: [], kits: [], sessions: [], events: [] };
}

function persistEnabled(): boolean {
  if (process.env.VITEST && process.env.INFINITY_ASKREVIEW_PERSIST !== "1") return false;
  return true;
}

export function resetAskReviewStore(): void {
  memory = emptyStore();
}

export function getAskReviewStore(): AskReviewStore {
  if (memory) return memory;
  if (persistEnabled() && existsSync(ASKREVIEW_STORE_PATH)) {
    try {
      const parsed = JSON.parse(readFileSync(ASKREVIEW_STORE_PATH, "utf8")) as Partial<AskReviewStore>;
      memory = {
        accounts: parsed.accounts ?? [],
        locations: parsed.locations ?? [],
        kits: parsed.kits ?? [],
        sessions: parsed.sessions ?? [],
        events: parsed.events ?? [],
      };
      return memory;
    } catch {
      memory = emptyStore();
      return memory;
    }
  }
  memory = emptyStore();
  return memory;
}

export function saveAskReviewStore(store: AskReviewStore): AskReviewStore {
  memory = store;
  if (persistEnabled()) {
    mkdirSync(dirname(ASKREVIEW_STORE_PATH), { recursive: true });
    writeFileSync(ASKREVIEW_STORE_PATH, `${JSON.stringify(store, null, 2)}\n`);
  }
  return store;
}

export function classifyAskReviewJsonStore(): typeof ASKREVIEW_JSON_STORE_CLASSIFICATION {
  return ASKREVIEW_JSON_STORE_CLASSIFICATION;
}
