import { createClient } from "@/lib/supabase/server";

export type OperatorOrgContext = {
  userId: string;
  organizationId: string;
};

export async function getOperatorOrgContext(): Promise<OperatorOrgContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!membership) return null;
  return { userId: user.id, organizationId: membership.organization_id };
}
