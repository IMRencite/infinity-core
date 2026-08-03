import type { VentureBlueprintStatus, VentureTemplateType } from "../constants";

export type VentureBlueprint = {
  id: string;
  ventureType: VentureTemplateType;
  businessModel: string;
  industry: string;
  name: string;
  description: string;
  targetAudience: string;
  customerPersona: string;
  valueProposition: string;
  revenueModel: string;
  marketingChannels: string[];
  requiredAssets: string[];
  requiredWorkers: string[];
  requiredContent: string[];
  requiredProducts: string[];
  requiredServices: string[];
  estimatedTimeline: string;
  estimatedBudget: string;
  expectedROI: string;
  priority: number;
  status: VentureBlueprintStatus;
  createdAt: string;
};

export type PersistedVentureBlueprint = {
  id: string;
  organizationId: string;
  opportunityId: string;
  ventureType: VentureTemplateType;
  templateKey: string;
  templateVersion: string;
  schemaVersion: string;
  status: VentureBlueprintStatus;
  blueprint: VentureBlueprint;
  idempotencyKey: string;
  createdAt: string;
};
