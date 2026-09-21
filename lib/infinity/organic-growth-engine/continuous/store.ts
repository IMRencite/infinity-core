import { buildVentureTopicGraph } from "./graph";
import type { OrganicContinuousState } from "./types";

const states = new Map<string, OrganicContinuousState>();

export function emptyOrganicContinuousState(venture_id: string): OrganicContinuousState {
  return {
    venture_id,
    graph: buildVentureTopicGraph({ venture_id }),
    questions: [],
    opportunities: [],
    demand_signals: [],
    queue: [],
    assets: [],
    sales_assets: [],
    published_today: 0,
    refreshed_today: 0,
    rejected_quality: 0,
    rejected_duplicate: 0,
    last_tick_at: null,
    remediation_queue: [],
    blog_readiness: "BLOG_MISSING",
    schema_remediation_queue: [],
    schema_readiness: "SCHEMA_MISSING",
    blog_editorial_quality: "UNKNOWN",
    blog_remediation_queue: [],
  };
}

export function getOrganicContinuousState(venture_id: string): OrganicContinuousState {
  const current = states.get(venture_id);
  if (current) return current;
  const created = emptyOrganicContinuousState(venture_id);
  states.set(venture_id, created);
  return created;
}

export function replaceOrganicContinuousState(venture_id: string, next: OrganicContinuousState): OrganicContinuousState {
  states.set(venture_id, next);
  return next;
}

export function resetOrganicContinuousStates(): void {
  states.clear();
}

export function listOrganicContinuousStates(): OrganicContinuousState[] {
  return [...states.values()];
}
