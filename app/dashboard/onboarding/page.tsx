import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { userHasOrganization } from "@/app/dashboard/onboarding/actions";
import { CreateOrganizationForm } from "@/components/dashboard/create-organization-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const hasOrganization = await userHasOrganization(supabase, user.id);

  if (hasOrganization) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <header className="mb-6">
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-white sm:text-[2rem]">
          Create your organization
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
          Infinity runs inside an organization. Create your first organization
          to continue.
        </p>
      </header>

      <div className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] p-6">
        <CreateOrganizationForm />
      </div>
    </div>
  );
}
