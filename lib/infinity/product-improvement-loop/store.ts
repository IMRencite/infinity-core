import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { ProductImprovementState } from "./types";

export const PRODUCT_IMPROVEMENT_PATH = ".infinity/product-improvement-loop/state.json" as const;

export function emptyProductImprovementState(): ProductImprovementState {
  return { feedback: [], opportunities: [], outcomes: [], learnings: [], incidents: [] };
}

const memory: ProductImprovementState = emptyProductImprovementState();

function persistEnabled(): boolean {
  if (process.env.VITEST && process.env.INFINITY_PRODUCT_IMPROVEMENT_PERSIST !== "1") return false;
  return true;
}

export function resetProductImprovementLoop(): void {
  Object.assign(memory, emptyProductImprovementState());
}

export function inspectProductImprovementLoop(): ProductImprovementState {
  return JSON.parse(JSON.stringify(memory)) as ProductImprovementState;
}

export function mutateProductImprovementLoop(mutator: (state: ProductImprovementState) => void): ProductImprovementState {
  mutator(memory);
  if (persistEnabled()) {
    try {
      mkdirSync(dirname(PRODUCT_IMPROVEMENT_PATH), { recursive: true });
      writeFileSync(PRODUCT_IMPROVEMENT_PATH, `${JSON.stringify(memory)}\n`);
    } catch {
      // serverless / read-only
    }
  }
  return inspectProductImprovementLoop();
}

export function hydrateProductImprovementLoop(path = PRODUCT_IMPROVEMENT_PATH): ProductImprovementState {
  if (!persistEnabled() || !existsSync(path)) return inspectProductImprovementLoop();
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as ProductImprovementState;
    Object.assign(memory, emptyProductImprovementState(), parsed);
  } catch {
    // keep memory
  }
  return inspectProductImprovementLoop();
}
