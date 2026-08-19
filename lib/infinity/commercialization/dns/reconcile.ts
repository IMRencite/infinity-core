import { newId, nowIso, type CommercializationStore } from "../store";
import type { DnsDesiredRecord, DnsDesiredState } from "../types";
import type { DnsCapability, DnsRecord } from "../providers/contracts";

export function buildDefaultDnsDesiredRecords(input: {
  zoneName: string;
  hostingTarget: string;
}): DnsDesiredRecord[] {
  return [
    { recordType: "A", name: "@", value: input.hostingTarget, ttl: 300, purpose: "apex" },
    { recordType: "CNAME", name: "www", value: input.zoneName, ttl: 300, purpose: "www" },
    { recordType: "TXT", name: "@", value: "infinity-verification=dry-run", ttl: 300, purpose: "verification" },
  ];
}

export function createDnsDesiredState(input: {
  store: CommercializationStore;
  organizationId: string;
  ventureId: string;
  domainAssetId: string;
  zoneName: string;
  provider: string;
  records: DnsDesiredRecord[];
  idempotencyKey: string;
}): DnsDesiredState {
  const existing = input.store.findByIdempotency(input.organizationId, input.idempotencyKey, input.store.dnsStates);
  if (existing) return existing;

  const state: DnsDesiredState = {
    id: newId(),
    organizationId: input.organizationId,
    ventureId: input.ventureId,
    domainAssetId: input.domainAssetId,
    zoneName: input.zoneName,
    provider: input.provider,
    status: "PENDING",
    records: input.records,
    idempotencyKey: input.idempotencyKey,
  };
  input.store.dnsStates.set(state.id, state);
  input.store.registerIdempotency(input.organizationId, input.idempotencyKey, state.id);
  return state;
}

export type DnsReconcileResult = {
  created: number;
  updated: number;
  unchanged: number;
  failed: boolean;
  failureCode?: string;
};

function recordKey(r: DnsRecord): string {
  return `${r.recordType}:${r.name}`;
}

export async function reconcileDnsDesiredState(input: {
  store: CommercializationStore;
  dns: DnsCapability;
  desired: DnsDesiredState;
  simulateFailure?: boolean;
  authorizationRef?: string | null;
}): Promise<DnsReconcileResult> {
  if (!input.authorizationRef) {
    throw new Error("AUTHORIZATION_MISSING");
  }

  if (input.simulateFailure) {
    input.desired.status = "FAILED";
    input.store.dnsStates.set(input.desired.id, input.desired);
    return { created: 0, updated: 0, unchanged: 0, failed: true, failureCode: "DNS_VERIFICATION_FAILED" };
  }

  input.desired.status = "RECONCILING";
  input.store.dnsStates.set(input.desired.id, input.desired);

  await input.dns.createZone(input.desired.zoneName);
  const actual = await input.dns.listRecords(input.desired.zoneName);
  const actualByKey = new Map(actual.map((r) => [recordKey(r), r]));

  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const desired of input.desired.records) {
    const rec: DnsRecord = {
      recordType: desired.recordType,
      name: desired.name,
      value: desired.value,
      ttl: desired.ttl,
    };
    const key = recordKey(rec);
    const current = actualByKey.get(key);
    if (!current) {
      await input.dns.createRecord(input.desired.zoneName, rec);
      created += 1;
      continue;
    }
    if (current.value !== rec.value || current.ttl !== rec.ttl) {
      await input.dns.updateRecord(input.desired.zoneName, rec);
      updated += 1;
    } else {
      unchanged += 1;
    }
  }

  input.desired.status = "SYNCED";
  input.store.dnsStates.set(input.desired.id, input.desired);

  return { created, updated, unchanged, failed: false };
}

export function markDnsDegraded(store: CommercializationStore, desiredId: string): void {
  const desired = store.dnsStates.get(desiredId);
  if (!desired) return;
  desired.status = "DEGRADED";
  store.dnsStates.set(desired.id, desired);
}
