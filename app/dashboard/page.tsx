import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { userHasOrganization } from "@/app/dashboard/onboarding/actions";

const summaryCards = [
  { label: "Organizations", value: "0" },
  { label: "Projects", value: "0" },
  { label: "Companies", value: "0" },
  { label: "AI Agents", value: "0" },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const hasOrganization = await userHasOrganization(supabase, user.id);

  if (!hasOrganization) {
    redirect("/dashboard/onboarding");
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-white sm:text-[2.125rem]">
          Welcome to Infinity
        </h1>
        <p className="mt-2 text-[13px] text-zinc-500">
          Your command center for ventures, projects, and operations.
        </p>
      </header>

      <section aria-label="Summary">
        <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Overview
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
