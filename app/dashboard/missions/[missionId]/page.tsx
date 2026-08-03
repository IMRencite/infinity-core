import { notFound, redirect } from "next/navigation";
import { MissionInspectorView } from "@/components/dashboard/hq/mission-inspector";
import { loadMissionInspector } from "@/lib/infinity/hq/mission-inspector";
import { createClient } from "@/lib/supabase/server";

type OrganizationMembership = {
  organization_id: string;
};

export default async function MissionInspectorPage({
  params,
}: {
  params: Promise<{ missionId: string }>;
}) {
  const { missionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle<OrganizationMembership>();

  if (!membership) {
    redirect("/dashboard/onboarding");
  }

  const data = await loadMissionInspector(supabase, membership.organization_id, missionId);
  if (!data) {
    notFound();
  }

  return <MissionInspectorView missionId={missionId} data={data} />;
}
