import { GENERIC_NOW_PHRASES } from "./contract";

export function normalizeNowText(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function isGenericWorkerOnlyNow(value: string | null | undefined): boolean {
  const text = normalizeNowText(value);
  if (!text) return true;
  if (GENERIC_NOW_PHRASES.includes(text as (typeof GENERIC_NOW_PHRASES)[number])) return true;
  return GENERIC_NOW_PHRASES.some((phrase) => text === phrase || text === `${phrase}.`);
}

export function isSpecificCurrentWork(value: string | null | undefined): boolean {
  const text = (value ?? "").trim();
  if (text.length < 24) return false;
  if (isGenericWorkerOnlyNow(text)) return false;
  return /\b(building|monitoring|waiting|preparing|researching|qualifying|evaluating|connecting|verifying|recruiting|observing|sending)\b/i.test(text)
    && /\b(occupancynpv|affiliate|outbound|inbound|pipeline|commission|payout|prospect|trial|customer|sales|venture)\b/i.test(text);
}
