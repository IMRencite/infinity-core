import { redirect } from "next/navigation";
import Link from "next/link";
import { InfinityHqView } from "@/components/dashboard/hq/infinity-hq-view";
import {
  loadInfinityHqSnapshot,
  sortExecutiveQueue,
  type ExecutiveQueueSort,
} from "@/lib/infinity/hq/queries";
import { loadWorkerCapabilityDiagnostics } from "@/lib/infinity/workers/diagnostics";
import { loadBuildFactoryDiagnostics } from "@/lib/infinity/build-factory/diagnostics";
import { syncFoundingMissionContent } from "@/lib/infinity/orchestration";
import { createClient } from "@/lib/supabase/server";

type OrganizationMembership = {
  organization_id: string;
  organizations: { id: string; name: string } | null;
};

const QUEUE_SORTS: ExecutiveQueueSort[] = ["priority", "oldest", "newest", "blocked", "planning_eligible"];

function parseQueueSort(value: string | undefined): ExecutiveQueueSort {
  if (value && QUEUE_SORTS.includes(value as ExecutiveQueueSort)) return value as ExecutiveQueueSort;
  return "priority";
}

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ eventSeverity?: string; missionStage?: string; queueSort?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select(`organization_id, organizations ( id, name )`)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle<OrganizationMembership>();

  if (membershipError || !membership?.organizations) redirect("/dashboard/onboarding");

  const organization = membership.organizations;
  const organizationId = membership.organization_id;
  await syncFoundingMissionContent(supabase, organizationId);

  const queueSort = parseQueueSort(params.queueSort);
  let snapshot = await loadInfinityHqSnapshot(supabase, organizationId, organization.name, {
    eventSeverity: params.eventSeverity ?? null,
    missionStage: params.missionStage ?? null,
  });
  snapshot = { ...snapshot, executiveQueue: sortExecutiveQueue(snapshot.executiveQueue, queueSort) };

  const workerDiagnostics = await loadWorkerCapabilityDiagnostics(supabase, organizationId);
  const buildDiagnostics = await loadBuildFactoryDiagnostics(supabase, organizationId, 8);

  return (
    <div>
      <header className="mb-6">
        <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300">← Infinity HQ</Link>
        <h1 className="mt-2 text-[1.75rem] font-semibold tracking-tight text-white">Portfolio Command</h1>
        <p className="mt-2 text-[15px] font-medium text-zinc-300">{organization.name}</p>
        <p className="mt-1 max-w-3xl text-[13px] text-zinc-500">
          Mission pipeline, executive queue, and org-wide observability. Venture-level operations live on{" "}
          <Link href="/dashboard" className="text-sky-400 hover:underline">Infinity HQ</Link>.
        </p>
      </header>
      <InfinityHqView
        snapshot={snapshot}
        queueSort={queueSort}
        eventSeverity={params.eventSeverity}
        missionStage={params.missionStage}
        workerDiagnostics={workerDiagnostics}
        buildDiagnostics={buildDiagnostics}
      />
    </div>
  );
}
