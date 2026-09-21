import { createAdminClient } from "@/lib/supabase/admin";
import { requireOperatorOrgContext } from "@/lib/infinity/operator-console/require-org-context";
import { loadHqCanonicalOperatingProjection } from "@/lib/infinity/hq-canonical-projection/load";
import { projectOperationsRoom } from "@/lib/infinity/hq-information-architecture/operations-room";
import { projectWorkerVisualState } from "@/lib/infinity/hq-live-activity";
import { HqOperationsRoom } from "@/components/dashboard/hq-operations-room";
import { fetchCanonicalProductionOperatingState } from "@/lib/infinity/growth-engine/hq-runtime-binding";
import { RUNTIME_UNREACHABLE } from "@/lib/infinity/growth-engine/hq-runtime-projection";

export default async function HqOperationsPage() {
  const org = await requireOperatorOrgContext();
  const projection = await loadHqCanonicalOperatingProjection(createAdminClient(), org.organizationId);
  const productionRead = await fetchCanonicalProductionOperatingState();
  const operations = projectOperationsRoom(productionRead.ok ? productionRead.state : RUNTIME_UNREACHABLE);
  return (
    <HqOperationsRoom
      projection={projection}
      operationsDetail={{
        workers: operations.workers.map(projectWorkerVisualState),
        currentWork: operations.department.currentTask,
        recentOutputs: (operations.department.artifacts ?? []).map((artifact) => artifact.label),
      }}
    />
  );
}
