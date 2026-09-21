import type { FounderExplainability } from "../explainability/types";
import { buildEducatedEconomicsModel, emptyEducatedEconomicsModel } from "./model";
import type { EducatedEconomicsModel } from "./types";

/**
 * Always derive Best Estimate from persisted revenue + benchmark objects.
 * Older packets (attempt 9) never stored `educatedEstimates`.
 */
export function activateEducatedEstimates(explain: Pick<FounderExplainability, "revenueModel" | "benchmarkEconomics">): EducatedEconomicsModel {
  if (!explain.benchmarkEconomics) return emptyEducatedEconomicsModel();
  return buildEducatedEconomicsModel({
    revenueModel: explain.revenueModel,
    benchmark: explain.benchmarkEconomics,
  });
}
