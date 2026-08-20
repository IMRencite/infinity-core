import { newId, type CommercializationStore } from "../store";
import type { ProviderInventory } from "./inventory";
import {
  freshnessFromCompletedAt,
  type CommercialProviderVerification,
  type ProviderCapabilityStatus,
  type ProviderProbeFailureCode,
} from "./status";
import { COMMERCIAL_PROVIDER_VERIFICATION_MODE } from "./mode";
import { redactSecrets } from "@/lib/infinity/launch-gateway/redaction";

export const DURABLE_VERIFICATION_STATUSES = [
  "NOT_CONFIGURED",
  "CONFIGURED_UNVERIFIED",
  "READ_ONLY_VERIFIED",
  "DEGRADED",
  "UNAVAILABLE",
  "FAILED",
  "WRITE_CAPABLE_NOT_AUTHORIZED",
] as const;

const SECRET_KEY = /secret|password|authorization|api[_-]?key|credential|bearer/i;
const SECRET_VALUE = /(sk_live_|sk_test_|whsec_|vcp_|ghp_|Bearer )/i;

export function sanitizeVerificationMetadata(
  input: Record<string, string | number | boolean | null>,
): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(input)) {
    if (SECRET_KEY.test(key)) continue;
    if (typeof value === "string") {
      if (SECRET_VALUE.test(value)) continue;
      const redacted = redactSecrets(value).slice(0, 200);
      if (SECRET_VALUE.test(redacted)) continue;
      out[key] = redacted;
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function sanitizeFailureReason(reason: string | null | undefined): string | null {
  if (!reason) return null;
  const redacted = redactSecrets(reason).slice(0, 200);
  if (SECRET_VALUE.test(redacted) || SECRET_KEY.test(redacted)) return "SANITIZED_FAILURE";
  return redacted;
}

export type PersistableLiveReport = {
  inventory: ProviderInventory;
  registrar: {
    status: ProviderCapabilityStatus;
    failureCode: ProviderProbeFailureCode | null;
    failureReason?: string | null;
    realProviderCall: boolean;
    rows: unknown[];
    domainCount?: number | null;
    nextExpiration?: string | null;
    authRead?: boolean;
    domainListRead?: boolean;
    domainDetailRead?: boolean;
    clientIpWhitelistRequired?: boolean;
    readHttpCalls?: number;
    writeHttpCalls?: number;
  };
  dns: {
    status: ProviderCapabilityStatus;
    failureCode: ProviderProbeFailureCode | null;
    failureReason?: string | null;
    realProviderCall: boolean;
    zoneCount: number | null;
    recordCount: number | null;
    authRead?: boolean;
    zoneListRead?: boolean;
    dnsRecordRead?: boolean;
    tokenScope?: string;
    readHttpCalls?: number;
    writeHttpCalls?: number;
  };
  hosting: {
    status: ProviderCapabilityStatus;
    failureCode: ProviderProbeFailureCode | null;
    failureReason?: string | null;
    realProviderCall: boolean;
    projectCount: number | null;
    deploymentCount: number | null;
  };
  payments: {
    status: ProviderCapabilityStatus;
    failureCode: ProviderProbeFailureCode | null;
    failureReason?: string | null;
    realProviderCall: boolean;
    productCount: number | null;
    priceCount: number | null;
  };
  startedAt: string;
  completedAt: string;
};

function record(input: {
  organizationId: string;
  category: CommercialProviderVerification["providerCategory"];
  providerKey: string;
  environment: CommercialProviderVerification["environment"];
  status: ProviderCapabilityStatus;
  capabilitiesChecked: string[];
  startedAt: string;
  completedAt: string;
  failureCode: CommercialProviderVerification["failureCode"];
  failureReason: string | null;
  metadata: Record<string, string | number | boolean | null>;
}): CommercialProviderVerification {
  return {
    id: newId(),
    organizationId: input.organizationId,
    providerCategory: input.category,
    providerKey: input.providerKey,
    environment: input.environment,
    mode: COMMERCIAL_PROVIDER_VERIFICATION_MODE,
    status: input.status,
    capabilitiesChecked: input.capabilitiesChecked,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    freshness: freshnessFromCompletedAt(input.completedAt),
    failureCode: input.failureCode,
    failureReason: sanitizeFailureReason(input.failureReason),
    metadata: sanitizeVerificationMetadata(input.metadata),
    mutationAuthority: "LOCKED",
  };
}

export function buildLiveVerificationRecords(
  report: PersistableLiveReport,
  organizationId: string,
): CommercialProviderVerification[] {
  const { startedAt, completedAt } = report;
  return [
    record({
      organizationId,
      category: "REGISTRAR",
      providerKey: report.inventory.registrar.providerKey,
      environment: report.inventory.registrar.environment,
      status: report.registrar.status,
      capabilitiesChecked: report.inventory.registrar.readCapabilities,
      startedAt,
      completedAt,
      failureCode: report.registrar.failureCode,
      failureReason: report.registrar.failureReason ?? (report.registrar.status === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : null),
      metadata: {
        realProviderCall: report.registrar.realProviderCall,
        rowCount: report.registrar.rows.length,
        domainCount: report.registrar.domainCount ?? report.registrar.rows.length,
        nextExpiration: report.registrar.nextExpiration ?? null,
        authRead: report.registrar.authRead ?? false,
        domainListRead: report.registrar.domainListRead ?? false,
        domainDetailRead: report.registrar.domainDetailRead ?? false,
        clientIpWhitelistRequired: report.registrar.clientIpWhitelistRequired ?? true,
        lastSuccessfulRead: report.registrar.status === "READ_ONLY_VERIFIED" || report.registrar.status === "DEGRADED" ? completedAt : null,
        mutationOccurred: false,
        writeHttpCalls: report.registrar.writeHttpCalls ?? 0,
      },
    }),
    record({
      organizationId,
      category: "DNS",
      providerKey: report.inventory.dns.providerKey,
      environment: report.inventory.dns.environment,
      status: report.dns.status,
      capabilitiesChecked: report.inventory.dns.readCapabilities,
      startedAt,
      completedAt,
      failureCode: report.dns.failureCode,
      failureReason: report.dns.failureReason ?? (report.dns.status === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : null),
      metadata: {
        realProviderCall: report.dns.realProviderCall,
        zoneCount: report.dns.zoneCount,
        recordCount: report.dns.recordCount,
        authRead: report.dns.authRead ?? false,
        zoneListRead: report.dns.zoneListRead ?? false,
        dnsRecordRead: report.dns.dnsRecordRead ?? false,
        dnsReadCapabilitySupported: report.inventory.dns.readCapabilities.includes("listRecords"),
        dnsLiveResourceReadProven: Boolean((report.dns.zoneCount ?? 0) > 0 && report.dns.dnsRecordRead),
        tokenScope: report.dns.tokenScope ?? "UNKNOWN",
        lastSuccessfulRead: report.dns.status === "READ_ONLY_VERIFIED" || report.dns.status === "DEGRADED" ? completedAt : null,
        mutationOccurred: false,
        writeHttpCalls: report.dns.writeHttpCalls ?? 0,
      },
    }),
    record({
      organizationId,
      category: "HOSTING",
      providerKey: report.inventory.hosting.providerKey,
      environment: report.inventory.hosting.environment,
      status: report.hosting.status,
      capabilitiesChecked: report.inventory.hosting.readCapabilities,
      startedAt,
      completedAt,
      failureCode: report.hosting.failureCode,
      failureReason: report.hosting.failureReason ?? (report.hosting.status === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : null),
      metadata: {
        realProviderCall: report.hosting.realProviderCall,
        projectCount: report.hosting.projectCount,
        deploymentCount: report.hosting.deploymentCount,
        mutationOccurred: false,
      },
    }),
    record({
      organizationId,
      category: "PAYMENTS",
      providerKey: report.inventory.payments.providerKey,
      environment: report.inventory.payments.environment,
      status: report.payments.status,
      capabilitiesChecked: report.inventory.payments.readCapabilities,
      startedAt,
      completedAt,
      failureCode: report.payments.failureCode,
      failureReason: report.payments.failureReason ?? (report.payments.status === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : null),
      metadata: {
        realProviderCall: report.payments.realProviderCall,
        productCount: report.payments.productCount,
        priceCount: report.payments.priceCount,
        liveChargesAuthorized: false,
        mutationOccurred: false,
      },
    }),
  ];
}

export function persistLiveVerification(
  store: CommercializationStore,
  report: PersistableLiveReport,
  organizationId = "org-local-probe",
): CommercialProviderVerification[] {
  const records = buildLiveVerificationRecords(report, organizationId);
  for (const item of records) {
    store.providerVerifications.set(item.id, item);
    store.registerIdempotency(organizationId, `provider-verification:${item.providerCategory}`, item.id);
  }
  return records;
}
