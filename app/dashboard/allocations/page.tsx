import { redirect } from "next/navigation";
import { AllocationsPortfolioSection } from "@/components/dashboard/allocations-portfolio-section";
import {
  calculateAllocationSummary,
  listAllocationProposals,
  listResourcePools,
} from "@/lib/infinity/allocation";
import { createClient } from "@/lib/supabase/server";

type OrganizationMembership = {
  organization_id: string;
  organizations: {
    id: string;
    name: string;
  } | null;
};

export default async function AllocationsPage() {
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

  const [summary, proposals, pools] = await Promise.all([
    calculateAllocationSummary(supabase, organizationId),
    listAllocationProposals(supabase, organizationId, 20),
    listResourcePools(supabase, organizationId),
  ]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-white sm:text-[2.125rem]">
          Allocations
        </h1>
        <p className="mt-2 text-[15px] font-medium text-zinc-300">
          {membership.organizations.name}
        </p>
        <p className="mt-1 text-[13px] text-zinc-500">
          Read-only view of allocation proposals, policy blocks, and resource pool
          capacity. Real financial accounts and unrestricted spending are not connected.
        </p>
      </header>

      <AllocationsPortfolioSection summary={summary} proposals={proposals} pools={pools} />
    </div>
  );
}
