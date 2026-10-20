import { applyOccupancynpvLegacyDeployBlock } from "./occupancynpv-legacy-deployment-retired-v1";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { VercelDomainBindingAdapter } from "@/lib/infinity/commercialization/providers/vercel/domain-binding-adapter";
import { loadServerEnvFromLocalFile, reloadVercelFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import { CRE_VERCEL_PROJECT_ID, CRE_VERCEL_PROJECT_LIVE_NAME, OCCUPANCYNPV_DOMAIN } from "./constants";
import {
  OCCUPANCYNPV_CURRENT_DEPLOYMENT,
  OCCUPANCYNPV_CURRENT_DIGEST,
  OCCUPANCYNPV_PACKAGE_ARTIFACT_ID,
} from "./occupancynpv-artifact-lineage";
import { composeOccupancynpvPaymentReactivationFiles } from "./occupancynpv-payment-reactivation-surface";

export const OCCUPANCYNPV_IMPROVEMENT_INTAKE_LIVE_DEPLOY_EVIDENCE_PATH =
  ".infinity/venture-operating-scale/occupancynpv-improvement-intake-live-deployment.json" as const;

export const OCCUPANCYNPV_EXPECTED_IMPROVEMENT_DIGEST =
  "0d050ae0f4bee3ac6d054efe6658982c8e5f080f282ea3476ae2bb05852944f4" as const;

function inspectIsolatedImprovementArtifact(files: Array<{ path: string; content: string }>): {
  suggest_present: boolean;
  form_fields: boolean;
  public_page: boolean;
  intake_route: boolean;
} {
  const chrome = files.find((file) => file.path.replace(/\\/g, "/") === "components/site-chrome.tsx")?.content ?? "";
  const footer = files.find((file) => file.path.replace(/\\/g, "/") === "components/venture-footer.tsx")?.content ?? "";
  const page = files.find((file) => file.path.replace(/\\/g, "/") === "app/suggest-improvement/page.tsx")?.content ?? "";
  const form = files.find((file) => file.path.replace(/\\/g, "/") === "components/occupancynpv-public-improvement-form.tsx")?.content ?? "";
  const route = files.find((file) => file.path.replace(/\\/g, "/") === "app/api/occupancynpv/improvement-intake/route.ts")?.content ?? "";
  return {
    suggest_present: chrome.includes("Suggest an Improvement") || footer.includes("Suggest an Improvement") || page.includes("Suggest an Improvement"),
    form_fields: form.includes("What would make this product work better for you?") && form.includes("What are you trying to accomplish?") && form.includes("vg-cta vg-cta--primary") && form.includes("vg-textarea"),
    public_page: page.includes("OccupancynpvPublicImprovementForm") && page.includes("VentureFooter"),
    intake_route: route.includes("POST")
      && route.includes("durablePersistImprovementIntake")
      && route.includes("CANONICAL_INTAKE_UNAVAILABLE")
      && !route.includes('contract: "VentureImprovementIntakeContract"'),
  };
}

async function htmlFrom(url: string): Promise<{ ok: boolean; status: number; body: string }> {
  try {
    const response = await fetch(url, { redirect: "follow" });
    return { ok: response.ok, status: response.status, body: await response.text() };
  } catch {
    return { ok: false, status: 0, body: "" };
  }
}

export async function executeOccupancynpvImprovementIntakeLiveDeployment(input: {
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
  const artifact = inspectIsolatedImprovementArtifact(composed.files);
  const digestMatches = composed.digest === OCCUPANCYNPV_EXPECTED_IMPROVEMENT_DIGEST;
  let deploymentId: string | null = null;
  let previewUrl: string | null = null;
  let deployed = false;
  let aliased = false;
  let safeError: string | null = null;
  safeError = applyOccupancynpvLegacyDeployBlock(input, safeError);
  let predeployVisible = false;

  if (!digestMatches) safeError = "ISOLATED_ARTIFACT_DIGEST_MISMATCH";
  else if (!artifact.suggest_present || !artifact.form_fields || !artifact.public_page || !artifact.intake_route) {
    safeError = "ISOLATED_ARTIFACT_IMPROVEMENT_INTAKE_INCOMPLETE";
  }

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
            const home = previewUrl ? await htmlFrom(previewUrl) : { ok: false, status: 0, body: "" };
            const suggest = previewUrl ? await htmlFrom(`${previewUrl.replace(/\/$/, "")}/suggest-improvement`) : { ok: false, status: 0, body: "" };
            predeployVisible =
              home.ok &&
              suggest.ok &&
              (home.body.includes("Suggest an Improvement") || suggest.body.includes("Suggest an Improvement")) &&
              suggest.body.includes("What would make this product work better for you?") &&
              suggest.body.includes("vg-cta") &&
              suggest.body.includes("vg-textarea") &&
              suggest.body.includes("vg-input") &&
              (suggest.body.includes("An Infinity OS Venture") || suggest.body.includes("Privacy Policy"));
            if (!predeployVisible) {
              safeError = "PREDEPLOY_SERVED_IMPROVEMENT_INTAKE_FAILED";
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

  const evidence = {
    previous_artifact_id: OCCUPANCYNPV_PACKAGE_ARTIFACT_ID,
    previous_digest: OCCUPANCYNPV_CURRENT_DIGEST,
    previous_deployment_id: OCCUPANCYNPV_CURRENT_DEPLOYMENT,
    artifact_id: composed.artifactId,
    digest: composed.digest,
    expected_digest: OCCUPANCYNPV_EXPECTED_IMPROVEMENT_DIGEST,
    digest_matches: digestMatches,
    deployment_id: deploymentId,
    preview_url: previewUrl,
    deployed,
    aliased,
    predeploy_visible: predeployVisible,
    payment_activation_changed: 0,
    stripe_writes: 0,
    dns_writes: 0,
    supabase_migrations: 0,
    public_launch: 0,
    founder_dirty_tree_deployed: "NO" as const,
    vercel_project_id: CRE_VERCEL_PROJECT_ID,
    safe_error: safeError,
  };
  if (input.persistEvidence !== false) {
    mkdirSync(dirname(OCCUPANCYNPV_IMPROVEMENT_INTAKE_LIVE_DEPLOY_EVIDENCE_PATH), { recursive: true });
    writeFileSync(OCCUPANCYNPV_IMPROVEMENT_INTAKE_LIVE_DEPLOY_EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  }
  return { composed, evidence, deployed, deploymentId, previewUrl, safeError, artifact };
}
