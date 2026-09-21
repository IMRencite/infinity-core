import { FACTORY_INHERITED_BLOG_OS_CONTRACTS } from "@/lib/infinity/organic-growth-engine/blog-os";
import { FACTORY_INHERITED_QC_CONTRACTS } from "./contract";

export function futureVentureInheritsUniversalVentureSystemQc(): true {
  return true;
}

export function factoryInheritedUniversalVentureSystemQc(): {
  inherited: true;
  manual_developer_step: false;
  contracts: readonly string[];
} {
  return {
    inherited: true,
    manual_developer_step: false,
    contracts: [...FACTORY_INHERITED_QC_CONTRACTS, ...FACTORY_INHERITED_BLOG_OS_CONTRACTS],
  };
}

export function factoryRequiresMandatorySmokeQc(): true {
  return true;
}

export function factoryRequiresApplicableBrowserNetworkFormPaymentFulfillmentQc(): true {
  return true;
}

export function factoryMissingLogoOrFaviconAllowsFullPass(): false {
  return false;
}
