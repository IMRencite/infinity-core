import type { CostClassification } from "./types";

export type SourceBundlePreLiveGate = {
  adapter: "PASS" | "FAIL";
  artifact: "PASS" | "FAIL";
  form: "PASS" | "FAIL";
  analytics: "PASS" | "FAIL";
  secretSafety: "PASS" | "FAIL";
  plan: "PASS" | "FAIL";
  commercialEligibility: "PASS" | "FAIL";
  deployPackage: "PASS" | "FAIL";
  cost: "PASS" | "FAIL";
  economicAuthorization: "PASS" | "FAIL";
  eag: "PASS" | "FAIL";
  eagPermitsBoundedVerification: boolean;
  readyForLiveProviderCall: boolean;
  unknownCostBlocksLive: boolean;
};

export function evaluateSourceBundlePreLiveGate(input: {
  adapterPass: boolean;
  artifactPass: boolean;
  formPass: boolean;
  analyticsPass: boolean;
  secretSafety: "PASS" | "FAIL";
  planPass?: boolean;
  commercialEligibilityPass?: boolean;
  deployPackagePass?: boolean;
  costClassification: CostClassification | "METERED";
  unknownCost: boolean;
  economicAuthorizationPass: boolean;
  eagApproved?: boolean;
  eagPermitsBoundedVerification: boolean;
  founderCeilingRecognized?: boolean;
}): SourceBundlePreLiveGate {
  const founderCeilingRecognized = Boolean(input.founderCeilingRecognized);
  const cost = !input.unknownCost && input.costClassification !== "UNKNOWN" ? "PASS" : "FAIL";
  const adapter = input.adapterPass ? "PASS" : "FAIL";
  const artifact = input.artifactPass ? "PASS" : "FAIL";
  const form = input.formPass ? "PASS" : "FAIL";
  const analytics = input.analyticsPass ? "PASS" : "FAIL";
  const plan = input.planPass === false ? "FAIL" : "PASS";
  const commercialEligibility = input.commercialEligibilityPass === false ? "FAIL" : "PASS";
  const deployPackage = input.deployPackagePass === false ? "FAIL" : "PASS";
  const economicAuthorization = input.economicAuthorizationPass ? "PASS" : "FAIL";
  const eag = input.eagApproved ? "PASS" : "FAIL";
  const unknownCost = input.unknownCost || input.costClassification === "UNKNOWN";
  const readyForLiveProviderCall =
    adapter === "PASS" &&
    artifact === "PASS" &&
    form === "PASS" &&
    analytics === "PASS" &&
    input.secretSafety === "PASS" &&
    plan === "PASS" &&
    commercialEligibility === "PASS" &&
    deployPackage === "PASS" &&
    (cost === "PASS" || founderCeilingRecognized) &&
    economicAuthorization === "PASS" &&
    eag === "PASS" &&
    input.eagPermitsBoundedVerification;
  return {
    adapter,
    artifact,
    form,
    analytics,
    secretSafety: input.secretSafety,
    plan,
    commercialEligibility,
    deployPackage,
    cost,
    economicAuthorization,
    eag,
    eagPermitsBoundedVerification: input.eagPermitsBoundedVerification,
    readyForLiveProviderCall,
    unknownCostBlocksLive: unknownCost && !founderCeilingRecognized,
  };
}
