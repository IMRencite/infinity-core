import { readFileSync } from "node:fs";
import { join } from "node:path";
import { inspectProductImprovementLoop } from "./store";
import { evaluateFounderFeedbackVisibilityGate } from "./suggestions";

function readRepoSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

export function inspectFounderSuggestionsSurface(): {
  suggestions_tab_present: boolean;
  suggestions_after_system_view: boolean;
  suggestions_surface_reachable: boolean;
  occupancynpv_hardcoded: boolean;
} {
  const tabTypes = readRepoSource("lib/infinity/operator-console/details/entity-detail-types.ts");
  const ventureDetail = readRepoSource("lib/infinity/venture-intelligence/entity-detail.ts");
  const hqDetail = readRepoSource("components/dashboard/operator-console/artifacts/hq-output-detail.tsx");
  const surface = readRepoSource("components/dashboard/operator-console/customer-suggestions-tab.tsx");
  const canonical = readRepoSource("components/dashboard/operator-console/canonical-venture-hq-detail.tsx");
  const suggestionsAfterSystem = /"system",\s*"suggestions"/.test(ventureDetail);
  const occupancynpvHardcoded = /OccupancyNPV|7e7e924e-0741-4155-a729-8d529da77ea9/.test(surface);
  const tabPresent =
    tabTypes.includes('"suggestions"')
    && hqDetail.includes('suggestions: "Customer Suggestions"')
    && hqDetail.includes('case "suggestions"')
    && suggestionsAfterSystem;
  const surfaceReachable =
    surface.includes("data-hq-customer-suggestions-surface")
    && surface.includes("No customer suggestions have been recorded yet.")
    && hqDetail.includes("CustomerSuggestionsTab")
    && canonical.includes("CustomerSuggestionsTab")
    && !occupancynpvHardcoded;
  return {
    suggestions_tab_present: tabPresent,
    suggestions_after_system_view: suggestionsAfterSystem,
    suggestions_surface_reachable: surfaceReachable,
    occupancynpv_hardcoded: occupancynpvHardcoded,
  };
}

export function evaluateLiveFounderFeedbackVisibilityGate(ventureId?: string) {
  const state = inspectProductImprovementLoop();
  const count = ventureId
    ? state.feedback.filter((row) => row.venture_id === ventureId).length
    : state.feedback.length;
  const surface = inspectFounderSuggestionsSurface();
  return evaluateFounderFeedbackVisibilityGate({
    canonical_feedback_count: count,
    suggestions_tab_present: surface.suggestions_tab_present && surface.suggestions_after_system_view,
    suggestions_surface_reachable: surface.suggestions_surface_reachable,
  });
}
