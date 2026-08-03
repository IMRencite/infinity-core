import { redirect } from "next/navigation";
import { InfinityHqView } from "@/components/dashboard/hq/infinity-hq-view";
import {
  loadInfinityHqSnapshot,
  sortExecutiveQueue,
  type ExecutiveQueueSort,
} from "@/lib/infinity/hq/queries";
import { loadWorkerCapabilityDiagnostics } from "@/lib/infinity/workers/diagnostics";
import { syncFoundingMissionContent } from "@/lib/infinity/orchestration";
import { createClient } from "@/lib/supabase/server";

type OrganizationMembership = {
  organization_id: string;
  organizations: {
    id: string;
    name: string;
  } | null;
};

const QUEUE_SORTS: ExecutiveQueueSort[] = [
  "priority",
  "oldest",
  "newest",
  "blocked",
  "planning_eligible",
];

function parseQueueSort(value: string | undefined): ExecutiveQueueSort {
  if (value && QUEUE_SORTS.includes(value as ExecutiveQueueSort)) {
    return value as ExecutiveQueueSort;
  }
  return "priority";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    eventSeverity?: string;
    missionStage?: string;
    queueSort?: string;
  }>;
}) {
  const params = await searchParams;
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

  await syncFoundingMissionContent(supabase, organizationId);

  const queueSort = parseQueueSort(params.queueSort);

  let snapshot = await loadInfinityHqSnapshot(supabase, organizationId, organization.name, {
    eventSeverity: params.eventSeverity ?? null,
    missionStage: params.missionStage ?? null,
  });

  snapshot = {
    ...snapshot,
    executiveQueue: sortExecutiveQueue(snapshot.executiveQueue, queueSort),
  };

  const workerDiagnostics = await loadWorkerCapabilityDiagnostics(supabase, organizationId);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-white sm:text-[2rem]">
          Infinity HQ
        </h1>
        <p className="mt-2 text-[15px] font-medium text-zinc-300">{organization.name}</p>
        <p className="mt-1 max-w-3xl text-[13px] text-zinc-500">
          Command center observability — missions, pipelines, health, and alerts. Read-only by
          default; bounded runtime controls live on{" "}
          <a href="/dashboard/runtime" className="text-sky-400 hover:underline">
            Mission Runtime
          </a>
          .
          {snapshot.activeMissionTitle ? (
            <>
              {" "}
              Active mission:{" "}
              <span className="text-zinc-400">{snapshot.activeMissionTitle}</span>
            </>
          ) : null}
        </p>
      </header>

      <InfinityHqView
        snapshot={snapshot}
        queueSort={queueSort}
        eventSeverity={params.eventSeverity}
        missionStage={params.missionStage}
        workerDiagnostics={workerDiagnostics}
      />
    </div>
  );
}
