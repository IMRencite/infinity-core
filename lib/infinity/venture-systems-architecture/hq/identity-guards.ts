const HARNESS_LABELS = new Set([
  "autonomous venture cycle",
  "autonomous venture cycle active",
  "autonomous venture cycle linked",
  "autonomous venture cycle complete",
  "first autonomous venture cycle v1",
]);

export function isHarnessArchitectureLabel(value: string | null | undefined): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const normalized = trimmed.toLowerCase();
  if (HARNESS_LABELS.has(normalized)) return true;
  return normalized.startsWith("autonomous venture cycle");
}

export function isHarnessArchitectureId(value: string | null | undefined): boolean {
  if (typeof value !== "string") return false;
  return value.trim().startsWith("favc1-cycle:");
}

export function rejectHarnessArchitectureLabel(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || isHarnessArchitectureLabel(trimmed)) return null;
  return trimmed;
}

export function rejectHarnessArchitectureId(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || isHarnessArchitectureId(trimmed)) return null;
  return trimmed;
}

export function abbreviateCanonicalId(id: string | null | undefined): string | null {
  if (typeof id !== "string") return null;
  const trimmed = id.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 12) return trimmed;
  return `${trimmed.slice(0, 8)}…`;
}
