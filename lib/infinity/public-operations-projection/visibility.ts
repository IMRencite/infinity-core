import {
  DEFAULT_PUBLIC_VENTURE_VISIBILITY,
  PUBLIC_VENTURE_VISIBILITY_POLICY,
  isAskReviewIdentity,
} from "./registry";
import type { InternalVentureObservation, PublicVentureProjection, PublicVentureVisibility } from "./types";

export function resolvePublicVentureVisibility(
  venture: Pick<InternalVentureObservation, "private_venture_id" | "private_name">,
  overrides?: Record<string, PublicVentureVisibility>,
): PublicVentureVisibility {
  if (overrides?.[venture.private_venture_id]) return overrides[venture.private_venture_id]!;
  if (isAskReviewIdentity(venture.private_venture_id, venture.private_name)) return "HIDDEN";
  const policy = PUBLIC_VENTURE_VISIBILITY_POLICY.find((row) =>
    row.match(venture.private_venture_id, venture.private_name),
  );
  return policy?.visibility ?? DEFAULT_PUBLIC_VENTURE_VISIBILITY;
}

export function projectPublicVenture(
  venture: InternalVentureObservation,
  visibility: PublicVentureVisibility,
): PublicVentureProjection | null {
  if (visibility === "HIDDEN") return null;
  if (isAskReviewIdentity(venture.private_venture_id, venture.private_name)) return null;
  const approved = PUBLIC_VENTURE_VISIBILITY_POLICY.find((row) =>
    row.match(venture.private_venture_id, venture.private_name),
  ) ?? (visibility === "PUBLIC_NAME_ONLY" || visibility === "PUBLIC_SUMMARY" || visibility === "PUBLIC_STATS"
    ? {
        match: () => false,
        visibility,
        public_name: sanitizePublicName(venture.private_name),
        public_url: undefined,
        status_label: publicStatusLabel(venture),
        category: visibility === "PUBLIC_NAME_ONLY" ? undefined : "Public venture",
        sanitized_description: visibility === "PUBLIC_NAME_ONLY" ? undefined : "Approved public venture summary",
      }
    : null);
  if (!approved || approved.visibility === "HIDDEN") return null;
  const name = approved.public_name === "HIDDEN" ? sanitizePublicName(venture.private_name) : approved.public_name;
  const base: PublicVentureProjection = {
    public_name: name,
    status_label: approved.status_label,
  };
  if (visibility === "PUBLIC_NAME_ONLY") {
    return approved.public_url ? { ...base, public_url: approved.public_url } : base;
  }
  if (visibility === "PUBLIC_SUMMARY") {
    return {
      ...base,
      ...(approved.public_url ? { public_url: approved.public_url } : {}),
      ...(approved.category ? { category: approved.category } : {}),
      ...(approved.sanitized_description ? { sanitized_description: approved.sanitized_description } : {}),
    };
  }
  return {
    ...base,
    ...(approved.public_url ? { public_url: approved.public_url } : {}),
    ...(approved.category ? { category: approved.category } : {}),
    ...(approved.sanitized_description ? { sanitized_description: approved.sanitized_description } : {}),
    approved_stats: { live: venture.public_launch_state === "YES" || venture.is_operating },
  };
}

function sanitizePublicName(name: string): string {
  return name.replace(/secret|internal|private|unreleased/gi, "").trim() || "Public venture";
}

function publicStatusLabel(venture: InternalVentureObservation): string {
  if (venture.is_operating || venture.public_launch_state === "YES") return "Live";
  if (venture.venture_status === "PAUSED") return "Paused";
  return "Operating";
}
