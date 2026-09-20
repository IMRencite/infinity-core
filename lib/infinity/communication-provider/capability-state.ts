import { EMAIL_SEND_CAPABILITY } from "@/lib/infinity/provider-capabilities/email-send-capability";
import type { CommunicationCapabilityState } from "./types";

let override: CommunicationCapabilityState | null = null;

export function inspectEmailSendCapabilityState(): {
  capability: typeof EMAIL_SEND_CAPABILITY;
  global: true;
  creSpecific: false;
  gmailSpecific: false;
  state: CommunicationCapabilityState;
} {
  return {
    capability: EMAIL_SEND_CAPABILITY,
    global: true,
    creSpecific: false,
    gmailSpecific: false,
    state: override ?? "UNVERIFIED",
  };
}

export function persistEmailSendCapabilityState(state: CommunicationCapabilityState | null): void {
  override = state;
}

export function setEmailSendCapabilityStateForTest(state: CommunicationCapabilityState | null): void {
  persistEmailSendCapabilityState(state);
}

export function resetEmailSendCapabilityState(): void {
  override = null;
}
