import type { Tables } from "@/lib/supabase/database.types";

export type Asset = Tables<"assets">;
export type AssetRelationship = Tables<"asset_relationships">;
export type AssetMetric = Tables<"asset_metrics">;
export type AssetValuation = Tables<"asset_valuations">;

export type AssetSummary = {
  totalCount: number;
  activeCount: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  totalMonthlyRevenue: number;
  totalMonthlyOperatingCost: number;
  totalEstimatedValue: number;
  totalVerifiedValue: number;
};

export type RegisterAssetInput = {
  organizationId: string;
  name: string;
  assetType: string;
  description?: string | null;
  metadata?: Record<string, unknown>;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  status?: string;
  lifecycleStage?: string;
  ownershipType?: string;
  ventureId?: string | null;
  initiativeId?: string | null;
  parentAssetId?: string | null;
  correlationId?: string | null;
  executorId?: string;
};
