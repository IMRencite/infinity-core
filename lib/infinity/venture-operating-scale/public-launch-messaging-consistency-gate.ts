import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  classifyOccupancynpvLaunchMessaging,
  type LaunchMessagingFinding,
  type OccupancynpvLaunchMessagingAudit,
} from "./occupancynpv-launch-messaging";
import { occupancynpvPubliclyLaunched } from "./occupancynpv-public-launch-evidence";
import { composeOccupancynpvPaymentReactivationFiles } from "./occupancynpv-payment-reactivation-surface";

export const PUBLIC_LAUNCH_MESSAGING_CONSISTENCY_GATE = "PublicLaunchMessagingConsistencyGate" as const;

export const OCCUPANCYNPV_LAUNCH_MESSAGING_EVIDENCE_PATH =
  ".infinity/venture-operating-scale/occupancynpv-launch-messaging-evidence.json" as const;

export const OCCUPANCYNPV_LIFECYCLE_CONTENT_REVALIDATION_PATH =
  ".infinity/venture-operating-scale/occupancynpv-lifecycle-content-revalidation.json" as const;

export type VentureLifecycleContentState = {
  productBuilt: boolean;
  paymentActive: boolean;
  fulfillmentReady: boolean;
  publiclyLaunched: boolean;
  stage?: "VALIDATION_STAGE" | "PRE_LAUNCH" | "PUBLICLY_LAUNCHED";
};

export type LifecycleContentTransition =
  | "PRODUCT_NOT_BUILT → PRODUCT_BUILT"
  | "PAYMENT_DISABLED → PAYMENT_ACTIVE"
  | "FULFILLMENT_MISSING → FULFILLMENT_READY"
  | "PILOT_ONLY → GENERAL_AVAILABILITY_READY";

export type LifecycleContentRevalidationEvidence = {
  transitions: LifecycleContentTransition[];
  revalidatedAt: string;
  contentDigest?: string;
};

export type PublicLaunchMessagingConsistencyFinding = LaunchMessagingFinding;

export type PublicLaunchMessagingConsistencyGateResult = {
  gate: typeof PUBLIC_LAUNCH_MESSAGING_CONSISTENCY_GATE;
  result: "PASS" | "FAIL";
  notBuiltClaims: string[];
  noPaymentClaims: string[];
  launchBlockingPilotContradictions: string[];
  findings: PublicLaunchMessagingConsistencyFinding[];
  publiclyLaunchedDoesNotRequireUnavailableLanguage: true;
  missingRevalidationEvidence: boolean;
};

const NOT_BUILT = [
  { concept: "if the product is built", re: /if the product is built/i },
  { concept: "not a finished product", re: /not a finished product/i },
  { concept: "not generally available", re: /not generally available/i },
  { concept: "validation-stage / not a live product", re: /validation-stage|not a live product/i },
  { concept: "proposed / hypothetical product", re: /proposed early-access \/ pilot concept|hypothetical product|future product/i },
] as const;

const NO_PAYMENT = [
  { concept: "payment is not collected", re: /payment is not collected/i },
  { concept: "this site does not collect payment", re: /this site does not collect payment(?! card)/i },
  { concept: "does not collect payment", re: /does not collect payment(?! card)/i },
] as const;

const PRODUCT_UNAVAILABLE = [
  { concept: "product not available", re: /product is not available|product not available|not generally available/i },
] as const;

const CURRENT_PRODUCT_MARKERS = /\$290|\$149|Professional|Per-Deal|OccupancyNPV|checkout|entitlement|cash-flow compare|lease comparison/i;

const CURRENT_OFFER_AS_HYPOTHESIS = [
  { concept: "current offer described as hypothesis", re: /\bhypothes(?:is|es)\b/i },
  { concept: "live prices described as being tested", re: /being tested/i },
  { concept: "current product described as proposed", re: /proposed (cash-flow|product|access|early-access)/i },
  { concept: "current feature described as would include", re: /(would|could) include access/i },
  { concept: "current product described as intended or possible", re: /intended product|possible product|future capability|if built/i },
  { concept: "current product described as pilot or validation concept", re: /pilot concept|validation concept|early validation/i },
] as const;

function strippedSentences(html: string): string[] {
  return html
    .replace(/data-[a-z0-9-]+="[^"]*"/gi, "")
    .replace(/pattern=["'][^"']+["']/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/);
}

function currentOfferClaim(html: string, claim: RegExp): boolean {
  return strippedSentences(html).some((sentence) => {
    if (!claim.test(sentence) || !CURRENT_PRODUCT_MARKERS.test(sentence)) return false;
    if (/proposed/i.test(sentence) && /visualization/i.test(sentence) && !/proposed cash-flow/i.test(sentence)) return false;
    return true;
  });
}

export function routeFromOccupancynpvPagePath(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/^app/, "").replace(/\/page\.tsx$/, "");
  return normalized === "" ? "/" : normalized;
}

export type OccupancynpvLaunchMessagingEvidence = {
  capturedAt: string;
  pages: Array<{ route: string; html: string }>;
};

export function readOccupancynpvLaunchMessagingEvidence(): OccupancynpvLaunchMessagingEvidence | null {
  if (!existsSync(OCCUPANCYNPV_LAUNCH_MESSAGING_EVIDENCE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(OCCUPANCYNPV_LAUNCH_MESSAGING_EVIDENCE_PATH, "utf8")) as OccupancynpvLaunchMessagingEvidence;
  } catch {
    return null;
  }
}

export function persistOccupancynpvLaunchMessagingEvidence(evidence: OccupancynpvLaunchMessagingEvidence) {
  mkdirSync(dirname(OCCUPANCYNPV_LAUNCH_MESSAGING_EVIDENCE_PATH), { recursive: true });
  writeFileSync(OCCUPANCYNPV_LAUNCH_MESSAGING_EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  return evidence;
}

export function readLifecycleContentRevalidationEvidence(
  path = OCCUPANCYNPV_LIFECYCLE_CONTENT_REVALIDATION_PATH,
): LifecycleContentRevalidationEvidence | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as LifecycleContentRevalidationEvidence;
  } catch {
    return null;
  }
}

export function persistLifecycleContentRevalidationEvidence(
  evidence: LifecycleContentRevalidationEvidence,
  path = OCCUPANCYNPV_LIFECYCLE_CONTENT_REVALIDATION_PATH,
) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(evidence, null, 2)}\n`);
  return evidence;
}

export function requiredLifecycleContentTransitions(lifecycle: VentureLifecycleContentState): LifecycleContentTransition[] {
  const transitions: LifecycleContentTransition[] = [];
  if (lifecycle.productBuilt) transitions.push("PRODUCT_NOT_BUILT → PRODUCT_BUILT");
  if (lifecycle.paymentActive) transitions.push("PAYMENT_DISABLED → PAYMENT_ACTIVE");
  if (lifecycle.fulfillmentReady) transitions.push("FULFILLMENT_MISSING → FULFILLMENT_READY");
  if (lifecycle.productBuilt && lifecycle.fulfillmentReady && !lifecycle.publiclyLaunched) {
    transitions.push("PILOT_ONLY → GENERAL_AVAILABILITY_READY");
  }
  return transitions;
}

export function evaluateLifecycleContentInvalidation(input: {
  lifecycle: VentureLifecycleContentState;
  revalidation?: LifecycleContentRevalidationEvidence | null;
}): {
  result: "PASS" | "FAIL";
  covered: Record<LifecycleContentTransition, "COVERED" | "FAIL">;
  missingRevalidationEvidence: boolean;
} {
  const required = requiredLifecycleContentTransitions(input.lifecycle);
  const coveredTransitions = new Set(input.revalidation?.transitions ?? []);
  const missing = !input.revalidation || required.some((row) => !coveredTransitions.has(row));
  const covered = {
    "PRODUCT_NOT_BUILT → PRODUCT_BUILT": (
      !input.lifecycle.productBuilt || coveredTransitions.has("PRODUCT_NOT_BUILT → PRODUCT_BUILT") ? "COVERED" : "FAIL"
    ),
    "PAYMENT_DISABLED → PAYMENT_ACTIVE": (
      !input.lifecycle.paymentActive || coveredTransitions.has("PAYMENT_DISABLED → PAYMENT_ACTIVE") ? "COVERED" : "FAIL"
    ),
    "FULFILLMENT_MISSING → FULFILLMENT_READY": (
      !input.lifecycle.fulfillmentReady || coveredTransitions.has("FULFILLMENT_MISSING → FULFILLMENT_READY") ? "COVERED" : "FAIL"
    ),
    "PILOT_ONLY → GENERAL_AVAILABILITY_READY": (
      required.includes("PILOT_ONLY → GENERAL_AVAILABILITY_READY")
        ? (coveredTransitions.has("PILOT_ONLY → GENERAL_AVAILABILITY_READY") ? "COVERED" : "FAIL")
        : "COVERED"
    ),
  } as Record<LifecycleContentTransition, "COVERED" | "FAIL">;
  return {
    result: missing ? "FAIL" : "PASS",
    covered,
    missingRevalidationEvidence: missing,
  };
}

export function evaluatePublicLaunchMessagingConsistencyGate(input: {
  lifecycle: VentureLifecycleContentState;
  pages: Array<{ route: string; html: string }>;
  revalidation?: LifecycleContentRevalidationEvidence | null;
}): PublicLaunchMessagingConsistencyGateResult {
  const findings: PublicLaunchMessagingConsistencyFinding[] = [];
  const validationStage = input.lifecycle.stage === "VALIDATION_STAGE" && !input.lifecycle.productBuilt;
  for (const page of input.pages) {
    if (input.lifecycle.productBuilt) {
      for (const rule of NOT_BUILT) {
        if (rule.re.test(page.html)) {
          findings.push({ route: page.route, concept: rule.concept, classification: "LAUNCH_BLOCKING_CONTRADICTION" });
        }
      }
    } else if (validationStage && /pilot|validation|not generally available/i.test(page.html)) {
      findings.push({ route: page.route, concept: "truthful pilot copy", classification: "ALLOWED_VALIDATION_COPY" });
    }
    if (input.lifecycle.paymentActive) {
      for (const rule of NO_PAYMENT) {
        if (rule.re.test(page.html)) {
          findings.push({ route: page.route, concept: rule.concept, classification: "LAUNCH_BLOCKING_CONTRADICTION" });
        }
      }
    }
    if (input.lifecycle.fulfillmentReady) {
      for (const rule of PRODUCT_UNAVAILABLE) {
        if (rule.re.test(page.html)) {
          findings.push({ route: page.route, concept: rule.concept, classification: "LAUNCH_BLOCKING_CONTRADICTION" });
        }
      }
    }
    if (input.lifecycle.publiclyLaunched || input.lifecycle.paymentActive || input.lifecycle.productBuilt) {
      for (const rule of CURRENT_OFFER_AS_HYPOTHESIS) {
        if (currentOfferClaim(page.html, rule.re)) {
          findings.push({ route: page.route, concept: rule.concept, classification: "LAUNCH_BLOCKING_CONTRADICTION" });
        }
      }
    }
    if (
      (input.lifecycle.stage === "PRE_LAUNCH" || (!input.lifecycle.publiclyLaunched && input.lifecycle.productBuilt))
      && /live|working|OccupancyNPV/i.test(page.html)
      && !NOT_BUILT.some((rule) => rule.re.test(page.html))
      && !NO_PAYMENT.some((rule) => rule.re.test(page.html))
    ) {
      findings.push({ route: page.route, concept: "pre-launch real product wording", classification: "CURRENT_AND_TRUTHFUL" });
    }
  }
  const blocking = findings.filter((row) => row.classification === "LAUNCH_BLOCKING_CONTRADICTION");
  const invalidation = evaluateLifecycleContentInvalidation({
    lifecycle: input.lifecycle,
    revalidation: input.revalidation,
  });
  const notBuiltClaims = [...new Set(blocking.filter((row) => /built|finished|generally available|live product|validation-stage|proposed|hypothetical|future/i.test(row.concept)).map((row) => `${row.route}: ${row.concept}`))];
  const noPaymentClaims = [...new Set(blocking.filter((row) => /payment/i.test(row.concept)).map((row) => `${row.route}: ${row.concept}`))];
  const launchBlockingPilotContradictions = [...new Set(blocking.map((row) => `${row.route}: ${row.concept}`))];
  return {
    gate: PUBLIC_LAUNCH_MESSAGING_CONSISTENCY_GATE,
    result: blocking.length === 0 && !invalidation.missingRevalidationEvidence ? "PASS" : "FAIL",
    notBuiltClaims,
    noPaymentClaims,
    launchBlockingPilotContradictions,
    findings,
    publiclyLaunchedDoesNotRequireUnavailableLanguage: true,
    missingRevalidationEvidence: invalidation.missingRevalidationEvidence,
  };
}

export function occupancynpvCurrentLifecycleContentState(): VentureLifecycleContentState {
  const publiclyLaunched = occupancynpvPubliclyLaunched();
  return {
    productBuilt: true,
    paymentActive: true,
    fulfillmentReady: true,
    publiclyLaunched,
    stage: publiclyLaunched ? "PUBLICLY_LAUNCHED" : "PRE_LAUNCH",
  };
}

export function evaluateOccupancynpvLaunchMessaging(
  evidence: OccupancynpvLaunchMessagingEvidence | null = readOccupancynpvLaunchMessagingEvidence(),
  revalidation: LifecycleContentRevalidationEvidence | null = readLifecycleContentRevalidationEvidence(),
): OccupancynpvLaunchMessagingAudit & PublicLaunchMessagingConsistencyGateResult {
  const empty: OccupancynpvLaunchMessagingAudit = {
    pilotAccessRoute: "/early-access",
    earlyAccessMessaging: "STALE",
    notBuiltClaims: ["MISSING_RENDERED_EVIDENCE"],
    launchBlockingContradictions: ["MISSING_RENDERED_EVIDENCE"],
    findings: [],
    result: "FAIL",
  };
  let composedPages: Array<{ route: string; html: string }> = [];
  try {
    composedPages = composeOccupancynpvPaymentReactivationFiles().files
      .filter((file) => {
        const path = file.path.replace(/\\/g, "/");
        return path.endsWith("page.tsx") && path.startsWith("app/") && !path.startsWith("app/occupancynpv/") && !path.startsWith("app/api/");
      })
      .map((file) => ({
        route: routeFromOccupancynpvPagePath(file.path),
        html: file.content,
      }));
  } catch {
    composedPages = [];
  }
  const pages = composedPages.length ? composedPages : (evidence?.pages ?? []);
  if (!pages.length) {
    return {
      ...empty,
      gate: PUBLIC_LAUNCH_MESSAGING_CONSISTENCY_GATE,
      noPaymentClaims: ["MISSING_RENDERED_EVIDENCE"],
      launchBlockingPilotContradictions: ["MISSING_RENDERED_EVIDENCE"],
      publiclyLaunchedDoesNotRequireUnavailableLanguage: true,
      missingRevalidationEvidence: !revalidation,
    };
  }
  const classified = classifyOccupancynpvLaunchMessaging(pages);
  const consistency = evaluatePublicLaunchMessagingConsistencyGate({
    lifecycle: occupancynpvCurrentLifecycleContentState(),
    pages,
    revalidation,
  });
  return {
    ...classified,
    ...consistency,
    notBuiltClaims: consistency.notBuiltClaims.length ? consistency.notBuiltClaims : classified.notBuiltClaims,
    launchBlockingContradictions: consistency.launchBlockingPilotContradictions.length
      ? consistency.launchBlockingPilotContradictions
      : classified.launchBlockingContradictions,
    result: classified.result === "PASS" && consistency.result === "PASS" ? "PASS" : "FAIL",
  };
}
