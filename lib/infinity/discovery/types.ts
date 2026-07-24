import type { Tables } from "@/lib/supabase/database.types";

export type DiscoveryProvider = Tables<"discovery_provider_registry">;
export type DiscoverySignal = Tables<"discovery_signals">;
export type OpportunityReview = Tables<"opportunity_reviews">;
export type OpportunityDecisionRecord = Tables<"opportunity_decisions">;

export type DiscoveryContext = {
  organizationId: string;
  scanId: string;
  providerId?: string | null;
  correlationId?: string | null;
  engineJobId?: string | null;
  workerRunId?: string | null;
  missionId?: string | null;
  metadata?: Record<string, unknown>;
};

export type DeterministicDiscoveryResult = {
  alreadyRecorded: boolean;
  providerId: string;
  signalId: string;
  opportunityId: string;
  evidenceId: string;
  scoreId: string;
  reviewId: string;
  decisionId: string;
  opportunitiesDiscovered: number;
};
