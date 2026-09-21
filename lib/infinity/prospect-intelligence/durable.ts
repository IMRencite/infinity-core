import { hydrateAcquisitionState, persistAcquisitionState } from "./acquisition/persist";
import { createProspectGraphRepository } from "./persist-postgres";
import { replaceProspectGraph } from "./repository";
import { getDefaultProspectGraph, type ProspectGraph } from "./store";

let hydrated = false;

export function createBoundProspectGraphRepository() {
  return createProspectGraphRepository();
}

export async function hydrateDefaultProspectGraph(): Promise<ProspectGraph> {
  const graph = getDefaultProspectGraph();
  if (hydrated) return graph;
  const loaded = await createProspectGraphRepository().load();
  replaceProspectGraph(graph, loaded);
  await hydrateAcquisitionState(graph);
  hydrated = true;
  return graph;
}

export async function persistProspectGraph(graph: ProspectGraph = getDefaultProspectGraph()): Promise<void> {
  await createProspectGraphRepository().save(graph);
  await persistAcquisitionState(graph);
}

export function resetProspectGraphHydration(): void {
  hydrated = false;
}
