import { redirect } from "next/navigation";
import { getOperatorOrgContext } from "@/lib/infinity/operator-console/auth";
import { workspaceUnavailablePath } from "@/lib/infinity/operator-console/workspace-unavailable-path";

/**
 * Authenticated dashboard routes must not send users back to /login when the
 * session is valid but organization membership is missing.
 */
export async function requireOperatorOrgContext() {
  const result = await getOperatorOrgContext();

  if (result.status === "error") {
    redirect(workspaceUnavailablePath(result.code));
  }

  if (result.status === "no_membership") {
    redirect("/dashboard/onboarding");
  }

  return result.context;
}
