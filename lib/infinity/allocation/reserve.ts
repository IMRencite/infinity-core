import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { recordEngineEvent } from "../events";
import type {
  ReserveAllocationResourcesInput,
  ReserveAllocationResourcesResult,
  ResourceReservation,
} from "./types";

export async function reserveAllocationResources(
  admin: AdminSupabaseClient,
  input: ReserveAllocationResourcesInput,
): Promise<ReserveAllocationResourcesResult> {
  const reservationKey =
    input.reservationKey ?? `reserve:${input.allocationProposalId}`;

  const { data: existingReservations, error: existingError } = await admin
    .from("resource_reservations")
    .select("*")
    .eq("organization_id", input.organizationId)
    .like("reservation_key", `${reservationKey}:%`);

  if (existingError) {
    throw new Error(`Failed to check existing reservations: ${existingError.message}`);
  }

  if (existingReservations && existingReservations.length > 0) {
    const { data: proposal } = await admin
      .from("allocation_proposals")
      .select("status")
      .eq("id", input.allocationProposalId)
      .eq("organization_id", input.organizationId)
      .maybeSingle();

    return {
      alreadyReserved: true,
      reservations: existingReservations,
      proposalStatus: proposal?.status ?? "reserved",
    };
  }

  const { data: reservations, error } = await admin.rpc("reserve_allocation_resources", {
    p_organization_id: input.organizationId,
    p_proposal_id: input.allocationProposalId,
    p_reservation_key: reservationKey,
  });

  if (error) {
    await recordEngineEvent(admin, {
      organizationId: input.organizationId,
      engineName: "allocation_engine",
      eventType: "allocation.failed",
      entityType: "allocation_proposal",
      entityId: input.allocationProposalId,
      message: `Allocation reservation failed: ${error.message}`,
      payload: {
        allocation_proposal_id: input.allocationProposalId,
        error: error.message,
      },
    });

    throw new Error(`Failed to reserve allocation resources: ${error.message}`);
  }

  const reservationRows = (reservations ?? []) as ResourceReservation[];

  await recordEngineEvent(admin, {
    organizationId: input.organizationId,
    engineName: "allocation_engine",
    eventType: "allocation.reserved",
    entityType: "allocation_proposal",
    entityId: input.allocationProposalId,
    message: "Allocation resources reserved",
    payload: {
      allocation_proposal_id: input.allocationProposalId,
      reservation_count: reservationRows.length,
    },
  });

  return {
    alreadyReserved: false,
    reservations: reservationRows,
    proposalStatus: "reserved",
  };
}

export async function releaseAllocationResources(
  admin: AdminSupabaseClient,
  organizationId: string,
  allocationProposalId: string,
): Promise<void> {
  const { error } = await admin.rpc("release_allocation_resources", {
    p_organization_id: organizationId,
    p_proposal_id: allocationProposalId,
  });

  if (error) {
    throw new Error(`Failed to release allocation resources: ${error.message}`);
  }

  await recordEngineEvent(admin, {
    organizationId,
    engineName: "allocation_engine",
    eventType: "allocation.released",
    entityType: "allocation_proposal",
    entityId: allocationProposalId,
    message: "Allocation resources released",
  });
}
