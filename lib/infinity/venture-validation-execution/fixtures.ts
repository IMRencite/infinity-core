import { authorizedBuildCompileInput, validateCreCompileInput, blockedCompileInput, CRE_CANDIDATE_ID } from "@/lib/infinity/venture-build-orchestration/fixtures";
import type { CanonicalCandidateInput } from "@/lib/infinity/venture-intelligence/types";

export { authorizedBuildCompileInput, validateCreCompileInput, blockedCompileInput, CRE_CANDIDATE_ID };

export function creCandidateFixture(): CanonicalCandidateInput {
  return {
    id: CRE_CANDIDATE_ID,
    title: "Commercial Real Estate (CRE) Lease Comparison & NPV Calculator",
    summary: "A calculator that compares commercial leases and NPV for brokers.",
    problem: "Brokers rebuild lease comparison math in spreadsheets for every deal.",
    targetCustomer: "Independent CRE brokers and tenant reps",
    market: "Commercial real estate software",
    businessModelCandidates: ["subscription"],
    revenueMechanismCandidates: ["monthly_saas"],
    demandEvidence: ["Brokers complain they struggle with spreadsheet surgery on every lease comparison."],
    marketEvidence: ["CRE software spend is concentrated in brokerage workflow tools."],
    monetizationEvidence: ["Comparable lease-analysis tools charge a monthly software fee."],
    distributionEvidence: ["Brokers discover workflow tools through industry associations."],
    buildabilityEvidence: ["NPV and rent-comparison math can be implemented as software."],
    competitionEvidence: ["Incumbent Excel templates are a weakness: they are error-prone and hard to share with clients."],
    researchSources: ["https://example.com/cre-lease-tools"],
    researchRunIds: [],
    risks: ["Willingness to pay is still modeled."],
    unknowns: ["Observed CAC"],
  };
}
