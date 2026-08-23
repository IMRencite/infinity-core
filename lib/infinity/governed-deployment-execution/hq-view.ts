import type { GovernedDeploymentExecutionResult } from "./types";

export type GovernedDeploymentExecutionHqView = {
  deployment: "SUCCEEDED" | "FAILED" | "PARTIAL" | "BLOCKED";
  mode: "LIVE" | "SIMULATION" | "DRY_RUN";
  actions: string;
  spend: string;
  dns: "PASS" | "FAIL" | "NOT_REQUIRED";
  health: "PASS" | "FAIL" | "NOT_REQUIRED";
  publicLaunch: "NOT AUTHORIZED" | "AUTHORIZED_NOT_EXECUTED";
};

export function toGovernedDeploymentExecutionHqView(
  result: GovernedDeploymentExecutionResult,
): GovernedDeploymentExecutionHqView {
  const completed = result.actionsSucceeded.length;
  const total = result.actionsAttempted.length;
  const dns = result.actionsAttempted.find((item) => item.actionType === "UPSERT_DNS_RECORD" || item.actionType === "BIND_DOMAIN");
  const spendActual = result.costsIncurred.unknown ? "UNKNOWN" : `$${result.costsIncurred.actualUsd ?? 0}`;
  const spendAuthorized = result.costsIncurred.authorizedUsd == null ? "UNKNOWN" : `$${result.costsIncurred.authorizedUsd}`;
  return {
    deployment:
      result.state === "SUCCEEDED" || result.state === "AUTHORIZED"
        ? "SUCCEEDED"
        : result.state === "PARTIALLY_SUCCEEDED"
          ? "PARTIAL"
          : result.state === "FAILED"
            ? "FAILED"
            : "BLOCKED",
    mode: result.mode,
    actions: `${completed}/${total}`,
    spend: `${spendAuthorized} authorized / ${spendActual} actual`,
    dns: !dns ? "NOT_REQUIRED" : dns.state === "SUCCEEDED" || dns.state === "AUTHORIZED" ? "PASS" : "FAIL",
    health: result.healthCheckState === "NOT_REQUIRED" ? "NOT_REQUIRED" : result.healthCheckState === "PASS" ? "PASS" : "FAIL",
    publicLaunch: result.publicLaunchState === "NOT_AUTHORIZED" ? "NOT AUTHORIZED" : "AUTHORIZED_NOT_EXECUTED",
  };
}
