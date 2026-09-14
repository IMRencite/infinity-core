export const RESPONSIVE_HORIZONTAL_OVERFLOW_GATE = "ResponsiveHorizontalOverflowGate" as const;

export type ViewportOverflowSample = {
  name: "desktop" | "tablet" | "mobile";
  scrollWidth: number;
  clientWidth: number;
};

export function pageHasHorizontalOverflow(sample: Pick<ViewportOverflowSample, "scrollWidth" | "clientWidth">): boolean {
  return sample.scrollWidth > sample.clientWidth + 1;
}

export function evaluateResponsiveHorizontalOverflowGate(input: {
  viewports: ViewportOverflowSample[];
  usedGlobalOverflowXHiddenAsPrimary: boolean;
}): { gate: typeof RESPONSIVE_HORIZONTAL_OVERFLOW_GATE; result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  for (const viewport of input.viewports) {
    if (pageHasHorizontalOverflow(viewport)) reasons.push(`OVERFLOW_${viewport.name.toUpperCase()}`);
  }
  if (input.usedGlobalOverflowXHiddenAsPrimary) reasons.push("GLOBAL_OVERFLOW_HIDDEN_PRIMARY");
  const required = new Set(["desktop", "tablet", "mobile"]);
  for (const name of required) {
    if (!input.viewports.some((row) => row.name === name)) reasons.push(`MISSING_${name.toUpperCase()}_SAMPLE`);
  }
  return {
    gate: RESPONSIVE_HORIZONTAL_OVERFLOW_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["NO_PAGE_LEVEL_HORIZONTAL_OVERFLOW"],
  };
}
