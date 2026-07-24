import { redirect } from "next/navigation";
import { IntelligencePortfolioSection } from "@/components/dashboard/intelligence-portfolio-section";
import {
  calculateIntelligenceSummary,
  listRecentEvidence,
  listRecentLessons,
} from "@/lib/infinity/intelligence";
import { createClient } from "@/lib/supabase/server";

type OrganizationMembership = {
  organization_id: string;
  organizations: {
    id: string;
    name: string;
  } | null;
};

export default async function IntelligencePage() {
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

  const [summary, recentEvidence, recentLessons] = await Promise.all([
    calculateIntelligenceSummary(supabase, organizationId),
    listRecentEvidence(supabase, organizationId, 10),
    listRecentLessons(supabase, organizationId, 10),
  ]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-white sm:text-[2.125rem]">
          Intelligence
        </h1>
        <p className="mt-2 text-[15px] font-medium text-zinc-300">
          {membership.organizations.name}
        </p>
        <p className="mt-1 text-[13px] text-zinc-500">
          Read-only view of evidence, claims, knowledge, memory, lessons, and
          procedures. Autonomous observation and external research are not active
          yet.
        </p>
      </header>

      <IntelligencePortfolioSection
        summary={summary}
        recentEvidence={recentEvidence}
        recentLessons={recentLessons}
      />
    </div>
  );
}
