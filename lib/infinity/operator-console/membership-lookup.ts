import type { SupabaseClient } from "@supabase/supabase-js";

export type OrganizationMembershipLookup =
  | { status: "ok"; hasMembership: boolean; organizationId: string | null }
  | { status: "error"; code: string | null; message: string };

export class OrganizationMembershipUnavailableError extends Error {
  readonly code: string | null;

  constructor(code: string | null, message: string) {
    super(message);
    this.name = "OrganizationMembershipUnavailableError";
    this.code = code;
  }
}

export function isInfrastructureMembershipError(code: string | null): boolean {
  return code === "PGRST002" || code === "PGRST003";
}

export function membershipUnavailableUserMessage(code: string | null): string {
  if (isInfrastructureMembershipError(code)) {
    return "Infinity could not reach the database API to load your workspace. Please try again in a moment.";
  }
  return "We couldn't load your workspace information. Please try again.";
}

function logMembershipLookupError(code: string | null, message: string) {
  if (process.env.AUTH_DEBUG === "true" || process.env.NODE_ENV === "development") {
    console.error("[AUTH] membership lookup error", { code, message });
  }
}

export async function lookupOrganizationMembership(
  supabase: SupabaseClient,
  userId: string,
): Promise<OrganizationMembershipLookup> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("id, organization_id")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (error) {
    logMembershipLookupError(error.code ?? null, error.message);
    return {
      status: "error",
      code: error.code ?? null,
      message: error.message,
    };
  }

  return {
    status: "ok",
    hasMembership: Boolean(data),
    organizationId: data?.organization_id ?? null,
  };
}
