import { qualifyProspect, type PilotFormInput } from "./form";

export const QUALIFICATION_CONTRACT_ID = "cre_lease_npv_qualified_prospect_v1" as const;

export type QualificationContract = {
  contractId: typeof QUALIFICATION_CONTRACT_ID;
  pageViewAloneQualified: false;
  required: {
    role: "broker | tenant rep | boutique";
    leaseWorkflow: true;
    dealFrequency: "weekly | monthly | quarterly | active | current";
  };
  fieldsUsed: Array<"role" | "company" | "teamSize" | "dealFrequency" | "preferredPricing" | "pilotInterest" | "leaseWorkflow">;
};

export function qualificationContract(): QualificationContract {
  return {
    contractId: QUALIFICATION_CONTRACT_ID,
    pageViewAloneQualified: false,
    required: {
      role: "broker | tenant rep | boutique",
      leaseWorkflow: true,
      dealFrequency: "weekly | monthly | quarterly | active | current",
    },
    fieldsUsed: ["role", "company", "teamSize", "dealFrequency", "preferredPricing", "pilotInterest", "leaseWorkflow"],
  };
}

export function evaluateQualification(input: Pick<PilotFormInput, "role" | "dealFrequency" | "leaseWorkflow">): {
  qualified: boolean;
  reason: string;
  countedAsVisitorOnly: boolean;
} {
  const result = qualifyProspect(input);
  return {
    qualified: result.qualified,
    reason: result.reason,
    countedAsVisitorOnly: !result.qualified,
  };
}

export function pageViewIsQualified(): false {
  return false;
}
