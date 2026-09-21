import {
  HQ_PRODUCTION_AUTH_REDIRECT_GATE,
  HQ_PRODUCTION_ORIGIN,
  type HqNamedGate,
} from "./contract";

export const HQ_PRODUCTION_AUTH_CALLBACK = `${HQ_PRODUCTION_ORIGIN}/auth/callback` as const;
export const HQ_PRODUCTION_AUTH_API_CALLBACK = `${HQ_PRODUCTION_ORIGIN}/api/auth/callback` as const;

export function evaluateHQProductionAuthRedirectGate(input: {
  hqOriginAllowed: boolean;
  callbackAllowed: boolean;
  siteUrlAllowsHq?: boolean;
}): HqNamedGate {
  const reasons: string[] = [];
  if (!input.hqOriginAllowed) reasons.push("HQ_ORIGIN_NOT_ALLOWLISTED");
  if (!input.callbackAllowed) reasons.push("AUTH_CALLBACK_NOT_ALLOWLISTED");
  return {
    gate: HQ_PRODUCTION_AUTH_REDIRECT_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["HQ_AUTH_REDIRECT_CONFIRMED"],
  };
}

export function evaluateHQLiveLogoutGate(input: {
  logoutSucceeded: boolean;
  cookieInvalidated: boolean;
  dashboardDenied: boolean;
  dailyReportsDenied: boolean;
  privateApisDenied: boolean;
}): HqNamedGate {
  const reasons: string[] = [];
  if (!input.logoutSucceeded) reasons.push("LOGOUT_ENDPOINT_FAIL");
  if (!input.cookieInvalidated) reasons.push("SESSION_STILL_VALID");
  if (!input.dashboardDenied) reasons.push("DASHBOARD_STILL_OPEN");
  if (!input.dailyReportsDenied) reasons.push("DAILY_REPORTS_STILL_OPEN");
  if (!input.privateApisDenied) reasons.push("PRIVATE_API_STILL_OPEN");
  return {
    gate: "HQLiveLogoutGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["LOGOUT_AND_DENY_PROVEN"],
  };
}

export function evaluateHQProductionGoldenPathGate(input: {
  login: boolean | null;
  authorization: boolean | null;
  dashboardRender: boolean | null;
  serverRuntimeClean: boolean | null;
  runtimeState: boolean | null;
  todaysReport: boolean | null;
  privateApis: boolean | null;
  secureCookie: boolean | null;
  logout: boolean | null;
  loggedOutDenied: boolean | null;
  noPrivateLeak: boolean | null;
}): HqNamedGate {
  const checks: Array<[string, boolean | null]> = [
    ["LOGIN", input.login],
    ["AUTHORIZATION", input.authorization],
    ["DASHBOARD_RENDER", input.dashboardRender],
    ["SERVER_RUNTIME", input.serverRuntimeClean],
    ["RUNTIME_STATE", input.runtimeState],
    ["TODAYS_REPORT", input.todaysReport],
    ["PRIVATE_APIS", input.privateApis],
    ["SECURE_COOKIE", input.secureCookie],
    ["LOGOUT", input.logout],
    ["LOGGED_OUT_DENIED", input.loggedOutDenied],
    ["NO_PRIVATE_LEAK", input.noPrivateLeak],
  ];
  const missing = checks.filter(([, ok]) => ok == null).map(([name]) => `${name}_NOT_PROVEN`);
  if (missing.length) {
    return {
      gate: "HQProductionGoldenPathGate",
      result: "NOT_PROVEN",
      reasons: missing,
      proof_level: "NOT_PROVEN",
    };
  }
  const reasons = checks.filter(([, ok]) => ok === false).map(([name]) => name);
  return {
    gate: "HQProductionGoldenPathGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["FOUNDER_GOLDEN_PATH_COMPLETE"],
    proof_level: reasons.length ? "NOT_PROVEN" : "LIVE_SESSION_PROVEN",
  };
}
