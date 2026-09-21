import { CRE_PRIMARY_OFFER, CRE_VENTURE_NAME, RESERVED_INFINITY_DOMAINS } from "./constants";
import { creSiteArchitectureInput } from "@/lib/infinity/venture-website-architecture/cre-context";

export type DomainCandidateSeed = {
  brand: string;
  domain: string;
  tld: string;
  meaning: string;
  brandability: number;
  relevance: number;
  expansionFlexibility: number;
  ambiguityRisk: "LOW" | "MEDIUM" | "HIGH";
  knownConflictRisk: "LOW" | "MEDIUM" | "HIGH";
  strategicScore: number;
};

const FORBIDDEN = new Set<string>(RESERVED_INFINITY_DOMAINS);

export function inspectCreVentureNaming(ventureId: string): {
  existingDurableVentureName: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  productIdentity: string;
  operatingRecordName: string;
  offer: string;
  durablePurchasedBrand: false;
} {
  const site = creSiteArchitectureInput(ventureId);
  return {
    existingDurableVentureName: site.ventureName,
    confidence: "MEDIUM",
    productIdentity: site.ventureName,
    operatingRecordName: CRE_VENTURE_NAME,
    offer: CRE_PRIMARY_OFFER,
    durablePurchasedBrand: false,
  };
}

export function creDomainCandidateSeeds(): DomainCandidateSeed[] {
  const seeds: DomainCandidateSeed[] = [
    {
      brand: "LeaseNPV",
      domain: "leasenpv.com",
      tld: "com",
      meaning: "Lease net-present-value comparison for commercial occupancy decisions.",
      brandability: 8,
      relevance: 9,
      expansionFlexibility: 7,
      ambiguityRisk: "LOW",
      knownConflictRisk: "LOW",
      strategicScore: 88,
    },
    {
      brand: "LeaseComp",
      domain: "leasecomp.com",
      tld: "com",
      meaning: "Commercial lease comparison workspace.",
      brandability: 8,
      relevance: 8,
      expansionFlexibility: 8,
      ambiguityRisk: "LOW",
      knownConflictRisk: "MEDIUM",
      strategicScore: 82,
    },
    {
      brand: "OccupancyNPV",
      domain: "occupancynpv.com",
      tld: "com",
      meaning: "Occupancy-cost NPV analysis for tenant-rep brokers.",
      brandability: 6,
      relevance: 9,
      expansionFlexibility: 6,
      ambiguityRisk: "LOW",
      knownConflictRisk: "LOW",
      strategicScore: 78,
    },
    {
      brand: "DealNPV",
      domain: "dealnpv.com",
      tld: "com",
      meaning: "Per-deal NPV comparison for lease alternatives.",
      brandability: 7,
      relevance: 8,
      expansionFlexibility: 7,
      ambiguityRisk: "MEDIUM",
      knownConflictRisk: "LOW",
      strategicScore: 76,
    },
    {
      brand: "LeaseBasis",
      domain: "leasebasis.com",
      tld: "com",
      meaning: "A professional basis for comparing commercial lease economics.",
      brandability: 8,
      relevance: 7,
      expansionFlexibility: 8,
      ambiguityRisk: "LOW",
      knownConflictRisk: "LOW",
      strategicScore: 80,
    },
    {
      brand: "TenantNPV",
      domain: "tenantnpv.com",
      tld: "com",
      meaning: "Tenant-representation NPV comparison.",
      brandability: 7,
      relevance: 8,
      expansionFlexibility: 6,
      ambiguityRisk: "LOW",
      knownConflictRisk: "LOW",
      strategicScore: 75,
    },
    {
      brand: "CompLease",
      domain: "complease.com",
      tld: "com",
      meaning: "Compare commercial leases without rebuilding the spreadsheet.",
      brandability: 7,
      relevance: 8,
      expansionFlexibility: 7,
      ambiguityRisk: "MEDIUM",
      knownConflictRisk: "MEDIUM",
      strategicScore: 74,
    },
    {
      brand: "NPVLease",
      domain: "npvlease.com",
      tld: "com",
      meaning: "NPV-first commercial lease comparison.",
      brandability: 6,
      relevance: 8,
      expansionFlexibility: 6,
      ambiguityRisk: "LOW",
      knownConflictRisk: "LOW",
      strategicScore: 72,
    },
    {
      brand: "LeaseDelta",
      domain: "leasedelta.com",
      tld: "com",
      meaning: "The economic difference between lease alternatives.",
      brandability: 8,
      relevance: 7,
      expansionFlexibility: 8,
      ambiguityRisk: "LOW",
      knownConflictRisk: "MEDIUM",
      strategicScore: 77,
    },
    {
      brand: "HoldCost",
      domain: "holdcost.com",
      tld: "com",
      meaning: "Occupancy and holding-cost comparison for commercial leases.",
      brandability: 7,
      relevance: 7,
      expansionFlexibility: 8,
      ambiguityRisk: "MEDIUM",
      knownConflictRisk: "LOW",
      strategicScore: 73,
    },
  ];
  return seeds.filter((row) => !FORBIDDEN.has(row.domain) && !FORBIDDEN.has(row.tld === "io" ? row.brand.toLowerCase() + ".io" : ""));
}

export function isForbiddenVentureDomain(domain: string): boolean {
  return FORBIDDEN.has(domain.trim().toLowerCase());
}
