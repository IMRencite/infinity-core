const suppressions = new Map<string, true>();

export function resetGrowthSuppression(): void {
  suppressions.clear();
}

export function recordGrowthSuppression(key: string): void {
  suppressions.set(key.toLowerCase(), true);
}

export function isSuppressed(input: {
  email?: string | null;
  ventureId?: string | null;
  campaignId?: string | null;
  prospectId?: string | null;
}): boolean {
  const keys = [
    input.email ? `global:${input.email.toLowerCase()}` : null,
    input.ventureId ? `venture:${input.ventureId}` : null,
    input.campaignId ? `campaign:${input.campaignId}` : null,
    input.prospectId ? `prospect:${input.prospectId}` : null,
  ].filter((key): key is string => Boolean(key));
  return keys.some((key) => suppressions.has(key));
}
