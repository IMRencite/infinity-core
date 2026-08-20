import { describe, expect, it } from "vitest";
import {
  configuredProviderVerificationFailed,
  formatLiveVerificationSummary,
  runLiveCommercializationVerification,
} from "../probes/run-live-verification";
import { redactSecrets } from "@/lib/infinity/launch-gateway/redaction";
import { loadPersistedProviderVerifications } from "../hq/load-provider-verifications";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  persistProviderVerification,
  resolveVerificationOrganizationId,
  type DurableAdmin,
} from "../probes/persist-durable";
import type { CommercialProviderVerification } from "../probes/status";

const TEST_PROVIDER_KEY = "infinity.test.atomic_upsert_v1";
const TEST_PROVIDER_KEY_ALT = "infinity.test.atomic_upsert_alt_v1";

function testVerification(
  organizationId: string,
  overrides: Partial<CommercialProviderVerification> = {},
): CommercialProviderVerification {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    organizationId,
    providerCategory: "DNS",
    providerKey: TEST_PROVIDER_KEY,
    environment: "TEST",
    mode: "READ_ONLY",
    status: "CONFIGURED_UNVERIFIED",
    capabilitiesChecked: ["atomic-upsert-probe"],
    startedAt: "2026-08-20T07:30:00.000Z",
    completedAt: "2026-08-20T07:30:01.000Z",
    freshness: "VERIFIED_FRESH",
    failureCode: null,
    failureReason: null,
    metadata: { atomicUpsertProbe: true, realProviderCall: false, mutationOccurred: false, writeHttpCalls: 0 },
    mutationAuthority: "LOCKED",
    ...overrides,
  };
}

async function countIdentity(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: string,
  providerCategory: string,
  providerKey: string,
): Promise<number> {
  const result = await admin
    .from("commercial_provider_verifications")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("provider_category", providerCategory)
    .eq("provider_key", providerKey);
  if (result.error) throw new Error(result.error.message);
  return result.data?.length ?? 0;
}

async function deleteTestOwnedRows(admin: ReturnType<typeof createAdminClient>): Promise<void> {
  await admin.from("commercial_provider_verifications").delete().eq("provider_key", TEST_PROVIDER_KEY);
  await admin.from("commercial_provider_verifications").delete().eq("provider_key", TEST_PROVIDER_KEY_ALT);
}

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

    expect(report.durablePersisted).toBe(true);
    expect(report.durableRowCount).toBe(4);
    const admin = createAdminClient();
    const organizationId = await resolveVerificationOrganizationId(admin as never);
    expect(organizationId).toBeTruthy();
    const loaded = await loadPersistedProviderVerifications(admin as never, organizationId!);
    const dns = loaded.find((row) => row.providerCategory === "DNS");
    const hosting = loaded.find((row) => row.providerCategory === "HOSTING");
    const registrar = loaded.find((row) => row.providerCategory === "REGISTRAR");
    const payments = loaded.find((row) => row.providerCategory === "PAYMENTS");
    expect(dns?.status).toBe("READ_ONLY_VERIFIED");
    expect(dns?.metadata.dnsLiveResourceReadProven).toBe(false);
    expect(dns?.metadata.dnsReadCapabilitySupported).toBe(true);
    expect(hosting?.status).toBe("READ_ONLY_VERIFIED");
    expect(registrar?.status).toBe("NOT_CONFIGURED");
    expect(payments?.status).toBe("NOT_CONFIGURED");
    expect(JSON.stringify(loaded)).not.toMatch(/Bearer |sk_live_|whsec_/);
    if (process.env.CLOUDFLARE_API_TOKEN) {
      expect(JSON.stringify(loaded)).not.toContain(process.env.CLOUDFLARE_API_TOKEN);
    }

    expect(await countIdentity(admin, organizationId!, "DNS", "cloudflare.dns_v1")).toBe(1);

    const durableAdmin = admin as unknown as DurableAdmin;
    try {
      await Promise.all([
        persistProviderVerification(
          durableAdmin,
          testVerification(organizationId!, {
            id: "00000000-0000-4000-8000-000000000011",
            completedAt: "2026-08-20T07:40:00.000Z",
          }),
        ),
        persistProviderVerification(
          durableAdmin,
          testVerification(organizationId!, {
            id: "00000000-0000-4000-8000-000000000012",
            completedAt: "2026-08-20T07:40:01.000Z",
          }),
        ),
      ]);
      expect(await countIdentity(admin, organizationId!, "DNS", TEST_PROVIDER_KEY)).toBe(1);

      await persistProviderVerification(
        durableAdmin,
        testVerification(organizationId!, {
          id: "00000000-0000-4000-8000-000000000013",
          providerKey: TEST_PROVIDER_KEY_ALT,
        }),
      );
      expect(await countIdentity(admin, organizationId!, "DNS", TEST_PROVIDER_KEY_ALT)).toBe(1);
      expect(await countIdentity(admin, organizationId!, "DNS", "cloudflare.dns_v1")).toBe(1);

      const orgResult = await admin.from("organizations").select("id").limit(2);
      const orgIds = (orgResult.data ?? []).map((row) => row.id).filter(Boolean);
      if (orgIds.length >= 2) {
        const otherOrgId = orgIds.find((id) => id !== organizationId) ?? orgIds[1]!;
        await persistProviderVerification(durableAdmin, testVerification(otherOrgId));
        expect(await countIdentity(admin, organizationId!, "DNS", TEST_PROVIDER_KEY)).toBe(1);
        expect(await countIdentity(admin, otherOrgId, "DNS", TEST_PROVIDER_KEY)).toBe(1);
      }
    } finally {
      await deleteTestOwnedRows(admin);
    }

    expect(await countIdentity(admin, organizationId!, "DNS", TEST_PROVIDER_KEY)).toBe(0);
    expect(await countIdentity(admin, organizationId!, "DNS", TEST_PROVIDER_KEY_ALT)).toBe(0);
    expect(await countIdentity(admin, organizationId!, "DNS", "cloudflare.dns_v1")).toBe(1);
    const hqAfter = await loadPersistedProviderVerifications(admin as never, organizationId!);
    expect(hqAfter.find((row) => row.providerCategory === "DNS")?.providerKey).toBe("cloudflare.dns_v1");
    expect(hqAfter.find((row) => row.providerCategory === "DNS")?.status).toBe("READ_ONLY_VERIFIED");
  }, 60000);
});
