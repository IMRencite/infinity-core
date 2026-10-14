import {
  evaluateProductionPrintArtworkIdentityQc,
  type ProductionArtworkIdentityChain,
  PRODUCTION_ARTWORK_IDENTITY_CHAIN_V1,
} from "./production-artwork-identity-chain-v1.ts";

export const PRODUCTION_PRINT_ARTWORK_IDENTITY_QC_V1 = "PRODUCTION_PRINT_ARTWORK_IDENTITY_QC_V1" as const;

/** Fail closed when approved revision cannot be proven through production master → payload. */
export function productionPrintArtworkIdentityQcFromChain(
  chain: ProductionArtworkIdentityChain | null,
): "PASS" | "FAIL" {
  if (!chain || chain.version !== PRODUCTION_ARTWORK_IDENTITY_CHAIN_V1) return "FAIL";
  const approvedHash = chain.founder_approved_canonical_art.sha256;
  const masterHash = chain.production_master.sha256;
  const payloadHash = chain.provider_payload?.sha256 ?? null;
  const lineageProven =
    Boolean(approvedHash && masterHash) &&
    chain.founder_approved_canonical_art.approved &&
    chain.production_master.role === "PRODUCTION_PRINT_MASTER";
  const hashGate = evaluateProductionPrintArtworkIdentityQc({
    founder_approved_hash: approvedHash,
    production_master_hash: masterHash,
    provider_payload_hash: payloadHash,
    lineage_proven: lineageProven,
  });
  if (hashGate === "FAIL") return "FAIL";
  if (approvedHash === masterHash) return "PASS";
  return lineageProven ? "PASS" : "FAIL";
}

export const COMMERCE_ART_INVARIANTS = {
  PROVIDER_DOWNLOADABLE_NOT_FOUNDER_APPROVED:
    "PROVIDER_DOWNLOADABLE != FOUNDER_APPROVED",
  HIGH_RESOLUTION_NOT_CORRECT_REVISION: "HIGH_RESOLUTION != CORRECT_ART_REVISION",
  PROVIDER_VALIDATED_NOT_VISUALLY_APPROVED: "PROVIDER_VALIDATED != VISUALLY_APPROVED",
  PRODUCTION_ACCEPTED_NOT_ARTWORK_IDENTITY_PROVEN:
    "PRODUCTION_ACCEPTED != ARTWORK_IDENTITY_PROVEN",
  PRINT_AREA_CORRECT_NOT_DESIGN_REVISION_CORRECT:
    "PRINT_AREA_CORRECT != DESIGN_REVISION_CORRECT",
  STORE_ASSET_NOT_PRODUCTION_PRINT_MASTER: "STORE_ASSET != PRODUCTION_PRINT_MASTER",
} as const;
