const BLOCKED_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bharley[-\s]?davidson\b/i, reason: "MANUFACTURER_MARK" },
  { pattern: /\b(?:yamaha|honda|kawasaki|suzuki|ducati|bmw motorrad|indian motorcycle|triumph motorcycles)\b/i, reason: "MANUFACTURER_MARK" },
  { pattern: /\b(?:nfl|nba|mlb|nhl|ncaa)\b/i, reason: "SPORTS_MARK" },
  { pattern: /\b(?:disney|marvel|star wars|pokemon|nintendo)\b/i, reason: "COPYRIGHTED_CHARACTER" },
];

export type IpSafetyDecision = "ALLOW" | "BLOCK_IP_REVIEW";

export function evaluateMerchandiseIpSafety(text: string): { decision: IpSafetyDecision; reason: string | null } {
  const haystack = text.trim();
  if (!haystack) return { decision: "BLOCK_IP_REVIEW", reason: "EMPTY_SUGGESTION" };
  for (const row of BLOCKED_PATTERNS) {
    if (row.pattern.test(haystack)) return { decision: "BLOCK_IP_REVIEW", reason: row.reason };
  }
  return { decision: "ALLOW", reason: null };
}
