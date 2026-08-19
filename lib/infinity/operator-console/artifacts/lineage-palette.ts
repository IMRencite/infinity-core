/** Controlled neon lineage palette — visible on near-black HQ surfaces. */
export const HQ_LINEAGE_PALETTE = [
  { key: "cyan", cssVar: "--hq-lineage-cyan", rgb: "34, 211, 238" },
  { key: "blue", cssVar: "--hq-lineage-blue", rgb: "56, 189, 248" },
  { key: "violet", cssVar: "--hq-lineage-violet", rgb: "167, 139, 250" },
  { key: "purple", cssVar: "--hq-lineage-purple", rgb: "192, 132, 252" },
  { key: "magenta", cssVar: "--hq-lineage-magenta", rgb: "232, 121, 249" },
  { key: "aqua", cssVar: "--hq-lineage-aqua", rgb: "45, 212, 191" },
  { key: "indigo", cssVar: "--hq-lineage-indigo", rgb: "129, 140, 248" },
  { key: "pink", cssVar: "--hq-lineage-pink", rgb: "244, 114, 182" },
  { key: "mint", cssVar: "--hq-lineage-mint", rgb: "110, 231, 183" },
  { key: "lavender", cssVar: "--hq-lineage-lavender", rgb: "165, 180, 252" },
] as const;

export type HqLineageColorKey = (typeof HQ_LINEAGE_PALETTE)[number]["key"];

export function stableHashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function colorKeyForLineageId(lineageId: string): HqLineageColorKey {
  const index = stableHashString(lineageId) % HQ_LINEAGE_PALETTE.length;
  return HQ_LINEAGE_PALETTE[index]!.key;
}

export function paletteEntryForColorKey(colorKey: string) {
  return HQ_LINEAGE_PALETTE.find((entry) => entry.key === colorKey) ?? HQ_LINEAGE_PALETTE[0]!;
}
