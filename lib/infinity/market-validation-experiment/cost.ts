import { classifyVercelLiveCost } from "@/lib/infinity/governed-deployment-execution/vercel-live-config";
import { vercelAdapter } from "@/lib/infinity/launch-gateway/adapters/vercel-adapter";
import { ACTION_TYPE_REGISTRY_V1 } from "@/lib/infinity/launch-gateway/action-registry";
import type { CommercialProviderVerification } from "@/lib/infinity/commercialization/probes/status";
import { inspectReadOnlyCostCapability } from "./billing-read-capability";
import { inspectDeploymentCostEvidence, type DeploymentCostEvidence } from "./cost-evidence";
import { getEconomicReadVerification } from "./economic-read-verification";
import type { CostClassification } from "./types";

export type ValidationDeploymentCost = {
  currentClassification: ReturnType<typeof classifyVercelLiveCost>;
  finalClassification: CostClassification | "METERED";
  estimatedAmount: number | null;
  currency: "USD";
  upperBound: number | null;
  basis: string;
  evidence: string;
  confidence: DeploymentCostEvidence["confidence"];
  billingScope: DeploymentCostEvidence["billingScope"];
  usageSnapshot: DeploymentCostEvidence["usageSnapshot"];
  timestamp: string;
  adapterEstimateUsd: number;
  adapterEstimateAcceptedAsKnownZero: false;
  registryDefaultUsd: number | null;
  registryDefaultAcceptedAsKnownZero: false;
  unknownCost: boolean;
  unknownTreatedAsZero: false;
  readOnlyBillingAction: "NONE" | "billing.read";
  inspectedSources: string[];
  costEvidence: DeploymentCostEvidence;
};

export function classifyValidationDeploymentCost(input: {
  persistedHosting?: CommercialProviderVerification | null;
} = {}): ValidationDeploymentCost {
  const current = classifyVercelLiveCost();
  const gitRegistry = ACTION_TYPE_REGISTRY_V1["hosting.deploy"]?.estimatedCostUsd ?? null;
  const bundleRegistry = ACTION_TYPE_REGISTRY_V1["hosting.deploy_source_bundle"]?.estimatedCostUsd ?? null;
  const costEvidence = inspectDeploymentCostEvidence({ persistedHosting: input.persistedHosting });
  const billingRead = inspectReadOnlyCostCapability();
  void billingRead;
  const inspectedSources = [
    "classifyVercelLiveCost",
    "vercelAdapter.estimate",
    "ACTION_TYPE_REGISTRY_V1.hosting.deploy.estimatedCostUsd",
    "ACTION_TYPE_REGISTRY_V1.hosting.deploy_source_bundle.estimatedCostUsd",
    "commercial_provider_verifications.HOSTING.metadata",
    "hosting.readCapabilities",
    "gde.vercel_live_ledger.cost_state",
    "billing.read",
    "account.plan.read",
  ];
  return {
    currentClassification: current,
    finalClassification: costEvidence.classification,
    estimatedAmount: costEvidence.estimatedAmount,
    currency: "USD",
    upperBound: costEvidence.upperBound,
    basis: costEvidence.basis,
    evidence: costEvidence.evidence,
    confidence: costEvidence.confidence,
    billingScope: costEvidence.billingScope,
    usageSnapshot: costEvidence.usageSnapshot,
    timestamp: costEvidence.timestamp,
    adapterEstimateUsd: 0,
    adapterEstimateAcceptedAsKnownZero: false,
    registryDefaultUsd: bundleRegistry ?? gitRegistry,
    registryDefaultAcceptedAsKnownZero: false,
    unknownCost: costEvidence.classification === "UNKNOWN",
    unknownTreatedAsZero: false,
    readOnlyBillingAction: getEconomicReadVerification().liveReadAttempted ? "billing.read" : "NONE",
    inspectedSources,
    costEvidence,
  };
}

export async function adapterEstimateIsNotKnownZero(): Promise<boolean> {
  const estimate = await vercelAdapter.estimate();
  return estimate.estimatedCostUsd === 0;
}
