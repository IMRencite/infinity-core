import { redirect } from "next/navigation";
import { ExecutivePortfolioSection } from "@/components/dashboard/executive-portfolio-section";
import {
  listEnterpriseQueueEntries,
  listExecutiveDecisions,
} from "@/lib/infinity/executive";
import { createClient } from "@/lib/supabase/server";

type OrganizationMembership = {
  organization_id: string;
  organizations: {
    id: string;
    name: string;
  } | null;
};

export default async function ExecutivePage() {
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

  const [decisions, queue] = await Promise.all([
    listExecutiveDecisions(supabase, organizationId, 15),
    listEnterpriseQueueEntries(supabase, organizationId, 15),
  ]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-white sm:text-[2.125rem]">
          Executive
        </h1>
        <p className="mt-2 text-[15px] font-medium text-zinc-300">
          {membership.organizations.name}
        </p>
        <p className="mt-1 text-[13px] text-zinc-500">
          Read-only Executive decisions and enterprise queue after deterministic reasoning.
          Development trigger — production Executive cycles run autonomously via Command.
        </p>
      </header>

      <ExecutivePortfolioSection decisions={decisions} queue={queue} />
    </div>
  );
}
