import type { HQEntityDetail } from "./details/entity-detail-types";

export const VENTURE_DESCRIPTION_FALLBACK = "Venture description still being assembled.";

export type InspectedVentureIdentity = {
  description?: string | null;
  sourceLabel?: string | null;
  businessCase?: string | null;
  stageLabel?: string | null;
  buildReadiness?: string | null;
  candidateId?: string | null;
  ventureId?: string | null;
};

export function usefulVentureDescription(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length < 12) return null;
  if (/^not (evidenced|named|specified|available|applicable)/i.test(trimmed)) return null;
  if (/^venture description still/i.test(trimmed)) return null;
  if (/next:/i.test(trimmed) && /looks promising|worth validating|needs more evidence|performing/i.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export function inspectedIdentityFromDetail(detail: HQEntityDetail | null | undefined): InspectedVentureIdentity {
  if (!detail) return {};
  const metric = (id: string) => detail.insights.metrics.find((item) => item.id === id)?.value ?? null;
  const row = (label: string) => detail.system.rows.find((item) => item.label === label)?.value ?? null;
  const candidateRaw = row("Opportunity candidate ID");
  return {
    description: usefulVentureDescription(detail.concept ?? null),
    sourceLabel: detail.subtitle,
    businessCase: detail.decision,
    stageLabel: metric("current-position"),
    buildReadiness: metric("build-readiness"),
    candidateId: candidateRaw && candidateRaw !== "none" ? candidateRaw : null,
    ventureId: detail.entityId,
  };
}
