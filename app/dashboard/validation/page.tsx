import { redirect } from "next/navigation";
import { ValidationPortfolioSection } from "@/components/dashboard/validation-portfolio-section";
import {
  calculateValidationSummary,
  listValidationRuns,
} from "@/lib/infinity/validation";
import { createClient } from "@/lib/supabase/server";

type OrganizationMembership = {
  organization_id: string;
  organizations: {
    id: string;
    name: string;
  } | null;
};

export default async function ValidationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select(
      `
        organization_id,
        organizations (
          id,
          name
        )
      `,
    )
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle<OrganizationMembership>();

  if (membershipError || !membership?.organizations) {
    redirect("/dashboard/onboarding");
  }

  const organizationId = membership.organization_id;

  const [summary, runs] = await Promise.all([
    calculateValidationSummary(supabase, organizationId),
    listValidationRuns(supabase, organizationId, 20),
  ]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-white sm:text-[2.125rem]">
          Validation
        </h1>
        <p className="mt-2 text-[15px] font-medium text-zinc-300">
          {membership.organizations.name}
        </p>
        <p className="mt-1 text-[13px] text-zinc-500">
          Read-only deterministic validation results. Proves or disproves assumptions before
          planning. No LLM, external research, venture creation, or asset creation.
        </p>
      </header>

      <ValidationPortfolioSection summary={summary} runs={runs} />
    </div>
  );
}
