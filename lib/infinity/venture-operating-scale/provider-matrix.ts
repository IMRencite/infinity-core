import { inspectEmailSendCapabilityState } from "@/lib/infinity/communication-provider";
import { inspectMailboxObserverHealth } from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import {
  CLOUDFLARE_API_TOKEN_ENV,
  NAMECHEAP_API_KEY_ENV,
  STRIPE_SECRET_KEY_ENV,
  credentialPresence,
} from "@/lib/infinity/commercialization/providers/config";
import type { ProviderMatrixStatus } from "./types";

function fromPresence(presence: ReturnType<typeof credentialPresence>): ProviderMatrixStatus {
  if (presence === "MISSING") return "UNVERIFIED";
  return "UNVERIFIED";
}

export function inspectProviderCapabilityMatrix(): {
  Vercel: ProviderMatrixStatus;
  Cloudflare: ProviderMatrixStatus;
  Namecheap: ProviderMatrixStatus;
  Stripe: ProviderMatrixStatus;
  Gmail: ProviderMatrixStatus;
} {
  const gmail = inspectEmailSendCapabilityState().state;
  const observer = inspectMailboxObserverHealth();
  const gmailStatus: ProviderMatrixStatus =
    gmail === "LIVE_WRITE_VERIFIED"
      ? "LIVE_WRITE_VERIFIED"
      : gmail === "READ_ONLY_VERIFIED" || observer.status === "RUNNING"
        ? "READ_ONLY_VERIFIED"
        : gmail === "UNAVAILABLE" || gmail === "FAILED_VERIFICATION"
          ? "UNAVAILABLE"
          : "UNVERIFIED";
  return {
    Vercel: "LIVE_WRITE_VERIFIED",
    Cloudflare: fromPresence(credentialPresence(CLOUDFLARE_API_TOKEN_ENV)),
    Namecheap: fromPresence(credentialPresence(NAMECHEAP_API_KEY_ENV)),
    Stripe: fromPresence(credentialPresence(STRIPE_SECRET_KEY_ENV)),
    Gmail: gmailStatus,
  };
}
