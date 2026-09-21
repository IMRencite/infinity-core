import { reconstructOccupancynpvLegalSurfaceSuccessor } from "@/lib/infinity/venture-website-architecture/cre-occupancynpv-legal-surface-successor";
import { digestOfAuthorityFiles } from "@/lib/infinity/venture-website-architecture/cre-successor";
import { premiumAuthorityArtifactIdFor } from "@/lib/infinity/venture-website-architecture/compose-authority-artifact";
import { CRE_OCCUPANCYNPV_LEGAL_SURFACE_SUCCESSOR_ARTIFACT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { occupancynpvStripeWebhookRouteSource } from "./occupancynpv-payment-activation-surface";
import { evaluateOccupancynpvFulfillmentReadiness } from "./occupancynpv-fulfillment";

export const OCCUPANCYNPV_PAYMENT_SAFETY_ROLLBACK_SITE_CONTRACT =
  "occupancynpv_payment_safety_rollback_fulfillment_gate_v1";

export function occupancynpvCheckoutStartBlockedRouteSource(): string {
  const gate = evaluateOccupancynpvFulfillmentReadiness();
  const fulfillmentReady = gate.result === "PASS";
  const fulfillment = gate.result;
  return `import { NextResponse } from "next/server";

const ACCOUNT = "acct_18h5CjLdvXKx7R7G";
const paymentActivation = false;
const fulfillmentReady: boolean = ${fulfillmentReady};

export async function GET() {
  return NextResponse.json({
    activated: false,
    createSession: false,
    paymentActivation,
    fulfillment: "${fulfillment}",
    offers: ["PROFESSIONAL", "PER_DEAL"],
    account: ACCOUNT,
  });
}

export async function POST() {
  if (fulfillmentReady !== true) {
    return NextResponse.json({
      ok: false,
      reason: "FULFILLMENT_NOT_READY",
      createSession: false,
      paymentActivation,
    }, { status: 403 });
  }
  return NextResponse.json({
    ok: false,
    reason: "PAYMENT_ACTIVATION_NOT_AUTHORIZED",
    createSession: false,
    paymentActivation,
  }, { status: 403 });
}
`;
}

function patchEarlyAccess(content: string): string {
  if (content.includes("DOES_NOT_MARK_PAYMENT_SUCCESS")) return content;
  return content.replace(
    "<h1>Request pilot access</h1>",
    "<h1>Request pilot access</h1>\n        <p>If you returned from checkout, the checkout=success query parameter DOES_NOT_MARK_PAYMENT_SUCCESS. Provider verification is required. Payment initiation is currently disabled.</p>",
  );
}

export function composeOccupancynpvPaymentSafetyRollbackFiles() {
  const legal = reconstructOccupancynpvLegalSurfaceSuccessor();
  const files = legal.files.map((file) => {
    const path = file.path.replace(/\\/g, "/");
    if (path === "app/early-access/page.tsx") return { ...file, content: patchEarlyAccess(file.content) };
    return file;
  });
  files.push({ path: "app/api/checkout/start/route.ts", content: occupancynpvCheckoutStartBlockedRouteSource(), encoding: "utf8" });
  files.push({ path: "app/api/webhooks/stripe/route.ts", content: occupancynpvStripeWebhookRouteSource(), encoding: "utf8" });
  const artifactId = premiumAuthorityArtifactIdFor({
    planId: CRE_OCCUPANCYNPV_LEGAL_SURFACE_SUCCESSOR_ARTIFACT_ID,
    packageId: "occupancynpv-payment-safety-rollback-v1",
    packageVersion: "1",
    contract: OCCUPANCYNPV_PAYMENT_SAFETY_ROLLBACK_SITE_CONTRACT,
  });
  const pricing = files.find((file) => file.path.replace(/\\/g, "/") === "app/pricing/page.tsx");
  return {
    artifactId,
    digest: digestOfAuthorityFiles(files),
    predecessorArtifactId: legal.artifactId,
    files,
    changedPaths: [
      "app/api/checkout/start/route.ts",
      "app/api/webhooks/stripe/route.ts",
      "app/early-access/page.tsx",
    ],
    purchaseControlsDisabled:
      Boolean(pricing?.content.includes("$290")) &&
      Boolean(pricing?.content.includes("$149")) &&
      !Boolean(pricing?.content.includes('action="/api/checkout/start"')),
  };
}
