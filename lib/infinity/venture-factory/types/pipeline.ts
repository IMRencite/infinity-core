import type { PersistedVentureBlueprint } from "./blueprint";
import type { VentureBackendContract } from "@/lib/infinity/venture-backend-architecture";
import type { VentureBackendImplementationMission } from "@/lib/infinity/venture-backend-architecture";

export type VentureFactoryPipelineContext = {
  organizationId: string;
  opportunityId: string;
  correlationId?: string | null;
  templateOverride?: string | null;
};

export type VentureFactoryPipelineResult = {
  alreadyExists: boolean;
  blueprint: PersistedVentureBlueprint;
  backendContract: VentureBackendContract;
  backendImplementationMission: VentureBackendImplementationMission | null;
  ventureSystemQc?: {
    inherited: true;
    manual_developer_step: false;
    contracts: readonly string[];
  };
  ventureBlogOs?: ReturnType<typeof import("@/lib/infinity/organic-growth-engine/blog-os").inheritVentureBlogBlueprintDefaults>;
};
