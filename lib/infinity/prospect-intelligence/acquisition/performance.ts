import type { ProspectGraph } from "../store";
import type { SourceQualityMetrics } from "./types";

export function updateSourceQualityFromOutcomes(graph: ProspectGraph): Record<string, SourceQualityMetrics> {
  const bySource: Record<string, SourceQualityMetrics> = { ...graph.acquisition.source_quality };
  for (const source of graph.sources.values()) {
    const health = graph.acquisition.health[source.source_id];
    const related = graph.outcomes.filter((row) => {
      const entity = graph.entities.get(row.entity_id);
      return entity?.freshness.source_id === source.source_id;
    });
    const replies = related.filter((row) => row.kind === "replied" || row.kind === "positive_reply").length;
    const meetings = related.filter((row) => row.kind === "meeting_booked" || row.kind === "meeting_completed").length;
    const conversions = related.filter((row) => row.kind === "won" || row.kind === "customer").length;
    const matches = graph.matches.filter((row) => graph.entities.get(row.prospect_entity_id)?.freshness.source_id === source.source_id);
    const eligible = graph.eligibility.filter((row) => row.status.endsWith("_allowed") && graph.entities.get(row.entity_id)?.freshness.source_id === source.source_id);
    bySource[source.source_id] = {
      source_id: source.source_id,
      venture_fit_yield: matches.length && health?.records_seen ? Number((matches.length / health.records_seen).toFixed(3)) : 0,
      eligibility_yield: eligible.length && health?.records_seen ? Number((eligible.length / health.records_seen).toFixed(3)) : 0,
      response_rate: related.length ? Number((replies / related.length).toFixed(3)) : 0,
      meeting_rate: related.length ? Number((meetings / related.length).toFixed(3)) : 0,
      conversion_rate: related.length ? Number((conversions / related.length).toFixed(3)) : 0,
      revenue: 0,
      duplicate_rate: health?.duplicate_rate ?? 0,
      stale_data_rate: [...graph.entities.values()].filter((row) => row.freshness.source_id === source.source_id && row.freshness.status === "STALE").length
        / Math.max(1, [...graph.entities.values()].filter((row) => row.freshness.source_id === source.source_id).length),
    };
  }
  graph.acquisition.source_quality = bySource;
  return bySource;
}
