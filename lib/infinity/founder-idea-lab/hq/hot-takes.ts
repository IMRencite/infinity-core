import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";

export function founderHotTakesFromMetadata(metadata: HqWorkArtifact["metadata"]): string[] {
  const problem = String(metadata.problem ?? metadata.thesis ?? "the described workflow");
  const customer = String(metadata.customer ?? "UNKNOWN");
  const customerSource = String(metadata.customerSource ?? "INFINITY_INFERRED");
  const readiness = String(metadata.buildReadiness ?? "UNKNOWN");
  const fatal = metadata.fatalAssumptionRisk;
  const revenue = metadata.expectedRoi;
  return [
    `[INFERENCE] Best part of the idea: ${problem}`,
    `[FACT] Weakest assumption: ${metadata.weakestAssumption ?? "Demand and willingness to pay are unproven."}`,
    `[INFERENCE] Fastest way to revenue: ${revenue != null ? "If acquisition assumptions hold, early subscription revenue is the shortest path." : "UNKNOWN until researched"}`,
    `[FACT] Most dangerous risk: fatal assumption risk ${fatal ?? "UNKNOWN"}`,
    `[INFERENCE] Best initial customer: ${customer} (${customerSource})`,
    `[INFERENCE] Cheapest validation: ${metadata.cheapestValidation ?? "UNKNOWN"}`,
    `[FACT] Why Infinity would ${readiness === "BUILD" ? "" : "not "}build it now: recommendation is ${readiness}.`,
  ];
}
