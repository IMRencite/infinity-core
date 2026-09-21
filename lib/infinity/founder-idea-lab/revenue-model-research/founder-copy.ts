export function founderPricingCluesCopy(clues: string[]): string {
  if (!clues.length) {
    return "UNKNOWN — no grounded public monthly price.";
  }
  return [
    "Infinity found some public pricing clues, but not enough comparable evidence yet to recommend final pricing.",
    "",
    "Examples found:",
    ...clues.map((item) => `- ${item}`),
  ].join("\n");
}
