import type { OperatorVentureListItem } from "./types";
import {
  classifyVentureForPortfolio,
  isOperatorAllocatableVenture,
  type VentureAssemblyRow,
} from "./portfolio/venture-classification";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export { isOperatorAllocatableVenture };

export function assemblyRowFromListItem(item: OperatorVentureListItem): VentureAssemblyRow {
  return {
    id: item.ventureAssemblyId,
    mission_id: item.missionId,
    status: item.status,
    venture_blueprint_id: item.blueprintId ?? null,
    identity_package: {
      workingName: item.ventureName,
      opportunityCandidateId: item.candidateId ?? null,
    },
    manifest: item.candidateId ? { opportunityCandidateId: item.candidateId } : null,
    idempotency_key: item.idempotencyKey ?? null,
  };
}

export function isOperatorAllocatableVentureListItem(item: OperatorVentureListItem): boolean {
  if (typeof item.operatorAllocatable === "boolean") return item.operatorAllocatable;
  return isOperatorAllocatableVenture(assemblyRowFromListItem(item));
}

export function filterTreasuryAllocatableVentures(
  items: OperatorVentureListItem[],
): OperatorVentureListItem[] {
  return items.filter(
    (item) => UUID_RE.test(item.ventureAssemblyId) && isOperatorAllocatableVentureListItem(item),
  );
}

export function classifyOperatorVentureListItem(item: OperatorVentureListItem) {
  if (item.exclusionReason && typeof item.operatorAllocatable === "boolean") {
    return {
      includeInPortfolio: item.operatorAllocatable,
      exclusionReason: item.exclusionReason,
      isTestFixture: !item.operatorAllocatable,
    };
  }
  return classifyVentureForPortfolio(assemblyRowFromListItem(item));
}
