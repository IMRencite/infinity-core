import { describe, expect, it } from "vitest";
import {
  configuredProviderVerificationFailed,
  formatLiveVerificationSummary,
  runLiveCommercializationVerification,
} from "../probes/run-live-verification";
import { redactSecrets } from "@/lib/infinity/launch-gateway/redaction";

const RUN_LIVE = process.env.RUN_COMMERCIAL_LIVE_PROBE === "true";

describe.runIf(RUN_LIVE)("Commercialization live provider probes (read-only)", () => {
  it("runs read-only live verification for configured providers only", async () => {
    const report = await runLiveCommercializationVerification("live-session");
    expect(report.mode).toBe("READ_ONLY");
    expect(report.commercialSpendUsd).toBe(0);
    expect(report.registrar.mutationOccurred).toBe(false);
    expect(report.dns.mutationOccurred).toBe(false);
    expect(report.hosting.mutationOccurred).toBe(false);
    expect(report.payments.mutationOccurred).toBe(false);
    expect(report.mutationAuthority).toBe("LOCKED");
    expect(report.payments.liveChargesAuthorized).toBe(false);

    const serialized = redactSecrets(JSON.stringify(report));
    expect(serialized).not.toMatch(/sk_live_|sk_test_|whsec_|vcp_|ghp_|Bearer /);
    if (process.env.VERCEL_TOKEN) {
      expect(serialized).not.toContain(process.env.VERCEL_TOKEN);
    }

    const summary = formatLiveVerificationSummary(report);
    expect(summary).toContain("READ_ONLY");
    expect(summary).not.toMatch(/sk_live_|vcp_/);
    console.log(summary);

    if (configuredProviderVerificationFailed(report)) {
      throw new Error("CONFIGURED_PROVIDER_VERIFICATION_FAILED");
    }
  }, 60000);
});
