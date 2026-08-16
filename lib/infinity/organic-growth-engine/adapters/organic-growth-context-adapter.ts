/**
 * Organic Growth Context Adapter — normalizes upstream Infinity artifacts into Organic Growth input.
 * Re-exports the adapter layer; domain logic remains in process-venture/run.
 */
export {
  buildUpstreamOrganicInput,
  buildVentureOrganicContextFromBlueprint,
  buildVentureOrganicContextFromHandoff,
} from "./upstream-context";

export { loadUpstreamOrganicInputs } from "../load/load-upstream";

export type { UpstreamOrganicInput, SourceLineage, VentureOrganicContext } from "../types";

/** Repository-native alias for the upstream context adapter. */
export { buildUpstreamOrganicInput as adaptOrganicGrowthContextFromUpstream } from "./upstream-context";
