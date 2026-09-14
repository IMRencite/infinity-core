import "server-only";

import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import { emptyFinancialTruthSnapshot } from "./empty-snapshot";
import { attachFinancialTruthToSnapshot } from "./hq";
import { loadCachedFinancialTruthView, loadFinancialTruthView } from "./live";
import { projectHqFinancialTruth } from "./project";

export async function withHqFinancialTruth(
  snapshot: OperatorVentureSnapshot | null,
  reason: "poll" | "catch-up" | "ssr" | "event" = "ssr",
): Promise<OperatorVentureSnapshot | null> {
  if (!snapshot) return snapshot;
  if (process.env.VITEST && process.env.INFINITY_FINANCIAL_TRUTH_LIVE !== "1") {
    return attachFinancialTruthToSnapshot(snapshot, projectHqFinancialTruth(emptyFinancialTruthSnapshot()));
  }
  const view = reason === "poll" ? loadCachedFinancialTruthView() : await loadFinancialTruthView(reason);
  return attachFinancialTruthToSnapshot(snapshot, view);
}
