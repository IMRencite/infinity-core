import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  lookupOrganizationMembership,
  membershipUnavailableUserMessage,
} from "@/lib/infinity/operator-console/membership-lookup";
import { CreateOrganizationForm } from "@/components/dashboard/create-organization-form";
import { OnboardingUnavailableState } from "@/components/dashboard/onboarding-unavailable-state";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const membership = await lookupOrganizationMembership(supabase, user.id);

  if (membership.status === "error") {
    return (
      <OnboardingUnavailableState
        message={membershipUnavailableUserMessage(membership.code)}
        debugCode={
          process.env.NODE_ENV === "development" ? membership.code : undefined
        }
      />
    );
  }

  if (membership.hasMembership) {
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
