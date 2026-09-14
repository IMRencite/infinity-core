const UNKNOWN_TOKENS = /^(unknown|n\/?a|none|—|-)$/i;

export const MISSING_COPY = {
  notMeasured: "Not measured yet",
  noEstimate: "No reliable estimate yet",
  notApplicable: "Not applicable at this stage",
} as const;

export function isMissingDisplay(value: string | null | undefined): boolean {
  if (value == null) return true;
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return true;
  if (UNKNOWN_TOKENS.test(trimmed)) return true;
  return false;
}

export function displayOr(value: string | null | undefined, fallback: string): string {
  return isMissingDisplay(value) ? fallback : value!.replace(/\s+/g, " ").trim();
}

export function firstUseful(values: Array<string | null | undefined>, fallback: string): string {
  for (const value of values) {
    if (!isMissingDisplay(value)) return String(value).replace(/\s+/g, " ").trim();
  }
  return fallback;
}

export function usefulList(values: Array<string | null | undefined>): string[] {
  return values
    .map((value) => (value == null ? "" : String(value).replace(/\s+/g, " ").trim()))
    .filter((value) => value.length > 0 && !UNKNOWN_TOKENS.test(value));
}
