import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { runDiscoveryEnginePipeline } from "./run";

export { runDiscoveryEnginePipeline } from "./run";
export { persistDiscoveredOpportunity } from "./persist";

export async function runDiscoveryEnginePipelineForScan(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    scanId: string;
    correlationId?: string | null;
    engineJobId?: string | null;
    workerRunId?: string | null;
    providerIds?: string[];
    manualItems?: import("../types/provider").DiscoveryRawItem[];
  },
) {
  return runDiscoveryEnginePipeline(admin, {
    organizationId: input.organizationId,
    scanId: input.scanId,
    correlationId: input.correlationId,
    engineJobId: input.engineJobId,
    workerRunId: input.workerRunId,
    providerIds: input.providerIds ?? ["manual"],
    manualItems: input.manualItems,
  });
}
