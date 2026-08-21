import { buildVentureSystemsContract } from "./build-contract";
import { validateVentureSystems } from "./validation";
import { buildVentureSystemsHqReadModel, explainVentureSystems } from "./hq/read-model";
import { VENTURE_SYSTEMS_WRITE_BOUNDARY } from "./write-boundary";
import { resolvePaymentForVenture } from "./payment-adapter";
import type { VentureSystemsEvidence } from "./types";

export function resolveVentureSystems(evidence: VentureSystemsEvidence) {
  const contract = buildVentureSystemsContract(evidence);
  const gaps = validateVentureSystems(evidence, contract);
  const payment = resolvePaymentForVenture(evidence);
  const hq = buildVentureSystemsHqReadModel(contract);
  return {
    contract,
    gaps,
    payment,
    hq,
    explanation: explainVentureSystems(contract),
    writeBoundary: VENTURE_SYSTEMS_WRITE_BOUNDARY,
  };
}
