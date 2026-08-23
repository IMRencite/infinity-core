import { redirect } from "next/navigation";
import { InfinityHqExperience } from "@/components/dashboard/operator-console/infinity-hq-experience";
import { getOperatorOrgContext } from "@/lib/infinity/operator-console/auth";
import { parseInspectionQuery } from "@/lib/infinity/operator-console/inspection-context";

type Props = {
  searchParams?: Promise<{ inspect?: string | string[] }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const orgContext = await getOperatorOrgContext();
  if (!orgContext) redirect("/login");
  const params = searchParams ? await searchParams : {};
  const rawInspect = Array.isArray(params.inspect) ? params.inspect[0] : params.inspect;
  const inspect = parseInspectionQuery(rawInspect);
  const preferredVentureId = inspect?.entityType === "VENTURE" ? inspect.entityId : null;

  return (
    <div className="mx-auto w-full max-w-[100rem] text-zinc-200">
      <InfinityHqExperience ventureId={preferredVentureId} />
    </div>
  );
}
