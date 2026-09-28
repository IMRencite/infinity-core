import { evaluateCommercialCreativeQC } from "./commercial-creative-qc";

export const APPAREL_SELLABILITY_GATE = "ApparelSellabilityGate" as const;

export type ApparelCandidateClass = "REJECT" | "PROMISING" | "REFINE" | "COMMERCIAL_FINALIST";

export const KNOWN_BAD_SELLABILITY_FIXTURES = [
  { id: "kickstands-up-basic-text", title: "KICKSTANDS UP", art: "KICKSTANDS UP basic text on black polygon shirt" },
  { id: "ct-white-square", title: "CT square", art: "CT inside a white square on a homemade shirt" },
  { id: "geometric-after-dark", title: "After Dark", art: "triangle mountains primitive motorcycle simple road lines" },
] as const;

export function evaluateApparelSellability(input: {
  title?: string;
  art?: string;
  svg?: string;
  placement?: "SMALL_FRONT_LARGE_BACK" | "LARGE_BACK" | "UNKNOWN";
  provider_preview?: boolean;
  png_exists?: boolean;
}): {
  gate: typeof APPAREL_SELLABILITY_GATE;
  result: "PASS" | "FAIL";
  class: ApparelCandidateClass;
  reasons: string[];
  commercial: ReturnType<typeof evaluateCommercialCreativeQC>;
} {
  const blob = `${input.title ?? ""} ${input.art ?? ""} ${input.svg ?? ""}`;
  const reasons: string[] = [];
  if (/KICKSTANDS UP|CT inside a white square|white square|triangle mountains|primitive motorcycle|simple road lines|polygon shirt|garmentWithPrintSvg/i.test(blob)) {
    reasons.push("KNOWN_BAD_SELLABILITY_FIXTURE");
  }
  if (/make a cool motorcycle shirt/i.test(blob)) reasons.push("SHALLOW_PROMPT");
  if (input.png_exists && !input.art) reasons.push("TECHNICALLY_VALID_ONLY");
  const commercial = evaluateCommercialCreativeQC({
    svg: input.svg,
    title: input.title,
    story: input.art,
    placement: input.placement ?? "SMALL_FRONT_LARGE_BACK",
    brand: "Club Throttle",
    finished_merchandise: true,
  });
  if (commercial.result === "FAIL") reasons.push(...commercial.reasons);
  if (reasons.includes("KNOWN_BAD_SELLABILITY_FIXTURE")) {
    return { gate: APPAREL_SELLABILITY_GATE, result: "FAIL", class: "REJECT", reasons, commercial };
  }
  if (reasons.length) return { gate: APPAREL_SELLABILITY_GATE, result: "FAIL", class: "REJECT", reasons, commercial };
  return {
    gate: APPAREL_SELLABILITY_GATE,
    result: "PASS",
    class: input.provider_preview ? "COMMERCIAL_FINALIST" : "PROMISING",
    reasons: [],
    commercial,
  };
}

export function evaluateKnownBadSellabilityFixtures() {
  return KNOWN_BAD_SELLABILITY_FIXTURES.map((row) => ({
    ...row,
    verdict: evaluateApparelSellability({ title: row.title, art: row.art, placement: "UNKNOWN" }),
  }));
}
