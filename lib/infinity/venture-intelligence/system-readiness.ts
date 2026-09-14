export const CANONICAL_PLATFORM_SYSTEMS = [
  "Research / Validation",
  "Monetization Engine",
  "Venture Systems Architecture",
  "Company Builder",
  "Product / Asset Builder",
  "Payment Architecture",
  "Production Artifact Handoff",
  "Performance Intelligence",
] as const;

export type CanonicalPlatformSystem = (typeof CANONICAL_PLATFORM_SYSTEMS)[number];

export type PlatformCapability = "PLATFORM_AVAILABLE" | "PLATFORM_PARTIAL" | "PLATFORM_MISSING";
export type VentureSystemReadiness =
  | "VENTURE_READY"
  | "VENTURE_NEEDS_CONFIGURATION"
  | "VENTURE_NEEDS_PRODUCT_WORK"
  | "VENTURE_EVIDENCE_BLOCKED";

export type CanonicalSystemReadinessRow = {
  system: CanonicalPlatformSystem;
  platform: PlatformCapability;
  venture: VentureSystemReadiness;
  founderFacing: string;
};

export type CanonicalSystemReadiness = {
  rows: CanonicalSystemReadinessRow[];
  platformAvailable: number;
  platformPartial: number;
  platformMissing: number;
  platformTotal: number;
  platformSummary: string;
  ventureSummary: string;
};

const FOUNDER_PLATFORM: Record<PlatformCapability, string> = {
  PLATFORM_AVAILABLE: "Infinity has this system",
  PLATFORM_PARTIAL: "Infinity has part of this system",
  PLATFORM_MISSING: "Infinity still needs this capability",
};

function platformFor(system: CanonicalPlatformSystem): PlatformCapability {
  if (system === "Payment Architecture" || system === "Production Artifact Handoff") {
    return "PLATFORM_PARTIAL";
  }
  return "PLATFORM_AVAILABLE";
}

function ventureFor(
  system: CanonicalPlatformSystem,
  input: {
    hasCandidate: boolean;
    hasResearch: boolean;
    hasMonetization: boolean;
    hasAdvantage: boolean;
    built: boolean;
    live: boolean;
    hasCustomerLearning: boolean;
  },
): VentureSystemReadiness {
  if (system === "Research / Validation") {
    return input.hasResearch || input.hasCandidate ? "VENTURE_READY" : "VENTURE_EVIDENCE_BLOCKED";
  }
  if (system === "Monetization Engine") {
    return input.hasMonetization ? "VENTURE_READY" : "VENTURE_EVIDENCE_BLOCKED";
  }
  if (system === "Venture Systems Architecture" || system === "Company Builder") {
    if (!input.hasCandidate) return "VENTURE_EVIDENCE_BLOCKED";
    return input.hasAdvantage ? "VENTURE_READY" : "VENTURE_NEEDS_PRODUCT_WORK";
  }
  if (system === "Product / Asset Builder") {
    if (!input.hasAdvantage) return "VENTURE_EVIDENCE_BLOCKED";
    return input.built ? "VENTURE_READY" : "VENTURE_NEEDS_PRODUCT_WORK";
  }
  if (system === "Payment Architecture") {
    return input.hasMonetization ? "VENTURE_NEEDS_CONFIGURATION" : "VENTURE_EVIDENCE_BLOCKED";
  }
  if (system === "Production Artifact Handoff") {
    return input.built || input.live ? "VENTURE_READY" : "VENTURE_NEEDS_CONFIGURATION";
  }
  return input.hasCustomerLearning ? "VENTURE_READY" : "VENTURE_NEEDS_CONFIGURATION";
}

function ventureCopy(value: VentureSystemReadiness): string {
  if (value === "VENTURE_READY") return "This venture can use it";
  if (value === "VENTURE_NEEDS_CONFIGURATION") return "This venture still needs configuration";
  if (value === "VENTURE_NEEDS_PRODUCT_WORK") return "This venture still needs product work";
  return "This venture has not cleared the evidence needed to use it";
}

export function assessCanonicalSystemReadiness(input: {
  hasCandidate: boolean;
  hasResearch: boolean;
  hasMonetization: boolean;
  hasAdvantage: boolean;
  built: boolean;
  live: boolean;
  hasCustomerLearning: boolean;
}): CanonicalSystemReadiness {
  const rows = CANONICAL_PLATFORM_SYSTEMS.map((system) => {
    const platform = platformFor(system);
    const venture = ventureFor(system, input);
    return {
      system,
      platform,
      venture,
      founderFacing: `${FOUNDER_PLATFORM[platform]}. ${ventureCopy(venture)}.`,
    };
  });
  const platformAvailable = rows.filter((row) => row.platform === "PLATFORM_AVAILABLE").length;
  const platformPartial = rows.filter((row) => row.platform === "PLATFORM_PARTIAL").length;
  const platformMissing = rows.filter((row) => row.platform === "PLATFORM_MISSING").length;
  return {
    rows,
    platformAvailable,
    platformPartial,
    platformMissing,
    platformTotal: rows.length,
    platformSummary: `${platformAvailable + platformPartial} of ${rows.length} Infinity platform systems available. Evidence gaps do not erase Infinity OS capability.`,
    ventureSummary: `${rows.filter((row) => row.venture === "VENTURE_READY").length} of ${rows.length} systems are venture-ready.`,
  };
}
