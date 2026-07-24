import type { Tables } from "@/lib/supabase/database.types";

export type ResourcePool = Tables<"resource_pools">;
export type AllocationProposal = Tables<"allocation_proposals">;
export type ResourceReservation = Tables<"resource_reservations">;

export type AllocationSummary = {
  proposedCount: number;
  policyBlockedCount: number;
  awaitingApprovalCount: number;
  approvedOrReservedCount: number;
  poolCount: number;
  totalAvailableCapacity: number;
};

export type ProposeAllocationInput = {
  organizationId: string;
  opportunityId: string;
  evaluationId: string;
  allocationType: string;
  correlationId?: string | null;
  missionId?: string | null;
  proposalKey?: string | null;
};

export type ProposeAllocationResult = {
  alreadyProposed: boolean;
  proposal: AllocationProposal;
  status: string;
};

export type ReserveAllocationResourcesInput = {
  organizationId: string;
  allocationProposalId: string;
  reservationKey?: string | null;
};

export type ReserveAllocationResourcesResult = {
  alreadyReserved: boolean;
  reservations: ResourceReservation[];
  proposalStatus: string;
};
