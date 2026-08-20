import { newId, type CommercializationStore } from "../store";
import type { ProviderInventory } from "./inventory";
import {
  freshnessFromCompletedAt,
  type CommercialProviderVerification,
  type ProviderCapabilityStatus,
  type ProviderProbeFailureCode,
} from "./status";
import { COMMERCIAL_PROVIDER_VERIFICATION_MODE } from "./mode";

export type PersistableLiveReport = {
  inventory: ProviderInventory;
  registrar: { status: ProviderCapabilityStatus; failureCode: ProviderProbeFailureCode | null; realProviderCall: boolean; rows: unknown[] };
  dns: { status: ProviderCapabilityStatus; failureCode: ProviderProbeFailureCode | null; realProviderCall: boolean; zoneCount: number | null; recordCount: number | null };
  hosting: {
    status: ProviderCapabilityStatus;
    failureCode: ProviderProbeFailureCode | null;
    realProviderCall: boolean;
    projectCount: number | null;
    deploymentCount: number | null;
  };
  payments: {
    status: ProviderCapabilityStatus;
    failureCode: ProviderProbeFailureCode | null;
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
    failureReason: input.failureReason,
    metadata: input.metadata,
    mutationAuthority: "LOCKED",
  };
}

export function persistLiveVerification(
  store: CommercializationStore,
  report: PersistableLiveReport,
  organizationId = "org-local-probe",
): CommercialProviderVerification[] {
  const { startedAt, completedAt } = report;
  const records: CommercialProviderVerification[] = [
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
      failureReason: report.registrar.status === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : null,
      metadata: {
        realProviderCall: report.registrar.realProviderCall,
        rowCount: report.registrar.rows.length,
        mutationOccurred: false,
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
      failureReason: report.dns.status === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : null,
      metadata: {
        realProviderCall: report.dns.realProviderCall,
        zoneCount: report.dns.zoneCount,
        recordCount: report.dns.recordCount,
        mutationOccurred: false,
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
      failureReason: report.hosting.status === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : null,
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
      failureReason: report.payments.status === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : null,
      metadata: {
        realProviderCall: report.payments.realProviderCall,
        productCount: report.payments.productCount,
        priceCount: report.payments.priceCount,
        liveChargesAuthorized: false,
        mutationOccurred: false,
      },
    }),
  ];

  for (const item of records) {
    store.providerVerifications.set(item.id, item);
    store.registerIdempotency(organizationId, `provider-verification:${item.providerCategory}`, item.id);
  }
  return records;
}
