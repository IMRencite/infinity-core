import { EMPTY_SIDE_EFFECTS } from "./constants";
import type { GovernedDeploymentExecutionRequest, GovernedDeploymentExecutionResult } from "./types";

export type CommercializationDeploymentExecutionGate = {
  source: "GOVERNED_DEPLOYMENT_EXECUTION";
  routesThroughLaunchGateway: true;
  bypassesLaunchGateway: false;
  executable: boolean;
  mode: GovernedDeploymentExecutionRequest["mode"];
  publicLaunchTriggered: false;
  liveSideEffects: typeof EMPTY_SIDE_EFFECTS;
  resultState: GovernedDeploymentExecutionResult["state"] | null;
};

export function askToExecuteGovernedDeployment(input: {
  request: GovernedDeploymentExecutionRequest;
  result?: GovernedDeploymentExecutionResult | null;
}): CommercializationDeploymentExecutionGate {
  return {
    source: "GOVERNED_DEPLOYMENT_EXECUTION",
    routesThroughLaunchGateway: true,
    bypassesLaunchGateway: false,
    executable: input.request.executable,
    mode: input.request.mode,
    publicLaunchTriggered: false,
    liveSideEffects: EMPTY_SIDE_EFFECTS,
    resultState: input.result?.state ?? null,
  };
}
