import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { VercelDomainBindingAdapter } from "@/lib/infinity/commercialization/providers/vercel/domain-binding-adapter";
import { loadServerEnvFromLocalFile, reloadVercelFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import { CRE_VERCEL_PROJECT_ID, CRE_VERCEL_PROJECT_LIVE_NAME, OCCUPANCYNPV_DOMAIN } from "./constants";
import {
  OCCUPANCYNPV_CURRENT_DEPLOYMENT,
  OCCUPANCYNPV_CURRENT_DIGEST,
  OCCUPANCYNPV_PACKAGE_ARTIFACT_ID,
  persistOccupancynpvArtifactLineage,
} from "./occupancynpv-artifact-lineage";
import { composeOccupancynpvPaymentReactivationFiles } from "./occupancynpv-payment-reactivation-surface";

export const OCCUPANCYNPV_PRICING_UX_REPAIR_EVIDENCE_PATH =
  ".infinity/venture-operating-scale/occupancynpv-pricing-ux-repair-deployment.json" as const;

async function htmlFrom(url: string): Promise<{ ok: boolean; status: number; body: string }> {
  try {
    const response = await fetch(url, { redirect: "follow" });
    return { ok: response.ok, status: response.status, body: await response.text() };
  } catch {
    return { ok: false, status: 0, body: "" };
  }
}

export function pricingUxReady(html: string): boolean {
  return html.includes("data-pricing-architecture")
    && html.includes("data-promotional-offer=\"THREE_DAY_NO_CARD_TRIAL\"")
    && html.includes('data-commercial-hero="overlay"')
    && html.includes("hero-building.webp")
    && html.includes("Compare commercial lease scenarios with confidence")
    && html.includes("onpv-pricing-hero-shade")
    && html.includes("How the 3-day free trial works")
    && html.includes("onpv-related-paths")
    && html.includes("Related product paths")
    && html.includes("Professional vs Per-Deal")
    && html.includes("Start Free Trial")
    && html.includes("Try OccupancyNPV free for 3 days")
    && html.includes("No credit card required")
    && html.includes("Start Professional")
    && html.includes("Start One Deal")
    && html.includes("$290")
    && html.includes("$149")
    && html.indexOf("Start Free Trial") < html.indexOf("Start Professional")
    && !html.includes("data-offer-block")
    && !html.includes("pv-hero-photo")
    && !html.includes("pv-pricing-split")
    && !html.includes("What does OccupancyNPV cost?")
    && !/Primary offer · paid-first|entitlement remains ACTIVE|fulfillment grants/i.test(html);
}

export async function executeOccupancynpvPricingUxRepairDeployment(input: {
  deploy?: boolean;
  persistEvidence?: boolean;
  pollAttempts?: number;
  pollDelayMs?: number;
} = {}) {
  if (input.deploy !== false) {
    loadServerEnvFromLocalFile();
    reloadVercelFromLocalFile();
  }
  const composed = composeOccupancynpvPaymentReactivationFiles();
  const pricing = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/pricing/page.tsx")?.content ?? "";
  const artifactReady = pricingUxReady(pricing)
    && composed.files.some((file) => file.path.replace(/\\/g, "/") === "components/occupancynpv-offer-beacon.tsx")
    && composed.files.some((file) => file.path.replace(/\\/g, "/") === "app/api/occupancynpv/offer-events/route.ts");
  let deploymentId: string | null = null;
  let previewUrl: string | null = null;
  let deployed = false;
  let aliased = false;
  let safeError: string | null = artifactReady ? null : "ISOLATED_ARTIFACT_PRICING_UX_INCOMPLETE";
  let predeployVisible = false;
  let liveVisible = false;

  if (!safeError && input.deploy !== false) {
    const vercel = new VercelDomainBindingAdapter();
    for (const file of composed.files) {
      const uploaded = await vercel.uploadSourceFile(file);
      if (!uploaded.ok) {
        safeError = uploaded.safeError ?? "VERCEL_FILE_UPLOAD_FAILED";
        break;
      }
    }
    if (!safeError) {
      const created = await vercel.createSourceBundleDeployment({
        projectName: CRE_VERCEL_PROJECT_LIVE_NAME,
        files: composed.files,
      });
      if (!created.ok || created.id === "UNKNOWN") {
        safeError = created.safeError ?? "VERCEL_DEPLOYMENT_CREATE_FAILED";
      } else {
        deploymentId = created.id;
        previewUrl = created.url && created.url !== "UNKNOWN" ? `https://${created.url}` : null;
        for (let attempt = 0; attempt < (input.pollAttempts ?? 50); attempt += 1) {
          const status = await vercel.getDeployment(created.id);
          if (status.url && status.url !== "UNKNOWN") previewUrl = `https://${status.url}`;
          if (status.readyState === "READY") {
            const previewPricing = previewUrl ? await htmlFrom(`${previewUrl.replace(/\/$/, "")}/pricing`) : { ok: false, status: 0, body: "" };
            predeployVisible = previewPricing.ok && pricingUxReady(previewPricing.body);
            if (!predeployVisible) {
              safeError = "PREDEPLOY_SERVED_PRICING_UX_FAILED";
              break;
            }
            const alias = await vercel.assignDeploymentAlias(created.id, OCCUPANCYNPV_DOMAIN);
            aliased = alias.ok;
            deployed = alias.ok;
            if (!alias.ok) safeError = alias.safeError ?? "VERCEL_ALIAS_FAILED";
            break;
          }
          if (status.readyState === "ERROR" || status.readyState === "CANCELED") {
            safeError = status.safeError ?? "VERCEL_DEPLOYMENT_FAILED";
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, input.pollDelayMs ?? 8000));
        }
        if (!deployed && !safeError) safeError = "VERCEL_DEPLOYMENT_NOT_READY";
      }
    }
  }

  if (deployed) {
    const live = await htmlFrom("https://occupancynpv.com/pricing");
    liveVisible = live.ok && pricingUxReady(live.body);
    if (!liveVisible) safeError = safeError ?? "LIVE_PRICING_UX_NOT_VISIBLE";
  }

  const evidence = {
    previous_artifact_id: OCCUPANCYNPV_PACKAGE_ARTIFACT_ID,
    previous_digest: OCCUPANCYNPV_CURRENT_DIGEST,
    previous_deployment_id: OCCUPANCYNPV_CURRENT_DEPLOYMENT,
    artifact_id: composed.artifactId,
    digest: composed.digest,
    deployment_id: deploymentId,
    preview_url: previewUrl,
    deployed,
    aliased,
    predeploy_visible: predeployVisible,
    live_visible: liveVisible,
    payment_activation_changed: 0,
    stripe_writes: 0,
    dns_writes: 0,
    founder_dirty_tree_deployed: "NO" as const,
    vercel_project_id: CRE_VERCEL_PROJECT_ID,
    safe_error: safeError,
  };
  if (input.persistEvidence !== false) {
    mkdirSync(dirname(OCCUPANCYNPV_PRICING_UX_REPAIR_EVIDENCE_PATH), { recursive: true });
    writeFileSync(OCCUPANCYNPV_PRICING_UX_REPAIR_EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
    if (deployed && deploymentId) {
      persistOccupancynpvArtifactLineage({
        finding: "B",
        explanation: "premiumAuthorityArtifactIdFor hashes planId+packageId+version+contract, not file contents. The same package-derived artifact ID can therefore label multiple digests. Immutable production identity is digest + deployment_id.",
        packageDerivedArtifactId: OCCUPANCYNPV_PACKAGE_ARTIFACT_ID,
        immutableIdentity: "digest_plus_deployment",
        previous: {
          artifactId: OCCUPANCYNPV_PACKAGE_ARTIFACT_ID,
          digest: OCCUPANCYNPV_CURRENT_DIGEST,
          deploymentId: OCCUPANCYNPV_CURRENT_DEPLOYMENT,
        },
        current: {
          artifactId: composed.artifactId,
          digest: composed.digest,
          deploymentId,
        },
        composeDigestMatchesCurrent: false,
        repairRequired: false,
      });
    }
  }
  return { composed, evidence, deployed, deploymentId, previewUrl, safeError, liveVisible };
}
