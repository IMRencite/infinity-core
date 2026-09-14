import { InfinityHqExperience } from "@/components/dashboard/operator-console/infinity-hq-experience";
import { resolvePreferredVentureIdFromInspect } from "@/lib/infinity/hq-inspection-identity/aliases";
import { requireOperatorOrgContext } from "@/lib/infinity/operator-console/require-org-context";
import { parseInspectionQuery } from "@/lib/infinity/operator-console/inspection-model";

type Props = {
  searchParams?: Promise<{ inspect?: string | string[] }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  await requireOperatorOrgContext();
  const params = searchParams ? await searchParams : {};
  const rawInspect = Array.isArray(params.inspect) ? params.inspect[0] : params.inspect;
  const inspect = parseInspectionQuery(rawInspect);
  const preferredVentureId = resolvePreferredVentureIdFromInspect(inspect);

  return (
    <div className="mx-auto w-full min-w-0 max-w-full text-zinc-200" data-hq-founder-route="/dashboard">
      <InfinityHqExperience ventureId={preferredVentureId} />
    </div>
  );
}
