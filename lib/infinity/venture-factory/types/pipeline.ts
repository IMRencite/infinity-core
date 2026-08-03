import type { PersistedVentureBlueprint } from "./blueprint";

export type VentureFactoryPipelineContext = {
  organizationId: string;
  opportunityId: string;
  correlationId?: string | null;
  templateOverride?: string | null;
};

export type VentureFactoryPipelineResult = {
  alreadyExists: boolean;
  blueprint: PersistedVentureBlueprint;
};
