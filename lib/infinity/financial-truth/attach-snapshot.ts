import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import type { HqFinancialTruthView } from "./types";

export function attachFinancialTruthToSnapshot(
  snapshot: OperatorVentureSnapshot,
  view: HqFinancialTruthView,
): OperatorVentureSnapshot {
  const departments = snapshot.departments.map((dept) => {
    if (dept.id !== "strategy_finance") return dept;
    return {
      ...dept,
      detail: {
        ...dept.detail,
        financialTruth: view,
      },
    };
  });
  return {
    ...snapshot,
    financialTruth: view,
    departments,
  };
}
