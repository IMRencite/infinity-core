import { isHarnessArchitectureId, isHarnessArchitectureLabel } from "@/lib/infinity/venture-systems-architecture/hq/identity-guards";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { publicVentureNameForActivity } from "@/lib/infinity/operator-console/room-activity";
import type { CanonicalSelectedVenture } from "./types";

export function resolveCanonicalSelectedVenture(input: {
  ventureId?: string | null;
  ventureName?: string | null;
}): CanonicalSelectedVenture {
  const id = input.ventureId?.trim() || null;
  const name = input.ventureName?.trim() || null;
  if (isHarnessArchitectureId(id) || isHarnessArchitectureLabel(name)) {
    return {
      venture_id: null,
      venture_name: "NONE SELECTED",
      scope: "NONE_SELECTED",
      rejected_harness_label: true,
    };
  }
  if (id === CRE_VENTURE_ID || /occupancy/i.test(`${id ?? ""}${name ?? ""}`)) {
    return {
      venture_id: CRE_VENTURE_ID,
      venture_name: "OccupancyNPV",
      scope: "VENTURE",
      rejected_harness_label: false,
    };
  }
  if (id === ASKREVIEW_VENTURE_ID || /askreview/i.test(`${id ?? ""}${name ?? ""}`)) {
    return {
      venture_id: ASKREVIEW_VENTURE_ID,
      venture_name: "AskReview",
      scope: "VENTURE",
      rejected_harness_label: false,
    };
  }
  const publicName = publicVentureNameForActivity(name, id);
  if (publicName && id) {
    return {
      venture_id: id,
      venture_name: publicName,
      scope: "VENTURE",
      rejected_harness_label: false,
    };
  }
  if (!id && !publicName) {
    return {
      venture_id: null,
      venture_name: "PORTFOLIO",
      scope: "PORTFOLIO",
      rejected_harness_label: false,
    };
  }
  return {
    venture_id: id,
    venture_name: publicName ?? "NONE SELECTED",
    scope: publicName ? "VENTURE" : "NONE_SELECTED",
    rejected_harness_label: false,
  };
}

export function evaluateCanonicalSelectedVentureGate(selected: CanonicalSelectedVenture): {
  gate: "CanonicalSelectedVentureGate";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  if (isHarnessArchitectureLabel(selected.venture_name)) reasons.push("HARNESS_LABEL_USED_AS_VENTURE");
  if (selected.rejected_harness_label && selected.scope === "VENTURE") reasons.push("HARNESS_STILL_SCOPED_AS_VENTURE");
  return {
    gate: "CanonicalSelectedVentureGate",
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons: reasons.length ? reasons : ["CANONICAL_VENTURE_OR_NONE_SELECTED"],
  };
}
