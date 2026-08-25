import { redirect } from "next/navigation";
import { getOperatorOrgContext } from "@/lib/infinity/operator-console/auth";

/**
 * Founder Idea Lab pages compile against HEAD auth (`OperatorOrgContext | null`)
 * and also tolerate the newer tagged result shape if present in a dirty tree.
 */
export async function requireFounderIdeaOrg(): Promise<{ userId: string; organizationId: string }> {
  const result = await getOperatorOrgContext();
  if (result && typeof result === "object" && "organizationId" in result) {
    const org = result as { userId?: unknown; organizationId?: unknown };
    if (typeof org.userId === "string" && typeof org.organizationId === "string") {
      return { userId: org.userId, organizationId: org.organizationId };
    }
  }
  if (result && typeof result === "object" && "status" in result) {
    const tagged = result as { status?: unknown; context?: { userId?: unknown; organizationId?: unknown } };
    if (
      tagged.status === "ok" &&
      typeof tagged.context?.userId === "string" &&
      typeof tagged.context?.organizationId === "string"
    ) {
      return { userId: tagged.context.userId, organizationId: tagged.context.organizationId };
    }
  }
  redirect("/login");
}
