import type { ProviderCapabilityStatus } from "@/lib/infinity/commercialization/probes/status";
import type { ProviderEnvironment } from "@/lib/infinity/commercialization/probes/inventory";
import { selectPaymentArchitecture } from "./selector";
import { validatePaymentArchitecture } from "./validation";
import { buildPaymentArchitectureContract } from "./build-contract";
import { resolveConnectWriteReadiness } from "./readiness";
import { buildPaymentArchitectureHqReadModel, explainPaymentArchitecture } from "./hq/read-model";
import type { PaymentArchitectureEvidence } from "./types";

export function resolvePaymentArchitecture(
  evidence: PaymentArchitectureEvidence,
  options: {
    preferStripe?: boolean;
    stripeVerification?: ProviderCapabilityStatus | null;
    stripeEnvironment?: ProviderEnvironment | null;
  } = {},
) {
  const selection = selectPaymentArchitecture(evidence, { preferStripe: options.preferStripe });
  const gaps = validatePaymentArchitecture(evidence, selection);
  const contract = buildPaymentArchitectureContract(selection, evidence);
  const readiness = resolveConnectWriteReadiness({
    stripeVerification: options.stripeVerification,
    stripeEnvironment: options.stripeEnvironment,
  });
  return {
    selection,
    gaps,
    contract,
    readiness,
    hq: buildPaymentArchitectureHqReadModel(selection, readiness),
    explanation: explainPaymentArchitecture(selection),
  };
}
