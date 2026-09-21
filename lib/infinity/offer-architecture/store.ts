import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { OfferArchitectureContract, OfferArchitectureState, OfferExperimentContract } from "./types";

export const OFFER_ARCHITECTURE_PATH = ".infinity/offer-architecture/state.json" as const;

export function emptyOfferArchitectureState(): OfferArchitectureState {
  return { offers: [], experiments: [] };
}

const memory: OfferArchitectureState = emptyOfferArchitectureState();

function persistEnabled(): boolean {
  if (process.env.VITEST && process.env.INFINITY_OFFER_ARCHITECTURE_PERSIST !== "1") return false;
  return true;
}

export function resetOfferArchitecture(): void {
  Object.assign(memory, emptyOfferArchitectureState());
}

export function inspectOfferArchitecture(): OfferArchitectureState {
  return JSON.parse(JSON.stringify(memory)) as OfferArchitectureState;
}

export function mutateOfferArchitecture(mutator: (state: OfferArchitectureState) => void): OfferArchitectureState {
  mutator(memory);
  if (persistEnabled()) {
    try {
      mkdirSync(dirname(OFFER_ARCHITECTURE_PATH), { recursive: true });
      writeFileSync(OFFER_ARCHITECTURE_PATH, `${JSON.stringify(memory)}\n`);
    } catch {
      // serverless / read-only
    }
  }
  return inspectOfferArchitecture();
}

export function hydrateOfferArchitecture(path = OFFER_ARCHITECTURE_PATH): OfferArchitectureState {
  if (!persistEnabled() || !existsSync(path)) return inspectOfferArchitecture();
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as OfferArchitectureState;
    Object.assign(memory, emptyOfferArchitectureState(), parsed);
  } catch {
    // keep memory
  }
  return inspectOfferArchitecture();
}

export function recordOfferArchitecture(offer: OfferArchitectureContract): OfferArchitectureContract {
  mutateOfferArchitecture((state) => {
    const existing = state.offers.find((row) => row.offer_id === offer.offer_id && row.offer_version === offer.offer_version);
    if (existing) Object.assign(existing, offer);
    else state.offers.push(offer);
  });
  return offer;
}

export function recordOfferExperiment(experiment: OfferExperimentContract): OfferExperimentContract {
  mutateOfferArchitecture((state) => {
    const existing = state.experiments.find((row) => row.experiment_id === experiment.experiment_id);
    if (existing) Object.assign(existing, experiment);
    else state.experiments.push(experiment);
  });
  return experiment;
}

export function offersForVenture(ventureId: string): OfferArchitectureContract[] {
  return inspectOfferArchitecture().offers
    .filter((row) => row.venture_id === ventureId)
    .sort((a, b) => b.offer_version - a.offer_version || b.updated_at.localeCompare(a.updated_at));
}

export function nextOfferVersion(ventureId: string): number {
  return offersForVenture(ventureId).reduce((max, row) => Math.max(max, row.offer_version), 0) + 1;
}
