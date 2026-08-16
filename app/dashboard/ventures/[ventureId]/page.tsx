import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperatorOrgContext } from "@/lib/infinity/operator-console/auth";
import { loadOperatorVentureSnapshot } from "@/lib/infinity/operator-console";
import { VentureOperatorConsole } from "@/components/dashboard/operator-console/venture-operator-console";

type Props = { params: Promise<{ ventureId: string }> };

export default async function VentureOperatorPage({ params }: Props) {
  const { ventureId } = await params;
  const orgContext = await getOperatorOrgContext();
  if (!orgContext) redirect("/login");

  const admin = createAdminClient();
  const snapshot = await loadOperatorVentureSnapshot(admin, orgContext.organizationId, ventureId);
  if (!snapshot) notFound();

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 text-zinc-200 md:p-6">
      <Link href="/dashboard/ventures" className="text-xs text-zinc-500 hover:text-zinc-300">
        ← Ventures
      </Link>
      <VentureOperatorConsole ventureId={ventureId} initialSnapshot={snapshot} />
    </div>
  );
}
