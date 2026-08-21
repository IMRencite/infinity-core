import { describe, expect, it } from "vitest";
import { buildProviderInventory } from "../probes/inventory";
import { persistLiveVerification } from "../probes/persist";
import {
  durableStatus,
  isDurableOrganizationId,
  persistLiveVerificationDurable,
  persistProviderVerification,
  PROVIDER_VERIFICATION_CONFLICT_TARGET,
  type DurableAdmin,
} from "../probes/persist-durable";
import { loadPersistedProviderVerifications } from "../hq/load-provider-verifications";
import { buildProviderReadinessArtifacts } from "../hq/build-provider-readiness-artifacts";
import { CommercializationStore } from "../store";
import type { PersistableLiveReport } from "../probes/persist";
import type { CommercialProviderVerification } from "../probes/status";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const ORG_B = "22222222-2222-4222-8222-222222222222";

type Row = Record<string, unknown>;

function identityKey(row: Row): string {
  return `${row.organization_id}|${row.provider_category}|${row.provider_key}`;
}

function upsertByIdentity(rows: Row[], incoming: Row): Row {
  const existing = rows.find((row) => identityKey(row) === identityKey(incoming));
  if (existing) {
    const { organization_id: _org, created_at: _createdAt, id: _incomingId, ...patch } = incoming;
    void _org;
    void _createdAt;
    void _incomingId;
    Object.assign(existing, patch);
    return existing;
  }
  const inserted = {
    id: incoming.id ?? crypto.randomUUID(),
    created_at: incoming.created_at ?? "2026-08-20T07:00:00.000Z",
    ...incoming,
  };
  rows.push(inserted);
  return inserted;
}

function createFakeAdmin(seed: Row[] = []) {
  const rows: Row[] = [...seed];
  const admin = {
    rows,
    from(table: string) {
      if (table === "organizations") {
        return {
          select: () => ({
            limit: async () => ({ data: [{ id: ORG_A }], error: null }),
          }),
        };
      }
      return {
        select: (_columns: string) => ({
          eq: (c1: string, v1: string) => ({
            order: async () => ({
              data: rows
                .filter((row) => row[c1] === v1)
                .sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at))),
              error: null,
            }),
          }),
        }),
        upsert: (row: Row, opts: { onConflict: string }) => {
          expect(opts.onConflict).toBe(PROVIDER_VERIFICATION_CONFLICT_TARGET);
          return {
            select: (_columns: string) => ({
              maybeSingle: async () => {
                const written = upsertByIdentity(rows, row);
                return { data: { id: String(written.id) }, error: null };
              },
            }),
          };
        },
      };
    },
  };
  return admin as unknown as DurableAdmin & { rows: Row[] };
}

function verification(overrides: Partial<CommercialProviderVerification> = {}): CommercialProviderVerification {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    organizationId: ORG_A,
    providerCategory: "DNS",
    providerKey: "cloudflare.dns_v1",
    environment: "LIVE",
    mode: "READ_ONLY",
    status: "READ_ONLY_VERIFIED",
    capabilitiesChecked: ["verifyToken", "listZones"],
    startedAt: "2026-08-20T07:00:00.000Z",
    completedAt: "2026-08-20T07:00:01.000Z",
    freshness: "VERIFIED_FRESH",
    failureCode: null,
    failureReason: null,
    metadata: { realProviderCall: true, mutationOccurred: false, writeHttpCalls: 0 },
    mutationAuthority: "LOCKED",
    ...overrides,
  };
}

function report(overrides: Partial<PersistableLiveReport> = {}): PersistableLiveReport {
  const inventory = buildProviderInventory();
  return {
    inventory,
    registrar: {
      status: "NOT_CONFIGURED",
      failureCode: "NOT_CONFIGURED",
      realProviderCall: false,
      rows: [],
    },
    dns: {
      status: "READ_ONLY_VERIFIED",
      failureCode: null,
      realProviderCall: true,
      zoneCount: 0,
      recordCount: 0,
      authRead: true,
      zoneListRead: true,
      dnsRecordRead: true,
      tokenScope: "UNKNOWN",
      writeHttpCalls: 0,
    },
    hosting: {
      status: "READ_ONLY_VERIFIED",
      failureCode: null,
      realProviderCall: true,
      projectCount: 4,
      deploymentCount: 3,
    },
    payments: {
      status: "NOT_CONFIGURED",
      failureCode: "NOT_CONFIGURED",
      realProviderCall: false,
      productCount: null,
      priceCount: null,
    },
    startedAt: "2026-08-20T07:00:00.000Z",
    completedAt: "2026-08-20T07:00:01.000Z",
    ...overrides,
  };
}

describe("Durable commercial provider verification persistence", () => {
  it("requires a UUID organization id", () => {
    expect(isDurableOrganizationId("org-local-probe")).toBe(false);
    expect(isDurableOrganizationId(ORG_A)).toBe(true);
  });

  it("does not persist READ_ONLY_VERIFIED without a real provider call", () => {
    expect(durableStatus("READ_ONLY_VERIFIED", false)).toBe("CONFIGURED_UNVERIFIED");
    expect(durableStatus("READ_ONLY_VERIFIED", true)).toBe("READ_ONLY_VERIFIED");
    expect(durableStatus("FAILED", true)).toBe("FAILED");
  });

  it("upserts org-scoped Cloudflare verification without secrets or writes", async () => {
    const admin = createFakeAdmin();
    const first = await persistLiveVerificationDurable(admin, report(), ORG_A);
    expect(admin.rows).toHaveLength(4);
    const dns = admin.rows.find((row) => row.provider_category === "DNS");
    expect(dns?.organization_id).toBe(ORG_A);
    expect(dns?.status).toBe("READ_ONLY_VERIFIED");
    expect(dns?.metadata).toMatchObject({
      zoneCount: 0,
      dnsReadCapabilitySupported: true,
      dnsLiveResourceReadProven: false,
      mutationOccurred: false,
      writeHttpCalls: 0,
    });
    expect(JSON.stringify(admin.rows)).not.toMatch(/Bearer |sk_live_|CLOUDFLARE_API_TOKEN|cloudflare-test-token-fixture/);

    const updatedReport = report({
      dns: {
        status: "READ_ONLY_VERIFIED",
        failureCode: null,
        realProviderCall: true,
        zoneCount: 0,
        recordCount: 0,
        authRead: true,
        zoneListRead: true,
        dnsRecordRead: true,
        writeHttpCalls: 0,
      },
      completedAt: "2026-08-20T07:05:00.000Z",
    });
    await persistLiveVerificationDurable(admin, updatedReport, ORG_A);
    expect(admin.rows).toHaveLength(4);
    expect(admin.rows.find((row) => row.provider_category === "DNS")?.completed_at).toBe("2026-08-20T07:05:00.000Z");
    expect(first.find((row) => row.providerCategory === "DNS")?.providerKey).toBe("cloudflare.dns_v1");
  });

  it("persists FAILED auth without promoting verification", async () => {
    const admin = createFakeAdmin();
    await persistLiveVerificationDurable(
      admin,
      report({
        dns: {
          status: "FAILED",
          failureCode: "AUTH_FAILED",
          failureReason: "AUTH_FAILED",
          realProviderCall: true,
          zoneCount: null,
          recordCount: null,
        },
      }),
      ORG_A,
    );
    const dns = admin.rows.find((row) => row.provider_category === "DNS");
    expect(dns?.status).toBe("FAILED");
    expect(dns?.failure_code).toBe("AUTH_FAILED");
    expect(dns?.failure_reason).toBe("AUTH_FAILED");
  });

  it("sanitizes secret-bearing metadata and failure text", async () => {
    const admin = createFakeAdmin();
    const poisoned = report();
    poisoned.dns.failureReason = "Authorization: Bearer super-secret-token-value-aaaaaaaaaa AUTH_FAILED";
    await persistLiveVerificationDurable(admin, poisoned, ORG_A);
    const serialized = JSON.stringify(admin.rows);
    expect(serialized).not.toContain("super-secret-token-value");
    expect(serialized).not.toMatch(/Bearer /);
  });

  it("blocks cross-org reads and writes via organization_id filters", async () => {
    const admin = createFakeAdmin();
    await persistLiveVerificationDurable(admin, report(), ORG_A);
    await persistLiveVerificationDurable(
      admin,
      report({
        dns: {
          status: "FAILED",
          failureCode: "AUTH_FAILED",
          realProviderCall: true,
          zoneCount: null,
          recordCount: null,
        },
      }),
      ORG_B,
    );
    const forA = await loadPersistedProviderVerifications(admin as never, ORG_A);
    const forB = await loadPersistedProviderVerifications(admin as never, ORG_B);
    expect(forA.find((row) => row.providerCategory === "DNS")?.status).toBe("READ_ONLY_VERIFIED");
    expect(forB.find((row) => row.providerCategory === "DNS")?.status).toBe("FAILED");
    expect(forA.every((row) => row.organizationId === ORG_A)).toBe(true);
    expect(forB.every((row) => row.organizationId === ORG_B)).toBe(true);
  });

  it("HQ reads durable DB state after a process-local store is discarded", async () => {
    const admin = createFakeAdmin();
    const store = new CommercializationStore();
    persistLiveVerification(store, report(), ORG_A);
    expect(store.providerVerifications.size).toBe(4);
    await persistLiveVerificationDurable(admin, report(), ORG_A);
    store.providerVerifications.clear();

    const loaded = await loadPersistedProviderVerifications(admin as never, ORG_A);
    expect(loaded.find((row) => row.providerCategory === "DNS")?.status).toBe("READ_ONLY_VERIFIED");
    expect(loaded.find((row) => row.providerCategory === "HOSTING")?.status).toBe("READ_ONLY_VERIFIED");
    expect(loaded.find((row) => row.providerCategory === "REGISTRAR")?.status).toBe("NOT_CONFIGURED");
    expect(loaded.find((row) => row.providerCategory === "PAYMENTS")?.status).toBe("NOT_CONFIGURED");

    const inventory = buildProviderInventory();
    const configuredInventory = {
      ...inventory,
      dns: { ...inventory.dns, configured: "CONFIGURED" as const },
      hosting: { ...inventory.hosting, configured: "CONFIGURED" as const },
      registrar: { ...inventory.registrar, configured: "NOT_CONFIGURED" as const },
      payments: { ...inventory.payments, configured: "NOT_CONFIGURED" as const },
    };
    const artifacts = buildProviderReadinessArtifacts(configuredInventory, loaded);
    const dns = artifacts.launch_operations?.find((item) => item.title === "DNS");
    const hosting = artifacts.launch_operations?.find((item) => item.title === "Hosting");
    const registrar = artifacts.launch_operations?.find((item) => item.title === "Registrar");
    const payments = artifacts.strategy_finance?.find((item) => item.title === "Payments");
    expect(dns?.metadata.readiness).toBe("READ_ONLY_VERIFIED");
    expect(hosting?.metadata.readiness).toBe("READ_ONLY_VERIFIED");
    expect(registrar?.metadata.readiness).toBe("NOT_CONFIGURED");
    expect(payments?.metadata.readiness).toBe("NOT_CONFIGURED");
    expect(JSON.stringify(loaded)).not.toMatch(/Bearer /);
  });

  it("concurrent same-identity writes collapse to one canonical row", async () => {
    const admin = createFakeAdmin();
    const results = await Promise.all([
      persistProviderVerification(
        admin,
        verification({
          id: "11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          completedAt: "2026-08-20T07:00:01.000Z",
        }),
      ),
      persistProviderVerification(
        admin,
        verification({
          id: "22222222-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          completedAt: "2026-08-20T07:00:02.000Z",
          metadata: { realProviderCall: true, mutationOccurred: false, writeHttpCalls: 0, concurrentWrite: true },
        }),
      ),
    ]);
    expect(results.every((row) => row.action === "upsert")).toBe(true);
    expect(admin.rows).toHaveLength(1);
    expect(admin.rows[0]?.organization_id).toBe(ORG_A);
    expect(admin.rows[0]?.provider_category).toBe("DNS");
    expect(admin.rows[0]?.provider_key).toBe("cloudflare.dns_v1");
    expect(admin.rows[0]?.status).toBe("READ_ONLY_VERIFIED");
  });

  it("preserves distinct provider keys in the same org and category", async () => {
    const admin = createFakeAdmin();
    await persistProviderVerification(admin, verification({ providerKey: "cloudflare.dns_v1" }));
    await persistProviderVerification(
      admin,
      verification({
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        providerKey: "route53.dns_v1",
        completedAt: "2026-08-20T07:01:00.000Z",
      }),
    );
    const dnsRows = admin.rows.filter((row) => row.provider_category === "DNS" && row.organization_id === ORG_A);
    expect(dnsRows).toHaveLength(2);
    expect(dnsRows.map((row) => row.provider_key).sort()).toEqual(["cloudflare.dns_v1", "route53.dns_v1"]);
  });

  it("keeps the same provider identity independent across organizations", async () => {
    const admin = createFakeAdmin();
    await persistProviderVerification(admin, verification({ organizationId: ORG_A }));
    await persistProviderVerification(
      admin,
      verification({
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        organizationId: ORG_B,
        status: "FAILED",
        failureCode: "AUTH_FAILED",
        failureReason: "AUTH_FAILED",
        metadata: { realProviderCall: true },
      }),
    );
    expect(admin.rows).toHaveLength(2);
    const forA = admin.rows.find((row) => row.organization_id === ORG_A);
    const forB = admin.rows.find((row) => row.organization_id === ORG_B);
    expect(forA?.provider_key).toBe("cloudflare.dns_v1");
    expect(forB?.provider_key).toBe("cloudflare.dns_v1");
    expect(forA?.status).toBe("READ_ONLY_VERIFIED");
    expect(forB?.status).toBe("FAILED");
  });
});
