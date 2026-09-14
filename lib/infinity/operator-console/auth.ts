import { createClient } from "@/lib/supabase/server";
import { lookupOrganizationMembership } from "@/lib/infinity/operator-console/membership-lookup";
import {
  HQ_LOCAL_PROOF_USER_ID,
  isLocalHqObservabilityProofSession,
  localHqProofOrganizationId,
} from "@/lib/infinity/operator-console/local-hq-proof";

export type OperatorOrgContext = {
  userId: string;
  organizationId: string;
};

export type OperatorOrgContextResult =
  | { status: "ok"; context: OperatorOrgContext }
  | { status: "no_membership" }
  | { status: "error"; code: string | null; message: string };

export async function getOperatorOrgContext(): Promise<OperatorOrgContextResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    if (await isLocalHqObservabilityProofSession()) {
      return {
        status: "ok",
        context: {
          userId: HQ_LOCAL_PROOF_USER_ID,
          organizationId: localHqProofOrganizationId(),
        },
      };
    }
    return { status: "no_membership" };
  }

  const membership = await lookupOrganizationMembership(supabase, user.id);

  if (membership.status === "error") {
    return {
      status: "error",
      code: membership.code,
      message: membership.message,
    };
  }

  if (!membership.hasMembership || !membership.organizationId) {
    return { status: "no_membership" };
  }

  return {
    status: "ok",
    context: {
      userId: user.id,
      organizationId: membership.organizationId,
    },
  };
}

/** @deprecated Use getOperatorOrgContext() for explicit error semantics. */
export async function getOperatorOrgContextLegacy(): Promise<OperatorOrgContext | null> {
  const result = await getOperatorOrgContext();
  if (result.status === "ok") return result.context;
  return null;
}
