import { redirect } from "next/navigation";
import { InfinityHqExperience } from "@/components/dashboard/operator-console/infinity-hq-experience";
import { getOperatorOrgContext } from "@/lib/infinity/operator-console/auth";

export default async function DashboardPage() {
  const orgContext = await getOperatorOrgContext();
  if (!orgContext) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-[100rem] text-zinc-200">
      <InfinityHqExperience />
    </div>
  );
}
