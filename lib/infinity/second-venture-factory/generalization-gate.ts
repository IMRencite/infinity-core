import { readFileSync } from "node:fs";
import { ASKREVIEW_VENTURE_ID, MULTI_VENTURE_FACTORY_GENERALIZATION_GATE, OCCUPANCYNPV_VENTURE_ID } from "./constants";
import { evaluateSecondVentureHqProjection } from "./hq";
import { listVentureOperationalRecords } from "@/lib/infinity/venture-operating-scale/persist";
import { runPortfolioOperatingCycle } from "@/lib/infinity/venture-operating-scale/operations";
import { evaluateMissionConcurrencyGate } from "@/lib/infinity/venture-operating-scale/concurrency";

const FACTORY_PATHS = [
  "lib/infinity/second-venture-factory/selection.ts",
  "lib/infinity/second-venture-factory/contracts.ts",
  "lib/infinity/second-venture-factory/backend.ts",
  "lib/infinity/askreview-product/kits.ts",
  "lib/infinity/askreview-product/store.ts",
];

export function auditSecondVentureFactoryContamination(readFile = readFileSync): {
  hardCodedOccupancyNpvDependency: string[];
  providerNeutrality: "PASS" | "FAIL";
  fulfillmentNeutrality: "PASS" | "FAIL";
} {
  const hardCodedOccupancyNpvDependency: string[] = [];
  for (const path of FACTORY_PATHS) {
    let source = "";
    try {
      source = readFile(path, "utf8");
    } catch {
      continue;
    }
    if (/occupancynpv_deal_workspaces|occupancynpv_lease_scenarios|CRE_PRIMARY_OFFER|OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS/.test(source)) {
      hardCodedOccupancyNpvDependency.push(path);
    }
  }
  return {
    hardCodedOccupancyNpvDependency,
    providerNeutrality: hardCodedOccupancyNpvDependency.length ? "FAIL" : "PASS",
    fulfillmentNeutrality: hardCodedOccupancyNpvDependency.length ? "FAIL" : "PASS",
  };
}

export function evaluateMultiVentureFactoryGeneralizationGate() {
  const records = listVentureOperationalRecords();
  const occupancy = records.some((row) => row.venture_id === OCCUPANCYNPV_VENTURE_ID);
  const second = records.some((row) => row.venture_id === ASKREVIEW_VENTURE_ID);
  const portfolio = runPortfolioOperatingCycle();
  const concurrency = evaluateMissionConcurrencyGate({
    proposed: "SECOND_VENTURE_BUILD",
    active: ["INBOUND_OBSERVER", "PERFORMANCE_INGESTION"],
  });
  const hq = evaluateSecondVentureHqProjection();
  const contamination = auditSecondVentureFactoryContamination();
  const reasons: string[] = [];
  if (!occupancy) reasons.push("occupancynpv_missing");
  if (!second) reasons.push("second_venture_record_missing");
  if (portfolio.secondDecisionEngineCreated) reasons.push("second_decision_engine_created");
  if (concurrency.outcome !== "ALLOWED") reasons.push("concurrency_blocked");
  if (hq.result !== "PASS") reasons.push("hq_projection_fail");
  reasons.push(...contamination.hardCodedOccupancyNpvDependency.map((path) => `contamination:${path}`));
  return {
    gate: MULTI_VENTURE_FACTORY_GENERALIZATION_GATE,
    result: reasons.length ? "FAIL" as const : "PASS" as const,
    reasons,
    occupancyNpvStillOperating: occupancy,
    secondVentureCanonical: second,
    hqAutoRegistration: hq.result,
    portfolioDiscoversBoth: occupancy && second && portfolio.ventures.length >= 2,
    missionConcurrency: concurrency.outcome,
    ...contamination,
  };
}
