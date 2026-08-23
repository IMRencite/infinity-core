import type { VentureSystemsBuildContract } from "@/lib/infinity/venture-systems-architecture/types";
import type { BoundVentureSystemsBuildInput } from "./types";

export function bindVentureSystemsBuildInput(input: {
  ventureId: string;
  companyId?: string | null;
  missionId?: string | null;
  buildContractId?: string | null;
  ventureSystemsBuildContractId?: string | null;
  contract: VentureSystemsBuildContract;
}): BoundVentureSystemsBuildInput {
  const ventureId = input.ventureId.trim();
  if (!ventureId) {
    throw new Error("VENTURE_SYSTEMS_CONTRACT_MISSING: ventureId is required");
  }
  return {
    ventureId,
    companyId: input.companyId ?? null,
    missionId: input.missionId ?? null,
    buildContractId: input.buildContractId ?? null,
    ventureSystemsBuildContractId: input.ventureSystemsBuildContractId?.trim() || `vsa:${ventureId}`,
    contract: input.contract,
  };
}

export function paymentArchitectureKind(
  contract: VentureSystemsBuildContract,
): string | null {
  const kind = contract.paymentArchitecture?.architectureKind;
  return typeof kind === "string" && kind.trim() ? kind : null;
}

export function paymentsFamilyRequired(contract: VentureSystemsBuildContract): boolean {
  return contract.systemRequirements.some((item) => item.family === "PAYMENTS" && item.required);
}
