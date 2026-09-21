import { HQ_PRODUCTION_READINESS_GATE, type HqNamedGate } from "./contract";

export function evaluateHQProductionReadinessGate(input: {
  deploymentReady: boolean;
  auth: boolean;
  authorization: boolean;
  privateApis: boolean;
  environment: boolean;
  runtime: boolean;
  persistence: boolean;
  dailyReportsDurable: boolean;
  customDomain: boolean;
  https: boolean;
  privateCache: boolean;
  publicPrivacy: boolean;
  productionBuild: boolean;
}): HqNamedGate {
  const checks: Array<[string, boolean]> = [
    ["DEPLOYMENT", input.deploymentReady],
    ["AUTH", input.auth],
    ["AUTHORIZATION", input.authorization],
    ["PRIVATE_APIS", input.privateApis],
    ["ENVIRONMENT", input.environment],
    ["RUNTIME", input.runtime],
    ["PERSISTENCE", input.persistence],
    ["DAILY_REPORTS_DURABLE", input.dailyReportsDurable],
    ["CUSTOM_DOMAIN", input.customDomain],
    ["HTTPS", input.https],
    ["PRIVATE_CACHE", input.privateCache],
    ["PUBLIC_PRIVACY", input.publicPrivacy],
    ["PRODUCTION_BUILD", input.productionBuild],
  ];
  const reasons = checks.filter(([, ok]) => !ok).map(([name]) => name);
  return {
    gate: HQ_PRODUCTION_READINESS_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["HQ_PRODUCTION_READY"],
  };
}
