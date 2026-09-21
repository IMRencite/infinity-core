import { redirect } from "next/navigation";
import { DailyImprovementSection } from "@/components/dashboard/daily-improvement-section";
import { IntelligencePortfolioSection } from "@/components/dashboard/intelligence-portfolio-section";
import { projectDailyImprovementHq } from "@/lib/infinity/daily-improvement-engine";
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
  const dailyImprovement = projectDailyImprovementHq();

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-white sm:text-[2.125rem]">
          Performance Intelligence & Continuous Improvement
        </h1>
        <p className="mt-2 text-[15px] font-medium text-zinc-300">
          {membership.organizations.name}
        </p>
        <p className="mt-1 text-[13px] text-zinc-500">
          Observes the whole OS, benchmarks it against evidence, and routes
          improvements back to the system that owns them. It does not become a new silo.
        </p>
      </header>

      <DailyImprovementSection view={dailyImprovement} />

      <IntelligencePortfolioSection
        summary={summary}
        recentEvidence={recentEvidence}
        recentLessons={recentLessons}
      />
    </div>
  );
}
