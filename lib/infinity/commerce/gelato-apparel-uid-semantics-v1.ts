/** Official Gelato apparel print-area UID semantics (gpr front-back encoding). */

export const GELATO_APPAREL_UID_SEMANTICS_V1 = "GELATO_APPAREL_UID_SEMANTICS_V1" as const;

export type GelatoApparelGprPlacement =
  | "FRONT_ONLY"
  | "BACK_ONLY"
  | "FRONT_AND_BACK"
  | "FRONT_BACK_INNER_LABEL"
  | "UNKNOWN";

export const GELATO_APPAREL_UID_SEMANTICS_ROOT_CAUSE =
  "Infinity mapped GELATO_CATALOG_BACK_ONLY_PRINT_PROFILE to gpr_4-4_gildan_5000; official Gelato semantics define gpr_4-4 as FRONT+BACK and gpr_0-4 as BACK_ONLY." as const;

/** Extract gpr token e.g. gpr_0-4_gildan_5000 from full productUid. */
export function extractGelatoGprToken(orderProductUid: string): string | null {
  const match = orderProductUid.match(/_(gpr_[0-4]-[0-4](?:_[a-z0-9_-]+)?)_/i);
  return match?.[1] ?? null;
}

export function parseGelatoApparelGprPlacement(orderProductUid: string): GelatoApparelGprPlacement {
  const uid = orderProductUid.toLowerCase();
  if (uid.includes("gpr_4-4_inlbl")) return "FRONT_BACK_INNER_LABEL";
  if (uid.includes("gpr_4-4")) return "FRONT_AND_BACK";
  if (uid.includes("gpr_0-4")) return "BACK_ONLY";
  if (uid.includes("gpr_4-0")) return "FRONT_ONLY";
  return "UNKNOWN";
}

/** Gelato Order API file types required for a catalog productUid (official gpr semantics + suffixes). */
export function requiredGelatoOrderFileTypesForProductUid(orderProductUid: string): string[] {
  const placement = parseGelatoApparelGprPlacement(orderProductUid);
  switch (placement) {
    case "FRONT_ONLY":
      return ["default"];
    case "BACK_ONLY":
      return ["back"];
    case "FRONT_AND_BACK":
      return ["default", "back"];
    case "FRONT_BACK_INNER_LABEL":
      return ["default", "back", "neck-inner"];
    default:
      return [];
  }
}

export function gelatoApparelUidSemanticsQc(orderProductUid: string, intended: "BACK_ONLY" | "FRONT_ONLY" | "FRONT_AND_BACK"): "PASS" | "FAIL" {
  const placement = parseGelatoApparelGprPlacement(orderProductUid);
  if (intended === "BACK_ONLY") return placement === "BACK_ONLY" ? "PASS" : "FAIL";
  if (intended === "FRONT_ONLY") return placement === "FRONT_ONLY" ? "PASS" : "FAIL";
  if (intended === "FRONT_AND_BACK") return placement === "FRONT_AND_BACK" ? "PASS" : "FAIL";
  return "FAIL";
}

export function providerPrintConfigurationLabelFromProductUid(orderProductUid: string): string {
  const placement = parseGelatoApparelGprPlacement(orderProductUid);
  switch (placement) {
    case "FRONT_ONLY":
      return "Front print only (gpr_4-0)";
    case "BACK_ONLY":
      return "Back print only (gpr_0-4)";
    case "FRONT_AND_BACK":
      return "Front + back print (gpr_4-4)";
    case "FRONT_BACK_INNER_LABEL":
      return "Front + back + inner label (gpr_4-4_inlbl)";
    default:
      return "UNKNOWN";
  }
}
