import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildLiveVerificationRecords,
  DURABLE_VERIFICATION_STATUSES,
  type PersistableLiveReport,
} from "./persist";
import {
  freshnessFromCompletedAt,
  type CommercialProviderVerification,
  type ProviderCapabilityStatus,
} from "./status";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TABLE = "commercial_provider_verifications";
export const PROVIDER_VERIFICATION_CONFLICT_TARGET = "organization_id,provider_category,provider_key";

export type DurableAdmin = {
  from: (table: string) => {
    select: (columns: string) => unknown;
    upsert: (
      row: Record<string, unknown>,
      opts: { onConflict: string },
    ) => {
      select: (columns: string) => {
        maybeSingle: () => PromiseLike<{ data: { id?: string } | null; error: { message?: string } | null }>;
      };
    };
  };
};

export function isDurableOrganizationId(value: string): boolean {
  return UUID_RE.test(value);
}

export function durableStatus(
  status: ProviderCapabilityStatus,
  realProviderCall: boolean,
): (typeof DURABLE_VERIFICATION_STATUSES)[number] {
  if ((status === "READ_ONLY_VERIFIED" || status === "DEGRADED") && !realProviderCall) {
    return "CONFIGURED_UNVERIFIED";
  }
  if (status === "PARTIALLY_CONFIGURED") return "CONFIGURED_UNVERIFIED";
  if ((DURABLE_VERIFICATION_STATUSES as readonly string[]).includes(status)) {
    return status as (typeof DURABLE_VERIFICATION_STATUSES)[number];
  }
  return "FAILED";
}

function toDbRow(record: CommercialProviderVerification, status: (typeof DURABLE_VERIFICATION_STATUSES)[number]) {
  return {
    organization_id: record.organizationId,
    provider_category: record.providerCategory,
    provider_key: record.providerKey,
    environment: record.environment,
    mode: "READ_ONLY",
    status,
    capabilities_checked: record.capabilitiesChecked,
    started_at: record.startedAt,
    completed_at: record.completedAt,
    freshness: record.freshness,
    failure_code: record.failureCode,
    failure_reason: record.failureReason,
    mutation_authority: "LOCKED",
    metadata: record.metadata,
  };
}

export async function persistProviderVerification(
  admin: DurableAdmin,
  record: CommercialProviderVerification,
): Promise<{ action: "upsert"; id: string }> {
  if (!isDurableOrganizationId(record.organizationId)) {
    throw new Error("ORGANIZATION_ID_REQUIRED");
  }
  const realCall = record.metadata.realProviderCall === true;
  const status = durableStatus(record.status, realCall);
  const row = toDbRow({ ...record, status, freshness: freshnessFromCompletedAt(record.completedAt) }, status);

  const result = await admin
    .from(TABLE)
    .upsert(row, { onConflict: PROVIDER_VERIFICATION_CONFLICT_TARGET })
    .select("id")
    .maybeSingle();
  if (result.error) throw new Error(result.error.message ?? "VERIFICATION_UPSERT_FAILED");
  const id = result.data?.id;
  if (!id) throw new Error("VERIFICATION_UPSERT_FAILED");
  return { action: "upsert", id };
}

export async function persistLiveVerificationDurable(
  admin: DurableAdmin,
  report: PersistableLiveReport,
  organizationId: string,
): Promise<CommercialProviderVerification[]> {
  if (!isDurableOrganizationId(organizationId)) {
    throw new Error("ORGANIZATION_ID_REQUIRED");
  }
  const records = buildLiveVerificationRecords(report, organizationId);
  for (const record of records) {
    const written = await persistProviderVerification(admin, record);
    record.id = written.id;
  }
  return records;
}

export async function resolveVerificationOrganizationId(admin: DurableAdmin): Promise<string | null> {
  const fromEnv = process.env.INFINITY_PROVIDER_VERIFICATION_ORG_ID?.trim();
  if (fromEnv && isDurableOrganizationId(fromEnv)) return fromEnv;
  const query = admin.from("organizations").select("id") as {
    limit: (count: number) => PromiseLike<{ data: Array<{ id?: string }> | null; error: { message?: string } | null }>;
  };
  const result = await query.limit(1);
  const id = result.data?.[0]?.id;
  return id && isDurableOrganizationId(id) ? id : null;
}

export async function persistLiveVerificationIfPossible(
  report: PersistableLiveReport,
): Promise<{ persisted: boolean; rowCount: number }> {
  try {
    const admin = createAdminClient() as unknown as DurableAdmin;
    const organizationId = await resolveVerificationOrganizationId(admin);
    if (!organizationId) return { persisted: false, rowCount: 0 };
    const rows = await persistLiveVerificationDurable(admin, report, organizationId);
    return { persisted: true, rowCount: rows.length };
  } catch {
    return { persisted: false, rowCount: 0 };
  }
}
