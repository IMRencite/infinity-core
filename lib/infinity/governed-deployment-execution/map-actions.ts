import { LIVE_PROVIDER_ACTIONS } from "@/lib/infinity/launch-gateway/provider-config";
import { MOCK_PROVIDER_KEY } from "@/lib/infinity/launch-gateway/constants";
import type { DeploymentProviderCapability } from "@/lib/infinity/governed-deployment-readiness/constants";
import type { GatewayActionBinding } from "./types";
import type { GovernedExecutionActionType } from "./constants";

export function capabilityForExecutionAction(action: GovernedExecutionActionType): DeploymentProviderCapability {
  if (action === "PURCHASE_DOMAIN") return "REGISTRAR";
  if (action === "UPSERT_DNS_RECORD" || action === "BIND_DOMAIN") return "DNS";
  if (action === "CONFIGURE_PAYMENT_RESOURCE" || action === "CREATE_WEBHOOK") return "PAYMENTS";
  if (action === "RUN_PRODUCTION_MIGRATION") return "DATABASE";
  return "HOSTING";
}

export function gatewayActionTypeFor(action: GovernedExecutionActionType): string | null {
  if (action === "CREATE_HOSTING_PROJECT") return "hosting.create_project";
  if (action === "DEPLOY_APPLICATION") return "hosting.deploy";
  if (action === "PURCHASE_DOMAIN") return "domain.register";
  if (action === "UPSERT_DNS_RECORD" || action === "BIND_DOMAIN") return "dns.configure";
  if (action === "VERIFY_HEALTH") return "hosting.verify_deployment";
  return null;
}

export function bindGatewayAction(action: GovernedExecutionActionType): GatewayActionBinding {
  const gatewayActionType = gatewayActionTypeFor(action);
  const liveAdapterExists = Boolean(gatewayActionType && (LIVE_PROVIDER_ACTIONS as readonly string[]).includes(gatewayActionType));
  return {
    executionActionType: action,
    gatewayActionType,
    capability: capabilityForExecutionAction(action),
    adapterKey: liveAdapterExists ? "vercel.com_v1" : gatewayActionType ? MOCK_PROVIDER_KEY : null,
    liveAdapterExists,
    simulationSupported: true,
  };
}

export function actionRequiresTreasury(action: GovernedExecutionActionType, costUsd: number | null, costUnknown: boolean): boolean {
  return action === "PURCHASE_DOMAIN" || costUnknown || (costUsd != null && costUsd > 0);
}

export function actionRequiresEag(action: GovernedExecutionActionType): boolean {
  return action !== "VERIFY_HEALTH" && action !== "CONFIGURE_ENVIRONMENT";
}
