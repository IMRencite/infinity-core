import { freshnessFromCompletedAt, type CommercialProviderVerification } from "../probes/status";

type LooseAdmin = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (
          column: string,
          opts: { ascending: boolean },
        ) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
      };
    };
  };
};

type VerificationRow = {
  id: string;
  organization_id: string;
  provider_category: CommercialProviderVerification["providerCategory"];
  provider_key: string;
  environment: CommercialProviderVerification["environment"];
  mode: "READ_ONLY";
  status: CommercialProviderVerification["status"];
  capabilities_checked: string[] | null;
  started_at: string;
  completed_at: string;
  freshness: string | null;
  failure_code: CommercialProviderVerification["failureCode"];
  failure_reason: string | null;
  mutation_authority: "LOCKED";
  metadata: Record<string, string | number | boolean | null> | null;
};

function sanitizeMetadata(input: Record<string, string | number | boolean | null> | null): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    if (/secret|password|authorization|api_key|credential/i.test(key) && key !== "tokenScope") continue;
    if (typeof value === "string" && /(sk_live_|sk_test_|rk_live_|rk_test_|whsec_|vcp_|Bearer )/i.test(value)) continue;
    out[key] = value;
  }
  return out;
}

/** HQ reads persisted verification only. Never probes providers. Fail closed if the table is absent. */
export async function loadPersistedProviderVerifications(
  admin: LooseAdmin,
  organizationId: string,
): Promise<CommercialProviderVerification[]> {
  try {
    const result = await admin
      .from("commercial_provider_verifications")
      .select(
        "id,organization_id,provider_category,provider_key,environment,mode,status,capabilities_checked,started_at,completed_at,freshness,failure_code,failure_reason,mutation_authority,metadata",
      )
      .eq("organization_id", organizationId)
      .order("completed_at", { ascending: false });
    if (result.error || !Array.isArray(result.data)) return [];
    const latest = new Map<CommercialProviderVerification["providerCategory"], CommercialProviderVerification>();
    for (const raw of result.data as VerificationRow[]) {
      if (latest.has(raw.provider_category)) continue;
      latest.set(raw.provider_category, {
        id: raw.id,
        organizationId: raw.organization_id,
        providerCategory: raw.provider_category,
        providerKey: raw.provider_key,
        environment: raw.environment,
        mode: "READ_ONLY",
        status: raw.status,
        capabilitiesChecked: raw.capabilities_checked ?? [],
        startedAt: raw.started_at,
        completedAt: raw.completed_at,
        freshness: freshnessFromCompletedAt(raw.completed_at),
        failureCode: raw.failure_code,
        failureReason: raw.failure_reason,
        metadata: sanitizeMetadata(raw.metadata),
        mutationAuthority: "LOCKED",
      });
    }
    return [...latest.values()];
  } catch {
    return [];
  }
}
