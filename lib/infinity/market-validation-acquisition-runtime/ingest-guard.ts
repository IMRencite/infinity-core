const INGEST_REEVALUATION_COOLDOWN_MS = 15 * 60_000;
const ingestHits = new Map<string, number[]>();

export function mayTriggerIngestAcquisitionReevaluation(input: {
  clientKey: string;
  now?: Date;
  cooldownMs?: number;
}): { allowed: boolean; reason: string } {
  const now = input.now ?? new Date();
  const cooldown = input.cooldownMs ?? INGEST_REEVALUATION_COOLDOWN_MS;
  const stamps = (ingestHits.get(input.clientKey) ?? []).filter((stamp) => now.getTime() - stamp < cooldown);
  if (stamps.length > 0) {
    return { allowed: false, reason: "INGEST_RESEARCH_COOLDOWN" };
  }
  stamps.push(now.getTime());
  ingestHits.set(input.clientKey, stamps);
  return { allowed: true, reason: "ALLOWED" };
}

export function resetIngestAcquisitionGuard(): void {
  ingestHits.clear();
}

export function ingestMustDisableLiveResearch(lockedBy: string | undefined): boolean {
  return lockedBy === "public-validation-ingest";
}
