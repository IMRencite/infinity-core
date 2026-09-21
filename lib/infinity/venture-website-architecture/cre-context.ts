import { defaultPublicValidationQualityTarget } from "@/lib/infinity/public-venture-design";
import type { SiteArchitectureInput } from "./types";

export function creSiteArchitectureInput(ventureId: string): SiteArchitectureInput {
  return {
    ventureId,
    ventureName: "Commercial lease NPV comparison",
    thesis: "A focused commercial lease comparison and NPV workflow for smaller CRE professionals.",
    offer: "A focused workflow for comparing commercial lease economics — step-ups, CAM, percentage rent, TI, free rent, NPV, and discount-rate sensitivity.",
    market: "Commercial real estate tenant representation and boutique brokerage",
    persona: "tenant-representation brokers, independent CRE brokers, boutique CRE advisory",
    productType: "lease comparison and NPV workflow software",
    businessModel: "annual professional seat or per-deal report",
    researchEvidence: [
      "Buyer language centers on rebuilt spreadsheets, occupancy cost, and explaining options to clients.",
      "Definitional questions recur around NPV, TI, and discount rate.",
      "Search volume is UNKNOWN; relevance is from question recurrence and commercial importance.",
    ],
    searchOpportunities: [],
    geoQuestions: [],
    pricing: ["$290 / year", "$149 / deal"],
    availableProof: ["pricing hypotheses", "validation disclosure", "illustrative workflow"],
    unavailableProof: ["customers", "customer quotes", "adoption metrics", "certifications"],
    validationStage: "COLLECTING",
    brandProfile: {
      brandColors: ["#1d4e78", "#152033", "#f4f6f8"],
      visualStyle: "restrained institutional software",
      tone: "precise, confident, non-promotional",
      prohibitedStyles: ["neon", "crypto", "AI-purple gradient"],
    },
    existingPages: ["/", "/early-access", "/privacy-policy", "/terms-of-service"],
    performanceData: null,
    qualityTarget: defaultPublicValidationQualityTarget(),
  };
}
