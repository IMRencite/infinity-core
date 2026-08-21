import type { PaymentArchitectureEvidence } from "@/lib/infinity/payment-architecture/types";
import {
  buildPaymentArchitectureContract,
  resolvePaymentArchitecture,
  selectPaymentArchitecture,
  type PaymentArchitectureBuildContract,
} from "@/lib/infinity/payment-architecture";
import type { VentureSystemsEvidence } from "./types";

export function paymentEvidenceFromVenture(evidence: VentureSystemsEvidence): PaymentArchitectureEvidence {
  if (evidence.paymentEvidence) return evidence.paymentEvidence;
  return {
    monetizationModelType: evidence.monetizationModelType,
    businessModelCandidates: evidence.businessModelCandidates,
    hasDistinctBuyers: evidence.hasDistinctBuyers,
    hasDistinctSellers: evidence.hasDistinctSellers,
    sellersReceivePlatformPayouts: evidence.hasDistinctSellers ? true : null,
  };
}

export function paymentContractFromVenture(evidence: VentureSystemsEvidence): PaymentArchitectureBuildContract {
  if (evidence.paymentContract) return evidence.paymentContract;
  const paymentEvidence = paymentEvidenceFromVenture(evidence);
  return buildPaymentArchitectureContract(selectPaymentArchitecture(paymentEvidence), paymentEvidence);
}

export function resolvePaymentForVenture(evidence: VentureSystemsEvidence) {
  if (evidence.paymentContract) {
    return {
      contract: evidence.paymentContract,
      selection: selectPaymentArchitecture(paymentEvidenceFromVenture(evidence)),
    };
  }
  const resolved = resolvePaymentArchitecture(paymentEvidenceFromVenture(evidence));
  return { contract: resolved.contract, selection: resolved.selection };
}
