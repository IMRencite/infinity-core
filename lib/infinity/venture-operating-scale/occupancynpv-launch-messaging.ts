export const OCCUPANCYNPV_PILOT_ACCESS_ROUTE = "/early-access" as const;

export type LaunchMessagingClass =
  | "CURRENT_AND_TRUTHFUL"
  | "STALE_BUT_NON_MATERIAL"
  | "LAUNCH_BLOCKING_CONTRADICTION"
  | "ALLOWED_VALIDATION_COPY";

export type LaunchMessagingFinding = {
  route: string;
  concept: string;
  classification: LaunchMessagingClass;
};

export type OccupancynpvLaunchMessagingAudit = {
  pilotAccessRoute: typeof OCCUPANCYNPV_PILOT_ACCESS_ROUTE;
  earlyAccessMessaging: "CURRENT" | "STALE" | "CONTRADICTORY";
  notBuiltClaims: string[];
  launchBlockingContradictions: string[];
  findings: LaunchMessagingFinding[];
  result: "PASS" | "FAIL";
};

const BLOCKING = [
  { concept: "if the product is built", re: /if the product is built/i },
  { concept: "not a finished product", re: /not a finished product/i },
  { concept: "not generally available", re: /not generally available/i },
  { concept: "payment is not collected", re: /payment is not collected|this site does not collect payment(?! card)|does not collect payment(?! card)/i },
  { concept: "validation-stage / not a live product", re: /validation-stage|not a live product/i },
  { concept: "proposed / hypothetical product", re: /proposed early-access \/ pilot concept|hypothetical product|future product/i },
  { concept: "current offer described as hypothesis", re: /two hypotheses are being tested|pricing hypothesis|the hypothesis includes|the hypothesis is that/i },
  { concept: "live prices described as being tested", re: /these prices are being tested|pricing is being tested|prices are being tested/i },
  { concept: "current product described as proposed", re: /proposed cash-flow compare/i },
] as const;

export function classifyOccupancynpvLaunchMessaging(pages: Array<{ route: string; html: string }>): OccupancynpvLaunchMessagingAudit {
  const findings: LaunchMessagingFinding[] = [];
  for (const page of pages) {
    for (const rule of BLOCKING) {
      if (rule.re.test(page.html)) {
        findings.push({
          route: page.route,
          concept: rule.concept,
          classification: "LAUNCH_BLOCKING_CONTRADICTION",
        });
      }
    }
  }
  const blocking = findings.filter((row) => row.classification === "LAUNCH_BLOCKING_CONTRADICTION");
  const notBuilt = [...new Set(blocking.filter((row) => /built|finished|generally available|live product|validation-stage/i.test(row.concept)).map((row) => `${row.route}: ${row.concept}`))];
  const contradictions = [...new Set(blocking.map((row) => `${row.route}: ${row.concept}`))];
  return {
    pilotAccessRoute: OCCUPANCYNPV_PILOT_ACCESS_ROUTE,
    earlyAccessMessaging: blocking.some((row) => row.route.includes("early-access")) ? "CONTRADICTORY" : blocking.length ? "STALE" : "CURRENT",
    notBuiltClaims: notBuilt,
    launchBlockingContradictions: contradictions,
    findings,
    result: blocking.length === 0 ? "PASS" : "FAIL",
  };
}
