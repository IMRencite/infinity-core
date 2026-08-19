const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX_ID_FRAGMENT_RE = /^[0-9a-f]{8,32}$/i;
const SLUG_RE = /^[a-z0-9]+(?:[_-][a-z0-9]+)+$/i;
const FIXTURE_NAME_PATTERN =
  /(?:^|[\s_-])(e2e|fixture|mock|simulation|capability[_-]?test|strong_in_policy|verification|scenario_name|selection_key)(?:[\s_-]|$)|_test\b|test_|fixture_candidate|^venture_[0-9a-f]/i;
const NUMBER_ONLY_FALLBACK_RE = /^venture\s*#\s*\d+$/i;
const COMPOSED_LABEL_RE = /^#(\d+)\s+[—–-]\s+(.+)$/;

export type VentureDisplayNameSource = {
  id?: string | null;
  index?: number | null;
  number?: number | null;
  rank?: number | null;
  queueRank?: number | null;
  identity?: Record<string, unknown> | null;
  manifest?: Record<string, unknown> | null;
  title?: string | null;
  displayName?: string | null;
  display_name?: string | null;
  name?: string | null;
  workingName?: string | null;
  candidateTitle?: string | null;
  opportunityTitle?: string | null;
  opportunityName?: string | null;
  blueprintName?: string | null;
  companyName?: string | null;
};

export type VentureDisplaySourceKind =
  | "candidate_title"
  | "opportunity_title"
  | "display_name"
  | "blueprint_name"
  | "company_name"
  | "identity_name"
  | "working_name"
  | "fallback";

export type VentureDisplayResolution = {
  number: number | null;
  name: string;
  label: string;
  ventureId: string | null;
  source: VentureDisplaySourceKind;
};

export type TreasuryVentureLabelOption = {
  ventureAssemblyId: string;
  ventureName?: string | null;
  ventureDisplayName?: string | null;
  ventureDisplayNumber?: number | null;
  ventureDisplayLabel?: string | null;
  ventureDisplaySource?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function readTrimmed(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isInternalVentureLabel(value: string | null | undefined): boolean {
  const trimmed = readTrimmed(value);
  if (!trimmed) return true;
  if (UUID_RE.test(trimmed)) return true;
  if (HEX_ID_FRAGMENT_RE.test(trimmed)) return true;
  if (NUMBER_ONLY_FALLBACK_RE.test(trimmed)) return true;
  if (FIXTURE_NAME_PATTERN.test(trimmed)) return true;
  if (!/\s/.test(trimmed) && SLUG_RE.test(trimmed)) return true;
  return false;
}

function parseComposedLabel(value: string | null | undefined): { number: number; name: string } | null {
  const trimmed = readTrimmed(value);
  if (!trimmed) return null;
  const match = trimmed.match(COMPOSED_LABEL_RE);
  if (!match) return null;
  const name = match[2]?.trim() ?? "";
  if (!name) return null;
  if (name !== "Unnamed Venture" && isInternalVentureLabel(name)) return null;
  return { number: Number(match[1]), name };
}

function firstHumanReadable(
  values: Array<{ value: string | null | undefined; source: VentureDisplaySourceKind }>,
): { name: string; source: VentureDisplaySourceKind } | null {
  for (const entry of values) {
    const composed = parseComposedLabel(entry.value);
    const candidate = composed?.name ?? readTrimmed(entry.value);
    if (candidate && !isInternalVentureLabel(candidate)) return { name: candidate, source: entry.source };
  }
  return null;
}

function normalizeRank(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rank = Math.floor(value);
  return rank > 0 ? rank : null;
}

export function formatVentureIdPreview(id: string | null | undefined): string {
  const trimmed = readTrimmed(id);
  if (!trimmed) return "";
  if (UUID_RE.test(trimmed) || trimmed.length > 12) return `${trimmed.slice(0, 8)}…`;
  return trimmed;
}

export function formatVentureDisplayLabel(number: number | null, name: string): string {
  if (number != null) return `#${number} — ${name}`;
  return name;
}

export function resolveVentureDisplay(source: VentureDisplayNameSource): VentureDisplayResolution {
  const identity = asRecord(source.identity);
  const manifest = asRecord(source.manifest);
  const ventureIdentity = asRecord(manifest?.ventureIdentity);
  const composed =
    parseComposedLabel(source.displayName) ??
    parseComposedLabel(source.title) ??
    parseComposedLabel(source.name);

  const picked = firstHumanReadable([
    { value: source.candidateTitle, source: "candidate_title" },
    { value: source.opportunityTitle, source: "opportunity_title" },
    { value: source.opportunityName, source: "opportunity_title" },
    { value: source.displayName, source: "display_name" },
    { value: source.display_name, source: "display_name" },
    { value: source.title, source: "display_name" },
    { value: source.name, source: "display_name" },
    { value: source.blueprintName, source: "blueprint_name" },
    { value: source.companyName, source: "company_name" },
    { value: identity?.displayName as string | undefined, source: "identity_name" },
    { value: identity?.display_name as string | undefined, source: "identity_name" },
    { value: identity?.title as string | undefined, source: "identity_name" },
    { value: identity?.name as string | undefined, source: "identity_name" },
    { value: ventureIdentity?.displayName as string | undefined, source: "identity_name" },
    { value: ventureIdentity?.display_name as string | undefined, source: "identity_name" },
    { value: ventureIdentity?.title as string | undefined, source: "identity_name" },
    { value: ventureIdentity?.name as string | undefined, source: "identity_name" },
    { value: source.workingName, source: "working_name" },
    { value: identity?.workingName as string | undefined, source: "working_name" },
    { value: ventureIdentity?.workingName as string | undefined, source: "working_name" },
  ]);

  const name = picked?.name ?? composed?.name ?? "Unnamed Venture";
  const number =
    normalizeRank(source.rank) ??
    normalizeRank(source.queueRank) ??
    normalizeRank(source.number) ??
    composed?.number ??
    (typeof source.index === "number" && Number.isFinite(source.index) && source.index >= 0
      ? Math.floor(source.index) + 1
      : null);

  return {
    number,
    name,
    label: formatVentureDisplayLabel(number, name),
    ventureId: readTrimmed(source.id),
    source: picked?.source ?? (composed ? "display_name" : "fallback"),
  };
}

export function resolveVentureDisplayName(source: VentureDisplayNameSource): string {
  return resolveVentureDisplay(source).label;
}

export function resolveTreasuryVentureDisplay(
  options: TreasuryVentureLabelOption[],
  ventureId: string,
  index?: number,
): VentureDisplayResolution {
  const row = options.find((option) => option.ventureAssemblyId === ventureId);
  const optionIndex = index ?? (row ? options.indexOf(row) : undefined);
  return resolveVentureDisplay({
    id: ventureId,
    index: optionIndex,
    number: row?.ventureDisplayNumber,
    rank: row?.ventureDisplayNumber,
    displayName: row?.ventureDisplayLabel ?? row?.ventureDisplayName,
    workingName: row?.ventureName,
  });
}

export function resolveTreasuryVentureLabel(
  options: TreasuryVentureLabelOption[],
  ventureId: string,
  index?: number,
): string {
  return resolveTreasuryVentureDisplay(options, ventureId, index).label;
}
