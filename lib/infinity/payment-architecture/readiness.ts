import type { ProviderCapabilityStatus } from "@/lib/infinity/commercialization/probes/status";
import type { ProviderEnvironment } from "@/lib/infinity/commercialization/probes/inventory";
import type { ConnectWriteReadinessReport } from "./types";

export function resolveConnectWriteReadiness(input: {
  stripeVerification?: ProviderCapabilityStatus | null;
  stripeEnvironment?: ProviderEnvironment | null;
}): ConnectWriteReadinessReport {
  const stripeVerification = input.stripeVerification ?? "UNKNOWN";
  const testModeCapable = input.stripeEnvironment === "TEST";
  return {
    stripeVerification,
    connectWriteReadiness:
      stripeVerification === "READ_ONLY_VERIFIED"
        ? testModeCapable
          ? "TEST_MODE_CAPABLE"
          : "LIVE_WRITE_GATED"
        : "CONNECT_CONFIG_REQUIRED",
    marketplacePaymentReadiness: "FOUNDATION",
    liveWriteAuthority: false,
    readOnlyVerificationGrantsConnectWrites: false,
  };
}
