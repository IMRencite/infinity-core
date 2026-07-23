import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type OrganizationMembership = {
  organization_id: string;
  organizations: {
    id: string;
    name: string;
  } | null;
};

export default async function DashboardPage() {
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

  const organization = membership.organizations;
  const organizationId = membership.organization_id;

  // Counts query legacy tables: projects → Initiatives, companies → Ventures (UI labels only).
  const [
    { count: projectsCount, error: projectsError },
    { count: companiesCount, error: companiesError },
    { count: membersCount, error: membersError },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    supabase
      .from("companies")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    supabase
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
  ]);

  const summaryCards = [
    { label: "Initiatives", value: projectsError ? "—" : String(projectsCount ?? 0) },
    { label: "Ventures", value: companiesError ? "—" : String(companiesCount ?? 0) },
    {
      label: "Organization Members",
      value: membersError ? "—" : String(membersCount ?? 0),
    },
  ];

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-white sm:text-[2.125rem]">
          Welcome to Infinity
        </h1>
        <p className="mt-2 text-[15px] font-medium text-zinc-300">
          {organization.name}
        </p>
        <p className="mt-1 text-[13px] text-zinc-500">
          Your command center for initiatives, ventures, and operations.
        </p>
      </header>

      <section aria-label="Summary">
        <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Overview
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] px-4 py-4"
            >
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">
                {card.label}
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                {card.value}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
