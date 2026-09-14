import type { HqFinancialTruthView } from "./types";
import { projectHqFinancialTruth } from "./project";
import { emptyFinancialTruthSnapshot } from "./empty-snapshot";
export { attachFinancialTruthToSnapshot } from "./attach-snapshot";

export function emptyHqFinancialTruthView(): HqFinancialTruthView {
  return projectHqFinancialTruth(emptyFinancialTruthSnapshot());
}
