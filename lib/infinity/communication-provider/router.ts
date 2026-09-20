import { EMAIL_SEND_CAPABILITY } from "@/lib/infinity/provider-capabilities/email-send-capability";
import { GMAIL_PROVIDER_ID } from "./constants";
import { inspectEmailSendCapabilityState } from "./capability-state";
import { gmailAdapterContract } from "./gmail-adapter";
import type { CommunicationIntent } from "./types";

export type CommunicationProviderRoute = {
  capability: typeof EMAIL_SEND_CAPABILITY;
  provider: typeof GMAIL_PROVIDER_ID | null;
  adapter: typeof gmailAdapterContract.adapterKey | null;
  available: boolean;
  reason: string;
};

export function routeEmailSend(intent: CommunicationIntent): CommunicationProviderRoute {
  if (intent.capability !== EMAIL_SEND_CAPABILITY) {
    return {
      capability: EMAIL_SEND_CAPABILITY,
      provider: null,
      adapter: null,
      available: false,
      reason: "UNKNOWN_CAPABILITY",
    };
  }
  const state = inspectEmailSendCapabilityState().state;
  if (state === "UNAVAILABLE") {
    return {
      capability: EMAIL_SEND_CAPABILITY,
      provider: GMAIL_PROVIDER_ID,
      adapter: gmailAdapterContract.adapterKey,
      available: false,
      reason: "PROVIDER_UNAVAILABLE",
    };
  }
  const writeVerification = intent.purpose === "provider_write_verification";
  const available = writeVerification
    ? state === "READ_ONLY_VERIFIED" || state === "LIVE_WRITE_VERIFIED"
    : state === "LIVE_WRITE_VERIFIED";
  return {
    capability: EMAIL_SEND_CAPABILITY,
    provider: GMAIL_PROVIDER_ID,
    adapter: gmailAdapterContract.adapterKey,
    available,
    reason: available ? "ROUTED" : `PROVIDER_${state}`,
  };
}
