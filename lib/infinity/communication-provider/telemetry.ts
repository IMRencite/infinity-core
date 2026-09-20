import {
  deliveryIsQualifiedEvidence,
  emailOpenIsStrongIntent,
  outreachAttemptIsQualifiedEvidence,
} from "@/lib/infinity/market-validation-acquisition-runtime/evidence-stages";
import type { CommunicationAttempt, CommunicationCost } from "./types";

export type CommunicationTelemetryEvent = {
  attempted: boolean;
  providerAccepted: boolean;
  delivered: boolean;
  bounced: boolean;
  failed: boolean;
  providerCost: CommunicationCost;
  countsAsQualifiedEvidence: false;
  countsAsStrongIntent: false;
  emailSentIsMarketValidationSuccess: false;
  emailDeliveredIsQualifiedEvidence: false;
  emailOpenIsStrongIntent: false;
};

export function communicationTelemetryFromAttempt(attempt: CommunicationAttempt): CommunicationTelemetryEvent {
  return {
    attempted: true,
    providerAccepted: attempt.state === "PROVIDER_ACCEPTED" || attempt.state === "DELIVERED",
    delivered: attempt.state === "DELIVERED",
    bounced: attempt.state === "BOUNCED",
    failed: attempt.state === "FAILED",
    providerCost: attempt.providerResult?.cost ?? {
      classification: "UNKNOWN",
      amountUsd: null,
      treatedAsZero: false,
    },
    countsAsQualifiedEvidence: false,
    countsAsStrongIntent: false,
    emailSentIsMarketValidationSuccess: false,
    emailDeliveredIsQualifiedEvidence: deliveryIsQualifiedEvidence(),
    emailOpenIsStrongIntent: emailOpenIsStrongIntent(),
  };
}

export function emailSentIsQualifiedEvidence(): false {
  return outreachAttemptIsQualifiedEvidence();
}

export function unknownCostIsZero(): false {
  return false;
}
